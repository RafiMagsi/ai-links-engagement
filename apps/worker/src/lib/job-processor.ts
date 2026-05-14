import { getFirestore } from '@ai-links/firebase-admin';
import {
  AutomationJob,
  JobStatus,
  JobType,
  AutomationAccount,
  AutomationKeywords,
  ActionType,
} from '@ai-links/shared-types';
import { getLogger } from './logger.js';
import { contentGenerator, OPENAI_MODEL } from './content-generator.js';
import { quotaEngine } from './quota-engine.js';

class JobProcessor {
  private logger = getLogger();
  private isProcessing = false;

  async processNextJob(): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    try {
      this.isProcessing = true;

      const db = getFirestore();
      const now = new Date();

      // Find next pending job
      const snapshot = await db
        .collection('automationJobs')
        .where('status', '==', JobStatus.PENDING)
        .orderBy('priority', 'desc')
        .orderBy('createdAt', 'asc')
        .limit(1)
        .get();

      if (snapshot.empty) {
        return;
      }

      const jobDoc = snapshot.docs[0];
      const job = jobDoc.data() as AutomationJob;

      this.logger.info({ jobId: job.id }, 'Processing job');

      try {
        // Update job status to processing
        await jobDoc.ref.update({
          status: JobStatus.PROCESSING,
          startedAt: now,
          updatedAt: now,
        });

        // Get account and keywords
        const accountDoc = await db.collection('automationAccounts').doc(job.accountId).get();
        const keywordsDoc = await db.collection('automationKeywords').doc(job.accountId).get();

        if (!accountDoc.exists || !keywordsDoc.exists) {
          throw new Error('Account or keywords not found');
        }

        const account = accountDoc.data() as AutomationAccount;
        const keywords = keywordsDoc.data() as AutomationKeywords;

        // Check quota
        const quotaStatus = await quotaEngine.checkQuota('post');
        if (quotaStatus.isExceeded) {
          this.logger.warn({ jobId: job.id }, 'Quota exceeded, marking job as rate limited');

          await jobDoc.ref.update({
            status: JobStatus.SKIPPED_RATE_LIMITED,
            completedAt: now,
            updatedAt: now,
          });

          // Log quota exceeded action
          await this.logAction(job.accountId, ActionType.QUOTA_EXCEEDED);
          return;
        }

        // Process based on job type
        let result: any;

        if (job.jobType === JobType.POST_GENERATION) {
          result = await this.generatePost(job, keywords);
        } else if (job.jobType === JobType.COMMENT_GENERATION) {
          result = await this.generateComment(job, keywords);
        } else {
          throw new Error(`Unknown job type: ${job.jobType}`);
        }

        // Record action in quota
        const actionType = job.jobType === JobType.POST_GENERATION ? 'post' : 'comment';
        await quotaEngine.recordAction(actionType as 'post' | 'comment' | 'reaction');

        // Update job as completed
        await jobDoc.ref.update({
          status: JobStatus.COMPLETED,
          completedAt: now,
          result,
          updatedAt: now,
        });

        // Log successful action
        const actionTypeMap = {
          [JobType.POST_GENERATION]: ActionType.POST_CREATED,
          [JobType.COMMENT_GENERATION]: ActionType.COMMENT_CREATED,
        };

        await this.logAction(
          job.accountId,
          actionTypeMap[job.jobType] || ActionType.POST_CREATED,
          {
            jobId: job.id,
            generatedContent: result.generatedContent,
            prompt: 'Generated post content',
            model: OPENAI_MODEL,
            tokensUsed: result.tokensUsed,
          }
        );

        this.logger.info({ jobId: job.id }, 'Job completed successfully');
      } catch (error) {
        this.logger.error({ jobId: job.id, error }, 'Job processing failed');

        // Retry logic
        if (job.attempts < job.maxAttempts) {
          const nextRetryAt = new Date(now.getTime() + (job.attempts * 1000 * 60)); // Exponential backoff

          await jobDoc.ref.update({
            status: JobStatus.PENDING,
            attempts: job.attempts + 1,
            nextRetryAt,
            updatedAt: now,
          });

          this.logger.info(
            { jobId: job.id, attempt: job.attempts + 1, nextRetryAt },
            'Job scheduled for retry'
          );
        } else {
          // Mark as failed after max attempts
          await jobDoc.ref.update({
            status: JobStatus.FAILED,
            completedAt: now,
            result: {
              error: (error as Error).message,
            },
            updatedAt: now,
          });

          // Log failed action
          await this.logAction(job.accountId, ActionType.POST_GENERATION_FAILED, {
            jobId: job.id,
            error: (error as Error).message,
          });

          this.logger.error(
            { jobId: job.id },
            'Job failed after max attempts'
          );
        }
      }
    } finally {
      this.isProcessing = false;
    }
  }

  private async generatePost(job: AutomationJob, keywords: AutomationKeywords): Promise<any> {
    const keyword = job.payload.keyword || keywords.primaryKeywords[0];

    const content = await contentGenerator.generatePost({
      keyword,
      keywords,
    });

    if (!contentGenerator.validateContent(content)) {
      throw new Error('Generated content failed validation');
    }

    return {
      generatedContent: content.content,
      tokensUsed: 150, // Estimate
      model: OPENAI_MODEL,
    };
  }

  private async generateComment(
    job: AutomationJob,
    keywords: AutomationKeywords
  ): Promise<any> {
    const keyword = job.payload.keyword || keywords.primaryKeywords[0];
    const postContent = job.payload.targetProfileUrl || 'Original post';

    const content = await contentGenerator.generateComment(postContent, {
      keyword,
      keywords,
    });

    if (!contentGenerator.validateContent(content)) {
      throw new Error('Generated content failed validation');
    }

    return {
      generatedContent: content.content,
      tokensUsed: 100, // Estimate
      model: OPENAI_MODEL,
    };
  }

  private async logAction(
    accountId: string,
    actionType: ActionType,
    details?: any
  ): Promise<void> {
    const db = getFirestore();

    const log = {
      accountId,
      actionType,
      success: actionType !== ActionType.POST_GENERATION_FAILED,
      details,
      createdAt: new Date(),
    };

    await db.collection('automationActionLogs').add(log);

    this.logger.debug({ accountId, actionType }, 'Action logged');
  }
}

export const jobProcessor = new JobProcessor();
