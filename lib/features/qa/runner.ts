import { Role, type Part, type TaskState } from "@a2a-js/sdk";
import type { Client } from "@a2a-js/sdk/client";
import type { Agent } from "@/lib/features/agents/agentsSlice";
import { buildOutgoingMessage } from "@/lib/a2a/message-utils";
import { isFilePart, textPart } from "@/lib/a2a/parts";
import { getErrorMessage } from "@/lib/utils/error";
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

function mimeTypesFromParts(parts: Part[]): string[] {
  return parts.filter(isFilePart).flatMap(part => (part.mediaType ? [part.mediaType] : []));
}

/** Substitute {{varName}} placeholders in a string from a data-table row. */
function applyRow(template: string, row: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => row[key] ?? `{{${key}}}`);
}

/** Expand a test case with a dataTable into one case per row. */
function expandDataTable(testCase: QaSuite["cases"][number]): QaSuite["cases"][number][] {
  if (!testCase.dataTable || testCase.dataTable.length === 0) return [testCase];
  return testCase.dataTable.map((row, index) => ({
    ...testCase,
    id: `${testCase.id}-row${index}`,
    name: `${testCase.name} [row ${index + 1}]`,
    prompt: applyRow(testCase.prompt, row),
    metadata: Object.fromEntries(
      Object.entries(testCase.metadata).map(([k, v]) => [k, applyRow(v, row)]),
    ),
    dataTable: undefined,
  }));
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
  const parts: Part[] = [textPart(input.testCase.prompt), ...input.testCase.attachments];
  const outputParts: Part[] = [];
  const artifactMimeTypes: string[] = [];
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
    const stream = input.client.sendMessageStream({
      tenant: "",
      message,
      configuration: undefined,
      metadata: undefined,
    });

    for await (const event of stream) {
      switch (event.payload?.$case) {
        case "statusUpdate": {
          const status = event.payload.value.status;
          if (status) {
            finalTaskState = status.state;
            if (status.message) outputParts.push(...status.message.parts);
          }
          break;
        }
        case "artifactUpdate": {
          const artifact = event.payload.value.artifact;
          if (!artifact) break;
          if (event.payload.value.lastChunk !== false) {
            artifactCount += 1;
            artifactMimeTypes.push(...mimeTypesFromParts(artifact.parts));
          }
          outputParts.push(...artifact.parts);
          break;
        }
        case "message": {
          const agentMessage = event.payload.value;
          if (agentMessage.role === Role.ROLE_AGENT) {
            outputParts.push(...agentMessage.parts);
          }
          break;
        }
      }
    }

    const durationMs = Date.now() - startedAt;
    const output: QaCapturedOutput = {
      text: textFromParts(outputParts),
      jsonValues: jsonValuesFromParts(outputParts),
      artifactCount,
      artifactMimeTypes,
      durationMs,
      finalTaskState,
    };
    const assertionResults = [
      evaluateExpectedTaskState(input.testCase.expectedTaskState, output),
      evaluateOutputMode(input.testCase.expectedOutputMode, output),
      ...evaluateQaAssertions(input.testCase.assertions, output),
    ].filter(result => result != null);
    const passed = assertionResults.every(result => result.passed);

    return {
      caseId: input.testCase.id,
      caseName: input.testCase.name,
      passed,
      durationMs,
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
      error: getErrorMessage(err),
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
  const expandedCases = suite.cases.flatMap(expandDataTable);

  for (const testCase of expandedCases) {
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
    passed: caseResults.every(result => result.passed),
    caseResults,
  };
}
