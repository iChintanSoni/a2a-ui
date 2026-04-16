import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import DashboardError from "@/app/dashboard/error";
import ChatError from "@/app/dashboard/chat/[chatId]/error";

describe("route error boundaries", () => {
  it("renders the dashboard fallback and lets the user retry", async () => {
    const reset = vi.fn();

    render(<DashboardError error={new Error("boom")} reset={reset} />);

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });

  it("renders the chat fallback and lets the user retry", async () => {
    const reset = vi.fn();

    render(<ChatError error={new Error("boom")} reset={reset} />);

    expect(screen.getByRole("heading", { name: "Chat paused" })).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(reset).toHaveBeenCalledTimes(1);
  });
});
