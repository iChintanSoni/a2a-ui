import type { PartData } from "@/lib/features/chats/chatsSlice";
import { MarkdownRenderer } from "./MarkdownRenderer";

interface Props {
  part: PartData;
}

export function PartRenderer({ part }: Props) {
  if (part.kind === "text") {
    return <MarkdownRenderer content={part.text} />;
  }

  if (part.kind === "file") {
    const { file } = part;
    const src = "uri" in file ? file.uri : `data:${file.mimeType ?? "application/octet-stream"};base64,${file.bytes}`;
    const name = file.name ?? "file";

    if (file.mimeType?.startsWith("image/")) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src={src} alt={name} className="max-w-xs rounded border" />;
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
    return (
      <pre className="bg-muted rounded p-3 text-xs overflow-x-auto">
        {JSON.stringify(part.data, null, 2)}
      </pre>
    );
  }

  return null;
}
