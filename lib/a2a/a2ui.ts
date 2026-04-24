export const A2UI_MIME_TYPE = "application/vnd.a2ui+json";
export const A2UI_EXTENSION_HEADER = "A2A-Extensions";
export const A2UI_EXTENSION_VALUE = "a2ui.readonly.v1";

export type A2UITone = "default" | "neutral" | "success" | "warning" | "danger";

export type A2UIComponent =
  | {
      kind: "text";
      text: string;
      variant?: "body" | "title" | "caption";
    }
  | {
      kind: "markdown";
      markdown: string;
    }
  | {
      kind: "badge";
      label: string;
      tone?: A2UITone;
    }
  | {
      kind: "key-value";
      items: Array<{ label: string; value: string | number | boolean | null }>;
    }
  | {
      kind: "list";
      items: string[];
      ordered?: boolean;
    }
  | {
      kind: "table";
      columns: Array<{ key: string; label: string }>;
      rows: Array<Record<string, string | number | boolean | null>>;
    };

export interface A2UISurface {
  kind: "surface";
  version: string;
  title?: string;
  description?: string;
  components: A2UIComponent[];
}

export interface A2UIDetection {
  surface: A2UISurface;
  source: "a2ui" | "mime" | "inline";
  componentCount: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

function asBoolean(value: unknown): boolean | undefined {
  return typeof value === "boolean" ? value : undefined;
}

function asScalar(value: unknown): string | number | boolean | null | undefined {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null
  ) {
    return value;
  }
  return undefined;
}

function parseComponent(value: unknown): A2UIComponent | null {
  if (!isRecord(value)) return null;
  const kind = asString(value.kind) ?? asString(value.type);

  if (kind === "text") {
    const text = asString(value.text);
    if (!text) return null;
    const variant = asString(value.variant);
    return {
      kind: "text",
      text,
      ...(variant === "title" || variant === "caption" || variant === "body"
        ? { variant }
        : {}),
    };
  }

  if (kind === "markdown") {
    const markdown = asString(value.markdown) ?? asString(value.text);
    return markdown ? { kind: "markdown", markdown } : null;
  }

  if (kind === "badge") {
    const label = asString(value.label);
    if (!label) return null;
    const tone = asString(value.tone);
    return {
      kind: "badge",
      label,
      ...(tone === "success" || tone === "warning" || tone === "danger" || tone === "neutral"
        ? { tone }
        : {}),
    };
  }

  if (kind === "key-value") {
    const items = Array.isArray(value.items)
      ? value.items
          .map((item) => {
            if (!isRecord(item)) return null;
            const label = asString(item.label) ?? asString(item.key);
            const scalar = asScalar(item.value);
            return label && scalar !== undefined ? { label, value: scalar } : null;
          })
          .filter((item): item is { label: string; value: string | number | boolean | null } => item != null)
      : [];
    return items.length > 0 ? { kind: "key-value", items } : null;
  }

  if (kind === "list") {
    const items = Array.isArray(value.items)
      ? value.items.filter((item): item is string => typeof item === "string")
      : [];
    return items.length > 0
      ? { kind: "list", items, ordered: asBoolean(value.ordered) }
      : null;
  }

  if (kind === "table") {
    const columns = Array.isArray(value.columns)
      ? value.columns
          .map((column) => {
            if (!isRecord(column)) return null;
            const key = asString(column.key);
            const label = asString(column.label) ?? key;
            return key && label ? { key, label } : null;
          })
          .filter((column): column is { key: string; label: string } => column != null)
      : [];
    const rows = Array.isArray(value.rows)
      ? value.rows
          .filter(isRecord)
          .map((row) =>
            Object.fromEntries(
              Object.entries(row).filter((entry): entry is [string, string | number | boolean | null] => {
                return asScalar(entry[1]) !== undefined;
              }),
            ),
          )
      : [];
    return columns.length > 0 && rows.length > 0 ? { kind: "table", columns, rows } : null;
  }

  return null;
}

function parseSurface(value: unknown): A2UISurface | null {
  if (!isRecord(value)) return null;
  const components = Array.isArray(value.components)
    ? value.components.map(parseComponent).filter((component): component is A2UIComponent => component != null)
    : [];
  if (components.length === 0) return null;

  return {
    kind: "surface",
    version: asString(value.version) ?? "1",
    title: asString(value.title),
    description: asString(value.description),
    components,
  };
}

export function detectA2UISurface(data: unknown, mimeType?: string): A2UIDetection | null {
  if (!isRecord(data)) return null;

  if (isRecord(data.a2ui)) {
    const surface = parseSurface(data.a2ui);
    return surface ? { surface, source: "a2ui", componentCount: surface.components.length } : null;
  }

  if (mimeType === A2UI_MIME_TYPE) {
    const surface = parseSurface(data);
    return surface ? { surface, source: "mime", componentCount: surface.components.length } : null;
  }

  if ((data.kind === "surface" || data.type === "a2ui.surface") && Array.isArray(data.components)) {
    const surface = parseSurface(data);
    return surface ? { surface, source: "inline", componentCount: surface.components.length } : null;
  }

  return null;
}
