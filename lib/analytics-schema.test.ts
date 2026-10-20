import { describe, it, expect } from "vitest";
import { analyticsQuerySchema } from "./analytics-schema";

describe("lib/analytics-schema.ts (CHI-P1-8)", () => {
  it("applies defaults: period 30d, includeBots false, limit 10", () => {
    const parsed = analyticsQuerySchema.parse({});
    expect(parsed.period).toBe("30d");
    expect(parsed.includeBots).toBe(false);
    expect(parsed.limit).toBe(10);
  });

  it("parses valid period presets", () => {
    expect(analyticsQuerySchema.parse({ period: "7d" }).period).toBe("7d");
    expect(analyticsQuerySchema.parse({ period: "90d" }).period).toBe("90d");
  });

  it("rejects invalid period presets", () => {
    const res = analyticsQuerySchema.safeParse({ period: "365d" });
    expect(res.success).toBe(false);
  });

  it("coerces boolean string for includeBots", () => {
    expect(analyticsQuerySchema.parse({ includeBots: "true" }).includeBots).toBe(true);
    expect(analyticsQuerySchema.parse({ includeBots: "false" }).includeBots).toBe(false);
  });

  it("coerces numeric string for limit and caps at 50", () => {
    expect(analyticsQuerySchema.parse({ limit: "25" }).limit).toBe(25);

    const overLimit = analyticsQuerySchema.safeParse({ limit: "51" });
    expect(overLimit.success).toBe(false);
    if (!overLimit.success) {
      expect(overLimit.error.issues[0].message).toContain("Limit cannot exceed 50");
    }
  });

  it("accepts valid ISO from and to dates", () => {
    const res = analyticsQuerySchema.parse({
      from: "2026-10-01T00:00:00.000Z",
      to: "2026-10-15T23:59:59.000Z",
    });
    expect(res.from).toBe("2026-10-01T00:00:00.000Z");
    expect(res.to).toBe("2026-10-15T23:59:59.000Z");
  });
});
