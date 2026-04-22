"use client";

import { useCallback, useMemo, useRef, useState } from "react";

interface UseA2ASessionOptions {
  contextId?: string;
  defaultContextId?: string;
  onNewSession?: (contextId: string) => void;
}

export function useA2ASession({
  contextId,
  defaultContextId,
  onNewSession,
}: UseA2ASessionOptions = {}) {
  const [internalContextId, setInternalContextId] = useState(
    () => defaultContextId ?? crypto.randomUUID(),
  );
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeTaskId, setActiveTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const resolvedContextId = contextId ?? internalContextId;
  const isControlled = contextId != null;

  const beginStream = useCallback(() => {
    setError(null);
    setIsStreaming(true);
    abortRef.current = new AbortController();
  }, []);

  const finishStream = useCallback(() => {
    setIsStreaming(false);
    setActiveTaskId(null);
    abortRef.current = null;
  }, []);

  const cancelLocally = useCallback(() => {
    abortRef.current?.abort();
    setIsStreaming(false);
  }, []);

  const newSession = useCallback(() => {
    const nextContextId = crypto.randomUUID();
    setError(null);
    setIsStreaming(false);
    setActiveTaskId(null);
    abortRef.current = null;
    if (isControlled) {
      onNewSession?.(nextContextId);
      return;
    }
    setInternalContextId(nextContextId);
  }, [isControlled, onNewSession]);

  return useMemo(
    () => ({
      contextId: resolvedContextId,
      isStreaming,
      activeTaskId,
      error,
      abortRef,
      beginStream,
      finishStream,
      cancelLocally,
      newSession,
      setActiveTaskId,
      setError,
    }),
    [
      activeTaskId,
      beginStream,
      cancelLocally,
      error,
      finishStream,
      isStreaming,
      newSession,
      resolvedContextId,
    ],
  );
}
