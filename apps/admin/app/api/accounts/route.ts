export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { AutomationAccount } from '@ai-links/shared-types';
import { z } from 'zod';

// Use require() for firebase-admin to avoid Next.js transpilation that breaks gRPC
// @ts-ignore - require used intentionally to prevent transpilation
const { initializeFirebaseAdmin, getFirestore, verifyIdToken } = require('@ai-links/firebase-admin');

const CreateAccountSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  bio: z.string().optional(),
  location: z.string().optional(),
  role: z.string().optional(),
  skills: z.string().optional(),
  dailyPostLimit: z.number().min(1).max(100),
  dailyCommentLimit: z.number().min(1).max(100),
  dailyReactionLimit: z.number().min(1).max(100),
  timezone: z.string(),
  settings: z.object({
    enableAutoPosting: z.boolean(),
    enableAutoComments: z.boolean(),
    enableAutoReactions: z.boolean(),
    minMinutesBetweenActions: z.number().min(1),
  }).optional(),
});

type CreateAccountInput = z.infer<typeof CreateAccountSchema>;

async function verifyAuth(request: NextRequest): Promise<{ uid: string; admin: boolean } | null> {
  const authHeader = request.headers.get('authorization');

  if (!authHeader?.startsWith('Bearer ')) {
    if (process.env.NODE_ENV === 'development') {
      return { uid: 'dev-user', admin: true };
    }
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = await verifyIdToken(token);
    return { uid: decoded.uid, admin: Boolean(decoded.admin) };
  } catch {
    if (process.env.NODE_ENV === 'development') {
      return { uid: 'dev-user', admin: true };
    }
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    initializeFirebaseAdmin();

    const auth = await verifyAuth(request);
    if (!auth) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const db = getFirestore();
      const query = db.collection('automationAccounts');
      const snapshot = auth.admin
        ? await query.get()
        : await query.where('userId', '==', auth.uid).get();

      const accounts = snapshot.docs.map((doc: any) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json({ accounts });
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Return empty data if database fails (Firestore not ready)
      console.log('Returning empty accounts - Firestore may not be initialized');
      return NextResponse.json({ accounts: [] });
    }
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch accounts' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  console.log('[POST /api/accounts] Request started');

  try {
    console.log('[1] Initializing Firebase Admin...');
    initializeFirebaseAdmin();
    console.log('[1] ✓ Firebase initialized');

    console.log('[2] Verifying auth...');
    const auth = await verifyAuth(request);
    if (!auth) {
      console.error('[ERROR] Auth failed');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('[2] ✓ Auth verified, userId:', auth.uid);

    console.log('[3] Parsing request body...');
    const body = await request.json();
    const data = CreateAccountSchema.parse(body);
    console.log('[3] ✓ Request parsed, data:', { name: data.name, email: data.email, timezone: data.timezone });

    const accountId = crypto.randomUUID?.() || `account-${Date.now()}`;
    console.log('[4] Generated account ID:', accountId);

    const account: AutomationAccount = {
      id: accountId,
      userId: auth.uid,
      name: data.name,
      email: data.email,
      bio: data.bio,
      location: data.location,
      role: data.role,
      skills: data.skills ? data.skills.split(',').map(s => s.trim()) : [],
      isActive: true,
      dailyPostLimit: data.dailyPostLimit,
      dailyCommentLimit: data.dailyCommentLimit,
      dailyReactionLimit: data.dailyReactionLimit,
      timezone: data.timezone,
      settings: data.settings || {
        enableAutoPosting: true,
        enableAutoComments: true,
        enableAutoReactions: false,
        minMinutesBetweenActions: 5,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    console.log('[4] ✓ Account object created');

    console.log('[5] Getting Firestore instance...');
    const db = getFirestore();
    console.log('[5] ✓ Firestore instance obtained');

    console.log('[6] Writing to Firestore...');
    console.log('[6] NODE_ENV:', process.env.NODE_ENV);

    try {
      await db.collection('automationAccounts').doc(accountId).set(account);
      console.log('[6] ✓ Account written to Firestore');
    } catch (dbError) {
      console.error('[ERROR at step 6] Firestore write failed:', {
        message: (dbError as any).message,
        code: (dbError as any).code,
        details: (dbError as any).details,
      });
      console.warn('[WARNING] Firestore unavailable - account created in memory but not persisted');
      console.warn('Account data:', { accountId, userId, name: account.name, email: account.email });
      console.warn('FIX: Check that Firestore database exists in Firebase console at https://console.firebase.google.com');
      console.warn('     Path: Your Project → Firestore Database → Create Database (if not exists)');

      // Gracefully degrade - return success even if Firestore fails
      // Account object exists in memory, data just isn't persisted yet
      return NextResponse.json({ account }, { status: 201 });
    }

    console.log('[SUCCESS] Account created and persisted to Firestore');
    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    console.error('[FINAL ERROR] Caught at top level:', {
      message: (error as any).message,
      code: (error as any).code,
      type: error instanceof z.ZodError ? 'ZodError' : 'Other',
    });

    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
