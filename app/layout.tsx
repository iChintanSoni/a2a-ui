import type { Metadata, Viewport } from "next";
import "./globals.css";
import "highlight.js/styles/github.css";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import StoreProvider from "./StoreProvider";
import { ToastProvider } from "@/lib/toast";

export const viewport: Viewport = {
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "A2A UI",
  description: "",
  icons: {
    icon: "/a2a-ui.svg",
    shortcut: "/a2a-ui.svg",
    apple: "/a2a-ui.svg",
  },
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
