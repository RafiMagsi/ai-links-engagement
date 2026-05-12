export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getFirestore } from '@ai-links/firebase-admin';
import { verifyIdToken } from '@ai-links/firebase-admin';

export async function GET(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyIdToken(token);

    // Verify admin claim
    if (!decodedToken.admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const firestore = getFirestore();
    const policyDoc = await firestore
      .collection('automationPolicies')
      .doc('global')
      .get();

    let policy = {
      id: 'global',
      automationEnabled: true,
      globalKillSwitch: false,
      quotaCapMultiplier: 1.0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    if (policyDoc.exists) {
      policy = {
        ...policy,
        ...policyDoc.data(),
      };
    }

    return NextResponse.json(policy);
  } catch (error) {
    console.error('Error fetching global policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verify authentication
    const authHeader = request.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.substring(7);
    const decodedToken = await verifyIdToken(token);

    // Verify admin claim (super admin for policies)
    if (!decodedToken.admin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const firestore = getFirestore();

    // Validate input
    if (typeof body.automationEnabled !== 'boolean' && typeof body.globalKillSwitch !== 'boolean' && typeof body.quotaCapMultiplier !== 'number') {
      return NextResponse.json(
        { error: 'Invalid policy update' },
        { status: 400 }
      );
    }

    // Update policy
    const policyData = {
      ...(body.automationEnabled !== undefined && { automationEnabled: body.automationEnabled }),
      ...(body.globalKillSwitch !== undefined && { globalKillSwitch: body.globalKillSwitch }),
      ...(body.quotaCapMultiplier !== undefined && { quotaCapMultiplier: body.quotaCapMultiplier }),
      updatedAt: new Date(),
      updatedBy: decodedToken.uid,
    };

    await firestore.collection('automationPolicies').doc('global').set(policyData, { merge: true });

    // Log the policy change
    const logId = firestore.collection('automationActionLogs').doc().id;
    await firestore.collection('automationActionLogs').doc(logId).set({
      id: logId,
      accountId: 'system',
      actionType: 'policy_updated',
      success: true,
      details: {
        policyId: 'global',
        changes: policyData,
      },
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Global policy updated',
      policy: {
        id: 'global',
        ...policyData,
      },
    });
  } catch (error) {
    console.error('Error updating global policy:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
