// Owner: Samriddhi | Task: SAM-P1-4 | Priority: P1
import React from "react";

// TODO (SAM): Toggle switch to include or exclude bot clicks from analytics data
export function BotToggle({
  includeBots = false,
  onToggle: _onToggle,
}: {
  includeBots?: boolean;
  onToggle?: (val: boolean) => void;
}) {
  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="text-muted-foreground">Include Bots:</span>
      <span className="font-mono text-xs">{includeBots ? "ON" : "OFF"}</span>
    </div>
  );
}
