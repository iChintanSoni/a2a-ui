# Agent Settings

Each agent has its own settings page where you can configure display
preferences, authentication, custom headers, and inspect protocol compliance.

<!-- Screenshot: TODO — agent settings page -->

Navigate here from the Agent Library by clicking the **Settings** (gear) icon
on an agent card, or via the sidebar when a chat with that agent is open.

---

## Identity

| Field | Description |
|-------|-------------|
| **Display name** | Overrides the agent's card name in the UI. Useful when you have multiple agents at different environments with the same card name. |
| **Tags** | Free-form labels (e.g. `production`, `staging`, `experimental`). Used for filtering in the Agent Library. |
| **Favorite** | Toggle to pin the agent at the top of the library. |

---

## Authentication

A2A UI supports four auth types. Changes take effect immediately — no restart needed.

### None

No auth header is added to requests. For public agents or local development.

### Bearer Token

```
Authorization: Bearer <your-token>
```

Enter the token in the **Token** field. The `Authorization: Bearer` prefix is
added automatically.

### API Key

Sends a custom header with a secret value. Configure:

- **Header name** — e.g. `X-API-Key`, `X-Auth-Token`
- **Header value** — the secret key

### Basic Auth

```
Authorization: Basic <base64(username:password)>
```

Enter the **Username** and **Password**. The encoding is handled automatically.

---

## Custom Headers

Add arbitrary key-value headers sent with every request to this agent.
Common uses:

- **Tenant ID** — `X-Tenant-Id: acme-corp`
- **Correlation ID** — `X-Correlation-Id: my-test-run`
- **Feature flags** — `X-Feature-Flags: new-summarizer`
- **Environment** — `X-Environment: staging`

Headers added here are in addition to auth headers. Order is preserved.

---

## Agent Card

The **Card** tab shows the raw agent card JSON returned by the agent's
`/.well-known/agent.json` endpoint. It includes:

- Agent name, description, and version
- Declared capabilities (streaming, push notifications, state transition history)
- Skills with examples and input/output modes
- Supported authentication schemes

Click **Refresh card** to re-fetch the agent card without reconnecting.

---

## Compliance Report

The compliance report validates the agent card against the A2A specification.
Each check is listed with a pass/warn/fail status and a short description.

| Check category | What is validated |
|----------------|------------------|
| Required fields | `name`, `description`, `version` present |
| Auth schemes | Declared auth types are valid A2A values |
| Skill format | Each skill has an `id`, `name`, and valid input/output modes |
| Capabilities | Declared capabilities match known A2A capability keys |
| Protocol version | Version string is well-formed |

### Exporting a protocol report

Click **Export report** to download a JSON file containing the compliance
results, validation warnings from live sessions, and raw HTTP logs. Useful
for filing bug reports against an agent or documenting integration test results.

---

## Danger Zone

At the bottom of the settings page you can **Remove agent**. This removes the
agent from your library but does not delete conversations or QA suites
associated with that agent — those remain in the Conversations and QA Harness
views.
