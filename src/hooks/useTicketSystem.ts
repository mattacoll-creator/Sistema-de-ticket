/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Ticket, TicketStatus, TicketPhase, Cubicle, CubicleStatus, ServiceType, SERVICES_CONFIG } from "../types";
import { getServerTimestamp } from "../utils/serverTime";

const STORAGE_KEYS = {
  TICKETS: "ticket_system_tickets_v1",
  CUBICLES: "ticket_system_cubicles_v1",
  STATS: "ticket_system_stats_v1",
  AUTO_ASSIGN: "ticket_system_auto_assign_v1",
  CURRENT_OFFICE: "ticket_system_current_office_v1",
  OFFICE_TICKETS: "ticket_system_office_tickets_v1",
  OFFICE_CUBICLES: "ticket_system_office_cubicles_v3",
  OFFICE_AUTO_ASSIGN: "ticket_system_office_auto_assign_v1",
  ACTIVE_CALL: "ticket_system_active_call_v1"
};

/**
 * Normaliza cualquier formato de ticket (desde backend PostgreSQL, API o localStorage)
 * para asegurar consistencia tipada exacta en todos los componentes y pantallas de TV.
 */
export function normalizeClientTicket(raw: any): Ticket {
  const normStatus = ((): TicketStatus => {
    const s = String(raw.status || raw.estado || "").toUpperCase();
    if (s === "WAITING" || s === "ESPERA") return TicketStatus.WAITING;
    if (s === "CALLING" || s === "LLAMADO") return TicketStatus.CALLING;
    if (s === "ATTENDING" || s === "ATENDIENDO" || s === "ATENCION") return TicketStatus.ATTENDING;
    if (s === "COMPLETED" || s === "FINALIZADO" || s === "COMPLETADO") return TicketStatus.COMPLETED;
    if (s === "MISSED" || s === "CANCELADO" || s === "PERDIDO") return TicketStatus.MISSED;
    return TicketStatus.WAITING;
  })();

  const normService = ((): ServiceType => {
    const s = String(raw.serviceType || raw.tipo_tramite || "").toUpperCase();
    if (s.includes("ELECTORAL") || s === "O") return ServiceType.ELECTORAL;
    if (s.includes("REGISTRO") || s === "REG" || s.includes("CERTIFICACION")) return ServiceType.REGISTRO;
    if (s.includes("EXTRANJERIA") || s === "E" || s.includes("EXT")) return ServiceType.EXTRANJERIA;
    return ServiceType.CEDULACION;
  })();

  const normPhase = ((): TicketPhase => {
    const p = String(raw.currentPhase || raw.fase_actual || "").toUpperCase();
    if (p === "TRIADA" || p === "FOTOGRAFIA" || p === "FOTO") return TicketPhase.TRIADA;
    return TicketPhase.CAJA;
  })();

  const cTime = raw.createdAt
    ? (typeof raw.createdAt === "number" ? raw.createdAt : new Date(raw.createdAt).getTime())
    : (raw.hora_emision ? new Date(raw.hora_emision).getTime() : getServerTimestamp());

  const cubId = raw.assignedCubicleId || raw.assignedCubicle || raw.modulo_asignado || undefined;

  return {
    id: String(raw.id || Math.random().toString(36).substring(2, 9)),
    numberCode: String(raw.numberCode || raw.numero_ticket || "C-001"),
    number: parseInt(String(raw.number || raw.numberCode || raw.numero_ticket || "1").replace(/\D/g, ""), 10) || 1,
    name: String(raw.name || raw.nombre || "Ciudadano"),
    serviceType: normService,
    status: normStatus,
    currentPhase: normPhase,
    phaseHistory: Array.isArray(raw.phaseHistory) && raw.phaseHistory.length > 0
      ? raw.phaseHistory
      : [{ phase: normPhase, timestamp: cTime }],
    createdAt: cTime,
    calledAt: raw.calledAt
      ? (typeof raw.calledAt === "number" ? raw.calledAt : new Date(raw.calledAt).getTime())
      : (raw.hora_llamado ? new Date(raw.hora_llamado).getTime() : undefined),
    completedAt: raw.completedAt
      ? (typeof raw.completedAt === "number" ? raw.completedAt : new Date(raw.completedAt).getTime())
      : (raw.hora_fin_atencion ? new Date(raw.hora_fin_atencion).getTime() : undefined),
    assignedCubicleId: cubId,
    priority: !!(raw.priority || raw.es_prioritario),
    isAppointment: !!(raw.isAppointment || raw.es_cita),
    procedure: raw.procedure || raw.sub_tramite || undefined
  };
}

export function canCubicleServeProcedure(cubicleId: string, procedure?: string): boolean {
  if (!procedure) return true; // Non-procedure tickets (like Cedulación) can be served normally
  
  const num = parseInt(cubicleId.replace("CUB-", ""), 10);
  if (isNaN(num)) return true;

  if (num === 32 || num === 33) return true; // Ventanillas de Caja RC procesan cobros de cualquier trámite

  // Routing rules requested:
  // - OR: Cubículos 2 a 8
  if (procedure === "OR") {
    return num >= 2 && num <= 8;
  }
  // - SI y OI: Cubículo 9
  if (procedure === "SI" || procedure === "OI") {
    return num === 9;
  }
  // - ED: Cubículo 10
  if (procedure === "ED") {
    return num === 10;
  }
  // - RS: Cubículo 11
  if (procedure === "RS") {
    return num === 11;
  }
  // - RTMA / RMAT: Cubículos 12 a 14
  if (procedure === "RMAT" || procedure === "RTMA") {
    return num >= 12 && num <= 14;
  }
  // - SAU: Cubículo 15
  if (procedure === "SAU") {
    return num === 15;
  }
  // - OHV: Cubículos 16 a 20
  if (procedure === "OHV") {
    return num >= 16 && num <= 20;
  }
  // - STR: Cubículo 23
  if (procedure === "STR") {
    return num === 23;
  }
  // - OTR: Cubículo 1
  if (procedure === "OTR") {
    return num === 1;
  }

  return true;
}

const INITIAL_CUBICLES: Cubicle[] = [
  {
    id: "CUB-1",
    name: "Cubículo 1 (OTR)",
    agentName: "Yesselin Samudio (10.0.31.32)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-2",
    name: "Cubículo 2 (OR)",
    agentName: "OR (10.0.29.78)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-3",
    name: "Cubículo 3 (OR)",
    agentName: "Lerquia Acosta (10.0.29.153)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-4",
    name: "Cubículo 4 (OR)",
    agentName: "Juan Rivera (10.0.31.41)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-5",
    name: "Cubículo 5 (OR)",
    agentName: "Erick Gonzalez (10.0.28.120)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-6",
    name: "Cubículo 6 (OR)",
    agentName: "Abel Gonzalez (10.0.29.81)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-7",
    name: "Cubículo 7 (OR)",
    agentName: "Ashtrid Mendieta (10.0.30.248)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-8",
    name: "Cubículo 8 (OR)",
    agentName: "Oliver Ureña (10.0.29.53)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-9",
    name: "Cubículo 9 (SI/OI)",
    agentName: "Kayna Asprilla (10.0.30.76)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-10",
    name: "Cubículo 10 (ED)",
    agentName: "Mariela Tejada (10.0.29.171)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-11",
    name: "Cubículo 11 (RS)",
    agentName: "Jesus Tuñon (10.0.29.255)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-12",
    name: "Cubículo 12 (RMAT)",
    agentName: "Magleidys Lopez (10.0.31.71)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-13",
    name: "Cubículo 13 (RMAT)",
    agentName: "Yenia Lindo (10.0.29.108)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-14",
    name: "Cubículo 14 (RMAT)",
    agentName: "Dimas Cedeño (10.0.29.249)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-15",
    name: "Cubículo 15 (SAU)",
    agentName: "Indira Pérez (10.0.29.3)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-16",
    name: "Cubículo 16 (OHV)",
    agentName: "Peggy Corrales (10.0.29.52)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-17",
    name: "Cubículo 17 (OHV)",
    agentName: "Arturo Sianca (10.0.28.135)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-18",
    name: "Cubículo 18 (OHV)",
    agentName: "Rolando Paredes (10.0.30.33)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-19",
    name: "Cubículo 19 (OHV)",
    agentName: "Por Ocupar (10.0.31.51)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-20",
    name: "Cubículo 20 (OHV)",
    agentName: "Yamila Sanchez (10.0.30.182)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-23",
    name: "Cubículo 23 (STR)",
    agentName: "Lianeth Alberda (10.0.28.76)",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [],
    supportedServices: [ServiceType.REGISTRO],
    totalAttendedCount: 0
  },
  {
    id: "CUB-24",
    name: "Módulo 10 (Tríada / Fotografía)",
    agentName: "Diana Morales",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-25",
    name: "Módulo 11 (Tríada / Fotografía)",
    agentName: "Esteban Castro",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-26",
    name: "Módulo 12 (Tríada / Fotografía)",
    agentName: "Lucía Navarro",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-27",
    name: "Módulo 13 (Tríada / Fotografía)",
    agentName: "Andrés Silva",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-28",
    name: "Módulo 14 (Tríada / Fotografía)",
    agentName: "Mariana Rojas",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-29",
    name: "Módulo 15 (Tríada / Fotografía)",
    agentName: "Javier Mendoza",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-30",
    name: "Módulo 16 (Preferencial - Tríada / Fotografía)",
    agentName: "Valeria Herrera",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    isPreferential: true,
    totalAttendedCount: 0
  },
  {
    id: "CUB-31",
    name: "Módulo 17 (Preferencial - Tríada / Fotografía)",
    agentName: "Roberto Paredes",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    isPreferential: true,
    totalAttendedCount: 0
  },
  {
    id: "CUB-34",
    name: "Caja 0 (Preferencial • Cedulación)",
    agentName: "Carlos Samudio",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    isPreferential: true,
    totalAttendedCount: 0
  },
  {
    id: "CUB-35",
    name: "Caja 1 (Cedulación)",
    agentName: "Karla Cedeño",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-36",
    name: "Caja 2 (Cedulación)",
    agentName: "Julio Acosta",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-37",
    name: "Caja 3 (Cedulación)",
    agentName: "Patricia Lindo",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-38",
    name: "Caja 4 (Cedulación)",
    agentName: "Jorge Samudio",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-39",
    name: "Caja 5 (Cedulación)",
    agentName: "Isabel González",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-40",
    name: "Caja 6 (Cedulación)",
    agentName: "Alfonso Pérez",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-41",
    name: "Caja 7 (Cedulación)",
    agentName: "Lerquia Acosta",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-42",
    name: "Caja 8 (Preferencial • Cedulación)",
    agentName: "Juan Rivera",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA],
    isPreferential: true,
    totalAttendedCount: 0
  }
];

