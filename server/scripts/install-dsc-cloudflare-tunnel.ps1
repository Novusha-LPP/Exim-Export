<#
.SYNOPSIS
    Automated Setup & Diagnostic Script for Cloudflare Zero Trust Tunnel on the DSC Signing PC.
.DESCRIPTION
    Cloudflare Zero Trust Tunnel provides a 100% free, permanent, secure domain (e.g., https://dsc.yourdomain.com)
    with automatic HTTPS and zero public port forwarding, replacing ephemeral Ngrok tunnels.
#>

param (
    [string]$TunnelToken = "",
    [int]$LocalSignerPort = 50002
)

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host " EXIM DSC Signer - Cloudflare Zero Trust Tunnel Setup" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Verify Local Java Signer Port
Write-Host "`n1. Checking local Java DSC Signer on port $LocalSignerPort..." -ForegroundColor Yellow
try {
    $tcp = Test-NetConnection -ComputerName "localhost" -Port $LocalSignerPort -WarningAction SilentlyContinue
    if ($tcp.TcpTestSucceeded) {
        Write-Host "   [OK] Local Java Signer is active and listening on port $LocalSignerPort." -ForegroundColor Green
    } else {
        Write-Host "   [WARN] Port $LocalSignerPort is currently NOT responding." -ForegroundColor Yellow
        Write-Host "   Make sure the Java DSC Signing application is running on this machine." -ForegroundColor DarkYellow
    }
} catch {
    Write-Host "   Could not verify local port: $_" -ForegroundColor DarkGray
}

# 2. Check or Download cloudflared.exe
$targetDir = "$env:LOCALAPPDATA\cloudflared"
$exePath = "$targetDir\cloudflared.exe"

if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
}

if (-not (Test-Path $exePath)) {
    Write-Host "`n2. Downloading cloudflared.exe from Cloudflare official releases..." -ForegroundColor Yellow
    $downloadUrl = "https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-windows-amd64.exe"
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        Invoke-WebRequest -Uri $downloadUrl -OutFile $exePath -UseBasicParsing
        Write-Host "   [OK] Downloaded successfully to: $exePath" -ForegroundColor Green
    } catch {
        Write-Host "   [FAIL] Error downloading cloudflared: $_" -ForegroundColor Red
        Write-Host "   Please download manually from: $downloadUrl" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n2. [OK] cloudflared.exe is already installed at: $exePath" -ForegroundColor Green
}

# 3. Check version
$version = & $exePath --version
Write-Host "   Running: $version" -ForegroundColor DarkGray

# 4. Service Installation or Instructions
Write-Host "`n3. Cloudflare Tunnel Service Configuration:" -ForegroundColor Yellow

if ($TunnelToken) {
    Write-Host "   Installing Cloudflare Tunnel as a Windows background service..." -ForegroundColor Cyan
    try {
        & $exePath service install $TunnelToken
        Start-Service -Name "Cloudflared" -ErrorAction SilentlyContinue
        Write-Host "   [OK] Cloudflare Tunnel Service installed and started!" -ForegroundColor Green
        Write-Host "   It will automatically run on Windows boot in the background." -ForegroundColor Green
    } catch {
        Write-Host "   Error installing service (Run this script as Administrator if needed): $_" -ForegroundColor Red
    }
} else {
    Write-Host "   To complete the 2-minute setup from Cloudflare Zero Trust Dashboard:" -ForegroundColor White
    Write-Host "   Step A: Go to https://one.dash.cloudflare.com/ -> Networks -> Tunnels -> 'Create a tunnel'" -ForegroundColor Gray
    Write-Host "   Step B: Choose 'Cloudflared' -> Name it 'exim-dsc-signer' -> Select 'Windows'." -ForegroundColor Gray
    Write-Host "   Step C: Copy the installation command containing your TUNNEL_TOKEN." -ForegroundColor Gray
    Write-Host "   Step D: In the Public Hostname tab, configure:" -ForegroundColor Gray
    Write-Host "           Subdomain: dsc (or signer)" -ForegroundColor Cyan
    Write-Host "           Domain:    yourcompany.com" -ForegroundColor Cyan
    Write-Host "           Service:   HTTP -> localhost:$LocalSignerPort" -ForegroundColor Cyan
    Write-Host "`n   Then run this script with your token:" -ForegroundColor Yellow
    Write-Host "   powershell -ExecutionPolicy Bypass -File .\install-dsc-cloudflare-tunnel.ps1 -TunnelToken '<YOUR_TOKEN>'" -ForegroundColor Cyan
}

Write-Host "`n4. Next Step on the Exim Server (.env):" -ForegroundColor Yellow
Write-Host "   Update server/.env with your permanent Cloudflare domain:" -ForegroundColor White
Write-Host "   SIGNING_SERVER_URL=https://dsc.yourcompany.com" -ForegroundColor Cyan
Write-Host "   (If Cloudflare Access Service Token is used):" -ForegroundColor White
Write-Host "   CF_ACCESS_CLIENT_ID=<your-client-id>" -ForegroundColor Cyan
Write-Host "   CF_ACCESS_CLIENT_SECRET=<your-client-secret>" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
