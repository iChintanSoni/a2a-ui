import type { AgentCard } from "@/lib/features/agents/agentsSlice";

export interface ComplianceCheck {
  id: string;
  label: string;
  pass: boolean;
  message: string;
}

export interface ComplianceResult {
  checks: ComplianceCheck[];
  passCount: number;
  failCount: number;
}

function isNonEmptyString(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

export function checkCompliance(card: AgentCard): ComplianceResult {
  const raw = card as unknown as Record<string, unknown>;
  const checks: ComplianceCheck[] = [];

  const check = (
    id: string,
    label: string,
    pass: boolean,
    failMsg: string,
    passMsg = "OK"
  ) => checks.push({ id, label, pass, message: pass ? passMsg : failMsg });

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
  const hasInputModes = Array.isArray(inputModes) && inputModes.length > 0;
  check(
    "defaultInputModes",
    "defaultInputModes is non-empty",
    hasInputModes,
    "Missing or empty 'defaultInputModes'",
    `[${(inputModes ?? []).join(", ")}]`
  );

  // defaultOutputModes — required, non-empty
  const outputModes = raw.defaultOutputModes as string[] | undefined;
  const hasOutputModes = Array.isArray(outputModes) && outputModes.length > 0;
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
  }

  const passCount = checks.filter((c) => c.pass).length;
  const failCount = checks.filter((c) => !c.pass).length;
  return { checks, passCount, failCount };
}
