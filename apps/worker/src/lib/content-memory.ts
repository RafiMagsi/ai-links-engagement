import { getFirestore } from '@ai-links/firebase-admin';
import { getLogger } from './logger.js';

const logger = getLogger();

export type ContentMemory = {
  recentContentHashes: Array<{ hash: string; usedAt: string }>;
  recentHeadlineUrls: Array<{ url: string; usedAt: string }>;
  updatedAt?: string;
};

const DEFAULT_DAYS = 7;

function cutoffIso(days: number): string {
  const ms = days * 24 * 60 * 60 * 1000;
  return new Date(Date.now() - ms).toISOString();
}

export async function loadContentMemory(params: { accountId: string; days?: number }): Promise<ContentMemory> {
  const db = getFirestore();
  const days = params.days ?? DEFAULT_DAYS;
  const cutoff = cutoffIso(days);

  const ref = db.collection('automationContentMemory').doc(params.accountId);
  const snap = await ref.get();

  const data: any = snap.exists ? snap.data() : null;
  const recentContentHashes = Array.isArray(data?.recentContentHashes) ? data.recentContentHashes : [];
  const recentHeadlineUrls = Array.isArray(data?.recentHeadlineUrls) ? data.recentHeadlineUrls : [];

  const normalized: ContentMemory = {
    recentContentHashes: recentContentHashes
      .filter((x: any) => x?.hash && x?.usedAt && x.usedAt >= cutoff)
      .slice(-200),
    recentHeadlineUrls: recentHeadlineUrls
      .filter((x: any) => x?.url && x?.usedAt && x.usedAt >= cutoff)
      .slice(-200),
    updatedAt: data?.updatedAt,
  };

  return normalized;
}

export async function appendContentMemory(params: {
  accountId: string;
  contentHash?: string;
  headlineUrls?: string[];
}): Promise<void> {
  const db = getFirestore();
  const ref = db.collection('automationContentMemory').doc(params.accountId);
  const nowIso = new Date().toISOString();

  const snap = await ref.get();
  const current: any = snap.exists ? snap.data() : {};

  const updates: any = { updatedAt: nowIso };
  if (params.contentHash) {
    const hashes = Array.isArray(current?.recentContentHashes) ? current.recentContentHashes : [];
    updates.recentContentHashes = [...hashes, { hash: params.contentHash, usedAt: nowIso }].slice(-400);
  }
  if (params.headlineUrls && params.headlineUrls.length > 0) {
    const urls = Array.isArray(current?.recentHeadlineUrls) ? current.recentHeadlineUrls : [];
    updates.recentHeadlineUrls = [
      ...urls,
      ...params.headlineUrls.map((url) => ({ url, usedAt: nowIso })),
    ].slice(-400);
  }

  try {
    await ref.set(updates, { merge: true });
  } catch (error) {
    logger.warn({ error, accountId: params.accountId }, 'Failed to update content memory');
  }
}
