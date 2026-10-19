# Contributing to LinkPulse

Thanks for being part of the team! This guide explains how we work together so that our code stays clean, conflicts stay minimal, and everyone's contribution is visible.

---

## 1. Team and Ownership

| Member             | Area                                                                                   | Branch(es)                                                     |
| ------------------ | -------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| **Tejas (Leader)** | Repo setup, DB schema, redirect engine, async click logging, bot filtering, deployment | `feature/tej-redirect-click-tracking`                          |
| **Chirag**         | Link creation backend, rules, rate limiting, analytics APIs                            | `feature/chi-link-creation-rules`, `feature/chi-analytics-api` |
| **Milan**          | Auth and RBAC, campaigns and tags, CSV import, admin APIs, QR generation               | `feature/mil-auth-rbac`, `feature/mil-campaigns-csv-admin`     |
| **Megha**          | Frontend base layout, login and register, link wizard, links list and details          | `feature/meg-frontend-core`                                    |
| **Samriddhi**      | Analytics dashboard UI, campaigns, QR, CSV and admin pages                             | `feature/sam-frontend-dashboard`                               |

Work in your own area. If you want to change something owned by someone else, talk to them first.

---

## 2. Project Structure

```text
linkpulse/
|-- app/             # Next.js App Router: pages and API route handlers
|   |-- api/         # Backend endpoints (route handlers)
|   \-- (pages)/     # Frontend pages
|-- components/      # Reusable React components
|-- docs/            # Project documentation (PRD.md, API.md, etc.)
|-- lib/             # Business logic (code generation, rule evaluation, validation)
|-- prisma/          # Database schema and migrations
|-- public/          # Static files
|-- README.md
\-- CONTRIBUTING.md
```

> The exact structure will be finalized by the team lead when the base project is created.

---

## 3. Getting Started

1. **Clone the repository**
   ```bash
   git clone https://github.com/tejas0629/LinkPulse-URL-Shortener-Analytics-Platform-CodeXplorer-.git
   ```

2. **Set your Git identity** (use the email linked to your GitHub account so your commits show under your name):
   ```bash
   git config user.name "Your Name"
   git config user.email "your-github-email"
   ```

3. **Install dependencies**
   ```bash
   npm install
   ```

4. **Set up the database** (once the schema is added by the team lead)
   ```bash
   npx prisma migrate dev
   ```

5. **Run the app** (frontend and backend run together)
   ```bash
   npm run dev
   ```

6. Create a local `.env` file for secrets and settings (database URL, auth secret, etc.). **Never commit `.env`.**

---

## 4. Branching Strategy

| Branch           | Purpose                                             |
| ---------------- | --------------------------------------------------- |
| `main`           | Stable, deployable code only                        |
| `dev`            | Integration branch where all features come together |
| `feature/<name>` | One branch per feature or task                      |

### Rules
- **Never push directly to `main` or `dev`.** Always use a Pull Request.
- Always create your branch **from `dev`**.
- One feature per branch. Keep branches small and focused.
- Pull the latest `dev` into your branch **at least once a day**.

### Creating a branch
```bash
git checkout dev
git pull origin dev
git checkout -b feature/<your-prefix>-your-feature-name
```

### Branch naming
Format: `<type>/<first 3 letters of your name>-<short-name>`

- `feature/<name>-<short-name>` for new features (e.g. `feature/chi-link-creation-rules`)
- `fix/<name>-<short-name>` for bug fixes (e.g. `fix/chi-alias-validation`)
- `docs/<name>-<short-name>` for documentation changes

Name prefixes: `tej` (Tejas), `chi` (Chirag), `mil` (Milan), `meg` (Megha), `sam` (Samriddhi).

---

## 5. Daily Workflow

1. Update your local `dev`:
   ```bash
   git checkout dev
   git pull origin dev
   ```
2. Switch to your branch and bring in the latest changes:
   ```bash
   git checkout feature/your-feature-name
   git merge dev
   ```
3. Write code, test it locally.
4. Commit often with clear messages.
5. Push your branch:
   ```bash
   git push origin feature/your-feature-name
   ```
6. Open a Pull Request into `dev` when your work is ready.

---

## 6. Commit Message Guidelines

