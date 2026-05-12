import { ReactionType, ReactionSettings } from '@ai-links/shared-types';

export interface PostScore {
  postId: string;
  engagement: number;
  recencyScore: number;
  keywordRelevance: number;
  finalScore: number;
  reason: string;
}

/**
 * Scores a post for reaction eligibility
 */
export function scorePost(
  post: any,
  settings: ReactionSettings,
  keywords?: string[]
): number {
  let score = 0;
  const minEngagement = settings.minEngagementScore ?? 20;

  // Base engagement score (likes + comments + shares)
  const engagement = (post.likesCount || 0) + (post.commentsCount || 0) + (post.sharesCount || 0);
  if (engagement < minEngagement) {
    return -1; // Not eligible
  }

  // Engagement component (0-50 points)
  score += Math.min(50, (engagement / minEngagement) * 25);

  // Recency component (0-30 points)
  const hoursOld = (Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60);
  const recencyScore = Math.max(0, 30 - hoursOld * 1.5); // Older posts get less credit
  score += recencyScore;

  // Keyword relevance component (0-20 points)
  if (keywords && keywords.length > 0) {
    const postText = `${post.content} ${post.tags || ''}`.toLowerCase();
    const matchedKeywords = keywords.filter((k) =>
      postText.includes(k.toLowerCase())
    );
    const relevanceScore = (matchedKeywords.length / keywords.length) * 20;
    score += relevanceScore;
  }

  return score;
}

/**
 * Selects top posts for reactions
 */
export function selectPostsForReactions(
  posts: any[],
  settings: ReactionSettings,
  limit: number = 5
): PostScore[] {
  const scored: PostScore[] = posts
    .map((post) => {
      const finalScore = scorePost(post, settings, settings.keywordWeighting ? Object.keys(settings.keywordWeighting) : undefined);

      if (finalScore < 0) {
        return null;
      }

      return {
        postId: post.id,
        engagement: (post.likesCount || 0) + (post.commentsCount || 0),
        recencyScore: Math.max(0, 30 - ((Date.now() - new Date(post.createdAt).getTime()) / (1000 * 60 * 60)) * 1.5),
        keywordRelevance: settings.keywordWeighting ? Object.keys(settings.keywordWeighting).length : 0,
        finalScore,
        reason: `Engagement: ${post.likesCount || 0}+${post.commentsCount || 0}, Recency: High, Match: ${settings.curateTrendingContent ? 'Trending' : 'Content'}`,
      };
    })
    .filter((item): item is PostScore => item !== null)
    .sort((a, b) => b.finalScore - a.finalScore)
    .slice(0, limit);

  return scored;
}

/**
 * Determines reaction type based on post characteristics
 */
export function determineReactionType(
  post: any,
  selectedType?: ReactionType
): ReactionType {
  if (selectedType) {
    return selectedType;
  }

  // Auto-determine based on post characteristics
  const engagement = (post.likesCount || 0) + (post.commentsCount || 0);

  if (engagement > 100) {
    return ReactionType.CURATED; // High engagement content
  }

  if (post.isFeatured || post.tags?.includes('featured')) {
    return ReactionType.SPOTLIGHT; // Featured content
  }

  return ReactionType.FEEDBACK_GIVEN; // Default
}

/**
 * Builds action reason for reaction
 */
export function buildReactionReason(
  reactionType: ReactionType,
  post: any,
  matchedKeywords?: string[]
): string {
  const baseReasons: Record<ReactionType, string> = {
    [ReactionType.FEEDBACK_GIVEN]: 'High-quality content - providing feedback',
    [ReactionType.CURATED]: 'Curated trending content in our niche',
    [ReactionType.SPOTLIGHT]: 'Featured content worth highlighting',
  };

  let reason = baseReasons[reactionType];

  if (matchedKeywords && matchedKeywords.length > 0) {
    reason += ` | Relevant topics: ${matchedKeywords.slice(0, 2).join(', ')}`;
  }

  return reason;
}

/**
 * Checks if account has exceeded daily reaction limit
 */
export function isWithinDailyReactionLimit(
  reactionsToday: number,
  maxPerDay: number
): boolean {
  return reactionsToday < maxPerDay;
}

/**
 * Checks if post has already received a reaction from this account
 */
export function hasAccountReactedToPost(
  postId: string,
  accountId: string,
  existingReactions: any[]
): boolean {
  return existingReactions.some(
    (r) => r.postId === postId && r.accountId === accountId
  );
}

/**
 * Filters posts that qualify for reactions
 */
export function filterReactionEligiblePosts(
  posts: any[],
  settings: ReactionSettings,
  alreadyReactedPostIds: string[]
): any[] {
  const minEngagement = settings.minEngagementScore ?? 20;
  return posts.filter((post) => {
    // Don't react twice on same post
    if (alreadyReactedPostIds.includes(post.id)) {
      return false;
    }

    // Check minimum engagement
    const engagement = (post.likesCount || 0) + (post.commentsCount || 0);
    if (engagement < minEngagement) {
      return false;
    }

    // Skip deleted posts
    if (post.isDeleted) {
      return false;
    }

    return true;
  });
}
