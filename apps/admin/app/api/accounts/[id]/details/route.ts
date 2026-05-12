export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const { getFirestore } = require('@ai-links/firebase-admin');

const UpdateAccountDetailsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  bio: z.string().optional(),
  location: z.string().optional(),
  role: z.string().optional(),
  skills: z.array(z.string()).optional(),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
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
