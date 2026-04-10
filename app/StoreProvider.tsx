"use client";

import { useEffect, useState } from "react";
import { Provider } from "react-redux";
import { makeStore, type AppStore } from "@/lib/store";
import { loadPersistedState, persistAgents, persistChats } from "@/lib/persistence";
import { hydrateAgents } from "@/lib/features/agents/agentsSlice";
import { hydrateChats } from "@/lib/features/chats/chatsSlice";

export default function StoreProvider({ children }: { children: React.ReactNode }) {
  const [store, setStore] = useState<AppStore | null>(null);

  useEffect(() => {
    const s = makeStore();

    loadPersistedState()
      .then(({ agents, chats }) => {
        s.dispatch(hydrateAgents(agents));
        s.dispatch(hydrateChats(chats));
      })
      .catch(() => {
        // IndexedDB unavailable — start with empty state (already the default)
      })
      .finally(() => {
        // Subscribe to persist changes after hydration is done
        let prevAgents = s.getState().agents.agents;
        let prevChats = s.getState().chats.chats;
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
        });

        setStore(s);
      });
  }, []);

  if (!store) return null;

  return <Provider store={store}>{children}</Provider>;
}
