import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NextRequest } from "next/server";
import QRCode from "qrcode";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  db: {
    user: { findUnique: vi.fn() },
    link: { findFirst: vi.fn(), update: vi.fn(), create: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { GET } from "@/app/api/qr/[id]/route";
import { buildQrTargetUrl } from "@/lib/qr";

const owner = { id: "user-1", name: "Alex", email: "alex@example.com", image: null, role: "USER" };
const other = { id: "user-2", name: "Sam", email: "sam@example.com", image: null, role: "USER" };
const admin = { id: "admin-1", name: "Admin", email: "admin@example.com", image: null, role: "ADMIN" };

function signInAs(who: typeof owner | null) {
  if (!who) {
    mocks.auth.mockResolvedValue(null);
    return;
  }
  mocks.auth.mockResolvedValue({ user: { id: who.id }, expires: "2026-11-18T10:00:00.000Z" });
  mocks.db.user.findUnique.mockResolvedValue(who);
}

function getQr(id: string, query = "", origin = "http://localhost:3000") {
  return GET(new NextRequest(`${origin}/api/qr/${id}${query}`), { params: Promise.resolve({ id }) });
}

function pngWidth(bytes: Uint8Array): number {
  return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(16);
}

async function expectedPng(url: string, width: number) {
  return new Uint8Array(
    await QRCode.toBuffer(url, { type: "png", width, margin: 2, errorCorrectionLevel: "M" })
  );
}

describe("GET /api/qr/[id] (MIL-P2-4)", () => {
  const originalAppUrl = process.env.NEXT_PUBLIC_APP_URL;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env.NEXT_PUBLIC_APP_URL = "https://lnk.example.com";
    mocks.db.link.findFirst.mockResolvedValue({ code: "promo1", ownerId: owner.id });
  });

  afterEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = originalAppUrl;
  });

  it("returns 401 UNAUTHORIZED when signed out", async () => {
    signInAs(null);
    const res = await getQr("link-1");
    expect(res.status).toBe(401);
    expect(mocks.db.link.findFirst).not.toHaveBeenCalled();
  });

  it("returns a PNG encoding the configured short URL with src=qr", async () => {
    signInAs(owner);
    const res = await getQr("link-1");

    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("image/png");
    expect(res.headers.get("Content-Disposition")).toBe('inline; filename="linkpulse-promo1-qr.png"');

    const body = new Uint8Array(await res.arrayBuffer());
    expect(Array.from(body.slice(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(pngWidth(body)).toBe(300);
    expect(body).toEqual(await expectedPng("https://lnk.example.com/promo1?src=qr", 300));

    expect(mocks.db.link.findFirst.mock.calls[0][0].where).toEqual({ id: "link-1", deletedAt: null });
    expect(mocks.db.link.update).not.toHaveBeenCalled();
    expect(mocks.db.link.create).not.toHaveBeenCalled();
  });

  it("honours the size parameter", async () => {
    signInAs(owner);
    const body = new Uint8Array(await (await getQr("link-1", "?size=512")).arrayBuffer());
    expect(pngWidth(body)).toBe(512);
  });

  it("falls back to the request origin when NEXT_PUBLIC_APP_URL is not set", async () => {
    delete process.env.NEXT_PUBLIC_APP_URL;
    signInAs(owner);
    const res = await getQr("link-1", "", "https://preview.example.dev");
    const body = new Uint8Array(await res.arrayBuffer());
    expect(body).toEqual(await expectedPng("https://preview.example.dev/promo1?src=qr", 300));
  });

  it.each(["?size=50", "?size=5000", "?size=abc", "?size=12.5"])(
    "returns 400 VALIDATION_ERROR for %s",
    async (query) => {
      signInAs(owner);
      const res = await getQr("link-1", query);
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    }
  );

  it("returns 403 FORBIDDEN for another user's link", async () => {
    signInAs(other);
    const res = await getQr("link-1");
    expect(res.status).toBe(403);
    expect((await res.json()).error.code).toBe("FORBIDDEN");
  });

  it("lets an admin get any link's QR code", async () => {
    signInAs(admin);
    expect((await getQr("link-1")).status).toBe(200);
  });

  it("returns 404 LINK_NOT_FOUND for a missing or soft-deleted link", async () => {
    signInAs(owner);
    mocks.db.link.findFirst.mockResolvedValue(null);
    const res = await getQr("gone");
    expect(res.status).toBe(404);
    expect((await res.json()).error.code).toBe("LINK_NOT_FOUND");
  });
});

describe("buildQrTargetUrl", () => {
  it("adds src=qr and ignores any path on the base URL", () => {
    expect(buildQrTargetUrl("promo1", "https://lnk.example.com")).toBe("https://lnk.example.com/promo1?src=qr");
    expect(buildQrTargetUrl("a-b_c", "http://localhost:3000")).toBe("http://localhost:3000/a-b_c?src=qr");
  });
});
