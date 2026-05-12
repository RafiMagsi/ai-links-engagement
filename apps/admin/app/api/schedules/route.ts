export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@ai-links/firebase-admin';
import { verifyIdToken } from '@ai-links/firebase-admin';
import { AutomationSchedule, PostWindow } from '@ai-links/shared-types';
import { z } from 'zod';

const PostWindowSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  enabled: z.boolean(),
});

const UpdateScheduleSchema = z.object({
  accountId: z.string(),
  weekdayPostWindow: PostWindowSchema,
  weekendPostWindow: PostWindowSchema,
  weekdayCommentWindow: PostWindowSchema,
  weekendCommentWindow: PostWindowSchema,
  timezone: z.string(),
  minMinutesBetweenActions: z.number().min(1),
  weekdaysEnabled: z.array(z.boolean()).length(7),
});

type UpdateScheduleInput = z.infer<typeof UpdateScheduleSchema>;

async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);

  // In development, accept any Bearer token
  if (process.env.NODE_ENV === 'development') {
    return 'dev-user';
  }

  try {
    const decoded = await verifyIdToken(token);
    return decoded.uid;
  } catch {
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
    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId query parameter is required' },
        { status: 400 }
      );
    }

    try {
      const db = getFirestore();

      // Verify account ownership
      const accountDoc = await db.collection('automationAccounts').doc(accountId).get();
      if (!accountDoc.exists || accountDoc.data()?.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
      }

      const scheduleDoc = await db.collection('automationSchedules').doc(accountId).get();

      if (!scheduleDoc.exists) {
        return NextResponse.json({ schedule: null });
      }

      return NextResponse.json({ schedule: scheduleDoc.data() });
    } catch (dbError) {
      console.error('Database error:', dbError);
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ schedule: null });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json(
      { error: 'Failed to fetch schedule' },
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
    const data = UpdateScheduleSchema.parse(body);

    const db = getFirestore();

    // Verify account ownership
    const accountDoc = await db.collection('automationAccounts').doc(data.accountId).get();
    if (!accountDoc.exists || accountDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const schedule: AutomationSchedule = {
      id: data.accountId,
      accountId: data.accountId,
      weekdayPostWindow: data.weekdayPostWindow,
      weekendPostWindow: data.weekendPostWindow,
      weekdayCommentWindow: data.weekdayCommentWindow,
      weekendCommentWindow: data.weekendCommentWindow,
      timezone: data.timezone,
      minMinutesBetweenActions: data.minMinutesBetweenActions,
      weekdaysEnabled: data.weekdaysEnabled,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('automationSchedules').doc(data.accountId).set(schedule);

    return NextResponse.json({ schedule }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating schedule:', error);
    return NextResponse.json(
      { error: 'Failed to update schedule' },
      { status: 500 }
    );
  }
}
