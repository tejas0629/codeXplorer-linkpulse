// Owner: Chirag | Task: CHI-P1-4 | Priority: P1
import "server-only";
import { ApiError } from "@/lib/api-response";
import type { SessionUser } from "@/types/api";
import type { Role } from "@prisma/client";

/**
 * Resolves the authenticated session user for link routes.
 *
 * TODO(MIL): Milan owns authentication and RBAC under MIL-P1-1 and MIL-P1-2.
 * Once requireUser() in lib/rbac.ts is implemented, replace this helper with
 * lib/rbac.ts requireUser().
 */
export async function requireUser(): Promise<SessionUser> {
  try {
    const authModule = await import("@/lib/auth");
    const session = await authModule.auth();
    if (session?.user?.id) {
      return {
        id: session.user.id,
        name: session.user.name ?? null,
        email: session.user.email ?? null,
        image: session.user.image ?? null,
        role: (session.user.role as Role) ?? "USER",
      };
    }
  } catch {
    // Auth session read failed or uninitialized, proceed to check dev fallback
  }

  // Allow fake user ONLY during development or testing when DEV_FAKE_USER_ID is explicitly provided.
  // Never enabled in production environments.
  if (process.env.NODE_ENV !== "production" && process.env.DEV_FAKE_USER_ID) {
    const role: Role =
      process.env.DEV_FAKE_USER_ROLE === "ADMIN" ? "ADMIN" : "USER";
    return {
      id: process.env.DEV_FAKE_USER_ID,
      name: "Dev User",
      email: "dev@example.com",
      image: null,
      role,
    };
  }

  throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
}
