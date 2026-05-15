import { Queue, Worker, QueueEvents, JobScheduler } from 'bullmq';
import { BullJobType, BullJobData, QueueMetrics } from '@ai-links/shared-types';
import { getRedisConnection } from './redis.js';
import { getLogger } from './logger.js';

const logger = getLogger();
const redisConnection = getRedisConnection();

interface QueueMap {
  [key: string]: Queue;
}

interface WorkerMap {
  [key: string]: Worker;
}

let queues: QueueMap = {};
let workers: WorkerMap = {};
let queueEvents: QueueEvents | null = null;
let schedulers: Record<string, JobScheduler> = {};

// Queue names
export const QUEUE_NAMES = {
  POST: 'postJobs',
  COMMENT: 'commentJobs',
  REACTION: 'reactionJobs',
  SCHEDULER: 'schedulerJobs',
};

export async function initializeQueues(): Promise<void> {
  try {
    // Create queues
    queues.post = new Queue(QUEUE_NAMES.POST, { connection: redisConnection });
    queues.comment = new Queue(QUEUE_NAMES.COMMENT, { connection: redisConnection });
    queues.reaction = new Queue(QUEUE_NAMES.REACTION, { connection: redisConnection });
    queues.scheduler = new Queue(QUEUE_NAMES.SCHEDULER, { connection: redisConnection });

    // BullMQ v5 requires a JobScheduler for repeatable (cron) jobs.
    // Without it, repeatable jobs can appear "stuck" (no new scheduler runs → no new executions).
    schedulers[QUEUE_NAMES.POST] = new JobScheduler(QUEUE_NAMES.POST, { connection: redisConnection });
    schedulers[QUEUE_NAMES.COMMENT] = new JobScheduler(QUEUE_NAMES.COMMENT, { connection: redisConnection });
    schedulers[QUEUE_NAMES.REACTION] = new JobScheduler(QUEUE_NAMES.REACTION, { connection: redisConnection });
    schedulers[QUEUE_NAMES.SCHEDULER] = new JobScheduler(QUEUE_NAMES.SCHEDULER, { connection: redisConnection });

    logger.info('Queues initialized successfully');
  } catch (error) {
    logger.error({ error }, 'Failed to initialize queues');
    throw error;
  }
}

export async function getQueue(queueName: string): Promise<Queue> {
  if (!queues[queueName]) {
    queues[queueName] = new Queue(queueName, { connection: redisConnection });
  }
  return queues[queueName];
}

export async function addJob(
  queueName: string,
  jobType: BullJobType,
  data: BullJobData,
  options?: {
    delay?: number;
    priority?: number;
    attempts?: number;
    backoff?: { type: string; delay: number };
    repeat?: { pattern: string };
  }
): Promise<string> {
  const queue = await getQueue(queueName);

  const defaultOptions = {
    attempts: parseInt(process.env.JOB_MAX_ATTEMPTS || '3', 10),
    backoff: {
      type: 'exponential',
      delay: parseInt(process.env.JOB_BACKOFF_DELAY || '1000', 10),
    },
    removeOnComplete: true,
    removeOnFail: false,
  };

  const mergedOptions = { ...defaultOptions, ...options };

  try {
    const job = await queue.add(jobType, data, mergedOptions);
    logger.info({ jobId: job.id, queueName, jobType }, 'Job added to queue');
    return job.id!;
  } catch (error) {
    logger.error({ error, queueName, jobType }, 'Failed to add job to queue');
    throw error;
  }
}

export async function addRepeatingJob(
  queueName: string,
  jobType: string,
  data: BullJobData,
  cronPattern: string,
  jobKey: string
): Promise<void> {
  try {
    const scheduler = schedulers[queueName] || new JobScheduler(queueName, { connection: redisConnection });
    schedulers[queueName] = scheduler;

    await scheduler.upsertJobScheduler(
      jobKey,
      { pattern: cronPattern },
      jobType,
      data,
      { removeOnComplete: true },
      { override: true }
    );

    logger.info({ queueName, jobType, cronPattern, jobKey }, 'Repeating job added');
  } catch (error) {
    logger.error({ error, queueName, jobType, cronPattern }, 'Failed to add repeating job');
    throw error;
  }
}

