import * as React from "react";

import { cn } from "@/lib/utils";
import { Slot } from "@/components/ui/primitives/slot";
import { Portal } from "@/components/ui/primitives/portal";
import { composeRefs } from "@/components/ui/primitives/compose-refs";
import { useControllableState } from "@/components/ui/primitives/use-controllable-state";
import { useDismiss } from "@/components/ui/primitives/use-dismiss";
import { useListNavigation } from "@/components/ui/primitives/use-list-navigation";
import {
  useFloating,
  type Side,
  type Align,
  type Placement,
} from "@/components/ui/primitives/floating";
import { CheckIcon, ChevronRightIcon } from "lucide-react";

const MENU_ITEM_SELECTOR = "[role^='menuitem']:not([data-disabled])";

/** Lets any item close the whole menu tree (root + open submenus) on select. */
const MenuRootContext = React.createContext<{ closeAll: () => void }>({
  closeAll: () => {},
});

interface MenuContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  triggerRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLElement | null>;
  contentId: string;
}
const MenuContext = React.createContext<MenuContextValue | null>(null);
function useMenu() {
  const ctx = React.useContext(MenuContext);
  if (!ctx) throw new Error("DropdownMenu parts must be used within <DropdownMenu>");
  return ctx;
}

function useMenuState(controlled?: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
}): MenuContextValue {
  const [open = false, setOpen] = useControllableState<boolean>({
    prop: controlled?.open,
    defaultProp: controlled?.defaultOpen ?? false,
    onChange: controlled?.onOpenChange,
  });
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const contentRef = React.useRef<HTMLElement | null>(null);
  const contentId = React.useId();
  return React.useMemo(
    () => ({ open, setOpen, triggerRef, contentRef, contentId }),
    [open, setOpen, contentId],
  );
}

/** Focus the first item when a menu opens. */
function useAutoFocusFirstItem(
  open: boolean,
  contentRef: React.RefObject<HTMLElement | null>,
) {
  React.useEffect(() => {
    if (!open) return;
    const id = requestAnimationFrame(() => {
      contentRef.current?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)?.focus();
    });
    return () => cancelAnimationFrame(id);
  }, [open, contentRef]);
}

function DropdownMenu({
  open,
  defaultOpen,
  onOpenChange,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}) {
  const menu = useMenuState({ open, defaultOpen, onOpenChange });
  const closeAll = React.useCallback(() => menu.setOpen(false), [menu]);
  return (
    <MenuRootContext.Provider value={{ closeAll }}>
      <MenuContext.Provider value={menu}>{children}</MenuContext.Provider>
    </MenuRootContext.Provider>
  );
}

function DropdownMenuPortal({ children }: { children?: React.ReactNode }) {
  return <Portal>{children}</Portal>;
}

function DropdownMenuTrigger({
  asChild = false,
  ref,
  onClick,
  onKeyDown,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean }) {
  const { open, setOpen, triggerRef, contentId } = useMenu();
  const Comp = asChild ? Slot : "button";
  const composedRef = composeRefs(
    triggerRef as React.Ref<HTMLElement>,
    ref as React.Ref<HTMLElement>,
  );

  return (
    <Comp
      ref={composedRef}
      data-slot="dropdown-menu-trigger"
      aria-haspopup="menu"
      aria-expanded={open}
      aria-controls={open ? contentId : undefined}
      data-state={open ? "open" : "closed"}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        setOpen(!open);
      }}
      onKeyDown={(e: React.KeyboardEvent<HTMLButtonElement>) => {
        onKeyDown?.(e);
        if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setOpen(true);
        }
      }}
      {...(asChild ? {} : { type: "button" as const })}
      {...props}
    />
  );
}

