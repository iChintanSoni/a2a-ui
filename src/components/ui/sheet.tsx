import * as React from "react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ModalRoot,
  ModalTrigger,
  ModalClose,
  ModalContent,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/primitives/modal";
import { XIcon } from "lucide-react";

const SHEET_OVERLAY_CLASSES =
  "data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0 fixed inset-0 z-50 bg-black/20 duration-100 supports-backdrop-filter:backdrop-blur-xs";

function Sheet({ ...props }: React.ComponentProps<typeof ModalRoot>) {
  return <ModalRoot {...props} />;
}

function SheetTrigger({ ...props }: React.ComponentProps<typeof ModalTrigger>) {
  return <ModalTrigger dataSlot="sheet-trigger" {...props} />;
}

function SheetClose({ ...props }: React.ComponentProps<typeof ModalClose>) {
  return <ModalClose dataSlot="sheet-close" {...props} />;
}

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<"div"> & {
  side?: "top" | "right" | "bottom" | "left";
  showCloseButton?: boolean;
}) {
  return (
    <ModalContent
      dataSlot="sheet-content"
      data-side={side}
      overlayClassName={SHEET_OVERLAY_CLASSES}
      className={cn(
        "glass-panel data-open:animate-in data-open:fade-in-0 data-[side=bottom]:data-open:slide-in-from-bottom-10 data-[side=left]:data-open:slide-in-from-left-10 data-[side=right]:data-open:slide-in-from-right-10 data-[side=top]:data-open:slide-in-from-top-10 data-closed:animate-out data-closed:fade-out-0 fixed z-50 flex flex-col gap-4 text-sm transition duration-200 ease-in-out data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-e data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-s data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm",
        className,
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <ModalClose dataSlot="sheet-close" asChild>
          <Button variant="ghost" className="absolute end-4 top-4" size="icon-sm">
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
        </ModalClose>
      )}
    </ModalContent>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1.5 p-4", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 p-4", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <ModalTitle
      dataSlot="sheet-title"
      className={cn("text-foreground font-medium", className)}
      {...props}
    />
  );
}

function SheetDescription({ className, ...props }: React.ComponentProps<"p">) {
  return (
    <ModalDescription
      dataSlot="sheet-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetTrigger,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
};
