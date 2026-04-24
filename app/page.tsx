"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { useAppSelector } from "@/lib/hooks";
import { AddAgent } from "@/components/add-agent";
import { H1, H2, Lead, Muted } from "@/components/typography";

export default function HomePage() {
  const agents = useAppSelector((state) => state.agents.agents);
  const router = useRouter();

  useEffect(() => {
    if (agents.length > 0) {
      router.push("/dashboard");
    }
  }, [agents, router]);

  if (agents.length > 0) {
    return null;
  }

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-background p-4 sm:p-6">
      <div className="absolute inset-0 z-0 bg-linear-to-br from-indigo-500/5 via-background to-cyan-500/5" />
      
      <div className="z-10 flex max-h-[calc(100dvh-2rem)] w-full max-w-3xl flex-col items-center overflow-y-auto rounded-3xl border bg-card/50 p-5 text-center shadow-2xl backdrop-blur-xl sm:p-10">
        <div className="flex justify-center">
          <div className="rounded-3xl border bg-white p-4 shadow-lg sm:p-6">
            <Image
              src="/a2a-ui.svg"
              alt="A2A UI logo"
              width={220}
              height={60}
              priority
              className="h-auto max-w-full object-contain"
            />
          </div>
        </div>
        
        <div className="mt-8 flex flex-col gap-6 md:mt-12">
          <H1>Agent to Agent Network</H1>
          <Lead>
            A powerful platform to visualize, discover, and interact with specialized AI agents compliant with the A2A standard.
          </Lead>
        </div>

        <div className="mt-8 flex w-full max-w-lg flex-col items-center gap-6 rounded-2xl border bg-black/5 p-5 shadow-inner dark:bg-white/5 sm:p-8 md:mt-12">
          <div className="flex flex-col gap-2 text-center">
             <H2>Connect an Agent</H2>
             <Muted>
               Provide the URL of an A2A-compliant agent server. We will auto-discover its capabilities using its agent card.
             </Muted>
          </div>
          <div className="w-full flex justify-center pb-2">
            <AddAgent />
          </div>
        </div>
      </div>
    </main>
  );
}
