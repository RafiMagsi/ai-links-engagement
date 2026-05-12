import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin, getFirestore } from '@ai-links/firebase-admin';
import { AutomationComment, CommentStatus } from '@ai-links/shared-types';

const projectId = process.env.FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (projectId && privateKey && clientEmail) {
  initializeFirebaseAdmin(projectId, privateKey, clientEmail);
}

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
    const comments = snapshot.docs.map((doc) => ({
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
