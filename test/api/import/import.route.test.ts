import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  assertRateLimit: vi.fn(),
  db: {
    user: { findUnique: vi.fn() },
    blockedDomain: { findMany: vi.fn() },
    link: { findMany: vi.fn(), createMany: vi.fn() },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }));
vi.mock("@/lib/db", () => ({ db: mocks.db }));
vi.mock("@/lib/rate-limit", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/rate-limit")>()),
  assertRateLimit: mocks.assertRateLimit,
}));

import { POST as preview } from "@/app/api/import/preview/route";
import { POST as commit } from "@/app/api/import/commit/route";
import { parseCsvText } from "@/lib/csv";
import { RateLimitError } from "@/lib/rate-limit";

const user = { id: "user-1", name: "Alex", email: "alex@example.com", image: null, role: "USER" };

function signInAs(who: typeof user | null) {
  if (!who) {
    mocks.auth.mockResolvedValue(null);
    return;
  }
  mocks.auth.mockResolvedValue({ user: { id: who.id }, expires: "2026-11-18T10:00:00.000Z" });
  mocks.db.user.findUnique.mockResolvedValue(who);
}

function jsonPost(path: string, body: unknown) {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function csvPost(text: string) {
  return new NextRequest("http://localhost:3000/api/import/preview", {
    method: "POST",
    headers: { "content-type": "text/csv" },
    body: text,
  });
}

function takenCodes(...codes: string[]) {
  mocks.db.link.findMany.mockImplementation(async ({ where }: { where: { code: { in: string[] } } }) =>
    where.code.in.filter((c) => codes.includes(c)).map((code) => ({ code }))
  );
}

describe("CSV import (MIL-P2-3)", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.db.blockedDomain.findMany.mockResolvedValue([]);
    mocks.db.link.findMany.mockResolvedValue([]);
    mocks.assertRateLimit.mockResolvedValue({ success: true });
  });

  describe("POST /api/import/preview", () => {
    it("returns 401 when signed out", async () => {
      signInAs(null);
      const res = await preview(jsonPost("/api/import/preview", { rows: [] }));
      expect(res.status).toBe(401);
    });

    it("matches the docs/API.md example: one valid, one error, one duplicate", async () => {
      signInAs(user);
      takenCodes("report2026");

      const res = await preview(
        jsonPost("/api/import/preview", {
          rows: [
            { destinationUrl: "https://valid.com", code: "promo1" },
            { destinationUrl: "bad-url", code: "promo2" },
            { destinationUrl: "https://valid.com", code: "report2026" },
          ],
        })
      );

      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(data).toMatchObject({ totalRows: 3, validCount: 1, errorCount: 1, duplicateCount: 1 });
      expect(data.validRows).toEqual([{ rowNumber: 1, destinationUrl: "https://valid.com", code: "promo1" }]);
      expect(data.issues).toEqual([
        { rowNumber: 2, code: "promo2", error: expect.stringContaining("valid http or https") },
        { rowNumber: 3, code: "report2026", error: "Alias already taken" },
      ]);
    });

    it("never writes to the database", async () => {
      signInAs(user);
      await preview(jsonPost("/api/import/preview", { rows: [{ destinationUrl: "https://a.com" }] }));
      expect(mocks.db.link.createMany).not.toHaveBeenCalled();
    });

    it("reports blocked domains, including subdomains, as errors", async () => {
      signInAs(user);
      mocks.db.blockedDomain.findMany.mockResolvedValue([{ domain: "evil.com" }]);
      const res = await preview(
        jsonPost("/api/import/preview", {
          rows: [{ destinationUrl: "https://login.evil.com/x" }, { destinationUrl: "https://good.com" }],
        })
      );
      const { data } = await res.json();
      expect(data.errorCount).toBe(1);
      expect(data.issues[0]).toEqual({
        rowNumber: 1,
        error: "The domain 'evil.com' is blocked by platform administrators",
      });
      expect(mocks.db.blockedDomain.findMany).toHaveBeenCalledTimes(1);
    });

    it("flags aliases repeated in the file (case-insensitive) and repeated rows without alias", async () => {
      signInAs(user);
      const res = await preview(
        jsonPost("/api/import/preview", {
          rows: [
            { destinationUrl: "https://a.com", code: "Promo" },
            { destinationUrl: "https://b.com", code: "promo" },
            { destinationUrl: "https://c.com" },
            { destinationUrl: "https://c.com" },
          ],
        })
      );
      const { data } = await res.json();
      expect(data.validCount).toBe(2);
      expect(data.duplicateCount).toBe(2);
      expect(data.issues).toEqual([
        { rowNumber: 2, code: "promo", error: "Duplicate alias in file (same as row 1)" },
        { rowNumber: 4, error: "Duplicate row in file (same as row 3)" },
      ]);
      expect(data.validRows[0].code).toBe("promo");
    });

    it("reports invalid and reserved aliases and non-text cells per row", async () => {
      signInAs(user);
      const res = await preview(
        jsonPost("/api/import/preview", {
          rows: [
            { destinationUrl: "https://a.com", code: "a" },
            { destinationUrl: "https://a.com", code: "admin" },
            { destinationUrl: "https://a.com", code: 42 },
            { destinationUrl: 42 },
            "not an object",
            { destinationUrl: "javascript:alert(1)" },
            { destinationUrl: "https://user:pass@a.com" },
          ],
        })
      );
      const { data } = await res.json();
      expect(data.validCount).toBe(0);
      expect(data.errorCount).toBe(7);
      expect(data.issues.map((i: { rowNumber: number }) => i.rowNumber)).toEqual([1, 2, 3, 4, 5, 6, 7]);
    });

    it("treats a blank code as no alias", async () => {
      signInAs(user);
      const res = await preview(
        jsonPost("/api/import/preview", { rows: [{ destinationUrl: "https://a.com", code: "  " }] })
      );
      expect((await res.json()).data.validRows).toEqual([{ rowNumber: 1, destinationUrl: "https://a.com" }]);
    });

    it("accepts a raw CSV upload", async () => {
      signInAs(user);
      const res = await preview(
        csvPost("DestinationUrl, Code\r\nhttps://a.com,promo1\r\n\r\n\"https://b.com/?q=1,2\",\nbad,promo3\n")
      );
      expect(res.status).toBe(200);
      const { data } = await res.json();
      expect(data.totalRows).toBe(3);
      expect(data.validRows).toEqual([
        { rowNumber: 1, destinationUrl: "https://a.com", code: "promo1" },
        { rowNumber: 2, destinationUrl: "https://b.com/?q=1,2" },
      ]);
      expect(data.issues).toHaveLength(1);
    });

    it.each([
      ["no rows array", { items: [] }],
      ["an empty rows array", { rows: [] }],
      ["too many rows", { rows: Array.from({ length: 501 }, () => ({ destinationUrl: "https://a.com" })) }],
      ["invalid JSON", "{nope"],
    ])("returns 400 INVALID_CSV for %s", async (_label, body) => {
      signInAs(user);
      const res = await preview(jsonPost("/api/import/preview", body));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("INVALID_CSV");
    });

    it("returns 400 INVALID_CSV for a body over 1 MB", async () => {
      signInAs(user);
      const res = await preview(csvPost(`destinationUrl\n${"https://a.com\n".repeat(80000)}`));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("INVALID_CSV");
    });
  });

  describe("parseCsvText", () => {
    it.each([
      ["a missing destinationUrl column", "url,code\nhttps://a.com,x"],
      ["an unsupported column", "destinationUrl,expiresAt\nhttps://a.com,2027-01-01"],
      ["unbalanced quotes", 'destinationUrl\n"https://a.com\n'],
      ["only a header", "destinationUrl\n"],
      ["an empty file", ""],
    ])("throws INVALID_CSV for %s", (_label, text) => {
      expect(() => parseCsvText(text)).toThrowError(expect.objectContaining({ code: "INVALID_CSV" }));
    });

    it("strips a byte order mark and ignores blank lines", () => {
      expect(parseCsvText(String.fromCharCode(0xfeff) + "destinationUrl\n\nhttps://a.com\n")).toEqual([{ destinationUrl: "https://a.com" }]);
    });
  });

  describe("POST /api/import/commit", () => {
    it("returns 401 when signed out", async () => {
      signInAs(null);
      const res = await commit(jsonPost("/api/import/commit", { rows: [{ destinationUrl: "https://a.com" }] }));
      expect(res.status).toBe(401);
      expect(mocks.db.link.createMany).not.toHaveBeenCalled();
    });

    it("imports all rows for the signed-in user in one insert, generating missing codes", async () => {
      signInAs(user);
      mocks.db.link.createMany.mockResolvedValue({ count: 3 });

      const res = await commit(
        jsonPost("/api/import/commit", {
          rows: [
            { destinationUrl: "https://valid.com", code: "Promo1" },
            { destinationUrl: "https://b.com" },
            { destinationUrl: "https://c.com", ownerId: "user-2" },
          ],
        })
      );

      expect(res.status).toBe(201);
      expect(await res.json()).toEqual({ data: { importedCount: 3 } });

      const data = mocks.db.link.createMany.mock.calls[0][0].data;
      expect(data).toHaveLength(3);
      expect(data[0]).toEqual({ code: "promo1", destinationUrl: "https://valid.com", ownerId: "user-1" });
      for (const row of data) {
        expect(row.ownerId).toBe("user-1");
        expect(row.code).toMatch(/^[a-z0-9_-]{3,}$/);
      }
      expect(new Set(data.map((r: { code: string }) => r.code)).size).toBe(3);
      expect(mocks.assertRateLimit).toHaveBeenCalledWith("user-1");
    });

    it("rejects the whole batch with row numbers when any row is invalid", async () => {
      signInAs(user);
      takenCodes("taken1");
      const res = await commit(
        jsonPost("/api/import/commit", {
          rows: [
            { destinationUrl: "https://a.com", code: "fresh1" },
            { destinationUrl: "https://b.com", code: "taken1" },
            { destinationUrl: "bad-url" },
          ],
        })
      );
      expect(res.status).toBe(400);
      const json = await res.json();
      expect(json.error.code).toBe("VALIDATION_ERROR");
      expect(Object.keys(json.error.fields)).toEqual(["rows.2", "rows.3"]);
      expect(mocks.db.link.createMany).not.toHaveBeenCalled();
    });

    it("returns 400 when an alias is taken during the insert", async () => {
      signInAs(user);
      mocks.db.link.createMany.mockRejectedValue(
        new Prisma.PrismaClientKnownRequestError("Unique constraint failed", { code: "P2002", clientVersion: "6.19.3" })
      );
      const res = await commit(jsonPost("/api/import/commit", { rows: [{ destinationUrl: "https://a.com", code: "abc" }] }));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    });

    it.each([
      ["no rows array", {}],
      ["an empty rows array", { rows: [] }],
      ["invalid JSON", "{nope"],
    ])("returns 400 VALIDATION_ERROR for %s", async (_label, body) => {
      signInAs(user);
      const res = await commit(jsonPost("/api/import/commit", body));
      expect(res.status).toBe(400);
      expect((await res.json()).error.code).toBe("VALIDATION_ERROR");
    });

    it("returns 429 with retry headers when rate limited", async () => {
      signInAs(user);
      mocks.assertRateLimit.mockRejectedValue(
        new RateLimitError(undefined, { success: false, limit: 20, remaining: 0, reset: Date.now() + 30000 })
      );
      const res = await commit(jsonPost("/api/import/commit", { rows: [{ destinationUrl: "https://a.com" }] }));
      expect(res.status).toBe(429);
      expect(res.headers.get("Retry-After")).toBeTruthy();
      expect(mocks.db.link.createMany).not.toHaveBeenCalled();
    });
  });
});
