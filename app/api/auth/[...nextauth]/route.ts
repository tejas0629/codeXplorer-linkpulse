// Owner: Milan | Task: MIL-P1-2 | Priority: P1
// Auth.js endpoints: sign-in, callbacks, sign-out, CSRF and providers.
// GET /api/auth/session is served by app/api/auth/session/route.ts so that it
// follows the { data } envelope in docs/API.md.
import { handlers } from "@/lib/auth";

export const { GET, POST } = handlers;
