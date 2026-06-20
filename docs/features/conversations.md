# Conversations

The Conversations view lists all saved chat sessions. Use it to revisit past
runs, organise your work, and set up comparisons.

![Conversations manager](../screenshots/05-conversations.png)

---

## List and Search

The list is sorted by most recent by default. Use the search bar to filter by:

- Conversation title
- Agent name
- Message content snippets

### Filters

| Filter | Options |
|--------|---------|
| **Status** | All, Active, Archived |
| **Sort** | Most recent, Oldest, Title (A → Z) |

---

## Conversation Actions

Each conversation has a context menu with the following actions:

| Action | Description |
|--------|-------------|
| **Open** | Navigate to the chat view |
| **Rename** | Change the conversation title |
| **Pin** | Pinned conversations appear at the top of the list |
| **Archive** | Move to the archived view (not deleted) |
| **Clone** | Create a copy (see [Clone modes](#clone-modes)) |
| **Delete** | Permanently remove the conversation |

---

## Clone Modes

Cloning creates a new conversation entry from an existing one. Two modes:

**Prompts only** — copies only your user messages. The agent responses are
left blank. Use this to replay the same prompt set against a different agent
or after changing agent settings.

**Full history** — copies everything: user messages, agent responses, artifacts,
tool calls, execution events, and metadata. Use this to create a snapshot
before modifying an ongoing investigation.

Cloned conversations are linked to the original via a `sourceChatId` field
visible in forensic JSON exports.

---

## Batch Operations

Select multiple conversations using the checkboxes that appear on hover, then
use the batch action toolbar:

| Batch action | Description |
|--------------|-------------|
| **Export JSON** | Download selected conversations as a raw JSON bundle |
| **Export forensic JSON** | Full state dump including debug logs |
| **Export Markdown** | Human-readable trace for all selected conversations |
| **Delete** | Permanently remove selected conversations |

---

## Compare Two Runs

To compare two conversations side by side:

1. Check the boxes on two conversations.
2. Click **Compare** in the batch toolbar (or the dedicated Compare button
   that appears when exactly two are selected).

This opens the [Compare Runs](compare-runs.md) view with those two
conversations pre-loaded.

---

## Export Formats

Individual conversation exports are also available from inside the chat view
via the Export menu. See [Chat → Export Options](chat.md#export-options).
