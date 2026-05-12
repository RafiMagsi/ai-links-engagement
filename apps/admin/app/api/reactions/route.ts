export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { OfficialReaction, ReactionType } from '@ai-links/shared-types';

// @ts-ignore - require used intentionally to prevent transpilation
const { initializeFirebaseAdmin, getFirestore } = require('@ai-links/firebase-admin');

initializeFirebaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const reactionType = searchParams.get('reactionType') as ReactionType | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    let query = db
      .collection('officialReactions')
      .where('accountId', '==', accountId)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (reactionType) {
      query = query.where('reactionType', '==', reactionType);
    }

    const snapshot = await query.get();
    const reactions = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as (OfficialReaction & { id: string })[];

    return NextResponse.json({
      success: true,
      data: reactions,
      total: reactions.length,
    });
  } catch (error) {
    console.error('Error fetching reactions:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reactions' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: Partial<OfficialReaction> = await request.json();
    const { accountId, postId, reactionType, actionReason } = body;

    if (!accountId || !postId || !reactionType || !actionReason) {
      return NextResponse.json(
        { error: 'accountId, postId, reactionType, and actionReason are required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const reactionsRef = db.collection('officialReactions');
    const newDoc = reactionsRef.doc();

    const reactionData: OfficialReaction = {
      id: newDoc.id,
      accountId,
      postId,
      reactionType: reactionType as ReactionType,
      actorType: 'official_ai',
      isOfficialAction: true,
      actionReason,
      createdAt: new Date(),
      ...body,
    };

    await newDoc.set(reactionData);

    return NextResponse.json({
      success: true,
      data: reactionData,
    });
  } catch (error) {
    console.error('Error creating reaction:', error);
    return NextResponse.json(
      { error: 'Failed to create reaction' },
      { status: 500 }
    );
  }
}
