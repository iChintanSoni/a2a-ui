import { useState, useRef, type KeyboardEvent } from "react";
import { SendIcon, PaperclipIcon, SlidersHorizontalIcon, XIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface MetadataRow {
  key: string;
  value: string;
}

interface AttachmentPreview {
  file: File;
  previewUrl?: string; // only for images
}

interface Props {
  onSend: (text: string, metadata?: Record<string, string>, attachments?: File[]) => void;
  disabled?: boolean;
  isInputRequired?: boolean;
  /** Agent's defaultInputModes — controls whether the file picker is shown and which types are accepted */
  inputModes?: string[];
}

export function ChatInput({ onSend, disabled, isInputRequired, inputModes = [] }: Props) {
  // Derive file-picker visibility and accepted MIME types from inputModes.
  // Any entry that isn't "text" is treated as an allowed attachment MIME type.
  const acceptedMimeTypes = inputModes.filter((m) => m !== "text");
  const showFilePicker = acceptedMimeTypes.length > 0;
  const acceptAttr = acceptedMimeTypes.join(",");
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Metadata state
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaRows, setMetaRows] = useState<MetadataRow[]>([{ key: "", value: "" }]);

  // Attachments state
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;

    const metadata = metaRows
      .filter((r) => r.key.trim())
      .reduce<Record<string, string>>((acc, r) => {
        acc[r.key.trim()] = r.value;
        return acc;
      }, {});

    onSend(
      trimmed,
      Object.keys(metadata).length > 0 ? metadata : undefined,
      attachments.length > 0 ? attachments.map((a) => a.file) : undefined
    );

    setText("");
    setMetaRows([{ key: "", value: "" }]);
    setMetaOpen(false);
    setAttachments([]);
    if (textareaRef.current) textareaRef.current.style.height = "auto";
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleInput = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const previews: AttachmentPreview[] = files.map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((prev) => [...prev, ...previews]);
    // Reset input so same file can be re-added if removed
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const updated = [...prev];
      const removed = updated.splice(index, 1)[0];
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return updated;
    });
  };

  const updateMetaRow = (index: number, field: "key" | "value", val: string) => {
    setMetaRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: val } : row))
    );
  };

  const addMetaRow = () => setMetaRows((prev) => [...prev, { key: "", value: "" }]);

  const removeMetaRow = (index: number) => {
    setMetaRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="border-t bg-background px-4 py-3 flex flex-col gap-2">
      {/* input-required banner */}
      {isInputRequired && (
        <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-300">
          <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
          Responding to agent — your message will continue the current task
        </div>
      )}

      {/* Attachment previews — only shown when file picker is available */}
      {showFilePicker && attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div key={i} className="relative flex items-center gap-1.5 rounded-lg border bg-muted/50 px-2 py-1.5 text-xs max-w-45">
              {a.previewUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={a.previewUrl} alt={a.file.name} className="size-8 rounded object-cover shrink-0" />
              ) : (
                <PaperclipIcon className="size-4 text-muted-foreground shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium leading-none">{a.file.name}</p>
                <p className="text-muted-foreground mt-0.5">{formatBytes(a.file.size)}</p>
              </div>
              <button
                onClick={() => removeAttachment(i)}
                className="shrink-0 text-muted-foreground hover:text-foreground"
                aria-label="Remove attachment"
              >
                <XIcon className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Metadata editor */}
      {metaOpen && (
        <div className="rounded-lg border bg-muted/20 px-3 py-2 flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Message metadata</p>
          {metaRows.map((row, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <Input
                className="h-7 text-xs flex-1"
                placeholder="key"
                value={row.key}
                onChange={(e) => updateMetaRow(i, "key", e.target.value)}
              />
              <Input
                className="h-7 text-xs flex-1"
                placeholder="value"
                value={row.value}
                onChange={(e) => updateMetaRow(i, "value", e.target.value)}
              />
              <button
                onClick={() => removeMetaRow(i)}
                className="text-muted-foreground hover:text-foreground shrink-0"
                aria-label="Remove row"
                disabled={metaRows.length === 1}
              >
                <XIcon className="size-3.5" />
              </button>
            </div>
          ))}
          <button
            onClick={addMetaRow}
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground w-fit"
          >
            <PlusIcon className="size-3" />
            Add row
          </button>
        </div>
      )}

      {/* Main input row */}
      <div className="flex items-end gap-2 rounded-xl border bg-muted/30 px-3 py-2 focus-within:ring-1 focus-within:ring-ring">
        {/* File picker — hidden input + paperclip button, only when agent accepts non-text input */}
        {showFilePicker && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={acceptAttr}
              className="hidden"
              onChange={handleFileChange}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={disabled}
              className={cn(
                "shrink-0 text-muted-foreground hover:text-foreground transition-colors",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              aria-label="Attach files"
            >
              <PaperclipIcon className="size-4" />
            </button>
          </>
        )}

        <textarea
          ref={textareaRef}
          className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          placeholder={isInputRequired ? "Respond to agent… (Enter to send)" : "Message agent… (Enter to send, Shift+Enter for newline)"}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
        />

        {/* Metadata toggle */}
        <button
          onClick={() => setMetaOpen((v) => !v)}
          disabled={disabled}
          className={cn(
            "shrink-0 transition-colors",
            metaOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Toggle metadata editor"
        >
          <SlidersHorizontalIcon className="size-4" />
        </button>

        <Button
          size="icon"
          className="size-8 shrink-0"
          onClick={handleSend}
          disabled={!text.trim() || disabled}
        >
          <SendIcon className="size-4" />
        </Button>
      </div>
    </div>
  );
}
