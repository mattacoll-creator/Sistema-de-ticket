@echo off
:: =========================================================
:: SCRIPT DE ARRANQUE PARA WINDOWS SERVER 2025 (CMD / BATCH)
:: Sistema de Citas y Atención - Tribunal Electoral
:: =========================================================

echo =======================================================
echo Iniciando proceso de despliegue y arranque en Windows Server 2025...
echo =======================================================

:: 1. Definir variables de entorno por defecto si no existen
if "%NODE_ENV%"=="" set NODE_ENV=production
if "%PORT%"=="" set PORT=3000

:: 2. Verificar e instalar dependencias si node_modules no existe
if not exist "node_modules\" (
    echo Instalando dependencias del proyecto (npm ci)...
    call npm ci --only=production
)

:: 3. Compilar la aplicación si no existe dist\server.cjs
if not exist "dist\server.cjs" (
    echo Compilando aplicacion (Frontend React + Backend Express)...
    call npm run build
)

:: 4. Crear carpeta de uploads si no existe
if not exist "uploads\" (
    mkdir uploads
)

:: 5. Iniciar el servidor Node.js en Windows Server 2025
echo Ejecutando servidor Node.js en puerto %PORT% (NODE_ENV=%NODE_ENV%)...
node dist\server.cjs
