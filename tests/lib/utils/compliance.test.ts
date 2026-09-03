import { describe, it, expect } from "vitest";
import type { AgentCard } from "@a2a-js/sdk";
import { makeAgentCard, makeAgentSkill } from "../../helpers/agent-card";
import { checkCompliance } from "@/lib/utils/compliance";

const VALID_CARD: AgentCard = makeAgentCard({
  name: "Test Agent",
  description: "A test agent",
  supportedInterfaces: [
    {
      url: "https://example.com/agent",
      protocolBinding: "JSONRPC",
      tenant: "",
      protocolVersion: "1.0",
    },
  ],
  skills: [makeAgentSkill()],
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
});

function makeCard(overrides: Partial<Record<string, unknown>>): AgentCard {
  return { ...VALID_CARD, ...overrides } as AgentCard;
}

function getCheck(result: ReturnType<typeof checkCompliance>, id: string) {
  return result.checks.find(c => c.id === id)!;
}

describe("checkCompliance", () => {
  it("passes all checks for a fully valid card", () => {
    const result = checkCompliance(VALID_CARD);
    expect(result.failCount).toBe(0);
    expect(result.passCount).toBe(result.checks.length);
  });

  it("counts pass and fail correctly", () => {
    const result = checkCompliance(makeCard({ name: "" }));
    expect(result.failCount).toBeGreaterThan(0);
    expect(result.passCount + result.failCount).toBe(result.checks.length);
  });

  describe("required string fields", () => {
    it.each(["name", "description", "version"])("fails when %s is missing", field => {
      const result = checkCompliance(makeCard({ [field]: undefined }));
      expect(getCheck(result, field).pass).toBe(false);
    });

    it.each(["name", "description", "version"])("fails when %s is empty string", field => {
      const result = checkCompliance(makeCard({ [field]: "   " }));
      expect(getCheck(result, field).pass).toBe(false);
    });

    it.each(["name", "description", "version"])("passes when %s has a value", field => {
      const result = checkCompliance(VALID_CARD);
      expect(getCheck(result, field).pass).toBe(true);
    });
  });

  describe("supportedInterfaces", () => {
    it("passes for a well-formed interface list", () => {
      const result = checkCompliance(VALID_CARD);
      expect(getCheck(result, "supportedInterfaces").pass).toBe(true);
      expect(getCheck(result, "supportedInterfaces-entries").pass).toBe(true);
    });

    it("fails when no interfaces are declared", () => {
      const result = checkCompliance(makeCard({ supportedInterfaces: [] }));
      expect(getCheck(result, "supportedInterfaces").pass).toBe(false);
      expect(getCheck(result, "supportedInterfaces").message).toMatch(/Missing or empty/);
    });

    it("fails when an interface url is not absolute", () => {
      const result = checkCompliance(
        makeCard({
          supportedInterfaces: [
            { url: "not-a-url", protocolBinding: "JSONRPC", tenant: "", protocolVersion: "1.0" },
          ],
        }),
      );
      const check = getCheck(result, "supportedInterfaces-entries");
      expect(check.pass).toBe(false);
      expect(check.message).toContain("url must be an absolute URL");
    });

    it("identifies which interface entry is invalid", () => {
      const result = checkCompliance(
        makeCard({
          supportedInterfaces: [
            {
              url: "http://127.0.0.1:4000/a2a/jsonrpc",
              protocolBinding: "JSONRPC",
              tenant: "",
              protocolVersion: "1.0",
            },
            {
              url: "http://127.0.0.1:4000/a2a/rest",
              protocolBinding: "HTTP+JSON",
              tenant: "",
              protocolVersion: "1.0",
            },
            { url: "127.0.0.1:4001", protocolBinding: "GRPC", tenant: "", protocolVersion: "1.0" },
          ],
        }),
      );

      const check = getCheck(result, "supportedInterfaces-entries");
      expect(check.pass).toBe(false);
      expect(check.message).toContain("supportedInterfaces[2]");
      expect(check.message).toContain("url must be an absolute URL");
    });

    it("rejects an unsupported protocol binding", () => {
      const result = checkCompliance(
        makeCard({
          supportedInterfaces: [
            {
              url: "https://example.com/agent",
              protocolBinding: "CARRIER_PIGEON",
              tenant: "",
              protocolVersion: "1.0",
            },
          ],
        }),
      );
      expect(getCheck(result, "supportedInterfaces-entries").pass).toBe(false);
    });
  });

  describe("capabilities", () => {
    it("fails when capabilities is missing", () => {
      const result = checkCompliance(makeCard({ capabilities: undefined }));
      expect(getCheck(result, "capabilities").pass).toBe(false);
    });

    it("fails when capabilities is null", () => {
      const result = checkCompliance(makeCard({ capabilities: null }));
      expect(getCheck(result, "capabilities").pass).toBe(false);
    });

    it("passes for an empty capabilities object", () => {
      const result = checkCompliance(makeCard({ capabilities: {} }));
      expect(getCheck(result, "capabilities").pass).toBe(true);
    });
  });

  describe("skills", () => {
    it("fails skills-present when skills field is missing", () => {
      const result = checkCompliance(makeCard({ skills: undefined }));
      expect(getCheck(result, "skills-present").pass).toBe(false);
    });

    it("passes skills-present but fails skills-non-empty for empty array", () => {
      const result = checkCompliance(makeCard({ skills: [] }));
      expect(getCheck(result, "skills-present").pass).toBe(true);
      expect(getCheck(result, "skills-non-empty").pass).toBe(false);
    });

    it("fails skills-fields when a skill is missing its id", () => {
      const badSkills = [{ name: "Skill", description: "desc", tags: [] }];
      const result = checkCompliance(makeCard({ skills: badSkills }));
      expect(getCheck(result, "skills-fields").pass).toBe(false);
    });

    it("fails skills-fields when a skill is missing its description", () => {
      const badSkills = [{ id: "s1", name: "Skill", tags: [] }];
      const result = checkCompliance(makeCard({ skills: badSkills }));
      expect(getCheck(result, "skills-fields").pass).toBe(false);
    });

    it("passes skills-fields for valid skills", () => {
      const result = checkCompliance(VALID_CARD);
      expect(getCheck(result, "skills-fields").pass).toBe(true);
    });

    it("includes skill count in skills-non-empty message", () => {
      const result = checkCompliance(VALID_CARD);
      expect(getCheck(result, "skills-non-empty").message).toContain("1");
    });
  });

  describe("defaultInputModes / defaultOutputModes", () => {
    it("fails defaultInputModes when missing", () => {
      const result = checkCompliance(makeCard({ defaultInputModes: undefined }));
      expect(getCheck(result, "defaultInputModes").pass).toBe(false);
    });

    it("fails defaultInputModes when empty array", () => {
      const result = checkCompliance(makeCard({ defaultInputModes: [] }));
      expect(getCheck(result, "defaultInputModes").pass).toBe(false);
    });

    it("fails defaultOutputModes when missing", () => {
      const result = checkCompliance(makeCard({ defaultOutputModes: undefined }));
      expect(getCheck(result, "defaultOutputModes").pass).toBe(false);
    });

    it("passes both when non-empty", () => {
      const result = checkCompliance(VALID_CARD);
      expect(getCheck(result, "defaultInputModes").pass).toBe(true);
      expect(getCheck(result, "defaultOutputModes").pass).toBe(true);
    });

    it("flags snake_case-only mode fields instead of normalizing them", () => {
      const result = checkCompliance({
        ...VALID_CARD,
        defaultInputModes: undefined,
        defaultOutputModes: undefined,
        default_input_modes: ["text"],
        default_output_modes: ["text"],
      } as unknown as AgentCard);
      expect(getCheck(result, "defaultInputModes").pass).toBe(false);
      expect(getCheck(result, "defaultOutputModes").pass).toBe(false);
    });
  });

  describe("expanded protocol checks", () => {
    it("fails when no interface speaks a supported protocol major version", () => {
      const result = checkCompliance(
        makeCard({
          supportedInterfaces: [
            {
              url: "https://example.com/agent",
              protocolBinding: "JSONRPC",
              tenant: "",
              protocolVersion: "0.3",
            },
          ],
        }),
      );
      expect(getCheck(result, "protocolVersion-compatible").pass).toBe(false);
      expect(getCheck(result, "protocolVersion-compatible").message).toContain("0.3");
    });

    it("passes when at least one interface speaks a supported version", () => {
      const result = checkCompliance(
        makeCard({
          supportedInterfaces: [
            {
              url: "https://example.com/legacy",
              protocolBinding: "JSONRPC",
              tenant: "",
              protocolVersion: "0.3",
            },
            {
              url: "https://example.com/agent",
              protocolBinding: "JSONRPC",
              tenant: "",
              protocolVersion: "1.0",
            },
          ],
        }),
      );
      expect(getCheck(result, "protocolVersion-compatible").pass).toBe(true);
    });

    it("fails when skill modes are outside defaults", () => {
      const result = checkCompliance(
        makeCard({
          defaultInputModes: ["text/plain"],
          skills: [
            {
              id: "s1",
              name: "Skill One",
              description: "Does stuff",
              tags: [],
              inputModes: ["image/png"],
            },
          ],
        }),
      );
      expect(getCheck(result, "skills-inputModes").pass).toBe(false);
    });

    it("warns when security references an undeclared scheme", () => {
      const result = checkCompliance(
        makeCard({
          securityRequirements: [{ schemes: { bearer: { list: [] } } }],
          securitySchemes: {},
        }),
      );
      expect(getCheck(result, "security-references").pass).toBe(false);
      expect(result.warningCount).toBeGreaterThan(0);
    });
  });
});
