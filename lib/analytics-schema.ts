// Owner: Chirag | Task: CHI-P1-8 | Priority: P1
import { z } from "zod";

const booleanPreprocess = z.preprocess((val) => {
  if (typeof val === "boolean") return val;
  if (typeof val === "string") {
    const lower = val.trim().toLowerCase();
    if (lower === "true" || lower === "1") return true;
    if (lower === "false" || lower === "0") return false;
  }
  return false;
}, z.boolean());

export const analyticsQuerySchema = z.object({
  period: z
    .enum(["7d", "30d", "90d"], {
      message: "Period must be one of: 7d, 30d, 90d",
    })
    .default("30d"),
  from: z
    .string()
    .datetime({ message: "From date must be a valid ISO datetime string" })
    .optional(),
  to: z
    .string()
    .datetime({ message: "To date must be a valid ISO datetime string" })
    .optional(),
  includeBots: booleanPreprocess.default(false),
  campaignId: z
    .string()
    .cuid({ message: "Invalid campaign ID format" })
    .optional(),
  linkId: z
    .string()
    .cuid({ message: "Invalid link ID format" })
    .optional(),
  limit: z.coerce
    .number()
    .int("Limit must be an integer")
    .positive("Limit must be positive")
    .max(50, "Limit cannot exceed 50")
    .default(10),
});

export type AnalyticsQueryInput = z.infer<typeof analyticsQuerySchema>;
