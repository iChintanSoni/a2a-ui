import type { Part } from "@a2a-js/sdk";
import { detectA2UISurface } from "@/lib/a2a/a2ui";
import { A2UISurfaceRenderer } from "./A2UISurfaceRenderer";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface Props {
  part: Part;
  a2uiEnabled?: boolean;
}

function getPartMimeType(part: Part): string | undefined {
  if (part.kind === "file") return part.file.mimeType;
  const metadata = (part as { metadata?: { mimeType?: unknown } }).metadata;
  return typeof metadata?.mimeType === "string" ? metadata.mimeType : undefined;
}

export function PartRenderer({ part, a2uiEnabled = false }: Props) {
  if (part.kind === "text") {
    return <MarkdownRenderer content={part.text} />;
  }

  if (part.kind === "file") {
    const { file } = part;
    const src = "uri" in file ? file.uri : `data:${file.mimeType ?? "application/octet-stream"};base64,${file.bytes}`;
    const name = file.name ?? "file";

    if (file.mimeType?.startsWith("image/")) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={name} className="max-w-full rounded border sm:max-w-xs" />;
    }

    if (file.mimeType?.startsWith("audio/")) {
      return (
        <audio
          controls
          src={src}
          className="max-w-full rounded sm:max-w-xs"
          aria-label={name}
        />
      );
    }

    if (file.mimeType?.startsWith("video/")) {
      return (
        <video
          controls
          src={src}
          className="max-w-full rounded border sm:max-w-sm"
          aria-label={name}
        />
      );
    }

    if (file.mimeType === "application/pdf") {
      return (
        <div className="flex flex-col gap-1">
          <object
            data={src}
            type="application/pdf"
            className="h-[60dvh] w-full rounded border sm:h-[480px]"
            aria-label={name}
          >
            <a
              href={src}
              download={name}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline text-sm"
            >
              {name} (download PDF)
            </a>
          </object>
        </div>
      );
    }

    return (
      <a
        href={src}
        download={name}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline text-sm"
      >
        {name}
      </a>
    );
  }

  if (part.kind === "data") {
    const detection = detectA2UISurface(part.data, getPartMimeType(part));
    if (a2uiEnabled && detection) {
      return <A2UISurfaceRenderer surface={detection.surface} />;
    }

    return (
      <pre className="overflow-x-auto rounded bg-muted p-3 text-xs">
        {JSON.stringify(part.data, null, 2)}
      </pre>
    );
  }

  return null;
}
