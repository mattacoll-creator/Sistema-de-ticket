/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { OFFICES_CONFIG } from "../types";

export interface OfficeSchedule {
  officeId: string;
  openTime: string;      // "HH:MM" in 24h format
  closeTime: string;     // "HH:MM" in 24h format
  closedDays: number[];  // 0 = Sunday, 1 = Monday, ..., 6 = Saturday. Default: [0, 6]
  specificHolidays: string[]; // "YYYY-MM-DD" style dates
  tempClosed: boolean;
  tempClosedReason: string;
}

const STORAGE_KEYS = {
  OFFICE_SCHEDULES: "ticket_system_office_schedules_v1"
};

// Default schedules as specified:
// Sede Principal: 7:00 a.m. to 3:00 p.m.
// Others: 7:30 a.m. to 3:30 p.m.
// Days: Monday to Friday (closed on Saturday [6] and Sunday [0])
export const INITIAL_SCHEDULES: Record<string, OfficeSchedule> = {};

OFFICES_CONFIG.forEach(office => {
  const isSedePrincipal = office.id === "OFF-1";
  INITIAL_SCHEDULES[office.id] = {
    officeId: office.id,
    openTime: isSedePrincipal ? "07:00" : "07:30",
    closeTime: isSedePrincipal ? "15:00" : "15:30",
    closedDays: [0, 6], // Sabado y Domingo cerrado por defecto
    specificHolidays: [
      "2026-01-01", // Año Nuevo
      "2026-01-09", // Día de los Mártires
      "2026-02-17", // Carnaval / Martes de Carnaval
      "2026-04-03", // Viernes Santo
      "2026-05-01", // Día del Trabajo
      "2026-11-03", // Separación de Panamá de Colombia
      "2026-11-05", // Día de Colón
      "2026-11-10", // Grito en La Villa de Los Santos
      "2026-11-28", // Independencia de Panamá de España
      "2026-12-08", // Día de las Madres
      "2026-12-25"  // Navidad
    ],
    tempClosed: false,
    tempClosedReason: "Cerrado por mantenimiento / contingencia"
  };
});

export function getAllOfficeSchedules(): Record<string, OfficeSchedule> {
  try {
    const saved = localStorage.getItem(STORAGE_KEYS.OFFICE_SCHEDULES);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with initial just in case some keys are missing
      const merged = { ...INITIAL_SCHEDULES };
      Object.keys(parsed).forEach(key => {
        merged[key] = { ...merged[key], ...parsed[key] };
      });
      return merged;
    }
  } catch (e) {
    console.error("Error reading office schedules", e);
  }
  return { ...INITIAL_SCHEDULES };
}

export function getOfficeSchedule(officeId: string): OfficeSchedule {
  const all = getAllOfficeSchedules();
  return all[officeId] || INITIAL_SCHEDULES[officeId] || {
    officeId,
    openTime: "07:30",
    closeTime: "15:30",
    closedDays: [0, 6],
    specificHolidays: [],
    tempClosed: false,
    tempClosedReason: ""
  };
}

export function saveOfficeSchedule(officeId: string, schedule: OfficeSchedule): void {
  try {
    const all = getAllOfficeSchedules();
    all[officeId] = schedule;
    localStorage.setItem(STORAGE_KEYS.OFFICE_SCHEDULES, JSON.stringify(all));
    // Dispatch storage event to alert other components/screens immediately
    window.dispatchEvent(new Event("storage"));
  } catch (e) {
    console.error("Error saving office schedule", e);
  }
}

export function isOfficeOpenNow(officeId: string, checkDate: Date = new Date()): { 
  isOpen: boolean; 
  reason: string; 
  schedule: OfficeSchedule 
} {
  const schedule = getOfficeSchedule(officeId);

  // 1. Manual emergency closed check
  if (schedule.tempClosed) {
    return { 
      isOpen: false, 
      reason: `CERRADO TEMPORALMENTE: ${schedule.tempClosedReason || "Feriado o contingencia decretada."}`, 
      schedule 
    };
  }

  // 2. Weekday check (Sunday [0] to Saturday [6])
  const dayOfWeek = checkDate.getDay();
  if (schedule.closedDays.includes(dayOfWeek)) {
    return { 
      isOpen: false, 
      reason: "OFICINA CERRADA: Fin de semana (No laborable).", 
      schedule 
    };
  }

  // 3. Specific holiday check
  const year = checkDate.getFullYear();
  const month = String(checkDate.getMonth() + 1).padStart(2, "0");
  const day = String(checkDate.getDate()).padStart(2, "0");
  const dateStr = `${year}-${month}-${day}`;
  
  if (schedule.specificHolidays.includes(dateStr)) {
    return { 
      isOpen: false, 
      reason: "OFICINA CERRADA: Día libre / Feriado Nacional de Panamá decretado.", 
      schedule 
    };
  }

  // 4. Opening Hours check
  const hours = checkDate.getHours();
  const minutes = checkDate.getMinutes();
  const timeVal = hours * 60 + minutes;

  const [openH, openM] = schedule.openTime.split(":").map(Number);
  const [closeH, closeM] = schedule.closeTime.split(":").map(Number);

  const openVal = openH * 60 + openM;
  const closeVal = closeH * 60 + closeM;

  if (timeVal < openVal) {
    return { 
      isOpen: false, 
      reason: `FUERA DE HORARIO: Abre a las o<sup>a</sup> ${schedule.openTime} a.m.`, 
      schedule 
    };
  }

  if (timeVal >= closeVal) {
    return { 
      isOpen: false, 
      reason: `CERRADO: El horario de hoy finalizó a las ${schedule.closeTime} p.m.`, 
      schedule 
    };
  }

  return { isOpen: true, reason: "Abierto", schedule };
}
