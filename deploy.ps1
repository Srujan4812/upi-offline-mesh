# UPI Offline Mesh 2.0 - Automation Deployment Script
Clear-Host
Write-Host "=========================================================" -ForegroundColor Cyan
Write-Host "🌐 UPI Offline Mesh 2.0 - Direct Railway Deployment" -ForegroundColor Cyan
Write-Host "=========================================================" -ForegroundColor Cyan

# 1. Setup PATH
Write-Host "[1/5] Configuring Node.js environment paths..." -ForegroundColor Yellow
$NodePath = "C:\Program Files\nodejs"
if (Test-Path "$NodePath\node.exe") {
    if ($env:PATH -notlike "*nodejs*") {
        $env:PATH = "$NodePath;" + $env:PATH
        Write-Host "✔ Added Node.js to session PATH." -ForegroundColor Green
    } else {
        Write-Host "✔ Node.js already in PATH." -ForegroundColor Green
    }
} else {
    Write-Host "❌ Node.js not found in 'C:\Program Files\nodejs'. Please install Node.js (LTS) first." -ForegroundColor Red
    exit 1
}

# 2. Check NPM
try {
    $npmVersion = & cmd.exe /c npm.cmd -v
    Write-Host "✔ NPM detected (v$npmVersion)." -ForegroundColor Green
} catch {
    Write-Host "❌ NPM is not accessible. Please ensure Node.js is installed correctly." -ForegroundColor Red
    exit 1
}

# 3. Check/Install Railway CLI
Write-Host "[2/5] Checking for Railway CLI..." -ForegroundColor Yellow
$hasRailway = $false
try {
    $railwayCheck = & cmd.exe /c npx.cmd @railway/cli -V
    Write-Host "✔ Railway CLI is ready." -ForegroundColor Green
    $hasRailway = $true
} catch {
    Write-Host "Installing Railway CLI locally..." -ForegroundColor Yellow
}

# 4. Login to Railway
Write-Host ""
Write-Host "[3/5] Authenticating with Railway..." -ForegroundColor Yellow
Write-Host "👉 A browser window will open. Please log in or sign up to authenticate your CLI session." -ForegroundColor Cyan
& cmd.exe /c npx.cmd @railway/cli login
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Login failed or was cancelled." -ForegroundColor Red
    exit 1
}
Write-Host "✔ Successfully authenticated!" -ForegroundColor Green

# 5. Initialize or Link Project
Write-Host ""
Write-Host "[4/5] Initializing Railway Project..." -ForegroundColor Yellow
Write-Host "👉 Choose 'New Project' if you want to create one, or 'Link' to select an existing one." -ForegroundColor Cyan
& cmd.exe /c npx.cmd @railway/cli init
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Project initialization failed." -ForegroundColor Red
    exit 1
}

# 6. Deploy Code
Write-Host ""
Write-Host "[5/5] Packaging & Deploying to Railway Cloud..." -ForegroundColor Yellow
Write-Host "👉 Uploading codebase and starting Docker build. This may take 2-3 minutes..." -ForegroundColor Cyan
& cmd.exe /c npx.cmd @railway/cli up
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Deployment failed." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "🎉 DEPLOYMENT COMPLETE!" -ForegroundColor Green
Write-Host "=========================================================" -ForegroundColor Green
Write-Host "Open your Railway Dashboard or run 'npx @railway/cli domain' to generate/get your public URL!" -ForegroundColor Green
Write-Host ""
