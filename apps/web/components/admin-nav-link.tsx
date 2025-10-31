"use client";
import Link from "next/link";
import { useOrgStore } from "../lib/store/org";

export function AdminNavLink() {
  const { role } = useOrgStore();
  if (role !== "ADMIN") return null;
  return (
    <Link href="/admin" className="hover:underline">Admin</Link>
  );
}