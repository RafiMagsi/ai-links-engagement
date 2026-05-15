export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const { getFirestore, verifyIdToken } = require('@ai-links/firebase-admin');

async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    // In development, accept requests without auth for testing
    if (process.env.NODE_ENV === 'development') {
      return 'dev-user';
    }
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = await verifyIdToken(token);
    return decoded.uid;
  } catch {
    // In development, accept any Bearer token
    if (process.env.NODE_ENV === 'development') {
      return 'dev-user';
    }
    return null;
  }
}

const UpdateAccountDetailsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  bio: z.string().optional(),
  location: z.string().optional(),
  role: z.string().optional(),
  skills: z.array(z.string()).optional(),
  category: z.string().optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = await verifyAuth(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const accountId = params.id;
    const body = await request.json();

    const validation = UpdateAccountDetailsSchema.safeParse(body);
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid account details', details: validation.error.errors },
        { status: 400 }
      );
    }

    const db = getFirestore();
    const data = validation.data;

    const accountRef = db.collection('automationAccounts').doc(accountId);
    const doc = await accountRef.get();

    const accountData = {
      ...data,
      userId,
      updatedAt: new Date(),
      ...(doc.exists ? {} : {
        createdAt: new Date(),
        isActive: true,
        timezone: 'UTC',
        dailyPostLimit: 10,
        dailyCommentLimit: 10,
        dailyReactionLimit: 20,
      }),
    };

    if (doc.exists) {
      await accountRef.update(accountData);
    } else {
      await accountRef.set({ ...accountData, id: accountId });
    }

    return NextResponse.json({
      message: 'Account details saved successfully',
      account: { id: accountId, ...doc.data(), ...accountData },
    });
  } catch (error) {
    console.error('Error saving account details:', error);
    return NextResponse.json(
      { error: 'Failed to save account details' },
      { status: 500 }
    );
  }
}
