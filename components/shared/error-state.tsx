// Owner: Megha | Task: MEG-P1-1 | Priority: P1
import React from "react";

// TODO (MEG): Standard error state component with message and retry callback
export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

export function ErrorState({
  title = "Something went wrong",
  message = "An error occurred while loading this section.",
  onRetry,
}: ErrorStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 text-center border rounded-lg border-destructive/20 bg-destructive/5 space-y-3">
      <p className="font-semibold text-destructive">{title}</p>
      <p className="text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="rounded-md bg-secondary px-3 py-1.5 text-xs font-medium hover:bg-secondary/80"
        >
          Try Again
        </button>
      )}
    </div>
  );
}
