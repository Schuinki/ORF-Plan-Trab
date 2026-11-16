<#
  Atalho de desenvolvimento local do SisPTrab.

  Dá duplo-clique (ou use o start-dev.bat / atalho na Área de Trabalho) e ele:

    1. Garante que o Docker Desktop está rodando.
    2. Sobe só o container do Postgres (docker compose up -d postgres),
       usando o .env da raiz do projeto.
    3. Inicia "npm run dev" numa janela separada (pra você ver os logs/erros).
    4. Espera o Next.js responder em localhost:3000 e abre o navegador.

  Usa o código-fonte atual da pasta (inclusive mudanças ainda não commitadas).
  Se o schema do Prisma mudou e ainda não tem migration, rode
  "npx prisma migrate dev" manualmente antes - este script não gera migrations.
#>

$ErrorActionPreference = "Stop"

$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoDir

$DockerDesktopExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"
$AppPort = 3000
try {
    $EnvPortLine = Get-Content (Join-Path $RepoDir ".env") -ErrorAction SilentlyContinue |
        Where-Object { $_ -match "^\s*APP_PORT\s*=" } | Select-Object -First 1
    if ($EnvPortLine) { $AppPort = ($EnvPortLine -split "=", 2)[1].Trim() }
} catch { }

function Write-Titulo($texto) {
    Write-Host ""
    Write-Host "== $texto ==" -ForegroundColor Cyan
}

function Write-Erro($texto) {
    Write-Host $texto -ForegroundColor Red
}

# ------------------------------------------------------------------
# 1) Docker Desktop precisa estar rodando (só usamos ele pro Postgres)
# ------------------------------------------------------------------
Write-Titulo "Verificando o Docker"

$DockerPronto = $false
try { docker info *> $null; $DockerPronto = $true } catch { }

if (-not $DockerPronto) {
    if (Test-Path $DockerDesktopExe) {
        Write-Host "Iniciando o Docker Desktop..."
        Start-Process $DockerDesktopExe
    } else {
        Write-Erro "Docker Desktop não encontrado em '$DockerDesktopExe'."
        Write-Erro "Instale o Docker Desktop ou suba o Postgres manualmente e rode 'npm run dev'."
        Read-Host "Pressione ENTER para sair"
        exit 1
    }
    Write-Host "Aguardando o Docker ficar pronto (pode levar 1-2 minutos)..."
    for ($i = 0; $i -lt 90; $i++) {
        try { docker info *> $null; $DockerPronto = $true; break } catch { Start-Sleep -Seconds 2 }
    }
}

if (-not $DockerPronto) {
    Write-Erro "O Docker Desktop não respondeu a tempo. Abra-o manualmente e execute este atalho de novo."
    Read-Host "Pressione ENTER para sair"
    exit 1
}
Write-Host "Docker em execução." -ForegroundColor Green

# ------------------------------------------------------------------
# 2) Sobe só o Postgres (a aplicação roda via "yarn dev", não no container)
# ------------------------------------------------------------------
Write-Titulo "Subindo o banco de dados (Postgres)"
docker compose up -d postgres

Write-Host "Aguardando o Postgres aceitar conexões..."
$DbUser = "sisptrab"
try {
    $EnvUserLine = Get-Content (Join-Path $RepoDir ".env") -ErrorAction SilentlyContinue |
        Where-Object { $_ -match "^\s*DB_USER\s*=" } | Select-Object -First 1
    if ($EnvUserLine) { $DbUser = ($EnvUserLine -split "=", 2)[1].Trim() }
} catch { }

$DbPronto = $false
for ($i = 0; $i -lt 60; $i++) {
    docker exec sisptrab-db pg_isready -U $DbUser *> $null
    if ($LASTEXITCODE -eq 0) { $DbPronto = $true; break }
    Start-Sleep -Seconds 1
}
if ($DbPronto) {
    Write-Host "Postgres pronto." -ForegroundColor Green
} else {
    Write-Host "Postgres ainda inicializando - o 'yarn dev' vai tentar mesmo assim." -ForegroundColor Yellow
}

# ------------------------------------------------------------------
# 3) Instala dependências se for a primeira vez
# ------------------------------------------------------------------
if (-not (Test-Path (Join-Path $RepoDir "node_modules"))) {
    Write-Titulo "Instalando dependências (primeira vez, pode demorar)"
    npm install
}

# ------------------------------------------------------------------
# 4) Inicia o Next.js numa janela separada e abre o navegador
# ------------------------------------------------------------------
Write-Titulo "Iniciando o SisPTrab"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location `"$RepoDir`"; npm run dev"

$UrlLocal = "http://localhost:$AppPort"
Write-Host "Aguardando a aplicação responder em $UrlLocal ..."
$Pronto = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri $UrlLocal -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($resp.StatusCode -lt 500) { $Pronto = $true; break }
    } catch {
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -lt 500) { $Pronto = $true; break }
    }
    Start-Sleep -Seconds 2
}

if ($Pronto) {
    Write-Host "SisPTrab no ar em $UrlLocal" -ForegroundColor Green
} else {
    Write-Host "Ainda inicializando - confira a janela do 'npm run dev' que abriu." -ForegroundColor Yellow
}
Start-Process $UrlLocal

Write-Host ""
Write-Host "Esta janela pode ser fechada - o servidor continua na janela do 'npm run dev'."
Start-Sleep -Seconds 3
