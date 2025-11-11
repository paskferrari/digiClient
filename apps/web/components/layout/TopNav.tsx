"use client";
import * as React from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { Input } from "../ui/input";
import { Button } from "../ui/button";
import { AlertCircleIcon, SearchIcon, UserIcon, ChevronDownIcon } from "../ui/icons";
import { useOrgStore } from "../../lib/store/org";
import { supabase } from "../../lib/supabaseClient";
import { OrgSwitcher } from "../org-switcher";
import { ThemeToggle } from "../theme-toggle";
import { RBAC } from "../../lib/rbac";

export function TopNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { orgId, role } = useOrgStore();
  const [query, setQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<Array<{ id: string; title: string; status: string }>>([]);
  const [loadingSuggest, setLoadingSuggest] = React.useState(false);
  const [notifCount, setNotifCount] = React.useState<number>(0);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [adminMenuOpen, setAdminMenuOpen] = React.useState(false);
  const [actionsOpen, setActionsOpen] = React.useState(false);

  const isAdminMaster = role === 'ADMIN';
  const isFinanza = role === 'MANAGER' || role === 'OPERATOR';
  const canViewCases = !!(role && RBAC[role]?.cases.read);
  const canViewCompanies = !!(role && RBAC[role]?.companies.read);
  const canViewReports = role === 'MANAGER' || role === 'ADMIN';
  const canCreateCases = !!(role && RBAC[role]?.cases.create);
  const canCreateCompanies = !!(role && RBAC[role]?.companies.create);

  React.useEffect(() => {
    let cancelled = false;
    async function loadNotif() {
      if (!orgId) return;
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      try {
        const { count, error } = await supabase
          .from('audit_logs')
          .select('*', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .gte('created_at', since);
        if (!cancelled) setNotifCount(error ? 0 : (count || 0));
      } catch {
        if (!cancelled) setNotifCount(0);
      }
    }
    loadNotif();
    return () => { cancelled = true; };
  }, [orgId]);

  React.useEffect(() => {
    const handle = setTimeout(async () => {
      if (!orgId || query.trim().length < 2) {
        setSuggestions([]);
        return;
      }
      setLoadingSuggest(true);
      const { data } = await supabase
        .from('cases')
        .select('id, title, status')
        .eq('org_id', orgId)
        .ilike('title', `%${query}%`)
        .limit(5);
      setSuggestions((data || []).map((d: any) => ({ id: String(d.id), title: d.title || `Pratica ${d.id}`, status: d.status || '-' })));
      setLoadingSuggest(false);
    }, 250);
    return () => clearTimeout(handle);
  }, [query, orgId]);

  const NavLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
    <Link href={href} className={pathname === href ? "text-primary font-medium" : "text-foreground/80 hover:text-primary"}>
      {children}
    </Link>
  );

  return (
    <div className="border-b bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex items-center gap-3 px-4 py-3">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <span className="inline-block w-5 h-5 rounded bg-primary" />
          <span>DigiClient</span>
        </Link>
        <nav className="ml-4 hidden md:flex items-center gap-4 text-sm">
          <NavLink href="/dashboard">Dashboard</NavLink>
          {canViewCases && <NavLink href="/cases">Pratiche</NavLink>}
          {canViewReports && <NavLink href="/reports">Report</NavLink>}
          {canViewCompanies && <NavLink href="/companies">Aziende</NavLink>}
          {isAdminMaster && (
            <div className="relative">
              <button
                onClick={() => setAdminMenuOpen((v) => !v)}
                className="px-2 py-1 rounded hover:bg-muted"
                aria-haspopup="menu"
                aria-expanded={adminMenuOpen}
              >
                Admin
              </button>
              {adminMenuOpen && (
                <div role="menu" className="absolute z-10 mt-1 w-44 border rounded bg-white shadow">
                  <Link href="/admin" className="block px-3 py-2 text-sm hover:bg-muted">Panoramica</Link>
                  <Link href="/admin/organizations" className="block px-3 py-2 text-sm hover:bg-muted">Organizzazioni</Link>
                  <Link href="/admin/users" className="block px-3 py-2 text-sm hover:bg-muted">Utenti</Link>
                </div>
              )}
            </div>
          )}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <div className="relative hidden lg:block">
            <Input
              aria-label="Ricerca rapida"
              placeholder="Cerca pratiche"
              leadingIcon={<SearchIcon />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  router.push(`/cases?search=${encodeURIComponent(query.trim())}`);
                }
              }}
              className="w-64"
            />
            {query.trim().length >= 2 && (
              <div className="absolute z-10 mt-1 w-full rounded border bg-white shadow">
                {loadingSuggest ? (
                  <div className="p-2 text-xs text-muted-foreground">Ricerca…</div>
                ) : suggestions.length === 0 ? (
                  <div className="p-2 text-xs text-muted-foreground">Nessun risultato</div>
                ) : (
                  suggestions.map((s) => (
                    <button
                      key={s.id}
                      className="flex w-full items-center justify-between px-2 py-2 text-left text-sm hover:bg-muted"
                      onClick={() => router.push(`/cases/${s.id}`)}
                    >
                      <span>{s.title}</span>
                      <span className="text-xs text-muted-foreground">{s.status}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
          {(canCreateCases || canCreateCompanies) && (
            <div className="relative">
              <button
                onClick={() => setActionsOpen((v) => !v)}
                className="px-2 py-1 rounded hover:bg-muted"
                aria-haspopup="menu"
                aria-expanded={actionsOpen}
              >Azioni</button>
              {actionsOpen && (
                <div role="menu" className="absolute z-10 mt-1 w-44 border rounded bg-white shadow">
                  {canCreateCases && (
                    <Link href="/cases/new" className="block px-3 py-2 text-sm hover:bg-muted">Nuova pratica</Link>
                  )}
                  {canCreateCompanies && (
                    <Link href="/companies/new" className="block px-3 py-2 text-sm hover:bg-muted">Nuova azienda</Link>
                  )}
                </div>
              )}
            </div>
          )}
          <button className="relative p-2 rounded hover:bg-muted" aria-label="Notifiche" onClick={() => router.push('/notifications')}>
            <AlertCircleIcon />
            {notifCount > 0 && (
              <span className="absolute -top-1 -right-1 text-[10px] bg-destructive text-white rounded px-1">{notifCount}</span>
            )}
          </button>
          <OrgSwitcher />
          <ThemeToggle />
          <div className="relative">
            <button onClick={() => setUserMenuOpen((v) => !v)} className="flex items-center gap-1 p-2 rounded hover:bg-muted" aria-haspopup="menu" aria-expanded={userMenuOpen}>
              <UserIcon />
              <ChevronDownIcon />
            </button>
            {userMenuOpen && (
              <div role="menu" className="absolute right-0 mt-1 w-40 border rounded bg-white shadow">
                <Link href="/settings" className="block px-3 py-2 text-sm hover:bg-muted">Impostazioni</Link>
                <button
                  className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
                  onClick={async () => {
                    try { await supabase.auth.signOut(); } catch {}
                    try {
                      if (typeof window !== 'undefined') {
                        window.localStorage.removeItem('dc_orgId');
                        window.localStorage.removeItem('dc_orgRole');
                      }
                    } catch {}
                    setUserMenuOpen(false);
                    // Hard redirect to root login page to clear all client state
                    if (typeof window !== 'undefined') {
                      window.location.assign('/');
                    } else {
                      router.replace('/');
                    }
                  }}
                >Logout</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TopNav;