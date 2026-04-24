import type {
  Message,
  Part,
  TaskArtifactUpdateEvent,
  TaskState,
  TaskStatusUpdateEvent,
} from "@a2a-js/sdk";
import type { Client } from "@a2a-js/sdk/client";
import type { Agent } from "@/lib/features/agents/agentsSlice";
import { buildOutgoingMessage } from "@/lib/a2a/message-utils";
import { createClientFactory } from "@/lib/utils/auth";
import {
  evaluateExpectedTaskState,
  evaluateOutputMode,
  evaluateQaAssertions,
  jsonValuesFromParts,
  textFromParts,
  type QaCapturedOutput,
} from "@/lib/features/qa/assertions";
import type { QaCaseResult, QaSuite, QaSuiteRun } from "@/lib/features/qa/types";

interface QaRunnerOptions {
  suite: QaSuite;
  agent: Agent;
  client?: Client;
}

function outputModeFromCapture(output: QaCapturedOutput) {
  if (output.artifactCount > 0) return "artifact";
  if (output.jsonValues.length > 0) return "json";
  if (output.text.length > 0) return "text";
  return "any";
}

async function executeQaCase(input: {
  suite: QaSuite;
  agent: Agent;
  client: Client;
  testCase: QaSuite["cases"][number];
}): Promise<QaCaseResult> {
  const startedAt = Date.now();
  const contextId = crypto.randomUUID();
  const messageId = crypto.randomUUID();
  const parts: Part[] = [
    { kind: "text", text: input.testCase.prompt },
    ...input.testCase.attachments,
  ];
  const outputParts: Part[] = [];
  let artifactCount = 0;
  let finalTaskState: TaskState | undefined;

  try {
    const message = await buildOutgoingMessage({
      parts,
      messageId,
      contextId,
      agentUrl: input.agent.url,
      metadata: input.testCase.metadata,
    });
    const stream = input.client.sendMessageStream({ message });

    for await (const event of stream) {
      if (event.kind === "status-update") {
        const statusEvent = event as TaskStatusUpdateEvent;
        finalTaskState = statusEvent.status.state;
        if (statusEvent.status.message) {
          outputParts.push(...statusEvent.status.message.parts);
        }
        continue;
      }

      if (event.kind === "artifact-update") {
        const artifactEvent = event as TaskArtifactUpdateEvent;
        artifactCount += artifactEvent.lastChunk === false ? 0 : 1;
        outputParts.push(...artifactEvent.artifact.parts);
        continue;
      }

      if (event.kind === "message") {
        const agentMessage = event as Message;
        if (agentMessage.role === "agent") {
          outputParts.push(...agentMessage.parts);
        }
      }
    }

    const output: QaCapturedOutput = {
      text: textFromParts(outputParts),
      jsonValues: jsonValuesFromParts(outputParts),
      artifactCount,
      finalTaskState,
    };
    const assertionResults = [
      evaluateExpectedTaskState(input.testCase.expectedTaskState, output),
      evaluateOutputMode(input.testCase.expectedOutputMode, output),
      ...evaluateQaAssertions(input.testCase.assertions, output),
    ].filter((result) => result != null);
    const passed = assertionResults.every((result) => result.passed);

    return {
      caseId: input.testCase.id,
      caseName: input.testCase.name,
      passed,
      durationMs: Date.now() - startedAt,
      finalTaskState,
      outputMode: outputModeFromCapture(output),
      outputPreview: output.text.slice(0, 500),
      assertionResults,
    };
  } catch (err) {
    return {
      caseId: input.testCase.id,
      caseName: input.testCase.name,
      passed: false,
      durationMs: Date.now() - startedAt,
      finalTaskState,
      outputMode: "any",
      outputPreview: "",
      assertionResults: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function executeQaSuite({
  suite,
  agent,
  client,
}: QaRunnerOptions): Promise<QaSuiteRun> {
  const startedAt = Date.now();
  const runnerClient =
    client ??
    (await createClientFactory(agent.auth, agent.customHeaders, undefined, undefined, {
      a2uiEnabled: agent.a2uiEnabled,
    }).createFromUrl(agent.url));
  const caseResults: QaCaseResult[] = [];

  for (const testCase of suite.cases) {
    caseResults.push(await executeQaCase({ suite, agent, client: runnerClient, testCase }));
  }

  return {
    id: crypto.randomUUID(),
    suiteId: suite.id,
    suiteName: suite.name,
    agentUrl: agent.url,
    agentName: suite.agentName,
    startedAt,
    completedAt: Date.now(),
    passed: caseResults.every((result) => result.passed),
    caseResults,
  };
}
