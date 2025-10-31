"use client";
import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Breadcrumbs() {
  const pathname = usePathname();
  const parts = pathname.split('/').filter(Boolean);
  const crumbs = parts.map((p, i) => ({
    label: p.replace(/\[|\]/g, ''),
    href: '/' + parts.slice(0, i + 1).join('/'),
  }));
  return (
    <div className="border-b bg-muted/20">
      <nav aria-label="Percorso" className="px-4 py-2 text-xs text-muted-foreground">
        <Link href="/" className="hover:text-primary">Home</Link>
        {crumbs.map((c, i) => (
          <span key={c.href} className="ml-1">
            / <Link href={c.href} className="hover:text-primary">{c.label}</Link>
          </span>
        ))}
      </nav>
    </div>
  );
}

export default Breadcrumbs;