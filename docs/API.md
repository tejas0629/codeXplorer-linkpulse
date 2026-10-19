# LinkPulse API Specification

This document defines all endpoints, request shapes, and response structures for LinkPulse. Both frontend and backend developers must adhere strictly to these contracts.

## 1. Conventions

### Response Format
All successful responses return a top-level `data` key. Paginated lists include a `meta` block:

```json
{
  "data": [ ... ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 45
  }
}
```

### Error Format
All errors return an `error` object with standard codes, human-readable message, and optional field-level details:

```json
{
  "error": {
    "code": "ALIAS_TAKEN",
    "message": "The requested short alias is already taken.",
    "fields": {
      "alias": "marketing-launch"
    }
  }
}
```

### Common HTTP Status Codes
- 200 OK: Request succeeded.
- 201 Created: Resource created successfully.
- 400 Bad Request: Input validation failure (Zod error).
- 401 Unauthorized: User is not authenticated.
- 403 Forbidden: User does not have permission (wrong role or not owner).
- 404 Not Found: Requested resource does not exist.
- 409 Conflict: Unique constraint violation (such as duplicate alias or email).
- 429 Too Many Requests: Rate limit exceeded.

### Query Parameters
- Pagination: `?page=1&pageSize=20` (defaults: page 1, pageSize 20, max 100).
- Period filter: `?period=daily|weekly|monthly&from=2026-10-01T00:00:00.000Z&to=2026-10-18T23:59:59.000Z`.
- Bot filtering: `?includeBots=true|false` (default: false).

---

## 2. Public Visitor and Redirect Routes

### GET /[code]
- Owner: Tejas
- Priority: P1
- Auth: Public
- Description: Public entry point for shortened URLs. Evaluates rules in fixed order: existence, active status, expiration, click cap, password protection. If all checks pass, redirects with HTTP 302 and logs ClickEvent asynchronously. Soft-deleted links (deletedAt is set) return not-found.
- Request: Path parameter `code` (string, 3 to 64 chars).
- Responses:
  - 302 Found: Redirects to `destinationUrl` (or `mobileUrl` if mobile device detected).
  - Redirect to Visitor Status Pages on failure:
    - `/not-found` if code does not exist or has been soft-deleted (deletedAt is set).
    - `/disabled` if link status is DISABLED or ADMIN_DISABLED.
    - `/expired` if expiresAt is in the past.
    - `/limit-reached` if clickCount >= maxClicks.
    - `/password/[code]` if link requires password verification.

### POST /api/unlock/[code]
- Owner: Tejas
- Priority: P1
- Auth: Public
- Description: Verifies password for protected link. On success returns destination URL so visitor can proceed.
- Request Body:
```json
{
  "password": "linkpassword123"
}
```
- Success Response (200 OK):
```json
{
  "data": {
    "destinationUrl": "https://example.com/target-doc"
  }
}
```
- Error Codes: 400 (INVALID_INPUT), 401 (INVALID_PASSWORD), 404 (LINK_NOT_FOUND).

---

## 3. Authentication Endpoints

### POST /api/auth/register
- Owner: Milan
- Priority: P1
- Auth: Public
- Description: Creates a new user account with credentials.
- Request Body:
```json
{
  "name": "Alex Taylor",
  "email": "alex@example.com",
  "password": "Password123!"
}
```
- Validation Limits: name (max 100), email (valid email format, max 150), password (min 8, max 72).
- Success Response (201 Created):
```json
{
  "data": {
    "id": "clz123456000008l8g8a3z4x1",
    "name": "Alex Taylor",
    "email": "alex@example.com",
    "role": "USER",
    "createdAt": "2026-10-18T10:00:00.000Z"
  }
}
```
- Error Codes: 400 (VALIDATION_ERROR), 409 (EMAIL_EXISTS).

### GET /api/auth/session
- Owner: Milan
- Priority: P1
- Auth: Public
- Description: Returns current session data including user role.
- Success Response (200 OK):
```json
{
  "data": {
    "user": {
      "id": "clz123456000008l8g8a3z4x1",
      "name": "Alex Taylor",
      "email": "alex@example.com",
      "role": "USER"
    },
    "expires": "2026-11-18T10:00:00.000Z"
  }
}
```
- Error Codes: None (returns `{ "data": null }` if unauthenticated).

