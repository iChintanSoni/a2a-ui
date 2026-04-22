"use client";

import { DebugPanel } from "@/components/chat/DebugPanel";
import { useA2ADebug } from "@/hooks/use-a2a-debug";

interface A2ADebugPanelProps {
  debug: ReturnType<typeof useA2ADebug>;
  onClose: () => void;
}

export function A2ADebugPanel({ debug, onClose }: A2ADebugPanelProps) {
  return <DebugPanel logs={debug.logs} onClear={debug.clearLogs} onClose={onClose} />;
}
