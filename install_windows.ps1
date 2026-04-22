# =============================================================================
#  IPTS — Windows Installation Script
#  Integrated Payment Transformation System
#
#  Supports : Windows 10 (build 1903+) · Windows 11 · Windows Server 2019/2022
#  Run as   : Administrator (required)
#  Usage    : Right-click PowerShell → "Run as Administrator"
#             .\install_windows.ps1 [OPTIONS]
#
#  Options:
#    -NoOllama           Skip Ollama/LLM installation
#    -Ngrok TOKEN        Use ngrok public tunnel with given auth token
#    -Local              Local access only (default)
#
#  Examples:
#    .\install_windows.ps1                      # interactive wizard
#    .\install_windows.ps1 -Ngrok "2abc...xyz"  # ngrok tunnel (non-interactive)
#    .\install_windows.ps1 -Local               # local only (non-interactive)
#    .\install_windows.ps1 -NoOllama            # skip AI chat
#
#  What this script does (in order):
#    1.  Checks system requirements (Windows 10+, admin rights, disk space)
#    2.  Installs Chocolatey (Windows package manager)
#    3.  Installs Python 3.12
#    4.  Installs Node.js 20 LTS
#    5.  Installs Git
#    6.  Installs Ganache (global npm package)
#    7.  Installs Ollama (local LLM runtime)
#    8.  Installs Tesseract OCR
#    9.  Creates Python virtual environment + installs all packages
#    10. Installs Node packages (npm install)
#    11. Pulls the Llama 3.2 AI model (~2 GB, one-time)
#    12. Syncs the frontend template to the runtime directory
#    13. Configures public access (ngrok or local)
#    14. Runs first-time setup (trains ML models, deploys contracts, seeds DB)
#    15. Verifies all services are healthy
# =============================================================================

#Requires -RunAsAdministrator

