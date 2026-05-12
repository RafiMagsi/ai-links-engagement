import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin, getFirestore } from '@ai-links/firebase-admin';
import {
  generateCommentPrompt,
  validateComment,
  canCommentNow,
} from '@/lib/comment-generator';
import { CommentStatus, AutomationComment } from '@ai-links/shared-types';

const projectId = process.env.FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (projectId && privateKey && clientEmail) {
  initializeFirebaseAdmin(projectId, privateKey, clientEmail);
}

export async function POST(request: NextRequest) {
  try {
    const { accountId, postId, postContent, manualContent } =
      await request.json();

    if (!accountId || !postId || !postContent) {
      return NextResponse.json(
        { error: 'accountId, postId, and postContent are required' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Get comment settings
    const settingsDoc = await db
      .collection('automationCommentSettings')
      .doc(accountId)
      .get();

    if (!settingsDoc.exists) {
      return NextResponse.json(
        { error: 'Comment settings not configured for this account' },
        { status: 404 }
      );
    }

    const settings = settingsDoc.data();

    // Check if already commented on this post
    const existingComment = await db
      .collection('automationComments')
      .where('accountId', '==', accountId)
      .where('postId', '==', postId)
      .limit(1)
      .get();

    if (!existingComment.empty) {
      return NextResponse.json(
        { error: 'Already commented on this post' },
        { status: 409 }
      );
    }

    // Check rate limiting - get last comment time
    const lastCommentSnapshot = await db
      .collection('automationComments')
      .where('accountId', '==', accountId)
      .where('status', '==', CommentStatus.PUBLISHED)
      .orderBy('publishedAt', 'desc')
      .limit(1)
      .get();

    let lastCommentTime: Date | undefined;
    if (!lastCommentSnapshot.empty) {
      lastCommentTime = lastCommentSnapshot.docs[0].data().publishedAt;
    }

    if (!canCommentNow(lastCommentTime, settings.minTimeBetweenComments)) {
      const minutesWaited = lastCommentTime
        ? Math.floor(
            (Date.now() - lastCommentTime.getTime()) / (1000 * 60)
          )
        : 0;
      const minutesNeeded = settings.minTimeBetweenComments - minutesWaited;

      return NextResponse.json(
        {
          error: `Rate limited - wait ${minutesNeeded} more minutes before commenting`,
        },
        { status: 429 }
      );
    }

    // Use provided content or generate via Claude
    // For this implementation, we expect manual content to be provided
    // In production, this would call Claude API
    const commentContent = manualContent || postContent;

    // Validate comment
    const validation = validateComment(commentContent, settings);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'Comment failed validation', errors: validation.errors },
        { status: 400 }
      );
    }

    // Create comment record
    const commentsRef = db.collection('automationComments');
    const newDoc = commentsRef.doc();

    const commentData: AutomationComment = {
      id: newDoc.id,
      accountId,
      postId,
      content: commentContent,
      status: settings.requireApproval
        ? CommentStatus.PENDING
        : CommentStatus.APPROVED,
      generatedAt: new Date(),
      actorType: 'auto_generated',
      isOfficialAction: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await newDoc.set(commentData);

    // Log action
    const actionLogsRef = db.collection('automationActionLogs');
    await actionLogsRef.add({
      accountId,
      actionType: 'COMMENT_CREATED',
      targetContentId: postId,
      success: true,
      details: {
        commentId: newDoc.id,
        status: commentData.status,
        requiresApproval: settings.requireApproval,
      },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      data: commentData,
      requiresApproval: settings.requireApproval,
      message: settings.requireApproval
        ? 'Comment created - pending approval'
        : 'Comment created and approved',
    });
  } catch (error) {
    console.error('Error generating comment:', error);
    return NextResponse.json(
      { error: 'Failed to generate comment' },
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

    // Check if comment exists
    const existingComment = await db
      .collection('automationComments')
      .where('accountId', '==', accountId)
      .where('postId', '==', postId)
      .limit(1)
      .get();

    if (!existingComment.empty) {
      const comment = existingComment.docs[0];
      return NextResponse.json({
        success: true,
        exists: true,
        data: {
          id: comment.id,
          ...comment.data(),
        },
      });
    }

    return NextResponse.json({
      success: true,
      exists: false,
      message: 'No comment exists for this post',
    });
  } catch (error) {
    console.error('Error checking comment:', error);
    return NextResponse.json(
      { error: 'Failed to check comment' },
      { status: 500 }
    );
  }
}
