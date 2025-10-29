"use client";
import * as React from "react";
import { useOrgStore } from "../lib/store/org";
import { apiJson } from "../lib/api/client";
import type { MeResponse } from "../lib/api/schemas";

export function OrgSwitcher() {
  const { orgId, role, memberships, setMemberships, setOrg, hydrateFromStorage } = useOrgStore();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    hydrateFromStorage();
    setLoading(true);
    apiJson<MeResponse>("/api/me")
      .then((me) => {
        setMemberships(me.memberships.map((m: MeResponse['memberships'][number]) => ({ org_id: m.org_id, role: m.role })));
        const stored = typeof window !== "undefined" ? window.localStorage.getItem("dc_orgId") : null;
        const defaultOrg = stored || me.currentOrg?.org_id || me.memberships[0]?.org_id || null;
        const defaultRole = me.memberships.find((m: MeResponse['memberships'][number]) => m.org_id === defaultOrg)?.role || null;
        if (defaultOrg) setOrg(defaultOrg, defaultRole);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [hydrateFromStorage, setMemberships, setOrg]);

  return (
    <div className="flex items-center gap-2" aria-label="Selettore organizzazione">
      <label htmlFor="org-select" className="sr-only">Organizzazione</label>
      <select
        id="org-select"
        aria-label="Seleziona organizzazione"
        className="h-9 rounded-md border bg-background px-2 text-sm"
        value={orgId ?? ""}
        onChange={(e) => {
          const id = e.target.value;
          const r = memberships.find((m) => m.org_id === id)?.role || null;
          setOrg(id, r);
        }}
      >
        <option value="" disabled>
          {loading ? "Caricamento..." : error ? "Errore" : "Seleziona"}
        </option>
        {memberships.map((m) => (
          <option key={m.org_id} value={m.org_id}>
            {m.org_name || m.org_id} ({m.role})
          </option>
        ))}
      </select>
      {role ? <span className="text-xs text-muted-foreground" aria-label="Ruolo">{role}</span> : null}
    </div>
  );
}