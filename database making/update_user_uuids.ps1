# Script PowerShell per aggiornare gli UUID degli utenti nel file di seed personalizzato
# Uso: .\update_user_uuids.ps1 -PierpasqualeUUID "uuid1" -MarcoUUID "uuid2" -VeronicaUUID "uuid3" -DarioUUID "uuid4"

param(
    [Parameter(Mandatory=$true)]
    [string]$PierpasqualeUUID,
    
    [Parameter(Mandatory=$true)]
    [string]$MarcoUUID,
    
    [Parameter(Mandatory=$true)]
    [string]$VeronicaUUID,
    
    [Parameter(Mandatory=$true)]
    [string]$DarioUUID
)

# Percorso del file SQL
$sqlFile = "08_reset_and_custom_seed.sql"
$backupFile = "08_reset_and_custom_seed.sql.backup"

# Verifica che il file esista
if (-not (Test-Path $sqlFile)) {
    Write-Error "File $sqlFile non trovato nella directory corrente!"
    exit 1
}

# Crea un backup del file originale
Copy-Item $sqlFile $backupFile
Write-Host "Backup creato: $backupFile" -ForegroundColor Green

try {
    # Leggi il contenuto del file
    $content = Get-Content $sqlFile -Raw
    
    # Sostituisci gli UUID placeholder con quelli reali
    $content = $content -replace "v_pierpasquale_user_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;", "v_pierpasquale_user_id uuid := '$PierpasqualeUUID'::uuid;"
    $content = $content -replace "v_marco_user_id uuid := '00000000-0000-0000-0000-000000000002'::uuid;", "v_marco_user_id uuid := '$MarcoUUID'::uuid;"
    $content = $content -replace "v_veronica_user_id uuid := '00000000-0000-0000-0000-000000000003'::uuid;", "v_veronica_user_id uuid := '$VeronicaUUID'::uuid;"
    $content = $content -replace "v_dario_user_id uuid := '00000000-0000-0000-0000-000000000004'::uuid;", "v_dario_user_id uuid := '$DarioUUID'::uuid;"
    
    # Scrivi il contenuto aggiornato
    Set-Content $sqlFile $content -Encoding UTF8
    
    Write-Host "UUID aggiornati con successo!" -ForegroundColor Green
    Write-Host "File aggiornato: $sqlFile" -ForegroundColor Green
    Write-Host ""
    Write-Host "UUID sostituiti:" -ForegroundColor Yellow
    Write-Host "- Pierpasquale Alfinito: $PierpasqualeUUID" -ForegroundColor White
    Write-Host "- Marco Orlando: $MarcoUUID" -ForegroundColor White
    Write-Host "- Veronica Palmieri: $VeronicaUUID" -ForegroundColor White
    Write-Host "- Dario Genovese: $DarioUUID" -ForegroundColor White
    Write-Host ""
    Write-Host "Il file è ora pronto per essere eseguito in Supabase!" -ForegroundColor Green
    
} catch {
    Write-Error "Errore durante l'aggiornamento del file: $_"
    # Ripristina il backup in caso di errore
    Copy-Item $backupFile $sqlFile
    Write-Host "File ripristinato dal backup." -ForegroundColor Yellow
    exit 1
}

# Esempio di utilizzo
Write-Host ""
Write-Host "Esempio di utilizzo:" -ForegroundColor Cyan
Write-Host ".\update_user_uuids.ps1 -PierpasqualeUUID 'a1b2c3d4-e5f6-7890-abcd-ef1234567890' -MarcoUUID 'b2c3d4e5-f6g7-8901-bcde-f23456789012' -VeronicaUUID 'c3d4e5f6-g7h8-9012-cdef-345678901234' -DarioUUID 'd4e5f6g7-h8i9-0123-def0-456789012345'" -ForegroundColor Gray