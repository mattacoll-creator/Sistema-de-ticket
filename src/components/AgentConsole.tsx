/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { REGISTRO_PROCEDURES, CEDULACION_PROCEDURES, getProcedureName } from "./WelcomeKiosk";
import { Ticket, Cubicle, TicketStatus, CubicleStatus, SERVICES_CONFIG, ServiceType, TicketPhase, PHASES_CONFIG, SystemUser, UserRole, OFFICES_CONFIG } from "../types";
import { canCubicleServeProcedure } from "../hooks/useTicketSystem";
import { 
  UserCheck, 
  HelpCircle, 
  Play, 
  Check, 
  UserX, 
  Volume2, 
  Coffee, 
  Power, 
  Layers, 
  CheckCircle2, 
  Activity,
  ArrowRight,
  ShieldCheck,
  Award,
  Settings,
  Lock,
  Unlock,
  MapPin,
  Users,
  TrendingUp,
  BarChart2,
  Clock,
  Grid,
  ShieldAlert,
  DollarSign,
  Camera
} from "lucide-react";

export function getUserDisplayDetails(u: SystemUser, isRc: boolean) {
  if (isRc) {
    let fullName = u.fullName;
    let roleName = "Operador RC";
    
    if (u.role === UserRole.SUPERADMIN) {
      roleName = "Superadministrador";
    } else if (u.role === UserRole.SUPERVISOR) {
      roleName = "Supervisor Registro Civil";
    } else if (u.username === "mcruz") {
      fullName = "Mateo Cruz (Oficial de Recepción Sede Ancón)";
      roleName = "Oficial de Recepción";
    } else if (u.username === "frios") {
      fullName = "Felipe Ríos (Oficial de Hechos Vitales Bocas del Toro)";
      roleName = "Oficial de Hechos Vitales";
    } else if (u.username === "jgutierrez") {
      fullName = "Julia Gutiérrez (Oficial de Investigación Sede Ancón)";
      roleName = "Oficial de Investigación";
    } else if (u.username === "spadilla") {
      fullName = "Silvia Padilla (Recepción de Matrimonios Bocas del Toro)";
      roleName = "Recepción de Matrimonios";
    } else {
      if (u.role === UserRole.AGENT_CAJA) {
        fullName = fullName.replace("Cajero", "Registrador Auxiliar").replace("Caja", "Oficial de Hechos Vitales");
        roleName = "Oficial de Hechos Vitales";
      } else if (u.role === UserRole.AGENT_TRIADA) {
        fullName = fullName.replace("Tríada", "Oficial de Investigación");
        roleName = "Oficial de Investigación";
      }
    }
    return { fullName, roleName };
  } else {
    let roleName = "Operador";
    if (u.role === UserRole.SUPERADMIN) roleName = "Superadministrador";
    else if (u.role === UserRole.SUPERVISOR) roleName = "Supervisor";
    else if (u.role === UserRole.AGENT_CAJA) roleName = "Caja";
    else if (u.role === UserRole.AGENT_TRIADA) roleName = "Tríada";
    return { fullName: u.fullName, roleName };
  }
}

interface AgentConsoleProps {
  tickets: Ticket[];
  cubicles: Cubicle[];
  onCallNext: (cubicleId: string) => Promise<void>;
  onStartAttending: (cubicleId: string) => void;
  onComplete: (cubicleId: string, outcome?: "administrative" | "emission_physical") => void;
  onTransferToCajaRC?: (cubicleId: string) => void;
  onMiss: (cubicleId: string) => void;
  onRecall: (cubicleId: string) => void;
  onChangeStatus: (cubicleId: string, status: CubicleStatus, agentName?: string) => void;
  onUpdateCubicleConfig: (cubicleId: string, phases: TicketPhase[], services: ServiceType[]) => void;
  currentOfficeId?: string;
  users: SystemUser[];
  currentActiveUserId: string;
  setCurrentActiveUserId: React.Dispatch<React.SetStateAction<string>>;
  gatewaySelection?: "select" | "cedulacion" | "registro_civil";
}

