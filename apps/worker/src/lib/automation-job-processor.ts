import { getFirestore } from '@ai-links/firebase-admin';
import {
  AutomationJob,
  JobType,
  JobStatus,
  AutomationKeywords,
  CommentStatus,
  type CommentSettings,
  type AutomationComment,
} from '@ai-links/shared-types';
import { getLogger } from './logger.js';
import crypto from 'crypto';
import { FieldValue } from 'firebase-admin/firestore';
import { getRecentItemsForAccount } from './recent-content-sources.js';
import type { RecentItem } from './recent-content-sources.js';
import { loadContentMemory, appendContentMemory } from './content-memory.js';

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

        const executionRef = this.db
          .collection('automationJobExecutions')
          .doc(jobId)
          .collection('executions')
          .doc();

        tx.update(jobRef, {
          status: JobStatus.PROCESSING,
          startedAt: now,
          updatedAt: now,
          processingLockId: lockId,
          executionCount: FieldValue.increment(1),
          lastExecutionId: executionRef.id,
        });

        tx.set(executionRef, {
          id: executionRef.id,
          jobId,
          accountId: data.accountId,
          jobType: data.jobType,
          status: JobStatus.PROCESSING,
          lockId,
          startedAt: now,
          createdAt: now,
          updatedAt: now,
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

  private async isDailyLimitExceeded(
    job: AutomationJob
  ): Promise<{ exceeded: boolean; reason?: string }> {
    if (job.payload?.manualTrigger && process.env.ALLOW_MANUAL_LIMIT_BYPASS === 'true') {
      return { exceeded: false };
    }

    const today = new Date().toISOString().split('T')[0];
    const usageDocId = `${job.accountId}_${today}`;

    const accountSnap = await this.db.collection('automationAccounts').doc(job.accountId).get();
    const account: any = accountSnap.exists ? accountSnap.data() : null;
    if (!account) return { exceeded: false };

    const usageSnap = await this.db.collection('dailyUsage').doc(usageDocId).get();
    const usage: any = usageSnap.exists ? usageSnap.data() : {};

    const postsCreated = Number(usage.postsCreated || 0);
    const commentsCreated = Number(usage.commentsCreated || 0);
    const reactionsAdded = Number(usage.reactionsAdded || 0);

    if (job.jobType === JobType.POST_GENERATION) {
      const limit = Number(account.dailyPostLimit || 0);
      if (limit > 0 && postsCreated >= limit) return { exceeded: true, reason: 'Daily post limit reached' };
    }

    if (job.jobType === JobType.COMMENT_GENERATION) {
      const limit = Number(account.dailyCommentLimit || 0);
      if (limit > 0 && commentsCreated >= limit) return { exceeded: true, reason: 'Daily comment limit reached' };
    }

    if (job.jobType === JobType.REACTION_ACTION) {
      const limit = Number(account.dailyReactionLimit || 0);
      if (limit > 0 && reactionsAdded >= limit) return { exceeded: true, reason: 'Daily reaction limit reached' };
    }

    return { exceeded: false };
  }

  private async processJob(jobId: string) {
    try {
      const claimed = await this.claimJob(jobId);
      if (!claimed) {
        return;
      }

      const { job, lockId } = claimed;
      logger.info({ jobId: job.id, jobType: job.jobType, lockId }, 'Processing automation job');

      const limitStatus = await this.isDailyLimitExceeded(job);
      if (limitStatus.exceeded) {
        const execIdSnap = await this.db.collection('automationJobs').doc(job.id).get();
        const execId = (execIdSnap.data() as any)?.lastExecutionId as string | undefined;
        if (execId) {
          await this.db
            .collection('automationJobExecutions')
            .doc(job.id)
            .collection('executions')
            .doc(execId)
            .set(
              {
                status: JobStatus.SKIPPED_RATE_LIMITED,
                completedAt: new Date(),
                updatedAt: new Date(),
                error: limitStatus.reason || 'Daily limit exceeded',
              },
              { merge: true }
            );
        }

        await this.db.collection('automationJobs').doc(job.id).update({
          status: JobStatus.SKIPPED_RATE_LIMITED,
          result: {
            error: limitStatus.reason || 'Daily limit exceeded',
          },
          completedAt: new Date(),
          updatedAt: new Date(),
          processingLockId: lockId,
        });
        logger.info({ jobId: job.id, reason: limitStatus.reason }, 'Job skipped due to daily limits');
        return;
      }

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

      // Update execution record
      try {
        const execIdSnap = await this.db.collection('automationJobs').doc(job.id).get();
        const execId = (execIdSnap.data() as any)?.lastExecutionId as string | undefined;
        if (execId) {
          await this.db
            .collection('automationJobExecutions')
            .doc(job.id)
            .collection('executions')
            .doc(execId)
            .set(
              {
                status: JobStatus.COMPLETED,
                completedAt: new Date(),
                updatedAt: new Date(),
                resultSummary: {
                  aiModel: result?.aiModel,
                  tokensUsed: result?.tokensUsed,
                  postId: result?.postId,
                  commentId: result?.commentId,
                  contentHash: result?.contentHash,
                  skippedDuplicate: result?.skippedDuplicate,
                },
                generatedContent: result?.generatedContent,
              },
              { merge: true }
            );
        }
      } catch (error) {
        logger.warn({ jobId: job.id, error }, 'Failed to update job execution record');
      }

      logger.info({ jobId: job.id }, 'Job completed successfully');
    } catch (error) {
      logger.error({ jobId: jobId, error }, 'Job processing failed');

      const jobDoc = await this.db.collection('automationJobs').doc(jobId).get();
      const current = jobDoc.exists ? (jobDoc.data() as AutomationJob) : null;
      const attempts = ((current?.attempts as any) || 0) + 1;
      const shouldRetry = attempts < ((current?.maxAttempts as any) || 3);
      const lastExecutionId = (current as any)?.lastExecutionId as string | undefined;

      if (shouldRetry) {
        // Schedule retry
        const nextRetryAt = new Date(Date.now() + Math.pow(2, attempts) * 1000); // Exponential backoff

        await this.db.collection('automationJobs').doc(jobId).update({
          status: JobStatus.PENDING,
          attempts,
          nextRetryAt,
          updatedAt: new Date(),
        });

        if (lastExecutionId) {
          await this.db
            .collection('automationJobExecutions')
            .doc(jobId)
            .collection('executions')
            .doc(lastExecutionId)
            .set(
              {
                status: JobStatus.FAILED,
                completedAt: new Date(),
                updatedAt: new Date(),
                error: error instanceof Error ? error.message : String(error),
                retryScheduledAt: nextRetryAt,
              },
              { merge: true }
            );
        }

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

        if (lastExecutionId) {
          await this.db
            .collection('automationJobExecutions')
            .doc(jobId)
            .collection('executions')
            .doc(lastExecutionId)
            .set(
              {
                status: JobStatus.FAILED,
                completedAt: new Date(),
                updatedAt: new Date(),
                error: error instanceof Error ? error.message : String(error),
              },
              { merge: true }
            );
        }

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

    const memoryDays = parseInt(process.env.CONTENT_MEMORY_DAYS || '7', 10);
    const memory = await loadContentMemory({ accountId, days: memoryDays });
    const usedHeadlineUrls = new Set(memory.recentHeadlineUrls.map((x) => x.url));

    // Fetch a few recent posts to avoid repeating the same hook/structure.
    let previousContent: string[] = [];
    try {
      const prevSnap = await this.db
        .collection('posts')
        .where('authorUid', '==', accountId)
        .orderBy('createdAt', 'desc')
        .limit(parseInt(process.env.PREVIOUS_POSTS_MAX || '5', 10))
        .get();
      previousContent = prevSnap.docs
        .map((d) => (d.data() as any)?.text)
        .filter(Boolean);
    } catch (error) {
      logger.warn({ jobId: job.id, error }, 'Failed to load previous posts; continuing');
    }

    let recentItems: RecentItem[] = [];
    try {
      recentItems = await getRecentItemsForAccount({
        category: account?.category,
        keyword,
        maxItems: parseInt(process.env.RECENT_ITEMS_MAX || '5', 10),
      });
      recentItems = recentItems.filter((i) => !usedHeadlineUrls.has(i.url));
    } catch (error) {
      logger.warn({ jobId: job.id, error }, 'Failed to load recent items; generating without news context');
    }

    const content = await contentGen.generatePost({ keyword, keywords, recentItems, previousContent });

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

    // Update per-account daily usage counters
    const today = new Date().toISOString().split('T')[0];
    const usageDocId = `${accountId}_${today}`;
    await this.db
      .collection('dailyUsage')
      .doc(usageDocId)
      .set(
        {
          accountId,
          date: today,
          postsCreated: FieldValue.increment(1),
          totalActions: FieldValue.increment(1),
          updatedAt: now,
        },
        { merge: true }
      );

    // Update per-account "recent content" memory for de-duplication
    await appendContentMemory({
      accountId,
      contentHash,
      headlineUrls: recentItems.map((i) => i.url),
    });

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

    // Pick a random recent post as the target if none specified
    let targetPostId: string | undefined = payload.contentId;
    let targetPostText: string | undefined;
    try {
      if (targetPostId) {
        const postSnap = await this.db.collection('posts').doc(targetPostId).get();
        if (postSnap.exists) {
          const postData: any = postSnap.data();
          targetPostText = postData?.text || postData?.content || '';
        } else {
          targetPostId = undefined;
        }
      }

      if (!targetPostId) {
        const postsSnap = await this.db.collection('posts').orderBy('createdAt', 'desc').limit(50).get();
        const candidates = postsSnap.docs
          .map((d) => ({ id: d.id, ...(d.data() as any) }))
          .filter((p: any) => !p.deleted && (p.text || p.content))
          .slice(0, 30);
        if (candidates.length > 0) {
          const pick = candidates[Math.floor(Math.random() * candidates.length)];
          targetPostId = pick.id;
          targetPostText = pick.text || pick.content || '';
        }
      }
    } catch (error) {
      logger.warn({ jobId: job.id, error }, 'Failed to select target post for comment');
    }

    if (!targetPostId || !targetPostText) {
      throw new Error('No eligible post found to comment on');
    }

    // Prevent duplicate comments from same account on same post
    const existing = await this.db
      .collection('automationComments')
      .where('accountId', '==', accountId)
      .where('postId', '==', targetPostId)
      .limit(1)
      .get();
    if (!existing.empty) {
      return {
        generatedContent: '',
        aiModel: this.openAiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini',
        tokensUsed: 0,
        postId: targetPostId,
        skippedDuplicate: true,
        commentId: existing.docs[0].id,
      };
    }

    // Load comment settings if available
    let settings: CommentSettings | null = null;
    try {
      const settingsSnap = await this.db
        .collection('automationCommentSettings')
        .doc(accountId)
        .get();
      if (settingsSnap.exists) {
        settings = settingsSnap.data() as CommentSettings;
      }
    } catch (error) {
      logger.warn({ jobId: job.id, error }, 'Failed to load comment settings; using defaults');
    }

    const content = await contentGen.generateComment(targetPostText, {
      keyword,
      keywords,
    });

    const text = (content.content || '').trim().replace(/\s+/g, ' ');
    const minLen = settings?.minCommentLength ?? 50;
    const maxLen = settings?.maxCommentLength ?? 280;
    if (text.length < minLen) {
      throw new Error(`Generated comment too short (${text.length}, min ${minLen})`);
    }
    if (text.length > maxLen) {
      // Should be clamped already, but keep it safe
      throw new Error(`Generated comment too long (${text.length}, max ${maxLen})`);
    }

    // Create automation comment record
    const commentRef = this.db.collection('automationComments').doc();
    const status =
      settings?.requireApproval === true ? CommentStatus.PENDING : CommentStatus.APPROVED;

    const commentData: AutomationComment = {
      id: commentRef.id,
      accountId,
      postId: targetPostId,
      content: text,
      status,
      generatedBy: 'ai',
      generatedAt: new Date(),
      actorType: 'auto_generated',
      isOfficialAction: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await commentRef.set(commentData);

    // Update post comment count
    await this.db
      .collection('posts')
      .doc(targetPostId)
      .set({ commentsCount: FieldValue.increment(1), updatedAt: new Date() }, { merge: true });

    // Update per-account daily usage counters
    const today = new Date().toISOString().split('T')[0];
    const usageDocId = `${accountId}_${today}`;
    await this.db
      .collection('dailyUsage')
      .doc(usageDocId)
      .set(
        {
          accountId,
          date: today,
          commentsCreated: FieldValue.increment(1),
          totalActions: FieldValue.increment(1),
          updatedAt: new Date(),
        },
        { merge: true }
      );

    return {
      generatedContent: text,
      aiModel: this.openAiModel || process.env.OPENAI_MODEL || 'gpt-4o-mini',
      tokensUsed: text.length / 4,
      postId: targetPostId,
      commentId: commentRef.id,
    };
  }
}

export const automationJobProcessor = new AutomationJobProcessor();
