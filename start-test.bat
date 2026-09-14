@echo off
:: ==============================================================================
# SCRIPT DE ARRANQUE PARA AMBIENTE DE TEST / PRUEBAS (PORT 3000 & postgres)
# ==============================================================================

echo ==============================================================================
echo [AMBIENTE TEST] Iniciando Servidor en Puerto 3000 con BD: postgres
echo ==============================================================================

:: 1. Definir variables para Test
set NODE_ENV=production
set PORT=3000
set PGDATABASE=postgres
:: set DATABASE_URL=postgresql://usuario_admin:PasswordSuperSeguro123@servidor-te-pg.postgres.database.azure.com:5432/postgres?sslmode=require

:: 2. Instalar dependencias si no existen
if not exist "node_modules\" (
    echo Instalando dependencias del proyecto...
    call npm ci --only=production
)

:: 3. Compilar la aplicación si no existe dist\server.cjs
if not exist "dist\server.cjs" (
    echo Compilando aplicacion para produccion/test...
    call npm run build
)

:: 4. Crear carpeta de uploads si no existe
if not exist "uploads\" (
    mkdir uploads
)

:: 5. Iniciar servidor Node.js en puerto 3000 conectado a postgres
echo Ejecutando servidor en http://localhost:3000 (Base de datos: %PGDATABASE%)...
node dist\server.cjs
