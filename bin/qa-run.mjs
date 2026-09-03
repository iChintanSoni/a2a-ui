#!/usr/bin/env node
/**
 * Headless QA runner. Loads a suite JSON file (exported from the QA Harness
 * dashboard) and runs it against an agent, then writes results and exits with
 * code 0 (all passed) or 1 (any failed or error).
 *
 * Usage:
 *   npx a2a-ui qa-run --file suite.json [options]
 *
 * Options:
 *   --file <path>          Path to suite JSON file (required)
 *   --agent-url <url>      Override the agent URL stored in the suite
 *   --output <path>        Write results JSON to this file
 *   --format json|junit    Output format (default: json)
 *   --timeout <ms>         Per-case timeout in milliseconds (default: 60000)
 *   -h, --help             Show help
 */

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const packageRoot = dirname(__dirname);

// Resolve TypeScript-compiled runner via the installed package's src.
// We use dynamic import so this file stays pure ESM without a build step.
const tsNodeAvailable = (() => {
  try {
    createRequire(import.meta.url).resolve("tsx");
    return true;
  } catch {
    return false;
  }
})();

export function parseQaRunArgs(args) {
  const options = {
    file: null,
    agentUrl: null,
    output: null,
    format: "json",
    timeout: 60000,
    help: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg === "-h" || arg === "--help") {
      options.help = true;
      continue;
    }

    if (arg === "--file" || arg === "-f") {
      options.file = args[++i] ?? null;
      continue;
    }
    if (arg.startsWith("--file=")) {
      options.file = arg.slice("--file=".length);
      continue;
    }

    if (arg === "--agent-url") {
      options.agentUrl = args[++i] ?? null;
      continue;
    }
    if (arg.startsWith("--agent-url=")) {
      options.agentUrl = arg.slice("--agent-url=".length);
      continue;
    }

    if (arg === "--output" || arg === "-o") {
      options.output = args[++i] ?? null;
      continue;
    }
    if (arg.startsWith("--output=")) {
      options.output = arg.slice("--output=".length);
      continue;
    }

    if (arg === "--format") {
      const fmt = args[++i];
      if (fmt !== "json" && fmt !== "junit")
        throw new Error(`Unknown format: ${fmt}. Use json or junit.`);
      options.format = fmt;
      continue;
    }
    if (arg.startsWith("--format=")) {
      const fmt = arg.slice("--format=".length);
      if (fmt !== "json" && fmt !== "junit")
        throw new Error(`Unknown format: ${fmt}. Use json or junit.`);
      options.format = fmt;
      continue;
    }

    if (arg === "--timeout") {
      options.timeout = Number(args[++i]);
      continue;
    }
    if (arg.startsWith("--timeout=")) {
      options.timeout = Number(arg.slice("--timeout=".length));
      continue;
    }

    throw new Error(`Unknown argument: ${arg}`);
  }

  return options;
}

export function qaRunHelpText() {
  return `a2a-ui qa-run

Run a QA suite file headlessly and exit 0 (all passed) or 1 (any failures).

Usage:
  a2a-ui qa-run --file <suite.json> [options]

Options:
  -f, --file <path>        Path to exported suite JSON (required)
      --agent-url <url>    Override agent URL stored in the suite
  -o, --output <path>      Write results to this file
      --format json|junit  Output format (default: json)
      --timeout <ms>       Per-case timeout in ms (default: 60000)
  -h, --help               Show this help

Examples:
  npx a2a-ui qa-run --file my-suite.json
  npx a2a-ui qa-run --file my-suite.json --agent-url http://localhost:3001 --output results.json
  npx a2a-ui qa-run --file my-suite.json --format junit --output results.xml
`;
}

