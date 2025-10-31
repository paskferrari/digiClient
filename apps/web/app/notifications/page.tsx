"use client";
import * as React from "react";
import Link from "next/link";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Skeleton } from "../../components/ui/skeleton";
import { Button } from "../../components/ui/button";
import { useToast } from "../../components/ui/toast";
import { useOrgStore } from "../../lib/store/org";
import { apiJson } from "../../lib/api/client";
import { PageContainer } from "../../components/layout/PageContainer";

export default function NotificationsPage() {
  const orgId = useOrgStore((s) => s.orgId);
  const [items, setItems] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [prefs, setPrefs] = React.useState<null | {
    assignment: { email: boolean; inapp: boolean };
    status_change: { email: boolean; inapp: boolean };
    doc_rejected: { email: boolean; inapp: boolean };
    task_due: { email: boolean; inapp: boolean };
  }>(null);
  const [prefsLoading, setPrefsLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const { notify } = useToast();

  React.useEffect(() => {
    let ignore = false;
    async function load() {
      if (!orgId) return;
      setLoading(true);
      try {
        const data = await apiJson<{ items: any[] }>(`/api/notifications`);
        if (!ignore) setItems(data.items || []);
      } catch {
        if (!ignore) setItems([]);
      } finally {
        if (!ignore) setLoading(false);
      }
    }
    async function loadPrefs() {
      if (!orgId) return;
      setPrefsLoading(true);
      try {
        const p = await apiJson<any>(`/api/notifications/preferences`);
        if (!ignore) setPrefs(p);
      } catch {
        if (!ignore) setPrefs(null);
      } finally {
        if (!ignore) setPrefsLoading(false);
      }
    }
    load();
    loadPrefs();
    return () => { ignore = true; };
  }, [orgId]);

  function togglePref(type: keyof NonNullable<typeof prefs>, channel: 'email' | 'inapp') {
    if (!prefs) return;
    setPrefs({
      ...prefs,
      [type]: { ...prefs[type], [channel]: !prefs[type][channel] },
    });
  }

  async function savePrefs() {
    if (!prefs) return;
    setSaving(true);
    try {
      await apiJson(`/api/notifications/preferences`, {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(prefs),
      });
      notify({ title: "Preferenze salvate", description: "Le tue preferenze sono state aggiornate", variant: "success" });
    } catch (e: any) {
      notify({ title: "Salvataggio fallito", description: e.message, variant: "error" });
    } finally {
      setSaving(false);
    }
  }

  async function reload() {
    if (!orgId) return;
    setLoading(true);
    setPrefsLoading(true);
    try {
      const [data, p] = await Promise.all([
        apiJson<{ items: any[] }>(`/api/notifications`),
        apiJson<any>(`/api/notifications/preferences`)
      ]);
      setItems(data.items || []);
      setPrefs(p);
    } catch {
      setItems([]);
      setPrefs(null);
    } finally {
      setLoading(false);
      setPrefsLoading(false);
    }
  }

  return (
    <PageContainer
      title="Notifiche"
      description="Gestione notifiche e preferenze di comunicazione"
      actions={<Button variant="outline" onClick={reload}>Ricarica</Button>}
    >
      <Card>
        <CardHeader>
          <CardTitle>Preferenze notifiche</CardTitle>
        </CardHeader>
        <CardContent>
          {prefsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : !prefs ? (
            <p>Impossibile caricare le preferenze</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2 items-center">
                <div className="font-medium">Assegnazione</div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={prefs.assignment.email} onChange={() => togglePref('assignment','email')} />
                  Email
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={prefs.assignment.inapp} onChange={() => togglePref('assignment','inapp')} />
                  In-app
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div className="font-medium">Cambio stato</div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={prefs.status_change.email} onChange={() => togglePref('status_change','email')} />
                  Email
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={prefs.status_change.inapp} onChange={() => togglePref('status_change','inapp')} />
                  In-app
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div className="font-medium">Documento rifiutato</div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={prefs.doc_rejected.email} onChange={() => togglePref('doc_rejected','email')} />
                  Email
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={prefs.doc_rejected.inapp} onChange={() => togglePref('doc_rejected','inapp')} />
                  In-app
                </label>
              </div>
              <div className="grid grid-cols-3 gap-2 items-center">
                <div className="font-medium">Task in scadenza</div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={prefs.task_due.email} onChange={() => togglePref('task_due','email')} />
                  Email
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={prefs.task_due.inapp} onChange={() => togglePref('task_due','inapp')} />
                  In-app
                </label>
              </div>
              <div className="pt-2">
                <Button onClick={savePrefs} isLoading={saving} aria-label="Salva preferenze">Salva preferenze</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notifiche</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-56" />
              <Skeleton className="h-4 w-64" />
              <Skeleton className="h-4 w-48" />
            </div>
          ) : items.length === 0 ? (
            <p>Nessuna notifica recente</p>
          ) : (
            <ul className="space-y-2">
              {items.map((n) => {
                let diff: any = n.diff;
                try { if (typeof diff === "string") diff = JSON.parse(diff); } catch {}
                const type = diff?.type || "";
                const channel = diff?.channel || "";
                const subject = diff?.subject || "";
                const href = (() => {
                  if (n.target_table === 'cases' && n.target_id) return `/cases/${n.target_id}`;
                  return undefined;
                })();
                return (
                  <li key={n.id} className="flex items-center justify-between">
                    <div>
                      <div className="text-sm">{subject || `${type} via ${channel}`}</div>
                      <div className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString()}</div>
                    </div>
                    {href ? (
                      <Link href={href} className="text-sm hover:underline">Apri</Link>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}