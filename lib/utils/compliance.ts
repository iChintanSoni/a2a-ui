import { Role, TaskState, type AgentCard } from "@a2a-js/sdk";
import { normalizeMode } from "@/lib/utils/modes";
import { isRecord } from "@/lib/utils/type-guards";

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

/** True when v is a string with at least one non-whitespace character. */
function isFilledString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every(isFilledString);
}

function toArray(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function hasValidUrl(v: unknown): boolean {
  if (!isFilledString(v)) return false;
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
    .every(m => normalizedDefaults.has(normalizeMode(m)));
}

const KNOWN_TRANSPORTS = new Set(["JSONRPC", "HTTP+JSON", "GRPC"]);
const SUPPORTED_PROTOCOL_MAJOR = 1;

export function checkCompliance(card: AgentCard): ComplianceResult {
  const raw = card as unknown as Record<string, unknown>;
  const checks: ComplianceCheck[] = [];

  const check = (
    id: string,
    label: string,
    pass: boolean,
    failMsg: string,
    passMsg = "OK",
    severity: ComplianceSeverity = "error",
  ) => checks.push({ id, label, pass, message: pass ? passMsg : failMsg, severity });

  // Required string fields
  check("name", "name is present", isFilledString(raw.name), "Missing or empty 'name'");
  check(
    "description",
    "description is present",
    isFilledString(raw.description),
    "Missing or empty 'description'",
  );
  check("version", "version is present", isFilledString(raw.version), "Missing or empty 'version'");

  // v1.0 replaced the top-level url/preferredTransport/additionalInterfaces trio
  // with a single ordered supportedInterfaces list whose first entry is preferred.
  const interfaces = toArray(raw.supportedInterfaces);
  check(
    "supportedInterfaces",
    "supportedInterfaces is non-empty",
    interfaces.length > 0,
    "Missing or empty 'supportedInterfaces'",
    `${interfaces.length} interface(s) declared`,
  );

  const invalidInterfaces = interfaces.flatMap((entry, index) => {
    if (!isRecord(entry)) return [`supportedInterfaces[${index}] is not an object`];

    const problems: string[] = [];
    const binding = isFilledString(entry.protocolBinding)
      ? String(entry.protocolBinding).toUpperCase()
      : "";
    if (!hasValidUrl(entry.url)) problems.push("url must be an absolute URL");
    if (!KNOWN_TRANSPORTS.has(binding)) problems.push("protocolBinding is unsupported");
    if (!isFilledString(entry.protocolVersion)) problems.push("protocolVersion is missing");

    return problems.length > 0 ? [`supportedInterfaces[${index}]: ${problems.join(", ")}`] : [];
  });
  check(
    "supportedInterfaces-entries",
    "supportedInterfaces declare valid URL/binding pairs",
    invalidInterfaces.length === 0,
    invalidInterfaces.join("; "),
    "All declared interfaces are well-formed",
  );

  const declaredVersions = interfaces
    .filter(isRecord)
    .map(entry => (isFilledString(entry.protocolVersion) ? String(entry.protocolVersion) : ""))
    .filter(Boolean);
  const compatibleVersions = declaredVersions.filter(version => {
    const major = Number(version.split(".")[0]);
    return Number.isFinite(major) && major === SUPPORTED_PROTOCOL_MAJOR;
  });
  check(
    "protocolVersion-compatible",
    "an interface speaks a supported protocol version",
    compatibleVersions.length > 0,
    declaredVersions.length > 0
      ? `No interface speaks A2A ${SUPPORTED_PROTOCOL_MAJOR}.x (declared: ${declaredVersions.join(", ")}). This UI speaks A2A ${SUPPORTED_PROTOCOL_MAJOR}.x only.`
      : "No interface declares a protocolVersion",
    `Compatible (${compatibleVersions.join(", ")})`,
  );

  // capabilities object
  const hasCaps = raw.capabilities !== null && typeof raw.capabilities === "object";
  check(
    "capabilities",
    "capabilities object is present",
    hasCaps,
    "Missing required 'capabilities' object",
  );

  // skills array — required and non-empty
  const skillsArr = Array.isArray(raw.skills) ? (raw.skills as unknown[]) : undefined;
  const hasSkills = skillsArr !== undefined;
  const nonEmptySkills = hasSkills && skillsArr!.length > 0;
  check("skills-present", "skills array is present", hasSkills, "Missing required 'skills' field");
  check(
    "skills-non-empty",
    "skills array is non-empty",
    nonEmptySkills,
    "'skills' array must not be empty",
    `${skillsArr?.length ?? 0} skill(s) declared`,
  );

  // defaultInputModes — required, non-empty
  const inputModes = raw.defaultInputModes as string[] | undefined;
  const hasInputModes = isStringArray(inputModes) && inputModes.length > 0;
  check(
    "defaultInputModes",
    "defaultInputModes is non-empty",
    hasInputModes,
    "Missing or empty 'defaultInputModes'",
    `[${(inputModes ?? []).join(", ")}]`,
  );

  // defaultOutputModes — required, non-empty
  const outputModes = raw.defaultOutputModes as string[] | undefined;
  const hasOutputModes = isStringArray(outputModes) && outputModes.length > 0;
  check(
    "defaultOutputModes",
    "defaultOutputModes is non-empty",
    hasOutputModes,
    "Missing or empty 'defaultOutputModes'",
    `[${(outputModes ?? []).join(", ")}]`,
  );

  // Each skill must have required fields
  if (nonEmptySkills) {
    const skills = skillsArr as Array<Record<string, unknown>>;
    const skillsValid = skills.every(
      s => isFilledString(s.id) && isFilledString(s.name) && isFilledString(s.description),
    );
    check(
      "skills-fields",
      "skills have required fields (id, name, description)",
      skillsValid,
      "One or more skills missing required fields (id, name, description)",
    );

    const skillTagsValid = skills.every(s => isStringArray(s.tags));
    check(
      "skills-tags",
      "skills declare tags arrays",
      skillTagsValid,
      "One or more skills is missing a valid tags array",
      "All skills include tags",
      "warning",
    );

    const skillInputModesValid = skills.every(s => compatibleModes(s.inputModes, inputModes));
    check(
      "skills-inputModes",
      "skill inputModes inherit from defaultInputModes",
      skillInputModesValid,
      "One or more skills declares an input mode that is not included in defaultInputModes",
      "Skill input modes are consistent",
    );

    const skillOutputModesValid = skills.every(s => compatibleModes(s.outputModes, outputModes));
    check(
      "skills-outputModes",
      "skill outputModes inherit from defaultOutputModes",
      skillOutputModesValid,
      "One or more skills declares an output mode that is not included in defaultOutputModes",
      "Skill output modes are consistent",
    );
  }

  const securitySchemes = isRecord(raw.securitySchemes) ? raw.securitySchemes : undefined;
  const security = toArray(raw.securityRequirements);
  const securityRefsValid =
    security.length === 0 ||
    (securitySchemes != null &&
      security.every(
        requirement =>
          isRecord(requirement) &&
          Object.keys(requirement).every(schemeName => schemeName in securitySchemes),
      ));
  check(
    "security-references",
    "security requirements reference declared schemes",
    securityRefsValid,
    "One or more securityRequirements entries references an undeclared securitySchemes key",
    security.length > 0
      ? `${security.length} security requirement set(s) declared`
      : "No security requirements declared",
    "warning",
  );

  const securitySchemesValid =
    securitySchemes == null ||
    Object.values(securitySchemes).every(scheme => isRecord(scheme) && isFilledString(scheme.type));
  check(
    "securitySchemes",
    "securitySchemes are displayable",
    securitySchemesValid,
    "One or more securitySchemes entries is missing a type",
    securitySchemes
      ? `${Object.keys(securitySchemes).length} scheme(s) declared`
      : "No security schemes declared",
    "warning",
  );

  const passCount = checks.filter(c => c.pass).length;
  const failCount = checks.filter(c => !c.pass).length;
  const warningCount = checks.filter(c => !c.pass && c.severity === "warning").length;
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
    if (!isRecord(part)) {
      warnings.push(warning("part-shape", "Part shape", "Part is not an object", partPath));
      return;
    }
    const content = isRecord(part.content) ? part.content : undefined;
    if (!content || !isFilledString(content.$case)) {
      warnings.push(
        warning(
          "part-case",
          "Part content is valid",
          "Part is missing a content oneof with a $case",
          `${partPath}.content`,
        ),
      );
      return;
    }
    if (content.$case === "text" && typeof content.value !== "string") {
      warnings.push(
        warning(
          "text-part",
          "Text part has text",
          "Text parts must carry a string value",
          `${partPath}.content.value`,
        ),
      );
    }
    if (content.$case === "url" && !isFilledString(content.value)) {
      warnings.push(
        warning(
          "url-part",
          "File part has a url",
          "File-by-reference parts must carry a url string",
          `${partPath}.content.value`,
        ),
      );
    }
    if (content.$case === "raw" && content.value == null) {
      warnings.push(
        warning(
          "raw-part",
          "File part has bytes",
          "File-by-value parts must carry byte content",
          `${partPath}.content.value`,
        ),
      );
    }
    if (content.$case === "data" && content.value === undefined) {
      warnings.push(
        warning(
          "data-part",
          "Data part has data",
          "Data parts must carry a value",
          `${partPath}.content.value`,
        ),
      );
    }
    if (!isFilledString(part.mediaType)) {
      warnings.push(
        warning(
          "part-media-type",
          "Part declares a media type",
          "v1.0 parts should declare a mediaType",
          `${partPath}.mediaType`,
        ),
      );
    }
  });
  return warnings;
}

