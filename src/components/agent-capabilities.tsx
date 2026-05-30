import { Badge } from "@/components/ui/badge";
import { Caption, Small } from "@/components/typography";
import type { AgentCard } from "@a2a-js/sdk";

interface AgentCapabilitiesProps {
  capabilities?: AgentCard["capabilities"];
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
        <div className="space-y-1">
          {defaultInputModes && defaultInputModes.length > 0 && (
            <Caption>
              <Small className="text-foreground">Input modes:</Small>{" "}
              {defaultInputModes.join(", ")}
            </Caption>
          )}
          {defaultOutputModes && defaultOutputModes.length > 0 && (
            <Caption>
              <Small className="text-foreground">Output modes:</Small>{" "}
              {defaultOutputModes.join(", ")}
            </Caption>
          )}
        </div>
      ) : null}
    </div>
  );
}
