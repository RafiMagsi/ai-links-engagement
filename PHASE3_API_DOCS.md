# Phase 3 API Documentation

## Comments Endpoints

### GET /api/comment-settings
Retrieve comment settings for an account.

**Query Parameters:**
- `accountId` (required): The account ID

**Response:**
```json
{
  "success": true,
  "data": {
    "accountId": "account-123",
    "enabled": true,
    "maxCommentsPerDay": 5,
    "minTimeBetweenComments": 45,
    "minCommentLength": 50,
    "maxCommentLength": 280,
    "requireApproval": true,
    "allowOnAIGeneratedPosts": false,
    "keywords": ["AI", "technology"],
    "tone": "professional",
    "createdAt": "2024-05-12T10:00:00Z",
    "updatedAt": "2024-05-12T10:00:00Z"
  }
}
```

### POST /api/comment-settings
Create or update comment settings for an account.

**Request Body:**
```json
{
  "accountId": "account-123",
  "enabled": true,
  "maxCommentsPerDay": 5,
  "minTimeBetweenComments": 45,
  "minCommentLength": 50,
  "maxCommentLength": 280,
  "requireApproval": true,
  "allowOnAIGeneratedPosts": false,
  "keywords": ["AI", "technology"],
  "tone": "professional"
}
```

**Response:** Returns the saved settings object with timestamps.

### GET /api/comments
List comments for an account with optional filtering.

**Query Parameters:**
- `accountId` (required): The account ID
- `status` (optional): Filter by status (pending, approved, published, rejected, failed)
- `limit` (optional): Maximum results (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "comment-1",
      "accountId": "account-123",
      "postId": "post-456",
      "content": "Great insight on AI development...",
      "status": "pending",
      "generatedAt": "2024-05-12T10:00:00Z",
      "actorType": "auto_generated",
      "isOfficialAction": false,
      "createdAt": "2024-05-12T10:00:00Z",
      "updatedAt": "2024-05-12T10:00:00Z"
    }
  ],
  "total": 1
}
```

### POST /api/comments
Create a new comment.

**Request Body:**
```json
{
  "accountId": "account-123",
  "postId": "post-456",
  "content": "Great insight on AI development..."
}
```

**Response:** Returns the created comment with status PENDING or APPROVED based on settings.

### POST /api/comments/[id]
Update comment status (approve, reject, or publish).

**Request Body:**
```json
{
  "action": "approve|reject|publish",
  "reason": "Optional rejection reason"
}
```

**Response:** Returns updated comment object.

### DELETE /api/comments/[id]
Delete a comment.

**Response:**
```json
{
  "success": true,
  "message": "Comment deleted"
}
```

### GET /api/eligible-posts
Fetch posts eligible for commenting.

**Query Parameters:**
- `accountId` (required): The account ID
- `limit` (optional): Maximum results (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "post-456",
      "content": "Post content here...",
      "likesCount": 42,
      "commentsCount": 8,
      "isDeleted": false,
      "isAIGenerated": false,
      "tags": ["AI", "technology"]
    }
  ],
  "total": 5,
  "stats": {
    "totalPosts": 50,
    "eligible": 5,
    "alreadyCommented": 10
  }
}
```

### POST /api/generate-comment
Generate a comment on a specific post.

**Request Body:**
```json
{
  "accountId": "account-123",
  "postId": "post-456",
  "postContent": "The post content for context...",
  "manualContent": "Optional: directly provide comment content"
}
```

**Responses:**

Success (201):
```json
{
  "success": true,
  "data": { /* comment object */ },
  "requiresApproval": true,
  "message": "Comment created - pending approval"
}
```

Rate Limited (429):
```json
{
  "error": "Rate limited - wait 35 more minutes before commenting"
}
```

Validation Error (400):
```json
{
  "error": "Comment failed validation",
  "errors": [
    "Comment too short (45 chars, minimum 50)",
    "Comment is empty praise - must add substantial value"
  ]
}
```

### GET /api/generate-comment
Check if a comment already exists on a post.

**Query Parameters:**
- `accountId` (required): The account ID
- `postId` (required): The post ID

**Response:**
```json
{
  "success": true,
  "exists": true,
  "data": { /* comment object if exists */ }
}
```

## Reactions Endpoints

### GET /api/reaction-settings
Retrieve reaction settings for an account.

**Query Parameters:**
- `accountId` (required): The account ID

**Response:**
```json
{
  "success": true,
  "data": {
    "accountId": "account-123",
    "enabled": true,
    "maxReactionsPerDay": 10,
    "maxReactionsPerPost": 1,
    "allowedReactionTypes": ["feedback_given", "curated", "spotlight"],
    "curateTrendingContent": true,
    "minEngagementScore": 20,
    "keywordWeighting": {
      "AI": 2,
      "technology": 1
    },
    "createdAt": "2024-05-12T10:00:00Z",
    "updatedAt": "2024-05-12T10:00:00Z"
  }
}
```

### POST /api/reaction-settings
Create or update reaction settings for an account.

