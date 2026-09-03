"use client";

import { agentCardTransport } from "@/lib/a2a/agent-card";
import { useMemo, useState } from "react";
import {
  BotIcon,
  CheckIcon,
  CompassIcon,
  DownloadIcon,
  SearchIcon,
  SparklesIcon,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Caption, Muted, Small } from "@/components/typography";
import { useAppDispatch, useAppSelector } from "@/lib/hooks";
import { addAgent } from "@/lib/features/agents/agentsSlice";
import { importChat } from "@/lib/features/chats/chatsSlice";
import { CURATED_AGENT_PRESETS } from "@/lib/presets/data";
import { importPresetToWorkspace } from "@/lib/presets/presetUtils";
import type { AgentPreset, PresetCategory } from "@/lib/presets/types";
import { useToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import { AgentCardViewer } from "@/components/agent-card-viewer";

const CATEGORIES: { label: string; value: PresetCategory }[] = [
  { label: "All", value: "all" },
  { label: "Local", value: "local" },
  { label: "Remote", value: "remote" },
  { label: "Research", value: "research" },
  { label: "Productivity", value: "productivity" },
];

interface PresetGalleryModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: React.ReactNode;
}

export function PresetGalleryModal({
  open: controlledOpen,
  onOpenChange: setControlledOpen,
  trigger,
}: PresetGalleryModalProps) {
  const dispatch = useAppDispatch();
  const existingAgents = useAppSelector(state => state.agents.agents);
  const { toast } = useToast();

  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;
  const setOpen = isControlled ? setControlledOpen! : setUncontrolledOpen;

  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<PresetCategory>("all");
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  const filteredPresets = useMemo(() => {
    const query = search.trim().toLowerCase();
    return CURATED_AGENT_PRESETS.filter(preset => {
      if (selectedCategory !== "all" && preset.category !== selectedCategory) {
        return false;
      }
      if (!query) return true;
      const searchable = [
        preset.name,
        preset.summary,
        preset.description,
        ...preset.tags,
        ...(preset.agent.card.skills ?? []).flatMap(s => [
          s.name,
          s.description,
          ...(s.tags ?? []),
        ]),
      ]
        .join(" ")
        .toLowerCase();
      return searchable.includes(query);
    });
  }, [search, selectedCategory]);

  const handleImport = (preset: AgentPreset) => {
    try {
      const { agent, chats, isUpdate } = importPresetToWorkspace(preset, existingAgents);
      dispatch(addAgent(agent));
      for (const chat of chats) {
        dispatch(importChat(chat));
      }
      setImportedIds(prev => new Set([...prev, preset.id]));
      toast({
        type: "success",
        message: isUpdate
          ? `Updated connection for '${preset.name}'.`
          : `Imported '${preset.name}' into your workspace.`,
      });
    } catch (err) {
      toast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to import preset.",
      });
    }
  };

  const handleImportAll = () => {
    try {
      let count = 0;
      for (const preset of CURATED_AGENT_PRESETS) {
        const { agent, chats } = importPresetToWorkspace(preset, existingAgents);
        dispatch(addAgent(agent));
        for (const chat of chats) {
          dispatch(importChat(chat));
        }
        count++;
      }
      setImportedIds(new Set(CURATED_AGENT_PRESETS.map(p => p.id)));
      toast({
        type: "success",
        message: `Successfully imported ${count} example agents into your workspace.`,
      });
    } catch (err) {
      toast({
        type: "error",
        message: err instanceof Error ? err.message : "Failed to import all presets.",
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <DialogTrigger asChild>{trigger}</DialogTrigger>
      ) : (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="gap-1.5">
            <CompassIcon className="text-brand-soft-foreground size-4" />
            Example Gallery
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-4xl flex-col p-0">
        <DialogHeader className="border-b px-6 py-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <SparklesIcon className="text-primary size-5" />
                <DialogTitle className="text-lg font-bold">Example Agent Gallery</DialogTitle>
              </div>
              <DialogDescription className="text-xs">
                Explore and import curated A2A agent configurations directly into your workspace.
              </DialogDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={handleImportAll}
              className="gap-1.5 self-start sm:self-auto"
            >
              <DownloadIcon className="size-3.5" />
              Import All Examples
            </Button>
          </div>

          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <SearchIcon className="text-fg-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <input
                className="bg-background placeholder:text-muted-foreground focus-visible:ring-ring h-9 w-full rounded-md border ps-9 pe-3 text-xs outline-none focus-visible:ring-2"
                placeholder="Search example agents, skills, or tags…"
                aria-label="Search example agents, skills, or tags"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
            <div
              className="flex flex-wrap gap-1"
              role="toolbar"
              aria-label="Filter preset categories"
            >
              {CATEGORIES.map(cat => (
                <button
                  key={cat.value}
                  onClick={() => setSelectedCategory(cat.value)}
                  aria-pressed={selectedCategory === cat.value}
                  className={cn(
                    "focus-visible:ring-ring rounded-md px-2.5 py-1 text-xs font-medium transition-colors focus-visible:ring-1 focus-visible:outline-hidden",
                    selectedCategory === cat.value
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 overflow-y-auto p-6">
          {filteredPresets.length === 0 ? (
            <div className="flex min-h-48 flex-col items-center justify-center rounded-lg border border-dashed p-6 text-center">
              <Muted>No example presets match your search.</Muted>
              <Caption className="mt-1">
                Try another search query or select &ldquo;All&rdquo;.
              </Caption>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredPresets.map(preset => {
                const isAlreadyInWorkspace = existingAgents.some(a => a.url === preset.agent.url);
                const wasImportedThisSession = importedIds.has(preset.id);
                const transport = agentCardTransport(preset.agent.card);

                return (
                  <div
                    key={preset.id}
                    className="bg-card hover:border-border-strong flex flex-col justify-between rounded-lg border p-4 shadow-xs transition-colors"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <div className="bg-brand-soft text-brand-soft-foreground flex size-8 shrink-0 items-center justify-center rounded-md">
                            <BotIcon className="size-4" />
                          </div>
                          <div>
                            <span className="text-foreground block text-sm font-bold">
                              {preset.name}
                            </span>
                            <span className="text-fg-subtle font-mono text-[11px]">
                              {preset.agent.url}
                            </span>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-[10px] capitalize">
                          {preset.category}
                        </Badge>
                      </div>

                      <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                        {preset.summary}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-1">
                        <Badge variant="secondary" className="font-mono text-[10px]">
                          {transport}
                        </Badge>
                        {(preset.agent.card.skills ?? []).map(skill => (
                          <Badge key={skill.id} variant="outline" className="text-[10px]">
                            {skill.name}
                          </Badge>
                        ))}
                      </div>

                      {preset.samplePrompts && preset.samplePrompts.length > 0 && (
                        <div className="mt-3">
                          <Small className="text-fg-subtle text-[11px]">Sample Prompts:</Small>
                          <div className="mt-1 flex flex-col gap-1">
                            {preset.samplePrompts.slice(0, 2).map((prompt, i) => (
                              <div
                                key={i}
                                className="bg-surface-2 text-muted-foreground truncate rounded px-2 py-1 font-mono text-[10.5px]"
                                title={prompt}
                              >
                                &ldquo;{prompt}&rdquo;
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="mt-3">
                        <AgentCardViewer card={preset.agent.card} />
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t pt-3">
                      <Caption className="text-[11px]">
                        {isAlreadyInWorkspace ? "Connected in workspace" : "Ready to import"}
                      </Caption>
                      <Button
                        size="sm"
                        variant={
                          wasImportedThisSession
                            ? "outline"
                            : isAlreadyInWorkspace
                              ? "secondary"
                              : "default"
                        }
                        className="gap-1.5"
                        onClick={() => handleImport(preset)}
                      >
                        {wasImportedThisSession ? (
                          <>
                            <CheckIcon className="text-primary size-3.5" />
                            Imported
                          </>
                        ) : isAlreadyInWorkspace ? (
                          "Update Connection"
                        ) : (
                          <>
                            <DownloadIcon className="size-3.5" />
                            Import Preset
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
