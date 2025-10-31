"use client";
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Skeleton } from "../../../components/ui/skeleton";
import { useOrgStore } from "../../../lib/store/org";
import { apiJson } from "../../../lib/api/client";
import { IdleTimeout } from "../../../components/idle-timeout";
import { PageContainer } from "../../../components/layout/PageContainer";

type CaseItem = { id: string; title: string; type: string; assigned_org_id?: string | null };
type OrgItem = { id: string; name: string };

export default function AdminCasesAssignPage() {
  const { orgId, role } = useOrgStore();
  const [loading, setLoading] = React.useState(true);
  const [cases, setCases] = React.useState<CaseItem[]>([]);
  const [orgs, setOrgs] = React.useState<OrgItem[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      if (!orgId) { setCases([]); setOrgs([]); return; }
      const resCases = await apiJson<{ items: CaseItem[] }>("/api/admin/cases");
      const resOrgs = await apiJson<{ items: OrgItem[] }>("/api/admin/organizations");
      setCases(resCases.items || []);
      setOrgs(resOrgs.items || []);
    } finally { setLoading(false); }
  }, [orgId]);

  React.useEffect(() => { if (role === "ADMIN") load(); }, [role, load]);

  if (role !== "ADMIN") return <p className="text-sm">Accesso negato</p>;

  // Simple drag-and-drop
  const onDragStart = (ev: React.DragEvent<HTMLDivElement>, caseId: string) => {
    ev.dataTransfer.setData("text/plain", caseId);
  };
  const onDrop = async (ev: React.DragEvent<HTMLDivElement>, orgIdTarget: string) => {
    const caseId = ev.dataTransfer.getData("text/plain");
    await apiJson(`/api/admin/cases`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ case_id: caseId, org_id: orgIdTarget })
    });
    load();
  };

  return (
    <PageContainer title="Admin · Pratiche" description="Assegnazione casi tramite drag & drop e operazioni admin">
      <IdleTimeout minutes={15} />
      <Card>
        <CardHeader>
          <CardTitle>Assegna casi con drag & drop</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="text-sm font-medium mb-2">Casi</h3>
                <div className="space-y-2">
                  {cases.map((c) => (
                    <div key={c.id} draggable onDragStart={(e) => onDragStart(e, c.id)} className="rounded border p-2 bg-card hover:bg-muted cursor-move">
                      <div className="text-sm font-medium">{c.title}</div>
                      <div className="text-xs text-muted-foreground">{c.type} · Org: {c.assigned_org_id ?? "—"}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium mb-2">Organizzazioni</h3>
                <div className="grid md:grid-cols-2 gap-2">
                  {orgs.map((o) => (
                    <div key={o.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => onDrop(e, o.id)} className="rounded border p-3 bg-card">
                      <div className="text-sm font-medium">{o.name}</div>
                      <div className="text-xs text-muted-foreground">ID: {o.id}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <div className="mt-4">
            <Button onClick={load}>Ricarica</Button>
          </div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}