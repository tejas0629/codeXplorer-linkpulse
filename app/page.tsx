// Owner: Megha | Task: MEG-P2-3 | Priority: P2

export const instant = false;

import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Clock,
  ShieldAlert,
  QrCode,
  BarChart3,
  FileSpreadsheet,
  ShieldCheck,
  ArrowRight,
  Share2,
  CheckCircle2,
  Sliders,
  Copy,
  Lock,
} from "lucide-react";

export default async function HomePage() {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const features = [
    {
      title: "Expiry and Click Limits",
      description:
        "Define expiration timestamps and atomic click caps to automatically decommission links when goals are reached.",
      icon: Clock,
    },
    {
      title: "Password Protected Links",
      description:
        "Safeguard sensitive destination URLs behind passwords with rate-limited verification.",
      icon: ShieldAlert,
    },
    {
      title: "QR Codes",
      description:
        "Generate and download high-resolution QR codes with integrated scan tracking for every link.",
      icon: QrCode,
    },
    {
      title: "Analytics and Insights",
      description:
        "Real-time breakdown of visits by device, browser, country, and referrer with zero redirect latency.",
      icon: BarChart3,
    },
    {
      title: "Campaigns and CSV Import",
      description:
        "Organize short links into structured marketing campaigns and bulk import hundreds of URLs at once.",
      icon: FileSpreadsheet,
    },
    {
      title: "Admin Blocklist and Roles",
      description:
        "Enforce domain safety with global blocklists, immediate admin link revocation, and role-based permissions.",
      icon: ShieldCheck,
    },
  ];

  const steps = [
    {
      number: "01",
      title: "Create",
      description:
        "Shorten your URL, assign an optional alias, and configure governance rules like expiration, click caps, or a password.",
      icon: Sliders,
    },
    {
      number: "02",
      title: "Share",
      description:
        "Distribute your branded short link or downloadable QR code across marketing campaigns, emails, and social channels.",
      icon: Share2,
    },
    {
      number: "03",
      title: "Track",
      description:
        "Monitor clicks in real time, inspect traffic geography and device distributions, and optimize campaign ROI.",
      icon: CheckCircle2,
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-md">
        <div className="container mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight text-lg">
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
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 sm:pt-24 sm:pb-28">
        <div className="container mx-auto max-w-4xl px-4 text-center sm:px-6">
          <div className="mb-6 inline-flex items-center">
            <span className="rounded-full bg-primary/10 px-3.5 py-1 text-xs font-medium text-primary">
              Governed Link Management
            </span>
          </div>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl text-balance">
            A governed URL shortener with analytics
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base text-muted-foreground sm:text-lg text-balance">
            Enforce active status, expiry dates, atomic click caps, and password protection
            on every link while capturing fast, real-time analytics.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" className="gap-2 px-6" asChild>
              <Link href="/register">
                Get started
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" className="px-6" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
          </div>

          {/* Interactive Visual Preview */}
          <div className="mx-auto mt-14 max-w-2xl text-left">
            <div className="rounded-2xl border bg-card/60 p-5 shadow-xl backdrop-blur-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/50 pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex size-2.5 rounded-full bg-emerald-500" />
                  <span className="font-mono text-sm font-semibold text-foreground">
                    /campaign-launch
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-md bg-muted px-2 py-0.5 font-mono text-xs text-muted-foreground">
                    ACTIVE
                  </span>
                  <span className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                    <Lock className="size-3" />
                    Protected
                  </span>
                </div>
              </div>

              <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-muted-foreground">Destination URL</p>
                  <p className="truncate font-mono text-xs text-foreground">
                    https://codexplorer.dev/products/linkpulse/enterprise
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                    <Copy className="size-3.5" />
                    Copy
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 gap-1.5 text-xs">
                    <QrCode className="size-3.5" />
                    QR
                  </Button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-border/50 pt-4 text-center">
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-[11px] text-muted-foreground">Click Cap</p>
                  <p className="font-semibold text-xs text-foreground">5,000 max</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-[11px] text-muted-foreground">Expiration</p>
                  <p className="font-semibold text-xs text-foreground">30 Days</p>
                </div>
                <div className="rounded-lg bg-muted/40 p-2">
                  <p className="text-[11px] text-muted-foreground">Redirection</p>
                  <p className="font-semibold text-xs text-foreground">302 Async</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="bg-muted/30 py-20 sm:py-24">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-balance">
              Engineered for reliability and control
            </h2>
            <p className="mt-4 text-sm text-muted-foreground sm:text-base text-balance">
              Every redirect runs through strict governance rules and asynchronous event logging.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feature) => {
              const Icon = feature.icon;
              return (
                <Card key={feature.title} className="border-border/60 transition-all hover:border-primary/50 hover:shadow-md">
                  <CardHeader className="space-y-3">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <CardTitle className="text-base font-semibold">{feature.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {feature.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-20 sm:py-24">
        <div className="container mx-auto max-w-6xl px-4 sm:px-6">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl text-balance">
              How it works
            </h2>
            <p className="mt-4 text-sm text-muted-foreground sm:text-base text-balance">
              Three simple steps to create, distribute, and analyze your short links.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-8 md:grid-cols-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <div
                  key={step.title}
                  className="flex flex-col rounded-2xl border border-border/60 bg-card p-6 shadow-sm transition-all hover:border-primary/40 hover:shadow-md"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-5" />
                    </div>
                    <span className="font-mono text-2xl font-bold text-muted-foreground/30">
                      {step.number}
                    </span>
                  </div>
                  <h3 className="mt-5 text-base font-semibold tracking-tight">{step.title}</h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {step.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="mt-auto py-10 bg-muted/20">
        <div className="container mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left">
          <div className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="LinkPulse Logo"
              width={24}
              height={24}
              className="size-6 rounded object-contain"
            />
            <span className="font-semibold text-sm">LinkPulse</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Built by team Code Xplorer. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}
