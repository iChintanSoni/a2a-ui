import { PaperclipIcon, XIcon } from "lucide-react";
import type { AttachmentPreview } from "./ChatInput";

interface Props {
  attachments: AttachmentPreview[];
  onRemove: (index: number) => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AttachmentPreviews({ attachments, onRemove }: Props) {
  if (attachments.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {attachments.map((a, i) => (
        <div
          key={i}
          className="bg-muted/50 relative flex max-w-full items-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs sm:max-w-45"
        >
          {a.previewUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={a.previewUrl}
              alt={a.file.name}
              className="size-8 shrink-0 rounded object-cover"
            />
          ) : (
            <PaperclipIcon className="text-muted-foreground size-4 shrink-0" />
          )}
          <div className="min-w-0 flex-1">
            <p className="truncate leading-none font-medium">{a.file.name}</p>
            <p className="text-muted-foreground mt-0.5">{formatBytes(a.file.size)}</p>
          </div>
          <button
            onClick={() => onRemove(i)}
            className="text-muted-foreground hover:text-foreground shrink-0"
            aria-label="Remove attachment"
          >
            <XIcon className="size-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
