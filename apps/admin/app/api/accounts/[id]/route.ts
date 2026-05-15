export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const { getFirestore, verifyIdToken } = require('@ai-links/firebase-admin');
// @ts-ignore
const { FieldPath } = require('firebase-admin/firestore');

async function verifyAuth(request: NextRequest): Promise<{ uid: string; admin: boolean } | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return process.env.NODE_ENV === 'production' ? null : { uid: 'dev-user', admin: true };
  }
  try {
    const decoded = await verifyIdToken(authHeader.substring(7));
    return { uid: decoded.uid, admin: Boolean((decoded as any).admin) };
  } catch {
    return process.env.NODE_ENV === 'production' ? null : { uid: 'dev-user', admin: true };
  }
}

async function deleteCollectionWhere(params: {
  db: any;
  collection: string;
  where: { field: string; op: FirebaseFirestore.WhereFilterOp; value: any };
  batchSize?: number;
}): Promise<number> {
  const batchSize = params.batchSize ?? 400;
  let deleted = 0;
  let lastDocId: string | null = null;

  while (true) {
    let q: FirebaseFirestore.Query = params.db.collection(params.collection).where(
      params.where.field,
      params.where.op,
      params.where.value
    );
    q = q.orderBy(FieldPath.documentId()).limit(batchSize);
    if (lastDocId) q = q.startAfter(lastDocId);

    const snap = await q.get();
    if (snap.empty) break;

    const batch = params.db.batch();
    snap.docs.forEach((d: any) => batch.delete(d.ref));
    await batch.commit();

    deleted += snap.size;
    lastDocId = snap.docs[snap.docs.length - 1]!.id;
  }

  return deleted;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const accountId = params.id;
    const db = getFirestore();

    const doc = await db.collection('automationAccounts').doc(accountId).get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Account not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      account: {
        id: doc.id,
        ...doc.data(),
      },
    });
  } catch (error) {
    console.error('Error fetching account:', error);
    return NextResponse.json(
      { error: 'Failed to fetch account' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = params.id;
    const db = getFirestore();

    const accountRef = db.collection('automationAccounts').doc(accountId);
    const accountSnap = await accountRef.get();
    if (!accountSnap.exists) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    const account: any = accountSnap.data();
    if (!auth.admin && account?.userId !== auth.uid) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Cancel/delete related automation artifacts (best-effort).
    // NOTE: This intentionally does not touch Firebase Auth users; only Firestore data.
    const jobIds: string[] = [];
    try {
      const jobsSnap = await db
        .collection('automationJobs')
        .where('accountId', '==', accountId)
        .limit(500)
        .get();
      jobsSnap.docs.forEach((d: any) => jobIds.push(d.id));
    } catch {
      // ignore
    }

    // Delete single-doc configs
    await db.collection('automationKeywords').doc(accountId).delete().catch(() => {});
    await db.collection('automationSchedules').doc(accountId).delete().catch(() => {});
    await db.collection('automationCommentSettings').doc(accountId).delete().catch(() => {});
    await db.collection('automationReactionSettings').doc(accountId).delete().catch(() => {});
    await db.collection('automationContentMemory').doc(accountId).delete().catch(() => {});

    // Delete collections keyed by accountId
    const deletedJobs = await deleteCollectionWhere({
      db,
      collection: 'automationJobs',
      where: { field: 'accountId', op: '==', value: accountId },
    });
    const deletedPosts = await deleteCollectionWhere({
      db,
      collection: 'posts',
      where: { field: 'authorUid', op: '==', value: accountId },
    });
    const deletedComments = await deleteCollectionWhere({
      db,
      collection: 'automationComments',
      where: { field: 'accountId', op: '==', value: accountId },
    });
    const deletedLogs = await deleteCollectionWhere({
      db,
      collection: 'automationActionLogs',
      where: { field: 'accountId', op: '==', value: accountId },
    });
    const deletedUsage = await deleteCollectionWhere({
      db,
      collection: 'dailyUsage',
      where: { field: 'accountId', op: '==', value: accountId },
    });

    // Best-effort: delete executions container docs for known jobs
    for (const jobId of jobIds.slice(0, 200)) {
      try {
        const execDoc = db.collection('automationJobExecutions').doc(jobId);
        const execSnap = await execDoc.collection('executions').limit(200).get();
        const batch = db.batch();
        execSnap.docs.forEach((d: any) => batch.delete(d.ref));
        batch.delete(execDoc);
        await batch.commit();
      } catch {
        // ignore
      }
    }

    await accountRef.delete();

    return NextResponse.json({
      success: true,
      deleted: {
        jobs: deletedJobs,
        posts: deletedPosts,
        comments: deletedComments,
        logs: deletedLogs,
        dailyUsage: deletedUsage,
      },
    });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
