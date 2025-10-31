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
import { BuildingIcon } from "../../../components/ui/icons";
import { PageContainer } from "../../../components/layout/PageContainer";

type OrgItem = { id: string; name: string; type: string; created_at: string };

export default function AdminOrganizationsPage() {
  const { orgId, role } = useOrgStore();
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<OrgItem[]>([]);
  const [name, setName] = React.useState("");
  const [type, setType] = React.useState("association");
  const [saving, setSaving] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [editingName, setEditingName] = React.useState<string>("");
  const [deletingId, setDeletingId] = React.useState<string | null>(null);
  const [editOpen, setEditOpen] = React.useState(false);
  const [deleteOpen, setDeleteOpen] = React.useState(false);
  const [editSaving, setEditSaving] = React.useState(false);
  const [deleteSaving, setDeleteSaving] = React.useState(false);
  const { notify } = useToast();
  const nameValid = name.trim().length >= 2;
  const editingNameValid = editingName.trim().length >= 2;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      if (!orgId) { setItems([]); return; }
      const res = await apiJson<{ items: OrgItem[] }>("/api/admin/organizations");
      setItems(res.items || []);
    } finally {
      setLoading(false);
    }
  }, [orgId]);

  React.useEffect(() => { if (role === "ADMIN") load(); }, [role, load]);

  if (role !== "ADMIN") return <p className="text-sm">Accesso negato</p>;

  const exportCSV = () => {
    const header = ["id","name","type","created_at"].join(",");
    const rows = items.map((i) => [i.id, i.name, i.type, i.created_at].map((v) => `"${String(v).replace(/"/g,'"')}"`).join(","));
    const blob = new Blob([header+"\n"+rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "organizations.csv"; a.click(); URL.revokeObjectURL(url);
  };

  return (
    <PageContainer
      title="Admin · Organizzazioni"
      description="Gestione organizzazioni del sistema: creazione, modifica ed esportazione dati"
      actions={(
        <>
          <Button onClick={exportCSV}>Esporta CSV</Button>
          <Button onClick={load}>Ricarica</Button>
        </>
      )}
    >
      <IdleTimeout minutes={15} />
      
      {/* Form creazione nuova organizzazione */}
      <Card>
        <CardHeader>
          <CardTitle>Nuova organizzazione</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 md:grid-cols-3">
            <Input aria-label="Nome organizzazione" placeholder="Nome" value={name} onChange={(e) => setName(e.target.value)} leadingIcon={<BuildingIcon />} error={name.length > 0 && !nameValid} />
            <select className="h-10 rounded-md border bg-background px-3 text-sm" value={type} onChange={(e) => setType(e.target.value)}>
              <option value="association">association</option>
              <option value="platform">platform</option>
              <option value="company">company</option>
            </select>
            <Button isLoading={saving} onClick={async () => {
              setSaving(true);
              try {
                await apiJson(`/api/admin/organizations`, { method: 'POST', body: JSON.stringify({ name, type }) });
                notify({ title: "Creata", description: "Organizzazione creata", variant: "success" });
                setName(""); setType("association");
                load();
              } catch (e: any) {
                notify({ title: "Errore creazione", description: e?.message || "", variant: "error" });
              } finally { setSaving(false); }
            }}>Crea</Button>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">Il nome sarà visibile agli utenti.</div>
          {name.length > 0 && !nameValid && (<div className="text-xs text-destructive">Inserisci almeno 2 caratteri.</div>)}
        </CardContent>
      </Card>

      {/* Tabella organizzazioni esistenti */}
      <Card>
        <CardHeader>
          <CardTitle>Organizzazioni esistenti</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Skeleton className="h-32 w-full" />
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Nome</TH>
                  <TH>Tipo</TH>
                  <TH>Creato</TH>
                  <TH></TH>
                </TR>
              </THead>
              <TBody>
                {items.map((o) => (
                  <TR key={o.id}>
                    <TD>
                      {editingId === o.id ? (
                        <div className="flex items-center gap-2">
                          <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} leadingIcon={<BuildingIcon />} error={editingName.length > 0 && !editingNameValid} />
                          <Button size="sm" onClick={async () => {
                            await apiJson(`/api/admin/organizations`, { method: 'PATCH', body: JSON.stringify({ id: o.id, name: editingName, type: o.type }) });
                            setEditingId(null); setEditingName("");
                            load();
                          }}>Salva</Button>
                          <Button size="sm" variant="secondary" onClick={() => { setEditingId(null); setEditingName(""); }}>Annulla</Button>
                        </div>
                      ) : (
                        o.name
                      )}
                    </TD>
                    <TD>{o.type}</TD>
                    <TD>{new Date(o.created_at).toLocaleDateString()}</TD>
                    <TD className="text-right">
                      <Button size="sm" variant="secondary" onClick={() => { setEditingId(o.id); setEditingName(o.name); setEditOpen(true); }}>Modifica</Button>
                      <Button size="sm" variant="destructive" className="ml-2" onClick={() => { setDeletingId(o.id); setDeleteOpen(true); }}>Elimina</Button>
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit dialog */}
      <Dialog open={editOpen} onOpenChange={(v) => { setEditOpen(v); if (!v) { setEditingId(null); setEditingName(""); } }} title="Modifica organizzazione">
        <div className="space-y-2">
          <label className="text-sm">Nome</label>
          <Input value={editingName} onChange={(e) => setEditingName(e.target.value)} leadingIcon={<BuildingIcon />} error={editingName.length > 0 && !editingNameValid} />
          {editingName.length > 0 && !editingNameValid && (<p className="text-xs text-destructive">Il nome deve avere almeno 2 caratteri.</p>)}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => { setEditOpen(false); setEditingId(null); }} disabled={editSaving}>Annulla</Button>
          <Button onClick={async () => {
            setEditSaving(true);
            try {
              await apiJson(`/api/admin/organizations`, { method: 'PATCH', body: JSON.stringify({ id: editingId, name: editingName }) });
              notify({ title: "Salvato", description: "Organizzazione aggiornata", variant: "success" });
              setEditOpen(false); setEditingId(null); setEditingName("");
              load();
            } catch (e: any) {
              notify({ title: "Errore salvataggio", description: e?.message || "", variant: "error" });
            } finally {
              setEditSaving(false);
            }
          }} isLoading={editSaving}>Salva</Button>
        </DialogFooter>
      </Dialog>

      {/* Delete dialog */}
      <Dialog open={deleteOpen} onOpenChange={(v) => { setDeleteOpen(v); if (!v) setDeletingId(null); }} title="Conferma eliminazione">
        <p className="text-sm">Sei sicuro di voler eliminare questa organizzazione?</p>
        <DialogFooter>
          <Button variant="secondary" onClick={() => { setDeleteOpen(false); setDeletingId(null); }} disabled={deleteSaving}>Annulla</Button>
          <Button variant="destructive" onClick={async () => {
            setDeleteSaving(true);
            try {
              await apiJson(`/api/admin/organizations`, { method: 'DELETE', body: JSON.stringify({ id: deletingId }) });
              notify({ title: "Eliminata", description: "Organizzazione eliminata", variant: "success" });
              setDeleteOpen(false); setDeletingId(null);
              load();
            } catch (e: any) {
              notify({ title: "Errore eliminazione", description: e?.message || "", variant: "error" });
            } finally {
              setDeleteSaving(false);
            }
          }} isLoading={deleteSaving}>Elimina</Button>
        </DialogFooter>
      </Dialog>
    </PageContainer>
  );
}