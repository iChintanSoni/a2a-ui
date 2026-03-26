import { configureStore } from "@reduxjs/toolkit";
import agentsReducer from "./features/agents/agentsSlice";
import chatsReducer from "./features/chats/chatsSlice";

export const makeStore = () => {
  return configureStore({
    reducer: {
      agents: agentsReducer,
      chats: chatsReducer,
    },
  });
};

// Infer the type of makeStore
export type AppStore = ReturnType<typeof makeStore>;
// Infer the `RootState` and `AppDispatch` types from the store itself
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
