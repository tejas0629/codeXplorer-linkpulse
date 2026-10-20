// Owner: Tejas | Task: TEJ-P1-1 | Priority: P1
import "server-only";
import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  DIRECT_URL: z.string().min(1, "DIRECT_URL is required"),
  AUTH_SECRET: z.string().min(1, "AUTH_SECRET is required"),
  AUTH_URL: z.string().url("AUTH_URL must be a valid URL"),
  AUTH_GOOGLE_ID: z.string().min(1, "AUTH_GOOGLE_ID is required"),
  AUTH_GOOGLE_SECRET: z.string().min(1, "AUTH_GOOGLE_SECRET is required"),
  UPSTASH_REDIS_REST_URL: z.string().url("UPSTASH_REDIS_REST_URL must be a valid URL"),
  UPSTASH_REDIS_REST_TOKEN: z.string().min(1, "UPSTASH_REDIS_REST_TOKEN is required"),
  NEXT_PUBLIC_APP_URL: z.string().url("NEXT_PUBLIC_APP_URL must be a valid URL"),
  NEXT_PUBLIC_USE_MOCKS: z.enum(["true", "false"]).default("false").optional(),
});

export type Env = z.infer<typeof envSchema>;

let cachedEnv: Env | null = null;
let missingProductionVisitorSaltReported = false;

const FALLBACK_VISITOR_SALT = "linkpulse-development-visitor-salt";

export function getEnv(): Env {
  if (cachedEnv) {
    return cachedEnv;
  }

  if (process.env.SKIP_ENV_VALIDATION === "1") {
    cachedEnv = process.env as unknown as Env;
    return cachedEnv;
  }

  const result = envSchema.safeParse(process.env);
  if (!result.success) {
    console.error("Invalid environment variables:", result.error.format());
    throw new Error("Invalid environment variables");
  }

  cachedEnv = result.data;
  return cachedEnv;
}

export function getVisitorSalt(): string {
  const salt = process.env.VISITOR_SALT;
  if (salt !== undefined && salt.length >= 16) {
    return salt;
  }

  if (process.env.NODE_ENV === "production" && !missingProductionVisitorSaltReported) {
    console.error("VISITOR_SALT is missing or invalid; using a fallback visitor salt.");
    missingProductionVisitorSaltReported = true;
  }

  return FALLBACK_VISITOR_SALT;
}
