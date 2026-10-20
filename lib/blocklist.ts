// Owner: Milan | Task: MIL-P2-5 | Priority: P2
import "server-only";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-response";
import type { SessionUser } from "@/lib/rbac";
import type {
  AdminBlocklistResponse,
  CreateBlocklistResponse,
  DeleteBlocklistResponse,
} from "@/types/api";

// Callers must have passed requireAdmin() before using anything in this file.
// Blocking "example.com" also blocks its subdomains: link creation checks every
// parent domain through getDomainCandidates in lib/validation.ts.

const LABEL = /^(?!-)[a-z0-9-]{1,63}(?<!-)$/;
const TLD = /^(?:[a-z]{2,63}|xn--[a-z0-9-]{1,59})$/;

/**
 * Normalizes an admin-entered domain to a bare lowercase hostname.
 * Accepts "Example.com", "example.com." or a full URL such as
 * "https://example.com/path". Returns null when it is not a valid domain name.
 */
export function normalizeDomain(input: unknown): string | null {
  if (typeof input !== "string") return null;
  let value = input.trim().toLowerCase();
  if (!value || value.length > 2048) return null;

  if (value.includes("://")) {
    try {
      value = new URL(value).hostname;
    } catch {
      return null;
    }
  }

  value = value.replace(/\.+$/, "");
  if (value.length < 3 || value.length > 253) return null;

  const labels = value.split(".");
  if (labels.length < 2) return null;
  if (!labels.every((label) => LABEL.test(label))) return null;
  if (!TLD.test(labels[labels.length - 1])) return null;

  return value;
}

export async function listBlockedDomains(): Promise<AdminBlocklistResponse> {
  const rows = await db.blockedDomain.findMany({
    select: { id: true, domain: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });
  return rows.map((r) => ({ ...r, createdAt: r.createdAt.toISOString() }));
}

export async function addBlockedDomain(
  admin: SessionUser,
  input: unknown
): Promise<CreateBlocklistResponse> {
  const raw = input && typeof input === "object" ? (input as { domain?: unknown }).domain : undefined;
  const domain = normalizeDomain(raw);
  if (!domain) {
    throw new ApiError("INVALID_DOMAIN", "Enter a valid domain such as example.com", 400, {
      domain: "Enter a valid domain such as example.com",
    });
  }

  const existing = await db.blockedDomain.findFirst({
    where: { domain: { equals: domain, mode: "insensitive" } },
    select: { id: true },
  });
  if (existing) {
    throw domainExists();
  }

  try {
    const row = await db.blockedDomain.create({
      data: { domain, addedById: admin.id },
      select: { id: true, domain: true, createdAt: true },
    });
    return { ...row, createdAt: row.createdAt.toISOString() };
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw domainExists();
    }
    throw err;
  }
}

export async function removeBlockedDomain(id: string): Promise<DeleteBlocklistResponse> {
  const existing = await db.blockedDomain.findUnique({ where: { id }, select: { id: true } });
  if (!existing) {
    throw new ApiError("NOT_FOUND", "Blocked domain not found", 404);
  }
  await db.blockedDomain.delete({ where: { id } });
  return { id, deleted: true };
}

function domainExists(): ApiError {
  return new ApiError("DOMAIN_EXISTS", "This domain is already blocked", 409, {
    domain: "This domain is already blocked",
  });
}
