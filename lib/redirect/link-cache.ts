export type LinkCacheClient = {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, options: { ex: number }): Promise<unknown>;
  del(key: string): Promise<unknown>;
};

export type LinkCache<T> = {
  get(code: string): Promise<T | null>;
  set(code: string, value: T): Promise<void>;
  invalidate(code: string): Promise<void>;
};

const CACHE_TIMEOUT_MS = 150;
const CACHE_TTL_SECONDS = 30;

function withTimeout<T>(operation: Promise<T>): Promise<T> {
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeout = setTimeout(() => reject(new Error("Redis cache timed out")), CACHE_TIMEOUT_MS);
  });

  return Promise.race([operation, timeoutPromise]).finally(() => {
    if (timeout !== undefined) clearTimeout(timeout);
  });
}

function reviveDates(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(reviveDates);
  }
  if (value !== null && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, reviveDates(entry)]),
    );
  }
  if (typeof value === "string" && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value)) {
    return new Date(value);
  }
  return value;
}

export function createLinkCache<T>(
  client: LinkCacheClient | null,
  ttlSeconds = CACHE_TTL_SECONDS,
): LinkCache<T> {
  return {
    async get(code) {
      if (client === null) return null;
      try {
        const value = await withTimeout(client.get(`link:${code.toLowerCase()}`));
        if (value === null) return null;
        return reviveDates(JSON.parse(value)) as T;
      } catch {
        return null;
      }
    },
    async set(code, value) {
      if (client === null) return;
      try {
        await withTimeout(
          client.set(`link:${code.toLowerCase()}`, JSON.stringify(value), {
            ex: ttlSeconds,
          }),
        );
      } catch {
        // Cache writes are best effort; the database remains authoritative.
      }
    },
    async invalidate(code) {
      if (client === null) return;
      try {
        await withTimeout(client.del(`link:${code.toLowerCase()}`));
      } catch {
        // Cache invalidation is best effort; entries expire after a short TTL.
      }
    },
  };
}

export async function getWithCache<T>(
  cache: Pick<LinkCache<T>, "get" | "set">,
  code: string,
  lookupDatabase: () => Promise<T | null>,
): Promise<T | null> {
  const cached = await cache.get(code);
  if (cached !== null) return cached;

  const value = await lookupDatabase();
  if (value !== null) await cache.set(code, value);
  return value;
}