import { describe, it, expect } from "vitest";
import { checkCompliance } from "@/lib/utils/compliance";
import type { AgentCard } from "@/lib/features/agents/agentsSlice";

const VALID_CARD: AgentCard = {
  name: "Test Agent",
  description: "A test agent",
  url: "https://example.com/agent",
  version: "1.0.0",
  protocolVersion: "0.1",
  capabilities: { streaming: true },
  skills: [{ id: "s1", name: "Skill One", description: "Does stuff", tags: [] }],
  defaultInputModes: ["text"],
  defaultOutputModes: ["text"],
};

function makeCard(overrides: Partial<Record<string, unknown>>): AgentCard {
  return { ...VALID_CARD, ...overrides } as AgentCard;
}

function getCheck(result: ReturnType<typeof checkCompliance>, id: string) {
  return result.checks.find((c) => c.id === id)!;
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
    it.each(["name", "description", "version", "protocolVersion"])(
      "fails when %s is missing",
      (field) => {
        const result = checkCompliance(makeCard({ [field]: undefined }));
        expect(getCheck(result, field).pass).toBe(false);
      }
    );

    it.each(["name", "description", "version", "protocolVersion"])(
      "fails when %s is empty string",
      (field) => {
        const result = checkCompliance(makeCard({ [field]: "   " }));
        expect(getCheck(result, field).pass).toBe(false);
      }
    );

    it.each(["name", "description", "version", "protocolVersion"])(
      "passes when %s has a value",
      (field) => {
        const result = checkCompliance(VALID_CARD);
        expect(getCheck(result, field).pass).toBe(true);
      }
    );
  });

  describe("url", () => {
    it("passes for a valid https URL", () => {
      const result = checkCompliance(VALID_CARD);
      expect(getCheck(result, "url").pass).toBe(true);
    });

    it("fails for a missing URL", () => {
      const result = checkCompliance(makeCard({ url: undefined }));
      expect(getCheck(result, "url").pass).toBe(false);
      expect(getCheck(result, "url").message).toMatch(/Missing/);
    });

    it("fails for an invalid URL string", () => {
      const result = checkCompliance(makeCard({ url: "not-a-url" }));
      expect(getCheck(result, "url").pass).toBe(false);
      expect(getCheck(result, "url").message).toMatch(/Invalid URL/);
    });

    it("includes the URL value in the pass message", () => {
      const result = checkCompliance(VALID_CARD);
      expect(getCheck(result, "url").message).toContain("example.com");
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
  });

  describe("expanded protocol checks", () => {
    it("fails incompatible protocol major versions", () => {
      const result = checkCompliance(makeCard({ protocolVersion: "2.0" }));
      expect(getCheck(result, "protocolVersion-compatible").pass).toBe(false);
    });

    it("validates additionalInterfaces transport and URL pairs", () => {
      const result = checkCompliance(
        makeCard({
          additionalInterfaces: [{ url: "not-a-url", transport: "JSONRPC" }],
        })
      );
      expect(getCheck(result, "additionalInterfaces").pass).toBe(false);
      expect(getCheck(result, "additionalInterfaces").severity).toBe("warning");
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
        })
      );
      expect(getCheck(result, "skills-inputModes").pass).toBe(false);
    });

    it("warns when security references an undeclared scheme", () => {
      const result = checkCompliance(
        makeCard({
          security: [{ bearer: [] }],
          securitySchemes: {},
        })
      );
      expect(getCheck(result, "security-references").pass).toBe(false);
      expect(result.warningCount).toBeGreaterThan(0);
    });
  });
});
