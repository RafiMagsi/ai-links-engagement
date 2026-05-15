import { getFirestore } from '@ai-links/firebase-admin';
import { getLogger } from './logger.js';
import { BullJobData, ActionType, AutomationPolicy, JobStatus, JobType, AutomationJob } from '@ai-links/shared-types';
import { FieldValue } from 'firebase-admin/firestore';

const logger = getLogger();

export async function handlePostAction(jobData: BullJobData): Promise<any> {
  const { accountId, actionType, targetId, content, metadata } = jobData;

  logger.info(
    { accountId, actionType, targetId },
    'Processing post action'
  );

  try {
    const firestore = getFirestore();
    // Check kill switch
    const policyDoc = await firestore.collection('automationPolicies').doc('global').get();
    if (policyDoc.exists) {
      const policy = policyDoc.data() as AutomationPolicy;
      if (!policy.automationEnabled || policy.globalKillSwitch) {
        logger.info({ accountId }, 'Automation disabled via kill switch');
        return { skipped: true, reason: 'Kill switch enabled' };
      }
    }

    // Check account exists and is active
    const accountDoc = await firestore.collection('automationAccounts').doc(accountId).get();
    if (!accountDoc.exists || !accountDoc.data()?.isActive) {
      logger.warn({ accountId }, 'Account not found or inactive');
      return { error: 'Account not found or inactive' };
    }

    // Log the action
    const logId = firestore.collection('automationActionLogs').doc().id;
    await firestore.collection('automationActionLogs').doc(logId).set({
      id: logId,
      accountId,
      actionType: ActionType.POST_CREATED,
      targetContentId: targetId,
      success: true,
      details: {
        generatedContent: content,
        ...metadata,
      },
      createdAt: new Date(),
    });

    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    const usageDoc = `${accountId}_${today}`;
    await firestore.collection('dailyUsage').doc(usageDoc).set(
      {
        accountId,
        date: today,
        postsCreated: FieldValue.increment(1),
        totalActions: FieldValue.increment(1),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    logger.info({ accountId, logId }, 'Post action completed successfully');
    return { success: true, logId };
  } catch (error) {
    logger.error({ error, accountId, actionType }, 'Error processing post action');
    throw error;
  }
}

export async function handleCommentAction(jobData: BullJobData): Promise<any> {
  const { accountId, actionType, targetId, content, metadata } = jobData;

  logger.info(
    { accountId, actionType, targetId },
    'Processing comment action'
  );

  try {
    const firestore = getFirestore();
    // Check kill switch
    const policyDoc = await firestore.collection('automationPolicies').doc('global').get();
    if (policyDoc.exists) {
      const policy = policyDoc.data() as AutomationPolicy;
      if (!policy.automationEnabled || policy.globalKillSwitch) {
        logger.info({ accountId }, 'Automation disabled via kill switch');
        return { skipped: true, reason: 'Kill switch enabled' };
      }
    }

    // Check account exists and is active
    const accountDoc = await firestore.collection('automationAccounts').doc(accountId).get();
    if (!accountDoc.exists || !accountDoc.data()?.isActive) {
      logger.warn({ accountId }, 'Account not found or inactive');
      return { error: 'Account not found or inactive' };
    }

    // Log the action
    const logId = firestore.collection('automationActionLogs').doc().id;
    await firestore.collection('automationActionLogs').doc(logId).set({
      id: logId,
      accountId,
      actionType: ActionType.COMMENT_CREATED,
      targetContentId: targetId,
      success: true,
      details: {
        generatedContent: content,
        ...metadata,
      },
      createdAt: new Date(),
    });

    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    const usageDoc = `${accountId}_${today}`;
    await firestore.collection('dailyUsage').doc(usageDoc).set(
      {
        accountId,
        date: today,
        commentsCreated: FieldValue.increment(1),
        totalActions: FieldValue.increment(1),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    logger.info({ accountId, logId }, 'Comment action completed successfully');
    return { success: true, logId };
  } catch (error) {
    logger.error({ error, accountId, actionType }, 'Error processing comment action');
    throw error;
  }
}

export async function handleReactionAction(jobData: BullJobData): Promise<any> {
  const { accountId, actionType, targetId, metadata } = jobData;

  logger.info(
    { accountId, actionType, targetId },
    'Processing reaction action'
  );

  try {
    const firestore = getFirestore();
    // Check kill switch
    const policyDoc = await firestore.collection('automationPolicies').doc('global').get();
    if (policyDoc.exists) {
      const policy = policyDoc.data() as AutomationPolicy;
      if (!policy.automationEnabled || policy.globalKillSwitch) {
        logger.info({ accountId }, 'Automation disabled via kill switch');
        return { skipped: true, reason: 'Kill switch enabled' };
      }
    }

    // Check account exists and is active
    const accountDoc = await firestore.collection('automationAccounts').doc(accountId).get();
    if (!accountDoc.exists || !accountDoc.data()?.isActive) {
      logger.warn({ accountId }, 'Account not found or inactive');
      return { error: 'Account not found or inactive' };
    }

    // Log the action
    const logId = firestore.collection('automationActionLogs').doc().id;
    await firestore.collection('automationActionLogs').doc(logId).set({
      id: logId,
      accountId,
      actionType: ActionType.REACTION_ADDED,
      targetContentId: targetId,
      success: true,
      details: metadata,
      createdAt: new Date(),
    });

    // Update daily usage
    const today = new Date().toISOString().split('T')[0];
    const usageDoc = `${accountId}_${today}`;
    await firestore.collection('dailyUsage').doc(usageDoc).set(
      {
        accountId,
        date: today,
        reactionsAdded: FieldValue.increment(1),
        totalActions: FieldValue.increment(1),
        updatedAt: new Date(),
      },
      { merge: true }
    );

    logger.info({ accountId, logId }, 'Reaction action completed successfully');
    return { success: true, logId };
  } catch (error) {
    logger.error({ error, accountId, actionType }, 'Error processing reaction action');
    throw error;
  }
}

export async function handleSchedulerJob(jobData: BullJobData): Promise<any> {
  const { accountId, metadata } = jobData;
  const schedulerType = metadata?.schedulerType as string;

  logger.info(
    { accountId, schedulerType },
    'Processing scheduler job'
  );

  try {
    const firestore = getFirestore();
    // Check kill switch
    const policyDoc = await firestore.collection('automationPolicies').doc('global').get();
    if (policyDoc.exists) {
      const policy = policyDoc.data() as AutomationPolicy;
      if (!policy.automationEnabled || policy.globalKillSwitch) {
        logger.info({ accountId }, 'Automation disabled via kill switch');
        return { skipped: true, reason: 'Kill switch enabled' };
      }
    }

    const accountsSnapshot = await firestore
      .collection('automationAccounts')
      .where('isActive', '==', true)
      .get();

    const today = new Date().toISOString().split('T')[0];

    const jobTypeMap: Record<string, JobType | null> = {
      post: JobType.POST_GENERATION,
      comment: JobType.COMMENT_GENERATION,
      reaction: JobType.REACTION_ACTION,
      quota_reset: null,
    };

    const jobType = jobTypeMap[schedulerType];
    if (!jobType) {
      logger.info({ schedulerType }, 'No automation job type mapped; scheduler finished');
      return { success: true, jobsQueued: 0 };
    }

    let queuedCount = 0;
    const queuedForAccounts: string[] = [];

    for (const doc of accountsSnapshot.docs) {
      const account: any = doc.data();
      const accId = doc.id;

      const settings = account.settings || {};
      const enabled =
        (schedulerType === 'post' && settings.enableAutoPosting !== false) ||
        (schedulerType === 'comment' && settings.enableAutoComments !== false) ||
        (schedulerType === 'reaction' && settings.enableAutoReactions === true);

      if (!enabled) continue;

      // Enforce per-account daily limits before queuing
      const usageDocId = `${accId}_${today}`;
      const usageSnap = await firestore.collection('dailyUsage').doc(usageDocId).get();
      const usage: any = usageSnap.exists ? usageSnap.data() : {};

      const postsCreated = Number(usage.postsCreated || 0);
      const commentsCreated = Number(usage.commentsCreated || 0);
      const reactionsAdded = Number(usage.reactionsAdded || 0);

      const postLimit = Number(account.dailyPostLimit || 0);
      const commentLimit = Number(account.dailyCommentLimit || 0);
      const reactionLimit = Number(account.dailyReactionLimit || 0);

      if (jobType === JobType.POST_GENERATION && postLimit > 0 && postsCreated >= postLimit) continue;
      if (jobType === JobType.COMMENT_GENERATION && commentLimit > 0 && commentsCreated >= commentLimit) continue;
      if (jobType === JobType.REACTION_ACTION && reactionLimit > 0 && reactionsAdded >= reactionLimit) continue;

      // Use a stable recurring job per account+type so we get a single job with many executions.
      const stableJobId = `recurring_${accId}_${jobType}`;
      const jobRef = firestore.collection('automationJobs').doc(stableJobId);
      const existingJob = await jobRef.get();

      // If job exists and is processing, don't touch it.
      if (existingJob.exists) {
        const existingData: any = existingJob.data();
        if (existingData?.status === JobStatus.PROCESSING) continue;
        const nextRunAt: any = existingData?.nextRunAt;
        const nextRunDate =
          nextRunAt && typeof nextRunAt?.toDate === 'function'
            ? nextRunAt.toDate()
            : nextRunAt instanceof Date
              ? nextRunAt
              : null;
        if (nextRunDate && nextRunDate.getTime() > Date.now()) continue;
      }

      // Pick a keyword that keeps content "AI related" without external news ingestion.
      // For truly "recent" topics, we'd need a feed/news source; here we stick to account keywords.
      let keyword: string | undefined;
      try {
        const keywordsSnap = await firestore.collection('automationKeywords').doc(accId).get();
        const keywords: any = keywordsSnap.exists ? keywordsSnap.data() : null;
        const primary: string[] = Array.isArray(keywords?.primaryKeywords) ? keywords.primaryKeywords : [];
        if (primary.length > 0) {
          keyword = primary[Math.floor(Math.random() * primary.length)];
        }
      } catch (error) {
        logger.warn({ accId, error }, 'Failed to load automationKeywords for scheduler job');
      }

      if (!keyword) keyword = 'AI';
      if (!/ai|artificial intelligence|machine learning|llm|genai/i.test(keyword)) {
        keyword = `AI ${keyword}`;
      }

      const newJob: AutomationJob = {
        id: stableJobId,
        accountId: accId,
        jobType,
        status: JobStatus.PENDING,
        priority: 5,
        recurring: true,
        intervalMinutes: schedulerType === 'comment' ? 20 : 30,
        payload: {
          keyword,
          manualTrigger: false,
        },
        attempts: 0,
        maxAttempts: 3,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      await jobRef.set(existingJob.exists ? { ...newJob, createdAt: (existingJob.data() as any)?.createdAt || new Date() } : newJob, { merge: true });
      queuedCount += 1;
      queuedForAccounts.push(accId);
    }

    logger.info({ schedulerType, queuedCount }, 'Scheduler job completed');
    return { success: true, jobsQueued: queuedCount, accounts: queuedForAccounts };
  } catch (error) {
    logger.error({ error, accountId, schedulerType }, 'Error processing scheduler job');
    throw error;
  }
}

export async function handleQuotaReset(jobData: BullJobData): Promise<any> {
  logger.info('Processing daily quota reset');

  try {
    const firestore = getFirestore();
    const today = new Date().toISOString().split('T')[0];
    const allUsageSnapshot = await firestore
      .collection('dailyUsage')
      .where('date', '<', today)
      .get();

    let count = 0;
    allUsageSnapshot.forEach((doc) => {
      doc.ref.delete();
      count++;
    });

    logger.info({ count }, 'Quota reset completed');
    return { success: true, deletedDocs: count };
  } catch (error) {
    logger.error({ error }, 'Error processing quota reset');
    throw error;
  }
}