[CmdletBinding()]
param(
    [switch]$NoOllama,
    [string]$Ngrok    = "",
    [switch]$Local
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

# ── Colours & helpers ─────────────────────────────────────────────────────────
function Write-Ok($msg)   { Write-Host "  [OK] $msg"   -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  [!!] $msg"   -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  [XX] $msg"   -ForegroundColor Red; exit 1 }
function Write-Info($msg) { Write-Host "  --> $msg"    -ForegroundColor Cyan }
function Write-Hdr($msg)  {
    Write-Host ""
    Write-Host "━━━  $msg  ━━━" -ForegroundColor Cyan
    Write-Host ""
}
function Write-Line()     { Write-Host "────────────────────────────────────────────────────" -ForegroundColor Cyan }

# ── Banner ────────────────────────────────────────────────────────────────────
Clear-Host
Write-Host ""
Write-Host "  ██╗██████╗ ████████╗███████╗" -ForegroundColor Cyan
Write-Host "  ██║██╔══██╗╚══██╔══╝██╔════╝" -ForegroundColor Cyan
Write-Host "  ██║██████╔╝   ██║   ███████╗" -ForegroundColor Cyan
Write-Host "  ██║██╔═══╝    ██║   ╚════██║" -ForegroundColor Cyan
Write-Host "  ██║██║        ██║   ███████║" -ForegroundColor Cyan
Write-Host "  ╚═╝╚═╝        ╚═╝   ╚══════╝" -ForegroundColor Cyan
Write-Host ""
Write-Host "  Integrated Payment Transformation System" -ForegroundColor White
Write-Host "  Windows Installation Script — $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Yellow
Write-Host ""
Write-Line

# ── Paths ─────────────────────────────────────────────────────────────────────
$IPTS_DIR     = Split-Path -Parent $MyInvocation.MyCommand.Path
$VENV_DIR     = Join-Path $IPTS_DIR ".venv"
$RUNTIME_DIR  = Join-Path $IPTS_DIR ".runtime"
$LOG_DIR      = Join-Path $IPTS_DIR "logs"
$APP_PORT     = 5001
$GANACHE_PORT = 8545

Write-Info "Project directory: $IPTS_DIR"

# ── Determine access mode ─────────────────────────────────────────────────────
$ACCESS_MODE  = "local"
$NGROK_TOKEN  = $Ngrok

if ($Ngrok -ne "") {
    $ACCESS_MODE = "ngrok"
}
elseif ($Local) {
    $ACCESS_MODE = "local"
}
else {
    # Interactive wizard
    Write-Host ""
    Write-Host "  How should IPTS be accessed?" -ForegroundColor White
    Write-Host ""
    Write-Host "  [1] Local only  — access at http://127.0.0.1:5001 (recommended for Windows)" -ForegroundColor Cyan
    Write-Host "      Best for: development, demos on your own machine"
    Write-Host ""
    Write-Host "  [2] ngrok       — create a secure public HTTPS tunnel" -ForegroundColor Cyan
    Write-Host "      Best for: sharing with others over the internet without network config"
    Write-Host "      Requires: free account at https://ngrok.com"
    Write-Host ""

    do {
        $choice = Read-Host "  Enter your choice [1/2]"
    } while ($choice -notin @("1","2"))

    if ($choice -eq "2") {
        $ACCESS_MODE = "ngrok"
        Write-Host ""
        Write-Host "  ngrok Auth Token" -ForegroundColor White
        Write-Host "  Get your free token at: https://ngrok.com -> Sign up -> Dashboard -> Your Authtoken"
        Write-Host ""
        do {
            $NGROK_TOKEN = Read-Host "  Paste your ngrok auth token"
            if ([string]::IsNullOrWhiteSpace($NGROK_TOKEN)) {
                Write-Host "  Token cannot be empty." -ForegroundColor Red
            }
        } while ([string]::IsNullOrWhiteSpace($NGROK_TOKEN))
        Write-Ok "ngrok token saved"
    }
}

# Summary
Write-Host ""
Write-Line
$ACCESS_LABEL = if ($ACCESS_MODE -eq "ngrok") { "ngrok public HTTPS tunnel" } else { "Local only (http://127.0.0.1:$APP_PORT)" }
Write-Host "  Project dir  : $IPTS_DIR"
Write-Host "  App port     : $APP_PORT"
Write-Host "  Access mode  : $ACCESS_LABEL"
Write-Host "  Ollama/LLM   : $(if ($NoOllama) { 'No' } else { 'Yes' })"
Write-Host ""
Write-Host "  Starting installation in 5 seconds... (Ctrl+C to cancel)" -ForegroundColor Yellow
Start-Sleep 5
Write-Line

# ── STEP 1: System validation ─────────────────────────────────────────────────
Write-Hdr "STEP 1 — System Requirements"

# Windows version check
$osVer = [System.Environment]::OSVersion.Version
if ($osVer.Major -lt 10) {
    Write-Err "Windows 10 or later is required. Found: $($osVer.ToString())"
}
Write-Ok "Windows version: $([System.Environment]::OSVersion.VersionString)"

# Admin check
$currentPrincipal = [Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()
if (-not $currentPrincipal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Err "This script must be run as Administrator. Right-click PowerShell and select 'Run as Administrator'."
}
Write-Ok "Running as Administrator"

# Disk space check (need 8 GB)
$drive = Split-Path -Qualifier $IPTS_DIR
$freeGB = [math]::Round((Get-PSDrive ($drive.TrimEnd(':'))).Free / 1GB, 1)
if ($freeGB -lt 8) {
    Write-Warn "Low disk space: ${freeGB}GB available. At least 8 GB recommended."
} else {
    Write-Ok "Disk space: ${freeGB}GB available"
}

# Internet check
try {
    $null = Invoke-WebRequest -Uri "https://pypi.org/simple/" -UseBasicParsing -TimeoutSec 10
    Write-Ok "Internet connectivity confirmed"
} catch {
    Write-Err "No internet connectivity — cannot download dependencies."
}

# PowerShell execution policy
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser -Force 2>$null
Write-Ok "PowerShell execution policy set to RemoteSigned"

New-Item -ItemType Directory -Force -Path $LOG_DIR | Out-Null

# ── STEP 2: Chocolatey ────────────────────────────────────────────────────────
Write-Hdr "STEP 2 — Chocolatey (Windows Package Manager)"

if (-not (Get-Command choco -ErrorAction SilentlyContinue)) {
    Write-Info "Installing Chocolatey..."
    [System.Net.ServicePointManager]::SecurityProtocol = [System.Net.ServicePointManager]::SecurityProtocol -bor 3072
    Invoke-Expression ((New-Object System.Net.WebClient).DownloadString('https://community.chocolatey.org/install.ps1'))

    # Refresh PATH so choco is available immediately
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")

    Write-Ok "Chocolatey installed"
} else {
    Write-Ok "Chocolatey $(choco --version) already installed"
}

# Helper to run choco quietly
function choco_install([string]$pkg) {
    Write-Info "Installing $pkg ..."
    choco install $pkg -y --no-progress 2>&1 | Out-Null
    # Refresh PATH after each install
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
}

# ── STEP 3: Python 3.12 ───────────────────────────────────────────────────────
Write-Hdr "STEP 3 — Python 3.12"

$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
$pyOk = $false

if ($pythonCmd) {
    try {
        $ver = & python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null
        if ($ver -eq "3.12") { $pyOk = $true; Write-Ok "Python 3.12 already installed" }
    } catch {}
}

if (-not $pyOk) {
    choco_install "python312"
    # Locate the new python executable
    $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                [System.Environment]::GetEnvironmentVariable("Path","User")
}

# Find python3.12 or python
$PYTHON = "python"
foreach ($candidate in @("python3.12","python3","python")) {
    if (Get-Command $candidate -ErrorAction SilentlyContinue) {
        $ver = & $candidate -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')" 2>$null
        if ($ver -eq "3.12") { $PYTHON = $candidate; break }
    }
}

$finalVer = & $PYTHON -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"
if ($finalVer -ne "3.12") {
    Write-Err "Python 3.12 not found after installation. Install manually from https://www.python.org/downloads/"
}
Write-Ok "Python version verified: $finalVer (command: $PYTHON)"

# ── STEP 4: Node.js 20 LTS ───────────────────────────────────────────────────
Write-Hdr "STEP 4 — Node.js 20 LTS"

$nodeOk = $false
if (Get-Command node -ErrorAction SilentlyContinue) {
    $nodeMajor = (node -v) -replace '[^0-9].*',''
    if ([int]$nodeMajor -ge 18) { $nodeOk = $true; Write-Ok "Node.js $(node -v) already installed" }
}

if (-not $nodeOk) {
    choco_install "nodejs-lts"
}
Write-Ok "npm $(npm -v) ready"

# ── STEP 5: Git ───────────────────────────────────────────────────────────────
Write-Hdr "STEP 5 — Git"

if (Get-Command git -ErrorAction SilentlyContinue) {
    Write-Ok "Git $(git --version) already installed"
} else {
    choco_install "git"
    Write-Ok "Git installed: $(git --version)"
}

# ── STEP 6: Ganache ───────────────────────────────────────────────────────────
Write-Hdr "STEP 6 — Ganache (Local Ethereum Blockchain)"

if (Get-Command ganache -ErrorAction SilentlyContinue) {
    Write-Ok "Ganache already installed"
} else {
    Write-Info "Installing Ganache globally via npm..."
    npm install -g ganache 2>&1 | Out-Null
    Write-Ok "Ganache installed"
}

# ── STEP 7: Ollama ────────────────────────────────────────────────────────────
Write-Hdr "STEP 7 — Ollama (Local AI / LLM Runtime)"

if (-not $NoOllama) {
    if (Get-Command ollama -ErrorAction SilentlyContinue) {
        Write-Ok "Ollama already installed"
    } else {
        Write-Info "Installing Ollama..."
        # Use winget if available, otherwise choco
        if (Get-Command winget -ErrorAction SilentlyContinue) {
            winget install --id Ollama.Ollama --accept-source-agreements --accept-package-agreements --silent 2>&1 | Out-Null
        } else {
            choco_install "ollama"
        }
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Ok "Ollama installed"
    }

    # Start Ollama service
    $ollamaRunning = $false
    try {
        $null = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 3
        $ollamaRunning = $true
        Write-Ok "Ollama is already running"
    } catch {}

    if (-not $ollamaRunning) {
        Write-Info "Starting Ollama server..."
        Start-Process -FilePath "ollama" -ArgumentList "serve" `
            -RedirectStandardOutput "$LOG_DIR\ollama.log" `
            -RedirectStandardError  "$LOG_DIR\ollama_error.log" `
            -WindowStyle Hidden
        Start-Sleep 5
        try {
            $null = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 5
            Write-Ok "Ollama server started"
        } catch {
            Write-Warn "Ollama may still be starting — check $LOG_DIR\ollama.log"
        }
    }
} else {
    Write-Warn "Skipping Ollama (--NoOllama flag set). AI Support Chat will be unavailable."
}

# ── STEP 8: Tesseract OCR ─────────────────────────────────────────────────────
Write-Hdr "STEP 8 — Tesseract OCR (KYC Document Scanning)"

if (Get-Command tesseract -ErrorAction SilentlyContinue) {
    Write-Ok "Tesseract already installed"
} else {
    choco_install "tesseract"
    Write-Ok "Tesseract installed"
}

# ── STEP 9: Python virtual environment ───────────────────────────────────────
Write-Hdr "STEP 9 — Python Virtual Environment"

if (Test-Path $VENV_DIR) {
    Write-Info "Existing virtual environment found — recreating for clean state..."
    Remove-Item -Recurse -Force $VENV_DIR
}

Write-Info "Creating virtual environment at $VENV_DIR ..."
& $PYTHON -m venv $VENV_DIR
Write-Ok "Virtual environment created"

$PIP  = Join-Path $VENV_DIR "Scripts\pip.exe"
$PYEX = Join-Path $VENV_DIR "Scripts\python.exe"

Write-Info "Upgrading pip, wheel, setuptools..."
& $PIP install --upgrade pip wheel setuptools --quiet
Write-Ok "pip ready"

$reqFile = Join-Path $IPTS_DIR "requirements.txt"
if (-not (Test-Path $reqFile)) { Write-Err "requirements.txt not found in $IPTS_DIR" }

Write-Info "Installing Python packages (this takes 3–5 minutes)..."
& $PIP install -r $reqFile --quiet
Write-Ok "All Python packages installed"

Write-Info "Verifying critical imports..."
$importCheck = & $PYEX -c "import flask, jwt, sklearn, xgboost, shap, web3, networkx, pandas; print('OK')" 2>&1
if ($importCheck -match "OK") {
    Write-Ok "All critical Python imports verified"
} else {
    Write-Warn "Some imports may have failed. Output: $importCheck"
}

# ── STEP 10: Node packages ────────────────────────────────────────────────────
Write-Hdr "STEP 10 — Node.js Packages"

Set-Location $IPTS_DIR
if (Test-Path (Join-Path $IPTS_DIR "package.json")) {
    Write-Info "Installing Node packages..."
    npm install --silent 2>&1 | Out-Null
    Write-Ok "Node packages installed"
} else {
    Write-Warn "package.json not found — skipping npm install"
}

# ── STEP 11: Pull AI model ────────────────────────────────────────────────────
Write-Hdr "STEP 11 — Llama 3.2 AI Model (~2 GB)"

if (-not $NoOllama) {
    $modelList = ollama list 2>$null
    if ($modelList -match "llama3.2") {
        Write-Ok "llama3.2 model already downloaded"
    } else {
        Write-Info "Pulling llama3.2 model (5–15 minutes depending on connection)..."
        try {
            ollama pull llama3.2
            Write-Ok "llama3.2 model downloaded"
        } catch {
            Write-Warn "Model pull failed — run 'ollama pull llama3.2' manually after installation"
        }
    }
} else {
    Write-Info "Skipping model pull (Ollama not installed)"
}

# ── STEP 12: Sync frontend template ──────────────────────────────────────────
Write-Hdr "STEP 12 — Frontend Template Sync"

$templateDirs = @(
    (Join-Path $RUNTIME_DIR "templates"),
    (Join-Path $RUNTIME_DIR "models"),
    (Join-Path $RUNTIME_DIR "contracts"),
    (Join-Path $RUNTIME_DIR "data")
)
foreach ($d in $templateDirs) { New-Item -ItemType Directory -Force -Path $d | Out-Null }

$srcTemplate = Join-Path $IPTS_DIR "templates\ipts_frontend.html"
$dstTemplate = Join-Path $RUNTIME_DIR "templates\index.html"

if (Test-Path $srcTemplate) {
    Copy-Item -Force $srcTemplate $dstTemplate
    Write-Ok "Frontend template synced to runtime"
} else {
    Write-Warn "ipts_frontend.html not found — UI may not load correctly"
}

# Fix any Mac paths inside app.py
$appPy = Join-Path $RUNTIME_DIR "app.py"
if (Test-Path $appPy) {
    (Get-Content $appPy) -replace '/Users/mohamadidriss/Projects/IPTS', ($IPTS_DIR -replace '\\','/') |
        Set-Content $appPy
    Write-Ok "Paths updated inside app.py"
}

# ── STEP 13: Public access setup ─────────────────────────────────────────────
Write-Hdr "STEP 13 — Public Access Setup ($ACCESS_MODE)"

if ($ACCESS_MODE -eq "ngrok") {

    Write-Info "Installing ngrok..."
    if (Get-Command ngrok -ErrorAction SilentlyContinue) {
        Write-Ok "ngrok already installed: $(ngrok version 2>$null)"
    } else {
        # Try choco first, fallback to direct download
        try {
            choco_install "ngrok"
        } catch {
            Write-Info "Chocolatey install failed — downloading ngrok directly..."
            $ngrokZip  = "$env:TEMP\ngrok.zip"
            $ngrokDest = "C:\Windows\System32"
            Invoke-WebRequest `
                -Uri "https://bin.equinox.io/c/bNyj1mQVY4c/ngrok-v3-stable-windows_amd64.zip" `
                -OutFile $ngrokZip `
                -UseBasicParsing
            Expand-Archive -Path $ngrokZip -DestinationPath $ngrokDest -Force
            Remove-Item $ngrokZip
        }
        $env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" +
                    [System.Environment]::GetEnvironmentVariable("Path","User")
        Write-Ok "ngrok installed"
    }

    Write-Info "Configuring ngrok auth token..."
    ngrok config add-authtoken $NGROK_TOKEN 2>&1 | Out-Null
    Write-Ok "ngrok auth token configured"

    # Create a Windows Scheduled Task to run ngrok at startup
    Write-Info "Creating ngrok startup task (Task Scheduler)..."
    $ngrokBin = (Get-Command ngrok).Source
    $action  = New-ScheduledTaskAction -Execute $ngrokBin `
                   -Argument "http $APP_PORT --log=stdout" `
                   -WorkingDirectory $IPTS_DIR
    $trigger = New-ScheduledTaskTrigger -AtStartup
    $settings= New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1)
    $principal = New-ScheduledTaskPrincipal -UserId "SYSTEM" -RunLevel Highest

    Register-ScheduledTask `
        -TaskName "IPTS-ngrok" `
        -Action $action `
        -Trigger $trigger `
        -Settings $settings `
        -Principal $principal `
        -Description "ngrok public tunnel for IPTS" `
        -Force | Out-Null

    # Start it now
    Start-ScheduledTask -TaskName "IPTS-ngrok"
    Start-Sleep 5

    # Get the public URL
    $ngrokUrl = ""
    Write-Info "Waiting for ngrok to obtain public URL..."
    for ($i = 0; $i -lt 20; $i++) {
        Start-Sleep 1
        try {
            $tunnels = Invoke-RestMethod -Uri "http://localhost:4040/api/tunnels" -TimeoutSec 2
            $ngrokUrl = ($tunnels.tunnels | Where-Object { $_.proto -eq "https" }).public_url
            if ($ngrokUrl) { break }
        } catch {}
        Write-Host -NoNewline "."
    }
    Write-Host ""

    if ($ngrokUrl) {
        Write-Ok "ngrok tunnel is live: $ngrokUrl"
        Set-Content -Path (Join-Path $IPTS_DIR ".ngrok_url") -Value $ngrokUrl
        Write-Ok "Public URL saved to $IPTS_DIR\.ngrok_url"
    } else {
        Write-Warn "ngrok URL not yet available. Check:"
        Write-Warn "  Invoke-RestMethod http://localhost:4040/api/tunnels | Select -Expand tunnels"
        Write-Warn "  or open http://localhost:4040 in your browser"
    }

} else {
    Write-Info "Local-only mode — IPTS will be available at http://127.0.0.1:$APP_PORT"
    Write-Info "To share with others, re-run with: .\install_windows.ps1 -Ngrok 'YOUR_TOKEN'"
}

# ── STEP 14: First-time setup ─────────────────────────────────────────────────
Write-Hdr "STEP 14 — First-Time Setup (ML Training + Blockchain Deploy)"

Write-Host ""
Write-Info "This step trains 7 ML models and deploys 7 smart contracts."
Write-Info "It runs once and takes 5–10 minutes. Subsequent restarts use restart.sh (~15 sec)."
Write-Host ""

# Kill anything on required ports
foreach ($portNum in @($APP_PORT, $GANACHE_PORT)) {
    $conns = Get-NetTCPConnection -LocalPort $portNum -State Listen -ErrorAction SilentlyContinue
    foreach ($c in $conns) {
        try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue } catch {}
    }
}
Start-Sleep 2

# Start Ganache
Write-Info "Starting Ganache blockchain..."
$ganacheBin = (Get-Command ganache).Source
Start-Process -FilePath $ganacheBin `
    -ArgumentList "--port $GANACHE_PORT --accounts 10 --deterministic --quiet" `
    -RedirectStandardOutput "$LOG_DIR\ganache.log" `
    -RedirectStandardError  "$LOG_DIR\ganache_error.log" `
    -WindowStyle Hidden
Start-Sleep 3
Write-Ok "Ganache started on port $GANACHE_PORT"

# Start Flask
Write-Info "Starting Flask app (first run — trains ML models, deploys contracts)..."
$appPyPath = Join-Path $RUNTIME_DIR "app.py"
if (-not (Test-Path $appPyPath)) {
    Write-Err "app.py not found at $appPyPath — ensure the git clone is complete"
}

Set-Location $RUNTIME_DIR
Start-Process -FilePath $PYEX `
    -ArgumentList $appPyPath `
    -RedirectStandardOutput "$LOG_DIR\flask_stdout.log" `
    -RedirectStandardError  "$LOG_DIR\flask_stderr.log" `
    -WindowStyle Hidden

# Wait up to 4 minutes for Flask to be ready
Write-Host -NoNewline "  Waiting for Flask to be ready"
$ready = $false
for ($i = 0; $i -lt 48; $i++) {
    Start-Sleep 5
    try {
        $null = Invoke-WebRequest -Uri "http://127.0.0.1:$APP_PORT/api/health" `
                    -UseBasicParsing -TimeoutSec 3
        $ready = $true
        break
    } catch {}
    Write-Host -NoNewline "."
}
Write-Host ""

