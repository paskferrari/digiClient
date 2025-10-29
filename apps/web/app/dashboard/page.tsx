"use client";
import * as React from "react";
import Link from "next/link";
import { useOrgStore } from "../../lib/store/org";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { useToast } from "../../components/ui/toast";
import { apiJson } from "../../lib/api/client";

export default function DashboardPage() {
  const { orgId, setOrg } = useOrgStore();
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [caseCounts, setCaseCounts] = React.useState<Record<string, number>>({});
  type TaskItem = { id: string; title: string; status: string; case_id?: string };
  const [todos, setTodos] = React.useState<TaskItem[]>([]);
  const [seeding, setSeeding] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      if (!orgId) {
        setCaseCounts({});
        setTodos([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      const { data: cases, error: e1 } = await supabase
        .from("cases")
        .select("id,status")
        .eq("org_id", orgId)
        .limit(500);
      const { data: tasks, error: e2 } = await supabase
        .from("tasks")
        .select("id,title,status,case_id")
        .eq("org_id", orgId)
        .limit(50);
      if (cancelled) return;
      if (e1 || e2) {
        setCaseCounts({});
        setTodos([]);
      } else {
        const counts: Record<string, number> = {};
        for (const c of cases || []) counts[c.status] = (counts[c.status] || 0) + 1;
        setCaseCounts(counts);
        const tasksData = (tasks || []) as TaskItem[];
        setTodos(tasksData.filter((t: TaskItem) => t.status === "OPEN"));
      }
      setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [orgId]);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pratiche per stato</CardTitle>
            <Button aria-label="Genera dati demo" isLoading={seeding} disabled={seeding} onClick={async () => {
              try {
                setSeeding(true);
                let activeOrg = orgId;
                if (!activeOrg) {
                  // Bootstrap org in dev se non selezionata
                  const boot = await apiJson<{ org_id: string; role: string }>(`/api/dev/bootstrap-org`, { method: 'POST' });
                  activeOrg = boot.org_id;
                  setOrg(boot.org_id, boot.role || null);
                  notify({ title: 'Organizzazione creata', description: 'Org demo creata e selezionata automaticamente.', variant: 'success' });
                }
                const res = await apiJson<{ companies: number; cases: number; tasks: number }>(`/api/dev/seed`, { method: 'POST' });
                notify({ title: 'Dati demo generati', description: `Aziende: ${res.companies}, Pratiche: ${res.cases}, Task: ${res.tasks}`, variant: 'success' });
                // Trigger reload
                setLoading(true);
                const { data: cases } = await supabase.from('cases').select('id,status').eq('org_id', activeOrg).limit(500);
                const { data: tasks } = await supabase.from('tasks').select('id,title,status,case_id').eq('org_id', activeOrg).limit(50);
                const counts: Record<string, number> = {};
                for (const c of cases || []) counts[c.status] = (counts[c.status] || 0) + 1;
                setCaseCounts(counts);
                const tasksData = (tasks || []) as TaskItem[];
                setTodos(tasksData.filter((t: TaskItem) => t.status === 'OPEN'));
              } catch (e: any) {
                notify({ title: 'Errore seed', description: e.message, variant: 'error' });
              } finally {
                setSeeding(false);
                setLoading(false);
              }
            }}>Dati demo</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-48" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-40" />
            </div>
          ) : (
            <ul aria-label="KPI pratiche per stato" className="space-y-1">
              {Object.keys(caseCounts).length === 0 ? (
                <li>Nessun dato</li>
              ) : (
                Object.entries(caseCounts).map(([status, count]) => (
                  <li key={status}>
                    <Link href={`/cases?status=${encodeURIComponent(status)}`} className="flex justify-between hover:underline">
                      <span>{status}</span>
                      <span className="font-mono">{count}</span>
                    </Link>
                  </li>
                ))
              )}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Doc mancanti</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Integrazione in corso</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Da fare</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : (
            <ul aria-label="Todo list" className="space-y-1">
              {todos.length === 0 ? (
                <li>Nessun task aperto</li>
              ) : (
                todos.map((t: TaskItem) => (
                  <li key={t.id} className="flex justify-between">
                    {t.case_id ? (
                      <Link href={`/cases/${t.case_id}`} className="hover:underline">{t.title}</Link>
                    ) : (
                      <span>{t.title}</span>
                    )}
                    <span className="text-xs text-muted-foreground">{t.status}</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}