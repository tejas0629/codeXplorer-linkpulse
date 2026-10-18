# LinkPulse: Product Requirements Document (PRD)

| | |
|---|---|
| **Product** | LinkPulse: URL Shortener & Analytics Platform |
| **Event** | Tech Geeks Hackathon |
| **Version** | 1.0 (Draft) |
| **Team Lead** | Tejas |
| **Status** | In planning |

---

## 1. Overview

LinkPulse is an integrated link management, redirection, and analytics platform. It goes beyond "paste a URL, get a short URL" by combining link creation, rule-based redirection, click tracking, organization (campaigns and tags), and live analytics in a single connected workflow.

## 2. Problem Statement

Basic URL shorteners only map a short code to a long URL. Real marketing and operations teams need links, analytics, and governance to work together. A single link may:

- belong to a campaign,
- expire next month,
- redirect mobile users to a different destination, and
- need to be disabled quickly if it turns out to be malicious.

Click data must be recorded without slowing down redirects, and the dashboard must turn raw data into insights people can act on.

## 3. Goals and Non-Goals

### Goals
- Manage the full link lifecycle: creation, redirection, tracking, analytics, expiry, and takedown
- Provide reliable, fast redirects governed by real rules (status, expiry, click cap, password)
- Record every click reliably without slowing down redirects
- Surface problems (duplicate aliases, invalid URLs) before a link is published
- Keep expired and disabled links traceable in reports
- Drive every redirect, rule, and report from real data (no hardcoded values)

### Non-Goals (for the hackathon)
- Custom domains
- Public API for third parties
- Paid plans, billing, or team subscriptions
- Full-scale enterprise governance features

## 4. Target Users

| Role | Description | Permissions |
|---|---|---|
| **Visitor (Anonymous)** | Anyone who opens a short link | Open links, enter passwords. No management access |
| **User** | Marketer or operations team member | Manage own links, campaigns, tags, and QR codes. View analytics for own links only |
| **Admin** | Platform administrator | Full access to all links, users, and settings. Disable abusive links, manage the domain blocklist, view platform-wide analytics |

## 5. User Stories

**Visitor**
- As a visitor, I want to open a short link and reach the destination quickly.
- As a visitor, I want to enter a password for a protected link.

**User**
- As a user, I want to create a short link with an auto-generated or custom alias.
- As a user, I want to be warned about duplicate aliases or invalid URLs before publishing.
- As a user, I want to set an expiry date, click cap, and password on a link.
- As a user, I want to group links using campaigns and tags.
- As a user, I want to generate and download a QR code for a link.
- As a user, I want to bulk import links from a CSV file.
- As a user, I want to see clicks, unique visitors, devices, browsers, and referrers for my links.
- As a user, I want to compare campaign performance.

**Admin**
- As an admin, I want to disable an abusive link so redirects stop immediately.
- As an admin, I want to manage a domain blocklist.
- As an admin, I want to view analytics across the whole platform.

## 6. Functional Requirements

Priority key: **P0** = must have, **P1** = should have, **P2** = nice to have.

### 6.1 Authentication and Role-Based Access
| ID | Requirement | Priority |
|---|---|---|
| FR-1 | Users can register, log in, and log out | P0 |
| FR-2 | System supports Admin and User roles; Visitors are unauthenticated | P0 |
| FR-3 | Users can only access their own links, campaigns, and analytics | P0 |
| FR-4 | Admins can access all data and settings | P0 |

### 6.2 Link Management
| ID | Requirement | Priority |
|---|---|---|
| FR-5 | Generate a unique short code automatically | P0 |
| FR-6 | Allow custom aliases with uniqueness validation | P0 |
| FR-7 | Validate destination URLs (format, blocked domains) | P0 |
| FR-8 | Show alias and URL issues before publishing (two-step creation wizard) | P1 |
| FR-9 | Edit, delete, and enable/disable links | P0 |
| FR-10 | Rate limit link creation per user | P1 |

### 6.3 Redirect Rules
| ID | Requirement | Priority |
|---|---|---|
| FR-11 | Expiry date: link stops working after the date | P1 |
| FR-12 | Click cap: link stops working after N clicks | P1 |
| FR-13 | Password protection: visitor must enter the correct password | P1 |
| FR-14 | Active/Disabled status controls whether redirect happens | P0 |
| FR-15 | Device targeting (different destination for mobile/desktop) | P2 |

