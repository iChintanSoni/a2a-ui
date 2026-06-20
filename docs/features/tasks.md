# Tasks

The Tasks view gives you a cross-conversation, task-centric perspective on all
A2A runs. Where the Conversations view is organised around sessions, Tasks is
organised around individual task objects — useful when one conversation
produces many tasks or when you want to find a specific task by its state.

![Task explorer](../screenshots/06-tasks.png)

---

## Task View vs Conversation View

| | Conversations | Tasks |
|--|--------------|-------|
| Unit of organisation | Chat session | Individual task |
| Best for | Session replay, comparing runs | Auditing task states, finding failures |
| Shows agent messages | Yes | Via linked conversation |
| Shows artifacts | Via chat timeline | Inline artifact panel |
| Filter by task state | No | Yes |

---

## State Filter

Filter tasks by their final state:

| State | Meaning |
|-------|---------|
| `submitted` | Task received, not yet processed |
| `working` | Agent is actively processing |
| `input-required` | Agent is waiting for user input |
| `completed` | Task finished successfully |
| `canceled` | Task was canceled by the user |
| `failed` | Task ended with an error |
| `rejected` | Agent refused to process the task |
| `auth-required` | Task requires additional authentication |
| `unknown` | State could not be determined |

---

## Search

The search bar filters tasks by:

- Task ID
- Context (conversation) ID
- Agent name or URL
- Artifact name

---

## Task Timeline

Each task row expands to show a visual timeline of state transitions, with
timestamps and durations for each stage. This makes it easy to see where time
is being spent — e.g. whether the agent is slow to start or slow to finish.

---

## Artifacts Panel

Each task shows the artifacts it produced. Click an artifact to inspect its
content, copy it, or download it. Text and Markdown artifacts can be edited.

---

## Warnings Panel

If the agent sent responses that triggered compliance warnings (missing
required fields, unexpected event shapes), they appear here alongside the
task. This supplements the per-session debug panel with a task-scoped view.

---

## Task Filter Presets

Save your current filter combination (state, search text) as a named preset.
Presets are stored per-agent and appear in the filter toolbar the next time you
open the Tasks view for that agent.

To save a preset: set your filters, click **Save preset**, and enter a name.
To load: click the preset name in the toolbar. To remove: click the ✕ next to
the preset name.
