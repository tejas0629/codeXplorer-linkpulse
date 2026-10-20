import { describe, it, expect, vi, beforeEach } from "vitest";

const mocks = vi.hoisted(() => ({ getCurrentSession: vi.fn() }));

vi.mock("@/lib/rbac", () => ({ getCurrentSession: mocks.getCurrentSession }));

import { GET } from "@/app/api/auth/session/route";

describe("GET /api/auth/session (MIL-P1-2)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.getCurrentSession.mockReset();
  });

  it("returns { data: null } when signed out", async () => {
    mocks.getCurrentSession.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ data: null });
    expect(res.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns the user with role and the expiry when signed in", async () => {
    mocks.getCurrentSession.mockResolvedValue({
      user: {
        id: "user-1",
        name: "Alex Taylor",
        email: "alex@example.com",
        image: "https://example.com/a.png",
        role: "ADMIN",
      },
      expires: "2026-11-18T10:00:00.000Z",
    });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      data: {
        user: { id: "user-1", name: "Alex Taylor", email: "alex@example.com", role: "ADMIN" },
        expires: "2026-11-18T10:00:00.000Z",
      },
    });
  });

  it("returns a safe 500 when the session lookup fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.getCurrentSession.mockRejectedValue(new Error("db down"));
    const res = await GET();
    expect(res.status).toBe(500);
    expect((await res.json()).error.code).toBe("INTERNAL_ERROR");
  });
});
