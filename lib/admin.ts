// Owner: Milan | Task: MIL-P1-5, MIL-P1-6 | Priority: P1
import "server-only";
import { z } from "zod";
import type { LinkStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ApiError, type PaginationMeta } from "@/lib/api-response";
import { invalidateCachedLink } from "@/lib/cache";
import type { AdminLinkItem, AdminToggleLinkResponse, AdminUserItem } from "@/types/api";

// Callers must have passed requireAdmin() before using anything in this file.

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1, "Page must be 1 or greater").default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1, "Page size must be between 1 and 100")
    .max(100, "Page size must be between 1 and 100")
    .default(20),
  search: z
    .string()
    .trim()
    .max(200, "Search cannot exceed 200 characters")
    .optional()
    .transform((val) => val || undefined),
});

export const adminUsersQuerySchema = paginationSchema;

export const adminLinksQuerySchema = paginationSchema.extend({
  status: z
    .enum(["ACTIVE", "DISABLED", "ADMIN_DISABLED"], {
      message: "Status must be ACTIVE, DISABLED or ADMIN_DISABLED",
    })
    .optional()
    .or(z.literal("").transform(() => undefined)),
});

function queryObject(searchParams: URLSearchParams): Record<string, string> {
  // Only the first value of each key is used; unknown keys are ignored.
  const out: Record<string, string> = {};
  for (const key of ["page", "pageSize", "search", "status"]) {
    const value = searchParams.get(key);
    if (value !== null) out[key] = value;
  }
  return out;
}

export async function listAdminUsers(
  searchParams: URLSearchParams
): Promise<{ users: AdminUserItem[]; meta: PaginationMeta }> {
  const { page, pageSize, search } = adminUsersQuerySchema.parse(queryObject(searchParams));

  const where: Prisma.UserWhereInput = search
    ? {
        OR: [
          { email: { contains: search, mode: "insensitive" } },
          { name: { contains: search, mode: "insensitive" } },
        ],
      }
    : {};

  const [rows, total] = await Promise.all([
    db.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
        _count: { select: { links: { where: { deletedAt: null } } } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.user.count({ where }),
  ]);

  return {
    users: rows.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      linksCount: u._count.links,
      createdAt: u.createdAt.toISOString(),
    })),
    meta: { page, pageSize, total },
  };
}

export async function listAdminLinks(
  searchParams: URLSearchParams
): Promise<{ links: AdminLinkItem[]; meta: PaginationMeta }> {
  const { page, pageSize, search, status } = adminLinksQuerySchema.parse(
    queryObject(searchParams)
  );

  // Soft-deleted links are excluded, matching GET /api/links.
  const where: Prisma.LinkWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search, mode: "insensitive" } },
            { destinationUrl: { contains: search, mode: "insensitive" } },
            { owner: { email: { contains: search, mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [rows, total] = await Promise.all([
    db.link.findMany({
      where,
      select: {
        id: true,
        code: true,
        destinationUrl: true,
        status: true,
        clickCount: true,
        createdAt: true,
        owner: { select: { email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    db.link.count({ where }),
  ]);

  return {
    links: rows.map((l) => ({
      id: l.id,
      code: l.code,
      destinationUrl: l.destinationUrl,
      ownerEmail: l.owner.email,
      status: l.status,
      clickCount: l.clickCount,
      createdAt: l.createdAt.toISOString(),
    })),
    meta: { page, pageSize, total },
  };
}

async function setLinkStatus(id: string, status: LinkStatus) {
  const link = await db.link.findFirst({
    where: { id, deletedAt: null },
    select: { id: true },
  });
  if (!link) {
    throw new ApiError("LINK_NOT_FOUND", "Link not found", 404);
  }

  return db.link.update({
    where: { id },
    data: { status },
    select: { id: true, code: true, status: true },
  });
}

/**
 * Drops the cached redirect entry so the new status applies on the next visit.
 * Returns false instead of throwing when the cache is unavailable: the status
 * change is already saved, and the response reports the real outcome.
 */
async function tryInvalidateCache(code: string): Promise<boolean> {
  try {
    await invalidateCachedLink(code);
    return true;
  } catch (err: unknown) {
    console.warn(
      "[admin] Redirect cache invalidation failed:",
      err instanceof Error ? err.message : "unknown error"
    );
    return false;
  }
}

/**
 * Sets ADMIN_DISABLED. Owners cannot re-enable this status (enforced in
 * lib/links.ts updateLink); only enableLinkAsAdmin can.
 */
export async function disableLinkAsAdmin(id: string): Promise<AdminToggleLinkResponse> {
  const link = await setLinkStatus(id, "ADMIN_DISABLED");
  const cacheInvalidated = await tryInvalidateCache(link.code);
  return { id: link.id, status: link.status, cacheInvalidated };
}

/**
 * Sets ACTIVE from DISABLED or ADMIN_DISABLED (idempotent when already ACTIVE).
 */
export async function enableLinkAsAdmin(id: string): Promise<AdminToggleLinkResponse> {
  const link = await setLinkStatus(id, "ACTIVE");
  await tryInvalidateCache(link.code);
  return { id: link.id, status: link.status };
}
