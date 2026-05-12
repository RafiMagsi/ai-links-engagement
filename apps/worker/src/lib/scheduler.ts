import { getLogger } from './logger.js';
import { addRepeatingJob, QUEUE_NAMES } from './queue.js';
import { BullJobType, BullJobData } from '@ai-links/shared-types';

const logger = getLogger();

// Cron expressions for different schedulers
const CRON_PATTERNS = {
  POST_SCHEDULER: '0 */30 * * * *', // Every 30 minutes
  COMMENT_SCHEDULER: '0 */20 * * * *', // Every 20 minutes
  REACTION_SCHEDULER: '0 */30 * * * *', // Every 30 minutes
  QUOTA_RESET: '0 5 0 * * *', // Every day at 00:05 UTC (for Asia/Karachi: 5:05 AM)
};

export async function setupSchedulers(): Promise<void> {
  logger.info('Setting up automated job schedulers');

  try {
    // Post Scheduler - Every 30 minutes
    await addRepeatingJob(
      QUEUE_NAMES.SCHEDULER,
      BullJobType.POST_SCHEDULER,
      {
        accountId: 'system',
        actionType: 'post_generation_started' as any,
        metadata: { schedulerType: 'post' },
      } as BullJobData,
      CRON_PATTERNS.POST_SCHEDULER,
      'post-scheduler'
    );

    // Comment Scheduler - Every 20 minutes
    await addRepeatingJob(
      QUEUE_NAMES.SCHEDULER,
      BullJobType.COMMENT_SCHEDULER,
      {
        accountId: 'system',
        actionType: 'post_generation_started' as any,
        metadata: { schedulerType: 'comment' },
      } as BullJobData,
      CRON_PATTERNS.COMMENT_SCHEDULER,
      'comment-scheduler'
    );

    // Reaction Scheduler - Every 30 minutes
    await addRepeatingJob(
      QUEUE_NAMES.SCHEDULER,
      BullJobType.REACTION_SCHEDULER,
      {
        accountId: 'system',
        actionType: 'post_generation_started' as any,
        metadata: { schedulerType: 'reaction' },
      } as BullJobData,
      CRON_PATTERNS.REACTION_SCHEDULER,
      'reaction-scheduler'
    );

    // Quota Reset - Every day at 00:05 UTC
    await addRepeatingJob(
      QUEUE_NAMES.SCHEDULER,
      BullJobType.QUOTA_RESET,
      {
        accountId: 'system',
        actionType: 'post_generation_started' as any,
        metadata: { schedulerType: 'quota_reset' },
      } as BullJobData,
      CRON_PATTERNS.QUOTA_RESET,
      'quota-reset'
    );

    logger.info('All schedulers set up successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to set up schedulers');
    throw error;
  }
}

export function getCronPatterns() {
  return CRON_PATTERNS;
}

export function getSchedulerConfig() {
  return {
    postScheduler: {
      interval: 30,
      unit: 'minutes',
      cronPattern: CRON_PATTERNS.POST_SCHEDULER,
    },
    commentScheduler: {
      interval: 20,
      unit: 'minutes',
      cronPattern: CRON_PATTERNS.COMMENT_SCHEDULER,
    },
    reactionScheduler: {
      interval: 30,
      unit: 'minutes',
      cronPattern: CRON_PATTERNS.REACTION_SCHEDULER,
    },
    quotaReset: {
      time: '00:05',
      timezone: 'UTC',
      cronPattern: CRON_PATTERNS.QUOTA_RESET,
    },
  };
}
