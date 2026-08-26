import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Provider } from "react-redux";
import { makeStore } from "@/lib/store";
import { ToastProvider } from "@/lib/toast";
import { PresetGalleryModal } from "@/components/preset-gallery-modal";

function renderWithStore(ui: React.ReactElement, initialStore = makeStore()) {
  return {
    ...render(
      <Provider store={initialStore}>
        <ToastProvider>{ui}</ToastProvider>
      </Provider>,
    ),
    store: initialStore,
  };
}

describe("PresetGalleryModal", () => {
  it("renders the modal and lists curated example agents when open", () => {
    renderWithStore(<PresetGalleryModal open={true} onOpenChange={() => {}} />);

    expect(screen.getByText("Example Agent Gallery")).toBeInTheDocument();
    expect(screen.getByText("Local Demo Agent")).toBeInTheDocument();
    expect(screen.getByText("Weather Scout Agent")).toBeInTheDocument();
    expect(screen.getByText("Deep Research Agent")).toBeInTheDocument();
    expect(screen.getByText("Support Concierge Agent")).toBeInTheDocument();
  });

  it("filters presets using search input", () => {
    renderWithStore(<PresetGalleryModal open={true} onOpenChange={() => {}} />);

    const searchInput = screen.getByLabelText("Search example agents, skills, or tags");
    fireEvent.change(searchInput, { target: { value: "weather" } });

    expect(screen.getByText("Weather Scout Agent")).toBeInTheDocument();
    expect(screen.queryByText("Deep Research Agent")).not.toBeInTheDocument();
    expect(screen.queryByText("Support Concierge Agent")).not.toBeInTheDocument();
  });

  it("filters presets using category buttons", () => {
    renderWithStore(<PresetGalleryModal open={true} onOpenChange={() => {}} />);

    const researchButton = screen.getByRole("button", { name: /^Research$/i });
    fireEvent.click(researchButton);

    expect(screen.getByText("Deep Research Agent")).toBeInTheDocument();
    expect(screen.queryByText("Weather Scout Agent")).not.toBeInTheDocument();
    expect(screen.queryByText("Local Demo Agent")).not.toBeInTheDocument();
  });

  it("imports a preset into the Redux store when Import Preset is clicked", () => {
    const store = makeStore();
    renderWithStore(<PresetGalleryModal open={true} onOpenChange={() => {}} />, store);

    expect(store.getState().agents.agents).toHaveLength(0);

    const importButtons = screen.getAllByRole("button", { name: /Import Preset/i });
    fireEvent.click(importButtons[0]);

    const agents = store.getState().agents.agents;
    expect(agents.length).toBe(1);
    expect(agents[0].displayName).toBe("Local Demo Agent");

    // Also check that sample chats were imported
    const chats = store.getState().chats.chats;
    expect(chats.length).toBeGreaterThanOrEqual(1);
    expect(chats[0].agentName).toBe("Local Demo Agent");
  });

  it("imports all example presets when Import All Examples is clicked", () => {
    const store = makeStore();
    renderWithStore(<PresetGalleryModal open={true} onOpenChange={() => {}} />, store);

    expect(store.getState().agents.agents).toHaveLength(0);

    const importAllBtn = screen.getByRole("button", { name: /Import All Examples/i });
    fireEvent.click(importAllBtn);

    const agents = store.getState().agents.agents;
    expect(agents.length).toBe(4);
  });
});
