// Owner: Chirag | Task: CHI-P1-8, CHI-P2-1, CHI-P2-2, CHI-P2-4 | Priority: P1
import "server-only";
import type {
  AnalyticsSummaryResponse,
  AnalyticsTimeseriesResponse,
  AnalyticsBreakdownResponse,
  TopLinksResponse,
  CampaignAnalyticsResponse,
  LinkAlertsResponse,
  InsightsResponse,
} from "@/types/api";

// TODO (CHI-P1-8): Aggregate total links, clicks, unique visitors, bot traffic, and QR scans
export async function getAnalyticsSummary(
  userId: string,
  isAdmin: boolean = false,
  linkId?: string
): Promise<AnalyticsSummaryResponse> {
  void userId;
  void isAdmin;
  void linkId;
  throw new Error("NOT_IMPLEMENTED: CHI-P1-8");
}

// TODO (CHI-P1-8): Return click and unique visitor timeseries grouped by daily/weekly/monthly
export async function getAnalyticsTimeseries(
  userId: string,
  options?: { from?: Date; to?: Date; linkId?: string; includeBots?: boolean }
): Promise<AnalyticsTimeseriesResponse> {
  void userId;
  void options;
  throw new Error("NOT_IMPLEMENTED: CHI-P1-8");
}

// TODO (CHI-P1-8): Return device, browser, and referrer breakdowns with percentages
export async function getAnalyticsBreakdown(
  userId: string,
  options?: { linkId?: string; includeBots?: boolean }
): Promise<AnalyticsBreakdownResponse> {
  void userId;
  void options;
  throw new Error("NOT_IMPLEMENTED: CHI-P1-8");
}

// TODO (CHI-P1-8): Return top performing links sorted by click count
export async function getTopLinks(
  userId: string,
  limit: number = 5
): Promise<TopLinksResponse> {
  void userId;
  void limit;
  throw new Error("NOT_IMPLEMENTED: CHI-P1-8");
}

// TODO (CHI-P2-1): Return campaign performance metrics
export async function getCampaignAnalytics(
  userId: string
): Promise<CampaignAnalyticsResponse> {
  void userId;
  throw new Error("NOT_IMPLEMENTED: CHI-P2-1");
}

// TODO (CHI-P2-2): Return link alerts (expiring soon, limit nearly reached)
export async function getLinkAlerts(
  userId: string
): Promise<LinkAlertsResponse> {
  void userId;
  throw new Error("NOT_IMPLEMENTED: CHI-P2-2");
}

// TODO (CHI-P2-4): Return plain-English automated insights from analytics
export async function getAnalyticsInsights(
  userId: string
): Promise<InsightsResponse> {
  void userId;
  throw new Error("NOT_IMPLEMENTED: CHI-P2-4");
}
