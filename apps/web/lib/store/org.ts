"use client";
import { create } from "zustand";

export type Membership = {
  org_id: string;
  role: string;
  org_name?: string | null;
};

type OrgState = {
  memberships: Membership[];
  orgId: string | null;
  role: string | null;
  setMemberships: (m: Membership[]) => void;
  setOrg: (id: string, role: string | null) => void;
  hydrateFromStorage: () => void;
};

export const useOrgStore = create<OrgState>((set, get) => ({
  memberships: [],
  orgId: null,
  role: null,
  setMemberships: (m) => set({ memberships: m }),
  setOrg: (id, role) => {
    try {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("dc_orgId", id);
        if (role) window.localStorage.setItem("dc_orgRole", role);
      }
    } catch {}
    set({ orgId: id, role });
  },
  hydrateFromStorage: () => {
    try {
      if (typeof window !== "undefined") {
        const id = window.localStorage.getItem("dc_orgId");
        const role = window.localStorage.getItem("dc_orgRole");
        if (id) set({ orgId: id, role });
      }
    } catch {}
  },
}));