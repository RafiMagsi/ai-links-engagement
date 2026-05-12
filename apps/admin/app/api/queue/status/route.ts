export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@ai-links/firebase-admin';
import { verifyIdToken } from '@ai-links/firebase-admin';

export async function GET(request: NextRequest) {
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

    // Get queue metrics from Firestore (stored by worker)
    // For now, return a template response
    // In production, this would query BullMQ Redis keys or a metrics collection
    const metricsDoc = await firestore.collection('systemMetrics').doc('queue-status').get();

    let metrics = {
      postJobs: { pending: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      commentJobs: { pending: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      reactionJobs: { pending: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      schedulerJobs: { pending: 0, active: 0, completed: 0, failed: 0, delayed: 0 },
      timestamp: new Date(),
    };

    if (metricsDoc.exists) {
      metrics = { ...metrics, ...metricsDoc.data() };
    }

    return NextResponse.json(metrics);
  } catch (error) {
    console.error('Error fetching queue status:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
