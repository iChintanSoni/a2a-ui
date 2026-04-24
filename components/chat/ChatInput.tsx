import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from "react";
import {
  SendIcon,
  PaperclipIcon,
  SlidersHorizontalIcon,
  XIcon,
  PlusIcon,
  SquareIcon,
  BookmarkPlusIcon,
  RotateCcwIcon,
  MicIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { isAttachmentMode } from "@/lib/utils/modes";
import {
  extensionForMimeType,
  preferredAudioMimeType,
  supportsAudioInput,
} from "@/lib/a2a/modalities";
import type { PromptPreset } from "@/lib/features/workbench/workbenchSlice";
import type { OutgoingMessagePartInput } from "@/lib/a2a/types";

interface MetadataRow {
  key: string;
  value: string;
}

interface AttachmentPreview {
  file: File;
  previewUrl?: string; // only for images
}

interface DataPartDraft {
  id: string;
  value: string;
}

interface Props {
  onSend: (parts: OutgoingMessagePartInput[], metadata?: Record<string, string>) => void;
  onCancel?: () => void;
  disabled?: boolean;
  isStreaming?: boolean;
  isInputRequired?: boolean;
  /** Agent's defaultInputModes — controls whether the file picker is shown and which types are accepted */
  inputModes?: string[];
  promptPresets?: PromptPreset[];
  defaultMetadata?: Record<string, string>;
  onSavePromptPreset?: (text: string, metadata?: Record<string, string>) => void;
  onSaveDefaultMetadata?: (metadata: Record<string, string>) => void;
  onApplyPromptPreset?: (presetId: string) => void;
}

function rowsFromMetadata(metadata?: Record<string, string>): MetadataRow[] {
  const entries = Object.entries(metadata ?? {});
  return entries.length > 0
    ? entries.map(([key, value]) => ({ key, value }))
    : [{ key: "", value: "" }];
}

export function ChatInput({
  onSend,
  onCancel,
  disabled,
  isStreaming,
  isInputRequired,
  inputModes = [],
  promptPresets = [],
  defaultMetadata,
  onSavePromptPreset,
  onSaveDefaultMetadata,
  onApplyPromptPreset,
}: Props) {
  // Derive file-picker visibility and accepted MIME types from inputModes.
  // Text modes describe the message body; only non-text modes allow attachments.
  const acceptedMimeTypes = inputModes.filter(isAttachmentMode);
  const showFilePicker = acceptedMimeTypes.length > 0;
  const showVoiceInput = supportsAudioInput(inputModes);
  const acceptAttr = acceptedMimeTypes.join(",");
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Metadata state
  const [metaOpen, setMetaOpen] = useState(false);
  const [metaRows, setMetaRows] = useState<MetadataRow[]>(rowsFromMetadata(defaultMetadata));

  // Attachments state
  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [dataParts, setDataParts] = useState<DataPartDraft[]>([]);
  const [dataErrors, setDataErrors] = useState<Record<string, string>>({});
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "error">("idle");
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

  // Drag-and-drop state
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = (e: React.DragEvent) => {
    if (!showFilePicker) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    if (!showFilePicker) return;
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files);
    const previews: AttachmentPreview[] = files.map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((prev) => [...prev, ...previews]);
  };

  const handleSend = () => {
    if (disabled) return;

    const metadata = metaRows
      .filter((r) => r.key.trim())
      .reduce<Record<string, string>>((acc, r) => {
        acc[r.key.trim()] = r.value;
        return acc;
      }, {});

    const nextDataErrors: Record<string, string> = {};
    const parsedDataParts: Array<{ kind: "data"; data: Record<string, unknown> }> = [];
    for (const draft of dataParts) {
      const trimmedValue = draft.value.trim();
      if (!trimmedValue) {
        nextDataErrors[draft.id] = "Data parts cannot be empty.";
        continue;
      }

      try {
        const parsed = JSON.parse(trimmedValue) as unknown;
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
          nextDataErrors[draft.id] = "Data parts must be JSON objects.";
          continue;
        }
        parsedDataParts.push({ kind: "data", data: parsed as Record<string, unknown> });
      } catch {
        nextDataErrors[draft.id] = "Enter valid JSON before sending.";
      }
    }

    setDataErrors(nextDataErrors);
    if (Object.keys(nextDataErrors).length > 0) return;

    const trimmedText = text.trim();
    const parts: OutgoingMessagePartInput[] = [];
    if (trimmedText) parts.push({ kind: "text", text: trimmedText });
    if (attachments.length > 0) parts.push(...attachments.map((attachment) => attachment.file));
    parts.push(...parsedDataParts);

    if (parts.length === 0) return;

    onSend(parts, Object.keys(metadata).length > 0 ? metadata : undefined);

    setText("");
    setMetaRows(rowsFromMetadata(defaultMetadata));
    setMetaOpen(false);
    clearAttachments();
    setDataParts([]);
    setDataErrors({});
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

  const stopTracks = useCallback(() => {
    recordingStreamRef.current?.getTracks().forEach((track) => track.stop());
    recordingStreamRef.current = null;
  }, []);

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
  };

  const startRecording = async () => {
    if (!showVoiceInput || disabled || recordingState === "recording") return;
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setRecordingState("error");
      setRecordingError("Audio recording is not available in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = preferredAudioMimeType(inputModes);
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      recordingChunksRef.current = [];
      recordingStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) recordingChunksRef.current.push(event.data);
      };
      recorder.onstop = () => {
        const type = recorder.mimeType || mimeType || "audio/webm";
        const blob = new Blob(recordingChunksRef.current, { type });
        if (blob.size > 0 && mountedRef.current) {
          const file = new File(
            [blob],
            `voice-input-${new Date().toISOString().replace(/[:.]/g, "-")}.${extensionForMimeType(type)}`,
            { type },
          );
          setAttachments((prev) => [...prev, { file }]);
        }
        recordingChunksRef.current = [];
        mediaRecorderRef.current = null;
        stopTracks();
        if (mountedRef.current) setRecordingState("idle");
      };
      recorder.onerror = () => {
        stopTracks();
        if (!mountedRef.current) return;
        setRecordingState("error");
        setRecordingError("Audio recording failed.");
      };

      recorder.start();
      setRecordingError(null);
      setRecordingState("recording");
    } catch (error) {
      stopTracks();
      setRecordingState("error");
      setRecordingError(error instanceof Error ? error.message : "Microphone access failed.");
    }
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => {
      const updated = [...prev];
      const removed = updated.splice(index, 1)[0];
      if (removed.previewUrl) URL.revokeObjectURL(removed.previewUrl);
      return updated;
    });
  };

  const clearAttachments = useCallback(() => {
    setAttachments((prev) => {
      prev.forEach((attachment) => {
        if (attachment.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
      });
      return [];
    });
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      stopTracks();
      clearAttachments();
    };
  }, [clearAttachments, stopTracks]);

  const updateMetaRow = (index: number, field: "key" | "value", val: string) => {
    setMetaRows((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: val } : row))
    );
  };

  const addMetaRow = () => setMetaRows((prev) => [...prev, { key: "", value: "" }]);

  const addDataPart = () => {
    const id = crypto.randomUUID();
    setDataParts((prev) => [...prev, { id, value: "{}" }]);
    setDataErrors((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const updateDataPart = (id: string, value: string) => {
    setDataParts((prev) => prev.map((part) => (part.id === id ? { ...part, value } : part)));
    setDataErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const removeDataPart = (id: string) => {
    setDataParts((prev) => prev.filter((part) => part.id !== id));
    setDataErrors((prev) => {
      if (!(id in prev)) return prev;
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const formatDataPart = (id: string) => {
    const draft = dataParts.find((part) => part.id === id);
    const trimmedValue = draft?.value.trim();
    if (!trimmedValue) return;

    try {
      const parsed = JSON.parse(trimmedValue) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        setDataErrors((prev) => ({ ...prev, [id]: "Data parts must be JSON objects." }));
        return;
      }
      updateDataPart(id, JSON.stringify(parsed, null, 2));
    } catch {
      setDataErrors((prev) => ({ ...prev, [id]: "Enter valid JSON before sending." }));
    }
  };

  const removeMetaRow = (index: number) => {
    setMetaRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const currentMetadata = metaRows
    .filter((row) => row.key.trim())
    .reduce<Record<string, string>>((acc, row) => {
      acc[row.key.trim()] = row.value;
      return acc;
    }, {});

  const hasPromptDraft = text.trim().length > 0;
  const hasMetadataDraft = Object.keys(currentMetadata).length > 0;
  const hasDefaultMetadata = Object.keys(defaultMetadata ?? {}).length > 0;
  const hasDataDraft = dataParts.some((part) => part.value.trim().length > 0);
  const canSend = hasPromptDraft || attachments.length > 0 || hasDataDraft;

  const applyPromptPreset = (preset: PromptPreset) => {
    setText(preset.text);
    setMetaRows(rowsFromMetadata(preset.metadata));
    setMetaOpen(Boolean(preset.metadata && Object.keys(preset.metadata).length > 0));
    onApplyPromptPreset?.(preset.id);
    requestAnimationFrame(() => {
      textareaRef.current?.focus();
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
      }
    });
  };

  return (
    <div
      className={cn(
        "sticky bottom-0 z-20 flex shrink-0 flex-col gap-2 border-t bg-background px-3 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] transition-colors sm:px-4",
        isDragging && showFilePicker && "bg-primary/5 border-primary"
      )}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {promptPresets.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {promptPresets.slice(0, 6).map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPromptPreset(preset)}
              disabled={disabled}
              className="rounded-full border bg-muted/40 px-2.5 py-1 text-xs text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
              title={preset.text}
            >
              {preset.label}
            </button>
          ))}
        </div>
      )}

      {/* input-required banner */}
      {isInputRequired && (
        <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-300">
          <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
          Responding to agent — your message will continue the current task
        </div>
      )}

      {recordingError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          {recordingError}
        </div>
      )}

      {/* Attachment previews — only shown when file picker is available */}
      {showFilePicker && attachments.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {attachments.map((a, i) => (
            <div key={i} className="relative flex max-w-full items-center gap-1.5 rounded-lg border bg-muted/50 px-2 py-1.5 text-xs sm:max-w-45">
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

      {dataParts.length > 0 && (
        <div className="flex flex-col gap-2 rounded-lg border bg-muted/20 px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-medium text-muted-foreground">Data parts</p>
            <button
              onClick={addDataPart}
              disabled={disabled}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <PlusIcon className="size-3" />
              Add another
            </button>
          </div>

          {dataParts.map((part, index) => (
            <div key={part.id} className="rounded-lg border bg-background/90 p-2">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-xs font-medium">Data part {index + 1}</p>
                <button
                  onClick={() => removeDataPart(part.id)}
                  className="text-muted-foreground hover:text-foreground"
                  aria-label={`Remove data part ${index + 1}`}
                >
                  <XIcon className="size-3.5" />
                </button>
              </div>
              <Textarea
                rows={6}
                value={part.value}
                onChange={(e) => updateDataPart(part.id, e.target.value)}
                onBlur={() => formatDataPart(part.id)}
                spellCheck={false}
                className="min-h-28 resize-y border-0 bg-transparent px-0 py-0 font-mono text-xs shadow-none focus-visible:ring-0"
                placeholder={'{\n  "type": "search",\n  "query": "hello"\n}'}
              />
              <div className="mt-2 flex items-center justify-between gap-2">
                <p className="text-[11px] text-muted-foreground">
                  Sent as an A2A `DataPart`. Use a JSON object payload.
                </p>
                <button
                  onClick={() => formatDataPart(part.id)}
                  className="text-[11px] text-muted-foreground hover:text-foreground"
                  disabled={!part.value.trim()}
                >
                  Format JSON
                </button>
              </div>
              {dataErrors[part.id] && (
                <p className="mt-2 text-[11px] text-destructive">{dataErrors[part.id]}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Metadata editor */}
      {metaOpen && (
        <div className="rounded-lg border bg-muted/20 px-3 py-2 flex flex-col gap-2">
          <p className="text-xs font-medium text-muted-foreground">Message metadata</p>
          {metaRows.map((row, i) => (
            <div key={i} className="flex flex-col gap-1.5 sm:flex-row sm:items-center">
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
          <div className="flex flex-wrap items-center gap-2">
            {hasDefaultMetadata && (
              <button
                onClick={() => setMetaRows(rowsFromMetadata(defaultMetadata))}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <RotateCcwIcon className="size-3" />
                Apply agent defaults
              </button>
            )}
            {hasMetadataDraft && onSaveDefaultMetadata && (
              <button
                onClick={() => onSaveDefaultMetadata(currentMetadata)}
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <BookmarkPlusIcon className="size-3" />
                Save as agent defaults
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main input row */}
      <div className="flex min-h-12 min-w-0 items-end gap-1.5 rounded-xl border bg-muted/30 px-2 py-2 focus-within:ring-1 focus-within:ring-ring sm:gap-2 sm:px-3">
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
                "flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
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
          className="max-h-40 min-h-8 min-w-0 flex-1 resize-none bg-transparent py-1.5 text-sm leading-5 outline-none placeholder:text-muted-foreground"
          placeholder={isInputRequired ? "Respond to agent… (Enter to send)" : "Message agent… (Enter to send, Shift+Enter for newline)"}
          rows={1}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onInput={handleInput}
          disabled={disabled}
        />

        <button
          onClick={addDataPart}
          disabled={disabled}
          className={cn(
            "flex h-8 shrink-0 items-center rounded-md border px-2 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          title="Add a JSON data part"
        >
          JSON
        </button>

        {/* Metadata toggle */}
        <button
          onClick={() => setMetaOpen((v) => !v)}
          disabled={disabled}
          className={cn(
            "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
            metaOpen ? "text-foreground" : "text-muted-foreground hover:text-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          aria-label="Toggle metadata editor"
        >
          <SlidersHorizontalIcon className="size-4" />
        </button>

        {onSavePromptPreset && (
          <button
            onClick={() =>
              onSavePromptPreset(text.trim(), hasMetadataDraft ? currentMetadata : undefined)
            }
            disabled={!hasPromptDraft || disabled}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
              hasPromptDraft
                ? "text-muted-foreground hover:text-foreground"
                : "text-muted-foreground/50",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            title="Save as repeatable prompt"
            aria-label="Save prompt preset"
          >
            <BookmarkPlusIcon className="size-4" />
          </button>
        )}

        {showVoiceInput && (
          <button
            onClick={recordingState === "recording" ? stopRecording : startRecording}
            disabled={disabled}
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-md transition-colors",
              recordingState === "recording"
                ? "text-red-600"
                : "text-muted-foreground hover:text-foreground",
              disabled && "opacity-50 cursor-not-allowed",
            )}
            title={recordingState === "recording" ? "Stop recording" : "Record voice input"}
            aria-label={recordingState === "recording" ? "Stop recording" : "Record voice input"}
          >
            <MicIcon className={cn("size-4", recordingState === "recording" && "animate-pulse")} />
          </button>
        )}

        {isStreaming ? (
          <Button
            size="icon"
            className="size-8 shrink-0 bg-red-500 text-white hover:bg-red-600"
            onClick={onCancel}
            title="Stop generating"
          >
            <SquareIcon className="size-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="size-8 shrink-0"
            onClick={handleSend}
            disabled={!canSend || disabled}
          >
            <SendIcon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
