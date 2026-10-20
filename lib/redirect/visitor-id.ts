import { createHash } from "node:crypto";

export function createVisitorId(
  ip: string,
  userAgent: string,
  salt: string,
): string {
  const input = JSON.stringify([ip, userAgent, salt]);
  return createHash("sha256").update(input).digest("hex");
}