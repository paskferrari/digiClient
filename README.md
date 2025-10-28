# digiClient

Applicazione web per gestione organizzazioni, casi, documenti e attività, basata su Next.js e Supabase.

## Setup rapido

- Requisiti: Node.js, pnpm, Supabase project (URL e keys), PostgreSQL con estensioni standard.
- Env: crea `apps/web/.env.local` con:
  - `NEXT_PUBLIC_SUPABASE_URL`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - eventuali chiavi server (`SUPABASE_SERVICE_ROLE_KEY`) se richieste da funzioni server.
- Avvio dev: nella cartella `apps/web` esegui `pnpm install` e `pnpm dev`.
- Dev server: l’app gira tipicamente su `http://localhost:3002` se `3000` è occupata.

## API e intestazioni

- Le chiamate API richiedono `x-org-id` per la maggior parte delle rotte; il client imposta un fallback da `localStorage('dc_orgId')` in attesa dell’hydration dello store.
- La pagina Dashboard disabilita il pulsante “Dati demo” finché non è selezionata un’organizzazione.

## Database

- Cartella `database making` con SQL per:
  - Estensioni ed enum
  - Schema tabelle e indici
  - RLS/RBAC policies
  - Trigger di audit e aggiornamenti timestamp
  - Storage bucket e policy
  - Seed demo (opzionale)
- Ordine esecuzione: vedi `database making/README.md`.

## Verifica

- Apri `http://localhost:3002/dashboard` e verifica `GET /api/me` (200) con membership e org attiva.
- Controlla che le richieste includano `x-org-id`.

## Changelog

Consulta `CHANGELOG.md` per la cronostoria degli aggiornamenti.

## Roadmap

Consulta `ROADMAP.md` per pianificazione, milestone e stato delle attività.