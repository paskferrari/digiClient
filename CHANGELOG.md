# Cronostoria (CHANGELOG)

Tutte le modifiche rilevanti alla repo digiClient.

## 2025-10-28
- Aggiunta cartella `database making` con script: estensioni/tipi, schema, RLS, trigger, storage, seed demo e README.
- Correzione seed: allineati i valori enum a quelli definiti nello schema (es. `organization_type: 'association'`).
- Correzione seed: valorizzazione esplicita di `created_by` su tabelle con vincoli `NOT NULL` (es. `companies`).
- Aggiornato `audit_log_change()` per scrivere su colonne corrette di `audit_logs` (`actor_user_id`, `target_table`, `target_id`).
- Migliorata gestione `x-org-id`: fallback lato client da `localStorage('dc_orgId')` finché lo store non è pronto.
- Dashboard: disabilitato pulsante “Dati demo” finché non è selezionata un’organizzazione.
- Migliorata `GET /api/me`: gestione errori di configurazione (CONFIG_ERROR) e messaggi espliciti.

## 2025-10-27
- Impostazione iniziale progetto monorepo con `apps/web` (Next.js) e `packages` condivise.
- Configurazioni base: ESLint, Prettier, Tailwind, Playwright.