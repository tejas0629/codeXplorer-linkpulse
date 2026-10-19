// Owner: Milan | Task: MIL-P1-1 | Priority: P1
import "server-only";
import type { Role } from "@prisma/client";

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: Role;
}

// TODO (MIL-P1-1): Implement session extraction and role verification using Auth.js
export async function requireUser(): Promise<SessionUser> {
  throw new Error("NOT_IMPLEMENTED: MIL-P1-1");
}

// TODO (MIL-P1-1): Implement admin role verification
export async function requireAdmin(): Promise<SessionUser> {
  throw new Error("NOT_IMPLEMENTED: MIL-P1-1");
}

// TODO (MIL-P1-1): Implement owner or admin authorization check
export async function requireOwnerOrAdmin(ownerId: string): Promise<SessionUser> {
  void ownerId;
  throw new Error("NOT_IMPLEMENTED: MIL-P1-1");
}
