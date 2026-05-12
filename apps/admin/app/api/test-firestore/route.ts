import { NextResponse } from 'next/server';

// @ts-ignore - require used intentionally to prevent transpilation
const { initializeFirebaseAdmin, getFirestore } = require('@ai-links/firebase-admin');

export async function GET() {
  console.log('[TEST] Firestore connectivity test started');

  try {
    console.log('[TEST-1] Initializing Firebase...');
    initializeFirebaseAdmin();
    console.log('[TEST-1] ✓ Firebase initialized');

    console.log('[TEST-2] Getting Firestore instance...');
    const db = getFirestore();
    console.log('[TEST-2] ✓ Firestore instance obtained');

    console.log('[TEST-3] Testing READ - fetching from "profiles" collection...');
    const profilesSnapshot = await db
      .collection('profiles')
      .limit(1)
      .get();

    console.log('[TEST-3] ✓ READ successful! Found', profilesSnapshot.docs.length, 'documents');

    const profileData = profilesSnapshot.docs.map((doc: any) => ({
      id: doc.id,
      ...doc.data(),
    }));

    console.log('[TEST-4] Testing WRITE - creating test document...');
    const testDocId = `test-${Date.now()}`;
    await db.collection('automationAccounts').doc(testDocId).set({
      id: testDocId,
      userId: 'test-user',
      linkedinUrl: 'https://test.com',
      isActive: true,
      dailyPostLimit: 1,
      dailyCommentLimit: 1,
      dailyReactionLimit: 1,
      timezone: 'UTC',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    console.log('[TEST-4] ✓ WRITE successful! Test doc ID:', testDocId);

    return NextResponse.json({
      status: 'success',
      message: 'Firestore is connected and working!',
      tests: {
        config: 'OK',
        initialization: 'OK',
        read: { success: true, docsFound: profilesSnapshot.docs.length },
        write: { success: true, testDocId },
        profileSample: profileData[0] || null,
      },
    });
  } catch (error) {
    console.error('[TEST-ERROR]', {
      message: (error as any).message,
      code: (error as any).code,
      details: (error as any).details,
      stack: (error as any).stack?.split('\n').slice(0, 5).join('\n'),
    });

    return NextResponse.json(
      {
        status: 'error',
        message: 'Firestore connection failed',
        error: {
          message: (error as any).message,
          code: (error as any).code,
        },
      },
      { status: 500 }
    );
  }
}
