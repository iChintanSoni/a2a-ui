"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  data: unknown;
  open: boolean;
  onClose: () => void;
}

export function JsonInspectModal({ data, open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={v => !v && onClose()}>
      <DialogContent className="flex max-h-[80vh] max-w-2xl flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">Raw JSON</DialogTitle>
        </DialogHeader>
        <pre className="bg-muted flex-1 overflow-auto rounded p-3 font-mono text-xs">
          {JSON.stringify(data, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
