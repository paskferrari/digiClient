"use client";
import * as React from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { Card, CardHeader, CardTitle, CardContent } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { useToast } from "../../components/ui/toast";
import { MailIcon, LockIcon, UserIcon, PhoneIcon, BuildingIcon, EyeIcon, EyeOffIcon } from "../../components/ui/icons";

export default function AccessRequestPage() {
  const { notify } = useToast();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirm, setConfirm] = React.useState("");
  const [fullName, setFullName] = React.useState("");
  const [phone, setPhone] = React.useState("");
  const [orgName, setOrgName] = React.useState("");
  const [accept, setAccept] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordValid = password.length >= 8;
  const passwordsMatch = password === confirm;
  const formValid = emailValid && passwordValid && passwordsMatch && fullName.trim().length > 1 && accept;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!formValid) {
      notify({ title: "Controlla i campi", description: "Completa correttamente il form", variant: "error" });
      return;
    }
    setLoading(true);
    // Solo l'admin può creare utenti e assegnarli a un'organizzazione.
    // Questo form raccoglie i dati per la richiesta di invito.
    try {
      notify({ title: "Richiesta invito inviata", description: "Un amministratore ti contatterà per completare la registrazione.", variant: "success" });
      // TODO: inviare la richiesta a un endpoint pubblico (/api/public/access-request) per notifica admin.
    } catch (e: any) {
      notify({ title: "Errore invio richiesta", description: e?.message || "", variant: "error" });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-lg">
      <Card>
        <CardHeader>
          <CardTitle>Richiesta accesso / Registrazione</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-3" aria-label="Form di richiesta accesso">
            <Input
              type="text"
              aria-label="Nome completo"
              placeholder="Nome e cognome"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              leadingIcon={<UserIcon />}
              error={fullName !== "" && fullName.trim().length <= 1}
            />
            <p className="text-xs text-muted-foreground">Il tuo nome per il profilo.</p>
            <Input
              type="email"
              aria-label="Email"
              placeholder="email@esempio.it"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leadingIcon={<MailIcon />}
              error={!!email && !emailValid}
            />
            <p className="text-xs text-muted-foreground">Usa la tua email aziendale.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <Input
                type={showPassword ? "text" : "password"}
                aria-label="Password"
                placeholder="Minimo 8 caratteri"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leadingIcon={<LockIcon />}
                trailingIcon={
                  <button
                    type="button"
                    aria-label={showPassword ? "Nascondi password" : "Mostra password"}
                    onClick={() => setShowPassword((v) => !v)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
                error={password.length > 0 && !passwordValid}
              />
              <Input
                type={showConfirm ? "text" : "password"}
                aria-label="Conferma password"
                placeholder="Ripeti password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                leadingIcon={<LockIcon />}
                trailingIcon={
                  <button
                    type="button"
                    aria-label={showConfirm ? "Nascondi conferma" : "Mostra conferma"}
                    onClick={() => setShowConfirm((v) => !v)}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                }
                error={confirm.length > 0 && !passwordsMatch}
              />
            </div>
            <p className="text-xs text-muted-foreground">La password deve avere almeno 8 caratteri.</p>
            <Input
              type="tel"
              aria-label="Telefono"
              placeholder="Telefono (opzionale)"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              leadingIcon={<PhoneIcon />}
            />
            <Input
              type="text"
              aria-label="Organizzazione"
              placeholder="Nome organizzazione (opzionale)"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              leadingIcon={<BuildingIcon />}
            />

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                aria-label="Accetto termini e privacy"
                checked={accept}
                onChange={(e) => setAccept(e.target.checked)}
              />
              <span>
                Accetto <Link href="#" className="underline">termini</Link> e <Link href="#" className="underline">privacy</Link>
              </span>
            </label>

            <div className="flex gap-2 items-center">
              <Button type="submit" isLoading={loading} disabled={!formValid} aria-label="Invia richiesta">Richiedi invito</Button>
              <Link href="/login" className="text-sm underline">Hai già un account? Accedi</Link>
            </div>

            <div className="text-xs">
              { !emailValid && email && <p className="text-destructive">Formato email non valido.</p> }
              { !passwordValid && password && <p className="text-destructive">Password troppo corta (min 8).</p> }
              { !passwordsMatch && confirm && <p className="text-destructive">Le password non coincidono.</p> }
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Icone locali rimosse: ora importate da components/ui/icons