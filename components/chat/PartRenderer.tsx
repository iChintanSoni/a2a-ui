import type { Part } from "@a2a-js/sdk";
import { detectA2UISurface } from "@/lib/a2a/a2ui";
import { DEFAULT_FILE_MEDIA_TYPE, getPartBytesBase64 } from "@/lib/a2a/parts";
import { A2UISurfaceRenderer } from "./A2UISurfaceRenderer";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface Props {
  part: Part;
  a2uiEnabled?: boolean;
}

function getPartMimeType(part: Part): string | undefined {
  if (part.mediaType) return part.mediaType;
  const metadata = part.metadata;
  return typeof metadata?.mimeType === "string" ? metadata.mimeType : undefined;
}

export function PartRenderer({ part, a2uiEnabled = false }: Props) {
  if (part.content?.$case === "text") {
    return <MarkdownRenderer content={part.content.value} />;
  }

  if (part.content?.$case === "url" || part.content?.$case === "raw") {
    const mimeType = part.mediaType || DEFAULT_FILE_MEDIA_TYPE;
    const src =
      part.content.$case === "url"
        ? part.content.value
        : `data:${mimeType};base64,${getPartBytesBase64(part) ?? ""}`;
    const name = part.filename || "file";

    if (mimeType.startsWith("image/")) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={name} className="max-w-full rounded border sm:max-w-xs" />;
    }

    if (mimeType.startsWith("audio/")) {
      return (
        <audio controls src={src} className="max-w-full rounded sm:max-w-xs" aria-label={name} />
      );
    }

    if (mimeType.startsWith("video/")) {
      return (
        <video
          controls
          src={src}
          className="max-w-full rounded border sm:max-w-sm"
          aria-label={name}
        />
      );
    }

    if (mimeType === "application/pdf") {
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
              className="text-primary text-sm underline"
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
        className="text-primary text-sm underline"
      >
        {name}
      </a>
    );
  }

  if (part.content?.$case === "data") {
    const data = part.content.value;
    const detection = detectA2UISurface(data, getPartMimeType(part));
    if (a2uiEnabled && detection) {
      return <A2UISurfaceRenderer surface={detection.surface} />;
    }

    return (
      <pre className="bg-muted overflow-x-auto rounded p-3 text-xs">
        {JSON.stringify(data, null, 2)}
      </pre>
    );
  }

  return null;
}
