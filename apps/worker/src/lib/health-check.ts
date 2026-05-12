/**
 * Health Check Utilities
 * Monitor worker health and dependencies
 */

import { getLogger } from './logger';
import type { Queue } from 'bullmq';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    redis: { status: 'ok' | 'error'; message: string };
    firebase: { status: 'ok' | 'error'; message: string };
    queues: { status: 'ok' | 'error'; message: string; details?: Record<string, any> };
    memory: { status: 'ok' | 'warning' | 'error'; message: string; usage: string };
    uptime: { status: 'ok'; message: string; seconds: number };
  };
}

export class WorkerHealthCheck {
  private logger = getLogger();
  private startTime = Date.now();
  private redisClient: any;
  private queues: Map<string, Queue> = new Map();
  private firebaseInitialized = false;

  constructor() {
    this.logger.info('Health check system initialized');
  }

  setRedisClient(client: any): void {
    this.redisClient = client;
  }

  setQueue(name: string, queue: Queue): void {
    this.queues.set(name, queue);
  }

  setFirebaseInitialized(initialized: boolean): void {
    this.firebaseInitialized = initialized;
  }

  async checkRedis(): Promise<{ status: 'ok' | 'error'; message: string }> {
    try {
      if (!this.redisClient) {
        return { status: 'error', message: 'Redis client not initialized' };
      }

      await this.redisClient.ping();
      return { status: 'ok', message: 'Redis connected' };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Health check: Redis ping failed', { error: message });
      return { status: 'error', message: `Redis connection failed: ${message}` };
    }
  }

  checkFirebase(): { status: 'ok' | 'error'; message: string } {
    if (this.firebaseInitialized) {
      return { status: 'ok', message: 'Firebase initialized' };
    }
    return { status: 'error', message: 'Firebase not initialized' };
  }

  async checkQueues(): Promise<{
    status: 'ok' | 'error';
    message: string;
    details?: Record<string, any>;
  }> {
    try {
      const queueStats: Record<string, any> = {};

      for (const [name, queue] of this.queues.entries()) {
        const counts = await queue.getJobCounts();
        queueStats[name] = {
          active: counts.active || 0,
          waiting: counts.waiting || 0,
          completed: counts.completed || 0,
          failed: counts.failed || 0,
        };
      }

      return {
        status: 'ok',
        message: `${this.queues.size} queues monitored`,
        details: queueStats,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error('Health check: Queue check failed', { error: message });
      return {
        status: 'error',
        message: `Queue check failed: ${message}`,
      };
    }
  }

  checkMemory(): { status: 'ok' | 'warning' | 'error'; message: string; usage: string } {
    try {
      const memUsage = process.memoryUsage();
      const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      if (heapUsedPercent > 90) {
        this.logger.warn('Health check: Memory usage critical', {
          usage: heapUsedPercent.toFixed(2) + '%',
        });
        return {
          status: 'error',
          message: 'Memory usage critically high',
          usage: heapUsedPercent.toFixed(2) + '%',
        };
      } else if (heapUsedPercent > 75) {
        this.logger.warn('Health check: Memory usage high', {
          usage: heapUsedPercent.toFixed(2) + '%',
        });
        return {
          status: 'warning',
          message: 'Memory usage high',
          usage: heapUsedPercent.toFixed(2) + '%',
        };
      }

      return {
        status: 'ok',
        message: 'Memory usage normal',
        usage: heapUsedPercent.toFixed(2) + '%',
      };
    } catch (error) {
      return {
        status: 'ok',
        message: 'Memory check skipped',
        usage: 'N/A',
      };
    }
  }

  getUptime(): { status: 'ok'; message: string; seconds: number } {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    return {
      status: 'ok',
      message: `Worker running for ${uptimeSeconds} seconds`,
      seconds: uptimeSeconds,
    };
  }

  async performHealthCheck(): Promise<HealthStatus> {
    this.logger.debug('Performing health check');

    const [redis, queues, memory, uptime] = await Promise.all([
      this.checkRedis(),
      this.checkQueues(),
      Promise.resolve(this.checkMemory()),
      Promise.resolve(this.getUptime()),
    ]);

    const firebase = this.checkFirebase();

    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';

    if (redis.status === 'error' || firebase.status === 'error' || queues.status === 'error') {
      status = 'unhealthy';
    } else if (
      memory.status === 'warning' ||
      memory.status === 'error'
    ) {
      status = 'degraded';
    }

    const healthStatus: HealthStatus = {
      status,
      timestamp: new Date().toISOString(),
      checks: {
        redis,
        firebase,
        queues,
        memory,
        uptime,
      },
    };

    this.logger.info(`Health check completed: ${status}`, {
      redis: redis.status,
      firebase: firebase.status,
      queues: queues.status,
      memory: memory.status,
    });

    return healthStatus;
  }
}

// Export singleton health check instance
let healthCheck: WorkerHealthCheck | null = null;

export function initHealthCheck(): WorkerHealthCheck {
  healthCheck = new WorkerHealthCheck();
  return healthCheck;
}

export function getHealthCheck(): WorkerHealthCheck {
  if (!healthCheck) {
    healthCheck = new WorkerHealthCheck();
  }
  return healthCheck;
}
