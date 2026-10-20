import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { requireUser } from "@/lib/links-auth";

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("lib/links-auth.ts (FIX 5 DEV_FAKE_USER_ID)", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    delete process.env.DEV_FAKE_USER_ID;
    delete process.env.DEV_FAKE_USER_ROLE;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("throws 401 UNAUTHORIZED in production even if DEV_FAKE_USER_ID is set", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    process.env.DEV_FAKE_USER_ID = "fake-user-prod";

    const authModule = await import("@/lib/auth");
    vi.mocked(authModule.auth).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof authModule.auth>>
    );

    await expect(requireUser()).rejects.toThrowError(
      expect.objectContaining({
        status: 401,
        code: "UNAUTHORIZED",
      })
    );
  });

  it("uses DEV_FAKE_USER_ID when outside production", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.DEV_FAKE_USER_ID = "dev-user-123";

    const authModule = await import("@/lib/auth");
    vi.mocked(authModule.auth).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof authModule.auth>>
    );

    const user = await requireUser();
    expect(user.id).toBe("dev-user-123");
    expect(user.role).toBe("USER");
    expect(user.email).toBe("dev@example.com");
  });

  it("assigns ADMIN role outside production when DEV_FAKE_USER_ROLE is ADMIN", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "test";
    process.env.DEV_FAKE_USER_ID = "admin-dev-user";
    process.env.DEV_FAKE_USER_ROLE = "ADMIN";

    const authModule = await import("@/lib/auth");
    vi.mocked(authModule.auth).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof authModule.auth>>
    );

    const user = await requireUser();
    expect(user.id).toBe("admin-dev-user");
    expect(user.role).toBe("ADMIN");
  });

  it("throws 401 UNAUTHORIZED outside production when DEV_FAKE_USER_ID is not set", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    delete process.env.DEV_FAKE_USER_ID;

    const authModule = await import("@/lib/auth");
    vi.mocked(authModule.auth).mockResolvedValue(
      null as unknown as Awaited<ReturnType<typeof authModule.auth>>
    );

    await expect(requireUser()).rejects.toThrowError(
      expect.objectContaining({
        status: 401,
        code: "UNAUTHORIZED",
      })
    );
  });

  it("returns session user when valid session exists regardless of DEV_FAKE_USER_ID", async () => {
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    process.env.DEV_FAKE_USER_ID = "fallback-user";

    const authModule = await import("@/lib/auth");
    vi.mocked(authModule.auth).mockResolvedValue({
      user: {
        id: "session-user-456",
        name: "Session User",
        email: "session@example.com",
        role: "USER",
      },
      expires: "2099-01-01",
    } as unknown as Awaited<ReturnType<typeof authModule.auth>>);

    const user = await requireUser();
    expect(user.id).toBe("session-user-456");
    expect(user.name).toBe("Session User");
  });
});
