import { z } from 'zod';
import {
  TonePreset,
  ContentIntent,
  JobType,
  JobStatus,
  ActionType,
} from './index';

// Account Schemas
export const CreateAccountSchema = z.object({
  linkedinUrl: z.string().url('Invalid LinkedIn URL'),
  dailyPostLimit: z.number().int().min(1).max(100),
  dailyCommentLimit: z.number().int().min(1).max(100),
  dailyReactionLimit: z.number().int().min(1).max(100),
  timezone: z.string().min(1),
  settings: z.object({
    enableAutoPosting: z.boolean(),
    enableAutoComments: z.boolean(),
    enableAutoReactions: z.boolean(),
    minMinutesBetweenActions: z.number().int().min(1),
  }).optional(),
});

export type CreateAccountInput = z.infer<typeof CreateAccountSchema>;

// Keywords Schemas
export const PostWindowSchema = z.object({
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:mm'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Format: HH:mm'),
  enabled: z.boolean(),
});

export const UpdateKeywordsSchema = z.object({
  accountId: z.string().min(1),
  primaryKeywords: z.array(z.string().min(1)).min(1),
  secondaryKeywords: z.array(z.string().min(1)),
  blockedKeywords: z.array(z.string().min(1)),
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

export type UpdateKeywordsInput = z.infer<typeof UpdateKeywordsSchema>;

// Schedule Schemas
export const UpdateScheduleSchema = z.object({
  accountId: z.string().min(1),
  weekdayPostWindow: PostWindowSchema,
  weekendPostWindow: PostWindowSchema,
  weekdayCommentWindow: PostWindowSchema,
  weekendCommentWindow: PostWindowSchema,
  timezone: z.string().min(1),
  minMinutesBetweenActions: z.number().int().min(1),
  weekdaysEnabled: z.array(z.boolean()).length(7),
});

export type UpdateScheduleInput = z.infer<typeof UpdateScheduleSchema>;

// Job Schemas
export const JobPayloadSchema = z.object({
  keyword: z.string().optional(),
  theme: z.string().optional(),
  contentId: z.string().optional(),
  targetProfileUrl: z.string().optional(),
  manualTrigger: z.boolean().default(true),
});

export const CreateJobSchema = z.object({
  accountId: z.string().min(1),
  jobType: z.enum([JobType.POST_GENERATION, JobType.COMMENT_GENERATION]),
  payload: JobPayloadSchema.optional(),
  priority: z.number().int().min(1).max(10).default(5),
});

export type CreateJobInput = z.infer<typeof CreateJobSchema>;

export const JobActionSchema = z.object({
  action: z.enum(['retry', 'cancel']),
});

export type JobActionInput = z.infer<typeof JobActionSchema>;

// Content Generation Schemas
export const GeneratedContentSchema = z.object({
  content: z.string().min(10).max(3000),
  hashtags: z.array(z.string()).optional(),
  emoji: z.array(z.string()).optional(),
});

export type GeneratedContent = z.infer<typeof GeneratedContentSchema>;

// Response Schemas
export const ErrorResponseSchema = z.object({
  error: z.string(),
  details: z.any().optional(),
});

export const SuccessResponseSchema = z.object({
  data: z.any(),
});

// Validation helper functions
export function validateCreateAccount(data: unknown) {
  return CreateAccountSchema.safeParse(data);
}

export function validateUpdateKeywords(data: unknown) {
  return UpdateKeywordsSchema.safeParse(data);
}

export function validateUpdateSchedule(data: unknown) {
  return UpdateScheduleSchema.safeParse(data);
}

export function validateCreateJob(data: unknown) {
  return CreateJobSchema.safeParse(data);
}

export function validateJobAction(data: unknown) {
  return JobActionSchema.safeParse(data);
}

export function validateGeneratedContent(data: unknown) {
  return GeneratedContentSchema.safeParse(data);
}