---

## 4. Link Management Endpoints

### POST /api/links
- Owner: Chirag
- Priority: P1
- Auth: USER or ADMIN
- Description: Creates a new shortened link with optional rules, tags, and campaign.
- Request Body:
```json
{
  "destinationUrl": "https://company.org/annual-report-2026",
  "code": "report2026",
  "campaignId": "clzcampaign000108l8a1b2c3d4",
  "expiresAt": "2026-12-31T23:59:59.000Z",
  "maxClicks": 500,
  "password": "optionalpassword",
  "mobileUrl": "https://company.org/annual-report-mobile",
  "tagNames": ["annual", "finance"]
}
```
- Validation: destinationUrl (valid url, max 2048, not blocked), code (3 to 64 chars, alphanumeric and hyphens), maxClicks (positive integer).
- Success Response (201 Created):
```json
{
  "data": {
    "id": "clzlink0000108l8d1e2f3g4",
    "code": "report2026",
    "destinationUrl": "https://company.org/annual-report-2026",
    "ownerId": "clz123456000008l8g8a3z4x1",
    "campaignId": "clzcampaign000108l8a1b2c3d4",
    "status": "ACTIVE",
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "maxClicks": 500,
    "clickCount": 0,
    "hasPassword": true,
    "mobileUrl": "https://company.org/annual-report-mobile",
    "createdAt": "2026-10-18T12:00:00.000Z",
    "updatedAt": "2026-10-18T12:00:00.000Z"
  }
}
```
- Error Codes: 400 (INVALID_URL, BLOCKED_DOMAIN, INVALID_ALIAS), 401 (UNAUTHORIZED), 409 (ALIAS_TAKEN), 429 (RATE_LIMIT_EXCEEDED).

### GET /api/links
- Owner: Chirag
- Priority: P1
- Auth: USER (own links) or ADMIN (all links)
- Description: Lists shortened links. Excludes soft-deleted links (where deletedAt is set).
- Query Parameters: `?page=1&pageSize=20&search=report&status=ACTIVE&campaignId=`
- Success Response (200 OK):
```json
{
  "data": [
    {
      "id": "clzlink0000108l8d1e2f3g4",
      "code": "report2026",
      "destinationUrl": "https://company.org/annual-report-2026",
      "ownerId": "clz123456000008l8g8a3z4x1",
      "campaignId": "clzcampaign000108l8a1b2c3d4",
      "status": "ACTIVE",
      "expiresAt": "2026-12-31T23:59:59.000Z",
      "maxClicks": 500,
      "clickCount": 42,
      "hasPassword": true,
      "mobileUrl": null,
      "createdAt": "2026-10-18T12:00:00.000Z",
      "updatedAt": "2026-10-18T12:00:00.000Z",
      "tags": ["annual", "finance"]
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```
- Error Codes: 401 (UNAUTHORIZED).

### GET /api/links/[id]
- Owner: Chirag
- Priority: P1
- Auth: Owner or ADMIN
- Description: Returns link details. Excludes soft-deleted links (returns 404 LINK_NOT_FOUND if deletedAt is set).
- Success Response (200 OK):
```json
{
  "data": {
    "id": "clzlink0000108l8d1e2f3g4",
    "code": "report2026",
    "destinationUrl": "https://company.org/annual-report-2026",
    "ownerId": "clz123456000008l8g8a3z4x1",
    "campaignId": "clzcampaign000108l8a1b2c3d4",
    "status": "ACTIVE",
    "expiresAt": "2026-12-31T23:59:59.000Z",
    "maxClicks": 500,
    "clickCount": 42,
    "hasPassword": true,
    "mobileUrl": null,
    "createdAt": "2026-10-18T12:00:00.000Z",
    "updatedAt": "2026-10-18T12:00:00.000Z",
    "tags": ["annual", "finance"]
  }
}
```
- Error Codes: 401 (UNAUTHORIZED), 403 (FORBIDDEN), 404 (LINK_NOT_FOUND).

