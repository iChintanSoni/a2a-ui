"use client";

import { useAppSelector } from "@/lib/hooks";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AddAgent } from "@/components/add-agent";
import { H2, Muted, P } from "@/components/typography";

export default function DashboardPage() {
  const agents = useAppSelector(state => state.agents.agents);

  return (
    <div className="flex-1 space-y-6 p-4 sm:p-6 md:p-8">
      <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
        <H2>Connected Agents</H2>
        <AddAgent />
      </div>

      {agents.length === 0 ? (
        <div className="bg-muted/10 flex h-75 flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center sm:p-8 md:h-100">
          <Muted>No agents connected yet.</Muted>
          <P className="text-muted-foreground mt-2 w-full text-sm sm:w-3/4 lg:w-1/2">
            Connect an agent compatible with the A2A standard to get started. You can provide the
            URL of any A2A server.
          </P>
          <div className="mt-6">
            <AddAgent />
          </div>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {agents.map(agent => (
            <Card key={agent.url} className="overflow-hidden transition-shadow hover:shadow-lg">
              <CardHeader className="flex flex-row items-start justify-between space-y-0 pb-2">
                <div className="space-y-1">
                  <CardTitle className="text-xl">{agent.card.name}</CardTitle>
                  <CardDescription className="max-w-50 truncate text-xs">
                    {agent.url}
                  </CardDescription>
                </div>
                <Badge variant={agent.status === "connected" ? "default" : "destructive"}>
                  {agent.status}
                </Badge>
              </CardHeader>
              <CardContent className="pt-4">
                <p className="text-muted-foreground text-sm">
                  {agent.card.description || "No description provided by this agent."}
                </p>
                <div className="text-muted-foreground mt-4 flex items-center space-x-2 text-xs">
                  <span className="text-foreground font-medium">Protocol:</span>
                  <span>v{agent.card.protocolVersion}</span>
                  <span className="border-l px-2">
                    <span className="text-foreground pr-1 font-medium">Agent:</span>v
                    {agent.card.version}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