export async function removeRepeatingJob(
  queueName: string,
  jobKey: string
): Promise<void> {
  try {
    const scheduler = schedulers[queueName] || new JobScheduler(queueName, { connection: redisConnection });
    schedulers[queueName] = scheduler;

    await scheduler.removeJobScheduler(jobKey);
    logger.info({ queueName, jobKey }, 'Repeating job removed');
  } catch (error) {
    logger.error({ error, queueName, jobKey }, 'Failed to remove repeating job');
    throw error;
  }
}

export async function getQueueMetrics(queueName: string): Promise<QueueMetrics> {
  const queue = await getQueue(queueName);

  try {
    const counts = await queue.getJobCounts();

    return {
      pending: counts.pending ?? 0,
      active: counts.active ?? 0,
      completed: counts.completed ?? 0,
      failed: counts.failed ?? 0,
      delayed: counts.delayed ?? 0,
    };
  } catch (error) {
    logger.error({ error, queueName }, 'Failed to get queue metrics');
    throw error;
  }
}

export async function getJobById(
  queueName: string,
  jobId: string
): Promise<any | null> {
  const queue = await getQueue(queueName);

  try {
    const job = await queue.getJob(jobId);
    return job ? job.toJSON() : null;
  } catch (error) {
    logger.error({ error, queueName, jobId }, 'Failed to get job');
    throw error;
  }
}

export async function retryJob(
  queueName: string,
  jobId: string
): Promise<void> {
  const queue = await getQueue(queueName);

  try {
    const job = await queue.getJob(jobId);
    if (!job) {
      throw new Error('Job not found');
    }

    await job.retry();
    logger.info({ queueName, jobId }, 'Job retry initiated');
  } catch (error) {
    logger.error({ error, queueName, jobId }, 'Failed to retry job');
    throw error;
  }
}

export async function removeJob(
  queueName: string,
  jobId: string
): Promise<void> {
  const queue = await getQueue(queueName);

  try {
    const job = await queue.getJob(jobId);
    if (job) {
      await job.remove();
    }
    logger.info({ queueName, jobId }, 'Job removed from queue');
  } catch (error) {
    logger.error({ error, queueName, jobId }, 'Failed to remove job');
    throw error;
  }
}

export async function cleanQueue(queueName: string, state: string): Promise<void> {
  const queue = await getQueue(queueName);

  try {
    await queue.clean(0, 1000, state as any);
    logger.info({ queueName, state }, 'Queue cleaned');
  } catch (error) {
    logger.error({ error, queueName, state }, 'Failed to clean queue');
    throw error;
  }
}

export function registerWorker(
  queueName: string,
  processor: (job: any) => Promise<any>,
  concurrency?: number
): Worker {
  const worker = new Worker(queueName, processor, {
    connection: redisConnection,
    concurrency: concurrency || parseInt(process.env.WORKER_CONCURRENCY || '5', 10),
  });

  worker.on('completed', (job) => {
    logger.info({ jobId: job.id, queueName }, 'Job completed');
  });

  worker.on('failed', (job, err) => {
    logger.error(
      { jobId: job?.id, queueName, error: err.message },
      'Job failed'
    );
  });

  worker.on('error', (err) => {
    logger.error({ error: err, queueName }, 'Worker error');
  });

  workers[queueName] = worker;
  logger.info({ queueName }, 'Worker registered');

  return worker;
}

export async function closeQueues(): Promise<void> {
  try {
    // Close all workers
    for (const workerKey in workers) {
      await workers[workerKey].close();
    }

    // Close all schedulers
    for (const schedulerKey in schedulers) {
      await schedulers[schedulerKey].close();
    }

    // Close all queues
    for (const queueKey in queues) {
      await queues[queueKey].close();
    }

    workers = {};
    queues = {};
    schedulers = {};

    logger.info('All queues and workers closed');
  } catch (error) {
    logger.error({ error }, 'Error closing queues');
    throw error;
  }
}

export function getAllQueues(): QueueMap {
  return queues;
}

export function getQueueNames(): typeof QUEUE_NAMES {
  return QUEUE_NAMES;
}
