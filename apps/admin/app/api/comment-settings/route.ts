import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin, getFirestore } from '@ai-links/firebase-admin';
import { CommentSettings } from '@ai-links/shared-types';

// Initialize Firebase Admin on first call
const projectId = process.env.FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (projectId && privateKey && clientEmail) {
  initializeFirebaseAdmin(projectId, privateKey, clientEmail);
}

export async function POST(request: NextRequest) {
  try {
    const body: CommentSettings = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const settingsRef = db.collection('automationCommentSettings').doc(accountId);

    const settingsData: CommentSettings = {
      ...body,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await settingsRef.set(settingsData, { merge: true });

    return NextResponse.json({
      success: true,
      data: settingsData,
    });
  } catch (error) {
    console.error('Error saving comment settings:', error);
    return NextResponse.json(
      { error: 'Failed to save comment settings' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const settingsRef = db.collection('automationCommentSettings').doc(accountId);
    const doc = await settingsRef.get();

    if (!doc.exists) {
      return NextResponse.json(
        { error: 'Settings not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: doc.data(),
    });
  } catch (error) {
    console.error('Error fetching comment settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch comment settings' },
      { status: 500 }
    );
  }
}
