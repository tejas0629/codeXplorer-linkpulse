// Owner: Megha | Task: MEG-P1-5 | Priority: P1
import React from "react";
import { Badge } from "@/components/ui/badge";
import type { LinkStatus } from "@prisma/client";

// TODO (MEG): Badge displaying link status (ACTIVE, DISABLED, ADMIN_DISABLED, EXPIRED) with appropriate colors
export function LinkStatusBadge({ status }: { status: LinkStatus | "EXPIRED" }) {
  const variant = status === "ACTIVE" ? "default" : status === "EXPIRED" ? "secondary" : "destructive";
  return <Badge variant={variant}>{status}</Badge>;
}