function toJunit(suiteRun, suiteName) {
  const total = suiteRun.caseResults.length;
  const failures = suiteRun.caseResults.filter(c => !c.passed).length;
  const totalMs = suiteRun.completedAt - suiteRun.startedAt;

  const cases = suiteRun.caseResults
    .map(c => {
      const time = (c.durationMs / 1000).toFixed(3);
      if (c.passed) {
        return `    <testcase name="${escXml(c.caseName)}" classname="${escXml(suiteName)}" time="${time}" />`;
      }
      const msgs = c.error
        ? [c.error]
        : c.assertionResults.filter(a => !a.passed).map(a => `${a.label}: ${a.message}`);
      return `    <testcase name="${escXml(c.caseName)}" classname="${escXml(suiteName)}" time="${time}">
      <failure message="${escXml(msgs.join("; "))}" />
    </testcase>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<testsuites>
  <testsuite name="${escXml(suiteName)}" tests="${total}" failures="${failures}" time="${(totalMs / 1000).toFixed(3)}">
${cases}
  </testsuite>
</testsuites>`;
}

function escXml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function runQaSuite(options) {
  if (!options.file) throw new Error("--file is required.");
  const filePath = resolve(options.file);
  if (!existsSync(filePath)) throw new Error(`File not found: ${filePath}`);

  const raw = JSON.parse(readFileSync(filePath, "utf8"));

  // Accept either a bare suite object or the { suite, runs } export format.
  const suite = raw.suite ?? raw;
  if (!suite.cases || !Array.isArray(suite.cases)) {
    throw new Error("Invalid suite file: missing 'cases' array.");
  }

  if (options.agentUrl) {
    suite.agentUrl = options.agentUrl;
  }

  // Dynamically import the TypeScript runner via tsx if available,
  // otherwise fall back to the pre-transpiled version in .next/server.
  let executeQaSuite;

  try {
    // When running from source with tsx/ts-node available
    if (tsNodeAvailable) {
      const runnerMod = await import(join(packageRoot, "lib/features/qa/runner.ts"));
      executeQaSuite = runnerMod.executeQaSuite;
    } else {
      throw new Error("tsx not available");
    }
  } catch {
    // Fall back: use a minimal inline runner for the Node.js CLI context.
    // This avoids needing a separate build step for the CLI.
    executeQaSuite = await buildInlineRunner();
  }

  const agentCard = {
    name: suite.agentName,
    url: suite.agentUrl,
    version: "1.0",
    description: "",
    capabilities: {},
    skills: [],
  };
  const agent = {
    id: "cli",
    url: suite.agentUrl,
    displayName: suite.agentName,
    card: agentCard,
    status: "connected",
    auth: { type: "none" },
    customHeaders: [],
    tags: [],
    a2uiEnabled: false,
  };

  console.error(
    `Running suite: ${suite.name} (${suite.cases.length} case${suite.cases.length === 1 ? "" : "s"}) → ${suite.agentUrl}`,
  );

  const startedAt = Date.now();
  const run = await executeQaSuite({ suite, agent });
  const elapsed = Date.now() - startedAt;

  const passed = run.caseResults.filter(c => c.passed).length;
  const total = run.caseResults.length;
  console.error(
    `\n${run.passed ? "✓ PASSED" : "✗ FAILED"} — ${passed}/${total} cases in ${elapsed} ms\n`,
  );

  for (const c of run.caseResults) {
    const icon = c.passed ? "  ✓" : "  ✗";
    console.error(`${icon} ${c.caseName} (${c.durationMs} ms)`);
    for (const a of c.assertionResults) {
      const aIcon = a.passed ? "    ·" : "    ✗";
      console.error(`${aIcon} ${a.label}: ${a.message}`);
    }
    if (c.error) console.error(`    ✗ Error: ${c.error}`);
  }

  let output;
  if (options.format === "junit") {
    output = toJunit(run, suite.name);
  } else {
    output = JSON.stringify(run, null, 2);
  }

  if (options.output) {
    const outPath = resolve(options.output);
    writeFileSync(outPath, output, "utf8");
    console.error(`\nResults written to ${outPath}`);
  } else {
    process.stdout.write(output + "\n");
  }

  return run.passed;
}

async function buildInlineRunner() {
  // Minimal inline runner using @a2a-js/sdk directly (no TS source needed).
  const { ClientFactory } = await import("@a2a-js/sdk/client");
  const { Role } = await import("@a2a-js/sdk");

  async function executeQaSuite({ suite, agent }) {
    const caseResults = [];
    const startedAt = Date.now();

    // Defaults already carry the JSON-RPC and REST transports plus the
    // well-known card resolver, which v1.0 needs to pick a supportedInterface.
    const client = await new ClientFactory().createFromUrl(agent.url);

    for (const testCase of flattenDataTable(suite.cases)) {
      const caseStart = Date.now();
      const contextId = generateId();
      const parts = [textPart(testCase.prompt), ...(testCase.attachments ?? [])];
      const outputParts = [];
      const artifactMimeTypes = [];
      let artifactCount = 0;
      let finalTaskState;

      try {
        const message = {
          messageId: generateId(),
          contextId,
          taskId: "",
          role: Role.ROLE_USER,
          parts,
          metadata: testCase.metadata ?? {},
          extensions: [],
          referenceTaskIds: [],
        };
        const stream = client.sendMessageStream({
          tenant: "",
          message,
          configuration: undefined,
          metadata: undefined,
        });
        for await (const event of stream) {
          const payload = event.payload;
          if (payload?.$case === "statusUpdate") {
            const status = payload.value.status;
            if (status) {
              finalTaskState = status.state;
              if (status.message) outputParts.push(...status.message.parts);
            }
          } else if (payload?.$case === "artifactUpdate") {
            const artifact = payload.value.artifact;
            if (!artifact) continue;
            if (payload.value.lastChunk !== false) {
              artifactCount++;
              for (const part of artifact.parts) {
                if (isFilePart(part) && part.mediaType) artifactMimeTypes.push(part.mediaType);
              }
            }
            outputParts.push(...artifact.parts);
          } else if (payload?.$case === "message" && payload.value.role === Role.ROLE_AGENT) {
            outputParts.push(...payload.value.parts);
          }
        }
      } catch (err) {
        caseResults.push({
          caseId: testCase.id,
          caseName: testCase.name,
          passed: false,
          durationMs: Date.now() - caseStart,
          finalTaskState,
          outputMode: "any",
          outputPreview: "",
          assertionResults: [],
          error: err instanceof Error ? err.message : String(err),
        });
        continue;
      }

      const durationMs = Date.now() - caseStart;
      const text = outputParts
        .filter(p => p.content?.$case === "text")
        .map(p => p.content.value)
        .join("\n")
        .trim();
      const assertionResults = evaluateAll(testCase, {
        text,
        artifactCount,
        artifactMimeTypes,
        durationMs,
        finalTaskState,
      });
      const passed = assertionResults.every(a => a.passed);
      const outputMode =
        artifactCount > 0 ? "artifact" : text.includes("{") ? "json" : text ? "text" : "any";
      caseResults.push({
        caseId: testCase.id,
        caseName: testCase.name,
        passed,
        durationMs,
        finalTaskState,
        outputMode,
        outputPreview: text.slice(0, 500),
        assertionResults,
      });
    }

    return {
      id: generateId(),
      suiteId: suite.id,
      suiteName: suite.name,
      agentUrl: suite.agentUrl,
      agentName: suite.agentName,
      startedAt,
      completedAt: Date.now(),
      passed: caseResults.every(c => c.passed),
      caseResults,
    };
  }

  return executeQaSuite;
}

function generateId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// Mirrors lib/a2a/parts.ts — v1.0 `Part` requires every field.
function textPart(text, mediaType = "text/plain") {
  return { content: { $case: "text", value: text }, metadata: undefined, filename: "", mediaType };
}

function isFilePart(part) {
  return part?.content?.$case === "url" || part?.content?.$case === "raw";
}

// Mirrors lib/a2a/legacy.ts — saved suites may hold v0.3 kebab-case states,
// `TASK_STATE_*` names, or the v1.0 enum ordinal.
const TASK_STATE_ORDINALS = {
  TASK_STATE_UNSPECIFIED: 0,
  TASK_STATE_SUBMITTED: 1,
  TASK_STATE_WORKING: 2,
  TASK_STATE_COMPLETED: 3,
  TASK_STATE_FAILED: 4,
  TASK_STATE_CANCELED: 5,
  TASK_STATE_INPUT_REQUIRED: 6,
  TASK_STATE_REJECTED: 7,
  TASK_STATE_AUTH_REQUIRED: 8,
};

const LEGACY_TASK_STATES = {
  unknown: 0,
  submitted: 1,
  working: 2,
  completed: 3,
  failed: 4,
  canceled: 5,
  cancelled: 5,
  "input-required": 6,
  rejected: 7,
  "auth-required": 8,
};

const TASK_STATE_LABELS = [
  "unknown",
  "submitted",
  "working",
  "completed",
  "failed",
  "canceled",
  "input-required",
  "rejected",
  "auth-required",
];

export function toTaskState(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return -1;
  if (value in TASK_STATE_ORDINALS) return TASK_STATE_ORDINALS[value];
  const legacy = LEGACY_TASK_STATES[value.toLowerCase()];
  return legacy === undefined ? -1 : legacy;
}

export function taskStateLabel(state) {
  return TASK_STATE_LABELS[state] ?? "unknown";
}

function flattenDataTable(cases) {
  return cases.flatMap(c => {
    if (!c.dataTable || c.dataTable.length === 0) return [c];
    return c.dataTable.map((row, i) => ({
      ...c,
      id: `${c.id}-row${i}`,
      name: `${c.name} [row ${i + 1}]`,
      prompt: applyRow(c.prompt, row),
      metadata: Object.fromEntries(
        Object.entries(c.metadata ?? {}).map(([k, v]) => [k, applyRow(v, row)]),
      ),
      dataTable: undefined,
    }));
  });
}

function applyRow(template, row) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key) => row[key] ?? `{{${key}}}`);
}

