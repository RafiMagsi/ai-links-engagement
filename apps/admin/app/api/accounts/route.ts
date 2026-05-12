import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@ai-links/firebase-admin';
import { AutomationAccount } from '@ai-links/shared-types';
import { z } from 'zod';

const CreateAccountSchema = z.object({
  linkedinUrl: z.string().url(),
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

// Simple auth check - for development
async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');

  // In development, just check if Bearer token exists
  if (process.env.NODE_ENV === 'development') {
    if (authHeader?.startsWith('Bearer ')) {
      // Accept any token in development
      return 'dev-user';
    }
    return null;
  }

  // In production, would verify token properly
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    // Production: verify with Firebase Admin SDK
    // For now, just accept any token with Bearer prefix
    return 'verified-user';
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
      const db = getFirestore();
      const snapshot = await db
        .collection('automationAccounts')
        .where('userId', '==', userId)
        .get();

      const accounts = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return NextResponse.json({ accounts });
    } catch (dbError) {
      console.error('Database error:', dbError);
      // Return mock data for development if database fails
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ accounts: [] });
      }
      throw dbError;
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
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const data = CreateAccountSchema.parse(body);

    const accountId = crypto.randomUUID?.() || `account-${Date.now()}`;

    const account: AutomationAccount = {
      id: accountId,
      userId,
      linkedinUrl: data.linkedinUrl,
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

    try {
      const db = getFirestore();
      await db.collection('automationAccounts').doc(accountId).set(account);
    } catch (dbError) {
      console.error('Database error:', dbError);
      // In development, return success even if database fails
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json({ account }, { status: 201 });
      }
      throw dbError;
    }

    return NextResponse.json({ account }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error creating account:', error);
    return NextResponse.json(
      { error: 'Failed to create account' },
      { status: 500 }
    );
  }
}
