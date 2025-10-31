"use client";
import * as React from "react";
import { useOrgStore } from "@/lib/store/org";
import { apiJson } from "@/lib/api/client";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogFooter } from "@/components/ui/dialog";
import { PageContainer } from "@/components/layout/PageContainer";

type AuditItem = {
  id: string;
  created_at: string;
  action: string;
  target_table: string | null;
  target_id: string | null;
  actor_user_id: string;
  diff: any;
  actor?: { id: string; email?: string | null; full_name?: string | null };
};

export default function AdminAuditPage() {
  const { role } = useOrgStore();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<AuditItem[]>([]);
  const [page, setPage] = React.useState(1);
  const [limit, setLimit] = React.useState(50);
  const [total, setTotal] = React.useState(0);
  const [q, setQ] = React.useState("");
  const [action, setAction] = React.useState("");
  const [table, setTable] = React.useState("");
  const [user, setUser] = React.useState("");
  const [from, setFrom] = React.useState("");
  const [to, setTo] = React.useState("");
  const [selected, setSelected] = React.useState<AuditItem | null>(null);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [actionOptions, setActionOptions] = React.useState<string[]>([]);
  const [tableOptions, setTableOptions] = React.useState<string[]>([]);
  const [userOptions, setUserOptions] = React.useState<{ id: string; label: string }[]>([]);

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("limit", String(limit));
      if (q) params.set("q", q);
      if (action) params.set("action", action);
      if (table) params.set("table", table);
      if (user) params.set("user", user);
      if (from) params.set("from", new Date(from).toISOString());
      if (to) {
        const end = new Date(to);
        // include entire day by setting to 23:59:59
        end.setHours(23, 59, 59, 999);
        params.set("to", end.toISOString());
      }
      const res = await apiJson<{ items: AuditItem[]; page: number; limit: number; total: number }>(
        `/api/admin/audit?${params.toString()}`
      );
      setItems(res.items || []);
      setTotal(res.total || 0);
    } finally {
      setLoading(false);
    }
  }, [page, limit, q, action, table, user, from, to]);

  React.useEffect(() => {
    if (role === "ADMIN") load();
  }, [role, load]);

  const loadMeta = React.useCallback(async () => {
    try {
      const res = await apiJson<{ actions: string[]; tables: string[]; users: { id: string; email?: string | null; full_name?: string | null }[] }>(
        `/api/admin/audit/meta`
      );
      setActionOptions(res.actions || []);
      setTableOptions(res.tables || []);
      setUserOptions((res.users || []).map(u => ({ id: u.id, label: `${u.full_name ?? ''}${u.email ? ` (${u.email})` : ''}`.trim() || u.id })));
    } catch (e) {
      // ignore meta load errors in UI
    }
  }, []);

  React.useEffect(() => {
    if (role === "ADMIN") loadMeta();
  }, [role, loadMeta]);

  if (role !== "ADMIN") return <p className="text-sm">Accesso negato: area riservata agli amministratori.</p>;

  const totalPages = Math.max(1, Math.ceil(total / limit));

  function openDetails(item: AuditItem) {
    setSelected(item);
    setDialogOpen(true);
  }

  function exportCSV() {
    const header = [
      "created_at",
      "action",
      "target_table",
      "target_id",
      "actor_user_id",
      "actor_name",
      "actor_email",
      "diff_json",
    ];
    const rows = items.map((i) => [
      i.created_at,
      i.action,
      i.target_table ?? "",
      i.target_id ?? "",
      i.actor_user_id,
      i.actor?.full_name ?? "",
      i.actor?.email ?? "",
      JSON.stringify(i.diff ?? {}),
    ]);
    const csv = [header, ...rows].map(r => r.map(f => `"${String(f).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-export-${new Date().toISOString().slice(0,10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PageContainer
      title="Admin · Audit"
      description="Registro delle attività del sistema: tracciamento azioni utenti e modifiche dati"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => { setPage(1); load(); }} disabled={loading}>Aggiorna</Button>
          <Button variant="ghost" onClick={() => { setQ(""); setAction(""); setTable(""); setUser(""); setFrom(""); setTo(""); setPage(1); }} disabled={loading}>Reset filtri</Button>
          <Button onClick={exportCSV} disabled={loading || items.length === 0}>Esporta CSV</Button>
        </div>
      }
    >
      <Card>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-6 gap-2 mb-3">
            <Input placeholder="Ricerca libera" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={action}
              onChange={(e) => { setAction(e.target.value); setPage(1); }}
            >
              <option value="">Azione (tutte)</option>
              {actionOptions.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={table}
              onChange={(e) => { setTable(e.target.value); setPage(1); }}
            >
              <option value="">Tabella (tutte)</option>
              {tableOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <select
              className="border rounded-md px-3 py-2 text-sm bg-background"
              value={user}
              onChange={(e) => { setUser(e.target.value); setPage(1); }}
            >
              <option value="">Utente (tutti)</option>
              {userOptions.map((u) => (
                <option key={u.id} value={u.id}>{u.label}</option>
              ))}
            </select>
            <Input type="date" placeholder="Da" value={from} onChange={(e) => { setFrom(e.target.value); setPage(1); }} />
            <Input type="date" placeholder="A" value={to} onChange={(e) => { setTo(e.target.value); setPage(1); }} />
          </div>

          <div className="overflow-x-auto">
            <Table>
              <THead>
                <TR>
                  <TH>Data</TH>
                  <TH>Azione</TH>
                  <TH>Tabella</TH>
                  <TH>Target ID</TH>
                  <TH>Utente</TH>
                  <TH>Dettagli</TH>
                </TR>
              </THead>
              <TBody>
                {loading ? (
                  <TR><TD colSpan={6}>Caricamento...</TD></TR>
                ) : items.length === 0 ? (
                  <TR><TD colSpan={6}>Nessun evento trovato</TD></TR>
                ) : (
                  items.map((i) => (
                    <TR key={i.id}>
                      <TD>{new Date(i.created_at).toLocaleString()}</TD>
                      <TD>{i.action}</TD>
                      <TD>{i.target_table ?? '-'}</TD>
                      <TD>{i.target_id ?? '-'}</TD>
                      <TD>
                        <div className="flex flex-col">
                          <span className="text-xs text-muted-foreground">{i.actor_user_id}</span>
                          <span>{i.actor?.full_name ?? ''}</span>
                          <span className="text-xs text-muted-foreground">{i.actor?.email ?? ''}</span>
                        </div>
                      </TD>
                      <TD>
                        <Button size="sm" variant="ghost" onClick={() => openDetails(i)}>Vedi</Button>
                      </TD>
                    </TR>
                  ))
                )}
              </TBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter>
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="secondary" onClick={() => { if (page > 1) setPage(page - 1); }} disabled={loading || page <= 1}>Prec</Button>
              <Button size="sm" variant="secondary" onClick={() => { if (page < totalPages) setPage(page + 1); }} disabled={loading || page >= totalPages}>Succ</Button>
              <span className="text-sm">Pagina {page} di {totalPages} · {total} eventi</span>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm">Per pagina</label>
              <Input className="w-20" type="number" min={1} max={200} value={limit} onChange={(e) => { setLimit(Math.max(1, Math.min(200, parseInt(e.target.value || '50', 10)))); setPage(1); }} />
            </div>
          </div>
        </CardFooter>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen} title="Dettagli evento">
        {selected ? (
          <div className="space-y-2">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div><span className="text-muted-foreground">Azione</span><br />{selected.action}</div>
              <div><span className="text-muted-foreground">Data</span><br />{new Date(selected.created_at).toLocaleString()}</div>
              <div><span className="text-muted-foreground">Tabella</span><br />{selected.target_table ?? '-'}</div>
              <div><span className="text-muted-foreground">Target ID</span><br />{selected.target_id ?? '-'}</div>
              <div className="col-span-2"><span className="text-muted-foreground">Utente</span><br />{selected.actor?.full_name ?? ''} ({selected.actor?.email ?? ''})<br /><span className="text-xs text-muted-foreground">{selected.actor_user_id}</span></div>
            </div>
            <div>
              <span className="text-muted-foreground">Diff</span>
              <pre className="mt-1 max-h-72 overflow-auto rounded-md border p-2 text-xs bg-muted/30">{JSON.stringify(selected.diff ?? {}, null, 2)}</pre>
            </div>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="secondary" onClick={() => setDialogOpen(false)}>Chiudi</Button>
        </DialogFooter>
      </Dialog>
    </PageContainer>
  );
}