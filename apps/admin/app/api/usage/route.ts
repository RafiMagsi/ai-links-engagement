export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@ai-links/firebase-admin';
import { verifyIdToken } from '@ai-links/firebase-admin';
import { DailyUsage } from '@ai-links/shared-types';

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

function getTodayDate(): string {
  const today = new Date();
  return today.toISOString().split('T')[0];
}

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const days = parseInt(request.nextUrl.searchParams.get('days') || '7', 10);

    try {
      const db = getFirestore();

      // Get usage for the last N days
      const usageHistory: DailyUsage[] = [];
      const today = new Date();

      for (let i = 0; i < days; i++) {
        const date = new Date(today);
        date.setDate(date.getDate() - i);
        const dateStr = date.toISOString().split('T')[0];

        const doc = await db.collection('automationDailyUsage').doc(dateStr).get();
        if (doc.exists) {
          usageHistory.push(doc.data() as DailyUsage);
        }
      }

      // Get today's usage
      const todayUsageDoc = await db
        .collection('automationDailyUsage')
        .doc(getTodayDate())
        .get();

      let todayUsage: DailyUsage | null = null;
      if (todayUsageDoc.exists) {
        todayUsage = todayUsageDoc.data() as DailyUsage;
      }

      return NextResponse.json({ todayUsage, usageHistory });
    } catch (dbError) {
      console.error('Database error:', dbError);
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ todayUsage: null, usageHistory: [] });
      }
      throw dbError;
    }
  } catch (error) {
    console.error('Error fetching usage:', error);
    return NextResponse.json(
      { error: 'Failed to fetch usage' },
      { status: 500 }
    );
  }
}
