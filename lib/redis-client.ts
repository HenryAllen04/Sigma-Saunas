import { Redis } from '@upstash/redis';

let redis: Redis | null = null;

export function getRedisClient(): Redis {
  if (!redis) {
    const url = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_TOKEN;

    if (!url || !token) {
      throw new Error(
        'Missing Redis credentials. Please set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN environment variables.'
      );
    }

    redis = new Redis({
      url,
      token,
    });
  }

  return redis;
}
