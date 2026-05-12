export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { UpdateKeywordsSchema } from '@ai-links/shared-types';

const { getFirestore } = require('@ai-links/firebase-admin');

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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

    const keywordsRef = db.collection('automationKeywords');
    const existing = await keywordsRef
      .where('accountId', '==', accountId)
      .limit(1)
      .get();

    const keywordsData = {
      accountId,
      primaryKeywords: data.primaryKeywords,
      secondaryKeywords: data.secondaryKeywords,
      blockedKeywords: data.blockedKeywords,
      tonePreset: data.tonePreset,
      allowedIntents: data.allowedIntents,
      updatedAt: new Date(),
      createdAt: existing.empty ? new Date() : existing.docs[0].data().createdAt,
    };

    if (existing.empty) {
      await keywordsRef.add(keywordsData);
    } else {
      await keywordsRef.doc(existing.docs[0].id).update(keywordsData);
    }

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
