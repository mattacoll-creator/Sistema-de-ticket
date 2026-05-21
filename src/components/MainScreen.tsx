/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Ticket, Cubicle, TicketStatus, SERVICES_CONFIG, TicketPhase, PHASES_CONFIG } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, Tv, UserCheck, Users, HelpCircle, ArrowRight, UserMinus, ShieldAlert, Clock } from "lucide-react";

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
  const [layoutFocus, setLayoutFocus] = useState<"both" | "cubicles" | "queue">("both");

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
    <div id="main-public-screen" className="bg-slate-50 text-slate-900 rounded-2xl p-8 shadow-sm border border-slate-205 flex flex-col justify-between h-full min-h-[720px] overflow-hidden relative">
      <div className="relative space-y-6 z-10 w-full">
        {/* Header Bar */}
        <div className="flex items-center justify-between border-b border-slate-205 pb-5">
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-rose-600 text-white rounded-xl shadow-sm">
              <Tv className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-xl font-black uppercase tracking-widest text-[#122e70] flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping inline-block" />
                MONITOR DE SALA PÚBLICA
              </h3>
            </div>
          </div>

          <div className="flex items-center gap-5">
            {/* Speaker Control & Test */}
            <div className="flex items-center gap-3 bg-white border border-slate-200 px-4 py-2.5 rounded-2xl font-mono text-xs tracking-wider shadow-sm">
              <button
                id="btn-test-voice"
                onClick={onTestSpeaker}
                className="text-[#122e70] hover:text-blue-800 font-black uppercase cursor-pointer transition-colors"
               >
                PROBAR VOZ
              </button>
              <div className="h-4 w-[1px] bg-slate-200" />
              <button
                id="btn-toggle-sound"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 cursor-pointer ${soundEnabled ? 'text-[#122e70] font-bold' : 'text-slate-400'}`}
                title={soundEnabled ? "Silenciar" : "Activar sonido"}
              >
                {soundEnabled ? <Volume2 className="w-4.5 h-4.5 animate-pulse text-[#122e70]" /> : <VolumeX className="w-4.5 h-4.5" />}
              </button>
            </div>

            {/* Smart Digital Clock Badge */}
            <div className="flex items-center gap-3 bg-[#122e70] text-white px-5 py-2.5 rounded-2xl shadow-md border border-amber-400/20">
              <div className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 shrink-0">
                <Clock className="w-5 h-5 text-amber-400" />
              </div>
              <div className="text-right">
                <p className="text-2xl font-mono font-black tracking-wider leading-none text-white">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </p>
                <p className="text-[9px] text-blue-200 font-sans tracking-widest uppercase font-bold mt-1.5 leading-none">
                  {currentTime.toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'short' })}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* --- INTERACTIVE TV CHANNEL SELECTORBAR --- */}
        <div className="flex flex-wrap items-center gap-2 p-2 bg-white border border-slate-200 rounded-xl text-xs shadow-sm">
          <span className="text-[10px] text-slate-505 font-mono uppercase tracking-wider pl-2 pr-2 font-black">PANEL DEL MONITOR:</span>
          
          <button
            onClick={() => setSelectedChannel("general")}
            className={`px-4 py-2 text-xs font-black uppercase transition-all rounded-lg cursor-pointer ${
              selectedChannel === "general"
                ? "bg-[#122e70] text-white font-bold shadow-md shadow-blue-150"
                : "bg-slate-50 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200"
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
                className={`px-4 py-2 text-xs font-black uppercase transition-all rounded-lg cursor-pointer flex items-center gap-2 border ${
                  isActive
                    ? "bg-slate-900 text-white border-slate-900 font-extrabold shadow-sm"
                    : "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${phase.color.split(" ")[0]} animate-ping`} />
                <span>PANTALLA {phase.shortName.toUpperCase()}</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 font-bold rounded ${
                  waitingCount > 0 ? "bg-rose-100 text-rose-700 border border-rose-200" : "bg-slate-100 text-slate-500"
                }`}>
                  {waitingCount}
                </span>
              </button>
            );
          })}
        </div>

        {/* --- DEDICATED VIEW MODE SELECTOR (ESTRUCTURA DE PANTALLA) --- */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-slate-100 rounded-xl border border-slate-205 text-xs shadow-inner animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider font-mono">DISTRIBUCIÓN DEL MONITOR:</span>
            <span className="text-[10px] bg-[#122e70] text-white px-2 py-0.5 rounded font-black uppercase font-mono shadow-sm">
              {layoutFocus === "both" ? "Vista Dividida (Módulos + Turnos)" : layoutFocus === "cubicles" ? "Enfoque Principal: Solo Módulos" : "Enfoque Principal: Solo Fila de Turnos"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLayoutFocus("both")}
              className={`px-3.5 py-2 text-[10px] font-black uppercase transition-all rounded-lg cursor-pointer flex items-center gap-1.5 ${
                layoutFocus === "both"
                  ? "bg-white text-[#122e70] border border-slate-305 font-bold shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-transparent"
              }`}
              title="Muestra los Módulos de atención en el lado izquierdo y las colas de turnos en el derecho"
            >
              <span>📊 Vista Dividida</span>
            </button>
            <button
              onClick={() => setLayoutFocus("cubicles")}
              className={`px-3.5 py-2 text-[10px] font-black uppercase transition-all rounded-lg cursor-pointer flex items-center gap-1.5 ${
                layoutFocus === "cubicles"
                  ? "bg-white text-[#122e70] border border-slate-305 font-bold shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-transparent"
              }`}
              title="Oculta las colas de turnos y expande los Módulos de atención a pantalla completa"
            >
              <span>🚪 Solo Módulos</span>
            </button>
            <button
              onClick={() => setLayoutFocus("queue")}
              className={`px-3.5 py-2 text-[10px] font-black uppercase transition-all rounded-lg cursor-pointer flex items-center gap-1.5 ${
                layoutFocus === "queue"
                  ? "bg-white text-[#122e70] border border-slate-305 font-bold shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200 border border-transparent"
              }`}
              title="Oculta los Módulos de atención y expande la fila de turnos esperando a pantalla completa"
            >
              <span>🎟️ Solo Fila de Turnos</span>
            </button>
          </div>
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
                className="bg-[#0f1f4d] border-2 border-[#122e70] rounded-3xl p-10 lg:p-14 flex flex-col xl:flex-row items-center justify-between gap-10 shadow-2xl relative overflow-hidden ring-8 ring-blue-500/10"
              >
                {/* Visual flashy background indicators */}
                <div className="absolute top-0 bottom-0 left-0 w-3 bg-rose-600 animate-pulse animate-duration-1000" />
                <div className="absolute top-0 bottom-0 right-0 w-3 bg-amber-400 animate-pulse animate-duration-1000" />

                <div className="space-y-4 text-center xl:text-left z-10 w-full xl:w-auto flex-grow">
                  <div className="flex flex-wrap items-center justify-center xl:justify-start gap-3">
                    <span className="px-5 py-1.5 text-xs font-mono tracking-widest font-black uppercase bg-rose-600 text-white rounded-lg animate-bounce shadow-md">
                      🛎️ TURNO LLAMADO
                    </span>
                    {displayedActiveCall.ticket.priority && (
                      <span className="px-4 py-1.5 text-xs font-black bg-amber-500 text-white rounded-lg uppercase flex items-center gap-1.5 shadow-md animate-pulse">
                        <ShieldAlert className="w-3.5 h-3.5" /> ATENCIÓN PRIORITARIA
                      </span>
                    )}
                  </div>
                  
                  <h1 className="text-8xl md:text-[11rem] lg:text-[13rem] font-black tracking-widest text-[#ffffff] py-1 font-mono leading-none drop-shadow-[0_6px_20px_rgba(255,255,255,0.25)] animate-pulse selection:bg-rose-500">
                    {displayedActiveCall.ticket.numberCode}
                  </h1>
                  
                  <p className="text-2xl md:text-4xl font-extrabold text-blue-200 uppercase tracking-widest italic truncate max-w-[700px] drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]">
                    {displayedActiveCall.ticket.name}
                  </p>
                  
                  <div className="flex items-center justify-center xl:justify-start gap-3 mt-4">
                    <span className="text-sm font-mono font-black text-slate-300 uppercase tracking-widest">IR DIRECTAMENTE A:</span>
                    <span className={`px-4 py-1.5 text-sm font-mono font-black uppercase shadow-sm border rounded-lg ${PHASES_CONFIG[displayedActiveCall.ticket.currentPhase].color}`}>
                      {PHASES_CONFIG[displayedActiveCall.ticket.currentPhase].name.toUpperCase()}
                    </span>
                  </div>
                </div>

                {/* GIGANTIC DESTINATION BOX */}
                <div className="flex flex-col items-center justify-center bg-white border-8 border-rose-600 px-12 py-10 rounded-3xl text-center min-w-[360px] lg:min-w-[480px] max-w-full z-10 shadow-2xl text-slate-900 transition-all transform hover:scale-[1.02]">
                  <span className="text-xs md:text-sm tracking-widest text-[#122e70] uppercase font-mono font-black">POR FAVOR DIRÍJASE AL</span>
                  
                  <p className="text-5xl md:text-7xl lg:text-8xl font-black text-[#122e70] mt-3 uppercase font-mono tracking-wide animate-pulse">
                    {displayedActiveCall.cubicle.name.toUpperCase()}
                  </p>
                  
                  <div className="h-1 w-24 bg-rose-600 my-4 rounded-full" />
                  
                  <p className="text-xs md:text-sm text-slate-500 font-mono uppercase tracking-widest font-black">
                    📢 ATENDIDO POR AGENTE: <span className="text-slate-800">{displayedActiveCall.cubicle.agentName.toUpperCase()}</span>
                  </p>
                </div>

                {/* Dismiss Call indicator */}
                <button
                  id="btn-dismiss-active-call"
                  onClick={onClearActiveCall}
                  className="absolute top-4 right-4 text-blue-300 hover:text-white p-2.5 rounded-full transition-colors cursor-pointer bg-blue-900 border border-blue-800 hover:bg-slate-800"
                  title="Ocultar alerta visual"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </motion.div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl p-8 flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-left h-full shadow-sm">
                <div className="space-y-2">
                  <span className="px-3 py-1 text-xs font-mono tracking-widest bg-slate-100 text-[#122e70] border border-blue-100 rounded-md font-black uppercase">
                    {selectedChannel === "general" ? "🔍 RECOMENDACIÓN DE SALA" : `📺 DETALLE DE PANTALLA: FASE DE ${PHASES_CONFIG[selectedChannel as TicketPhase].name.toUpperCase()}`}
                  </span>
                  <h2 className="text-2xl font-black text-slate-900 uppercase tracking-widest leading-tight">Turnos Pendientes de Atención</h2>
                  <p className="text-sm text-slate-500 max-w-2xl leading-relaxed font-semibold">
                    {selectedChannel === "general" 
                      ? "Por favor, observe las pantallas inferiores. Conservará su mismo número de turno durante todo su trayecto y el sistema lo guiará por voz de llamada en cada sección."
                      : `Los números que figuran en esta pantalla están en espera o listos para ser atendidos específicamente en la fase de ${PHASES_CONFIG[selectedChannel as TicketPhase].name}.`}
                  </p>
                </div>
                
                <div className="px-6 py-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-4 shadow-sm">
                  <Users className="w-8 h-8 text-indigo-650" />
                  <div className="text-left font-mono">
                    <span className="block text-3xl font-black text-slate-900 leading-none">{filteredWaiting.length}</span>
                    <span className="text-[10px] text-slate-400 font-mono tracking-widest font-black block mt-1">EN ESPERA</span>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* --- BODY: DUAL GRID --- */}
        <div className={`grid grid-cols-1 ${layoutFocus === "both" ? "lg:grid-cols-2" : "grid-cols-1"} gap-8 pt-3`}>
          
          {/* COLUMN LEFT: Cubicle Monitors */}
          {layoutFocus !== "queue" && (
            <div className="space-y-3 animate-fade-in">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                <span className="text-xs font-black font-mono tracking-widest text-[#122e70] uppercase flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-[#122e70]" />
                  MÓDULOS DE ATENCIÓN {selectedChannel !== "general" ? `(FILTRADOS POR ${PHASES_CONFIG[selectedChannel as TicketPhase].shortName.toUpperCase()})` : ""}
                </span>
                <span className="text-xs text-slate-500 font-mono tracking-wider font-bold uppercase">{filteredCubicles.length} EN SERVICIO</span>
              </div>

              <div className={`grid grid-cols-1 ${layoutFocus === "cubicles" ? "md:grid-cols-3 lg:grid-cols-4" : "md:grid-cols-2"} gap-3.5 max-h-[460px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-200`}>
                {filteredCubicles.map((cubicle) => {
                  const currentTicket = tickets.find(t => t.id === cubicle.currentTicketId);
                  const isFree = cubicle.status === "ONLINE_AVAILABLE";
                  const isBreak = cubicle.status === "BREAK";

                  return (
                    <div
                      key={cubicle.id}
                      className={`p-4 rounded-xl border flex flex-col justify-between min-h-[110px] transition-all duration-150 ${
                        cubicle.status === "ATTENDING"
                          ? "bg-blue-50/50 border-blue-405 shadow-sm ring-2 ring-blue-500/10"
                          : isFree
                            ? "bg-white border-slate-200 hover:border-slate-300 shadow-sm"
                            : "bg-slate-100 border-slate-200 opacity-60"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 border-b border-slate-100 pb-2">
                        <div className="space-y-0.5 truncate">
                          <h4 className="text-sm font-black text-slate-900 uppercase tracking-wider truncate">
                            {cubicle.name}
                          </h4>
                          <p className="text-[10px] text-slate-400 uppercase font-mono tracking-widest truncate font-extrabold">
                            AGENTE: {cubicle.agentName}
                          </p>
                        </div>

                        <div className="shrink-0">
                          {isFree ? (
                            <span className="px-2 py-0.5 text-[9px] font-mono tracking-widest font-black bg-emerald-50 text-emerald-700 border border-emerald-250 uppercase rounded">
                              ☑️ LIBRE
                            </span>
                          ) : isBreak ? (
                            <span className="px-2 py-0.5 text-[9px] font-mono tracking-widest font-black bg-amber-50 text-amber-700 border border-amber-205 uppercase rounded">
                              ☕ RECESO
                            </span>
                          ) : cubicle.status === "ATTENDING" ? (
                            <span className="px-2 py-0.5 text-[9px] font-mono tracking-widest font-black bg-[#122e70] text-white uppercase rounded shadow-sm">
                              🎙️ LLAMADO
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[9px] font-mono tracking-widest font-black bg-slate-205 text-slate-500 uppercase rounded">
                              INACTIVO
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between text-right">
                        {cubicle.status === "ATTENDING" && currentTicket ? (
                          <>
                            <span className="text-[10px] text-slate-550 uppercase tracking-widest font-bold max-w-[110px] truncate block">
                              👤 {currentTicket.name}
                            </span>
                            <span className="px-3 py-1 text-base font-mono font-black text-white bg-[#122e70] rounded-lg shadow-sm animate-pulse">
                              {currentTicket.numberCode}
                            </span>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-405 font-mono uppercase tracking-widest font-extrabold">
                            DISPONIBLE
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COLUMN RIGHT: Waiting List & Queue (OR SELECTIVE CHANNELS) */}
          {layoutFocus !== "cubicles" && (
            <div className="space-y-3 animate-fade-in">
              {selectedChannel === "general" ? (
                /* GENERAL MULTICHANNEL SCREEN SHOWING EXPLICIT INDEPENDENT PANELS */
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                    <span className="text-xs font-black font-mono tracking-widest text-[#122e70] uppercase flex items-center gap-2">
                      <Users className="w-5 h-5 text-indigo-650" />
                      COLA DE ESPERA EN VIVO POR SECCIONES (FASES)
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-bold uppercase">TOTAL: {sortedWaiting.length} ESPERANDO</span>
                  </div>

                  <div className={`grid ${layoutFocus === "queue" ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"} gap-4`}>
                    {Object.entries(PHASES_CONFIG).map(([key, phase]) => {
                      const phaseTickets = sortedWaiting.filter(t => t.currentPhase === key);
                      return (
                        <div key={key} className={`bg-white border border-slate-200 p-4 flex flex-col justify-between ${layoutFocus === "queue" ? "h-[225px]" : "h-[155px]"} relative overflow-hidden rounded-xl shadow-sm`}>
                          {/* Top accent line */}
                          <div className={`absolute top-0 left-0 right-0 h-[3.5px] ${phase.color.split(" ")[0]}`} />
                          
                          <div className="space-y-2 flex-1 flex flex-col justify-between overflow-hidden">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                              <span className="text-sm font-black tracking-widest uppercase text-slate-800">
                                {phase.name}
                              </span>
                              <span className="text-xs font-mono font-black text-slate-600 bg-slate-50 px-2 py-0.5 border border-slate-200 rounded">
                                {phaseTickets.length} cola
                              </span>
                            </div>

                            {phaseTickets.length > 0 ? (
                              <div className={`flex flex-wrap gap-1.5 ${layoutFocus === "queue" ? "max-h-[145px]" : "max-h-[85px]"} overflow-y-auto pt-1 content-start scrollbar-none`}>
                                {phaseTickets.map(t => {
                                  const secondsWaiting = Math.round((Date.now() - t.createdAt) / 1000);
                                  const isOverdue = secondsWaiting > 60;
                                  return (
                                    <span
                                      key={t.id}
                                      className={`text-[12px] font-mono px-3 py-1.5 font-black border flex items-center gap-1 rounded transition-colors duration-300 ${
                                        isOverdue 
                                          ? "bg-rose-600 text-white border-rose-650 animate-pulse font-extrabold" 
                                          : t.priority 
                                            ? "bg-amber-50 text-amber-850 border-amber-250 shadow-sm" 
                                            : "bg-slate-50 text-slate-705 border-slate-200"
                                      }`}
                                      title={`${t.name} - ${SERVICES_CONFIG[t.serviceType].name} (Espera: ${secondsWaiting}s)`}
                                    >
                                      {t.priority && !isOverdue && <span className="text-amber-550 font-black">★</span>}
                                      {isOverdue && <span className="text-white">⚠️</span>}
                                      {t.numberCode}
                                    </span>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="flex-1 flex items-center justify-center text-xs text-slate-400 uppercase font-bold text-center tracking-widest py-4">
                                🚫 SIN ESPERAS EN COLA
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanatory banner confirming continuous same ticket */}
                  <div className="p-3.5 border border-dashed border-indigo-200 bg-indigo-50/20 text-center space-y-1 mt-2 shadow-inner rounded-xl animate-pulse">
                    <p className="text-xs text-indigo-700 uppercase font-black tracking-widest">
                      ★ UN SOLO TÍQUET: PROCESO AUTOMÁTICO CONTINUO ★
                    </p>
                    <p className="text-[10px] text-slate-450 uppercase font-bold leading-relaxed">
                      Usted NO requiere un nuevo papel. Al terminar su turno en Caja el tiquet avanzará automáticamente a Tríada/Foto.
                    </p>
                  </div>
                </div>
              ) : (
                /* FOCUSED SCREEN FOR A SPECIFIC SEPARATE PHASE MONITOR (TV BOXES) */
                <div className="space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                    <span className="text-xs font-black font-mono tracking-widest text-[#122e70] uppercase flex items-center gap-2">
                      <Users className="w-5 h-5 text-[#122e70]" />
                      COLA DE ESPERA EN EXCLUSIVA ({PHASES_CONFIG[selectedChannel as TicketPhase].name.toUpperCase()})
                    </span>
                    <span className="text-xs text-slate-400 font-mono font-extrabold">TOTAL: {filteredWaiting.length} TURNOS EN FILA</span>
                  </div>

                  {filteredWaiting.length > 0 ? (
                    <div className={`grid ${layoutFocus === "queue" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-2"} gap-3.5 max-h-[460px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-slate-250`}>
                      {filteredWaiting.map((ticket, index) => {
                        const styleConfig = SERVICES_CONFIG[ticket.serviceType];
                        return (
                          <div
                            key={ticket.id}
                            className={`p-4 rounded-xl flex items-center justify-between border ${
                              ticket.priority
                                ? "bg-amber-50/50 border-amber-300 text-amber-950 shadow-sm"
                                : "bg-white border-slate-200 text-slate-800 hover:border-slate-300 shadow-sm"
                            } ${layoutFocus === "queue" ? "p-6" : "p-3.5"}`}
                          >
                            <div className="space-y-1 truncate max-w-[200px]">
                              <span className="text-[9px] text-slate-400 font-mono font-black block font-bold">
                                ORDEN #{index+1}
                              </span>
                              <h5 className={`font-black tracking-wider uppercase truncate text-slate-900 ${layoutFocus === "queue" ? "text-sm" : "text-xs"}`}>
                                {ticket.name}
                              </h5>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1.5 font-mono">
                              <span className={`font-black leading-none text-[#122e70] ${layoutFocus === "queue" ? "text-2xl" : "text-lg"}`}>
                                {ticket.numberCode}
                              </span>
                              <span className={`text-[9px] px-2 py-0.5 font-black uppercase text-center rounded ${styleConfig.color}`}>
                                {styleConfig.prefix}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="h-[250px] border border-slate-200 border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center bg-white shadow-sm">
                      <p className="text-sm text-slate-400 uppercase tracking-widest font-black">No hay Turnos en Fila</p>
                      <p className="text-xs text-slate-400 mt-2 uppercase tracking-wide max-w-sm leading-relaxed font-bold">
                        Los turnos pasarán automáticamente a esta pantalla tan pronto se completen de Caja
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* --- FOOTER: TICKERS AND RECENT LOGS --- */}
        <div id="logs-panel" className="pt-4 border-t border-slate-205 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3 w-full">
            <span className="text-[10px] font-black text-slate-400 min-w-max uppercase font-mono tracking-widest block font-bold">
              📢 ÚLTIMAS ATENCIONES REALIZADAS:
            </span>
            {recentHistory.length > 0 ? (
              <div className="flex items-center gap-3 overflow-x-auto py-1.5 scrollbar-none w-full">
                {recentHistory.map((h) => (
                  <span
                    key={h.id}
                    className={`px-3 py-1 text-xs font-mono rounded-lg font-bold flex items-center gap-1.5 shrink-0 border ${
                      h.status === TicketStatus.COMPLETED 
                        ? "bg-emerald-50 text-emerald-800 border-emerald-205 shadow-sm" 
                        : "bg-slate-50 text-slate-400 border-slate-200"
                    }`}
                  >
                    <span>{h.numberCode}</span>
                    <span className="text-[10px] text-slate-505 font-sans truncate max-w-[80px] uppercase font-bold">{h.name}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-[10px] text-slate-400 font-sans tracking-widest font-black uppercase">SIN HISTORIAL RECIENTE</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
