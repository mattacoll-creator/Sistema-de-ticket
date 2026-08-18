# Guía Completa de Despliegue: Azure, Azure PostgreSQL Flexible Server y Windows Server 2025

Esta guía describe los pasos necesarios para compilar, configurar la base de datos **Azure Database for PostgreSQL - Flexible Server** y desplegar la aplicación en **Microsoft Azure** (App Service / Container Apps) o en **Windows Server 2025** (IIS / PM2 / Docker).

---

## 🐘 1. Configuración de Azure Database for PostgreSQL - Flexible Server

### Pasos para aprovisionar la base de datos mediante Azure CLI:

1. **Crear la instancia de Azure PostgreSQL Flexible Server:**
   ```bash
   az postgres flexible-server create \
     --resource-group rg-tribunal-electoral \
     --name servidor-te-pg \
     --location eastus \
     --admin-user admin_tribunal \
     --admin-password "PasswordSegura2026!" \
     --sku-name Standard_B1ms \
     --tier Burstable \
     --storage-size 32 \
     --version 16 \
     --public-access 0.0.0.0
   ```

2. **Crear la Base de Datos para la Aplicación:**
   ```bash
   az postgres flexible-server db create \
     --resource-group rg-tribunal-electoral \
     --server-name servidor-te-pg \
     --database-name tribunal_db
   ```

3. **Habilitar acceso de red para servicios de Azure (App Service):**
   ```bash
   az postgres flexible-server firewall-rule create \
     --resource-group rg-tribunal-electoral \
     --name servidor-te-pg \
     --rule-name AllowAzureServices \
     --start-ip-address 0.0.0.0 \
     --end-ip-address 0.0.0.0
   ```

4. **Cadena de Conexión Obtenida:**
   ```
   postgresql://admin_tribunal:PasswordSegura2026!@servidor-te-pg.postgres.database.azure.com:5432/tribunal_db?sslmode=require
   ```

---

## 📋 2. Requisitos Previos y Compilación Local

Antes de desplegar, la aplicación debe compilarse ejecutando:

```bash
# 1. Instalar dependencias (incluyendo driver pg de PostgreSQL)
npm install

# 2. Compilar Frontend React (Vite) y Backend Express (esbuild)
npm run build
```

La compilación generará:
- `dist/index.html` y assets estáticos de React.
- `dist/server.cjs`: El servidor Express bundleado en un único archivo CJS independiente de la plataforma.

---

## ☁️ 3. Despliegue en Microsoft Azure App Service (Node.js Linux)

### Pasos mediante Azure CLI:

1. **Iniciar sesión en Azure:**
   ```bash
   az login
   ```

2. **Crear el Grupo de Recursos y el Plan App Service:**
   ```bash
   az group create --name rg-tribunal-electoral --location eastus
   az appservice plan create --name plan-tribunal --resource-group rg-tribunal-electoral --sku B1 --is-linux
   ```

3. **Crear la App Web:**
   ```bash
   az webapp create --resource-group rg-tribunal-electoral --plan plan-tribunal --name app-tribunal-electoral --runtime "NODE|20-lts"
   ```

4. **Configurar el Comando de Inicio (Startup Command):**
   ```bash
   az webapp config set --resource-group rg-tribunal-electoral --name app-tribunal-electoral --startup-file "node dist/server.cjs"
   ```

5. **Vincular Azure PostgreSQL Flexible Server y Variables de Entorno:**
   ```bash
   az webapp config appsettings set --resource-group rg-tribunal-electoral --name app-tribunal-electoral --settings \
     NODE_ENV=production \
     DATABASE_URL="postgresql://admin_tribunal:PasswordSegura2026!@servidor-te-pg.postgres.database.azure.com:5432/tribunal_db?sslmode=require" \
     PGHOST="servidor-te-pg.postgres.database.azure.com" \
     PGUSER="admin_tribunal" \
     PGPASSWORD="PasswordSegura2026!" \
     PGDATABASE="tribunal_db" \
     PGPORT="5432" \
     PGSSLMODE="require" \
     OUTLOOK_USER="notificaciones@dominio.gob.pa" \
     OUTLOOK_PASS="tu-contrasena" \
     OUTLOOK_HOST="smtp.office365.com" \
     OUTLOOK_PORT="587"
   ```

6. **Desplegar el Código Compilado:**
   ```bash
   az webapp deployment source config-zip --resource-group rg-tribunal-electoral --name app-tribunal-electoral --src release.zip
   ```

---

## 🐳 4. Despliegue mediante Docker (Azure Container Apps / App Service Container)

El repositorio incluye un `Dockerfile` multi-etapa optimizado con Node.js 20 Alpine y soporte nativo para `pg`.

### Pasos para Azure Container Registry (ACR):

```bash
# 1. Crear registro de contenedor
az acr create --resource-group rg-tribunal-electoral --name acrtribunal --sku Basic

# 2. Compilar y subir la imagen Docker
az acr build --registry acrtribunal --image tribunal-app:v1 .

# 3. Crear App Service basado en la imagen Docker
az webapp create --resource-group rg-tribunal-electoral --plan plan-tribunal --name app-tribunal-docker --deployment-container-image-name acrtribunal.azurecr.io/tribunal-app:v1
```

