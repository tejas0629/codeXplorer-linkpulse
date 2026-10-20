// Owner: Chirag | Task: CHI-P1-4, CHI-P1-5, CHI-P1-6 | Priority: P1
import "server-only";
import bcrypt from "bcryptjs";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-response";
import { assertRateLimit, createLinkLimiter, checkLimiter } from "@/lib/rate-limit";
import { isAliasAvailable, createUniqueCode, validateAlias, normalizeCode } from "@/lib/shortcode";
import { parseBody, parseQuery, createLinkSchema, updateLinkSchema, listLinksQuerySchema, checkLinkQuerySchema, assertDomainNotBlocked, validateUrl } from "@/lib/validation";
import type { SessionUser, LinkDetailResponse, LinkListItem, DeleteLinkResponse, CheckLinkResponse, PaginationMeta } from "@/types/api";
import type { Prisma, LinkStatus } from "@prisma/client";

interface LinkWithTags {
  id: string;
  code: string;
  destinationUrl: string;
  ownerId: string;
  campaignId: string | null;
  status: LinkStatus;
  expiresAt: Date | null;
  maxClicks: number | null;
  clickCount: number;
  passwordHash: string | null;
  mobileUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
  tags?: Array<{
    tag: {
      name: string;
    };
  }>;
}

function formatLinkDetail(link: LinkWithTags): LinkDetailResponse {
  return {
    id: link.id,
    code: link.code,
    destinationUrl: link.destinationUrl,
    ownerId: link.ownerId,
    campaignId: link.campaignId ?? null,
    status: link.status,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    maxClicks: link.maxClicks ?? null,
    clickCount: link.clickCount ?? 0,
    hasPassword: Boolean(link.passwordHash),
    mobileUrl: link.mobileUrl ?? null,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    tags: link.tags ? link.tags.map((t) => t.tag.name) : [],
  };
}

/**
 * Creates a new shortened link with rate limiting, validation, domain check,
 * alias resolution, P2002 race protection, and per-owner tag associations.
 */
export async function createLink(
  user: SessionUser,
  input: unknown
): Promise<LinkDetailResponse> {
  // 1. Enforce per-user sliding window rate limit
  await assertRateLimit(user.id, createLinkLimiter);

  // 2. Validate input schema
  const data = parseBody(createLinkSchema, input);

  // 3. Domain blocklist verification
  await assertDomainNotBlocked(data.destinationUrl);
  if (data.mobileUrl) {
    await assertDomainNotBlocked(data.mobileUrl);
  }

  // 4. Resolve short code / custom alias
  const requestedCode = data.code || data.alias;
  let finalCode: string;

  if (requestedCode) {
    const normalized = normalizeCode(requestedCode);
    const available = await isAliasAvailable(normalized);
    if (!available) {
      throw new ApiError(
        "ALIAS_TAKEN",
        "The requested alias is already taken",
        409,
        { alias: "Alias is already in use" }
      );
    }
    finalCode = normalized;
  } else {
    finalCode = await createUniqueCode(async (candidate) => {
      const isAvailable = await isAliasAvailable(candidate);
      return !isAvailable;
    });
  }

  // 5. Hash password if provided
  let passwordHash: string | null = null;
  if (data.password) {
    passwordHash = await bcrypt.hash(data.password, 10);
  }

  // 6. Upsert tags per owner (scoped to user.id + name)
  const tagRecords: { id: string }[] = [];
  if (data.tagNames && data.tagNames.length > 0) {
    const uniqueTagNames = Array.from(
      new Set(data.tagNames.map((t) => t.trim()).filter(Boolean))
    );
    for (const tagName of uniqueTagNames) {
      const tag = await db.tag.upsert({
        where: {
          ownerId_name: {
            ownerId: user.id,
            name: tagName,
          },
        },
        create: {
          ownerId: user.id,
          name: tagName,
        },
        update: {},
        select: { id: true },
      });
      tagRecords.push(tag);
    }
  }

  // 7. Verify campaign ownership if campaignId provided
  if (data.campaignId) {
    const campaign = await db.campaign.findFirst({
      where: {
        id: data.campaignId,
        ...(user.role === "ADMIN" ? {} : { ownerId: user.id }),
      },
      select: { id: true },
    });
    if (!campaign) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Specified campaign does not exist or does not belong to you",
        400,
        { campaignId: "Campaign not found" }
      );
    }
  }

  // 8. Create link record with P2002 race conflict handling
  try {
    const link = await db.link.create({
      data: {
        code: finalCode,
        destinationUrl: data.destinationUrl,
        ownerId: user.id,
        campaignId: data.campaignId ?? null,
        status: "ACTIVE",
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
        maxClicks: data.maxClicks ?? data.clickLimit ?? null,
        passwordHash,
        mobileUrl: data.mobileUrl ?? null,
        tags:
          tagRecords.length > 0
            ? {
              create: tagRecords.map((t) => ({
                tag: { connect: { id: t.id } },
              })),
            }
            : undefined,
      },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
      },
    });

    return formatLinkDetail(link);
  } catch (err: unknown) {
    const prismaError = err as { code?: string };
    if (prismaError?.code === "P2002") {
      throw new ApiError(
        "ALIAS_TAKEN",
        "The requested alias is already taken",
        409,
        { alias: "Alias is already in use" }
      );
    }
    throw err;
  }
}

