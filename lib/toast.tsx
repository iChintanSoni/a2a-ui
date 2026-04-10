"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { XIcon, CheckCircle2Icon, AlertCircleIcon, InfoIcon, AlertTriangleIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export type ToastType = "info" | "success" | "warning" | "error";

export interface ToastAction {
  label: string;
  onClick: () => void;
}

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  action?: ToastAction;
  duration?: number; // ms, default 4000
}

interface ToastContextValue {
  toast: (opts: Omit<Toast, "id">) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}

// ─── Provider + Toaster ───────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((opts: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...opts, id }]);
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <Toaster toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

// ─── Individual toast item ────────────────────────────────────────────────────

const ICONS: Record<ToastType, React.ReactNode> = {
  info: <InfoIcon className="size-4 shrink-0 text-blue-500" />,
  success: <CheckCircle2Icon className="size-4 shrink-0 text-green-500" />,
  warning: <AlertTriangleIcon className="size-4 shrink-0 text-yellow-500" />,
  error: <AlertCircleIcon className="size-4 shrink-0 text-destructive" />,
};

const BORDER: Record<ToastType, string> = {
  info: "border-blue-200 dark:border-blue-800",
  success: "border-green-200 dark:border-green-800",
  warning: "border-yellow-200 dark:border-yellow-800",
  error: "border-destructive/30",
};

function ToastItem({ toast: t, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const duration = t.duration ?? 4000;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => onDismiss(t.id), duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [t.id, duration, onDismiss]);

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border bg-background px-3 py-2.5 shadow-md text-sm max-w-sm w-full animate-in slide-in-from-bottom-2 fade-in",
        BORDER[t.type]
      )}
    >
      {ICONS[t.type]}
      <span className="flex-1 leading-snug">{t.message}</span>
      {t.action && (
        <button
          onClick={() => { t.action!.onClick(); onDismiss(t.id); }}
          className="shrink-0 font-medium text-xs underline underline-offset-2 hover:no-underline"
        >
          {t.action.label}
        </button>
      )}
      <button
        onClick={() => onDismiss(t.id)}
        className="shrink-0 text-muted-foreground hover:text-foreground"
        aria-label="Dismiss"
      >
        <XIcon className="size-3.5" />
      </button>
    </div>
  );
}

function Toaster({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 items-end">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}
