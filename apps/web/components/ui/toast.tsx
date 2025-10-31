"use client";
import * as React from "react";
import clsx from "clsx";

export type ToastMessage = {
  id: string;
  title?: string;
  description?: string;
  variant?: "default" | "success" | "error" | "warning";
  duration?: number; // ms
};

const ToastContext = React.createContext<{
  notify: (msg: Omit<ToastMessage, "id">) => void;
} | null>(null);

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children?: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<ToastMessage[]>([]);
  const notify = React.useCallback((msg: Omit<ToastMessage, "id">) => {
    const id = Math.random().toString(36).slice(2);
    const duration = msg.duration ?? 3500;
    const t: ToastMessage = { id, ...msg };
    setToasts((prev) => [...prev, t]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, duration);
  }, []);

  return (
    <ToastContext.Provider value={{ notify }}>
      {children}
      <div aria-live="polite" aria-atomic="true" className="fixed inset-x-0 bottom-4 z-50 flex flex-col items-center space-y-2 px-4">
        {toasts.map((t) => (
          <ToastItem key={t.id} {...t} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ title, description, variant = "default" }: ToastMessage) {
  const variantClasses: Record<string, string> = {
    default: "bg-popover text-popover-foreground border",
    success: "bg-green-600 text-white",
    error: "bg-red-600 text-white",
    warning: "bg-yellow-500 text-black",
  };
  return (
    <div role="status" className={clsx("w-full max-w-sm rounded-md shadow-lg p-3", variantClasses[variant])}>
      {title ? <div className="text-sm font-semibold" aria-label="Titolo toast">{title}</div> : null}
      {description ? <div className="text-sm opacity-90" aria-label="Descrizione toast">{description}</div> : null}
    </div>
  );
}