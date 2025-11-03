# Reset Database e Setup Personalizzato

Questo documento descrive il processo per resettare completamente il database e configurarlo con i dati specifici richiesti.

## 📋 Dati da Inserire

### Organizzazioni
- **Area Finanza** (Organizzazione Master - Platform)
- **Associazione Irpina Commercialisti** (Association)
- **Associazione Romana Notai** (Association)

### Utenti e Ruoli
- **Pierpasquale Alfinito** - Amministratore Master di Area Finanza
- **Marco Orlando** - Operatore di Associazione Irpina Commercialisti
- **Veronica Palmieri** - Operatore di Associazione Romana Notai
- **Dario Genovese** - Operatore di Area Finanza

## 🚀 Processo di Setup

### Fase 1: Preparazione Utenti in Supabase Auth

1. **Accedi al Dashboard di Supabase**
   - Vai su [supabase.com](https://supabase.com)
   - Accedi al tuo progetto
   - Naviga su "Authentication" > "Users"

2. **Crea i seguenti utenti:**
   ```
   Email: pierpasquale.alfinito@areafinanza.it
   Password: [scegli una password sicura]
   1202f6e4-2c2d-404b-bc16-b5d8488b6aec
   
   Email: marco.orlando@commercialistiirpini.it
   Password: [scegli una password sicura]
   391f0023-935d-47c1-b64b-074f20ec52a0
   
   Email: veronica.palmieri@notairomani.it
   Password: [scegli una password sicura]
   0502147c-ab71-4cb1-a25a-d29b65be4efe
   
   Email: dario.genovese@areafinanza.it
   Password: [scegli una password sicura]
   a6304e8a-f600-4767-a1e8-0678f6dae664
   ```

3. **Copia gli UUID degli utenti**
   - Dopo aver creato ogni utente, copia il suo UUID dalla colonna "ID"
   - Tieni questi UUID a portata di mano per il passo successivo

### Fase 2: Aggiornamento Script SQL

#### Opzione A: Manuale
1. Apri il file `08_reset_and_custom_seed.sql`
2. Sostituisci manualmente gli UUID placeholder:
   ```sql
   v_pierpasquale_user_id uuid := 'UUID_REALE_PIERPASQUALE'::uuid;
   v_marco_user_id uuid := 'UUID_REALE_MARCO'::uuid;
   v_veronica_user_id uuid := 'UUID_REALE_VERONICA'::uuid;
   v_dario_user_id uuid := 'UUID_REALE_DARIO'::uuid;
   ```

#### Opzione B: Automatica (PowerShell)
1. Apri PowerShell nella cartella `database making`
2. Esegui il comando:
   ```powershell
   .\update_user_uuids.ps1 -PierpasqualeUUID "uuid1" -MarcoUUID "uuid2" -VeronicaUUID "uuid3" -DarioUUID "uuid4"
   ```
   Sostituendo `uuid1`, `uuid2`, etc. con gli UUID reali copiati da Supabase Auth.

### Fase 3: Esecuzione Script

1. **Accedi al SQL Editor di Supabase**
   - Nel Dashboard di Supabase, vai su "SQL Editor"

2. **Esegui lo script**
   - Copia tutto il contenuto di `08_reset_and_custom_seed.sql` (aggiornato con gli UUID reali)
   - Incollalo nel SQL Editor
   - Clicca "Run" per eseguire

3. **Verifica l'esecuzione**
   - Lo script mostrerà messaggi di log con gli UUID delle organizzazioni create
   - Verifica che non ci siano errori

### Fase 4: Verifica Setup

1. **Testa l'accesso degli utenti**
   - Prova ad accedere con ciascun utente creato
   - Verifica che possano vedere le loro organizzazioni

2. **Verifica i permessi**
   - **Pierpasquale** dovrebbe avere accesso admin ad Area Finanza
   - **Marco** dovrebbe essere operatore di Associazione Irpina Commercialisti
   - **Veronica** dovrebbe essere operatore di Associazione Romana Notai
   - **Dario** dovrebbe essere operatore di Area Finanza

3. **Controlla le organizzazioni**
   - Area Finanza dovrebbe essere di tipo "platform"
   - Le altre due dovrebbero essere di tipo "association"

## ⚠️ Avvertenze Importanti

- **QUESTO SCRIPT ELIMINA TUTTI I DATI ESISTENTI** nel database
- Crea sempre un backup prima di eseguire il reset
- Assicurati che gli UUID degli utenti siano corretti prima dell'esecuzione
- Testa sempre in un ambiente di sviluppo prima di applicare in produzione

## 🔧 Troubleshooting

### Errore: "User not found"
- Verifica che gli utenti siano stati creati correttamente in Supabase Auth
- Controlla che gli UUID siano stati copiati correttamente

### Errore: "Organization creation failed"
- Verifica che lo schema del database sia aggiornato
- Controlla che non ci siano vincoli di integrità violati

### Errore: "Profile creation failed"
- Assicurati che la tabella `profiles` sia sincronizzata con `auth.users`
- Verifica che gli UUID degli utenti esistano in `auth.users`

## 📁 File Correlati

- `08_reset_and_custom_seed.sql` - Script SQL principale
- `update_user_uuids.ps1` - Script PowerShell per aggiornamento UUID
- `RESET_CUSTOM_SETUP.md` - Questo documento

## 📞 Supporto

In caso di problemi durante il setup, verifica:
1. Che tutti i prerequisiti siano soddisfatti
2. Che gli UUID siano corretti
3. Che lo schema del database sia aggiornato
4. I log di errore nel SQL Editor di Supabase