"use client";
import * as React from "react";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Table, THead, TBody, TR, TH, TD } from "../../components/ui/table";
import { Skeleton } from "../../components/ui/skeleton";
import { Dialog, DialogFooter } from "../../components/ui/dialog";
import { useToast } from "../../components/ui/toast";
import { Skeleton } from "../../components/ui/skeleton";
import { useOrgStore } from "../../lib/store/org";
import { apiJson } from "../../lib/api/client";
import { IdleTimeout } from "../../components/idle-timeout";

type OrgItem = { id: string; name: string; type: string; created_at: string };
type StatItem = { label: string; value: number };
type AlertItem = { id: string; action: string; created_at: string; info?: string };

export default function AdminDashboardPage() {
  const { orgId, role } = useOrgStore();
  const [loading, setLoading] = React.useState(true);
  const [orgs, setOrgs] = React.useState<OrgItem[]>([]);
  const [stats, setStats] = React.useState<StatItem[]>([]);
  const [alerts, setAlerts] = React.useState<AlertItem[]>([]);
  const { notify } = useToast();

  // Form state: create organization
  const [orgName, setOrgName] = React.useState("");
  const [orgType, setOrgType] = React.useState<"association"|"platform"|"company">("association");
  const [orgSaving, setOrgSaving] = React.useState(false);

  async function createOrganization() {
    if (!orgName.trim()) {
      notify({ title: "Nome richiesto", description: "Inserisci il nome dell'organizzazione", variant: "error" });
      return;
    }
    setOrgSaving(true);
    try {
      const created = await apiJson<OrgItem>("/api/admin/organizations", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: orgName.trim(), type: orgType })
      });
      notify({ title: "Organizzazione creata", description: created.name, variant: "success" });
      setOrgName("");
      // refresh orgs list
      const orgRes = await apiJson<{ items: OrgItem[] }>("/api/admin/organizations", { headers: orgId ? { "x-org-id": orgId } : undefined });
      setOrgs(orgRes.items || []);
    } catch (e: any) {
      notify({ title: "Errore creazione", description: e?.message || "", variant: "error" });
    } finally {
      setOrgSaving(false);
    }
  }

  // Form state: invite sub-user
  const [inviteEmail, setInviteEmail] = React.useState("");
  const [inviteRole, setInviteRole] = React.useState<"ADMIN"|"MANAGER"|"STAFF"|"VIEWER">("VIEWER");
  const [inviteOrgId, setInviteOrgId] = React.useState<string>("");
  const [inviteSaving, setInviteSaving] = React.useState(false);

  async function inviteSubUser() {
    const email = inviteEmail.trim().toLowerCase();
    const targetOrg = inviteOrgId || orgId || "";
    if (!email) {
      notify({ title: "Email richiesta", description: "Inserisci l'email del sub-user", variant: "error" });
      return;
    }
    if (!targetOrg) {
      notify({ title: "Organizzazione richiesta", description: "Seleziona un'organizzazione di destinazione", variant: "error" });
      return;
    }
    setInviteSaving(true);
    try {
      await apiJson("/api/admin/users", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ org_id: targetOrg, email, role: inviteRole })
      });
      notify({ title: "Invito inviato", description: `Invitato ${email} su org ${targetOrg}`, variant: "success" });
      setInviteEmail("");
      setInviteOrgId("");
      setInviteRole("VIEWER");
    } catch (e: any) {
      notify({ title: "Errore invito", description: e?.message || "", variant: "error" });
    } finally {
      setInviteSaving(false);
    }
  }

  // Gestione membri: stato e operazioni
  type MemberItem = { id: string; org_id: string; role: string; email: string; full_name?: string | null };
  const [membersLoading, setMembersLoading] = React.useState(true);
  const [members, setMembers] = React.useState<MemberItem[]>([]);
  const [manageOrgId, setManageOrgId] = React.useState<string>("");
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingRole, setEditingRole] = React.useState<string>("VIEWER");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [roleSaving, setRoleSaving] = React.useState(false);
  const [removeSaving, setRemoveSaving] = React.useState(false);

  const loadMembers = React.useCallback(async () => {
    setMembersLoading(true);
    try {
      const res = await apiJson<{ items: MemberItem[] }>("/api/admin/users");
      setMembers(res.items || []);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  React.useEffect(() => {
    setManageOrgId(orgId || "");
  }, [orgId]);

  React.useEffect(() => {
    if (role === "ADMIN") loadMembers();
  }, [role, loadMembers]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        // Fetch organizations and recent audit stats (last 7 days)
        const [orgRes, statRes, alertRes] = await Promise.all([
          apiJson<{ items: OrgItem[] }>("/api/admin/organizations", { headers: orgId ? { "x-org-id": orgId } : undefined }),
          apiJson<{ users: number; memberships: number; last7d_actions: number }>("/api/admin/stats", { headers: orgId ? { "x-org-id": orgId } : undefined }).catch(() => ({ users: 0, memberships: 0, last7d_actions: 0 } as any)),
          apiJson<{ items: AlertItem[] }>("/api/admin/alerts", { headers: orgId ? { "x-org-id": orgId } : undefined }).catch(() => ({ items: [] })),
        ]);
        if (!cancelled) {
          setOrgs(orgRes.items || []);
          setStats([
            { label: "Utenti", value: statRes.users ?? 0 },
            { label: "Memberships", value: statRes.memberships ?? 0 },
            { label: "Azioni ultimi 7gg", value: statRes.last7d_actions ?? 0 },
          ]);
          setAlerts(alertRes.items || []);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    if (role !== "ADMIN") return; // render gate below
    load();
    return () => { cancelled = true; };
  }, [orgId, role]);

  if (role !== "ADMIN") {
    return <p className="text-sm">Accesso negato: area riservata agli amministratori.</p>;
  }

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <IdleTimeout minutes={15} />
      {/* Sezione: Crea organizzazione */}
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Crea organizzazione</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-end">
            <div>
              <label className="block text-sm font-medium">Nome</label>
              <Input aria-label="Nome organizzazione" placeholder="Es. Confartigianato" value={orgName} onChange={(e) => setOrgName(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">Tipo</label>
              <select aria-label="Tipo organizzazione" className="mt-1 w-full border rounded px-2 py-1" value={orgType} onChange={(e) => setOrgType(e.target.value as any)}>
                <option value="association">Associazione</option>
                <option value="company">Azienda</option>
                <option value="platform">Piattaforma</option>
              </select>
            </div>
            <div>
              <Button onClick={createOrganization} isLoading={orgSaving} aria-label="Crea organizzazione">Crea</Button>
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Le organizzazioni create saranno visibili nella sezione Organizzazioni.</div>
        </CardContent>
      </Card>
      <Card className="md:col-span-2">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Organizzazioni</CardTitle>
            <Button onClick={() => window.location.href = '/admin/organizations'}>Gestisci</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : orgs.length === 0 ? (
            <p>Nessuna organizzazione trovata</p>
          ) : (
            <ul className="space-y-2">
              {orgs.slice(0, 8).map((o) => (
                <li key={o.id} className="flex items-center justify-between">
                  <span>{o.name} <span className="text-xs text-muted-foreground">({o.type})</span></span>
                  <span className="text-xs text-muted-foreground">{new Date(o.created_at).toLocaleDateString()}</span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Sezione: Invita sub-user legato a organizzazione */}
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Invita sub-user</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
            <div>
              <label className="block text-sm font-medium">Organizzazione</label>
              <select aria-label="Organizzazione destinazione" className="mt-1 w-full border rounded px-2 py-1" value={inviteOrgId} onChange={(e) => setInviteOrgId(e.target.value)}>
                <option value="">Seleziona…</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium">Email sub-user</label>
              <Input aria-label="Email sub-user" placeholder="esempio@dominio.it" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">Ruolo</label>
              <select aria-label="Ruolo utente" className="mt-1 w-full border rounded px-2 py-1" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as any)}>
                <option value="VIEWER">Viewer</option>
                <option value="STAFF">Staff</option>
                <option value="MANAGER">Manager</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <div>
              <Button onClick={inviteSubUser} isLoading={inviteSaving} aria-label="Invita sub-user">Invita</Button>
            </div>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">L'invito verrà inviato all'email indicata e la membership sarà legata all'organizzazione selezionata.</div>
        </CardContent>
      </Card>

      {/* Sezione: Gestione membri */}
      <Card className="md:col-span-3">
        <CardHeader>
          <CardTitle>Gestione membri</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end mb-3">
            <div>
              <label className="block text-sm font-medium">Organizzazione</label>
              <select aria-label="Organizzazione" className="mt-1 w-full border rounded px-2 py-1" value={manageOrgId} onChange={(e) => setManageOrgId(e.target.value)}>
                <option value="">Seleziona…</option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
            </div>
            <div className="md:col-span-2" />
            <div className="text-right">
              <Button onClick={loadMembers}>Ricarica</Button>
            </div>
          </div>

          {membersLoading ? (
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
                {members.filter(m => !manageOrgId || m.org_id === manageOrgId).map((m) => (
                  <TR key={m.id}>
                    <TD>{m.email}</TD>
                    <TD>{m.full_name || "—"}</TD>
                    <TD className="text-xs text-muted-foreground">{m.org_id}</TD>
                    <TD>{m.role}</TD>
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
              loadMembers();
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
              loadMembers();
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
          <div className="flex items-center justify-between">
            <CardTitle>Statistiche utenti</CardTitle>
            <Button onClick={() => window.location.href = '/admin/users'}>Gestisci</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : (
            <ul className="space-y-2">
              {stats.map((s) => (
                <li key={s.label} className="flex justify-between"><span>{s.label}</span><span>{s.value}</span></li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Audit di sistema</CardTitle>
            <Button onClick={() => window.location.href = '/admin/audit'}>Apri Audit</Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Visualizza e filtra gli eventi registrati dal sistema (azioni amministrative, notifiche, modifiche a risorse).</p>
        </CardContent>
      </Card>

      <Card className="md:col-span-3">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Alert attività sospette</CardTitle>
            <Button onClick={() => window.location.href = '/admin/alerts'}>Dettagli</Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-24 w-full" />
          ) : alerts.length === 0 ? (
            <p>Nessun alert sospetto al momento</p>
          ) : (
            <ul className="space-y-1">
              {alerts.map((a) => (
                <li key={a.id} className="flex justify-between"><span>{a.action}</span><span className="text-xs text-muted-foreground">{new Date(a.created_at).toLocaleString()}</span></li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}