# LinkPulse Team Tasks

This document says who builds what, in which order, and when a task counts as done. Read your own section fully and skim the rest. Every task has a priority.

## 1. How to read this document

| Priority | Meaning |
|---|---|
| P1 | Must have. Without it the core product (create link, redirect, track click, see numbers, hosted) does not work. Finish all P1 tasks of your section first. |
| P2 | Should have. Needed for the demo scenarios and for the features we promised in the idea round. Start P2 only after your own P1 tasks are merged into `dev`. |

Task size: S is under 1 hour, M is 1 to 3 hours, L is more than 3 hours.

Rules that apply to everyone:
- If time runs short, cut P2 tasks, never stability. A working deployed core beats many half-built features.
- Work only in your own folders (listed in each section). If you need a change in someone else's file, ask the owner.
- Branch from `dev`, open a PR into `dev`, Tejas reviews. Details are in `CONTRIBUTING.md`.
- Agree on the shape of an API in `docs/API.md` before building it. Until the real API is ready, the frontend uses mock data.
- Every task is done only when it meets the Definition of Done in section 9.

## 2. Checkpoints

Checkpoints are shared moments when `dev` must be in a certain state. They are about order, not clock time. Do not start work that depends on a checkpoint before it is reached.

| Checkpoint | What must be true on `dev` |
|---|---|
| CP1 Foundation | Dependencies installed, folder skeleton pushed, Prisma schema migrated, `lib/api-response.ts`, `lib/rbac.ts` signatures and `lib/rules.ts` signature committed, `docs/API.md` and `.env.example` present, mock data available. |
| CP2 Core live | A user can sign in, create a link, a visitor is redirected, the click is saved, the dashboard shows basic numbers. Deployed on Vercel. |
| CP3 Rules and organization | Expiry, click cap, password, admin disable, campaigns, tags, bot filter work end to end. |
| CP4 Integration | QR, CSV import, analytics pages use real APIs, seed data loaded, no page uses mock data any more. |
| CP5 Demo ready | Both demo scenarios run smoothly on the hosted link. Only bug fixes after this point. |

## 3. Folder ownership

| Folder or file | Owner |
|---|---|
| `prisma/schema.prisma`, `prisma/migrations/`, `prisma/seed.ts`, `package.json`, `.github/`, `app/[code]/`, `app/api/unlock/`, `app/api/trace/`, `lib/db.ts`, `lib/api-response.ts`, `lib/cache.ts`, `lib/click-logger.ts`, `lib/bot.ts`, `lib/env.ts`, deployment settings | Tejas |
| `app/api/links/`, `app/api/analytics/`, `lib/shortcode.ts`, `lib/validation.ts`, `lib/rules.ts`, `lib/rate-limit.ts`, `lib/analytics.ts`, `lib/risk.ts`, `types/api.ts` | Chirag |
| `proxy.ts`, `app/api/auth/`, `app/api/campaigns/`, `app/api/tags/`, `app/api/import/`, `app/api/qr/`, `app/api/admin/`, `lib/auth.ts`, `lib/rbac.ts`, `lib/csv.ts`, `lib/qr.ts`, `types/next-auth.d.ts` | Milan |
| `app/layout.tsx`, `app/globals.css`, `app/page.tsx`, `app/(auth)/`, `app/(dashboard)/layout.tsx`, `app/(dashboard)/links/`, `app/(public)/`, `components/layout/`, `components/shared/`, `components/wizard/`, `components/links/`, `components/ui/`, `lib/api.ts`, `lib/utils.ts` | Megha |
| `app/(dashboard)/dashboard/`, `app/(dashboard)/campaigns/`, `app/(dashboard)/import/`, `app/(dashboard)/trace/`, `app/(dashboard)/admin/`, `components/charts/`, `components/analytics/`, `components/campaigns/`, `components/csv/`, `components/qr/`, `components/admin/` | Samriddhi |

## 4. Tejas (Team Lead)

Branch: `feature/tej-redirect-click-tracking`. Focus: foundation, database, redirect engine, click logging, deployment, reviews.

### P1

