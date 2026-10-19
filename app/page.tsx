// Owner: Megha | Task: MEG-P2-3 | Priority: P2
import Link from "next/link";

// TODO (MEG): Landing page explaining LinkPulse with hero section and login/dashboard links
export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <div className="max-w-xl space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">LinkPulse</h1>
        <p className="text-muted-foreground text-lg">
          High-performance URL shortener and real-time analytics platform.
        </p>
        <div className="flex justify-center gap-4 pt-4">
          <Link
            href="/login"
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            Sign In
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
