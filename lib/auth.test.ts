import { describe, it, expect, vi, beforeEach } from "vitest";
import bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";
import { ZodError } from "zod";
import { ApiError } from "@/lib/api-response";

const mocks = vi.hoisted(() => ({
  nextAuth: vi.fn(() => ({
    handlers: { GET: vi.fn(), POST: vi.fn() },
    auth: vi.fn(),
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
  findUnique: vi.fn(),
  create: vi.fn(),
}));

vi.mock("next-auth", () => ({ default: mocks.nextAuth }));
vi.mock("next-auth/providers/credentials", () => ({
  default: vi.fn((options: Record<string, unknown>) => ({ id: "credentials", ...options })),
}));
vi.mock("next-auth/providers/google", () => ({ default: { id: "google" } }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: vi.fn(() => ({})) }));
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: mocks.findUnique, create: mocks.create } },
}));

import { registerUser, verifyCredentials } from "@/lib/auth";

type AuthConfig = {
  pages: { signIn: string };
  session: { strategy: string };
  providers: Array<{ id: string; authorize?: (c: unknown) => Promise<unknown> }>;
  callbacks: {
    jwt: (args: { token: Record<string, unknown>; user?: Record<string, unknown> }) => Promise<Record<string, unknown>>;
    session: (args: {
      session: { user: Record<string, unknown>; expires: string };
      token: Record<string, unknown>;
    }) => Promise<{ user: Record<string, unknown> }>;
  };
};

// Captured once at import time, before any clearAllMocks.
const authConfig = (mocks.nextAuth.mock.calls[0] as unknown as [AuthConfig])[0];

const validInput = {
  name: "Alex Taylor",
  email: "Alex@Example.com ",
  password: "Password123!",
};

async function catchError(promise: Promise<unknown>): Promise<unknown> {
  return promise.then(
    () => null,
    (e: unknown) => e
  );
}

