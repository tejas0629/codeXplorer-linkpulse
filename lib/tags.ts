// Owner: Milan | Task: MIL-P2-2 | Priority: P2
import "server-only";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-response";
import { isAdmin, type SessionUser } from "@/lib/rbac";
import type { TagListResponse } from "@/types/api";

// Same limits as tagNames on link create and update in lib/validation.ts, so
// tags created here match tags created while saving a link.
export const createTagSchema = z.object({
  name: z
    .string({ message: "Tag name is required" })
    .trim()
    .min(1, "Tag name is required")
    .max(30, "Tag name cannot exceed 30 characters"),
});

export interface CreateTagResult {
  id: string;
  name: string;
  createdAt: string;
}

/**
 * Creates a tag owned by the signed-in user. Names are unique per owner.
 * Tags are attached to links through POST and PATCH /api/links (tagNames).
 */
export async function createTag(user: SessionUser, input: unknown): Promise<CreateTagResult> {
  const data = createTagSchema.parse(input);

  const existing = await db.tag.findUnique({
    where: { ownerId_name: { ownerId: user.id, name: data.name } },
    select: { id: true },
  });
  if (existing) {
    throw tagExists();
  }

  try {
    const tag = await db.tag.create({
      data: { name: data.name, ownerId: user.id },
      select: { id: true, name: true, createdAt: true },
    });
    return { ...tag, createdAt: tag.createdAt.toISOString() };
  } catch (err: unknown) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      throw tagExists();
    }
    throw err;
  }
}

/**
 * Lists the user's own tags, or every tag for an admin.
 */
export async function listTags(user: SessionUser): Promise<TagListResponse> {
  return db.tag.findMany({
    where: isAdmin(user) ? {} : { ownerId: user.id },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
}

function tagExists(): ApiError {
  return new ApiError("TAG_EXISTS", "You already have a tag with this name", 409, {
    name: "You already have a tag with this name",
  });
}
