# Rate Limiting Implementation Guide

## Overview

Rate limiting protects your API endpoints from abuse by limiting how many requests a user can make within a specific time period.

## Why Rate Limiting?

1. **Prevent Spam** - Stop contact form spam
2. **Prevent Abuse** - Protect checkout and API endpoints
3. **Cost Control** - Limit expensive API calls (Shippo, email validation)
4. **DDoS Protection** - Reduce impact of automated attacks
5. **Fair Usage** - Ensure resources for all users

## Options for Next.js/Vercel

### Option 1: Upstash Redis (⭐ RECOMMENDED)
**Best for:** Production, serverless/Vercel deployments
- ✅ Works perfectly with serverless functions
- ✅ Persistent across function invocations
- ✅ Scales automatically
- ✅ Free tier available
- ❌ Requires Upstash account setup

### Option 2: Simple In-Memory (Quick Start)
**Best for:** Development/testing
- ✅ No external dependencies
- ✅ Simple to implement
- ❌ Doesn't persist across function invocations
- ❌ Not reliable for production (multiple servers)

### Option 3: Vercel Edge Middleware
**Best for:** Global rate limiting at edge
- ✅ Runs at edge (fastest)
- ✅ Works before hitting your API
- ⚠️ More complex setup
- ⚠️ Requires Edge-compatible code

---

## Recommended Approach: Upstash Redis

### Step 1: Set Up Upstash Redis

1. Sign up at [Upstash Console](https://console.upstash.com/)
2. Create a new Redis database
3. Copy these values:
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

### Step 2: Install Packages

```bash
npm install @upstash/ratelimit @upstash/redis
```

### Step 3: Add Environment Variables

Add to your `.env.local` (and Vercel environment variables):
```
UPSTASH_REDIS_REST_URL=your_redis_url_here
UPSTASH_REDIS_REST_TOKEN=your_redis_token_here
```

### Step 4: Create Rate Limiter Utility

Create `src/lib/rateLimit.ts`:
```typescript
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

// Rate limiters for different endpoints
export const contactFormLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '1 h'), // 5 requests per hour
  prefix: 'ratelimit:contact',
});

export const checkoutLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, '1 m'), // 10 requests per minute
  prefix: 'ratelimit:checkout',
});

export const shippingRatesLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'), // 20 requests per minute
  prefix: 'ratelimit:shipping-rates',
});

export const adminLoginLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(5, '15 m'), // 5 attempts per 15 minutes
  prefix: 'ratelimit:admin-login',
});
```

### Step 5: Apply to API Routes

Example for contact form:
```typescript
import { contactFormLimiter } from '@/lib/rateLimit';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Get client identifier (IP address)
  const ip = req.headers['x-forwarded-for'] || 
             req.headers['x-real-ip'] || 
             'unknown';

  // Check rate limit
  const { success, limit, reset, remaining } = await contactFormLimiter.limit(
    ip as string
  );

  if (!success) {
    res.setHeader('X-RateLimit-Limit', limit.toString());
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    res.setHeader('X-RateLimit-Reset', new Date(reset).toISOString());
    return res.status(429).json({ 
      error: 'Too many requests. Please try again later.' 
    });
  }

  // Continue with your existing logic...
}
```

---

## Which Endpoints Need Rate Limiting?

### High Priority (Should Have Rate Limiting)

1. **`/api/send-contact`** - 5 requests/hour (prevents spam)
2. **`/api/checkout`** - 10 requests/minute (prevents abuse)
3. **`/api/get-rates`** - 20 requests/minute (Shippo API cost)
4. **Admin Login** - 5 attempts/15 minutes (brute force protection)

### Medium Priority (Consider Rate Limiting)

5. **`/api/messages/add`** - 10 requests/hour
6. **`/api/create-invoice`** - Admin endpoint, lower priority

### Low Priority (Probably Don't Need)

- Admin endpoints with authentication (already protected)
- Read-only endpoints (GET requests)
- Webhook endpoints (protected by signatures)

---

## Rate Limit Recommendations

### Contact Form
- **Rate:** 5 requests per hour per IP
- **Why:** Prevent spam, reasonable for legitimate users

### Checkout
- **Rate:** 10 requests per minute per IP
- **Why:** Prevent abuse while allowing retries

### Shipping Rates
- **Rate:** 20 requests per minute per IP
- **Why:** Shippo API costs money, allow reasonable usage

### Admin Login
- **Rate:** 5 attempts per 15 minutes per IP
- **Why:** Prevent brute force attacks

---

## Alternative: Simple In-Memory (For Testing)

If you want to test without Upstash first:

```typescript
// src/lib/simpleRateLimit.ts
const requestCounts = new Map<string, { count: number; resetAt: number }>();

export function simpleRateLimit(
  identifier: string,
  maxRequests: number,
  windowMs: number
): { success: boolean; remaining: number } {
  const now = Date.now();
  const record = requestCounts.get(identifier);

  if (!record || now > record.resetAt) {
    requestCounts.set(identifier, {
      count: 1,
      resetAt: now + windowMs,
    });
    return { success: true, remaining: maxRequests - 1 };
  }

  if (record.count >= maxRequests) {
    return { success: false, remaining: 0 };
  }

  record.count++;
  return { success: true, remaining: maxRequests - record.count };
}
```

**Note:** This is NOT production-ready. Use only for development/testing.

---

## Testing Rate Limits

After implementation, test with:

```bash
# Test contact form rate limit (should allow 5, then block)
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/send-contact \
    -H "Content-Type: application/json" \
    -d '{"firstName":"Test","lastName":"User","email":"test@example.com","message":"Test"}'
  echo ""
done
```

---

## Monitoring

- Check Upstash dashboard for rate limit hits
- Monitor 429 responses in your logs
- Adjust limits based on legitimate usage patterns

---

## Cost Consideration

**Upstash Free Tier:**
- 10,000 commands/day
- Perfect for small to medium apps
- Rate limiting uses very few commands

**If you exceed free tier:** ~$0.20 per 100K commands

---

**Recommendation:** Start with Upstash Redis for production-ready rate limiting.

