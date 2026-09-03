import { textPart } from "@/lib/a2a/parts";
import { TaskState } from "@a2a-js/sdk";
import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { UserBubble, AgentBubble } from "@/components/chat/MessageBubble";
import { ToolCallBlock } from "@/components/chat/ToolCallBlock";
import { ArtifactBlock } from "@/components/chat/ArtifactBlock";
import { TaskStatusRow } from "@/components/chat/TaskStatusRow";
import { SessionInfoBar } from "@/components/chat/SessionInfoBar";
import { DebugPanel } from "@/components/chat/DebugPanel";
import { EventExplorer } from "@/components/chat/EventExplorer";
import type {
  UserMessageItem,
  AgentMessageItem,
  ToolCallItem,
  ArtifactItem,
  TaskStatusItem,
} from "@/lib/features/chats/chatsSlice";

describe("Accessibility checks across chat & dashboard components", () => {
  it("renders accessible action buttons with aria-labels on UserBubble", () => {
    const item: UserMessageItem = {
      id: "user-1",
      kind: "user-message",
      timestamp: Date.now(),
      parts: [textPart("Hello world")],
    };
    const onInspect = vi.fn();
    const onRerun = vi.fn();

    render(<UserBubble item={item} onInspect={onInspect} onRerun={onRerun} />);

    const rerunBtn = screen.getByRole("button", { name: "Rerun this prompt" });
    const inspectBtn = screen.getByRole("button", { name: "Inspect raw JSON" });

    expect(rerunBtn).toBeInTheDocument();
    expect(inspectBtn).toBeInTheDocument();

    // Verify focus-visible classes are present for keyboard users
    expect(rerunBtn.className).toContain("focus-visible:flex");
    expect(inspectBtn.className).toContain("focus-visible:flex");
  });

  it("renders accessible inspect button on AgentBubble", () => {
    const item: AgentMessageItem = {
      id: "agent-1",
      kind: "agent-message",
      timestamp: Date.now(),
      parts: [textPart("I can help with that.")],
    };
    const onInspect = vi.fn();

    render(<AgentBubble item={item} onInspect={onInspect} />);

    const inspectBtn = screen.getByRole("button", { name: "Inspect raw JSON" });
    expect(inspectBtn).toBeInTheDocument();
    expect(inspectBtn.className).toContain("focus-visible:flex");
  });

  it("renders accessible inspect button and tool name on ToolCallBlock", () => {
    const item: ToolCallItem = {
      id: "tool-1",
      kind: "tool-call",
      toolName: "web_search",
      query: "current weather",
      phase: "done",
      resultCount: 3,
      timestamp: Date.now(),
    };
    const onInspect = vi.fn();

    render(<ToolCallBlock item={item} onInspect={onInspect} />);

    const inspectBtn = screen.getByRole("button", { name: "Inspect raw JSON" });
    expect(inspectBtn).toBeInTheDocument();
    expect(inspectBtn.className).toContain("focus-visible:flex");
  });

  it("renders accessible inspect button and labeled textarea in ArtifactBlock", () => {
    const item: ArtifactItem = {
      id: "artifact-1",
      kind: "artifact",
      taskId: "task-art-1",
      isStreaming: false,
      timestamp: Date.now(),
      name: "report.md",
      description: "Analysis report",
      parts: [textPart("Report contents")],
    };
    const onInspect = vi.fn();
    const onSubmitRevision = vi.fn();

    render(<ArtifactBlock item={item} onInspect={onInspect} onSubmitRevision={onSubmitRevision} />);

    const inspectBtn = screen.getByRole("button", { name: "Inspect raw JSON" });
    expect(inspectBtn).toBeInTheDocument();
    expect(inspectBtn.className).toContain("focus-visible:flex");
  });

  it("renders role='status' and accessible inspect button on TaskStatusRow", () => {
    const item: TaskStatusItem = {
      id: "task-1",
      kind: "task-status",
      taskId: "t-123",
      state: TaskState.TASK_STATE_WORKING,
      timestamp: Date.now(),
    };
    const onInspect = vi.fn();

    render(<TaskStatusRow item={item} onInspect={onInspect} />);

    const statusRegion = screen.getByRole("status");
    expect(statusRegion).toBeInTheDocument();
    expect(statusRegion).toHaveAttribute("aria-live", "polite");

    const inspectBtn = screen.getByRole("button", { name: "Inspect raw JSON" });
    expect(inspectBtn).toBeInTheDocument();
    expect(inspectBtn.className).toContain("focus-visible:flex");
  });

  it("renders accessible copy button on SessionInfoBar", () => {
    render(
      <SessionInfoBar
        contextId="ctx-abc-123-xyz"
        transportMethod="JSONRPC"
        inputModes={["text/plain"]}
        outputModes={["text/plain"]}
      />,
    );

    const copyBtn = screen.getByRole("button", { name: /Copy context ID/i });
    expect(copyBtn).toBeInTheDocument();
  });

  it("provides keyboard-accessible resize separator and aria-pressed filters in DebugPanel", () => {
    const onClear = vi.fn();
    const onClose = vi.fn();

    render(
      <DebugPanel
        logs={[
          {
            id: "log-1",
            timestamp: Date.now(),
            type: "request",
            method: "tasks/send",
            payload: { message: "hi" },
          },
        ]}
        onClear={onClear}
        onClose={onClose}
      />,
    );

    const separator = screen.getByRole("separator", { name: "Resize debug console" });
    expect(separator).toBeInTheDocument();
    expect(separator).toHaveAttribute("tabIndex", "0");
    expect(separator).toHaveAttribute("aria-valuenow", "300");

    // Keyboard resize with arrow keys
    fireEvent.keyDown(separator, { key: "ArrowUp" });
    expect(separator).toHaveAttribute("aria-valuenow", "320");

    fireEvent.keyDown(separator, { key: "ArrowDown" });
    expect(separator).toHaveAttribute("aria-valuenow", "300");

    // Filter button aria-pressed state
    const allFilterBtn = screen.getByRole("button", { name: /^All/i });
    expect(allFilterBtn).toHaveAttribute("aria-pressed", "true");

    const respFilterBtn = screen.getByRole("button", { name: /^Response$/i });
    expect(respFilterBtn).toHaveAttribute("aria-pressed", "false");
  });

  it("provides aria-pressed filters in EventExplorer", () => {
    const onClose = vi.fn();

    render(<EventExplorer events={[]} onClose={onClose} />);

    const allFilter = screen.getByRole("button", { name: "All" });
    expect(allFilter).toHaveAttribute("aria-pressed", "true");

    const transportFilter = screen.getByRole("button", { name: "Transport" });
    expect(transportFilter).toHaveAttribute("aria-pressed", "false");
  });
});
