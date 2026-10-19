// Owner: Megha | Task: MEG-P1-4 | Priority: P1
import React from "react";

// TODO (MEG): Wizard Step 3: Success screen with copy short URL button and QR code preview
export function SuccessScreen({ shortUrl = "" }: { shortUrl?: string }) {
  return (
    <div className="space-y-4 text-center">
      <h2 className="text-xl font-bold">Link Created Successfully!</h2>
      {shortUrl && <p className="font-mono text-sm bg-muted p-2 rounded">{shortUrl}</p>}
      <p className="text-sm text-muted-foreground">Placeholder: Copy link and download QR.</p>
    </div>
  );
}