export interface OfficeModuleSpec {
  moduleNumber: number;
  area: "Caja" | "Triada / Fotografía";
  isPreferential: boolean;
  phase: TicketPhase;
}

export const REGIONAL_OFFICES_MODULES_SPEC: Record<string, OfficeModuleSpec[]> = {
  // Regional de Veraguas (Santiago)
  "OFF-14": [
    { moduleNumber: 1, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 2, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 3, area: "Caja", isPreferential: true, phase: TicketPhase.CAJA },
    { moduleNumber: 4, area: "Caja", isPreferential: true, phase: TicketPhase.CAJA },
    { moduleNumber: 5, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 6, area: "Triada / Fotografía", isPreferential: true, phase: TicketPhase.TRIADA },
    { moduleNumber: 7, area: "Triada / Fotografía", isPreferential: true, phase: TicketPhase.TRIADA }
  ],
  // Regional de Colón
  "OFF-4": [
    { moduleNumber: 1, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 2, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 3, area: "Caja", isPreferential: true, phase: TicketPhase.CAJA },
    { moduleNumber: 4, area: "Caja", isPreferential: true, phase: TicketPhase.CAJA },
    { moduleNumber: 5, area: "Triada / Fotografía", isPreferential: true, phase: TicketPhase.TRIADA },
    { moduleNumber: 6, area: "Triada / Fotografía", isPreferential: true, phase: TicketPhase.TRIADA },
    { moduleNumber: 7, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 8, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 9, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA }
  ],
  // Regional de Panamá Oeste (La Chorrera)
  "OFF-12": [
    { moduleNumber: 1, area: "Caja", isPreferential: true, phase: TicketPhase.CAJA },
    { moduleNumber: 2, area: "Caja", isPreferential: true, phase: TicketPhase.CAJA },
    { moduleNumber: 3, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 4, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 5, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 6, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 8, area: "Triada / Fotografía", isPreferential: true, phase: TicketPhase.TRIADA },
    { moduleNumber: 9, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 10, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 11, area: "Triada / Fotografía", isPreferential: true, phase: TicketPhase.TRIADA }
  ],
  // Regional de San Miguelito
  "OFF-13": [
    { moduleNumber: 1, area: "Caja", isPreferential: true, phase: TicketPhase.CAJA },
    { moduleNumber: 2, area: "Caja", isPreferential: true, phase: TicketPhase.CAJA },
    { moduleNumber: 3, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 4, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 5, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 6, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 7, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 8, area: "Triada / Fotografía", isPreferential: true, phase: TicketPhase.TRIADA },
    { moduleNumber: 9, area: "Triada / Fotografía", isPreferential: true, phase: TicketPhase.TRIADA },
    { moduleNumber: 10, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 11, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 12, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA }
  ],
  // Regional de Panamá Este
  "OFF-11": [
    { moduleNumber: 1, area: "Caja", isPreferential: true, phase: TicketPhase.CAJA },
    { moduleNumber: 2, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 3, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 4, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 5, area: "Caja", isPreferential: true, phase: TicketPhase.CAJA },
    { moduleNumber: 6, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 7, area: "Triada / Fotografía", isPreferential: true, phase: TicketPhase.TRIADA },
    { moduleNumber: 8, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 9, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 10, area: "Triada / Fotografía", isPreferential: true, phase: TicketPhase.TRIADA }
  ],
  // Regional de Panamá Norte
  "OFF-10": [
    { moduleNumber: 1, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 2, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 3, area: "Caja", isPreferential: true, phase: TicketPhase.CAJA },
    { moduleNumber: 4, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 5, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 6, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 7, area: "Triada / Fotografía", isPreferential: true, phase: TicketPhase.TRIADA }
  ],
  // Regional de Arraiján
  "OFF-16": [
    { moduleNumber: 1, area: "Caja", isPreferential: true, phase: TicketPhase.CAJA },
    { moduleNumber: 2, area: "Caja", isPreferential: true, phase: TicketPhase.CAJA },
    { moduleNumber: 3, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 4, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 5, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 6, area: "Triada / Fotografía", isPreferential: true, phase: TicketPhase.TRIADA },
    { moduleNumber: 7, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 8, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 9, area: "Triada / Fotografía", isPreferential: true, phase: TicketPhase.TRIADA }
  ],
  // Oficina Especial de Panamá Centro (Plaza Cohete)
  "OFF-9": [
    { moduleNumber: 1, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 2, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 3, area: "Caja", isPreferential: true, phase: TicketPhase.CAJA },
    { moduleNumber: 4, area: "Caja", isPreferential: false, phase: TicketPhase.CAJA },
    { moduleNumber: 5, area: "Caja", isPreferential: true, phase: TicketPhase.CAJA },
    { moduleNumber: 7, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 8, area: "Triada / Fotografía", isPreferential: false, phase: TicketPhase.TRIADA },
    { moduleNumber: 9, area: "Triada / Fotografía", isPreferential: true, phase: TicketPhase.TRIADA }
  ]
};

// Ensure any cubicle supporting CEDULACION also supports REG_CERTIFICATION
export function migrateCubicleState(cubicle: Cubicle, officeId: string): Cubicle {
  const num = parseInt(cubicle.id.replace("CUB-", ""), 10);
  if (isNaN(num)) return { ...cubicle };

  const updated = { ...cubicle };
  if (num >= 1 && num <= 23) {
    updated.supportedServices = [ServiceType.REGISTRO];
    updated.supportedPhases = [];
  } else if (num >= 24 && num <= 31) {
    updated.supportedServices = [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA, ServiceType.REG_CERTIFICATION];
    updated.supportedPhases = [TicketPhase.TRIADA];
    if (num === 24) updated.name = "Módulo 10 (Tríada / Fotografía)";
    else if (num === 25) updated.name = "Módulo 11 (Tríada / Fotografía)";
    else if (num === 26) updated.name = "Módulo 12 (Tríada / Fotografía)";
    else if (num === 27) updated.name = "Módulo 13 (Tríada / Fotografía)";
    else if (num === 28) updated.name = "Módulo 14 (Tríada / Fotografía)";
    else if (num === 29) updated.name = "Módulo 15 (Tríada / Fotografía)";
    else if (num === 30) {
      updated.name = "Módulo 16 (Preferencial - Tríada / Fotografía)";
      updated.isPreferential = true;
    } else if (num === 31) {
      updated.name = "Módulo 17 (Preferencial - Tríada / Fotografía)";
      updated.isPreferential = true;
    }
  } else if (num >= 34 && num <= 42) {
    updated.supportedServices = [ServiceType.CEDULACION, ServiceType.ELECTORAL, ServiceType.EXTRANJERIA, ServiceType.REG_CERTIFICATION];
    updated.supportedPhases = [TicketPhase.CAJA];
    const index = num - 34; // 34 is Caja 0, 35 is Caja 1, etc.
    if (index === 0 || index === 8) {
      updated.name = `Caja ${index} (Preferencial • Cedulación)`;
      updated.isPreferential = true;
    } else {
      updated.name = `Caja ${index} (Cedulación)`;
      updated.isPreferential = false;
    }
  }

  if (officeId !== "OFF-1") {
    updated.supportedServices = (updated.supportedServices || []).filter(s => s !== ServiceType.EXTRANJERIA);
  }
  return updated;
}

// Migrate and clean INITIAL_CUBICLES
INITIAL_CUBICLES.forEach((c, idx) => {
  INITIAL_CUBICLES[idx] = migrateCubicleState(c, "OFF-1");
});

const EMPTY_TICKETS: Ticket[] = [];
const DEFAULT_CUBICLES_CACHE: Record<string, Cubicle[]> = {};

