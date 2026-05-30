import * as React from "react";

// Global stack of open dismissable layers; only the topmost reacts to a single
// Escape / outside-pointer event so nested overlays close top-first.
const dismissStack: symbol[] = [];

export interface DismissRefs {
  floating: React.RefObject<HTMLElement | null>;
  /** The trigger; clicks on it are ignored so it can toggle without re-firing. */
  reference?: React.RefObject<HTMLElement | null>;
}

/**
 * Dismiss a layer on outside pointerdown or Escape. Uses a shared stack so that
 * with stacked overlays, one event only closes the topmost layer.
 */
export function useDismiss(
  enabled: boolean,
  onDismiss: () => void,
  refs: DismissRefs,
) {
  const onDismissRef = React.useRef(onDismiss);
  React.useEffect(() => {
    onDismissRef.current = onDismiss;
  });

  const { floating, reference } = refs;

  React.useEffect(() => {
    if (!enabled) return;
    const id = Symbol("dismiss");
    dismissStack.push(id);

    const isTopmost = () => dismissStack[dismissStack.length - 1] === id;

    function onPointerDown(e: PointerEvent) {
      if (!isTopmost()) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (floating.current?.contains(target)) return;
      if (reference?.current?.contains(target)) return;
      onDismissRef.current();
    }

    function onKeyDown(e: KeyboardEvent) {
      if (e.key !== "Escape" || !isTopmost()) return;
      e.stopPropagation();
      onDismissRef.current();
    }

    document.addEventListener("pointerdown", onPointerDown, true);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      const idx = dismissStack.indexOf(id);
      if (idx >= 0) dismissStack.splice(idx, 1);
      document.removeEventListener("pointerdown", onPointerDown, true);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [enabled, floating, reference]);
}
