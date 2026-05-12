# Phase 3: Comments & Reactions Implementation

## Overview

Phase 3 implements the comment and reaction automation system for the AI Links engagement engine. This includes admin dashboard features, comment generation logic, and official reaction systems with full audit logging.

## Completed Components

### 1. Data Types (Shared Types Package)

Added to `/packages/shared-types/src/index.ts`:

- **CommentStatus** enum: PENDING, APPROVED, PUBLISHED, REJECTED, FAILED
- **AutomationComment** interface: Complete comment record with status tracking
- **CommentSettings** interface: Per-account comment configuration
- **CommentEligibility** interface: Tracks which accounts have commented on posts
- **ReactionType** enum: FEEDBACK_GIVEN, CURATED, SPOTLIGHT
- **OfficialReaction** interface: Official reaction records with engagement tracking
- **ReactionSettings** interface: Per-account reaction configuration

### 2. API Routes

#### Comment Management
- **POST/GET /api/comment-settings**
  - Save and retrieve comment settings per account
  - Validates required fields
  - Stores in Firestore `automationCommentSettings` collection

- **GET/POST /api/comments**
  - Fetch comments by accountId with optional status filter
  - Create new comments with validation
  - Stores in Firestore `automationComments` collection

- **POST /api/comments/[id]**
  - Approve, reject, or publish comments
  - Updates comment status and records timestamps
  - Stores rejection reasons

#### Reaction Management
- **POST/GET /api/reaction-settings**
  - Save and retrieve reaction settings per account
  - Validates required fields
  - Stores in Firestore `automationReactionSettings` collection

- **GET/POST /api/reactions**
  - Fetch reactions by accountId with optional type filter
  - Create new reactions with engagement scoring
  - Stores in Firestore `officialReactions` collection

### 3. Admin Dashboard Pages

#### Comments Settings Page
- **Route**: `/dashboard/comments-settings`
- **Features**:
  - Per-account comment configuration
  - Toggle enable/disable comments
  - Set max comments per day (1-100)
  - Configure min/max comment length (50-280 chars)
  - Set minimum time between comments (15-1440 min)
  - Tone selection: professional, casual, expert, supportive
  - Approval requirement toggle
  - AI-generated posts permission toggle
  - Keyword management (add/remove)
  - Real-time validation and feedback

#### Reactions Settings Page
- **Route**: `/dashboard/reactions-settings`
- **Features**:
  - Per-account reaction configuration
  - Toggle enable/disable reactions
  - Set max reactions per day (1-100)
  - Max reactions per post (1-10)
  - Minimum engagement score threshold
  - Allowed reaction types selection
  - Trending content curation toggle
  - Keyword weighting support
  - Info box explaining reaction types

#### Comments Monitor Page
- **Route**: `/dashboard/comments-monitor`
- **Features**:
  - View all comments for an account
  - Filter by status (pending, approved, published, rejected, failed)
  - Real-time comment content display
  - Status-specific actions:
    - Pending → Approve or Reject
    - Approved → Publish
  - Rejection reason tracking
  - Timestamp tracking (generated, published, rejected)
  - Color-coded status indicators

#### Reactions Monitor Page
- **Route**: `/dashboard/reactions-monitor`
- **Features**:
  - View all reactions for an account
  - Filter by reaction type
  - Engagement level visualization
  - Type-based color coding
  - Action reason display
  - Official action verification
  - Statistics dashboard:
    - Total reactions count
    - Feedback given count
    - Curated/Spotlight count

### 4. Comment Generation Logic

**File**: `/apps/admin/lib/comment-generator.ts`

Functions:
- **validateComment()**: Validates comment quality
  - Length checks (min/max)
  - Empty praise detection
  - Spam pattern detection
  - Returns validation result with errors

- **generateCommentPrompt()**: Creates Claude API prompt
  - Includes post context
  - Specifies tone requirements
  - Sets character length bounds
  - Includes keyword suggestions
  - Ensures value-add requirements

- **canCommentNow()**: Rate limiting check
  - Validates time since last comment
  - Prevents comment spam
  - Returns boolean eligibility

- **isWithinDailyLimit()**: Daily quota check
  - Tracks comments created today
  - Prevents exceeding daily limit
  - Returns boolean eligibility

- **filterEligiblePosts()**: Post eligibility filtering
  - Prevents duplicate comments on same post
  - Skips deleted posts
  - Respects AI-generated post settings
  - Validates minimum engagement
  - Matches against keywords
  - Returns filtered posts list

### 5. Reaction Selection Logic

**File**: `/apps/admin/lib/reaction-selector.ts`

Functions:
- **scorePost()**: Calculates post engagement score
  - Engagement component (0-50 points)
  - Recency component (0-30 points)
  - Keyword relevance (0-20 points)
  - Returns numerical score or -1 if ineligible

- **selectPostsForReactions()**: Selects top candidates
  - Scores all posts
  - Sorts by final score
  - Returns top N posts with scoring details
  - Includes reason for selection

