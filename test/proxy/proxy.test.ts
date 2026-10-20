import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ getToken: vi.fn() }));

vi.mock("next-auth/jwt", () => ({ getToken: mocks.getToken }));

import { proxy } from "@/proxy";

function visit(path: string, origin = "http://localhost:3000") {
  return proxy(new NextRequest(`${origin}${path}`));
}

function isPassThrough(res: Response) {
  return res.headers.get("x-middleware-next") === "1";
}

function redirectPath(res: Response) {
  return new URL(res.headers.get("location") ?? "http://invalid/").pathname;
}

describe("proxy route protection (MIL-P1-4)", () => {
  beforeEach(() => {
    mocks.getToken.mockReset();
  });

  it.each(["/", "/abc123", "/status/expired", "/unlock/promo1", "/dashboards"])(
    "lets public path %s through without decoding a token",
    async (path) => {
      const res = await visit(path);
      expect(isPassThrough(res)).toBe(true);
      expect(mocks.getToken).not.toHaveBeenCalled();
    }
  );

  it.each(["/dashboard", "/links/new", "/campaigns/abc", "/import", "/trace", "/admin/users"])(
    "redirects signed-out visitors from %s to /login with a callbackUrl",
    async (path) => {
      mocks.getToken.mockResolvedValue(null);
      const res = await visit(`${path}?tab=1`);
      expect(res.status).toBe(307);
      const location = new URL(res.headers.get("location") ?? "");
      expect(location.pathname).toBe("/login");
      expect(location.searchParams.get("callbackUrl")).toBe(`${path}?tab=1`);
    }
  );

  it("treats a token decoding failure as signed out", async () => {
    mocks.getToken.mockRejectedValue(new Error("MissingSecret"));
    expect(redirectPath(await visit("/dashboard"))).toBe("/login");
  });

  it("lets a signed-in user open the dashboard", async () => {
    mocks.getToken.mockResolvedValue({ id: "user-1", role: "USER" });
    expect(isPassThrough(await visit("/dashboard"))).toBe(true);
  });

  it("sends a non-admin away from admin pages", async () => {
    mocks.getToken.mockResolvedValue({ id: "user-1", role: "USER" });
    const res = await visit("/admin/links");
    expect(res.status).toBe(307);
    expect(redirectPath(res)).toBe("/dashboard");
  });

  it("lets an admin open admin pages", async () => {
    mocks.getToken.mockResolvedValue({ id: "admin-1", role: "ADMIN" });
    expect(isPassThrough(await visit("/admin"))).toBe(true);
  });

  it("redirects signed-in users away from login and register", async () => {
    mocks.getToken.mockResolvedValue({ id: "user-1", role: "USER" });
    expect(redirectPath(await visit("/login"))).toBe("/dashboard");
    expect(redirectPath(await visit("/register"))).toBe("/dashboard");
  });

  it("shows login and register to signed-out visitors", async () => {
    mocks.getToken.mockResolvedValue(null);
    expect(isPassThrough(await visit("/login"))).toBe(true);
    expect(isPassThrough(await visit("/register"))).toBe(true);
  });

  it("reads the secure cookie over https", async () => {
    mocks.getToken.mockResolvedValue(null);
    await visit("/dashboard", "https://linkpulse.example.com");
    expect(mocks.getToken).toHaveBeenLastCalledWith(expect.objectContaining({ secureCookie: true }));
    await visit("/dashboard");
    expect(mocks.getToken).toHaveBeenLastCalledWith(expect.objectContaining({ secureCookie: false }));
  });
});
