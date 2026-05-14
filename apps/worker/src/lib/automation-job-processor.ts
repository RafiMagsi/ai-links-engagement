import { getFirestore } from '@ai-links/firebase-admin';
import { AutomationJob, JobType, JobStatus, AutomationKeywords } from '@ai-links/shared-types';
import { getLogger } from './logger.js';
import crypto from 'crypto';

const logger = getLogger();

export class AutomationJobProcessor {
  private db = getFirestore();
  private pollingInterval = 5000; // Poll every 5 seconds
  private isRunning = false;
  private contentGenerator: any = null;
  private openAiModel: string | null = null;

  private async getContentGenerator(): Promise<any> {
    if (!this.contentGenerator) {
      const { contentGenerator, OPENAI_MODEL } = await import('./content-generator.js');
      this.contentGenerator = contentGenerator;
      this.openAiModel = OPENAI_MODEL;
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
        await this.processJob(doc.id);
      }
    } catch (error) {
      logger.error({ error }, 'Failed to fetch pending jobs');
    }
  }

  private async claimJob(jobId: string): Promise<{ job: AutomationJob; lockId: string } | null> {
    const jobRef = this.db.collection('automationJobs').doc(jobId);
    const lockId = crypto.randomUUID();
    const now = new Date();

    try {
      const claimedJob = await this.db.runTransaction(async (tx) => {
        const snap = await tx.get(jobRef);
        if (!snap.exists) return null;

        const data = snap.data() as AutomationJob;
        const currentStatus = data.status as any;
        if (currentStatus !== JobStatus.PENDING) return null;

        const nextRetryAt: any = (data as any).nextRetryAt;
        const nextRetryDate =
          nextRetryAt && typeof nextRetryAt?.toDate === 'function'
            ? nextRetryAt.toDate()
            : nextRetryAt instanceof Date
              ? nextRetryAt
              : null;
        if (nextRetryDate && nextRetryDate.getTime() > now.getTime()) {
          return null;
        }

        tx.update(jobRef, {
          status: JobStatus.PROCESSING,
          startedAt: now,
          updatedAt: now,
          processingLockId: lockId,
        });

        return { ...data, id: jobId };
      });

      if (!claimedJob) return null;
      return { job: claimedJob, lockId };
    } catch (error) {
      logger.error({ jobId, error }, 'Failed to claim job');
      return null;
    }
  }

  private async processJob(jobId: string) {
    try {
      const claimed = await this.claimJob(jobId);
      if (!claimed) {
        return;
      }

      const { job, lockId } = claimed;
      logger.info({ jobId: job.id, jobType: job.jobType, lockId }, 'Processing automation job');

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
        processingLockId: lockId,
      });

      logger.info({ jobId: job.id }, 'Job completed successfully');
    } catch (error) {
      logger.error({ jobId: jobId, error }, 'Job processing failed');

      const jobDoc = await this.db.collection('automationJobs').doc(jobId).get();
      const current = jobDoc.exists ? (jobDoc.data() as AutomationJob) : null;
      const attempts = ((current?.attempts as any) || 0) + 1;
      const shouldRetry = attempts < ((current?.maxAttempts as any) || 3);

      if (shouldRetry) {
        // Schedule retry
        const nextRetryAt = new Date(Date.now() + Math.pow(2, attempts) * 1000); // Exponential backoff

        await this.db.collection('automationJobs').doc(jobId).update({
          status: JobStatus.PENDING,
          attempts,
          nextRetryAt,
          updatedAt: new Date(),
        });

        logger.info({ jobId: jobId, attempts, nextRetryAt }, 'Job scheduled for retry');
      } else {
        // Mark as failed
        await this.db.collection('automationJobs').doc(jobId).update({
          status: JobStatus.FAILED,
          attempts,
          result: {
            error: error instanceof Error ? error.message : String(error),
          },
          completedAt: new Date(),
          updatedAt: new Date(),
        });

        logger.error({ jobId: jobId }, 'Job failed after max attempts');
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

    // Idempotency guard: use job.id as the post document id.
    const postId = job.id;
    const postRef = this.db.collection('posts').doc(postId);
    const existingPost = await postRef.get();
    if (existingPost.exists) {
      const existingData: any = existingPost.data();
      return {
        generatedContent: existingData?.text || '',
        aiModel: this.openAiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini',
        tokensUsed: 0,
        postId,
        deduped: true,
      };
    }

    const content = await contentGen.generatePost({ keyword, keywords });

    // Extract hashtags from content
    const hashtagMatch = content.content.match(/#\w+/g) || [];

    const normalizedText = content.content.trim().replace(/\s+/g, ' ');
    const contentHash = crypto.createHash('sha256').update(normalizedText).digest('hex');
    const now = new Date();

    const post = {
      id: postId,
      text: normalizedText,
      contentHash,
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

    // Duplicate-content guard: if exact same contentHash already exists for this author, skip creating another.
    // (Query is best-effort; even without an index the jobId-based idempotency still prevents double writes.)
    try {
      const recentSnap = await this.db
        .collection('posts')
        .where('authorUid', '==', accountId)
        .orderBy('createdAt', 'desc')
        .limit(25)
        .get();

      const isDuplicate = recentSnap.docs.some((d) => (d.data() as any)?.contentHash === contentHash);
      if (isDuplicate) {
        return {
          generatedContent: normalizedText,
          aiModel: this.openAiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini',
          tokensUsed: normalizedText.length / 4,
          postId: null,
          skippedDuplicate: true,
          contentHash,
        };
      }
    } catch (error) {
      logger.warn({ jobId: job.id, error }, 'Duplicate-content check failed, proceeding');
    }

    await postRef.set(post, { merge: false });

    return {
      generatedContent: normalizedText,
      aiModel: this.openAiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      tokensUsed: normalizedText.length / 4,
      postId,
      hashtagsExtracted: hashtagMatch,
      contentHash,
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
      aiModel: this.openAiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      tokensUsed: content.content.length / 4,
    };
  }
}

export const automationJobProcessor = new AutomationJobProcessor();
