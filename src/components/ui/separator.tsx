import * as React from "react"

import { cn } from "@/lib/utils"

function Separator({
  className,
  orientation = "horizontal",
  decorative = true,
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical"
  decorative?: boolean
}) {
  // Emit a boolean data-horizontal / data-vertical attribute (which the
  // `data-horizontal:` / `data-vertical:` Tailwind variants key on) alongside
  // data-orientation, so existing call-site classes keep working.
  const orientationAttr =
    orientation === "vertical" ? { "data-vertical": "" } : { "data-horizontal": "" }

  return (
    <div
      data-slot="separator"
      data-orientation={orientation}
      role={decorative ? "none" : "separator"}
      aria-orientation={
        decorative ? undefined : orientation === "vertical" ? "vertical" : undefined
      }
      {...orientationAttr}
      className={cn(
        "shrink-0 bg-border data-horizontal:h-px data-horizontal:w-full data-vertical:w-px data-vertical:self-stretch",
        className
      )}
      {...props}
    />
  )
}

export { Separator }
