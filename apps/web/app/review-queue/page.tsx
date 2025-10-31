"use client";
import * as React from "react";
import { supabase } from "../../lib/supabaseClient";
import { Table, THead, TBody, TR, TH, TD } from "../../components/ui/table";
import { Skeleton } from "../../components/ui/skeleton";

export default function ReviewQueuePage() {
  const [loading, setLoading] = React.useState(true);
  const [items, setItems] = React.useState<any[]>([]);

  React.useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      const { data, error } = await supabase
        .from("cases")
        .select("id,title,status,org_id")
        .in("status", ["NEW", "SCREENING"]) // cross-org limited by RLS
        .limit(200);
      if (!cancelled) {
        setItems(error ? [] : data || []);
        setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  if (loading) return <Skeleton className="h-24 w-full" />;

  return (
    <div>
      <h2 className="mb-3 text-xl font-semibold">Coda Revisione</h2>
      <Table>
        <THead>
          <TR>
            <TH>ID</TH>
            <TH>Titolo</TH>
            <TH>Stato</TH>
            <TH>Org</TH>
          </TR>
        </THead>
        <TBody>
          {items.map((c) => (
            <TR key={c.id}>
              <TD>{c.id}</TD>
              <TD>{c.title || "—"}</TD>
              <TD>{c.status}</TD>
              <TD>{c.org_id}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </div>
  );
}