// Owner: Samriddhi | Task: SAM-P2-2 | Priority: P2
import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// TODO (SAM): Dialog modal to display QR code preview and trigger PNG download
export function QrDialog({
  open = false,
  onOpenChange,
  code = "",
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  code?: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>QR Code: {code}</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col items-center justify-center p-4">
          <p className="text-xs text-muted-foreground">Placeholder: QR code image & download button</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