### PATCH /api/links/[id]
- Owner: Chirag
- Priority: P1
- Auth: Owner or ADMIN
- Description: Updates link configuration. Excludes soft-deleted links (returns 404 LINK_NOT_FOUND). An owner can only switch their own link between ACTIVE and DISABLED. If an owner attempts to set status ACTIVE on an ADMIN_DISABLED link, the endpoint returns 403 FORBIDDEN with message "This link was disabled by an administrator and can only be re-enabled by an admin." Only an admin can re-enable an ADMIN_DISABLED link.
- Request Body (all optional):
```json
{
  "destinationUrl": "https://company.org/updated-url",
  "status": "DISABLED",
  "expiresAt": null,
  "maxClicks": 1000,
  "password": "newpassword",
  "mobileUrl": null,
  "campaignId": null,
  "tagNames": ["updated"]
}
```
- Success Response (200 OK):
```json
{
  "data": {
    "id": "clzlink0000108l8d1e2f3g4",
    "code": "report2026",
    "destinationUrl": "https://company.org/updated-url",
    "ownerId": "clz123456000008l8g8a3z4x1",
    "campaignId": null,
    "status": "DISABLED",
    "expiresAt": null,
    "maxClicks": 1000,
    "clickCount": 42,
    "hasPassword": true,
    "mobileUrl": null,
    "createdAt": "2026-10-18T12:00:00.000Z",
    "updatedAt": "2026-10-18T13:00:00.000Z"
  }
}
```
- Error Codes: 400 (VALIDATION_ERROR), 401 (UNAUTHORIZED), 403 (FORBIDDEN), 404 (LINK_NOT_FOUND).

### DELETE /api/links/[id]
- Owner: Chirag
- Priority: P1
- Auth: Owner or ADMIN
- Description: Soft-deletes a link by setting deletedAt to the current timestamp. Preserves all click event history and analytics for reporting. The short code remains reserved in the database because code has a unique constraint. All list, read, update, and redirect queries ignore soft-deleted links.
- Success Response (200 OK):
```json
{
  "data": {
    "id": "clzlink0000108l8d1e2f3g4",
    "deleted": true
  }
}
```
- Error Codes: 401 (UNAUTHORIZED), 403 (FORBIDDEN), 404 (LINK_NOT_FOUND).

### GET /api/links/check
- Owner: Chirag
- Priority: P1
- Auth: USER or ADMIN
- Description: Validates alias availability and tests destination domain against blocklist before publishing.
- Query Parameters: `?alias=my-promo&url=https://target.com`
- Success Response (200 OK):
```json
{
  "data": {
    "aliasAvailable": true,
    "urlValid": true,
    "domainBlocked": false,
    "riskScore": "LOW",
    "warnings": []
  }
}
```
- Error Codes: 400 (MISSING_QUERY_PARAMS), 401 (UNAUTHORIZED).

---

## 5. Analytics Endpoints

All analytics endpoints support `?period=daily|weekly|monthly`, `?from=ISO`, `?to=ISO`, `?includeBots=true|false`, and optional `?linkId=`.

### GET /api/analytics/summary
- Owner: Chirag
- Priority: P1
- Auth: USER (own links) or ADMIN (platform-wide)
- Success Response (200 OK):
```json
{
  "data": {
    "totalLinks": 12,
    "totalClicks": 1420,
    "uniqueVisitors": 980,
    "botClicks": 65,
    "qrScans": 180
  }
}
```
- Error Codes: 401 (UNAUTHORIZED).

### GET /api/analytics/timeseries
- Owner: Chirag
- Priority: P1
- Auth: USER or ADMIN
- Success Response (200 OK):
```json
{
  "data": [
    {
      "date": "2026-10-12",
      "clicks": 140,
      "uniqueVisitors": 95
    },
    {
      "date": "2026-10-13",
      "clicks": 210,
      "uniqueVisitors": 150
    }
  ]
}
```
- Error Codes: 401 (UNAUTHORIZED).

