import assert from "node:assert/strict";
import test from "node:test";
import { selectRedirectDestination } from "./destination";

const destinationUrl = "https://example.com/desktop";
const mobileUrl = "https://m.example.com/mobile";

test("selects mobile URL for mobile devices when one is configured", () => {
  assert.equal(
    selectRedirectDestination("mobile", destinationUrl, mobileUrl),
    mobileUrl,
  );
});

test("uses the default URL for mobile devices without a mobile URL", () => {
  assert.equal(selectRedirectDestination("mobile", destinationUrl, null), destinationUrl);
});

test("uses the default URL for desktop devices even when a mobile URL exists", () => {
  assert.equal(selectRedirectDestination("desktop", destinationUrl, mobileUrl), destinationUrl);
});

test("uses the default URL for tablet devices", () => {
  assert.equal(selectRedirectDestination("tablet", destinationUrl, mobileUrl), destinationUrl);
});