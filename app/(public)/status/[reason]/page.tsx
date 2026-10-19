// Owner: Megha | Task: MEG-P1-7 | Priority: P1
import React from "react";
import Link from "next/link";

export const instant = false;

// TODO (MEG): Visitor status pages for not-found, disabled, expired, and limit-reached states
export default async function VisitorStatusPage({
  params,
}: {
  params: Promise<{ reason: string }>;
}) {
  const { reason } = await params;

  const messages: Record<string, { title: string; desc: string }> = {
    "not-found": {
      title: "Link Not Found",
      desc: "The link you followed does not exist or may have been deleted.",
    },
    disabled: {
      title: "Link Disabled",
      desc: "This link has been disabled by the creator or an administrator.",
    },
    expired: {
      title: "Link Expired",
      desc: "This link has passed its expiration date and is no longer accessible.",
    },
    "limit-reached": {
      title: "Click Limit Reached",
      desc: "This link has reached its maximum permitted click count.",
    },
  };

  const statusInfo = messages[reason] || {
    title: "Link Unavailable",
    desc: `Reason: ${reason}`,
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md space-y-4">
        <h1 className="text-3xl font-bold">{statusInfo.title}</h1>
        <p className="text-muted-foreground">{statusInfo.desc}</p>
        <div className="pt-4">
          <Link
            href="/"
            className="rounded-md border px-4 py-2 text-sm font-medium hover:bg-accent"
          >
            Return to LinkPulse
          </Link>
        </div>
      </div>
    </div>
  );
}