### GET /api/analytics/breakdown
- Owner: Chirag
- Priority: P1
- Auth: USER or ADMIN
- Success Response (200 OK):
```json
{
  "data": {
    "devices": [
      { "name": "desktop", "count": 820, "percentage": 57.7 },
      { "name": "mobile", "count": 520, "percentage": 36.6 },
      { "name": "tablet", "count": 80, "percentage": 5.7 }
    ],
    "browsers": [
      { "name": "Chrome", "count": 910, "percentage": 64.1 },
      { "name": "Safari", "count": 310, "percentage": 21.8 },
      { "name": "Firefox", "count": 200, "percentage": 14.1 }
    ],
    "referrers": [
      { "name": "direct", "count": 650, "percentage": 45.8 },
      { "name": "twitter.com", "count": 420, "percentage": 29.6 },
      { "name": "linkedin.com", "count": 350, "percentage": 24.6 }
    ]
  }
}
```
- Error Codes: 401 (UNAUTHORIZED).

### GET /api/analytics/top-links
- Owner: Chirag
- Priority: P1
- Auth: USER or ADMIN
- Query Parameters: `?limit=5`
- Success Response (200 OK):
```json
{
  "data": [
    {
      "id": "clzlink0000108l8d1e2f3g4",
      "code": "report2026",
      "destinationUrl": "https://company.org/annual-report-2026",
      "clicks": 620,
      "status": "ACTIVE"
    }
  ]
}
```
- Error Codes: 401 (UNAUTHORIZED).

### GET /api/analytics/campaigns
- Owner: Chirag
- Priority: P2
- Auth: USER or ADMIN
- Success Response (200 OK):
```json
{
  "data": [
    {
      "id": "clzcampaign000108l8a1b2c3d4",
      "name": "Fall Product Launch",
      "totalLinks": 4,
      "totalClicks": 890,
      "topLinkCode": "launch-deal"
    }
  ]
}
```
- Error Codes: 401 (UNAUTHORIZED).

### GET /api/analytics/alerts
- Owner: Chirag
- Priority: P2
- Auth: USER or ADMIN
- Success Response (200 OK):
```json
{
  "data": [
    {
      "id": "clzlink0000108l8d1e2f3g4",
      "code": "discount-code",
      "type": "LIMIT_NEARLY_REACHED",
      "message": "Link has reached 480 of 500 max clicks (96%).",
      "severity": "WARNING"
    },
    {
      "id": "clzlink0000208l8d1e2f3g5",
      "code": "autumn-sale",
      "type": "EXPIRING_SOON",
      "message": "Link expires in less than 24 hours.",
      "severity": "INFO"
    }
  ]
}
```
- Error Codes: 401 (UNAUTHORIZED).

### GET /api/analytics/insights
- Owner: Chirag
- Priority: P2
- Auth: USER or ADMIN
- Success Response (200 OK):
```json
{
  "data": [
    "Mobile traffic grew by 32% compared to last week.",
    "Twitter is your highest converting external referrer.",
    "Link report2026 generates 45% of your total traffic."
  ]
}
```
- Error Codes: 401 (UNAUTHORIZED).

---

## 6. Campaigns and Tags Endpoints

### POST /api/campaigns
- Owner: Milan
- Priority: P2
- Auth: USER or ADMIN
- Request Body:
```json
{
  "name": "Black Friday 2026",
  "description": "Promotional links for holiday discount campaigns"
}
```
- Success Response (201 Created):
```json
{
  "data": {
    "id": "clzcamp0000108l8g8a3z4x1",
    "name": "Black Friday 2026",
    "description": "Promotional links for holiday discount campaigns",
    "ownerId": "clz123456000008l8g8a3z4x1",
    "createdAt": "2026-10-18T10:00:00.000Z",
    "updatedAt": "2026-10-18T10:00:00.000Z"
  }
}
```
- Error Codes: 400 (VALIDATION_ERROR), 401 (UNAUTHORIZED).

### GET /api/campaigns
- Owner: Milan
- Priority: P2
- Auth: USER or ADMIN
- Success Response (200 OK):
```json
{
  "data": [
    {
      "id": "clzcamp0000108l8g8a3z4x1",
      "name": "Black Friday 2026",
      "description": "Promotional links for holiday discount campaigns",
      "totalLinks": 3,
      "totalClicks": 340,
      "createdAt": "2026-10-18T10:00:00.000Z"
    }
  ]
}
```
- Error Codes: 401 (UNAUTHORIZED).

