import { isbot } from "isbot";
import UAParser from "ua-parser-js";

export type UserAgentMetadata = {
  isBot: boolean;
  deviceType: string;
  browser: string | null;
  os: string | null;
};

export function parseUserAgent(userAgent: string): UserAgentMetadata {
  const parsed = new UAParser(userAgent).getResult();

  return {
    isBot: isbot(userAgent),
    deviceType: parsed.device.type ?? "desktop",
    browser: parsed.browser.name ?? null,
    os: parsed.os.name ?? null,
  };
}