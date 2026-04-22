"use client";

import { useCallback, useMemo, useState } from "react";
import { DebugInterceptor, appendLog, type LogEntry } from "@/lib/utils/debugInterceptor";
import type { ValidationWarning } from "@/lib/utils/compliance";

interface AppendLogInput extends Omit<LogEntry, "id" | "timestamp"> {
  id?: string;
  timestamp?: number;
}

export function useA2ADebug() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [validationWarnings, setValidationWarnings] = useState<ValidationWarning[]>([]);

  const append = useCallback((entry: AppendLogInput) => {
    const nextEntry: LogEntry = {
      id: entry.id ?? crypto.randomUUID(),
      timestamp: entry.timestamp ?? Date.now(),
      type: entry.type,
      method: entry.method,
      payload: entry.payload,
      transport: entry.transport,
    };
    setLogs((prev) => appendLog(prev, nextEntry));
  }, []);
  const interceptor = useMemo(() => new DebugInterceptor(append), [append]);
  const interceptors = useMemo(() => [interceptor], [interceptor]);

  const recordValidation = useCallback(
    (method: string, warnings: ValidationWarning[]) => {
      if (warnings.length === 0) return;
      setValidationWarnings((prev) => [...prev, ...warnings]);
      append({
        type: "validation",
        method,
        payload: warnings,
      });
    },
    [append],
  );

  const recordError = useCallback(
    (method: string, error: unknown) => {
      append({
        type: "error",
        method,
        payload: {
          message: error instanceof Error ? error.message : String(error),
        },
      });
    },
    [append],
  );

  const clearLogs = useCallback(() => {
    setLogs([]);
    setValidationWarnings([]);
  }, []);

  return {
    logs,
    validationWarnings,
    interceptors,
    onTransportLog: append,
    appendLogEntry: append,
    recordValidation,
    recordError,
    clearLogs,
  };
}
