#!/bin/bash
# =========================================================
# SCRIPT DE ARRANQUE PARA LINUX / AZURE APP SERVICE / UBUNTU
# Sistema de Citas y Atención - Tribunal Electoral
# =========================================================

echo "🚀 Iniciando proceso de despliegue y arranque en Linux..."

# 1. Definir variables de entorno por defecto si no existen
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}

# 2. Verificar que existan las dependencias o instalarlas si es necesario
if [ ! -d "node_modules" ]; then
  echo "📦 Instalando dependencias del proyecto (npm ci)..."
  npm ci --only=production
fi

# 3. Compilar la aplicación si no existe el bundle dist/server.cjs
if [ ! -f "dist/server.cjs" ]; then
  echo "🔨 Compilando aplicación (Frontend React + Backend Express)..."
  npm run build
fi

# 4. Crear directorio de uploads si no existe
mkdir -p uploads

# 5. Ejecutar el servidor Node.js Express en producción
echo "⚡ Ejecutando servidor Node.js en puerto $PORT (NODE_ENV=$NODE_ENV)..."
exec node dist/server.cjs