### PATCH /api/campaigns/[id]
- Owner: Milan
- Priority: P2
- Auth: Owner or ADMIN
- Request Body:
```json
{
  "name": "Holiday Season 2026",
  "description": "Updated holiday campaign"
}
```
- Success Response (200 OK):
```json
{
  "data": {
    "id": "clzcamp0000108l8g8a3z4x1",
    "name": "Holiday Season 2026",
    "description": "Updated holiday campaign",
    "updatedAt": "2026-10-18T11:00:00.000Z"
  }
}
```
- Error Codes: 400 (VALIDATION_ERROR), 401 (UNAUTHORIZED), 403 (FORBIDDEN), 404 (NOT_FOUND).

### DELETE /api/campaigns/[id]
- Owner: Milan
- Priority: P2
- Auth: Owner or ADMIN
- Success Response (200 OK):
```json
{
  "data": {
    "id": "clzcamp0000108l8g8a3z4x1",
    "deleted": true
  }
}
```
- Error Codes: 401 (UNAUTHORIZED), 403 (FORBIDDEN), 404 (NOT_FOUND).

### POST /api/tags
- Owner: Milan
- Priority: P2
- Auth: USER or ADMIN
- Description: Creates a new tag scoped to the signed-in user (owner). Tag names are unique per owner. If a tag with the same name already exists for the owner, returns 409 Conflict.
- Request Body:
```json
{
  "name": "social-media"
}
```
- Success Response (201 Created):
```json
{
  "data": {
    "id": "clztag0000108l8g8a3z4x1",
    "name": "social-media",
    "createdAt": "2026-10-18T10:00:00.000Z"
  }
}
```
- Error Codes: 400 (VALIDATION_ERROR), 401 (UNAUTHORIZED), 409 (TAG_EXISTS).

### GET /api/tags
- Owner: Milan
- Priority: P2
- Auth: USER or ADMIN
- Description: Lists tags belonging to the signed-in user (or all tags across all owners if requested by an admin).
- Success Response (200 OK):
```json
{
  "data": [
    {
      "id": "clztag0000108l8g8a3z4x1",
      "name": "social-media"
    }
  ]
}
```
- Error Codes: 401 (UNAUTHORIZED).

---

## 7. Bulk Import Endpoints

### POST /api/import/preview
- Owner: Milan
- Priority: P2
- Auth: USER or ADMIN
- Description: Parses uploaded CSV data and validates each row for correct format, blocked domains, and duplicate aliases. Does not write to database.
- Request Body:
```json
{
  "rows": [
    { "destinationUrl": "https://valid.com", "code": "promo1" },
    { "destinationUrl": "bad-url", "code": "promo2" },
    { "destinationUrl": "https://valid.com", "code": "report2026" }
  ]
}
```
- Success Response (200 OK):
```json
{
  "data": {
    "totalRows": 3,
    "validCount": 1,
    "errorCount": 1,
    "duplicateCount": 1,
    "validRows": [
      { "rowNumber": 1, "destinationUrl": "https://valid.com", "code": "promo1" }
    ],
    "issues": [
      { "rowNumber": 2, "code": "promo2", "error": "Invalid URL format" },
      { "rowNumber": 3, "code": "report2026", "error": "Alias already taken" }
    ]
  }
}
```
- Error Codes: 400 (INVALID_CSV), 401 (UNAUTHORIZED).

### POST /api/import/commit
- Owner: Milan
- Priority: P2
- Auth: USER or ADMIN
- Description: Commits validated link rows in batch.
- Request Body:
```json
{
  "rows": [
    { "destinationUrl": "https://valid.com", "code": "promo1" }
  ]
}
```
- Success Response (201 Created):
```json
{
  "data": {
    "importedCount": 1
  }
}
```
- Error Codes: 400 (VALIDATION_ERROR), 401 (UNAUTHORIZED).

---

## 8. QR Code Endpoint

