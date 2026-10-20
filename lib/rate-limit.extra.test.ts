// Owner: Chirag | Task: CHI-P2-6 | Priority: P2
import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  createSlidingLimiter,
  InMemoryRateLimiter,
  assertRateLimit,
} from "./rate-limit";
import { ApiError } from "./api-response";

describe("rate-limit extra tests for coverage", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("handles production fallback when Upstash credentials are missing", async () => {
    delete process.env.UPSTASH_REDIS_REST_URL;
    delete process.env.UPSTASH_REDIS_REST_TOKEN;
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";

    const limiter = createSlidingLimiter(5, 60, "test-prod");
    const res = await limiter.limit("user-1");

    expect(res.success).toBe(true);
    expect(res.limit).toBe(5);
    expect(res.remaining).toBe(5);
  });

  it("resets in-memory limiter using resetAll", async () => {
    const memory = new InMemoryRateLimiter(2, 60000);
    const r1 = await memory.limit("test-ip");
    expect(r1.success).toBe(true);
    expect(r1.remaining).toBe(1);

    memory.resetAll();
    const r2 = await memory.limit("test-ip");
    expect(r2.remaining).toBe(1);
  });

  it("throws ApiError when rate limit is exceeded in assertRateLimit", async () => {
    const mockLimiter = {
      limit: vi.fn().mockResolvedValue({
        success: false,
        limit: 10,
        remaining: 0,
        reset: Date.now() + 5000,
      }),
    };

    await expect(assertRateLimit("user-test", mockLimiter)).rejects.toThrow(ApiError);
  });
});
