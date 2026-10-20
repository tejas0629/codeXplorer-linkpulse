import "server-only";
import { auth } from "@/lib/auth";

export type TraceViewer = {
  id: string;
  role: "USER" | "ADMIN";
};

// TODO(MIL): Replace this local session adapter with requireUser() from lib/rbac.ts when it is ready.
export async function getTraceViewer(): Promise<TraceViewer | null> {
  try {
    const session = await auth();
    const user = session?.user;
    if (!user?.id || (user.role !== "USER" && user.role !== "ADMIN")) {
      return null;
    }
    return { id: user.id, role: user.role };
  } catch {
    return null;
  }
}