/**
 * Lists shortened links with filters, pagination, and ownership enforcement.
 * Regular users see only their own links; administrators see all links.
 * Soft-deleted links (deletedAt != null) are always excluded.
 */
export async function listLinks(
  user: SessionUser,
  queryParams: unknown
): Promise<{ links: LinkListItem[]; meta: PaginationMeta }> {
  const query = parseQuery(
    listLinksQuerySchema,
    queryParams as URLSearchParams | Record<string, unknown>
  );
  const page = query.page ?? 1;
  const pageSize = query.pageSize ?? 20;
  const skip = (page - 1) * pageSize;

  const where: Prisma.LinkWhereInput = {
    deletedAt: null,
  };

  // Regular users see only their own links; Admins see all
  if (user.role !== "ADMIN") {
    where.ownerId = user.id;
  }

  if (query.status) {
    where.status = query.status;
  }

  if (query.campaignId) {
    where.campaignId = query.campaignId;
  }

  if (query.tag) {
    where.tags = {
      some: {
        tag: {
          name: {
            equals: query.tag,
            mode: "insensitive",
          },
        },
      },
    };
  }

  if (query.search) {
    where.OR = [
      { destinationUrl: { contains: query.search, mode: "insensitive" } },
      { code: { contains: query.search, mode: "insensitive" } },
    ];
  }

  const [links, total] = await Promise.all([
    db.link.findMany({
      where,
      skip,
      take: pageSize,
      orderBy: { createdAt: "desc" },
      include: {
        tags: {
          include: {
            tag: true,
          },
        },
        campaign: true,
      },
    }),
    db.link.count({ where }),
  ]);

  const totalPages = Math.ceil(total / pageSize) || (total === 0 ? 0 : 1);

  const items: LinkListItem[] = links.map((link) => ({
    id: link.id,
    code: link.code,
    destinationUrl: link.destinationUrl,
    ownerId: link.ownerId,
    campaignId: link.campaignId ?? null,
    status: link.status,
    expiresAt: link.expiresAt ? link.expiresAt.toISOString() : null,
    maxClicks: link.maxClicks ?? null,
    clickCount: link.clickCount,
    hasPassword: Boolean(link.passwordHash),
    mobileUrl: link.mobileUrl ?? null,
    createdAt: link.createdAt.toISOString(),
    updatedAt: link.updatedAt.toISOString(),
    tags: link.tags.map((t) => t.tag.name),
  }));

  return {
    links: items,
    meta: {
      page,
      pageSize,
      total,
      totalPages,
    },
  };
}

/**
 * Retrieves a single link by ID.
 * Excludes soft-deleted links.
 * Non-owners receive 404 (not 403) to prevent ID enumeration and leaking existence.
 */