function DropdownMenuContent({
  className,
  align = "start",
  side = "bottom",
  sideOffset = 4,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  align?: Align;
  side?: Side;
  sideOffset?: number;
}) {
  const { open, setOpen, triggerRef, contentRef, contentId } = useMenu();
  const placement: Placement = align === "center" ? side : `${side}-${align}`;
  const { floatingRef, floatingStyles, side: resolvedSide } = useFloating({
    open,
    placement,
    offset: sideOffset,
    referenceRef: triggerRef,
  });
  const onListKeyDown = useListNavigation(contentRef, {
    itemSelector: MENU_ITEM_SELECTOR,
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
  useAutoFocusFirstItem(open, contentRef);

  if (!open) return null;

  return (
    <Portal>
      <div
        ref={mergedRef as React.Ref<HTMLDivElement>}
        role="menu"
        id={contentId}
        aria-orientation="vertical"
        data-slot="dropdown-menu-content"
        data-state="open"
        data-open=""
        data-side={resolvedSide}
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
          "glass-panel text-popover-foreground data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 z-50 max-h-(--float-available-height) w-(--float-trigger-width) min-w-32 origin-(--float-transform-origin) overflow-x-hidden overflow-y-auto rounded-md p-1 duration-100",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </Portal>
  );
}

function DropdownMenuGroup({ ...props }: React.ComponentProps<"div">) {
  return <div role="group" data-slot="dropdown-menu-group" {...props} />;
}

function DropdownMenuItem({
  className,
  inset,
  variant = "default",
  disabled,
  onSelect,
  onClick,
  onMouseEnter,
  onKeyDown,
  ...props
}: React.ComponentProps<"div"> & {
  inset?: boolean;
  variant?: "default" | "destructive";
  disabled?: boolean;
  onSelect?: (event: Event) => void;
}) {
  const { closeAll } = React.useContext(MenuRootContext);
  return (
    <div
      role="menuitem"
      tabIndex={-1}
      data-slot="dropdown-menu-item"
      data-inset={inset ? "" : undefined}
      data-variant={variant}
      data-disabled={disabled ? "" : undefined}
      aria-disabled={disabled || undefined}
      onClick={(e) => {
        if (disabled) return;
        onClick?.(e);
        onSelect?.(e.nativeEvent);
        closeAll();
      }}
      onMouseEnter={(e) => {
        onMouseEnter?.(e);
        if (!disabled) e.currentTarget.focus();
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          e.currentTarget.click();
        }
      }}
      className={cn(
        "group/dropdown-menu-item focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-[variant=destructive]:text-destructive data-[variant=destructive]:focus:bg-destructive/10 data-[variant=destructive]:focus:text-destructive dark:data-[variant=destructive]:focus:bg-destructive/20 data-[variant=destructive]:*:[svg]:text-destructive relative flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuCheckboxItem({
  className,
  children,
  checked,
  inset,
  disabled,
  onCheckedChange,
  onSelect,
  onClick,
  onMouseEnter,
  onKeyDown,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  inset?: boolean;
  checked?: boolean;
  disabled?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  onSelect?: (event: Event) => void;
}) {
  const { closeAll } = React.useContext(MenuRootContext);
  return (
    <div
      role="menuitemcheckbox"
      tabIndex={-1}
      aria-checked={checked}
      data-slot="dropdown-menu-checkbox-item"
      data-inset={inset ? "" : undefined}
      data-state={checked ? "checked" : "unchecked"}
      data-disabled={disabled ? "" : undefined}
      aria-disabled={disabled || undefined}
      onClick={(e) => {
        if (disabled) return;
        onClick?.(e);
        onCheckedChange?.(!checked);
        onSelect?.(e.nativeEvent);
        closeAll();
      }}
      onMouseEnter={(e) => {
        onMouseEnter?.(e);
        if (!disabled) e.currentTarget.focus();
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          e.currentTarget.click();
        }
      }}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 ps-2 pe-8 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute end-2 flex items-center justify-center"
        data-slot="dropdown-menu-checkbox-item-indicator"
      >
        {checked && <CheckIcon />}
      </span>
      {children}
    </div>
  );
}

const RadioGroupContext = React.createContext<{
  value?: string;
  onValueChange?: (value: string) => void;
}>({});

function DropdownMenuRadioGroup({
  value,
  onValueChange,
  children,
  ...props
}: Omit<React.ComponentProps<"div">, "onChange"> & {
  value?: string;
  onValueChange?: (value: string) => void;
}) {
  const ctx = React.useMemo(() => ({ value, onValueChange }), [value, onValueChange]);
  return (
    <RadioGroupContext.Provider value={ctx}>
      <div role="group" data-slot="dropdown-menu-radio-group" {...props}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  );
}

function DropdownMenuRadioItem({
  className,
  children,
  value,
  inset,
  disabled,
  onSelect,
  onClick,
  onMouseEnter,
  onKeyDown,
  ...props
}: React.ComponentProps<"div"> & {
  value: string;
  inset?: boolean;
  disabled?: boolean;
  onSelect?: (event: Event) => void;
}) {
  const group = React.useContext(RadioGroupContext);
  const { closeAll } = React.useContext(MenuRootContext);
  const checked = group.value === value;
  return (
    <div
      role="menuitemradio"
      tabIndex={-1}
      aria-checked={checked}
      data-slot="dropdown-menu-radio-item"
      data-inset={inset ? "" : undefined}
      data-state={checked ? "checked" : "unchecked"}
      data-disabled={disabled ? "" : undefined}
      aria-disabled={disabled || undefined}
      onClick={(e) => {
        if (disabled) return;
        onClick?.(e);
        group.onValueChange?.(value);
        onSelect?.(e.nativeEvent);
        closeAll();
      }}
      onMouseEnter={(e) => {
        onMouseEnter?.(e);
        if (!disabled) e.currentTarget.focus();
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if ((e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          e.currentTarget.click();
        }
      }}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground focus:**:text-accent-foreground relative flex cursor-default items-center gap-2 rounded-sm py-1.5 ps-2 pe-8 text-sm outline-hidden select-none data-disabled:pointer-events-none data-disabled:opacity-50 data-inset:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      <span
        className="pointer-events-none absolute end-2 flex items-center justify-center"
        data-slot="dropdown-menu-radio-item-indicator"
      >
        {checked && <CheckIcon />}
      </span>
      {children}
    </div>
  );
}

function DropdownMenuLabel({
  className,
  inset,
  ...props
}: React.ComponentProps<"div"> & { inset?: boolean }) {
  return (
    <div
      data-slot="dropdown-menu-label"
      data-inset={inset ? "" : undefined}
      className={cn(
        "text-muted-foreground px-2 py-1.5 text-xs font-medium data-inset:ps-8",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSeparator({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      role="separator"
      aria-orientation="horizontal"
      data-slot="dropdown-menu-separator"
      className={cn("bg-border -mx-1 my-1 h-px", className)}
      {...props}
    />
  );
}

function DropdownMenuShortcut({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      data-slot="dropdown-menu-shortcut"
      className={cn(
        "text-muted-foreground group-focus/dropdown-menu-item:text-accent-foreground ms-auto text-xs tracking-widest",
        className,
      )}
      {...props}
    />
  );
}

function DropdownMenuSub({
  open,
  defaultOpen,
  onOpenChange,
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}) {
  const menu = useMenuState({ open, defaultOpen, onOpenChange });
  return <MenuContext.Provider value={menu}>{children}</MenuContext.Provider>;
}

function DropdownMenuSubTrigger({
  className,
  inset,
  children,
  disabled,
  ref,
  onMouseEnter,
  onKeyDown,
  ...props
}: React.ComponentProps<"div"> & { inset?: boolean; disabled?: boolean }) {
  const { open, setOpen, triggerRef, contentRef } = useMenu();
  const composedRef = composeRefs(
    triggerRef as React.Ref<HTMLElement>,
    ref as React.Ref<HTMLElement>,
  );
  return (
    <div
      ref={composedRef as React.Ref<HTMLDivElement>}
      role="menuitem"
      tabIndex={-1}
      aria-haspopup="menu"
      aria-expanded={open}
      data-slot="dropdown-menu-sub-trigger"
      data-state={open ? "open" : "closed"}
      data-open={open ? "" : undefined}
      data-inset={inset ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      onMouseEnter={(e) => {
        onMouseEnter?.(e);
        if (!disabled) {
          e.currentTarget.focus();
          setOpen(true);
        }
      }}
      onKeyDown={(e) => {
        onKeyDown?.(e);
        if ((e.key === "ArrowRight" || e.key === "Enter" || e.key === " ") && !disabled) {
          e.preventDefault();
          setOpen(true);
          requestAnimationFrame(() => {
            contentRef.current?.querySelector<HTMLElement>(MENU_ITEM_SELECTOR)?.focus();
          });
        }
      }}
      className={cn(
        "focus:bg-accent focus:text-accent-foreground not-data-[variant=destructive]:focus:**:text-accent-foreground data-open:bg-accent data-open:text-accent-foreground flex cursor-default items-center gap-2 rounded-sm px-2 py-1.5 text-sm outline-hidden select-none data-inset:ps-8 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        className,
      )}
      {...props}
    >
      {children}
      <ChevronRightIcon className="ms-auto rtl:rotate-180" />
    </div>
  );
}

function DropdownMenuSubContent({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  const { open, setOpen, triggerRef, contentRef, contentId } = useMenu();
  const { floatingRef, floatingStyles, side } = useFloating({
    open,
    placement: "right-start",
    offset: 0,
    referenceRef: triggerRef,
  });
  const onListKeyDown = useListNavigation(contentRef, {
    itemSelector: MENU_ITEM_SELECTOR,
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
  useAutoFocusFirstItem(open, contentRef);

  if (!open) return null;

  return (
    <Portal>
      <div
        ref={mergedRef as React.Ref<HTMLDivElement>}
        role="menu"
        id={contentId}
        data-slot="dropdown-menu-sub-content"
        data-state="open"
        data-open=""
        data-side={side}
        style={floatingStyles}
        onKeyDown={(e) => {
          onListKeyDown(e);
          if (e.key === "ArrowLeft" || e.key === "Escape") {
            e.preventDefault();
            setOpen(false);
            triggerRef.current?.focus();
          }
        }}
        className={cn(
          "glass-panel text-popover-foreground data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 z-50 min-w-[96px] origin-(--float-transform-origin) overflow-hidden rounded-md p-1 duration-100",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </Portal>
  );
}

export {
  DropdownMenu,
  DropdownMenuPortal,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
};