### 6.4 Redirect Engine
| ID | Requirement | Priority |
|---|---|---|
| FR-16 | Resolve a short code and evaluate rules in a fixed order: exists, active, not expired, under click limit, password | P0 |
| FR-17 | Return clear responses for not found, disabled, expired, and limit reached | P0 |
| FR-18 | Redirect must remain fast; click logging must not block it | P0 |

### 6.5 Click Tracking
| ID | Requirement | Priority |
|---|---|---|
| FR-19 | Record time, referrer, device, and browser for every click | P0 |
| FR-20 | Log clicks asynchronously | P0 |
| FR-21 | Identify unique visitors | P1 |
| FR-22 | Filter or flag bot traffic | P1 |
| FR-23 | Capture location of the visitor | P2 |
| FR-24 | Keep click history for expired and disabled links | P0 |

### 6.6 Campaigns and Tags
| ID | Requirement | Priority |
|---|---|---|
| FR-25 | Create, edit, and delete campaigns | P1 |
| FR-26 | Create tags and attach them to links | P1 |
| FR-27 | Show campaign totals: links, clicks, top links | P1 |

### 6.7 QR Codes
| ID | Requirement | Priority |
|---|---|---|
| FR-28 | Generate a QR code for any short link | P1 |
| FR-29 | Download QR code as an image | P1 |
| FR-30 | Track QR scans separately from normal clicks | P2 |

### 6.8 Bulk Import
| ID | Requirement | Priority |
|---|---|---|
| FR-31 | Upload a CSV file of links | P1 |
| FR-32 | Validate every row; report errors and duplicates | P1 |
| FR-33 | Import only valid rows | P1 |

### 6.9 Analytics Dashboard
| ID | Requirement | Priority |
|---|---|---|
| FR-34 | Show total links, total clicks, and unique visitors | P0 |
| FR-35 | Show clicks over time (by period) | P0 |
| FR-36 | Show device, browser, and referrer breakdowns | P1 |
| FR-37 | Show top-performing links and campaigns | P1 |
| FR-38 | Show link alerts (expiring soon, limit nearly reached) | P2 |
| FR-39 | All dashboard data comes from live data | P0 |

### 6.10 Safety and Admin Controls
| ID | Requirement | Priority |
|---|---|---|
| FR-40 | Maintain a domain blocklist managed by admins | P1 |
| FR-41 | Admins can disable any link; redirects stop immediately | P0 |
| FR-42 | Abuse monitoring and flagged-link view | P2 |

### 6.11 Differentiators (Stretch Goals)
Special features implemented only if time permits:

| ID | Requirement | Priority |
|---|---|---|
| FR-43 | Redirect Trace: diagnostic tool showing step-by-step rule evaluation for a link | P2 |
| FR-44 | A/B split links: split traffic across two destinations and track variant metrics | P2 |
| FR-45 | Link health check: scheduled background check of destination URLs to alert on dead links | P2 |
| FR-46 | Safety risk score: calculate Low, Medium, or High risk badge before publishing in wizard | P2 |
| FR-47 | Plain-English insights: automated text statements generated from live analytics data | P2 |
| FR-48 | Device targeting: route mobile and desktop visitors to separate destination URLs | P2 |


## 7. Core User Flows

### 7.1 Link Creation to Analytics
1. User logs in and creates a campaign.
2. User opens the link wizard: enters the destination URL and alias (Step 1).
3. User sets options (expiry, click cap, password, campaign, tags) and reviews validation warnings (Step 2).
4. Link is published and the short URL (and QR code) is shared.
5. Visitors open the link; each click is logged.
6. User opens the dashboard and sees link and campaign analytics.

### 7.2 Bulk Import to Link Disable
1. User uploads a CSV file.
2. System shows valid rows, errors, and duplicates.
3. User imports valid links.
4. Admin identifies an abusive link and disables it.
5. Redirect stops immediately; past analytics remain visible.

## 8. Redirect Logic

The engine evaluates rules in this order:

1. Does the link exist? If not, return 404.
2. Is it active? If not, show "Link disabled".
3. Has it expired? If yes, show "Link expired".
4. Has the click limit been reached? If yes, show "Limit reached".
5. Is a password required? If yes, prompt and verify.
6. Log the click asynchronously.
7. Redirect to the destination URL.

## 9. Data Model (High Level)