if ($ready) {
    Write-Ok "Flask API is ready on port $APP_PORT"
} else {
    Write-Warn "Flask did not respond in time."
    Write-Warn "Check $LOG_DIR\flask_stderr.log for errors."
    Get-Content "$LOG_DIR\flask_stderr.log" -Tail 15 -ErrorAction SilentlyContinue |
        ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
}

# ── STEP 15: Verification ─────────────────────────────────────────────────────
Write-Hdr "STEP 15 — Verification"

Write-Host ""

function Test-Port([int]$port) {
    $conn = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    return ($null -ne $conn)
}

$flaskOk   = Test-Port $APP_PORT
$ganacheOk = Test-Port $GANACHE_PORT

Write-Host ("  {0,-40}" -f "Flask API (port $APP_PORT):") -NoNewline
Write-Host $(if ($flaskOk)   { "RUNNING" } else { "NOT RUNNING" }) `
    -ForegroundColor $(if ($flaskOk) { "Green" } else { "Red" })

Write-Host ("  {0,-40}" -f "Ganache blockchain (port $GANACHE_PORT):") -NoNewline
Write-Host $(if ($ganacheOk) { "RUNNING" } else { "NOT RUNNING" }) `
    -ForegroundColor $(if ($ganacheOk) { "Green" } else { "Yellow" })

