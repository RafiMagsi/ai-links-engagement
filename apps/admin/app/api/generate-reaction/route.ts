import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin, getFirestore } from '@ai-links/firebase-admin';
import {
  determineReactionType,
  buildReactionReason,
  isWithinDailyReactionLimit,
  hasAccountReactedToPost,
} from '@/lib/reaction-selector';
import { OfficialReaction, ReactionType } from '@ai-links/shared-types';

const projectId = process.env.FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (projectId && privateKey && clientEmail) {
  initializeFirebaseAdmin(projectId, privateKey, clientEmail);
}

export async function POST(request: NextRequest) {
  try {
    const { accountId, postId, reactionType, engagementScore, matchedKeywords } =
      await request.json();

    if (!accountId || !postId) {
      return NextResponse.json(
        { error: 'accountId and postId are required' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Get reaction settings
    const settingsDoc = await db
      .collection('automationReactionSettings')
      .doc(accountId)
      .get();

    if (!settingsDoc.exists) {
      return NextResponse.json(
        { error: 'Reaction settings not configured for this account' },
        { status: 404 }
      );
    }

    const settings = settingsDoc.data();

    if (!settings.enabled) {
      return NextResponse.json(
        { error: 'Reactions are disabled for this account' },
        { status: 403 }
      );
    }

    // Get today's reactions count
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayReactionsSnapshot = await db
      .collection('officialReactions')
      .where('accountId', '==', accountId)
      .where('createdAt', '>=', today)
      .get();

    if (!isWithinDailyReactionLimit(todayReactionsSnapshot.size, settings.maxReactionsPerDay)) {
      return NextResponse.json(
        {
          error: `Daily reaction limit exceeded (${settings.maxReactionsPerDay} per day)`,
        },
        { status: 429 }
      );
    }

    // Check if already reacted to this post
    const existingReactions = await db
      .collection('officialReactions')
      .where('accountId', '==', accountId)
      .where('postId', '==', postId)
      .get();

    if (!existingReactions.empty) {
      return NextResponse.json(
        { error: 'Already reacted to this post' },
        { status: 409 }
      );
    }

    // Determine reaction type
    const finalReactionType =
      reactionType ||
      determineReactionType({ engagementScore }, settings.allowedReactionTypes[0]);

    // Validate reaction type is allowed
    if (!settings.allowedReactionTypes.includes(finalReactionType)) {
      return NextResponse.json(
        {
          error: `Reaction type ${finalReactionType} not allowed for this account`,
        },
        { status: 400 }
      );
    }

    // Build action reason
    const actionReason = buildReactionReason(
      finalReactionType,
      {},
      matchedKeywords
    );

    // Create reaction record
    const reactionsRef = db.collection('officialReactions');
    const newDoc = reactionsRef.doc();

    const reactionData: OfficialReaction = {
      id: newDoc.id,
      accountId,
      postId,
      reactionType: finalReactionType,
      engagementScore,
      actorType: 'official_ai',
      isOfficialAction: true,
      actionReason,
      createdAt: new Date(),
    };

    await newDoc.set(reactionData);

    // Log action
    const actionLogsRef = db.collection('automationActionLogs');
    await actionLogsRef.add({
      accountId,
      actionType: 'REACTION_ADDED',
      targetContentId: postId,
      success: true,
      details: {
        reactionId: newDoc.id,
        reactionType: finalReactionType,
        engagementScore,
        reason: actionReason,
      },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: reactionData,
      message: `${finalReactionType} reaction created on post ${postId}`,
    });
  } catch (error) {
    console.error('Error generating reaction:', error);
    return NextResponse.json(
      { error: 'Failed to generate reaction' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const postId = searchParams.get('postId');

    if (!accountId || !postId) {
      return NextResponse.json(
        { error: 'accountId and postId are required' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Check if reaction exists
    const existingReaction = await db
      .collection('officialReactions')
      .where('accountId', '==', accountId)
      .where('postId', '==', postId)
      .limit(1)
      .get();

    if (!existingReaction.empty) {
      const reaction = existingReaction.docs[0];
      return NextResponse.json({
        success: true,
        exists: true,
        data: {
          id: reaction.id,
          ...reaction.data(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      exists: false,
      message: 'No reaction exists for this post',
    });
  } catch (error) {
    console.error('Error checking reaction:', error);
    return NextResponse.json(
      { error: 'Failed to check reaction' },
      { status: 500 }
    );
  }
}
