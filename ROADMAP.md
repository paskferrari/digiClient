# Roadmap

Stato, pianificazione e milestone future del progetto digiClient.

## Obiettivi principali
- Fondamenta sicure: schema DB, RLS/RBAC, trigger di audit.
- UX operativa: gestione organizzazioni, casi, attività e documenti.
- Automazioni: reminder scadenze, eventi di stato, notifiche.
- Qualità: test end‑to‑end, CI/CD, osservabilità e performance.

## Stato e fasi
- Fase 0 – Infrastruttura (Completata)
  - Monorepo `apps/web` + `packages/*` e configurazioni (ESLint, Prettier, Tailwind, Playwright).
  - Database: estensioni, tipi enum, schema, RLS, trigger audit, storage.
  - Seed demo e funzione `audit_log_change()` aggiornata.
- Fase 1 – Autenticazione & Profili (In corso)
  - Allineamento profili `public.profiles` con `auth.users`.
  - Endpoint `GET /api/me` con `x-org-id` e fallback locale.
- Fase 2 – Organizzazioni & Membership (In corso)
  - CRUD organizzazioni, inviti e ruoli (ADMIN/OPERATOR/VIEWER).
  - OrgSwitcher in dashboard e persistenza org attiva.
- Fase 3 – Aziende & Casi (Pianificata)
  - CRUD `companies` con vincoli e audit.
  - Gestione `cases`: creazione, stati (`NEW`→`IN_PROGRESS`→`DONE`), assegnazioni.
  - `case_events`: timeline, payload coerente, attori e membership.
- Fase 4 – Attività & Promemoria (Pianificata)
  - `tasks`: CRUD, priorità, scadenze, `OPEN/IN_PROGRESS/DONE`.
  - Supabase function `dueTasksReminder` e pianificazione periodica.
- Fase 5 – Documenti & Storage (Pianificata)
  - Upload/download, metadata, preview, ACL storage.
  - Eventi `DOC_UPLOAD` e collegamento ai casi.
- Fase 6 – UX, Performance & Osservabilità (Pianificata)
  - Migliorie UI/UX dashboard e liste.
  - Metriche, logging strutturato, tracing minimo.
  - Ottimizzazioni query, caching e lazy loading.
- Fase 7 – CI/CD & Release (Pianificata)
  - GitHub Actions: lint, build, test, e2e.
  - Release semantiche e generazione note da CHANGELOG.

## Decisioni e convenzioni
- Headers API: usare `x-org-id` se richiesto; fallback client da `localStorage('dc_orgId')` prima dello store.
- Enum: i seed e le API devono rispettare i valori definiti in `00_extensions_and_types.sql`.
- Audit: tutte le tabelle mutabili devono avere trigger verso `audit_logs` con attore deterministico.
- Documentazione: aggiornare `CHANGELOG.md` a ogni modifica rilevante; pianificazione in questo file.

## Prossime milestone
- [ ] Completare CRUD `companies` e collegare ad audit.
- [ ] Implementare timeline `case_events` con UI base.
- [ ] Integrare reminder scadenze su `tasks` con job pianificato.
- [ ] Abilitare upload documenti con preview e ACL.
- [ ] Stabilire workflow di release con GitHub Actions.