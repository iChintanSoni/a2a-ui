import * as React from "react";

export interface ListNavigationOptions {
  /** Selects the navigable items within the container (live-queried). */
  itemSelector: string;
  orientation?: "vertical" | "horizontal" | "both";
  loop?: boolean;
  /** Enable type-to-focus matching on item text content. */
  typeahead?: boolean;
}

/**
 * Returns an `onKeyDown` handler that moves DOM focus among items matching
 * `itemSelector` (ArrowUp/Down/Left/Right, Home/End, and optional typeahead).
 * Used by dropdown menus, the select listbox, and tabs. Items are re-queried on
 * every keypress so dynamic lists work without registration.
 */
export function useListNavigation(
  containerRef: React.RefObject<HTMLElement | null>,
  {
    itemSelector,
    orientation = "vertical",
    loop = true,
    typeahead = true,
  }: ListNavigationOptions,
) {
  const search = React.useRef("");
  const searchTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const getItems = React.useCallback((): HTMLElement[] => {
    const container = containerRef.current;
    if (!container) return [];
    return Array.from(
      container.querySelectorAll<HTMLElement>(itemSelector),
    ).filter((el) => el.getAttribute("aria-disabled") !== "true");
  }, [containerRef, itemSelector]);

  const focusItem = React.useCallback((item: HTMLElement | undefined) => {
    item?.focus();
  }, []);

  return React.useCallback(
    (e: React.KeyboardEvent) => {
      const items = getItems();
      if (items.length === 0) return;

      const currentIndex = items.findIndex(
        (el) => el === document.activeElement,
      );

      const nextKeys =
        orientation === "horizontal"
          ? ["ArrowRight"]
          : orientation === "both"
            ? ["ArrowDown", "ArrowRight"]
            : ["ArrowDown"];
      const prevKeys =
        orientation === "horizontal"
          ? ["ArrowLeft"]
          : orientation === "both"
            ? ["ArrowUp", "ArrowLeft"]
            : ["ArrowUp"];

      if (nextKeys.includes(e.key)) {
        e.preventDefault();
        const next = currentIndex + 1;
        focusItem(
          next >= items.length ? (loop ? items[0] : items[items.length - 1]) : items[next],
        );
      } else if (prevKeys.includes(e.key)) {
        e.preventDefault();
        const prev = currentIndex - 1;
        focusItem(prev < 0 ? (loop ? items[items.length - 1] : items[0]) : items[prev]);
      } else if (e.key === "Home") {
        e.preventDefault();
        focusItem(items[0]);
      } else if (e.key === "End") {
        e.preventDefault();
        focusItem(items[items.length - 1]);
      } else if (
        typeahead &&
        e.key.length === 1 &&
        !e.ctrlKey &&
        !e.metaKey &&
        !e.altKey
      ) {
        search.current += e.key.toLowerCase();
        if (searchTimer.current) clearTimeout(searchTimer.current);
        searchTimer.current = setTimeout(() => {
          search.current = "";
        }, 500);
        const match = items.find((el) =>
          (el.textContent ?? "").trim().toLowerCase().startsWith(search.current),
        );
        if (match) focusItem(match);
      }
    },
    [getItems, focusItem, orientation, loop, typeahead],
  );
}
