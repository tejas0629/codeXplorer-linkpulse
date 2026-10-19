// Owner: Milan | Task: MIL-P2-3 | Priority: P2
import "server-only";
import type { ImportPreviewResponse } from "@/types/api";

// TODO (MIL-P2-3): Parse uploaded CSV and validate format, blocked domains, and duplicate aliases using Papaparse
export async function parseCsvLinks(csvText: string): Promise<ImportPreviewResponse> {
  void csvText;
  throw new Error("NOT_IMPLEMENTED: MIL-P2-3");
}
