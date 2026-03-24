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
    <main className="min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 bg-background relative overflow-hidden">
      <div className="absolute inset-0 z-0 bg-linear-to-br from-indigo-500/5 via-background to-cyan-500/5" />
      
      <div className="z-10 max-w-3xl w-full flex flex-col items-center text-center space-y-8 md:space-y-12 p-6 sm:p-10 rounded-3xl border bg-card/50 backdrop-blur-xl shadow-2xl">
        <div className="flex justify-center">
          <div className="p-6 bg-white rounded-3xl shadow-lg border">
            <Image
              src="/a2a-ui.svg"
              alt="A2A UI logo"
              width={220}
              height={60}
              priority
              className="object-contain"
            />
          </div>
        </div>
        
        <div className="space-y-6">
          <H1>Agent to Agent Network</H1>
          <Lead>
            A powerful platform to visualize, discover, and interact with specialized AI agents compliant with the A2A standard.
          </Lead>
        </div>

        <div className="w-full max-w-lg p-6 sm:p-8 bg-black/5 dark:bg-white/5 border rounded-2xl shadow-inner flex flex-col items-center space-y-6">
          <div className="space-y-2 text-center">
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
