import { NextRequest, NextResponse } from 'next/server';
import { AutomationComment, CommentStatus } from '@ai-links/shared-types';

// @ts-ignore - require used intentionally to prevent transpilation
const { initializeFirebaseAdmin, getFirestore } = require('@ai-links/firebase-admin');

initializeFirebaseAdmin();

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const status = searchParams.get('status') as CommentStatus | null;
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    let query = db
      .collection('automationComments')
      .where('accountId', '==', accountId)
      .orderBy('createdAt', 'desc')
      .limit(limit);

    if (status) {
      query = query.where('status', '==', status);
    }

    const snapshot = await query.get();
    const comments = snapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    })) as (AutomationComment & { id: string })[];

    return NextResponse.json({
      success: true,
      data: comments,
      total: comments.length,
    });
  } catch (error) {
    console.error('Error fetching comments:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: Partial<AutomationComment> = await request.json();
    const { accountId, postId, content } = body;

    if (!accountId || !postId || !content) {
      return NextResponse.json(
        { error: 'accountId, postId, and content are required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const commentsRef = db.collection('automationComments');
    const newDoc = commentsRef.doc();

    const commentData: AutomationComment = {
      id: newDoc.id,
      accountId,
      postId,
      content,
      status: CommentStatus.PENDING,
      generatedAt: new Date(),
      actorType: 'auto_generated',
      isOfficialAction: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...body,
    };

    await newDoc.set(commentData);

    return NextResponse.json({
      success: true,
      data: commentData,
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    );
  }
}
