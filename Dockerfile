# Dockerfile multietapa optimizado para Azure App Service, Azure Container Apps y Windows Server 2025
FROM node:20-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar todas las dependencias para compilar
RUN npm ci

# Copiar el código fuente de la aplicación
COPY . .

# Compilar el frontend (Vite) y el backend (Express/esbuild)
ENV NODE_ENV=production
RUN npm run build

# Etapa final de ejecución
FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar únicamente dependencias de producción para minimizar tamaño
RUN npm ci --only=production && npm cache clean --force

# Copiar archivos compilados y assets públicos
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public

# Crear directorio para persistencia local de archivos subidos
RUN mkdir -p /app/uploads && chown -R node:node /app

USER node

EXPOSE 3000

CMD ["node", "dist/server.cjs"]
