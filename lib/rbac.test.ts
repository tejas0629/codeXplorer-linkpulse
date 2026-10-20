import { describe, it, expect, vi, beforeEach } from "vitest";
import { ApiError } from "@/lib/api-response";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  findUnique: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: { user: { findUnique: mocks.findUnique } } }));

import {
  getCurrentSession,
  requireUser,
  requireAdmin,
  requireOwnerOrAdmin,
  canAccessOwnedResource,
} from "@/lib/rbac";

const EXPIRES = "2026-11-18T10:00:00.000Z";

const dbUser = {
  id: "user-1",
  name: "Alex Taylor",
  email: "alex@example.com",
  image: null,
  role: "USER" as const,
};

const dbAdmin = { ...dbUser, id: "admin-1", email: "admin@example.com", role: "ADMIN" as const };

function signInAs(user: { id: string; role: string } | null) {
  mocks.auth.mockResolvedValue(
    user ? { user: { id: user.id, role: user.role }, expires: EXPIRES } : null
  );
}

async function expectApiError(promise: Promise<unknown>, code: string, status: number) {
  const err = await promise.then(
    () => null,
    (e: unknown) => e
  );
  expect(err).toBeInstanceOf(ApiError);
  expect((err as ApiError).code).toBe(code);
  expect((err as ApiError).status).toBe(status);
}

describe("lib/rbac (MIL-P1-1)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getCurrentSession", () => {
    it("returns null when there is no session", async () => {
      signInAs(null);
      expect(await getCurrentSession()).toBeNull();
      expect(mocks.findUnique).not.toHaveBeenCalled();
    });

    it("returns null when reading the session throws", async () => {
      mocks.auth.mockRejectedValue(new Error("bad cookie"));
      expect(await getCurrentSession()).toBeNull();
    });

    it("returns null when the session user no longer exists", async () => {
      signInAs({ id: "deleted-user", role: "USER" });
      mocks.findUnique.mockResolvedValue(null);
      expect(await getCurrentSession()).toBeNull();
    });

    it("returns the database user and session expiry", async () => {
      signInAs({ id: dbUser.id, role: "USER" });
      mocks.findUnique.mockResolvedValue(dbUser);
      expect(await getCurrentSession()).toEqual({ user: dbUser, expires: EXPIRES });
      expect(mocks.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: dbUser.id } })
      );
    });
  });

  describe("requireUser", () => {
    it("throws 401 UNAUTHORIZED when signed out", async () => {
      signInAs(null);
      await expectApiError(requireUser(), "UNAUTHORIZED", 401);
    });

    it("returns the signed-in user", async () => {
      signInAs({ id: dbUser.id, role: "USER" });
      mocks.findUnique.mockResolvedValue(dbUser);
      await expect(requireUser()).resolves.toEqual(dbUser);
    });
  });

  describe("requireAdmin", () => {
    it("throws 401 UNAUTHORIZED when signed out", async () => {
      signInAs(null);
      await expectApiError(requireAdmin(), "UNAUTHORIZED", 401);
    });

    it("throws 403 ADMIN_REQUIRED for a normal user", async () => {
      signInAs({ id: dbUser.id, role: "USER" });
      mocks.findUnique.mockResolvedValue(dbUser);
      await expectApiError(requireAdmin(), "ADMIN_REQUIRED", 403);
    });

    it("uses the database role, not the role stored in the token", async () => {
      // Token still says ADMIN but the account was demoted.
      signInAs({ id: dbUser.id, role: "ADMIN" });
      mocks.findUnique.mockResolvedValue(dbUser);
      await expectApiError(requireAdmin(), "ADMIN_REQUIRED", 403);
    });

    it("returns the admin user", async () => {
      signInAs({ id: dbAdmin.id, role: "ADMIN" });
      mocks.findUnique.mockResolvedValue(dbAdmin);
      await expect(requireAdmin()).resolves.toEqual(dbAdmin);
    });
  });

  describe("requireOwnerOrAdmin", () => {
    it("throws 401 UNAUTHORIZED when signed out", async () => {
      signInAs(null);
      await expectApiError(requireOwnerOrAdmin("user-1"), "UNAUTHORIZED", 401);
    });

    it("allows the owner", async () => {
      signInAs({ id: dbUser.id, role: "USER" });
      mocks.findUnique.mockResolvedValue(dbUser);
      await expect(requireOwnerOrAdmin(dbUser.id)).resolves.toEqual(dbUser);
    });

    it("throws 403 FORBIDDEN for another user's resource", async () => {
      signInAs({ id: dbUser.id, role: "USER" });
      mocks.findUnique.mockResolvedValue(dbUser);
      await expectApiError(requireOwnerOrAdmin("someone-else"), "FORBIDDEN", 403);
    });

    it("allows an admin on any resource", async () => {
      signInAs({ id: dbAdmin.id, role: "ADMIN" });
      mocks.findUnique.mockResolvedValue(dbAdmin);
      await expect(requireOwnerOrAdmin("someone-else")).resolves.toEqual(dbAdmin);
    });
  });

  describe("canAccessOwnedResource", () => {
    it("denies a missing or empty owner id for normal users", () => {
      expect(canAccessOwnedResource({ id: "user-1", role: "USER" }, null)).toBe(false);
      expect(canAccessOwnedResource({ id: "user-1", role: "USER" }, undefined)).toBe(false);
      expect(canAccessOwnedResource({ id: "", role: "USER" }, "")).toBe(false);
    });
  });
});
