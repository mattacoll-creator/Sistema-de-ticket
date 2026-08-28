/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export enum ServiceType {
  ELECTORAL = "ELECTORAL",       // Organización Electoral (O)
  REGISTRO = "REGISTRO",         // Certificaciones de Registro Civil (REG)
  CEDULACION = "CEDULACION",     // Cedulación (C)
  EXTRANJERIA = "EXTRANJERIA",    // Extranjería (E)
  REG_CERTIFICATION = "REG_CERTIFICATION" // Certificaciones de Registro Civil (REG)
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
    name: "Certificaciones de Registro Civil",
    prefix: "REG",
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
    name: "Certificaciones de Registro Civil",
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
  attendedAt?: number;
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
  name: string; // e.g. "Módulo 1", "Módulo 6 (Preferencial)"
  agentName: string; // e.g. "Dra. María González"
  status: CubicleStatus;
  currentTicketId?: string; // Currently attending ticket ID
  supportedServices: ServiceType[]; // Services handled by this cubicle during TRAMITE phase
  supportedPhases: TicketPhase[]; // Phases handled by this cubicle (Caja, Triada, Fotografía, Trámite)
  totalAttendedCount: number;
  isPreferential?: boolean; // True for modules specifically designated for preferenciales (embarazadas, tercera edad, discapacidad)
  area?: string; // e.g. "Caja", "Triada / Fotografía"
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
    name: "Oficina Especial de Panamá Centro (Plaza Cohete)",
    address: "Plaza Cohete, Vía España, Panamá Centro"
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
    name: "Dirección Regional de Panamá Oeste (La Chorrera)",
    address: "La Chorrera, Panamá Oeste"
  },
  {
    id: "OFF-13",
    name: "Dirección Regional de San Miguelito",
    address: "San Miguelito"
  },
  {
    id: "OFF-14",
    name: "Dirección Regional de Veraguas (Santiago)",
    address: "Santiago, Veraguas"
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
  AGENT_TRIADA = "AGENT_TRIADA",  // Consola de Agente - Tríada por Regional
  AGENT_REGISTRO_CIVIL = "AGENT_REGISTRO_CIVIL" // Consola de Agente - Registro Civil por Regional
}

export interface SystemUser {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  officeId: string; // Regional asignada
  password?: string; // Contraseña generada o asignada
  mustChangePassword?: boolean; // Flag para obligar cambio de contraseña al primer ingreso
}

// ==========================================
// TYPES FOR AGENDAMIENTO DE CITAS (CITASTE)
// ==========================================

export type TipoIdentificacion = 'Cedula' | 'CedulaJuvenil' | 'Extranjero' | 'Pasaporte';

export interface DatosPersonales {
  tipoIdentificacion: TipoIdentificacion;
  identificacion: string;
  fechaNacimiento: string;
  telefono: string;
  correo: string;
  nombreCompleto?: string;
  numeroSeguimiento?: string;
  tieneDiscapacidad?: boolean;
  // Campos específicos para el trámite de extranjería
  primerNombre?: string;
  segundoNombre?: string;
  primerApellido?: string;
  segundoApellido?: string;
  pasaporte?: string;
  nacionalidad?: string;
  fechaResolucion?: string;
  numeroResolucion?: string;
  fechaVencimiento?: string;
  creadoPor?: string;
}

export type ServicioCategoriaId = 'extranjeria' | 'organizacion_electoral' | 'cedulacion' | 'registro_civil' | 'panamenos_extranjero';

export interface SubServicio {
  id: string;
  nombre: string;
  descripcion: string;
  requisitos: string[];
}

export interface CategoriaServicio {
  id: ServicioCategoriaId;
  nombre: string;
  descripcion: string;
  icono: string;
  subServicios: SubServicio[];
}

export interface Sucursal {
  id: string;
  provincia: string;
  nombre: string;
  direccion: string;
  telefono: string;
  horario: string;
}

export interface Cita {
  id: string; // TE-YYYYMMDD-XXXX
  datosPersonales: DatosPersonales;
  servicioCategoria: ServicioCategoriaId;
  subServicioId: string;
  sucursalId: string;
  fecha: string; // YYYY-MM-DD
  hora: string;  // HH:MM
  codigoTransaccion: string;
  fechaCreacion: string;
  estado: 'confirmada' | 'cancelada' | 'asistire' | 'no_asistire' | 'realizada';
  creadaPorSupervisor?: boolean;
  creadoPor?: string;
  ticketTurnoCode?: string;
  llegadaConfirmadaAuto?: boolean;
}

export interface ExtranjeriaRecord {
  pasaporte: string;
  nombre: string;
  nacionalidad?: string;
  elegible: boolean;
  motivo: string;
}

export type AdminRole = 'sencillo' | 'super' | 'extranjeria' | 'pasado_edad' | 'extranjeria_supervisor' | 'extranjeria_atencion' | 'extranjeria_cubiculo' | 'pasado_edad_supervisor' | 'pasado_edad_admin' | 'agent_caja' | 'agent_triada' | 'agent_registro_civil';

export interface AdminUser {
  username: string;
  password?: string;
  role: AdminRole;
  nombre: string;
  fechaCreacion: string;
  mustChangePassword?: boolean;
  sucursalId?: string;
}

export interface CmsConfig {
  siteTitle: string;
  siteSubtitle: string;
  logoUrl: string;
  primaryColor: string;
  customTexts: { [key: string]: string };
  sections: Array<{ id: string; name: string; description: string; icon?: string }>;
  pages: Array<{ id: string; title: string; slug: string; content: string; path?: string }>;
  images: Array<{ id: string; name: string; url: string; category?: string }>;
}


