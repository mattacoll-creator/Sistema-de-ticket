// Sistema de Autoupdate para TVs y Clientes Web
// Escucha eventos en tiempo real vía SSE (Server-Sent Events) o sondea periódicamente el servidor
// para detectar si se ha desplegado una nueva versión o si el administrador ordenó un refresco forzado.

export interface VersionInfo {
  version: string;
  serverStartTime?: number;
  timestamp?: number;
}

let isReloading = false;

/**
 * Fuerza una recarga limpia del navegador:
 * 1. Limpia cachés de CacheStorage (ServiceWorkers / PWA)
 * 2. Limpia sessionStorage
 * 3. Ejecuta window.location.reload()
 */
export async function forceClientReload(reason: string = "Nueva versión detectada"): Promise<void> {
  if (isReloading) return;
  isReloading = true;

  console.log(`[AutoUpdate] ${reason}. Iniciando recarga automática en 1.5s...`);

  // Detectar si estábamos en pantalla completa o en una vista dedicada de TV para restaurarlo al recargar
  try {
    if (typeof document !== "undefined") {
      const isCurrentlyFullscreen = !!(
        document.fullscreenElement || 
        (document as any).webkitFullscreenElement || 
        (document as any).mozFullScreenElement || 
        (document as any).msFullscreenElement ||
        window.location.pathname.startsWith("/tv")
      );
      if (isCurrentlyFullscreen) {
        localStorage.setItem("te_was_fullscreen", "true");
        console.log("[AutoUpdate] Detectado modo Fullscreen/TV. Registrando estado para auto-restauración.");
      }
    }
  } catch (e) {
    console.warn("[AutoUpdate] Error guardando estado fullscreen:", e);
  }

  try {
    if (typeof window !== "undefined" && "caches" in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }
  } catch (e) {
    console.warn("[AutoUpdate] Error limpiando ServiceWorker caches:", e);
  }

  try {
    if (typeof window !== "undefined" && window.sessionStorage) {
      window.sessionStorage.clear();
    }
  } catch (e) {
    console.warn("[AutoUpdate] Error limpiando sessionStorage:", e);
  }

  // Notificación breve en pantalla si existe DOM
  try {
    if (typeof document !== "undefined" && document.body) {
      const banner = document.createElement("div");
      banner.id = "te-autoupdate-banner";
      banner.style.position = "fixed";
      banner.style.top = "0";
      banner.style.left = "0";
      banner.style.right = "0";
      banner.style.bottom = "0";
      banner.style.backgroundColor = "rgba(0, 48, 135, 0.95)";
      banner.style.color = "#ffffff";
      banner.style.display = "flex";
      banner.style.flexDirection = "column";
      banner.style.alignItems = "center";
      banner.style.justifyContent = "center";
      banner.style.zIndex = "99999999";
      banner.style.fontFamily = "system-ui, -apple-system, sans-serif";
      banner.style.textAlign = "center";
      banner.style.padding = "24px";
      banner.innerHTML = `
        <div style="background: rgba(255,255,255,0.1); border: 2px solid #d9a74a; padding: 32px 48px; border-radius: 20px; max-width: 600px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
          <div style="font-size: 14px; font-weight: 800; color: #d9a74a; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 8px;">Tribunal Electoral de Panamá</div>
          <div style="font-size: 26px; font-weight: 900; text-transform: uppercase; margin-bottom: 12px;">Actualizando Sistema</div>
          <div style="font-size: 16px; opacity: 0.9; line-height: 1.5; margin-bottom: 20px;">Se ha detectado una nueva versión del sistema. La pantalla se actualizará automáticamente en un momento...</div>
          <div style="display: inline-block; width: 36px; height: 36px; border: 4px solid rgba(255,255,255,0.3); border-top-color: #d9a74a; border-radius: 50%; animation: teSpin 1s linear infinite;"></div>
        </div>
        <style>
          @keyframes teSpin { to { transform: rotate(360deg); } }
        </style>
      `;
      document.body.appendChild(banner);
    }
  } catch {}

  // Pequeño retardo para asegurar que los mensajes queden registrados
  setTimeout(() => {
    try {
      // Forzar recarga con bypass de caché del navegador
      window.location.href = window.location.href.split("#")[0];
      window.location.reload();
    } catch {
      window.location.reload();
    }
  }, 1200);
}
