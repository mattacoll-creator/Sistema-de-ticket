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
    <div id="agent-console-panel" className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-800 rounded-none p-6 flex flex-col justify-between h-full min-h-[580px]">
      <div className="space-y-4">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-none">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Consola del Operador
              </h3>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">Control de Módulos</p>
            </div>
          </div>
          <span className="px-2 py-1 text-[8px] uppercase font-mono bg-slate-150 text-slate-900 dark:bg-slate-800 dark:text-slate-200 border border-slate-350 dark:border-slate-705 font-bold">
            OPERADOR
          </span>
        </div>

        {/* CUBICLE SIMULATION SELECTOR TABS */}
        <div className="space-y-1.5">
          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500">
            Selección de Módulo a Operar:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-none border border-slate-350 dark:border-slate-800">
            {cubicles.map((c) => {
              const isActive = c.id === activeCubicleId;
              return (
                <button
                  id={`btn-select-agent-${c.id.toLowerCase()}`}
                  key={c.id}
                  onClick={() => setActiveCubicleId(c.id)}
                  className={`text-left p-2 rounded-none text-xs leading-tight transition-all cursor-pointer ${
                    isActive
                      ? "bg-slate-900 dark:bg-slate-850 text-white font-bold"
                      : "hover:bg-slate-200/50 dark:hover:bg-slate-900/50 text-slate-700 dark:text-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between truncate uppercase tracking-wider text-[10px]">
                    <span className="truncate">{c.name}</span>
                    <span className={`w-2 h-2 rounded-none ${
                      c.status === CubicleStatus.ONLINE_AVAILABLE 
                        ? "bg-emerald-500" 
                        : c.status === CubicleStatus.ATTENDING
                          ? "bg-indigo-505 bg-indigo-500"
                          : c.status === CubicleStatus.BREAK
                            ? "bg-amber-500"
                            : "bg-red-500"
                    }`} />
                  </div>
                  <p className="text-[9px] text-slate-400 font-normal truncate mt-0.5 uppercase tracking-tight">{c.agentName}</p>
                </button>
              );
            })}
          </div>
        </div>

        {/* AGENT STATE CARD & CONFIGURATOR */}
        <div className="space-y-3">
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-none border-2 border-slate-900 dark:border-slate-800 flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-[8px] uppercase font-mono tracking-widest text-slate-400 block font-bold">ESTADO DE SESIÓN:</span>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-100 uppercase tracking-wide">
                {currentCubicle.name}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                id="btn-status-available"
                onClick={() => onChangeStatus(currentCubicle.id, CubicleStatus.ONLINE_AVAILABLE)}
                className={`px-2.5 py-1.5 rounded-none border-2 text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  currentCubicle.status === CubicleStatus.ONLINE_AVAILABLE || currentCubicle.status === CubicleStatus.ATTENDING
                    ? "bg-white text-emerald-600 border-emerald-500"
                    : "bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500"
                }`}
                title="Disponible"
              >
                <span className="w-1.5 h-1.5 bg-emerald-500" />
                <span>DISP.</span>
              </button>

              <button
                id="btn-status-break"
                onClick={() => onChangeStatus(currentCubicle.id, CubicleStatus.BREAK)}
                className={`px-2.5 py-1.5 rounded-none border-2 text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  currentCubicle.status === CubicleStatus.BREAK
                    ? "bg-white text-amber-500 border-amber-500"
                    : "bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500"
                }`}
                title="Ir a Pausa o Almuerzo"
              >
                <span>RECESO</span>
              </button>

              <button
                id="btn-status-offline"
                onClick={() => onChangeStatus(currentCubicle.id, CubicleStatus.OFFLINE)}
                className={`px-2.5 py-1.5 rounded-none border-2 text-[10px] uppercase font-bold flex items-center gap-1 cursor-pointer transition-all ${
                  currentCubicle.status === CubicleStatus.OFFLINE
                    ? "bg-white text-rose-600 border-rose-500"
                    : "bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-500"
                }`}
                title="Cerrar Cubículo"
              >
                <span>OFFLINE</span>
              </button>
            </div>
          </div>

          {/* DYNAMIC ROLE CONFIGURATOR */}
          <div className="border-2 border-slate-900 dark:border-slate-800 p-3 bg-slate-50 dark:bg-slate-950 space-y-2.5">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100 flex items-center gap-1.5">
                  <Settings className="w-3.5 h-3.5 text-indigo-500" />
                  Roles de Atención del Módulo
                </span>
                <p className="text-[9px] text-slate-500 mt-0.5 uppercase tracking-wide">Servicios y Fases activos</p>
              </div>
              <button 
                type="button"
                onClick={() => setShowConfig(!showConfig)}
                className="text-[9px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline uppercase cursor-pointer"
              >
                {showConfig ? "Ocultar" : "Configurar"}
              </button>
            </div>

            <div className="space-y-1">
              <span className="text-[8px] uppercase font-mono tracking-widest text-slate-400 block font-bold">Fases Habilitadas:</span>
              <div className="flex flex-wrap gap-1">
                {Object.values(PHASES_CONFIG).map((phase) => {
                  const isActive = (currentCubicle.supportedPhases || []).includes(phase.id);
                  return (
                    <button
                      key={phase.id}
                      type="button"
                      onClick={() => handleTogglePhase(phase.id)}
                      className={`px-2 py-1 text-[9px] font-bold border cursor-pointer transition-all ${
                        isActive 
                          ? `${phase.color} font-bold ring-1 ring-slate-900/10` 
                          : "bg-white dark:bg-slate-900 text-slate-400 border-slate-200 dark:border-slate-850 hover:text-slate-600"
                      }`}
                    >
                      {isActive ? "✓ " : ""}
                      {phase.shortName}
                    </button>
                  );
                })}
              </div>
            </div>

            {showConfig && (
              <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                <span className="text-[8px] uppercase font-mono tracking-widest text-slate-400 block font-bold">
                  Trámites Finales Soportados:
                </span>
                <div className="grid grid-cols-2 gap-1.5">
                  {Object.values(SERVICES_CONFIG).map((service) => {
                    const isActive = (currentCubicle.supportedServices || []).includes(service.id);
                    return (
                      <button
                        key={service.id}
                        type="button"
                        onClick={() => handleToggleService(service.id)}
                        className={`px-2 py-1.5 text-[9px] text-left font-bold border cursor-pointer flex items-center justify-between transition-all ${
                          isActive 
                            ? "bg-indigo-50 dark:bg-indigo-950/20 text-indigo-700 dark:text-indigo-400 border-indigo-500" 
                            : "bg-white dark:bg-slate-900 text-slate-455 border-slate-200 dark:border-slate-850 hover:text-slate-605"
                        }`}
                      >
                        <span className="truncate">{service.name}</span>
                        <span className="text-[8px] px-1 bg-slate-100 dark:bg-slate-800 text-slate-400 font-mono font-bold">
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
        <div className="space-y-1.5">
          <span className="block text-[9px] uppercase font-bold tracking-wider text-slate-500">Trámite Activo en Curso</span>
          
          {activeTicket ? (
            <div className="bg-indigo-50 dark:bg-indigo-950/20 border-2 border-indigo-600 p-4 rounded-none space-y-3 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-3 text-[8px] uppercase text-indigo-650 dark:text-indigo-400 font-bold tracking-widest font-mono">
                {activeTicket.status === TicketStatus.CALLING ? "ESTADO: LLAMANDO" : "ESTADO: ATENDIENDO"}
              </div>

              <div className="flex items-start gap-3 pt-2">
                <div className="px-3.5 py-2.5 bg-indigo-600 text-white rounded-none font-bold text-xl">
                  {activeTicket.numberCode}
                </div>
                <div className="space-y-0.5">
                  <h4 className="text-sm font-bold uppercase text-slate-900 dark:text-white leading-tight">
                    {activeTicket.name}
                  </h4>
                  <p className="text-xs text-slate-500 uppercase tracking-tight flex items-center gap-1">
                    Servicio Principal: <span className="font-bold text-slate-800 dark:text-slate-200">{SERVICES_CONFIG[activeTicket.serviceType].name}</span>
                  </p>
                  {activeTicket.priority && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-500 text-white font-bold text-[8px] uppercase mt-1 tracking-wider">
                      PREFERENCIAL
                    </span>
                  )}
                </div>
              </div>

              {/* LIVE STEPS PROGRESS TIMELINE */}
              <div className="mt-2.5 bg-white dark:bg-slate-900 p-2.5 border border-indigo-100 dark:border-indigo-900 space-y-2">
                <span className="text-[8px] uppercase font-mono font-bold text-slate-400 block tracking-widest text-center">
                  RANGO DEL FLUJO CONTINUO (MISMO TICKET)
                </span>
                
                <div className="relative py-1 flex items-center justify-between">
                  {Object.values(PHASES_CONFIG).map((p, pIdx) => {
                    const phasesList = Object.values(PHASES_CONFIG);
                    const currentPhaseIdx = phasesList.findIndex(x => x.id === activeTicket.currentPhase);
                    const isDone = pIdx < currentPhaseIdx;
                    const isCurrent = pIdx === currentPhaseIdx;
                    
                    return (
                      <div key={p.id} className="flex flex-col items-center flex-1 relative z-10">
                        {/* Connector line between steps */}
                        {pIdx > 0 && (
                          <div className={`absolute top-2.5 w-full right-1/2 h-[2px] -z-10 ${
                            pIdx <= currentPhaseIdx ? "bg-indigo-600" : "bg-slate-200 dark:bg-slate-800"
                          }`} />
                        )}
                        <div className={`w-5.5 h-5.5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                          isDone 
                            ? "bg-emerald-500 text-white" 
                            : isCurrent 
                              ? "bg-indigo-600 text-white ring-4 ring-indigo-550/30" 
                              : "bg-slate-200 dark:bg-slate-800 text-slate-500"
                        }`}>
                          {isDone ? "✓" : pIdx + 1}
                        </div>
                        <span className={`text-[8px] mt-1 text-center scale-90 ${isCurrent ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-400"}`}>
                          {p.shortName.split(" ")[0]}
                        </span>
                      </div>
                    );
                  })}
                </div>
                
                <p className="text-[8px] uppercase text-indigo-700 dark:text-indigo-400 text-center font-bold">
                  {activeTicket.currentPhase === TicketPhase.CAJA && "➔ Al finalizar, pasará automáticamente a la siguiente cola de Tríada y Fotografía."}
                  {activeTicket.currentPhase === TicketPhase.TRIADA && "➔ Última fase. Al finalizar, el ciudadano se completa."}
                </p>
              </div>

              {/* ACTION TOOLBARS */}
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-indigo-100 dark:border-indigo-900">
                {activeTicket.status === TicketStatus.CALLING ? (
                  <button
                    id="btn-action-start"
                    onClick={() => onStartAttending(currentCubicle.id)}
                    className="w-full py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider rounded-none cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Play className="w-3.5 h-3.5" />
                    Iniciar Atención
                  </button>
                ) : (
                  <button
                    id="btn-action-complete"
                    onClick={() => onComplete(currentCubicle.id)}
                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider rounded-none cursor-pointer flex items-center justify-center gap-1"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Finalizar Trámite
                  </button>
                )}

                <button
                  id="btn-action-recall"
                  onClick={() => onRecall(currentCubicle.id)}
                  className="w-full py-2 bg-white hover:bg-slate-100 dark:bg-slate-800 dark:hover:bg-slate-750 text-indigo-700 dark:text-indigo-405 border border-indigo-300 font-bold text-xs uppercase tracking-wider rounded-none transition-all cursor-pointer flex items-center justify-center gap-1"
                  title="Re-llamar al altavoz"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                  Re-Llamar
                </button>

                <button
                  id="btn-action-miss"
                  onClick={() => onMiss(currentCubicle.id)}
                  className="col-span-2 w-full py-2 bg-slate-100 hover:bg-rose-100 text-slate-700 hover:text-rose-700 dark:bg-slate-800 dark:hover:bg-slate-700 font-bold text-[10px] uppercase rounded-none cursor-pointer flex items-center justify-center gap-1"
                  title="Marca cliente como ausente"
                >
                  <UserX className="w-3 h-3" />
                  No se presentó (Marcar Ausente)
                </button>
              </div>
            </div>
          ) : (
            <div className="border-2 border-slate-900 dark:border-slate-850 border-dashed rounded-none p-6 text-center space-y-3 bg-slate-50 dark:bg-slate-950">
              <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Módulo Disponible</p>
              
              <button
                id="btn-call-next-ticket"
                disabled={currentCubicle.status === CubicleStatus.BREAK || currentCubicle.status === CubicleStatus.OFFLINE || sortedCandidates.length === 0}
                onClick={() => onCallNext(currentCubicle.id)}
                className={`px-4 py-3 w-full font-bold text-xs uppercase tracking-widest rounded-none transition-all flex items-center justify-center gap-1.5 ${
                  currentCubicle.status === CubicleStatus.BREAK || currentCubicle.status === CubicleStatus.OFFLINE
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed"
                    : sortedCandidates.length === 0
                      ? "bg-indigo-300 text-white cursor-not-allowed"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                }`}
              >
                {currentCubicle.status === CubicleStatus.BREAK ? (
                  "Módulo en Receso"
                ) : currentCubicle.status === CubicleStatus.OFFLINE ? (
                  "Módulo Desconectado"
                ) : sortedCandidates.length === 0 ? (
                  "Ningún ticket en cola"
                ) : (
                  <>
                    <span>Llamar Siguiente Turno</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* CANDIDATE LIST FOR THIS AGENT */}
        <div className="space-y-1 rounded-none">
          <div className="flex justify-between text-[9px] uppercase font-bold text-slate-400">
            <span>COLA EXCLUSIVA COMPATIBLE ({sortedCandidates.length})</span>
          </div>

          {sortedCandidates.length > 0 ? (
            <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
              {sortedCandidates.slice(0, 3).map((item) => (
                <div key={item.id} className="p-2 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-none flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold font-mono text-indigo-700 bg-indigo-50 dark:bg-slate-900 border border-slate-200 px-1.5 py-0.5 rounded-none text-[10px]">
                      {item.numberCode}
                    </span>
                    <span className="font-bold text-slate-700 dark:text-slate-300 truncate max-w-[110px] uppercase">{item.name}</span>
                  </div>

                  <div className="flex items-center gap-1">
                    {item.priority && (
                      <span className="px-1 bg-amber-500 text-white text-[8px] font-bold uppercase rounded-none">
                        PREF
                      </span>
                    )}
                    <span className="text-[9px] text-slate-500 font-mono">
                      {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                </div>
              ))}
              {sortedCandidates.length > 3 && (
                <p className="text-[9px] text-slate-500 uppercase font-mono tracking-wider italic text-center">
                  + {sortedCandidates.length - 3} turnos más compatibles
                </p>
              )}
            </div>
          ) : (
            <div className="p-3 border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 rounded-none text-center text-[9px] text-slate-400 uppercase tracking-widest font-mono">
              Sin turnos compatibles.
            </div>
          )}
        </div>
      </div>

      {/* METRICS UNDERLAY */}
      <div className="border-t border-slate-200 dark:border-slate-800 pt-3 flex items-center justify-between text-xs mt-3">
        <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-450 uppercase text-[9px] font-mono font-bold tracking-wider">
          <Award className="w-4 h-4 text-slate-400" />
          <span>Atendidos hoy:</span>
          <span className="font-mono font-bold bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 text-slate-900 dark:text-white border">{currentCubicle.totalAttendedCount}</span>
        </div>
      </div>
    </div>
  );
}
