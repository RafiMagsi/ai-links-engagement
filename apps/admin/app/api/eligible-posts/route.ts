import { NextRequest, NextResponse } from 'next/server';
import { initializeFirebaseAdmin, getFirestore } from '@ai-links/firebase-admin';
import { filterEligiblePosts } from '@/lib/comment-generator';

const projectId = process.env.FIREBASE_PROJECT_ID;
const privateKey = process.env.FIREBASE_PRIVATE_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;

if (projectId && privateKey && clientEmail) {
  initializeFirebaseAdmin(projectId, privateKey, clientEmail);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    if (!accountId) {
      return NextResponse.json(
        { error: 'accountId is required' },
        { status: 400 }
      );
    }

    const db = getFirestore();

    // Get comment settings for this account
    const settingsRef = await db
      .collection('automationCommentSettings')
      .doc(accountId)
      .get();

    if (!settingsRef.exists) {
      return NextResponse.json(
        { error: 'Comment settings not configured for this account' },
        { status: 404 }
      );
    }

    const settings = settingsRef.data();

    // Get posts that already have comments from this account
    const existingCommentsSnapshot = await db
      .collection('automationComments')
      .where('accountId', '==', accountId)
      .select('postId')
      .get();

    const alreadyCommentedPostIds = existingCommentsSnapshot.docs.map(
      (doc) => doc.data().postId
    );

    // In a real implementation, this would fetch posts from LinkedIn via their API
    // For now, we're providing the structure for posts from Firestore
    // assuming they're stored in a 'linkedInPosts' collection with metadata

    let postsQuery = db
      .collection('linkedInPosts')
      .where('isDeleted', '==', false)
      .orderBy('createdAt', 'desc')
      .limit(limit * 2); // Get more to filter

    const postsSnapshot = await postsQuery.get();
    const posts = postsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    // Filter for eligible posts
    const eligiblePosts = filterEligiblePosts(
      posts,
      {
        keywords: settings.keywords,
        allowOnAIGeneratedPosts: settings.allowOnAIGeneratedPosts,
      },
      alreadyCommentedPostIds
    ).slice(0, limit);

    return NextResponse.json({
      success: true,
      data: eligiblePosts,
      total: eligiblePosts.length,
      stats: {
        totalPosts: posts.length,
        eligible: eligiblePosts.length,
        alreadyCommented: alreadyCommentedPostIds.length,
      },
    });
  } catch (error) {
    console.error('Error fetching eligible posts:', error);
    return NextResponse.json(
      { error: 'Failed to fetch eligible posts' },
      { status: 500 }
    );
  }
}
