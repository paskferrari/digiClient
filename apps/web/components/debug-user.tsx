"use client";
import * as React from "react";
import { useOrgStore } from "../lib/store/org";
import { apiJson } from "../lib/api/client";
import type { MeResponse } from "../lib/api/schemas";

export function DebugUser() {
  const { orgId, role, memberships } = useOrgStore();
  const [me, setMe] = React.useState<MeResponse | null>(null);

  React.useEffect(() => {
    apiJson<MeResponse>("/api/me").then(setMe).catch(() => {});
  }, []);

  if (process.env.NODE_ENV !== 'development') return null;

  const currentOrgName = memberships.find((m) => m.org_id === orgId)?.org_name || orgId || 'None';
  const currentRole = memberships.find((m) => m.org_id === orgId)?.role || role || 'None';
  const userLabel = me?.profile?.full_name || me?.profile?.email || 'Unknown';

  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded text-xs max-w-xs">
      <div><strong>Debug User Info:</strong></div>
      <div>User: {userLabel}</div>
      <div>Current Org: {currentOrgName}</div>
      <div>Current Role: {currentRole}</div>
      <div>Memberships: {memberships.length}</div>
      {memberships.map((m, i) => (
        <div key={i}>- {m.org_name || m.org_id} ({m.role})</div>
      ))}
    </div>
  );
}