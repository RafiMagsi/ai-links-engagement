export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, verifyIdToken } from '@ai-links/firebase-admin';
import { z } from 'zod';

// Use require() to avoid Next.js transpilation issues and TS module resolution problems
// @ts-ignore
const { FieldPath } = require('firebase-admin/firestore');

const PurgeSchema = z.object({
  scope: z.enum(['all', 'account']).default('all'),
  accountId: z.string().optional(),
  dryRun: z.boolean().default(true),
});

async function verifyAdmin(request: NextRequest): Promise<boolean> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) return false;
  try {
    const decoded = await verifyIdToken(authHeader.substring(7));
    return Boolean((decoded as any).admin);
  } catch {
    return false;
  }
}

function purgeEnabled(): boolean {
  if (process.env.ALLOW_PURGE === 'true') return true;
  return process.env.NODE_ENV === 'development';
}

async function deleteCollection(params: {
  collection: string;
  where?: { field: string; op: FirebaseFirestore.WhereFilterOp; value: any };
  dryRun: boolean;
}): Promise<{ collection: string; deleted: number }> {
  const db = getFirestore();
  const batchSize = 400;
  let deleted = 0;

  // Loop until the query is empty.
  // Use ordering by documentId() to paginate reliably.
  let lastDocId: string | null = null;
  while (true) {
    let query: FirebaseFirestore.Query = db.collection(params.collection);
    if (params.where) {
      query = query.where(params.where.field, params.where.op, params.where.value);
    }
    query = query.orderBy(FieldPath.documentId()).limit(batchSize);
    if (lastDocId) {
      query = query.startAfter(lastDocId);
    }

    const snap = await query.get();
    if (snap.empty) break;

    if (!params.dryRun) {
      const batch = db.batch();
      for (const doc of snap.docs) batch.delete(doc.ref);
      await batch.commit();
    }

    deleted += snap.size;
    lastDocId = snap.docs[snap.docs.length - 1]!.id;
  }

  return { collection: params.collection, deleted };
}

export async function POST(request: NextRequest) {
  try {
    if (!purgeEnabled()) {
      return NextResponse.json(
        { error: 'Purge is disabled. Set ALLOW_PURGE=true (or run in development).' },
        { status: 403 }
      );
    }

    const isAdmin = await verifyAdmin(request);
    if (!isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const input = PurgeSchema.parse(body);
    if (input.scope === 'account' && !input.accountId) {
      return NextResponse.json({ error: 'accountId is required for scope=account' }, { status: 400 });
    }

    const accountId = input.accountId;

    const results: Array<{ collection: string; deleted: number }> = [];

    // Account-scoped deletes (best-effort; not every collection is strictly keyed by accountId).
    // For "all", also wipe global collections.
    if (input.scope === 'account') {
      results.push(
        await deleteCollection({
          collection: 'automationJobs',
          where: { field: 'accountId', op: '==', value: accountId },
          dryRun: input.dryRun,
        })
      );
      results.push(
        await deleteCollection({
          collection: 'automationActionLogs',
          where: { field: 'accountId', op: '==', value: accountId },
          dryRun: input.dryRun,
        })
      );
      results.push(
        await deleteCollection({
          collection: 'posts',
          where: { field: 'authorUid', op: '==', value: accountId },
          dryRun: input.dryRun,
        })
      );

      // Single-doc collections per account
      if (!input.dryRun) {
        const db = getFirestore();
        await db.collection('automationAccounts').doc(accountId!).delete().catch(() => {});
        await db.collection('automationKeywords').doc(accountId!).delete().catch(() => {});
        await db.collection('automationSchedules').doc(accountId!).delete().catch(() => {});
        await db.collection('automationContentMemory').doc(accountId!).delete().catch(() => {});
      }

      return NextResponse.json({
        scope: input.scope,
        accountId,
        dryRun: input.dryRun,
        results,
      });
    }

    // Global wipe (dev-only / explicitly enabled).
    for (const collection of [
      'automationJobs',
      'automationActionLogs',
      'automationAccounts',
      'automationKeywords',
      'automationSchedules',
      'automationContentMemory',
      'dailyUsage',
      'automationDailyUsage',
      'posts',
    ]) {
      results.push(await deleteCollection({ collection, dryRun: input.dryRun }));
    }

    return NextResponse.json({
      scope: input.scope,
      dryRun: input.dryRun,
      results,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Invalid request', details: error.errors }, { status: 400 });
    }
    return NextResponse.json(
      { error: 'Failed to purge', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
