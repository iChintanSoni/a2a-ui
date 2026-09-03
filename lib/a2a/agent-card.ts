import type { AgentCard, AgentInterface } from "@a2a-js/sdk";

// v1.0 folded the card's url / preferredTransport / protocolVersion trio into an
// ordered supportedInterfaces list. These accessors read the preferred entry so
// callers do not each re-derive "the first one wins".

export function preferredInterface(card: AgentCard | undefined): AgentInterface | undefined {
  return card?.supportedInterfaces?.[0];
}

export function agentCardUrl(card: AgentCard | undefined): string {
  return preferredInterface(card)?.url ?? "";
}

export function agentCardTransport(card: AgentCard | undefined): string {
  return preferredInterface(card)?.protocolBinding ?? "JSONRPC";
}

export function agentCardProtocolVersion(card: AgentCard | undefined): string {
  return preferredInterface(card)?.protocolVersion ?? "";
}

/** Every transport an agent advertises, deduplicated and in preference order. */
export function agentCardTransports(card: AgentCard | undefined): string[] {
  const seen = new Set<string>();
  for (const entry of card?.supportedInterfaces ?? []) {
    if (entry.protocolBinding) seen.add(entry.protocolBinding);
  }
  return [...seen];
}
