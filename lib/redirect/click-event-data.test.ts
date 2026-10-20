import assert from "node:assert/strict";
import test from "node:test";
import { buildClickEventData } from "./click-event-data";
import { createVisitorId } from "./visitor-id";
import type { UserAgentMetadata } from "./user-agent";

const userAgent = "Mozilla/5.0 (X11; Linux x86_64) Chrome/131.0.0.0 Safari/537.36";
const ip = "203.0.113.10";
const metadata: UserAgentMetadata = {
  isBot: false,
  deviceType: "desktop",
  browser: "Chrome",
  os: "Linux",
};

function eventData(overrides: Partial<Parameters<typeof buildClickEventData>[0]> = {}) {
  return buildClickEventData({
    linkId: "link-id",
    referrer: null,
    userAgent,
    forwardedFor: `${ip}, 198.51.100.8`,
    vercelCountry: null,
    cloudflareCountry: null,
    sourceParam: null,
    visitorSalt: "test-visitor-salt-2026",
    result: "SUCCESS",
    userAgentMetadata: metadata,
    ...overrides,
  });
}

test("hashes only the first forwarded IP into visitorId", () => {
  const event = eventData();

  assert.equal(
    event.visitorId,
    createVisitorId(ip, userAgent, "test-visitor-salt-2026"),
  );
  assert.equal(JSON.stringify(event).includes(ip), false);
  assert.equal(JSON.stringify(event).includes(userAgent), false);
});

test("selects QR source only for src=qr", () => {
  assert.equal(eventData({ sourceParam: "qr" }).source, "QR");
  assert.equal(eventData({ sourceParam: "link" }).source, "LINK");
});

test("uses Vercel country first and falls back to Cloudflare", () => {
  assert.equal(
    eventData({ vercelCountry: "US", cloudflareCountry: "CA" }).country,
    "US",
  );
  assert.equal(eventData({ cloudflareCountry: "CA" }).country, "CA");
  assert.equal(eventData({ vercelCountry: "  " }).country, null);
});