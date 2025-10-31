"use client";
import * as React from "react";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { Table, THead, TBody, TR, TH, TD } from "../../components/ui/table";
import { Card, CardContent } from "../../components/ui/card";
import { PageContainer } from "../../components/layout/PageContainer";
import { useToast } from "../../components/ui/toast";
import { apiJson } from "../../lib/api/client";
import type { Company } from "../../lib/api/schemas";
import { SearchIcon } from "../../components/ui/icons";

export default function CompaniesPage() {
  const { notify } = useToast();
  const [query, setQuery] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [companies, setCompanies] = React.useState<Company[]>([]);
  const queryValid = query.trim().length >= 2;

  async function search() {
    setLoading(true);
    try {
      const data = await apiJson<Company[]>(`/api/companies?search=${encodeURIComponent(query)}`);
      setCompanies(data);
    } catch (e: any) {
      notify({ title: "Errore ricerca", description: e.message, variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    const t = setTimeout(() => {
      if (query.length > 0) search();
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  async function onFileSelected(file: File) {
    if (!file) return;
    const text = await file.text();
    const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    // naive CSV parser: extract potential VAT numbers from any column
    const vats: string[] = [];
    for (const line of lines) {
      const cols = line.split(/[,;\t]/).map((c) => c.trim());
      for (const c of cols) {
        if (/^[A-Za-z0-9]{10,13}$/.test(c)) {
          vats.push(c);
          break;
        }
      }
    }
    if (vats.length === 0) {
      notify({ title: "Nessuna P.IVA trovata", description: "Carica un CSV con P.IVA", variant: "warning" });
      return;
    }
    try {
      const res = await apiJson<Company[]>("/api/import/vat-bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vats, enrich: true }),
      });
      notify({ title: "Import completato", description: `${res.length} aziende create`, variant: "success" });
      setCompanies(res.concat(companies));
    } catch (e: any) {
      notify({ title: "Import fallito", description: e.message, variant: "error" });
    }
  }

  return (
    <PageContainer title="Aziende" description="Ricerca aziende e importazione P.IVA in bulk">
      <Card>
        <CardContent>
          <div className="flex items-center gap-2">
            <Input
              aria-label="Cerca azienda"
              placeholder="Cerca per nome/P.IVA"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              leadingIcon={<SearchIcon />}
              error={query.length > 0 && !queryValid}
            />
            <Button onClick={search} isLoading={loading} aria-label="Avvia ricerca">Cerca</Button>
            <div className="ml-auto text-sm">
              <span className="mr-2">Import CSV P.IVA</span>
              <input aria-label="Importa CSV" type="file" accept=".csv,text/csv" onChange={(e) => onFileSelected(e.target.files?.[0]!) } />
            </div>
          </div>
          <div className="mt-1 text-xs">
            <p className="text-muted-foreground">Suggerimento: digita almeno 2 caratteri per risultati più accurati.</p>
            {query.length > 0 && !queryValid && (<p className="text-destructive">Inserisci almeno 2 caratteri.</p>)}
          </div>
        </CardContent>
      </Card>

      <Table>
        <THead>
          <TR>
            <TH>Nome</TH>
            <TH>P.IVA</TH>
            <TH>Indirizzo</TH>
          </TR>
        </THead>
        <TBody>
          {companies.map((c) => (
            <TR key={c.id}>
              <TD>{c.legal_name}</TD>
              <TD>{c.vat_number}</TD>
              <TD>{c.address || "—"}</TD>
            </TR>
          ))}
        </TBody>
      </Table>
    </PageContainer>
  );
}

// Icona locale rimossa: ora importata da components/ui/icons