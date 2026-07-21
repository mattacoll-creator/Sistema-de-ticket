/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ServiceType {
  ELECTORAL = "ELECTORAL",       // Organización Electoral
  REGISTRO = "REGISTRO",         // Registro Civil
  CEDULACION = "CEDULACION",     // Cedulación
  EXTRANJERIA = "EXTRANJERIA",    // Extranjería
  REG_CERTIFICATION = "REG_CERTIFICATION" // Certificación de REG
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
    prefix: "RC",
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
  },
  [ServiceType.REG_CERTIFICATION]: {
    id: ServiceType.REG_CERTIFICATION,
    name: "Certificación de REG",
    prefix: "REG",
    color: "bg-indigo-500 text-indigo-950 border-indigo-200",
    estimatedTimeMin: 10
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
    shortName: "Tríada y Fotografía",
    color: "bg-cyan-500 text-cyan-950 border-cyan-300",
    icon: "ClipboardCheck",
    description: "Atención en ventanillas de trámite, triage de viabilidad, biometría, toma de fotografía y firma"
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
  isAppointment?: boolean; // Prior appointment ticket (Cita Previa)
  procedure?: string; // Specific procedure for departments (e.g. Registro Civil "OR", "RMAT")
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

export interface Office {
  id: string;
  name: string;
  address: string;
}

export const OFFICES_CONFIG: Office[] = [
  {
    id: "OFF-1",
    name: "Tribunal Electoral de Panamá (Sede Principal)",
    address: "Avenida Omar Torrijos Herrera, Ancón"
  },
  {
    id: "OFF-2",
    name: "Dirección Regional de Bocas del Toro",
    address: "Bocas del Toro"
  },
  {
    id: "OFF-3",
    name: "Dirección Regional de Coclé",
    address: "Coclé"
  },
  {
    id: "OFF-4",
    name: "Dirección Regional de Colón",
    address: "Colón"
  },
  {
    id: "OFF-5",
    name: "Dirección Regional de Chiriquí",
    address: "Chiriquí"
  },
  {
    id: "OFF-6",
    name: "Dirección Regional de Darién",
    address: "Darién"
  },
  {
    id: "OFF-7",
    name: "Dirección Regional de Herrera",
    address: "Herrera"
  },
  {
    id: "OFF-8",
    name: "Dirección Regional de Los Santos",
    address: "Los Santos"
  },
  {
    id: "OFF-9",
    name: "Dirección Regional de Panamá Centro",
    address: "Panamá Centro"
  },
  {
    id: "OFF-10",
    name: "Dirección Regional de Panamá Norte",
    address: "Panamá Norte"
  },
  {
    id: "OFF-11",
    name: "Dirección Regional de Panamá Este",
    address: "Panamá Este"
  },
  {
    id: "OFF-12",
    name: "Dirección Regional de Panamá Oeste",
    address: "Panamá Oeste"
  },
  {
    id: "OFF-13",
    name: "Dirección Regional de San Miguelito",
    address: "San Miguelito"
  },
  {
    id: "OFF-14",
    name: "Dirección Regional de Veraguas",
    address: "Veraguas"
  },
  {
    id: "OFF-15",
    name: "Dirección Regional de Guna Yala",
    address: "Guna Yala"
  },
  {
    id: "OFF-16",
    name: "Regional Especial de Arraiján",
    address: "Arraiján"
  }
];

export enum UserRole {
  SUPERADMIN = "SUPERADMIN",
  SUPERVISOR = "SUPERVISOR",      // Administrador / Supervisor por Regional
  AGENT_CAJA = "AGENT_CAJA",      // Consola de Agente - Caja por Regional
  AGENT_TRIADA = "AGENT_TRIADA"    // Consola de Agente - Tríada por Regional
}

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  officeId: string; // Regional asignada
  password?: string; // Contraseña generada o asignada
}


