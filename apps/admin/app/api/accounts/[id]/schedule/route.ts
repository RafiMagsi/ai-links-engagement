export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UpdateScheduleSchema } from '@ai-links/shared-types';

const { getFirestore, verifyIdToken } = require('@ai-links/firebase-admin');

async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return process.env.NODE_ENV === 'production' ? null : 'dev-user';
  }
  try {
    const decoded = await verifyIdToken(authHeader.substring(7));
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

    const accountId = params.id;
    const db = getFirestore();

    const directDoc = await db.collection('automationSchedules').doc(accountId).get();
    if (directDoc.exists) {
      return NextResponse.json({ schedule: { id: directDoc.id, ...directDoc.data() } });
    }

    // Backward-compatibility: older versions stored schedule under a random doc id with an accountId field.
    const legacySnap = await db
      .collection('automationSchedules')
      .where('accountId', '==', accountId)
      .limit(1)
      .get();
    if (!legacySnap.empty) {
      const legacy = legacySnap.docs[0]!;
      return NextResponse.json({ schedule: { id: legacy.id, ...legacy.data() }, legacy: true });
    }

    return NextResponse.json({ schedule: null });
  } catch (error) {
    console.error('Error fetching schedule:', error);
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 });
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

    const accountId = params.id;
    const body = await request.json();

    const validation = UpdateScheduleSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid schedule data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const data = validation.data;

    const scheduleRef = db.collection('automationSchedules').doc(accountId);
    const existingDoc = await scheduleRef.get();

    const scheduleData = {
      id: accountId,
      accountId,
      weekdayPostWindow: data.weekdayPostWindow,
      weekendPostWindow: data.weekendPostWindow,
      weekdayCommentWindow: data.weekdayCommentWindow,
      weekendCommentWindow: data.weekendCommentWindow,
      timezone: data.timezone,
      minMinutesBetweenActions: data.minMinutesBetweenActions,
      weekdaysEnabled: data.weekdaysEnabled,
      updatedAt: new Date(),
      createdAt: existingDoc.exists ? existingDoc.data()?.createdAt : new Date(),
    };

    await scheduleRef.set(scheduleData, { merge: true });

    return NextResponse.json({
      message: 'Schedule saved successfully',
      schedule: scheduleData,
    });
  } catch (error) {
    console.error('Error saving schedule:', error);
    return NextResponse.json(
      { error: 'Failed to save schedule' },
      { status: 500 }
    );
  }
}
