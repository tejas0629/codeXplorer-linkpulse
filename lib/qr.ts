// Owner: Milan | Task: MIL-P2-4 | Priority: P2
import "server-only";
import QRCode from "qrcode";
import { z } from "zod";
import { db } from "@/lib/db";
import { ApiError } from "@/lib/api-response";
import { canAccessOwnedResource, type SessionUser } from "@/lib/rbac";

export const QR_MIN_SIZE = 100;
export const QR_MAX_SIZE = 1000;
export const QR_DEFAULT_SIZE = 300;

export const qrSizeSchema = z.coerce
  .number({ message: "Size must be a number" })
  .int("Size must be a whole number")
  .min(QR_MIN_SIZE, `Size must be between ${QR_MIN_SIZE} and ${QR_MAX_SIZE}`)
  .max(QR_MAX_SIZE, `Size must be between ${QR_MIN_SIZE} and ${QR_MAX_SIZE}`);

export function parseQrSize(raw: string | null): number {
  if (raw === null || raw.trim() === "") {
    return QR_DEFAULT_SIZE;
  }
  const result = qrSizeSchema.safeParse(raw);
  if (!result.success) {
    const message = result.error.issues[0]?.message ?? "Invalid size";
    throw new ApiError("VALIDATION_ERROR", message, 400, { size: message });
  }
  return result.data;
}

/**
 * Builds the URL encoded in the QR code. The src=qr flag makes the redirect
 * route record the visit with ClickSource QR, so scans are counted separately.
 */
export function buildQrTargetUrl(code: string, baseUrl: string): string {
  const url = new URL(`/${encodeURIComponent(code)}`, baseUrl);
  url.searchParams.set("src", "qr");
  return url.toString();
}

/**
 * Returns the public base URL from NEXT_PUBLIC_APP_URL. Falls back to the
 * origin serving the request only when the variable is not configured.
 */
export function resolvePublicBaseUrl(requestOrigin: string): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    try {
      return new URL(configured).origin;
    } catch {
      // Invalid value: fall through to the request origin.
    }
  }
  return requestOrigin;
}

export async function generateQrCodePng(url: string, size: number = QR_DEFAULT_SIZE): Promise<Buffer> {
  return QRCode.toBuffer(url, {
    type: "png",
    width: size,
    margin: 2,
    errorCorrectionLevel: "M",
  });
}

/**
 * Loads a link the caller may see and returns its short code.
 * Missing or soft-deleted links are 404 LINK_NOT_FOUND; another user's link is
 * 403 FORBIDDEN unless the caller is an admin. Nothing is written.
 */
export async function getQrLinkCode(user: SessionUser, id: string): Promise<string> {
  const link = await db.link.findFirst({
    where: { id, deletedAt: null },
    select: { code: true, ownerId: true },
  });
  if (!link) {
    throw new ApiError("LINK_NOT_FOUND", "Link not found", 404);
  }
  if (!canAccessOwnedResource(user, link.ownerId)) {
    throw new ApiError("FORBIDDEN", "You do not have access to this link", 403);
  }
  return link.code;
}
