import { createHmac, timingSafeEqual } from "node:crypto";

export const DEVELOPMENT_UNLOCK_SECRET = "linkpulse-development-unlock-secret";

export function resolveUnlockSecret(
  authSecret: string | undefined,
  visitorSalt: string | undefined,
  nodeEnvironment: string | undefined,
): string | null {
  if (authSecret) {
    return authSecret;
  }
  if (visitorSalt) {
    return visitorSalt;
  }
  return nodeEnvironment === "production" ? null : DEVELOPMENT_UNLOCK_SECRET;
}

export function signUnlockCookie(
  code: string,
  passwordHash: string,
  secret: string,
): string {
  return createHmac("sha256", secret)
    .update(`${code.toLowerCase()}:${passwordHash}`)
    .digest("hex");
}

export function verifyUnlockCookie(
  code: string,
  passwordHash: string,
  value: string | undefined,
  secret: string | null,
): boolean {
  if (secret === null || value === undefined || !/^[a-f0-9]{64}$/i.test(value)) {
    return false;
  }

  const expected = Buffer.from(signUnlockCookie(code, passwordHash, secret), "hex");
  const supplied = Buffer.from(value, "hex");
  return expected.length === supplied.length && timingSafeEqual(expected, supplied);
}