"use client";
import * as React from "react";
import clsx from "clsx";

type DialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children?: React.ReactNode;
  className?: string;
};

export function Dialog({ open, onOpenChange, title, children, className }: DialogProps) {
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onOpenChange(false); }
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onOpenChange]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/50" onClick={() => onOpenChange(false)} aria-hidden="true" />
      <div className={clsx("absolute inset-0 flex items-center justify-center p-4", className)}>
        <div className="w-full max-w-md rounded-md bg-background text-foreground shadow-lg border">
          {title ? <div className="px-4 py-3 border-b font-semibold" aria-label="Titolo dialog">{title}</div> : null}
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function DialogFooter({ children }: { children?: React.ReactNode }) {
  return <div className="mt-4 flex justify-end gap-2">{children}</div>;
}