/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Ticket, Cubicle, TicketStatus, SERVICES_CONFIG, ServiceType } from "../types";
import { 
  Settings, 
  Trash2, 
  UserPlus, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  Clock,
  Zap,
  Play,
  Pause,
  Sliders,
  Sparkles,
  Layout,
  HelpCircle
} from "lucide-react";

interface ControlDashboardProps {
  tickets: Ticket[];
  cubicles: Cubicle[];
  isSimulationActive: boolean;
  onToggleSimulation: (active: boolean) => void;
  simulationSpeed: number;
  onSetSimulationSpeed: (speed: number) => void;
  onCreateRandomTicket: () => void;
  onResetSystem: () => void;
  isAutoAssignActive?: boolean;
  onToggleAutoAssign?: (active: boolean) => void;
}

export default function ControlDashboard({
  tickets,
  cubicles,
  isSimulationActive,
  onToggleSimulation,
  simulationSpeed,
  onSetSimulationSpeed,
  onCreateRandomTicket,
  onResetSystem,
  isAutoAssignActive = true,
  onToggleAutoAssign
}: ControlDashboardProps) {
  
  // Calculate analytics metrics
  const totalCreated = tickets.length;
  const totalCompleted = tickets.filter(t => t.status === TicketStatus.COMPLETED).length;
  const totalWaiting = tickets.filter(t => t.status === TicketStatus.WAITING).length;
  const totalCalling = tickets.filter(t => t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING).length;
  const totalMissed = tickets.filter(t => t.status === TicketStatus.MISSED).length;

  const resolutionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;
  
  // Average queuing time estimate (sum of service average wait counts)
  // Each waiting client delays queue by some minutes divided by online agents
  const activeAgentsCount = cubicles.filter(c => c.status !== "OFFLINE").length || 1;
  const estWaitTimeMin = Math.max(0, Math.round((totalWaiting * 8) / activeAgentsCount));

  return (
    <div id="control-dashboard-panel" className="bg-white dark:bg-slate-900 border-2 border-slate-900 dark:border-slate-800 rounded-none p-6 flex flex-col justify-between h-full min-h-[580px]">
      <div className="space-y-4">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-none">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 dark:text-slate-100">
                Panel de Control
              </h3>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">Configuración Global</p>
            </div>
          </div>
          <span className="px-2 py-1 text-[8px] uppercase font-mono bg-slate-100 text-slate-900 dark:bg-slate-800 dark:text-slate-200 border border-slate-350 dark:border-slate-700 font-bold">
            SISTEMA
          </span>
        </div>

        {/* --- SIMULATED USER GENERATOR ENGINE --- */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-none border-2 border-slate-900 dark:border-slate-850 space-y-3.5">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500" />
              Generador de Tráfico
            </h4>
            <span className={`px-2 py-0.5 rounded-none text-[8px] border font-bold uppercase transition-colors ${
              isSimulationActive ? "bg-white text-emerald-800 border-emerald-500" : "bg-slate-100 dark:bg-slate-900 text-slate-500"
            }`}>
              {isSimulationActive ? "AUTOMÁTICO" : "MANUAL"}
            </span>
          </div>

          <p className="text-[10px] text-slate-500 uppercase tracking-tight font-serif">
            Simula la llegada continua de ciudadanos solicitando turnos a los módulos activos.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {/* Auto arrivals button toggle */}
            <button
              id="btn-toggle-traffic-simulation"
              onClick={() => onToggleSimulation(!isSimulationActive)}
              className={`p-3 rounded-none font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isSimulationActive
                  ? "bg-amber-600 hover:bg-amber-700 text-white"
                  : "bg-indigo-600 hover:bg-indigo-700 text-white"
              }`}
            >
              {isSimulationActive ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  PAUSAR FLUJO
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  AUTOMÁTICO
                </>
              )}
            </button>

            {/* Instant Random Single Arrival custom client */}
            <button
              id="btn-trigger-single-instant-client"
              onClick={onCreateRandomTicket}
              className="p-3 bg-white hover:bg-slate-100 dark:bg-slate-800 border-2 border-slate-900 dark:border-slate-700 text-slate-850 dark:text-slate-100 rounded-none font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              NUEVO CLIENTE
            </button>
          </div>

          {/* Speed settings slider */}
          {isSimulationActive && (
            <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-850">
              <div className="flex justify-between text-[8px] font-bold uppercase text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3" /> Frecuencia de Llegada:
                </span>
                <span className="text-indigo-600 font-black">Cada {simulationSpeed / 1000}s</span>
              </div>
              <input
                id="range-simulation-frequency"
                type="range"
                min={3000}
                max={30000}
                step={1000}
                value={simulationSpeed}
                onChange={(e) => onSetSimulationSpeed(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-none appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[8px] text-slate-400 font-mono">
                <span>Rápido (3s)</span>
                <span>Pausado (30s)</span>
              </div>
            </div>
          )}
        </div>

        {/* --- SYSTEM AUTO-ASSIGN SERVICE --- */}
        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-none border-2 border-slate-900 dark:border-slate-850 space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              Asignación Automática
            </h4>
            
            <button
              id="btn-toggle-auto-assign"
              onClick={() => onToggleAutoAssign?.(!isAutoAssignActive)}
              className={`px-2 py-0.5 rounded-none text-[8px] border font-bold uppercase transition-all cursor-pointer ${
                isAutoAssignActive 
                  ? "bg-indigo-600 text-white border-indigo-600 font-bold" 
                  : "bg-slate-150 dark:bg-slate-900 text-slate-550 border-slate-350 dark:border-slate-700"
              }`}
            >
              {isAutoAssignActive ? "AUTO-DESPACHO ACTIVO" : "MANUAL / POR LLAMADO"}
            </button>
          </div>

          <p className="text-[9px] text-slate-500 uppercase tracking-tight font-serif leading-relaxed">
            {isAutoAssignActive 
              ? "Los turnos se asignan al instante a agentes libres y se emite notificación de voz por altavoz (Automatizado)."
              : "Los agentes deben presionar manualmente 'Llamar Siguiente Turno' desde su consola para recibir trámites."
            }
          </p>

          <div className="flex items-center gap-2 pt-1">
            <button
              id="btn-auto-assign-on"
              onClick={() => onToggleAutoAssign?.(true)}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold border-2 transition-all cursor-pointer text-center uppercase tracking-wider ${
                isAutoAssignActive 
                  ? "bg-slate-900 dark:bg-slate-800 border-slate-900 dark:border-slate-700 text-white" 
                  : "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 border-slate-300 dark:border-slate-750 text-slate-750 dark:text-slate-350"
              }`}
            >
              Auto-Despacho
            </button>
            <button
              id="btn-auto-assign-off"
              onClick={() => onToggleAutoAssign?.(false)}
              className={`flex-1 py-1.5 px-2 text-[10px] font-bold border-2 transition-all cursor-pointer text-center uppercase tracking-wider ${
                !isAutoAssignActive 
                  ? "bg-slate-900 dark:bg-slate-800 border-slate-900 dark:border-slate-700 text-white" 
                  : "bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-850 border-slate-300 dark:border-slate-750 text-slate-750 dark:text-slate-350"
              }`}
            >
              Manual
            </button>
          </div>
        </div>

        {/* --- STATS KPIs BENTO GRAPH --- */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-none border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-slate-500">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              <span>Cola Actual</span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900 dark:text-white">{totalWaiting}</span>
              <span className="text-[8px] uppercase text-slate-400 font-mono">esperas</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-none border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-slate-500">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
              <span>Atendidos</span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{totalCompleted}</span>
              <span className="text-[8px] uppercase text-slate-400 font-mono">tickets</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-none border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-slate-500">
              <Clock className="w-3.5 h-3.5 text-indigo-500" />
              <span>Espera Estimada</span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-slate-900 dark:text-white">~{estWaitTimeMin}</span>
              <span className="text-[8px] uppercase text-slate-400 font-mono">minutos</span>
            </div>
          </div>

          <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-none border border-slate-200 dark:border-slate-800 flex flex-col justify-between">
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-slate-500">
              <TrendingUp className="w-3.5 h-3.5 text-indigo-500" />
              <span>Éxito de Atención</span>
            </div>
            <div className="mt-2.5 flex items-baseline gap-1.5">
              <span className="text-xl font-bold text-indigo-650 dark:text-indigo-400">{resolutionRate}%</span>
              <span className="text-[8px] uppercase text-slate-400 font-mono">de {totalCreated}</span>
            </div>
          </div>
        </div>

        {/* --- MAP LAYOUT GRID SCHEMATIC --- */}
        <div className="bg-slate-50 dark:bg-slate-950 p-3 rounded-none border border-slate-200 dark:border-slate-800 space-y-1.5">
          <span className="block text-[8px] uppercase tracking-wider font-bold text-slate-500 flex items-center gap-1">
            <Layout className="w-3 h-3" /> Distribución de Módulos (Estado):
          </span>
          
          <div className="grid grid-cols-4 gap-1.5 text-center pt-1">
            {cubicles.map((c) => {
              const isIdle = c.status === "ONLINE_AVAILABLE";
              const isBusy = c.status === "ATTENDING";
              return (
                <div key={c.id} className="p-1 px-1.5 font-sans rounded-none border text-[8px] bg-white dark:bg-slate-900 flex flex-col justify-between h-14">
                  <span className="font-bold text-slate-700 dark:text-slate-200 block truncate">{c.name.split(" ")[0]}</span>
                  
                  <div className="flex justify-center my-0.5">
                    <span className={`w-2.5 h-2.5 rounded-none border border-white ${isBusy ? "bg-indigo-600" : isIdle ? "bg-emerald-500" : "bg-slate-350"}`} />
                  </div>
                  
                  <span className="text-[7px] uppercase text-slate-400 truncate block">
                    {isBusy ? "Con Cliente" : isIdle ? "Libre" : "Fuera"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* SYSTEM HARD RESET FLUSH BUTTONS */}
        <div className="pt-3 border-t border-slate-200 dark:border-slate-850">
          <button
            id="btn-reset-system"
            onClick={() => {
              if (window.confirm("¿Estás seguro de que quieres reiniciar totalmente el sistema de tickets? Se vaciarán colas e históricos.")) {
                onResetSystem();
              }
            }}
            className="w-full py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-slate-900 dark:hover:bg-rose-950/20 border-2 border-rose-500 text-rose-700 font-bold text-xs rounded-none transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase tracking-wider"
            title="Formatea base de datos y borra localStorage"
          >
            <Trash2 className="w-4 h-4" />
            Reiniciar Sistema (Limpiar Todo)
          </button>
        </div>
      </div>

      <div className="border-t border-slate-200 dark:border-slate-850 pt-2 text-center text-[9px] text-slate-400 font-mono flex items-center justify-center gap-1">
        <span>SISTEMA DE GESTIÓN DE COLAS</span>
      </div>
    </div>
  );
}
