export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@ai-links/firebase-admin';
import { verifyIdToken } from '@ai-links/firebase-admin';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyIdToken(token);

    // Verify admin claim
    if (!decodedToken.admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const firestore = getFirestore();

    // Get the original job log
    const jobDoc = await firestore.collection('automationActionLogs').doc(params.id).get();

    if (!jobDoc.exists) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const jobData = jobDoc.data();

    if (jobData?.success) {
      return NextResponse.json(
        { error: 'Cannot retry successful job' },
        { status: 400 }
      );
    }

    // Create a new automationJob for retry
    const accountId = jobData?.accountId;
    const actionType = jobData?.actionType;

    // In a real implementation, this would re-queue the job with BullMQ
    // For now, create a record of the retry attempt
    const retryLog = {
      originalJobId: params.id,
      accountId,
      actionType,
      status: 'pending',
      attempts: (jobData?.attempts || 0) + 1,
      createdAt: new Date(),
      retriedAt: new Date(),
      requestedBy: decodedToken.uid,
    };

    await firestore.collection('jobRetries').doc().set(retryLog);

    // Log the retry action
    const logId = firestore.collection('automationActionLogs').doc().id;
    await firestore.collection('automationActionLogs').doc(logId).set({
      id: logId,
      accountId,
      actionType: 'job_retry_initiated',
      targetContentId: params.id,
      success: true,
      details: {
        originalJobId: params.id,
        retryAttempt: (jobData?.attempts || 0) + 1,
      },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Job retry initiated',
      retryLog,
      logId,
    });
  } catch (error) {
    console.error('Error retrying job:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
