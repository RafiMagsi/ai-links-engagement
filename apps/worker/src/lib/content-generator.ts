import { OpenAI } from 'openai';
import { AutomationKeywords, TonePreset, ContentIntent } from '@ai-links/shared-types';
import { getLogger } from './logger.js';
import { z } from 'zod';
import type { RecentItem } from './recent-content-sources.js';

export const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';

const POST_MIN_CHARS = parseInt(process.env.POST_MIN_CHARS || '50', 10);
const POST_MAX_CHARS = parseInt(process.env.POST_MAX_CHARS || '280', 10);
const COMMENT_MIN_CHARS = parseInt(process.env.COMMENT_MIN_CHARS || '50', 10);
const COMMENT_MAX_CHARS = parseInt(process.env.COMMENT_MAX_CHARS || '280', 10);

const GeneratedContentSchema = z.object({
  content: z.string().min(10).max(3000),
  hashtags: z.array(z.string()).optional(),
  emoji: z.array(z.string()).optional(),
  tokensUsed: z.number().optional(),
  inputTokens: z.number().optional(),
  outputTokens: z.number().optional(),
});

type GeneratedContent = z.infer<typeof GeneratedContentSchema>;

interface GenerationContext {
  keyword: string;
  keywords: AutomationKeywords;
  previousContent?: string[];
  recentItems?: RecentItem[];
}

class ContentGenerator {
  private openai: OpenAI;
  private logger = getLogger();

  constructor() {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is required');
    }
    this.openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  private getToneDescription(tone: TonePreset): string {
    const toneMap: Record<TonePreset, string> = {
      [TonePreset.PROFESSIONAL]: 'professional and formal tone',
      [TonePreset.FRIENDLY]: 'friendly and conversational tone',
      [TonePreset.EDUCATIONAL]: 'educational and informative tone',
      [TonePreset.INSPIRATIONAL]: 'inspirational and motivational tone',
      [TonePreset.HUMOROUS]: 'humorous and witty tone',
    };
    return toneMap[tone];
  }

  private getIntentDescriptions(intents: ContentIntent[]): string {
    const intentMap: Record<ContentIntent, string> = {
      [ContentIntent.KNOWLEDGE_SHARING]: 'share knowledge and insights',
      [ContentIntent.QUESTION]: 'ask thoughtful questions to engage the community',
      [ContentIntent.INDUSTRY_NEWS]: 'comment on industry trends and news',
      [ContentIntent.PERSONAL_STORY]: 'share a personal or professional story',
      [ContentIntent.CALL_TO_ACTION]: 'inspire people to take action',
    };

    return intents.map((intent) => intentMap[intent]).join(', or ');
  }

  private clampToMaxChars(text: string, maxChars: number): string {
    const trimmed = text.trim();
    if (trimmed.length <= maxChars) return trimmed;

    const slice = trimmed.slice(0, maxChars);

    // Prefer ending on a sentence boundary.
    const sentenceEnd = slice.match(/[\s\S]*[.?!](?=\s|$)/);
    if (sentenceEnd?.[0] && sentenceEnd[0].length >= Math.floor(maxChars * 0.7)) {
      return sentenceEnd[0].trim();
    }

    // Otherwise, end on the last comma or whitespace boundary.
    const commaIdx = slice.lastIndexOf(',');
    if (commaIdx > Math.floor(maxChars * 0.6)) {
      return slice.slice(0, commaIdx + 1).trim();
    }

    const spaceIdx = slice.lastIndexOf(' ');
    if (spaceIdx > Math.floor(maxChars * 0.6)) {
      return slice.slice(0, spaceIdx).trim();
    }

    return slice.trim();
  }

