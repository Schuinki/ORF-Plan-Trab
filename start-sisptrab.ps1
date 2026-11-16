<#
  Instalador/inicializador standalone do SisPTrab.

  Basta baixar este arquivo (ou o start-sisptrab.exe gerado a partir dele) e
  dar duplo-clique. O script cuida de tudo sozinho:

    1. Pede elevacao (UAC), se necessario.
    2. Garante WSL2 habilitado (exigencia do Docker Desktop no Windows).
    3. Instala o Docker Desktop via winget, se nao estiver instalado.
    4. Inicia o Docker Desktop e espera ele ficar pronto.
    5. Baixa a imagem da aplicacao (pronta, publicada no GitHub Container
       Registry) e o Postgres, e sobe os containers.
    6. Espera a aplicacao responder e abre o navegador.
    7. Cria um atalho "SisPTrab" na Area de Trabalho que, nas proximas vezes,
       sobe os containers (se precisar) e abre o navegador - sem precisar
       rodar este instalador pesado de novo.

  Nao precisa clonar o repositorio nem ter Node/Docker build tools - so o
  Windows com suporte a virtualizacao (qualquer PC moderno tem).

  Se o passo 2 exigir reiniciar o Windows, o script avisa e para. Depois do
  reinicio, so dar duplo-clique de novo: ele continua de onde parou.
#>

$ErrorActionPreference = "Stop"

$ImageName = "ghcr.io/schuinki/orf-plan-trab:latest"
$AppDir = Join-Path $env:LOCALAPPDATA "SisPTrab"
$EnvFile = Join-Path $AppDir ".env"
$ComposeFile = Join-Path $AppDir "docker-compose.yml"
$DockerDesktopExe = "C:\Program Files\Docker\Docker\Docker Desktop.exe"

function Write-Titulo($texto) {
    Write-Host ""
    Write-Host "== $texto ==" -ForegroundColor Cyan
}

function Write-Erro($texto) {
    Write-Host $texto -ForegroundColor Red
}