---

## 🪟 5. Despliegue en Windows Server 2025 con IIS e iisnode

Para desplegar en un servidor físico o máquina virtual con **Windows Server 2025** mediante **Internet Information Services (IIS)** conectado a Azure PostgreSQL Flexible Server:

### Pasos de Configuración en Windows Server 2025:

1. **Instalar Roles y Funciones en Windows Server 2025:**
   - Abrir **Server Manager** -> *Add Roles and Features*.
   - Seleccionar **Web Server (IIS)**.
   - Asegurarse de incluir **URL Rewrite Module 2.1** y **WebSocket Protocol** (en *Application Development*).

2. **Instalar Node.js y iisnode:**
   - Descargar e instalar **Node.js 20 LTS** para Windows (64-bit).
   - Descargar e instalar **URL Rewrite Module 2.1** para IIS.
   - Descargar e instalar **iisnode** para IIS (64-bit).

3. **Publicar Archivos en el Servidor:**
   - Copiar la carpeta del proyecto que incluye:
     - `dist/`
     - `node_modules/` (o ejecutar `npm ci --only=production` en Windows Server)
     - `web.config` (incluido en el repositorio)
     - `.env` (con las credenciales de Azure PostgreSQL Flexible Server)

4. **Crear la Sitio Web en IIS:**
   - Abrir **IIS Manager**.
   - Crear un nuevo sitio web apuntando a la ruta física del proyecto (`C:\inetpub\wwwroot\tribunal-app`).
   - Asignar un Application Pool configurado en **No Managed Code** y modelo de proceso de 64 bits.

---

## ⚡ 6. Despliegue en Windows Server 2025 con PM2 / Servicio de Windows

Si no deseas utilizar IIS, puedes ejecutar el servidor directamente como servicio en Windows Server 2025 usando **pm2-installer** (la solución oficial y recomendada para Windows) o **NSSM**:

### Opción A: Usando `pm2-installer` (Recomendado)

1. **Instalar PM2 globalmente:**
   ```cmd
   npm install -g pm2
   ```

2. **Instalar el configurador de servicio para Windows (`pm2-installer`):**
   ```cmd
   npm install -g pm2-installer
   ```

3. **Iniciar la aplicación desde `ecosystem.config.cjs`:**
   ```cmd
   pm2 start ecosystem.config.cjs
   ```

4. **Guardar y configurar el servicio de Windows:**
   ```cmd
   pm2 save
   pm2-service-install -n PM2
   ```

### Opción B: Usando NSSM (Non-Sucking Service Manager)
Si prefieres registrar `node dist/server.cjs` directamente como un servicio nativo de Windows Server 2025:
1. Descargar NSSM desde https://nssm.cc/
2. Ejecutar en PowerShell/CMD como Administrador:
   ```cmd
   nssm install TribunalAppServicio "C:\Program Files\nodejs\node.exe" "C:\inetpub\wwwroot\tribunal-app\dist\server.cjs"
   nssm set TribunalAppServicio AppDirectory "C:\inetpub\wwwroot\tribunal-app"
   nssm start TribunalAppServicio
   ```

---

## 🔐 Variables de Entorno Requeridas en Producción

| Variable | Descripción | Ejemplo / Valor |
|---|---|---|
| `NODE_ENV` | Modo de ejecución | `production` |
| `PORT` | Puerto HTTP (asignado automáticamente por IIS / Azure) | `3000` |
| `DATABASE_URL` | Cadena de conexión SSL a Azure PostgreSQL Flexible Server | `postgresql://user:pass@host:5432/db?sslmode=require` |
| `PGHOST` | Hostname de Azure PostgreSQL Flexible Server | `servidor-te-pg.postgres.database.azure.com` |
| `PGUSER` | Usuario de Azure PostgreSQL | `admin_tribunal` |
| `PGPASSWORD` | Contraseña de Azure PostgreSQL | `********` |
| `PGDATABASE` | Nombre de la base de datos PostgreSQL | `tribunal_db` |
| `PGPORT` | Puerto de PostgreSQL | `5432` |
| `PGSSLMODE` | Modo SSL para Azure PostgreSQL | `require` |
| `OUTLOOK_USER` | Correo remitente SMTP Office 365 | `notificaciones@tribunal.gob.pa` |
| `OUTLOOK_PASS` | Contraseña del correo | `********` |
| `OUTLOOK_HOST` | Host SMTP de Office 365 | `smtp.office365.com` |
| `OUTLOOK_PORT` | Puerto TLS/STARTTLS | `587` |

---

## 🔍 Verificación Post-Despliegue

Una vez completado el despliegue, compruebe los siguientes endpoints en su navegador:
- Estado general y conexión a Azure PostgreSQL: `https://tu-dominio.com/api/db-status`
- Verificación de salud del servidor Express: `https://tu-dominio.com/api/health`
