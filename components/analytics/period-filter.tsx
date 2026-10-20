// Owner: Samriddhi | Task: SAM-P1-4 | Priority: P1
export type AnalyticsPeriod = "daily" | "weekly" | "monthly";

interface PeriodFilterProps {
  value: AnalyticsPeriod;
  onChange: (value: AnalyticsPeriod) => void;
  from: string;
  to: string;
  onDateRangeChange: (range: { from: string; to: string }) => void;
}

const periods: AnalyticsPeriod[] = ["daily", "weekly", "monthly"];

export function PeriodFilter({
  value,
  onChange,
  from,
  to,
  onDateRangeChange,
}: PeriodFilterProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
      <div className="inline-flex w-fit rounded-md border bg-background p-1" aria-label="Chart period">
        {periods.map((period) => (
          <button
            key={period}
            type="button"
            aria-pressed={value === period}
            onClick={() => onChange(period)}
            className={`rounded px-3 py-1.5 text-sm capitalize transition-colors ${
              value === period
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {period}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <label className="sr-only" htmlFor="analytics-from">From date</label>
        <input
          id="analytics-from"
          type="date"
          value={from}
          max={to || undefined}
          onChange={(event) => onDateRangeChange({ from: event.target.value, to })}
          className="h-9 min-w-0 rounded-md border bg-background px-2 text-foreground"
        />
        <span className="text-muted-foreground" aria-hidden="true">to</span>
        <label className="sr-only" htmlFor="analytics-to">To date</label>
        <input
          id="analytics-to"
          type="date"
          value={to}
          min={from || undefined}
          onChange={(event) => onDateRangeChange({ from, to: event.target.value })}
          className="h-9 min-w-0 rounded-md border bg-background px-2 text-foreground"
        />
      </div>
    </div>
  );
}
