# QA Harness

The QA Harness lets you define repeatable test suites for an agent, run them
on demand or headlessly in CI, and track pass rates over time.

![QA Harness](../screenshots/07-qa-harness.png)

---

## Concepts

| Term | Meaning |
|------|---------|
| **Suite** | A named collection of test cases for one agent |
| **Case** | A single test: one prompt + expected state/output + assertions |
| **Run** | One execution of a suite; produces a pass/fail result per case |
| **Assertion** | A condition checked against the agent's response |

---

## Suite Builder

The left panel builds a suite step by step.

### 1. Suite-level fields

- **Agent** — which connected agent this suite targets
- **Suite name** — displayed in the saved suites list
- **Description** (optional) — a short note about what the suite tests

### 2. Case editor

Fill in one case at a time:

| Field | Description |
|-------|-------------|
| **Case name** | Identifies the case in run results |
| **Prompt** | The text sent to the agent |
| **Expected task state** | The final state the task must reach (e.g. `completed`) |
| **Output mode** | The kind of output expected: `any`, `text`, `json`, `artifact` |
| **Metadata JSON** | A JSON object sent as `message.metadata` |
| **Assertions** | One or more checks (see below) |
| **Data table** | Optional parametrize table (see [Parametrized Tests](#parametrized-tests)) |

Click **Add case** to append the current case to the pending list without
saving the suite yet. The pending cases are shown above the editor so you can
review and remove them before saving.

Click **Save suite** to persist the suite (with all pending cases + the
current case editor's contents).

---

## Assertion Types

### `content-regex`

Tests the agent's text output against a regular expression.

| Field | Example |
|-------|---------|
| Pattern | `ready\|ok` |
| Flags | `i` (case-insensitive, default) |

Matches against the concatenated text of all text parts in the response,
status message, and artifacts.

### `json-path`

Tests that a value exists (or equals a specific value) in the agent's JSON
output.

| Field | Example |
|-------|---------|
| Path | `$.status` |
| Equals (optional) | `ok` |

If **Equals** is omitted, the assertion passes as long as the path exists.
Supports dot-notation: `$.data.items.0.name`.

### `task-duration-ms`

Asserts on the wall-clock time from message send to task completion.

| Field | Options |
|-------|---------|
| Operator | `<` (lt), `≤` (lte), `>` (gt), `≥` (gte) |
| Value | Duration in milliseconds |

Example: assert the task completes in under 5 seconds → operator `<`, value `5000`.

Use this to enforce SLA checks in CI.

### `artifact-mime`

Asserts that at least one artifact in the response has a MIME type matching
a glob pattern.

| Pattern | Matches |
|---------|---------|
| `image/*` | Any image (PNG, JPEG, WebP, …) |
| `application/json` | Exactly `application/json` |
| `*` | Any MIME type (any artifact present) |

---

## Parametrized Tests

Add a **data table** to a case to run it multiple times with different inputs.
The data table is a JSON array of row objects. Use `{{varName}}` placeholders
in the prompt and metadata to substitute row values.

**Example data table:**

```json
[
  { "language": "French", "word": "bonjour" },
  { "language": "Spanish", "word": "hola" },
  { "language": "German", "word": "hallo" }
]
```

**Example prompt with substitution:**

```
Translate the word "{{word}}" from {{language}} to English.
```

At run time, this expands into three sub-cases:
- `Translate the word "bonjour" from French to English.`
- `Translate the word "hola" from Spanish to English.`
- `Translate the word "hallo" from German to English.`

Each sub-case runs independently and appears separately in the run results.

---

## Bulk Import

Click **Import** to load test cases from a file instead of building them
one by one.

### JSON format

An array of case objects. Each object supports the same fields as the case
editor:

```json
[
  {
    "name": "Basic response check",
    "prompt": "Are you ready?",
    "expectedTaskState": "completed",
    "expectedOutputMode": "text",
    "metadata": { "source": "ci" },
    "assertions": [
      {
        "id": "a1",
        "kind": "content-regex",
        "label": "Contains ready",
        "pattern": "ready",
        "flags": "i"
      },
      {
        "id": "a2",
        "kind": "task-duration-ms",
        "label": "Under 10s",
        "operator": "lt",
        "value": 10000
      }
    ],
    "dataTable": [
      { "env": "staging" },
      { "env": "production" }
    ]
  }
]
```

### CSV format

Each row becomes one case. Supported columns:

| Column | Description |
|--------|-------------|
| `name` | Case name |
| `prompt` | Prompt text |
| `expectedTaskState` | e.g. `completed` |
| `expectedOutputMode` | `any`, `text`, `json`, or `artifact` |
| `regexPattern` | Creates a `content-regex` assertion |
| `jsonPath` | Creates a `json-path` assertion |
| `metadata` | JSON string (parsed to object) |

**Example CSV:**

```csv
name,prompt,expectedTaskState,expectedOutputMode,regexPattern
"Readiness check","Are you ready?","completed","text","ready"
"JSON output","Return status JSON","completed","json","$.status"
```

Import errors are shown inline — the existing draft cases are not cleared on
a parse failure.

---

## Running Suites

Click **Run** on any saved suite to execute it. Cases run sequentially.

While running, the button changes to **Running** and is disabled. When
complete, the latest run result appears as a badge on the suite (Passing /
Failing) and in the Run History panel.

---

## Run History

The Run History panel shows recent runs (up to 20 visible; 100 stored).

Click any run row to expand it and see per-case results. Each case shows:

- Pass / Fail badge
- Output mode and final task state
- Duration
- Per-assertion results (label + message + ✓/✗ icon)
- Error message (if the case threw an exception)

### Pass Rate

Each saved suite shows a **pass rate badge** (e.g. `87% pass rate`) calculated
as `passing runs / total runs × 100` across all stored history for that suite.

---

## Export

Each suite has two export buttons:

| Button | Output |
|--------|--------|
| **JSON** | `{ suite, runs }` — the full suite definition plus all run history |
| **CSV** | Flat file with one row per assertion per case per run — useful for spreadsheet analysis or CI reporting |

**CSV columns:** `run_id`, `started_at`, `passed`, `duration_ms`, `case_name`, `case_passed`, `assertion_label`, `assertion_passed`, `assertion_message`

---

## Headless CLI Runner

Export a suite JSON from the dashboard, then run it from the command line:

```bash
npx a2a-ui qa-run --file my-suite.json
```

The runner exits with code `0` if all cases pass or `1` if any fail. Results
are printed to stdout.

### All flags

| Flag | Default | Description |
|------|---------|-------------|
| `-f`, `--file <path>` | — | Path to suite JSON (**required**) |
| `--agent-url <url>` | From suite | Override the agent URL |
| `-o`, `--output <path>` | stdout | Write results to a file |
| `--format json\|junit` | `json` | Output format |
| `--timeout <ms>` | `60000` | Per-case timeout |
| `-h`, `--help` | — | Show help |

### GitHub Actions example

```yaml
- name: Export QA suite from dashboard
  # Export via the UI first, commit the JSON to your repo

- name: Run QA suite
  run: npx a2a-ui qa-run --file qa/smoke-suite.json --agent-url ${{ env.AGENT_URL }} --format junit --output qa-results.xml

- name: Publish test results
  uses: mikepenz/action-junit-report@v4
  if: always()
  with:
    report_paths: qa-results.xml
```

### JUnit XML output

```bash
npx a2a-ui qa-run --file suite.json --format junit --output results.xml
```

The XML uses one `<testsuite>` per suite and one `<testcase>` per case. Failing
cases include a `<failure>` element with the assertion messages.
