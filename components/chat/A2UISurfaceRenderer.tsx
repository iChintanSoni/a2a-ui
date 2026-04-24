import { Badge } from "@/components/ui/badge";
import { Caption, SectionTitle } from "@/components/typography";
import type { A2UIComponent, A2UISurface } from "@/lib/a2a/a2ui";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface Props {
  surface: A2UISurface;
}

function formatValue(value: string | number | boolean | null) {
  if (value === null) return "None";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  return String(value);
}

function renderComponent(component: A2UIComponent, index: number) {
  if (component.kind === "text") {
    if (component.variant === "title") {
      return <SectionTitle key={index}>{component.text}</SectionTitle>;
    }
    if (component.variant === "caption") {
      return <Caption key={index}>{component.text}</Caption>;
    }
    return <p key={index} className="text-sm leading-6">{component.text}</p>;
  }

  if (component.kind === "markdown") {
    return <MarkdownRenderer key={index} content={component.markdown} />;
  }

  if (component.kind === "badge") {
    const variant =
      component.tone === "danger"
        ? "destructive"
        : component.tone === "neutral"
          ? "secondary"
          : component.tone === "warning"
            ? "outline"
            : "default";
    return (
      <Badge key={index} variant={variant} className={component.tone === "success" ? "bg-emerald-600 text-white" : ""}>
        {component.label}
      </Badge>
    );
  }

  if (component.kind === "key-value") {
    return (
      <dl key={index} className="grid grid-cols-[minmax(7rem,0.45fr)_1fr] gap-x-3 gap-y-2 text-sm">
        {component.items.map((item) => (
          <div key={item.label} className="contents">
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd className="min-w-0 break-words font-medium">{formatValue(item.value)}</dd>
          </div>
        ))}
      </dl>
    );
  }

  if (component.kind === "list") {
    const List = component.ordered ? "ol" : "ul";
    return (
      <List
        key={index}
        className={`list-inside space-y-1 text-sm leading-6 ${component.ordered ? "list-decimal" : "list-disc"}`}
      >
        {component.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </List>
    );
  }

  if (component.kind === "table") {
    return (
      <div key={index} className="overflow-x-auto rounded-md border">
        <table className="w-full min-w-80 text-sm">
          <thead className="bg-muted/60">
            <tr>
              {component.columns.map((column) => (
                <th key={column.key} className="px-3 py-2 text-left font-medium">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {component.rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="border-t">
                {component.columns.map((column) => (
                  <td key={column.key} className="px-3 py-2 align-top">
                    {formatValue(row[column.key] ?? null)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  return null;
}

export function A2UISurfaceRenderer({ surface }: Props) {
  return (
    <section className="rounded-md border bg-background text-foreground shadow-sm">
      {(surface.title || surface.description) && (
        <div className="border-b px-3 py-2">
          {surface.title && <SectionTitle>{surface.title}</SectionTitle>}
          {surface.description && <Caption className="mt-1">{surface.description}</Caption>}
        </div>
      )}
      <div className="space-y-3 px-3 py-3">
        {surface.components.map(renderComponent)}
      </div>
    </section>
  );
}
