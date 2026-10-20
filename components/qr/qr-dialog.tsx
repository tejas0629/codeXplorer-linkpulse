// Owner: Samriddhi | Task: SAM-P2-2 | Priority: P2
"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { Download, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface LinkLookup {
  id: string;
  code: string;
}

export function QrDialog({
  open = false,
  onOpenChange,
  code = "",
  linkId,
}: {
  open?: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
  linkId?: string;
}) {
  const [imageUrl, setImageUrl] = useState("");
  const [loadedKey, setLoadedKey] = useState("");
  const [fallback, setFallback] = useState(false);
  const [error, setError] = useState("");
  const requestKey = `${linkId ?? code}:${open ? "open" : "closed"}`;
  const loading = open && !!code && loadedKey !== requestKey;

  useEffect(() => {
    if (!open || !code) return;
    let active = true;
    let objectUrl = "";

    async function loadQr() {
      try {
        let resolvedId = linkId;
        if (!resolvedId) {
          const response = await fetch(`/api/links?search=${encodeURIComponent(code)}&page=1&pageSize=100`, { cache: "no-store" });
          const body = await response.json();
          if (!response.ok) throw new Error(body?.error?.message || "Unable to find this link.");
          const links = body.data as LinkLookup[];
          resolvedId = links.find((link) => link.code.toLowerCase() === code.toLowerCase())?.id;
          if (!resolvedId) throw new Error("Could not resolve this link to an ID for QR generation.");
        }

        const response = await fetch(`/api/qr/${encodeURIComponent(resolvedId)}?size=300`, { cache: "no-store" });
        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error?.message || "QR image endpoint is unavailable.");
        }
        objectUrl = URL.createObjectURL(await response.blob());
        if (active) {
          setImageUrl(objectUrl);
          setError("");
          setFallback(false);
          setLoadedKey(requestKey);
        }
      } catch (cause) {
        try {
          const destination = `${window.location.origin}/${encodeURIComponent(code)}?src=qr`;
          const generated = await QRCode.toDataURL(destination, { width: 300, margin: 2, errorCorrectionLevel: "M" });
          if (active) {
            setImageUrl(generated);
            setFallback(true);
            setError(cause instanceof Error ? cause.message : "Showing a locally generated QR code.");
            setLoadedKey(requestKey);
          }
        } catch {
          if (active) {
            setError(cause instanceof Error ? cause.message : "Unable to generate this QR code.");
            setLoadedKey(requestKey);
          }
        }
      }
    }

    void loadQr();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [code, linkId, open, requestKey]);

  function download() {
    if (!imageUrl) return;
    const anchor = document.createElement("a");
    anchor.href = imageUrl;
    anchor.download = `${code || "link"}-qr.png`;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      setImageUrl("");
      setLoadedKey("");
      setError("");
      setFallback(false);
    }
    onOpenChange(nextOpen);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>QR Code: {code}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          {loading && <div className="size-75 max-w-full animate-pulse rounded bg-muted" aria-label="Loading QR code" />}
          {imageUrl && loadedKey === requestKey && <Image unoptimized src={imageUrl} alt={`QR code for /${code}`} width={300} height={300} className="size-75 max-w-full rounded border bg-white p-2" />}
          {error && <p role={fallback ? "status" : "alert"} className="mt-3 max-w-sm text-center text-sm text-muted-foreground">{fallback ? "API unavailable; showing a generated QR code. " : ""}{fallback ? "" : error}</p>}
          {!loading && !imageUrl && !error && <p className="text-sm text-muted-foreground">Enter a link to generate its QR code.</p>}
          <Button className="mt-4" onClick={download} disabled={!imageUrl}>
            {fallback ? <RefreshCw aria-hidden="true" /> : <Download aria-hidden="true" />}
            Download PNG
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