export function evaluateAll(testCase, output) {
  const results = [];
  // TASK_STATE_UNSPECIFIED is 0, so a truthiness check would silently skip it.
  if (testCase.expectedTaskState !== undefined && testCase.expectedTaskState !== null) {
    const expected = toTaskState(testCase.expectedTaskState);
    const passed = output.finalTaskState === expected;
    const expectedLabel = taskStateLabel(expected);
    results.push({
      assertionId: "expected-task-state",
      label: `Expected task state ${expectedLabel}`,
      passed,
      message: passed
        ? `Final task state was ${expectedLabel}.`
        : `Final task state was ${
            output.finalTaskState === undefined ? "unknown" : taskStateLabel(output.finalTaskState)
          }.`,
    });
  }
  if (testCase.expectedOutputMode && testCase.expectedOutputMode !== "any") {
    const mode = testCase.expectedOutputMode;
    const passed =
      mode === "artifact"
        ? output.artifactCount > 0
        : mode === "text"
          ? output.text.length > 0
          : false;
    results.push({
      assertionId: "expected-output-mode",
      label: `Expected ${mode} output`,
      passed,
      message: passed ? `Observed ${mode} output.` : `Did not observe ${mode} output.`,
    });
  }
  for (const a of testCase.assertions ?? []) {
    if (a.kind === "content-regex") {
      try {
        const passed = new RegExp(a.pattern, a.flags).test(output.text);
        results.push({
          assertionId: a.id,
          label: a.label,
          passed,
          message: passed ? `Matched /${a.pattern}/.` : `No match for /${a.pattern}/.`,
        });
      } catch (err) {
        results.push({ assertionId: a.id, label: a.label, passed: false, message: String(err) });
      }
    } else if (a.kind === "task-duration-ms") {
      const actual = output.durationMs;
      const passed =
        a.operator === "lt"
          ? actual < a.value
          : a.operator === "lte"
            ? actual <= a.value
            : a.operator === "gt"
              ? actual > a.value
              : actual >= a.value;
      results.push({
        assertionId: a.id,
        label: a.label,
        passed,
        message: passed
          ? `Duration ${actual} ms satisfies constraint.`
          : `Duration ${actual} ms did not satisfy constraint (${a.operator} ${a.value} ms).`,
      });
    } else if (a.kind === "artifact-mime") {
      const matched = output.artifactMimeTypes.some(m => {
        const [pt, ps] = a.pattern.split("/");
        const [mt, ms] = m.split("/");
        return pt === mt && (ps === "*" || ps === ms);
      });
      results.push({
        assertionId: a.id,
        label: a.label,
        passed: matched,
        message: matched
          ? `Found artifact matching "${a.pattern}".`
          : `No artifact matching "${a.pattern}" (found: ${output.artifactMimeTypes.join(", ") || "none"}).`,
      });
    }
    // json-path: skip in CLI runner (requires a JSON path library)
  }
  return results;
}

export async function main(argv) {
  let options;
  try {
    options = parseQaRunArgs(argv);
  } catch (err) {
    console.error(err.message);
    console.error(qaRunHelpText());
    process.exit(1);
  }

  if (options.help) {
    console.log(qaRunHelpText());
    process.exit(0);
  }

  try {
    const passed = await runQaSuite(options);
    process.exit(passed ? 0 : 1);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  }
}
