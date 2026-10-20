import assert from "node:assert/strict";
import test from "node:test";
import { createLinkCache, getWithCache, type LinkCacheClient } from "./link-cache";

type CachedLink = { createdAt: Date; expiresAt: Date | null };
const cachedValue: CachedLink = {
  createdAt: new Date("2026-10-20T12:00:00.000Z"),
  expiresAt: new Date("2026-11-01T00:00:00.000Z"),
};

function fakeClient(
  initialValue: string | null = null,
  shouldReject = false,
): LinkCacheClient & { entries: Map<string, string> } {
  const entries = new Map<string, string>();
  if (initialValue !== null) entries.set("link:demo", initialValue);
  return {
    entries,
    async get(key) {
      if (shouldReject) throw new Error("redis unavailable");
      return entries.get(key) ?? null;
    },
    async set(key, value) {
      if (shouldReject) throw new Error("redis unavailable");
      entries.set(key, value);
    },
    async del(key) {
      if (shouldReject) throw new Error("redis unavailable");
      entries.delete(key);
    },
  };
}

test("no-op cache always misses and safely ignores writes and invalidation", async () => {
  const cache = createLinkCache<CachedLink>(null);
  await cache.set("demo", cachedValue);
  await cache.invalidate("demo");
  assert.equal(await cache.get("demo"), null);
});

test("returns a cached hit and revives date fields", async () => {
  const client = fakeClient(JSON.stringify(cachedValue));
  const cache = createLinkCache<CachedLink>(client);

  const result = await cache.get("DEMO");
  assert.deepEqual(result, cachedValue);
  assert.ok(result?.createdAt instanceof Date);
  assert.ok(result?.expiresAt instanceof Date);
});

test("database miss is cached for future requests", async () => {
  const client = fakeClient();
  const cache = createLinkCache<CachedLink>(client);
  let databaseReads = 0;
  const lookupDatabase = async () => {
    databaseReads += 1;
    return cachedValue;
  };

  assert.deepEqual(await getWithCache(cache, "demo", lookupDatabase), cachedValue);
  assert.deepEqual(await getWithCache(cache, "demo", lookupDatabase), cachedValue);
  assert.equal(databaseReads, 1);
});

test("Redis errors fail open to the database", async () => {
  const cache = createLinkCache<CachedLink>(fakeClient(null, true));
  let databaseReads = 0;

  const result = await getWithCache(cache, "demo", async () => {
    databaseReads += 1;
    return cachedValue;
  });

  assert.deepEqual(result, cachedValue);
  assert.equal(databaseReads, 1);
});

test("database not-found result is never cached", async () => {
  const client = fakeClient();
  const cache = createLinkCache<CachedLink>(client);

  assert.equal(await getWithCache(cache, "demo", async () => null), null);
  assert.equal(client.entries.size, 0);
});