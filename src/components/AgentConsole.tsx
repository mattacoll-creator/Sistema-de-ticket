/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Ticket, Cubicle, TicketStatus, CubicleStatus, SERVICES_CONFIG, ServiceType, TicketPhase, PHASES_CONFIG } from "../types";
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
  Settings
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
  onUpdateCubicleConfig
}: AgentConsoleProps) {
  // Act as which cubicle? Choose CUB-1 by default
  const [activeCubicleId, setActiveCubicleId] = useState<string>("CUB-1");
  const [activeRoleFilter, setActiveRoleFilter] = useState<TicketPhase>(TicketPhase.CAJA);
  const [showConfig, setShowConfig] = useState<boolean>(false);

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
          <span className="px-3.5 py-1.5 text-xs uppercase font-mono bg-slate-900 text-white border border-slate-900 font-black tracking-widest rounded-lg">
            SALA / GESTIÓN
          </span>
        </div>

        {/* PROMINENT ROLE INDICATOR & SELECTION BUTTONS AT THE TOP */}
        <div className="space-y-3 bg-blue-50/30 p-5 border border-blue-100 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] uppercase tracking-widest font-black text-[#122e70] font-mono">
              ★ ROL SELECCIONADO DE ATENCIÓN (FILTRO GLOBAL DE MÓDULOS) ★
            </label>
            <span className="text-[10px] bg-[#122e70] text-white px-2 py-0.5 rounded-md font-black">ACTIVO</span>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <button
              id="role-filter-caja"
              type="button"
              onClick={() => {
                setActiveRoleFilter(TicketPhase.CAJA);
                // Default to first matching modulo
                const firstCaja = cubicles.find(c => c.supportedPhases?.includes(TicketPhase.CAJA) || c.name.toLowerCase().includes("caja"));
                if (firstCaja) setActiveCubicleId(firstCaja.id);
              }}
              className={`py-4 px-4 text-xs sm:text-sm font-black uppercase tracking-widest transition-all rounded-xl text-center cursor-pointer border ${
                activeRoleFilter === TicketPhase.CAJA
                  ? "bg-[#122e70] text-white border-blue-900 shadow-md scale-[1.01]"
                  : "bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100"
              }`}
            >
              🏧 VER SÓLO CAJAS ({cubicles.filter(c => c.supportedPhases?.includes(TicketPhase.CAJA) || c.name.toLowerCase().includes("caja")).length})
            </button>
            <button
              id="role-filter-triada"
              type="button"
              onClick={() => {
                setActiveRoleFilter(TicketPhase.TRIADA);
                // Default to first matching modulo 
                const firstTriada = cubicles.find(c => c.supportedPhases?.includes(TicketPhase.TRIADA) || c.name.toLowerCase().includes("tríada") || c.name.toLowerCase().includes("triada"));
                if (firstTriada) setActiveCubicleId(firstTriada.id);
              }}
              className={`py-4 px-4 text-xs sm:text-sm font-black uppercase tracking-widest transition-all rounded-xl text-center cursor-pointer border ${
                activeRoleFilter === TicketPhase.TRIADA
                  ? "bg-[#122e70] text-white border-blue-900 shadow-md scale-[1.01]"
                  : "bg-white text-slate-600 hover:text-slate-900 border-slate-200 hover:bg-slate-100"
              }`}
            >
              📸 VER SÓLO TRÍADAS ({cubicles.filter(c => c.supportedPhases?.includes(TicketPhase.TRIADA) || c.name.toLowerCase().includes("tríada") || c.name.toLowerCase().includes("triada")).length})
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
                  {Object.values(SERVICES_CONFIG).map((service) => {
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
