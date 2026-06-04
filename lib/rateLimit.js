import { Redis } from '@upstash/redis'
import { Ratelimit } from '@upstash/ratelimit'

const redis = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

// 2 requests per 30 minutes per user, sliding window
export const rateLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(2, '30 m'),
    analytics: true,
    prefix: 'research_assistant_rl',
})