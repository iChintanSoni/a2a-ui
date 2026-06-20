# Agent Library

The Agent Library is your central view for managing every A2A agent you have
connected. From here you can add new agents, check their status, configure
auth, and start conversations.

![Agent Library with connected demo agents](../screenshots/03-agent-library.png)

---

## Adding an Agent

Click **Add Agent** (top-right or Workbench home). Fill in:

| Field | Required | Notes |
|-------|----------|-------|
| **Agent URL** | Yes | HTTP or HTTPS URL of the A2A server |
| **Auth** | No | See [Authentication](#authentication) below |
| **Custom headers** | No | Key-value pairs sent with every request |
| **Display name** | No | Overrides the name from the agent card |

Click **Connect**. The dashboard calls the agent's card endpoint, validates
the response, and adds the agent to the library.

---

## Status Indicators

Each agent card shows a coloured dot:

| Colour | Meaning |
|--------|---------|
| 🟢 Green | Connected — agent card fetched successfully |
| 🔴 Red | Error — last connection attempt failed |
| ⚪ Grey | Idle — not yet contacted since last load |

The transport method (REST or JSON-RPC) is shown when connected.

---

## Authentication

A2A UI supports four auth types, all stored locally in the browser:

| Type | When to use |
|------|------------|
| **None** | Public agents or local dev without auth |
| **Bearer token** | Agents that accept `Authorization: Bearer <token>` |
| **API key** | Agents that use a custom header like `X-API-Key` |
| **Basic** | Username + password sent as `Authorization: Basic …` |

Auth credentials are included in every request to the agent. They are
included in workspace exports — handle exports accordingly.

---

## Search, Filter, and Sort

The search bar filters agents by name, URL, and tags.

**Filter** options (top of the list):

- **Status** — All / Connected / Error
- **Transport** — All / REST / JSON-RPC
- **Tags** — any tag you have assigned to agents

**Sort** options:

- Name (A → Z)
- Last used (most recent first)
- Compliance (most compliant first)

---

## Compliance Badges

The compliance badge summarises protocol validation results:

| Badge | Meaning |
|-------|---------|
| ✅ Pass | All required fields present and valid |
| ⚠️ Warning | Non-critical issues (missing optional fields, etc.) |
| ❌ Fail | Required fields missing or invalid |

Click on an agent's compliance badge to see the full report, or go to
[Agent Settings → Compliance](agent-settings.md#compliance-report).

---

## Starting a Chat

Click **Chat** on any agent card to open a new conversation. The chat view
uses the agent's declared input/output modalities to filter attachment options
and display appropriate UI.

---

## Favorites

Click the star icon on any agent to mark it as a favorite. Favorites appear
at the top of the library and count toward the Favorites metric on the
Workbench home.
