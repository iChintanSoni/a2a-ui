import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import {
  SendIcon,
  PaperclipIcon,
  SlidersHorizontalIcon,
  SquareIcon,
  BookmarkPlusIcon,
  MicIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { isAttachmentMode } from "@/lib/utils/modes";
import {
  extensionForMimeType,
  preferredAudioMimeType,
  supportsAudioInput,
} from "@/lib/a2a/modalities";
import type { PromptPreset } from "@/lib/features/workbench/workbenchSlice";
import type { OutgoingMessagePartInput } from "@/lib/a2a/types";
import { getErrorMessage } from "@/lib/utils/error";
import { PromptPresets } from "./PromptPresets";
import { AttachmentPreviews } from "./AttachmentPreviews";
import { DataPartEditor } from "./DataPartEditor";
import { MetadataEditor } from "./MetadataEditor";

export interface MetadataRow {
  key: string;
  value: string;
}

export interface AttachmentPreview {
  file: File;
  previewUrl?: string;
}

export interface DataPartDraft {
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

const MAX_TEXTAREA_HEIGHT = 160;

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
  const acceptedMimeTypes = inputModes.filter(isAttachmentMode);
  const showFilePicker = acceptedMimeTypes.length > 0;
  const showVoiceInput = supportsAudioInput(inputModes);
  const acceptAttr = acceptedMimeTypes.join(",");

  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [metaOpen, setMetaOpen] = useState(false);
  const [metaRows, setMetaRows] = useState<MetadataRow[]>(rowsFromMetadata(defaultMetadata));

  const [attachments, setAttachments] = useState<AttachmentPreview[]>([]);
  const [dataParts, setDataParts] = useState<DataPartDraft[]>([]);
  const [dataErrors, setDataErrors] = useState<Record<string, string>>({});
  const [recordingState, setRecordingState] = useState<"idle" | "recording" | "error">("idle");
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordingChunksRef = useRef<BlobPart[]>([]);
  const recordingStreamRef = useRef<MediaStream | null>(null);
  const mountedRef = useRef(true);

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
    if (attachments.length > 0) parts.push(...attachments.map((a) => a.file));
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
    el.style.height = `${Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const previews: AttachmentPreview[] = files.map((file) => ({
      file,
      previewUrl: file.type.startsWith("image/") ? URL.createObjectURL(file) : undefined,
    }));
    setAttachments((prev) => [...prev, ...previews]);
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
      setRecordingError(getErrorMessage(error, "Microphone access failed."));
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
      prev.forEach((a) => { if (a.previewUrl) URL.revokeObjectURL(a.previewUrl); });
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
    setMetaRows((prev) => prev.map((row, i) => (i === index ? { ...row, [field]: val } : row)));
  };

  const addMetaRow = () => setMetaRows((prev) => [...prev, { key: "", value: "" }]);

  const removeMetaRow = (index: number) => {
    setMetaRows((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const addDataPart = () => {
    const id = crypto.randomUUID();
    setDataParts((prev) => [...prev, { id, value: "{}" }]);
    setDataErrors((prev) => { const next = { ...prev }; delete next[id]; return next; });
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

  const currentMetadata = useMemo(
    () =>
      metaRows
        .filter((row) => row.key.trim())
        .reduce<Record<string, string>>((acc, row) => {
          acc[row.key.trim()] = row.value;
          return acc;
        }, {}),
    [metaRows],
  );

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
        textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, MAX_TEXTAREA_HEIGHT)}px`;
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
      <PromptPresets presets={promptPresets} disabled={disabled} onApply={applyPromptPreset} />

      {isInputRequired && (
        <div className="flex items-center gap-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-300">
          <span className="size-1.5 rounded-full bg-blue-500 shrink-0" />
          Responding to agent — your message will continue the current task
        </div>
      )}

      {recordingError && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-1.5 text-xs text-destructive">
          <span className="flex-1">{recordingError}</span>
          <button
            onClick={() => { setRecordingError(null); setRecordingState("idle"); startRecording(); }}
            className="shrink-0 underline hover:no-underline"
          >
            Try again
          </button>
        </div>
      )}

      {showFilePicker && (
        <AttachmentPreviews attachments={attachments} onRemove={removeAttachment} />
      )}

      <DataPartEditor
        parts={dataParts}
        errors={dataErrors}
        disabled={disabled}
        onAdd={addDataPart}
        onUpdate={updateDataPart}
        onRemove={removeDataPart}
        onFormat={formatDataPart}
      />

      {metaOpen && (
        <MetadataEditor
          rows={metaRows}
          hasDefaultMetadata={hasDefaultMetadata}
          hasMetadataDraft={hasMetadataDraft}
          currentMetadata={currentMetadata}
          onUpdateRow={updateMetaRow}
          onAddRow={addMetaRow}
          onRemoveRow={removeMetaRow}
          onApplyDefaults={() => setMetaRows(rowsFromMetadata(defaultMetadata))}
          onSaveDefaults={onSaveDefaultMetadata}
        />
      )}

      <div className="flex min-h-12 min-w-0 items-end gap-1.5 rounded-xl border bg-muted/30 px-2 py-2 focus-within:ring-1 focus-within:ring-ring sm:gap-2 sm:px-3">
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
          aria-label={isInputRequired ? "Respond to agent" : "Message agent"}
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
          aria-label="Add JSON data part"
        >
          JSON
        </button>

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
            aria-label="Stop generating"
          >
            <SquareIcon className="size-3.5 fill-current" />
          </Button>
        ) : (
          <Button
            size="icon"
            className="size-8 shrink-0"
            onClick={handleSend}
            disabled={!canSend || disabled}
            aria-label="Send message"
            title="Send message"
          >
            <SendIcon className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
