import { Redis } from 'ioredis';
import { env } from './env.js';

export const redisConnectionOptions = env.REDIS_URL
  ? {
      url: env.REDIS_URL,
      maxRetriesPerRequest: null,
    }
  : {
      host: env.REDIS_HOST,
      port: env.REDIS_PORT,
      password: env.REDIS_PASSWORD || undefined,
      maxRetriesPerRequest: null,
    };

export const createRedisClient = () => {
  if (env.REDIS_URL) {
    return new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  }
  return new Redis({
    host: env.REDIS_HOST,
    port: env.REDIS_PORT,
    password: env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
  });
};
