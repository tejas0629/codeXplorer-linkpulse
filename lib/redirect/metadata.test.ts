import assert from "node:assert/strict";
import test from "node:test";
import { parseUserAgent } from "./user-agent";
import { createVisitorId } from "./visitor-id";

const desktopChromeUserAgent =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";
const mobileSafariUserAgent =
  "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";

test("parses a real desktop browser user agent", () => {
  assert.deepEqual(parseUserAgent(desktopChromeUserAgent), {
    isBot: false,
    deviceType: "desktop",
    browser: "Chrome",
    os: "Windows",
  });
});

test("detects Googlebot", () => {
  const metadata = parseUserAgent(
    "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  );

  assert.equal(metadata.isBot, true);
});

test("parses a mobile browser user agent", () => {
  const metadata = parseUserAgent(mobileSafariUserAgent);

  assert.equal(metadata.isBot, false);
  assert.equal(metadata.deviceType, "mobile");
  assert.equal(metadata.browser, "Mobile Safari");
  assert.equal(metadata.os, "iOS");
});

test("returns the same visitor ID for the same inputs", () => {
  const visitorId = createVisitorId("203.0.113.4", desktopChromeUserAgent, "daily-salt");

  assert.equal(
    createVisitorId("203.0.113.4", desktopChromeUserAgent, "daily-salt"),
    visitorId,
  );
  assert.match(visitorId, /^[a-f0-9]{64}$/);
});

test("returns a different visitor ID when the salt changes", () => {
  assert.notEqual(
    createVisitorId("203.0.113.4", desktopChromeUserAgent, "salt-one"),
    createVisitorId("203.0.113.4", desktopChromeUserAgent, "salt-two"),
  );
});