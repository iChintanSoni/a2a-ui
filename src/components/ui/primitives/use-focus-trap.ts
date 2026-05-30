import * as React from "react";

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusable(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR),
  ).filter(
    (el) =>
      el.offsetWidth > 0 ||
      el.offsetHeight > 0 ||
      el === document.activeElement,
  );
}

/**
 * While `enabled`, keep Tab focus cycling inside `containerRef`. On open,
 * focus the `[data-autofocus]` element (or the first focusable, or the
 * container). On close, restore focus to whatever was focused before.
 */
export function useFocusTrap(
  enabled: boolean,
  containerRef: React.RefObject<HTMLElement | null>,
) {
  React.useEffect(() => {
    if (!enabled) return;
    const container = containerRef.current;
    if (!container) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;

    const autoFocusEl =
      container.querySelector<HTMLElement>("[data-autofocus]") ??
      getFocusable(container)[0] ??
      container;
    if (autoFocusEl === container && !container.hasAttribute("tabindex")) {
      container.setAttribute("tabindex", "-1");
    }
    const raf = requestAnimationFrame(() => autoFocusEl?.focus?.());

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Tab" || !container) return;
      const focusable = getFocusable(container);
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || !container.contains(active)) {
          e.preventDefault();
          last.focus();
        }
      } else if (active === last || !container.contains(active)) {
        e.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("keydown", onKeyDown, true);
      previouslyFocused?.focus?.();
    };
  }, [enabled, containerRef]);
}
