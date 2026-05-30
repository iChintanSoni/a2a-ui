import { describe, expect, it } from "vitest";
import { maskHeaders, maskSecrets } from "@/lib/utils/debugInterceptor";

describe("debug masking", () => {
  it("masks sensitive HTTP headers", () => {
    expect(
      maskHeaders({
        Authorization: "Bearer secret",
        "X-Trace-Id": "trace-123",
        "X-Api-Key": "abc123",
      })
    ).toEqual({
      Authorization: "********",
      "X-Trace-Id": "trace-123",
      "X-Api-Key": "********",
    });
  });

  it("masks nested secret-like payload keys", () => {
    expect(
      maskSecrets({
        metadata: {
          accessToken: "token",
          safe: "value",
        },
        password: "p",
      })
    ).toEqual({
      metadata: {
        accessToken: "********",
        safe: "value",
      },
      password: "********",
    });
  });
});
