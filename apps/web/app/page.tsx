"use client";
import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "../components/ui/table";
import { Skeleton } from "../components/ui/skeleton";
import { useOrgStore } from "../lib/store/org";
import { supabase } from "../lib/supabaseClient";
import { AlertCircleIcon, InfoIcon, SearchIcon, UserIcon, ChevronDownIcon } from "../components/ui/icons";
import { useRouter } from "next/navigation";

type CaseStats = { total: number; screening: number; in_progress: number; completed: number };
type TimelineItem = { time: string; action: string; detail?: string };

export default function HomePage() {
  const { orgId, role } = useOrgStore();
  const router = useRouter();
  const [stats, setStats] = React.useState<CaseStats>({ total: 0, screening: 0, in_progress: 0, completed: 0 });
  const [timeline, setTimeline] = React.useState<TimelineItem[]>([]);
  const [notifCount, setNotifCount] = React.useState<number>(0);
  const [userMenuOpen, setUserMenuOpen] = React.useState(false);
  const [loadingStats, setLoadingStats] = React.useState(true);
  const [loadingTimeline, setLoadingTimeline] = React.useState(true);
  const [query, setQuery] = React.useState("");
  const [suggestions, setSuggestions] = React.useState<Array<{ id: string; title: string; status: string }>>([]);
  const [loadingSuggest, setLoadingSuggest] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!orgId) return;
      // Conteggi pratiche per stato
      setLoadingStats(true);
      const total = await supabase.from('cases').select('*', { count: 'exact', head: true }).eq('org_id', orgId);
      const screening = await supabase.from('cases').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'SCREENING');
      const inProgress = await supabase.from('cases').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'IN_PROGRESS');
      const completed = await supabase.from('cases').select('*', { count: 'exact', head: true }).eq('org_id', orgId).eq('status', 'FUNDED');
      if (!cancelled) setStats({
        total: total.count || 0,
        screening: screening.count || 0,
        in_progress: inProgress.count || 0,
        completed: completed.count || 0,
      });
      if (!cancelled) setLoadingStats(false);

      // Timeline ultime attività
      setLoadingTimeline(true);
      const { data: logs } = await supabase
        .from('audit_logs')
        .select('created_at, action, target_table, target_id')
        .eq('org_id', orgId)
        .order('created_at', { ascending: false })
        .limit(10);
      if (!cancelled) setTimeline((logs || []).map((l: any) => ({
        time: new Date(l.created_at).toLocaleString(),
        action: l.action,
        detail: [l.target_table, l.target_id].filter(Boolean).join('#'),
      })));
      if (!cancelled) setLoadingTimeline(false);

      // Notifiche (placeholder: numero azioni negli ultimi 24h)
      const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const { count: last24 } = await supabase
        .from('audit_logs')
        .select('*', { count: 'exact', head: true })
        .eq('org_id', orgId)
        .gte('created_at', since);
      if (!cancelled) setNotifCount(last24 || 0);
    }
    load();
    return () => { cancelled = true; };
  }, [orgId]);

  // Ricerca rapida con debounce
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

  const isAdminMaster = role === 'ADMIN';
  const isFinanza = role === 'MANAGER' || role === 'OPERATOR';
  const isSubUser = role === 'VIEWER';

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-[260px_1fr]">
      {/* Sidebar Sinistra */}
      <aside className="border-r bg-muted/20 p-3 space-y-3">
        <div>
          <h3 className="text-sm font-semibold">Filtri</h3>
          <div className="mt-2 space-y-2 text-sm">
            <label className="block">Tipologia pratica
              <select className="mt-1 w-full border rounded px-2 py-1">
                <option>Tutte</option>
                <option>Finanziamento</option>
                <option>Contributo</option>
                <option>Consulenza</option>
              </select>
            </label>
            <label className="block">Stato
              <select className="mt-1 w-full border rounded px-2 py-1">
                <option>Tutti</option>
                <option>In valutazione</option>
                <option>In lavorazione</option>
                <option>Completate</option>
              </select>
            </label>
            <label className="block">Priorità
              <select className="mt-1 w-full border rounded px-2 py-1">
                <option>Tutte</option>
                <option>Bassa</option>
                <option>Media</option>
                <option>Alta</option>
              </select>
            </label>
            <label className="block">Associazione di riferimento
              <select className="mt-1 w-full border rounded px-2 py-1">
                <option>Tutte</option>
                <option>Confartigianato</option>
                <option>Confcommercio</option>
              </select>
            </label>
          </div>
        </div>
        <div className="pt-2">
          <h3 className="text-sm font-semibold">Ricerca rapida</h3>
          <div className="mt-2 relative">
            <Input
              aria-label="Ricerca rapida"
              placeholder="Cerca pratiche o progetti"
              leadingIcon={<SearchIcon />}
              value={query}
              onChange={(e) => setQuery(e.currentTarget.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && query.trim()) {
                  router.push(`/cases?search=${encodeURIComponent(query.trim())}`);
                }
              }}
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
        </div>
      </aside>

      {/* Area principale (contenuti) */}
      <main className="flex flex-col">

        {/* Area Messaggi/Alert */}
        <section className="px-4 pt-4">
          <div className="flex items-center gap-2 border rounded px-3 py-2 bg-amber-50 text-amber-900">
            <AlertCircleIcon />
            <div className="text-sm">
              <strong>Area Finanza:</strong> Comunicazione urgente su scadenze bando regionale. Verifica entro oggi.
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2 border rounded px-3 py-2 bg-sky-50 text-sky-900">
            <InfoIcon />
            <div className="text-sm">Nuove funzionalità disponibili: guida rapida aggiornata nella sezione Supporto.</div>
          </div>
        </section>

        {/* Area contenuti principale */}
        <section className="px-4 py-4 space-y-4">
          {/* Stato Pratiche */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <Card>
              <CardHeader><CardTitle className="text-sm">Pratiche totali</CardTitle></CardHeader>
              <CardContent>
                {loadingStats ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-semibold">{stats.total}</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">In attesa di valutazione</CardTitle></CardHeader>
              <CardContent>
                {loadingStats ? <Skeleton className="h-7 w-24" /> : <div className="text-2xl font-semibold">{stats.screening}</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">In lavorazione</CardTitle></CardHeader>
              <CardContent>
                {loadingStats ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-semibold">{stats.in_progress}</div>}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-sm">Completate</CardTitle></CardHeader>
              <CardContent>
                {loadingStats ? <Skeleton className="h-7 w-20" /> : <div className="text-2xl font-semibold">{stats.completed}</div>}
              </CardContent>
            </Card>
          </div>

          {/* Ultime attività */}
          <Card>
            <CardHeader><CardTitle>Ultime Attività</CardTitle></CardHeader>
            <CardContent>
              {loadingTimeline ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="grid grid-cols-3 gap-2">
                      <Skeleton className="h-5" />
                      <Skeleton className="h-5" />
                      <Skeleton className="h-5" />
                    </div>
                  ))}
                </div>
              ) : timeline.length === 0 ? (
                <p className="text-sm text-muted-foreground">Nessuna attività recente.</p>
              ) : (
                <Table>
                  <THead>
                    <TR>
                      <TH>Data/Ora</TH>
                      <TH>Azione</TH>
                      <TH>Dettaglio</TH>
                    </TR>
                  </THead>
                  <TBody>
                    {timeline.map((t, i) => (
                      <TR key={i}>
                        <TD>{t.time}</TD>
                        <TD>{t.action}</TD>
                        <TD>{t.detail || '—'}</TD>
                      </TR>
                    ))}
                  </TBody>
                </Table>
              )}
            </CardContent>
          </Card>

          {/* Quick Access Panel */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {isAdminMaster || isFinanza ? (
              <Card>
                <CardHeader><CardTitle className="text-sm">Nuova pratica</CardTitle></CardHeader>
                <CardContent className="text-sm">Crea e assegna una nuova pratica.</CardContent>
                <CardFooter><Link href="/cases/new"><Button size="sm">Crea</Button></Link></CardFooter>
              </Card>
            ) : (
              <Card>
                <CardHeader><CardTitle className="text-sm">Nuova pratica</CardTitle></CardHeader>
                <CardContent className="text-sm">Non hai i permessi per creare pratiche.</CardContent>
                <CardFooter><Button size="sm" disabled variant="ghost">Crea</Button></CardFooter>
              </Card>
            )}
            <Card>
              <CardHeader><CardTitle className="text-sm">Ricerca avanzata</CardTitle></CardHeader>
              <CardContent className="text-sm">Trova pratiche e progetti con filtri avanzati.</CardContent>
              <CardFooter><Link href="/cases"><Button size="sm" variant="secondary">Apri</Button></Link></CardFooter>
            </Card>
            {isAdminMaster ? (
              <Card>
                <CardHeader><CardTitle className="text-sm">Genera report</CardTitle></CardHeader>
                <CardContent className="text-sm">Esporta stato e performance in formato PDF/CSV.</CardContent>
                <CardFooter><Link href="/reports"><Button size="sm" variant="secondary">Genera</Button></Link></CardFooter>
              </Card>
            ) : (
              <Card>
                <CardHeader><CardTitle className="text-sm">Genera report</CardTitle></CardHeader>
                <CardContent className="text-sm">Funzione disponibile per Admin Master.</CardContent>
                <CardFooter><Button size="sm" variant="ghost" disabled>Genera</Button></CardFooter>
              </Card>
            )}
          </div>
        </section>

        {/* Footer */}
        <footer className="mt-auto px-4 py-3 border-t text-xs text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <Link className="underline" href="/docs">Documentazione</Link>
            <Link className="underline" href="/support">Supporto</Link>
            <span className="ml-auto">Versione v0.1.0 · Sistema: OK</span>
          </div>
        </footer>

        {/* Gate ruoli (indicazioni visive) */}
        <section className="px-4 py-2">
          {isAdminMaster && (
            <p className="text-xs">Profilo: Admin Master · Accesso completo a configurazioni.</p>
          )}
          {isFinanza && !isAdminMaster && (
            <p className="text-xs">Profilo: Operatore Area Finanza · Vista avanzata dettagli pratiche.</p>
          )}
          {isSubUser && (
            <p className="text-xs">Profilo: Sub-user Associazioni · Vista focalizzata sulle pratiche di competenza.</p>
          )}
        </section>
      </main>
    </div>
  );
}