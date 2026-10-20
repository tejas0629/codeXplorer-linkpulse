// Owner: Megha | Task: MEG-P1-6 | Priority: P1

import { LinkDetailsClient } from "@/components/links/link-details-client";

export const instant = false;

export default async function LinkDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  return <LinkDetailsClient id={id} />;
}