export function getDefaultCubiclesForOffice(officeId: string): Cubicle[] {
  const specList = REGIONAL_OFFICES_MODULES_SPEC[officeId];
  if (specList) {
    return specList.map(spec => {
      const isPref = spec.isPreferential;
      const areaLabel = spec.area;
      const typeLabel = isPref ? "Preferencial" : "Regular";
      const name = isPref
        ? `Módulo ${spec.moduleNumber} (${areaLabel} • ${typeLabel})`
        : `Módulo ${spec.moduleNumber} (${areaLabel})`;
      const agentName = `Agente M${spec.moduleNumber} (${typeLabel})`;
      
      const supportedServices = [
        ServiceType.CEDULACION,
        ServiceType.ELECTORAL,
        ServiceType.REG_CERTIFICATION
      ];
      if (officeId === "OFF-1") {
        supportedServices.push(ServiceType.EXTRANJERIA);
      }

      return {
        id: `CUB-${officeId.replace("OFF-", "")}-${spec.moduleNumber}`,
        name,
        agentName,
        status: CubicleStatus.ONLINE_AVAILABLE,
        supportedPhases: [spec.phase],
        supportedServices,
        totalAttendedCount: 0,
        isPreferential: isPref,
        area: spec.area
      };
    });
  }

  if (!DEFAULT_CUBICLES_CACHE[officeId]) {
    DEFAULT_CUBICLES_CACHE[officeId] = INITIAL_CUBICLES.map(c => migrateCubicleState(c, officeId));
  }
  return DEFAULT_CUBICLES_CACHE[officeId];
}

