// Owner: Tejas | Task: TEJ-P1-8, TEJ-P2-1 | Priority: P1
import "server-only";
import { Redis } from "@upstash/redis";
import type { RedirectLink } from "@/lib/redirect/get-link";
import { createLinkCache, type LinkCacheClient } from "@/lib/redirect/link-cache";
import type { LinkSnapshot as RuleLinkInput } from "@/lib/redirect/rules";

function usableCredential(value: string | undefined): value is string {
  return value !== undefined && value.trim() !== "" && value.trim().toLowerCase() !== "dummy";
}

const hasRedisCredentials =
  usableCredential(process.env.UPSTASH_REDIS_REST_URL) &&
  usableCredential(process.env.UPSTASH_REDIS_REST_TOKEN);

const redisClient: LinkCacheClient | null = hasRedisCredentials
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

const linkCache = createLinkCache<RedirectLink>(redisClient);

export async function getCachedLink(code: string): Promise<RedirectLink | null> {
  return linkCache.get(code);
}

export async function setCachedLink(
  code: string,
  link: RedirectLink,
  ttlSeconds = 30,
): Promise<void> {
  await createLinkCache<RedirectLink>(redisClient, ttlSeconds).set(code, link);
}

export async function invalidateCachedLink(code: string): Promise<void> {
  await linkCache.invalidate(code);
}
