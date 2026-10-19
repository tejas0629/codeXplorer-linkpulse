// Owner: Samriddhi | Task: SAM-P1-4 | Priority: P1
import React from "react";

// TODO (SAM): Period filter switcher (daily, weekly, monthly)
export function PeriodFilter({
  value = "daily",
  onChange: _onChange,
}: {
  value?: "daily" | "weekly" | "monthly";
  onChange?: (val: "daily" | "weekly" | "monthly") => void;
}) {
  return (
    <div className="flex items-center space-x-2 text-sm">
      <span className="text-muted-foreground">Period:</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
