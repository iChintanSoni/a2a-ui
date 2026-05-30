import * as React from "react";

import { cn } from "@/lib/utils";
import { Slot } from "@/components/ui/primitives/slot";
import { Portal } from "@/components/ui/primitives/portal";
import { composeRefs } from "@/components/ui/primitives/compose-refs";
import { useControllableState } from "@/components/ui/primitives/use-controllable-state";
import {
  useFloating,
  type Side,
  type Align,
  type Placement,
} from "@/components/ui/primitives/floating";

interface TooltipProviderValue {
  delayDuration: number;
}

const TooltipProviderContext = React.createContext<TooltipProviderValue>({
  delayDuration: 0,
});

function TooltipProvider({
  delayDuration = 0,
  children,
}: {
  delayDuration?: number;
  skipDelayDuration?: number;
  disableHoverableContent?: boolean;
  children?: React.ReactNode;
}) {
  const value = React.useMemo(() => ({ delayDuration }), [delayDuration]);
  return (
    <TooltipProviderContext.Provider value={value}>
      {children}
    </TooltipProviderContext.Provider>
  );
}

interface TooltipContextValue {
  open: boolean;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentId: string;
  show: () => void;
  showImmediate: () => void;
  hide: () => void;
}

const TooltipContext = React.createContext<TooltipContextValue | null>(null);

function useTooltip() {
  const ctx = React.useContext(TooltipContext);
  if (!ctx) throw new Error("Tooltip parts must be used within <Tooltip>");
  return ctx;
}

function Tooltip({
  open: openProp,
  defaultOpen,
  onOpenChange,
  delayDuration,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  delayDuration?: number;
  children?: React.ReactNode;
}) {
  const provider = React.useContext(TooltipProviderContext);
  const delay = delayDuration ?? provider.delayDuration;
  const [open = false, setOpen] = useControllableState<boolean>({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentId = React.useId();
  const timer = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
    }
  };
  const show = React.useCallback(() => {
    clearTimer();
    if (delay > 0) {
      timer.current = setTimeout(() => setOpen(true), delay);
    } else {
      setOpen(true);
    }
  }, [delay, setOpen]);
  const showImmediate = React.useCallback(() => {
    clearTimer();
    setOpen(true);
  }, [setOpen]);
  const hide = React.useCallback(() => {
    clearTimer();
    setOpen(false);
  }, [setOpen]);

  React.useEffect(() => () => clearTimer(), []);

  const value = React.useMemo<TooltipContextValue>(
    () => ({ open, triggerRef, contentId, show, showImmediate, hide }),
    [open, contentId, show, showImmediate, hide],
  );

  return <TooltipContext.Provider value={value}>{children}</TooltipContext.Provider>;
}

function TooltipTrigger({
  asChild = false,
  ref,
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { triggerRef, show, showImmediate, hide, open, contentId } =
    useTooltip();
  const Comp = asChild ? Slot : "button";
  const composedRef = composeRefs(
    triggerRef as React.Ref<HTMLElement>,
    ref as React.Ref<HTMLElement>,
  );

  return (
    <Comp
      ref={composedRef}
      data-slot="tooltip-trigger"
      data-state={open ? "delayed-open" : "closed"}
      aria-describedby={open ? contentId : undefined}
      onMouseEnter={(e: React.MouseEvent<HTMLButtonElement>) => {
        onMouseEnter?.(e);
        show();
      }}
      onMouseLeave={(e: React.MouseEvent<HTMLButtonElement>) => {
        onMouseLeave?.(e);
        hide();
      }}
      onFocus={(e: React.FocusEvent<HTMLButtonElement>) => {
        onFocus?.(e);
        showImmediate();
      }}
      onBlur={(e: React.FocusEvent<HTMLButtonElement>) => {
        onBlur?.(e);
        hide();
      }}
      {...(asChild ? {} : { type: "button" as const })}
      {...props}
    />
  );
}

function TooltipContent({
  className,
  side = "top",
  align = "center",
  sideOffset = 0,
  hidden,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  side?: Side;
  align?: Align;
  sideOffset?: number;
}) {
  const { open, triggerRef, contentId } = useTooltip();
  const placement: Placement = align === "center" ? side : `${side}-${align}`;
  const active = open && !hidden;
  const { floatingRef, floatingStyles, side: resolvedSide } = useFloating({
    open: active,
    placement,
    offset: sideOffset,
    referenceRef: triggerRef,
  });

  if (!active) return null;

  return (
    <Portal>
      <div
        ref={floatingRef as React.Ref<HTMLDivElement>}
        id={contentId}
        role="tooltip"
        data-slot="tooltip-content"
        data-state="delayed-open"
        data-open=""
        data-side={resolvedSide}
        style={floatingStyles}
        className={cn(
          "bg-foreground text-background data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 z-50 inline-flex w-fit max-w-xs origin-(--float-transform-origin) items-center gap-1.5 rounded-md px-3 py-1.5 text-xs has-data-[slot=kbd]:pe-1.5 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </Portal>
  );
}

export { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger };
