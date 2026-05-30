import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Client } from "@a2a-js/sdk/client";
import type { AgentCard } from "@a2a-js/sdk";
import type { AuthConfig, CustomHeader } from "@/lib/features/agents/agentsSlice";
import { createClientFactory } from "@/lib/utils/auth";
import { useA2ADebug } from "@/hooks/use-a2a-debug";

const DEFAULT_AUTH: AuthConfig = { type: "none" };
const EMPTY_HEADERS: CustomHeader[] = [];

interface UseA2AConnectionOptions {
  agentUrl: string;
  auth?: AuthConfig;
  headers?: CustomHeader[];
  a2uiEnabled?: boolean;
  debug?: ReturnType<typeof useA2ADebug>;
  autoConnect?: boolean;
  autoLoadCard?: boolean;
  initialCard?: AgentCard;
}

export function useA2AConnection({
  agentUrl,
  auth: authProp,
  headers: headersProp,
  a2uiEnabled = false,
  debug,
  autoConnect = true,
  autoLoadCard = false,
  initialCard,
}: UseA2AConnectionOptions) {
  const auth = authProp ?? DEFAULT_AUTH;
  const headers = headersProp ?? EMPTY_HEADERS;
  const clientRef = useRef<Client | null>(null);
  const clientKeyRef = useRef<string | null>(null);
  const pendingClientRef = useRef<{ key: string; promise: Promise<Client> } | null>(null);
  const pendingCardRef = useRef<{ key: string; promise: Promise<AgentCard> } | null>(null);
  const configKey = useMemo(
    () =>
      JSON.stringify({
        agentUrl,
        auth,
        headers,
        a2uiEnabled,
      }),
    [agentUrl, auth, headers, a2uiEnabled],
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
      ? transportState.status === "idle" && initialCard
        ? "connected"
        : transportState.status
      : initialCard
        ? "connected"
        : "idle";
  const error = transportState.key === configKey ? transportState.error : null;
  const card = cardState.key === configKey ? (cardState.card ?? initialCard ?? null) : (initialCard ?? null);

  // Keep debug in a ref so getClient doesn't need it as a dep (debug is a new
  // object every render, which would otherwise cause getClient to change and
  // re-trigger the auto-connect effect on every re-render).
  const debugRef = useRef(debug);
  useEffect(() => {
    debugRef.current = debug;
  });

  const resetConnection = useCallback(() => {
    clientRef.current = null;
    clientKeyRef.current = null;
    pendingClientRef.current = null;
    pendingCardRef.current = null;
  }, []);

  const getClient = useCallback(async (): Promise<Client> => {
    if (clientRef.current && clientKeyRef.current === configKey) return clientRef.current;
    if (pendingClientRef.current?.key === configKey) return pendingClientRef.current.promise;

    setTransportState({
      key: configKey,
      transportMethod: null,
      status: "connecting",
      error: null,
    });

    const promise = (async () => {
      const factory = createClientFactory(
        auth,
        headers,
        debugRef.current?.interceptors,
        debugRef.current?.onTransportLog,
        { a2uiEnabled },
      );
      const client = await factory.createFromUrl(agentUrl);
      clientRef.current = client;
      clientKeyRef.current = configKey;

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
    })();

    pendingClientRef.current = { key: configKey, promise };

    try {
      return await promise;
    } catch (err) {
      clientRef.current = null;
      clientKeyRef.current = null;
      setTransportState({
        key: configKey,
        transportMethod: null,
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    } finally {
      if (pendingClientRef.current?.key === configKey) {
        pendingClientRef.current = null;
      }
    }
  }, [a2uiEnabled, agentUrl, auth, configKey, headers]);

  const refreshAgentCard = useCallback(async () => {
    if (pendingCardRef.current?.key === configKey) return pendingCardRef.current.promise;

    const promise = getClient().then(async (client) => {
      const nextCard = await client.getAgentCard();
      setCardState({ key: configKey, card: nextCard });
      return nextCard;
    });

    pendingCardRef.current = { key: configKey, promise };

    try {
      return await promise;
    } finally {
      if (pendingCardRef.current?.key === configKey) {
        pendingCardRef.current = null;
      }
    }
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
  }, [autoConnect, autoLoadCard, configKey, getClient, refreshAgentCard, resetConnection]);

  return {
    agentUrl,
    a2uiEnabled,
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
