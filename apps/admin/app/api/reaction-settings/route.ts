import { NextRequest, NextResponse } from 'next/server';
import { ReactionSettings } from '@ai-links/shared-types';

// @ts-ignore - require used intentionally to prevent transpilation
const { initializeFirebaseAdmin, getFirestore } = require('@ai-links/firebase-admin');

initializeFirebaseAdmin();

export async function POST(request: NextRequest) {
  try {
    const body: ReactionSettings = await request.json();
    const { accountId } = body;

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const settingsRef = db.collection('automationReactionSettings').doc(accountId);

    const settingsData: ReactionSettings = {
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
    console.error('Error saving reaction settings:', error);
    return NextResponse.json(
      { error: 'Failed to save reaction settings' },
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
    const settingsRef = db.collection('automationReactionSettings').doc(accountId);
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
    console.error('Error fetching reaction settings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reaction settings' },
      { status: 500 }
    );
  }
}
