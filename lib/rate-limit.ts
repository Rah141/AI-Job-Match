import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

/**
 * Simple in-memory rate limiter
 * For production, consider using Redis-based solution like @upstash/ratelimit
 */

interface RateLimitStore {
  [key: string]: {
    count: number
    resetAt: number
  }
}

class RateLimiter {
  private store: RateLimitStore = {}
  private readonly windowMs: number
  private readonly maxRequests: number

  constructor(maxRequests: number = 10, windowMs: number = 10000) {
    this.maxRequests = maxRequests
    this.windowMs = windowMs
    
    // Clean up old entries every minute
    setInterval(() => this.cleanup(), 60000)
  }

  private cleanup() {
    const now = Date.now()
    Object.keys(this.store).forEach(key => {
      if (this.store[key].resetAt < now) {
        delete this.store[key]
      }
    })
  }

  check(identifier: string): { allowed: boolean; remaining: number; resetAt: number } {
    const now = Date.now()
    const entry = this.store[identifier]

    if (!entry || entry.resetAt < now) {
      // Create new window
      this.store[identifier] = {
        count: 1,
        resetAt: now + this.windowMs,
      }
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs,
      }
    }

    if (entry.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: entry.resetAt,
      }
    }

    entry.count++
    return {
      allowed: true,
      remaining: this.maxRequests - entry.count,
      resetAt: entry.resetAt,
    }
  }

  getMaxRequests(): number {
    return this.maxRequests
  }
}

// Create rate limiters for different endpoints
const apiRateLimiter = new RateLimiter(10, 10000) // 10 requests per 10 seconds
const authRateLimiter = new RateLimiter(5, 60000) // 5 requests per minute
const aiRateLimiter = new RateLimiter(3, 60000) // 3 requests per minute (AI endpoints are expensive)

/**
 * Get client identifier from request
 */
function getClientId(req: NextRequest): string {
  // Try to get IP from various headers (for production behind proxy)
  const forwarded = req.headers.get("x-forwarded-for")
  const realIp = req.headers.get("x-real-ip")
  const ip = forwarded?.split(",")[0] || realIp || req.ip || "unknown"
  return ip
}

/**
 * Rate limit middleware for API routes
 */
export function withRateLimit(
  req: NextRequest,
  handler: (req: NextRequest) => Promise<NextResponse>,
  limiter: RateLimiter = apiRateLimiter
): Promise<NextResponse> {
  const clientId = getClientId(req)
  const { allowed, remaining, resetAt } = limiter.check(clientId)

  if (!allowed) {
    return Promise.resolve(
      NextResponse.json(
        {
          message: "Rate limit exceeded. Please try again later.",
          retryAfter: Math.ceil((resetAt - Date.now()) / 1000),
        },
        {
          status: 429,
          headers: {
            "X-RateLimit-Limit": limiter.getMaxRequests().toString(),
            "X-RateLimit-Remaining": remaining.toString(),
            "X-RateLimit-Reset": new Date(resetAt).toISOString(),
            "Retry-After": Math.ceil((resetAt - Date.now()) / 1000).toString(),
          },
        }
      )
    )
  }

  // Add rate limit headers to successful responses
  return handler(req).then(response => {
    const headers = new Headers(response.headers)
    headers.set("X-RateLimit-Limit", limiter.getMaxRequests().toString())
    headers.set("X-RateLimit-Remaining", remaining.toString())
    headers.set("X-RateLimit-Reset", new Date(resetAt).toISOString())
    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    })
  })
}

/**
 * Rate limiters for specific endpoint types
 */
export const rateLimiters = {
  api: apiRateLimiter,
  auth: authRateLimiter,
  ai: aiRateLimiter,
}

