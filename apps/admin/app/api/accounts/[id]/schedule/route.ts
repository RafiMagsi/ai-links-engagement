export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UpdateScheduleSchema } from '@ai-links/shared-types';

const { getFirestore } = require('@ai-links/firebase-admin');

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const scheduleRef = db.collection('automationSchedules');
    const existing = await scheduleRef
      .where('accountId', '==', accountId)
      .limit(1)
      .get();

    const scheduleData = {
      accountId,
      weekdayPostWindow: data.weekdayPostWindow,
      weekendPostWindow: data.weekendPostWindow,
      weekdayCommentWindow: data.weekdayCommentWindow,
      weekendCommentWindow: data.weekendCommentWindow,
      timezone: data.timezone,
      minMinutesBetweenActions: data.minMinutesBetweenActions,
      weekdaysEnabled: data.weekdaysEnabled,
      updatedAt: new Date(),
      createdAt: existing.empty ? new Date() : existing.docs[0].data().createdAt,
    };

    if (existing.empty) {
      await scheduleRef.add(scheduleData);
    } else {
      await scheduleRef.doc(existing.docs[0].id).update(scheduleData);
    }

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