if (-not $NoOllama) {
    $ollamaOk = $false
    try { $null = Invoke-WebRequest -Uri "http://localhost:11434/api/tags" -UseBasicParsing -TimeoutSec 3; $ollamaOk = $true } catch {}
    Write-Host ("  {0,-40}" -f "Ollama AI (port 11434):") -NoNewline
    Write-Host $(if ($ollamaOk) { "RUNNING" } else { "NOT RUNNING" }) `
        -ForegroundColor $(if ($ollamaOk) { "Green" } else { "Yellow" })
}

$healthOk = $false
try {
    $h = Invoke-WebRequest -Uri "http://127.0.0.1:$APP_PORT/api/health" -UseBasicParsing -TimeoutSec 5
    $healthOk = $h.Content -match '"status"'
} catch {}
Write-Host ("  {0,-40}" -f "Health check (/api/health):") -NoNewline
Write-Host $(if ($healthOk) { "PASS" } else { "FAIL" }) `
    -ForegroundColor $(if ($healthOk) { "Green" } else { "Red" })

if ($ACCESS_MODE -eq "ngrok") {
    $ngrokOk = $false
    try { $null = Invoke-WebRequest -Uri "http://localhost:4040/api/tunnels" -UseBasicParsing -TimeoutSec 3; $ngrokOk = $true } catch {}
    Write-Host ("  {0,-40}" -f "ngrok tunnel:") -NoNewline
    Write-Host $(if ($ngrokOk) { "RUNNING" } else { "NOT RUNNING" }) `
        -ForegroundColor $(if ($ngrokOk) { "Green" } else { "Yellow" })
}

# ── Final summary ─────────────────────────────────────────────────────────────
Write-Host ""
Write-Line
Write-Host ""
Write-Host "  Installation complete!" -ForegroundColor Green
Write-Host ""

if ($ACCESS_MODE -eq "ngrok") {
    $savedUrl = Get-Content (Join-Path $IPTS_DIR ".ngrok_url") -ErrorAction SilentlyContinue
    if ($savedUrl) {
        Write-Host "  Open in browser:   $savedUrl" -ForegroundColor White
        Write-Host "  (URL changes each restart unless you have a paid ngrok plan)" -ForegroundColor Yellow
    } else {
        Write-Host "  Open in browser:   http://127.0.0.1:$APP_PORT  (local)" -ForegroundColor White
        Write-Host "  Get ngrok URL:     Invoke-RestMethod http://localhost:4040/api/tunnels" -ForegroundColor Yellow
    }
} else {
    Write-Host "  Open in browser:   http://127.0.0.1:$APP_PORT" -ForegroundColor White
}

Write-Host ""
Write-Host "  Login credentials:"
Write-Host "    Admin       ->  mohamad / Mohamad@2026!"
Write-Host "    Operator    ->  rohit   / Rohit@2026!"
Write-Host "    Compliance  ->  walid   / Walid@2026!"
Write-Host "    Client      ->  sara    / Sara@2026!"
Write-Host ""
Write-Host "  To restart IPTS after rebooting:"
Write-Host "    cd `"$IPTS_DIR`""
Write-Host "    .\restart.ps1"
Write-Host ""

if ($ACCESS_MODE -eq "ngrok") {
    Write-Host "  ngrok management:"
    Write-Host "    Get-ScheduledTask IPTS-ngrok           # Check task status"
    Write-Host "    Start-ScheduledTask IPTS-ngrok         # Start tunnel"
    Write-Host "    Stop-ScheduledTask  IPTS-ngrok         # Stop tunnel"
    Write-Host "    Start-Process http://localhost:4040    # ngrok web dashboard"
    Write-Host "    Get-Content `"$IPTS_DIR\.ngrok_url`"  # Saved public URL"
    Write-Host ""
}

Write-Host "  Log files:"
Write-Host "    Flask     ->  $LOG_DIR\flask_stderr.log"
Write-Host "    Ganache   ->  $LOG_DIR\ganache.log"
if (-not $NoOllama) { Write-Host "    Ollama    ->  $LOG_DIR\ollama.log" }
if ($ACCESS_MODE -eq "ngrok") { Write-Host "    ngrok     ->  $LOG_DIR\ngrok.log" }
Write-Host ""
Write-Line
Write-Host ""

# ── Create restart.ps1 helper script ─────────────────────────────────────────
$restartScript = @"
# IPTS Windows Restart Script
# Run from: $IPTS_DIR

`$IPTS_DIR    = "$IPTS_DIR"
`$RUNTIME_DIR = "$RUNTIME_DIR"
`$VENV_DIR    = "$VENV_DIR"
`$LOG_DIR     = "$LOG_DIR"
`$APP_PORT    = $APP_PORT
`$GANACHE_PORT= $GANACHE_PORT

Write-Host "Stopping existing IPTS processes..." -ForegroundColor Yellow
foreach (`$p in @(`$APP_PORT, `$GANACHE_PORT)) {
    `$conns = Get-NetTCPConnection -LocalPort `$p -State Listen -ErrorAction SilentlyContinue
    foreach (`$c in `$conns) { Stop-Process -Id `$c.OwningProcess -Force -ErrorAction SilentlyContinue }
}
Start-Sleep 2

Write-Host "Starting Ganache..." -ForegroundColor Cyan
`$ganacheBin = (Get-Command ganache).Source
Start-Process -FilePath `$ganacheBin -ArgumentList "--port `$GANACHE_PORT --accounts 10 --deterministic --quiet" ``
    -RedirectStandardOutput "`$LOG_DIR\ganache.log" -WindowStyle Hidden
Start-Sleep 3

Write-Host "Starting Flask..." -ForegroundColor Cyan
`$PYEX = Join-Path `$VENV_DIR "Scripts\python.exe"
Set-Location `$RUNTIME_DIR
Start-Process -FilePath `$PYEX -ArgumentList (Join-Path `$RUNTIME_DIR "app.py") ``
    -RedirectStandardOutput "`$LOG_DIR\flask_stdout.log" ``
    -RedirectStandardError  "`$LOG_DIR\flask_stderr.log" ``
    -WindowStyle Hidden

Write-Host "Waiting for app to be ready..." -ForegroundColor Yellow
for (`$i = 0; `$i -lt 15; `$i++) {
    Start-Sleep 1
    try {
        `$null = Invoke-WebRequest -Uri "http://127.0.0.1:`$APP_PORT/api/health" -UseBasicParsing -TimeoutSec 2
        Write-Host "IPTS is ready! Open: http://127.0.0.1:`$APP_PORT" -ForegroundColor Green
        break
    } catch {}
    Write-Host -NoNewline "."
}
Write-Host ""
"@

Set-Content -Path (Join-Path $IPTS_DIR "restart.ps1") -Value $restartScript
Write-Ok "Created restart.ps1 helper at $IPTS_DIR\restart.ps1"
