// Owner: Chirag | Task: CHI-P2-3 | Priority: P2
import "server-only";

export type RiskLevel = "LOW" | "MEDIUM" | "HIGH";

export interface RiskAssessment {
  level: RiskLevel;
  score: number;
  reasons: string[];
}

export const RISK_THRESHOLDS = {
  HIGH_SCORE: 50,
  MEDIUM_SCORE: 20,
} as const;

export const RISK_SCORES = {
  INVALID_URL: 100,
  IP_HOST: 40,
  PUNYCODE_HOST: 35,
  SUSPICIOUS_TLD: 25,
  KNOWN_SHORTENER: 25,
  VERY_LONG_URL: 15,
  MANY_SUBDOMAINS: 20,
  AT_SYMBOL_TRICK: 40,
  NON_HTTPS: 10,
  SUSPICIOUS_KEYWORD: 25,
} as const;

const SUSPICIOUS_TLDS = new Set([
  "zip",
  "mov",
  "top",
  "xyz",
  "country",
  "kim",
  "cricket",
  "work",
  "gq",
  "cf",
  "tk",
  "ml",
  "ga",
  "buzz",
  "fit",
  "surf",
]);

const KNOWN_SHORTENERS = new Set([
  "bit.ly",
  "t.co",
  "tinyurl.com",
  "is.gd",
  "buff.ly",
  "ow.ly",
  "rebrand.ly",
  "goo.gl",
  "cutt.ly",
  "rb.gy",
  "shorturl.at",
]);

const SENSITIVE_KEYWORDS = [
  "login",
  "signin",
  "verify",
  "verification",
  "wallet",
  "password",
  "passcode",
  "bank",
  "banking",
  "credential",
  "account-update",
  "secure-account",
];

function isIpAddress(hostname: string): boolean {
  const clean = hostname.replace(/^\[|\]$/g, "");
  // IPv4 check
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/;
  if (ipv4Regex.test(clean)) {
    const parts = clean.split(".").map(Number);
    return parts.every((p) => p >= 0 && p <= 255);
  }
  // IPv6 check (contains colons)
  if (clean.includes(":")) {
    return true;
  }
  return false;
}

function hasPunycodeOrMixedScript(hostname: string): boolean {
  if (hostname.toLowerCase().includes("xn--")) {
    return true;
  }
  // Check for non-ASCII characters
  for (let i = 0; i < hostname.length; i++) {
    if (hostname.charCodeAt(i) > 127) {
      return true;
    }
  }
  return false;
}

/**
 * Pure function assessing the risk level of a destination URL based on heuristics.
 * Evaluates host type, character encoding, TLD risk, URL length, subdomains, and keywords.
 * Never throws: an invalid URL returns HIGH with reasons.
 */
export function assessRisk(url: string): RiskAssessment {
  if (!url || typeof url !== "string" || url.trim().length === 0) {
    return {
      level: "HIGH",
      score: RISK_SCORES.INVALID_URL,
      reasons: ["URL is empty or not a string"],
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(url.trim());
  } catch {
    return {
      level: "HIGH",
      score: RISK_SCORES.INVALID_URL,
      reasons: ["Destination URL is invalid or malformed"],
    };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return {
      level: "HIGH",
      score: RISK_SCORES.INVALID_URL,
      reasons: ["URL must use http or https protocol"],
    };
  }

  let score = 0;
  const reasons: string[] = [];
  const hostname = parsed.hostname.toLowerCase();
  const rawUrl = url.trim();

  // 1. IP address host
  if (isIpAddress(hostname)) {
    score += RISK_SCORES.IP_HOST;
    reasons.push("Destination uses an IP address instead of a domain name");
  }

  // 2. Punycode or mixed script look-alike host
  if (hasPunycodeOrMixedScript(hostname)) {
    score += RISK_SCORES.PUNYCODE_HOST;
    reasons.push(
      "Domain contains punycode or internationalized characters often used for spoofing"
    );
  }

  // 3. Suspicious TLD list
  const hostParts = hostname.split(".");
  const tld = hostParts[hostParts.length - 1];
  if (SUSPICIOUS_TLDS.has(tld)) {
    score += RISK_SCORES.SUSPICIOUS_TLD;
    reasons.push(
      `Domain uses a top-level domain (.${tld}) frequently associated with spam or abuse`
    );
  }

  // 4. Known URL shorteners (chained redirect)
  if (KNOWN_SHORTENERS.has(hostname)) {
    score += RISK_SCORES.KNOWN_SHORTENER;
    reasons.push("URL points to another link shortener (chained redirect)");
  }

  // 5. Very long URL
  if (rawUrl.length > 200) {
    score += RISK_SCORES.VERY_LONG_URL;
    reasons.push("URL is unusually long (exceeds 200 characters)");
  }

  // 6. Many subdomains (>= 4 labels or >= 3 subdomains)
  if (hostParts.length >= 4 && !isIpAddress(hostname)) {
    score += RISK_SCORES.MANY_SUBDOMAINS;
    reasons.push(
      "Hostname contains multiple nested subdomains, which may indicate domain spoofing"
    );
  }

  // 7. "@" tricks in authority
  if (rawUrl.includes("@") || parsed.username || parsed.password) {
    score += RISK_SCORES.AT_SYMBOL_TRICK;
    reasons.push(
      "URL contains '@' symbol in the authority, often used in credential phishing"
    );
  }

  // 8. Non-https (plain HTTP)
  if (parsed.protocol === "http:") {
    score += RISK_SCORES.NON_HTTPS;
    reasons.push("URL is unencrypted (HTTP instead of HTTPS)");
  }

  // 9. Words like login, verify, wallet, password, bank combined with at least one other signal
  const urlLower = rawUrl.toLowerCase();
  const matchedKeywords = SENSITIVE_KEYWORDS.filter((kw) =>
    urlLower.includes(kw)
  );
  if (matchedKeywords.length > 0 && reasons.length > 0) {
    score += RISK_SCORES.SUSPICIOUS_KEYWORD;
    reasons.push(
      `URL contains sensitive security keywords (${matchedKeywords.slice(0, 3).join(", ")}) combined with suspicious patterns`
    );
  }

  let level: RiskLevel = "LOW";
  if (score >= RISK_THRESHOLDS.HIGH_SCORE) {
    level = "HIGH";
  } else if (score >= RISK_THRESHOLDS.MEDIUM_SCORE) {
    level = "MEDIUM";
  }

  return {
    level,
    score,
    reasons,
  };
}

/**
 * Compatibility wrapper for existing stub callers.
 */
export async function calculateRiskScore(url: string): Promise<RiskLevel> {
  return assessRisk(url).level;
}