| ID | Task | Output | Done when | Size |
|---|---|---|---|---|
| TEJ-P1-1 | Foundation setup | Install dependencies, create folder skeleton with empty stubs, add mock data, push to `dev` | Everyone can pull `dev` and run `npm run dev` | M |
| TEJ-P1-2 | Database schema | `prisma/schema.prisma` with User, Link, Campaign, Tag, ClickEvent, BlockedDomain, first migration on Supabase | `npx prisma migrate dev` works on a clean machine and `docs/DATABASE.md` matches the schema | M |
| TEJ-P1-3 | Shared helpers | `lib/db.ts` (Prisma client), `lib/api-response.ts` (success and error format) | All API owners import these instead of writing their own | S |
| TEJ-P1-4 | Redirect engine | `app/[code]/route.ts` (checks in fixed order: exists and not soft-deleted, not disabled, not expired, under click limit, password) and `app/api/unlock/[code]` | Each failing rule shows the right status page, unlock endpoint returns destination, a good link redirects with 302 | L |
| TEJ-P1-5 | Safe click cap | Click count update done as one atomic database update with a condition | Two parallel requests on the last click: exactly one succeeds | M |
| TEJ-P1-6 | Async click logging | `lib/click-logger.ts` saves time, referrer, device, browser, visitor id after the redirect is sent | Redirect time does not depend on the log write, a click row appears in the database | M |
| TEJ-P1-7 | Bot filtering | `lib/bot.ts` using `isbot`, sets `isBot` on the click | Known bot user agents are saved with `isBot = true` | S |
| TEJ-P1-8 | Cache lookup | `lib/cache.ts` reads a link from Redis first, then database | Second request for the same code does not hit the database | M |
| TEJ-P1-9 | Deployment | Vercel project, environment variables, `main` deploy | Hosted link is live and works (CP2) | M |
| TEJ-P1-10 | Seed data | `prisma/seed.ts` with sample users, campaigns, links, many clicks over several days | Dashboard is meaningful right after seeding | M |
| TEJ-P1-11 | Reviews and merges | Review PRs, merge in the order given in `CONTRIBUTING.md` | No PR waits for review for long | ongoing |

### P2

| ID | Task | Output | Done when | Size |
|---|---|---|---|---|
| TEJ-P2-1 | Cache invalidation | Clear the cache when a link is edited or disabled | Admin disable stops the redirect immediately | S |
| TEJ-P2-2 | Failed attempts | Save outcome (expired, disabled, limit reached) on the click event | Reports can count failed attempts | S |
| TEJ-P2-3 | Redirect Trace | `app/api/trace/route.ts` returns each rule step and whether it passed | Entering a short link shows which rule failed | M |
| TEJ-P2-4 | Device targeting | Different destination for mobile and desktop | A mobile user agent lands on the mobile URL | M |
| TEJ-P2-5 | A/B split links | One code, two destinations, clicks counted per variant | Traffic splits roughly as set and counts are visible | L |

## 5. Chirag

Branches: `feature/chi-link-creation-rules`, `feature/chi-analytics-api`. Focus: link creation backend, rules, validation, rate limiting, analytics APIs.

### P1

| ID | Task | Output | Done when | Size |
|---|---|---|---|---|
| CHI-P1-1 | Short code and alias rules | `lib/shortcode.ts`: random code generation with retry on collision, alias rules (length, allowed characters, reserved words) | Codes are unique, bad aliases are rejected with a clear message | S |
| CHI-P1-2 | Input validation | `lib/validation.ts` with Zod schemas for create and update link, URL checks (http or https only, length, not our own domain, not a blocked domain) | Invalid input returns 400 with a field-level message | M |
| CHI-P1-3 | Rule evaluation function | `lib/rules.ts` pure function that returns a result for a link in the fixed order, with unit tests. Signature agreed at CP1 | Tejas uses it in the redirect engine, tests pass | M |
| CHI-P1-4 | Create and list links | `POST /api/links`, `GET /api/links` (own links for User, all for Admin, with search and status filter) | A signed-in user can create and list links, link password is stored hashed | L |
| CHI-P1-5 | Read, update, delete link | `GET`, `PATCH`, `DELETE /api/links/[id]`, enable or disable | Only owner or admin can change a link; DELETE performs soft delete; owner cannot re-enable ADMIN_DISABLED link | M |
| CHI-P1-6 | Live check endpoint | `GET /api/links/check?alias=&url=` returns alias taken, invalid URL, blocked domain | The wizard can show warnings before publishing | S |
| CHI-P1-7 | Rate limiting | `lib/rate-limit.ts` with Upstash, applied to link creation per user | Too many creates return 429 with a retry time | S |
| CHI-P1-8 | Core analytics APIs | `GET /api/analytics/summary`, `timeseries`, `breakdown`, `top-links` with period filter and bot toggle | Numbers match the click rows in the database, User sees own data, Admin sees all | L |

### P2

