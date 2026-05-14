export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@ai-links/firebase-admin';
import { verifyIdToken } from '@ai-links/firebase-admin';

async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    return process.env.NODE_ENV === 'production' ? null : 'dev-user';
  }

  const token = authHeader.substring(7);
  try {
    const decoded = await verifyIdToken(token);
    return decoded.uid;
  } catch {
    return process.env.NODE_ENV === 'production' ? null : 'dev-user';
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const jobId = params.id;
    const db = getFirestore();

    // Fetch the specific job from automationJobs collection
    const jobDoc = await db.collection('automationJobs').doc(jobId).get();

    if (!jobDoc.exists) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    const job = jobDoc.data() as any;

    // Serialize timestamps to ISO strings
    const serializeDate = (date: any) => {
      if (typeof date?.toDate === 'function') {
        return date.toDate().toISOString();
      }
      return date;
    };

    const serializedJob = {
      ...job,
      createdAt: serializeDate(job.createdAt),
      updatedAt: serializeDate(job.updatedAt),
      startedAt: serializeDate(job.startedAt),
      completedAt: serializeDate(job.completedAt),
      nextRetryAt: serializeDate(job.nextRetryAt),
    };

    return NextResponse.json({ job: serializedJob });
  } catch (error) {
    console.error('Error fetching job details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job details' },
      { status: 500 }
    );
  }
}
