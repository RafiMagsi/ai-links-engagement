// Automation Account Types
export interface AutomationAccount {
  id: string;
  userId: string;
  linkedinUrl: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}

// Automation Keywords Type
export interface AutomationKeywords {
  id: string;
  accountId: string;
  keywords: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Automation Schedule Type
export interface AutomationSchedule {
  id: string;
  accountId: string;
  dayOfWeek: number[]; // 0-6, Sunday-Saturday
  timeOfDay: string; // HH:mm format
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Automation Job Type
export enum JobStatus {
  PENDING = 'pending',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  PAUSED = 'paused'
}

export interface AutomationJob {
  id: string;
  accountId: string;
  status: JobStatus;
  startedAt: Date;
  completedAt?: Date;
  metadata?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Automation Action Log Type
export enum ActionType {
  PROFILE_VIEW = 'profile_view',
  CONNECTION_REQUEST = 'connection_request',
  MESSAGE_SENT = 'message_sent',
  CONTENT_ENGAGEMENT = 'content_engagement'
}

export interface AutomationActionLog {
  id: string;
  jobId: string;
  accountId: string;
  actionType: ActionType;
  targetProfile?: string;
  success: boolean;
  error?: string;
  createdAt: Date;
}

// Daily Usage Type
export interface DailyUsage {
  id: string;
  accountId: string;
  date: Date;
  profileViewsCount: number;
  connectionRequestsCount: number;
  messagesSentCount: number;
  contentEngagementCount: number;
  totalActions: number;
  createdAt: Date;
  updatedAt: Date;
}

// Admin User Type
export interface AdminUser {
  uid: string;
  email: string;
  displayName?: string;
  customClaims?: AdminCustomClaims;
  createdAt: Date;
  updatedAt: Date;
}

export interface AdminCustomClaims {
  admin: boolean;
  superAdmin?: boolean;
  permissions?: string[];
}