export function validateOutgoingMessage(message: unknown): ValidationWarning[] {
  const msg = isRecord(message) ? message : {};
  const warnings: ValidationWarning[] = [];
  if (msg.role !== Role.ROLE_USER) {
    warnings.push(
      warning(
        "message-role",
        "Outgoing message role",
        "Outgoing payload should use role ROLE_USER",
        "message.role",
      ),
    );
  }
  if (!isFilledString(msg.messageId)) {
    warnings.push(
      warning(
        "message-id",
        "Outgoing message id",
        "Outgoing message is missing messageId",
        "message.messageId",
      ),
    );
  }
  if (!isFilledString(msg.contextId)) {
    warnings.push(
      warning(
        "context-id",
        "Outgoing context id",
        "Outgoing message is missing contextId",
        "message.contextId",
      ),
    );
  }
  warnings.push(...validateParts(msg.parts, "message.parts"));
  return warnings;
}

/**
 * Validates one `StreamResponse` off the wire. v1.0 dropped the `kind`
 * discriminator from the events themselves, so the payload oneof is the only
 * thing that says which event this is.
 */
export function validateIncomingEvent(event: unknown): ValidationWarning[] {
  if (!isRecord(event)) {
    return [warning("event-shape", "Event shape", "Incoming event is not an object")];
  }

  const payload = isRecord(event.payload) ? event.payload : undefined;
  if (!payload || !isFilledString(payload.$case)) {
    return [
      warning(
        "event-payload",
        "Event payload",
        "Incoming stream response is missing a payload oneof",
        "payload",
      ),
    ];
  }
  const value = isRecord(payload.value) ? payload.value : undefined;
  if (!value) {
    return [
      warning(
        "event-value",
        "Event value",
        "Incoming stream response has no payload value",
        "payload.value",
      ),
    ];
  }

  if (payload.$case === "statusUpdate") {
    const warnings: ValidationWarning[] = [];
    if (!isFilledString(value.taskId)) {
      warnings.push(
        warning("task-id", "Task id", "Status update is missing taskId", "payload.value.taskId"),
      );
    }
    if (!isFilledString(value.contextId)) {
      warnings.push(
        warning(
          "context-id",
          "Context id",
          "Status update is missing contextId",
          "payload.value.contextId",
        ),
      );
    }
    const status = isRecord(value.status) ? value.status : undefined;
    if (!status || typeof status.state !== "number" || status.state === TaskState.UNRECOGNIZED) {
      warnings.push(
        warning(
          "status-state",
          "Status state",
          "Status update is missing a recognized status.state",
          "payload.value.status.state",
        ),
      );
    }
    if (isRecord(status?.message)) {
      warnings.push(...validateParts(status.message.parts, "payload.value.status.message.parts"));
    }
    return warnings;
  }

  if (payload.$case === "artifactUpdate") {
    const warnings: ValidationWarning[] = [];
    if (!isFilledString(value.taskId)) {
      warnings.push(
        warning("task-id", "Task id", "Artifact update is missing taskId", "payload.value.taskId"),
      );
    }
    if (!isFilledString(value.contextId)) {
      warnings.push(
        warning(
          "context-id",
          "Context id",
          "Artifact update is missing contextId",
          "payload.value.contextId",
        ),
      );
    }
    const artifact = isRecord(value.artifact) ? value.artifact : undefined;
    if (!artifact) {
      warnings.push(
        warning(
          "artifact",
          "Artifact shape",
          "Artifact update is missing artifact",
          "payload.value.artifact",
        ),
      );
      return warnings;
    }
    if (!isFilledString(artifact.artifactId)) {
      warnings.push(
        warning(
          "artifact-id",
          "Artifact id",
          "Artifact is missing artifactId",
          "payload.value.artifact.artifactId",
        ),
      );
    }
    warnings.push(...validateParts(artifact.parts, "payload.value.artifact.parts"));
    return warnings;
  }

  if (payload.$case === "message") {
    const warnings: ValidationWarning[] = [];
    if (value.role !== Role.ROLE_AGENT) {
      warnings.push(
        warning(
          "message-role",
          "Message role",
          "Incoming message should use role ROLE_AGENT",
          "payload.value.role",
        ),
      );
    }
    if (!isFilledString(value.messageId)) {
      warnings.push(
        warning(
          "message-id",
          "Message id",
          "Incoming message is missing messageId",
          "payload.value.messageId",
        ),
      );
    }
    warnings.push(...validateParts(value.parts, "payload.value.parts"));
    return warnings;
  }

  if (payload.$case === "task") {
    const warnings: ValidationWarning[] = [];
    if (!isFilledString(value.id)) {
      warnings.push(warning("task-id", "Task id", "Task is missing id", "payload.value.id"));
    }
    if (!isFilledString(value.contextId)) {
      warnings.push(
        warning("context-id", "Context id", "Task is missing contextId", "payload.value.contextId"),
      );
    }
    return warnings;
  }

  return [
    warning(
      "event-case",
      "Event payload case",
      `Unknown incoming payload case '${String(payload.$case)}'`,
      "payload.$case",
    ),
  ];
}
