// Owner: Samriddhi | Task: SAM-P1-2 | Priority: P1
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export interface TimeseriesPoint {
  date: string;
  clicks: number;
  uniqueVisitors: number;
}

interface ClicksChartProps {
  data?: TimeseriesPoint[];
  loading?: boolean;
}

export function ClicksChart({ data = [], loading = false }: ClicksChartProps) {
  if (loading) {
    return <div className="h-72 animate-pulse rounded-md bg-muted/50" aria-label="Loading clicks chart" />;
  }

  if (data.length === 0) {
    return <div className="flex h-72 items-center justify-center text-sm text-muted-foreground">No click activity for this period.</div>;
  }

  return (
    <div className="h-72 w-full" role="img" aria-label="Clicks and unique visitors over time">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 12, right: 12, bottom: 4, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} className="stroke-border" />
          <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <YAxis allowDecimals={false} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
          <Tooltip
            contentStyle={{ borderRadius: 8, borderColor: "var(--border)", backgroundColor: "var(--card)" }}
            labelStyle={{ color: "" }}
          />
          <Line type="monotone" dataKey="clicks" name="Clicks" stroke="var(--chart-1)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
          <Line type="monotone" dataKey="uniqueVisitors" name="Unique visitors" stroke="var(--chart-2)" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