describe("lib/auth (MIL-P1-2, MIL-P1-3)", () => {
  beforeEach(() => {
    mocks.findUnique.mockReset();
    mocks.create.mockReset();
  });

  describe("registerUser", () => {
    it("creates a USER with a normalized email and a bcrypt hash", async () => {
      mocks.findUnique.mockResolvedValue(null);
      const createdAt = new Date("2026-10-18T10:00:00.000Z");
      mocks.create.mockImplementation(async ({ data }: { data: Record<string, string> }) => ({
        id: "user-1",
        name: data.name,
        email: data.email,
        role: "USER",
        createdAt,
      }));

      const result = await registerUser({ ...validInput, role: "ADMIN" });

      expect(result).toEqual({
        id: "user-1",
        name: "Alex Taylor",
        email: "alex@example.com",
        role: "USER",
        createdAt: "2026-10-18T10:00:00.000Z",
      });

      const data = mocks.create.mock.calls[0][0].data;
      expect(data).not.toHaveProperty("role");
      expect(data).not.toHaveProperty("password");
      expect(data.passwordHash).not.toBe(validInput.password);
      expect(await bcrypt.compare(validInput.password, data.passwordHash)).toBe(true);
    });

    it.each([
      ["missing name", { ...validInput, name: "  " }, "name"],
      ["long name", { ...validInput, name: "a".repeat(101) }, "name"],
      ["invalid email", { ...validInput, email: "not-an-email" }, "email"],
      ["long email", { ...validInput, email: `${"a".repeat(140)}@example.com` }, "email"],
      ["short password", { ...validInput, password: "short" }, "password"],
      ["long password", { ...validInput, password: "a".repeat(73) }, "password"],
      ["missing password", { name: "A", email: "a@example.com" }, "password"],
    ])("rejects %s with a ZodError", async (_label, input, field) => {
      const err = await catchError(registerUser(input));
      expect(err).toBeInstanceOf(ZodError);
      expect((err as ZodError).issues.map((i) => i.path[0])).toContain(field);
      expect(mocks.create).not.toHaveBeenCalled();
    });

    it("throws 409 EMAIL_EXISTS when the email is already registered", async () => {
      mocks.findUnique.mockResolvedValue({ id: "existing" });
      const err = await catchError(registerUser(validInput));
      expect(err).toBeInstanceOf(ApiError);
      expect((err as ApiError).code).toBe("EMAIL_EXISTS");
      expect((err as ApiError).status).toBe(409);
      expect(mocks.create).not.toHaveBeenCalled();
    });

    it("maps a concurrent unique violation to EMAIL_EXISTS", async () => {
      mocks.findUnique.mockResolvedValue(null);
      mocks.create.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
          code: "P2002",
          clientVersion: "6.19.3",
        })
      );
      const err = await catchError(registerUser(validInput));
      expect((err as ApiError).code).toBe("EMAIL_EXISTS");
    });
  });

  describe("verifyCredentials", () => {
    const user = {
      id: "user-1",
      name: "Alex Taylor",
      email: "alex@example.com",
      image: null,
      role: "USER" as const,
    };

    it("returns the user without the password hash for a correct password", async () => {
      mocks.findUnique.mockResolvedValue({
        ...user,
        passwordHash: await bcrypt.hash("Password123!", 4),
      });
      const result = await verifyCredentials({ email: "ALEX@example.com", password: "Password123!" });
      expect(result).toEqual(user);
      expect(mocks.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { email: "alex@example.com" } })
      );
    });

    it("returns null for a wrong password", async () => {
      mocks.findUnique.mockResolvedValue({
        ...user,
        passwordHash: await bcrypt.hash("Password123!", 4),
      });
      expect(await verifyCredentials({ email: user.email, password: "wrong-password" })).toBeNull();
    });

    it("returns null for an unknown email", async () => {
      mocks.findUnique.mockResolvedValue(null);
      expect(await verifyCredentials({ email: "nobody@example.com", password: "x" })).toBeNull();
    });

    it("returns null for a Google-only account with no password", async () => {
      mocks.findUnique.mockResolvedValue({ ...user, passwordHash: null });
      expect(await verifyCredentials({ email: user.email, password: "anything" })).toBeNull();
    });

    it("returns null for malformed input without querying the database", async () => {
      expect(await verifyCredentials({ email: "nope", password: "" })).toBeNull();
      expect(await verifyCredentials(undefined)).toBeNull();
      expect(mocks.findUnique).not.toHaveBeenCalled();
    });
  });

  describe("Auth.js configuration", () => {
    it("uses JWT sessions, the /login page, and both providers", () => {
      expect(authConfig.session.strategy).toBe("jwt");
      expect(authConfig.pages.signIn).toBe("/login");
      expect(authConfig.providers.map((p) => p.id)).toEqual(["credentials", "google"]);
    });

    it("stores id and role in the JWT on sign-in only", async () => {
      const signedIn = await authConfig.callbacks.jwt({
        token: { sub: "user-1" },
        user: { id: "user-1", role: "ADMIN" },
      });
      expect(signedIn).toMatchObject({ id: "user-1", role: "ADMIN" });

      const later = await authConfig.callbacks.jwt({ token: { sub: "user-1", id: "user-1", role: "USER" } });
      expect(later).toMatchObject({ id: "user-1", role: "USER" });
    });

    it("defaults the role to USER when the user has none", async () => {
      const token = await authConfig.callbacks.jwt({ token: {}, user: { id: "g-1" } });
      expect(token.role).toBe("USER");
    });

    it("exposes id and role on the session", async () => {
      const session = await authConfig.callbacks.session({
        session: { user: { email: "a@example.com" }, expires: "2026-11-18T10:00:00.000Z" },
        token: { id: "user-1", role: "ADMIN" },
      });
      expect(session.user).toMatchObject({ id: "user-1", role: "ADMIN" });
    });
  });
});