function New-RandomSecret([int]$bytes = 32) {
    $buffer = New-Object byte[] $bytes
    [System.Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($buffer)
    return [Convert]::ToBase64String($buffer)
}

# ------------------------------------------------------------------
# 0) Auto-elevacao (precisamos de admin para habilitar WSL2/instalar
#    o Docker Desktop via winget).
# ------------------------------------------------------------------
$CurrentUser = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
$IsAdmin = $CurrentUser.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $IsAdmin) {
    Write-Titulo "Pedindo permissao de administrador"
    $ScriptPath = $MyInvocation.MyCommand.Path
    if (-not $ScriptPath) { $ScriptPath = [System.Diagnostics.Process]::GetCurrentProcess().MainModule.FileName }
    Start-Process -FilePath "powershell.exe" -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$ScriptPath`"" -Verb RunAs
    exit
}

Write-Titulo "SisPTrab - instalador"
New-Item -ItemType Directory -Force -Path $AppDir | Out-Null

# ------------------------------------------------------------------
# 1) winget precisa existir (vem por padrao no Windows 10/11 atuais)
# ------------------------------------------------------------------
if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
    Write-Erro "O 'winget' (Gerenciador de Aplicativos do Windows) nao foi encontrado."
    Write-Erro "Atualize a 'App Installer' pela Microsoft Store e execute este programa novamente."
    Read-Host "Pressione ENTER para sair"
    exit 1
}

# ------------------------------------------------------------------
# 2) WSL2 - exigencia do Docker Desktop no Windows
# ------------------------------------------------------------------
Write-Titulo "Verificando o WSL2"

function Test-FeatureHabilitada($nome) {
    $feature = Get-WindowsOptionalFeature -Online -FeatureName $nome -ErrorAction SilentlyContinue
    return ($feature -and $feature.State -eq "Enabled")
}

$WslOk = (Test-FeatureHabilitada "Microsoft-Windows-Subsystem-Linux") -and (Test-FeatureHabilitada "VirtualMachinePlatform")

if (-not $WslOk) {
    Write-Host "Habilitando WSL2 (Subsistema do Windows para Linux)..."
    Enable-WindowsOptionalFeature -Online -FeatureName Microsoft-Windows-Subsystem-Linux -NoRestart | Out-Null
    Enable-WindowsOptionalFeature -Online -FeatureName VirtualMachinePlatform -NoRestart | Out-Null
    try { wsl --update --web-download *> $null } catch { }

    Write-Host ""
    Write-Host "O Windows precisa reiniciar para concluir a instalacao do WSL2." -ForegroundColor Yellow
    Write-Host "Reinicie o computador e depois de duplo-clique neste programa novamente." -ForegroundColor Yellow
    Write-Host "Ele vai continuar a instalacao de onde parou." -ForegroundColor Yellow
    Read-Host "Pressione ENTER para sair"
    exit 0
}

Write-Host "WSL2 ja esta habilitado." -ForegroundColor Green

# ------------------------------------------------------------------
# 3) Docker Desktop
# ------------------------------------------------------------------
Write-Titulo "Verificando o Docker Desktop"

$DockerCmd = Get-Command docker -ErrorAction SilentlyContinue
$DockerInstalado = [bool]$DockerCmd -or (Test-Path $DockerDesktopExe)

if (-not $DockerInstalado) {
    Write-Host "Docker Desktop nao encontrado. Instalando via winget (pode levar alguns minutos)..."
    winget install -e --id Docker.DockerDesktop --silent --accept-package-agreements --accept-source-agreements
    if ($LASTEXITCODE -ne 0) {
        Write-Erro "Nao foi possivel instalar o Docker Desktop automaticamente."
        Write-Erro "Baixe e instale manualmente em https://www.docker.com/products/docker-desktop/ e execute este programa novamente."
        Read-Host "Pressione ENTER para sair"
        exit 1
    }
    Write-Host "Docker Desktop instalado." -ForegroundColor Green
}

# Garante que o usuario atual esta no grupo docker-users (o instalador do
# Docker normalmente ja faz isso, mas reforcamos por seguranca).
try {
    $UserName = [Security.Principal.WindowsIdentity]::GetCurrent().Name.Split('\')[-1]
    $null = net localgroup docker-users $UserName /add 2>$null
} catch { }

# ------------------------------------------------------------------
# 4) Iniciar o Docker Desktop e esperar o motor responder
# ------------------------------------------------------------------
Write-Titulo "Iniciando o Docker Desktop"

$DockerPronto = $false
try { docker info *> $null; $DockerPronto = $true } catch { }

if (-not $DockerPronto) {
    if (Test-Path $DockerDesktopExe) {
        Start-Process $DockerDesktopExe
    }
    Write-Host "Aguardando o Docker Desktop iniciar (pode levar 1-2 minutos na primeira vez)..."
    for ($i = 0; $i -lt 90; $i++) {
        try {
            docker info *> $null
            $DockerPronto = $true
            break
        } catch {
            Start-Sleep -Seconds 2
        }
    }
}

if (-not $DockerPronto) {
    Write-Erro "O Docker Desktop nao respondeu a tempo."
    Write-Erro "Abra o Docker Desktop manualmente (pode pedir para aceitar os termos de uso na"
    Write-Erro "primeira vez) e depois execute este programa novamente."
    Read-Host "Pressione ENTER para sair"
    exit 1
}

Write-Host "Docker em execucao." -ForegroundColor Green

# ------------------------------------------------------------------
# 5) Configuracao da aplicacao (.env + docker-compose.yml)
# ------------------------------------------------------------------
Write-Titulo "Preparando configuracao"

if (-not (Test-Path $EnvFile)) {
    @"
DB_USER=sisptrab
DB_PASSWORD=$(New-RandomSecret)
DB_NAME=sisptrab
DB_PORT=5432
APP_PORT=3000
APP_URL=http://localhost:3000
JWT_SECRET=$(New-RandomSecret)
COOKIE_SECURE=false
AUTO_SEED=true
"@ | Set-Content -Path $EnvFile -Encoding utf8
    Write-Host "Arquivo de configuracao criado em $EnvFile"
} else {
    Write-Host "Configuracao existente reaproveitada ($EnvFile)."
}

@"
services:
  postgres:
    image: postgres:16-alpine
    container_name: sisptrab-db
    restart: unless-stopped
    environment:
      POSTGRES_USER: `${DB_USER}
      POSTGRES_PASSWORD: `${DB_PASSWORD}
      POSTGRES_DB: `${DB_NAME}
      PGDATA: /var/lib/postgresql/data/pgdata
    ports:
      - "`${DB_PORT:-5432}:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U `${DB_USER} -d `${DB_NAME}"]
      interval: 10s
      timeout: 5s
      retries: 5

  app:
    image: $ImageName
    container_name: sisptrab-app
    restart: unless-stopped
    depends_on:
      postgres:
        condition: service_healthy
    environment:
      NODE_ENV: production
      DATABASE_URL: postgresql://`${DB_USER}:`${DB_PASSWORD}@postgres:5432/`${DB_NAME}?schema=public
      JWT_SECRET: `${JWT_SECRET}
      NEXT_PUBLIC_APP_URL: `${APP_URL}
      APP_URL: `${APP_URL}
      COOKIE_SECURE: `${COOKIE_SECURE:-false}
      PORT: `${APP_PORT}
      AUTO_SEED: `${AUTO_SEED:-true}
    ports:
      - "`${APP_PORT:-3000}:3000"

volumes:
  postgres_data:
    driver: local
"@ | Set-Content -Path $ComposeFile -Encoding utf8

function Get-EnvValue($nome, $padrao) {
    $linha = Get-Content $EnvFile | Where-Object { $_ -match "^\s*$nome\s*=" } | Select-Object -First 1
    if ($linha) { return ($linha -split "=", 2)[1].Trim() }
    return $padrao
}

$AppPort = Get-EnvValue "APP_PORT" "3000"

# ------------------------------------------------------------------
# 6) Baixar imagens e subir os containers
# ------------------------------------------------------------------
Set-Location $AppDir

