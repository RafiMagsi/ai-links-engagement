import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin, getFirestore } from '@ai-links/firebase-admin';
import { CommentStatus } from '@ai-links/shared-types';

const projectId = process.env.FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (projectId && privateKey && clientEmail) {
  initializeFirebaseAdmin(projectId, privateKey, clientEmail);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { action, reason } = await request.json();

    if (!['approve', 'reject', 'publish'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const commentRef = db.collection('automationComments').doc(id);
    const doc = await commentRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Comment not found' },
        { status: 404 }
      );
    }

    const updates: Record<string, unknown> = {
      updatedAt: new Date(),
    };

    if (action === 'approve') {
      updates.status = CommentStatus.APPROVED;
    } else if (action === 'reject') {
      updates.status = CommentStatus.REJECTED;
      updates.rejectedReason = reason || 'No reason provided';
    } else if (action === 'publish') {
      updates.status = CommentStatus.PUBLISHED;
      updates.publishedAt = new Date();
    }

    await commentRef.update(updates);

    const updatedDoc = await commentRef.get();
    return NextResponse.json({
      success: true,
      data: {
        id: updatedDoc.id,
        ...updatedDoc.data(),
      },
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    const db = getFirestore();
    const commentRef = db.collection('automationComments').doc(id);

    await commentRef.delete();

    return NextResponse.json({
      success: true,
      message: 'Comment deleted',
    });
  } catch (error) {
    console.error('Error deleting comment:', error);
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    );
  }
}
