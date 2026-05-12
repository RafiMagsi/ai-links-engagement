import { NextResponse } from 'next/server';
import { ErrorCode } from '@ai-links/shared-types';

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  checks: {
    app: { status: 'ok' | 'error'; message: string };
    firebase: { status: 'ok' | 'error'; message: string };
    redis?: { status: 'ok' | 'error'; message: string };
    memory: { status: 'ok' | 'warning' | 'error'; message: string; usage: string };
    uptime: { status: 'ok'; message: string; seconds: number };
  };
  version: string;
}

export async function GET() {
  const startTime = Date.now();
  const health: HealthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    checks: {
      app: { status: 'ok', message: 'Application running' },
      firebase: { status: 'error', message: 'Not checked' },
      memory: { status: 'ok', message: 'Memory usage normal', usage: '0%' },
      uptime: { status: 'ok', message: 'Application is running', seconds: 0 },
    },
    version: process.env.npm_package_version || '1.0.0',
  };

  try {
    // Check Firebase (if env vars exist)
    if (process.env.FIREBASE_PROJECT_ID) {
      health.checks.firebase = {
        status: 'ok',
        message: `Firebase project: ${process.env.FIREBASE_PROJECT_ID}`,
      };
    } else {
      health.checks.firebase = {
        status: 'error',
        message: 'Firebase not configured',
      };
      health.status = 'degraded';
    }

    // Check memory usage
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const memUsage = process.memoryUsage();
      const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

      if (heapUsedPercent > 90) {
        health.checks.memory = {
          status: 'error',
          message: 'Heap memory critically high',
          usage: `${heapUsedPercent.toFixed(2)}%`,
        };
        health.status = 'unhealthy';
      } else if (heapUsedPercent > 75) {
        health.checks.memory = {
          status: 'warning',
          message: 'Heap memory usage high',
          usage: `${heapUsedPercent.toFixed(2)}%`,
        };
        health.status = 'degraded';
      } else {
        health.checks.memory = {
          status: 'ok',
          message: 'Heap memory usage normal',
          usage: `${heapUsedPercent.toFixed(2)}%`,
        };
      }
    }

    // Calculate uptime (from server start)
    const uptime = process.uptime ? process.uptime() : 0;
    health.checks.uptime = {
      status: 'ok',
      message: `Application running for ${Math.floor(uptime)} seconds`,
      seconds: Math.floor(uptime),
    };

    const responseTime = Date.now() - startTime;

    return NextResponse.json(
      {
        success: true,
        data: health,
        responseTime: `${responseTime}ms`,
        timestamp: new Date().toISOString(),
      },
      {
        status: health.status === 'unhealthy' ? 503 : 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'X-Health-Status': health.status,
        },
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Health check failed',
          details: { error: errorMessage },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

/**
 * Detailed health endpoint with more information
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { deep = false } = body;

    if (!deep) {
      return GET();
    }

    // Deep health check - more thorough
    const health: any = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      checks: {
        nodeVersion: process.version,
        environment: process.env.NODE_ENV || 'development',
        platform: process.platform,
        arch: process.arch,
        cpus: require('os').cpus().length,
      },
    };

    return NextResponse.json({
      success: true,
      data: health,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return NextResponse.json(
      {
        success: false,
        error: {
          code: ErrorCode.INTERNAL_ERROR,
          message: 'Deep health check failed',
          details: { error: errorMessage },
        },
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
