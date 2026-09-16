import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useA2ADebug } from "@/hooks/use-a2a-debug";

describe("useA2ADebug", () => {
  it("starts with empty logs and validation warnings", () => {
    const { result } = renderHook(() => useA2ADebug());
    expect(result.current.logs).toEqual([]);
    expect(result.current.validationWarnings).toEqual([]);
    expect(result.current.interceptors).toHaveLength(1);
  });

  it("appends log entries", () => {
    const { result } = renderHook(() => useA2ADebug());

    act(() => {
      result.current.appendLogEntry({
        type: "request",
        method: "tasks/send",
        payload: { text: "hi" },
      });
    });

    expect(result.current.logs).toHaveLength(1);
    expect(result.current.logs[0].method).toBe("tasks/send");
    expect(result.current.logs[0].type).toBe("request");
  });

  it("records validation warnings and error logs", () => {
    const { result } = renderHook(() => useA2ADebug());

    act(() => {
      result.current.recordValidation("card", [
        {
          id: "card-url",
          label: "Card URL valid",
          message: "URL mismatch",
        },
      ]);
      result.current.recordError("stream", new Error("network disconnect"));
    });

    expect(result.current.validationWarnings).toHaveLength(1);
    expect(result.current.validationWarnings[0].id).toBe("card-url");

    expect(result.current.logs).toHaveLength(2);
    expect(result.current.logs[0].type).toBe("validation");
    expect(result.current.logs[1].type).toBe("error");
    expect(result.current.logs[1].payload).toEqual({ message: "network disconnect" });
  });

  it("clears logs and warnings", () => {
    const { result } = renderHook(() => useA2ADebug());

    act(() => {
      result.current.appendLogEntry({
        type: "response",
        method: "card",
        payload: {},
      });
      result.current.clearLogs();
    });

    expect(result.current.logs).toEqual([]);
    expect(result.current.validationWarnings).toEqual([]);
  });
});
