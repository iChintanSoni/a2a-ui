# Workbench

The Workbench is the dashboard home. It gives you an at-a-glance view of
your workspace and quick navigation to every feature.

![A2A Workbench dashboard](../screenshots/02-workbench.png)

---

## Metric Cards

Four cards summarise the current state of your workspace:

| Card | What it counts | Links to |
|------|----------------|----------|
| **Agents** | Connected agent entries | Agent Library |
| **Conversations** | Saved chat sessions | Conversations |
| **Tasks** | Tasks across all conversations | Tasks |
| **Favorites** | Agents marked as favorite | — |

Click a card (except Favorites) to jump directly to that section.

---

## Adding an Agent

Click **Add Agent** to open the connection dialog. Enter the agent URL and
optional auth / headers. The dashboard fetches the agent card and adds the
agent to your library on success.

See [Agent Library](agent-library.md) for details on all connection options.

---

## Workspace Import / Export

The **Import** and **Export** buttons in the top-right area let you move your
entire workspace between machines or share setups with teammates.

### What a workspace export contains

A workspace JSON file includes:

- All agent entries (URL, display name, tags, auth config, custom headers)
- All saved conversations and their message histories
- All QA suites and run histories
- Workbench settings (prompt presets, default metadata, task filter presets)

Sensitive values (tokens, passwords) are included in plain text — treat the
export file as you would a credentials file.

### Import

Drag the JSON file onto the Import dialog or click to browse. Imported data
is merged with your existing workspace; duplicate agents (matched by URL) are
updated in place.

---

## Empty State

If no agents are connected, the Workbench shows a prompt to add your first
agent or import an existing workspace. The metric cards show zero values and
the quick-action grid is hidden until at least one agent is added.
