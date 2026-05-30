import * as React from "react";

import { Slot } from "@/components/ui/primitives/slot";
import { useControllableState } from "@/components/ui/primitives/use-controllable-state";

interface CollapsibleContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  disabled?: boolean;
  contentId: string;
}

const CollapsibleContext = React.createContext<CollapsibleContextValue | null>(
  null,
);

function useCollapsible() {
  const ctx = React.useContext(CollapsibleContext);
  if (!ctx) {
    throw new Error("Collapsible parts must be used within <Collapsible>");
  }
  return ctx;
}

function Collapsible({
  open: openProp,
  defaultOpen,
  onOpenChange,
  disabled,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
}) {
  const [open = false, setOpen] = useControllableState<boolean>({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const contentId = React.useId();

  return (
    <CollapsibleContext.Provider value={{ open, setOpen, disabled, contentId }}>
      <div data-slot="collapsible" data-state={open ? "open" : "closed"} {...props}>
        {children}
      </div>
    </CollapsibleContext.Provider>
  );
}

function CollapsibleTrigger({
  asChild = false,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { open, setOpen, disabled, contentId } = useCollapsible();
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot="collapsible-trigger"
      data-state={open ? "open" : "closed"}
      aria-expanded={open}
      aria-controls={contentId}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        if (!disabled) setOpen(!open);
      }}
      {...(asChild ? {} : { type: "button" as const, disabled })}
      {...props}
    />
  );
}

function CollapsibleContent({
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { open, contentId } = useCollapsible();

  return (
    <div
      id={contentId}
      data-slot="collapsible-content"
      data-state={open ? "open" : "closed"}
      hidden={!open}
      {...props}
    >
      {open ? children : null}
    </div>
  );
}

export { Collapsible, CollapsibleTrigger, CollapsibleContent };
