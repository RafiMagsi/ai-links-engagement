import { AutomationAccountCategory } from '@ai-links/shared-types';
import { getLogger } from './logger.js';

export interface RecentItem {
  title: string;
  url: string;
  source: string;
  publishedAt?: string;
}

type FeedConfig = {
  source: string;
  url: string;
};

const logger = getLogger();

const DEFAULT_MAX_ITEMS = 6;
const DEFAULT_TIMEOUT_MS = 8000;
const DEFAULT_CACHE_MS = 15 * 60 * 1000;

const FEEDS_BY_CATEGORY: Record<AutomationAccountCategory, FeedConfig[]> = {
  [AutomationAccountCategory.AI]: [
    { source: 'OpenAI Blog', url: 'https://openai.com/blog/rss.xml' },
    { source: 'Google AI Blog', url: 'https://blog.google/technology/ai/rss/' },
    { source: 'DeepMind Blog', url: 'https://deepmind.google/blog/rss.xml' },
  ],
  [AutomationAccountCategory.SOFTWARE]: [
    { source: 'GitHub Blog', url: 'https://github.blog/feed/' },
    { source: 'Cloudflare Blog', url: 'https://blog.cloudflare.com/rss/' },
  ],
  [AutomationAccountCategory.STARTUPS]: [
    { source: 'Y Combinator', url: 'https://www.ycombinator.com/blog/rss' },
  ],
  [AutomationAccountCategory.PRODUCT]: [
    { source: 'Lenny’s Newsletter', url: 'https://www.lennysnewsletter.com/feed' },
  ],
  [AutomationAccountCategory.MARKETING]: [
    { source: 'MarketingExamples', url: 'https://marketingexamples.com/rss' },
  ],
  [AutomationAccountCategory.SALES]: [
    { source: 'Gong Blog', url: 'https://www.gong.io/blog/feed/' },
  ],
  [AutomationAccountCategory.FINANCE]: [
    { source: 'IMF Blog', url: 'https://www.imf.org/en/Blogs/rss' },
  ],
  [AutomationAccountCategory.HEALTH]: [
    { source: 'WHO News', url: 'https://www.who.int/rss-feeds/news-english.xml' },
  ],
  [AutomationAccountCategory.GENERAL]: [
    { source: 'Reuters World News', url: 'https://www.reutersagency.com/feed/?taxonomy=best-topics&post_type=best' },
  ],
};

type CacheEntry = { expiresAt: number; items: RecentItem[] };
const cache = new Map<string, CacheEntry>();

function decodeXmlEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[(.*?)\]\]>/gs, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function matchTag(block: string, tag: string): string | undefined {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  return m ? decodeXmlEntities(m[1].trim()) : undefined;
}

function parseRssOrAtom(xml: string, source: string): RecentItem[] {
  const items: RecentItem[] = [];

  // RSS <item>...</item>
  const itemBlocks = xml.match(/<item[\s\S]*?<\/item>/gi) || [];
  for (const block of itemBlocks) {
    const title = matchTag(block, 'title');
    const link = matchTag(block, 'link');
    const pubDate = matchTag(block, 'pubDate');
    if (title && link) {
      items.push({ title, url: link, source, publishedAt: pubDate });
    }
  }

  // Atom <entry>...</entry>
  const entryBlocks = xml.match(/<entry[\s\S]*?<\/entry>/gi) || [];
  for (const block of entryBlocks) {
    const title = matchTag(block, 'title');
    const updated = matchTag(block, 'updated') || matchTag(block, 'published');
    let url: string | undefined;

    const linkMatch =
      block.match(
        /<link[^>]*rel=['"]alternate['"][^>]*href=['"]([^'"]+)['"][^>]*\/?\s*>/i
      ) ||
      block.match(/<link[^>]*href=['"]([^'"]+)['"][^>]*\/?\s*>/i);
    if (linkMatch?.[1]) url = decodeXmlEntities(linkMatch[1]);

    if (title && url) {
      items.push({ title, url, source, publishedAt: updated });
    }
  }

  return items;
}

async function fetchWithTimeout(url: string, timeoutMs: number): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        'user-agent': 'ai-links-worker/0.1 (+rss fetch)',
        accept: 'application/rss+xml, application/atom+xml, application/xml, text/xml, */*',
      },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.text();
  } finally {
    clearTimeout(timeout);
  }
}

export async function getRecentItemsForAccount(params: {
  category?: AutomationAccountCategory | string;
  keyword?: string;
  maxItems?: number;
}): Promise<RecentItem[]> {
  const category = (params.category as AutomationAccountCategory) || AutomationAccountCategory.AI;
  const maxItems = params.maxItems ?? DEFAULT_MAX_ITEMS;

  const feeds = FEEDS_BY_CATEGORY[category] || FEEDS_BY_CATEGORY[AutomationAccountCategory.AI];
  const allItems: RecentItem[] = [];

  for (const feed of feeds) {
    const cacheKey = feed.url;
    const cached = cache.get(cacheKey);
    const now = Date.now();
    if (cached && cached.expiresAt > now) {
      allItems.push(...cached.items);
      continue;
    }

    try {
      const xml = await fetchWithTimeout(feed.url, DEFAULT_TIMEOUT_MS);
      const items = parseRssOrAtom(xml, feed.source).slice(0, maxItems);
      cache.set(cacheKey, { items, expiresAt: now + DEFAULT_CACHE_MS });
      allItems.push(...items);
    } catch (error) {
      logger.warn({ error, feed: feed.url }, 'Failed to fetch/parse feed');
    }
  }

  // Optional keyword bias: keep items mentioning the keyword first.
  const keyword = params.keyword?.trim();
  if (keyword) {
    const re = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    allItems.sort((a, b) => Number(re.test(b.title)) - Number(re.test(a.title)));
  }

  // De-dupe by URL.
  const seen = new Set<string>();
  const deduped: RecentItem[] = [];
  for (const item of allItems) {
    if (seen.has(item.url)) continue;
    seen.add(item.url);
    deduped.push(item);
    if (deduped.length >= maxItems) break;
  }

  return deduped;
}

export function getDefaultFeedsByCategory() {
  return FEEDS_BY_CATEGORY;
}
