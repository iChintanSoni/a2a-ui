import { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Part } from "@a2a-js/sdk";
import { partsToPlainText } from "@/lib/a2a/parts";
import {
  ArchiveIcon,
  ArchiveRestoreIcon,
  CopyIcon,
  DownloadIcon,
  GitCompareArrowsIcon,
  PencilIcon,
  PinIcon,
  Trash2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageTitle, Muted, Caption, Small } from "@/components/typography";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import {
  removeChat,
  renameChat,
  setChatArchived,
  setChatPinned,
  cloneChat,
  type AgentMessageItem,
  type ArtifactItem,
  type Chat,
} from "@/lib/features/chats/chatsSlice";
import { buildChatTraceJson, buildChatTraceMarkdown } from "@/lib/utils/chatExport";

type ArchiveFilter = "active" | "archived" | "all";
type SortMode = "recent" | "title" | "agent";

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

function textOf(item: ArtifactItem | AgentMessageItem) {
  return item.parts
    .filter((part): part is Extract<Part, { kind: "text" }> => part.kind === "text")
    .map((part) => part.text)
    .join("");
}

function chatSearchText(chat: Chat) {
  return [
    chat.title,
    chat.agentName,
    chat.agentUrl,
    chat.lastMessage,
    ...chat.items.flatMap((item) => {
      if (item.kind === "user-message") return [partsToPlainText(item.parts)];
      if (item.kind === "artifact" || item.kind === "agent-message") return [textOf(item)];
      if (item.kind === "tool-call") return [item.toolName, item.query];
      if (item.kind === "task-status") return [item.state];
      return [];
    }),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function exportMarkdownTrace(chats: Chat[]) {
  const generatedAt = new Date().toISOString();
  const content = chats
    .map((chat) => buildChatTraceMarkdown({ chat, generatedAt }))
    .join("\n\n---\n\n");
  downloadFile("a2a-conversations-trace.md", content, "text/markdown");
}

function exportForensicJson(chats: Chat[]) {
  const generatedAt = new Date().toISOString();
  downloadFile(
    "a2a-conversations-trace.json",
    JSON.stringify(
      {
        version: 1,
        generatedAt,
        chats: chats.map((chat) => buildChatTraceJson({ chat, generatedAt })),
      },
      null,
      2,
    ),
    "application/json",
  );
}

export default function ConversationsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const chats = useAppSelector((state) => state.chats.chats);
  const [query, setQuery] = useState("");
  const [archiveFilter, setArchiveFilter] = useState<ArchiveFilter>("active");
  const [sort, setSort] = useState<SortMode>("recent");
  const [selected, setSelected] = useState<string[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const filteredChats = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return chats
      .filter((chat) => {
        if (archiveFilter === "active" && chat.archived) return false;
        if (archiveFilter === "archived" && !chat.archived) return false;
        if (normalizedQuery && !chatSearchText(chat).includes(normalizedQuery)) return false;
        return true;
      })
      .sort((a, b) => {
        if (Boolean(a.pinned) !== Boolean(b.pinned)) return a.pinned ? -1 : 1;
        if (sort === "title") return a.title.localeCompare(b.title);
        if (sort === "agent") return a.agentName.localeCompare(b.agentName);
        return b.timestamp - a.timestamp;
      });
  }, [archiveFilter, chats, query, sort]);

  const selectedChats = chats.filter((chat) => selected.includes(chat.id));
  const compareDisabledReason =
    selectedChats.length === 2
      ? null
      : selectedChats.length === 0
        ? "Select exactly two runs to compare."
        : `Select ${selectedChats.length > 2 ? "only" : "one more"} run to compare.`;
  const toggleSelected = (chatId: string) => {
    setSelected((prev) =>
      prev.includes(chatId) ? prev.filter((id) => id !== chatId) : [...prev, chatId]
    );
  };

  const startRename = (chat: Chat) => {
    setEditingId(chat.id);
    setEditingTitle(chat.title);
  };

  const saveRename = () => {
    if (editingId) {
      dispatch(renameChat({ chatId: editingId, title: editingTitle }));
    }
    setEditingId(null);
    setEditingTitle("");
  };

  return (
    <div className="flex min-w-0 flex-1 flex-col gap-6 overflow-y-auto p-4 sm:p-6 md:p-8">
      <div className="flex flex-col items-start justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <PageTitle>Conversations</PageTitle>
          <Muted>Search, rename, archive, delete, and export saved chats.</Muted>
        </div>
        <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
          <Button
            variant="outline"
            size="sm"
            disabled={selectedChats.length !== 2}
            title={compareDisabledReason ?? "Compare selected runs"}
            onClick={() =>
              navigate(
                `/dashboard/compare?left=${selectedChats[0].id}&right=${selectedChats[1].id}`,
              )
            }
          >
            <GitCompareArrowsIcon className="size-4" />
            Compare Runs
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedChats.length === 0}
            onClick={() =>
              downloadFile(
                "a2a-conversations.json",
                JSON.stringify(selectedChats, null, 2),
                "application/json"
              )
            }
          >
            <DownloadIcon className="size-4" />
            Export Raw JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedChats.length === 0}
            onClick={() => exportForensicJson(selectedChats)}
          >
            <DownloadIcon className="size-4" />
            Export Forensic JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={selectedChats.length === 0}
            onClick={() => exportMarkdownTrace(selectedChats)}
          >
            <DownloadIcon className="size-4" />
            Export Markdown Trace
          </Button>
        </div>
        {compareDisabledReason && (
          <Caption className="lg:w-full lg:text-right">{compareDisabledReason}</Caption>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-[1fr_180px_160px]">
        <Input placeholder="Search titles, agents, messages, or tool calls" value={query} onChange={(e) => setQuery(e.target.value)} />
        <Select value={archiveFilter} onValueChange={(value) => setArchiveFilter(value as ArchiveFilter)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="archived">Archived</SelectItem>
            <SelectItem value="all">All chats</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sort} onValueChange={(value) => setSort(value as SortMode)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="recent">Sort recent</SelectItem>
            <SelectItem value="title">Sort title</SelectItem>
            <SelectItem value="agent">Sort agent</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {filteredChats.length === 0 ? (
        <div className="rounded-md border border-dashed p-8 text-center">
          <Muted>No conversations match the current filters.</Muted>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredChats.map((chat) => (
            <div key={chat.id} className="min-w-0 rounded-md border p-4">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-1 items-start gap-3">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={selected.includes(chat.id)}
                    onChange={() => toggleSelected(chat.id)}
                    aria-label={`Select ${chat.title}`}
                  />
                  <div className="min-w-0 flex-1">
                    {editingId === chat.id ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)} />
                        <Button size="sm" onClick={saveRename}>Save</Button>
                      </div>
                    ) : (
                      <Small className="truncate">{chat.title}</Small>
                    )}
                    <Caption className="mt-1 block truncate">
                      {chat.agentName} · {new Date(chat.timestamp).toLocaleString()}
                    </Caption>
                    {chat.lastMessage && <Muted className="mt-2 line-clamp-2">{chat.lastMessage}</Muted>}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge variant={chat.archived ? "secondary" : "default"}>
                        {chat.archived ? "Archived" : "Active"}
                      </Badge>
                      {chat.pinned && <Badge variant="outline">Pinned</Badge>}
                      <Badge variant="outline">{chat.items.length} item{chat.items.length === 1 ? "" : "s"}</Badge>
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
                  <Button className="justify-center" size="sm" variant="outline" asChild>
                    <Link to={`/dashboard/chat/${chat.id}`}>Open</Link>
                  </Button>
                  <Button className="justify-center" size="sm" variant="outline" onClick={() => startRename(chat)}>
                    <PencilIcon className="size-4" />
                    Rename
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() =>
                      dispatch(setChatPinned({ chatId: chat.id, pinned: !chat.pinned }))
                    }
                  >
                    <PinIcon className="size-4" />
                    {chat.pinned ? "Unpin" : "Pin"}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      const nextChatId = crypto.randomUUID();
                      dispatch(cloneChat({ chatId: chat.id, newChatId: nextChatId, mode: "prompt" }));
                      navigate(`/dashboard/chat/${nextChatId}`);
                    }}
                    title={
                      chat.items.some((item) => item.kind === "user-message")
                        ? "Clone prompts into a fresh run"
                        : "Start a new run from this chat context"
                    }
                  >
                    <CopyIcon className="size-4" />
                    <span className="truncate">
                      {chat.items.some((item) => item.kind === "user-message") ? "Clone Prompt" : "New Run"}
                    </span>
                  </Button>
                  <Button
                    className="justify-center"
                    size="sm"
                    variant="outline"
                    onClick={() => dispatch(setChatArchived({ chatId: chat.id, archived: !chat.archived }))}
                  >
                    {chat.archived ? <ArchiveRestoreIcon className="size-4" /> : <ArchiveIcon className="size-4" />}
                    {chat.archived ? "Restore" : "Archive"}
                  </Button>
                  <Button
                    className="justify-center"
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (!window.confirm(`Delete "${chat.title}"? This cannot be undone.`)) return;
                      dispatch(removeChat(chat.id));
                      setSelected((prev) => prev.filter((id) => id !== chat.id));
                    }}
                  >
                    <Trash2Icon className="size-4" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
