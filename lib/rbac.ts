// Owner: Milan | Task: MIL-P1-1 | Priority: P1
import "server-only";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-response";
import type { SessionUser } from "@/types/api";

export type { SessionUser };

export interface CurrentSession {
  user: SessionUser;
  expires: string;
}

/**
 * Resolves the signed-in user from the Auth.js session cookie.
 *
 * The session only proves who the caller is. The role is always re-read from
 * the database so that a promoted, demoted, or deleted account takes effect on
 * the next request instead of waiting for the JWT to expire. Nothing supplied
 * by the client (body, query, headers) is used to decide identity or role.
 *
 * Returns null when there is no valid session or the user no longer exists.
 */
export async function getCurrentSession(): Promise<CurrentSession | null> {
  let session;
  try {
    session = await auth();
  } catch {
    // A malformed or undecryptable cookie is treated as signed out.
    return null;
  }

  const userId = session?.user?.id;
  if (!session || !userId) {
    return null;
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, role: true },
  });
  if (!user) {
    return null;
  }

  return { user, expires: session.expires };
}

export async function getCurrentUser(): Promise<SessionUser | null> {
  const current = await getCurrentSession();
  return current?.user ?? null;
}

/**
 * Requires any signed-in user. Throws 401 UNAUTHORIZED otherwise.
 */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) {
    throw new ApiError("UNAUTHORIZED", "Authentication required", 401);
  }
  return user;
}

/**
 * Requires a signed-in ADMIN. Throws 401 UNAUTHORIZED when signed out and
 * 403 ADMIN_REQUIRED for any other role.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isAdmin(user)) {
    throw new ApiError("ADMIN_REQUIRED", "Administrator access required", 403);
  }
  return user;
}

/**
 * Requires the signed-in user to own the resource, or to be an ADMIN.
 * Pass the ownerId loaded from the database, never one taken from the request.
 * Throws 401 UNAUTHORIZED when signed out and 403 FORBIDDEN when not permitted.
 */
export async function requireOwnerOrAdmin(ownerId: string): Promise<SessionUser> {
  const user = await requireUser();
  if (!canAccessOwnedResource(user, ownerId)) {
    throw new ApiError("FORBIDDEN", "You do not have access to this resource", 403);
  }
  return user;
}

export function isAdmin(user: Pick<SessionUser, "role">): boolean {
  return user.role === "ADMIN";
}

export function canAccessOwnedResource(
  user: Pick<SessionUser, "id" | "role">,
  ownerId: string | null | undefined
): boolean {
  if (isAdmin(user)) {
    return true;
  }
  return typeof ownerId === "string" && ownerId.length > 0 && ownerId === user.id;
}
