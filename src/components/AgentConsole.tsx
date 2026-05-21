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

  const currentCubicle = cubicles.find(c => c.id === activeCubicleId) || cubicles[0];
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
    <div id="agent-console-panel" className="bg-white dark:bg-slate-900 border-4 border-slate-900 dark:border-slate-800 rounded-none p-8 flex flex-col justify-between h-full min-h-[720px] shadow-lg">
      <div className="space-y-6">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b-4 border-slate-900 dark:border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-indigo-600 text-white rounded-none shadow-md">
              <UserCheck className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest text-slate-900 dark:text-slate-100">
                Consola del Operador
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest mt-1">Control de Módulos</p>
            </div>
          </div>
          <span className="px-3.5 py-1.5 text-xs uppercase font-mono bg-slate-900 text-white dark:bg-slate-800 dark:text-slate-200 border-2 border-slate-900 font-black tracking-widest">
            SALA / GESTIÓN
          </span>
        </div>

        {/* SELECCIÓN DE ROL DE OPERADOR (ARRIBA) */}
        <div className="space-y-3 bg-indigo-50/30 dark:bg-indigo-950/20 p-4 border-4 border-slate-900 dark:border-slate-800 rounded-none shadow-inner">
          <label className="block text-xs uppercase tracking-widest font-black text-indigo-700 dark:text-indigo-400">
            Filtro Principal: Rol del Operador
          </label>
          <div className="flex gap-3">
            <button
              id="role-filter-caja"
              type="button"
              onClick={() => {
                setActiveRoleFilter(TicketPhase.CAJA);
                const firstCaja = cubicles.find(c => c.supportedPhases?.includes(TicketPhase.CAJA));
                if (firstCaja) setActiveCubicleId(firstCaja.id);
              }}
              className={`flex-1 py-3.5 px-4 text-xs sm:text-sm font-black uppercase tracking-widest transition-all border-4 text-center cursor-pointer ${
                activeRoleFilter === TicketPhase.CAJA
                  ? "bg-indigo-600 text-white border-indigo-700 shadow-md scale-[1.02]"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              🏧 RECEPCIÓN Y CAJA
            </button>
            <button
              id="role-filter-triada"
              type="button"
              onClick={() => {
                setActiveRoleFilter(TicketPhase.TRIADA);
                const firstTriada = cubicles.find(c => c.supportedPhases?.includes(TicketPhase.TRIADA));
                if (firstTriada) setActiveCubicleId(firstTriada.id);
              }}
              className={`flex-1 py-3.5 px-4 text-xs sm:text-sm font-black uppercase tracking-widest transition-all border-4 text-center cursor-pointer ${
                activeRoleFilter === TicketPhase.TRIADA
                  ? "bg-indigo-600 text-white border-indigo-700 shadow-md scale-[1.02]"
                  : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-400 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              📸 TRÍADA & FOTOGRAFÍA
            </button>
          </div>
        </div>

        {/* CUBICLE SIMULATION SELECTOR TABS */}
        <div className="space-y-2">
          <label className="block text-xs uppercase tracking-widest font-black text-slate-500 dark:text-slate-400">
            Módulo Activo en Pantalla ({activeRoleFilter === TicketPhase.CAJA ? "CAJAS OPERATIVAS" : "MÓDULOS DE TRÍADA/FOTO"}):
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-100 dark:bg-slate-950 p-2 rounded-none border-2 border-slate-400 dark:border-slate-800">
            {cubicles
              .filter((c) => c.supportedPhases?.includes(activeRoleFilter))
              .map((c) => {
              const isActive = c.id === activeCubicleId;
              return (
                <button
                  id={`btn-select-agent-${c.id.toLowerCase()}`}
                  key={c.id}
                  onClick={() => setActiveCubicleId(c.id)}
                  className={`text-left p-3.5 rounded-none border-2 transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-900 dark:bg-slate-850 text-white border-slate-900 font-extrabold shadow-sm scale-[1.01]"
                      : "hover:bg-slate-200 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 border-transparent bg-white/40 dark:bg-black/10"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 truncate uppercase tracking-widest text-[11px] font-black">
                    <span className="truncate">{c.name.toUpperCase()}</span>
                    <span className={`w-3.5 h-3.5 rounded-full outline outline-2 outline-white dark:outline-slate-900 shrink-0 ${
                      c.status === CubicleStatus.ONLINE_AVAILABLE 
                        ? "bg-emerald-500 animate-pulse" 
                        : c.status === CubicleStatus.ATTENDING
                          ? "bg-indigo-500"
                          : c.status === CubicleStatus.BREAK
                            ? "bg-amber-500"
                            : "bg-red-500"
                    }`} />
                  </div>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-bold truncate mt-1.5 uppercase tracking-wide">AGENTE: {c.agentName.toUpperCase()}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* AGENT STATE CARD & CONFIGURATOR */}
        <div className="space-y-4">
          <div className="bg-slate-50 dark:bg-slate-950 p-4 border-2 border-slate-900 dark:border-slate-800 flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-mono tracking-widest text-slate-400 block font-black">MÓDULO SELECCIONADO:</span>
              <p className="text-sm font-black text-slate-900 dark:text-slate-105 uppercase tracking-wider">
                {currentCubicle.name} &bull; AGENTE {currentCubicle.agentName}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                id="btn-status-available"
                onClick={() => onChangeStatus(currentCubicle.id, CubicleStatus.ONLINE_AVAILABLE)}
                className={`px-3.5 py-2 rounded-none border-2 text-[11px] uppercase font-black tracking-widest flex items-center gap-2 cursor-pointer transition-all ${
                  currentCubicle.status === CubicleStatus.ONLINE_AVAILABLE || currentCubicle.status === CubicleStatus.ATTENDING
                    ? "bg-emerald-600 text-white border-emerald-700 shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-505 dark:text-slate-400 hover:bg-slate-100"
                }`}
                title="Disponible"
              >
                <span className="w-2 h-2 rounded-full bg-white antialiased" />
                <span>ACTIVO</span>
              </button>

              <button
                id="btn-status-break"
                onClick={() => onChangeStatus(currentCubicle.id, CubicleStatus.BREAK)}
                className={`px-3.5 py-2 rounded-none border-2 text-[11px] uppercase font-black tracking-widest flex items-center gap-2 cursor-pointer transition-all ${
                  currentCubicle.status === CubicleStatus.BREAK
                    ? "bg-amber-500 text-white border-amber-600 shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-505 dark:text-slate-400 hover:bg-slate-100"
                }`}
                title="Pausa"
              >
                <span>RECESO</span>
              </button>

              <button
                id="btn-status-offline"
                onClick={() => onChangeStatus(currentCubicle.id, CubicleStatus.OFFLINE)}
                className={`px-3.5 py-2 rounded-none border-2 text-[11px] uppercase font-black tracking-widest flex items-center gap-2 cursor-pointer transition-all ${
                  currentCubicle.status === CubicleStatus.OFFLINE
                    ? "bg-rose-600 text-white border-rose-700 shadow-sm"
                    : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-505 dark:text-slate-400 hover:bg-slate-100"
                }`}
                title="Fuera de línea"
              >
                <span>OUT</span>
              </button>
            </div>
          </div>

          {/* DYNAMIC ROLE CONFIGURATOR */}
          <div className="border-2 border-slate-900 dark:border-slate-800 p-4 bg-slate-50 dark:bg-slate-950 space-y-3.5 shadow-inner">
            <div className="flex items-center justify-between border-b pb-2.5 border-slate-200 dark:border-slate-800">
              <div>
                <span className="text-xs font-black uppercase tracking-widest text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Settings className="w-4.5 h-4.5 text-indigo-500" />
                  PERMISO Y ROL DE ATENCIÓN DE CABINA
                </span>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 mt-0.5 uppercase tracking-wider font-extrabold">Configuración local del hardware de llamada</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline uppercase cursor-pointer"
              >
                {showConfig ? "Ocultar panel" : "Ver opciones"}
              </button>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] uppercase font-mono tracking-widest text-slate-400 block font-black">Fases Habilitadas:</span>
              <div className="flex flex-wrap gap-2">
                {Object.values(PHASES_CONFIG).map((phase) => {
                  const isActive = (currentCubicle.supportedPhases || []).includes(phase.id);
                  return (
                    <button
                      key={phase.id}
                      type="button"
                      onClick={() => handleTogglePhase(phase.id)}
                      className={`px-3.5 py-2 text-[11px] font-black border-2 tracking-wider uppercase cursor-pointer transition-all ${
                        isActive 
                          ? `${phase.color} font-black border-slate-900 shadow-sm` 
                          : "bg-white dark:bg-slate-900 text-slate-400 border-slate-250 dark:border-slate-800 hover:text-slate-700 dark:hover:text-slate-250"
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
              <div className="space-y-3 pt-3 border-t-2 border-slate-300 dark:border-slate-800">
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
                        className={`px-3 py-2 text-xs text-left font-black tracking-wider uppercase border-2 cursor-pointer flex items-center justify-between transition-all ${
                          isActive 
                            ? "bg-indigo-50 dark:bg-indigo-950/40 text-indigo-700 dark:text-indigo-400 border-indigo-505" 
                            : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-800 hover:text-slate-600"
                        }`}
                      >
                        <span className="truncate">{service.name}</span>
                        <span className="text-[10px] px-2 py-0.5 bg-slate-200 dark:bg-slate-800 text-slate-505 font-mono font-black border">
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
        <div className="space-y-2">
          <span className="block text-xs uppercase font-black tracking-widest text-slate-500">Trámite Activo en Curso</span>
          
          {activeTicket ? (
            <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border-4 border-indigo-600 p-6 rounded-none space-y-4 relative overflow-hidden shadow-md">
              <div className="absolute top-0 right-0 p-4 text-[10px] uppercase text-indigo-700 dark:text-indigo-400 font-black tracking-widest font-mono">
                {activeTicket.status === TicketStatus.CALLING ? "🛎️ ESTADO: LLAMANDO" : "🎙️ ESTADO: ATENDIENDO"}
              </div>

              <div className="flex items-start gap-4 pt-4">
                <div className="px-5 py-3.5 bg-indigo-600 text-white rounded-none font-mono font-black text-3xl shadow-md border-2 border-indigo-700 select-none">
                  {activeTicket.numberCode}
                </div>
                <div className="space-y-1">
                  <h4 className="text-lg font-black uppercase text-slate-900 dark:text-white leading-tight">
                    {activeTicket.name}
                  </h4>
                  <p className="text-xs text-slate-505 dark:text-slate-400 uppercase tracking-widest font-bold">
                    SERVICIO SOLICITADO: <span className="font-extrabold text-indigo-700 dark:text-indigo-400">{SERVICES_CONFIG[activeTicket.serviceType].name.toUpperCase()}</span>
                  </p>
                  {activeTicket.priority && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white font-black text-[10px] uppercase mt-2 tracking-widest shadow-sm animate-pulse">
                      ★ ATENCIÓN PRIORITARIA/PREFERENCIAL
                    </span>
                  )}
                </div>
              </div>

              {/* LIVE STEPS PROGRESS TIMELINE */}
              <div className="mt-4 bg-white dark:bg-slate-900 p-4 border-2 border-indigo-100 dark:border-indigo-900 space-y-3.5 shadow-inner">
                <span className="text-[10px] uppercase font-mono font-black text-slate-400 block tracking-widest text-center">
                  RANGO DEL FLUJO CONTINUO (MISMO TICKET)
                </span>
                
                <div className="relative py-2 flex items-center justify-between max-w-md mx-auto">
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
                            pIdx <= currentPhaseIdx ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                          }`} />
                        )}
                        <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-black border-2 transition-all ${
                          isDone 
                            ? "bg-emerald-500 text-white border-emerald-600" 
                            : isCurrent 
                              ? "bg-indigo-600 text-white border-indigo-700 ring-4 ring-indigo-500/30 scale-110" 
                              : "bg-slate-200 dark:bg-slate-800 text-slate-500 border-slate-300 dark:border-slate-750"
                        }`}>
                          {isDone ? "✓" : pIdx + 1}
                        </div>
                        <span className={`text-[10px] mt-2 text-center uppercase tracking-wider font-extrabold ${isCurrent ? "text-indigo-600 dark:text-indigo-400 font-black scale-102" : "text-slate-400"}`}>
                          {p.shortName.toUpperCase()}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <p className="text-[11px] uppercase text-indigo-700 dark:text-indigo-400 text-center font-black bg-indigo-50/50 dark:bg-slate-950 py-1.5 border border-indigo-100/40">
                  {activeTicket.currentPhase === TicketPhase.CAJA && "➔ Al finalizar en caja, el tiquet pasará automáticamente a la siguiente cola de Tríada y Fotografía."}
                  {activeTicket.currentPhase === TicketPhase.TRIADA && "➔ Fase final de atención. Al pulsar Completar, el ciudadano se completa."}
                </p>
              </div>

              {/* ACTION TOOLBARS */}
              <div className="grid grid-cols-2 gap-3 pt-3 border-t-2 border-indigo-100 dark:border-indigo-900">
                {activeTicket.status === TicketStatus.CALLING ? (
                  <button
                    id="btn-action-start"
                    onClick={() => onStartAttending(currentCubicle.id)}
                    className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest border-2 border-black rounded-none cursor-pointer flex items-center justify-center gap-2 shadow-sm transition-all"
                  >
                    <Play className="w-4 h-4 text-emerald-400" />
                    Iniciar Atención
                  </button>
                ) : (
                  <button
                    id="btn-action-complete"
                    onClick={() => onComplete(currentCubicle.id)}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-widest border-2 border-indigo-800 rounded-none cursor-pointer flex items-center justify-center gap-2 shadow-md transition-all"
                  >
                    <Check className="w-4 h-4 text-white" />
                    Completar Atención
                  </button>
                )}

                <button
                  id="btn-action-recall"
                  onClick={() => onRecall(currentCubicle.id)}
                  className="w-full py-3 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-455 border-2 border-indigo-500 font-black text-xs uppercase tracking-widest rounded-none transition-all cursor-pointer flex items-center justify-center gap-2 shadow-sm"
                  title="Re-llamar al altavoz"
                >
                  <Volume2 className="w-4 h-4 animate-bounce" />
                  Volver a Llamar
                </button>

                <button
                  id="btn-action-miss"
                  onClick={() => onMiss(currentCubicle.id)}
                  className="col-span-2 w-full py-2.5 bg-slate-100 hover:bg-rose-105 hover:bg-rose-100 dark:hover:bg-rose-950/20 text-slate-700 hover:text-rose-700 dark:bg-slate-805 dark:text-slate-300 font-extrabold text-[11px] uppercase tracking-wider rounded-none border border-slate-305 dark:border-slate-850 cursor-pointer flex items-center justify-center gap-2"
                  title="Marca cliente como ausente"
                >
                  <UserX className="w-4 h-4 text-rose-500" />
                  No se presentó (Marcar Ausente)
                </button>
              </div>
            </div>
          ) : (
            <div className="border-4 border-slate-900 hover:border-slate-700 dark:border-slate-800 border-dashed rounded-none p-8 text-center space-y-4 bg-slate-50 dark:bg-slate-950 transition-all">
              <p className="text-sm text-slate-505 dark:text-slate-400 uppercase tracking-widest font-black">Módulo Disponible para Próxima Llamada</p>
              
              <button
                id="btn-call-next-ticket"
                disabled={currentCubicle.status === CubicleStatus.BREAK || currentCubicle.status === CubicleStatus.OFFLINE || sortedCandidates.length === 0}
                onClick={() => onCallNext(currentCubicle.id)}
                className={`px-6 py-4.5 w-full font-black text-sm uppercase tracking-widest rounded-none border-2 border-black transition-all flex items-center justify-center gap-2 shadow-lg ${
                  currentCubicle.status === CubicleStatus.BREAK || currentCubicle.status === CubicleStatus.OFFLINE
                    ? "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed"
                    : sortedCandidates.length === 0
                      ? "bg-indigo-300 text-white border-indigo-400 cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer active:scale-[0.99] shadow-indigo-950/20"
                }`}
              >
                {currentCubicle.status === CubicleStatus.BREAK ? (
                  "Módulo en Receso"
                ) : currentCubicle.status === CubicleStatus.OFFLINE ? (
                  "Módulo Desconectado"
                ) : sortedCandidates.length === 0 ? (
                  "Ningún ticket compatible en cola esperando"
                ) : (
                  <>
                    <span>Llamar Siguiente Turno disponible</span>
                    <ArrowRight className="w-5 h-5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* CANDIDATE LIST FOR THIS AGENT */}
        <div className="space-y-2 rounded-none">
          <div className="flex justify-between items-center text-[10px] uppercase font-black text-slate-500 tracking-wider">
            <span>COLA COMPATIBLE Soportada por Módulo ({sortedCandidates.length})</span>
            {sortedCandidates.length > 0 && <span className="text-xs px-2 py-0.5 bg-slate-900 text-white font-mono rounded-none font-bold">TURNOS</span>}
          </div>

          {sortedCandidates.length > 0 ? (
            <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1">
              {sortedCandidates.slice(0, 4).map((item) => (
                <div key={item.id} className="p-3 border-2 border-slate-201 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-none flex items-center justify-between text-xs">
                  <div className="flex items-center gap-3">
                    <span className="font-bold font-mono text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-800 px-2 py-1 rounded-none text-xs">
                      {item.numberCode}
                    </span>
                    <span className="font-black text-slate-800 dark:text-slate-200 truncate max-w-[170px] uppercase tracking-wide">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {item.priority && (
                      <span className="px-2 py-0.5 bg-amber-500 text-white text-[9px] font-black uppercase rounded-none tracking-widest animate-pulse">
                        PE
                      </span>
                    )}
                    <span className="text-[10px] text-slate-500 font-mono font-bold">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
              {sortedCandidates.length > 4 && (
                <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest font-black italic text-center">
                  + {sortedCandidates.length - 4} turnos más compatibles en cola.
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 border-2 border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-none text-center text-xs text-slate-400 uppercase tracking-widest font-black">
              No hay turnos en cola compatibles con este módulo de atención.
            </div>
          )}
        </div>
      </div>

      {/* METRICS UNDERLAY */}
      <div className="border-t-2 border-slate-200 dark:border-slate-800 pt-4 flex items-center justify-between text-xs mt-4">
        <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400 uppercase text-[10px] font-mono font-black tracking-widest">
          <Award className="w-5 h-5 text-indigo-550 text-indigo-505" />
          <span>Atendidos hoy en Cabina:</span>
          <span className="font-mono font-black bg-slate-900 text-white dark:bg-slate-800 dark:text-white px-3 py-1 border border-slate-950 shadow-inner">{currentCubicle.totalAttendedCount}</span>
        </div>
      </div>
    </div>
  );
}
