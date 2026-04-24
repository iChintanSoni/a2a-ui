import type { Metadata } from "next";
import "./globals.css";
import "highlight.js/styles/github.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import StoreProvider from "./StoreProvider";
import { ToastProvider } from "@/lib/toast";

export const metadata: Metadata = {
  title: "A2A UI",
  description: "",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-dvh overflow-x-hidden antialiased">
        <StoreProvider>
          <ThemeProvider defaultTheme="system" enableSystem>
            <TooltipProvider>
              <ToastProvider>{children}</ToastProvider>
            </TooltipProvider>
          </ThemeProvider>
        </StoreProvider>
      </body>
    </html>
  );
}
