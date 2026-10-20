import { describe, it, expect } from "vitest";
import { parsePeriod, fillMissingDays, formatUtcDate } from "./analytics-period";

describe("lib/analytics-period.ts (CHI-P1-8)", () => {
  const fixedNow = new Date("2026-10-18T15:30:00.000Z");

  describe("parsePeriod presets", () => {
    it("handles 7d preset correctly in UTC", () => {
      const range = parsePeriod("7d", undefined, undefined, fixedNow);
      expect(formatUtcDate(range.to)).toBe("2026-10-18");
      expect(formatUtcDate(range.from)).toBe("2026-10-12");
      expect(formatUtcDate(range.previousTo)).toBe("2026-10-11");
      expect(formatUtcDate(range.previousFrom)).toBe("2026-10-05");
    });

    it("handles 30d default preset correctly", () => {
      const range = parsePeriod("30d", undefined, undefined, fixedNow);
      expect(formatUtcDate(range.to)).toBe("2026-10-18");
      expect(formatUtcDate(range.from)).toBe("2026-09-19");
      expect(formatUtcDate(range.previousTo)).toBe("2026-09-18");
      expect(formatUtcDate(range.previousFrom)).toBe("2026-08-20");
    });

    it("handles 90d preset correctly", () => {
      const range = parsePeriod("90d", undefined, undefined, fixedNow);
      expect(formatUtcDate(range.to)).toBe("2026-10-18");
      expect(formatUtcDate(range.from)).toBe("2026-07-21");
      expect(range.previousTo.getTime()).toBeLessThan(range.from.getTime());
    });

    it("defaults to 30d when no preset specified", () => {
      const range = parsePeriod(undefined, undefined, undefined, fixedNow);
      expect(formatUtcDate(range.to)).toBe("2026-10-18");
      expect(formatUtcDate(range.from)).toBe("2026-09-19");
    });
  });

  describe("parsePeriod custom range", () => {
    it("handles valid custom ISO range", () => {
      const range = parsePeriod(
        undefined,
        "2026-10-01T00:00:00.000Z",
        "2026-10-10T23:59:59.999Z"
      );
      expect(formatUtcDate(range.from)).toBe("2026-10-01");
      expect(formatUtcDate(range.to)).toBe("2026-10-10");
      expect(range.previousTo.getTime()).toBe(range.from.getTime());
    });

    it("throws an error when start date is after end date", () => {
      expect(() =>
        parsePeriod(
          undefined,
          "2026-10-15T00:00:00.000Z",
          "2026-10-10T00:00:00.000Z"
        )
      ).toThrow("Start date must be before or equal to end date");
    });

    it("throws an error for invalid date strings", () => {
      expect(() => parsePeriod(undefined, "invalid-date", "2026-10-10")).toThrow(
        "Invalid custom date range"
      );
    });
  });

  describe("fillMissingDays", () => {
    it("fills gap days with zeros and preserves existing data", () => {
      const from = new Date("2026-10-10T00:00:00.000Z");
      const to = new Date("2026-10-13T23:59:59.000Z");

      const sparseData = [
        { date: "2026-10-10", clicks: 50, uniqueVisitors: 30 },
        { date: "2026-10-13", clicks: 80, uniqueVisitors: 55 },
      ];

      const filled = fillMissingDays(sparseData, from, to);
      expect(filled.length).toBe(4);
      expect(filled[0]).toEqual({ date: "2026-10-10", clicks: 50, uniqueVisitors: 30 });
      expect(filled[1]).toEqual({ date: "2026-10-11", clicks: 0, uniqueVisitors: 0 });
      expect(filled[2]).toEqual({ date: "2026-10-12", clicks: 0, uniqueVisitors: 0 });
      expect(filled[3]).toEqual({ date: "2026-10-13", clicks: 80, uniqueVisitors: 55 });
    });

    it("returns zero series when data is completely empty", () => {
      const from = new Date("2026-10-01T00:00:00.000Z");
      const to = new Date("2026-10-03T00:00:00.000Z");

      const filled = fillMissingDays([], from, to);
      expect(filled.length).toBe(3);
      expect(filled.every((r) => r.clicks === 0 && r.uniqueVisitors === 0)).toBe(true);
    });
  });
});
