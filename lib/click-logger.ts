// Owner: Tejas | Task: TEJ-P1-6 | Priority: P1
import "server-only";
import type { ClickSource, ClickResult } from "@prisma/client";

export interface LogClickParams {
  linkId: string;
  referrer?: string | null;
  userAgent?: string | null;
  ip?: string | null;
  isBot?: boolean;
  source?: ClickSource;
  result?: ClickResult;
}

// TODO (TEJ-P1-6): Implement asynchronous click logging worker using ua-parser-js and Prisma
export async function logClickEvent(params: LogClickParams): Promise<void> {
  void params;
  throw new Error("NOT_IMPLEMENTED: TEJ-P1-6");
}
