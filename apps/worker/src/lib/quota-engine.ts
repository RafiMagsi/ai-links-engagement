import { getFirestore } from '@ai-links/firebase-admin';
import { DailyUsage } from '@ai-links/shared-types';
import { getLogger } from './logger';

interface QuotaLimits {
  dailyPostLimit: number;
  dailyCommentLimit: number;
  dailyReactionLimit: number;
  dailyTotalLimit: number;
}

interface QuotaStatus {
  date: string;
  postsRemaining: number;
  commentsRemaining: number;
  reactionsRemaining: number;
  totalRemaining: number;
  isExceeded: boolean;
}

class QuotaEngine {
  private quotaLimits: QuotaLimits = {
    dailyPostLimit: 30,
    dailyCommentLimit: 50,
    dailyReactionLimit: 20,
    dailyTotalLimit: 100,
  };

  private logger = getLogger();

  initializeQuotaLimits(limits: QuotaLimits): void {
    this.quotaLimits = limits;
    this.logger.info({ limits }, 'Quota limits initialized');
  }

  private getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  async getOrCreateDailyUsage(): Promise<DailyUsage> {
    const db = getFirestore();
    const today = this.getTodayDate();
    const docRef = db.collection('automationDailyUsage').doc(today);

    const docSnap = await docRef.get();
    if (docSnap.exists) {
      return docSnap.data() as DailyUsage;
    }

    // Create new daily usage record
    const newUsage: DailyUsage = {
      id: today,
      date: today,
      postsCreated: 0,
      commentsCreated: 0,
      reactionsAdded: 0,
      totalActions: 0,
      quotaPostsRemaining: this.quotaLimits.dailyPostLimit,
      quotaCommentsRemaining: this.quotaLimits.dailyCommentLimit,
      quotaReactionsRemaining: this.quotaLimits.dailyReactionLimit,
      quotaTotalRemaining: this.quotaLimits.dailyTotalLimit,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    await docRef.set(newUsage);
    return newUsage;
  }

  async checkQuota(actionType: 'post' | 'comment' | 'reaction'): Promise<QuotaStatus> {
    const usage = await this.getOrCreateDailyUsage();
    const today = this.getTodayDate();

    let postsRemaining = this.quotaLimits.dailyPostLimit - usage.postsCreated;
    let commentsRemaining = this.quotaLimits.dailyCommentLimit - usage.commentsCreated;
    let reactionsRemaining = this.quotaLimits.dailyReactionLimit - usage.reactionsAdded;
    let totalRemaining = this.quotaLimits.dailyTotalLimit - usage.totalActions;

    const isExceeded =
      (actionType === 'post' && postsRemaining <= 0) ||
      (actionType === 'comment' && commentsRemaining <= 0) ||
      (actionType === 'reaction' && reactionsRemaining <= 0) ||
      totalRemaining <= 0;

    return {
      date: today,
      postsRemaining: Math.max(0, postsRemaining),
      commentsRemaining: Math.max(0, commentsRemaining),
      reactionsRemaining: Math.max(0, reactionsRemaining),
      totalRemaining: Math.max(0, totalRemaining),
      isExceeded,
    };
  }

  async recordAction(
    actionType: 'post' | 'comment' | 'reaction'
  ): Promise<void> {
    const db = getFirestore();
    const today = this.getTodayDate();
    const docRef = db.collection('automationDailyUsage').doc(today);

    const fieldMap = {
      post: 'postsCreated',
      comment: 'commentsCreated',
      reaction: 'reactionsAdded',
    };

    const field = fieldMap[actionType];

    await docRef.update({
      [field]: (await docRef.get()).data()?.[field] + 1 || 1,
      totalActions: (await docRef.get()).data()?.totalActions + 1 || 1,
      updatedAt: new Date(),
    });

    this.logger.debug({ actionType, date: today }, 'Action recorded');
  }

  async getDailyStatus(): Promise<QuotaStatus> {
    const usage = await this.getOrCreateDailyUsage();
    const today = this.getTodayDate();

    return {
      date: today,
      postsRemaining: Math.max(0, this.quotaLimits.dailyPostLimit - usage.postsCreated),
      commentsRemaining: Math.max(0, this.quotaLimits.dailyCommentLimit - usage.commentsCreated),
      reactionsRemaining: Math.max(0, this.quotaLimits.dailyReactionLimit - usage.reactionsAdded),
      totalRemaining: Math.max(0, this.quotaLimits.dailyTotalLimit - usage.totalActions),
      isExceeded: usage.totalActions >= this.quotaLimits.dailyTotalLimit,
    };
  }
}

export const quotaEngine = new QuotaEngine();
