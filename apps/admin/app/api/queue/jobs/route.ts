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
    const url = new URL(request.url);
    const status = url.searchParams.get('status'); // 'failed', 'pending', 'completed'
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Query automationActionLogs instead (which stores job execution records)
    let query = firestore.collection('automationActionLogs') as any;

    if (status === 'failed') {
      query = query.where('success', '==', false);
    }

    const snapshot = await query
      .orderBy('createdAt', 'desc')
      .limit(limit + 1)
      .offset(offset)
      .get();

    const jobs = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
    }));

    return NextResponse.json({
      jobs: jobs.slice(0, limit),
      hasMore: jobs.length > limit,
      total: snapshot.docs.length,
    });
  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
