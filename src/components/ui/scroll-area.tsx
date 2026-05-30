import * as React from "react"

import { cn } from "@/lib/utils"

function ScrollArea({
  className,
  children,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="scroll-area"
      className={cn(
        "relative overflow-auto [scrollbar-color:var(--border)_transparent] [scrollbar-width:thin]",
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}

// Native scrollbars handle this now; kept as a no-op for API parity.
function ScrollBar(
  props: React.ComponentProps<"div"> & {
    orientation?: "vertical" | "horizontal"
  }
) {
  void props
  return null
}

export { ScrollArea, ScrollBar }
