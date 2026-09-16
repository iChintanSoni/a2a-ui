import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useA2ASession } from "@/hooks/use-a2a-session";

describe("useA2ASession", () => {
  it("initializes with a default or provided contextId", () => {
    const { result: r1 } = renderHook(() => useA2ASession({ defaultContextId: "initial-ctx" }));
    expect(r1.current.contextId).toBe("initial-ctx");
    expect(r1.current.isStreaming).toBe(false);

    const { result: r2 } = renderHook(() => useA2ASession());
    expect(r2.current.contextId).toBeDefined();
    expect(typeof r2.current.contextId).toBe("string");
  });

  it("manages streaming lifecycle", () => {
    const { result } = renderHook(() => useA2ASession());

    act(() => {
      result.current.beginStream();
      result.current.setActiveTaskId("task-999");
    });

    expect(result.current.isStreaming).toBe(true);
    expect(result.current.activeTaskId).toBe("task-999");
    expect(result.current.abortRef.current).not.toBeNull();

    act(() => {
      result.current.finishStream();
    });

    expect(result.current.isStreaming).toBe(false);
    expect(result.current.activeTaskId).toBeNull();
    expect(result.current.abortRef.current).toBeNull();
  });

  it("aborts active stream on cancelLocally", () => {
    const { result } = renderHook(() => useA2ASession());

    act(() => {
      result.current.beginStream();
    });

    const abortController = result.current.abortRef.current;
    expect(abortController?.signal.aborted).toBe(false);

    act(() => {
      result.current.cancelLocally();
    });

    expect(result.current.isStreaming).toBe(false);
    expect(abortController?.signal.aborted).toBe(true);
  });

  it("starts a new session and invokes callback when controlled", () => {
    const onNewSession = vi.fn();
    const { result, rerender } = renderHook(
      ({ ctx }) => useA2ASession({ contextId: ctx, onNewSession }),
      { initialProps: { ctx: "ctx-1" } },
    );

    expect(result.current.contextId).toBe("ctx-1");

    act(() => {
      result.current.newSession();
    });

    expect(onNewSession).toHaveBeenCalledTimes(1);
    const newId = onNewSession.mock.calls[0][0];
    expect(newId).not.toBe("ctx-1");

    rerender({ ctx: newId });
    expect(result.current.contextId).toBe(newId);
  });
});
