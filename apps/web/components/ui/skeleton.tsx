import * as React from "react";
import clsx from "clsx";

export function Skeleton({ className }: { className?: string }) {
  return <div role="progressbar" aria-label="Caricamento" className={clsx("animate-pulse rounded-md bg-muted", className)} />;
}