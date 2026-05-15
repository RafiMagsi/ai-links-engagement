export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore, verifyIdToken } from '@ai-links/firebase-admin';

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

function serializeDate(value: any) {
  if (value && typeof value?.toDate === 'function') return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return value;
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
    const limit = parseInt(request.nextUrl.searchParams.get('limit') || '50', 10);

    const db = getFirestore();
    const snap = await db
      .collection('automationJobExecutions')
      .doc(jobId)
      .collection('executions')
      .orderBy('startedAt', 'desc')
      .limit(Math.min(Math.max(limit, 1), 100))
      .get();

    const executions = snap.docs.map((d) => {
      const data = d.data() as any;
      return {
        id: d.id,
        ...data,
        startedAt: serializeDate(data.startedAt),
        completedAt: serializeDate(data.completedAt),
        createdAt: serializeDate(data.createdAt),
        updatedAt: serializeDate(data.updatedAt),
        retryScheduledAt: serializeDate(data.retryScheduledAt),
      };
    });

    return NextResponse.json({ executions });
  } catch (error) {
    console.error('Error fetching job executions:', error);
    return NextResponse.json({ error: 'Failed to fetch executions' }, { status: 500 });
  }
}

