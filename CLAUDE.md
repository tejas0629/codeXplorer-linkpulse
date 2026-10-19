# AI Tool Coding Rules for LinkPulse

Follow these strict rules when contributing to this repository:

1. Always read AGENTS.md and the Next.js guide in node_modules/next/dist/docs/ before writing Next.js code. Do not edit the block written by next dev in AGENTS.md.
2. Work only in the folders assigned to the requesting team member as listed in docs/TEAM_TASKS.md. Never modify other members' folders without explicit instruction.
3. Follow docs/API.md strictly for all endpoint paths, request bodies, query parameters, and response structures.
4. Place all core business logic inside lib/. Route handlers in app/api/ must only parse input, check roles, call lib functions, and return responses.
5. Validate all incoming request data on the server using Zod schemas in lib/validation.ts.
6. Verify authentication and user roles in every protected endpoint using helpers in lib/rbac.ts (requireUser, requireAdmin, requireOwnerOrAdmin).
7. Never write or commit secrets, real API keys, or private connection strings to source control. Use .env for secrets and keep .env ignored.
8. Never use em dashes, en dashes, emojis, or any non-ASCII characters in any file you create or modify.
9. Format all commit messages in the conventional format: "type: message" where type is feat, fix, docs, style, refactor, test, or chore.
10. Do not invent new database fields or endpoints. Keep all code strictly aligned with prisma/schema.prisma and docs/API.md.
