import * as React from "react";

import { Slot } from "./slot";
import { Portal } from "./portal";
import { composeRefs } from "./compose-refs";
import { useControllableState } from "./use-controllable-state";
import { useFocusTrap } from "./use-focus-trap";
import { useScrollLock } from "./use-scroll-lock";
import { useDismiss } from "./use-dismiss";

interface ModalContextValue {
  open: boolean;
  setOpen: (open: boolean) => void;
  contentRef: React.RefObject<HTMLElement | null>;
  triggerRef: React.RefObject<HTMLElement | null>;
  titleId: string;
  descriptionId: string;
  role: "dialog" | "alertdialog";
}

const ModalContext = React.createContext<ModalContextValue | null>(null);

function useModal() {
  const ctx = React.useContext(ModalContext);
  if (!ctx) throw new Error("Modal parts must be used within the Root");
  return ctx;
}

/** Shared dialog/sheet root — owns open state + ARIA ids, renders no DOM. */
function ModalRoot({
  open: openProp,
  defaultOpen,
  onOpenChange,
  role = "dialog",
  children,
}: {
  open?: boolean;
  defaultOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  // Accept any AriaRole so callers can spread arbitrary props; coerced below.
  role?: React.AriaRole;
  children?: React.ReactNode;
}) {
  const [open = false, setOpen] = useControllableState<boolean>({
    prop: openProp,
    defaultProp: defaultOpen ?? false,
    onChange: onOpenChange,
  });
  const contentRef = React.useRef<HTMLElement | null>(null);
  const triggerRef = React.useRef<HTMLElement | null>(null);
  const titleId = React.useId();
  const descriptionId = React.useId();
  const modalRole: "dialog" | "alertdialog" =
    role === "alertdialog" ? "alertdialog" : "dialog";

  const value = React.useMemo<ModalContextValue>(
    () => ({
      open,
      setOpen,
      contentRef,
      triggerRef,
      titleId,
      descriptionId,
      role: modalRole,
    }),
    [open, setOpen, titleId, descriptionId, modalRole],
  );

  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

function ModalTrigger({
  asChild = false,
  dataSlot,
  ref,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean; dataSlot?: string }) {
  const { setOpen, open, triggerRef } = useModal();
  const Comp = asChild ? Slot : "button";
  const composedRef = composeRefs(
    triggerRef as React.Ref<HTMLElement>,
    ref as React.Ref<HTMLElement>,
  );

  return (
    <Comp
      ref={composedRef}
      data-slot={dataSlot}
      aria-haspopup="dialog"
      aria-expanded={open}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        setOpen(true);
      }}
      {...(asChild ? {} : { type: "button" as const })}
      {...props}
    />
  );
}

function ModalClose({
  asChild = false,
  dataSlot,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { asChild?: boolean; dataSlot?: string }) {
  const { setOpen } = useModal();
  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      data-slot={dataSlot}
      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
        onClick?.(e);
        setOpen(false);
      }}
      {...(asChild ? {} : { type: "button" as const })}
      {...props}
    />
  );
}

function ModalContent({
  className,
  overlayClassName,
  dataSlot,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  overlayClassName?: string;
  dataSlot: string;
}) {
  const { open, setOpen, contentRef, triggerRef, titleId, descriptionId, role } =
    useModal();

  useScrollLock(open);
  useFocusTrap(open, contentRef);
  useDismiss(open, () => setOpen(false), {
    floating: contentRef,
    reference: triggerRef,
  });

  if (!open) return null;

  return (
    <Portal>
      <div
        data-slot={`${dataSlot}-overlay`}
        data-state="open"
        data-open=""
        className={overlayClassName}
        aria-hidden="true"
      />
      <div
        ref={contentRef as React.Ref<HTMLDivElement>}
        role={role}
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
        data-slot={dataSlot}
        data-state="open"
        data-open=""
        className={className}
        {...props}
      >
        {children}
      </div>
    </Portal>
  );
}

function ModalTitle({
  dataSlot,
  ...props
}: React.ComponentProps<"h2"> & { dataSlot?: string }) {
  const { titleId } = useModal();
  return <h2 id={titleId} data-slot={dataSlot} {...props} />;
}

function ModalDescription({
  dataSlot,
  ...props
}: React.ComponentProps<"p"> & { dataSlot?: string }) {
  const { descriptionId } = useModal();
  return <p id={descriptionId} data-slot={dataSlot} {...props} />;
}

export {
  ModalRoot,
  ModalTrigger,
  ModalClose,
  ModalContent,
  ModalTitle,
  ModalDescription,
  useModal,
};
