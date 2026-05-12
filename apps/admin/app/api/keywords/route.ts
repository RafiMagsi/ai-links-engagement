import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@ai-links/firebase-admin';
import { verifyIdToken } from '@ai-links/firebase-admin';
import { AutomationKeywords, TonePreset, ContentIntent } from '@ai-links/shared-types';
import { z } from 'zod';

const UpdateKeywordsSchema = z.object({
  accountId: z.string(),
  primaryKeywords: z.array(z.string()).min(1),
  secondaryKeywords: z.array(z.string()),
  blockedKeywords: z.array(z.string()),
  tonePreset: z.enum([
    TonePreset.PROFESSIONAL,
    TonePreset.FRIENDLY,
    TonePreset.EDUCATIONAL,
    TonePreset.INSPIRATIONAL,
    TonePreset.HUMOROUS,
  ]),
  allowedIntents: z.array(z.enum([
    ContentIntent.KNOWLEDGE_SHARING,
    ContentIntent.QUESTION,
    ContentIntent.INDUSTRY_NEWS,
    ContentIntent.PERSONAL_STORY,
    ContentIntent.CALL_TO_ACTION,
  ])).min(1),
});

type UpdateKeywordsInput = z.infer<typeof UpdateKeywordsSchema>;

async function verifyAuth(request: NextRequest): Promise<string | null> {
  const authHeader = request.headers.get('authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.substring(7);
  try {
    const decoded = await verifyIdToken(token);
    return decoded.uid;
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

    const accountId = request.nextUrl.searchParams.get('accountId');
    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId query parameter is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Verify account ownership
    const accountDoc = await db.collection('automationAccounts').doc(accountId).get();
    if (!accountDoc.exists || accountDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keywordsDoc = await db.collection('automationKeywords').doc(accountId).get();

    if (!keywordsDoc.exists) {
      return NextResponse.json({ keywords: null });
    }

    return NextResponse.json({ keywords: keywordsDoc.data() });
  } catch (error) {
    console.error('Error fetching keywords:', error);
    return NextResponse.json(
      { error: 'Failed to fetch keywords' },
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
    const data = UpdateKeywordsSchema.parse(body);

    const db = getFirestore();

    // Verify account ownership
    const accountDoc = await db.collection('automationAccounts').doc(data.accountId).get();
    if (!accountDoc.exists || accountDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const keywords: AutomationKeywords = {
      id: data.accountId,
      accountId: data.accountId,
      primaryKeywords: data.primaryKeywords,
      secondaryKeywords: data.secondaryKeywords,
      blockedKeywords: data.blockedKeywords,
      tonePreset: data.tonePreset,
      allowedIntents: data.allowedIntents,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await db.collection('automationKeywords').doc(data.accountId).set(keywords);

    return NextResponse.json({ keywords }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.errors },
        { status: 400 }
      );
    }

    console.error('Error updating keywords:', error);
    return NextResponse.json(
      { error: 'Failed to update keywords' },
      { status: 500 }
    );
  }
}
