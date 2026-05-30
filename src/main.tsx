import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import "./index.css";
import StoreProvider from "@/providers/StoreProvider";
import { ThemeProvider } from "@/components/theme-provider";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ToastProvider } from "@/lib/toast";
import { AuroraBackground } from "@/components/aurora-background";
import { router } from "@/router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <StoreProvider>
      <ThemeProvider defaultTheme="system" enableSystem>
        <AuroraBackground />
        <TooltipProvider>
          <ToastProvider>
            <RouterProvider router={router} />
          </ToastProvider>
        </TooltipProvider>
      </ThemeProvider>
    </StoreProvider>
  </StrictMode>,
);
