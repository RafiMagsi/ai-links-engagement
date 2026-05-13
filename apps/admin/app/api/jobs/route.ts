export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@ai-links/firebase-admin';
import { verifyIdToken } from '@ai-links/firebase-admin';
import { AutomationJob, JobType, JobStatus } from '@ai-links/shared-types';
import { z } from 'zod';

const CreateJobSchema = z.object({
  accountId: z.string(),
  jobType: z.enum([JobType.POST_GENERATION, JobType.COMMENT_GENERATION]),
  payload: z.object({
    keyword: z.string().optional(),
    theme: z.string().optional(),
    contentId: z.string().optional(),
    targetProfileUrl: z.string().optional(),
    manualTrigger: z.boolean().default(true),
  }).optional(),
  priority: z.number().default(5),
});

type CreateJobInput = z.infer<typeof CreateJobSchema>;

async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    // In development, accept requests without auth for testing
    if (process.env.NODE_ENV === 'development') {
      return 'dev-user';
    }
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = await verifyIdToken(token);
    return decoded.uid;
  } catch {
    // In development, accept any Bearer token
    if (process.env.NODE_ENV === 'development') {
      return 'dev-user';
    }
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = request.nextUrl.searchParams.get('accountId');
    const status = request.nextUrl.searchParams.get('status');
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId query parameter is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Verify account existence (in development, skip ownership check)
    const accountDoc = await db.collection('automationAccounts').doc(accountId).get();
    if (!accountDoc.exists) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // In production, verify ownership. In development, allow access to any account
    if (process.env.NODE_ENV !== 'development') {
      if (accountDoc.data()?.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    let query = db
      .collection('automationJobs')
      .where('accountId', '==', accountId);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();

    const jobs = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ jobs });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = CreateJobSchema.parse(body);

    const db = getFirestore();

    // Verify account existence
    const accountDoc = await db.collection('automationAccounts').doc(data.accountId).get();
    if (!accountDoc.exists) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // In production, verify ownership. In development, allow access to any account
    if (process.env.NODE_ENV !== 'development') {
      if (accountDoc.data()?.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }
    }

    const jobId = db.collection('automationJobs').doc().id;

    const job: AutomationJob = {
      id: jobId,
      accountId: data.accountId,
      jobType: data.jobType,
      status: JobStatus.PENDING,
      priority: data.priority,
      payload: data.payload || {},
      attempts: 0,
      maxAttempts: 3,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('automationJobs').doc(jobId).set(job);

    return NextResponse.json({ job }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  }
}
