import { describe, expect, it } from "vitest";
import {
  agentCardProtocolVersion,
  agentCardTransport,
  agentCardTransports,
  agentCardUrl,
  preferredInterface,
} from "@/lib/a2a/agent-card";
import { makeAgentCard } from "../../helpers/agent-card";

const multiTransport = makeAgentCard({
  supportedInterfaces: [
    {
      url: "https://agent.test/a2a/rest",
      protocolBinding: "HTTP+JSON",
      tenant: "",
      protocolVersion: "1.0",
    },
    {
      url: "https://agent.test/a2a/jsonrpc",
      protocolBinding: "JSONRPC",
      tenant: "",
      protocolVersion: "1.0",
    },
  ],
});

describe("agent card accessors", () => {
  it("treats the first declared interface as preferred", () => {
    expect(preferredInterface(multiTransport)?.protocolBinding).toBe("HTTP+JSON");
    expect(agentCardUrl(multiTransport)).toBe("https://agent.test/a2a/rest");
    expect(agentCardTransport(multiTransport)).toBe("HTTP+JSON");
    expect(agentCardProtocolVersion(multiTransport)).toBe("1.0");
  });

  it("lists every transport in preference order", () => {
    expect(agentCardTransports(multiTransport)).toEqual(["HTTP+JSON", "JSONRPC"]);
  });

  it("deduplicates repeated transports", () => {
    const card = makeAgentCard({
      supportedInterfaces: [
        { url: "https://a.test", protocolBinding: "JSONRPC", tenant: "", protocolVersion: "1.0" },
        { url: "https://b.test", protocolBinding: "JSONRPC", tenant: "", protocolVersion: "1.0" },
      ],
    });

    expect(agentCardTransports(card)).toEqual(["JSONRPC"]);
  });

  it("degrades to sensible defaults for a card with no interfaces", () => {
    const card = makeAgentCard({ supportedInterfaces: [] });

    expect(preferredInterface(card)).toBeUndefined();
    expect(agentCardUrl(card)).toBe("");
    expect(agentCardProtocolVersion(card)).toBe("");
    // JSONRPC is the protocol's default binding, so it is the safest assumption.
    expect(agentCardTransport(card)).toBe("JSONRPC");
    expect(agentCardTransports(card)).toEqual([]);
  });

  it("tolerates an absent card", () => {
    expect(agentCardUrl(undefined)).toBe("");
    expect(agentCardTransports(undefined)).toEqual([]);
  });
});
