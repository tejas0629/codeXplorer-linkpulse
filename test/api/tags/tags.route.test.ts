import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    user: { findUnique: vi.fn() },
    tag: { findUnique: vi.fn(), create: vi.fn(), findMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { GET, POST } from "@/app/api/tags/route";

const user = { id: "user-1", name: "Alex", email: "alex@example.com", image: null, role: "USER" };
const admin = { id: "admin-1", name: "Admin", email: "admin@example.com", image: null, role: "ADMIN" };
const createdAt = new Date("2026-10-18T10:00:00.000Z");

function signInAs(who: typeof user | null) {
  if (!who) {
    mocks.auth.mockResolvedValue(null);
    return;
  }
  mocks.auth.mockResolvedValue({ user: { id: who.id }, expires: "2026-11-18T10:00:00.000Z" });
  mocks.db.user.findUnique.mockResolvedValue(who);
}

function postTag(body: unknown) {
  return POST(
    new NextRequest("http://localhost:3000/api/tags", { method: "POST", body: JSON.stringify(body) })
  );
}

describe("Tag routes (MIL-P2-2)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("POST /api/tags", () => {
    it("returns 401 when signed out", async () => {
      signInAs(null);
      const res = await postTag({ name: "social-media" });
      expect(res.status).toBe(401);
      expect(mocks.db.tag.create).not.toHaveBeenCalled();
    });

    it("creates a tag owned by the signed-in user", async () => {
      signInAs(user);
      mocks.db.tag.findUnique.mockResolvedValue(null);
      mocks.db.tag.create.mockResolvedValue({ id: "tag-1", name: "social-media", createdAt });

      const res = await postTag({ name: "  social-media ", ownerId: "someone-else" });

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({
        data: { id: "tag-1", name: "social-media", createdAt: createdAt.toISOString() },
      });
      expect(mocks.db.tag.create.mock.calls[0][0].data).toEqual({ name: "social-media", ownerId: "user-1" });
      expect(mocks.db.tag.findUnique.mock.calls[0][0].where).toEqual({
        ownerId_name: { ownerId: "user-1", name: "social-media" },
      });
    });

    it("returns 409 TAG_EXISTS for a duplicate name", async () => {
      signInAs(user);
      mocks.db.tag.findUnique.mockResolvedValue({ id: "tag-1" });
      const res = await postTag({ name: "social-media" });
      expect(res.status).toBe(409);
      expect((await res.json()).error.code).toBe("TAG_EXISTS");
      expect(mocks.db.tag.create).not.toHaveBeenCalled();
    });

    it("returns 409 TAG_EXISTS when a concurrent create wins the race", async () => {
      signInAs(user);
      mocks.db.tag.findUnique.mockResolvedValue(null);
      mocks.db.tag.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "6.19.3",
        })
      );
      const res = await postTag({ name: "social-media" });
      expect(res.status).toBe(409);
      expect((await res.json()).error.code).toBe("TAG_EXISTS");
    });

    it.each([
      ["missing name", {}],
      ["blank name", { name: "   " }],
      ["long name", { name: "a".repeat(31) }],
      ["non-string name", { name: ["a"] }],
    ])("returns 400 VALIDATION_ERROR for %s", async (_label, body) => {
      signInAs(user);
      const res = await postTag(body);
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
      expect(mocks.db.tag.create).not.toHaveBeenCalled();
    });
  });

  describe("GET /api/tags", () => {
    it("returns 401 when signed out", async () => {
      signInAs(null);
      expect((await GET()).status).toBe(401);
    });

    it("lists only the user's own tags", async () => {
      signInAs(user);
      mocks.db.tag.findMany.mockResolvedValue([{ id: "tag-1", name: "social-media" }]);
      const res = await GET();
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ data: [{ id: "tag-1", name: "social-media" }] });
      expect(mocks.db.tag.findMany.mock.calls[0][0].where).toEqual({ ownerId: "user-1" });
    });

    it("lists every tag for an admin", async () => {
      signInAs(admin);
      mocks.db.tag.findMany.mockResolvedValue([]);
      await GET();
      expect(mocks.db.tag.findMany.mock.calls[0][0].where).toEqual({});
    });
  });
});
