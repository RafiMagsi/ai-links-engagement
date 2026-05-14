export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { getFirestore } from '@ai-links/firebase-admin';

export async function GET() {
  try {
    const db = getFirestore();

    // Query for pending jobs
    const snapshot = await db
      .collection('automationJobs')
      .where('status', '==', 'pending')
      .limit(10)
      .get();

    const jobs = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({
      totalPending: jobs.length,
      jobs,
      statuses: {
        pending: (
          await db
            .collection('automationJobs')
            .where('status', '==', 'pending')
            .get()
        ).size,
        processing: (
          await db
            .collection('automationJobs')
            .where('status', '==', 'processing')
            .get()
        ).size,
        completed: (
          await db
            .collection('automationJobs')
            .where('status', '==', 'completed')
            .get()
        ).size,
        failed: (
          await db
            .collection('automationJobs')
            .where('status', '==', 'failed')
            .get()
        ).size,
      },
    });
  } catch (error) {
    console.error('Error fetching pending jobs:', error);
    return NextResponse.json(
      {
        error: 'Failed to fetch pending jobs',
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
