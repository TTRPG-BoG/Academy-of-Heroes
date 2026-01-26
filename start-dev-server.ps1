#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Starts a local development server for the Academy of Heroes website.

.DESCRIPTION
    This script starts a Python HTTP server on port 8080 and optionally opens
    the website in your default browser.

.PARAMETER Port
    The port number to run the server on (default: 8080)

.PARAMETER NoBrowser
    Don't automatically open the browser

.EXAMPLE
    .\start-dev-server.ps1
    Starts server on port 8080 and opens browser

.EXAMPLE
    .\start-dev-server.ps1 -Port 3000 -NoBrowser
    Starts server on port 3000 without opening browser
#>

param(
    [int]$Port = 8080,
    [switch]$NoBrowser
)

Write-Host ""
Write-Host "==================================" -ForegroundColor Cyan
Write-Host "   Academy of Heroes Dev Server   " -ForegroundColor Cyan
Write-Host "==================================" -ForegroundColor Cyan
Write-Host ""

# Generate manifest first
Write-Host "[INFO] Generating manifest..." -ForegroundColor Cyan
if (Test-Path "scripts\generate_manifest.js") {
    node scripts\generate_manifest.js
    if ($LASTEXITCODE -eq 0) {
        Write-Host "[OK] Manifest generated successfully" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] Failed to generate manifest" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "[WARNING] scripts\generate_manifest.js not found, skipping manifest generation" -ForegroundColor Yellow
}
Write-Host ""

Write-Host "Starting Academy of Heroes Development Server..." -ForegroundColor Cyan
Write-Host ""

# Check if Python is installed
try {
    $pythonVersion = python --version 2>&1
    Write-Host "[OK] Python found: $pythonVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Python not found. Please install Python 3.x" -ForegroundColor Red
    Write-Host "        Download from: https://www.python.org/downloads/" -ForegroundColor Yellow
    exit 1
}

# Check if port is available
$portInUse = Get-NetTCPConnection -LocalPort $Port -ErrorAction SilentlyContinue
if ($portInUse) {
    Write-Host "[WARNING] Port $Port is already in use!" -ForegroundColor Yellow
    Write-Host "          Try a different port with: .\start-dev-server.ps1 -Port 3000" -ForegroundColor Yellow
    exit 1
}

Write-Host ""
Write-Host "Server root: $PWD" -ForegroundColor Cyan
Write-Host "Server URL:  http://localhost:$Port" -ForegroundColor Green
Write-Host ""
Write-Host "Press Ctrl+C to stop the server" -ForegroundColor Yellow
Write-Host "============================================" -ForegroundColor DarkGray
Write-Host ""

# Open browser after a short delay
if (-not $NoBrowser) {
    Start-Sleep -Milliseconds 500
    Start-Process "http://localhost:$Port"
    Write-Host "[OK] Browser opened" -ForegroundColor Green
    Write-Host ""
}

# Start the Python HTTP server
try {
    python -m http.server $Port
} catch {
    Write-Host ""
    Write-Host "[INFO] Server stopped" -ForegroundColor Yellow
}
