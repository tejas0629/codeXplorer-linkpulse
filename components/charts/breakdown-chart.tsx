// Owner: Samriddhi | Task: SAM-P1-3 | Priority: P1
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface BreakdownItem {
  name: string;
  count: number;
  percentage: number;
}

interface BreakdownChartProps {
  title: string;
  data?: BreakdownItem[];
  loading?: boolean;
}

export function BreakdownChart({ title, data = [], loading = false }: BreakdownChartProps) {
  if (loading) {
    return <div className="h-56 animate-pulse rounded-md bg-muted/50" aria-label={`Loading ${title}`} />;
  }

  return (
    <section className="min-w-0 rounded-lg border bg-card p-4">
      <h3 className="mb-3 text-sm font-semibold">{title}</h3>
      {data.length === 0 ? (
        <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">No breakdown data.</div>
      ) : (
        <div className="h-48 w-full" role="img" aria-label={`${title} breakdown chart`}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} layout="vertical" margin={{ top: 0, right: 8, bottom: 0, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} className="stroke-border" />
              <XAxis type="number" hide />
              <YAxis type="category" dataKey="name" width={88} tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value, _name, item) => [`${Number(value).toLocaleString()} (${item.payload.percentage}%)`, "Clicks"]} />
              <Bar dataKey="count" name="Clicks" fill="var(--chart-3)" radius={[0, 3, 3, 0]} maxBarSize={22} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
