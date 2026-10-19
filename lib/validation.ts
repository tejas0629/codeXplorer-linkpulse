// Owner: Chirag | Task: CHI-P1-2 | Priority: P1
import "server-only";
import { z } from "zod";

export const createLinkSchema = z.object({
  destinationUrl: z.string().url("Must be a valid URL"),
  code: z
    .string()
    .min(3, "Alias must be at least 3 characters")
    .max(64, "Alias cannot exceed 64 characters")
    .regex(/^[a-zA-Z0-9_-]+$/, "Alias can only contain letters, numbers, hyphens, and underscores")
    .optional(),
  campaignId: z.string().cuid().nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  maxClicks: z.number().int().positive().nullable().optional(),
  password: z.string().min(1).max(72).nullable().optional(),
  mobileUrl: z.string().url().nullable().optional(),
  tagNames: z.array(z.string().min(1).max(30)).optional(),
});

export const updateLinkSchema = createLinkSchema.partial().extend({
  status: z.enum(["ACTIVE", "DISABLED"]).optional(),
});

// TODO (CHI-P1-2): Validate destination URL format, protocols, and against blocked domains
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}
