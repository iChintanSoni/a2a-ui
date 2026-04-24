import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import type { QaState, QaSuite, QaSuiteRun } from "@/lib/features/qa/types";

const MAX_RUN_HISTORY = 100;

const initialState: QaState = {
  suites: [],
  runs: [],
};

export const qaSlice = createSlice({
  name: "qa",
  initialState,
  reducers: {
    hydrateQa: (_state, action: PayloadAction<QaState | undefined>) => ({
      suites: action.payload?.suites ?? [],
      runs: action.payload?.runs ?? [],
    }),
    saveQaSuite: (state, action: PayloadAction<QaSuite>) => {
      const suite = {
        ...action.payload,
        updatedAt: Date.now(),
      };
      const existing = state.suites.findIndex((entry) => entry.id === suite.id);
      if (existing >= 0) {
        state.suites[existing] = suite;
      } else {
        state.suites.unshift(suite);
      }
    },
    removeQaSuite: (state, action: PayloadAction<string>) => {
      state.suites = state.suites.filter((suite) => suite.id !== action.payload);
      state.runs = state.runs.filter((run) => run.suiteId !== action.payload);
    },
    recordQaRun: (state, action: PayloadAction<QaSuiteRun>) => {
      state.runs.unshift(action.payload);
      if (state.runs.length > MAX_RUN_HISTORY) {
        state.runs = state.runs.slice(0, MAX_RUN_HISTORY);
      }
    },
    clearQaRunHistory: (state, action: PayloadAction<string | undefined>) => {
      if (!action.payload) {
        state.runs = [];
        return;
      }
      state.runs = state.runs.filter((run) => run.suiteId !== action.payload);
    },
  },
});

export const {
  hydrateQa,
  saveQaSuite,
  removeQaSuite,
  recordQaRun,
  clearQaRunHistory,
} = qaSlice.actions;

export default qaSlice.reducer;
