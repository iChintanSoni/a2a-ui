"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Client } from "@a2a-js/sdk/client";
import type { AgentCard } from "@a2a-js/sdk";
import type { AuthConfig, CustomHeader } from "@/lib/features/agents/agentsSlice";
import { createClientFactory } from "@/lib/utils/auth";
import { useA2ADebug } from "@/hooks/use-a2a-debug";

interface UseA2AConnectionOptions {
  agentUrl: string;
  auth?: AuthConfig;
  headers?: CustomHeader[];
  debug?: ReturnType<typeof useA2ADebug>;
  autoConnect?: boolean;
  autoLoadCard?: boolean;
  initialCard?: AgentCard;
}

export function useA2AConnection({
  agentUrl,
  auth = { type: "none" },
  headers = [],
  debug,
  autoConnect = true,
  autoLoadCard = false,
  initialCard,
}: UseA2AConnectionOptions) {
  const clientRef = useRef<Client | null>(null);
  const configKey = useMemo(
    () =>
      JSON.stringify({
        agentUrl,
        auth,
        headers,
      }),
    [agentUrl, auth, headers],
  );
  const [transportState, setTransportState] = useState<{
    key: string;
    transportMethod: string | null;
    status: "idle" | "connecting" | "connected" | "error";
    error: string | null;
  }>({
    key: configKey,
    transportMethod: null,
    status: initialCard ? "connected" : "idle",
    error: null,
  });
  const [cardState, setCardState] = useState<{ key: string; card: AgentCard | null }>({
    key: configKey,
    card: initialCard ?? null,
  });

  const transportMethod =
    transportState.key === configKey ? transportState.transportMethod : null;
  const status =
    transportState.key === configKey
      ? transportState.status
      : initialCard
        ? "connected"
        : "idle";
  const error = transportState.key === configKey ? transportState.error : null;
  const card = cardState.key === configKey ? cardState.card : (initialCard ?? null);

  // Keep debug in a ref so getClient doesn't need it as a dep (debug is a new
  // object every render, which would otherwise cause getClient to change and
  // re-trigger the auto-connect effect on every re-render).
  const debugRef = useRef(debug);
  useEffect(() => {
    debugRef.current = debug;
  });

  const resetConnection = useCallback(() => {
    clientRef.current = null;
  }, []);

  const getClient = useCallback(async (): Promise<Client> => {
    if (clientRef.current) return clientRef.current;
    setTransportState({
      key: configKey,
      transportMethod: null,
      status: "connecting",
      error: null,
    });
    try {
      const factory = createClientFactory(
        auth,
        headers,
        debugRef.current?.interceptors,
        debugRef.current?.onTransportLog,
      );
      const client = await factory.createFromUrl(agentUrl);
      clientRef.current = client;

      const protocol =
        (client as unknown as { transport?: { protocolName?: string } }).transport
          ?.protocolName ?? null;
      setTransportState({
        key: configKey,
        transportMethod: protocol,
        status: "connected",
        error: null,
      });
      return client;
    } catch (err) {
      clientRef.current = null;
      setTransportState({
        key: configKey,
        transportMethod: null,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }, [agentUrl, auth, configKey, headers]);

  const refreshAgentCard = useCallback(async () => {
    const client = await getClient();
    const nextCard = await client.getAgentCard();
    setCardState({ key: configKey, card: nextCard });
    return nextCard;
  }, [configKey, getClient]);

  const cancelTask = useCallback(async (taskId: string) => {
    if (!clientRef.current) return;
    await clientRef.current.cancelTask({ id: taskId });
  }, []);

  useEffect(() => {
    resetConnection();
    if (!autoConnect) return;
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      getClient()
        .then(async () => {
          if (autoLoadCard) {
            await refreshAgentCard();
          }
        })
        .catch(() => {});
    });
    return () => {
      cancelled = true;
    };
  }, [autoConnect, autoLoadCard, configKey, getClient, initialCard, refreshAgentCard, resetConnection]);

  return {
    agentUrl,
    card,
    error,
    status,
    transportMethod,
    getClient,
    refreshAgentCard,
    cancelTask,
    resetConnection,
  };
}
