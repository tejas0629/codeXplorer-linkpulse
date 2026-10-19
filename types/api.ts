// Owner: Chirag | Task: CHI-P1-8 | Priority: P1
import type { Role, LinkStatus } from "@prisma/client";

export interface PaginationMeta {
  page: number;
  pageSize: number;
  total: number;
}

export interface ApiSuccess<T> {
  data: T;
  meta?: PaginationMeta;
}

export interface ApiFailure {
  error: {
    code: string;
    message: string;
    fields?: Record<string, string>;
  };
}

// Redirect and Password Verification
export interface VerifyPasswordRequest {
  password: string;
}

export interface VerifyPasswordResponse {
  destinationUrl: string;
}

// Auth Endpoints
export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

export interface RegisterResponse {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  createdAt: string;
}

export interface SessionUser {
  id: string;
  name?: string | null;
  email?: string | null;
  image?: string | null;
  role: Role;
}

export interface SessionResponse {
  user: SessionUser;
  expires: string;
}

// Links
export interface CreateLinkRequest {
  destinationUrl: string;
  code?: string;
  campaignId?: string | null;
  expiresAt?: string | null;
  maxClicks?: number | null;
  password?: string | null;
  mobileUrl?: string | null;
  tagNames?: string[];
}

export interface LinkDetailResponse {
  id: string;
  code: string;
  destinationUrl: string;
  ownerId: string;
  campaignId: string | null;
  status: LinkStatus;
  expiresAt: string | null;
  maxClicks: number | null;
  clickCount: number;
  hasPassword: boolean;
  mobileUrl: string | null;
  createdAt: string;
  updatedAt: string;
  tags?: string[];
}

export interface LinkListItem {
  id: string;
  code: string;
  destinationUrl: string;
  ownerId: string;
  campaignId: string | null;
  status: LinkStatus;
  expiresAt: string | null;
  maxClicks: number | null;
  clickCount: number;
  hasPassword: boolean;
  mobileUrl: string | null;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

export interface LinkListQuery {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: LinkStatus;
  campaignId?: string;
}

export interface UpdateLinkRequest {
  destinationUrl?: string;
  status?: LinkStatus;
  expiresAt?: string | null;
  maxClicks?: number | null;
  password?: string | null;
  mobileUrl?: string | null;
  campaignId?: string | null;
  tagNames?: string[];
}

export interface DeleteLinkResponse {
  id: string;
  deleted: boolean;
}

export interface CheckLinkQuery {
  alias?: string;
  url?: string;
}

export interface CheckLinkResponse {
  aliasAvailable: boolean;
  urlValid: boolean;
  domainBlocked: boolean;
  riskScore: "LOW" | "MEDIUM" | "HIGH";
  warnings: string[];
}

// Analytics
export interface AnalyticsSummaryResponse {
  totalLinks: number;
  totalClicks: number;
  uniqueVisitors: number;
  botClicks: number;
  qrScans: number;
}

export interface AnalyticsTimeseriesItem {
  date: string;
  clicks: number;
  uniqueVisitors: number;
}

export type AnalyticsTimeseriesResponse = AnalyticsTimeseriesItem[];

export interface BreakdownItem {
  name: string;
  count: number;
  percentage: number;
}

export interface AnalyticsBreakdownResponse {
  devices: BreakdownItem[];
  browsers: BreakdownItem[];
  referrers: BreakdownItem[];
}

export interface TopLinkItem {
  id: string;
  code: string;
  destinationUrl: string;
  clicks: number;
  status: LinkStatus;
}

export type TopLinksResponse = TopLinkItem[];

export interface CampaignAnalyticsItem {
  id: string;
  name: string;
  totalLinks: number;
  totalClicks: number;
  topLinkCode: string;
}

export type CampaignAnalyticsResponse = CampaignAnalyticsItem[];

export interface LinkAlertItem {
  id: string;
  code: string;
  type: "LIMIT_NEARLY_REACHED" | "EXPIRING_SOON" | "SUDDEN_SPIKE";
  message: string;
  severity: "INFO" | "WARNING" | "CRITICAL";
}

export type LinkAlertsResponse = LinkAlertItem[];

export type InsightsResponse = string[];

// Campaigns & Tags
export interface CreateCampaignRequest {
  name: string;
  description?: string | null;
}

export interface CampaignDetailResponse {
  id: string;
  name: string;
  description: string | null;
  ownerId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CampaignListItem {
  id: string;
  name: string;
  description: string | null;
  totalLinks: number;
  totalClicks: number;
  createdAt: string;
}

export type CampaignListResponse = CampaignListItem[];

export interface UpdateCampaignRequest {
  name?: string;
  description?: string | null;
}

export interface DeleteCampaignResponse {
  id: string;
  deleted: boolean;
}

export interface CreateTagRequest {
  name: string;
}

export interface TagListItem {
  id: string;
  name: string;
}

export type TagListResponse = TagListItem[];

// Bulk Import
export interface ImportRow {
  destinationUrl: string;
  code?: string;
}

export interface ImportPreviewRequest {
  rows: ImportRow[];
}

export interface ImportPreviewIssue {
  rowNumber: number;
  code?: string;
  error: string;
}

export interface ImportPreviewResponse {
  totalRows: number;
  validCount: number;
  errorCount: number;
  duplicateCount: number;
  validRows: Array<{ rowNumber: number; destinationUrl: string; code?: string }>;
  issues: ImportPreviewIssue[];
}

export interface ImportCommitRequest {
  rows: Array<{ destinationUrl: string; code: string }>;
}

export interface ImportCommitResponse {
  importedCount: number;
}

// Admin
export interface AdminUserItem {
  id: string;
  name: string | null;
  email: string;
  role: Role;
  linksCount: number;
  createdAt: string;
}

export interface AdminLinkItem {
  id: string;
  code: string;
  destinationUrl: string;
  ownerEmail: string;
  status: LinkStatus;
  clickCount: number;
  createdAt: string;
}

export interface AdminToggleLinkResponse {
  id: string;
  status: LinkStatus;
  cacheInvalidated?: boolean;
}

export interface BlocklistDomainItem {
  id: string;
  domain: string;
  createdAt: string;
}

export type AdminBlocklistResponse = BlocklistDomainItem[];

export interface CreateBlocklistRequest {
  domain: string;
}

export interface CreateBlocklistResponse {
  id: string;
  domain: string;
  createdAt: string;
}

export interface DeleteBlocklistResponse {
  id: string;
  deleted: boolean;
}

// Trace
export interface TraceStep {
  rule: string;
  passed: boolean;
  detail: string;
}

export interface TraceResponse {
  code: string;
  steps: TraceStep[];
  outcome: string;
  targetUrl: string | null;
}
