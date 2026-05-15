export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@ai-links/firebase-admin';
import { verifyIdToken } from '@ai-links/firebase-admin';
import { DailyUsage } from '@ai-links/shared-types';

async function verifyAuth(request: NextRequest): Promise<{ uid: string; admin: boolean } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  if (process.env.NODE_ENV === 'development') {
    return { uid: 'dev-user', admin: true };
  }

  try {
    const decoded = await verifyIdToken(token);
    return { uid: decoded.uid, admin: Boolean((decoded as any).admin) };
  } catch {
    return null;
  }
}

function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

function toIsoDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

function looksLikeIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function coerceDocDate(docId: string, data: any): string | null {
  const direct = typeof data?.date === 'string' ? data.date : null;
  if (direct && looksLikeIsoDate(direct)) return direct;

  // Back-compat: older writers used doc ids like `${accountId}_${YYYY-MM-DD}` without setting `date`.
  const parts = String(docId || '').split('_');
  const last = parts[parts.length - 1];
  if (looksLikeIsoDate(last)) return last;

  // Fallback to updatedAt if present.
  const updatedAt = data?.updatedAt;
  try {
    const asDate: Date | null =
      updatedAt?.toDate?.() instanceof Date
        ? updatedAt.toDate()
        : updatedAt instanceof Date
          ? updatedAt
          : null;
    return asDate ? toIsoDate(asDate) : null;
  } catch {
    return null;
  }
}

function emptyDailyUsage(date: string): DailyUsage {
  return {
    id: date,
    date,
    postsCreated: 0,
    commentsCreated: 0,
    reactionsAdded: 0,
    totalActions: 0,
    quotaPostsRemaining: 0,
    quotaCommentsRemaining: 0,
    quotaReactionsRemaining: 0,
    quotaTotalRemaining: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (!auth.admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const days = parseInt(request.nextUrl.searchParams.get('days') || '7', 10);

    try {
      const db = getFirestore();

      const today = new Date();
      const start = new Date(today);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - Math.max(days - 1, 0));
      const startDateStr = toIsoDate(start);

      // Aggregate per-account usage docs into system-wide daily buckets.
      const byDate = new Map<string, DailyUsage>();
      const seenDocIds = new Set<string>();

      const applyUsageDocs = (docs: FirebaseFirestore.QueryDocumentSnapshot[]) => {
        for (const doc of docs) {
          if (seenDocIds.has(doc.id)) continue;
          seenDocIds.add(doc.id);

          const data = doc.data() as any;
          const date = coerceDocDate(doc.id, data);
          if (!date) continue;
          if (date < startDateStr) continue;

          const current = byDate.get(date) || emptyDailyUsage(date);
          current.postsCreated += Number(data.postsCreated || 0);
          current.commentsCreated += Number(data.commentsCreated || 0);
          current.reactionsAdded += Number(data.reactionsAdded || 0);
          current.totalActions += Number(data.totalActions || 0);
          byDate.set(date, current);
        }
      };

      // Primary path: docs that include `date`.
      try {
        const usageSnap = await db
          .collection('dailyUsage')
          .where('date', '>=', startDateStr)
          .get();
        applyUsageDocs(usageSnap.docs);
      } catch {
        // Ignore; we'll fall back to updatedAt query below.
      }

      // Back-compat: older docs might be missing `date` but have `updatedAt`.
      try {
        const usageSnapByUpdatedAt = await db
          .collection('dailyUsage')
          .where('updatedAt', '>=', start)
          .get();
        applyUsageDocs(usageSnapByUpdatedAt.docs);
      } catch {
        // Ignore; if both fail the history will show zeros.
      }

      // Ensure we return a row per day even if empty.
      const usageHistory: DailyUsage[] = [];
      for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(d.getDate() + i);
        const dateStr = toIsoDate(d);
        usageHistory.push(byDate.get(dateStr) || emptyDailyUsage(dateStr));
      }

      const todayUsage = byDate.get(getTodayDate()) || emptyDailyUsage(getTodayDate());

      // System breakdown (best-effort; avoids failing the whole endpoint if an index is missing).
      const breakdown: any = {};
      const startTs = start;
      try {
        const jobsCount = await db
          .collection('automationJobs')
          .where('createdAt', '>=', startTs)
          .count()
          .get();
        breakdown.jobsCreated = jobsCount.data().count;
      } catch {
        breakdown.jobsCreated = null;
      }

      try {
        const postsCount = await db
          .collection('posts')
          .where('createdAt', '>=', startTs)
          .count()
          .get();
        breakdown.postsCreated = postsCount.data().count;
      } catch {
        breakdown.postsCreated = null;
      }

      try {
        const commentsCount = await db
          .collection('automationComments')
          .where('createdAt', '>=', startTs)
          .count()
          .get();
        breakdown.commentsCreated = commentsCount.data().count;
      } catch {
        breakdown.commentsCreated = null;
      }

      // Executions + tokens: collectionGroup query
      try {
        const execSnap = await db
          .collectionGroup('executions')
          .where('startedAt', '>=', startTs)
          .select('resultSummary', 'startedAt')
          .get();
        let totalTokens = 0;
        let totalInputTokens = 0;
        let totalOutputTokens = 0;
        execSnap.docs.forEach((d: any) => {
          const ex = d.data() as any;
          const tokens = Number(ex?.resultSummary?.tokensUsed || 0);
          const inputTokens = Number(ex?.resultSummary?.inputTokens || 0);
          const outputTokens = Number(ex?.resultSummary?.outputTokens || 0);
          totalTokens += tokens;
          totalInputTokens += inputTokens;
          totalOutputTokens += outputTokens;
        });
        breakdown.executions = execSnap.size;
        breakdown.totalTokens = totalTokens;
        breakdown.avgTokensPerExecution = execSnap.size > 0 ? Math.round(totalTokens / execSnap.size) : 0;
        breakdown.totalInputTokens = totalInputTokens;
        breakdown.totalOutputTokens = totalOutputTokens;
        breakdown.avgInputTokensPerExecution =
          execSnap.size > 0 ? Math.round(totalInputTokens / execSnap.size) : 0;
        breakdown.avgOutputTokensPerExecution =
          execSnap.size > 0 ? Math.round(totalOutputTokens / execSnap.size) : 0;
      } catch {
        breakdown.executions = 0;
        breakdown.totalTokens = 0;
        breakdown.avgTokensPerExecution = 0;
        breakdown.totalInputTokens = 0;
        breakdown.totalOutputTokens = 0;
        breakdown.avgInputTokensPerExecution = 0;
        breakdown.avgOutputTokensPerExecution = 0;
      }

      return NextResponse.json({ todayUsage, usageHistory, breakdown });
    } catch (dbError) {
      console.error('Database error:', dbError);
      return NextResponse.json(
        { error: 'Database error while fetching usage' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}
