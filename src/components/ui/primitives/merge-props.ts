import { cn } from "@/lib/utils";

type AnyProps = Record<string, unknown>;

/**
 * Merge a Slot's props onto its child element's props:
 * - event handlers (`on*`) are chained (child handler first, then slot)
 * - `className` is merged with `cn` (tailwind-aware)
 * - `style` objects are shallow-merged (child wins)
 * - everything else: slot props win, child props fill gaps
 */
export function mergeProps(slotProps: AnyProps, childProps: AnyProps): AnyProps {
  const overrideProps: AnyProps = { ...childProps };

  for (const propName in childProps) {
    const slotPropValue = slotProps[propName];
    const childPropValue = childProps[propName];

    const isHandler = /^on[A-Z]/.test(propName);
    if (isHandler) {
      if (
        typeof slotPropValue === "function" &&
        typeof childPropValue === "function"
      ) {
        overrideProps[propName] = (...args: unknown[]) => {
          (childPropValue as (...a: unknown[]) => unknown)(...args);
          (slotPropValue as (...a: unknown[]) => unknown)(...args);
        };
      } else if (slotPropValue) {
        overrideProps[propName] = slotPropValue;
      }
    } else if (propName === "style") {
      overrideProps[propName] = {
        ...(slotPropValue as object),
        ...(childPropValue as object),
      };
    } else if (propName === "className") {
      overrideProps[propName] = cn(
        slotPropValue as string,
        childPropValue as string,
      );
    }
  }

  return { ...slotProps, ...overrideProps };
}
