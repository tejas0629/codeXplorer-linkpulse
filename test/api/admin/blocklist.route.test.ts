import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    user: { findUnique: vi.fn() },
    blockedDomain: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { GET, POST } from "@/app/api/admin/blocklist/route";
import { DELETE } from "@/app/api/admin/blocklist/[id]/route";
import { normalizeDomain } from "@/lib/blocklist";

const user = { id: "user-1", name: "Alex", email: "alex@example.com", image: null, role: "USER" };
const admin = { id: "admin-1", name: "Admin", email: "admin@example.com", image: null, role: "ADMIN" };
const createdAt = new Date("2026-10-18T14:00:00.000Z");

function signInAs(who: typeof user | null) {
  if (!who) {
    mocks.auth.mockResolvedValue(null);
    return;
  }
  mocks.auth.mockResolvedValue({ user: { id: who.id }, expires: "2026-11-18T10:00:00.000Z" });
  mocks.db.user.findUnique.mockResolvedValue(who);
}

const post = (body: unknown) =>
  POST(new NextRequest("http://localhost:3000/api/admin/blocklist", { method: "POST", body: JSON.stringify(body) }));
const del = (id: string) =>
  DELETE(new NextRequest(`http://localhost:3000/api/admin/blocklist/${id}`, { method: "DELETE" }), {
    params: Promise.resolve({ id }),
  });

describe("Blocklist routes (MIL-P2-5)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe.each([
    ["GET", () => GET()],
    ["POST", () => post({ domain: "evil.com" })],
    ["DELETE", () => del("b1")],
  ])("%s access control", (_name, call) => {
    it("returns 401 when signed out", async () => {
      signInAs(null);
      expect((await call()).status).toBe(401);
    });

    it("returns 403 ADMIN_REQUIRED for a normal user", async () => {
      signInAs(user);
      const res = await call();
      expect(res.status).toBe(403);
      expect((await res.json()).error.code).toBe("ADMIN_REQUIRED");
      expect(mocks.db.blockedDomain.create).not.toHaveBeenCalled();
      expect(mocks.db.blockedDomain.delete).not.toHaveBeenCalled();
    });
  });

  it("GET lists blocked domains", async () => {
    signInAs(admin);
    mocks.db.blockedDomain.findMany.mockResolvedValue([{ id: "b1", domain: "phishing-link.net", createdAt }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: [{ id: "b1", domain: "phishing-link.net", createdAt: createdAt.toISOString() }],
    });
  });

  it("POST normalizes and stores the domain with the admin as creator", async () => {
    signInAs(admin);
    mocks.db.blockedDomain.findFirst.mockResolvedValue(null);
    mocks.db.blockedDomain.create.mockResolvedValue({ id: "b2", domain: "malicious-site.com", createdAt });

    const res = await post({ domain: "  https://Malicious-Site.com/login?x=1 " });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({
      data: { id: "b2", domain: "malicious-site.com", createdAt: createdAt.toISOString() },
    });
    expect(mocks.db.blockedDomain.create.mock.calls[0][0].data).toEqual({
      domain: "malicious-site.com",
      addedById: "admin-1",
    });
  });

  it.each([{}, { domain: "" }, { domain: "not a domain" }, { domain: "localhost" }, { domain: 42 }])(
    "POST returns 400 INVALID_DOMAIN for %j",
    async (body) => {
      signInAs(admin);
      const res = await post(body);
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("INVALID_DOMAIN");
      expect(mocks.db.blockedDomain.create).not.toHaveBeenCalled();
    }
  );

  it("POST returns 409 DOMAIN_EXISTS for an already blocked domain", async () => {
    signInAs(admin);
    mocks.db.blockedDomain.findFirst.mockResolvedValue({ id: "b1" });
    const res = await post({ domain: "evil.com" });
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("DOMAIN_EXISTS");
  });

  it("POST returns 409 DOMAIN_EXISTS when a concurrent insert wins", async () => {
    signInAs(admin);
    mocks.db.blockedDomain.findFirst.mockResolvedValue(null);
    mocks.db.blockedDomain.create.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "6.19.3" })
    );
    expect((await post({ domain: "evil.com" })).status).toBe(409);
  });

  it("DELETE removes an entry", async () => {
    signInAs(admin);
    mocks.db.blockedDomain.findUnique.mockResolvedValue({ id: "b1" });
    mocks.db.blockedDomain.delete.mockResolvedValue({});
    const res = await del("b1");
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: { id: "b1", deleted: true } });
  });

  it("DELETE returns 404 NOT_FOUND for a missing entry", async () => {
    signInAs(admin);
    mocks.db.blockedDomain.findUnique.mockResolvedValue(null);
    const res = await del("nope");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("NOT_FOUND");
    expect(mocks.db.blockedDomain.delete).not.toHaveBeenCalled();
  });
});

describe("normalizeDomain", () => {
  it.each([
    ["Example.COM", "example.com"],
    ["example.com.", "example.com"],
    ["sub.example.co.uk", "sub.example.co.uk"],
    ["http://www.example.com:8080/a", "www.example.com"],
    ["xn--bcher-kva.example", "xn--bcher-kva.example"],
  ])("normalizes %s to %s", (input, expected) => {
    expect(normalizeDomain(input)).toBe(expected);
  });

  it.each(["", "com", "-bad.com", "bad-.com", "a..com", "exa mple.com", "1.2.3.4", "ex_ample.com", null])(
    "rejects %s",
    (input) => {
      expect(normalizeDomain(input)).toBeNull();
    }
  );
});