| ID | Task | Output | Done when | Size |
|---|---|---|---|---|
| CHI-P2-1 | Campaign analytics | `GET /api/analytics/campaigns` with total links, clicks, top links | Campaign performance view has real data | M |
| CHI-P2-2 | Link alerts | `GET /api/analytics/alerts`: expiring soon, limit nearly reached, sudden click spike | Alerts panel has real data | M |
| CHI-P2-3 | Safety risk score | `lib/risk.ts` returns Low, Medium or High and is included in the check endpoint | The wizard can show a badge before publishing | M |
| CHI-P2-4 | Plain-English insights | `GET /api/analytics/insights` returns short sentences made from real data | Insights card shows true statements | M |
| CHI-P2-5 | Link health check | Scheduled check of destination URLs, result saved on the link | A dead destination raises an alert | L |
| CHI-P2-6 | Tests | Unit tests for validation, shortcode and analytics queries | `npm test` passes in CI | M |

## 6. Milan

Branches: `feature/mil-auth-rbac`, `feature/mil-campaigns-csv-admin`. Focus: authentication, role checks, campaigns and tags, CSV import, QR, admin.

### P1

| ID | Task | Output | Done when | Size |
|---|---|---|---|---|
| MIL-P1-1 | Role helpers first | `lib/rbac.ts` with `requireUser`, `requireAdmin`, `requireOwnerOrAdmin`. Signatures committed at CP1 | Every API owner can call them, even if the body is a stub at first | S |
| MIL-P1-2 | Authentication | Auth.js setup in `lib/auth.ts` and `app/api/auth/`: email and password (bcrypt) and Google sign-in, role in the session | Register, log in and log out work, role is available in the session | L |
| MIL-P1-3 | Register endpoint | `POST /api/auth/register` with validation and duplicate email check | A new user can be created and signs in | S |
| MIL-P1-4 | Route protection | Protect dashboard and admin pages (check the Next docs in `node_modules/next/dist/docs/` for the current middleware or proxy file name) | Signed-out users go to login, non-admins cannot open admin pages | M |
| MIL-P1-5 | Admin disable | `PATCH /api/admin/links/[id]/disable` (sets ADMIN_DISABLED) and enable (sets ACTIVE), calls cache invalidation | Admin disable sets ADMIN_DISABLED which only an admin can re-enable; stops redirecting immediately | M |
| MIL-P1-6 | Admin lists | `GET /api/admin/users`, `GET /api/admin/links` | Admin sees all users and all links | S |

### P2

Do these in the order listed.

| ID | Task | Output | Done when | Size |
|---|---|---|---|---|
| MIL-P2-1 | Campaigns | `app/api/campaigns/` create, list, edit, delete, with totals | A user manages only own campaigns | M |
| MIL-P2-2 | Tags | `app/api/tags/` create, list, attach to link | A link can carry several tags | S |
| MIL-P2-3 | CSV import | `lib/csv.ts` with Papaparse, `POST /api/import/preview` returns valid rows, errors and duplicates, `POST /api/import/commit` saves only valid rows | A mixed CSV shows each problem row and imports the good ones | L |
| MIL-P2-4 | QR codes | `lib/qr.ts` and `GET /api/qr/[id]` returns a PNG, QR short link carries a source flag so scans count separately | The QR downloads and a scan is tracked as a QR click | M |
| MIL-P2-5 | Domain blocklist | `app/api/admin/blocklist/` add, list, remove | A link to a blocked domain is rejected at creation | S |

## 7. Megha

Branch: `feature/meg-frontend-core`. Focus: base layout, login and register, link wizard, links list and details, visitor status pages.

### P1

| ID | Task | Output | Done when | Size |
|---|---|---|---|---|
| MEG-P1-1 | Base layout and theme | Root layout, navbar, sidebar, shadcn/ui setup, colors and fonts, shared loading, error and empty components | Every page uses the same layout and states (CP1) | M |
| MEG-P1-2 | API client | `lib/api.ts`, one place for all fetch calls with error handling | No page calls `fetch` directly | S |
| MEG-P1-3 | Login and register pages | Forms with validation, connected to auth | A user can register and log in from the UI | M |
| MEG-P1-4 | Link wizard | Step 1: destination URL and alias with live warnings. Step 2: expiry, click limit, password, campaign, tags. Success screen with copy button | A link is created from the UI with warnings shown before publishing | L |
| MEG-P1-5 | Links list | Table with search, status filter, enable or disable, delete | A user sees and manages own links | M |
| MEG-P1-6 | Link details page | Link info, rules, QR preview area, slot for the per-link analytics component | Details open for a link, analytics slot filled by Samriddhi's component | M |
| MEG-P1-7 | Visitor status pages | Simple pages for not found, disabled, expired, limit reached, and a password prompt page. Route paths agreed with Tejas | Each failing rule from the redirect engine lands on the right page | M |

### P2

