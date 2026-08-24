/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Utilidad de Sincronización de Hora del Servidor (Zona Horaria Oficial: America/Panama UTC-5)

let serverTimeOffset = 0; // offset en milisegundos entre el servidor y el cliente
let isInitialSyncDone = false;

/**
 * Realiza la sincronización con el endpoint del servidor
 */
export async function syncServerTime(): Promise<number> {
  try {
    const startFetch = performance.now();
    const res = await fetch("/api/server-time", { cache: "no-store" });
    const endFetch = performance.now();
    const networkLatency = (endFetch - startFetch) / 2;

    if (res.ok) {
      const data = await res.json();
      if (data && typeof data.timestamp === "number") {
        // Ajustar el offset considerando la latencia de ida y vuelta
        const clientNow = Date.now();
        serverTimeOffset = (data.timestamp + networkLatency) - clientNow;
        isInitialSyncDone = true;
        return serverTimeOffset;
      }
    }
  } catch (err) {
    // Si falla la red, usar hora local como respaldo
    console.warn("[serverTime] No se pudo sincronizar la hora con el servidor, usando respaldo local.", err);
  }
  return serverTimeOffset;
}

// Iniciar sincronización de inmediato y programar refresco periódico cada 30 segundos
if (typeof window !== "undefined") {
  syncServerTime();
  setInterval(() => {
    syncServerTime();
  }, 30000);
}

/**
 * Obtiene la fecha/hora actual calibrada con la del servidor
 */
export function getServerTime(): Date {
  return new Date(Date.now() + serverTimeOffset);
}

/**
 * Obtiene el timestamp en milisegundos actual calibrado con el servidor
 */
export function getServerTimestamp(): number {
  return Date.now() + serverTimeOffset;
}

/**
 * Formatea la hora en zona horaria oficial de Panamá (America/Panama)
 */
export function formatPanamaTime(dateInput?: Date | number, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof dateInput === "number" ? new Date(dateInput) : (dateInput || getServerTime());
  const defaultOptions: Intl.DateTimeFormatOptions = {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "America/Panama",
    ...options
  };
  try {
    return date.toLocaleTimeString("es-PA", defaultOptions);
  } catch {
    return date.toLocaleTimeString([], defaultOptions);
  }
}

/**
 * Formatea la fecha en zona horaria oficial de Panamá (America/Panama)
 */
export function formatPanamaDate(dateInput?: Date | number, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof dateInput === "number" ? new Date(dateInput) : (dateInput || getServerTime());
  const defaultOptions: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "America/Panama",
    ...options
  };
  try {
    return date.toLocaleDateString("es-PA", defaultOptions).toUpperCase();
  } catch {
    return date.toLocaleDateString([], defaultOptions).toUpperCase();
  }
}
