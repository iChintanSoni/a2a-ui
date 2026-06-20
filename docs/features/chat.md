# Chat

The chat view is where you interact with an agent in real time. It supports
streaming responses, file attachments, metadata, artifacts, tool calls,
structured UI surfaces, and a full protocol debug panel.

![Chat view with task artifacts and debugging context](../screenshots/04-chat-debug.png)

---

## Session Lifecycle

Every conversation has a **context ID** — a UUID that identifies the session
to the agent. The agent uses this to maintain conversation state across turns.

- When you open a new chat, a fresh context ID is generated automatically.
- Press **Cmd+Shift+N** (Mac) / **Ctrl+Shift+N** (Windows/Linux) to start a
  new session within the same chat page, generating a new context ID.
- The context ID is shown in the session info bar at the top of the chat.

---

## Sending a Message

Type your message in the input box at the bottom and press **Enter** (or
click the send button).

### File Attachments

Click the paperclip icon to attach files. Only MIME types that match the
agent's declared input modes are shown. For example, if the agent only
declares `text/*` input, image upload is hidden.

Supported attachment types: images, audio, video, PDF, arbitrary data files.

### Voice Input

Click the microphone icon to record audio. The recording is sent as an audio
file part using the browser's MediaRecorder API. The agent receives the raw
audio — transcription (if any) happens agent-side.

### Metadata Editor

Click the **Metadata** button to attach a JSON key-value object to the
message. This is forwarded to the agent as `message.metadata`. Use it for:

- User context (`userId`, `sessionId`)
- Feature flags
- Hidden instructions the agent reads as structured input

### Prompt Presets

If you have saved prompt presets for this agent (via Workbench → Agent
Settings), they appear as quick-insert buttons above the input field.

---

## Reading Responses

Responses stream in real time. The chat timeline shows:

| Item type | What it is |
|-----------|-----------|
| **Task status** | State transitions: submitted → working → completed / failed / input-required |
| **Agent message** | A free-form message from the agent (non-task response) |
| **Artifact** | Named output (document, image, data) produced by a task |
| **Tool call** | A tool the agent invoked, with its query and result count |

### Artifacts

Artifacts appear as expandable blocks. Text and Markdown artifacts can be
edited inline and re-exported. Click **Download** to save any artifact locally.

### A2UI Structured Surfaces

If the agent sends data parts that conform to the A2UI schema, they are
rendered as structured components: text blocks, badges, key-value tables,
lists, and markdown. Set **A2UI enabled** in Agent Settings to activate this.

### Input Required

When a task reaches the `input-required` state, the input box prompts you to
provide the requested input. Your next message is sent as an input response
to the pending task.

---

## Debug Panel

Press **Cmd+Shift+D** (Mac) / **Ctrl+Shift+D** (Windows/Linux) to toggle the
debug panel. It shows:

- **HTTP logs** — every request and response, with method, URL, status code,
  headers, and body
- **Validation warnings** — protocol compliance issues detected in real time
- **Correlation IDs** — link requests to the execution events that triggered them

The debug panel opens automatically if a streaming error occurs.

---

## Event Explorer

Click the **Events** button (activity icon) to open the Event Explorer. It
shows all execution events for the current chat session, filterable by:

- **Kind** — outgoing-message, task-status, artifact-update, tool-call,
  agent-message, structured-ui, error, validation
- **Request ID** — filter to a specific request/response pair
- **Task ID** — filter to events for one task

Each event row expands to show its full detail payload.

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Cmd/Ctrl+Shift+D` | Toggle debug panel |
| `Cmd/Ctrl+Shift+N` | Start a new session (new context ID) |
| `Enter` | Send message |
| `Shift+Enter` | Insert newline in input |

---

## Export Options

Open the **Export** menu (download icon) to save the conversation:

| Format | Contents |
|--------|----------|
| **Markdown trace** | Human-readable export: messages, task states, artifacts, timing |
| **Forensic JSON** | Full state dump including execution events, debug logs, metadata |
| **Protocol report** | Compliance results + HTTP logs — useful for bug reports |

---

## Clone and Rerun

**Clone** creates a copy of the conversation in the Conversations view. Two
clone modes:

- **Prompts only** — copies the user messages; agent responses are empty. Use
  to replay the same prompts against a different agent or config.
- **Full history** — copies everything including agent responses, artifacts,
  and events.

**Rerun** opens a fresh session and immediately replays the last user prompt.
Useful for iteration without manually copying the prompt.
