import assert from "node:assert/strict";
import test from "node:test";
import { signUnlockCookie, verifyUnlockCookie } from "./unlock-cookie";

const code = "secret-link";
const passwordHash = "$2b$10$stored-bcrypt-hash";
const secret = "application-secret";
const validCookie = signUnlockCookie(code, passwordHash, secret);

test("verifies a correctly signed unlock cookie", () => {
  assert.equal(verifyUnlockCookie(code, passwordHash, validCookie, secret), true);
});

test("rejects a tampered unlock cookie", () => {
  const tampered = `${validCookie.slice(0, -1)}${validCookie.endsWith("0") ? "1" : "0"}`;
  assert.equal(verifyUnlockCookie(code, passwordHash, tampered, secret), false);
});

test("rejects a cookie signed for a different code", () => {
  assert.equal(verifyUnlockCookie("another-code", passwordHash, validCookie, secret), false);
});

test("rejects a cookie signed for a changed password hash", () => {
  assert.equal(
    verifyUnlockCookie(code, "changed-password-hash", validCookie, secret),
    false,
  );
});