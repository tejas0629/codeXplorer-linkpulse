// Owner: Megha | Task: MEG-P1-3 | Priority: P1
import Link from "next/link";

// TODO (MEG): Login form with email/password validation and Google sign-in
export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-4 rounded-lg border p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Sign In</h1>
        <p className="text-sm text-muted-foreground">
          Enter your credentials to access LinkPulse.
        </p>
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">Placeholder: Login Form</p>
        </div>
        <p className="text-xs text-center text-muted-foreground">
          Do not have an account?{" "}
          <Link href="/register" className="underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}
