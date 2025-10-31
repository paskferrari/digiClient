"use client";
import * as React from "react";
import { useOrgStore } from "../lib/store/org";

export function DebugUser() {
  const { orgId, role, memberships } = useOrgStore();
  
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded text-xs max-w-xs">
      <div><strong>Debug User Info:</strong></div>
      <div>Current Org: {orgId || 'None'}</div>
      <div>Current Role: {role || 'None'}</div>
      <div>Memberships: {memberships.length}</div>
      {memberships.map((m, i) => (
        <div key={i}>- {m.org_name || m.org_id} ({m.role})</div>
      ))}
    </div>
  );
}