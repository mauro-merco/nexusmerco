# Script PowerShell para agregar todas las variables de entorno a Vercel
# Ejecutar: .\add-vercel-env.ps1

$scope = "rodrigomercos-projects"

Write-Host "🚀 Agregando variables de entorno a Vercel..." -ForegroundColor Cyan
Write-Host ""

# Función para agregar variable
function Add-VercelEnv {
    param(
        [string]$Key,
        [string]$Value,
        [string]$Env = "production,preview"
    )
    
    Write-Host "➕ Agregando: $Key" -ForegroundColor Yellow
    
    $envFlag = if ($Env -eq "production") { "production" } 
               elseif ($Env -eq "preview") { "preview" } 
               else { "production", "preview" }
    
    # Crear comando para cada environment
    foreach ($e in $envFlag) {
        echo $Value | vercel env add $Key $e --scope $scope --yes 2>&1 | Out-Null
    }
}

# SUPABASE (3)
Add-VercelEnv "NEXT_PUBLIC_SUPABASE_URL" "https://cahxpueogsatmmijprnc.supabase.co"
Add-VercelEnv "NEXT_PUBLIC_SUPABASE_ANON_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhaHhwdWVvZ3NhdG1taWpwcm5jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2NzM2MDUsImV4cCI6MjA5NjI0OTYwNX0.hkzxEkQc0y25hNaSq2s75PyZvLUmW5Uz0b4VmvD0HxE"
Add-VercelEnv "SUPABASE_SERVICE_ROLE_KEY" "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhaHhwdWVvZ3NhdG1taWpwcm5jIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MDY3MzYwNSwiZXhwIjoyMDk2MjQ5NjA1fQ.in1ltgi3rvu7KuoB8bZqXKRdL7moj0dn15d0fPJfqQc"

# APLICACIÓN (2)
Add-VercelEnv "NEXT_PUBLIC_APP_URL" "https://nexusmerco-rho.vercel.app" "production"
Add-VercelEnv "NEXT_PUBLIC_APP_NAME" "Nexus Marketing Dashboard"

# AUTENTICACIÓN (1)
Add-VercelEnv "NEXT_PUBLIC_AUTH_REDIRECT_URL" "https://nexusmerco-rho.vercel.app/dashboard" "production"

# ALMACENAMIENTO (3)
Add-VercelEnv "NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET" "csv-uploads"
Add-VercelEnv "MAX_CSV_FILE_SIZE" "50"
Add-VercelEnv "ACCEPTED_FILE_TYPES" ".csv,.xlsx,.xls"

# SEGURIDAD (5)
Add-VercelEnv "JWT_SECRET" "1923c37ba00aa670f1d2ece8742ce005"
Add-VercelEnv "ALLOWED_ORIGINS" "https://nexusmerco-rho.vercel.app" "production"
Add-VercelEnv "RATE_LIMIT_MAX_REQUESTS" "100"
Add-VercelEnv "RATE_LIMIT_WINDOW_MS" "900000"

# FEATURES FLAGS (5)
Add-VercelEnv "NEXT_PUBLIC_ENABLE_AI_ASSISTANT" "false"
Add-VercelEnv "NEXT_PUBLIC_ENABLE_CSV_UPLOAD" "true"
Add-VercelEnv "NEXT_PUBLIC_ENABLE_AUTO_SYNC" "false"
Add-VercelEnv "NEXT_PUBLIC_ENABLE_WEEKLY_REPORTS" "true"
Add-VercelEnv "NEXT_PUBLIC_ENABLE_MONTHLY_REPORTS" "true"

# LOCALIZACIÓN (3)
Add-VercelEnv "NEXT_PUBLIC_DEFAULT_LOCALE" "es"
Add-VercelEnv "NEXT_PUBLIC_SUPPORTED_LOCALES" "es,en"
Add-VercelEnv "NEXT_PUBLIC_TIMEZONE" "America/Buenos_Aires"

# DESARROLLO (2)
Add-VercelEnv "NEXT_PUBLIC_USE_MOCK_DATA" "false"
Add-VercelEnv "NEXT_PUBLIC_DEV_MODE" "false" "production"

Write-Host ""
Write-Host "✅ ¡Listo! Variables agregadas." -ForegroundColor Green
Write-Host ""
Write-Host "🔄 Ahora ejecuta: vercel --prod --scope $scope" -ForegroundColor Cyan
