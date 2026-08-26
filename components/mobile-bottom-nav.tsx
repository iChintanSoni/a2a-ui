"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BotIcon, HomeIcon, ListTodoIcon, MessageSquareIcon, NotebookTabsIcon } from "lucide-react";

import { useAppSelector } from "@/lib/hooks";
import { cn } from "@/lib/utils";

export function MobileBottomNav() {
  const pathname = usePathname();
  const chats = useAppSelector(state => state.chats.chats);
  const activeChatId = useAppSelector(state => state.chats.activeChatId);
  const latestChat = [...chats]
    .filter(chat => !chat.archived)
    .sort((a, b) => b.timestamp - a.timestamp)[0];
  const chatHref =
    activeChatId || latestChat?.id
      ? `/dashboard/chat/${activeChatId ?? latestChat?.id}`
      : "/dashboard/conversations";

  const items = [
    { label: "Home", href: "/dashboard", icon: HomeIcon, active: pathname === "/dashboard" },
    {
      label: "Agents",
      href: "/dashboard/agents",
      icon: BotIcon,
      active: pathname.startsWith("/dashboard/agents"),
    },
    {
      label: "Chat",
      href: chatHref,
      icon: MessageSquareIcon,
      active: pathname.startsWith("/dashboard/chat"),
    },
    {
      label: "Saved",
      href: "/dashboard/conversations",
      icon: NotebookTabsIcon,
      active: pathname.startsWith("/dashboard/conversations"),
    },
    {
      label: "Tasks",
      href: "/dashboard/tasks",
      icon: ListTodoIcon,
      active: pathname.startsWith("/dashboard/tasks"),
    },
  ];

  return (
    <nav
      aria-label="Primary navigation"
      className="bg-card fixed inset-x-0 bottom-0 z-30 flex h-[66px] items-stretch border-t px-1 pt-1.5 pb-[max(.5rem,env(safe-area-inset-bottom))] shadow-[0_-1px_3px_rgb(18_20_26/.04)] md:hidden"
    >
      {items.map(item => (
        <Link
          key={item.label}
          href={item.href}
          aria-current={item.active ? "page" : undefined}
          className={cn(
            "flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 text-[10px] font-semibold transition-colors",
            item.active ? "text-primary" : "text-fg-subtle hover:text-foreground",
          )}
        >
          <item.icon className="size-5" strokeWidth={1.7} />
          <span>{item.label}</span>
        </Link>
      ))}
    </nav>
  );
}
