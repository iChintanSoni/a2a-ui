import type { Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field, FieldGroup } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Muted } from "@/components/typography";
import { SaveIcon } from "lucide-react";
import type { AuthConfig } from "@/lib/features/agents/agentsSlice";

interface AuthTabProps {
  auth: AuthConfig;
  setAuth: Dispatch<SetStateAction<AuthConfig>>;
  handleAuthTypeChange: (type: AuthConfig["type"]) => void;
  authSaved: boolean;
  saveAuth: () => void;
}

export function AuthTab({ auth, setAuth, handleAuthTypeChange, authSaved, saveAuth }: AuthTabProps) {
  return (
    <>
      <Muted>Credentials are applied to every request sent to this agent.</Muted>

      <FieldGroup>
        <Field>
          <Label>Auth Type</Label>
          <Select
            value={auth.type}
            onValueChange={(v) =>
              handleAuthTypeChange(v as AuthConfig["type"])
            }
          >
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
              onChange={(e) =>
                setAuth({ ...auth, bearerToken: e.target.value })
              }
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
                onChange={(e) =>
                  setAuth({ ...auth, apiKeyHeader: e.target.value })
                }
              />
            </Field>
            <Field>
              <Label htmlFor="api-key-value">Key Value</Label>
              <Input
                id="api-key-value"
                type="password"
                placeholder="your-api-key"
                value={auth.apiKeyValue ?? ""}
                onChange={(e) =>
                  setAuth({ ...auth, apiKeyValue: e.target.value })
                }
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
                onChange={(e) =>
                  setAuth({ ...auth, basicUsername: e.target.value })
                }
              />
            </Field>
            <Field>
              <Label htmlFor="basic-pass">Password</Label>
              <Input
                id="basic-pass"
                type="password"
                placeholder="password"
                value={auth.basicPassword ?? ""}
                onChange={(e) =>
                  setAuth({ ...auth, basicPassword: e.target.value })
                }
              />
            </Field>
          </>
        )}
      </FieldGroup>

      <Button onClick={saveAuth} className="gap-2">
        <SaveIcon className="size-4" />
        {authSaved ? "Saved!" : "Save Auth"}
      </Button>
    </>
  );
}
