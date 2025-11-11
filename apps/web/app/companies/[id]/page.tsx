"use client";
import * as React from "react";
import { useParams } from "next/navigation";
import { Card, CardHeader, CardTitle, CardContent } from "../../../components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "../../../components/ui/table";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { Skeleton } from "../../../components/ui/skeleton";
import { useToast } from "../../../components/ui/toast";
import { apiJson } from "../../../lib/api/client";
import { useOrgStore } from "../../../lib/store/org";
import { supabase } from "../../../lib/supabaseClient";

type CompanyDetail = {
  company: { id: string; org_id: string; legal_name: string; vat_number: string; status?: string; assigned_to?: string | null; created_at?: string };
  events: { id: string; type: string; content: string; created_at: string }[];
};

export default function CompanyDetailPage() {
  const params = useParams();
  const companyId = (params?.id as string) ?? "";
  const { orgId } = useOrgStore();
  const { notify } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [data, setData] = React.useState<CompanyDetail | null>(null);
  const [newStatus, setNewStatus] = React.useState<string>("");
  const [note, setNote] = React.useState("");
  const [members, setMembers] = React.useState<{ id: string; role: string }[]>([]);
  const [assignedTo, setAssignedTo] = React.useState<string>("");
  const [savingStatus, setSavingStatus] = React.useState(false);
  const [savingAssign, setSavingAssign] = React.useState(false);
  const [savingNote, setSavingNote] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function init() {
      if (!orgId) { setLoading(false); return; }
      try {
        const detail = await apiJson<CompanyDetail>(`/api/companies/${companyId}`);
        if (cancelled) return;
        setData(detail);
        setNewStatus(detail.company.status || "ACTIVE");
        setAssignedTo(detail.company.assigned_to || "");
      } catch (e: any) {
        notify({ title: "Errore", description: e.message, variant: "error" });
      } finally {
        setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [orgId, companyId]);

  React.useEffect(() => {
    let cancelled = false;
    async function loadMembers() {
      if (!orgId) return;
      const { data } = await supabase
        .from('memberships')
        .select('id, role')
        .eq('org_id', orgId);
      if (!cancelled) setMembers((data || []) as any);
    }
    loadMembers();
    return () => { cancelled = true; };
  }, [orgId]);

  async function updateStatus() {
    if (!newStatus) return;
    setSavingStatus(true);
    try {
      const res = await apiJson<{ id: string; status: string }>(`/api/companies/${companyId}/status`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ to: newStatus }),
      });
      setData((prev) => prev ? ({ ...prev, company: { ...prev.company, status: res.status } }) : prev);
      notify({ title: "Stato aggiornato", description: `Nuovo stato: ${res.status}`, variant: "success" });
    } catch (e: any) {
      notify({ title: "Errore stato", description: e.message, variant: "error" });
    } finally { setSavingStatus(false); }
  }

  async function assignOperator() {
    if (!assignedTo) return;
    setSavingAssign(true);
    try {
      const res = await apiJson<{ id: string; assigned_to: string }>(`/api/companies/${companyId}/assign`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ assigned_to: assignedTo }),
      });
      setData((prev) => prev ? ({ ...prev, company: { ...prev.company, assigned_to: res.assigned_to } }) : prev);
      notify({ title: "Operatore assegnato", description: `Membership: ${res.assigned_to}`, variant: "success" });
    } catch (e: any) {
      notify({ title: "Errore assegnazione", description: e.message, variant: "error" });
    } finally { setSavingAssign(false); }
  }

  async function addNote() {
    const content = note.trim();
    if (content.length < 1) return;
    setSavingNote(true);
    try {
      const ev = await apiJson<{ id: string; type: string; content: string; created_at: string }>(`/api/companies/${companyId}/events`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ type: 'note', content }),
      });
      setData((prev) => prev ? ({ ...prev, events: [ev, ...prev.events] }) : prev);
      setNote("");
      notify({ title: "Nota aggiunta", description: "La nota è stata registrata.", variant: "success" });
    } catch (e: any) {
      notify({ title: "Errore nota", description: e.message, variant: "error" });
    } finally { setSavingNote(false); }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dettaglio azienda</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : !data ? (
            <p>Nessun dato disponibile.</p>
          ) : (
            <div className="space-y-3">
              <div className="text-sm text-muted-foreground">ID: <span className="font-mono">{data.company.id}</span></div>
              <div className="text-sm">Nome: <strong>{data.company.legal_name}</strong></div>
              <div className="text-sm">P.IVA: <span className="font-mono">{data.company.vat_number}</span></div>
              <div className="text-sm">Stato: <span className="font-mono">{data.company.status || 'ACTIVE'}</span></div>
              <div className="text-sm">Assegnata a: <span className="font-mono">{data.company.assigned_to || '—'}</span></div>

              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="Stato" className="border rounded px-2 py-1" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  {['ACTIVE','PENDING','SUSPENDED','ARCHIVED'].map((s) => (<option key={s} value={s}>{s}</option>))}
                </select>
                <Button onClick={updateStatus} isLoading={savingStatus}>Aggiorna stato</Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select aria-label="Assegna operatore" className="border rounded px-2 py-1" value={assignedTo} onChange={(e) => setAssignedTo(e.target.value)}>
                  <option value="">Seleziona membership</option>
                  {members.map((m) => (<option key={m.id} value={m.id}>{m.id} ({m.role})</option>))}
                </select>
                <Button onClick={assignOperator} isLoading={savingAssign} disabled={!assignedTo}>Assegna</Button>
              </div>

              <div className="flex items-center gap-2">
                <Input aria-label="Aggiungi nota" placeholder="Scrivi una nota" value={note} onChange={(e) => setNote(e.target.value)} />
                <Button onClick={addNote} isLoading={savingNote} disabled={note.trim().length < 1}>Aggiungi nota</Button>
              </div>

              <div>
                <h3 className="text-sm font-medium mb-1">Eventi</h3>
                {data.events.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nessun evento registrato.</p>
                ) : (
                  <Table>
                    <THead>
                      <TR>
                        <TH>Data</TH>
                        <TH>Tipo</TH>
                        <TH>Dettagli</TH>
                      </TR>
                    </THead>
                    <TBody>
                      {data.events.map((e) => (
                        <TR key={e.id}>
                          <TD className="text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</TD>
                          <TD>{e.type}</TD>
                          <TD>{e.content}</TD>
                        </TR>
                      ))}
                    </TBody>
                  </Table>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}