  async generatePost(context: GenerationContext): Promise<GeneratedContent> {
    const { keyword, keywords } = context;
    const recent = (context.recentItems || []).slice(0, 5);
    const recentBullets =
      recent.length > 0
        ? `\nRecent items to reference (pick ONE angle, don't copy headlines verbatim):\n${recent
            .map((i) => `- ${i.title} (${i.source})`)
            .join('\n')}\n`
        : '';

    const previous = (context.previousContent || [])
      .map((t) => t.trim())
      .filter(Boolean)
      .slice(0, 5);
    const previousBlock =
      previous.length > 0
        ? `\nRecent posts to avoid repeating (don't reuse the same hook or structure):\n${previous
            .map((t) => `- ${t.substring(0, 120)}`)
            .join('\n')}\n`
        : '';

    const prompt = `You are a LinkedIn content expert. Generate an engaging LinkedIn post about "${keyword}".

Tone: ${this.getToneDescription(keywords.tonePreset)}
Intent: The post should ${this.getIntentDescriptions(keywords.allowedIntents)}
Related topics: ${keywords.primaryKeywords.join(', ')}

Avoid these topics: ${keywords.blockedKeywords.join(', ')}
${recentBullets}
${previousBlock}

Guidelines:
- The post must be substantially different from the "Recent posts to avoid repeating" list (do NOT reuse the same opening line or any full sentence).
- Avoid generic filler like "The AI landscape is evolving rapidly" unless you add a concrete, specific angle.
- Include at least one specific, actionable takeaway or opinion (not just a summary).
- Keep it authentic and genuine
- Use natural language, not overly promotional
- Include relevant hashtags if appropriate
- Use 1-3 emojis for visual appeal
- Length: ${POST_MIN_CHARS}-${POST_MAX_CHARS} characters (hard limit: never exceed ${POST_MAX_CHARS})
- Make it shareable and comment-worthy

Generate ONLY the post content, without any meta information.`;

    try {
      const maxTokens = Math.min(300, Math.max(80, Math.ceil(POST_MAX_CHARS / 4) + 40));
      const response = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      });

      const content = response.choices[0]?.message?.content || '';
      const clamped = this.clampToMaxChars(content, POST_MAX_CHARS);
      const tokensUsed = response.usage?.total_tokens ?? undefined;
      const inputTokens = response.usage?.prompt_tokens ?? undefined;
      const outputTokens = response.usage?.completion_tokens ?? undefined;

      this.logger.info(
        { keyword, tokensUsed, inputTokens, outputTokens },
        'Post generated successfully'
      );

      return {
        content: clamped,
        tokensUsed,
        inputTokens,
        outputTokens,
      };
    } catch (error) {
      this.logger.error({ error, keyword }, 'Failed to generate post');
      throw error;
    }
  }

  async generateComment(
    postContent: string,
    context: GenerationContext
  ): Promise<GeneratedContent> {
    const { keyword, keywords } = context;

    const prompt = `You are a LinkedIn engagement expert. Generate a thoughtful comment on a LinkedIn post about "${keyword}".

Original post excerpt: "${postContent.substring(0, 200)}..."

Tone: ${this.getToneDescription(keywords.tonePreset)}
Intent: The comment should ${this.getIntentDescriptions(keywords.allowedIntents)}

Guidelines:
- Be genuine and add value to the conversation
- Ask a follow-up question or provide insight
- Keep it concise (${COMMENT_MIN_CHARS}-${COMMENT_MAX_CHARS} characters) (hard limit: never exceed ${COMMENT_MAX_CHARS})
- Don't be overly promotional
- Use 0-2 emojis if it adds value

Generate ONLY the comment text, without any meta information.`;

    try {
      const maxTokens = Math.min(150, Math.max(40, Math.ceil(COMMENT_MAX_CHARS / 4) + 30));
      const response = await this.openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: maxTokens,
      });

      const content = response.choices[0]?.message?.content || '';
      const clamped = this.clampToMaxChars(content, COMMENT_MAX_CHARS);
      const tokensUsed = response.usage?.total_tokens ?? undefined;
      const inputTokens = response.usage?.prompt_tokens ?? undefined;
      const outputTokens = response.usage?.completion_tokens ?? undefined;

      this.logger.info(
        { keyword, tokensUsed, inputTokens, outputTokens },
        'Comment generated successfully'
      );

      return {
        content: clamped,
        tokensUsed,
        inputTokens,
        outputTokens,
      };
    } catch (error) {
      this.logger.error({ error, keyword }, 'Failed to generate comment');
      throw error;
    }
  }

  validateContent(content: GeneratedContent): boolean {
    try {
      GeneratedContentSchema.parse(content);
      return true;
    } catch (error) {
      this.logger.warn({ error }, 'Content validation failed');
      return false;
    }
  }
}

export const contentGenerator = new ContentGenerator();
