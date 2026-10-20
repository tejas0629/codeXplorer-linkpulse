// Owner: Chirag | Task: CHI-P1-8 | Priority: P1

export interface PeriodRange {
  from: Date;
  to: Date;
  previousFrom: Date;
  previousTo: Date;
}

export interface TimeseriesRow {
  date: string;
  clicks: number;
  uniqueVisitors: number;
}

// Formats a Date object to YYYY-MM-DD in UTC.
export function formatUtcDate(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

// Parses period preset or custom date bounds and computes the corresponding prior comparison window in UTC.
export function parsePeriod(
  period?: "7d" | "30d" | "90d" | string,
  fromStr?: string,
  toStr?: string,
  nowInput?: Date
): PeriodRange {
  // Custom range provided
  if (fromStr && toStr) {
    const from = new Date(fromStr);
    const to = new Date(toStr);

    if (isNaN(from.getTime()) || isNaN(to.getTime())) {
      throw new Error("Invalid custom date range");
    }

    if (from.getTime() > to.getTime()) {
      throw new Error("Start date must be before or equal to end date");
    }

    const duration = to.getTime() - from.getTime();
    const previousTo = new Date(from.getTime());
    const previousFrom = new Date(from.getTime() - duration);

    return { from, to, previousFrom, previousTo };
  }

  // Preset periods: 7d, 30d, 90d (default 30d)
  const now = nowInput ?? new Date();
  let days = 30;
  if (period === "7d") days = 7;
  else if (period === "90d") days = 90;
  else if (period === "30d") days = 30;

  const to = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      23,
      59,
      59,
      999
    )
  );

  const from = new Date(
    Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate() - days + 1,
      0,
      0,
      0,
      0
    )
  );

  const durationMs = to.getTime() - from.getTime() + 1;
  const previousTo = new Date(from.getTime() - 1);
  const previousFrom = new Date(from.getTime() - durationMs);

  return { from, to, previousFrom, previousTo };
}

/**
 * Fills any date gaps in the timeseries sequence between from and to with zero-valued entries.
 * Ensures the chart receives continuous daily data points in ascending order.
 */
export function fillMissingDays(
  rows: TimeseriesRow[],
  from: Date,
  to: Date
): TimeseriesRow[] {
  const rowMap = new Map<string, TimeseriesRow>();
  for (const r of rows) {
    rowMap.set(r.date, r);
  }

  const result: TimeseriesRow[] = [];
  const current = new Date(
    Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate())
  );
  const end = new Date(
    Date.UTC(to.getUTCFullYear(), to.getUTCMonth(), to.getUTCDate())
  );

  while (current.getTime() <= end.getTime()) {
    const dateStr = formatUtcDate(current);
    const existing = rowMap.get(dateStr);

    if (existing) {
      result.push({
        date: dateStr,
        clicks: existing.clicks,
        uniqueVisitors: existing.uniqueVisitors,
      });
    } else {
      result.push({
        date: dateStr,
        clicks: 0,
        uniqueVisitors: 0,
      });
    }

    current.setUTCDate(current.getUTCDate() + 1);
  }

  return result;
}