Write-Titulo "Baixando a aplicacao (docker compose pull)"
docker compose --env-file $EnvFile -f $ComposeFile pull

Write-Titulo "Subindo os containers (docker compose up -d)"
docker compose --env-file $EnvFile -f $ComposeFile up -d

# ------------------------------------------------------------------
# 7) Esperar a aplicacao responder
# ------------------------------------------------------------------
Write-Titulo "Aguardando a aplicacao responder"
$UrlLocal = "http://localhost:$AppPort"
$Pronto = $false
for ($i = 0; $i -lt 90; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri $UrlLocal -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($resp.StatusCode -lt 500) { $Pronto = $true; break }
    } catch {
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -lt 500) {
            $Pronto = $true; break
        }
    }
    Start-Sleep -Seconds 2
}

$LanIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*" -and
        $_.PrefixOrigin -ne "WellKnown"
    } |
    Select-Object -First 1 -ExpandProperty IPAddress)
if (-not $LanIp) { $LanIp = "<ip-deste-computador>" }

Write-Titulo "SisPTrab no ar"
if ($Pronto) {
    Write-Host "Aplicacao respondendo normalmente." -ForegroundColor Green
} else {
    Write-Host "Aplicacao ainda inicializando (confira 'docker compose logs -f app' em $AppDir)." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Acesso neste computador : $UrlLocal"
Write-Host "Acesso pela rede local  : http://${LanIp}:$AppPort"
Write-Host ""
Write-Host "Login padrao: admin@eb.mil.br / admin123 (troque a senha apos o primeiro acesso)"
Write-Host ""
Write-Host "Libere a porta $AppPort no firewall (entrada TCP) para os demais"
Write-Host "computadores da rede conseguirem acessar pelo IP acima."
Write-Host ""

# ------------------------------------------------------------------
# 8) Atalho na Area de Trabalho para abrir o sistema depois, sem
#    precisar rodar o instalador pesado de novo.
# ------------------------------------------------------------------
Write-Titulo "Criando atalho na Area de Trabalho"

$LaunchScript = Join-Path $AppDir "abrir-sisptrab.ps1"
@"
`$ErrorActionPreference = "Stop"
`$AppDir = "$AppDir"
`$EnvFile = "$EnvFile"
`$ComposeFile = "$ComposeFile"
`$DockerDesktopExe = "$DockerDesktopExe"
`$UrlLocal = "$UrlLocal"

`$DockerPronto = `$false
try { docker info *> `$null; `$DockerPronto = `$true } catch { }

if (-not `$DockerPronto) {
    if (Test-Path `$DockerDesktopExe) { Start-Process `$DockerDesktopExe }
    for (`$i = 0; `$i -lt 90; `$i++) {
        try { docker info *> `$null; `$DockerPronto = `$true; break } catch { Start-Sleep -Seconds 2 }
    }
}

if (`$DockerPronto) {
    Set-Location `$AppDir
    docker compose --env-file `$EnvFile -f `$ComposeFile up -d *> `$null
    for (`$i = 0; `$i -lt 60; `$i++) {
        try {
            `$resp = Invoke-WebRequest -Uri `$UrlLocal -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
            if (`$resp.StatusCode -lt 500) { break }
        } catch {
            if (`$_.Exception.Response -and [int]`$_.Exception.Response.StatusCode -lt 500) { break }
        }
        Start-Sleep -Seconds 2
    }
} else {
    Write-Host "O Docker Desktop nao respondeu. Abra-o manualmente e tente de novo." -ForegroundColor Red
    Read-Host "Pressione ENTER para sair"
    exit 1
}

Start-Process `$UrlLocal
"@ | Set-Content -Path $LaunchScript -Encoding utf8

$LaunchBat = Join-Path $AppDir "abrir-sisptrab.bat"
"@echo off`r`npowershell -NoProfile -WindowStyle Hidden -ExecutionPolicy Bypass -File `"$LaunchScript`"" |
    Set-Content -Path $LaunchBat -Encoding ascii

try {
    $WshShell = New-Object -ComObject WScript.Shell
    $Desktop = [Environment]::GetFolderPath("Desktop")
    $Shortcut = $WshShell.CreateShortcut((Join-Path $Desktop "SisPTrab.lnk"))
    $Shortcut.TargetPath = $LaunchBat
    $Shortcut.WorkingDirectory = $AppDir
    $Shortcut.IconLocation = "C:\Windows\System32\shell32.dll,43"
    $Shortcut.Description = "Abrir o SisPTrab"
    $Shortcut.Save()
    Write-Host "Atalho criado: $Desktop\SisPTrab.lnk" -ForegroundColor Green
    Write-Host "Use-o nas proximas vezes - nao precisa rodar este instalador de novo."
} catch {
    Write-Host "Nao foi possivel criar o atalho na Area de Trabalho automaticamente." -ForegroundColor Yellow
}
Write-Host ""

Start-Process $UrlLocal

Read-Host "Pressione ENTER para fechar esta janela (o sistema continua rodando em segundo plano)"
