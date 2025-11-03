"use client";
import * as React from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent } from "../../components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "../../components/ui/table";
import { Skeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { PageContainer } from "../../components/layout/PageContainer";
import { useToast } from "../../components/ui/toast";
import { useOrgStore } from "../../lib/store/org";
import { supabase } from "../../lib/supabaseClient";
import { RBAC, type Role } from "../../lib/rbac";

type CaseRow = { id: string; status: string; priority: string; company_id: string | null; created_at?: string; updated_at?: string };

export default function CasesPage() {
  const { orgId, role } = useOrgStore();
  const { notify } = useToast();
  const params = useSearchParams();
  const statusFilter = (params.get("status") || "").toString();
  const router = useRouter();
  const canCreateCase = role ? RBAC[(role as Role)]?.cases?.create === true : false;

  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<CaseRow[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        if (!orgId) { setItems([]); return; }
        let query = supabase
          .from('cases')
          .select('id,status,priority,company_id,created_at,updated_at')
          .eq('org_id', orgId)
          .order('updated_at', { ascending: false })
          .limit(200);
        if (statusFilter) query = query.eq('status', statusFilter);
        const { data, error } = await query;
        if (error) {
          const msg = (error.message || '').toLowerCase();
          if (msg.includes('created_at') && msg.includes('does not exist')) {
            // Fallback: DB non migrato, ricarico senza created_at
            let fallback = supabase
              .from('cases')
              .select('id,status,priority,company_id,updated_at')
              .eq('org_id', orgId)
              .order('updated_at', { ascending: false })
              .limit(200);
            if (statusFilter) fallback = fallback.eq('status', statusFilter);
            const { data: data2, error: error2 } = await fallback;
            if (error2) throw new Error(error2.message);
            if (!cancelled) setItems((data2 || []) as CaseRow[]);
          } else {
            throw new Error(error.message);
          }
        } else {
          if (!cancelled) setItems((data || []) as CaseRow[]);
        }
      } catch (e: any) {
        notify({ title: "Errore caricamento", description: e.message, variant: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [orgId, statusFilter]);

  return (
    <PageContainer
      title="Pratiche"
      description="Elenco pratiche filtrabile per organizzazione"
      actions={(
        <>
          <Button onClick={() => router.push("/cases/new")} disabled={!canCreateCase} title={canCreateCase ? undefined : "Ruolo senza permesso di creare pratiche"}>Nuova pratica</Button>
          <Button variant="secondary" onClick={() => router.push("/cases?advanced=true")}>Ricerca avanzata</Button>
        </>
      )}
    >
      <Card>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : !orgId ? (
            <p>Seleziona un’organizzazione nel selettore in alto.</p>
          ) : items.length === 0 ? (
            <p>Nessuna pratica trovata{statusFilter ? ` per stato ${statusFilter}` : ''}.</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>ID</TH>
                  <TH>Stato</TH>
                  <TH>Priorità</TH>
                  <TH>Creata</TH>
                  <TH>Aggiornata</TH>
                </TR>
              </THead>
              <TBody>
                {items.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <Link href={`/cases/${c.id}`} className="hover:underline font-mono">{c.id}</Link>
                    </TD>
                    <TD>{c.status}</TD>
                    <TD>{c.priority}</TD>
                    <TD>{c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}</TD>
                    <TD>{c.updated_at ? new Date(c.updated_at).toLocaleString() : '—'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
          {statusFilter && (
            <div className="mt-2 text-xs text-muted-foreground">Filtro attivo: {statusFilter}. <Link href="/cases" className="underline">Rimuovi filtro</Link></div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}