"use client";
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "../../../components/ui/table";
import { Skeleton } from "../../../components/ui/skeleton";
import { useOrgStore } from "../../../lib/store/org";
import { apiJson } from "../../../lib/api/client";
import { useToast } from "../../../components/ui/toast";
import { Dialog, DialogFooter } from "../../../components/ui/dialog";
import { IdleTimeout } from "../../../components/idle-timeout";
import { MailIcon, BuildingIcon } from "../../../components/ui/icons";
import { PageContainer } from "../../../components/layout/PageContainer";

type MemberItem = { id: string; org_id: string; org_name?: string | null; role: string; email: string; full_name?: string | null };

export default function AdminUsersPage() {
  const { orgId, role } = useOrgStore();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<MemberItem[]>([]);
  const [email, setEmail] = React.useState("");
  const [roleNew, setRoleNew] = React.useState("VIEWER");
  const [targetOrg, setTargetOrg] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingRole, setEditingRole] = React.useState<string>("VIEWER");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [roleSaving, setRoleSaving] = React.useState(false);
  const [removeSaving, setRemoveSaving] = React.useState(false);
  const { notify } = useToast();
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const orgIdValid = (targetOrg ?? "").trim().length > 0;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      if (!orgId) { setItems([]); return; }
      const res = await apiJson<{ items: MemberItem[] }>("/api/admin/users");
      setItems(res.items || []);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  React.useEffect(() => { if (role === "ADMIN") load(); }, [role, load]);

  if (role !== "ADMIN") return <p className="text-sm">Accesso negato</p>;

  const exportCSV = () => {
    const header = ["id","org_id","role","email","full_name"].join(",");
    const rows = items.map((i) => [i.id, i.org_id, i.role, i.email, i.full_name ?? ""].map((v) => `"${String(v).replace(/"/g,'"')}"`).join(","));
    const blob = new Blob([header+"\n"+rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "users.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <PageContainer
      title="Admin · Utenti"
      description="Gestione utenti e membership: inviti, ruoli e permessi organizzazioni"
      actions={
        <div className="flex gap-2">
          <Button onClick={exportCSV}>Esporta CSV</Button>
          <Button onClick={load}>Ricarica</Button>
        </div>
      }
    >
      <IdleTimeout minutes={15} />
      <Card>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Email</TH>
                  <TH>Nome</TH>
                  <TH>Org</TH>
                  <TH>Ruolo</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {items.map((m) => (
                  <TR key={m.id}>
                    <TD>{m.email}</TD>
                    <TD>{m.full_name || "—"}</TD>
                    <TD className="text-xs text-muted-foreground">{m.org_name || m.org_id}</TD>
                    <TD>
                      {editingId === m.id ? (
                        <div className="flex items-center gap-2">
                          <select className="h-8 rounded-md border bg-background px-2 text-sm" value={editingRole} onChange={(e) => setEditingRole(e.target.value)}>
                            <option value="VIEWER">VIEWER</option>
                            <option value="OPERATOR">OPERATOR</option>
                            <option value="MANAGER">MANAGER</option>
                            <option value="ADMIN">ADMIN</option>
                          </select>
                          <Button size="sm" onClick={async () => {
                            await apiJson(`/api/admin/users`, { method: 'PATCH', body: JSON.stringify({ membership_id: m.id, role: editingRole }) });
                            setEditingId(null);
                            load();
                          }}>Salva</Button>
                          <Button size="sm" variant="secondary" onClick={() => setEditingId(null)}>Annulla</Button>
                        </div>
                      ) : m.role}
                    </TD>
                    <TD className="text-right">
                      <Button size="sm" variant="secondary" onClick={() => { setEditingId(m.id); setEditingRole(m.role); setEditOpen(true); }}>Cambia ruolo</Button>
                      <Button size="sm" variant="destructive" className="ml-2" onClick={() => { setDeletingId(m.id); setDeleteOpen(true); }}>Rimuovi</Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit role dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) setEditingId(null); }} title="Cambia ruolo">
        <div className="space-y-2">
          <label className="text-sm">Ruolo</label>
          <select className="h-10 rounded-md border bg-background px-3 text-sm" value={editingRole} onChange={(e) => setEditingRole(e.target.value)}>
            <option value="VIEWER">VIEWER</option>
            <option value="OPERATOR">OPERATOR</option>
            <option value="MANAGER">MANAGER</option>
            <option value="ADMIN">ADMIN</option>
          </select>
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => { setEditOpen(false); setEditingId(null); }} disabled={roleSaving}>Annulla</Button>
          <Button onClick={async () => {
            setRoleSaving(true);
            try {
              await apiJson(`/api/admin/users`, { method: 'PATCH', body: JSON.stringify({ membership_id: editingId, role: editingRole }) });
              notify({ title: "Salvato", description: "Ruolo aggiornato", variant: "success" });
              setEditOpen(false); setEditingId(null);
              load();
            } catch (e: any) {
              notify({ title: "Errore salvataggio", description: e?.message || "", variant: "error" });
            } finally {
              setRoleSaving(false);
            }
          }} isLoading={roleSaving}>Salva</Button>
        </DialogFooter>
      </Dialog>

      {/* Delete membership dialog */}
      <Dialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); if (!v) setDeletingId(null); }} title="Conferma rimozione">
        <p className="text-sm">Rimuovere questo utente dall'organizzazione?</p>
        <DialogFooter>
          <Button variant="secondary" onClick={() => { setDeleteOpen(false); setDeletingId(null); }} disabled={removeSaving}>Annulla</Button>
          <Button variant="destructive" onClick={async () => {
            setRemoveSaving(true);
            try {
              await apiJson(`/api/admin/users`, { method: 'DELETE', body: JSON.stringify({ membership_id: deletingId }) });
              notify({ title: "Rimosso", description: "Utente rimosso", variant: "success" });
              setDeleteOpen(false); setDeletingId(null);
              load();
            } catch (e: any) {
              notify({ title: "Errore rimozione", description: e?.message || "", variant: "error" });
            } finally {
              setRemoveSaving(false);
            }
          }} isLoading={removeSaving}>Rimuovi</Button>
        </DialogFooter>
      </Dialog>

      <Card>
        <CardHeader>
          <CardTitle>Invita sub-utente</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-4">
            <Input aria-label="Email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} leadingIcon={<MailIcon />} error={!!email && !emailValid} />
            <Input aria-label="Org ID" placeholder="Org ID" value={targetOrg ?? ""} onChange={(e) => setTargetOrg(e.target.value)} leadingIcon={<BuildingIcon />} error={(targetOrg ?? "").length > 0 && !orgIdValid} />
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={roleNew} onChange={(e) => setRoleNew(e.target.value)}>
              <option value="VIEWER">VIEWER</option>
              <option value="OPERATOR">OPERATOR</option>
              <option value="MANAGER">MANAGER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
            <Button isLoading={saving} onClick={async () => {
              if (!targetOrg) return alert("Org ID richiesto");
              setSaving(true);
              try {
                await apiJson(`/api/admin/users`, { method: 'POST', body: JSON.stringify({ org_id: targetOrg, email, role: roleNew }) });
                notify({ title: "Invitato", description: "Invito inviato", variant: "success" });
                setEmail(""); setTargetOrg(null); setRoleNew("VIEWER");
                load();
              } catch (e: any) {
                notify({ title: "Errore invito", description: e?.message || "", variant: "error" });
              } finally { setSaving(false); }
            }}>Invita</Button>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">L'invito verrà inviato all'email indicata.</div>
        </CardContent>
      </Card>
    </PageContainer>
  );
}