"use client";
import * as React from "react";
import Link from "next/link";
import { supabase } from "../../lib/supabaseClient";
import { Input } from "../../components/ui/input";
import { Button } from "../../components/ui/button";
import { MailIcon, LockIcon, EyeIcon, EyeOffIcon } from "../../components/ui/icons";
import { useToast } from "../../components/ui/toast";

export default function LoginPage() {
  const { notify } = useToast();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = emailValid && password.length >= 6;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) {
      notify({ title: "Controlla i campi", description: "Email e password non validi", variant: "error" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      notify({ title: "Login fallito", description: error.message, variant: "error" });
    } else {
      notify({ title: "Login effettuato", description: "Benvenuto!", variant: "success" });
      window.location.href = "/";
    }
  }

  async function onMagicLink() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOtp({ email });
    setLoading(false);
    if (error) {
      notify({ title: "Invio link fallito", description: error.message, variant: "error" });
    } else {
      notify({ title: "Controlla la mail", description: "Link di accesso inviato", variant: "success" });
    }
  }

  return (
    <div className="mx-auto max-w-sm">
      <h2 className="mb-4 text-xl font-semibold">Accedi</h2>
      <form onSubmit={onSubmit} className="space-y-3" aria-label="Form di login">
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
        <Input
          type={showPassword ? "text" : "password"}
          aria-label="Password"
          placeholder="••••••••"
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
          error={password.length > 0 && password.length < 6}
        />
        <p className="text-xs text-muted-foreground">Minimo 6 caratteri.</p>
        <div className="flex gap-2">
          <Button type="submit" isLoading={loading} disabled={!canSubmit} aria-label="Accedi">Accedi</Button>
          <Button type="button" variant="secondary" onClick={onMagicLink} aria-label="Invia magic link">Magic link</Button>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <PasswordForgot email={email} onNotify={(msg) => notify(msg)} />
          <Link href="/access-request" className="underline">Richiedi invito</Link>
        </div>
        <div className="text-xs text-destructive space-y-1">
          { !emailValid && email && <p>Formato email non valido.</p> }
          { password.length > 0 && password.length < 6 && <p>Password troppo corta (min 6).</p> }
        </div>
      </form>
    </div>
  );
}

function PasswordForgot({ email, onNotify }: { email: string; onNotify: (msg: { title: string; description?: string; variant?: "success" | "error" }) => void }) {
  const [loading, setLoading] = React.useState(false);
  async function onForgot() {
    if (!email) {
      onNotify({ title: "Specifica l'email", variant: "error" });
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    setLoading(false);
    if (error) onNotify({ title: "Errore invio reset", description: error.message, variant: "error" });
    else onNotify({ title: "Email inviata", description: "Controlla la posta per il link di reset", variant: "success" });
  }
  return (
    <button type="button" onClick={onForgot} disabled={loading} className="underline">
      Password dimenticata
    </button>
  );
}

// Icone locali rimosse: ora importate da components/ui/icons