Write short, clear messages in the present tense, in this format:

```
<type>: <what you did>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`

**Examples**
```
feat: add custom alias validation
fix: handle expired links in redirect engine
docs: update API endpoints list
refactor: simplify click logging service
```

Avoid vague messages like `update`, `changes`, or `fix stuff`.

---

## 7. Pull Request Process

1. Push your branch and open a PR **into `dev`**.
2. Fill in the PR template below.
3. Request a review from the team lead (Tejas) and, if relevant, the teammate whose work connects to yours.
4. Fix any review comments by pushing more commits to the same branch.
5. Once approved, the lead merges the PR.
6. Delete your branch after it is merged.

### PR Description Template
```
## What does this PR do?
(Short summary)

## Related feature / task
(e.g. Link creation, Redirect engine)

## How to test
1. ...
2. ...

## Screenshots (if UI change)

## Checklist
- [ ] Code runs locally without errors
- [ ] I pulled the latest dev before opening this PR
- [ ] No secrets or .env files included
- [ ] Documentation updated (if needed)
```

---

## 8. Code Guidelines

### General
- Keep functions small and focused
- Use meaningful names for variables, functions, and files
- Remove unused code and debug prints before committing
- Never hardcode values that should come from data or configuration
- Never commit passwords, API keys, or `.env` files

### Backend (Next.js route handlers)
- Keep business logic (code generation, rule evaluation, validation) in `lib/`, not directly inside route handlers
- Validate all input on the server, even if the frontend already validates it
- Hash all passwords, including link passwords
- Check role and ownership permissions in every protected endpoint
- Click logging must stay **asynchronous** so redirects remain fast
- Create and commit database migrations when you change the schema
- Return consistent JSON responses and proper HTTP status codes

### Frontend (Next.js / React)
- Use functional components and hooks
- Keep reusable pieces in the `components/` folder
- Keep all API calls in one shared place (for example `lib/api.js`)
- Use the shared layout, colors, and styles defined by the frontend core
- Handle loading and error states for every API call
- Use Server Components by default; use Client Components (`"use client"`) only where interactivity is needed

---

## 9. API Agreement

Frontend and backend live in the same codebase but are built by different people in parallel, so we agree on endpoints **before** building them.

- Maintain `docs/API.md` listing each endpoint: URL, method, request body, and response
- Backend owners announce any change to an endpoint to the frontend owners immediately
- Until an endpoint is ready, the frontend uses dummy data

---

## 10. Database Changes

- Only the team lead finalizes the initial schema
- If you need a new model or field, discuss it with the team lead first
- Always commit migration files together with the schema change
- If a migration conflict occurs, tell the team and resolve it together
- After pulling `dev`, run the migrations again so your local database stays in sync

---

## 11. Merge Order

Some features are dependencies for others. Merge them in this order where possible:

1. Base setup and DB schema (Tejas)
2. Authentication and RBAC (Milan) and frontend layout (Megha)
3. Link creation (Chirag) and redirect engine (Tejas)
4. Campaigns, QR, CSV, admin (Milan) and wizard (Megha)
5. Analytics APIs (Chirag) and dashboard (Samriddhi)

---

## 12. Testing Checklist Before a PR

- [ ] The app starts without errors
- [ ] My feature works end to end
- [ ] I tested edge cases (empty input, invalid input, wrong permissions)
- [ ] I did not break existing features
- [ ] The UI works on different screen sizes (frontend)

---

## 13. Communication

- Post in the team chat when you start a task, finish a task, or get blocked
- Ask for help early rather than staying stuck
- Hold a short daily sync to share progress and blockers
- Be respectful in reviews: comment on the code, not the person

---

## 14. Deployment

- Only the team lead deploys from `main`
- Merge `dev` into `main` only when `dev` is stable and tested
- Deploy early and often, not just on the last day

---

## 15. Priorities

Our guiding principle: **a working, deployed core is more valuable than many half-built features.**

1. First, make sure the basic flow works: create a link, get redirected, see click tracking
2. Then add rules, campaigns, QR codes, and CSV import
3. Then add stretch features if time allows

If time runs short, cut features, not stability.

---

## 16. Getting Help

If you are stuck or unsure about anything, message the team lead (Tejas) or the owner of the related feature.