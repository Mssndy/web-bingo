import { Redis } from '@upstash/redis';

// Server-side only — import from API routes only
export const redis = new Redis({
  url:   process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
