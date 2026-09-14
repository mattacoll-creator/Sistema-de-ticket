#!/bin/bash
# ==============================================================================
# SCRIPT DE ARRANQUE PARA AMBIENTE DE TEST / PRUEBAS (PORT 3000 & postgres)
# ==============================================================================

echo "=============================================================================="
echo "[AMBIENTE TEST] Iniciando Servidor en Puerto 3000 con BD: postgres"
echo "=============================================================================="

export NODE_ENV=production
export PORT=3000
export PGDATABASE=postgres
# export DATABASE_URL="postgresql://usuario_admin:PasswordSuperSeguro123@servidor-te-pg.postgres.database.azure.com:5432/postgres?sslmode=require"

if [ ! -d "node_modules" ]; then
    echo "Instalando dependencias..."
    npm ci --only=production
fi

if [ ! -f "dist/server.cjs" ]; then
    echo "Compilando aplicación..."
    npm run build
fi

mkdir -p uploads

echo "Ejecutando servidor en http://0.0.0.0:3000 (Base de datos: $PGDATABASE)..."
node dist/server.cjs
