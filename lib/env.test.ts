import assert from "node:assert/strict";
import test from "node:test";
import { getVisitorSalt } from "./env";

const fallbackSalt = "linkpulse-development-visitor-salt";

function withEnvironment(
  values: Record<string, string | undefined>,
  run: () => void,
): void {
  const originalValues = new Map<string, string | undefined>();
  for (const key of Object.keys(values)) {
    originalValues.set(key, process.env[key]);
    const value = values[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    run();
  } finally {
    for (const [key, value] of originalValues) {
      if (value === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = value;
      }
    }
  }
}

test("returns a valid visitor salt without validating unrelated variables", () => {
  withEnvironment(
    { NODE_ENV: "development", VISITOR_SALT: "valid-visitor-salt-value" },
    () => assert.equal(getVisitorSalt(), "valid-visitor-salt-value"),
  );
});

test("uses the development fallback for a too-short visitor salt", () => {
  withEnvironment({ NODE_ENV: "development", VISITOR_SALT: "too-short" }, () => {
    assert.equal(getVisitorSalt(), fallbackSalt);
  });
});

test("uses the production fallback and logs once when visitor salt is missing", () => {
  const originalError = console.error;
  const errors: string[] = [];
  console.error = (message?: unknown) => errors.push(String(message));

  try {
    withEnvironment({ NODE_ENV: "production", VISITOR_SALT: undefined }, () => {
      assert.equal(getVisitorSalt(), fallbackSalt);
      assert.equal(getVisitorSalt(), fallbackSalt);
    });
  } finally {
    console.error = originalError;
  }

  assert.deepEqual(errors, [
    "VISITOR_SALT is missing or invalid; using a fallback visitor salt.",
  ]);
});