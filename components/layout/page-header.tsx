// Owner: Megha | Task: MEG-P1-1 | Priority: P1
import React from "react";

// TODO (MEG): Standard page header component with title, description, and action button slot
export interface PageHeaderProps {
  title: string;
  description?: string;
  children?: React.ReactNode;
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b pb-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {children && <div>{children}</div>}
    </div>
  );
}
