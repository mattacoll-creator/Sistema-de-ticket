# =========================================================
# SCRIPT DE ARRANQUE EN POWERSHELL PARA WINDOWS SERVER 2025
# Sistema de Citas y Atención - Tribunal Electoral
# =========================================================

Write-Host "=======================================================" -ForegroundColor Green
Write-Host "Iniciando despliegue y arranque en Windows Server 2025..." -ForegroundColor Green
Write-Host "=======================================================" -ForegroundColor Green

# 1. Variables de Entorno por Defecto
if (-not $env:NODE_ENV) { $env:NODE_ENV = "production" }
if (-not $env:PORT) { $env:PORT = "3000" }

# 2. Verificar o Instalar Dependencias
if (-not (Test-Path "node_modules")) {
    Write-Host "Instalando dependencias (npm ci)..." -ForegroundColor Yellow
    npm ci --only=production
}

# 3. Compilar la Aplicación
if (-not (Test-Path "dist\server.cjs")) {
    Write-Host "Compilando aplicación (React + Express)..." -ForegroundColor Yellow
    npm run build
}

# 4. Crear Carpeta de Uploads
if (-not (Test-Path "uploads")) {
    New-Item -ItemType Directory -Path "uploads" | Out-Null
}

# 5. Ejecutar Servidor Express Node.js
Write-Host "Ejecutando servidor Node.js en puerto $env:PORT (NODE_ENV=$env:NODE_ENV)..." -ForegroundColor Cyan
node dist\server.cjs
