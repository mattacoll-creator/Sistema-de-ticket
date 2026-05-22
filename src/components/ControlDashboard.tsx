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
  HelpCircle,
  FileText,
  Download,
  Volume2,
  Cpu,
  SlidersHorizontal,
  SunDim,
  RefreshCw,
  Sparkle
} from "lucide-react";
import { generatePDFReport } from "../utils/reportGenerator";
import { playCallingChime, speakCall } from "../utils/audio";

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
  onPurgeOldTickets
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
  
  // Calculate analytics metrics
  const totalCreated = tickets.length;
  const totalCompleted = tickets.filter(t => t.status === TicketStatus.COMPLETED).length;
  const totalWaiting = tickets.filter(t => t.status === TicketStatus.WAITING).length;
  const totalCalling = tickets.filter(t => t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING).length;
  const totalMissed = tickets.filter(t => t.status === TicketStatus.MISSED).length;

  const resolutionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;
  
  // Average queuing time estimate
  const activeAgentsCount = cubicles.filter(c => c.status !== "OFFLINE").length || 1;
  const estWaitTimeMin = Math.max(0, Math.round((totalWaiting * 8) / activeAgentsCount));

  return (
    <div id="control-dashboard-panel" className="bg-white border border-slate-250 rounded-2xl p-6 flex flex-col justify-between h-full min-h-[580px] shadow-sm">
      <div className="space-y-4">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#122e70] text-white rounded-xl shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">
                Panel de Control
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Configuración Global</p>
            </div>
          </div>
          <span className="px-2 py-1 text-[8.5px] uppercase font-mono bg-slate-105 text-slate-700 rounded border border-slate-200 font-bold">
            SISTEMA
          </span>
        </div>

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

        {/* --- MAP LAYOUT GRID SCHEMATIC --- */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5 shadow-sm">
          <span className="block text-[8.5px] uppercase tracking-wider font-extrabold text-slate-500 flex items-center gap-1 font-mono">
            <Layout className="w-3.5 h-3.5 text-[#122e70]" /> Monitoreo Óptico de Módulos:
          </span>
          
          <div className="grid grid-cols-4 gap-1.5 text-center pt-1">
            {cubicles.map((c) => {
              const isIdle = c.status === "ONLINE_AVAILABLE";
              const isBusy = c.status === "ATTENDING";
              return (
                <div key={c.id} className="p-1 px-1.5 font-sans rounded-lg border border-slate-150 text-[8px] bg-white flex flex-col justify-between h-14 shadow-xs">
                  <span className="font-extrabold text-slate-800 block truncate">{c.name.split(" ")[0]}</span>
                  
                  <div className="flex justify-center my-0.5">
                    <span className={`w-2.5 h-2.5 rounded-full border border-white ${isBusy ? "bg-[#122e70] animate-pulse" : isIdle ? "bg-emerald-500" : "bg-slate-300"}`} />
                  </div>
                  
                  <span className="text-[7.5px] uppercase text-slate-400 truncate block font-bold">
                    {isBusy ? "Activo" : isIdle ? "Libre" : "Fuera"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- PERFORMANCE GEARS & SYSTEM OPTIMIZER --- */}
        <div id="system-optimization-suite" className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Cpu className="w-4 h-4 text-indigo-650" />
              Optimización y Ajustes de Rendimiento
            </h4>
            <span className="text-[8px] bg-indigo-50 border border-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded font-black font-mono">
              SUITE OPTIMUS
            </span>
          </div>

          <p className="text-[10px] font-medium text-slate-550 leading-relaxed font-sans">
            Ajuste el timbre de los altavoces, limpie registros viejos de memoria local y configure recursos de visualización óptimos.
          </p>

          <div className="space-y-3 pt-1">
            {/* 1. TTS CONFIGURATOR (SLIDERS) */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-650" />
                  Sintonizador de Voces (TTS)
                </span>
                
                {/* Voice Selection Toggle */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTtsVoicePref("female")}
                    className={`px-1.5 py-0.5 text-[8px] font-extrabold uppercase rounded transition-all cursor-pointer ${
                      ttsVoicePref === "female"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-550 hover:bg-slate-150"
                    }`}
                  >
                    Fm
                  </button>
                  <button
                    onClick={() => setTtsVoicePref("male")}
                    className={`px-1.5 py-0.5 text-[8px] font-extrabold uppercase rounded transition-all cursor-pointer ${
                      ttsVoicePref === "male"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-550 hover:bg-slate-150"
                    }`}
                  >
                    Ms
                  </button>
                </div>
              </div>

              {/* TTS Speed Rate Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-bold text-slate-550 font-mono">
                  <span>VELOCIDAD DE VOZ</span>
                  <span className="text-indigo-650 font-black">{ttsRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.5}
                  step={0.05}
                  value={ttsRate}
                  onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                  title="Configura la velocidad a la que habla el sintetizador de voz"
                />
              </div>

              {/* TTS Pitch Tone Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-bold text-slate-550 font-mono">
                  <span>TONALIDAD / AGUDEZA (PITCH)</span>
                  <span className="text-indigo-650 font-black">{ttsPitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  value={ttsPitch}
                  onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                  title="Fija la agudeza o gravedad de la modulación hablada"
                />
              </div>

              {/* TTS Test Trigger button */}
              <button
                onClick={handleTestTtsLocal}
                className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-750 font-extrabold text-[9px] uppercase tracking-wider rounded transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1"
                title="Reproduce un arpegio y dicta un código de prueba para validar el volumen del navegador"
              >
                <SlidersHorizontal className="w-3 h-3 text-indigo-700 animate-spin-slow" />
                Probar Altavoz Sintetizado
              </button>
            </div>

            {/* 2. MEMORY CLEANER BUTTON */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between shadow-xs">
              <div className="space-y-0.5 max-w-[170px]">
                <span className="block text-[9px] font-black uppercase text-slate-700 tracking-wider">
                  Purgador de Memoria
                </span>
                <p className="text-[8px] font-medium text-slate-400 leading-tight">
                  Mantenga colas rápidas eliminando tickets antiguos resueltos de la memoria local.
                </p>
              </div>

              <button
                onClick={handleTriggerPurge}
                className={`py-2 px-3 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer border flex items-center gap-1 ${
                  purgeSuccess
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-[#122e70] hover:bg-indigo-800 border-[#122e70] text-white shadow-xs"
                }`}
                title="Purga y limpia los turnos inactivos e históricos liberando recursos de la memoria de React"
              >
                {purgeSuccess ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    ¡LIMPIO!
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 text-white" />
                    PURGAR
                  </>
                )}
              </button>
            </div>

            {/* 3. LIMITE HISTORIAL / PAGING TOGGLE */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between shadow-xs">
              <div className="space-y-0.5 max-w-[190px]">
                <span className="block text-[9px] font-black uppercase text-slate-700 tracking-wider font-sans">
                  Páginación de Turnos (Historial)
                </span>
                <p className="text-[8px] font-medium text-slate-400 leading-tight font-sans">
                  Limita la TV de la sala de espera a mostrar solo los 10 turnos completados más recientes.
                </p>
              </div>

              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={limitHistory}
                  onChange={(e) => setLimitHistory(e.target.checked)}
                  className="sr-only peer"
                  id="toggle-limit-history"
                />
                <label
                  htmlFor="toggle-limit-history"
                  className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-650 cursor-pointer"
                ></label>
              </div>
            </div>

            {/* 4. ECO-MODE SCREEN BURN-IN TOGGLE */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between shadow-xs">
              <div className="space-y-0.5 max-w-[190px]">
                <span className="text-[9px] font-black uppercase text-slate-705 tracking-wider flex items-center gap-1 font-sans">
                  <SunDim className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  Protección de Pantalla (Modo Eco)
                </span>
                <p className="text-[8px] font-medium text-slate-404 leading-tight font-sans">
                  Evita que las pantallas estáticas LED de recepción sufran quemado visual atenuando automáticamente el panel principal si la sala está inactiva.
                </p>
              </div>

              <div className="relative inline-flex items-center cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={ecoMode}
                  onChange={(e) => setEcoMode(e.target.checked)}
                  className="sr-only peer"
                  id="toggle-eco-mode"
                />
                <label
                  htmlFor="toggle-eco-mode"
                  className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500 cursor-pointer"
                ></label>
              </div>
            </div>
          </div>
        </div>

        {/* --- REPORT GENERATOR HUB --- */}
        <div id="pdf-report-generator-section" className="bg-[#f0f4ff]/40 border border-blue-150 p-4 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-[#122e70] uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <FileText className="w-4 h-4 text-[#122e70]" />
              Auditoría e Informes de Gestión
            </h4>
            <span className="text-[8px] bg-blue-100 text-[#122e70] px-1.5 py-0.5 rounded font-black font-mono">
              PDF EXPORT
            </span>
          </div>

          <p className="text-[10px] font-medium text-slate-550 leading-relaxed font-sans">
            Genere y descargue reportes oficiales en formato PDF con métricas del flujo continuo de ciudadanos, tiempos en sala de espera y eficiencias de los agentes.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              id="btn-report-dia"
              onClick={() => generatePDFReport(tickets, cubicles, "dia")}
              className="py-2.5 px-2 bg-white hover:bg-blue-50 border border-slate-250 hover:border-blue-300 text-slate-850 hover:text-[#122e70] rounded-lg font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center gap-1.5"
              title="Generar informe detallado de la jornada de hoy"
            >
              <Download className="w-3.5 h-3.5 text-blue-700" />
              <span>Día Actual</span>
            </button>

            <button
              id="btn-report-semana"
              onClick={() => generatePDFReport(tickets, cubicles, "semana")}
              className="py-2.5 px-2 bg-white hover:bg-blue-50 border border-slate-250 hover:border-blue-300 text-slate-850 hover:text-[#122e70] rounded-lg font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center gap-1.5"
              title="Generar consolidado de los últimos 7 días de operación"
            >
              <Download className="w-3.5 h-3.5 text-blue-700" />
              <span>Semanal</span>
            </button>

            <button
              id="btn-report-mes"
              onClick={() => generatePDFReport(tickets, cubicles, "mes")}
              className="py-2.5 px-2 bg-white hover:bg-blue-50 border border-slate-250 hover:border-blue-300 text-slate-850 hover:text-[#122e70] rounded-lg font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center gap-1.5"
              title="Generar análisis completo del presente mes"
            >
              <Download className="w-3.5 h-3.5 text-blue-700" />
              <span>Mensual</span>
            </button>
          </div>
        </div>

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
