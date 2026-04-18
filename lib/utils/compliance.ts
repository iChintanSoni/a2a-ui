import type { AgentCard } from "@/lib/features/agents/agentsSlice";
import { normalizeMode } from "@/lib/utils/modes";

export type ComplianceSeverity = "error" | "warning" | "info";

export interface ComplianceCheck {
  id: string;
  label: string;
  pass: boolean;
  message: string;
  severity: ComplianceSeverity;
}

export interface ComplianceResult {
  checks: ComplianceCheck[];
  passCount: number;
  failCount: number;
  warningCount: number;
}

function isNonEmptyString(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isNonEmptyString);
}

function toArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function hasValidUrl(v: unknown): boolean {
  if (!isNonEmptyString(v)) return false;
  try {
    new URL(String(v));
    return true;
  } catch {
    return false;
  }
}

function compatibleModes(skillModes: unknown, defaultModes: string[] | undefined): boolean {
  if (!Array.isArray(skillModes) || !defaultModes?.length) return true;
  const normalizedDefaults = new Set(defaultModes.map(normalizeMode));
  return skillModes
    .filter((m): m is string => typeof m === "string")
    .every((m) => normalizedDefaults.has(normalizeMode(m)));
}

const KNOWN_TRANSPORTS = new Set(["JSONRPC", "HTTP+JSON", "GRPC"]);
const SUPPORTED_PROTOCOL_MAJOR = 0;

