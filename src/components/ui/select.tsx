import * as React from "react";

import { cn } from "@/lib/utils";
import { Portal } from "@/components/ui/primitives/portal";
import { composeRefs } from "@/components/ui/primitives/compose-refs";
import { useControllableState } from "@/components/ui/primitives/use-controllable-state";
import { useDismiss } from "@/components/ui/primitives/use-dismiss";
import { useListNavigation } from "@/components/ui/primitives/use-list-navigation";
import { useFloating, type Align } from "@/components/ui/primitives/floating";
import { ChevronDownIcon, CheckIcon } from "lucide-react";

interface SelectContextValue {
  value: string | undefined;
  selectLabel: string | undefined;
  setSelectLabel: (label: string) => void;
  onSelect: (value: string) => void;
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLElement | null>;
  contentId: string;
  disabled?: boolean;
}

const SelectContext = React.createContext<SelectContextValue | null>(null);
function useSelectCtx() {
  const ctx = React.useContext(SelectContext);
  if (!ctx) throw new Error("Select parts must be used within <Select>");
  return ctx;
}

function Select({
  value: valueProp,
  defaultValue,
  onValueChange,
  open: openProp,
  defaultOpen,
  onOpenChange,
  disabled,
  name,
  children,
}: {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  disabled?: boolean;
  name?: string;
  dir?: "ltr" | "rtl";
  children?: React.ReactNode;
}) {
  const [value, setValue] = useControllableState<string>({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  });
  const [open = false, setOpen] = useControllableState<boolean>({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const [selectLabel, setSelectLabel] = React.useState<string | undefined>();
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLElement | null>(null);
  const contentId = React.useId();

  const onSelect = React.useCallback(
    (next: string) => {
      setValue(next);
      setOpen(false);
      triggerRef.current?.focus();
    },
    [setValue, setOpen],
  );

  const ctx = React.useMemo<SelectContextValue>(
    () => ({
      value,
      selectLabel,
      setSelectLabel,
      onSelect,
      open,
      setOpen,
      triggerRef,
      contentRef,
      contentId,
      disabled,
    }),
    [value, selectLabel, onSelect, open, setOpen, contentId, disabled],
  );

  return (
    <SelectContext.Provider value={ctx}>
      {children}
      {name ? <input type="hidden" name={name} value={value ?? ""} /> : null}
    </SelectContext.Provider>
  );
}

function SelectGroup({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="group"
      data-slot="select-group"
      className={cn("scroll-my-1 p-1", className)}
      {...props}
    />
  );
}

function SelectValue({
  className,
  placeholder,
  ...props
}: React.ComponentProps<"span"> & { placeholder?: React.ReactNode }) {
  const { value, selectLabel } = useSelectCtx();
  const hasValue = value != null && value !== "";
  const display = hasValue ? (selectLabel ?? value) : null;
  return (
    <span
      data-slot="select-value"
      data-placeholder={hasValue ? undefined : ""}
      className={className}
      {...props}
    >
      {display ?? placeholder}
    </span>
  );
}

function SelectTrigger({
  className,
  size = "default",
  children,
  ref,
  onClick,
  onKeyDown,
  ...props
}: React.ComponentProps<"button"> & {
  size?: "sm" | "default";
}) {
  const { open, setOpen, triggerRef, value, disabled, contentId } =
    useSelectCtx();
  const composedRef = composeRefs(
    triggerRef as React.Ref<HTMLElement>,
    ref as React.Ref<HTMLElement>,
  );

  return (
    <button
      ref={composedRef as React.Ref<HTMLButtonElement>}
      type="button"
      role="combobox"
      aria-haspopup="listbox"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      data-slot="select-trigger"
      data-size={size}
      data-state={open ? "open" : "closed"}
      data-placeholder={value ? undefined : ""}
      disabled={disabled}
      onClick={(e) => {
        onClick?.(e);
        if (!disabled) setOpen(!open);
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
          e.preventDefault();
          setOpen(true);
        }
      }}
      className={cn(
        "flex w-fit items-center justify-between gap-1.5 rounded-md border border-input bg-transparent py-2 pe-2 ps-2.5 text-sm whitespace-nowrap shadow-xs transition-[color,box-shadow] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 data-placeholder:text-muted-foreground data-[size=default]:h-9 data-[size=sm]:h-8 *:data-[slot=select-value]:line-clamp-1 *:data-[slot=select-value]:flex *:data-[slot=select-value]:items-center *:data-[slot=select-value]:gap-1.5 dark:bg-input/30 dark:hover:bg-input/50 dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronDownIcon className="pointer-events-none size-4 text-muted-foreground" />
    </button>
  );
}

function SelectContent({
  className,
  children,
  position = "item-aligned",
  align = "center",
  ...props
}: React.ComponentProps<"div"> & {
  position?: "item-aligned" | "popper";
  align?: Align;
}) {
  const { open, setOpen, triggerRef, contentRef, contentId } = useSelectCtx();
  void position;
  void align;
  const { floatingRef, floatingStyles, side } = useFloating({
    open,
    placement: "bottom-start",
    offset: 4,
    referenceRef: triggerRef,
  });
  const onListKeyDown = useListNavigation(contentRef, {
    itemSelector: "[role='option']:not([data-disabled])",
    orientation: "vertical",
    loop: true,
    typeahead: true,
  });
  const mergedRef = composeRefs(
    contentRef as React.Ref<HTMLElement>,
    floatingRef as React.Ref<HTMLElement>,
  );

  useDismiss(open, () => setOpen(false), {
    floating: contentRef,
    reference: triggerRef,
  });

  React.useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      const root = contentRef.current;
      if (!root) return;
      const selected = root.querySelector<HTMLElement>(
        "[role='option'][aria-selected='true']",
      );
      (selected ??
        root.querySelector<HTMLElement>("[role='option']:not([data-disabled])"))?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open, contentRef]);

  if (!open) return null;

  return (
    <Portal>
      <div
        ref={mergedRef as React.Ref<HTMLDivElement>}
        role="listbox"
        id={contentId}
        data-slot="select-content"
        data-state="open"
        data-open=""
        data-side={side}
        style={floatingStyles}
        onKeyDown={(e) => {
          onListKeyDown(e);
          if (e.key === "Tab" || e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
          }
        }}
        className={cn(
          "glass-panel text-popover-foreground data-[side=bottom]:slide-in-from-top-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 relative z-50 max-h-(--float-available-height) min-w-(--float-trigger-width) origin-(--float-transform-origin) overflow-x-hidden overflow-y-auto rounded-md p-1 duration-100",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </Portal>
  );
}

function SelectLabel({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="select-label"
      className={cn("px-2 py-1.5 text-xs text-muted-foreground", className)}
      {...props}
    />
  );
}

function SelectItem({
  className,
  children,
  value: itemValue,
  disabled,
  onMouseEnter,
  onKeyDown,
  ...props
}: React.ComponentProps<"div"> & { value: string; disabled?: boolean }) {
  const { value, onSelect, setSelectLabel } = useSelectCtx();
  const itemRef = React.useRef<HTMLDivElement>(null);
  const selected = value === itemValue;

  // Surface the selected item's text to the trigger via SelectValue.
  React.useEffect(() => {
    if (selected && itemRef.current) {
      setSelectLabel(itemRef.current.textContent ?? "");
    }
  }, [selected, setSelectLabel, children]);

  return (
    <div
      ref={itemRef}
      role="option"
      tabIndex={-1}
      aria-selected={selected}
      data-slot="select-item"
      data-state={selected ? "checked" : "unchecked"}
      data-disabled={disabled ? "" : undefined}
      aria-disabled={disabled || undefined}
      onClick={() => {
        if (!disabled) onSelect(itemValue);
      }}
      onMouseEnter={(e) => {
        onMouseEnter?.(e);
        if (!disabled) e.currentTarget.focus();
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          onSelect(itemValue);
        }
      }}
      className={cn(
        "relative flex w-full cursor-default items-center gap-2 rounded-sm py-1.5 pe-8 ps-2 text-sm outline-hidden select-none focus:bg-accent focus:text-accent-foreground data-disabled:pointer-events-none data-disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4 *:[span]:last:flex *:[span]:last:items-center *:[span]:last:gap-2",
        className,
      )}
      {...props}
    >
      <span className="pointer-events-none absolute end-2 flex size-4 items-center justify-center">
        {selected && <CheckIcon className="pointer-events-none" />}
      </span>
      <span>{children}</span>
    </div>
  );
}

function SelectSeparator({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      role="separator"
      data-slot="select-separator"
      className={cn("pointer-events-none -mx-1 my-1 h-px bg-border", className)}
      {...props}
    />
  );
}

// With native overflow scrolling these are unnecessary; kept for API parity.
function SelectScrollUpButton(props: React.ComponentProps<"div">) {
  void props;
  return null;
}

function SelectScrollDownButton(props: React.ComponentProps<"div">) {
  void props;
  return null;
}

export {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectScrollDownButton,
  SelectScrollUpButton,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
};
