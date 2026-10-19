// Owner: Megha | Task: MEG-P1-1 | Priority: P1
import React from "react";

// TODO (MEG): Empty state placeholder for tables and lists with call-to-action slot
export interface EmptyStateProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function EmptyState({ title, description, children }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-8 text-center border border-dashed rounded-lg space-y-3">
      <p className="font-semibold">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {children && <div className="pt-2">{children}</div>}
    </div>
  );
}
