// Owner: Samriddhi | Task: SAM-P1-1 | Priority: P1
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface AnalyticsSummary {
  totalLinks: number;
  totalClicks: number;
  uniqueVisitors: number;
  botClicks: number;
  qrScans: number;
}

interface StatCardsProps {
  data?: AnalyticsSummary;
  loading?: boolean;
}

const metrics: { label: string; key: keyof AnalyticsSummary }[] = [
  { label: "Total Links", key: "totalLinks" },
  { label: "Total Clicks", key: "totalClicks" },
  { label: "Unique Visitors", key: "uniqueVisitors" },
];

export function StatCards({ data, loading = false }: StatCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      {metrics.map(({ label, key }) => (
        <Card key={key} className="gap-4 rounded-lg py-5 shadow-none">
          <CardHeader className="px-5 pb-0">
            <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
          </CardHeader>
          <CardContent className="px-5">
            {loading ? (
              <div className="h-8 w-28 animate-pulse rounded bg-muted" aria-label={`Loading ${label}`} />
            ) : data ? (
              <div className="text-2xl font-semibold tabular-nums">{data[key].toLocaleString()}</div>
            ) : (
              <p className="text-sm text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
