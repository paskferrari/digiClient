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
import { canTransition, type CaseStatus } from "../../../lib/rbac";
import { getAccessToken } from "../../../lib/supabaseClient";
import { NoteIcon } from "../../../components/ui/icons";

export default function CaseDetailPage() {
  const params = useParams();
  const caseId = (params?.id as string) ?? "";
  const { orgId, role } = useOrgStore();
  const { notify } = useToast();

  const [loading, setLoading] = React.useState(true);
  const [authReady, setAuthReady] = React.useState<boolean | null>(null);
  const [data, setData] = React.useState<any | null>(null);
  const [newStatus, setNewStatus] = React.useState<CaseStatus | "">("");
  const [note, setNote] = React.useState("");
  const KINDS = ['ID','IBAN','BILANCIO','DURC','ALTRO'];
  const [docKind, setDocKind] = React.useState<string>(KINDS[0]);
  const [statusSaving, setStatusSaving] = React.useState(false);
  const [noteSaving, setNoteSaving] = React.useState(false);
  const [uploadSaving, setUploadSaving] = React.useState(false);
  const [assigning, setAssigning] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    async function init() {
      const token = await getAccessToken();
      setAuthReady(!!token);
      if (!token || !orgId || !caseId) {
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const details = await apiJson<any>(`/api/cases/${caseId}`);
        if (cancelled) return;
        setData(details);
      } catch (e: any) {
        notify({ title: "Errore", description: e.message, variant: "error" });
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    init();
    return () => { cancelled = true; };
  }, [caseId, orgId]);

  const ALL: CaseStatus[] = [
    "NEW","SCREENING","REJECTED","APPROVED","ASSIGNED","DOCS_REQUESTED","IN_PROGRESS","SUBMITTED","FUNDED","CLOSED_LOST",
  ];

  const currentStatus: CaseStatus | null = data?.case?.status ?? null;
  const allowedNext = currentStatus && role ? ALL.filter((s) => canTransition(role as any, currentStatus as any, s as any)) : [];

  async function updateStatus() {
    if (!newStatus || !caseId) return;
    try {
      setStatusSaving(true);
      await apiJson(`/api/cases/${caseId}/status`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ to: newStatus }),
      });
      notify({ title: "Stato aggiornato", description: `→ ${newStatus}`, variant: "success" });
      // refresh
      const details = await apiJson<any>(`/api/cases/${caseId}`);
      setData(details);
      setNewStatus("");
    } catch (e: any) {
      notify({ title: "Aggiornamento fallito", description: e.message, variant: "error" });
    } finally {
      setStatusSaving(false);
    }
  }

  async function assignToMe() {
    try {
      setAssigning(true);
      const me = await apiJson<any>(`/api/me`);
      const uid = me?.profile?.id;
      if (!uid) throw new Error("Profilo utente non trovato");
      await apiJson(`/api/cases/${caseId}/assign`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ assigned_to: uid }),
      });
      notify({ title: "Assegnata", description: "Caso assegnato a te", variant: "success" });
      const details = await apiJson<any>(`/api/cases/${caseId}`);
      setData(details);
    } catch (e: any) {
      notify({ title: "Assegnazione fallita", description: e.message, variant: "error" });
    } finally {
      setAssigning(false);
    }
  }

  async function addNote() {
    if (!note.trim()) return;
    try {
      setNoteSaving(true);
      await apiJson(`/api/cases/${caseId}/events`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ type: "note", content: note.trim() }),
      });
      notify({ title: "Nota aggiunta", description: note.slice(0, 40), variant: "success" });
      setNote("");
      const details = await apiJson<any>(`/api/cases/${caseId}`);
      setData(details);
    } catch (e: any) {
      notify({ title: "Errore nota", description: e.message, variant: "error" });
    } finally {
      setNoteSaving(false);
    }
  }

  async function onFileSelected(file: File) {
    if (!file) return;
    try {
      setUploadSaving(true);
      const res = await apiJson<any>(`/api/cases/${caseId}/documents`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: file.name, contentType: file.type || "application/octet-stream", kind: docKind, size: file.size }),
      });
      const { uploadUrl } = res;
      if (uploadUrl) {
        const put = await fetch(uploadUrl, { method: "PUT", body: file, headers: { "content-type": file.type || "application/octet-stream" } });
        if (!put.ok) throw new Error(`Upload fallito (${put.status})`);
      }
      notify({ title: "Documento caricato", description: file.name, variant: "success" });
      const details = await apiJson<any>(`/api/cases/${caseId}`);
      setData(details);
    } catch (e: any) {
      notify({ title: "Errore upload", description: e.message, variant: "error" });
    } finally {
      setUploadSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Dettaglio pratica</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-72" />
              <Skeleton className="h-4 w-56" />
            </div>
          ) : authReady === false ? (
            <p>Devi effettuare il login per vedere i dettagli.</p>
          ) : !orgId ? (
            <p>Seleziona un’organizzazione nel selettore in alto.</p>
          ) : !data ? (
            <p>Nessun dato disponibile.</p>
          ) : (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground">ID: <span className="font-mono">{data.case.id}</span></div>
              <div className="flex flex-wrap items-center gap-4">
                <div>Stato: <span className="font-mono font-semibold">{data.case.status}</span></div>
                <div>Priorità: <span className="font-mono">{data.case.priority}</span></div>
                <div>Assegnata a: <span className="font-mono">{data.case.assigned_to || "—"}</span></div>
                <Button onClick={assignToMe} isLoading={assigning} disabled={assigning} aria-label="Assegna a me">Assegna a me</Button>
              </div>

              <div className="flex items-center gap-2">
                <select aria-label="Nuovo stato" className="border rounded px-2 py-1" value={newStatus || ""} onChange={(e) => setNewStatus(e.target.value as CaseStatus)}>
                  <option value="">Seleziona transizione…</option>
                  {allowedNext.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <Button onClick={updateStatus} disabled={!newStatus || statusSaving} isLoading={statusSaving} aria-label="Aggiorna stato">Aggiorna stato</Button>
              </div>

              <div className="flex items-center gap-2">
                <Input aria-label="Aggiungi nota" placeholder="Aggiungi nota" value={note} onChange={(e) => setNote(e.target.value)} leadingIcon={<NoteIcon />} error={note.length > 0 && note.trim().length < 3} />
                <Button onClick={addNote} disabled={!note.trim() || noteSaving} isLoading={noteSaving} aria-label="Salva nota">Salva nota</Button>
              </div>
              <div className="text-xs text-muted-foreground">Le note sono visibili agli operatori del caso.</div>
              {note.length > 0 && note.trim().length < 3 && (<div className="text-xs text-destructive">Inserisci almeno 3 caratteri.</div>)}

              <div className="flex items-center gap-2">
                <span className="text-sm">Carica documento</span>
                <label className="text-sm" htmlFor="doc-kind">Tipo</label>
                <select id="doc-kind" aria-label="Tipo documento" className="border rounded px-2 py-1" value={docKind} onChange={(e) => setDocKind(e.target.value)}>
                  {KINDS.map((k) => (
                    <option key={k} value={k}>{k}</option>
                  ))}
                </select>
                <input aria-label="Carica documento" type="file" accept="application/pdf,image/*" disabled={uploadSaving} onChange={(e) => onFileSelected(e.target.files?.[0]!) } />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Eventi</CardTitle>
        </CardHeader>
        <CardContent>
          {!data ? (
            <p>—</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Data</TH>
                  <TH>Tipo</TH>
                  <TH>Contenuto</TH>
                </TR>
              </THead>
              <TBody>
                {data.events.map((ev: any) => (
                  <TR key={ev.id}>
                    <TD>{new Date(ev.created_at).toLocaleString()}</TD>
                    <TD>{ev.type}</TD>
                    <TD>{ev.content}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Documenti</CardTitle>
        </CardHeader>
        <CardContent>
          {!data ? (
            <p>—</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Nome</TH>
                  <TH>Data</TH>
                </TR>
              </THead>
              <TBody>
                {data.documents.map((d: any) => (
                  <TR key={d.id}>
                    <TD>{d.name}</TD>
                    <TD>{new Date(d.created_at).toLocaleString()}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Task</CardTitle>
        </CardHeader>
        <CardContent>
          {!data ? (
            <p>—</p>
          ) : (
            <Table>
              <THead>
                <TR>
                  <TH>Titolo</TH>
                  <TH>Stato</TH>
                  <TH>Creato</TH>
                </TR>
              </THead>
              <TBody>
                {data.tasks.map((t: any) => (
                  <TR key={t.id}>
                    <TD>{t.title}</TD>
                    <TD>{t.status}</TD>
                    <TD>{t.created_at ? new Date(t.created_at).toLocaleString() : '—'}</TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

// Icona locale rimossa: ora importata da components/ui/icons