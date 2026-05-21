/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Ticket, Cubicle, TicketStatus, SERVICES_CONFIG, TicketPhase, PHASES_CONFIG } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, Tv, UserCheck, Users, HelpCircle, ArrowRight, UserMinus, ShieldAlert } from "lucide-react";

interface MainScreenProps {
  tickets: Ticket[];
  cubicles: Cubicle[];
  activeCall: { ticket: Ticket; cubicle: Cubicle } | null;
  onClearActiveCall: () => void;
  onTestSpeaker: () => void;
}

export default function MainScreen({ tickets, cubicles, activeCall, onClearActiveCall, onTestSpeaker }: MainScreenProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<"general" | TicketPhase>("general");

  // Maintain local clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch tickets currently waiting
  const waitingTickets = tickets.filter(t => t.status === TicketStatus.WAITING);
  
  // Sorted waiting queue (Priority gets moved to front)
  const sortedWaiting = [...waitingTickets].sort((a, b) => {
    if (a.priority && !b.priority) return -1;
    if (!a.priority && b.priority) return 1;
    return a.createdAt - b.createdAt;
  });

  // Filter based on active channel selection
  const filteredWaiting = selectedChannel === "general"
    ? sortedWaiting
    : sortedWaiting.filter(t => t.currentPhase === selectedChannel);

  // Filter active call based on channel selection
  const displayedActiveCall = activeCall && (selectedChannel === "general" || activeCall.ticket.currentPhase === selectedChannel)
    ? activeCall
    : null;

  // Filter cubicles based on channel selection
  const filteredCubicles = selectedChannel === "general"
    ? cubicles
    : cubicles.filter(c => c.supportedPhases?.includes(selectedChannel));

  // Recent completed or missed tickets
  const recentHistory = tickets
    .filter(t => t.status === TicketStatus.COMPLETED || t.status === TicketStatus.MISSED)
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, 5);

  return (
    <div id="main-public-screen" className="bg-slate-950 text-white rounded-none p-8 shadow-none border-2 border-slate-900 flex flex-col justify-between h-full min-h-[720px] overflow-hidden relative">
      {/* Background discrete clean gradient block */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/20 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative space-y-6 z-10 w-full">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-5">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-rose-600 text-white rounded-none shadow-lg shadow-rose-950/20">
              <Tv className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest text-slate-150">
                MONITOR DE SALA PÚBLICA
              </h3>
              <p className="text-xs text-indigo-400 font-mono uppercase tracking-wider mt-0.5 font-bold">
                SISTEMA ELECTRÓNICO DE TURNOS • VISTA INDUSTRIAL TV 55"
              </p>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Speaker Control & Test */}
            <div className="flex items-center gap-3 bg-slate-900 border border-slate-800 px-4 py-2 rounded-none font-mono text-xs tracking-wider">
              <button
                id="btn-test-voice"
                onClick={onTestSpeaker}
                className="text-indigo-400 hover:text-indigo-300 font-bold uppercase cursor-pointer"
              >
                PROBAR VOZ
              </button>
              <div className="h-4 w-[1px] bg-slate-800" />
              <button
                id="btn-toggle-sound"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 hover:bg-slate-800 transition-colors text-slate-400 cursor-pointer ${soundEnabled ? 'text-indigo-400 font-bold' : 'text-slate-500'}`}
                title={soundEnabled ? "Silenciar" : "Activar sonido"}
              >
                {soundEnabled ? <Volume2 className="w-4.5 h-4.5 animate-pulse" /> : <VolumeX className="w-4.5 h-4.5" />}
              </button>
            </div>

            {/* Smart Digital Clock */}
            <div className="text-right bg-slate-900/60 border border-slate-800/80 px-4 py-1.5">
              <p className="text-2xl font-mono font-black text-white leading-none tracking-wider">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-[10px] text-slate-400 font-mono tracking-widest uppercase mt-1 font-bold">
                {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
        </div>

        {/* --- INTERACTIVE TV CHANNEL SELECTORBAR --- */}
        <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-900 border-2 border-slate-800 rounded-none text-xs">
          <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider pl-2 pr-2 font-black">CANALES DE MONITOR:</span>
          
          <button
            onClick={() => setSelectedChannel("general")}
            className={`px-4 py-2 text-xs font-black uppercase transition-all cursor-pointer ${
              selectedChannel === "general"
                ? "bg-indigo-600 text-white font-bold shadow-md shadow-indigo-950/50"
                : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
            }`}
          >
            📺 MULTICANAL (TODOS)
          </button>
          
          {Object.entries(PHASES_CONFIG).map(([key, phase]) => {
            const isActive = selectedChannel === key;
            const waitingCount = sortedWaiting.filter(t => t.currentPhase === key).length;
            return (
              <button
                key={key}
                onClick={() => setSelectedChannel(key as TicketPhase)}
                className={`px-4 py-2 text-xs font-black uppercase transition-all cursor-pointer flex items-center gap-2 ${
                  isActive
                    ? "bg-white text-slate-950 font-black shadow-md"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${phase.color.split(" ")[0]} animate-ping`} />
                <span>PANTALLA {phase.shortName.toUpperCase()}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 font-bold ${
                  waitingCount > 0 ? "bg-rose-950 text-rose-300 border border-rose-800/55" : "bg-slate-900 text-slate-500"
                }`}>
                  {waitingCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* --- HERO: FLASHING CALL OUT SECTION --- */}
        <div id="hero-callout-screen" className="min-h-[190px] relative">
          <AnimatePresence mode="wait">
            {displayedActiveCall ? (
              <motion.div
                key={displayedActiveCall.ticket.id}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.98 }}
                transition={{ duration: 0.25 }}
                className="bg-indigo-950/80 border-4 border-indigo-505 rounded-none p-8 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl relative overflow-hidden ring-4 ring-indigo-500/30"
              >
                {/* Visual flashy background indicators */}
                <div className="absolute top-0 bottom-0 left-0 w-2.5 bg-rose-600 animate-pulse" />
                <div className="absolute top-0 bottom-0 right-0 w-2.5 bg-indigo-500 animate-pulse" />

                <div className="space-y-2 text-center lg:text-left z-10 w-full lg:w-auto">
                  <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3">
                    <span className="px-4 py-1 text-xs font-mono tracking-widest font-black uppercase bg-rose-600 text-white rounded-none animate-bounce">
                      🛎️ LLAMADA EN CURSO
                    </span>
                    {displayedActiveCall.ticket.priority && (
                      <span className="px-3 py-1 text-xs font-black bg-amber-500 text-white rounded-none uppercase flex items-center gap-1.5 shadow-md animate-pulse">
                        <ShieldAlert className="w-3.5 h-3.5" /> ATENCIÓN PRIORITARIA
                      </span>
                    )}
                  </div>
                  
                  <h1 className="text-7xl md:text-9xl font-black tracking-widest text-white py-1 font-mono leading-none filter drop-shadow-[0_4px_12px_rgba(255,255,255,0.15)] animate-pulse">
                    {displayedActiveCall.ticket.numberCode}
                  </h1>
                  <p className="text-xl font-black text-indigo-200 truncate max-w-[500px] uppercase tracking-wider">
                    {displayedActiveCall.ticket.name}
                  </p>
                  <div className="flex items-center justify-center lg:justify-start gap-3 mt-3">
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">IR DIRECTAMENTE A:</span>
                    <span className={`px-3 py-1 text-xs font-mono font-black uppercase shadow-sm border ${PHASES_CONFIG[displayedActiveCall.ticket.currentPhase].color}`}>
                      {PHASES_CONFIG[displayedActiveCall.ticket.currentPhase].name.toUpperCase()}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center bg-slate-900 border-4 border-rose-600 px-10 py-6 rounded-none text-center min-w-[320px] max-w-full z-10 shadow-2xl">
                  <span className="text-xs tracking-widest text-indigo-400 uppercase font-mono font-black">DIRÍJASE AL</span>
                  <p className="text-4xl md:text-6xl font-black text-white mt-1.5 uppercase font-mono tracking-wide">
                    {displayedActiveCall.cubicle.name.toUpperCase()}
                  </p>
                  <div className="h-0.5 w-16 bg-rose-600 my-2" />
                  <p className="text-xs text-slate-400 font-mono uppercase tracking-widest font-bold">ATENDIDO POR {displayedActiveCall.cubicle.agentName.toUpperCase()}</p>
                </div>

                {/* Dismiss Call indicator */}
                <button
                  id="btn-dismiss-active-call"
                  onClick={onClearActiveCall}
                  className="absolute top-4 right-4 text-indigo-400 hover:text-white p-2 rounded-none transition-colors cursor-pointer bg-slate-900 border border-slate-800 hover:bg-slate-800"
                  title="Ocultar alerta visual"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            ) : (
              <div className="bg-slate-900 border-2 border-slate-800 rounded-none p-8 flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-left h-full">
                <div className="space-y-2">
                  <span className="px-3 py-1 text-xs font-mono tracking-widest bg-slate-850 text-indigo-400 border border-indigo-900 font-black uppercase">
                    {selectedChannel === "general" ? "🔍 RECOMENDACIÓN DE SALA" : `📺 DETALLE DE PANTALLA: FASE DE ${PHASES_CONFIG[selectedChannel as TicketPhase].name.toUpperCase()}`}
                  </span>
                  <h2 className="text-2xl font-black text-slate-100 uppercase tracking-widest leading-tight">Turnos Pendientes de Atención</h2>
                  <p className="text-sm text-slate-400 max-w-2xl leading-relaxed">
                    {selectedChannel === "general" 
                      ? "Por favor, observe las pantallas inferiores. Conservará su mismo número de turno durante todo su trayecto y el sistema lo guiará por voz de llamada en cada sección."
                      : `Los números que figuran en esta pantalla están en espera o listos para ser atendidos específicamente en la fase de ${PHASES_CONFIG[selectedChannel as TicketPhase].name}.`}
                  </p>
                </div>
                
                <div className="px-6 py-4 bg-slate-950 border-2 border-slate-800 rounded-none flex items-center gap-4 shadow-xl">
                  <Users className="w-8 h-8 text-indigo-400" />
                  <div className="text-left font-mono">
                    <span className="block text-3xl font-black text-slate-100 leading-none">{filteredWaiting.length}</span>
                    <span className="text-[10px] text-slate-500 uppercase tracking-widest font-black block mt-1">EN ESPERA</span>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* --- BODY: DUAL GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 pt-3">
          
          {/* COLUMN LEFT: Cubicle Monitors */}
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-2">
              <span className="text-xs font-black font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-500" />
                MÓDULOS DE ATENCIÓN {selectedChannel !== "general" ? `(FILTRADOS POR ${PHASES_CONFIG[selectedChannel as TicketPhase].shortName.toUpperCase()})` : ""}
              </span>
              <span className="text-xs text-slate-500 font-mono tracking-wider font-bold uppercase">{filteredCubicles.length} EN SERVICIO</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 max-h-[460px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
              {filteredCubicles.map((cubicle) => {
                const currentTicket = tickets.find(t => t.id === cubicle.currentTicketId);
                const isFree = cubicle.status === "ONLINE_AVAILABLE";
                const isBreak = cubicle.status === "BREAK";

                return (
                  <div
                    key={cubicle.id}
                    className={`p-4 rounded-none border-2 flex flex-col justify-between min-h-[110px] transition-all duration-150 ${
                      cubicle.status === "ATTENDING"
                        ? "bg-indigo-950/40 border-indigo-500 shadow-md ring-2 ring-indigo-500/20"
                        : isFree
                          ? "bg-slate-900/60 border-slate-800 hover:border-slate-700"
                          : "bg-slate-950 border-slate-900/80 opacity-60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1 border-b border-slate-800/40 pb-2">
                      <div className="space-y-0.5 truncate">
                        <h4 className="text-sm font-black text-white uppercase tracking-wider truncate">
                          {cubicle.name}
                        </h4>
                        <p className="text-[10px] text-slate-400 uppercase font-mono tracking-widest truncate">
                          AGENTE: {cubicle.agentName}
                        </p>
                      </div>

                      <div className="shrink-0">
                        {isFree ? (
                          <span className="px-2 py-0.5 text-[9px] font-mono tracking-widest font-black bg-slate-950 text-emerald-400 border border-emerald-500/40 uppercase">
                            ☑️ LIBRE
                          </span>
                        ) : isBreak ? (
                          <span className="px-2 py-0.5 text-[9px] font-mono tracking-widest font-black bg-slate-950 text-amber-500 border border-amber-500/40 uppercase">
                            ☕ RECESO
                          </span>
                        ) : cubicle.status === "ATTENDING" ? (
                          <span className="px-2 py-0.5 text-[9px] font-mono tracking-widest font-black bg-indigo-600 text-white uppercase">
                            🎙️ LLAMADO
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 text-[9px] font-mono tracking-widest font-black bg-slate-950 text-slate-500 border border-slate-900 uppercase">
                            INACTIVO
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between text-right">
                      {cubicle.status === "ATTENDING" && currentTicket ? (
                        <>
                          <span className="text-[10px] text-slate-300 uppercase tracking-widest font-extrabold max-w-[110px] truncate block">
                            👤 {currentTicket.name}
                          </span>
                          <span className="px-3 py-1 text-base font-mono font-black text-white bg-indigo-600 rounded-none shadow-md animate-pulse">
                            {currentTicket.numberCode}
                          </span>
                        </>
                      ) : (
                        <span className="text-[10px] text-slate-605 font-mono uppercase tracking-widest font-extrabold">
                          DISPONIBLE
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* COLUMN RIGHT: Waiting List & Queue (OR SELECTIVE CHANNELS) */}
          {selectedChannel === "general" ? (
            /* GENERAL MULTICHANNEL SCREEN SHOWING EXPLICIT INDEPENDENT PANELS */
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-2">
                <span className="text-xs font-black font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  COLA DE ESPERA EN VIVO POR SECCIONES (FASES)
                </span>
                <span className="text-xs text-slate-400 font-mono font-bold uppercase">TOTAL: {sortedWaiting.length} ESPERANDO</span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {Object.entries(PHASES_CONFIG).map(([key, phase]) => {
                  const phaseTickets = sortedWaiting.filter(t => t.currentPhase === key);
                  return (
                    <div key={key} className="bg-slate-900/60 border-2 border-slate-800 p-4 flex flex-col justify-between h-[155px] relative overflow-hidden">
                      {/* Top accent line */}
                      <div className={`absolute top-0 left-0 right-0 h-[3.5px] ${phase.color.split(" ")[0]}`} />
                      
                      <div className="space-y-2 flex-1 flex flex-col justify-between overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                          <span className="text-sm font-black tracking-widest uppercase text-slate-100">
                            {phase.name}
                          </span>
                          <span className="text-xs font-mono font-black text-slate-200 bg-slate-950 px-2 py-0.5 border border-slate-800">
                            {phaseTickets.length} Cola
                          </span>
                        </div>

                        {phaseTickets.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-h-[85px] overflow-y-auto pt-1 content-start scrollbar-none">
                            {phaseTickets.map(t => (
                              <span
                                key={t.id}
                                className={`text-[11px] font-mono px-2.5 py-1 font-black border flex items-center gap-1 ${
                                  t.priority 
                                    ? "bg-amber-950/40 text-amber-300 border-amber-600/50" 
                                    : "bg-slate-950 text-indigo-300 border-slate-800"
                                }`}
                                title={`${t.name} - ${SERVICES_CONFIG[t.serviceType].name}`}
                              >
                                {t.priority && <span className="text-amber-500 font-black">★</span>}
                                {t.numberCode}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-xs text-slate-500 uppercase font-bold text-center tracking-widest py-4">
                            🚫 SIN ESPERAS EN COLA
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanatory banner confirming continuous same ticket */}
              <div className="p-3.5 border border-dashed border-indigo-805/50 bg-indigo-950/20 text-center space-y-1 mt-2 shadow-inner">
                <p className="text-xs text-indigo-400 uppercase font-black tracking-widest">
                  ★ UN SOLO TÍQUET: PROCESO AUTOMÁTICO CONTINUO ★
                </p>
                <p className="text-[10px] text-slate-400 uppercase font-bold leading-relaxed">
                  Usted NO requiere un nuevo papel. Al terminar su turno en Caja el tiquet avanzará automáticamente a Tríada/Foto.
                </p>
              </div>
            </div>
          ) : (
            /* FOCUSED SCREEN FOR A SPECIFIC SEPARATE PHASE MONITOR (TV BOXES) */
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b-2 border-slate-800 pb-2 mb-2">
                <span className="text-xs font-black font-mono tracking-widest text-slate-400 uppercase flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-500" />
                  COLA DE ESPERA EN EXCLUSIVA ({PHASES_CONFIG[selectedChannel as TicketPhase].name.toUpperCase()})
                </span>
                <span className="text-xs text-slate-400 font-mono font-extrabold">TOTAL: {filteredWaiting.length} TURNOS EN FILA</span>
              </div>

              {filteredWaiting.length > 0 ? (
                <div className="grid grid-cols-2 gap-3.5 max-h-[300px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-800">
                  {filteredWaiting.map((ticket, index) => {
                    const styleConfig = SERVICES_CONFIG[ticket.serviceType];
                    return (
                      <div
                        key={ticket.id}
                        className={`p-3.5 rounded-none flex items-center justify-between border-2 ${
                          ticket.priority
                            ? "bg-amber-950/25 border-amber-550 text-amber-100"
                            : "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700"
                        }`}
                      >
                        <div className="space-y-1 truncate max-w-[150px]">
                          <span className="text-[10px] text-slate-400 font-mono font-black block">
                            ORDEN #{index+1}
                          </span>
                          <h5 className="text-xs font-black tracking-wider uppercase truncate text-slate-100">
                            {ticket.name}
                          </h5>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1.5 font-mono">
                          <span className="text-lg font-black leading-none text-indigo-400">
                            {ticket.numberCode}
                          </span>
                          <span className={`text-[9px] px-2 py-0.5 font-black uppercase text-center ${styleConfig.color}`}>
                            {styleConfig.prefix}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[250px] border-2 border-slate-800 border-dashed rounded-none flex flex-col items-center justify-center p-6 text-center">
                  <p className="text-sm text-slate-505 uppercase tracking-widest font-black">No hay Turnos en Fila</p>
                  <p className="text-xs text-slate-500 mt-2 uppercase tracking-wide max-w-sm leading-relaxed">
                    Los turnos pasarán automáticamente a esta pantalla tan pronto se completen de Caja
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* --- FOOTER: TICKERS AND RECENT LOGS --- */}
        <div id="logs-panel" className="pt-4 border-t-2 border-slate-805 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 w-full">
            <span className="text-[10px] font-black text-slate-400 min-w-max uppercase font-mono tracking-widest block">
              📢 ÚLTIMAS ATENCIONES REALIZADAS:
            </span>
            {recentHistory.length > 0 ? (
              <div className="flex items-center gap-3 overflow-x-auto py-1.5 scrollbar-none w-full">
                {recentHistory.map((h) => (
                  <span
                    key={h.id}
                    className={`px-3 py-1 text-xs font-mono rounded-none font-black flex items-center gap-1.5 shrink-0 border ${
                      h.status === TicketStatus.COMPLETED 
                        ? "bg-emerald-950/40 text-emerald-400 border-emerald-900" 
                        : "bg-slate-900/80 text-slate-400 border-slate-800"
                    }`}
                  >
                    <span>{h.numberCode}</span>
                    <span className="text-[10px] text-slate-500 font-sans truncate max-w-[80px] uppercase font-bold">{h.name}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-slate-500 font-sans tracking-widest font-black uppercase">SIN HISTORIAL RECIENTE</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
