import {
  TaskState,
  taskStateFromJSON,
  type AgentCard,
  type AgentInterface,
  type Part,
} from "@a2a-js/sdk";
import { isRecord } from "@/lib/utils/type-guards";
import { dataPart, rawFilePart, textPart, urlFilePart } from "@/lib/a2a/parts";

// The bridge between v0.3 and v1.0 spellings, in both directions. Everything
// a2a-ui persisted before the SDK upgrade — IndexedDB chats, saved QA suites,
// exported workspaces — used the v0.3 shapes, so reads accept either; and the
// UI still shows the short kebab-case state names rather than protobuf's
// SCREAMING_SNAKE.

/** v0.3 spelled task states in kebab-case; v1.0 uses a numeric protobuf enum. */
const LEGACY_TASK_STATES: Record<string, TaskState> = {
  submitted: TaskState.TASK_STATE_SUBMITTED,
  working: TaskState.TASK_STATE_WORKING,
  completed: TaskState.TASK_STATE_COMPLETED,
  failed: TaskState.TASK_STATE_FAILED,
  canceled: TaskState.TASK_STATE_CANCELED,
  cancelled: TaskState.TASK_STATE_CANCELED,
  "input-required": TaskState.TASK_STATE_INPUT_REQUIRED,
  rejected: TaskState.TASK_STATE_REJECTED,
  "auth-required": TaskState.TASK_STATE_AUTH_REQUIRED,
  unknown: TaskState.TASK_STATE_UNSPECIFIED,
};

/** The inverse of {@link LEGACY_TASK_STATES} — `taskStateToJSON` shouts, the UI does not. */
const TASK_STATE_LABELS: Record<TaskState, string> = {
  [TaskState.TASK_STATE_UNSPECIFIED]: "unknown",
  [TaskState.TASK_STATE_SUBMITTED]: "submitted",
  [TaskState.TASK_STATE_WORKING]: "working",
  [TaskState.TASK_STATE_COMPLETED]: "completed",
  [TaskState.TASK_STATE_FAILED]: "failed",
  [TaskState.TASK_STATE_CANCELED]: "canceled",
  [TaskState.TASK_STATE_INPUT_REQUIRED]: "input-required",
  [TaskState.TASK_STATE_REJECTED]: "rejected",
  [TaskState.TASK_STATE_AUTH_REQUIRED]: "auth-required",
  [TaskState.UNRECOGNIZED]: "unknown",
};

/** Short, human-facing spelling of a task state for labels, filters, and exports. */
export function taskStateLabel(state: TaskState | undefined): string {
  return state === undefined ? "unknown" : (TASK_STATE_LABELS[state] ?? "unknown");
}

/** Accepts a v1.0 enum value, a `TASK_STATE_*` name, or a legacy v0.3 string. */
export function toTaskState(value: unknown): TaskState {
  if (typeof value === "string") {
    const legacy = LEGACY_TASK_STATES[value.toLowerCase()];
    if (legacy !== undefined) return legacy;
  }
  return taskStateFromJSON(value);
}

