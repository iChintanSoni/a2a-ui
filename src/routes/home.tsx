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
    <main className="bg-background relative flex min-h-dvh flex-col items-center justify-center overflow-hidden p-4 sm:p-6">
      <div className="via-background absolute inset-0 z-0 bg-linear-to-br from-indigo-500/5 to-cyan-500/5" />

      <div className="bg-card/50 z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col items-center overflow-y-auto rounded-3xl border p-5 text-center shadow-2xl backdrop-blur-xl sm:p-10">
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

        <div className="mt-8 flex w-full max-w-lg flex-col items-center gap-6 rounded-2xl border bg-black/5 p-5 shadow-inner sm:p-8 md:mt-12 dark:bg-white/5">
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
