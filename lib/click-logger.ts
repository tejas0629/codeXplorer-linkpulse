// Owner: Tejas | Task: TEJ-P1-6 | Priority: P1
import "server-only";
import type { ClickSource, ClickResult } from "@prisma/client";
import { db } from "@/lib/db";

export interface LogClickParams {
  linkId: string;
  referrer: string | null;
  deviceType: string | null;
  browser: string | null;
  os: string | null;
  country: string | null;
  isBot: boolean;
  visitorId: string;
  source: ClickSource;
  result: ClickResult;
}

export async function logClickEvent(params: LogClickParams): Promise<void> {
  try {
    await db.clickEvent.create({ data: params });
  } catch {
    console.error("Click event insert failed.");
  }
}
