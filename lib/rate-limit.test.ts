import { describe, it, expect } from "vitest";
import { InMemoryRateLimiter, assertRateLimit, checkRateLimit, RateLimitError } from "./rate-limit";

describe("Rate Limiting (CHI-P1-7)", () => {
  it("allows requests under the rate limit threshold", async () => {
    const limiter = new InMemoryRateLimiter(5, 60000);

    for (let i = 0; i < 5; i++) {
      const res = await checkRateLimit("user-1", limiter);
      expect(res.success).toBe(true);
      expect(res.remaining).toBe(4 - i);
    }
  });

  it("blocks requests that exceed the limit", async () => {
    const limiter = new InMemoryRateLimiter(2, 60000);

    const first = await limiter.limit("user-2");
    expect(first.success).toBe(true);

    const second = await limiter.limit("user-2");
    expect(second.success).toBe(true);

    const third = await limiter.limit("user-2");
    expect(third.success).toBe(false);
    expect(third.remaining).toBe(0);
  });

  it("assertRateLimit throws RateLimitError when limit is exceeded", async () => {
    const limiter = new InMemoryRateLimiter(1, 60000);
    await assertRateLimit("user-3", limiter);

    await expect(assertRateLimit("user-3", limiter)).rejects.toThrow(
      RateLimitError
    );
  });

  it("RateLimitError returns 429 response with Retry-After and X-RateLimit headers", async () => {
    const limiter = new InMemoryRateLimiter(1, 60000);
    await assertRateLimit("user-4", limiter);

    try {
      await assertRateLimit("user-4", limiter);
      expect.unreachable();
    } catch (err: unknown) {
      expect(err).toBeInstanceOf(RateLimitError);
      const rateError = err as RateLimitError;
      expect(rateError.status).toBe(429);
      expect(rateError.code).toBe("RATE_LIMITED");

      const response = rateError.toResponse();
      expect(response.status).toBe(429);
      expect(response.headers.get("Retry-After")).toBeDefined();
      expect(response.headers.get("X-RateLimit-Remaining")).toBe("0");
      expect(response.headers.get("X-RateLimit-Limit")).toBe("1");
    }
  });

  it("resets limit window after time expires", async () => {
    const limiter = new InMemoryRateLimiter(1, 100); // 100ms window
    const first = await limiter.limit("user-5");
    expect(first.success).toBe(true);

    const blocked = await limiter.limit("user-5");
    expect(blocked.success).toBe(false);

    // Wait for the window to expire
    await new Promise((resolve) => setTimeout(resolve, 120));

    const resetCheck = await limiter.limit("user-5");
    expect(resetCheck.success).toBe(true);
  });
});
