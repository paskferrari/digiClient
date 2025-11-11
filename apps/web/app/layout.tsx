import type { ReactNode } from 'react';

import '../styles/globals.css';
import { ThemeToggle } from '../components/theme-toggle';
import { ToastProvider } from '../components/ui/toast'
import { OrgSwitcher } from '../components/org-switcher'
import Link from 'next/link'
import { AdminNavLink } from '../components/admin-nav-link'
import { TopNav } from '../components/layout/TopNav'
import { Breadcrumbs } from '../components/ui/breadcrumbs'
import { DebugUser } from '../components/debug-user'
import { RouteGuard } from '../components/auth/RouteGuard'

export const metadata = {
  title: 'DigiClient',
  description: 'Client digitale',
  manifest: '/manifest.json'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background text-foreground">
        <ToastProvider>
          <RouteGuard />
          <header>
            <TopNav />
            <Breadcrumbs />
          </header>
          <main className="p-4">{children}</main>
          <DebugUser />
          {process.env.NODE_ENV === 'production' ? (
            <script dangerouslySetInnerHTML={{ __html: swRegister }} />
          ) : null}
        </ToastProvider>
      </body>
    </html>
  );
}

const swRegister = `
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}
`;