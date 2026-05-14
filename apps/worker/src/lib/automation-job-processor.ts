import { getFirestore } from '@ai-links/firebase-admin';
import { AutomationJob, JobType, JobStatus, AutomationKeywords } from '@ai-links/shared-types';
import { getLogger } from './logger.js';

const logger = getLogger();

export class AutomationJobProcessor {
  private db = getFirestore();
  private pollingInterval = 5000; // Poll every 5 seconds
  private isRunning = false;
  private contentGenerator: any = null;

  private async getContentGenerator(): Promise<any> {
    if (!this.contentGenerator) {
      const { contentGenerator } = await import('./content-generator.js');
      this.contentGenerator = contentGenerator;
    }
    return this.contentGenerator;
  }

  async start() {
    if (this.isRunning) {
      logger.warn('AutomationJobProcessor is already running');
      return;
    }

    this.isRunning = true;
    logger.info('Starting AutomationJobProcessor');
    this.pollAndProcess();
  }

  async stop() {
    this.isRunning = false;
    logger.info('Stopping AutomationJobProcessor');
  }

  private async pollAndProcess() {
    while (this.isRunning) {
      try {
        await this.processPendingJobs();
      } catch (error) {
        logger.error({ error }, 'Error polling pending jobs');
      }

      // Wait before next poll
      await new Promise((resolve) => setTimeout(resolve, this.pollingInterval));
    }
  }

  private async processPendingJobs() {
    try {
      const snapshot = await this.db
        .collection('automationJobs')
        .where('status', '==', JobStatus.PENDING)
        .limit(5)
        .get();

      if (snapshot.empty) {
        return;
      }

      for (const doc of snapshot.docs) {
        const job = doc.data() as AutomationJob;
        await this.processJob(job);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to fetch pending jobs');
    }
  }

  private async processJob(job: AutomationJob) {
    try {
      logger.info({ jobId: job.id, jobType: job.jobType }, 'Processing automation job');

      // Update status to PROCESSING
      await this.db.collection('automationJobs').doc(job.id).update({
        status: JobStatus.PROCESSING,
        startedAt: new Date(),
      });

      let result: any;

      if (job.jobType === JobType.POST_GENERATION) {
        result = await this.generatePost(job);
      } else if (job.jobType === JobType.COMMENT_GENERATION) {
        result = await this.generateComment(job);
      } else {
        throw new Error(`Unknown job type: ${job.jobType}`);
      }

      // Mark as completed
      await this.db.collection('automationJobs').doc(job.id).update({
        status: JobStatus.COMPLETED,
        result,
        completedAt: new Date(),
        updatedAt: new Date(),
      });

      logger.info({ jobId: job.id }, 'Job completed successfully');
    } catch (error) {
      logger.error({ jobId: job.id, error }, 'Job processing failed');

      const attempts = (job.attempts || 0) + 1;
      const shouldRetry = attempts < (job.maxAttempts || 3);

      if (shouldRetry) {
        // Schedule retry
        const nextRetryAt = new Date(Date.now() + Math.pow(2, attempts) * 1000); // Exponential backoff

        await this.db.collection('automationJobs').doc(job.id).update({
          status: JobStatus.PENDING,
          attempts,
          nextRetryAt,
          updatedAt: new Date(),
        });

        logger.info({ jobId: job.id, attempts, nextRetryAt }, 'Job scheduled for retry');
      } else {
        // Mark as failed
        await this.db.collection('automationJobs').doc(job.id).update({
          status: JobStatus.FAILED,
          attempts,
          result: {
            error: error instanceof Error ? error.message : String(error),
          },
          completedAt: new Date(),
          updatedAt: new Date(),
        });

        logger.error({ jobId: job.id }, 'Job failed after max attempts');
      }
    }
  }

  private async generatePost(job: AutomationJob): Promise<any> {
    const { accountId, payload } = job;
    const keyword = payload.keyword || 'AI and technology';
    const contentGen = await this.getContentGenerator();

    // Fetch account details
    const accountDoc = await this.db.collection('automationAccounts').doc(accountId).get();
    const account = accountDoc.data() as any;

    // Fetch account keywords and tone settings
    const keywordsDoc = await this.db.collection('automationKeywords').doc(accountId).get();

    let keywords: AutomationKeywords | null = null;
    if (keywordsDoc.exists) {
      keywords = keywordsDoc.data() as AutomationKeywords;
    } else {
      // Use defaults if not configured
      keywords = {
        id: accountId,
        accountId,
        primaryKeywords: [keyword],
        secondaryKeywords: [],
        blockedKeywords: [],
        tonePreset: 'professional' as any,
        allowedIntents: ['knowledge_sharing' as any],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const content = await contentGen.generatePost({
      keyword,
      keywords,
    });

    // Extract hashtags from content
    const hashtagMatch = content.content.match(/#\w+/g) || [];

    // Create post in Firebase
    const postId = this.db.collection('posts').doc().id;
    const now = new Date();

    const post = {
      id: postId,
      text: content.content,
      authorUid: accountId,
      authorName: account?.name || 'AI Links',
      authorAvatarUrl: account?.avatarUrl,
      authorRole: account?.role || '',
      colorCode: '0xFF34D399', // Default emerald color
      postType: 'ai_generated',
      hashtags: hashtagMatch,
      media: [],
      likesCount: 0,
      commentsCount: 0,
      repostsCount: 0,
      savesCount: 0,
      deleted: false,
      createdAt: now,
      updatedAt: now,
    };

    await this.db.collection('posts').doc(postId).set(post);

    return {
      generatedContent: content.content,
      aiModel: 'gpt-3.5-turbo',
      tokensUsed: content.content.length / 4,
      postId,
      hashtagsExtracted: hashtagMatch,
    };
  }

  private async generateComment(job: AutomationJob): Promise<any> {
    const { accountId, payload } = job;
    const keyword = payload.keyword || 'engagement';
    const postContent = payload.contentId || 'a LinkedIn post';
    const contentGen = await this.getContentGenerator();

    // Fetch account keywords and tone settings
    const keywordsDoc = await this.db.collection('automationKeywords').doc(accountId).get();

    let keywords: AutomationKeywords | null = null;
    if (keywordsDoc.exists) {
      keywords = keywordsDoc.data() as AutomationKeywords;
    } else {
      keywords = {
        id: accountId,
        accountId,
        primaryKeywords: [keyword],
        secondaryKeywords: [],
        blockedKeywords: [],
        tonePreset: 'friendly' as any,
        allowedIntents: ['knowledge_sharing' as any],
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    }

    const content = await contentGen.generateComment(postContent, {
      keyword,
      keywords,
    });

    return {
      generatedContent: content.content,
      aiModel: 'gpt-3.5-turbo',
      tokensUsed: content.content.length / 4,
    };
  }
}

export const automationJobProcessor = new AutomationJobProcessor();
