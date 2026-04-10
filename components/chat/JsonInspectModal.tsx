"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface Props {
  data: unknown;
  open: boolean;
  onClose: () => void;
}

export function JsonInspectModal({ data, open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-sm font-medium">Raw JSON</DialogTitle>
        </DialogHeader>
        <pre className="overflow-auto flex-1 rounded bg-muted p-3 text-xs font-mono">
          {JSON.stringify(data, null, 2)}
        </pre>
      </DialogContent>
    </Dialog>
  );
}
