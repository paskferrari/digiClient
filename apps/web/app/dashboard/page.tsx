"use client";
import * as React from "react";
import Link from "next/link";
import { useOrgStore } from "../../lib/store/org";
import { RBAC } from "../../lib/rbac";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { useToast } from "../../components/ui/toast";
import { PageContainer } from "../../components/layout/PageContainer";

export default function DashboardPage() {
  const { orgId, role } = useOrgStore();
  const { notify } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [caseCounts, setCaseCounts] = React.useState<Record<string, number>>({});
  type TaskItem = { id: string; title: string; status: string; case_id?: string };
  const [todos, setTodos] = React.useState<TaskItem[]>([]);
  const canCreateCases = !!(role && RBAC[role as keyof typeof RBAC]?.cases.create);
  const canCreateCompanies = !!(role && RBAC[role as keyof typeof RBAC]?.companies.create);

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
    <PageContainer title="Dashboard" description="Stato generale e attività della tua organizzazione">
      <div className="grid gap-4 md:grid-cols-3">
      {(canCreateCases || canCreateCompanies) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Azioni rapide</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {canCreateCases && (
                <Link href="/cases/new"><Button>Nuova pratica</Button></Link>
              )}
              {canCreateCompanies && (
                <Link href="/companies/new"><Button variant="secondary">Nuova azienda</Button></Link>
              )}
            </div>
          </CardContent>
        </Card>
      )}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Pratiche per stato</CardTitle>
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
    </PageContainer>
  );
}