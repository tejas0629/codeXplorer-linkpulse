import { describe, it, expect, vi } from "vitest";
import {
  RESERVED_WORDS,
  validateAlias,
  isValidAlias,
  generateShortCode,
  createUniqueCode,
  normalizeCode,
} from "./shortcode";
import { ApiError } from "@/lib/api-response";

describe("lib/shortcode.ts", () => {
  describe("validateAlias boundaries and rules", () => {
    it("rejects aliases shorter than 3 characters (boundary: 2 chars)", () => {
      const res = validateAlias("ab");
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("TOO_SHORT");
        expect(res.message).toContain("at least 3 characters");
      }
    });

    it("accepts valid minimum length alias (boundary: 3 chars)", () => {
      const res = validateAlias("abc");
      expect(res.ok).toBe(true);
    });

    it("accepts valid maximum length alias (boundary: 30 chars)", () => {
      const exact30 = "a".repeat(30);
      const res = validateAlias(exact30);
      expect(res.ok).toBe(true);
    });

    it("rejects aliases longer than 30 characters (boundary: 31 chars)", () => {
      const tooLong31 = "a".repeat(31);
      const res = validateAlias(tooLong31);
      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.code).toBe("TOO_LONG");
        expect(res.message).toContain("cannot exceed 30 characters");
      }
    });

    it("accepts allowed characters: alphanumeric, hyphens, and underscores", () => {
      expect(validateAlias("my-promo_2026").ok).toBe(true);
      expect(validateAlias("Team_Link-99").ok).toBe(true);
    });

    it("rejects disallowed characters", () => {
      const badAliases = [
        "link with space",
        "link.dot",
        "link@promo",
        "link!bang",
        "link#hash",
        "link$dollar",
        "link/slash",
      ];

      for (const bad of badAliases) {
        const res = validateAlias(bad);
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.code).toBe("INVALID_CHARS");
          expect(res.message).toContain("letters, numbers, hyphen and underscore");
        }
      }
    });

    it("rejects every individual reserved word", () => {
      for (const word of RESERVED_WORDS) {
        const res = validateAlias(word);
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.code).toBe("RESERVED");
          expect(res.message).toContain("reserved system path");
        }
      }
    });

    it("rejects reserved words case-insensitively", () => {
      const variants = [
        "API",
        "Login",
        "DASHBOARD",
        "Admin",
        "Status",
        "Unlock",
        "_NEXT",
        "Favicon.Ico",
        "Robots.Txt",
        "Sitemap.Xml",
      ];

      for (const variant of variants) {
        const res = validateAlias(variant);
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.code).toBe("RESERVED");
        }
      }
    });

    it("isValidAlias helper matches validateAlias outcome", () => {
      expect(isValidAlias("valid-code").valid).toBe(true);
      expect(isValidAlias("no").valid).toBe(false);
      expect(isValidAlias("api").valid).toBe(false);
    });
  });

  describe("normalizeCode", () => {
    it("trims surrounding whitespace and converts to lowercase", () => {
      expect(normalizeCode("  Diwali  ")).toBe("diwali");
      expect(normalizeCode("MY-PROMO_2026")).toBe("my-promo_2026");
      expect(normalizeCode("CodeX")).toBe("codex");
      expect(normalizeCode("already-lowercase")).toBe("already-lowercase");
    });
  });

  describe("generateShortCode", () => {
    it("generates a code of default length 7", () => {
      const code = generateShortCode();
      expect(code).toHaveLength(7);
    });

    it("generates a code of custom requested length", () => {
      expect(generateShortCode(10)).toHaveLength(10);
      expect(generateShortCode(5)).toHaveLength(5);
    });

    it("alphabet is lowercase only and contains none of 0, 1, l, o over 1000 generated codes", () => {
      const excludedRegex = /[01loOI]/;
      const validAlphabetRegex = /^[2-9a-kmnp-z]+$/;
      for (let i = 0; i < 1000; i++) {
        const code = generateShortCode(8);
        expect(code).toBe(code.toLowerCase());
        expect(excludedRegex.test(code)).toBe(false);
        expect(validAlphabetRegex.test(code)).toBe(true);
      }
    }, 15000);
  });

  describe("createUniqueCode", () => {
    it("returns code on first attempt when not taken", async () => {
      const isTaken = vi.fn().mockResolvedValue(false);
      const code = await createUniqueCode(isTaken, 5);

      expect(typeof code).toBe("string");
      expect(code).toHaveLength(7);
      expect(isTaken).toHaveBeenCalledTimes(1);
    });

    it("retries on collisions and succeeds before maxAttempts", async () => {
      const isTaken = vi
        .fn()
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(false);

      const code = await createUniqueCode(isTaken, 5);
      expect(typeof code).toBe("string");
      expect(code).toHaveLength(7);
      expect(isTaken).toHaveBeenCalledTimes(3);
    });

    it("throws ApiError with CODE_GENERATION_FAILED when maxAttempts is exhausted", async () => {
      const isTaken = vi.fn().mockResolvedValue(true);

      await expect(createUniqueCode(isTaken, 4)).rejects.toThrowError(ApiError);
      expect(isTaken).toHaveBeenCalledTimes(4);

      try {
        await createUniqueCode(isTaken, 3);
      } catch (err) {
        expect(err).toBeInstanceOf(ApiError);
        const apiErr = err as ApiError;
        expect(apiErr.code).toBe("CODE_GENERATION_FAILED");
        expect(apiErr.status).toBe(500);
      }
    });
  });
});
