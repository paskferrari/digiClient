-- Script personalizzato per reset database e inserimento dati specifici
-- ATTENZIONE: Questo script elimina TUTTI i dati esistenti e li sostituisce con i dati specificati

-- ========================================
-- FASE 1: RESET COMPLETO DEL DATABASE
-- ========================================

-- Disabilita temporaneamente i trigger per evitare problemi durante il reset
SET session_replication_role = replica;

-- Elimina tutti i dati dalle tabelle in ordine di dipendenza
TRUNCATE TABLE public.audit_logs CASCADE;
TRUNCATE TABLE public.settings CASCADE;
TRUNCATE TABLE public.invitations CASCADE;
TRUNCATE TABLE public.tasks CASCADE;
TRUNCATE TABLE public.documents CASCADE;
TRUNCATE TABLE public.case_events CASCADE;
TRUNCATE TABLE public.cases CASCADE;
TRUNCATE TABLE public.companies CASCADE;
TRUNCATE TABLE public.memberships CASCADE;
TRUNCATE TABLE public.organizations CASCADE;
TRUNCATE TABLE public.profiles CASCADE;

-- Riabilita i trigger
SET session_replication_role = DEFAULT;

-- ========================================
-- FASE 2: INSERIMENTO DATI PERSONALIZZATI
-- ========================================

DO $$
DECLARE
  -- UUID per le organizzazioni
  v_area_finanza_org_id uuid := gen_random_uuid();
  v_commercialisti_org_id uuid := gen_random_uuid();
  v_notai_org_id uuid := gen_random_uuid();
  
  -- UUID per gli utenti (da sostituire con UUID reali da Supabase Auth)
  v_pierpasquale_user_id uuid := '1202f6e4-2c2d-404b-bc16-b5d8488b6aec'::uuid; -- SOSTITUIRE
  v_marco_user_id uuid := '391f0023-935d-47c1-b64b-074f20ec52a0'::uuid;        -- SOSTITUIRE
  v_veronica_user_id uuid := '0502147c-ab71-4cb1-a25a-d29b65be4efe'::uuid;     -- SOSTITUIRE
  v_dario_user_id uuid := 'a6304e8a-f600-4767-a1e8-0678f6dae664'::uuid;        -- SOSTITUIRE
  
  -- UUID per le membership
  v_pierpasquale_membership_id uuid := gen_random_uuid();
  v_marco_membership_id uuid := gen_random_uuid();
  v_veronica_membership_id uuid := gen_random_uuid();
  v_dario_membership_id uuid := gen_random_uuid();

