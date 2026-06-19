/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Ticket, Cubicle, TicketStatus, CubicleStatus, SERVICES_CONFIG, ServiceType, TicketPhase, PHASES_CONFIG, SystemUser, UserRole, OFFICES_CONFIG } from "../types";
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
  Users
} from "lucide-react";

interface AgentConsoleProps {
  tickets: Ticket[];
  cubicles: Cubicle[];
  onCallNext: (cubicleId: string) => Promise<void>;
  onStartAttending: (cubicleId: string) => void;
  onComplete: (cubicleId: string) => void;
  onMiss: (cubicleId: string) => void;
  onRecall: (cubicleId: string) => void;
  onChangeStatus: (cubicleId: string, status: CubicleStatus) => void;
  onUpdateCubicleConfig: (cubicleId: string, phases: TicketPhase[], services: ServiceType[]) => void;
  currentOfficeId?: string;
  users: SystemUser[];
  currentActiveUserId: string;
  setCurrentActiveUserId: React.Dispatch<React.SetStateAction<string>>;
}

export default function AgentConsole({
  tickets,
  cubicles,
  onCallNext,
  onStartAttending,
  onComplete,
  onMiss,
  onRecall,
  onChangeStatus,
  onUpdateCubicleConfig,
  currentOfficeId = "OFF-1",
  users = [],
  currentActiveUserId,
  setCurrentActiveUserId
}: AgentConsoleProps) {
  // Act as which cubicle? Choose CUB-1 by default
  const [activeCubicleId, setActiveCubicleId] = useState<string>("CUB-1");
  const [activeRoleFilter, setActiveRoleFilter] = useState<TicketPhase>(TicketPhase.CAJA);
  const [showConfig, setShowConfig] = useState<boolean>(false);

  // --- COMPORTAMIENTO DE INICIO DE SESIÓN INTEGRAL (GATEWAY) ---
  const [selectedGatewayRole, setSelectedGatewayRole] = useState<"CAJA" | "TRIADA" | null>(null);
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

    // Validación según rol del Gateway seleccionado
    if (selectedGatewayRole === "CAJA") {
      if (foundUser.role !== UserRole.AGENT_CAJA && foundUser.role !== UserRole.SUPERVISOR && foundUser.role !== UserRole.SUPERADMIN) {
        setFormLoginError("Este usuario no tiene un rol compatible con la Consola de Caja.");
        return;
      }
    } else if (selectedGatewayRole === "TRIADA") {
      if (foundUser.role !== UserRole.AGENT_TRIADA && foundUser.role !== UserRole.SUPERVISOR && foundUser.role !== UserRole.SUPERADMIN) {
        setFormLoginError("Este usuario no tiene un rol compatible con la Consola de Tríada.");
        return;
      }
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
    setFormLoginError("");
    setUsernameInput("");
    setPasswordInput("");
  };

  // --- COMPORTAMIENTO DE ACCESO, ROLES SECURITY Y REGIONALES ---
  const loggedInUser = sessionUser || {
    id: "default",
    username: "mcruz",
    fullName: "Mateo Cruz (Cajero Sede Ancón)",
    role: UserRole.AGENT_CAJA,
    officeId: "OFF-1"
  };

  const isCajaOnly = loggedInUser.role === UserRole.AGENT_CAJA;
  const isTriadaOnly = loggedInUser.role === UserRole.AGENT_TRIADA;

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
    if (activeRoleFilter === TicketPhase.CAJA) {
      // Show ONLY cashiers (Booths with CAJA phase supported, or booths named "Caja")
      return c.supportedPhases?.includes(TicketPhase.CAJA) || c.name.toLowerCase().includes("caja");
    } else {
      // Show ONLY triads (Booths with TRIADA phase supported, or booths named "Tríada" / "Foto")
      return c.supportedPhases?.includes(TicketPhase.TRIADA) || c.name.toLowerCase().includes("tríada") || c.name.toLowerCase().includes("foto") || c.name.toLowerCase().includes("triada");
    }
  });

  // Ensure current cubicle is valid based on selection
  let currentCubicle = filteredRoleCubicles.find(c => c.id === activeCubicleId);
  if (!currentCubicle && filteredRoleCubicles.length > 0) {
    currentCubicle = filteredRoleCubicles[0];
  }
  if (!currentCubicle) {
    currentCubicle = cubicles.find(c => c.id === activeCubicleId) || cubicles[0];
  }

  const activeTicket = tickets.find(t => t.id === currentCubicle.currentTicketId);

  // Filter candidates waiting that can be processed by this agent (supports current phase)
  const candidateWaitingTickets = tickets.filter(t => {
    if (t.status !== TicketStatus.WAITING) return false;
    
    // Check if booth supports the current phase of the ticket
    return currentCubicle.supportedPhases?.includes(t.currentPhase);
  });

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
                Control de Acceso de Agentes & Regionales
              </p>
            </div>
            <div className="h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent w-40 mx-auto"></div>
          </div>

          {!selectedGatewayRole ? (
            /* PASO 1: SELECCIÓN DE AREA (2 BOTONES) */
            <div className="space-y-6">
              <p className="text-xs text-slate-500 font-semibold text-center uppercase tracking-wider">
                Seleccione su área de atención reglamentaria para ingresar:
              </p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* BOTÓN CAJA */}
                <button
                  type="button"
                  onClick={() => setSelectedGatewayRole("CAJA")}
                  className="p-6 bg-white hover:bg-emerald-50/30 border border-slate-200 hover:border-emerald-300 rounded-2xl cursor-pointer text-left transition-all duration-300 group shadow-xs hover:shadow-md flex flex-col justify-between min-h-[160px]"
                >
                  <div className="p-3 bg-emerald-100 text-emerald-800 rounded-xl w-fit group-hover:scale-105 transition-transform">
                    <Users className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-slate-900 block uppercase tracking-wide">
                      Agente de Caja
                    </span>
                    <span className="text-[10px] text-slate-450 font-bold block uppercase tracking-widest mt-1">
                      Módulos de Cobro y Caja
                    </span>
                  </div>
                </button>

                {/* BOTÓN TRÍADA */}
                <button
                  type="button"
                  onClick={() => setSelectedGatewayRole("TRIADA")}
                  className="p-6 bg-white hover:bg-cyan-50/30 border border-slate-200 hover:border-cyan-300 rounded-2xl cursor-pointer text-left transition-all duration-300 group shadow-xs hover:shadow-md flex flex-col justify-between min-h-[160px]"
                >
                  <div className="p-3 bg-cyan-100 text-cyan-800 rounded-xl w-fit group-hover:scale-105 transition-transform">
                    <Activity className="w-6 h-6" />
                  </div>
                  <div>
                    <span className="text-sm font-black text-slate-900 block uppercase tracking-wide">
                      Agente de Tríada
                    </span>
                    <span className="text-[10px] text-slate-450 font-bold block uppercase tracking-widest mt-1">
                      Fotografía, Firma e Impresión
                    </span>
                  </div>
                </button>
              </div>

              <div className="p-3.5 border border-sky-100 bg-sky-50 text-sky-950 rounded-xl text-[10px] leading-relaxed font-semibold text-center">
                🛡️ <strong>Seguridad de Aislamiento de Colas:</strong> Al ingresar, el sistema aislará automáticamente los flujos correspondientes al área seleccionada.
              </div>
            </div>
          ) : (
            /* PASO 2: FORMULARIO DE USUARIO Y CONTRASEÑA */
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl space-y-6">
              <div className="flex items-center justify-between border-b border-slate-250 pb-3">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${selectedGatewayRole === "CAJA" ? "bg-emerald-500" : "bg-cyan-500"}`}></span>
                  <span className="text-xs font-black uppercase text-slate-800">
                    Ingresar como: {selectedGatewayRole === "CAJA" ? "Agente de Caja" : "Agente de Tríada"}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedGatewayRole(null);
                    setFormLoginError("");
                  }}
                  className="text-[10px] font-black uppercase text-slate-450 hover:text-slate-800 cursor-pointer bg-transparent border-transparent"
                >
                  Volver ←
                </button>
              </div>

              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Usuario del Sistema:
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: mcruz"
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
                {selectedGatewayRole === "CAJA" ? (
                  <>
                    <span>- <strong>@mcruz</strong> (Mateo Cruz - Caja Sede Ancón)</span>
                    <span>- <strong>@frios</strong> (Felipe Ríos - Caja Bocas del Toro)</span>
                  </>
                ) : (
                  <>
                    <span>- <strong>@jgutierrez</strong> (Julia Gutiérrez - Tríada Sede Ancón)</span>
                    <span>- <strong>@spadilla</strong> (Silvia Padilla - Tríada Bocas del Toro)</span>
                  </>
                )}
                <span>- O use cuentas creadas en <strong>Superadministrador → Gestión de Operadores</strong></span>
                <span className="font-bold text-[#122e70]">🔑 Contraseña: El mismo nombre de usuario o "123456"</span>
              </div>
            </div>
          )}

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
                setSessionUser(null);
                setCurrentActiveUserId("");
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
                      let roleStr = "Operador";
                      if (u.role === UserRole.SUPERADMIN) roleStr = "Superadministrador";
                      else if (u.role === UserRole.SUPERVISOR) roleStr = "Supervisor";
                      else if (u.role === UserRole.AGENT_CAJA) roleStr = "Caja";
                      else if (u.role === UserRole.AGENT_TRIADA) roleStr = "Tríada";
                      
                      return (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({roleStr} - {oShort})
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

        {/* PROMINENT ROLE INDICATOR & SELECTION BUTTONS AT THE TOP */}
        <div className="space-y-3 bg-blue-50/30 p-5 border border-blue-100 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] uppercase tracking-widest font-black text-[#122e70] font-mono">
              ★ ROL SELECCIONADO DE ATENCIÓN (FILTRO GLOBAL DE MÓDULOS) ★
            </label>
            <span className="text-[10px] bg-[#122e70] text-white px-2 py-0.5 rounded-md font-black">ACTIVO</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4 font-sans">
            <button
              id="role-filter-caja"
              type="button"
              disabled={isTriadaOnly}
              onClick={() => {
                if (isTriadaOnly) return;
                setActiveRoleFilter(TicketPhase.CAJA);
                const firstCaja = cubicles.find(c => c.supportedPhases?.includes(TicketPhase.CAJA) || c.name.toLowerCase().includes("caja"));
                if (firstCaja) setActiveCubicleId(firstCaja.id);
              }}
              className={`py-4 px-4 text-xs sm:text-sm font-black uppercase tracking-widest transition-all rounded-xl text-center border relative ${
                activeRoleFilter === TicketPhase.CAJA
                  ? "bg-[#122e70] text-white border-blue-900 shadow-md scale-[1.01]"
                  : "bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100"
              } ${isTriadaOnly ? "opacity-45 cursor-not-allowed bg-slate-100 text-slate-405" : "cursor-pointer"}`}
            >
              <span className="block">🏧 VER SÓLO CAJAS ({cubicles.filter(c => c.supportedPhases?.includes(TicketPhase.CAJA) || c.name.toLowerCase().includes("caja")).length})</span>
              {isTriadaOnly && <span className="block text-[8px] text-red-550 mt-1 font-sans font-extrabold uppercase tracking-wider">🔒 BLOQUEADO</span>}
            </button>

            <button
              id="role-filter-triada"
              type="button"
              disabled={isCajaOnly}
              onClick={() => {
                if (isCajaOnly) return;
                setActiveRoleFilter(TicketPhase.TRIADA);
                const firstTriada = cubicles.find(c => c.supportedPhases?.includes(TicketPhase.TRIADA) || c.name.toLowerCase().includes("tríada") || c.name.toLowerCase().includes("triada"));
                if (firstTriada) setActiveCubicleId(firstTriada.id);
              }}
              className={`py-4 px-4 text-xs sm:text-sm font-black uppercase tracking-widest transition-all rounded-xl text-center border relative ${
                activeRoleFilter === TicketPhase.TRIADA
                  ? "bg-[#122e70] text-white border-blue-900 shadow-md scale-[1.01]"
                  : "bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100"
              } ${isCajaOnly ? "opacity-45 cursor-not-allowed bg-slate-100 text-slate-405" : "cursor-pointer"}`}
            >
              <span className="block">📸 VER SÓLO TRÍADAS ({cubicles.filter(c => c.supportedPhases?.includes(TicketPhase.TRIADA) || c.name.toLowerCase().includes("tríada") || c.name.toLowerCase().includes("triada")).length})</span>
              {isCajaOnly && <span className="block text-[8px] text-red-550 mt-1 font-sans font-extrabold uppercase tracking-wider">🔒 BLOQUEADO</span>}
            </button>
          </div>
        </div>

        {/* CUBICLE SELECTOR FOR FILTERED ROLE */}
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-widest font-black text-slate-500 font-mono">
            Módulos del Operador Disponibles:
          </label>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 shadow-inner">
            {filteredRoleCubicles.map((c) => {
              const isActive = c.id === activeCubicleId;
              return (
                <button
                  id={`btn-select-agent-${c.id.toLowerCase()}`}
                  key={c.id}
                  onClick={() => setActiveCubicleId(c.id)}
                  className={`text-left p-4 rounded-xl border transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-900 text-white border-slate-900 font-black shadow-md scale-[1.02]"
                      : "hover:bg-slate-200 text-slate-700 border-slate-200 bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1.5 truncate uppercase tracking-wider text-[11px] font-black">
                    <span className="truncate">{c.name.toUpperCase()}</span>
                    <span className={`w-3 h-3 rounded-full outline outline-2 outline-white shrink-0 ${
                      c.status === CubicleStatus.ONLINE_AVAILABLE 
                        ? "bg-emerald-500 animate-pulse" 
                        : c.status === CubicleStatus.ATTENDING
                          ? "bg-blue-600"
                          : c.status === CubicleStatus.BREAK
                            ? "bg-amber-500"
                            : "bg-rose-500"
                    }`} />
                  </div>
                  <p className="text-[10px] text-slate-550 font-bold truncate mt-1.5 uppercase tracking-wide">AGENTE: {c.agentName.toUpperCase()}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* AGENT STATE CARD & CONFIGURATOR */}
        <div className="space-y-4 pt-2">
          <div className="bg-slate-50 p-4 border border-slate-200 rounded-xl flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between shadow-sm">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 block font-black">MÓDULO SELECCIONADO:</span>
              <p className="text-sm font-black text-slate-900 uppercase tracking-wider leading-none">
                {currentCubicle.name} • AGENTE {currentCubicle.agentName}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-status-available"
                onClick={() => onChangeStatus(currentCubicle.id, CubicleStatus.ONLINE_AVAILABLE)}
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
                onClick={() => onChangeStatus(currentCubicle.id, CubicleStatus.BREAK)}
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
                  </p>
                  {activeTicket.priority && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white font-black text-[10px] uppercase mt-2 tracking-widest shadow-sm rounded-lg animate-pulse">
                      ★ PRIORITARIO
                    </span>
                  )}
                  {activeTicket.isAppointment && (
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
                      <span className="font-extrabold text-slate-800 truncate max-w-[170px] uppercase tracking-wide">{item.name}</span>
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
                      {item.isAppointment && (
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
