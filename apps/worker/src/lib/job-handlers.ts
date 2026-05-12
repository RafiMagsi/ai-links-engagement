import { getFirestore } from '@ai-links/firebase-admin';
import { getLogger } from './logger.js';
import { BullJobData, ActionType, AutomationPolicy } from '@ai-links/shared-types';
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

    // Get all eligible accounts and queue their jobs based on scheduler type
    const accountsSnapshot = await firestore
      .collection('automationAccounts')
      .where('isActive', '==', true)
      .get();

    const jobsQueued: string[] = [];

    accountsSnapshot.forEach((doc) => {
      const account = doc.data();
      // Queue job based on scheduler type
      // This would be implemented with the queue manager
      jobsQueued.push(doc.id);
    });

    logger.info({ schedulerType, jobsQueued: jobsQueued.length }, 'Scheduler job completed');
    return { success: true, jobsQueued };
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
