import { Badge } from "@/components/ui/badge";
import type { AgentCapabilities } from "@/lib/features/agents/agentsSlice";

interface AgentCapabilitiesProps {
  capabilities?: AgentCapabilities;
  defaultInputModes?: string[];
  defaultOutputModes?: string[];
}

export function AgentCapabilitiesBadges({
  capabilities,
  defaultInputModes,
  defaultOutputModes,
}: AgentCapabilitiesProps) {
  const capabilityBadges = [
    {
      label: "Streaming",
      active: !!capabilities?.streaming,
      title: "Server-Sent Events streaming (capabilities.streaming)",
    },
    {
      label: "Push Notifications",
      active: !!capabilities?.pushNotifications,
      title: "Async push notifications (capabilities.pushNotifications)",
    },
    {
      label: "State History",
      active: !!capabilities?.stateTransitionHistory,
      title: "State transition history (capabilities.stateTransitionHistory)",
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {capabilityBadges.map(({ label, active, title }) => (
          <Badge
            key={label}
            variant={active ? "default" : "outline"}
            title={title}
            className="text-xs"
          >
            {active ? "✓" : "✗"} {label}
          </Badge>
        ))}
      </div>
      {(defaultInputModes?.length || defaultOutputModes?.length) ? (
        <div className="text-xs text-muted-foreground space-y-1">
          {defaultInputModes && defaultInputModes.length > 0 && (
            <div>
              <span className="font-medium text-foreground">Input modes:</span>{" "}
              {defaultInputModes.join(", ")}
            </div>
          )}
          {defaultOutputModes && defaultOutputModes.length > 0 && (
            <div>
              <span className="font-medium text-foreground">Output modes:</span>{" "}
              {defaultOutputModes.join(", ")}
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
