/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Ticket, Cubicle, TicketStatus, SERVICES_CONFIG, ServiceType, OFFICES_CONFIG } from "../types";
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
  HelpCircle,
  FileText,
  Download,
  Volume2,
  Cpu,
  SlidersHorizontal,
  SunDim,
  RefreshCw,
  Sparkle,
  Database,
  FileJson,
  Upload,
  ShieldCheck,
  Check,
  Calendar,
  AlertTriangle,
  Plus,
  Trash,
  MapPin,
  Building2
} from "lucide-react";
import { generatePDFReport } from "../utils/reportGenerator";
import { REGISTRO_PROCEDURES } from "./WelcomeKiosk";
import { playCallingChime, speakCall } from "../utils/audio";

import { Copy, Cloud, Link, ExternalLink } from "lucide-react";
import { getOfficeSchedule, saveOfficeSchedule, OfficeSchedule } from "../utils/scheduleStorage";

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
  onPurgeOldTickets?: () => void;
  currentOfficeId?: string;
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
  onToggleAutoAssign,
  onPurgeOldTickets,
  currentOfficeId = "OFF-1"
}: ControlDashboardProps) {

  // --- ESTADOS LOCALES PARA LAS 4 OPTIMIZACIONES ---
  const [ttsRate, setTtsRate] = React.useState<number>(() => {
    const saved = localStorage.getItem("ticket_tts_rate");
    return saved ? parseFloat(saved) : 0.95;
  });
  const [ttsPitch, setTtsPitch] = React.useState<number>(() => {
    const saved = localStorage.getItem("ticket_tts_pitch");
    return saved ? parseFloat(saved) : 1.05;
  });
  const [ttsVoicePref, setTtsVoicePref] = React.useState<string>(() => {
    return localStorage.getItem("ticket_tts_voice_pref") || "female";
  });
  const [ecoMode, setEcoMode] = React.useState<boolean>(() => {
    return localStorage.getItem("eco_mode_active") === "true";
  });
  const [limitHistory, setLimitHistory] = React.useState<boolean>(() => {
    return localStorage.getItem("limitar_historial_tv") !== "false";
  });
  const [purgeSuccess, setPurgeSuccess] = React.useState<boolean>(false);

  // --- ESTADOS DE CONTROL PARA HORARIOS Y CALENDARIO REGIONAL ---
  const [schedule, setSchedule] = React.useState<OfficeSchedule>(() => {
    return getOfficeSchedule(currentOfficeId);
  });
  const [customHolidayDate, setCustomHolidayDate] = React.useState<string>("");
  const [scheduleSuccessMsg, setScheduleSuccessMsg] = React.useState<string>("");

  // --- ESTADOS LOCALES PARA RANGO DE FECHAS DE REPORTES (DESDE / HASTA) ---
  const [reportDateFrom, setReportDateFrom] = React.useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30); // 30 days ago by default
    return d.toISOString().split("T")[0];
  });
  const [reportDateTo, setReportDateTo] = React.useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  React.useEffect(() => {
    setSchedule(getOfficeSchedule(currentOfficeId));
  }, [currentOfficeId]);

  const handleUpdateSchedule = (updated: OfficeSchedule) => {
    setSchedule(updated);
    saveOfficeSchedule(currentOfficeId, updated);
    setScheduleSuccessMsg("¡Horarios y calendario actualizados con éxito!");
    setTimeout(() => setScheduleSuccessMsg(""), 3000);
  };

  // Guardado automático y despacho de eventos en localStorage
  React.useEffect(() => {
    localStorage.setItem("ticket_tts_rate", ttsRate.toString());
  }, [ttsRate]);

  React.useEffect(() => {
    localStorage.setItem("ticket_tts_pitch", ttsPitch.toString());
  }, [ttsPitch]);

  React.useEffect(() => {
    localStorage.setItem("ticket_tts_voice_pref", ttsVoicePref);
  }, [ttsVoicePref]);

  React.useEffect(() => {
    localStorage.setItem("eco_mode_active", ecoMode ? "true" : "false");
    window.dispatchEvent(new Event("storage"));
  }, [ecoMode]);

  React.useEffect(() => {
    localStorage.setItem("limitar_historial_tv", limitHistory ? "true" : "false");
    window.dispatchEvent(new Event("storage"));
  }, [limitHistory]);

  const handleTestTtsLocal = async () => {
    try {
      await playCallingChime();
      await new Promise(r => setTimeout(r, 450));
      await speakCall("OP-04", "Juan Pérez", "Módulo de Prueba Optimizada");
    } catch (e) {
      console.warn("Speech Synthesis blocked inside browser sandbox.", e);
    }
  };

  const handleTriggerPurge = () => {
    if (onPurgeOldTickets) {
      onPurgeOldTickets();
      setPurgeSuccess(true);
      setTimeout(() => setPurgeSuccess(false), 3000);
    }
  };
  const totalCreated = tickets.length;
  const totalCompleted = tickets.filter(t => t.status === TicketStatus.COMPLETED).length;
  const totalWaiting = tickets.filter(t => t.status === TicketStatus.WAITING).length;
  const totalCalling = tickets.filter(t => t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING).length;
  const totalMissed = tickets.filter(t => t.status === TicketStatus.MISSED).length;

  const resolutionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;
  
  // Average queuing time estimate
  const activeAgentsCount = cubicles.filter(c => c.status !== "OFFLINE").length || 1;
  const estWaitTimeMin = Math.max(0, Math.round((totalWaiting * 8) / activeAgentsCount));

  // --- CALCULATIONS FOR INSPECTOR DE SEDE REGIONAL (REGISTRO CIVIL) ---
  const officeInfo = React.useMemo(() => {
    return OFFICES_CONFIG.find(o => o.id === currentOfficeId) || OFFICES_CONFIG[0];
  }, [currentOfficeId]);

  const filteredRegistroTickets = React.useMemo(() => {
    return tickets.filter(t => t.serviceType === ServiceType.REGISTRO);
  }, [tickets]);

  const completedRegistroTickets = React.useMemo(() => {
    return filteredRegistroTickets.filter(t => t.status === TicketStatus.COMPLETED);
  }, [filteredRegistroTickets]);

  const rcProcedureCounts = React.useMemo(() => {
    const counts: Record<string, number> = {};
    REGISTRO_PROCEDURES.forEach(p => {
      counts[p.id] = 0;
    });
    filteredRegistroTickets.forEach(t => {
      if (t.procedure && counts[t.procedure] !== undefined) {
        counts[t.procedure]++;
      }
    });
    return counts;
  }, [filteredRegistroTickets]);

  const { rcAvgWaitTime, rcAvgServiceTime } = React.useMemo(() => {
    let totalWaitMins = 0;
    let totalServiceMins = 0;
    let ratedTicketsCount = 0;
    
    completedRegistroTickets.forEach(t => {
      const wait = t.calledAt ? (t.calledAt - t.createdAt) / 1000 / 60 : 7;
      const serv = (t.completedAt && t.calledAt) ? (t.completedAt - t.calledAt) / 1000 / 60 : 10;
      
      totalWaitMins += Math.max(0.5, wait);
      totalServiceMins += Math.max(0.5, serv);
      ratedTicketsCount++;
    });
    
    const avgWait = ratedTicketsCount > 0 ? Math.round(totalWaitMins / ratedTicketsCount) : 8;
    const avgService = ratedTicketsCount > 0 ? Math.round(totalServiceMins / ratedTicketsCount) : 11;
    return { rcAvgWaitTime: avgWait, rcAvgServiceTime: avgService };
  }, [completedRegistroTickets]);

  return (
    <div id="control-dashboard-panel" className="max-w-6xl mx-auto w-full bg-white border border-slate-250 rounded-2xl p-6 flex flex-col justify-between h-full min-h-[580px] shadow-sm">
      <div className="space-y-6">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#122e70] text-white rounded-xl shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">
                Panel de Control de Administración
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Gestión de Tráfico, Sede y Métricas</p>
            </div>
          </div>
          <span className="px-2 py-1 text-[8.5px] uppercase font-mono bg-slate-105 text-slate-700 rounded border border-slate-200 font-bold">
            SISTEMA ACTIVO
          </span>
        </div>

        {/* Dynamic Bento Columns Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
          
          {/* COLUMNA IZQUIERDA: Configuración y Operación */}
          <div className="space-y-5">

        {/* --- SIMULATED USER GENERATOR ENGINE --- */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
              Generador de Tráfico
            </h4>
            <span className={`px-2 py-0.5 rounded text-[8px] border font-black uppercase transition-colors ${
              isSimulationActive ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm" : "bg-slate-200 text-slate-500 border-slate-300"
            }`}>
              {isSimulationActive ? "AUTOMÁTICO" : "MANUAL"}
            </span>
          </div>

          <p className="text-[10.5px] font-medium text-slate-550 leading-relaxed">
            Simula la llegada continua de ciudadanos solicitando turnos a los módulos activos.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {/* Auto arrivals button toggle */}
            <button
              id="btn-toggle-traffic-simulation"
              onClick={() => onToggleSimulation(!isSimulationActive)}
              className={`p-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isSimulationActive
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100"
                  : "bg-[#122e70] hover:bg-[#1d428a] text-white shadow-blue-105"
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
              className="p-3 bg-white hover:bg-slate-100 border border-slate-250 text-slate-800 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#122e70]" />
              NUEVO CLIENTE
            </button>
          </div>

          {/* Speed settings slider */}
          {isSimulationActive && (
            <div className="space-y-2 pt-2.5 border-t border-slate-200">
              <div className="flex justify-between text-[8px] font-extrabold uppercase text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-[#122e70]" /> Frecuencia de Llegada:
                </span>
                <span className="text-[#122e70] font-black">Cada {simulationSpeed / 1000}s</span>
              </div>
              <input
                id="range-simulation-frequency"
                type="range"
                min={3000}
                max={30000}
                step={1000}
                value={simulationSpeed}
                onChange={(e) => onSetSimulationSpeed(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-700"
              />
              <div className="flex justify-between text-[8px] text-slate-400 font-mono font-bold">
                <span>Rápido (3s)</span>
                <span>Pausado (30s)</span>
              </div>
            </div>
          )}
        </div>

        {/* --- SYSTEM AUTO-ASSIGN SERVICE --- */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-extrabold text-slate-705 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Sparkles className="w-4 h-4 text-[#122e70]" />
              Asignación Automática
            </h4>
            
            <button
              id="btn-toggle-auto-assign"
              onClick={() => onToggleAutoAssign?.(!isAutoAssignActive)}
              className={`px-2 py-0.5 rounded text-[8px] border font-black uppercase transition-all cursor-pointer ${
                isAutoAssignActive 
                  ? "bg-[#122e70] text-white border-blue-900 shadow-sm" 
                  : "bg-slate-205 text-slate-500 border-slate-300"
              }`}
            >
              {isAutoAssignActive ? "DESPACHO ACTIVO" : "MANUAL / POR LLAMADO"}
            </button>
          </div>

          <p className="text-[10px] font-medium text-slate-550 leading-relaxed font-sans">
            {isAutoAssignActive 
              ? "Los turnos se asignan al instante a agentes libres y se emite notificación de voz por altavoz (Automatizado)."
              : "Los agentes deben presionar manualmente 'Llamar Siguiente Turno' desde su consola para recibir trámites."
            }
          </p>

          <div className="flex items-center gap-2 pt-1 font-bold">
            <button
              id="btn-auto-assign-on"
              onClick={() => onToggleAutoAssign?.(true)}
              className={`flex-1 py-1.5 px-2 text-[10px] font-extrabold border rounded-lg transition-all cursor-pointer text-center uppercase tracking-wider ${
                isAutoAssignActive 
                  ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                  : "bg-white border-slate-250 hover:bg-slate-100 text-slate-700"
              }`}
            >
              Auto-Despacho
            </button>
            <button
              id="btn-auto-assign-off"
              onClick={() => onToggleAutoAssign?.(false)}
              className={`flex-1 py-1.5 px-2 text-[10px] font-extrabold border rounded-lg transition-all cursor-pointer text-center uppercase tracking-wider ${
                !isAutoAssignActive 
                  ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                  : "bg-white border-slate-250 hover:bg-slate-100 text-slate-700"
              }`}
            >
              Manual
            </button>
          </div>
        </div>

        {/* --- DYNAMIC OFFICE SCHEDULES & CALENDAR MANAGEMENT SECTION --- */}
        <div id="office-schedule-calendar-manager" className="bg-[#122e70]/5 border border-[#122e70]/15 p-4 rounded-xl space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Calendar className="w-4 h-4 text-[#122e70]" />
              Horarios y Calendario (Sede Local)
            </h4>
            <span className="text-[8px] bg-[#122e70]/10 border border-[#122e70]/20 text-[#122e70] px-1.5 py-0.5 rounded font-black font-mono">
              {currentOfficeId}
            </span>
          </div>

          <p className="text-[10px] font-medium text-slate-550 leading-relaxed font-sans">
            Ajuste el horario diario de atención ciudadana y configure los días feriados o libres no laborales para el Kiosco de Emisión de Turnos de esta regional.
          </p>

          <div className="space-y-3 pt-1">
            {/* 1. START & END TIMES */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg space-y-2 shadow-xs">
              <span className="text-[8.5px] font-black uppercase text-slate-550 tracking-wider block font-sans">
                Rango Horario de Trabajo
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase mb-1">
                    Hora de Apertura:
                  </label>
                  <input
                    type="time"
                    value={schedule.openTime}
                    onChange={(e) => handleUpdateSchedule({ ...schedule, openTime: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-2 py-1.5 bg-slate-50 border border-slate-200 rounded focus:border-blue-700 focus:ring-1 focus:ring-blue-700/10 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase mb-1">
                    Hora de Cierre:
                  </label>
                  <input
                    type="time"
                    value={schedule.closeTime}
                    onChange={(e) => handleUpdateSchedule({ ...schedule, closeTime: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-2 py-1.5 bg-slate-50 border border-slate-200 rounded focus:border-blue-700 focus:ring-1 focus:ring-blue-700/10 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. WEEKDAY SETTINGS */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg space-y-2 shadow-xs">
              <span className="text-[8.5px] font-black uppercase text-slate-550 tracking-wider block font-sans">
                Días de Operación de la Sede
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Dom", index: 0 },
                  { label: "Lun", index: 1 },
                  { label: "Mar", index: 2 },
                  { label: "Mié", index: 3 },
                  { label: "Jue", index: 4 },
                  { label: "Vie", index: 5 },
                  { label: "Sáb", index: 6 }
                ].map((day) => {
                  const isClosed = schedule.closedDays.includes(day.index);
                  return (
                    <button
                      key={day.index}
                      type="button"
                      onClick={() => {
                        const newClosed = isClosed
                          ? schedule.closedDays.filter(d => d !== day.index)
                          : [...schedule.closedDays, day.index];
                        handleUpdateSchedule({ ...schedule, closedDays: newClosed });
                      }}
                      className={`flex-1 py-1.5 px-0.5 text-[8.5px] font-black rounded transition-all cursor-pointer border text-center uppercase ${
                        isClosed
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : "bg-emerald-50 border-emerald-250 text-emerald-800"
                      }`}
                      title={`${day.label}: ${isClosed ? "No Laborable / Cerrado" : "Laborable / Abierto"}`}
                    >
                      {day.label}
                      <span className="block text-[6.5px] font-bold opacity-60 mt-0.5">
                        {isClosed ? "Cerrado" : "Abierto"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. TEMPORARY EMERGENCY CLOSURE */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="block text-[8.5px] font-black uppercase text-slate-700 tracking-wider">
                    Cerrar Sede Especial (Emergencias / Contingencias)
                  </span>
                  <p className="text-[8px] text-slate-400 font-medium">
                    Suspende instantáneamente la emisión de tickets con aviso opcional.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={schedule.tempClosed}
                    onChange={(e) => handleUpdateSchedule({ ...schedule, tempClosed: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full border border-slate-350 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              {schedule.tempClosed && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="block text-[8px] font-extrabold text-slate-450 uppercase">
                    Motivo oficial expresado a los ciudadanos:
                  </label>
                  <input
                    type="text"
                    placeholder="Escriba la causa (ej: Cierre Temporal por Red Eléctrica, Contingencia Sanitaria...)"
                    value={schedule.tempClosedReason}
                    onChange={(e) => handleUpdateSchedule({ ...schedule, tempClosedReason: e.target.value })}
                    className="w-full text-[10px] font-sans px-2.5 py-1.5 bg-rose-50/50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-rose-400"
                  />
                </div>
              )}
            </div>

            {/* 4. HOLIDAY MANAGER */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg space-y-2.5 shadow-xs">
              <div className="flex justify-between items-center">
                <span className="text-[8.5px] font-black uppercase text-slate-550 tracking-wider block font-sans">
                  Calendario de Días Feriados y Libres
                </span>
                <span className="text-[8px] opacity-60 font-mono font-bold">
                  {schedule.specificHolidays.length} activos
                </span>
              </div>

              {/* Add Custom Date off */}
              <div className="flex gap-1.5">
                <input
                  type="date"
                  value={customHolidayDate}
                  onChange={(e) => setCustomHolidayDate(e.target.value)}
                  className="flex-1 text-[10px] font-sans px-2 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-blue-700"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customHolidayDate && !schedule.specificHolidays.includes(customHolidayDate)) {
                      const updatedHolidays = [...schedule.specificHolidays, customHolidayDate].sort();
                      handleUpdateSchedule({ ...schedule, specificHolidays: updatedHolidays });
                      setCustomHolidayDate("");
                    }
                  }}
                  disabled={!customHolidayDate}
                  className="px-2.5 bg-[#122e70] hover:bg-blue-800 text-white rounded text-[9.5px] font-black uppercase tracking-wider disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              </div>

              {/* List of active non-working holiday dates */}
              {schedule.specificHolidays.length > 0 ? (
                <div className="max-h-[140px] overflow-y-auto border border-slate-100 rounded bg-slate-50/50 p-1 divide-y divide-slate-150">
                  {schedule.specificHolidays.map((holidayStr) => {
                    const parsedDate = new Date(`${holidayStr}T00:00:00`);
                    const formattedDisplay = parsedDate.toLocaleDateString("es-PA", {
                      day: "numeric",
                      month: "short"
                    });
                    return (
                      <div key={holidayStr} className="flex justify-between items-center py-1 px-1.5 text-[10px]">
                        <span className="font-mono text-slate-700 flex items-center gap-1.5">
                          🔴 {formattedDisplay} ({holidayStr})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedHolidays = schedule.specificHolidays.filter(h => h !== holidayStr);
                            handleUpdateSchedule({ ...schedule, specificHolidays: updatedHolidays });
                          }}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-100/50 p-1 rounded transition-all"
                          title="Eliminar día de descanso"
                        >
                          <Trash className="w-3.5 h-3.5 text-rose-500 hover:text-rose-700" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[9px] text-slate-400 text-center py-2 font-medium">
                  No hay feriados o días libres configurados para esta regional.
                </p>
              )}
            </div>

            {/* Display Success messages */}
            {scheduleSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[9.5px] text-emerald-850 text-center font-bold font-mono">
                ✔️ {scheduleSuccessMsg}
              </div>
            )}
          </div>
        </div>

          </div> {/* Cierre de COLUMNA IZQUIERDA */}

          {/* COLUMNA DERECHA: Métricas, Inspector de Registro Civil y Reportes */}
          <div className="space-y-6">

        {/* --- STATS KPIs BENTO GRAPH --- */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-slate-450">
              <Users className="w-3.5 h-3.5 text-[#122e70]" />
              <span>Cola Actual</span>
            </div>
            <div className="mt-2 text-slate-950 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">{totalWaiting}</span>
              <span className="text-[8px] uppercase text-slate-400 font-mono font-bold">esperas</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-slate-450">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>Atendidos</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-600">{totalCompleted}</span>
              <span className="text-[8px] uppercase text-slate-400 font-mono font-bold">tickets</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-slate-450">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Espera Estimada</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">~{estWaitTimeMin}</span>
              <span className="text-[8px] uppercase text-slate-400 font-mono font-bold">minutos</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-slate-450">
              <TrendingUp className="w-3.5 h-3.5 text-[#122e70]" />
              <span>Éxito de Atención</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-rose-650">{resolutionRate}%</span>
              <span className="text-[8px] uppercase text-slate-405 font-mono font-bold">de {totalCreated}</span>
            </div>
          </div>
        </div>

        {/* --- INSPECTOR DE SEDE REGIONAL (REGISTRO CIVIL) --- */}
        <div id="civil-registry-specialized-metrics" className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col space-y-4">
          
          <div className="border-b border-slate-100 pb-3.5 space-y-1 text-left">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#122e70] flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-amber-500 shrink-0" />
              Inspector de Sede Regional (Registro Civil)
            </h3>
            <p className="text-[9.5px] font-medium text-slate-400 leading-normal font-sans">
              Inspeccione la volumetría por trámite específico en la sede seleccionada.
            </p>
          </div>

          {/* Sede Select card details */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2 text-left">
            <span className="text-[7.5px] tracking-[0.2em] font-black text-blue-650 bg-blue-50 border border-blue-100 rounded px-1.5 py-0.5 uppercase block w-fit">
              ID SECTOR: {officeInfo.id}
            </span>
            <h4 className="text-[11px] font-black uppercase text-slate-800 leading-tight">
              {officeInfo.name}
            </h4>
            <span className="text-[9px] text-slate-450 uppercase font-black flex items-center gap-1">
              <MapPin className="w-3 h-3 text-blue-600 shrink-0" />
              {officeInfo.address}
            </span>
          </div>

          {/* Service Volume Breakdown inside chosen office */}
          <div className="space-y-3 text-left">
            <span className="text-[9.5px] font-extrabold text-[#122e70] uppercase tracking-wider block font-sans">
              Trámites de Registro Civil (MES)
            </span>

            {/* Scrollable list of specific procedures matching screenshot */}
            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1 scrollbar-thin">
              {REGISTRO_PROCEDURES.map((proc) => {
                const count = rcProcedureCounts[proc.id] || 0;
                const pct = filteredRegistroTickets.length > 0 
                  ? Math.round((count / filteredRegistroTickets.length) * 100) 
                  : 0;

                return (
                  <div key={proc.id} className="space-y-1 bg-slate-50/60 border border-slate-100 p-2.5 rounded-xl hover:bg-slate-100/70 transition-all shadow-xxs">
                    <div className="flex items-start justify-between gap-1.5 text-[9.5px]">
                      <span className="font-extrabold uppercase text-slate-705 tracking-wide flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 bg-[#122e70]/10 text-[#122e70] font-black rounded text-[8px] shrink-0 font-mono">
                          {proc.id}
                        </span>
                        <span className="truncate max-w-[180px]" title={proc.name}>
                          {proc.name}
                        </span>
                      </span>
                      <span className="font-mono font-black text-slate-800 shrink-0">
                        {count} <span className="text-[8px] font-semibold text-slate-400">({pct}%)</span>
                      </span>
                    </div>

                    {/* Progress relative bar */}
                    <div className="h-1.5 w-full bg-slate-200/50 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-650 to-indigo-700 rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-[8px] text-slate-400 block leading-none font-medium truncate font-sans">
                      {proc.description}
                    </span>
                  </div>
                );
              })}

              {filteredRegistroTickets.length === 0 && (
                <div className="text-center py-8 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  Sin tickets de Registro Civil
                </div>
              )}
            </div>
          </div>

          {/* Specific local stats of the regional office */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
            
            <div className="bg-indigo-50/40 p-2.5 border border-indigo-100 rounded-xl">
              <span className="block text-[8px] font-black text-indigo-500 uppercase tracking-wider font-sans">
                T. Medio Espera
              </span>
              <p className="text-sm font-black text-indigo-950 font-mono mt-0.5">
                {rcAvgWaitTime} <span className="text-[10px] font-semibold text-slate-550 font-sans">mins</span>
              </p>
            </div>

            <div className="bg-emerald-50/40 p-2.5 border border-emerald-100 rounded-xl">
              <span className="block text-[8px] font-black text-emerald-500 uppercase tracking-wider font-sans">
                T. de Atención
              </span>
              <p className="text-sm font-black text-[#122e70] font-mono mt-0.5">
                {rcAvgServiceTime} <span className="text-[10px] font-semibold text-slate-550 font-sans">mins</span>
              </p>
            </div>
          </div>

          {/* Interactive info warning banner matches screenshot */}
          <div className="bg-amber-50 border border-amber-200 p-3.5 rounded-xl flex items-start gap-2 text-left">
            <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="block text-[8.5px] font-black text-amber-850 uppercase tracking-wide">
                Reportes en Línea Autorizados
              </span>
              <p className="text-[8px] leading-normal font-semibold text-amber-700 font-sans">
                Los datos de Registro Civil visualizados en este inspector se recalculan en tiempo de ejecución para generar reportes sobre la eficiencia operacional de esta oficina regional.
              </p>
            </div>
          </div>
        </div>

        {/* --- REPORT GENERATOR HUB --- */}
        <div id="pdf-report-generator-section" className="bg-[#f0f4ff]/40 border border-blue-150 p-4 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-[#122e70] uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <FileText className="w-4 h-4 text-[#122e70]" />
              Reportes e Informes de Gestión
            </h4>
            <span className="text-[8px] bg-blue-100 text-[#122e70] px-1.5 py-0.5 rounded font-black font-mono">
              PDF EXPORT
            </span>
          </div>

          <p className="text-[10px] font-medium text-slate-550 leading-relaxed font-sans">
            Genere y descargue reportes oficiales en formato PDF con métricas del flujo continuo de ciudadanos, tiempos en sala de espera y eficiencias de los agentes.
          </p>

          {/* Date range inputs */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div className="flex flex-col gap-1 text-left">
              <label htmlFor="report-from-date" className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider font-sans">
                Desde:
              </label>
              <input
                id="report-from-date"
                type="date"
                value={reportDateFrom}
                onChange={(e) => setReportDateFrom(e.target.value)}
                className="w-full bg-white border border-slate-250 p-1.5 text-[11px] rounded-lg font-mono text-slate-800 focus:border-[#122e70] outline-none"
              />
            </div>
            <div className="flex flex-col gap-1 text-left">
              <label htmlFor="report-to-date" className="text-[8.5px] font-black text-slate-500 uppercase tracking-wider font-sans">
                Hasta:
              </label>
              <input
                id="report-to-date"
                type="date"
                value={reportDateTo}
                onChange={(e) => setReportDateTo(e.target.value)}
                className="w-full bg-white border border-slate-250 p-1.5 text-[11px] rounded-lg font-mono text-slate-800 focus:border-[#122e70] outline-none"
              />
            </div>
          </div>

          {/* Action button */}
          <button
            id="btn-report-custom-range"
            onClick={() => {
              // Convert dates from YYYY-MM-DD to DD/MM/YYYY for presentation
              const formatDate = (ds: string) => {
                if (!ds) return "";
                const parts = ds.split("-");
                return `${parts[2]}/${parts[1]}/${parts[0]}`;
              };
              const periodStr = `Del ${formatDate(reportDateFrom)} al ${formatDate(reportDateTo)}`;
              generatePDFReport(tickets, cubicles, periodStr);
            }}
            className="w-full py-2 px-3 bg-[#122e70] hover:bg-indigo-900 text-white rounded-lg font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 mt-2"
            title="Generar informe consolidado del rango de fechas seleccionado"
          >
            <Download className="w-3.5 h-3.5 text-white" />
            <span>Generar Reporte de Gestión</span>
          </button>
        </div>

          </div> {/* Cierre de COLUMNA DERECHA */}
        </div> {/* Cierre de Grid Bento Columns */}



        {/* SYSTEM HARD RESET FLUSH BUTTONS */}
        <div className="pt-3 border-t border-slate-100">
          <button
            id="btn-reset-system"
            onClick={() => {
              if (window.confirm("¿Estás seguro de que quieres reiniciar totalmente el sistema de tickets? Se vaciarán colas e históricos.")) {
                onResetSystem();
              }
            }}
            className="w-full py-3 bg-rose-50 hover:bg-rose-100 border border-rose-250 text-rose-700 font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
            title="Formatea base de datos y borra localStorage"
          >
            <Trash2 className="w-4 h-4" />
            Reiniciar Sistema (Limpiar Todo)
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-2 text-center text-[9px] text-slate-400 font-mono font-bold flex items-center justify-center gap-1">
        <span>SISTEMA DE GESTIÓN DE COLAS</span>
      </div>
    </div>
  );
}
