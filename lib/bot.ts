// Owner: Tejas | Task: TEJ-P1-7 | Priority: P1
import "server-only";
import { isbot } from "isbot";

// TODO (TEJ-P1-7): Identify known bot traffic using isbot to flag ClickEvent.isBot
export function isBotUserAgent(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return isbot(userAgent);
}
