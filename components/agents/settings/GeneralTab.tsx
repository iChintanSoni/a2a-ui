import type { AgentCard } from "@a2a-js/sdk";
import { SaveIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldGroup } from "@/components/ui/field";
import { Caption, Muted } from "@/components/typography";

interface Props {
  agentCard: AgentCard;
  displayName: string;
  tagText: string;
  a2uiEnabled: boolean;
  saved: boolean;
  onDisplayNameChange: (v: string) => void;
  onTagTextChange: (v: string) => void;
  onA2UIEnabledChange: (v: boolean) => void;
  onSave: () => void;
}

export function GeneralTab({
  agentCard,
  displayName,
  tagText,
  a2uiEnabled,
  saved,
  onDisplayNameChange,
  onTagTextChange,
  onA2UIEnabledChange,
  onSave,
}: Props) {
  return (
    <div className="mt-6 space-y-6">
      <Muted>Customize how this agent appears in the UI.</Muted>
      <FieldGroup>
        <Field>
          <Label htmlFor="display-name">Display Name</Label>
          <Input
            id="display-name"
            placeholder={agentCard.name}
            value={displayName}
            onChange={(e) => onDisplayNameChange(e.target.value)}
          />
        </Field>
        <Field>
          <Label htmlFor="agent-tags">Tags</Label>
          <Input
            id="agent-tags"
            placeholder="local, demo, research"
            value={tagText}
            onChange={(e) => onTagTextChange(e.target.value)}
          />
          <Caption>Separate tags with commas.</Caption>
        </Field>
        <Field>
          <div className="flex items-start gap-3 rounded-md border px-3 py-3">
            <input
              id="a2ui-enabled"
              type="checkbox"
              className="mt-0.5 size-4"
              checked={a2uiEnabled}
              onChange={(e) => onA2UIEnabledChange(e.target.checked)}
            />
            <div className="space-y-1">
              <Label htmlFor="a2ui-enabled">Enable A2UI read-only surfaces</Label>
              <Caption>
                Sends the A2UI extension header and renders supported structured payloads safely.
              </Caption>
            </div>
          </div>
        </Field>
      </FieldGroup>
      <Button onClick={onSave} className="gap-2">
        <SaveIcon className="size-4" />
        {saved ? "Saved!" : "Save"}
      </Button>
    </div>
  );
}
