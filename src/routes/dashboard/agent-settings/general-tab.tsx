import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldGroup } from "@/components/ui/field";
import { Muted, Caption } from "@/components/typography";
import { SaveIcon } from "lucide-react";

interface GeneralTabProps {
  cardName: string;
  displayName: string;
  setDisplayName: (value: string) => void;
  tagText: string;
  setTagText: (value: string) => void;
  a2uiEnabled: boolean;
  setA2uiEnabled: (value: boolean) => void;
  displayNameSaved: boolean;
  setDisplayNameSaved: (value: boolean) => void;
  saveDisplayName: () => void;
}

export function GeneralTab({
  cardName,
  displayName,
  setDisplayName,
  tagText,
  setTagText,
  a2uiEnabled,
  setA2uiEnabled,
  displayNameSaved,
  setDisplayNameSaved,
  saveDisplayName,
}: GeneralTabProps) {
  return (
    <>
      <Muted>Customize how this agent appears in the UI.</Muted>
      <FieldGroup>
        <Field>
          <Label htmlFor="display-name">Display Name</Label>
          <Input
            id="display-name"
            placeholder={cardName}
            value={displayName}
            onChange={(e) => {
              setDisplayName(e.target.value);
              setDisplayNameSaved(false);
            }}
          />
        </Field>
        <Field>
          <Label htmlFor="agent-tags">Tags</Label>
          <Input
            id="agent-tags"
            placeholder="local, demo, research"
            value={tagText}
            onChange={(e) => {
              setTagText(e.target.value);
              setDisplayNameSaved(false);
            }}
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
              onChange={(event) => {
                setA2uiEnabled(event.target.checked);
                setDisplayNameSaved(false);
              }}
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
      <Button onClick={saveDisplayName} className="gap-2">
        <SaveIcon className="size-4" />
        {displayNameSaved ? "Saved!" : "Save"}
      </Button>
    </>
  );
}
