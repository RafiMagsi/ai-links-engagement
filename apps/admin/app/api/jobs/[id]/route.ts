export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@ai-links/firebase-admin';
import { verifyIdToken } from '@ai-links/firebase-admin';
import { JobStatus, AutomationJob } from '@ai-links/shared-types';

async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = await verifyIdToken(token);
    return decoded.uid;
  } catch {
    return null;
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = params.id;
    const body = await request.json();
    const { action } = body;

    if (!['retry', 'cancel'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Must be "retry" or "cancel".' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const jobDoc = await db.collection('automationJobs').doc(jobId).get();

    if (!jobDoc.exists) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobDoc.data() as AutomationJob;
    const accountDoc = await db
      .collection('automationAccounts')
      .doc(job.accountId)
      .get();

    if (!accountDoc.exists || accountDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (action === 'retry') {
      // Reset job to pending for retry
      await jobDoc.ref.update({
        status: JobStatus.PENDING,
        attempts: 0,
        startedAt: null,
        completedAt: null,
        result: null,
        updatedAt: new Date(),
      });

      return NextResponse.json({ job: { ...job, status: JobStatus.PENDING } });
    }

    if (action === 'cancel') {
      // Cancel the job
      await jobDoc.ref.update({
        status: JobStatus.CANCELLED,
        completedAt: new Date(),
        updatedAt: new Date(),
      });

      return NextResponse.json({ job: { ...job, status: JobStatus.CANCELLED } });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error performing job action:', error);
    return NextResponse.json(
      { error: 'Failed to perform job action' },
      { status: 500 }
    );
  }
}
