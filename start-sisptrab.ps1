<#
  Inicia o SisPTrab localmente (app + PostgreSQL via Docker) e deixa o
  servico acessivel pelos demais computadores da rede local, via
  http://<ip-deste-computador>:<porta>.

  Uso: basta dar duplo-clique em start-sisptrab.exe (gerado a partir
  deste script) ou executar "powershell -File start-sisptrab.ps1".
#>

$ErrorActionPreference = "Stop"

function Write-Titulo($texto) {
    Write-Host ""
    Write-Host "== $texto ==" -ForegroundColor Cyan
}

# Diretorio do projeto = diretorio onde este script (ou o .exe gerado) esta
$RepoDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $RepoDir

Write-Titulo "SisPTrab - iniciando"

# 1) Docker precisa estar instalado e rodando
try {
    docker info *> $null
} catch {
    Write-Host "Docker nao encontrado ou nao esta em execucao." -ForegroundColor Red
    Write-Host "Instale/abra o Docker Desktop e tente novamente." -ForegroundColor Red
    Read-Host "Pressione ENTER para sair"
    exit 1
}

# 2) Garantir .env (config de porta/senha/URL)
$EnvFile = Join-Path $RepoDir ".env"
if (-not (Test-Path $EnvFile)) {
    Write-Titulo "Criando .env a partir de .env.docker.example"
    Copy-Item (Join-Path $RepoDir ".env.docker.example") $EnvFile
}

function Get-EnvValue($nome, $padrao) {
    $linha = Get-Content $EnvFile | Where-Object { $_ -match "^\s*$nome\s*=" } | Select-Object -First 1
    if ($linha) {
        return ($linha -split "=", 2)[1].Trim()
    }
    return $padrao
}

$AppPort = Get-EnvValue "APP_PORT" "3000"

# 3) Detectar o IP deste computador na rede local (primeiro adaptador fisico ativo)
$LanIp = (Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
    Where-Object {
        $_.IPAddress -notlike "127.*" -and
        $_.IPAddress -notlike "169.254.*" -and
        $_.PrefixOrigin -ne "WellKnown"
    } |
    Select-Object -First 1 -ExpandProperty IPAddress)

if (-not $LanIp) { $LanIp = "<ip-deste-computador>" }

# 4) Subir os containers (build + migrations sao feitos no entrypoint)
Write-Titulo "Subindo containers (docker compose up -d --build)"
docker compose up -d --build

# 5) Esperar o container da aplicacao ficar saudavel/no ar
Write-Titulo "Aguardando a aplicacao responder"
$UrlLocal = "http://localhost:$AppPort"
$pronto = $false
for ($i = 0; $i -lt 60; $i++) {
    try {
        $resp = Invoke-WebRequest -Uri $UrlLocal -UseBasicParsing -TimeoutSec 2 -ErrorAction Stop
        if ($resp.StatusCode -lt 500) { $pronto = $true; break }
    } catch {
        # Redirecionamento (ex.: para /login) tambem conta como "no ar"
        if ($_.Exception.Response -and [int]$_.Exception.Response.StatusCode -lt 500) {
            $pronto = $true; break
        }
    }
    Start-Sleep -Seconds 2
}

Write-Titulo "SisPTrab no ar"
if ($pronto) {
    Write-Host "Aplicacao respondendo normalmente." -ForegroundColor Green
} else {
    Write-Host "Aplicacao ainda inicializando (confira 'docker compose logs -f app')." -ForegroundColor Yellow
}

Write-Host ""
Write-Host "Acesso neste computador : $UrlLocal"
Write-Host "Acesso pela rede local  : http://${LanIp}:$AppPort"
Write-Host ""
Write-Host "Libere a porta $AppPort no firewall (entrada TCP) para os demais"
Write-Host "computadores da rede conseguirem acessar pelo IP acima."
Write-Host ""

Start-Process $UrlLocal

Read-Host "Pressione ENTER para fechar esta janela (o sistema continua rodando em segundo plano)"
