import type { ToolCallItem } from "@/lib/features/chats/chatsSlice";
import {
  Search,
  ImageIcon,
  Download,
  Upload,
  Plus,
  Wrench,
  Loader2,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { Small, Caption } from "@/components/typography";

interface Props {
  item: ToolCallItem;
  onInspect?: () => void;
}

// Maps a tool name to { gerund, base } where gerund is used while running
// (e.g. "generating") and base is used in the error label (e.g. "generate failed").
function getToolVerbs(toolName: string): { gerund: string; base: string } {
  const firstWord = toolName.toLowerCase().split("_")[0];
  const map: Record<string, { gerund: string; base: string }> = {
    search: { gerund: "searching", base: "search" },
    generate: { gerund: "generating", base: "generate" },
    fetch: { gerund: "fetching", base: "fetch" },
    get: { gerund: "fetching", base: "fetch" },
    create: { gerund: "creating", base: "create" },
    upload: { gerund: "uploading", base: "upload" },
    download: { gerund: "downloading", base: "download" },
    send: { gerund: "sending", base: "send" },
    run: { gerund: "running", base: "run" },
    execute: { gerund: "executing", base: "execute" },
    process: { gerund: "processing", base: "process" },
  };
  if (map[firstWord]) return map[firstWord];
  // Generic fallback: strip trailing "e" before adding "ing" (e.g. "write" → "writing")
  const base = firstWord;
  const gerund = base.endsWith("e") ? `${base.slice(0, -1)}ing` : `${base}ing`;
  return { gerund, base };
}

function getToolIcon(toolName: string) {
  const lower = toolName.toLowerCase();
  const cls = "mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70";
  if (lower.includes("search")) return <Search className={cls} />;
  if (lower.includes("image") || lower.includes("generate")) return <ImageIcon className={cls} />;
  if (lower.includes("upload")) return <Upload className={cls} />;
  if (lower.includes("download") || lower.includes("fetch")) return <Download className={cls} />;
  if (lower.includes("create")) return <Plus className={cls} />;
  return <Wrench className={cls} />;
}

export function ToolCallBlock({ item, onInspect }: Props) {
  const { toolName, query, resultCount, phase } = item;

  const { gerund, base } = getToolVerbs(toolName);
  // Past-tense label shown when done (e.g. "searched", "generated")
  const doneLabel =
    resultCount != null ? `${resultCount} result${resultCount !== 1 ? "s" : ""}` : "done";

  const icon =
    phase === "running" ? (
      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-500" />
    ) : phase === "done" ? (
      <CheckCircle className="h-3.5 w-3.5 text-green-500" />
    ) : (
      <XCircle className="h-3.5 w-3.5 text-red-500" />
    );

  return (
    <div className="bg-muted/40 text-muted-foreground group relative flex w-fit max-w-full items-start gap-2 rounded-lg border px-3 py-2 text-xs sm:max-w-sm">
      {getToolIcon(toolName)}
      <div className="flex min-w-0 flex-col gap-1">
        <Small className="text-foreground/70">{toolName}</Small>
        <Caption className="break-words">
          <span className="text-muted-foreground/60">query: </span>
          {query}
        </Caption>
        <div className="flex items-center gap-1">
          {icon}
          {phase === "running" && <span>{gerund}…</span>}
          {phase === "done" && <span>{doneLabel}</span>}
          {phase === "error" && <span className="text-red-500">{base} failed</span>}
        </div>
      </div>
      {onInspect && (
        <button
          onClick={onInspect}
          className="bg-background text-muted-foreground hover:text-foreground absolute -top-2 -right-2 hidden size-5 items-center justify-center rounded-full border font-mono text-[10px] shadow-sm group-hover:flex"
          title="Inspect raw JSON"
        >
          {"{}"}
        </button>
      )}
    </div>
  );
}
