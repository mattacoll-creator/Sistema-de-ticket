/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ServiceType {
  CAJA = "CAJA",           // Caja y Servicios Financieros
  ASESORIA = "ASESORIA",   // Asesoría y Cuentas
  SOPORTE = "SOPORTE",     // Soporte de Plataforma
  RECLAMOS = "RECLAMOS"    // Reclamaciones y Devoluciones
}

export interface ServiceDetail {
  id: ServiceType;
  name: string;
  prefix: string;
  color: string;
  estimatedTimeMin: number;
}

export const SERVICES_CONFIG: Record<ServiceType, ServiceDetail> = {
  [ServiceType.CAJA]: {
    id: ServiceType.CAJA,
    name: "Caja y Pagos",
    prefix: "A",
    color: "bg-emerald-500 text-emerald-950 border-emerald-200",
    estimatedTimeMin: 5
  },
  [ServiceType.ASESORIA]: {
    id: ServiceType.ASESORIA,
    name: "Asesoría Comercial",
    prefix: "B",
    color: "bg-blue-500 text-blue-950 border-blue-200",
    estimatedTimeMin: 12
  },
  [ServiceType.SOPORTE]: {
    id: ServiceType.SOPORTE,
    name: "Atención y Soporte",
    prefix: "C",
    color: "bg-amber-500 text-amber-950 border-amber-200",
    estimatedTimeMin: 15
  },
  [ServiceType.RECLAMOS]: {
    id: ServiceType.RECLAMOS,
    name: "Gestión de Reclamos",
    prefix: "D",
    color: "bg-rose-500 text-rose-950 border-rose-200",
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

export interface Ticket {
  id: string; // e.g. "A001" or string timestamp
  numberCode: string; // e.g. "A-01"
  number: number; // e.g. 1
  name: string;
  serviceType: ServiceType;
  status: TicketStatus;
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
  supportedServices: ServiceType[]; // Services handled by this cubicle
  totalAttendedCount: number;
}