BEGIN
  -- ========================================
  -- INSERIMENTO ORGANIZZAZIONI
  -- ========================================
  
  -- Area Finanza (Organizzazione Master - Platform)
  INSERT INTO public.organizations(id, name, type, created_at)
  VALUES (v_area_finanza_org_id, 'Area Finanza', 'platform', NOW());
  
  -- Associazione Irpina Commercialisti
  INSERT INTO public.organizations(id, name, type, created_at)
  VALUES (v_commercialisti_org_id, 'Associazione Irpina Commercialisti', 'association', NOW());
  
  -- Associazione Romana Notai
  INSERT INTO public.organizations(id, name, type, created_at)
  VALUES (v_notai_org_id, 'Associazione Romana Notai', 'association', NOW());

  -- ========================================
  -- INSERIMENTO PROFILI UTENTI
  -- ========================================
  
  -- Pierpasquale Alfinito (Amministratore Master)
  INSERT INTO public.profiles(id, email, full_name, phone, created_at)
  VALUES (v_pierpasquale_user_id, 'pierpasquale.alfinito@areafinanza.it', 'Pierpasquale Alfinito', NULL, NOW());
  
  -- Marco Orlando (Operatore Commercialisti)
  INSERT INTO public.profiles(id, email, full_name, phone, created_at)
  VALUES (v_marco_user_id, 'marco.orlando@commercialistiirpini.it', 'Marco Orlando', NULL, NOW());
  
  -- Veronica Palmieri (Operatore Notai)
  INSERT INTO public.profiles(id, email, full_name, phone, created_at)
  VALUES (v_veronica_user_id, 'veronica.palmieri@notairomani.it', 'Veronica Palmieri', NULL, NOW());
  
  -- Dario Genovese (Operatore Area Finanza)
  INSERT INTO public.profiles(id, email, full_name, phone, created_at)
  VALUES (v_dario_user_id, 'dario.genovese@areafinanza.it', 'Dario Genovese', NULL, NOW());

  -- ========================================
  -- INSERIMENTO MEMBERSHIP
  -- ========================================
  
  -- Pierpasquale Alfinito - ADMIN di Area Finanza
  INSERT INTO public.memberships(id, org_id, user_id, role, created_at)
  VALUES (v_pierpasquale_membership_id, v_area_finanza_org_id, v_pierpasquale_user_id, 'ADMIN', NOW());
  
  -- Marco Orlando - OPERATOR di Associazione Irpina Commercialisti
  INSERT INTO public.memberships(id, org_id, user_id, role, created_at)
  VALUES (v_marco_membership_id, v_commercialisti_org_id, v_marco_user_id, 'OPERATOR', NOW());
  
  -- Veronica Palmieri - OPERATOR di Associazione Romana Notai
  INSERT INTO public.memberships(id, org_id, user_id, role, created_at)
  VALUES (v_veronica_membership_id, v_notai_org_id, v_veronica_user_id, 'OPERATOR', NOW());
  
  -- Dario Genovese - OPERATOR di Area Finanza
  INSERT INTO public.memberships(id, org_id, user_id, role, created_at)
  VALUES (v_dario_membership_id, v_area_finanza_org_id, v_dario_user_id, 'OPERATOR', NOW());

  -- ========================================
  -- INSERIMENTO IMPOSTAZIONI BASE
  -- ========================================
  
  -- Impostazioni per Area Finanza
  INSERT INTO public.settings(id, org_id, key, value)
  VALUES 
    (gen_random_uuid(), v_area_finanza_org_id, 'notifications_enabled', 'true'::jsonb),
    (gen_random_uuid(), v_area_finanza_org_id, 'auto_assign_cases', 'false'::jsonb);
  
  -- Impostazioni per Associazione Irpina Commercialisti
  INSERT INTO public.settings(id, org_id, key, value)
  VALUES 
    (gen_random_uuid(), v_commercialisti_org_id, 'notifications_enabled', 'true'::jsonb),
    (gen_random_uuid(), v_commercialisti_org_id, 'auto_assign_cases', 'true'::jsonb);
  
  -- Impostazioni per Associazione Romana Notai
  INSERT INTO public.settings(id, org_id, key, value)
  VALUES 
    (gen_random_uuid(), v_notai_org_id, 'notifications_enabled', 'true'::jsonb),
    (gen_random_uuid(), v_notai_org_id, 'auto_assign_cases', 'true'::jsonb);

  -- ========================================
  -- LOG DI COMPLETAMENTO
  -- ========================================
  
  RAISE NOTICE 'Database reset completato con successo!';
  RAISE NOTICE 'Organizzazioni create:';
  RAISE NOTICE '- Area Finanza (Platform): %', v_area_finanza_org_id;
  RAISE NOTICE '- Associazione Irpina Commercialisti (Association): %', v_commercialisti_org_id;
  RAISE NOTICE '- Associazione Romana Notai (Association): %', v_notai_org_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Utenti e ruoli creati:';
  RAISE NOTICE '- Pierpasquale Alfinito: ADMIN di Area Finanza';
  RAISE NOTICE '- Marco Orlando: OPERATOR di Associazione Irpina Commercialisti';
  RAISE NOTICE '- Veronica Palmieri: OPERATOR di Associazione Romana Notai';
  RAISE NOTICE '- Dario Genovese: OPERATOR di Area Finanza';
  RAISE NOTICE '';
  RAISE NOTICE 'IMPORTANTE: Sostituire gli UUID degli utenti con quelli reali da Supabase Auth prima di eseguire!';

END $$;

-- ========================================
-- ISTRUZIONI PER L'ESECUZIONE
-- ========================================

/*
PRIMA DI ESEGUIRE QUESTO SCRIPT:

1. Creare gli utenti in Supabase Auth Dashboard:
   - pierpasquale.alfinito@areafinanza.it
   - marco.orlando@commercialistiirpini.it
   - veronica.palmieri@notairomani.it
   - dario.genovese@areafinanza.it

2. Sostituire gli UUID placeholder con quelli reali:
   - Aprire Supabase Auth Dashboard
   - Copiare gli UUID degli utenti creati
   - Sostituire i valori nelle variabili v_*_user_id

3. Eseguire lo script nel SQL Editor di Supabase

DOPO L'ESECUZIONE:
- Verificare che tutti gli utenti possano accedere
- Testare i permessi per ogni ruolo
- Verificare che le organizzazioni siano visibili correttamente
*/