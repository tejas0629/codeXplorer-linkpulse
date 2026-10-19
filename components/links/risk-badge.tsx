// Owner: Megha | Task: MEG-P2-2 | Priority: P2
import React from "react";
import { Badge } from "@/components/ui/badge";

// TODO (MEG): Safety risk score badge (LOW, MEDIUM, HIGH) shown in wizard check
export function RiskBadge({ score }: { score: "LOW" | "MEDIUM" | "HIGH" }) {
  const variant = score === "LOW" ? "default" : score === "MEDIUM" ? "secondary" : "destructive";
  return <Badge variant={variant}>Risk: {score}</Badge>;
}
