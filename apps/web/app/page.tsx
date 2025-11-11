"use client";
import * as React from "react";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { supabase } from "../lib/supabaseClient";
import { useToast } from "../components/ui/toast";
import { useOrgStore } from "../lib/store/org";
import { apiJson } from "../lib/api/client";

function PasswordForgot({ email, onNotify }: { email: string; onNotify: (msg: { title: string; description?: string; variant?: "success" | "error" }) => void }) {
  const [loading, setLoading] = React.useState(false);
  async function onForgot() {
    if (!email) { onNotify({ title: "Specifica l'email", variant: "error" }); return; }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) onNotify({ title: "Errore invio reset", description: error.message, variant: "error" });
    else onNotify({ title: "Email inviata", description: "Controlla la posta per il link di reset", variant: "success" });
  }
  return <button type="button" onClick={onForgot} disabled={loading} className="underline">Password dimenticata</button>;
}

export default function WelcomeLoginPage() {
  const { notify } = useToast();
  const { setOrg, setMemberships } = useOrgStore();
  const [mode, setMode] = React.useState<"owners"|"agents">("agents");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [agentOrgId, setAgentOrgId] = React.useState("");
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = emailValid && password.length >= 6;

  async function onMagicLink() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) notify({ title: "Invio link fallito", description: error.message, variant: "error" });
    else notify({ title: "Controlla la mail", description: "Link di accesso inviato", variant: "success" });
  }

  async function signInOwners(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) { notify({ title: "Controlla i campi", description: "Email e password non validi", variant: "error" }); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      notify({ title: "Login fallito", description: error.message, variant: "error" });
      return;
    }
    try {
      const me = await apiJson<any>("/api/me");
      const memberships = Array.isArray(me?.memberships) ? me.memberships : [];
      const isAdmin = memberships.some((m: any) => String(m?.role).toUpperCase() === "ADMIN");
      if (!isAdmin) {
        notify({ title: "Accesso Owners riservato", description: "Solo ADMIN possono accedere in Owners. Usa Agents.", variant: "error" });
        try { await supabase.auth.signOut(); } catch {}
        setMode("agents");
        setLoading(false);
        return;
      }
      setMemberships(memberships);
      notify({ title: "Login effettuato", description: "Accesso Owners (ADMIN)", variant: "success" });
      window.location.href = "/admin";
    } catch (e: any) {
      notify({ title: "Errore", description: e?.message || "Impossibile verificare ruolo utente", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  async function signInAgents(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) { notify({ title: "Controlla i campi", description: "Email e password non validi", variant: "error" }); return; }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setLoading(false);
      notify({ title: "Login fallito", description: error.message, variant: "error" });
      return;
    }
    try {
      const me = await apiJson<any>("/api/me");
      const memberships = Array.isArray(me?.memberships) ? me.memberships : [];
      const isAdmin = memberships.some((m: any) => String(m?.role).toUpperCase() === "ADMIN");
      if (isAdmin) {
        notify({ title: "Profilo admin", description: "Gli admin devono accedere tramite Owners.", variant: "error" });
        window.location.href = "/admin";
        setLoading(false);
        return;
      }
      setMemberships(memberships);
      let targetOrg = agentOrgId || memberships[0]?.org_id || memberships[0]?.orgId || "";
      let targetRole = memberships.find((m: any) => (m.org_id || m.orgId) === targetOrg)?.role || memberships[0]?.role || null;
      if (!targetOrg) {
        notify({ title: "Organizzazione mancante", description: "Nessuna membership trovata per l'utente", variant: "error" });
        setLoading(false);
        return;
      }
      setOrg(targetOrg, targetRole);
      notify({ title: "Login effettuato", description: "Accesso Agents eseguito", variant: "success" });
      window.location.href = "/dashboard";
    } catch (e: any) {
      notify({ title: "Errore", description: e?.message || "Impossibile recuperare memberships", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-semibold">Accedi a DigiClient</h1>
          <p className="text-muted-foreground">Scegli come accedere: Owners o Agents</p>
        </div>

        <div className="mb-4 flex rounded-lg border p-1">
          <button
            className={`flex-1 rounded-md px-3 py-2 text-sm ${mode === "owners" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setMode("owners")}
            aria-label="Owners"
          >Owners</button>
          <button
            className={`flex-1 rounded-md px-3 py-2 text-sm ${mode === "agents" ? "bg-primary text-primary-foreground" : ""}`}
            onClick={() => setMode("agents")}
            aria-label="Agents"
          >Agents</button>
        </div>

        {/* Owners form */}
        {mode === "owners" && (
          <form onSubmit={signInOwners} className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Email</label>
              <Input type="email" aria-label="Email" placeholder="admin@esempio.it" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">Password</label>
              <Input type="password" aria-label="Password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" isLoading={loading} disabled={!canSubmit} aria-label="Accedi">Accedi</Button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <PasswordForgot email={email} onNotify={(msg) => notify(msg)} />
            </div>
            <div className="text-xs text-destructive space-y-1">
              { !emailValid && email && <p>Formato email non valido.</p> }
              { password.length > 0 && password.length < 6 && <p>Password troppo corta (min 6).</p> }
            </div>
          </form>
        )}

        {/* Agents form */}
        {mode === "agents" && (
          <form onSubmit={signInAgents} className="space-y-3">
            <div>
              <label className="block text-sm font-medium">Email</label>
              <Input type="email" aria-label="Email" placeholder="utente@organizzazione.it" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">Password</label>
              <Input type="password" aria-label="Password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium">ID organizzazione (opzionale)</label>
              <Input type="text" aria-label="ID organizzazione (opzionale)" placeholder="Org ID (opzionale)" value={agentOrgId} onChange={(e) => setAgentOrgId(e.target.value)} />
            </div>
            <div className="flex gap-2">
              <Button type="submit" isLoading={loading} disabled={!canSubmit} aria-label="Accedi">Accedi</Button>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <PasswordForgot email={email} onNotify={(msg) => notify(msg)} />
            </div>
            <div className="text-xs text-destructive space-y-1">
              { !emailValid && email && <p>Formato email non valido.</p> }
              { password.length > 0 && password.length < 6 && <p>Password troppo corta (min 6).</p> }
            </div>
          </form>
        )}
      </div>
    </div>
  );
}