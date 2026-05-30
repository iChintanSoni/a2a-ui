import * as React from "react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Portal } from "@/components/ui/primitives/portal"
import {
  ModalRoot,
  ModalTrigger,
  ModalClose,
  ModalContent,
  ModalTitle,
  ModalDescription,
} from "@/components/ui/primitives/modal"
import { XIcon } from "lucide-react"

const DIALOG_OVERLAY_CLASSES =
  "fixed inset-0 isolate z-50 bg-black/20 duration-100 supports-backdrop-filter:backdrop-blur-xs data-open:animate-in data-open:fade-in-0 data-closed:animate-out data-closed:fade-out-0"

function Dialog({
  ...props
}: React.ComponentProps<typeof ModalRoot>) {
  return <ModalRoot {...props} />
}

function DialogTrigger({
  ...props
}: React.ComponentProps<typeof ModalTrigger>) {
  return <ModalTrigger dataSlot="dialog-trigger" {...props} />
}

function DialogPortal({ children }: { children?: React.ReactNode }) {
  return <Portal>{children}</Portal>
}

function DialogClose({ ...props }: React.ComponentProps<typeof ModalClose>) {
  return <ModalClose dataSlot="dialog-close" {...props} />
}

function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-overlay"
      className={cn(DIALOG_OVERLAY_CLASSES, className)}
      {...props}
    />
  )
}

function DialogContent({
  className,
  children,
  showCloseButton = true,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <ModalContent
      dataSlot="dialog-content"
      overlayClassName={DIALOG_OVERLAY_CLASSES}
      className={cn(
        "glass-panel fixed top-1/2 start-1/2 z-50 grid w-full max-w-[calc(100%-2rem)] -translate-x-1/2 rtl:translate-x-1/2 -translate-y-1/2 gap-6 rounded-xl p-6 text-sm duration-100 outline-none sm:max-w-md data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <ModalClose dataSlot="dialog-close" asChild>
          <Button variant="ghost" className="absolute top-4 end-4" size="icon-sm">
            <XIcon />
            <span className="sr-only">Close</span>
          </Button>
        </ModalClose>
      )}
    </ModalContent>
  )
}

function DialogHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="dialog-header"
      className={cn("flex flex-col gap-2", className)}
      {...props}
    />
  )
}

function DialogFooter({
  className,
  showCloseButton = false,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  showCloseButton?: boolean
}) {
  return (
    <div
      data-slot="dialog-footer"
      className={cn(
        "flex flex-col-reverse gap-2 sm:flex-row sm:justify-end",
        className
      )}
      {...props}
    >
      {children}
      {showCloseButton && (
        <ModalClose dataSlot="dialog-close" asChild>
          <Button variant="outline">Close</Button>
        </ModalClose>
      )}
    </div>
  )
}

function DialogTitle({
  className,
  ...props
}: React.ComponentProps<"h2">) {
  return (
    <ModalTitle
      dataSlot="dialog-title"
      className={cn("leading-none font-medium", className)}
      {...props}
    />
  )
}

function DialogDescription({
  className,
  ...props
}: React.ComponentProps<"p">) {
  return (
    <ModalDescription
      dataSlot="dialog-description"
      className={cn(
        "text-sm text-muted-foreground *:[a]:underline *:[a]:underline-offset-3 *:[a]:hover:text-foreground",
        className
      )}
      {...props}
    />
  )
}

export {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogOverlay,
  DialogPortal,
  DialogTitle,
  DialogTrigger,
}