export function checkCompliance(card: AgentCard): ComplianceResult {
  const raw = card as unknown as Record<string, unknown>;
  const checks: ComplianceCheck[] = [];

  const check = (
    id: string,
    label: string,
    pass: boolean,
    failMsg: string,
    passMsg = "OK",
    severity: ComplianceSeverity = "error"
  ) => checks.push({ id, label, pass, message: pass ? passMsg : failMsg, severity });

  // Required string fields
  check("name", "name is present", isNonEmptyString(raw.name), "Missing or empty 'name'");
  check(
    "description",
    "description is present",
    isNonEmptyString(raw.description),
    "Missing or empty 'description'"
  );
  check(
    "version",
    "version is present",
    isNonEmptyString(raw.version),
    "Missing or empty 'version'"
  );
  check(
    "protocolVersion",
    "protocolVersion is present",
    isNonEmptyString(raw.protocolVersion),
    "Missing or empty 'protocolVersion'"
  );

  const protocolVersion = isNonEmptyString(raw.protocolVersion)
    ? String(raw.protocolVersion)
    : "";
  const protocolMajor = Number(protocolVersion.split(".")[0]);
  check(
    "protocolVersion-compatible",
    "protocolVersion is compatible",
    protocolVersion !== "" && Number.isFinite(protocolMajor) && protocolMajor === SUPPORTED_PROTOCOL_MAJOR,
    `Unsupported protocolVersion '${protocolVersion || "missing"}'. This UI currently expects A2A 0.x cards.`,
    `Compatible (${protocolVersion})`
  );

  // URL — required and must be a valid URL
  const hasUrl = isNonEmptyString(raw.url);
  let validUrl = false;
  if (hasUrl) {
    try {
      new URL(raw.url as string);
      validUrl = true;
    } catch {
      // invalid
    }
  }
  check(
    "url",
    "url is a valid URL",
    validUrl,
    hasUrl ? "Invalid URL format" : "Missing or empty 'url'",
    `Valid (${raw.url})`
  );

  // capabilities object
  const hasCaps =
    raw.capabilities !== null && typeof raw.capabilities === "object";
  check(
    "capabilities",
    "capabilities object is present",
    hasCaps,
    "Missing required 'capabilities' object"
  );

  const preferredTransport = isNonEmptyString(raw.preferredTransport)
    ? String(raw.preferredTransport).toUpperCase()
    : "JSONRPC";
  check(
    "preferredTransport",
    "preferredTransport is supported",
    KNOWN_TRANSPORTS.has(preferredTransport),
    `Unsupported preferredTransport '${String(raw.preferredTransport)}'`,
    `Using ${preferredTransport}`
  );

  const interfaces = toArray(raw.additionalInterfaces);
  const invalidInterfaces = interfaces.flatMap((entry, index) => {
    if (!isRecord(entry)) return [`additionalInterfaces[${index}] is not an object`];

    const problems: string[] = [];
    const transport = isNonEmptyString(entry.transport)
      ? String(entry.transport).toUpperCase()
      : "";
    if (!hasValidUrl(entry.url)) problems.push("url must be an absolute URL");
    if (!KNOWN_TRANSPORTS.has(transport)) problems.push("transport is unsupported");

    return problems.length > 0
      ? [`additionalInterfaces[${index}]: ${problems.join(", ")}`]
      : [];
  });
  const interfacesValid = invalidInterfaces.length === 0;
  check(
    "additionalInterfaces",
    "additionalInterfaces declare valid URL/transport pairs",
    interfacesValid,
    invalidInterfaces.join("; "),
    interfaces.length > 0 ? `${interfaces.length} interface(s) declared` : "No additional interfaces declared",
    "warning"
  );

  const preferredTransportHasInterface =
    interfaces.length === 0 ||
    !validUrl ||
    interfaces.some(
      (entry) =>
        isRecord(entry) &&
        String(entry.url) === String(raw.url) &&
        String(entry.transport).toUpperCase() === preferredTransport
    );
  check(
    "preferredTransport-interface",
    "preferredTransport is represented in additionalInterfaces",
    preferredTransportHasInterface,
    "Best practice: include an additionalInterfaces entry matching the main url and preferredTransport",
    "Preferred transport is discoverable",
    "warning"
  );

  // skills array — required and non-empty
  const hasSkills = Array.isArray(raw.skills);
  const nonEmptySkills = hasSkills && (raw.skills as unknown[]).length > 0;
  check(
    "skills-present",
    "skills array is present",
    hasSkills,
    "Missing required 'skills' field"
  );
  check(
    "skills-non-empty",
    "skills array is non-empty",
    nonEmptySkills,
    "'skills' array must not be empty",
    `${(raw.skills as unknown[] | undefined)?.length ?? 0} skill(s) declared`
  );

  // defaultInputModes — required, non-empty
  const inputModes = raw.defaultInputModes as string[] | undefined;
  const hasInputModes = isStringArray(inputModes) && inputModes.length > 0;
  check(
    "defaultInputModes",
    "defaultInputModes is non-empty",
    hasInputModes,
    "Missing or empty 'defaultInputModes'",
    `[${(inputModes ?? []).join(", ")}]`
  );

  // defaultOutputModes — required, non-empty
  const outputModes = raw.defaultOutputModes as string[] | undefined;
  const hasOutputModes = isStringArray(outputModes) && outputModes.length > 0;
  check(
    "defaultOutputModes",
    "defaultOutputModes is non-empty",
    hasOutputModes,
    "Missing or empty 'defaultOutputModes'",
    `[${(outputModes ?? []).join(", ")}]`
  );

  // Each skill must have required fields
  if (nonEmptySkills) {
    const skills = raw.skills as Array<Record<string, unknown>>;
    const skillsValid = skills.every(
      (s) =>
        isNonEmptyString(s.id) &&
        isNonEmptyString(s.name) &&
        isNonEmptyString(s.description)
    );
    check(
      "skills-fields",
      "skills have required fields (id, name, description)",
      skillsValid,
      "One or more skills missing required fields (id, name, description)"
    );

    const skillTagsValid = skills.every((s) => isStringArray(s.tags));
    check(
      "skills-tags",
      "skills declare tags arrays",
      skillTagsValid,
      "One or more skills is missing a valid tags array",
      "All skills include tags",
      "warning"
    );

    const skillInputModesValid = skills.every((s) =>
      compatibleModes(s.inputModes, inputModes)
    );
    check(
      "skills-inputModes",
      "skill inputModes inherit from defaultInputModes",
      skillInputModesValid,
      "One or more skills declares an input mode that is not included in defaultInputModes",
      "Skill input modes are consistent"
    );

    const skillOutputModesValid = skills.every((s) =>
      compatibleModes(s.outputModes, outputModes)
    );
    check(
      "skills-outputModes",
      "skill outputModes inherit from defaultOutputModes",
      skillOutputModesValid,
      "One or more skills declares an output mode that is not included in defaultOutputModes",
      "Skill output modes are consistent"
    );
  }

  const securitySchemes = isRecord(raw.securitySchemes) ? raw.securitySchemes : undefined;
  const security = toArray(raw.security);
  const securityRefsValid =
    security.length === 0 ||
    (securitySchemes != null &&
      security.every(
        (requirement) =>
          isRecord(requirement) &&
          Object.keys(requirement).every((schemeName) => schemeName in securitySchemes)
      ));
  check(
    "security-references",
    "security requirements reference declared schemes",
    securityRefsValid,
    "One or more security requirements references an undeclared securitySchemes key",
    security.length > 0
      ? `${security.length} security requirement set(s) declared`
      : "No security requirements declared",
    "warning"
  );

  const securitySchemesValid =
    securitySchemes == null ||
    Object.values(securitySchemes).every((scheme) => isRecord(scheme) && isNonEmptyString(scheme.type));
  check(
    "securitySchemes",
    "securitySchemes are displayable",
    securitySchemesValid,
    "One or more securitySchemes entries is missing a type",
    securitySchemes ? `${Object.keys(securitySchemes).length} scheme(s) declared` : "No security schemes declared",
    "warning"
  );

  const passCount = checks.filter((c) => c.pass).length;
  const failCount = checks.filter((c) => !c.pass).length;
  const warningCount = checks.filter((c) => !c.pass && c.severity === "warning").length;
  return { checks, passCount, failCount, warningCount };
}

