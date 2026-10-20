import "server-only";
import { db } from "@/lib/db";
import type { LinkSnapshot } from "./rules";

export type RedirectLink = {
  id: string;
  snapshot: LinkSnapshot;
  destinationUrl: string;
  mobileUrl: string | null;
};

export async function getRedirectLink(code: string): Promise<RedirectLink | null> {
  const link = await db.link.findUnique({
    where: { code: code.toLowerCase() },
  });

  if (link === null) {
    return null;
  }

  return {
    id: link.id,
    snapshot: {
      deletedAt: link.deletedAt,
      status: link.status,
      expiresAt: link.expiresAt,
      maxClicks: link.maxClicks,
      clickCount: link.clickCount,
      passwordHash: link.passwordHash,
    },
    destinationUrl: link.destinationUrl,
    mobileUrl: link.mobileUrl,
  };
}