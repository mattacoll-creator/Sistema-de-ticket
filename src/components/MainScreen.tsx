/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { Ticket, Cubicle, TicketStatus, SERVICES_CONFIG } from "../types";
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

        {/* --- HERO: FLASHING CALL OUT SECTION --- */}
        <div id="hero-callout-screen" className="min-h-[140px] relative">
          <AnimatePresence mode="wait">
            {activeCall ? (
              <motion.div
                key={activeCall.ticket.id}
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
                    {activeCall.ticket.priority && (
                      <span className="px-1.5 py-0.5 text-[8px] font-bold bg-amber-500 text-white rounded-none uppercase flex items-center gap-1">
                        <ShieldAlert className="w-2.5 h-2.5" /> PRIORITARIO
                      </span>
                    )}
                  </div>
                  
                  <h1 className="text-5xl font-black tracking-tight text-white py-1">
                    {activeCall.ticket.numberCode}
                  </h1>
                  <p className="text-sm font-bold text-slate-200 truncate max-w-[280px] uppercase tracking-wide">
                    {activeCall.ticket.name}
                  </p>
                </div>

                <div className="flex flex-col items-center justify-center bg-slate-900 border-2 border-indigo-500 px-6 py-4 rounded-none text-center min-w-[200px] z-10">
                  <span className="text-[9px] tracking-widest text-indigo-400 uppercase font-mono font-bold">PASE AL MODULO</span>
                  <p className="text-2xl font-black text-white mt-1 uppercase">
                    {activeCall.cubicle.name.split(" ")[0]} {activeCall.cubicle.name.split(" ")[1] || ""}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono mt-0.5 uppercase tracking-wider">{activeCall.cubicle.agentName}</p>
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
                    SALA DE ESPERA
                  </span>
                  <h2 className="text-base font-bold text-slate-200 uppercase tracking-wider">Turnos Pendientes de Atención</h2>
                  <p className="text-xs text-slate-400 max-w-md">
                    Regístrese en el kiosco de servicio. Le notificaremos por voz de llamada en esta pantalla para que se dirija al cubículo correspondiente.
                  </p>
                </div>
                
                <div className="px-4 py-3 bg-slate-950 border border-slate-800 rounded-none flex items-center gap-3">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <div className="text-left font-mono">
                    <span className="block text-xl font-bold text-slate-100">{waitingTickets.length}</span>
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
                ESTADO DE MÓDULOS
              </span>
              <span className="text-[9px] text-slate-500 font-mono tracking-wider uppercase">{cubicles.length} ACTIVOS</span>
            </div>

            <div className="grid grid-cols-1 gap-2.5">
              {cubicles.map((cubicle) => {
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

          {/* COLUMN RIGHT: Waiting List & Queue */}
          <div className="space-y-2">
            <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 mb-1">
              <span className="text-[10px] font-bold font-mono tracking-widest text-slate-400 uppercase flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-indigo-500" />
                COLA DE LLAMADOS
              </span>
              <span className="text-[9px] text-slate-400 font-mono font-bold">TOTAL: {sortedWaiting.length} DE ESPERA</span>
            </div>

            {sortedWaiting.length > 0 ? (
              <div className="grid grid-cols-2 gap-2 max-h-[162px] overflow-y-auto pr-1">
                {sortedWaiting.map((ticket, index) => {
                  const styleConfig = SERVICES_CONFIG[ticket.serviceType];
                  return (
                    <div
                      key={ticket.id}
                      className={`p-2 rounded-none flex items-center justify-between border-2 ${
                        ticket.priority
                          ? "bg-amber-950/20 border-amber-600 text-amber-100"
                          : "bg-slate-900 border-slate-800 text-slate-200"
                      }`}
                    >
                      <div className="space-y-0.5 max-w-[70px]">
                        <span className="text-[8px] text-slate-500 font-mono font-bold">POS: #{index+1}</span>
                        <h5 className="text-xs font-bold tracking-wide uppercase truncate">
                          {ticket.name}
                        </h5>
                      </div>
                      
                      <div className="flex flex-col items-end gap-1 font-mono">
                        <span className="text-[11px] font-bold leading-none text-indigo-400">
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
              <div className="h-[162px] border-2 border-slate-800 border-dashed rounded-none flex flex-col items-center justify-center p-4 text-center">
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">No hay Turnos Pendientes</p>
                <p className="text-[10px] text-slate-600 mt-1 uppercase tracking-wide">Registre un nuevo ciudadano desde el Kiosko</p>
              </div>
            )}
          </div>

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
