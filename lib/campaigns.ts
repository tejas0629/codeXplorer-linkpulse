// Owner: Milan | Task: MIL-P2-1 | Priority: P2
import "server-only";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-response";
import { canAccessOwnedResource, isAdmin, type SessionUser } from "@/lib/rbac";
import type {
  CampaignDetailResponse,
  CampaignListResponse,
  DeleteCampaignResponse,
} from "@/types/api";

const nameSchema = z
  .string({ message: "Campaign name is required" })
  .trim()
  .min(1, "Campaign name is required")
  .max(100, "Campaign name cannot exceed 100 characters");

// Empty or whitespace-only descriptions are stored as null.
const descriptionSchema = z
  .string()
  .trim()
  .max(500, "Description cannot exceed 500 characters")
  .nullable()
  .optional()
  .transform((val) => (val === undefined ? undefined : val || null));

export const createCampaignSchema = z.object({
  name: nameSchema,
  description: descriptionSchema,
});

export const updateCampaignSchema = z
  .object({
    name: nameSchema.optional(),
    description: descriptionSchema,
  })
  .refine((data) => data.name !== undefined || data.description !== undefined, {
    message: "Provide a name or description to update",
    path: ["name"],
  });

export interface UpdateCampaignResult {
  id: string;
  name: string;
  description: string | null;
  updatedAt: string;
}

export async function createCampaign(
  user: SessionUser,
  input: unknown
): Promise<CampaignDetailResponse> {
  const data = createCampaignSchema.parse(input);

  const campaign = await db.campaign.create({
    data: { name: data.name, description: data.description ?? null, ownerId: user.id },
  });

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    ownerId: campaign.ownerId,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

/**
 * Lists the user's campaigns (all campaigns for an admin) with totals.
 * Totals use the same rules as GET /api/analytics/campaigns: soft-deleted
 * links are excluded and clicks count only successful, non-bot visits.
 */
export async function listCampaigns(user: SessionUser): Promise<CampaignListResponse> {
  const campaigns = await db.campaign.findMany({
    where: isAdmin(user) ? {} : { ownerId: user.id },
    select: { id: true, name: true, description: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (campaigns.length === 0) {
    return [];
  }

  const links = await db.link.findMany({
    where: {
      campaignId: { in: campaigns.map((c) => c.id) },
      deletedAt: null,
    },
    select: {
      campaignId: true,
      _count: {
        select: { clickEvents: { where: { result: "SUCCESS", isBot: false } } },
      },
    },
  });

  const totals = new Map<string, { totalLinks: number; totalClicks: number }>();
  for (const link of links) {
    if (!link.campaignId) continue;
    const current = totals.get(link.campaignId) ?? { totalLinks: 0, totalClicks: 0 };
    current.totalLinks += 1;
    current.totalClicks += link._count.clickEvents;
    totals.set(link.campaignId, current);
  }

  return campaigns.map((c) => ({
    id: c.id,
    name: c.name,
    description: c.description,
    totalLinks: totals.get(c.id)?.totalLinks ?? 0,
    totalClicks: totals.get(c.id)?.totalClicks ?? 0,
    createdAt: c.createdAt.toISOString(),
  }));
}

/**
 * Loads a campaign and checks the caller may change it.
 * Missing campaigns are 404 NOT_FOUND; someone else's campaign is 403 FORBIDDEN.
 */
async function getOwnedCampaign(user: SessionUser, id: string) {
  const campaign = await db.campaign.findUnique({
    where: { id },
    select: { id: true, ownerId: true },
  });
  if (!campaign) {
    throw new ApiError("NOT_FOUND", "Campaign not found", 404);
  }
  if (!canAccessOwnedResource(user, campaign.ownerId)) {
    throw new ApiError("FORBIDDEN", "You do not have access to this campaign", 403);
  }
  return campaign;
}

export async function updateCampaign(
  user: SessionUser,
  id: string,
  input: unknown
): Promise<UpdateCampaignResult> {
  const data = updateCampaignSchema.parse(input);
  await getOwnedCampaign(user, id);

  const campaign = await db.campaign.update({
    where: { id },
    data: {
      ...(data.name !== undefined && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
    },
    select: { id: true, name: true, description: true, updatedAt: true },
  });

  return { ...campaign, updatedAt: campaign.updatedAt.toISOString() };
}

/**
 * Deletes the campaign row only. Its links are kept and become unassigned
 * (Link.campaignId is ON DELETE SET NULL), so no link or click history is lost.
 */
export async function deleteCampaign(
  user: SessionUser,
  id: string
): Promise<DeleteCampaignResponse> {
  await getOwnedCampaign(user, id);
  await db.campaign.delete({ where: { id } });
  return { id, deleted: true };
}
