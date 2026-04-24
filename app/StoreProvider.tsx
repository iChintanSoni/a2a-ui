"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "@/lib/store";
import {
  loadPersistedState,
  persistAgents,
  persistChats,
  persistQa,
  persistWorkbench,
} from "@/lib/persistence";
import { hydrateAgents, updateAgentCard, updateAgentStatus } from "@/lib/features/agents/agentsSlice";
import { createClientFactory } from "@/lib/utils/auth";
import { hydrateChats } from "@/lib/features/chats/chatsSlice";
import { hydrateQa } from "@/lib/features/qa/qaSlice";
import { hydrateWorkbench } from "@/lib/features/workbench/workbenchSlice";

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<AppStore | null>(null);

  useEffect(() => {
    const s = makeStore();

    loadPersistedState()
      .then(({ agents, chats, workbench, qa }) => {
        s.dispatch(hydrateAgents(agents));
        s.dispatch(hydrateChats(chats));
        s.dispatch(hydrateWorkbench(workbench));
        s.dispatch(hydrateQa(qa));

        const disconnected = agents.filter((a) => a.status === "disconnected");
        for (const agent of disconnected) {
          const factory = createClientFactory(agent.auth, agent.customHeaders);
          factory
            .createFromUrl(agent.url)
            .then((client) => client.getAgentCard())
            .then((card) => {
              s.dispatch(updateAgentCard({ agentId: agent.id, card }));
            })
            .catch(() => {
              s.dispatch(updateAgentStatus({ url: agent.url, status: "error", error: "Unreachable" }));
            });
        }
      })
      .catch(() => {
        // IndexedDB unavailable — start with empty state (already the default)
      })
      .finally(() => {
        // Subscribe to persist changes after hydration is done
        let prevAgents = s.getState().agents.agents;
        let prevChats = s.getState().chats.chats;
        let prevWorkbench = s.getState().workbench;
        let prevQa = s.getState().qa;
        s.subscribe(() => {
          const state = s.getState();
          if (state.agents.agents !== prevAgents) {
            prevAgents = state.agents.agents;
            persistAgents(state.agents.agents).catch(console.error);
          }
          if (state.chats.chats !== prevChats) {
            prevChats = state.chats.chats;
            persistChats(state.chats.chats).catch(console.error);
          }
          if (state.workbench !== prevWorkbench) {
            prevWorkbench = state.workbench;
            persistWorkbench(state.workbench).catch(console.error);
          }
          if (state.qa !== prevQa) {
            prevQa = state.qa;
            persistQa(state.qa).catch(console.error);
          }
        });

        setStore(s);
      });
  }, []);

  if (!store) return null;

  return <Provider store={store}>{children}</Provider>;
}
