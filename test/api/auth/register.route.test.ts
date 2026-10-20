import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  findUnique: vi.fn(),
  create: vi.fn(),
}));

vi.mock("next-auth", () => ({
  default: vi.fn(() => ({ handlers: {}, auth: vi.fn(), signIn: vi.fn(), signOut: vi.fn() })),
}));
vi.mock("next-auth/providers/credentials", () => ({ default: vi.fn(() => ({ id: "credentials" })) }));
vi.mock("next-auth/providers/google", () => ({ default: { id: "google" } }));
vi.mock("@auth/prisma-adapter", () => ({ PrismaAdapter: vi.fn(() => ({})) }));
vi.mock("@/lib/db", () => ({
  db: { user: { findUnique: mocks.findUnique, create: mocks.create } },
}));

import { POST } from "@/app/api/auth/register/route";

function registerRequest(body: unknown, raw = false) {
  return new NextRequest("http://localhost:3000/api/auth/register", {
    method: "POST",
    body: raw ? (body as string) : JSON.stringify(body),
  });
}

const validBody = { name: "Alex Taylor", email: "alex@example.com", password: "Password123!" };

describe("POST /api/auth/register (MIL-P1-3)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    mocks.findUnique.mockReset();
    mocks.create.mockReset();
  });

  it("returns 201 with the created user and no password data", async () => {
    mocks.findUnique.mockResolvedValue(null);
    mocks.create.mockResolvedValue({
      id: "user-1",
      name: "Alex Taylor",
      email: "alex@example.com",
      role: "USER",
      createdAt: new Date("2026-10-18T10:00:00.000Z"),
    });

    const res = await POST(registerRequest(validBody));

    expect(res.status).toBe(201);
    const json = await res.json();
    expect(json).toEqual({
      data: {
        id: "user-1",
        name: "Alex Taylor",
        email: "alex@example.com",
        role: "USER",
        createdAt: "2026-10-18T10:00:00.000Z",
      },
    });
    expect(JSON.stringify(json)).not.toContain(validBody.password);
  });

  it("returns 400 VALIDATION_ERROR with field messages for invalid input", async () => {
    const res = await POST(registerRequest({ name: "", email: "bad", password: "short" }));
    expect(res.status).toBe(400);
    const json = await res.json();
    expect(json.error.code).toBe("VALIDATION_ERROR");
    expect(Object.keys(json.error.fields)).toEqual(
      expect.arrayContaining(["name", "email", "password"])
    );
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns 400 VALIDATION_ERROR for a malformed JSON body", async () => {
    const res = await POST(registerRequest("{not json", true));
    expect(res.status).toBe(400);
    expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
  });

  it("returns 409 EMAIL_EXISTS for a duplicate email", async () => {
    mocks.findUnique.mockResolvedValue({ id: "existing" });
    const res = await POST(registerRequest(validBody));
    expect(res.status).toBe(409);
    expect((await res.json()).error.code).toBe("EMAIL_EXISTS");
  });

  it("returns a safe 500 when the database fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.findUnique.mockRejectedValue(new Error("connection string leaked here"));
    const res = await POST(registerRequest(validBody));
    expect(res.status).toBe(500);
    const json = await res.json();
    expect(json.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(json)).not.toContain("connection string");
  });
});
