// Owner: Milan | Task: MIL-P2-4 | Priority: P2
import "server-only";

// TODO (MIL-P2-4): Generate QR code PNG Buffer using qrcode library with source flag (?src=qr)
export async function generateQrCodePng(url: string, size: number = 300): Promise<Buffer> {
  void url;
  void size;
  throw new Error("NOT_IMPLEMENTED: MIL-P2-4");
}
