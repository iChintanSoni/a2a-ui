import { cn } from "@/lib/utils";

export function H1({ className, ...props }: React.ComponentProps<"h1">) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-center text-4xl font-extrabold text-balance",
        className,
      )}
      {...props}
    />
  );
}

export function H2({ className, ...props }: React.ComponentProps<"h2">) {
  return (
    <h2
      className={cn(
        "scroll-m-20 border-b pb-2 text-3xl font-semibold first:mt-0",
        className,
      )}
      {...props}
    />
  );
}

export function H3({ className, ...props }: React.ComponentProps<"h3">) {
  return (
    <h3 className={cn("scroll-m-20 text-2xl font-semibold", className)} {...props} />
  );
}

export function P({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("leading-7 not-first:mt-6", className)} {...props} />;
}

export function Blockquote({ className, ...props }: React.ComponentProps<"blockquote">) {
  return <blockquote className={cn("mt-6 border-l-2 pl-6 italic", className)} {...props} />;
}

export function Lead({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-muted-foreground text-xl", className)} {...props} />;
}

export function Large({ className, ...props }: React.ComponentProps<"p">) {
  return <div className={cn("text-lg font-semibold", className)} {...props} />;
}

export function Small({ className, ...props }: React.ComponentProps<"small">) {
  return <small className={cn("text-sm leading-none font-medium", className)} {...props} />;
}

export function Muted({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-muted-foreground text-sm", className)} {...props} />;
}

/** App-level page heading (dashboard, settings pages). Smaller than prose H1/H2. */
export function PageTitle({ className, ...props }: React.ComponentProps<"h1">) {
  return <h1 className={cn("text-xl font-semibold leading-tight", className)} {...props} />;
}

/** Within-card or within-panel subsection label. */
export function SectionTitle({ className, ...props }: React.ComponentProps<"h3">) {
  return <h3 className={cn("text-sm font-medium", className)} {...props} />;
}

/** Metadata, timestamps, captions — smallest readable text. */
export function Caption({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-xs text-muted-foreground", className)} {...props} />;
}

/** Monospace inline text for URLs, IDs, protocol values, code snippets. */
export function Mono({ className, ...props }: React.ComponentProps<"span">) {
  return <span className={cn("font-mono text-sm", className)} {...props} />;
}

/** Validation / form error text. */
export function ErrorText({ className, ...props }: React.ComponentProps<"p">) {
  return <p className={cn("text-sm font-medium text-destructive", className)} {...props} />;
}

/** Uppercase label used in dense UI bars (session info, debug panel). */
export function MicroLabel({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <span
      className={cn("text-[10px] font-medium uppercase text-foreground/60", className)}
      {...props}
    />
  );
}
