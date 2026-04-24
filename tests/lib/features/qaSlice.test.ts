import { describe, expect, it, vi } from "vitest";
import reducer, {
  clearQaRunHistory,
  hydrateQa,
  recordQaRun,
  removeQaSuite,
  saveQaSuite,
} from "@/lib/features/qa/qaSlice";
import type { QaState, QaSuite, QaSuiteRun } from "@/lib/features/qa/types";

const INITIAL_STATE: QaState = { suites: [], runs: [] };

function makeSuite(id = "suite-1"): QaSuite {
  return {
    id,
    agentUrl: "https://agent.test",
    agentName: "Agent",
    name: "Smoke",
    createdAt: 1,
    updatedAt: 1,
    cases: [],
  };
}

function makeRun(id = "run-1", suiteId = "suite-1"): QaSuiteRun {
  return {
    id,
    suiteId,
    suiteName: "Smoke",
    agentUrl: "https://agent.test",
    agentName: "Agent",
    startedAt: 1,
    completedAt: 2,
    passed: true,
    caseResults: [],
  };
}

describe("qaSlice", () => {
  it("hydrates suites and runs", () => {
    const state = reducer(
      INITIAL_STATE,
      hydrateQa({ suites: [makeSuite()], runs: [makeRun()] }),
    );

    expect(state.suites).toHaveLength(1);
    expect(state.runs).toHaveLength(1);
  });

  it("saves new and existing suites", () => {
    vi.spyOn(Date, "now").mockReturnValue(100);
    let state = reducer(INITIAL_STATE, saveQaSuite(makeSuite()));
    state = reducer(state, saveQaSuite({ ...makeSuite(), name: "Updated" }));

    expect(state.suites).toHaveLength(1);
    expect(state.suites[0].name).toBe("Updated");
    expect(state.suites[0].updatedAt).toBe(100);
  });

  it("records and clears run history", () => {
    let state = reducer(INITIAL_STATE, recordQaRun(makeRun()));
    state = reducer(state, recordQaRun(makeRun("run-2", "suite-2")));

    expect(state.runs.map((run) => run.id)).toEqual(["run-2", "run-1"]);

    state = reducer(state, clearQaRunHistory("suite-1"));
    expect(state.runs.map((run) => run.id)).toEqual(["run-2"]);

    state = reducer(state, clearQaRunHistory(undefined));
    expect(state.runs).toEqual([]);
  });

  it("removes suites and their runs", () => {
    let state = reducer(INITIAL_STATE, saveQaSuite(makeSuite()));
    state = reducer(state, recordQaRun(makeRun()));
    state = reducer(state, removeQaSuite("suite-1"));

    expect(state.suites).toEqual([]);
    expect(state.runs).toEqual([]);
  });
});
