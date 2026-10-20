// Owner: Megha | Task: MEG-P1-4 | Priority: P1
"use client";

import { useState } from "react";

interface SuccessScreenProps {
  shortUrl: string;
  onCreateAnother: () => void;
}

export function SuccessScreen({
  shortUrl,
  onCreateAnother,
}: SuccessScreenProps) {
  const [copyMessage, setCopyMessage] = useState("");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shortUrl);
      setCopyMessage("Link copied.");
    } catch {
      setCopyMessage("Copy failed. Please select and copy the link manually.");
    }
  }

  return (
    <section className="space-y-5 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-2xl text-green-700">
        &#10003;
      </div>

      <div>
        <h2 className="text-xl font-bold">Link created successfully</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your short link is ready to use.
        </p>
      </div>

      <div className="break-all rounded-md border border-input bg-muted p-4 font-mono text-sm">
        {shortUrl}
      </div>

      <button
        type="button"
        onClick={copyLink}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
      >
        Copy link
      </button>

      {copyMessage && (
        <p role="status" className="text-sm text-muted-foreground">
          {copyMessage}
        </p>
      )}

      <div>
        <button
          type="button"
          onClick={onCreateAnother}
          className="rounded-md border border-input px-4 py-2 text-sm font-medium"
        >
          Create another link
        </button>
      </div>
    </section>
  );
}