### GET /api/qr/[id]
- Owner: Milan
- Priority: P2
- Auth: Owner or ADMIN
- Description: Generates PNG QR code for a given link ID. The encoded URL points to `https://[app-url]/[code]?src=qr` so that visits are tracked with ClickSource = QR.
- Query Parameters: `?size=300` (optional image width/height).
- Success Response (200 OK): Binary image `image/png`.
- Error Codes: 401 (UNAUTHORIZED), 403 (FORBIDDEN), 404 (LINK_NOT_FOUND).

---

## 9. Admin Endpoints

### GET /api/admin/users
- Owner: Milan
- Priority: P1
- Auth: ADMIN
- Query Parameters: `?page=1&pageSize=20&search=`
- Success Response (200 OK):
```json
{
  "data": [
    {
      "id": "clz123456000008l8g8a3z4x1",
      "name": "Alex Taylor",
      "email": "alex@example.com",
      "role": "USER",
      "linksCount": 8,
      "createdAt": "2026-10-18T10:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```
- Error Codes: 401 (UNAUTHORIZED), 403 (ADMIN_REQUIRED).

### GET /api/admin/links
- Owner: Milan
- Priority: P1
- Auth: ADMIN
- Query Parameters: `?page=1&pageSize=20&search=&status=`
- Success Response (200 OK):
```json
{
  "data": [
    {
      "id": "clzlink0000108l8d1e2f3g4",
      "code": "report2026",
      "destinationUrl": "https://company.org/annual-report-2026",
      "ownerEmail": "alex@example.com",
      "status": "ACTIVE",
      "clickCount": 42,
      "createdAt": "2026-10-18T12:00:00.000Z"
    }
  ],
  "meta": {
    "page": 1,
    "pageSize": 20,
    "total": 1
  }
}
```
- Error Codes: 401 (UNAUTHORIZED), 403 (ADMIN_REQUIRED).

### PATCH /api/admin/links/[id]/disable
- Owner: Milan
- Priority: P1
- Auth: ADMIN
- Description: Immediately disables a link by setting its status to ADMIN_DISABLED and invalidates Redis cache so redirects stop at once. A link with ADMIN_DISABLED status cannot be re-enabled by its owner; only an administrator can re-enable it.
- Success Response (200 OK):
```json
{
  "data": {
    "id": "clzlink0000108l8d1e2f3g4",
    "status": "ADMIN_DISABLED",
    "cacheInvalidated": true
  }
}
```
- Error Codes: 401 (UNAUTHORIZED), 403 (ADMIN_REQUIRED), 404 (LINK_NOT_FOUND).

### PATCH /api/admin/links/[id]/enable
- Owner: Milan
- Priority: P1
- Auth: ADMIN
- Description: Re-enables a DISABLED or ADMIN_DISABLED link by setting its status to ACTIVE. Only an admin can re-enable an ADMIN_DISABLED link.
- Success Response (200 OK):
```json
{
  "data": {
    "id": "clzlink0000108l8d1e2f3g4",
    "status": "ACTIVE"
  }
}
```
- Error Codes: 401 (UNAUTHORIZED), 403 (ADMIN_REQUIRED), 404 (LINK_NOT_FOUND).

### GET /api/admin/blocklist
- Owner: Milan
- Priority: P2
- Auth: ADMIN
- Success Response (200 OK):
```json
{
  "data": [
    {
      "id": "clzblock0000108l8g8a3z4x1",
      "domain": "phishing-link.net",
      "createdAt": "2026-10-18T10:00:00.000Z"
    }
  ]
}
```
- Error Codes: 401 (UNAUTHORIZED), 403 (ADMIN_REQUIRED).

### POST /api/admin/blocklist
- Owner: Milan
- Priority: P2
- Auth: ADMIN
- Request Body:
```json
{
  "domain": "malicious-site.com"
}
```
- Success Response (201 Created):
```json
{
  "data": {
    "id": "clzblock0000208l8g8a3z4x2",
    "domain": "malicious-site.com",
    "createdAt": "2026-10-18T14:00:00.000Z"
  }
}
```
- Error Codes: 400 (INVALID_DOMAIN), 401 (UNAUTHORIZED), 403 (ADMIN_REQUIRED), 409 (DOMAIN_EXISTS).