export function useTicketSystem(gatewaySelection?: "select" | "cedulacion" | "registro_civil") {
  const [currentOfficeId, setCurrentOfficeId] = useState<string>("OFF-1");
  const [officeTickets, setOfficeTickets] = useState<Record<string, Ticket[]>>({});
  const [officeCubicles, setOfficeCubicles] = useState<Record<string, Cubicle[]>>({});
  const [officeAutoAssign, setOfficeAutoAssign] = useState<Record<string, boolean>>({});

  const [activeCall, setActiveCall] = useState<{ ticket: Ticket; cubicle: Cubicle } | null>(null);

  // Simulation states
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(10000); // ms per user arrival (10s default)
  const simulationTimer = useRef<NodeJS.Timeout | null>(null);

  // Derived state for the active office - memoized to prevent infinite re-renders or stale dependencies
  const tickets = useMemo(() => {
    return officeTickets[currentOfficeId] || EMPTY_TICKETS;
  }, [officeTickets, currentOfficeId]);

  const cubicles = useMemo(() => {
    return officeCubicles[currentOfficeId] || getDefaultCubiclesForOffice(currentOfficeId);
  }, [officeCubicles, currentOfficeId]);

  const ticketsRef = useRef<Ticket[]>(EMPTY_TICKETS);
  ticketsRef.current = tickets;

  // Synchronize activeCall state based on calling tickets (vital for remote screens like TV)
  useEffect(() => {
    // Find all tickets currently in CALLING status
    const callingTickets = tickets.filter(t => t.status === TicketStatus.CALLING);
    if (callingTickets.length === 0) {
      if (activeCall !== null) {
        setActiveCall(null);
      }
      return;
    }

    // Find the one with the latest calledAt timestamp
    const mostRecentTicket = [...callingTickets].sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0))[0];
    
    // Check if the current activeCall is already this ticket to avoid redundant state updates
    if (activeCall?.ticket.id === mostRecentTicket.id && activeCall?.ticket.calledAt === mostRecentTicket.calledAt) {
      return;
    }

    const assignedCubicle = cubicles.find(c => c.id === mostRecentTicket.assignedCubicleId);
    if (assignedCubicle) {
      setActiveCall({ ticket: mostRecentTicket, cubicle: assignedCubicle });
    }
  }, [tickets, cubicles, activeCall, setActiveCall]);

  const isAutoAssignActive = officeAutoAssign[currentOfficeId] !== false;

  // Evitar loops innecesarios en serialización de estado
  const currentStateRef = useRef<string>("");
  currentStateRef.current = JSON.stringify({
    tickets: officeTickets[currentOfficeId] || [],
    cubicles: officeCubicles[currentOfficeId] || getDefaultCubiclesForOffice(currentOfficeId),
    auto_assign: officeAutoAssign[currentOfficeId] !== false
  });

  const setTicketsForCurrentOffice = useCallback((updater: Ticket[] | ((prev: Ticket[]) => Ticket[])) => {
    setOfficeTickets(prev => {
      const currentVal = prev[currentOfficeId] || EMPTY_TICKETS;
      const newVal = typeof updater === "function" ? updater(currentVal) : updater;
      return {
        ...prev,
        [currentOfficeId]: newVal
      };
    });
  }, [currentOfficeId]);

  const setCubiclesForCurrentOffice = useCallback((updater: Cubicle[] | ((prev: Cubicle[]) => Cubicle[])) => {
    setOfficeCubicles(prev => {
      const currentVal = prev[currentOfficeId] || getDefaultCubiclesForOffice(currentOfficeId);
      let newVal = typeof updater === "function" ? updater(currentVal) : updater;
      if (currentOfficeId !== "OFF-1") {
        newVal = newVal.map(c => ({
          ...c,
          supportedServices: (c.supportedServices || []).filter(s => s !== ServiceType.EXTRANJERIA)
        }));
      }
      return {
        ...prev,
        [currentOfficeId]: newVal
      };
    });
  }, [currentOfficeId]);

  const setIsAutoAssignActive = useCallback((active: boolean) => {
    setOfficeAutoAssign(prev => ({
      ...prev,
      [currentOfficeId]: active
    }));
  }, [currentOfficeId]);

  // 1. Load from localStorage and sync with PostgreSQL server
  useEffect(() => {
    try {
      const storedOffice = localStorage.getItem(STORAGE_KEYS.CURRENT_OFFICE);
      if (storedOffice) {
        setCurrentOfficeId(storedOffice);
      }

      const storedOfficeTickets = localStorage.getItem(STORAGE_KEYS.OFFICE_TICKETS);
      let loadedTickets: Record<string, Ticket[]> = {};
      if (storedOfficeTickets) {
        loadedTickets = JSON.parse(storedOfficeTickets);
      } else {
        const oldTickets = localStorage.getItem("ticket_system_tickets_v1");
        if (oldTickets) {
          loadedTickets["OFF-1"] = JSON.parse(oldTickets);
        }
      }
      setOfficeTickets(loadedTickets);

      // Fetch from PostgreSQL server on startup
      fetch("/api/tickets?office=ALL")
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.success && Array.isArray(data.tickets) && data.tickets.length > 0) {
            setOfficeTickets(prev => {
              const updated = { ...prev };
              data.tickets.forEach((srvTicket: any) => {
                const offId = srvTicket.sucursalId || "OFF-1";
                if (!updated[offId]) updated[offId] = [];
                const existIdx = updated[offId].findIndex(t => t.id === srvTicket.id || t.numberCode === srvTicket.numberCode);
                if (existIdx >= 0) {
                  updated[offId][existIdx] = { ...updated[offId][existIdx], ...srvTicket };
                } else {
                  updated[offId].push(srvTicket);
                }
              });
              return updated;
            });
          }
        })
        .catch(err => {
          console.warn("Could not load tickets from backend SQL:", err);
        });

      const storedOfficeCubicles = localStorage.getItem(STORAGE_KEYS.OFFICE_CUBICLES);
      let loadedCubicles: Record<string, Cubicle[]> = {};
      if (storedOfficeCubicles) {
        loadedCubicles = JSON.parse(storedOfficeCubicles);
        // Migrate or replace if cubicle list has changed
        Object.keys(loadedCubicles).forEach(officeId => {
          if (REGIONAL_OFFICES_MODULES_SPEC[officeId]) {
            // Ensure configured regional offices match the exact module specifications
            loadedCubicles[officeId] = getDefaultCubiclesForOffice(officeId);
          } else {
            // Normalize supportedServices and phases for loaded cubicles, filtering out obsolete CUB-32 and CUB-33
            loadedCubicles[officeId] = loadedCubicles[officeId]
              .filter(c => {
                const num = parseInt(c.id.replace("CUB-", ""), 10);
                return !isNaN(num) && (num < 32 || num > 33);
              })
              .map(c => migrateCubicleState(c, officeId));

            if (loadedCubicles[officeId].length !== INITIAL_CUBICLES.length) {
              loadedCubicles[officeId] = INITIAL_CUBICLES.map(c => migrateCubicleState(c, officeId));
            }
          }
        });
      } else {
        const oldCubicles = localStorage.getItem("ticket_system_cubicles_v1");
        if (oldCubicles) {
          loadedCubicles["OFF-1"] = JSON.parse(oldCubicles);
        }
      }
      setOfficeCubicles(loadedCubicles);

      const storedOfficeAutoAssign = localStorage.getItem(STORAGE_KEYS.OFFICE_AUTO_ASSIGN);
      let loadedAutoAssign: Record<string, boolean> = {};
      if (storedOfficeAutoAssign) {
        loadedAutoAssign = JSON.parse(storedOfficeAutoAssign);
      } else {
        const oldAutoAssign = localStorage.getItem("ticket_system_auto_assign_v1");
        if (oldAutoAssign !== null) {
          loadedAutoAssign["OFF-1"] = JSON.parse(oldAutoAssign);
        }
      }
      setOfficeAutoAssign(loadedAutoAssign);

      const storedActiveCall = localStorage.getItem(STORAGE_KEYS.ACTIVE_CALL);
      if (storedActiveCall) {
        try {
          setActiveCall(JSON.parse(storedActiveCall));
        } catch (err) {
          console.error("Error parsing stored active call:", err);
        }
      }
    } catch (e) {
      console.error("Error loading states from localStorage", e);
    }
  }, []);

  // 2. Persist to localStorage on changes & broadcast to all open screens/tabs
  useEffect(() => {
    try {
      if (activeCall) {
        localStorage.setItem(STORAGE_KEYS.ACTIVE_CALL, JSON.stringify(activeCall));
      } else {
        localStorage.removeItem(STORAGE_KEYS.ACTIVE_CALL);
      }

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const bc = new BroadcastChannel("te_ticket_system_channel");
          bc.postMessage({ type: "ACTIVE_CALL_CHANGED", activeCall: activeCall || null });
          bc.close();
        } catch (e) {
          // ignore BroadcastChannel errors
        }
      }
    } catch (e) {
      console.error("Error saving active call to localStorage", e);
    }
  }, [activeCall]);

  useEffect(() => {
    try {
      if (Object.keys(officeTickets).length > 0) {
        localStorage.setItem(STORAGE_KEYS.OFFICE_TICKETS, JSON.stringify(officeTickets));

        // Sync with backend API so other devices (TV, Kiosk, Mobile Tracker) receive updates
        const currentTickets = officeTickets[currentOfficeId] || [];
        if (currentTickets.length > 0) {
          fetch("/api/tickets/bulk-sync", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sucursalId: currentOfficeId,
              tickets: currentTickets
            })
          }).catch(e => {
            // silent catch in dev mode
          });
        }
      }
    } catch (e) {
      console.error("Error saving office tickets", e);
    }
  }, [officeTickets, currentOfficeId]);

  // Periodic background polling (every 2.5s) to synchronize TV screens, Kiosks and Mobile Tracker with PostgreSQL database
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetch(`/api/tickets?office=${currentOfficeId}`)
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && data.success && Array.isArray(data.tickets)) {
            setOfficeTickets(prev => {
              const currentList = prev[currentOfficeId] || [];
              const normalizedIncoming = data.tickets.map(normalizeClientTicket);

              // Check if there are any differences
              let hasChanges = false;
              if (currentList.length !== normalizedIncoming.length) {
                hasChanges = true;
              } else {
                for (let i = 0; i < normalizedIncoming.length; i++) {
                  const incoming = normalizedIncoming[i];
                  const existing = currentList.find(t => t.id === incoming.id || t.numberCode === incoming.numberCode);
                  if (!existing ||
                      existing.status !== incoming.status ||
                      existing.currentPhase !== incoming.currentPhase ||
                      existing.assignedCubicleId !== incoming.assignedCubicleId ||
                      existing.calledAt !== incoming.calledAt) {
                    hasChanges = true;
                    break;
                  }
                }
              }

              if (hasChanges) {
                return { ...prev, [currentOfficeId]: normalizedIncoming };
              }
              return prev;
            });
          }
        })
        .catch(() => {
          // ignore network hiccups
        });
    }, 2500);

    return () => clearInterval(pollInterval);
  }, [currentOfficeId]);

  useEffect(() => {
    try {
      if (Object.keys(officeCubicles).length > 0) {
        localStorage.setItem(STORAGE_KEYS.OFFICE_CUBICLES, JSON.stringify(officeCubicles));
      }
    } catch (e) {
      console.error("Error saving office cubicles", e);
    }
  }, [officeCubicles]);

  useEffect(() => {
    try {
      if (Object.keys(officeAutoAssign).length > 0) {
        localStorage.setItem(STORAGE_KEYS.OFFICE_AUTO_ASSIGN, JSON.stringify(officeAutoAssign));
      }
    } catch (e) {
      console.error("Error saving office auto assignment", e);
    }
  }, [officeAutoAssign]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_OFFICE, currentOfficeId);
    } catch (e) {
      console.error("Error saving current office", e);
    }
  }, [currentOfficeId]);

  // Listen to standard storage events to keep multiple tabs on the same computer synchronized in real-time
  useEffect(() => {
    const handleStorageChange = (e: Event) => {
      const se = e as StorageEvent;
      // If it's a StorageEvent, check key. Otherwise process anyway for manual reload dispatches
      if (
        se.key &&
        se.key !== STORAGE_KEYS.OFFICE_TICKETS &&
        se.key !== STORAGE_KEYS.OFFICE_CUBICLES &&
        se.key !== STORAGE_KEYS.OFFICE_AUTO_ASSIGN &&
        se.key !== STORAGE_KEYS.CURRENT_OFFICE &&
        se.key !== STORAGE_KEYS.ACTIVE_CALL
      ) {
        return;
      }

      try {
        if (se.key === STORAGE_KEYS.ACTIVE_CALL) {
          if (se.newValue) {
            try {
              setActiveCall(JSON.parse(se.newValue));
            } catch (err) {
              console.error("Error parsing storage active call update:", err);
            }
          } else {
            setActiveCall(null);
          }
          return;
        }

        const storedOffice = localStorage.getItem(STORAGE_KEYS.CURRENT_OFFICE);
        if (storedOffice && storedOffice !== currentOfficeId) {
          setCurrentOfficeId(storedOffice);
        }

        const storedOfficeTickets = localStorage.getItem(STORAGE_KEYS.OFFICE_TICKETS);
        if (storedOfficeTickets) {
          const parsedTickets = JSON.parse(storedOfficeTickets);
          const rawOfficeList = parsedTickets[currentOfficeId] || [];
          const normalizedOfficeList = rawOfficeList.map(normalizeClientTicket);

          const incomingStateStr = JSON.stringify({
            tickets: normalizedOfficeList,
            cubicles: officeCubicles[currentOfficeId] || getDefaultCubiclesForOffice(currentOfficeId),
            auto_assign: officeAutoAssign[currentOfficeId] !== false
          });

          if (incomingStateStr !== currentStateRef.current) {
            const mappedAll: Record<string, Ticket[]> = {};
            Object.keys(parsedTickets).forEach(k => {
              mappedAll[k] = (parsedTickets[k] || []).map(normalizeClientTicket);
            });
            setOfficeTickets(mappedAll);
          }
        }

        const storedOfficeCubicles = localStorage.getItem(STORAGE_KEYS.OFFICE_CUBICLES);
        if (storedOfficeCubicles) {
          const loadedCubicles = JSON.parse(storedOfficeCubicles);
          Object.keys(loadedCubicles).forEach(officeId => {
            loadedCubicles[officeId] = loadedCubicles[officeId]
              .filter((c: any) => {
                const num = parseInt(c.id.replace("CUB-", ""), 10);
                return !isNaN(num) && (num < 32 || num > 33);
              })
              .map((c: any) => migrateCubicleState(c, officeId));
          });

          const incomingStateStr = JSON.stringify({
            tickets: officeTickets[currentOfficeId] || [],
            cubicles: loadedCubicles[currentOfficeId] || getDefaultCubiclesForOffice(currentOfficeId),
            auto_assign: officeAutoAssign[currentOfficeId] !== false
          });

          if (incomingStateStr !== currentStateRef.current) {
            setOfficeCubicles(loadedCubicles);
          }
        }

        const storedOfficeAutoAssign = localStorage.getItem(STORAGE_KEYS.OFFICE_AUTO_ASSIGN);
        if (storedOfficeAutoAssign) {
          const parsedAuto = JSON.parse(storedOfficeAutoAssign);
          const incomingStateStr = JSON.stringify({
            tickets: officeTickets[currentOfficeId] || [],
            cubicles: officeCubicles[currentOfficeId] || getDefaultCubiclesForOffice(currentOfficeId),
            auto_assign: parsedAuto[currentOfficeId] !== false
          });

          if (incomingStateStr !== currentStateRef.current) {
            setOfficeAutoAssign(parsedAuto);
          }
        }
      } catch (err) {
        console.error("Error syncing from storage change event:", err);
      }
    };

    window.addEventListener("storage", handleStorageChange);

    let bc: BroadcastChannel | null = null;
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        bc = new BroadcastChannel("te_ticket_system_channel");
        bc.onmessage = (event) => {
          if (event.data?.type === "TICKET_CREATED" || event.data?.type === "TICKET_UPDATED") {
            const officeId = event.data.officeId || currentOfficeId;
            const updatedTicket = event.data.ticket ? normalizeClientTicket(event.data.ticket) : null;
            if (updatedTicket) {
              setOfficeTickets(prev => {
                const currentList = prev[officeId] || [];
                const idx = currentList.findIndex(t => t.id === updatedTicket.id);
                const nextList = idx >= 0
                  ? currentList.map((t, i) => i === idx ? updatedTicket : t)
                  : [...currentList, updatedTicket];
                return { ...prev, [officeId]: nextList };
              });
            }
          } else if (event.data?.type === "ACTIVE_CALL_CHANGED") {
            setActiveCall(event.data.activeCall || null);
          }
        };
      } catch (e) {}
    }

    return () => {
      window.removeEventListener("storage", handleStorageChange);
      if (bc) {
        try { bc.close(); } catch (e) {}
      }
    };
  }, [currentOfficeId, officeTickets, officeCubicles, officeAutoAssign]);

  // Clean / Reset the whole system
  const resetSystem = useCallback(() => {
    setTicketsForCurrentOffice([]);
    setCubiclesForCurrentOffice(INITIAL_CUBICLES.map(c => ({ ...c })));
    setActiveCall(null);
    setIsSimulationActive(false);
    setIsAutoAssignActive(true);
  }, [setTicketsForCurrentOffice, setCubiclesForCurrentOffice, setIsAutoAssignActive]);

  // Purga inteligente de memoria para optimizar rendimiento de colas
  const purgeOldTickets = useCallback(() => {
    setTicketsForCurrentOffice(prev => {
      const active = prev.filter(t => 
        t.status === TicketStatus.WAITING || 
        t.status === TicketStatus.CALLING || 
        t.status === TicketStatus.ATTENDING
      );
      const finished = prev.filter(t => 
        t.status === TicketStatus.COMPLETED || 
        t.status === TicketStatus.MISSED
      );
      
      // Conservamos solo los 15 terminados más recientes para estadísticas
      finished.sort((a, b) => b.createdAt - a.createdAt);
      const trimmedFinished = finished.slice(0, 15);
      
      // Unir y ordenar por fecha de creación original
      return [...active, ...trimmedFinished].sort((a, b) => a.createdAt - b.createdAt);
    });
  }, [setTicketsForCurrentOffice]);

  // 3. Create ticket
  const createTicket = useCallback((name: string, serviceType: ServiceType, priority: boolean = false, isAppointment: boolean = false, procedure?: string): Ticket => {
    const cleanName = name.trim() || "Anónimo";
    const config = SERVICES_CONFIG[serviceType];
    
    let finalProcedure = procedure;
    if (serviceType === ServiceType.REGISTRO && !finalProcedure) {
      const rcProcedures = ["OR", "OHV", "RMAT", "STR", "OTR"];
      finalProcedure = rcProcedures[Math.floor(Math.random() * rcProcedures.length)];
    } else if (serviceType === ServiceType.CEDULACION && !finalProcedure) {
      const cedProcedures = ["CPV", "REN", "DUP", "CJ", "CRP", "RBM", "REG"];
      finalProcedure = cedProcedures[Math.floor(Math.random() * cedProcedures.length)];
    }

    // Target prefix for ticket code:
    // O -> Organización Electoral
    // C -> Cedulación
    // E -> Extranjería
    // REG -> Certificaciones de Registro Civil
    const targetPrefix = config?.prefix || (serviceType === ServiceType.REGISTRO ? "REG" : "C");
    const sameProcedureTickets = ticketsRef.current.filter(t => {
      const tPrefix = SERVICES_CONFIG[t.serviceType]?.prefix || (t.serviceType === ServiceType.REGISTRO ? "REG" : "C");
      return tPrefix === targetPrefix;
    });
    const orderNumber = sameProcedureTickets.length + 1;
    const formattedNumber = `${targetPrefix}-${orderNumber.toString().padStart(3, "0")}`;

    let finalIsAppointment = isAppointment;

    const initialPhase = TicketPhase.CAJA;
    const serverCreatedTime = getServerTimestamp();

    const newTicket: Ticket = {
      id: Math.random().toString(36).substring(2, 9),
      numberCode: formattedNumber,
      number: orderNumber,
      name: cleanName,
      serviceType,
      status: TicketStatus.WAITING,
      currentPhase: initialPhase,
      phaseHistory: [{ phase: initialPhase, timestamp: serverCreatedTime }],
      createdAt: serverCreatedTime,
      priority,
      isAppointment: finalIsAppointment,
      procedure: finalProcedure
    };

    setTicketsForCurrentOffice(prev => [...prev, newTicket]);

    // Send immediately to backend API (Memory + PostgreSQL)
    fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: newTicket.id,
        numberCode: newTicket.numberCode,
        name: newTicket.name,
        serviceType: newTicket.serviceType,
        procedure: newTicket.procedure,
        priority: newTicket.priority,
        isAppointment: newTicket.isAppointment,
        sucursalId: currentOfficeId,
        status: newTicket.status,
        currentPhase: newTicket.currentPhase,
        createdAt: newTicket.createdAt
      })
    }).catch(e => {
      // ignore
    });

    // Cross-tab broadcast
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("te_ticket_system_channel");
        bc.postMessage({ type: "TICKET_CREATED", officeId: currentOfficeId, ticket: newTicket });
        bc.close();
      } catch (err) {}
    }
    
    return newTicket;
  }, [setTicketsForCurrentOffice, currentOfficeId]);

  // 4. Assign / Call next ticket for a specific cubicle
  const callNextTicket = useCallback(async (cubicleId: string) => {
    const targetCubicle = cubicles.find(c => c.id === cubicleId);
    if (!targetCubicle) return;

    // Reject if cubicle is not online
    if (targetCubicle.status === CubicleStatus.BREAK || targetCubicle.status === CubicleStatus.OFFLINE) {
      return;
    }

    // Get all candidates that are in WAITING status and whose currentPhase is supported by this cubicle
    const candidates = tickets.filter(t => {
      if (t.status !== TicketStatus.WAITING) return false;
      if (!targetCubicle.supportedPhases.includes(t.currentPhase)) return false;
      if (targetCubicle.supportedServices && !targetCubicle.supportedServices.includes(t.serviceType)) return false;

      // Registro Civil: Ventanillas 1 al 23 llaman tickets en fase inicial (TRIADA/Atención). No hay Caja en Registro Civil.
      if (t.serviceType === ServiceType.REGISTRO) {
        if (t.currentPhase !== TicketPhase.TRIADA) return false;
      }

      // Preferential attention (priority & citas agendadas) vs Regular attention routing rules:
      const isTargetPreferential = targetCubicle.isPreferential === true ||
        targetCubicle.name.toLowerCase().includes("preferencial") ||
        targetCubicle.id === "CUB-30" ||
        targetCubicle.id === "CUB-31" ||
        targetCubicle.id === "CUB-34" ||
        targetCubicle.id === "CUB-42";

      if (isTargetPreferential) {
        // Módulo Preferencial: Da prioridad inmediata a turnos preferenciales (embarazadas, tercera edad, discapacidad)
        // y a citas agendadas desde el portal web.
        // Si hay turnos preferenciales o con cita en espera, no toma turnos regulares sin cita previa.
        const anyPreferredWaiting = tickets.some(otherT =>
          otherT.status === TicketStatus.WAITING &&
          otherT.currentPhase === t.currentPhase &&
          (t.serviceType === ServiceType.REGISTRO ? otherT.serviceType === ServiceType.REGISTRO : otherT.serviceType !== ServiceType.REGISTRO) &&
          (otherT.priority || otherT.isAppointment) &&
          targetCubicle.supportedServices.includes(otherT.serviceType) &&
          canCubicleServeProcedure(cubicleId, otherT.procedure)
        );
        if (anyPreferredWaiting && !t.priority && !t.isAppointment) {
          return false;
        }
      } else {
        // Módulo Regular:
        // Si en la oficina hay módulos preferenciales habilitados para esta fase,
        // los módulos regulares no toman preferenciales por condición para no saturar la fila regular.
        const hasOfficePrefForPhase = cubicles.some(c =>
          (c.isPreferential === true || c.name.toLowerCase().includes("preferencial")) &&
          c.supportedPhases.includes(t.currentPhase)
        );
        if (hasOfficePrefForPhase && t.priority) {
          return false;
        }

        // Si hay turnos regulares CON CITA previa del portal en espera, el módulo regular les da preferencia
        // frente a turnos regulares espontáneos (walk-in).
        const anyAppointmentWaiting = tickets.some(otherT =>
          otherT.status === TicketStatus.WAITING &&
          otherT.currentPhase === t.currentPhase &&
          (t.serviceType === ServiceType.REGISTRO ? otherT.serviceType === ServiceType.REGISTRO : otherT.serviceType !== ServiceType.REGISTRO) &&
          !otherT.priority &&
          otherT.isAppointment &&
          targetCubicle.supportedServices.includes(otherT.serviceType) &&
          canCubicleServeProcedure(cubicleId, otherT.procedure)
        );
        if (anyAppointmentWaiting && !t.isAppointment) {
          return false;
        }
      }

      return canCubicleServeProcedure(cubicleId, t.procedure);
    });

    if (candidates.length === 0) return;

    // Sorting:
    // 1. Preferencial con Cita (Puntaje 6)
    // 2. Preferencial (Puntaje 4)
    // 3. Regular con Cita Agendada (Puntaje 2)
    // 4. Regular espontáneo (Puntaje 0)
    // Dentro del mismo nivel, por orden de llegada (createdAt más antiguo primero)
    candidates.sort((a, b) => {
      const valA = (a.priority ? 4 : 0) + (a.isAppointment ? 2 : 0);
      const valB = (b.priority ? 4 : 0) + (b.isAppointment ? 2 : 0);
      if (valA !== valB) {
        return valB - valA;
      }
      return a.createdAt - b.createdAt;
    });

    const chosenTicket = candidates[0];
    const serverNow = getServerTimestamp();

    // If there was an existing ticket being attended at this cubicle, transition/complete it first based on phase pipeline
    let updatedTickets = tickets.map(t => {
      if (t.assignedCubicleId === cubicleId && (t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING)) {
        let nextPhase: TicketPhase | null = null;
        let nextStatus = TicketStatus.WAITING;
        let finalCompletedAt: number | undefined = undefined;

        if (t.currentPhase === TicketPhase.CAJA) {
          if (t.serviceType === ServiceType.CEDULACION) {
            const doesCorrespond = t.procedure !== "REG";
            if (doesCorrespond) {
              nextPhase = TicketPhase.TRIADA;
              nextStatus = TicketStatus.WAITING;
            } else {
              nextStatus = TicketStatus.COMPLETED;
              finalCompletedAt = serverNow;
            }
          } else {
            const isShortFlow = t.serviceType === ServiceType.ELECTORAL || t.serviceType === ServiceType.REGISTRO;
            if (isShortFlow) {
              nextStatus = TicketStatus.COMPLETED;
              finalCompletedAt = serverNow;
            } else {
              nextPhase = TicketPhase.TRIADA;
              nextStatus = TicketStatus.WAITING;
            }
          }
        } else {
          nextStatus = TicketStatus.COMPLETED;
          finalCompletedAt = serverNow;
        }

        const updatedHistory = t.phaseHistory.map(h => {
          if (h.phase === t.currentPhase && !h.completedAt) {
            return {
              ...h,
              completedAt: serverNow,
              cubicleId: cubicleId,
              agentName: targetCubicle.agentName
            };
          }
          return h;
        });

        if (nextPhase) {
          updatedHistory.push({
            phase: nextPhase,
            timestamp: serverNow
          });
          return {
            ...t,
            currentPhase: nextPhase,
            status: nextStatus,
            phaseHistory: updatedHistory,
            assignedCubicleId: undefined,
            calledAt: undefined
          };
        } else {
          return {
            ...t,
            status: nextStatus,
            completedAt: finalCompletedAt,
            phaseHistory: updatedHistory,
            assignedCubicleId: undefined
          };
        }
      }
      return t;
    });

    // Mark chosen ticket as CALLING
    let chosenTicketRef: Ticket = {
      ...chosenTicket,
      status: TicketStatus.CALLING,
      calledAt: serverNow,
      assignedCubicleId: cubicleId
    };

    updatedTickets = updatedTickets.map(t => {
      if (t.id === chosenTicket.id) {
        return chosenTicketRef;
      }
      return t;
    });

    // Update tickets state
    setTicketsForCurrentOffice(updatedTickets);

    // Update cubicle status
    setCubiclesForCurrentOffice(prev => prev.map(c => {
      if (c.id === cubicleId) {
        return {
          ...c,
          status: CubicleStatus.ATTENDING,
          currentTicketId: chosenTicket.id
        };
      }
      return c;
    }));

    // Trigger UI Voice Event & TV Display
    setActiveCall({ ticket: chosenTicketRef, cubicle: targetCubicle });

    // Sync to backend API immediately
    fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: chosenTicketRef.id,
        numberCode: chosenTicketRef.numberCode,
        name: chosenTicketRef.name,
        serviceType: chosenTicketRef.serviceType,
        procedure: chosenTicketRef.procedure,
        priority: chosenTicketRef.priority,
        isAppointment: chosenTicketRef.isAppointment,
        sucursalId: currentOfficeId,
        status: chosenTicketRef.status,
        currentPhase: chosenTicketRef.currentPhase,
        assignedCubicleId: cubicleId,
        assignedAgent: targetCubicle.agentName,
        calledAt: serverNow,
        createdAt: chosenTicketRef.createdAt
      })
    }).catch(() => {});

    // Broadcast across windows/tabs
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("te_ticket_system_channel");
        bc.postMessage({ type: "TICKET_UPDATED", officeId: currentOfficeId, ticket: chosenTicketRef });
        bc.postMessage({ type: "ACTIVE_CALL_CHANGED", activeCall: { ticket: chosenTicketRef, cubicle: targetCubicle } });
        bc.close();
      } catch (err) {}
    }
  }, [cubicles, tickets, currentOfficeId, setTicketsForCurrentOffice, setCubiclesForCurrentOffice, setActiveCall]);

  // 5. Active ticket actions (start actual attending or finish)
  const startAttendingTicket = useCallback((cubicleId: string) => {
    const targetCubicle = cubicles.find(c => c.id === cubicleId);
    let updatedTicketRef: Ticket | null = null;
    const serverNow = getServerTimestamp();

    setTicketsForCurrentOffice(prev => prev.map(t => {
      const isTarget = (targetCubicle && t.id === targetCubicle.currentTicketId) ||
        (t.assignedCubicleId === cubicleId && (t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING));
      
      if (isTarget) {
        updatedTicketRef = {
          ...t,
          status: TicketStatus.ATTENDING,
          assignedCubicleId: cubicleId
        };
        return updatedTicketRef;
      }
      return t;
    }));

    setCubiclesForCurrentOffice(prev => prev.map(c => {
      if (c.id === cubicleId) {
        return {
          ...c,
          status: CubicleStatus.ATTENDING,
          currentTicketId: updatedTicketRef?.id || c.currentTicketId
        };
      }
      return c;
    }));

    if (updatedTicketRef) {
      const ticketToSync: Ticket = updatedTicketRef;
      fetch("/api/tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: ticketToSync.id,
          numberCode: ticketToSync.numberCode,
          name: ticketToSync.name,
          serviceType: ticketToSync.serviceType,
          procedure: ticketToSync.procedure,
          priority: ticketToSync.priority,
          isAppointment: ticketToSync.isAppointment,
          sucursalId: currentOfficeId,
          status: TicketStatus.ATTENDING,
          currentPhase: ticketToSync.currentPhase,
          assignedCubicleId: cubicleId,
          assignedAgent: targetCubicle?.agentName,
          calledAt: ticketToSync.calledAt,
          createdAt: ticketToSync.createdAt
        })
      }).catch(() => {});

      if (typeof window !== "undefined" && "BroadcastChannel" in window) {
        try {
          const bc = new BroadcastChannel("te_ticket_system_channel");
          bc.postMessage({ type: "TICKET_UPDATED", officeId: currentOfficeId, ticket: ticketToSync });
          bc.close();
        } catch (err) {}
      }
    }
  }, [cubicles, currentOfficeId, setTicketsForCurrentOffice, setCubiclesForCurrentOffice]);

  const completeTicket = useCallback((cubicleId: string, outcome?: "administrative" | "emission_physical") => {
    const targetCubicle = cubicles.find(c => c.id === cubicleId);
    const serverNow = getServerTimestamp();

    // Find ticket associated with cubicle
    const currentTicket = tickets.find(t =>
      (targetCubicle && t.id === targetCubicle.currentTicketId) ||
      (t.assignedCubicleId === cubicleId && (t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING))
    );

    if (!currentTicket) {
      // Fallback: free up the cubicle just in case
      setCubiclesForCurrentOffice(prev => prev.map(c => {
        if (c.id === cubicleId) {
          return {
            ...c,
            status: CubicleStatus.ONLINE_AVAILABLE,
            currentTicketId: undefined
          };
        }
        return c;
      }));
      return;
    }

    let nextPhase: TicketPhase | null = null;
    let nextStatus = TicketStatus.WAITING;
    let finalCompletedAt: number | undefined = undefined;

    if (currentTicket.currentPhase === TicketPhase.CAJA) {
      if (outcome === "administrative") {
        nextStatus = TicketStatus.COMPLETED;
        finalCompletedAt = serverNow;
      } else if (outcome === "emission_physical") {
        nextPhase = TicketPhase.TRIADA;
        nextStatus = TicketStatus.WAITING;
      } else {
        if (currentTicket.serviceType === ServiceType.CEDULACION) {
          const doesCorrespond = currentTicket.procedure !== "REG" && currentTicket.procedure !== "COE";
          if (doesCorrespond) {
            nextPhase = TicketPhase.TRIADA;
            nextStatus = TicketStatus.WAITING;
          } else {
            nextStatus = TicketStatus.COMPLETED;
            finalCompletedAt = serverNow;
          }
        } else {
          const isShortFlow = currentTicket.serviceType === ServiceType.ELECTORAL || currentTicket.serviceType === ServiceType.REGISTRO;
          if (isShortFlow) {
            nextStatus = TicketStatus.COMPLETED;
            finalCompletedAt = serverNow;
          } else {
            nextPhase = TicketPhase.TRIADA;
            nextStatus = TicketStatus.WAITING;
          }
        }
      }
    } else {
      // TRIADA or other is final step
      nextStatus = TicketStatus.COMPLETED;
      finalCompletedAt = serverNow;
    }

    // Close the current phase history object
    const updatedHistory = (currentTicket.phaseHistory || []).map(h => {
      if (h.phase === currentTicket.currentPhase && !h.completedAt) {
        return {
          ...h,
          completedAt: serverNow,
          cubicleId: cubicleId,
          agentName: targetCubicle?.agentName
        };
      }
      return h;
    });

    if (nextPhase) {
      updatedHistory.push({
        phase: nextPhase,
        timestamp: serverNow
      });
    }

    const updatedTicket: Ticket = nextPhase ? {
      ...currentTicket,
      currentPhase: nextPhase,
      status: nextStatus,
      phaseHistory: updatedHistory,
      assignedCubicleId: undefined, // Clear assignment so others in Tríada can call it
      calledAt: undefined
    } : {
      ...currentTicket,
      status: nextStatus,
      completedAt: finalCompletedAt,
      phaseHistory: updatedHistory,
      assignedCubicleId: undefined
    };

    // Update tickets
    setTicketsForCurrentOffice(prev => prev.map(t => {
      if (t.id === currentTicket.id) {
        return updatedTicket;
      }
      return t;
    }));

    // Update cubicle to available
    setCubiclesForCurrentOffice(prev => prev.map(c => {
      if (c.id === cubicleId) {
        return {
          ...c,
          status: CubicleStatus.ONLINE_AVAILABLE,
          currentTicketId: undefined,
          totalAttendedCount: (c.totalAttendedCount || 0) + 1
        };
      }
      return c;
    }));

    // Clear activeCall if it was for this ticket
    setActiveCall(prev => {
      if (prev && prev.ticket.id === currentTicket.id) {
        return null;
      }
      return prev;
    });

    // Synchronize to backend database / memory immediately
    fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: updatedTicket.id,
        numberCode: updatedTicket.numberCode,
        name: updatedTicket.name,
        serviceType: updatedTicket.serviceType,
        procedure: updatedTicket.procedure,
        priority: updatedTicket.priority,
        isAppointment: updatedTicket.isAppointment,
        sucursalId: currentOfficeId,
        status: updatedTicket.status,
        currentPhase: updatedTicket.currentPhase,
        phaseHistory: updatedTicket.phaseHistory,
        assignedCubicleId: null,
        assignedAgent: null,
        calledAt: null,
        completedAt: updatedTicket.completedAt,
        createdAt: updatedTicket.createdAt
      })
    }).catch(() => {});

    // Broadcast across windows / tabs
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("te_ticket_system_channel");
        bc.postMessage({ type: "TICKET_UPDATED", officeId: currentOfficeId, ticket: updatedTicket });
        bc.postMessage({ type: "ACTIVE_CALL_CHANGED", activeCall: null });
        bc.close();
      } catch (err) {}
    }
  }, [cubicles, tickets, currentOfficeId, setTicketsForCurrentOffice, setCubiclesForCurrentOffice, setActiveCall]);

  const markTicketAsMissed = useCallback((cubicleId: string) => {
    const targetCubicle = cubicles.find(c => c.id === cubicleId);
    const serverNow = getServerTimestamp();

    const currentTicket = tickets.find(t =>
      (targetCubicle && t.id === targetCubicle.currentTicketId) ||
      (t.assignedCubicleId === cubicleId && (t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING))
    );

    if (!currentTicket) {
      setCubiclesForCurrentOffice(prev => prev.map(c => {
        if (c.id === cubicleId) {
          return { ...c, status: CubicleStatus.ONLINE_AVAILABLE, currentTicketId: undefined };
        }
        return c;
      }));
      return;
    }

    const updatedTicket: Ticket = {
      ...currentTicket,
      status: TicketStatus.MISSED,
      completedAt: serverNow,
      assignedCubicleId: undefined
    };

    setTicketsForCurrentOffice(prev => prev.map(t => {
      if (t.id === currentTicket.id) {
        return updatedTicket;
      }
      return t;
    }));

    setCubiclesForCurrentOffice(prev => prev.map(c => {
      if (c.id === cubicleId) {
        return {
          ...c,
          status: CubicleStatus.ONLINE_AVAILABLE,
          currentTicketId: undefined
        };
      }
      return c;
    }));

    setActiveCall(prev => {
      if (prev && prev.ticket.id === currentTicket.id) {
        return null;
      }
      return prev;
    });

    fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: updatedTicket.id,
        numberCode: updatedTicket.numberCode,
        name: updatedTicket.name,
        serviceType: updatedTicket.serviceType,
        procedure: updatedTicket.procedure,
        priority: updatedTicket.priority,
        isAppointment: updatedTicket.isAppointment,
        sucursalId: currentOfficeId,
        status: TicketStatus.MISSED,
        currentPhase: updatedTicket.currentPhase,
        assignedCubicleId: null,
        assignedAgent: null,
        completedAt: serverNow,
        createdAt: updatedTicket.createdAt
      })
    }).catch(() => {});

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("te_ticket_system_channel");
        bc.postMessage({ type: "TICKET_UPDATED", officeId: currentOfficeId, ticket: updatedTicket });
        bc.postMessage({ type: "ACTIVE_CALL_CHANGED", activeCall: null });
        bc.close();
      } catch (err) {}
    }
  }, [cubicles, tickets, currentOfficeId, setTicketsForCurrentOffice, setCubiclesForCurrentOffice, setActiveCall]);

  const transferTicketToCajaRC = useCallback((cubicleId: string) => {
    const targetCubicle = cubicles.find(c => c.id === cubicleId);
    const serverNow = getServerTimestamp();

    const currentTicket = tickets.find(t =>
      (targetCubicle && t.id === targetCubicle.currentTicketId) ||
      (t.assignedCubicleId === cubicleId && (t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING))
    );

    if (!currentTicket) return;

    const updatedHistory = (currentTicket.phaseHistory || []).map(h => {
      if (h.phase === currentTicket.currentPhase && !h.completedAt) {
        return {
          ...h,
          completedAt: serverNow,
          cubicleId: cubicleId,
          agentName: targetCubicle?.agentName
        };
      }
      return h;
    });

    updatedHistory.push({
      phase: TicketPhase.CAJA,
      timestamp: serverNow
    });

    const updatedTicket: Ticket = {
      ...currentTicket,
      currentPhase: TicketPhase.CAJA,
      status: TicketStatus.WAITING,
      phaseHistory: updatedHistory,
      assignedCubicleId: undefined,
      calledAt: undefined
    };

    setTicketsForCurrentOffice(prev => prev.map(t => {
      if (t.id === currentTicket.id) {
        return updatedTicket;
      }
      return t;
    }));

    setCubiclesForCurrentOffice(prev => prev.map(c => {
      if (c.id === cubicleId) {
        return {
          ...c,
          status: CubicleStatus.ONLINE_AVAILABLE,
          currentTicketId: undefined,
          totalAttendedCount: (c.totalAttendedCount || 0) + 1
        };
      }
      return c;
    }));

    setActiveCall(prev => {
      if (prev && prev.ticket.id === currentTicket.id) {
        return null;
      }
      return prev;
    });

    fetch("/api/tickets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: updatedTicket.id,
        numberCode: updatedTicket.numberCode,
        name: updatedTicket.name,
        serviceType: updatedTicket.serviceType,
        procedure: updatedTicket.procedure,
        priority: updatedTicket.priority,
        isAppointment: updatedTicket.isAppointment,
        sucursalId: currentOfficeId,
        status: TicketStatus.WAITING,
        currentPhase: TicketPhase.CAJA,
        phaseHistory: updatedTicket.phaseHistory,
        assignedCubicleId: null,
        assignedAgent: null,
        calledAt: null,
        createdAt: updatedTicket.createdAt
      })
    }).catch(() => {});

    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("te_ticket_system_channel");
        bc.postMessage({ type: "TICKET_UPDATED", officeId: currentOfficeId, ticket: updatedTicket });
        bc.postMessage({ type: "ACTIVE_CALL_CHANGED", activeCall: null });
        bc.close();
      } catch (err) {}
    }
  }, [cubicles, tickets, currentOfficeId, setTicketsForCurrentOffice, setCubiclesForCurrentOffice, setActiveCall]);

  const recallCurrentTicket = useCallback((cubicleId: string) => {
    const targetCubicle = cubicles.find(c => c.id === cubicleId);
    if (!targetCubicle || !targetCubicle.currentTicketId) return;

    const currentTicket = tickets.find(t => t.id === targetCubicle.currentTicketId);
    if (!currentTicket) return;

    if (currentTicket.serviceType === ServiceType.REGISTRO && currentTicket.currentPhase === TicketPhase.CAJA) {
      return; // Sin llamado en TV para la Caja de Registro Civil
    }

    // Update calledAt to current time so TV screen can detect it as a fresh recall
    const updatedCalledAt = getServerTimestamp();
    setTicketsForCurrentOffice(prev => prev.map(t => {
      if (t.id === currentTicket.id) {
        return {
          ...t,
          calledAt: updatedCalledAt
        };
      }
      return t;
    }));

    // Trigger local activeCall state
    const updatedTicket = { ...currentTicket, calledAt: updatedCalledAt };
    setActiveCall({ ticket: updatedTicket, cubicle: targetCubicle });

    // Broadcast across windows
    if (typeof window !== "undefined" && "BroadcastChannel" in window) {
      try {
        const bc = new BroadcastChannel("te_ticket_system_channel");
        bc.postMessage({ type: "TICKET_UPDATED", officeId: currentOfficeId, ticket: updatedTicket });
        bc.postMessage({ type: "ACTIVE_CALL_CHANGED", activeCall: { ticket: updatedTicket, cubicle: targetCubicle } });
        bc.close();
      } catch (err) {}
    }
  }, [cubicles, tickets, currentOfficeId, setTicketsForCurrentOffice, setActiveCall]);

  // 6. Change cubicle status (e.g., transition to BREAK or OFFLINE)
  const changeCubicleStatus = useCallback((cubicleId: string, newStatus: CubicleStatus, agentName?: string) => {
    // If transitioning to break/offline, complete modern work
    setCubiclesForCurrentOffice(prev => prev.map(c => {
      if (c.id === cubicleId) {
        return {
          ...c,
          status: newStatus,
          agentName: agentName !== undefined ? agentName : (newStatus === CubicleStatus.OFFLINE ? undefined : c.agentName),
          // Clear active ticket if going offline or into break
          currentTicketId: (newStatus === CubicleStatus.BREAK || newStatus === CubicleStatus.OFFLINE) ? undefined : c.currentTicketId
        };
      }
      return c;
    }));

    // If there was an active ticket being attended, set it to missed or completed
    if (newStatus === CubicleStatus.BREAK || newStatus === CubicleStatus.OFFLINE) {
      setTicketsForCurrentOffice(prev => prev.map(t => {
        if (t.assignedCubicleId === cubicleId && (t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING)) {
          return { ...t, status: TicketStatus.COMPLETED, completedAt: Date.now() };
        }
        return t;
      }));
    }
  }, [setCubiclesForCurrentOffice, setTicketsForCurrentOffice]);

  // Configures cubicle capabilities dynamically
  const updateCubicleConfig = useCallback((cubicleId: string, supportedPhases: TicketPhase[], supportedServices: ServiceType[]) => {
    setCubiclesForCurrentOffice(prev => prev.map(c => {
      if (c.id === cubicleId) {
        return {
          ...c,
          supportedPhases,
          supportedServices
        };
      }
      return c;
    }));
  }, [setCubiclesForCurrentOffice]);

  // Auto Assignment Engine Logic
  const triggerAutoAssignment = useCallback(async (
    currentTickets: Ticket[],
    currentCubicles: Cubicle[]
  ) => {
    let updatedTickets = [...currentTickets];
    let updatedCubicles = [...currentCubicles];
    let assignedCount = 0;
    const callsToTrigger: { ticket: Ticket; cubicle: Cubicle }[] = [];

    // Iterate through all free cubicles
    for (let cIndex = 0; cIndex < updatedCubicles.length; cIndex++) {
      const cubicle = updatedCubicles[cIndex];
      if (cubicle.status !== CubicleStatus.ONLINE_AVAILABLE) {
        continue;
      }

      // Find all candidates that are in WAITING status and supported by this cubicle
      const candidates = updatedTickets.filter(t => {
        if (t.status !== TicketStatus.WAITING) return false;
        if (!cubicle.supportedPhases || !cubicle.supportedPhases.includes(t.currentPhase)) return false;
        if (cubicle.supportedServices && !cubicle.supportedServices.includes(t.serviceType)) return false;

        // Preferential attention routing rules:
        const isCubiclePreferential = cubicle.isPreferential === true ||
          cubicle.name.toLowerCase().includes("preferencial") ||
          cubicle.id === "CUB-30" ||
          cubicle.id === "CUB-31" ||
          cubicle.id === "CUB-34" ||
          cubicle.id === "CUB-42";

        if (isCubiclePreferential) {
          const anyPreferredWaiting = updatedTickets.some(otherT =>
            otherT.status === TicketStatus.WAITING &&
            otherT.currentPhase === t.currentPhase &&
            (t.serviceType === ServiceType.REGISTRO ? otherT.serviceType === ServiceType.REGISTRO : otherT.serviceType !== ServiceType.REGISTRO) &&
            (otherT.priority || otherT.isAppointment) &&
            cubicle.supportedServices.includes(otherT.serviceType) &&
            canCubicleServeProcedure(cubicle.id, otherT.procedure)
          );
          if (anyPreferredWaiting && !t.priority && !t.isAppointment) {
            return false;
          }
        } else {
          const hasOfficePrefForPhase = currentCubicles.some(c =>
            (c.isPreferential === true || c.name.toLowerCase().includes("preferencial")) &&
            c.supportedPhases?.includes(t.currentPhase)
          );
          if (hasOfficePrefForPhase && t.priority) {
            return false;
          }

          // In regular module, scheduled appointments have priority over spontaneous walk-ins
          const anyAppointmentWaiting = updatedTickets.some(otherT =>
            otherT.status === TicketStatus.WAITING &&
            otherT.currentPhase === t.currentPhase &&
            (t.serviceType === ServiceType.REGISTRO ? otherT.serviceType === ServiceType.REGISTRO : otherT.serviceType !== ServiceType.REGISTRO) &&
            !otherT.priority &&
            otherT.isAppointment &&
            cubicle.supportedServices.includes(otherT.serviceType) &&
            canCubicleServeProcedure(cubicle.id, otherT.procedure)
          );
          if (anyAppointmentWaiting && !t.isAppointment) {
            return false;
          }
        }

        return canCubicleServeProcedure(cubicle.id, t.procedure);
      });

      if (candidates.length === 0) continue;

      // Sort candidates:
      // 1. Preferential with appointment (Score 6)
      // 2. Preferential (Score 4)
      // 3. Regular with appointment (Score 2)
      // 4. Regular walk-in (Score 0)
      // Then FIFO by createdAt
      candidates.sort((a, b) => {
        const valA = (a.priority ? 4 : 0) + (a.isAppointment ? 2 : 0);
        const valB = (b.priority ? 4 : 0) + (b.isAppointment ? 2 : 0);
        if (valA !== valB) {
          return valB - valA;
        }
        return a.createdAt - b.createdAt;
      });

      const chosenTicket = candidates[0];

      // Mark chosen ticket as CALLING
      updatedTickets = updatedTickets.map(t => {
        if (t.id === chosenTicket.id) {
          return {
            ...t,
            status: TicketStatus.CALLING,
            calledAt: Date.now(),
            assignedCubicleId: cubicle.id
          };
        }
        return t;
      });

      // Mark cubicle as ATTENDING
      updatedCubicles = updatedCubicles.map(c => {
        if (c.id === cubicle.id) {
          return {
            ...c,
            status: CubicleStatus.ATTENDING,
            currentTicketId: chosenTicket.id
          };
        }
        return c;
      });

      assignedCount++;
      const updatedTicketRef = { 
        ...chosenTicket, 
        status: TicketStatus.CALLING, 
        assignedCubicleId: cubicle.id,
        calledAt: Date.now()
      };
      callsToTrigger.push({ ticket: updatedTicketRef, cubicle });
    }

    if (assignedCount > 0) {
      setTicketsForCurrentOffice(updatedTickets);
      setCubiclesForCurrentOffice(updatedCubicles);

      if (callsToTrigger.length > 0) {
        const latestCall = callsToTrigger[callsToTrigger.length - 1];
        setActiveCall(latestCall);
      }
    }
  }, [setTicketsForCurrentOffice, setCubiclesForCurrentOffice, setActiveCall]);

  // Monitor tickets and cubicles to trigger automatic assignment with guardrails
  useEffect(() => {
    if (!isAutoAssignActive) return;

    // Check if there is ANY free cubicle that can serve ANY waiting ticket
    const freeCubicles = cubicles.filter(c => c.status === CubicleStatus.ONLINE_AVAILABLE);
    if (freeCubicles.length === 0) return;

    const waitingTickets = tickets.filter(t => t.status === TicketStatus.WAITING);
    if (waitingTickets.length === 0) return;

    const hasAnyMatch = freeCubicles.some(c => 
      waitingTickets.some(t => 
        (c.supportedPhases || []).includes(t.currentPhase) &&
        (c.supportedServices ? c.supportedServices.includes(t.serviceType) : true) &&
        canCubicleServeProcedure(c.id, t.procedure)
      )
    );

    if (!hasAnyMatch) return;

    // Trigger auto assignment
    triggerAutoAssignment(tickets, cubicles);
  }, [tickets, cubicles, isAutoAssignActive, triggerAutoAssignment]);

  // 7. Auto Simulation of arrivals
  useEffect(() => {
    if (isSimulationActive) {
      const names = [
        "Sofía Castro", "Mateo Gómez", "Valentina Ruíz", "Santiago Lopera", "Mariana Ochoa", 
        "Emmanuel Torres", "Isabella Díaz", "Sebastián Muñoz", "Camila Restrepo", "Luis Hernández",
        "Gabriela Ortiz", "Alejandro Bedoya", "Lucía Mejía", "Andrés Cardona", "Daniela Vargas"
      ];
      
      const services = (gatewaySelection === "registro_civil" ? [
        ServiceType.REGISTRO
      ] : [
        ServiceType.ELECTORAL,
        ServiceType.CEDULACION,
        ServiceType.EXTRANJERIA,
        ServiceType.REG_CERTIFICATION
      ]).filter(s => s !== ServiceType.EXTRANJERIA || currentOfficeId === "OFF-1");

      const generateArrival = () => {
        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomService = services[Math.floor(Math.random() * services.length)];
        const randomPriority = Math.random() < 0.22; // 22% chance of priority client

        createTicket(randomName, randomService, randomPriority);
      };

      // Generate a client immediately when activating simulation
      generateArrival();

      simulationTimer.current = setInterval(generateArrival, simulationSpeed);
    } else {
      if (simulationTimer.current) {
        clearInterval(simulationTimer.current);
      }
    }

    return () => {
      if (simulationTimer.current) {
        clearInterval(simulationTimer.current);
      }
    };
  }, [isSimulationActive, simulationSpeed, createTicket, currentOfficeId, gatewaySelection]);

  return {
    currentOfficeId,
    setCurrentOfficeId,
    tickets,
    cubicles,
    activeCall,
    setActiveCall,
    isSimulationActive,
    setIsSimulationActive,
    simulationSpeed,
    setSimulationSpeed,
    isAutoAssignActive,
    setIsAutoAssignActive,
    createTicket,
    callNextTicket,
    startAttendingTicket,
    completeTicket,
    transferTicketToCajaRC,
    markTicketAsMissed,
    recallCurrentTicket,
    changeCubicleStatus,
    updateCubicleConfig,
    resetSystem,
    purgeOldTickets,
    officeTickets,
    setOfficeTickets,
    officeCubicles,
    setOfficeCubicles
  };
}
