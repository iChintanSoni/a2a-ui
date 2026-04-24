import { describe, it, expect } from "vitest";
import { buildRequestHeaders } from "@/lib/utils/auth";
import { A2UI_EXTENSION_HEADER, A2UI_EXTENSION_VALUE } from "@/lib/a2a/a2ui";
import type { AuthConfig, CustomHeader } from "@/lib/features/agents/agentsSlice";

const NO_HEADERS: CustomHeader[] = [];

describe("buildRequestHeaders", () => {
  describe("auth type: none", () => {
    it("returns empty headers", () => {
      const result = buildRequestHeaders({ type: "none" }, NO_HEADERS);
      expect(result).toEqual({});
    });
  });

  describe("auth type: bearer", () => {
    it("sets Authorization: Bearer <token>", () => {
      const auth: AuthConfig = { type: "bearer", bearerToken: "my-token" };
      expect(buildRequestHeaders(auth, NO_HEADERS)).toEqual({
        Authorization: "Bearer my-token",
      });
    });

    it("omits Authorization when bearerToken is empty string", () => {
      const auth: AuthConfig = { type: "bearer", bearerToken: "" };
      expect(buildRequestHeaders(auth, NO_HEADERS)).toEqual({});
    });

    it("omits Authorization when bearerToken is undefined", () => {
      const auth: AuthConfig = { type: "bearer" };
      expect(buildRequestHeaders(auth, NO_HEADERS)).toEqual({});
    });
  });

  describe("auth type: api-key", () => {
    it("sets the custom header name to the api key value", () => {
      const auth: AuthConfig = {
        type: "api-key",
        apiKeyHeader: "X-API-Key",
        apiKeyValue: "secret",
      };
      expect(buildRequestHeaders(auth, NO_HEADERS)).toEqual({
        "X-API-Key": "secret",
      });
    });

    it("omits the header when apiKeyHeader is missing", () => {
      const auth: AuthConfig = { type: "api-key", apiKeyValue: "secret" };
      expect(buildRequestHeaders(auth, NO_HEADERS)).toEqual({});
    });

    it("omits the header when apiKeyValue is missing", () => {
      const auth: AuthConfig = { type: "api-key", apiKeyHeader: "X-API-Key" };
      expect(buildRequestHeaders(auth, NO_HEADERS)).toEqual({});
    });
  });

  describe("auth type: basic", () => {
    it("sets Authorization: Basic <base64(user:pass)>", () => {
      const auth: AuthConfig = {
        type: "basic",
        basicUsername: "user",
        basicPassword: "pass",
      };
      const expected = btoa("user:pass");
      expect(buildRequestHeaders(auth, NO_HEADERS)).toEqual({
        Authorization: `Basic ${expected}`,
      });
    });

    it("encodes with empty password when only username provided", () => {
      const auth: AuthConfig = { type: "basic", basicUsername: "user" };
      const expected = btoa("user:");
      expect(buildRequestHeaders(auth, NO_HEADERS)).toEqual({
        Authorization: `Basic ${expected}`,
      });
    });

    it("encodes with empty username when only password provided", () => {
      const auth: AuthConfig = { type: "basic", basicPassword: "pass" };
      const expected = btoa(":pass");
      expect(buildRequestHeaders(auth, NO_HEADERS)).toEqual({
        Authorization: `Basic ${expected}`,
      });
    });

    it("omits Authorization when both username and password are undefined", () => {
      const auth: AuthConfig = { type: "basic" };
      expect(buildRequestHeaders(auth, NO_HEADERS)).toEqual({});
    });
  });

  describe("custom headers", () => {
    it("merges custom headers with auth headers", () => {
      const auth: AuthConfig = { type: "bearer", bearerToken: "tok" };
      const custom: CustomHeader[] = [{ key: "X-Custom", value: "foo" }];
      const result = buildRequestHeaders(auth, custom);
      expect(result["Authorization"]).toBe("Bearer tok");
      expect(result["X-Custom"]).toBe("foo");
    });

    it("adds custom headers when auth is none", () => {
      const custom: CustomHeader[] = [{ key: "X-Tenant", value: "acme" }];
      expect(buildRequestHeaders({ type: "none" }, custom)).toEqual({
        "X-Tenant": "acme",
      });
    });

    it("skips custom headers whose key is blank or whitespace", () => {
      const custom: CustomHeader[] = [
        { key: "  ", value: "should-be-ignored" },
        { key: "X-Keep", value: "yes" },
      ];
      const result = buildRequestHeaders({ type: "none" }, custom);
      expect(result).toEqual({ "X-Keep": "yes" });
    });

    it("trims whitespace from header key", () => {
      const custom: CustomHeader[] = [{ key: "  X-Trim  ", value: "val" }];
      const result = buildRequestHeaders({ type: "none" }, custom);
      expect(result["X-Trim"]).toBe("val");
      expect(result["  X-Trim  "]).toBeUndefined();
    });

    it("custom header overrides auth header with the same name", () => {
      const auth: AuthConfig = { type: "bearer", bearerToken: "original" };
      const custom: CustomHeader[] = [{ key: "Authorization", value: "Custom override" }];
      const result = buildRequestHeaders(auth, custom);
      expect(result["Authorization"]).toBe("Custom override");
    });

    it("adds the A2UI extension header when enabled", () => {
      const result = buildRequestHeaders({ type: "none" }, [], {
        a2uiEnabled: true,
      });
      expect(result[A2UI_EXTENSION_HEADER]).toBe(A2UI_EXTENSION_VALUE);
    });

    it("does not override a custom A2UI extension header", () => {
      const result = buildRequestHeaders(
        { type: "none" },
        [{ key: A2UI_EXTENSION_HEADER, value: "custom-extension" }],
        { a2uiEnabled: true },
      );
      expect(result[A2UI_EXTENSION_HEADER]).toBe("custom-extension");
    });
  });
});
