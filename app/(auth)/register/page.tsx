// Owner: Megha | Task: MEG-P1-3 | Priority: P1
import Link from "next/link";

// TODO (MEG): Registration form with name, email, password validation
export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Register</h1>
        <p className="text-sm text-muted-foreground">
          Create a new LinkPulse account.
        </p>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Placeholder: Register Form</p>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
