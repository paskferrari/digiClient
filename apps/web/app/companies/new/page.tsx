"use client";
import * as React from "react";
import { PageContainer } from "../../../components/layout/PageContainer";
import { Card, CardContent } from "../../../components/ui/card";
import { Input } from "../../../components/ui/input";
import { Button } from "../../../components/ui/button";
import { useToast } from "../../../components/ui/toast";
import { apiJson } from "../../../lib/api/client";

export default function NewCompanyPage() {
  const { notify } = useToast();
  const [legalName, setLegalName] = React.useState("");
  const [vat, setVat] = React.useState("");
  const [ateco, setAteco] = React.useState("");
  const [province, setProvince] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  const legalValid = legalName.trim().length >= 2;
  const vatValid = /^[A-Za-z0-9]{8,16}$/.test(vat.trim());

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!legalValid || !vatValid) {
      notify({ title: "Campi non validi", description: "Controlla ragione sociale e P.IVA", variant: "warning" });
      return;
    }
    setSubmitting(true);
    try {
      const payload: any = { legal_name: legalName.trim(), vat_number: vat.trim() };
      if (ateco.trim()) payload.ateco_code = ateco.trim();
      if (province.trim()) payload.province = province.trim().toUpperCase();
      const created = await apiJson<{ id: string; legal_name: string; vat_number: string }>("/api/companies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      notify({ title: "Azienda creata", description: `${created.legal_name} (${created.vat_number})`, variant: "success" });
      window.location.href = "/companies";
    } catch (e: any) {
      notify({ title: "Creazione fallita", description: e.message, variant: "error" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <PageContainer title="Nuova azienda" description="Inserisci i dati principali dell'azienda">
      <Card>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Ragione sociale</label>
              <Input value={legalName} onChange={(e) => setLegalName(e.target.value)} placeholder="Es. Rossi S.p.A." />
              {!legalValid && legalName.length > 0 && (
                <p className="text-xs text-destructive mt-1">Inserisci almeno 2 caratteri</p>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium">P.IVA</label>
              <Input value={vat} onChange={(e) => setVat(e.target.value)} placeholder="Es. IT12345678901" />
              {vat.length > 0 && !vatValid && (
                <p className="text-xs text-destructive mt-1">Inserisci 8-16 caratteri alfanumerici</p>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium">Codice ATECO (opz.)</label>
                <Input value={ateco} onChange={(e) => setAteco(e.target.value)} placeholder="Es. 62.01" />
              </div>
              <div>
                <label className="block text-sm font-medium">Provincia (opz.)</label>
                <Input value={province} onChange={(e) => setProvince(e.target.value)} placeholder="Es. MI" />
              </div>
            </div>
            <div className="pt-2 flex items-center gap-2">
              <Button type="submit" isLoading={submitting} disabled={!legalValid || !vatValid}>Crea azienda</Button>
              <Button type="button" variant="secondary" onClick={() => (window.location.href = "/companies")}>Annulla</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </PageContainer>
  );
}