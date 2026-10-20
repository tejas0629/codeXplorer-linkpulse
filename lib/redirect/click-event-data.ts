import { createVisitorId } from "./visitor-id";
import type { UserAgentMetadata } from "./user-agent";

export type ClickSourceValue = "LINK" | "QR";
export type ClickResultValue =
  | "SUCCESS"
  | "DISABLED"
  | "EXPIRED"
  | "LIMIT_REACHED"
  | "PASSWORD_FAILED";

export type ClickEventDataInput = {
  linkId: string;
  referrer: string | null;
  userAgent: string;
  forwardedFor: string | null;
  vercelCountry: string | null;
  cloudflareCountry: string | null;
  sourceParam: string | null;
  visitorSalt: string;
  result: ClickResultValue;
  userAgentMetadata: UserAgentMetadata;
};

export type ClickEventData = {
  linkId: string;
  referrer: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  isBot: boolean;
  visitorId: string;
  source: ClickSourceValue;
  result: ClickResultValue;
};

function firstForwardedIp(forwardedFor: string | null): string {
  return forwardedFor?.split(",", 1)[0]?.trim() ?? "";
}

function firstCountry(...values: (string | null)[]): string | null {
  return values.find((value) => value !== null && value.trim() !== null && value.trim() !== "")?.trim() ?? null;
}

export function buildClickEventData(input: ClickEventDataInput): ClickEventData {
  const ip = firstForwardedIp(input.forwardedFor);

  return {
    linkId: input.linkId,
    referrer: input.referrer,
    deviceType: input.userAgentMetadata.deviceType || null,
    browser: input.userAgentMetadata.browser,
    os: input.userAgentMetadata.os,
    country: firstCountry(input.vercelCountry, input.cloudflareCountry),
    isBot: input.userAgentMetadata.isBot,
    visitorId: createVisitorId(ip, input.userAgent, input.visitorSalt),
    source: input.sourceParam === "qr" ? "QR" : "LINK",
    result: input.result,
  };
}