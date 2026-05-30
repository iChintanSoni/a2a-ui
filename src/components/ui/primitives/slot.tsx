import * as React from "react";

import { composeRefs } from "./compose-refs";
import { mergeProps } from "./merge-props";

export interface SlotProps extends React.HTMLAttributes<HTMLElement> {
  children?: React.ReactNode;
}

/** React 19 exposes a forwarded element's ref via props. */
function getElementRef(element: React.ReactElement): React.Ref<unknown> | undefined {
  return (element.props as { ref?: React.Ref<unknown> }).ref;
}

/**
 * Hand-built replacement for Radix's `Slot`. Merges the props passed to `Slot`
 * onto its single child element (the `asChild` pattern), chaining event
 * handlers and composing refs. Used by every primitive that supports `asChild`.
 */
export const Slot = React.forwardRef<HTMLElement, SlotProps>(function Slot(
  { children, ...slotProps },
  forwardedRef,
) {
  if (!React.isValidElement(children)) {
    return null;
  }

  const childProps = children.props as Record<string, unknown>;
  const merged = mergeProps(
    slotProps as Record<string, unknown>,
    childProps,
  );

  if (children.type !== React.Fragment) {
    const childRef = getElementRef(children);
    merged.ref = forwardedRef
      ? composeRefs(forwardedRef, childRef as React.Ref<HTMLElement>)
      : childRef;
  }

  return React.cloneElement(children, merged);
});
