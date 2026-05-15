// Automation Account Types
export interface AutomationAccount {
  id: string;
  userId: string;
  name: string;
  email: string;
  bio?: string;
  location?: string;
  role?: string;
  skills?: string[];
  /**
   * High-level category used to select content sources and tune "recent topics" seeding.
   * Keep this coarse-grained; detailed topical control should live in keywords/settings.
   */
  category?: AutomationAccountCategory;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
  dailyPostLimit: number;
  dailyCommentLimit: number;
  dailyReactionLimit: number;
  timezone: string;
  settings?: {
    enableAutoPosting: boolean;
    enableAutoComments: boolean;
    enableAutoReactions: boolean;
    minMinutesBetweenActions: number;
  };
}

export enum AutomationAccountCategory {
  AI = 'ai',
  SOFTWARE = 'software',
  STARTUPS = 'startups',
  PRODUCT = 'product',
  MARKETING = 'marketing',
  SALES = 'sales',
  FINANCE = 'finance',
  HEALTH = 'health',
  GENERAL = 'general'
}

// Post Type for AI Links Mobile App
export interface Post {
  id: string;
  text: string;
  authorUid: string;
  authorName: string;
  authorAvatarUrl?: string;
  authorRole?: string;
  colorCode?: string;
  postType: string;
  hashtags?: string[];
  media?: Array<{
    url: string;
    type: 'image' | 'video';
  }>;
  likesCount: number;
  commentsCount: number;
  repostsCount: number;
  savesCount: number;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Tone Preset Type
export enum TonePreset {
  PROFESSIONAL = 'professional',
  FRIENDLY = 'friendly',
  EDUCATIONAL = 'educational',
  INSPIRATIONAL = 'inspirational',
  HUMOROUS = 'humorous'
}

// Intent Type
export enum ContentIntent {
  KNOWLEDGE_SHARING = 'knowledge_sharing',
  QUESTION = 'question',
  INDUSTRY_NEWS = 'industry_news',
  PERSONAL_STORY = 'personal_story',
  CALL_TO_ACTION = 'call_to_action'
}

// Automation Keywords Type
export interface AutomationKeywords {
  id: string;
  accountId: string;
  primaryKeywords: string[];
  secondaryKeywords: string[];
  blockedKeywords: string[];
  tonePreset: TonePreset;
  allowedIntents: ContentIntent[];
  createdAt: Date;
  updatedAt: Date;
}

// Post Window Type
export interface PostWindow {
  startTime: string; // HH:mm format
  endTime: string; // HH:mm format
  enabled: boolean;
}

// Reaction Type
export enum ReactionType {
  FEEDBACK_GIVEN = 'feedback_given',
  CURATED = 'curated',
  SPOTLIGHT = 'spotlight'
}

// Reaction Settings Type
export interface ReactionSettings {
  id?: string;
  accountId: string;
  enabled?: boolean;
  maxReactionsPerDay?: number;
  maxReactionsPerPost?: number;
  allowedReactionTypes?: ReactionType[];
  curateTrendingContent?: boolean;
  minEngagementScore?: number;
  keywordWeighting?: Record<string, number>;
  createdAt?: Date;
  updatedAt?: Date;
}

// Official Reaction Type
export interface OfficialReaction {
  id?: string;
  accountId: string;
  postId?: string;
  reactionType: ReactionType;
  targetContentId?: string;
  targetProfileUrl?: string;
  engagementScore?: number;
  actorType?: string;
  isOfficialAction?: boolean;
  actionReason?: string;
  createdAt?: Date;
}

// Comment Settings Type
export interface CommentSettings {
  id?: string;
  accountId: string;
  enabled?: boolean;
  maxCommentsPerDay?: number;
  minTimeBetweenComments?: number;
  minCommentLength?: number;
  maxCommentLength?: number;
  requireApproval?: boolean;
  allowOnAIGeneratedPosts?: boolean;
  keywords?: string[];
  tone?: string;
  commentTemplate?: string;
  autoCommentEnabled?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

// Automation Schedule Type
export interface AutomationSchedule {
  id: string;
  accountId: string;
  weekdayPostWindow: PostWindow;
  weekendPostWindow: PostWindow;
  weekdayCommentWindow: PostWindow;
  weekendCommentWindow: PostWindow;
  timezone: string;
  minMinutesBetweenActions: number;
  weekdaysEnabled: boolean[];  // [Mon, Tue, Wed, Thu, Fri, Sat, Sun]
  createdAt: Date;
  updatedAt: Date;
}

// Automation Job Type
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED_RATE_LIMITED = 'skipped_rate_limited',
  CANCELLED = 'cancelled'
}

export enum JobType {
  POST_GENERATION = 'post_generation',
  COMMENT_GENERATION = 'comment_generation',
  REACTION_ACTION = 'reaction_action'
}

export interface AutomationJob {
  id: string;
  accountId: string;
  jobType: JobType;
  status: JobStatus;
  priority: number;
  payload: {
    keyword?: string;
    theme?: string;
    contentId?: string;
    targetProfileUrl?: string;
    manualTrigger?: boolean;
  };
  result?: {
    generatedContent?: string;
    aiModel?: string;
    tokensUsed?: number;
    publishedUrl?: string;
    postId?: string;
    hashtagsExtracted?: string[];
    error?: string;
  };
  attempts: number;
  maxAttempts: number;
  startedAt?: Date;
  completedAt?: Date;
  nextRetryAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Automation Action Log Type
export enum ActionType {
  POST_CREATED = 'post_created',
  COMMENT_CREATED = 'comment_created',
  REACTION_ADDED = 'reaction_added',
  POST_GENERATION_STARTED = 'post_generation_started',
  POST_GENERATION_FAILED = 'post_generation_failed',
  QUOTA_EXCEEDED = 'quota_exceeded'
}

export interface AutomationActionLog {
  id: string;
  jobId?: string;
  accountId: string;
  actionType: ActionType;
  targetContentId?: string;
  targetProfileUrl?: string;
  success: boolean;
  details?: {
    generatedContent?: string;
    prompt?: string;
    model?: string;
    tokensUsed?: number;
  };
  error?: string;
  createdAt: Date;
}

// Daily Usage Type
export interface DailyUsage {
  id: string;
  date: string; // YYYY-MM-DD format
  postsCreated: number;
  commentsCreated: number;
  reactionsAdded: number;
  totalActions: number;
  quotaPostsRemaining: number;
  quotaCommentsRemaining: number;
  quotaReactionsRemaining: number;
  quotaTotalRemaining: number;
  createdAt: Date;
  updatedAt: Date;
}

// Admin User Type
export interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  customClaims?: AdminCustomClaims;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminCustomClaims {
  admin: boolean;
  superAdmin?: boolean;
  permissions?: string[];
}

// Error Code Type
export enum ErrorCode {
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  INVALID_REQUEST = 'INVALID_REQUEST',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',
  FIREBASE_ERROR = 'FIREBASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR'
}

// Comment Status Type
export enum CommentStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  PUBLISHED = 'published'
}

// AutomationComment Type
export interface AutomationComment {
  id?: string;
  accountId: string;
  content: string;
  status: CommentStatus;
  postId?: string;
  targetPostId?: string;
  targetProfileUrl?: string;
  generatedBy?: 'ai' | 'manual';
  generatedAt?: Date;
  actorType?: string;
  isOfficialAction?: boolean;
  rejectedReason?: string;
  publishedAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

// Schemas are in separate file to avoid circular imports
// They can be imported directly from '@ai-links/shared-types/schemas' if needed

// Global Automation Policy Type
export interface AutomationPolicy {
  id: string;
  automationEnabled: boolean;
  globalKillSwitch: boolean;
  quotaCapMultiplier: number;
  createdAt: Date;
  updatedAt: Date;
}

// BullMQ Job Types
export enum BullJobType {
  POST_ACTION = 'post_action',
  COMMENT_ACTION = 'comment_action',
  REACTION_ACTION = 'reaction_action',
  POST_SCHEDULER = 'post_scheduler',
  COMMENT_SCHEDULER = 'comment_scheduler',
  REACTION_SCHEDULER = 'reaction_scheduler',
  QUOTA_RESET = 'quota_reset'
}

export interface BullJobData {
  accountId: string;
  actionType: ActionType;
  targetId?: string;
  content?: string;
  metadata?: Record<string, unknown>;
}

export interface QueueMetrics {
  pending: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

export interface JobDetail {
  id: string;
  name: string;
  data: BullJobData;
  status: JobStatus;
  progress: number;
  attempt: number;
  max_attempts: number;
  failedReason?: string;
  stackTrace?: string;
  createdAt: Date;
  finishedAt?: Date;
  processedOn?: Date;
  completedOn?: Date;
}

// Scheduler Configuration Type
export interface SchedulerConfig {
  accountId: string;
  jobType: BullJobType;
  cronExpression: string;
  enabled: boolean;
  lastRun?: Date;
  nextRun?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Re-export schemas from schemas.ts
export {
  CreateAccountSchema,
  PostWindowSchema,
  UpdateKeywordsSchema,
  UpdateScheduleSchema,
  JobPayloadSchema,
  CreateJobSchema,
  JobActionSchema,
  GeneratedContentSchema,
  ErrorResponseSchema,
  SuccessResponseSchema,
  validateCreateAccount,
  validateUpdateKeywords,
  validateUpdateSchedule,
  validateCreateJob,
  validateJobAction,
  validateGeneratedContent,
} from './schemas.js';