export default function AgentConsole({
  tickets,
  cubicles,
  onCallNext,
  onStartAttending,
  onComplete,
  onTransferToCajaRC,
  onMiss,
  onRecall,
  onChangeStatus,
  onUpdateCubicleConfig,
  currentOfficeId = "OFF-1",
  users = [],
  currentActiveUserId,
  setCurrentActiveUserId,
  gatewaySelection = "select"
}: AgentConsoleProps) {
  // Act as which cubicle? Choose CUB-1 by default
  const [activeCubicleId, setActiveCubicleId] = useState<string>(() => {
    return localStorage.getItem("agent_active_cubicle_id") || "CUB-1";
  });
  
  const [hasSelectedCubicle, setHasSelectedCubicle] = useState<boolean>(() => {
    return localStorage.getItem("agent_has_selected_cubicle") === "true";
  });

  const [viewMode, setViewMode] = useState<"agent" | "supervisor">("agent");
  const [activeRoleFilter, setActiveRoleFilter] = useState<TicketPhase>(TicketPhase.CAJA);
  const [showConfig, setShowConfig] = useState<boolean>(() => {
    return gatewaySelection !== "registro_civil";
  });
  const [preLoginRole, setPreLoginRole] = useState<"caja" | "triada" | null>(null);

  // --- COMPORTAMIENTO DE ACCESO PARA SUPERVISIÓN REGISTRO CIVIL ---
  const [isRcSupervisorAuthenticated, setIsRcSupervisorAuthenticated] = useState<boolean>(false);
  const [rcSupervisorUsername, setRcSupervisorUsername] = useState<string>("");
  const [rcSupervisorPassword, setRcSupervisorPassword] = useState<string>("");
  const [rcSupervisorError, setRcSupervisorError] = useState<string>("");

  const handleRcSupervisorLogin = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanUser = rcSupervisorUsername.trim().toLowerCase();
    const cleanPass = rcSupervisorPassword.trim();

    // Buscar supervisor o superadmin
    const foundUser = users.find(u => u.username.toLowerCase() === cleanUser);
    
    if (!foundUser) {
      setRcSupervisorError("Usuario no encontrado.");
      return;
    }

    if (foundUser.role !== UserRole.SUPERVISOR && foundUser.role !== UserRole.SUPERADMIN) {
      setRcSupervisorError("El usuario especificado no tiene rango de Supervisión o Administración.");
      return;
    }

    const isPasswordValid = foundUser.password 
      ? (cleanPass === foundUser.password)
      : (cleanPass === foundUser.username || cleanPass === "123456" || cleanPass === "admin");

    if (isPasswordValid) {
      setIsRcSupervisorAuthenticated(true);
      setRcSupervisorError("");
      setRcSupervisorUsername("");
      setRcSupervisorPassword("");
    } else {
      setRcSupervisorError("Contraseña incorrecta.");
    }
  };

  React.useEffect(() => {
    localStorage.setItem("agent_active_cubicle_id", activeCubicleId);
  }, [activeCubicleId]);

  React.useEffect(() => {
    localStorage.setItem("agent_has_selected_cubicle", String(hasSelectedCubicle));
  }, [hasSelectedCubicle]);

  // --- COMPORTAMIENTO DE INICIO DE SESIÓN INTEGRAL (GATEWAY) ---
  const [sessionUser, setSessionUser] = useState<SystemUser | null>(() => {
    const saved = localStorage.getItem("agent_console_session");
    if (saved) {
      try {
        const u = JSON.parse(saved);
        // Verificar que el usuario aún exista en el sistema
        const match = users.find(existing => existing.id === u.id);
        if (match) {
          return match;
        }
      } catch {
        return null;
      }
    }
    return null;
  });

  const [usernameInput, setUsernameInput] = useState("");
  const [passwordInput, setPasswordInput] = useState("");
  const [loginError, setFormLoginError] = useState("");

  React.useEffect(() => {
    if (sessionUser) {
      localStorage.setItem("agent_console_session", JSON.stringify(sessionUser));
      setCurrentActiveUserId(sessionUser.id);
    } else {
      localStorage.removeItem("agent_console_session");
    }
  }, [sessionUser, setCurrentActiveUserId]);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoginError("");

    if (!usernameInput.trim()) {
      setFormLoginError("Por favor, ingrese su nombre de usuario.");
      return;
    }

    const cleanUser = usernameInput.trim().toLowerCase();
    const foundUser = users.find(u => u.username.toLowerCase() === cleanUser);

    if (!foundUser) {
      setFormLoginError("Nombre de usuario no registrado.");
      return;
    }

    // Contraseña: si está especificada en el usuario, validar contra ella. De lo contrario, usar valores predeterminados.
    const cleanPassword = passwordInput.trim();
    const isPasswordValid = foundUser.password 
      ? (cleanPassword === foundUser.password)
      : (cleanPassword === foundUser.username || cleanPassword === "123456" || cleanPassword === "admin");

    if (!isPasswordValid) {
      setFormLoginError(
        foundUser.password 
          ? "Contraseña incorrecta. Utilice la contraseña generada para este usuario."
          : "Contraseña incorrecta. Pruebe usando su propio usuario o '123456' como contraseña."
      );
      return;
    }

    // Todo correcto -> Iniciar sesión
    setSessionUser(foundUser);
    setHasSelectedCubicle(false);
    setFormLoginError("");
    setUsernameInput("");
    setPasswordInput("");
  };

  // --- COMPORTAMIENTO DE ACCESO, ROLES SECURITY Y REGIONALES ---
  const rawLoggedInUser = sessionUser || {
    id: "default",
    username: "mcruz",
    fullName: "Mateo Cruz (Cajero Sede Ancón)",
    role: UserRole.AGENT_CAJA,
    officeId: "OFF-1"
  };

  const loggedInUser = React.useMemo(() => {
    const details = getUserDisplayDetails(rawLoggedInUser, gatewaySelection === "registro_civil");
    return {
      ...rawLoggedInUser,
      fullName: details.fullName
    };
  }, [rawLoggedInUser, gatewaySelection]);

  const isCajaOnly = loggedInUser.role === UserRole.AGENT_CAJA;
  const isTriadaOnly = loggedInUser.role === UserRole.AGENT_TRIADA;

  const ecosystemTickets = React.useMemo(() => {
    return tickets.filter(t => {
      if (gatewaySelection === "registro_civil") {
        return t.serviceType === ServiceType.REGISTRO;
      } else {
        return t.serviceType !== ServiceType.REGISTRO;
      }
    });
  }, [tickets, gatewaySelection]);

  React.useEffect(() => {
    if (isCajaOnly && activeRoleFilter !== TicketPhase.CAJA) {
      setActiveRoleFilter(TicketPhase.CAJA);
      const firstCaja = cubicles.find(c => c.supportedPhases?.includes(TicketPhase.CAJA) || c.name.toLowerCase().includes("caja"));
      if (firstCaja) {
        setActiveCubicleId(firstCaja.id);
      }
    } else if (isTriadaOnly && activeRoleFilter !== TicketPhase.TRIADA) {
      setActiveRoleFilter(TicketPhase.TRIADA);
      const firstTriada = cubicles.find(c => c.supportedPhases?.includes(TicketPhase.TRIADA) || c.name.toLowerCase().includes("tríada") || c.name.toLowerCase().includes("triada"));
      if (firstTriada) {
        setActiveCubicleId(firstTriada.id);
      }
    }
  }, [isCajaOnly, isTriadaOnly, activeRoleFilter, cubicles]);

  // Guarantee we filter cubicles for active selection:
  const filteredRoleCubicles = cubicles.filter(c => {
    if (gatewaySelection !== "registro_civil") {
      const isRcSpecific = (c.supportedServices || []).includes(ServiceType.REGISTRO) ||
        c.name.includes("(OR)") || c.name.includes("(OHV)") || c.name.includes("(OTR)") ||
        c.name.includes("(ED)") || c.name.includes("(SAU)") || c.name.includes("(SI") ||
        c.name.includes("(OI)") || c.name.includes("(RS)") || c.name.includes("(RMAT)") ||
        c.name.includes("(STR)");
      if (isRcSpecific) return false;
    }

    if (activeRoleFilter === TicketPhase.CAJA) {
      return c.supportedPhases?.includes(TicketPhase.CAJA) || c.name.toLowerCase().includes("caja");
    } else {
      return c.supportedPhases?.includes(TicketPhase.TRIADA) || c.name.toLowerCase().includes("tríada") || c.name.toLowerCase().includes("foto") || c.name.toLowerCase().includes("triada");
    }
  });

  // Ensure current cubicle is valid based on selection
  let currentCubicle = cubicles.find(c => c.id === activeCubicleId);
  if (gatewaySelection !== "registro_civil" && !hasSelectedCubicle) {
    const isMatched = filteredRoleCubicles.some(c => c.id === activeCubicleId);
    if (!isMatched && filteredRoleCubicles.length > 0) {
      currentCubicle = filteredRoleCubicles[0];
    }
  }
  if (!currentCubicle) {
    currentCubicle = cubicles[0];
  }

  const activeTicket = tickets.find(t => t.id === currentCubicle.currentTicketId);

  // Filter candidates waiting that can be processed by this agent (supports current phase or RC specialty)
  const candidateWaitingTickets = ecosystemTickets.filter(t => {
    if (t.status !== TicketStatus.WAITING) return false;
    
    if (gatewaySelection === "registro_civil") {
      // For Registro Civil, we only handle REGISTRO tickets compatible with the cubicle
      if (t.serviceType !== ServiceType.REGISTRO) return false;
      return canCubicleServeProcedure(currentCubicle.id, t.procedure);
    }
    
    // Check if booth supports the current phase of the ticket
    return currentCubicle.supportedPhases?.includes(t.currentPhase);
  });

  const needsCubicleSelection = !hasSelectedCubicle;

  // Sort queue showing priorities first
  const sortedCandidates = [...candidateWaitingTickets].sort((a, b) => {
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;
    return a.createdAt - b.createdAt;
  });

  const handleTogglePhase = (phaseId: TicketPhase) => {
    let newPhases = [...(currentCubicle.supportedPhases || [])];
    if (newPhases.includes(phaseId)) {
      if (newPhases.length <= 1) return; // Prevent draining all phases
      newPhases = newPhases.filter(p => p !== phaseId);
    } else {
      newPhases.push(phaseId);
    }
    onUpdateCubicleConfig(currentCubicle.id, newPhases, currentCubicle.supportedServices || []);
  };

  const handleToggleService = (serviceId: ServiceType) => {
    let newServices = [...(currentCubicle.supportedServices || [])];
    if (newServices.includes(serviceId)) {
      if (newServices.length <= 1) return; // Prevent draining all services
      newServices = newServices.filter(s => s !== serviceId);
    } else {
      newServices.push(serviceId);
    }
    onUpdateCubicleConfig(currentCubicle.id, currentCubicle.supportedPhases || [], newServices);
  };

  if (!sessionUser) {
    if (gatewaySelection !== "registro_civil" && preLoginRole === null) {
      return (
        <div id="agent-auth-gateway" className="bg-white border border-slate-200 rounded-3xl p-8 flex flex-col justify-center items-center min-h-[750px] shadow-lg font-sans relative overflow-hidden">
          {/* Subtle geometric grid backdrop */}
          <div className="absolute inset-0 bg-grid-slate-100 [mask-image:linear-gradient(0deg,white,rgba(255,255,255,0.6))] pointer-events-none" />
          
          <div className="w-full max-w-2xl space-y-8 animate-fadeIn relative z-10">
            {/* Header */}
            <div className="text-center space-y-3.5">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-[#003087] to-[#122e70] text-amber-400 rounded-2xl flex items-center justify-center shadow-lg border border-[#003087]/20 premium-glow-blue">
                <Lock className="w-8 h-8" />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-2xl font-black uppercase tracking-widest text-[#003087] leading-none">
                  Consola del Operador
                </h3>
                <p className="text-[10px] text-slate-450 font-extrabold uppercase tracking-widest leading-none">
                  Cedulación — Selección de Área de Trabajo
                </p>
              </div>
              <div className="h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent w-40 mx-auto"></div>
            </div>

            <div className="p-4 border border-blue-100 bg-blue-50/50 text-blue-950 rounded-2xl text-xs font-semibold text-center max-w-xl mx-auto shadow-xs">
              Bienvenido al sistema de atención de Cedulación. Por favor, seleccione su área de trabajo para comenzar a atender.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
              <button
                type="button"
                onClick={() => {
                  setPreLoginRole("caja");
                  setActiveRoleFilter(TicketPhase.CAJA);
                }}
                className="p-8 bg-white hover:bg-slate-50/50 border-2 border-slate-200 hover:border-[#003087] rounded-3xl text-center transition-all duration-300 shadow-sm hover:shadow-lg cursor-pointer group flex flex-col items-center justify-center space-y-4 hover:scale-[1.01]"
              >
                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-[#003087] flex items-center justify-center group-hover:scale-105 transition-all shadow-inner">
                  <DollarSign className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <span className="text-base font-black text-slate-900 uppercase group-hover:text-[#003087]">Caja</span>
                  <p className="text-xs text-slate-450 font-bold uppercase tracking-wider leading-relaxed">
                    Módulos de Pago y Recaudación (Cajas 0 a 8)
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setPreLoginRole("triada");
                  setActiveRoleFilter(TicketPhase.TRIADA);
                }}
                className="p-8 bg-white hover:bg-slate-50/50 border-2 border-slate-200 hover:border-[#003087] rounded-3xl text-center transition-all duration-300 shadow-sm hover:shadow-lg cursor-pointer group flex flex-col items-center justify-center space-y-4 hover:scale-[1.01]"
              >
                <div className="w-16 h-16 rounded-2xl bg-cyan-50 text-cyan-850 flex items-center justify-center group-hover:scale-105 transition-all shadow-inner">
                  <Layers className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <span className="text-base font-black text-slate-900 uppercase group-hover:text-[#003087]">Tríada / Fotografía</span>
                  <p className="text-xs text-slate-450 font-bold uppercase tracking-wider leading-relaxed">
                    Atención, Trámite y Captura (Módulos 1 a 8)
                  </p>
                </div>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div id="agent-auth-gateway" className="bg-white border border-slate-250 rounded-2xl p-8 flex flex-col justify-center items-center min-h-[750px] shadow-sm font-sans">
        <div className="w-full max-w-lg space-y-8 animate-fadeIn">
          
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-[#122e70] text-amber-400 rounded-2xl flex items-center justify-center shadow-md border border-[#122e70]/10">
              <Lock className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black uppercase tracking-widest text-[#122e70] leading-none">
                Consola del Operador
              </h3>
              <p className="text-[10px] text-slate-450 font-extrabold uppercase tracking-widest leading-none">
                {gatewaySelection === "registro_civil" ? "Control de Acceso de Agentes & Regionales" : `Cedulación — Iniciar Sesión como ${preLoginRole === "caja" ? "Caja" : "Tríada"}`}
              </p>
            </div>
            <div className="h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent w-40 mx-auto"></div>
          </div>

          {/* FORMULARIO DE USUARIO Y CONTRASEÑA DIRECTO */}
          <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-250 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#122e70]"></span>
                <span className="text-xs font-black uppercase text-[#122e70]">
                  Identificación del Operador {preLoginRole && `— ${preLoginRole === "caja" ? "Caja" : "Tríada / Fotografía"}`}
                </span>
              </div>
              {gatewaySelection !== "registro_civil" && (
                <button
                  type="button"
                  onClick={() => setPreLoginRole(null)}
                  className="text-[10px] font-black uppercase text-[#122e70] hover:underline"
                >
                  Cambiar Área 🔄
                </button>
              )}
            </div>

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Usuario del Sistema:
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: mcruz, jgutierrez"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-250 rounded-xl focus:border-[#122e70] focus:ring-1 focus:ring-[#122e70] focus:outline-none placeholder:text-slate-400 font-bold"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Contraseña de Acceso:
                </label>
                <input
                  type="password"
                  required
                  placeholder="Ingrese su contraseña"
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-250 rounded-xl focus:border-[#122e70] focus:ring-1 focus:ring-[#122e70] focus:outline-none placeholder:text-slate-400 font-bold"
                />
              </div>

              {loginError && (
                <p className="text-[10px] text-red-650 bg-red-50 border border-red-200 rounded-lg p-2.5 font-bold uppercase tracking-wide">
                  ⚠️ {loginError}
                </p>
              )}

              <button
                type="submit"
                className="w-full py-2.5 bg-[#122e70] hover:bg-blue-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all text-center flex items-center justify-center gap-2 border-transparent"
              >
                <Unlock className="w-4 h-4" />
                <span>Validar & Entrar</span>
              </button>
            </form>

            <div className="text-[9.5px] leading-relaxed text-slate-400 border-t border-slate-200/60 pt-3 flex flex-col gap-1">
              <span>💡 <strong>Cuentas Demo Sugeridas:</strong></span>
              {gatewaySelection === "registro_civil" ? (
                <>
                  <span>- <strong>@mcruz</strong> (Mateo Cruz - Oficial de Recepción Sede Ancón)</span>
                  <span>- <strong>@frios</strong> (Felipe Ríos - Oficial de Hechos Vitales Bocas del Toro)</span>
                  <span>- <strong>@jgutierrez</strong> (Julia Gutiérrez - Oficial de Investigación Sede Ancón)</span>
                  <span>- <strong>@spadilla</strong> (Silvia Padilla - Recepción de Matrimonios Bocas del Toro)</span>
                </>
              ) : (
                <>
                  <span>- <strong>@mcruz</strong> (Mateo Cruz - Caja Sede Ancón)</span>
                  <span>- <strong>@frios</strong> (Felipe Ríos - Caja Bocas del Toro)</span>
                  <span>- <strong>@jgutierrez</strong> (Julia Gutiérrez - Tríada Sede Ancón)</span>
                  <span>- <strong>@spadilla</strong> (Silvia Padilla - Tríada Bocas del Toro)</span>
                </>
              )}
              <span>- O use cuentas creadas en <strong>Superadministrador → Gestión de Operadores</strong></span>
              <span className="font-bold text-[#122e70]">🔑 Contraseña: El mismo nombre de usuario o "123456"</span>
            </div>
          </div>

        </div>
      </div>
    );
  }

  if (needsCubicleSelection) {
    if (gatewaySelection !== "registro_civil") {
      // Find the cubicles that correspond to the activeRoleFilter (Caja vs Tríada)
      // Caja: IDs CUB-34 to CUB-42 (Caja 0 to Caja 8)
      // Tríada: IDs CUB-24 to CUB-31 (Módulo 1 to Módulo 8)
      const roleCubicles = cubicles.filter(c => {
        const num = parseInt(c.id.replace("CUB-", ""), 10);
        if (activeRoleFilter === TicketPhase.CAJA) {
          return num >= 34 && num <= 42;
        } else {
          return num >= 24 && num <= 31;
        }
      });

      return (
        <div id="agent-cubicle-selection-gateway" className="bg-white border border-slate-250 rounded-2xl p-8 flex flex-col justify-center items-center min-h-[750px] shadow-sm font-sans">
          <div className="w-full max-w-4xl space-y-8 animate-fadeIn">
            {/* Header */}
            <div className="text-center space-y-3">
              <div className="mx-auto w-16 h-16 bg-[#122e70] text-white rounded-2xl flex items-center justify-center shadow-md border border-[#122e70]/10">
                <MapPin className="w-8 h-8 text-amber-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-2xl font-black uppercase tracking-widest text-slate-900 leading-none">
                  Selección de Módulo
                </h3>
                <p className="text-[10px] text-slate-450 font-extrabold uppercase tracking-widest leading-none mt-1">
                  Cedulación — {activeRoleFilter === TicketPhase.CAJA ? "Área de Cajas" : "Área de Tríada / Fotografía"}
                </p>
              </div>
              <div className="h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent w-40 mx-auto"></div>
            </div>

            <div className="p-4 border border-blue-100 bg-blue-50/50 text-blue-950 rounded-xl text-xs font-semibold text-center max-w-2xl mx-auto">
              Hola, <strong>{loggedInUser.fullName}</strong>. Seleccione el módulo o caja libre que ocupará para iniciar su turno de atención.
            </div>

            {/* Grid of Free / Available Cubicles */}
            <div className="space-y-4">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 font-mono flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#122e70] animate-pulse"></span>
                Módulos Disponibles ({activeRoleFilter === TicketPhase.CAJA ? "Caja 0 al 8" : "Tríada 1 al 8"})
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {roleCubicles.map(c => {
                  // A cubicle is "libre" (free) if its status is OFFLINE
                  const isLibre = c.status === CubicleStatus.OFFLINE;

                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveCubicleId(c.id);
                        // Mark it as ONLINE_AVAILABLE when selected!
                        onChangeStatus(c.id, CubicleStatus.ONLINE_AVAILABLE, loggedInUser.fullName);
                        setHasSelectedCubicle(true);
                      }}
                      className={`p-5 bg-white hover:bg-slate-50 border rounded-2xl text-left transition-all duration-200 shadow-sm hover:shadow-md cursor-pointer group flex flex-col justify-between h-32 ${
                        isLibre 
                          ? "border-emerald-250 hover:border-emerald-450 bg-emerald-50/10" 
                          : "border-slate-200 hover:border-slate-350"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className="text-sm font-black text-[#122e70] uppercase group-hover:text-blue-900">{c.name}</span>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                          isLibre ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-500"
                        }`}>
                          {isLibre ? "🟢 LIBRE" : "🔴 EN SERVICIO"}
                        </span>
                      </div>
                      <div className="mt-3 space-y-1">
                        <p className="text-[10px] text-slate-500 font-bold uppercase">
                          Rol: {activeRoleFilter === TicketPhase.CAJA ? "Caja / Pago" : "Tríada / Fotografía"}
                        </p>
                        <p className="text-[9px] text-slate-450 font-bold truncate">
                          Último Agente: {c.agentName || "Ninguno"}
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-between pt-6 border-t border-slate-200">
              <button
                onClick={() => {
                  setSessionUser(null);
                  setCurrentActiveUserId("");
                  setPreLoginRole(null);
                }}
                className="py-2.5 px-5 bg-slate-150 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all"
              >
                ← Volver al login
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div id="agent-cubicle-selection-gateway" className="bg-white border border-slate-250 rounded-2xl p-8 flex flex-col justify-center items-center min-h-[750px] shadow-sm font-sans">
        <div className="w-full max-w-4xl space-y-8">
          {/* Header */}
          <div className="text-center space-y-3">
            <div className="mx-auto w-16 h-16 bg-blue-900 text-white rounded-2xl flex items-center justify-center shadow-md border border-blue-900/10">
              <MapPin className="w-8 h-8" />
            </div>
            <div className="space-y-1">
              <h3 className="text-2xl font-black uppercase tracking-widest text-slate-900 leading-none">
                Selección de Módulo
              </h3>
              <p className="text-[10px] text-slate-450 font-extrabold uppercase tracking-widest leading-none mt-1">
                Registro Civil - Sede de Atención
              </p>
            </div>
            <div className="h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent w-40 mx-auto"></div>
          </div>

          <div className="p-4 border border-blue-100 bg-blue-50/50 text-blue-950 rounded-xl text-xs font-semibold text-center max-w-2xl mx-auto">
            Hola, <strong>{loggedInUser.fullName}</strong>. Para comenzar a atender, por favor seleccione el cubículo o módulo que ocupará hoy en la oficina de Registro Civil. Los turnos serán asignados según su especialidad.
          </div>

          {/* Grouped Cubicle Grid */}
          <div className="space-y-6">
            {/* 1. OR Section */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 font-mono flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse"></span>
                Área de Recepción Civil (Oficial de Recepción - OR) • Cubículos 2 al 8
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cubicles.filter(c => {
                  const num = parseInt(c.id.replace("CUB-", ""), 10);
                  return num >= 2 && num <= 8;
                }).map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCubicleId(c.id);
                      setHasSelectedCubicle(true);
                    }}
                    className="p-4 bg-white hover:bg-blue-50/30 border border-slate-200 hover:border-blue-400 rounded-xl text-left transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 uppercase group-hover:text-blue-900">{c.name}</span>
                      <span className={`w-2 h-2 rounded-full ${
                        c.status === CubicleStatus.ONLINE_AVAILABLE ? "bg-emerald-500" : "bg-slate-300"
                      }`} />
                    </div>
                    <p className="text-[10px] text-slate-450 font-bold uppercase mt-1 truncate">Procedimiento: OR</p>
                    <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5">Agente: {c.agentName}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 2. OHV Section */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 font-mono flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 animate-pulse"></span>
                Área de Hechos Vitales (Inscripciones, Nacimientos, Defunciones - OHV) • Cubículos 16 al 20
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cubicles.filter(c => {
                  const num = parseInt(c.id.replace("CUB-", ""), 10);
                  return num >= 16 && num <= 20;
                }).map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCubicleId(c.id);
                      setHasSelectedCubicle(true);
                    }}
                    className="p-4 bg-white hover:bg-cyan-50/30 border border-slate-200 hover:border-cyan-400 rounded-xl text-left transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 uppercase group-hover:text-cyan-950">{c.name}</span>
                      <span className={`w-2 h-2 rounded-full ${
                        c.status === CubicleStatus.ONLINE_AVAILABLE ? "bg-emerald-500" : "bg-slate-300"
                      }`} />
                    </div>
                    <p className="text-[10px] text-slate-450 font-bold uppercase mt-1 truncate">Procedimiento: OHV</p>
                    <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5">Agente: {c.agentName}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Specialized Section */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 font-mono flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-500 animate-pulse"></span>
                Módulos Especializados (Inscripciones, Matrimonios, Defunciones, Solicitudes, Trámites Rápidos)
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cubicles.filter(c => {
                  const num = parseInt(c.id.replace("CUB-", ""), 10);
                  return (num >= 9 && num <= 15) || num === 23;
                }).map(c => {
                  let procType = "Especializado";
                  const num = parseInt(c.id.replace("CUB-", ""), 10);
                  if (num === 9) procType = "SI / OI (Especiales)";
                  else if (num === 10) procType = "ED (Defunciones)";
                  else if (num === 11) procType = "RS (Inscripción)";
                  else if (num >= 12 && num <= 14) procType = "RMAT (Matrimonios)";
                  else if (num === 15) procType = "SAU (Atención)";
                  else if (num === 23) procType = "STR (Trámites Rápidos)";

                  return (
                    <button
                      key={c.id}
                      onClick={() => {
                        setActiveCubicleId(c.id);
                        setHasSelectedCubicle(true);
                      }}
                      className="p-4 bg-white hover:bg-purple-50/30 border border-slate-200 hover:border-purple-400 rounded-xl text-left transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer group"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-900 uppercase group-hover:text-purple-900">{c.name}</span>
                        <span className={`w-2 h-2 rounded-full ${
                          c.status === CubicleStatus.ONLINE_AVAILABLE ? "bg-emerald-500" : "bg-slate-300"
                        }`} />
                      </div>
                      <p className="text-[10px] text-purple-755 font-bold uppercase mt-1 truncate">{procType}</p>
                      <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5">Agente: {c.agentName}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 4. Other Cubicles Section */}
            <div className="space-y-2.5">
              <span className="text-[10px] uppercase font-black tracking-wider text-slate-400 font-mono flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-slate-500 animate-pulse"></span>
                Otros Módulos Generales y Soporte
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {cubicles.filter(c => {
                  const num = parseInt(c.id.replace("CUB-", ""), 10);
                  return num === 1 || num === 21 || num === 22;
                }).map(c => (
                  <button
                    key={c.id}
                    onClick={() => {
                      setActiveCubicleId(c.id);
                      setHasSelectedCubicle(true);
                    }}
                    className="p-4 bg-white hover:bg-slate-50/50 border border-slate-200 hover:border-slate-400 rounded-xl text-left transition-all duration-200 shadow-xs hover:shadow-md cursor-pointer group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900 uppercase group-hover:text-slate-800">{c.name}</span>
                      <span className={`w-2 h-2 rounded-full ${
                        c.status === CubicleStatus.ONLINE_AVAILABLE ? "bg-emerald-500" : "bg-slate-300"
                      }`} />
                    </div>
                    <p className="text-[10px] text-slate-450 font-bold uppercase mt-1 truncate">Trámite General</p>
                    <p className="text-[9px] text-slate-400 font-medium truncate mt-0.5">Agente: {c.agentName}</p>
                  </button>
                ))}
              </div>
            </div>


          </div>

          <div className="flex justify-end pt-4 border-t border-slate-200">
            <button
              onClick={() => {
                setSessionUser(null);
                setCurrentActiveUserId("");
              }}
              className="py-2.5 px-5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer transition-all"
            >
              ← Volver al login
            </button>
          </div>
        </div>
      </div>
    );
  }

  const isSupervisorOrSuperadmin = loggedInUser.role === UserRole.SUPERADMIN || loggedInUser.role === UserRole.SUPERVISOR;

  return (
    <div id="agent-console-panel" className="bg-white border border-slate-250 rounded-2xl p-8 flex flex-col justify-between h-full min-h-[820px] shadow-sm">
      <div className="space-y-6">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-5">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-[#122e70] text-white rounded-xl shadow-sm">
              <UserCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest text-slate-900">
                Consola del Operador
              </h3>
              <p className="text-xs text-slate-400 font-extrabold uppercase tracking-widest mt-1">SISTEMA INTEGRAL DE LLAMADAS</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                if (currentCubicle) {
                  onChangeStatus(currentCubicle.id, CubicleStatus.OFFLINE);
                }
                setSessionUser(null);
                setCurrentActiveUserId("");
                setHasSelectedCubicle(false);
              }}
              className="py-1.5 px-3 bg-rose-50 text-rose-750 hover:bg-rose-100 border border-rose-200 font-black text-[10px] uppercase tracking-wider rounded-lg cursor-pointer transition-colors flex items-center justify-center gap-1.5"
              title="Cerrar la sesión de agente actual"
            >
              <Power className="w-3.5 h-3.5" />
              <span>Cerrar Sesión</span>
            </button>

            <span className="px-3.5 py-1.5 text-xs uppercase font-mono bg-slate-900 text-white border border-slate-900 font-black tracking-widest rounded-lg">
              SALA / GESTIÓN
            </span>
          </div>
        </div>

        {/* TAB SWITCHER FOR REGISTRO CIVIL */}
        {gatewaySelection === "registro_civil" && (
          <div className="flex border-b border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode("agent")}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                viewMode === "agent"
                  ? "border-[#122e70] text-[#122e70]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <Users className="w-4 h-4" />
              Consola del Operador
            </button>
            <button
              type="button"
              id="tab-rc-supervisor"
              onClick={() => setViewMode("supervisor")}
              className={`flex-1 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer flex items-center justify-center gap-2 ${
                viewMode === "supervisor"
                  ? "border-[#122e70] text-[#122e70]"
                  : "border-transparent text-slate-400 hover:text-slate-600"
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              Supervisión Registro Civil
            </button>
          </div>
        )}

        {viewMode === "supervisor" && gatewaySelection === "registro_civil" ? (
          !isRcSupervisorAuthenticated ? (
            /* LOGIN CARD FOR SUPERVISOR */
            <div className="max-w-md mx-auto my-8 bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-6 shadow-sm">
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-[#122e70]/5 text-[#122e70] rounded-full flex items-center justify-center mx-auto mb-2 border border-slate-200">
                  <Lock className="w-5 h-5 text-[#122e70]" />
                </div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest font-sans">Acceso de Supervisión</h3>
                <p className="text-[10px] text-slate-500 font-medium font-sans">
                  Ingrese sus credenciales autorizadas de Supervisor o Administrador para ver las métricas de Registro Civil.
                </p>
              </div>

              <form onSubmit={handleRcSupervisorLogin} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Usuario Supervisor:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: jgutierrez, spadilla"
                    value={rcSupervisorUsername}
                    onChange={(e) => {
                      setRcSupervisorUsername(e.target.value);
                      setRcSupervisorError("");
                    }}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-250 rounded-xl focus:border-[#122e70] focus:ring-1 focus:ring-[#122e70] focus:outline-none placeholder:text-slate-400 font-bold"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Contraseña:
                  </label>
                  <input
                    type="password"
                    required
                    placeholder="Ingrese su contraseña"
                    value={rcSupervisorPassword}
                    onChange={(e) => {
                      setRcSupervisorPassword(e.target.value);
                      setRcSupervisorError("");
                    }}
                    className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-250 rounded-xl focus:border-[#122e70] focus:ring-1 focus:ring-[#122e70] focus:outline-none placeholder:text-slate-400 font-bold"
                  />
                </div>

                {rcSupervisorError && (
                  <p className="text-[10px] text-red-650 bg-red-50 border border-red-200 rounded-lg p-2.5 font-bold uppercase tracking-wide">
                    ⚠️ {rcSupervisorError}
                  </p>
                )}

                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#122e70] hover:bg-blue-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl cursor-pointer shadow-sm transition-all text-center flex items-center justify-center gap-2 border-transparent"
                >
                  <Unlock className="w-4 h-4 text-amber-400" />
                  <span>Autenticar Supervisor</span>
                </button>
              </form>

              <div className="text-[9.5px] leading-relaxed text-slate-400 border-t border-slate-200/60 pt-3 flex flex-col gap-1">
                <span>💡 <strong>Cuentas Autorizadas de Supervisión:</strong></span>
                <span>- <strong>@jgutierrez</strong> (Julia Gutiérrez - Oficial de Investigación / Supervisora)</span>
                <span>- <strong>@spadilla</strong> (Silvia Padilla - Recepción de Matrimonio / Supervisora)</span>
                <span>- <strong>@superadmin</strong> (Superadministrador del Sistema)</span>
                <span className="font-bold text-[#122e70]">🔑 Contraseña: El mismo nombre de usuario o "123456"</span>
              </div>
            </div>
          ) : (
            /* RC SUPERVISOR DASHBOARD VIEW */
            <div className="space-y-6">
              {/* RC Supervisor Header with logout button */}
              <div className="flex items-center justify-between bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="text-xs font-black uppercase text-slate-800 tracking-wider">
                    Sesión de Supervisión Activa: Registro Civil
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsRcSupervisorAuthenticated(false);
                    setViewMode("agent");
                  }}
                  className="text-[10px] font-black uppercase px-2.5 py-1.5 bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 rounded-lg cursor-pointer transition-colors"
                >
                  🔒 Cerrar Supervisión
                </button>
              </div>

              {/* KPI OVERVIEW GRID */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 font-sans">
              <div className="p-5 bg-blue-50 border border-blue-150 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Clock className="w-12 h-12 text-[#122e70]" />
                </div>
                <span className="text-[10px] text-slate-450 uppercase font-black tracking-widest block font-mono">TURNOS EN ESPERA (RC)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-[#122e70] font-mono">
                    {tickets.filter(t => t.status === TicketStatus.WAITING && t.serviceType === ServiceType.REGISTRO).length}
                  </span>
                  <span className={`text-[9px] px-2 py-0.5 rounded-md font-bold uppercase tracking-wider ${
                    tickets.filter(t => t.status === TicketStatus.WAITING && t.serviceType === ServiceType.REGISTRO).length > 5 ? "bg-rose-100 text-rose-700 animate-pulse" : "bg-emerald-100 text-emerald-800"
                  }`}>
                    {tickets.filter(t => t.status === TicketStatus.WAITING && t.serviceType === ServiceType.REGISTRO).length > 5 ? "Crítico" : "Óptimo"}
                  </span>
                </div>
              </div>

              <div className="p-5 bg-emerald-50 border border-emerald-150 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <CheckCircle2 className="w-12 h-12 text-emerald-800" />
                </div>
                <span className="text-[10px] text-slate-450 uppercase font-black tracking-widest block font-mono">ATENDIDOS HOY (RC)</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-emerald-900 font-mono">
                    {tickets.filter(t => t.status === TicketStatus.COMPLETED && t.serviceType === ServiceType.REGISTRO).length}
                  </span>
                  <span className="text-[9px] px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-md font-bold uppercase tracking-wider">
                    Completados
                  </span>
                </div>
              </div>

              <div className="p-5 bg-purple-50 border border-purple-150 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Users className="w-12 h-12 text-purple-900" />
                </div>
                <span className="text-[10px] text-slate-450 uppercase font-black tracking-widest block font-mono">MÓDULOS EN ATENCIÓN</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-purple-950 font-mono">
                    {cubicles.filter(c => c.status === CubicleStatus.ATTENDING).length}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">
                    de {cubicles.filter(c => c.status !== CubicleStatus.OFFLINE).length} activos
                  </span>
                </div>
              </div>

              <div className="p-5 bg-amber-50 border border-amber-150 rounded-2xl shadow-xs space-y-2 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-3 opacity-10">
                  <Activity className="w-12 h-12 text-amber-900" />
                </div>
                <span className="text-[10px] text-slate-450 uppercase font-black tracking-widest block font-mono">PROMEDIO DE ESPERA</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-black text-amber-950 font-mono">
                    {tickets.filter(t => t.status === TicketStatus.COMPLETED && t.serviceType === ServiceType.REGISTRO).length > 0 ? "4.8" : "0.0"}
                  </span>
                  <span className="text-[10px] text-slate-500 font-bold">minutos</span>
                </div>
              </div>
            </div>

            {/* BENTO GRID LAYOUT */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 font-sans">
              {/* Queues Breakdown */}
              <div className="lg:col-span-5 bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs uppercase font-black tracking-widest text-slate-700 font-mono">Monitoreo de Filas por Trámite</span>
                  <span className="text-[9px] bg-[#122e70] text-white px-2 py-0.5 rounded-md font-mono">VIVO</span>
                </div>

                <div className="space-y-3">
                  {REGISTRO_PROCEDURES.map(proc => {
                    const waitingCount = tickets.filter(t => t.status === TicketStatus.WAITING && t.serviceType === ServiceType.REGISTRO && t.procedure === proc.id).length;
                    const attendingCount = tickets.filter((t) => (t.status === TicketStatus.ATTENDING || t.status === TicketStatus.CALLING) && t.serviceType === ServiceType.REGISTRO && t.procedure === proc.id).length;
                    const completedCount = tickets.filter(t => t.status === TicketStatus.COMPLETED && t.serviceType === ServiceType.REGISTRO && t.procedure === proc.id).length;
                    
                    const maxVal = Math.max(1, Math.max(...REGISTRO_PROCEDURES.map(p => tickets.filter(t => t.status === TicketStatus.WAITING && t.serviceType === ServiceType.REGISTRO && t.procedure === p.id).length)));
                    const percentWidth = (waitingCount / maxVal) * 100;

                    return (
                      <div key={proc.id} className="bg-white border border-slate-150 p-3 rounded-xl space-y-2">
                        <div className="flex justify-between items-start">
                          <div className="max-w-[70%]">
                            <span className="font-extrabold text-xs text-slate-900 block truncate uppercase tracking-wide">
                              {proc.name}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono">ID: {proc.id}</span>
                          </div>
                          <div className="flex items-center gap-1.5 font-mono">
                            <span className="px-1.5 py-0.5 bg-blue-50 text-[#122e70] text-[9px] font-black border border-blue-100 rounded" title="En Espera">
                              {waitingCount} E
                            </span>
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-800 text-[9px] font-black border border-emerald-100 rounded" title="Completados">
                              {completedCount} C
                            </span>
                          </div>
                        </div>

                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full transition-all duration-500 rounded-full ${
                              waitingCount > 3 ? "bg-rose-500" : waitingCount > 0 ? "bg-amber-500" : "bg-[#122e70]"
                            }`} 
                            style={{ width: `${percentWidth}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cubicles Matrix */}
              <div className="lg:col-span-7 bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-4 shadow-sm">
                <span className="text-xs uppercase font-black tracking-widest text-slate-700 font-mono block">Matriz de Estado de Cubículos</span>
                
                <div className="space-y-3 max-h-[600px] overflow-y-auto pr-1">
                  {cubicles.map(cub => {
                    const num = parseInt(cub.id.replace("CUB-", ""), 10);
                    const currentServingTicket = tickets.find(t => t.id === cub.currentTicketId);
                    
                    let procType = "Gral";
                    if (num === 1) procType = "OTR";
                    else if (num >= 2 && num <= 8) procType = "OR";
                    else if (num === 9) procType = "SI/OI";
                    else if (num === 10) procType = "ED";
                    else if (num === 11) procType = "RS";
                    else if (num >= 12 && num <= 14) procType = "RMAT";
                    else if (num === 15) procType = "SAU";
                    else if (num >= 16 && num <= 20) procType = "OHV";
                    else if (num === 23) procType = "STR";
                    else if (num >= 24 && num <= 31) procType = "Tríada Ced";
                    else if (num === 32 || num === 33) procType = "Caja Ced";
                    else if (num >= 34 && num <= 42) procType = "Caja Ced";

                    return (
                      <div key={cub.id} className="bg-white border border-slate-150 p-4 rounded-xl flex items-center justify-between transition-all duration-200 hover:shadow-xs">
                        <div className="flex items-center gap-3 truncate">
                          <div className="flex flex-col items-center">
                            <span className="font-bold text-xs text-slate-800 font-mono uppercase bg-slate-100 border border-slate-200 px-2 py-0.5 rounded">
                              {cub.name.replace("Cubículo ", "C-")}
                            </span>
                            <span className="text-[8px] font-mono text-indigo-850 font-black tracking-widest uppercase mt-1 bg-indigo-50 border border-indigo-100 px-1 rounded">
                              {procType}
                            </span>
                          </div>
                          <div className="truncate">
                            <span className="text-xs font-black text-slate-900 block truncate uppercase">{cub.agentName || "Vacante"}</span>
                            <span className="text-[9px] text-slate-400 font-medium">Atendidos hoy: <strong className="font-bold text-slate-700">{cub.totalAttendedCount}</strong></span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0 font-mono">
                          {currentServingTicket ? (
                            <div className="flex items-center gap-1 bg-blue-50 text-blue-900 border border-blue-200 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase">
                              <span className="animate-ping w-1.5 h-1.5 rounded-full bg-blue-600 shrink-0 mr-0.5" />
                              {currentServingTicket.numberCode}
                            </div>
                          ) : (
                            <span className="text-[9px] text-slate-400 font-bold italic">Libre</span>
                          )}

                          <span className={`px-2.5 py-1 text-[9px] font-black uppercase rounded-lg border tracking-wider text-center w-24 ${
                            cub.status === CubicleStatus.ONLINE_AVAILABLE 
                              ? "bg-emerald-50 text-emerald-800 border-emerald-250" 
                              : cub.status === CubicleStatus.ATTENDING
                                ? "bg-blue-50 text-blue-800 border-blue-250 animate-pulse"
                                : cub.status === CubicleStatus.BREAK
                                  ? "bg-amber-50 text-amber-800 border-amber-250"
                                  : "bg-slate-100 text-slate-400 border-slate-250"
                          }`}>
                            {cub.status === CubicleStatus.ONLINE_AVAILABLE 
                              ? "DISPONIBLE" 
                              : cub.status === CubicleStatus.ATTENDING
                                ? "ATENDIENDO"
                                : cub.status === CubicleStatus.BREAK
                                  ? "RECESO"
                                  : "INACTIVO"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* SUPERVISOR ALERTS PANEL */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 font-sans space-y-3 shadow-sm">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-amber-500" />
                <span className="text-xs uppercase font-black tracking-widest text-slate-700 font-mono">Alertas Operativas del Supervisor</span>
              </div>
              
              <div className="space-y-2">
                {tickets.filter(t => t.status === TicketStatus.WAITING && t.serviceType === ServiceType.REGISTRO).some(t => Math.round((Date.now() - t.createdAt) / 1000) > 120) ? (
                  tickets.filter(t => t.status === TicketStatus.WAITING && t.serviceType === ServiceType.REGISTRO).filter(t => Math.round((Date.now() - t.createdAt) / 1000) > 120).map(t => {
                    const delay = Math.round((Date.now() - t.createdAt) / 1000);
                    return (
                      <div key={t.id} className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-xs text-rose-950 flex items-center justify-between">
                        <span>⚠️ <strong>Alerta de Retraso:</strong> El tiquet <strong>{t.numberCode}</strong> de {REGISTRO_PROCEDURES.find(p => p.id === t.procedure)?.name || t.procedure} lleva <strong>{delay}s</strong> en cola.</span>
                        <span className="text-[10px] font-black text-rose-800 uppercase tracking-widest animate-pulse">Atender Prioridad</span>
                      </div>
                    );
                  })
                ) : null}

                {cubicles.filter(c => c.status !== CubicleStatus.OFFLINE).length === 0 ? (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-xs text-red-950">
                    🔴 <strong>Alerta de Capacidad:</strong> No hay ningún módulo de Registro Civil en línea. Los ciudadanos experimentarán demoras.
                  </div>
                ) : cubicles.filter(c => c.status === CubicleStatus.BREAK).length > cubicles.filter(c => c.status !== CubicleStatus.OFFLINE).length / 2 ? (
                  <div className="bg-amber-50 border border-amber-250 p-3 rounded-xl text-xs text-amber-950">
                    ⚠️ <strong>Alerta de Receso:</strong> Más del 50% de los módulos de Registro Civil están en receso. Considere llamar agentes adicionales.
                  </div>
                ) : null}

                {tickets.filter(t => t.status === TicketStatus.WAITING && t.serviceType === ServiceType.REGISTRO && t.procedure === "OHV").length >= 4 ? (
                  <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl text-xs text-sky-950">
                    📈 <strong>Alta Demanda:</strong> Se detecta un incremento de trámites de Hechos Vitales (OHV). Módulos 16 a 20 recomendados para redirección.
                  </div>
                ) : null}

                {!(tickets.filter(t => t.status === TicketStatus.WAITING && t.serviceType === ServiceType.REGISTRO).some(t => Math.round((Date.now() - t.createdAt) / 1000) > 120)) && cubicles.filter(c => c.status !== CubicleStatus.OFFLINE).length > 0 && !(cubicles.filter(c => c.status === CubicleStatus.BREAK).length > cubicles.filter(c => c.status !== CubicleStatus.OFFLINE).length / 2) && tickets.filter(t => t.status === TicketStatus.WAITING && t.serviceType === ServiceType.REGISTRO && t.procedure === "OHV").length < 4 && (
                  <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-950 flex items-center justify-between">
                    <span>✓ <strong>Operación Estable:</strong> Todos los flujos de atención se encuentran dentro de los parámetros de servicio normales.</span>
                    <span className="text-[10px] font-black text-emerald-800 uppercase font-mono tracking-widest">SLA CUMPLIDO</span>
                  </div>
                )}
              </div>
            </div>
          </div>
          )
        ) : (
          <>
            {/* OPERATOR CREDENTIAL CONTROL BAR */}
        <div id="operator-credential-control" className="bg-slate-50 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 font-sans">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#122e70]" />
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-800">
                Credencial de Operación Activa
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] text-slate-500 font-extrabold uppercase">Oficina Detectada:</span>
              <span className="text-[10px] text-indigo-750 font-black uppercase bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded-md">
                {OFFICES_CONFIG.find(o => o.id === currentOfficeId)?.name.replace("Dirección Regional de ", "").replace("Tribunal Electoral de ", "") || currentOfficeId}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center font-sans">
            <div className="md:col-span-8">
              {isSupervisorOrSuperadmin ? (
                <div className="space-y-1">
                  <span className="text-[9px] text-slate-400 font-bold block uppercase tracking-wide">Cambiar operador (Poder administrativo):</span>
                  <select
                    value={currentActiveUserId}
                    onChange={(e) => {
                      const selectedUser = users.find(u => u.id === e.target.value);
                      if (selectedUser) {
                        setSessionUser(selectedUser);
                        setCurrentActiveUserId(selectedUser.id);
                      }
                    }}
                    className="w-full px-4 py-2.5 bg-white border border-slate-250 rounded-xl focus:border-[#122e70] focus:ring-1 focus:ring-[#122e70] focus:outline-none font-bold text-slate-750 text-xs sm:text-sm cursor-pointer"
                  >
                    {users.map(u => {
                      const uOffice = OFFICES_CONFIG.find(o => o.id === u.officeId);
                      const oShort = uOffice 
                        ? uOffice.name.replace("Dirección Regional de ", "").replace("Tribunal Electoral de ", "")
                        : "Sede Central";
                      
                      const details = getUserDisplayDetails(u, gatewaySelection === "registro_civil");
                      
                      return (
                        <option key={u.id} value={u.id}>
                          {details.fullName} ({details.roleName} - {oShort})
                        </option>
                      );
                    })}
                  </select>
                </div>
              ) : (
                <div className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-755 text-xs sm:text-sm flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
                    <span className="text-slate-600 font-medium">Conectado como:</span>
                    <span className="text-slate-900 font-black">{loggedInUser.fullName}</span>
                  </div>
                  <span className="text-[10px] text-indigo-850 font-mono font-bold bg-indigo-50/50 border border-indigo-100 px-2 py-0.5 rounded-md">
                    @{loggedInUser.username}
                  </span>
                </div>
              )}
            </div>
            
            <div className="md:col-span-4 flex items-center gap-2 text-[11px] font-black uppercase font-sans">
              {isCajaOnly && (
                <div className="w-full flex items-center justify-center gap-2 bg-emerald-55 border border-emerald-250 p-2.5 rounded-xl text-emerald-800">
                  <span className="animate-pulse w-2 h-2 rounded-full bg-emerald-500"></span>
                  <span>🔒 SÓLO CAJA</span>
                </div>
              )}
              {isTriadaOnly && (
                <div className="w-full flex items-center justify-center gap-2 bg-cyan-55 border border-cyan-250 p-2.5 rounded-xl text-cyan-800">
                  <span className="animate-pulse w-2 h-2 rounded-full bg-cyan-500"></span>
                  <span>🔒 SÓLO TRÍADA</span>
                </div>
              )}
              {!isCajaOnly && !isTriadaOnly && (
                <div className="w-full flex items-center justify-center gap-2 bg-purple-55 border border-purple-250 p-2.5 rounded-xl text-purple-850">
                  <span className="w-2 h-2 rounded-full bg-purple-500"></span>
                  <span>🔓 ACCESO TOTAL</span>
                </div>
              )}
            </div>
          </div>
          <p className="text-[9.5px] leading-normal text-slate-450 font-medium pt-1 font-sans">
            * Su usuario determina de forma segura su aislamiento regional y los módulos que puede gestionar. Para cambiarse, cierre la sesión.
          </p>
        </div>

        {/* ACTIVE CUBICLE CARD WITH RE-SELECTOR BUTTON */}
        <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 font-sans shadow-inner">
          <div className="flex items-center gap-3">
            <div className={`p-3 text-white rounded-xl shadow-sm ${gatewaySelection === "registro_civil" ? "bg-blue-900" : "bg-amber-500"}`}>
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] text-slate-450 uppercase font-black tracking-widest block font-mono">
                {gatewaySelection === "registro_civil" ? "Módulo de Registro Civil Activo" : "Módulo de Cedulación Activo"}
              </span>
              <span className="text-base font-black text-[#122e70] uppercase">{currentCubicle.name}</span>
              <span className="text-[9.5px] text-emerald-850 font-black bg-emerald-50 border border-emerald-150 px-2 py-0.5 rounded-md ml-2 inline-block align-middle">
                Agente: {currentCubicle.agentName}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              setHasSelectedCubicle(false);
            }}
            className="py-2.5 px-4 bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-250 hover:border-slate-350 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm shrink-0"
          >
            Cambiar de Módulo 🔄
          </button>
        </div>

        {/* AGENT STATE CARD & CONFIGURATOR */}
        <div className="space-y-4 pt-2">
          <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="space-y-1">
                <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 block font-black">MÓDULO SELECCIONADO:</span>
                <p className="text-sm font-black text-slate-900 uppercase tracking-wider leading-none">
                  {currentCubicle.name} • AGENTE {currentCubicle.agentName}
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-status-available"
                onClick={() => onChangeStatus(currentCubicle.id, CubicleStatus.ONLINE_AVAILABLE, loggedInUser.fullName)}
                className={`px-3.5 py-2.5 rounded-xl border text-[11px] uppercase font-black tracking-widest flex items-center gap-1.5 cursor-pointer transition-all ${
                  currentCubicle.status === CubicleStatus.ONLINE_AVAILABLE || currentCubicle.status === CubicleStatus.ATTENDING
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                    : "bg-white border-slate-250 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-white antialiased" />
                <span>DISPONIBLE</span>
              </button>

              <button
                id="btn-status-break"
                onClick={() => onChangeStatus(currentCubicle.id, CubicleStatus.BREAK, loggedInUser.fullName)}
                className={`px-3.5 py-2.5 rounded-xl border text-[11px] uppercase font-black tracking-widest flex items-center gap-1.5 cursor-pointer transition-all ${
                  currentCubicle.status === CubicleStatus.BREAK
                    ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                    : "bg-white border-slate-255 text-slate-600 hover:bg-slate-100"
                }`}
              >
                <span>RECESO</span>
              </button>

              <button
                id="btn-status-offline"
                onClick={() => onChangeStatus(currentCubicle.id, CubicleStatus.OFFLINE)}
                className={`px-3.5 py-2.5 rounded-xl border text-[11px] uppercase font-black tracking-widest flex items-center gap-1.5 cursor-pointer transition-all ${
                  currentCubicle.status === CubicleStatus.OFFLINE
                    ? "bg-rose-600 text-white border-rose-700 shadow-sm"
                    : "bg-white border-slate-250 text-slate-600 hover:bg-slate-105"
                }`}
              >
                <span>LOGOUT</span>
              </button>
            </div>
          </div>

          {/* DYNAMIC ROLE CONFIGURATOR */}
          <div className="border border-slate-200 p-4 bg-slate-50 rounded-xl space-y-3 shadow-sm">
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-200">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
                  <Settings className="w-4.5 h-4.5 text-indigo-500" />
                  CONFIGURACIÓN DE TRÁMITES DE LA CABINA
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-extrabold font-mono">GESTIÓN INTERNA DE FILAS</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-xs font-black text-[#122e70] hover:underline uppercase cursor-pointer"
              >
                {showConfig ? "Ocultar panel" : "Ver opciones"}
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-black">Fases Habilitadas en este Módulo:</span>
              <div className="flex flex-wrap gap-2">
                {Object.values(PHASES_CONFIG).map((phase) => {
                  const isActive = (currentCubicle.supportedPhases || []).includes(phase.id);
                  return (
                    <button
                      key={phase.id}
                      type="button"
                      onClick={() => handleTogglePhase(phase.id)}
                      className={`px-3.5 py-2 text-[11px] font-black border tracking-wider uppercase cursor-pointer transition-all rounded-lg ${
                        isActive 
                          ? `${phase.color} font-black border-blue-300 shadow-sm` 
                          : "bg-white text-slate-400 border-slate-200 hover:text-slate-700 hover:bg-slate-100"
                      }`}
                    >
                      {isActive ? "✓ " : ""}
                      {phase.name.toUpperCase()}
                    </button>
                  );
                })}
              </div>
            </div>

            {showConfig && (
              <div className="space-y-3 pt-3 border-t border-slate-200">
                <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-black">
                  Trámites Soportados en Pantalla:
                </span>
                <div className="grid grid-cols-2 gap-2.5">
                  {Object.values(SERVICES_CONFIG)
                    .filter((service) => !(currentOfficeId !== "OFF-1" && service.id === ServiceType.EXTRANJERIA))
                    .map((service) => {
                      const isActive = (currentCubicle.supportedServices || []).includes(service.id);
                      return (
                        <button
                          key={service.id}
                          type="button"
                          onClick={() => handleToggleService(service.id)}
                          className={`px-3 py-2 text-xs text-left font-black tracking-wider uppercase border rounded-lg cursor-pointer flex items-center justify-between transition-all ${
                            isActive 
                              ? "bg-blue-50 text-[#122e70] border-blue-200" 
                              : "bg-white text-slate-400 border-slate-200 hover:text-slate-655"
                          }`}
                        >
                          <span className="truncate">{service.name}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-slate-100 text-slate-600 font-mono font-black border border-slate-200 rounded">
                            {isActive ? "SÍ" : "NO"}
                          </span>
                        </button>
                      );
                    })}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ACTIVE TICKET IN PROGRESS CARD */}
        <div className="space-y-2 pt-2">
          <span className="block text-xs uppercase font-black tracking-widest text-slate-500 font-mono">Trámite Activo en Curso</span>
          
          {activeTicket ? (
            <div className="bg-blue-50/20 border-2 border-[#122e70] p-6 rounded-2xl space-y-4 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 p-4 text-[10px] uppercase text-[#122e70] font-black tracking-widest font-mono">
                {activeTicket.status === TicketStatus.CALLING ? "🛎️ LLAMANDO CLIENTE" : "🎙️ ATENDIENDO CLIENTE"}
              </div>

              <div className="flex items-start gap-4 pt-4">
                <div className="px-5 py-3.5 bg-[#122e70] text-white rounded-xl font-mono font-black text-3xl shadow-sm select-none">
                  {activeTicket.numberCode}
                </div>
                <div className="space-y-1">
                  <h4 className="text-xl font-black uppercase text-slate-900 leading-tight">
                    {activeTicket.name}
                  </h4>
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">
                    SERVICIO: <span className="font-extrabold text-blue-900">{SERVICES_CONFIG[activeTicket.serviceType].name.toUpperCase()}</span>
                    {activeTicket.procedure && (
                      <span className="ml-2 px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider rounded border border-blue-200 inline-block align-middle">
                        {getProcedureName(activeTicket.procedure)}
                      </span>
                    )}
                  </p>
                  {activeTicket.priority && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white font-black text-[10px] uppercase mt-2 tracking-widest shadow-sm rounded-lg animate-pulse">
                      ★ PRIORITARIO
                    </span>
                  )}
                  {activeTicket.isAppointment && activeTicket.serviceType !== ServiceType.REGISTRO && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-600 text-white font-black text-[10px] uppercase mt-2 tracking-widest shadow-sm rounded-lg animate-pulse">
                      📅 CITA PREVIA
                    </span>
                  )}
                </div>
              </div>

              {/* LIVE STEPS PROGRESS TIMELINE */}
              <div className="mt-4 bg-white p-4 border border-blue-100 rounded-xl space-y-3.5 shadow-inner">
                <span className="text-[10px] uppercase font-mono font-black text-slate-400 block tracking-widest text-center">
                  RANGO DEL FLUJO CONTINUO (MISMO TICKET)
                </span>
                
                <div className="relative py-2 flex items-center justify-between max-w-sm mx-auto">
                  {Object.values(PHASES_CONFIG).map((p, pIdx) => {
                    const phasesList = Object.values(PHASES_CONFIG);
                    const currentPhaseIdx = phasesList.findIndex(x => x.id === activeTicket.currentPhase);
                    const isDone = pIdx < currentPhaseIdx;
                    const isCurrent = pIdx === currentPhaseIdx;
                    
                    return (
                      <div key={p.id} className="flex flex-col items-center flex-1 relative z-10 select-none">
                        {/* Connector line between steps */}
                        {pIdx > 0 && (
                          <div className={`absolute top-4.5 w-full right-1/2 h-[3.5px] -z-10 ${
                            pIdx <= currentPhaseIdx ? "bg-[#122e70]" : "bg-slate-200"
                          }`} />
                        )}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border transition-all ${
                          isDone 
                            ? "bg-emerald-500 text-white border-emerald-600" 
                            : isCurrent 
                              ? "bg-[#122e70] text-white border-blue-900 ring-4 ring-blue-500/10 scale-110" 
                              : "bg-slate-200 text-slate-500 border-slate-300"
                        }`}>
                          {isDone ? "✓" : pIdx + 1}
                        </div>
                        <span className={`text-[10px] mt-2 text-center uppercase tracking-wider font-extrabold ${isCurrent ? "text-[#122e70] font-black animate-pulse" : "text-slate-405"}`}>
                          {p.shortName.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <p className="text-[11px] uppercase text-[#122e70] text-center font-bold bg-blue-50/50 py-1.5 border border-blue-100/40 rounded-lg">
                  {activeTicket.currentPhase === TicketPhase.CAJA && (
                    (activeTicket.serviceType === ServiceType.ELECTORAL || activeTicket.serviceType === ServiceType.REGISTRO)
                      ? "➔ Flujo Corto (Caja): Al finalizar, el ticket se completará y cerrará directamente."
                      : "➔ Flujo Largo (Tríada): Al finalizar, el ticket pasará automáticamente a la cola de Tríada y Fotografía."
                  )}
                  {activeTicket.currentPhase === TicketPhase.TRIADA && "➔ Fase final de atención. Al pulsar Completar, el ciudadano se completa."}
                </p>
              </div>

              {/* ACTION TOOLBARS */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-blue-100">
                {activeTicket.status === TicketStatus.CALLING ? (
                  <button
                    id="btn-action-start"
                    onClick={() => onStartAttending(currentCubicle.id)}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Play className="w-4 h-4 text-emerald-400" />
                    Iniciar Atención
                  </button>
                ) : gatewaySelection === "registro_civil" && !currentCubicle.supportedPhases?.includes(TicketPhase.CAJA) ? (
                  <button
                    id="btn-action-complete-rc"
                    onClick={() => onComplete(currentCubicle.id)}
                    className="col-span-2 w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-widest rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-md transition-all active:scale-[0.99]"
                    title="Trámite concluido con éxito"
                  >
                    <Check className="w-4 h-4 text-white shrink-0" />
                    <span>Fin de Atención</span>
                  </button>
                ) : gatewaySelection === "cedulacion" && currentCubicle.supportedPhases?.includes(TicketPhase.CAJA) ? (
                  <div className="col-span-2 grid grid-cols-2 gap-3">
                    <button
                      id="btn-action-complete-ced-adm"
                      onClick={() => onComplete(currentCubicle.id, "administrative")}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.99]"
                      title="Trámite Administrativo (REG, O, u Opciones C/E). El ticket finaliza aquí."
                    >
                      <Check className="w-4 h-4 text-white shrink-0" />
                      <span>Fin de Atención</span>
                    </button>
                    <button
                      id="btn-action-complete-ced-phys"
                      onClick={() => onComplete(currentCubicle.id, "emission_physical")}
                      className="w-full py-3 bg-[#003087] hover:bg-blue-800 text-white font-black text-xs uppercase tracking-wider rounded-xl cursor-pointer flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-[0.99]"
                      title="Trámite de Emisión Física (Renovación, Duplicado, etc.). Envía el ticket a Espera en Fotografía."
                    >
                      <Camera className="w-4 h-4 text-white shrink-0" />
                      <span>Pasar a Tríada</span>
                    </button>
                  </div>
                ) : (
                  <button
                    id="btn-action-complete"
                    onClick={() => onComplete(currentCubicle.id)}
                    className="w-full py-3 bg-[#122e70] hover:bg-blue-800 text-white font-black text-xs uppercase tracking-widest rounded-xl cursor-pointer flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Check className="w-4 h-4 text-white" />
                    Completar Atención
                  </button>
                )}

                <button
                  id="btn-action-recall"
                  onClick={() => onRecall(currentCubicle.id)}
                  className="w-full py-3 bg-white hover:bg-slate-100 text-indigo-700 border border-indigo-550 font-black text-xs uppercase tracking-widest rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  title="Re-llamar al altavoz"
                >
                  <Volume2 className="w-4 h-4 text-indigo-600 animate-pulse" />
                  Volver a Llamar
                </button>

                <button
                  id="btn-action-miss"
                  onClick={() => onMiss(currentCubicle.id)}
                  className="col-span-2 w-full py-3 bg-slate-100 hover:bg-rose-50 text-slate-705 hover:text-rose-700 font-extrabold text-[11px] uppercase tracking-wider rounded-xl border border-slate-205 cursor-pointer flex items-center justify-center gap-2 transition-all mt-1"
                  title="Marca cliente como ausente"
                >
                  <UserX className="w-4 h-4 text-rose-500" />
                  No se presentó (Marcar Ausente)
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-slate-300 border-dashed rounded-2xl p-8 text-center space-y-4 bg-slate-50 transition-all">
              <p className="text-sm text-slate-500 uppercase tracking-widest font-black leading-none">Módulo Disponible para Próxima Llamada</p>
              
              <button
                id="btn-call-next-ticket"
                disabled={currentCubicle.status === CubicleStatus.BREAK || currentCubicle.status === CubicleStatus.OFFLINE || sortedCandidates.length === 0}
                onClick={() => onCallNext(currentCubicle.id)}
                className={`px-6 py-4.5 w-full font-black text-sm uppercase tracking-widest rounded-xl border transition-all flex items-center justify-center gap-2 shadow-md ${
                  currentCubicle.status === CubicleStatus.BREAK || currentCubicle.status === CubicleStatus.OFFLINE
                    ? "bg-slate-200 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
                    : sortedCandidates.length === 0
                      ? "bg-indigo-300 text-white border-indigo-400 cursor-not-allowed shadow-none"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white border-transparent cursor-pointer active:scale-[0.99] shadow-indigo-100"
                }`}
              >
                {currentCubicle.status === CubicleStatus.BREAK ? (
                  "Módulo en Receso"
                ) : currentCubicle.status === CubicleStatus.OFFLINE ? (
                  "Módulo Desconectado"
                ) : sortedCandidates.length === 0 ? (
                  "Ningún tiquet compatible esperando en fila"
                ) : (
                  <>
                    <span>Llamar Siguiente Turno ({sortedCandidates.length} en espera)</span>
                    <ArrowRight className="w-5 h-5 animate-bounce" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* CANDIDATE LIST FOR THIS AGENT */}
        <div className="space-y-2">
          <div className="flex justify-between items-center text-[10px] uppercase font-black text-slate-450 tracking-wider">
            <span>COLA COMPATIBLE CON ESTE MÓDULO ({sortedCandidates.length})</span>
            {sortedCandidates.length > 0 && <span className="text-xs px-2 py-0.5 bg-slate-900 text-white font-mono rounded-lg font-bold">TURNOS</span>}
          </div>

          {sortedCandidates.length > 0 ? (
            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
              {sortedCandidates.slice(0, 4).map((item) => {
                const secondsWaiting = Math.round((Date.now() - item.createdAt) / 1000);
                const isOverdue = secondsWaiting > 60;
                return (
                  <div key={item.id} className={`p-3 border rounded-xl flex items-center justify-between text-xs transition-all duration-300 ${
                    isOverdue 
                      ? "border-amber-350 bg-amber-50 shadow-sm animate-pulse" 
                      : "border-slate-200 bg-white shadow-xs"
                  }`}>
                    <div className="flex items-center gap-3">
                      <span className={`font-bold font-mono px-2.5 py-1 rounded-lg text-xs shadow-xs ${
                        isOverdue 
                          ? "text-rose-950 bg-rose-200 border border-rose-300 font-black"
                          : "text-[#122e70] bg-blue-50 border border-blue-100"
                      }`}>
                        {item.numberCode}
                      </span>
                      <div className="flex flex-col min-w-0">
                        <span className="font-extrabold text-slate-800 truncate max-w-[170px] uppercase tracking-wide leading-none">{item.name}</span>
                        {item.procedure && (
                          <span className="text-[10px] text-blue-800 font-extrabold uppercase tracking-wider mt-1 truncate max-w-[170px]">
                            {getProcedureName(item.procedure)}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 font-mono">
                      {isOverdue && (
                        <span className="px-2 py-0.5 bg-rose-650 text-white text-[8px] font-black uppercase rounded-md tracking-wider animate-bounce">
                          ⚠️ DEMORA ({secondsWaiting}s)
                        </span>
                      )}
                      {item.priority && (
                        <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black uppercase rounded-lg tracking-widest font-sans">
                          ★ PREF
                        </span>
                      )}
                      {item.isAppointment && item.serviceType !== ServiceType.REGISTRO && (
                        <span className="px-2 py-0.5 bg-sky-600 text-white text-[9px] font-black uppercase rounded-lg tracking-widest font-sans">
                          📅 CITA
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400 font-bold">
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  </div>
                );
              })}
              {sortedCandidates.length > 4 && (
                <p className="text-[10px] text-slate-400 uppercase font-mono tracking-widest font-black italic text-center">
                  + {sortedCandidates.length - 4} turnos compatibles adicionales.
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 border border-slate-200 bg-slate-50 rounded-xl text-center text-xs text-slate-400 uppercase tracking-widest font-bold">
              No hay turnos compatibles con este módulo de atención.
            </div>
          )}
        </div>
      </>
    )}
  </div>

      {/* METRICS UNDERLAY */}
      <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs mt-4">
        <div className="flex items-center gap-2 text-slate-655 uppercase text-[10.5px] font-mono font-extrabold tracking-widest">
          <Award className="w-5 h-5 text-[#122e70] animate-pulse" />
          <span>Atendidos hoy en este Módulo:</span>
          <span className="font-mono font-black bg-slate-900 text-white px-3 py-1 border border-slate-950 rounded-lg">{currentCubicle.totalAttendedCount}</span>
        </div>
      </div>
    </div>
  );
}