- **determineReactionType()**: Selects appropriate reaction
  - CURATED for high engagement (>100)
  - SPOTLIGHT for featured content
  - FEEDBACK_GIVEN as default
  - Can override with manual selection

- **buildReactionReason()**: Creates audit-friendly reason
  - Explains why reaction was selected
  - Lists matched keywords
  - Provides transparency

- **isWithinDailyReactionLimit()**: Daily quota check
  - Prevents exceeding reaction limit
  - Returns boolean eligibility

- **hasAccountReactedToPost()**: Duplicate prevention
  - Checks if account already reacted
  - Returns boolean

- **filterReactionEligiblePosts()**: Post eligibility
  - Removes duplicates
  - Validates engagement score
  - Skips deleted posts
  - Returns filtered posts

## Firestore Collections

### automationCommentSettings/{accountUid}
```typescript
{
  accountId: string;
  enabled: boolean;
  maxCommentsPerDay: number;
  minTimeBetweenComments: number;
  minCommentLength: number;
  maxCommentLength: number;
  requireApproval: boolean;
  allowOnAIGeneratedPosts: boolean;
  keywords?: string[];
  tone?: 'professional' | 'casual' | 'expert' | 'supportive';
  createdAt: Date;
  updatedAt: Date;
}
```

### automationComments/{commentId}
```typescript
{
  id: string;
  accountId: string;
  postId: string;
  content: string;
  status: CommentStatus;
  generatedAt: Date;
  publishedAt?: Date;
  rejectedReason?: string;
  actorType: 'official_ai' | 'auto_generated' | 'manual';
  isOfficialAction?: boolean;
  actionReason?: string;
  createdAt: Date;
  updatedAt: Date;
}
```

### automationReactionSettings/{accountUid}
```typescript
{
  accountId: string;
  enabled: boolean;
  maxReactionsPerDay: number;
  maxReactionsPerPost: number;
  allowedReactionTypes: ReactionType[];
  curateTrendingContent: boolean;
  minEngagementScore: number;
  keywordWeighting?: Record<string, number>;
  createdAt: Date;
  updatedAt: Date;
}
```

### officialReactions/{reactionId}
```typescript
{
  id: string;
  accountId: string;
  postId: string;
  reactionType: ReactionType;
  engagementScore?: number;
  actorType: 'official_ai';
  isOfficialAction: boolean;
  actionReason: string;
  createdAt: Date;
}
```

## Safety Rules Implemented

1. **No Duplicate Comments**: Tracked in CommentEligibility, checked before generation
2. **No AI-Only Comments**: Respects allowOnAIGeneratedPosts setting
3. **Rate Limiting**: 
   - Minimum time between comments (configurable, default 45 min)
   - Daily per-account limits
4. **Comment Quality**:
   - Length validation (50-280 chars default)
   - Empty praise detection
   - No template patterns
5. **Reaction Selectivity**:
   - Minimum engagement score required
   - Trending content preference
   - One reaction per post maximum
6. **Audit Trail**:
   - All actions timestamped
   - Rejection reasons recorded
   - Actor type marked (official_ai)
   - Action reasons for transparency

## Integration with Existing Systems

### ActionType Extension
Updated AutomationActionLog to include:
- `COMMENT` action type
- `REACTION` action type
- `targetPostId` field for post tracking
- `metadata` field for extensible action details

### AutomationAccount Extension
Already includes in shared types:
- `dailyCommentLimit` (for Phase 3 enforcement)
- `dailyReactionLimit` (for Phase 3 enforcement)
- `settings.enableAutoComments` (feature flag)
- `settings.enableAutoReactions` (feature flag)

## Future Enhancements

1. **Worker Implementation**:
   - Cloud Functions for scheduled comment generation
   - Post eligibility fetching from LinkedIn
   - Claude API integration for comment generation
   - Scheduled reaction selection and execution

2. **Advanced Features**:
   - Comment template variations
   - A/B testing different tones
   - Engagement analytics by comment type
   - Reaction effectiveness tracking
   - ML-based post scoring

3. **Integration**:
   - LinkedIn API integration
   - Real-time post monitoring
   - Webhook support for event-driven processing
   - Batch processing for efficiency

4. **Analytics**:
   - Comment approval/rejection rates
   - Reaction engagement metrics
   - Time-to-publish analysis
   - Keyword performance tracking
   - Account-level statistics

## Testing Considerations

### API Testing
- Comment settings CRUD operations
- Reaction settings CRUD operations
- Comment status transitions
- Comment action history
- Reaction scoring algorithm
- Post filtering logic

### UI Testing
- Settings form validation
- Status filter functionality
- Real-time comment/reaction updates
- Action button enablement logic
- Message display and auto-dismiss

### Business Logic Testing
- Comment quality validation
- Rate limit enforcement
- Engagement score calculation
- Duplicate detection
- Daily quota tracking

## Deployment Notes

1. Ensure Firestore collections are created with appropriate indexes
2. Set up security rules for collections (admin-only access)
3. Configure environment variables for Firebase
4. Test API routes with sample data
5. Verify permissions on settings pages
6. Monitor error logs for API failures
