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
  User,
} from "lucide-react";
import { toast } from "sonner";

export default function RegisterPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    const trimmedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    if (!trimmedName || !normalizedEmail || !password || !confirmPassword) {
      setError("Please fill out all fields.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: trimmedName,
          email: normalizedEmail,
          password,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        const message =
          result?.message ||
          result?.error?.message ||
          (response.status === 501
            ? "Registration is not available yet. Please try again when the backend is ready."
            : "Unable to create your account. Please try again.");

        setError(message);
        return;
      }

      toast.success("Account created successfully!");
      router.push("/login");
    } catch {
      setError(
        "Unable to connect to the server. Please check your connection and try again.",
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
              Your links, organized
            </div>
            <h2 className="max-w-sm text-4xl font-bold leading-tight">
              One place for all your links.
            </h2>
            <p className="mt-5 max-w-sm text-sm leading-6 text-primary-foreground/80">
              Create short links, organize campaigns, and understand how
              people engage with your content.
            </p>

            <div className="mt-8 space-y-4 text-sm">
              {[
                "Manage all your links in one place",
                "Track clicks and link performance",
                "Organize links with campaigns and tags",
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

        {/* Registration form */}
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
              CREATE AN ACCOUNT
            </p>
            <h1 className="text-3xl font-bold tracking-tight">
              Get started with LinkPulse
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Create your account to start managing short links and tracking
              their performance.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-medium">
                Full name
              </label>
              <div className="relative">
                <User className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className={inputClass}
                />
              </div>
            </div>

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
              <label htmlFor="password" className="text-sm font-medium">
                Password
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 8 characters"
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

            <div className="space-y-2">
              <label
                htmlFor="confirmPassword"
                className="text-sm font-medium"
              >
                Confirm password
              </label>
              <div className="relative">
                <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Repeat your password"
                  className={`${inputClass} pr-11`}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showConfirmPassword ? (
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
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-primary hover:underline"
            >
              Sign in
            </Link>
          </p>
        </section>
      </div>
    </main>
  );
}
