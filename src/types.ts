/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ServiceType {
  ELECTORAL = "ELECTORAL",       // Organización Electoral
  REGISTRO = "REGISTRO",         // Registro Civil
  CEDULACION = "CEDULACION",     // Cedulación
  EXTRANJERIA = "EXTRANJERIA"    // Extranjería
}

export interface ServiceDetail {
  id: ServiceType;
  name: string;
  prefix: string;
  color: string;
  estimatedTimeMin: number;
}

export const SERVICES_CONFIG: Record<ServiceType, ServiceDetail> = {
  [ServiceType.ELECTORAL]: {
    id: ServiceType.ELECTORAL,
    name: "Organización Electoral",
    prefix: "O",
    color: "bg-emerald-500 text-emerald-950 border-emerald-200",
    estimatedTimeMin: 15
  },
  [ServiceType.REGISTRO]: {
    id: ServiceType.REGISTRO,
    name: "Registro Civil",
    prefix: "R",
    color: "bg-blue-500 text-blue-950 border-blue-200",
    estimatedTimeMin: 10
  },
  [ServiceType.CEDULACION]: {
    id: ServiceType.CEDULACION,
    name: "Cedulación",
    prefix: "C",
    color: "bg-amber-500 text-amber-950 border-amber-200",
    estimatedTimeMin: 8
  },
  [ServiceType.EXTRANJERIA]: {
    id: ServiceType.EXTRANJERIA,
    name: "Extranjería",
    prefix: "E",
    color: "bg-rose-500 text-rose-950 border-rose-200",
    estimatedTimeMin: 12
  }
};

export enum TicketStatus {
  WAITING = "WAITING",
  CALLING = "CALLING",
  ATTENDING = "ATTENDING",
  COMPLETED = "COMPLETED",
  MISSED = "MISSED"
}

export enum TicketPhase {
  CAJA = "CAJA",                 // Caja
  TRIADA = "TRIADA"              // Tríada y Fotografía (Triage y Biometría)
}

export interface PhaseDetail {
  id: TicketPhase;
  name: string;
  shortName: string;
  color: string;
  icon: string;
  description: string;
}

export const PHASES_CONFIG: Record<TicketPhase, PhaseDetail> = {
  [TicketPhase.CAJA]: {
    id: TicketPhase.CAJA,
    name: "Caja",
    shortName: "Caja",
    color: "bg-emerald-500 text-emerald-950 border-emerald-300",
    icon: "Wallet",
    description: "Revisión inicial de documentos, validaciones y cobros o pagos iniciales"
  },
  [TicketPhase.TRIADA]: {
    id: TicketPhase.TRIADA,
    name: "Tríada y Fotografía",
    shortName: "Tríada / Foto",
    color: "bg-cyan-500 text-cyan-950 border-cyan-300",
    icon: "ClipboardCheck",
    description: "Triage inicial de viabilidad, captura de fotografía y firma biométrica, y validación de requisitos"
  }
};

export interface TicketPhaseHistory {
  phase: TicketPhase;
  timestamp: number;
  completedAt?: number;
  cubicleId?: string;
  agentName?: string;
}

export interface Ticket {
  id: string; // e.g. "A001" or string timestamp
  numberCode: string; // e.g. "A-01"
  number: number; // e.g. 1
  name: string;
  serviceType: ServiceType;
  status: TicketStatus;
  currentPhase: TicketPhase;
  phaseHistory: TicketPhaseHistory[];
  createdAt: number;
  calledAt?: number;
  completedAt?: number;
  assignedCubicleId?: string;
  priority: boolean; // Priority ticket (pregnant, elderly, disabled)
}

export enum CubicleStatus {
  ONLINE_AVAILABLE = "ONLINE_AVAILABLE", // Disponible para recibir ticket
  ATTENDING = "ATTENDING",               // Actualmente atendiendo
  BREAK = "BREAK",                       // En receso de descanso
  OFFLINE = "OFFLINE"                    // Cerrado / Desconectado
}

export interface Cubicle {
  id: string;
  name: string; // e.g. "Cubículo 1"
  agentName: string; // e.g. "Dra. María González"
  status: CubicleStatus;
  currentTicketId?: string; // Currently attending ticket ID
  supportedServices: ServiceType[]; // Services handled by this cubicle during TRAMITE phase
  supportedPhases: TicketPhase[]; // Phases handled by this cubicle (Caja, Triada, Fotografía, Trámite)
  totalAttendedCount: number;
}