export async function getLink(
  user: SessionUser,
  id: string
): Promise<LinkDetailResponse> {
  const link = await db.link.findFirst({
    where: {
      id,
      deletedAt: null,
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!link) {
    throw new ApiError("LINK_NOT_FOUND", "Link not found", 404);
  }

  // Security rule: Non-owner gets 404 (not 403) to avoid leaking the existence of other users' links
  if (user.role !== "ADMIN" && link.ownerId !== user.id) {
    throw new ApiError("LINK_NOT_FOUND", "Link not found", 404);
  }

  return formatLinkDetail(link);
}

/**
 * Updates link properties. Re-validates destination URL against blocked domains.
 * Enforces ownership and status rules (owners cannot re-enable ADMIN_DISABLED links).
 */
export async function updateLink(
  user: SessionUser,
  id: string,
  input: unknown
): Promise<LinkDetailResponse> {
  const data = parseBody(updateLinkSchema, input);

  const existing = await db.link.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existing) {
    throw new ApiError("LINK_NOT_FOUND", "Link not found", 404);
  }

  // Security rule: Non-owner gets 404 (not 403) to avoid leaking the existence of other users' links
  if (user.role !== "ADMIN" && existing.ownerId !== user.id) {
    throw new ApiError("LINK_NOT_FOUND", "Link not found", 404);
  }

  // Status transition security checks
  if (data.status) {
    if (existing.status === "ADMIN_DISABLED" && user.role !== "ADMIN") {
      throw new ApiError(
        "FORBIDDEN",
        "This link was disabled by an administrator and can only be re-enabled by an admin.",
        403
      );
    }

    if (
      user.role !== "ADMIN" &&
      data.status !== "ACTIVE" &&
      data.status !== "DISABLED"
    ) {
      throw new ApiError(
        "FORBIDDEN",
        "Owners can only set link status to ACTIVE or DISABLED",
        403
      );
    }
  }

  // Re-verify blocked destination domains on change
  if (data.destinationUrl) {
    await assertDomainNotBlocked(data.destinationUrl);
  }

  if (data.mobileUrl) {
    await assertDomainNotBlocked(data.mobileUrl);
  }

  // Password hashing
  let passwordHashUpdate: string | null | undefined = undefined;
  if (data.password !== undefined) {
    if (data.password === null || data.password === "") {
      passwordHashUpdate = null;
    } else {
      passwordHashUpdate = await bcrypt.hash(data.password, 10);
    }
  }

  // Update tags if tagNames array provided
  if (data.tagNames !== undefined) {
    const uniqueTagNames = Array.from(
      new Set(data.tagNames.map((t) => t.trim()).filter(Boolean))
    );
    const tagRecords: { id: string }[] = [];

    for (const tagName of uniqueTagNames) {
      const tag = await db.tag.upsert({
        where: {
          ownerId_name: {
            ownerId: existing.ownerId,
            name: tagName,
          },
        },
        create: {
          ownerId: existing.ownerId,
          name: tagName,
        },
        update: {},
        select: { id: true },
      });
      tagRecords.push(tag);
    }

    await db.linkTag.deleteMany({
      where: { linkId: id },
    });

    if (tagRecords.length > 0) {
      await db.linkTag.createMany({
        data: tagRecords.map((t) => ({
          linkId: id,
          tagId: t.id,
        })),
      });
    }
  }

  // Campaign ownership check if updating campaign
  if (data.campaignId) {
    const campaign = await db.campaign.findFirst({
      where: {
        id: data.campaignId,
        ...(user.role === "ADMIN" ? {} : { ownerId: user.id }),
      },
      select: { id: true },
    });
    if (!campaign) {
      throw new ApiError(
        "VALIDATION_ERROR",
        "Specified campaign does not exist or does not belong to you",
        400,
        { campaignId: "Campaign not found" }
      );
    }
  }

  const updated = await db.link.update({
    where: { id },
    data: {
      ...(data.destinationUrl !== undefined && {
        destinationUrl: data.destinationUrl,
      }),
      ...(data.status !== undefined && { status: data.status }),
      ...(data.expiresAt !== undefined && {
        expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      }),
      ...(data.maxClicks !== undefined || data.clickLimit !== undefined
        ? { maxClicks: data.maxClicks ?? data.clickLimit ?? null }
        : {}),
      ...(passwordHashUpdate !== undefined && {
        passwordHash: passwordHashUpdate,
      }),
      ...(data.mobileUrl !== undefined && { mobileUrl: data.mobileUrl }),
      ...(data.campaignId !== undefined && { campaignId: data.campaignId }),
    },
    include: {
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  return formatLinkDetail(updated);
}

/**
 * Soft-deletes a link by setting deletedAt to current timestamp.
 * Preserves click events and code reservation.
 * Non-owners receive 404 (not 403) to avoid leaking existence.
 */
export async function softDeleteLink(
  user: SessionUser,
  id: string
): Promise<DeleteLinkResponse> {
  const existing = await db.link.findFirst({
    where: {
      id,
      deletedAt: null,
    },
  });

  if (!existing) {
    throw new ApiError("LINK_NOT_FOUND", "Link not found", 404);
  }

  // Security rule: Non-owner gets 404 (not 403) to avoid leaking the existence of other users' links
  if (user.role !== "ADMIN" && existing.ownerId !== user.id) {
    throw new ApiError("LINK_NOT_FOUND", "Link not found", 404);
  }

  await db.link.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  return {
    id,
    deleted: true,
  };
}

/**
 * Performs a pre-flight live check for alias availability and domain status.
 * Rate limited lightly with checkLimiter.
 */
export async function checkLink(
  queryParams: unknown,
  userId: string = "anonymous"
): Promise<CheckLinkResponse> {
  // 1. Rate limiting
  await assertRateLimit(userId, checkLimiter);

  // 2. Query parsing and parameter validation
  const query = parseQuery(
    checkLinkQuerySchema,
    queryParams as URLSearchParams | Record<string, unknown>
  );

  if (!query.alias && !query.url) {
    throw new ApiError(
      "VALIDATION_ERROR",
      "At least one of 'alias' or 'url' query parameter must be provided",
      400,
      { query: "At least one of 'alias' or 'url' query parameter must be provided" }
    );
  }

  // 3. Alias availability evaluation
  let aliasAvailable = true;
  let aliasError: string | undefined = undefined;

  if (query.alias) {
    const validation = validateAlias(query.alias);
    if (!validation.ok) {
      aliasAvailable = false;
      aliasError = validation.message;
    } else {
      const normalized = normalizeCode(query.alias);
      aliasAvailable = await isAliasAvailable(normalized);
      if (!aliasAvailable) {
        aliasError = "The requested alias is already taken";
      }
    }
  }

  // 4. URL validity and domain blocklist check
  let urlValid = true;
  let urlError: string | undefined = undefined;
  let domainBlocked = false;

  if (query.url) {
    urlValid = validateUrl(query.url);
    if (!urlValid) {
      urlError = "Destination URL must be a valid http or https address";
    } else {
      try {
        await assertDomainNotBlocked(query.url);
      } catch (err: unknown) {
        if (err instanceof ApiError && err.code === "BLOCKED_DOMAIN") {
          domainBlocked = true;
          urlError = err.message;
        } else {
          throw err;
        }
      }
    }
  }

  // 5. Risk score evaluation if implemented in lib/risk.ts (CHI-P2-3)
  let risk: "LOW" | "MEDIUM" | "HIGH" | undefined = undefined;
  if (query.url && urlValid) {
    try {
      const riskModule = await import("@/lib/risk");
      if (typeof riskModule.calculateRiskScore === "function") {
        risk = await riskModule.calculateRiskScore(query.url);
      }
    } catch {
      // Risk scoring is planned under CHI-P2-3 and safely omitted until implemented
      risk = undefined;
    }
  }

  return {
    aliasAvailable,
    ...(aliasError ? { aliasError } : {}),
    urlValid,
    ...(urlError ? { urlError } : {}),
    domainBlocked,
    ...(risk ? { risk, riskScore: risk } : {}),
    warnings: [],
  };
}
