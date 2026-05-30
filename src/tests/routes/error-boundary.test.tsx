import { render, screen } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import RouteErrorBoundary from "@/routes/error-boundary";

function Boom(): never {
  throw new Error("boom");
}

describe("route error boundary", () => {
  it("renders the fallback when a route throws", () => {
    // Silence the expected error-boundary console noise.
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    const router = createMemoryRouter([
      { path: "/", element: <Boom />, errorElement: <RouteErrorBoundary /> },
    ]);

    render(<RouterProvider router={router} />);

    expect(screen.getByRole("heading", { name: "Something went wrong" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();

    spy.mockRestore();
  });
});
