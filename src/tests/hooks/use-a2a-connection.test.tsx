import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentCard } from "@a2a-js/sdk";
import type { Client } from "@a2a-js/sdk/client";
import { useEffect } from "react";
import { useA2AConnection } from "@/hooks/use-a2a-connection";
import { createClientFactory } from "@/lib/utils/auth";

vi.mock("@/lib/utils/auth", () => ({
  createClientFactory: vi.fn(),
}));

const CARD = {
  name: "Demo Agent",
  description: "Test agent",
  url: "http://localhost:3001",
  version: "1.0.0",
  capabilities: {},
  defaultInputModes: ["text/plain"],
  defaultOutputModes: ["text/plain"],
  skills: [],
  protocolVersion: "0.3.0",
} as unknown as AgentCard;

function mockFactory(client: Partial<Client>) {
  const createFromUrl = vi.fn().mockResolvedValue(client);
  vi.mocked(createClientFactory).mockReturnValue({
    createFromUrl,
  } as unknown as ReturnType<typeof createClientFactory>);
  return createFromUrl;
}

function AutoProbe({ tick = 0 }: { tick?: number }) {
  useA2AConnection({
    agentUrl: "http://localhost:3001",
    autoConnect: true,
    autoLoadCard: true,
  });
  return <div data-testid="tick">{tick}</div>;
}

function RefreshProbe({
  onReady,
}: {
  onReady: (refresh: () => Promise<AgentCard>) => void;
}) {
  const connection = useA2AConnection({
    agentUrl: "http://localhost:3001",
    autoConnect: false,
  });

  useEffect(() => {
    onReady(connection.refreshAgentCard);
  }, [connection.refreshAgentCard, onReady]);

  return null;
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("useA2AConnection", () => {
  it("keeps omitted auth and headers stable across rerenders", async () => {
    const getAgentCard = vi.fn().mockResolvedValue(CARD);
    const createFromUrl = mockFactory({
      getAgentCard,
      transport: { protocolName: "JSONRPC" },
    } as unknown as Client);

    const { rerender } = render(<AutoProbe tick={0} />);

    await waitFor(() => expect(createFromUrl).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(getAgentCard).toHaveBeenCalledTimes(1));

    rerender(<AutoProbe tick={1} />);
    await new Promise((resolve) => window.setTimeout(resolve, 20));

    expect(createFromUrl).toHaveBeenCalledTimes(1);
    expect(getAgentCard).toHaveBeenCalledTimes(1);
  });

  it("coalesces concurrent agent-card refreshes", async () => {
    const getAgentCard = vi.fn().mockResolvedValue(CARD);
    const createFromUrl = mockFactory({
      getAgentCard,
      transport: { protocolName: "JSONRPC" },
    } as unknown as Client);
    const refreshRef: { current?: () => Promise<AgentCard> } = {};

    render(<RefreshProbe onReady={(nextRefresh) => { refreshRef.current = nextRefresh; }} />);

    await waitFor(() => expect(refreshRef.current).toBeTruthy());
    const refresh = refreshRef.current;
    if (!refresh) throw new Error("refresh was not registered");
    await Promise.all([refresh(), refresh()]);

    expect(createFromUrl).toHaveBeenCalledTimes(1);
    expect(getAgentCard).toHaveBeenCalledTimes(1);
  });

  it("does not retry a failed refresh until requested again", async () => {
    const getAgentCard = vi.fn().mockRejectedValueOnce(new Error("card failed"));
    const createFromUrl = mockFactory({
      getAgentCard,
      transport: { protocolName: "JSONRPC" },
    } as unknown as Client);
    const refreshRef: { current?: () => Promise<AgentCard> } = {};

    render(<RefreshProbe onReady={(nextRefresh) => { refreshRef.current = nextRefresh; }} />);

    await waitFor(() => expect(refreshRef.current).toBeTruthy());
    const refresh = refreshRef.current;
    if (!refresh) throw new Error("refresh was not registered");
    await expect(refresh()).rejects.toThrow("card failed");

    expect(createFromUrl).toHaveBeenCalledTimes(1);
    expect(getAgentCard).toHaveBeenCalledTimes(1);
  });
});
