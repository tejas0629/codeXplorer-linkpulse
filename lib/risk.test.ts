import { describe, it, expect } from "vitest";
import { assessRisk, calculateRiskScore, RISK_THRESHOLDS, RISK_SCORES } from "./risk";

describe("lib/risk.ts (CHI-P2-3)", () => {
  describe("Named constants and exports", () => {
    it("exports named threshold and score constants", () => {
      expect(RISK_THRESHOLDS.HIGH_SCORE).toBe(50);
      expect(RISK_THRESHOLDS.MEDIUM_SCORE).toBe(20);
      expect(RISK_SCORES.INVALID_URL).toBe(100);
      expect(RISK_SCORES.IP_HOST).toBe(40);
      expect(RISK_SCORES.SUSPICIOUS_TLD).toBe(25);
    });

    it("calculateRiskScore compatibility helper returns same level as assessRisk", async () => {
      const level = await calculateRiskScore("https://google.com");
      expect(level).toBe("LOW");

      const highLevel = await calculateRiskScore("http://192.168.1.1/admin");
      expect(highLevel).toBe("HIGH");
    });
  });

  describe("Table of 28 URL Test Cases", () => {
    interface UrlTestCase {
      name: string;
      url: string;
      expectedLevel: "LOW" | "MEDIUM" | "HIGH";
      expectedReasonSubstring?: string;
    }

    const testCases: UrlTestCase[] = [
      // 1-8: Clean URLs that must stay LOW
      {
        name: "1. Clean popular domain",
        url: "https://google.com",
        expectedLevel: "LOW",
      },
      {
        name: "2. Clean repository path",
        url: "https://github.com/torvalds/linux",
        expectedLevel: "LOW",
      },
      {
        name: "3. Clean educational wiki",
        url: "https://en.wikipedia.org/wiki/Main_Page",
        expectedLevel: "LOW",
      },
      {
        name: "4. Clean linkpulse docs",
        url: "https://docs.linkpulse.dev/v1/api",
        expectedLevel: "LOW",
      },
      {
        name: "5. Clean e-commerce product",
        url: "https://amazon.com/dp/B08N5WRWNW",
        expectedLevel: "LOW",
      },
      {
        name: "6. Clean stripe documentation",
        url: "https://stripe.com/docs/security",
        expectedLevel: "LOW",
      },
      {
        name: "7. Clean HTTPS site with login keyword (no other signals)",
        url: "https://github.com/login",
        expectedLevel: "LOW",
      },
      {
        name: "8. Clean subdomain with accounts keyword (no other signals)",
        url: "https://accounts.google.com",
        expectedLevel: "LOW",
      },

      // 9-11: IP address hosts
      {
        name: "9. IPv4 address host with HTTP",
        url: "http://192.168.1.1/admin",
        expectedLevel: "HIGH",
        expectedReasonSubstring: "IP address instead of a domain name",
      },
      {
        name: "10. Private IPv4 address host with HTTPS",
        url: "https://10.0.0.1/dashboard",
        expectedLevel: "MEDIUM",
        expectedReasonSubstring: "IP address instead of a domain name",
      },
      {
        name: "11. Localhost IPv4 with port",
        url: "https://127.0.0.1:8080/setup",
        expectedLevel: "MEDIUM",
        expectedReasonSubstring: "IP address instead of a domain name",
      },

      // 12-13: Punycode / Lookalike hosts
      {
        name: "12. Punycode domain",
        url: "https://xn--e1awd7f.com",
        expectedLevel: "MEDIUM",
        expectedReasonSubstring: "punycode or internationalized characters",
      },
      {
        name: "13. Punycode spoofing domain with login keyword",
        url: "https://xn--pple-43d.com/login",
        expectedLevel: "HIGH",
        expectedReasonSubstring: "punycode or internationalized characters",
      },

      // 14-17: Suspicious TLDs
      {
        name: "14. Suspicious .zip TLD",
        url: "https://download-invoice.zip",
        expectedLevel: "MEDIUM",
        expectedReasonSubstring: ".zip",
      },
      {
        name: "15. Suspicious .mov TLD",
        url: "https://malicious-file.mov/setup.exe",
        expectedLevel: "MEDIUM",
        expectedReasonSubstring: ".mov",
      },
      {
        name: "16. Suspicious .top TLD",
        url: "https://free-crypto.top/claim",
        expectedLevel: "MEDIUM",
        expectedReasonSubstring: ".top",
      },
      {
        name: "17. Suspicious .xyz TLD with sensitive keyword",
        url: "https://secure-banking.xyz/login",
        expectedLevel: "HIGH",
        expectedReasonSubstring: ".xyz",
      },

      // 18-20: Known URL Shorteners (chained redirect)
      {
        name: "18. Bitly shortener",
        url: "https://bit.ly/3xYzA12",
        expectedLevel: "MEDIUM",
        expectedReasonSubstring: "chained redirect",
      },
      {
        name: "19. TinyURL shortener",
        url: "https://tinyurl.com/free-promo",
        expectedLevel: "MEDIUM",
        expectedReasonSubstring: "chained redirect",
      },
      {
        name: "20. Twitter t.co shortener",
        url: "https://t.co/xyz123",
        expectedLevel: "MEDIUM",
        expectedReasonSubstring: "chained redirect",
      },

      // 21: Nested Subdomains + Suspicious TLD + Keyword
      {
        name: "21. Multiple subdomains with phishing pattern",
        url: "https://paypal.com.account-update.security-check.attacker.xyz/login",
        expectedLevel: "HIGH",
        expectedReasonSubstring: "multiple nested subdomains",
      },

      // 22: "@" Trick in authority
      {
        name: "22. URL with @ credential trick",
        url: "https://user:password@legitimate.com.attacker.net/verify",
        expectedLevel: "HIGH",
        expectedReasonSubstring: "'@' symbol in the authority",
      },

      // 23: Non-HTTPS combined with keyword
      {
        name: "23. Unencrypted HTTP with sensitive banking keyword",
        url: "http://bank-of-america-verify.com",
        expectedLevel: "MEDIUM",
        expectedReasonSubstring: "unencrypted (HTTP instead of HTTPS)",
      },

      // 24: Very long URL
      {
        name: "24. Excessively long URL (>200 chars)",
        url: `https://example.com/${"token-segment/".repeat(15)}`,
        expectedLevel: "LOW", // 15 points alone is below 20
      },

      // 25: Long URL with HTTP and keyword
      {
        name: "25. Long URL with HTTP and password keyword",
        url: `http://example.org/reset-password/${"a".repeat(180)}`,
        expectedLevel: "HIGH",
        expectedReasonSubstring: "exceeds 200 characters",
      },

      // 26-28: Invalid URLs (never throws, returns HIGH)
      {
        name: "26. Invalid protocol (ftp)",
        url: "ftp://files.example.com",
        expectedLevel: "HIGH",
        expectedReasonSubstring: "protocol",
      },
      {
        name: "27. Malformed string (not a URL)",
        url: "not-a-valid-url",
        expectedLevel: "HIGH",
        expectedReasonSubstring: "invalid or malformed",
      },
      {
        name: "28. Empty string input",
        url: "",
        expectedLevel: "HIGH",
        expectedReasonSubstring: "empty",
      },
    ];

    it.each(testCases)("$name evaluates to $expectedLevel", ({ url, expectedLevel, expectedReasonSubstring }) => {
      const assessment = assessRisk(url);
      expect(assessment.level).toBe(expectedLevel);
      if (expectedReasonSubstring) {
        expect(
          assessment.reasons.some((r) =>
            r.toLowerCase().includes(expectedReasonSubstring.toLowerCase())
          )
        ).toBe(true);
      }
    });
  });

  describe("Edge cases and resilience", () => {
    it("handles whitespace around URLs gracefully", () => {
      const res = assessRisk("   https://google.com   ");
      expect(res.level).toBe("LOW");
    });

    it("does not crash on non-string inputs", () => {
      const res = assessRisk(null as unknown as string);
      expect(res.level).toBe("HIGH");
      expect(res.reasons[0]).toContain("empty or not a string");
    });
  });
});
