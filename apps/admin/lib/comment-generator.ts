import { AutomationComment, CommentSettings, CommentStatus } from '@ai-links/shared-types';

/**
 * Validates if a comment meets quality standards
 */
export function validateComment(
  content: string,
  settings: CommentSettings
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (content.length < settings.minCommentLength) {
    errors.push(
      `Comment too short (${content.length} chars, minimum ${settings.minCommentLength})`
    );
  }

  if (content.length > settings.maxCommentLength) {
    errors.push(
      `Comment too long (${content.length} chars, maximum ${settings.maxCommentLength})`
    );
  }

  // Check for empty praise patterns
  const praisePatterns = [
    /^(love|like|great|awesome|amazing)[\s!]*$/i,
    /^(thanks|thank you)[\s!]*$/i,
    /^(yes|yep|yeah)[\s!]*$/i,
  ];

  if (praisePatterns.some((pattern) => pattern.test(content.trim()))) {
    errors.push('Comment is empty praise - must add substantial value');
  }

  // Check for spam-like patterns
  if (/[\W_]*([a-zA-Z0-9])\1{4,}[\W_]*/.test(content)) {
    errors.push('Comment contains spam patterns');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Generates a comment prompt for Claude API
 */
export function generateCommentPrompt(
  postContent: string,
  keywords: string[],
  tone: string = 'professional',
  requirements: { minLength: number; maxLength: number }
): string {
  return `You are an AI assistant helping create authentic, valuable comments on professional posts.

Post Content:
${postContent}

Requirements:
- Tone: ${tone}
- Length: ${requirements.minLength}-${requirements.maxLength} characters
- Must add genuine value to the conversation
- No empty praise or filler
- No promotion or self-serving content
- Reference relevant keywords where natural: ${keywords.join(', ')}

Generate a single thoughtful comment that:
1. Acknowledges the main point of the post
2. Adds substantive value (insight, question, relevant experience)
3. Maintains a ${tone} tone
4. Is authentic and conversational

Respond with ONLY the comment text, no additional explanation.`;
}

/**
 * Checks if an account can comment based on rate limiting
 */
export function canCommentNow(
  lastCommentTime: Date | undefined,
  minMinutesBetween: number
): boolean {
  if (!lastCommentTime) return true;

  const minutesElapsed =
    (Date.now() - lastCommentTime.getTime()) / (1000 * 60);
  return minutesElapsed >= minMinutesBetween;
}

/**
 * Checks if an account has exceeded daily comment limit
 */
export function isWithinDailyLimit(
  commentsToday: number,
  maxPerDay: number
): boolean {
  return commentsToday < maxPerDay;
}

/**
 * Filters posts for comment eligibility
 */
export function filterEligiblePosts(
  posts: any[],
  settings: {
    keywords?: string[];
    allowOnAIGeneratedPosts: boolean;
  },
  alreadyCommentedPostIds: string[]
): any[] {
  return posts.filter((post) => {
    // Don't comment on same post twice
    if (alreadyCommentedPostIds.includes(post.id)) {
      return false;
    }

    // Check if already deleted or marked as AI-only
    if (post.isDeleted || (post.isAIGenerated && !settings.allowOnAIGeneratedPosts)) {
      return false;
    }

    // Check minimum engagement value
    const engagement = (post.likesCount || 0) + (post.commentsCount || 0);
    if (engagement < 5) {
      return false;
    }

    // If keywords are set, post must be relevant
    if (settings.keywords && settings.keywords.length > 0) {
      const postText = `${post.content} ${post.tags || ''}`.toLowerCase();
      const hasRelevantKeyword = settings.keywords.some((keyword) =>
        postText.includes(keyword.toLowerCase())
      );
      if (!hasRelevantKeyword) {
        return false;
      }
    }

    return true;
  });
}

/**
 * Formats eligibility check result
 */
export function formatEligibilityCheck(
  postId: string,
  accountId: string,
  eligible: boolean,
  reason?: string
): { postId: string; eligible: boolean; reason?: string } {
  return { postId, eligible, reason };
}
