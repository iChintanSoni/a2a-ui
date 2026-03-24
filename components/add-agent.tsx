"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ClientFactory } from "@a2a-js/sdk/client";
import { useAppDispatch } from "@/lib/hooks";
import { addAgent } from "@/lib/features/agents/agentsSlice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function AddAgent() {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("http://localhost:9000");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const dispatch = useAppDispatch();
  const router = useRouter();

  const handleAddAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const factory = new ClientFactory();
      const client = await factory.createFromUrl(url);
      const card = await client.getAgentCard();

      // Dispatch the successful connection to Redux
      dispatch(
        addAgent({
          url,
          card,
          status: "connected",
        })
      );

      setOpen(false); // Close dialog
      router.push("/dashboard"); // Redirect to dashboard
      
    } catch (err: unknown) {
      console.error("Failed to connect to agent:", err);
      if (err instanceof Error) {
        setError(
          err.message || 
          "Failed to connect to the agent. Ensure the server is running and the URL is correct."
        );
      } else {
        setError("Failed to connect to the agent. Ensure the server is running and the URL is correct.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add Agent</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <form onSubmit={handleAddAgent}>
          <DialogHeader>
            <DialogTitle>Add Agent</DialogTitle>
            <DialogDescription>Fill in the url of the agent.</DialogDescription>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <Label htmlFor="url-1">Url</Label>
              <Input
                id="url-1"
                name="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="http://localhost:9000"
                required
                disabled={loading}
              />
            </Field>
            {error && (
              <p className="text-sm font-medium text-destructive">{error}</p>
            )}
          </FieldGroup>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Connecting..." : "Add"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
