// Owner: Tejas | Task: TEJ-P1-8, TEJ-P2-1 | Priority: P1
import "server-only";
import type { LinkSnapshot as RuleLinkInput } from "@/lib/redirect/rules";

// TODO (TEJ-P1-8): Implement Redis cache read and set using @upstash/redis
export async function getCachedLink(code: string): Promise<RuleLinkInput | null> {
  void code;
  throw new Error("NOT_IMPLEMENTED: TEJ-P1-8");
}

export async function setCachedLink(
  code: string,
  link: RuleLinkInput,
  ttlSeconds: number = 300
): Promise<void> {
  void code;
  void link;
  void ttlSeconds;
  throw new Error("NOT_IMPLEMENTED: TEJ-P1-8");
}

// TODO (TEJ-P2-1): Implement cache invalidation on link edit or admin disable
export async function invalidateCachedLink(code: string): Promise<void> {
  void code;
  throw new Error("NOT_IMPLEMENTED: TEJ-P2-1");
}
