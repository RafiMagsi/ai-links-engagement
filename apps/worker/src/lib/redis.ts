import { createClient } from 'redis';
import { getLogger } from './logger';

const logger = getLogger();
let client: ReturnType<typeof createClient> | null = null;

export async function initializeRedis(): Promise<ReturnType<typeof createClient>> {
  if (client) {
    return client;
  }

  const redisHost = process.env.REDIS_HOST || '127.0.0.1';
  const redisPort = parseInt(process.env.REDIS_PORT || '6379', 10);
  const redisPassword = process.env.REDIS_PASSWORD;

  client = createClient({
    host: redisHost,
    port: redisPort,
    password: redisPassword || undefined,
    socket: {
      reconnectStrategy: (retries) => {
        if (retries > 10) {
          logger.error('Redis reconnection failed after 10 attempts');
          return new Error('Redis max reconnection attempts reached');
        }
        return Math.min(retries * 50, 500);
      },
    },
  });

  client.on('error', (err) => {
    logger.error({ error: err }, 'Redis client error');
  });

  client.on('connect', () => {
    logger.info('Redis client connected');
  });

  client.on('ready', () => {
    logger.info('Redis client ready');
  });

  await client.connect();

  return client;
}

export function getRedisClient(): ReturnType<typeof createClient> {
  if (!client) {
    throw new Error('Redis client not initialized. Call initializeRedis first.');
  }
  return client;
}

export async function closeRedis(): Promise<void> {
  if (client) {
    await client.quit();
    client = null;
  }
}

export function getRedisConnection() {
  return {
    host: process.env.REDIS_HOST || '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  };
}
