import * as React from "react";

type PossibleRef<T> = React.Ref<T> | undefined;

/** Assign a value to a ref (callback or object), returning any cleanup fn. */
function setRef<T>(ref: PossibleRef<T>, value: T): void | (() => void) {
  if (typeof ref === "function") {
    return ref(value) as void | (() => void);
  } else if (ref !== null && ref !== undefined) {
    (ref as React.MutableRefObject<T>).current = value;
  }
}

/**
 * Compose multiple refs into a single callback ref. Supports React 19 ref
 * cleanup functions: if any composed ref returns a cleanup, the composed ref
 * returns one too.
 */
export function composeRefs<T>(
  ...refs: PossibleRef<T>[]
): React.RefCallback<T> {
  return (node: T) => {
    let hasCleanup = false;
    const cleanups = refs.map((ref) => {
      const cleanup = setRef(ref, node);
      if (!hasCleanup && typeof cleanup === "function") {
        hasCleanup = true;
      }
      return cleanup;
    });

    if (hasCleanup) {
      return () => {
        for (let i = 0; i < cleanups.length; i++) {
          const cleanup = cleanups[i];
          if (typeof cleanup === "function") {
            cleanup();
          } else {
            setRef(refs[i], null as T);
          }
        }
      };
    }
  };
}
