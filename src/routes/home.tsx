import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { BotIcon } from "lucide-react";
import { useAppSelector } from "@/lib/hooks";
import { AddAgent } from "@/components/add-agent";
import { H1, H2, Lead, Muted } from "@/components/typography";

export default function HomePage() {
  const agents = useAppSelector((state) => state.agents.agents);
  const navigate = useNavigate();

  useEffect(() => {
    if (agents.length > 0) {
      navigate("/dashboard");
    }
  }, [agents, navigate]);

  if (agents.length > 0) {
    return null;
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden p-4 sm:p-6">
      <div className="glass-panel z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col items-center overflow-y-auto rounded-3xl p-5 text-center sm:p-10">
        <div className="flex justify-center">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-20 items-center justify-center rounded-3xl shadow-lg">
            <BotIcon className="size-10" />
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-6 md:mt-12">
          <H1>Agent to Agent Network</H1>
          <Lead>
            A powerful platform to visualize, discover, and interact with specialized AI agents
            compliant with the A2A standard.
          </Lead>
        </div>

        <div className="glass-inset mt-8 flex w-full max-w-lg flex-col items-center gap-6 rounded-2xl p-5 sm:p-8 md:mt-12">
          <div className="flex flex-col gap-2 text-center">
            <H2>Connect an Agent</H2>
            <Muted>
              Provide the URL of an A2A-compliant agent server. We will auto-discover its
              capabilities using its agent card.
            </Muted>
          </div>
          <div className="flex w-full justify-center pb-2">
            <AddAgent />
          </div>
        </div>
      </div>
    </main>
  );
}
