"use client";

// Owner: Megha | Task: MEG-P1-3 | Priority: P1

import { FormEvent, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Eye,
  EyeOff,
  Check,
  LoaderCircle,
  LockKeyhole,
  Mail,
} from "lucide-react";
import { signIn } from "next-auth/react";
import { toast } from "sonner";

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const normalizedEmail = email.trim().toLowerCase();

    if (!normalizedEmail || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email: normalizedEmail,
        password,
        redirect: false,
      });

      if (!result) {
        setError("Unable to sign in. Please try again.");
        return;
      }

      if (result.error) {
        setError("Invalid email or password.");
        return;
      }

      toast.success("Welcome back!");
      router.push("/dashboard");
      router.refresh();
    } catch {
      setError(
        "Unable to connect to the authentication server. Please check your connection and try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    "w-full rounded-xl border border-input bg-background py-3 pl-11 pr-4 text-sm outline-none transition placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-primary/20";

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4 py-10">
      {/* Decorative background */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative grid w-full max-w-5xl overflow-hidden rounded-3xl border bg-card shadow-xl md:grid-cols-2">
        {/* Branding panel */}
        <section className="hidden flex-col justify-between bg-primary p-10 text-primary-foreground md:flex">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/logo.png"
              alt="LinkPulse Logo"
              width={44}
              height={44}
              priority
              className="size-11 rounded-xl object-contain bg-white/15 p-1"
            />
            <span className="text-2xl font-bold tracking-tight">
              LinkPulse
            </span>
          </Link>

          <div className="my-12">
            <div className="mb-5 inline-flex rounded-full bg-white/15 px-3 py-1.5 text-xs font-medium">
              Welcome back
            </div>

            <h2 className="max-w-sm text-4xl font-bold leading-tight">
              Your links, all in one place.
            </h2>

            <p className="mt-5 max-w-sm text-sm leading-6 text-primary-foreground/80">
              Sign in to manage your short links, monitor performance, and
              organize your campaigns with LinkPulse.
            </p>

            <div className="mt-8 space-y-4 text-sm">
              {[
                "Manage your links easily",
                "Track clicks and performance",
                "Keep your campaigns organized",
              ].map((feature) => (
                <div key={feature} className="flex items-center gap-3">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white/15">
                    <Check className="h-3.5 w-3.5 text-primary-foreground" />
                  </span>
                  {feature}
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs text-primary-foreground/70">
            Simple links. Clear insights.
          </p>
        </section>

        {/* Login form */}
        <section className="p-6 sm:p-10">
          <Link
            href="/"
            className="mb-8 inline-flex items-center gap-2.5 font-bold tracking-tight md:hidden"
          >
            <Image
              src="/logo.png"
              alt="LinkPulse Logo"
              width={36}
              height={36}
              priority
              className="size-9 rounded-lg object-contain"
            />
            <span>LinkPulse</span>
          </Link>

          <div className="mb-8">
            <p className="mb-2 text-sm font-medium text-primary">
              WELCOME BACK
            </p>

            <h1 className="text-3xl font-bold tracking-tight">
              Sign in to LinkPulse
            </h1>

            <p className="mt-2 text-sm text-muted-foreground">
              Enter your credentials to access your account.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email address
              </label>

              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <label htmlFor="password" className="font-medium">
                  Password
                </label>
              </div>

              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className={`${inputClass} pr-11`}
                />

                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="rounded-xl border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign in
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-medium text-primary hover:underline"
            >
              Create one now
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