| Entity | Key Fields |
|---|---|
| **User** | id, name, email, password hash, role |
| **Link** | id, short code/alias, destination URL, owner, campaign, status, created at |
| **Redirect Rules** | expiry date, max clicks, password hash, status |
| **Campaign** | id, name, description, owner |
| **Tag** | id, name (many-to-many with Link) |
| **Click Event** | id, link, timestamp, referrer, device, browser, location, is bot, visitor id, source (link or QR) |
| **Blocked Domain** | id, domain, added by |

## 10. Non-Functional Requirements

- **Performance:** redirects must be fast; click logging must not slow them down
- **Reliability:** clicks must be recorded reliably, even under load
- **Security:** passwords (user and link) stored hashed; role checks enforced on the backend; unsafe domains blocked
- **Data accuracy:** analytics must match actual click data
- **Traceability:** expired and disabled links retain analytics
- **Usability:** clear validation messages and a simple two-step creation flow
- **Deployment:** the application must be hosted and accessible via a public link

## 11. Proposed Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Fullstack Framework | Next.js (App Router, TypeScript) | Unified frontend, API route handlers, and server actions with type safety |
| UI and Styling | Tailwind CSS, shadcn/ui, Recharts | Accessible component primitives and responsive data visualization |
| Database and ORM | PostgreSQL on Supabase with Prisma | Managed PostgreSQL with connection pooling and type-safe schema migrations |
| Authentication | Auth.js (NextAuth v5) | Secure session management with JWT, credentials (bcrypt), and Google OAuth |
| Cache and Rate Limiting | Upstash Redis | Low-latency edge caching for redirects and distributed rate limiting |
| Parsing and Utilities | isbot, ua-parser-js, nanoid, qrcode, Papaparse, Zod | Specialized libraries for bot detection, UA parsing, QR codes, CSV, and validation |
| Testing and Hosting | Vitest, Vercel | Fast unit testing and seamless Next.js hosting with preview deployments |


## 12. Team and Ownership

| Member | Responsibility |
|---|---|
| **Tejas (Leader)** | Repo and base setup, DB schema, redirect engine, async click logging, bot filtering, deployment, PR review |
| **Chirag** | Link creation backend (code generation, validation, rules, rate limiting), analytics APIs |
| **Milan** | Authentication and RBAC, campaigns and tags APIs, CSV import, admin APIs, QR generation |
| **Megha** | React base layout, login and register pages, link creation wizard, links list and detail pages |
| **Samriddhi** | Analytics dashboard UI, campaigns pages, QR and CSV import UI, admin panel UI |

## 13. Milestones

| Phase | Deliverable |
|---|---|
| **Round 1: Ideation** | PPT covering idea, problem statement, solution, and approach |
| **Milestone 1: Foundation** | Repo, base setup, DB schema, authentication, frontend layout |
| **Milestone 2: Core MVP** | Create link, redirect, click tracking, basic analytics, hosted deployment |
| **Milestone 3: Rules and Organization** | Expiry, click cap, password, campaigns, tags, QR, CSV import, admin disable |
| **Milestone 4: Polish** | Dashboard completion, sample data, bug fixes, demo rehearsal |
| **Round 2: Implementation** | Working prototype demo |

## 14. Success Metrics

- A user can create a short link, be redirected through it, and see click tracking on a **hosted** link
- Rules (expiry, click cap, password, disable) actually change redirect behavior
- Dashboard shows live data from real clicks
- Duplicate aliases and invalid URLs are flagged before publishing
- Disabled links stop redirecting immediately but keep their analytics
- The 5-minute demo runs smoothly through both scenarios

## 15. Risks and Mitigations

| Risk | Mitigation |
|---|---|
| Too many features, too little time | Build the P0 core first; cut P2 features before cutting stability |
| Frontend and backend blocked on each other | Agree on API endpoints early; use dummy data in the meantime |
| Redirect slowed by click logging | Log clicks asynchronously |
| Merge conflicts | One branch per feature; frequent pulls from `dev`; PR reviews |
| Late deployment issues | Deploy early and often, not on the last day |
| Empty dashboard in demo | Seed sample links, campaigns, and clicks |

## 16. Deliverables

- Functional platform with sample links, campaigns, and clicks
- Five-minute live demo of two scenarios
- Short future roadmap

## 17. Future Roadmap

- Custom domains
- Device and geo targeting
- Public API
- Link-in-bio pages
- Workspaces and folders
- Advanced abuse detection and alerts
- Exportable reports (CSV/PDF)