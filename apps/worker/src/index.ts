import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { initializeFirebaseAdmin } from '@ai-links/firebase-admin';
import { initializeLogger } from './lib/logger.js';
import { initializeRedis, closeRedis } from './lib/redis.js';
import { initializeQueues, registerWorker, closeQueues, QUEUE_NAMES } from './lib/queue.js';
import { setupSchedulers } from './lib/scheduler.js';
import {
  handlePostAction,
  handleCommentAction,
  handleReactionAction,
  handleSchedulerJob,
  handleQuotaReset,
} from './lib/job-handlers.js';
import { BullJobType } from '@ai-links/shared-types';

// Initialize Firebase Admin
initializeFirebaseAdmin();

// Initialize Logger
const logger = initializeLogger(process.env.WORKER_LOG_LEVEL || 'info');

logger.info('Worker initialization started');

// Main startup function
async function startWorker() {
  try {
    // Initialize Redis
    logger.info('Initializing Redis...');
    await initializeRedis();

    // Initialize Queues
    logger.info('Initializing queues...');
    await initializeQueues();

    // Register workers for each queue
    logger.info('Registering job processors...');

    // Post Jobs Worker
    registerWorker(QUEUE_NAMES.POST, async (job) => {
      logger.info({ jobId: job.id, jobType: job.name }, 'Processing post job');
      return handlePostAction(job.data);
    });

    // Comment Jobs Worker
    registerWorker(QUEUE_NAMES.COMMENT, async (job) => {
      logger.info({ jobId: job.id, jobType: job.name }, 'Processing comment job');
      return handleCommentAction(job.data);
    });

    // Reaction Jobs Worker
    registerWorker(QUEUE_NAMES.REACTION, async (job) => {
      logger.info({ jobId: job.id, jobType: job.name }, 'Processing reaction job');
      return handleReactionAction(job.data);
    });

    // Scheduler Jobs Worker
    registerWorker(QUEUE_NAMES.SCHEDULER, async (job) => {
      logger.info({ jobId: job.id, jobType: job.name }, 'Processing scheduler job');
      if (job.name === BullJobType.QUOTA_RESET) {
        return handleQuotaReset(job.data);
      }
      return handleSchedulerJob(job.data);
    });

    // Setup recurring schedulers
    logger.info('Setting up schedulers...');
    await setupSchedulers();

    logger.info('Worker started successfully, ready to process jobs');
  } catch (error) {
    logger.error({ error }, 'Failed to start worker');
    process.exit(1);
  }
}

startWorker();

// Graceful shutdown
async function shutdown(signal: string) {
  logger.info(`${signal} received, shutting down gracefully...`);

  try {
    await closeQueues();
    await closeRedis();
    logger.info('Shutdown completed successfully');
    process.exit(0);
  } catch (error) {
    logger.error({ error }, 'Error during shutdown');
    process.exit(1);
  }
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error({ error }, 'Uncaught exception');
  process.exit(1);
});

process.on('unhandledRejection', (reason) => {
  logger.error({ error: reason }, 'Unhandled promise rejection');
  process.exit(1);
});
