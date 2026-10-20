// Owner: Chirag | Task: CHI-P1-7 | Priority: P1
import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { ApiError, fail, type ApiErrorBody } from "@/lib/api-response";
import type { NextResponse } from "next/server";

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

export interface Limiter {
  limit(identifier: string): Promise<RateLimitResult>;
}

export class RateLimitError extends ApiError {
  public readonly retryAfter: number;
  public readonly remaining: number;
  public readonly reset: number;
  public readonly limitValue: number;

  constructor(
    message: string = "Rate limit exceeded. Please try again later.",
    result: RateLimitResult
  ) {
    super("RATE_LIMITED", message, 429);
    this.name = "RateLimitError";
    const now = Date.now();
    this.retryAfter = Math.max(1, Math.ceil((result.reset - now) / 1000));
    this.remaining = result.remaining;
    this.reset = result.reset;
    this.limitValue = result.limit;
  }

  toResponse(): NextResponse<ApiErrorBody> {
    const res = fail("RATE_LIMITED", this.message, 429);
    res.headers.set("Retry-After", String(this.retryAfter));
    res.headers.set("X-RateLimit-Remaining", String(this.remaining));
    res.headers.set("X-RateLimit-Limit", String(this.limitValue));
    res.headers.set("X-RateLimit-Reset", String(this.reset));
    return res;
  }
}

export class InMemoryRateLimiter implements Limiter {
  private requests: Map<string, number[]> = new Map();

  constructor(
    public readonly maxRequests: number,
    public readonly windowMs: number
  ) {}

  async limit(identifier: string): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const existing = this.requests.get(identifier) || [];
    const valid = existing.filter((timestamp) => timestamp > windowStart);

    if (valid.length >= this.maxRequests) {
      const oldest = valid[0] ?? now;
      const reset = oldest + this.windowMs;
      this.requests.set(identifier, valid);
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset,
      };
    }

    valid.push(now);
    this.requests.set(identifier, valid);
    const oldest = valid[0] ?? now;
    const reset = oldest + this.windowMs;
    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - valid.length,
      reset,
    };
  }

  resetAll(): void {
    this.requests.clear();
  }
}

let hasLoggedDevWarning = false;
let hasLoggedProdError = false;

export function createSlidingLimiter(
  maxRequests: number,
  windowSeconds: number,
  prefix: string
): Limiter {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (url && token) {
    try {
      const redis = new Redis({ url, token });
      const ratelimit = new Ratelimit({
        redis,
        limiter: Ratelimit.slidingWindow(maxRequests, `${windowSeconds} s`),
        prefix,
      });

      return {
        async limit(identifier: string): Promise<RateLimitResult> {
          const res = await ratelimit.limit(identifier);
          return {
            success: res.success,
            limit: res.limit,
            remaining: res.remaining,
            reset: res.reset,
          };
        },
      };
    } catch (err) {
      console.error("[RateLimit] Failed to initialize Upstash Redis:", err);
    }
  }

  // Missing or failed Upstash Redis credentials
  if (process.env.NODE_ENV === "production") {
    if (!hasLoggedProdError) {
      console.error(
        "[RateLimit] Upstash Redis credentials missing in production. Rate limiter failing open."
      );
      hasLoggedProdError = true;
    }
    return {
      async limit(): Promise<RateLimitResult> {
        return {
          success: true,
          limit: maxRequests,
          remaining: maxRequests,
          reset: Date.now() + windowSeconds * 1000,
        };
      },
    };
  }

  // Development / Test in-memory fallback
  if (!hasLoggedDevWarning) {
    console.warn(
      "[RateLimit] Upstash Redis credentials not configured. Falling back to in-memory rate limiter in development."
    );
    hasLoggedDevWarning = true;
  }

  return new InMemoryRateLimiter(maxRequests, windowSeconds * 1000);
}

export const createLinkLimiter: Limiter = createSlidingLimiter(
  20,
  60,
  "ratelimit:link:create"
);

export const checkLimiter: Limiter = createSlidingLimiter(
  60,
  60,
  "ratelimit:link:check"
);

export async function checkRateLimit(
  identifier: string,
  limiter: Limiter = createLinkLimiter
): Promise<RateLimitResult> {
  return limiter.limit(identifier);
}

export async function assertRateLimit(
  identifier: string,
  limiter: Limiter = createLinkLimiter,
  message?: string
): Promise<RateLimitResult> {
  const result = await limiter.limit(identifier);
  if (!result.success) {
    throw new RateLimitError(message, result);
  }
  return result;
}
