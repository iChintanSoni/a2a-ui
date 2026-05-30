import * as React from "react";

export interface UseControllableStateParams<T> {
  /** The controlled value (when provided, the component is controlled). */
  prop?: T;
  /** The initial value when uncontrolled. */
  defaultProp?: T;
  /** Called whenever the value changes (controlled or not). */
  onChange?: (value: T) => void;
}

/**
 * Supports both controlled and uncontrolled usage from a single API, the way
 * Radix primitives did. Returns `[value, setValue]` where `setValue` accepts a
 * value or updater and fires `onChange` only on real changes.
 */
export function useControllableState<T>({
  prop,
  defaultProp,
  onChange,
}: UseControllableStateParams<T>): [
  T | undefined,
  (next: T | ((prev: T | undefined) => T)) => void,
] {
  const [uncontrolled, setUncontrolled] = React.useState<T | undefined>(
    defaultProp,
  );
  const isControlled = prop !== undefined;
  const value = isControlled ? prop : uncontrolled;

  const onChangeRef = React.useRef(onChange);
  React.useEffect(() => {
    onChangeRef.current = onChange;
  });

  const setValue = React.useCallback(
    (next: T | ((prev: T | undefined) => T)) => {
      if (isControlled) {
        const resolved =
          typeof next === "function"
            ? (next as (prev: T | undefined) => T)(prop)
            : next;
        if (resolved !== prop) onChangeRef.current?.(resolved);
      } else {
        setUncontrolled((prev) => {
          const resolved =
            typeof next === "function"
              ? (next as (prev: T | undefined) => T)(prev)
              : next;
          if (resolved !== prev) onChangeRef.current?.(resolved);
          return resolved;
        });
      }
    },
    [isControlled, prop],
  );

  return [value, setValue];
}