export interface ValidationWarning {
  id: string;
  label: string;
  message: string;
  path?: string;
}

function warning(id: string, label: string, message: string, path?: string): ValidationWarning {
  return { id, label, message, path };
}

function validateParts(parts: unknown, path: string): ValidationWarning[] {
  if (!Array.isArray(parts) || parts.length === 0) {
    return [warning("parts-empty", "Parts are present", "Expected a non-empty parts array", path)];
  }

  const warnings: ValidationWarning[] = [];
  parts.forEach((part, index) => {
    const partPath = `${path}[${index}]`;
    if (!isRecord(part) || !isNonEmptyString(part.kind)) {
      warnings.push(warning("part-kind", "Part kind is valid", "Part is missing a string kind", partPath));
      return;
    }
    if (part.kind === "text" && typeof part.text !== "string") {
      warnings.push(warning("text-part", "Text part has text", "Text parts must include a text string", partPath));
    }
    if (part.kind === "file" && !isRecord(part.file)) {
      warnings.push(warning("file-part", "File part has file data", "File parts must include a file object", partPath));
    }
    if (part.kind === "data" && !isRecord(part.data)) {
      warnings.push(warning("data-part", "Data part has data", "Data parts must include a data object", partPath));
    }
  });
  return warnings;
}

export function validateOutgoingMessage(message: unknown): ValidationWarning[] {
  const msg = isRecord(message) ? message : {};
  const warnings: ValidationWarning[] = [];
  if (msg.kind !== "message") {
    warnings.push(warning("message-kind", "Outgoing message kind", "Outgoing payload should use kind 'message'", "message.kind"));
  }
  if (msg.role !== "user") {
    warnings.push(warning("message-role", "Outgoing message role", "Outgoing payload should use role 'user'", "message.role"));
  }
  if (!isNonEmptyString(msg.messageId)) {
    warnings.push(warning("message-id", "Outgoing message id", "Outgoing message is missing messageId", "message.messageId"));
  }
  if (!isNonEmptyString(msg.contextId)) {
    warnings.push(warning("context-id", "Outgoing context id", "Outgoing message is missing contextId", "message.contextId"));
  }
  warnings.push(...validateParts(msg.parts, "message.parts"));
  return warnings;
}

export function validateIncomingEvent(event: unknown): ValidationWarning[] {
  if (!isRecord(event)) {
    return [warning("event-shape", "Event shape", "Incoming event is not an object")];
  }

  if (event.kind === "status-update") {
    const warnings: ValidationWarning[] = [];
    if (!isNonEmptyString(event.taskId)) {
      warnings.push(warning("task-id", "Task id", "Status update is missing taskId", "taskId"));
    }
    if (!isNonEmptyString(event.contextId)) {
      warnings.push(warning("context-id", "Context id", "Status update is missing contextId", "contextId"));
    }
    const status = isRecord(event.status) ? event.status : undefined;
    if (!status || !isNonEmptyString(status.state)) {
      warnings.push(warning("status-state", "Status state", "Status update is missing status.state", "status.state"));
    }
    if (status?.message) {
      warnings.push(...validateParts((status.message as Record<string, unknown>).parts, "status.message.parts"));
    }
    return warnings;
  }

  if (event.kind === "artifact-update") {
    const warnings: ValidationWarning[] = [];
    if (!isNonEmptyString(event.taskId)) {
      warnings.push(warning("task-id", "Task id", "Artifact update is missing taskId", "taskId"));
    }
    if (!isNonEmptyString(event.contextId)) {
      warnings.push(warning("context-id", "Context id", "Artifact update is missing contextId", "contextId"));
    }
    const artifact = isRecord(event.artifact) ? event.artifact : undefined;
    if (!artifact) {
      warnings.push(warning("artifact", "Artifact shape", "Artifact update is missing artifact", "artifact"));
      return warnings;
    }
    if (!isNonEmptyString(artifact.artifactId)) {
      warnings.push(warning("artifact-id", "Artifact id", "Artifact is missing artifactId", "artifact.artifactId"));
    }
    warnings.push(...validateParts(artifact.parts, "artifact.parts"));
    return warnings;
  }

  if (event.kind === "message") {
    const warnings: ValidationWarning[] = [];
    if (event.role !== "agent") {
      warnings.push(warning("message-role", "Message role", "Incoming message should use role 'agent'", "role"));
    }
    if (!isNonEmptyString(event.messageId)) {
      warnings.push(warning("message-id", "Message id", "Incoming message is missing messageId", "messageId"));
    }
    warnings.push(...validateParts(event.parts, "parts"));
    return warnings;
  }

  return [warning("event-kind", "Event kind", `Unknown incoming event kind '${String(event.kind)}'`, "kind")];
}