**Request Body:**
```json
{
  "accountId": "account-123",
  "enabled": true,
  "maxReactionsPerDay": 10,
  "maxReactionsPerPost": 1,
  "allowedReactionTypes": ["feedback_given", "curated"],
  "curateTrendingContent": true,
  "minEngagementScore": 20
}
```

**Response:** Returns the saved settings object with timestamps.

### GET /api/reactions
List reactions for an account with optional filtering.

**Query Parameters:**
- `accountId` (required): The account ID
- `reactionType` (optional): Filter by type (feedback_given, curated, spotlight)
- `limit` (optional): Maximum results (default: 50)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "reaction-1",
      "accountId": "account-123",
      "postId": "post-456",
      "reactionType": "feedback_given",
      "engagementScore": 45,
      "actorType": "official_ai",
      "isOfficialAction": true,
      "actionReason": "High-quality content - providing feedback | Relevant topics: AI",
      "createdAt": "2024-05-12T10:00:00Z"
    }
  ],
  "total": 1
}
```

### POST /api/reactions
Create a new reaction.

**Request Body:**
```json
{
  "accountId": "account-123",
  "postId": "post-456",
  "reactionType": "feedback_given",
  "engagementScore": 45,
  "actionReason": "High-quality content - providing feedback"
}
```

**Response:** Returns the created reaction object.

### POST /api/generate-reaction
Generate a reaction on a specific post.

**Request Body:**
```json
{
  "accountId": "account-123",
  "postId": "post-456",
  "reactionType": "curated",
  "engagementScore": 85,
  "matchedKeywords": ["AI", "technology"]
}
```

**Responses:**

Success (201):
```json
{
  "success": true,
  "data": { /* reaction object */ },
  "message": "curated reaction created on post post-456"
}
```

Rate Limited (429):
```json
{
  "error": "Daily reaction limit exceeded (10 per day)"
}
```

Conflict (409):
```json
{
  "error": "Already reacted to this post"
}
```

### GET /api/generate-reaction
Check if a reaction already exists on a post.

**Query Parameters:**
- `accountId` (required): The account ID
- `postId` (required): The post ID

**Response:**
```json
{
  "success": true,
  "exists": true,
  "data": { /* reaction object if exists */ }
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- **200 OK**: Successful GET request
- **201 Created**: Successful POST request creating a resource
- **400 Bad Request**: Validation error or missing required parameters
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate action (already commented/reacted)
- **429 Too Many Requests**: Rate limit exceeded
- **500 Internal Server Error**: Server-side error

Error responses include:
```json
{
  "error": "Description of the error",
  "errors": [] // Optional array of detailed errors
}
```

## Authentication

All endpoints require:
1. Valid Firebase ID token in Authorization header
2. Admin custom claims (`admin: true`)
3. Access to the account being queried

## Rate Limiting

- **Comments**: Enforced by `minTimeBetweenComments` and `maxCommentsPerDay`
- **Reactions**: Enforced by `maxReactionsPerDay`

Rate limit errors return 429 status with remaining wait time.

## Data Validation

### Comments
- Content length: 50-500 characters (default 50-280)
- No empty praise patterns
- No spam-like repetition
- Must add substantive value

### Reactions
- Must meet minimum engagement score
- Cannot react twice to same post
- Must be within daily limits
- Reaction type must be in allowed list

## Pagination

Results are paginated using the `limit` query parameter:
- Default: 50 items
- Maximum: 100 items
- Returns total count in response

## Timestamps

All timestamps are ISO 8601 format UTC:
- `createdAt`: When resource was created
- `updatedAt`: When resource was last modified
- `generatedAt`: When comment was generated (comments only)
- `publishedAt`: When comment was published (comments only)

## Firestore Collection Organization

```
automationCommentSettings/
  {accountId}/

automationComments/
  {commentId}/

automationReactionSettings/
  {accountId}/

officialReactions/
  {reactionId}/

automationActionLogs/
  {logId}/
```

## Integration Examples

### Create and approve a comment
```bash
# 1. Create comment
curl -X POST http://localhost:3000/api/comments \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-123",
    "postId": "post-456",
    "content": "Great insight!"
  }'

# 2. Approve comment
curl -X POST http://localhost:3000/api/comments/comment-1 \
  -H "Content-Type: application/json" \
  -d '{ "action": "approve" }'

# 3. Publish comment
curl -X POST http://localhost:3000/api/comments/comment-1 \
  -H "Content-Type: application/json" \
  -d '{ "action": "publish" }'
```

### Generate and track reactions
```bash
# 1. Get eligible posts
curl "http://localhost:3000/api/eligible-posts?accountId=acc-123"

# 2. Create reaction
curl -X POST http://localhost:3000/api/generate-reaction \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": "acc-123",
    "postId": "post-456",
    "reactionType": "curated",
    "engagementScore": 85
  }'

# 3. View reactions
curl "http://localhost:3000/api/reactions?accountId=acc-123&reactionType=curated"
```
