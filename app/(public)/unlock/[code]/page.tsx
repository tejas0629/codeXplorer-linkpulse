// Owner: Megha | Task: MEG-P1-7 | Priority: P1

export const instant = false;

import { Suspense } from "react";
import UnlockClient from "./unlock-client";

export default async function UnlockPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center p-4 bg-muted/20" />}>
      <UnlockClient code={code} />
    </Suspense>
  );
}
