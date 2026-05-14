export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@ai-links/firebase-admin';
import { verifyIdToken } from '@ai-links/firebase-admin';
import { AutomationJob, JobType, JobStatus } from '@ai-links/shared-types';
import { z } from 'zod';

function serializeDate(value: any) {
  if (value && typeof value?.toDate === 'function') {
    return value.toDate().toISOString();
  }
  if (value instanceof Date) {
    return value.toISOString();
  }
  return value;
}

function serializeJob(job: any): any {
  return {
    ...job,
    createdAt: serializeDate(job.createdAt),
    updatedAt: serializeDate(job.updatedAt),
    startedAt: serializeDate(job.startedAt),
    completedAt: serializeDate(job.completedAt),
    nextRetryAt: serializeDate(job.nextRetryAt),
  };
}

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

  // Allow unauthenticated access only in development/test to keep local setup simple.
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

    // Verify account exists (for admin dashboard, allow access to any account if authenticated)
    const accountDoc = await db.collection('automationAccounts').doc(accountId).get();
    if (!accountDoc.exists) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Avoid composite index requirements by doing a simple query then filtering/sorting in memory.
    // This keeps the admin dashboard working even when Firestore indexes aren't configured yet.
    const fetchLimit = Math.min(Math.max(limit, 1) * 4, 200);
    const snapshot = await db
      .collection('automationJobs')
      .where('accountId', '==', accountId)
      .limit(fetchLimit)
      .get();

    let jobs = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...serializeJob(doc.data()),
    })) as AutomationJob[];

    if (status) {
      jobs = jobs.filter((j) => j.status === status);
    }

    jobs.sort((a: any, b: any) => {
      const aTime = a.createdAt ? new Date(a.createdAt as any).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt as any).getTime() : 0;
      return bTime - aTime;
    });

    return NextResponse.json({ jobs: jobs.slice(0, limit) });
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
    const data: CreateJobInput = CreateJobSchema.parse(body);

    const db = getFirestore();

    // Verify account exists (for admin dashboard, allow access to any account if authenticated)
    const accountDoc = await db.collection('automationAccounts').doc(data.accountId).get();
    if (!accountDoc.exists) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
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

    return NextResponse.json({ job: serializeJob(job) }, { status: 201 });
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
