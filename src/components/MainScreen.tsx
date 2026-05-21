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
    <div id="main-public-screen" className="bg-slate-950 text-white rounded-none p-6 shadow-none border-2 border-slate-900 flex flex-col justify-between h-full min-h-[580px] overflow-hidden relative">
      {/* Background discrete clean gradient block */}
      <div className="absolute inset-0 bg-gradient-to-b from-indigo-950/10 via-slate-950 to-slate-950 pointer-events-none" />

      <div className="relative space-y-4 z-10">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b-2 border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-rose-600 text-white rounded-none">
              <Tv className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest text-slate-100">
                Monitor de Sala Pública
              </h3>
              <p className="text-[9px] text-slate-400 font-mono uppercase tracking-wider mt-0.5">SISTEMA ELECTRÓNICO DE TURNOS</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Speaker Control & Test */}
            <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-none font-mono text-[9px] tracking-wider">
              <button
                id="btn-test-voice"
                onClick={onTestSpeaker}
                className="text-indigo-400 hover:text-indigo-300 font-bold uppercase cursor-pointer"
              >
                PROBAR VOZ
              </button>
              <div className="h-3 w-[1px] bg-slate-800" />
              <button
                id="btn-toggle-sound"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1 hover:bg-slate-800 transition-colors text-slate-400 cursor-pointer ${soundEnabled ? 'text-indigo-400' : 'text-slate-500'}`}
                title={soundEnabled ? "Silenciar" : "Activar sonido"}
              >
                {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Smart Digital Clock */}
            <div className="text-right">
              <p className="text-xs font-mono font-bold text-slate-155 leading-none">
                {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
              </p>
              <p className="text-[9px] text-slate-500 font-mono tracking-widest uppercase mt-0.5">
                {currentTime.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' })}
              </p>
            </div>
          </div>
        </div>

        {/* --- INTERACTIVE TV CHANNEL SELECTORBAR --- */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-slate-900 border border-slate-800/80 rounded-none text-[9px]">
          <span className="text-[8px] text-slate-400 font-mono uppercase tracking-wider pl-2 pr-1.5 font-bold">CANALES DE PANTALLA:</span>
          
          <button
            onClick={() => setSelectedChannel("general")}
            className={`px-2.5 py-1 text-[9px] font-bold uppercase transition-all cursor-pointer ${
              selectedChannel === "general"
                ? "bg-indigo-600 text-white font-bold"
                : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-850"
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
                className={`px-2.5 py-1 text-[9px] font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 ${
                  isActive
                    ? "bg-white text-slate-950 font-bold"
                    : "bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-850"
                }`}
              >
                <span className={`w-1 h-1 rounded-full ${phase.color.split(" ")[0]}`} />
                <span>PANTALLA {phase.shortName.toUpperCase()}</span>
                <span className={`text-[8px] font-mono px-1 font-bold ${
                  waitingCount > 0 ? "bg-indigo-950 text-indigo-400" : "bg-slate-900 text-slate-500"
                }`}>
                  {waitingCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* --- HERO: FLASHING CALL OUT SECTION --- */}
        <div id="hero-callout-screen" className="min-h-[140px] relative">
          <AnimatePresence mode="wait">
            {displayedActiveCall ? (
              <motion.div
                key={displayedActiveCall.ticket.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="bg-indigo-950 border-2 border-indigo-500 rounded-none p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-none relative overflow-hidden"
              >
                <div className="space-y-1 text-center md:text-left z-10 w-full md:w-auto">
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
                    <span className="px-2 py-0.5 text-[8px] font-mono tracking-widest font-bold uppercase bg-indigo-600 text-white rounded-none">
                      TURNO LLAMADO
                    </span>
                    {displayedActiveCall.ticket.priority && (
                      <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-500 text-white rounded-none uppercase flex items-center gap-1">
                        <ShieldAlert className="w-2.5 h-2.5" /> PRIORITARIO
                      </span>
                    )}
                  </div>
                  
                  <h1 className="text-5xl font-black tracking-tight text-white py-1">
                    {displayedActiveCall.ticket.numberCode}
                  </h1>
                  <p className="text-sm font-bold text-slate-200 truncate max-w-[280px] uppercase tracking-wide">
                    {displayedActiveCall.ticket.name}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">Proceder a:</span>
                    <span className={`px-2 py-0.5 text-[9px] font-mono font-bold uppercase ${PHASES_CONFIG[displayedActiveCall.ticket.currentPhase].color}`}>
                      {PHASES_CONFIG[displayedActiveCall.ticket.currentPhase].name}
                    </span>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center bg-slate-900 border-2 border-indigo-500 px-6 py-4 rounded-none text-center min-w-[200px] z-10">
                  <span className="text-[9px] tracking-widest text-indigo-400 uppercase font-mono font-bold">PASE AL MODULO</span>
                  <p className="text-2xl font-black text-white mt-1 uppercase">
                    {displayedActiveCall.cubicle.name.split(" ")[0]} {displayedActiveCall.cubicle.name.split(" ")[1] || ""}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">{displayedActiveCall.cubicle.agentName}</p>
                </div>

                {/* Dismiss Call indicator */}
                <button
                  id="btn-dismiss-active-call"
                  onClick={onClearActiveCall}
                  className="absolute top-2 right-2 text-indigo-400 hover:text-white p-1 rounded-none transition-colors cursor-pointer"
                  title="Ocultar alerta visual"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            ) : (
              <div className="bg-slate-900 border border-slate-800 rounded-none p-5 flex flex-col md:flex-row items-center justify-between gap-4 text-center md:text-left h-full">
                <div className="space-y-1">
                  <span className="px-2.5 py-0.5 text-[8px] font-mono tracking-widest bg-slate-800 text-slate-400 font-bold uppercase">
                    {selectedChannel === "general" ? "SALA DE ESPERA" : `SALA DE ESPERA - PANTALLA EXCLUSIVA DE ${PHASES_CONFIG[selectedChannel as TicketPhase].name.toUpperCase()}`}
                  </span>
                  <h2 className="text-base font-bold text-slate-200 uppercase tracking-wider">Turnos Pendientes de Atención</h2>
                  <p className="text-xs text-slate-400 max-w-md">
                    {selectedChannel === "general" 
                      ? "Consulte los tableros inferiores. Su mismo número de turno continuará en cada paso de atención automáticamente sin requerir otro papel."
                      : `Los turnos listados a continuación están listos en espera de ser llamados en la fase de ${PHASES_CONFIG[selectedChannel as TicketPhase].name}.`}
                  </p>
                </div>
                
                <div className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-none flex items-center gap-3">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <div className="text-left font-mono">
                    <span className="block text-xl font-bold text-slate-100">{filteredWaiting.length}</span>
                    <span className="text-[8px] text-slate-500 uppercase tracking-widest font-bold block">En Espera</span>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* --- BODY: DUAL GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-1">
          
          {/* COLUMN LEFT: Cubicle Monitors */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1">
              <span className="text-[10px] font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                <UserCheck className="w-3.5 h-3.5 text-indigo-500" />
                MÓDULOS DE ATENCIÓN {selectedChannel !== "general" ? `(FILTRADOS POR ${PHASES_CONFIG[selectedChannel as TicketPhase].shortName.toUpperCase()})` : ""}
              </span>
              <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase">{filteredCubicles.length} EN LÍNEA</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {filteredCubicles.map((cubicle) => {
                const currentTicket = tickets.find(t => t.id === cubicle.currentTicketId);
                const isFree = cubicle.status === "ONLINE_AVAILABLE";
                const isBreak = cubicle.status === "BREAK";

                return (
                  <div
                    key={cubicle.id}
                    className={`p-3 rounded-none border-2 flex items-center justify-between transition-all ${
                      cubicle.status === "ATTENDING"
                        ? "bg-indigo-950/20 border-indigo-600"
                        : isFree
                          ? "bg-slate-900/40 border-slate-800 hover:border-slate-700"
                          : "bg-slate-950 border-slate-900 opacity-60"
                    }`}
                  >
                    <div className="space-y-1 max-w-[170px]">
                      <h4 className="text-xs font-bold text-slate-100 uppercase tracking-wider truncate">
                        {cubicle.name}
                      </h4>
                      <p className="text-[10px] text-slate-500 uppercase tracking-widest truncate">
                        AGENT: {cubicle.agentName}
                      </p>
                    </div>

                    <div className="text-right">
                      {cubicle.status === "ATTENDING" && currentTicket ? (
                        <div className="flex flex-col items-end">
                          <span className="px-2 py-0.5 text-xs font-mono font-bold text-white bg-indigo-600 rounded-none">
                            {currentTicket.numberCode}
                          </span>
                          <span className="text-[9px] text-slate-300 uppercase tracking-widest mt-1 font-bold truncate max-w-[100px]">
                            {currentTicket.name}
                          </span>
                          <span className="text-[8px] text-slate-400 font-bold tracking-tight block mt-0.5 whitespace-nowrap">
                            Atendiendo: {PHASES_CONFIG[currentTicket.currentPhase].shortName}
                          </span>
                        </div>
                      ) : isFree ? (
                        <span className="px-2 py-0.5 text-[8px] font-mono tracking-widest font-bold bg-slate-900 text-emerald-400 border border-emerald-500/20 uppercase">
                          LIBRE
                        </span>
                      ) : isBreak ? (
                        <span className="px-2 py-0.5 text-[8px] font-mono tracking-widest font-bold bg-slate-900 text-amber-500 border border-amber-500/20 uppercase">
                          RECESO
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 text-[8px] font-mono tracking-widest font-bold bg-slate-900 text-slate-500 border border-slate-800 uppercase">
                          INACTIVO
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
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1">
                <span className="text-[10px] font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  COLA DE ESPERA EN VIVO POR FASES
                </span>
                <span className="text-[9px] text-slate-400 font-mono font-bold">TOTAL: {sortedWaiting.length} ESPERAS</span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {Object.entries(PHASES_CONFIG).map(([key, phase]) => {
                  const phaseTickets = sortedWaiting.filter(t => t.currentPhase === key);
                  return (
                    <div key={key} className="bg-slate-900/60 border border-slate-800 p-2.5 flex flex-col justify-between h-[115px] relative overflow-hidden">
                      {/* Top accent line */}
                      <div className={`absolute top-0 left-0 right-0 h-[2.5px] ${phase.color.split(" ")[0]}`} />
                      
                      <div className="space-y-1.5 flex-1 flex flex-col justify-between overflow-hidden">
                        <div className="flex items-center justify-between border-b border-slate-800/40 pb-1">
                          <span className="text-[9px] font-black tracking-wider uppercase text-slate-200">
                            {phase.shortName}
                          </span>
                          <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-950 px-1 border border-slate-850">
                            {phaseTickets.length} cola
                          </span>
                        </div>

                        {phaseTickets.length > 0 ? (
                          <div className="flex flex-wrap gap-1 max-h-[62px] overflow-y-auto pt-0.5 content-start scrollbar-none">
                            {phaseTickets.map(t => (
                              <span
                                key={t.id}
                                className={`text-[9px] font-mono px-1.5 py-0.5 font-bold border flex items-center gap-0.5 ${
                                  t.priority 
                                    ? "bg-amber-950/40 text-amber-300 border-amber-600/30" 
                                    : "bg-slate-950 text-indigo-300 border-slate-850/80"
                                }`}
                                title={`${t.name} - ${SERVICES_CONFIG[t.serviceType].name}`}
                              >
                                {t.priority && <span className="text-amber-500 text-[6px]">★</span>}
                                {t.numberCode}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-center text-[8px] text-slate-600 uppercase font-black text-center tracking-wider py-2">
                            SIN ESPERAS
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Explanatory banner confirming continuous same ticket */}
              <div className="p-2.5 border border-dashed border-indigo-950/50 bg-indigo-950/10 text-center space-y-0.5">
                <p className="text-[8.5px] text-indigo-400 uppercase font-black tracking-wider">
                  ★ FLUJO CONTINUO CENTRALIZADO (MISMO TÍQUET) ★
                </p>
                <p className="text-[8px] text-slate-400 uppercase leading-relaxed">
                  Al completar su paso por Caja, su ticket avanzará automáticamente a la lista de Tríada y Fotografía, donde finalizará su atención. ¡Haga el seguimiento aquí!
                </p>
              </div>
            </div>
          ) : (
            /* FOCUSED SCREEN FOR A SPECIFIC SEPARATE PHASE MONITOR (TV BOXES) */
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1">
                <span className="text-[10px] font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-indigo-500" />
                  COLA DE ESPERA EN EXCLUSIVA ({PHASES_CONFIG[selectedChannel as TicketPhase].name.toUpperCase()})
                </span>
                <span className="text-[9px] text-slate-400 font-mono font-bold">TOTAL: {filteredWaiting.length} TURNOS</span>
              </div>

              {filteredWaiting.length > 0 ? (
                <div className="grid grid-cols-2 gap-2 max-h-[195px] overflow-y-auto pr-1">
                  {filteredWaiting.map((ticket, index) => {
                    const styleConfig = SERVICES_CONFIG[ticket.serviceType];
                    return (
                      <div
                        key={ticket.id}
                        className={`p-2.5 rounded-none flex items-center justify-between border-2 ${
                          ticket.priority
                            ? "bg-amber-950/20 border-amber-600 text-amber-100"
                            : "bg-slate-900 border-slate-800 text-slate-200"
                        }`}
                      >
                        <div className="space-y-0.5 truncate max-w-[100px]">
                          <span className="text-[8px] text-slate-500 font-mono font-bold block">
                            POSICIÓN #{index+1}
                          </span>
                          <h5 className="text-xs font-bold tracking-wide uppercase truncate">
                            {ticket.name}
                          </h5>
                        </div>
                        
                        <div className="flex flex-col items-end gap-1 font-mono">
                          <span className="text-sm font-black leading-none text-indigo-400">
                            {ticket.numberCode}
                          </span>
                          <span className={`text-[8px] px-1 font-bold ${styleConfig.color}`}>
                            {styleConfig.prefix}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="h-[195px] border-2 border-slate-800 border-dashed rounded-none flex flex-col items-center justify-center p-4 text-center">
                  <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">No hay Turnos en Espera</p>
                  <p className="text-[9px] text-slate-600 mt-1 uppercase tracking-wide">
                    Los turnos pasarán automáticamente a esta pantalla tan pronto se completen de Caja
                  </p>
                </div>
              )}
            </div>
          )}

        </div>

        {/* --- FOOTER: TICKERS AND RECENT LOGS --- */}
        <div id="logs-panel" className="pt-4 border-t border-slate-800 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="text-[8px] font-black text-slate-400 uppercase font-mono tracking-widest block">ÚLTIMAS ATENCIONES:</span>
            {recentHistory.length > 0 ? (
              <div className="flex items-center gap-2 overflow-x-auto py-1">
                {recentHistory.map((h) => (
                  <span
                    key={h.id}
                    className={`px-1.5 py-0.5 text-[9px] font-mono rounded-none font-bold flex items-center gap-1 ${
                      h.status === TicketStatus.COMPLETED 
                        ? "bg-emerald-950 text-emerald-400 border border-emerald-900" 
                        : "bg-slate-900 text-slate-400 border border-slate-800"
                    }`}
                  >
                    <span>{h.numberCode}</span>
                    <span className="text-[8px] text-slate-500 truncate max-w-[50px] uppercase">{h.name}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[9px] text-slate-600 font-sans tracking-wide uppercase">HISTORIAL DE ATENCIONES VACÍO</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
