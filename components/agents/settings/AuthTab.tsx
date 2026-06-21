import { SaveIcon } from "lucide-react";
import type { AuthConfig } from "@/lib/features/agents/agentsSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldGroup } from "@/components/ui/field";
import { Muted } from "@/components/typography";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  auth: AuthConfig;
  saved: boolean;
  onAuthChange: (auth: AuthConfig) => void;
  onSave: () => void;
}

export function AuthTab({ auth, saved, onAuthChange, onSave }: Props) {
  const handleTypeChange = (type: AuthConfig["type"]) => onAuthChange({ type });

  return (
    <div className="mt-6 space-y-6">
      <Muted>Credentials are applied to every request sent to this agent.</Muted>

      <FieldGroup>
        <Field>
          <Label>Auth Type</Label>
          <Select value={auth.type} onValueChange={(v) => handleTypeChange(v as AuthConfig["type"])}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              <SelectItem value="bearer">Bearer Token</SelectItem>
              <SelectItem value="api-key">API Key</SelectItem>
              <SelectItem value="basic">Basic Auth</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        {auth.type === "bearer" && (
          <Field>
            <Label htmlFor="bearer-token">Token</Label>
            <Input
              id="bearer-token"
              type="password"
              placeholder="your-token"
              value={auth.bearerToken ?? ""}
              onChange={(e) => onAuthChange({ ...auth, bearerToken: e.target.value })}
            />
          </Field>
        )}

        {auth.type === "api-key" && (
          <>
            <Field>
              <Label htmlFor="api-key-header">Header Name</Label>
              <Input
                id="api-key-header"
                placeholder="X-API-Key"
                value={auth.apiKeyHeader ?? ""}
                onChange={(e) => onAuthChange({ ...auth, apiKeyHeader: e.target.value })}
              />
            </Field>
            <Field>
              <Label htmlFor="api-key-value">Key Value</Label>
              <Input
                id="api-key-value"
                type="password"
                placeholder="your-api-key"
                value={auth.apiKeyValue ?? ""}
                onChange={(e) => onAuthChange({ ...auth, apiKeyValue: e.target.value })}
              />
            </Field>
          </>
        )}

        {auth.type === "basic" && (
          <>
            <Field>
              <Label htmlFor="basic-user">Username</Label>
              <Input
                id="basic-user"
                placeholder="username"
                value={auth.basicUsername ?? ""}
                onChange={(e) => onAuthChange({ ...auth, basicUsername: e.target.value })}
              />
            </Field>
            <Field>
              <Label htmlFor="basic-pass">Password</Label>
              <Input
                id="basic-pass"
                type="password"
                placeholder="password"
                value={auth.basicPassword ?? ""}
                onChange={(e) => onAuthChange({ ...auth, basicPassword: e.target.value })}
              />
            </Field>
          </>
        )}
      </FieldGroup>

      <Button onClick={onSave} className="gap-2">
        <SaveIcon className="size-4" />
        {saved ? "Saved!" : "Save Auth"}
      </Button>
    </div>
  );
}