/** Like {@link toTaskState}, but blank/absent stays absent instead of becoming UNRECOGNIZED. */
export function toOptionalTaskState(value: unknown): TaskState | undefined {
  if (value === undefined || value === null || value === "") return undefined;
  return toTaskState(value);
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function migrateLegacyPart(value: unknown): Part {
  if (!isRecord(value)) return textPart("");

  // Already v1.0 — backfill the fields protobuf requires but old writers omitted.
  if (isRecord(value.content) && typeof value.content.$case === "string") {
    return {
      content: value.content as Part["content"],
      metadata: isRecord(value.metadata) ? value.metadata : undefined,
      filename: asString(value.filename),
      mediaType: asString(value.mediaType),
    };
  }

  const metadata = isRecord(value.metadata) ? value.metadata : undefined;
  const withMetadata = (part: Part): Part => (metadata ? { ...part, metadata } : part);

  if (value.kind === "data") return withMetadata(dataPart(value.data));

  if (value.kind === "file" && isRecord(value.file)) {
    const file = value.file;
    const name = asString(file.name);
    const mimeType = asString(file.mimeType) || undefined;
    if (typeof file.bytes === "string") {
      return withMetadata(rawFilePart(Buffer.from(file.bytes, "base64"), name, mimeType));
    }
    return withMetadata(urlFilePart(asString(file.uri), name, mimeType));
  }

  return withMetadata(textPart(asString(value.text)));
}

export function migrateLegacyParts(value: unknown): Part[] {
  return Array.isArray(value) ? value.map(migrateLegacyPart) : [];
}

function migrateLegacyInterfaces(card: Record<string, unknown>): AgentInterface[] {
  const protocolVersion = asString(card.protocolVersion) || "0.3";
  const declared = Array.isArray(card.additionalInterfaces) ? card.additionalInterfaces : [];

  const fromAdditional = declared.filter(isRecord).map(entry => ({
    url: asString(entry.url),
    protocolBinding: asString(entry.transport) || "JSONRPC",
    tenant: "",
    protocolVersion,
  }));

  const mainUrl = asString(card.url);
  if (!mainUrl) return fromAdditional;

  const preferred: AgentInterface = {
    url: mainUrl,
    protocolBinding: asString(card.preferredTransport) || "JSONRPC",
    tenant: "",
    protocolVersion,
  };

  // The preferred interface leads the list; v1.0 treats the first entry as preferred.
  return [
    preferred,
    ...fromAdditional.filter(
      entry => entry.url !== preferred.url || entry.protocolBinding !== preferred.protocolBinding,
    ),
  ];
}

export function migrateLegacyAgentCard(value: unknown): AgentCard {
  const card = isRecord(value) ? value : {};
  const capabilities = isRecord(card.capabilities) ? card.capabilities : {};

  const skills = (Array.isArray(card.skills) ? card.skills : []).filter(isRecord).map(skill => ({
    id: asString(skill.id),
    name: asString(skill.name),
    description: asString(skill.description),
    tags: Array.isArray(skill.tags)
      ? skill.tags.filter((t): t is string => typeof t === "string")
      : [],
    examples: Array.isArray(skill.examples)
      ? skill.examples.filter((e): e is string => typeof e === "string")
      : [],
    inputModes: Array.isArray(skill.inputModes)
      ? skill.inputModes.filter((m): m is string => typeof m === "string")
      : [],
    outputModes: Array.isArray(skill.outputModes)
      ? skill.outputModes.filter((m): m is string => typeof m === "string")
      : [],
    securityRequirements: Array.isArray(skill.security) ? skill.security : [],
  })) as AgentCard["skills"];

  return {
    name: asString(card.name),
    description: asString(card.description),
    supportedInterfaces: Array.isArray(card.supportedInterfaces)
      ? (card.supportedInterfaces as AgentInterface[])
      : migrateLegacyInterfaces(card),
    provider: isRecord(card.provider)
      ? (card.provider as unknown as AgentCard["provider"])
      : undefined,
    version: asString(card.version),
    documentationUrl: typeof card.documentationUrl === "string" ? card.documentationUrl : undefined,
    capabilities: {
      streaming: capabilities.streaming === true,
      pushNotifications: capabilities.pushNotifications === true,
      extensions: Array.isArray(capabilities.extensions)
        ? (capabilities.extensions as NonNullable<AgentCard["capabilities"]>["extensions"])
        : [],
      extendedAgentCard:
        capabilities.extendedAgentCard === true ||
        capabilities.supportsAuthenticatedExtendedCard === true,
    },
    securitySchemes: isRecord(card.securitySchemes)
      ? (card.securitySchemes as AgentCard["securitySchemes"])
      : {},
    securityRequirements: Array.isArray(card.securityRequirements)
      ? (card.securityRequirements as AgentCard["securityRequirements"])
      : Array.isArray(card.security)
        ? (card.security as AgentCard["securityRequirements"])
        : [],
    defaultInputModes: Array.isArray(card.defaultInputModes)
      ? card.defaultInputModes.filter((m): m is string => typeof m === "string")
      : [],
    defaultOutputModes: Array.isArray(card.defaultOutputModes)
      ? card.defaultOutputModes.filter((m): m is string => typeof m === "string")
      : [],
    skills,
    signatures: Array.isArray(card.signatures) ? (card.signatures as AgentCard["signatures"]) : [],
    iconUrl: typeof card.iconUrl === "string" ? card.iconUrl : undefined,
  };
}