| ID | Task | Output | Done when | Size |
|---|---|---|---|---|
| MEG-P2-1 | Edit link page | Edit rules and destination of an existing link | Changes save and show in the list | M |
| MEG-P2-2 | Risk badge in wizard | Show Low, Medium, High from the check endpoint | Badge appears before publishing | S |
| MEG-P2-3 | Landing page | Simple home page that explains LinkPulse and links to sign in | Home page matches the theme | S |
| MEG-P2-4 | Responsive pass | Check all pages on phone and laptop widths | No broken layout on small screens | M |
| MEG-P2-5 | Polish status pages | Better design and wording for visitor pages | Pages look finished for the demo | S |

## 8. Samriddhi

Branch: `feature/sam-frontend-dashboard`. Focus: analytics dashboard, campaigns pages, QR, CSV and admin pages.

### P1

| ID | Task | Output | Done when | Size |
|---|---|---|---|---|
| SAM-P1-1 | Dashboard stats | Cards for total links, total clicks, unique visitors, built on mock data first | Cards render and switch to real API at CP4 | M |
| SAM-P1-2 | Clicks over time chart | Recharts line or bar chart with daily, weekly, monthly switch | Switching the period redraws the chart | M |
| SAM-P1-3 | Breakdown charts | Device, browser and referrer breakdowns, top links table | All four panels show data | M |
| SAM-P1-4 | Filters and bot toggle | Period filter and a toggle to include or exclude bot clicks | Numbers change when the toggle changes | S |
| SAM-P1-5 | Per-link analytics component | Reusable component for the link details page | Megha can drop it into the details page | M |
| SAM-P1-6 | Admin analytics view | Same components fed by the admin (platform-wide) endpoints | Admin sees totals across all users | S |

### P2

| ID | Task | Output | Done when | Size |
|---|---|---|---|---|
| SAM-P2-1 | Campaigns pages | List, create, edit, and a performance view | Campaign totals and top links are visible | L |
| SAM-P2-2 | QR UI | Show and download a link's QR code | The PNG downloads | S |
| SAM-P2-3 | CSV import UI | Upload, preview table with valid, error and duplicate rows, import button | Import result is shown clearly | L |
| SAM-P2-4 | Admin panel | Users list, all links with disable button, blocklist manager | Admin can disable a link from the UI | L |
| SAM-P2-5 | Alerts and insights | Alerts panel and plain-English insights card | Both show real data | M |
| SAM-P2-6 | Redirect Trace UI | Input for a short link, step list with pass or fail | The trace shows which rule failed | M |
| SAM-P2-7 | Sample CSV | A demo CSV with good, bad and duplicate rows | The CSV scenario in the demo works | S |

## 9. Definition of Done

A task is done only when all of these are true:
- It runs locally without errors and works end to end.
- Server input is validated and the role or ownership check is in place.
- Loading and error states exist for every API call in the UI.
- Edge cases were tried: empty input, invalid input, wrong role.
- The branch has the latest `dev` merged, no secrets or `.env` files are included.
- A PR into `dev` is open with the template filled and Tejas has reviewed it.

## 10. Handoffs between members

| From | To | What | Needed by |
|---|---|---|---|
| Tejas | Everyone | Foundation, schema, shared helpers, mock data | CP1 |
| Milan | Everyone | `lib/rbac.ts` signatures | CP1 |
| Chirag | Tejas | `lib/rules.ts` signature first, working version later | CP1 signature, CP2 working |
| Chirag | Megha | Check endpoint shape in `docs/API.md` | CP1 |
| Chirag | Samriddhi | Analytics response shapes in `docs/API.md`, real endpoints later | CP1 shapes, CP4 real |
| Megha | Tejas | Paths of the visitor status and password pages | CP1 |
| Milan | Tejas | Calls cache invalidation on admin disable | CP3 |
| Samriddhi | Megha | Per-link analytics component | CP3 |
| Milan | Samriddhi | CSV preview response shape and QR URL | CP1 shape, CP4 real |

## 11. Demo readiness by owner

Scenario 1: create a campaign, create a link through the wizard, open it, see the click on the dashboard.
Scenario 2: import a CSV with errors and duplicates, admin disables a link, redirect stops, analytics remain.

| Owner | Must be ready |
|---|---|
| Tejas | Hosted link live, seed data loaded, redirect and click logging stable |
| Chirag | Link creation, check endpoint, analytics APIs return correct numbers |
| Milan | Sign in for User and Admin, campaigns, CSV import, QR, admin disable |
| Megha | Wizard, links list, details, visitor status pages |
| Samriddhi | Dashboard, campaigns pages, CSV and admin screens |
