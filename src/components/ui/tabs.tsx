import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"
import { useControllableState } from "@/components/ui/primitives/use-controllable-state"
import { useListNavigation } from "@/components/ui/primitives/use-list-navigation"

interface TabsContextValue {
  value: string | undefined
  setValue: (value: string) => void
  orientation: "horizontal" | "vertical"
  baseId: string
}

const TabsContext = React.createContext<TabsContextValue | null>(null)

function useTabs() {
  const ctx = React.useContext(TabsContext)
  if (!ctx) throw new Error("Tabs parts must be used within <Tabs>")
  return ctx
}

function Tabs({
  className,
  orientation = "horizontal",
  value: valueProp,
  defaultValue,
  onValueChange,
  children,
  ...props
}: React.ComponentProps<"div"> & {
  orientation?: "horizontal" | "vertical"
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
}) {
  const [value, setValue] = useControllableState<string>({
    prop: valueProp,
    defaultProp: defaultValue,
    onChange: onValueChange,
  })
  const baseId = React.useId()
  const orientationAttr =
    orientation === "vertical" ? { "data-vertical": "" } : { "data-horizontal": "" }

  return (
    <TabsContext.Provider value={{ value, setValue, orientation, baseId }}>
      <div
        data-slot="tabs"
        data-orientation={orientation}
        {...orientationAttr}
        className={cn(
          "group/tabs flex gap-2 data-horizontal:flex-col",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </TabsContext.Provider>
  )
}

const tabsListVariants = cva(
  "group/tabs-list inline-flex w-fit items-center justify-center rounded-lg p-[3px] text-muted-foreground group-data-horizontal/tabs:h-9 group-data-vertical/tabs:h-fit group-data-vertical/tabs:flex-col data-[variant=line]:rounded-none",
  {
    variants: {
      variant: {
        default: "bg-muted",
        line: "gap-1 bg-transparent",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function TabsList({
  className,
  variant = "default",
  children,
  ...props
}: React.ComponentProps<"div"> & VariantProps<typeof tabsListVariants>) {
  const { orientation } = useTabs()
  const listRef = React.useRef<HTMLDivElement>(null)
  const onKeyDown = useListNavigation(listRef, {
    itemSelector: "[role='tab']:not([data-disabled])",
    orientation: orientation === "vertical" ? "vertical" : "horizontal",
    loop: true,
    typeahead: false,
  })

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-orientation={orientation}
      data-slot="tabs-list"
      data-variant={variant}
      onKeyDown={onKeyDown}
      className={cn(tabsListVariants({ variant }), className)}
      {...props}
    >
      {children}
    </div>
  )
}

function TabsTrigger({
  className,
  value: triggerValue,
  disabled,
  onClick,
  ...props
}: React.ComponentProps<"button"> & { value: string }) {
  const { value, setValue, baseId } = useTabs()
  const isActive = value === triggerValue

  return (
    <button
      type="button"
      role="tab"
      id={`${baseId}-trigger-${triggerValue}`}
      aria-selected={isActive}
      aria-controls={`${baseId}-content-${triggerValue}`}
      tabIndex={isActive ? 0 : -1}
      disabled={disabled}
      data-slot="tabs-trigger"
      data-state={isActive ? "active" : "inactive"}
      data-active={isActive ? "" : undefined}
      data-disabled={disabled ? "" : undefined}
      onClick={(e) => {
        onClick?.(e)
        if (!disabled) setValue(triggerValue)
      }}
      onFocus={() => {
        if (!disabled) setValue(triggerValue)
      }}
      className={cn(
        "relative inline-flex h-[calc(100%-1px)] flex-1 items-center justify-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-sm font-medium whitespace-nowrap text-foreground/60 transition-all group-data-vertical/tabs:w-full group-data-vertical/tabs:justify-start hover:text-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-1 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50 has-data-[icon=inline-end]:pe-1.5 has-data-[icon=inline-start]:ps-1.5 dark:text-muted-foreground dark:hover:text-foreground group-data-[variant=default]/tabs-list:data-active:shadow-sm group-data-[variant=line]/tabs-list:data-active:shadow-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
        "group-data-[variant=line]/tabs-list:bg-transparent group-data-[variant=line]/tabs-list:data-active:bg-transparent dark:group-data-[variant=line]/tabs-list:data-active:border-transparent dark:group-data-[variant=line]/tabs-list:data-active:bg-transparent",
        "data-active:bg-background data-active:text-foreground dark:data-active:border-input dark:data-active:bg-input/30 dark:data-active:text-foreground",
        "after:absolute after:bg-foreground after:opacity-0 after:transition-opacity group-data-horizontal/tabs:after:inset-x-0 group-data-horizontal/tabs:after:bottom-[-5px] group-data-horizontal/tabs:after:h-0.5 group-data-vertical/tabs:after:inset-y-0 group-data-vertical/tabs:after:-end-1 group-data-vertical/tabs:after:w-0.5 group-data-[variant=line]/tabs-list:data-active:after:opacity-100",
        className
      )}
      {...props}
    />
  )
}

function TabsContent({
  className,
  value: contentValue,
  children,
  ...props
}: React.ComponentProps<"div"> & { value: string }) {
  const { value, baseId } = useTabs()
  const isActive = value === contentValue

  return (
    <div
      role="tabpanel"
      id={`${baseId}-content-${contentValue}`}
      aria-labelledby={`${baseId}-trigger-${contentValue}`}
      tabIndex={0}
      data-slot="tabs-content"
      data-state={isActive ? "active" : "inactive"}
      hidden={!isActive}
      className={cn("flex-1 text-sm outline-none", className)}
      {...props}
    >
      {isActive ? children : null}
    </div>
  )
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants }
