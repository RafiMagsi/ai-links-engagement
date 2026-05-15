export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UpdateKeywordsSchema } from '@ai-links/shared-types';

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

    const directDoc = await db.collection('automationKeywords').doc(accountId).get();
    if (directDoc.exists) {
      return NextResponse.json({ keywords: { id: directDoc.id, ...directDoc.data() } });
    }

    // Backward-compatibility: older versions stored keywords under a random doc id with an accountId field.
    const legacySnap = await db
      .collection('automationKeywords')
      .where('accountId', '==', accountId)
      .limit(1)
      .get();
    if (!legacySnap.empty) {
      const legacy = legacySnap.docs[0]!;
      return NextResponse.json({ keywords: { id: legacy.id, ...legacy.data() }, legacy: true });
    }

    return NextResponse.json({ keywords: null });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    return NextResponse.json({ error: 'Failed to fetch keywords' }, { status: 500 });
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

    const validation = UpdateKeywordsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid keywords data', details: validation.error.errors },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const data = validation.data;

    const keywordsRef = db.collection('automationKeywords').doc(accountId);
    const existingDoc = await keywordsRef.get();

    const keywordsData = {
      id: accountId,
      accountId,
      primaryKeywords: data.primaryKeywords,
      secondaryKeywords: data.secondaryKeywords,
      blockedKeywords: data.blockedKeywords,
      tonePreset: data.tonePreset,
      allowedIntents: data.allowedIntents,
      updatedAt: new Date(),
      createdAt: existingDoc.exists ? existingDoc.data()?.createdAt : new Date(),
    };

    await keywordsRef.set(keywordsData, { merge: true });

    return NextResponse.json({
      message: 'Keywords saved successfully',
      keywords: keywordsData,
    });
  } catch (error) {
    console.error('Error saving keywords:', error);
    return NextResponse.json(
      { error: 'Failed to save keywords' },
      { status: 500 }
    );
  }
}
