"use client";

import { useMemo, useState } from "react";
import { PageTitle, Muted } from "@/components/typography";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { recordQaRun } from "@/lib/features/qa/qaSlice";
import { executeQaSuite } from "@/lib/features/qa/runner";
import { SuiteBuilder } from "@/components/qa/SuiteBuilder";
import { SavedSuites } from "@/components/qa/SavedSuites";
import { RunHistory } from "@/components/qa/RunHistory";
import type { QaSuite } from "@/lib/features/qa/types";

export default function QaPage() {
  const dispatch = useAppDispatch();
  const agents = useAppSelector((state) => state.agents.agents);
  const suites = useAppSelector((state) => state.qa.suites);
  const runs = useAppSelector((state) => state.qa.runs);

  const [agentUrl, setAgentUrl] = useState(agents[0]?.url ?? "");
  const [runningSuiteId, setRunningSuiteId] = useState<string | null>(null);

  const selectedAgent = agents.find((a) => a.url === agentUrl) ?? agents[0];
  const suitesByAgent = useMemo(
    () => suites.filter((suite) => !selectedAgent || suite.agentUrl === selectedAgent.url),
    [selectedAgent, suites],
  );

  const runSuite = async (suite: QaSuite) => {
    const agent = agents.find((a) => a.url === suite.agentUrl);
    if (!agent) return;
    setRunningSuiteId(suite.id);
    try {
      const run = await executeQaSuite({ suite, agent });
      dispatch(recordQaRun(run));
    } finally {
      setRunningSuiteId(null);
    }
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 md:p-8">
      <div>
        <PageTitle>QA Harness</PageTitle>
        <Muted>Save repeatable agent checks, run suites, and export pass/fail reports.</Muted>
      </div>

      {agents.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <Muted>Add an agent before creating QA suites.</Muted>
        </div>
      ) : (
        <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(320px,420px)_minmax(0,1fr)]">
          <SuiteBuilder
            agents={agents}
            selectedAgent={selectedAgent}
            agentUrl={agentUrl}
            onAgentChange={setAgentUrl}
          />

          <div className="flex min-w-0 flex-col gap-6">
            <SavedSuites
              suites={suitesByAgent}
              runs={runs}
              runningSuiteId={runningSuiteId}
              onRun={runSuite}
            />
            <RunHistory runs={runs} />
          </div>
        </div>
      )}
    </div>
  );
}
