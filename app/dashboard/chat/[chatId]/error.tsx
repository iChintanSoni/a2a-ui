"use client";

import { useEffect } from "react";
import { AlertTriangleIcon, RefreshCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Muted, PageTitle } from "@/components/typography";

interface ChatErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ChatError({ error, reset }: ChatErrorProps) {
  useEffect(() => {
    console.error("Chat route failed", error);
  }, [error]);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="bg-muted flex size-12 items-center justify-center rounded-lg border">
        <AlertTriangleIcon className="text-destructive size-6" />
      </div>
      <div className="space-y-2">
        <PageTitle>Chat paused</PageTitle>
        <Muted>
          This chat view ran into a rendering error. Retry to reload the current session from local
          storage.
        </Muted>
      </div>
      <Button onClick={reset} className="gap-2">
        <RefreshCwIcon className="size-4" />
        Try again
      </Button>
    </div>
  );
}