### DELETE /api/admin/blocklist/[id]
- Owner: Milan
- Priority: P2
- Auth: ADMIN
- Success Response (200 OK):
```json
{
  "data": {
    "id": "clzblock0000208l8g8a3z4x2",
    "deleted": true
  }
}
```
- Error Codes: 401 (UNAUTHORIZED), 403 (ADMIN_REQUIRED), 404 (NOT_FOUND).

---

## 10. Diagnostics and Trace Endpoint

### GET /api/trace
- Owner: Tejas
- Priority: P2
- Auth: USER or ADMIN
- Description: Simulates link rule evaluation step by step to explain why a link redirects or fails.
- Query Parameters: `?code=report2026`
- Success Response (200 OK):
```json
{
  "data": {
    "code": "report2026",
    "steps": [
      { "rule": "EXISTS", "passed": true, "detail": "Link found in database" },
      { "rule": "ACTIVE_STATUS", "passed": true, "detail": "Status is ACTIVE" },
      { "rule": "NOT_EXPIRED", "passed": true, "detail": "Expires at 2026-12-31 (future)" },
      { "rule": "CLICK_CAP", "passed": true, "detail": "Clicks: 42/500" },
      { "rule": "PASSWORD_CHECK", "passed": true, "detail": "Password protection enabled" }
    ],
    "outcome": "PASSWORD_REQUIRED",
    "targetUrl": "https://company.org/annual-report-2026"
  }
}
```
- Error Codes: 400 (MISSING_CODE), 401 (UNAUTHORIZED), 404 (LINK_NOT_FOUND).

---

## 11. Status of Each Endpoint

| Endpoint | Method | Owner | Priority | Status |
|---|---|---|---|---|
| `/[code]` | GET | Tejas | P1 | planned |
| `/api/unlock/[code]` | POST | Tejas | P1 | planned |
| `/api/auth/register` | POST | Milan | P1 | planned |
| `/api/auth/session` | GET | Milan | P1 | planned |
| `/api/links` | POST | Chirag | P1 | planned |
| `/api/links` | GET | Chirag | P1 | planned |
| `/api/links/[id]` | GET | Chirag | P1 | planned |
| `/api/links/[id]` | PATCH | Chirag | P1 | planned |
| `/api/links/[id]` | DELETE | Chirag | P1 | planned |
| `/api/links/check` | GET | Chirag | P1 | planned |
| `/api/analytics/summary` | GET | Chirag | P1 | planned |
| `/api/analytics/timeseries` | GET | Chirag | P1 | planned |
| `/api/analytics/breakdown` | GET | Chirag | P1 | planned |
| `/api/analytics/top-links` | GET | Chirag | P1 | planned |
| `/api/analytics/campaigns` | GET | Chirag | P2 | planned |
| `/api/analytics/alerts` | GET | Chirag | P2 | planned |
| `/api/analytics/insights` | GET | Chirag | P2 | planned |
| `/api/campaigns` | POST | Milan | P2 | planned |
| `/api/campaigns` | GET | Milan | P2 | planned |
| `/api/campaigns/[id]` | PATCH | Milan | P2 | planned |
| `/api/campaigns/[id]` | DELETE | Milan | P2 | planned |
| `/api/tags` | POST | Milan | P2 | planned |
| `/api/tags` | GET | Milan | P2 | planned |
| `/api/import/preview` | POST | Milan | P2 | planned |
| `/api/import/commit` | POST | Milan | P2 | planned |
| `/api/qr/[id]` | GET | Milan | P2 | planned |
| `/api/admin/users` | GET | Milan | P1 | planned |
| `/api/admin/links` | GET | Milan | P1 | planned |
| `/api/admin/links/[id]/disable` | PATCH | Milan | P1 | planned |
| `/api/admin/links/[id]/enable` | PATCH | Milan | P1 | planned |
| `/api/admin/blocklist` | GET | Milan | P2 | planned |
| `/api/admin/blocklist` | POST | Milan | P2 | planned |
| `/api/admin/blocklist/[id]` | DELETE | Milan | P2 | planned |
| `/api/trace` | GET | Tejas | P2 | planned |
