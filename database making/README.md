# Database making

Questo folder contiene SQL pronti per creare schema, policy e dati demo su Supabase/Postgres.

## Ordine di esecuzione

Esegui i file in questo ordine:

1. `00_extensions_and_types.sql`
2. `01_schema.sql`
3. `02_rls_policies.sql`
4. `03_triggers.sql`
5. `04_storage.sql`
6. `06_indexes.sql`  ← indici performance e `pg_trgm` (nuovo)
7. `05_seed_demo.sql` (opzionale)

## Requisiti

- Supabase: imposta `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` e relative chiavi server.
- Utenti Auth: crea almeno due utenti in Supabase Auth e prendi i loro UUID.

## Seed demo: placeholder da sostituire

Nel file `05_seed_demo.sql` sostituisci:

- `{{USER_ID}}` con lo UUID dell’utente ADMIN
- `{{SECOND_USER_ID}}` con lo UUID dell’utente OPERATOR

Puoi farlo manualmente o via terminale prima di eseguire:

```bash
# Esempio Windows PowerShell:
(Get-Content "database making/05_seed_demo.sql") -replace '\{\{USER_ID\}\}', '00000000-0000-0000-0000-000000000000' -replace '\{\{SECOND_USER_ID\}\}', '11111111-1111-1111-1111-111111111111' | Set-Content "database making/05_seed_demo.sql"
```

## Esecuzione

- Supabase Dashboard: apri SQL Editor e incolla i file nell’ordine.
- Supabase CLI (ambiente locale):

```bash
supabase db execute -f "database making/00_extensions_and_types.sql"
supabase db execute -f "database making/01_schema.sql"
supabase db execute -f "database making/02_rls_policies.sql"
supabase db execute -f "database making/03_triggers.sql"
supabase db execute -f "database making/04_storage.sql"
supabase db execute -f "database making/06_indexes.sql"
supabase db execute -f "database making/05_seed_demo.sql" # opzionale
```

## Note

- Le policy RLS sono basate su membership dell’organizzazione (`memberships`).
- Lo storage usa convenzione di path: `org_id/document_id/filename` nel bucket `documents`.
- I trigger aggiornano `updated_at` e scrivono audit in `audit_logs`.
- `06_indexes.sql` abilita `pg_trgm` e aggiunge indici per velocizzare filtri e ricerche libere sull’audit.
- Se lo schema dell’app differisce, adatta i tipi enum e le colonne prima di eseguire.