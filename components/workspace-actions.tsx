"use client";

import { useRef, useState } from "react";
import { DownloadIcon, UploadIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { addAgent } from "@/lib/features/agents/agentsSlice";
import { importChat } from "@/lib/features/chats/chatsSlice";
import {
  buildWorkspaceExport,
  normalizeImportedAgent,
  normalizeImportedChat,
  parseWorkspaceImport,
} from "@/lib/utils/workspace";
import { useToast } from "@/lib/toast";

function downloadFile(name: string, content: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export function WorkspaceActions() {
  const dispatch = useAppDispatch();
  const agents = useAppSelector((state) => state.agents.agents);
  const chats = useAppSelector((state) => state.chats.chats);
  const importRef = useRef<HTMLInputElement>(null);
  const [includeChats, setIncludeChats] = useState(true);
  const { toast } = useToast();

  const exportWorkspace = () => {
    const workspace = buildWorkspaceExport({ agents, chats, includeChats });
    downloadFile(
      "a2a-workspace.json",
      JSON.stringify(workspace, null, 2),
      "application/json"
    );
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      try {
        const workspace = parseWorkspaceImport(JSON.parse(reader.result as string));
        for (const agent of workspace.agents) {
          if (agent?.url && agent?.card) {
            dispatch(addAgent(normalizeImportedAgent(agent)));
          }
        }
        for (const chat of workspace.chats ?? []) {
          if (chat?.agentUrl && chat?.title) {
            dispatch(importChat(normalizeImportedChat(chat)));
          }
        }
        toast({ type: "success", message: "Workspace imported." });
      } catch (err) {
        toast({
          type: "error",
          message: err instanceof Error ? err.message : "Could not import workspace.",
        });
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={importRef}
        type="file"
        accept=".json,application/json"
        className="hidden"
        onChange={handleImport}
      />
      <Label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={includeChats}
          onChange={(e) => setIncludeChats(e.target.checked)}
        />
        Include chats
      </Label>
      <Button
        variant="outline"
        size="sm"
        onClick={exportWorkspace}
        title="Export agents and workspace data without secrets"
      >
        <DownloadIcon className="size-4" />
        Export Workspace
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => importRef.current?.click()}
        title="Import workspace JSON"
      >
        <UploadIcon className="size-4" />
        Import
      </Button>
    </div>
  );
}
