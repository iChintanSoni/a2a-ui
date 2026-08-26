import { memo } from "react";
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

const isImageTool = (toolName: string) =>
  toolName === "generate_image" || toolName.toLowerCase().includes("image");

function ImageShimmer() {
  return <div className="bg-muted mt-2 h-40 w-full max-w-xs animate-pulse rounded border" />;
}

export const ToolCallBlock = memo(function ToolCallBlock({ item, onInspect }: Props) {
  const { toolName, query, resultCount, phase, imageUrl } = item;

  const { gerund, base } = getToolVerbs(toolName);
  // Past-tense label shown when done (e.g. "searched", "generated")
  const doneLabel =
    resultCount != null ? `${resultCount} result${resultCount !== 1 ? "s" : ""}` : "done";

  const icon =
    phase === "running" ? (
      <Loader2 className="text-warning-foreground h-3.5 w-3.5 animate-spin" />
    ) : phase === "done" ? (
      <CheckCircle className="text-brand-soft-foreground h-3.5 w-3.5" />
    ) : (
      <XCircle className="text-destructive h-3.5 w-3.5" />
    );

  return (
    <div className="group bg-card relative flex w-fit max-w-full flex-col gap-1.5 rounded-[9px] border px-3.75 py-3.25 text-xs shadow-xs sm:max-w-sm">
      <div className="flex items-start gap-2">
        {getToolIcon(toolName)}
        <div className="flex min-w-0 flex-col gap-1.5">
          <Small className="text-foreground font-mono text-[12.5px] font-semibold">
            {toolName}
          </Small>
          <Caption className="text-[12.5px] break-words">
            <span className="text-fg-subtle">query: </span>
            {query}
          </Caption>
          <div className="text-brand-soft-foreground flex items-center gap-1.5 text-[11.5px] font-semibold">
            {icon}
            {phase === "running" && <span className="text-warning-foreground">{gerund}…</span>}
            {phase === "done" && <span>{doneLabel}</span>}
            {phase === "error" && <span className="text-destructive">{base} failed</span>}
          </div>
        </div>
        {onInspect && (
          <button
            onClick={onInspect}
            className="bg-background text-muted-foreground hover:text-foreground focus-visible:ring-ring absolute -top-2 -right-2 hidden size-5 items-center justify-center rounded-full border font-mono text-[10px] shadow-sm transition-colors group-focus-within:flex group-hover:flex focus-visible:flex focus-visible:ring-2"
            title="Inspect raw JSON"
            aria-label="Inspect raw JSON"
          >
            {"{}"}
          </button>
        )}
      </div>
      {isImageTool(toolName) && (
        <div className="mt-2">
          {phase === "running" && <ImageShimmer />}
          {phase === "done" && imageUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={query} className="max-w-full rounded border sm:max-w-xs" />
          )}
        </div>
      )}
    </div>
  );
});
