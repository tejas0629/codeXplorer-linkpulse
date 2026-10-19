// Owner: Megha | Task: MEG-P1-5 | Priority: P1
import React from "react";
import { Badge } from "@/components/ui/badge";

// TODO (MEG): Badge displaying link status (ACTIVE, DISABLED, EXPIRED) with appropriate colors
export function LinkStatusBadge({ status }: { status: "ACTIVE" | "DISABLED" | "EXPIRED" }) {
  const variant = status === "ACTIVE" ? "default" : status === "EXPIRED" ? "secondary" : "destructive";
  return <Badge variant={variant}>{status}</Badge>;
}
