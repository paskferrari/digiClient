"use client";
import { getAccessToken } from "../supabaseClient";
import { useOrgStore } from "../store/org";

export async function apiFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const headers = new Headers(init.headers || {});
  if (token) headers.set("Authorization", `Bearer ${token}`);
  let orgId = useOrgStore.getState().orgId;
  // Fallback to localStorage to avoid race before store hydration
  if (!orgId && typeof window !== 'undefined') {
    try { orgId = window.localStorage.getItem('dc_orgId'); } catch {}
  }
  if (orgId) headers.set("x-org-id", orgId);
  return fetch(path, { ...init, headers });
}

export async function apiJson<T>(path: string, init: RequestInit = {}) {
  const res = await apiFetch(path, init);
  if (!res.ok) {
    let detail: any = undefined;
    try { detail = await res.json(); } catch {}
    const msg = detail?.error?.message || detail?.error || `API error ${res.status}`;
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}