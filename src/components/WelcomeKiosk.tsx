/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { ServiceType, SERVICES_CONFIG, Ticket } from "../types";
import { motion } from "motion/react";
import { User, Accessibility, Printer, CheckCircle2, Ticket as TicketIcon, HelpCircle } from "lucide-react";

interface WelcomeKioskProps {
  onCreateTicket: (name: string, serviceType: ServiceType, priority: boolean) => Ticket;
}

export default function WelcomeKiosk({ onCreateTicket }: WelcomeKioskProps) {
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [printedTicket, setPrintedTicket] = useState<Ticket | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Focus simulation
  const [inputFocused, setInputFocused] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    setIsPrinting(true);
    
    // Simular retraso físico de la impresora térmica de tickets
    setTimeout(() => {
      const ticket = onCreateTicket(name, selectedService, priority);
      setPrintedTicket(ticket);
      setIsPrinting(false);
      // Limpiar campos para la siguiente persona
      setName("");
      setPriority(false);
      setSelectedService(null);
    }, 1250);
  };  return (
    <div id="welcome-kiosk-panel" className="bg-white rounded-2xl border border-slate-250 p-6 flex flex-col justify-between h-full min-h-[580px] relative shadow-sm">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#122e70] text-white rounded-xl shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">
                Emisión de Turnos
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Autoservicio Kiosco</p>
            </div>
          </div>
          <span className="px-2 py-1 text-[8.5px] uppercase tracking-widest font-mono bg-emerald-50 text-emerald-700 font-extrabold rounded border border-emerald-200 shadow-sm animate-pulse">
            DISPONIBLE
          </span>
        </div>

        {!printedTicket ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input Name */}
            <div className="space-y-1.5">
              <label htmlFor="client-name-input" className="block text-xs font-extrabold uppercase tracking-wide text-slate-600">
                Nombre del Ciudadano
              </label>
              <div className={`relative flex items-center transition-all bg-slate-50/50 rounded-xl border ${inputFocused ? 'border-blue-700 ring-2 ring-blue-700/10' : 'border-slate-200'}`}>
                <div className="pl-3.5 text-slate-450">
                  <User className="w-4 h-4" />
                </div>
                <input
                  id="client-name-input"
                  type="text"
                  placeholder="Ingrese nombre y apellido"
                  maxLength={40}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  className="w-full pl-2.5 pr-3 py-3 text-sm focus:outline-none placeholder:text-slate-400 font-sans text-slate-900 bg-transparent font-medium"
                  required
                />
              </div>
            </div>

            {/* Priority check */}
            <div className="bg-amber-50/40 border border-amber-200 p-4 rounded-xl flex items-center justify-between gap-5 shadow-sm">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-500 text-white rounded-lg mt-0.5 shadow-sm">
                  <Accessibility className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-amber-900 uppercase tracking-wide">Atención Preferencial</h4>
                  <p className="text-[10.5px] text-amber-850 mt-1 leading-relaxed font-medium">
                    Prioridad exclusiva para embarazadas, personas con discapacidad o adultos mayores.
                  </p>
                </div>
              </div>
              <label htmlFor="priority-switch" className="relative inline-flex items-center cursor-pointer select-none">
                <input
                  id="priority-switch"
                  type="checkbox"
                  checked={priority}
                  onChange={(e) => setPriority(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200/80 rounded-full border border-slate-305 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Trámites / Service Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-extrabold uppercase tracking-wide text-slate-600">
                Seleccione el Tramite Requerido <span className="text-rose-500">*</span>
              </label>
              
              <div className="grid grid-cols-2 gap-3">
                {Object.values(SERVICES_CONFIG).map((service) => {
                  const isSelected = selectedService === service.id;
                  return (
                    <button
                      id={`service-select-${service.id.toLowerCase()}`}
                      key={service.id}
                      type="button"
                      onClick={() => setSelectedService(service.id)}
                      className={`relative flex flex-col p-3 rounded-xl text-left border transition-all cursor-pointer ${
                        isSelected
                          ? "bg-[#122e70] border-blue-900 text-white shadow-md shadow-blue-105"
                          : "bg-slate-50 hover:bg-slate-100/80 border-slate-200 text-slate-800 hover:border-slate-300 shadow-sm"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-2">
                        <span className={`px-2 py-0.5 text-[8px] font-mono tracking-wider font-extrabold rounded ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-200 text-slate-700"
                        }`}>
                          {service.prefix}
                        </span>
                      </div>
                      <h4 className="text-xs font-black uppercase tracking-wide truncate w-full">{service.name}</h4>
                      <p className={`text-[9px] font-mono mt-1 font-bold ${isSelected ? "text-blue-200" : "text-slate-450"}`}>
                        ~{service.estimatedTimeMin} MINUTOS
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Action Area */}
            <div className="pt-2">
              <button
                id="btn-print-ticket"
                type="submit"
                disabled={!selectedService || isPrinting}
                className={`w-full py-3.5 px-4 font-sans font-bold text-xs uppercase tracking-wider text-center text-white transition-all flex items-center justify-center gap-2 rounded-xl shadow-md ${
                  !selectedService 
                    ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" 
                    : isPrinting
                      ? "bg-[#1a3a82] cursor-wait animate-pulse"
                      : "bg-[#122e70] hover:bg-[#1d428a] cursor-pointer text-white"
                }`}
              >
                {isPrinting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Imprimiendo Ticket...
                  </>
                ) : (
                  <>
                    <Printer className="w-4 h-4" />
                    Generar Turno de Atención
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Animated Thermal Invoice Ticket Output */
          <div className="space-y-4">
            <motion.div
              initial={{ y: -80, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              className="bg-white border border-slate-200 p-5 rounded-xl font-mono text-slate-950 flex flex-col justify-between max-w-[280px] mx-auto text-xs relative overflow-hidden shadow-lg"
              style={{
                backgroundImage: "linear-gradient(#fcfcfc 1px, transparent 1px)",
                backgroundSize: "100% 12px"
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-[#122e70] animate-pulse" />
              
              <div className="text-center pb-3 border-b-2 border-dashed border-slate-200 mt-4 flex flex-col items-center justify-center">
                <img 
                  src="https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-30-at-09.45.35.png" 
                  referrerPolicy="no-referrer" 
                  alt="Tribunal Electoral de Panamá Logo" 
                  className="h-12 w-auto object-contain mb-2.5" 
                />
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">TICKET DE TURNO</h4>
                <p className="text-[9px] text-slate-400 uppercase tracking-widest mt-0.5 font-bold">SISTEMA CONTROL DIGITAL</p>
              </div>

              <div className="text-center py-4 space-y-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">NÚMERO DE ATENCIÓN</p>
                <h2 className="text-5xl font-black text-[#122e70] tracking-wide font-sans py-1">
                  {printedTicket.numberCode}
                </h2>
                {printedTicket.priority && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white font-black text-[9px] uppercase tracking-wide rounded-md shadow-sm">
                    <Accessibility className="w-3 h-3" /> PRIORIDAD ALTA
                  </span>
                )}
              </div>

              <div className="space-y-2 border-t-2 border-dashed border-slate-200 pt-3 text-[11px] text-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold">CIUDADANO:</span>
                  <span className="font-bold truncate text-right max-w-[120px] text-slate-900">{printedTicket.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold">TRÁMITE:</span>
                  <span className="font-bold text-right uppercase text-slate-900">{SERVICES_CONFIG[printedTicket.serviceType].name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold">REGISTRO:</span>
                  <span className="font-bold text-right text-slate-900">
                    {new Date(printedTicket.createdAt).toLocaleTimeString()}
                  </span>
                </div>
                

              </div>

              {/* Barcode representation */}
              <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-200 flex flex-col items-center">
                <div className="w-full h-8 flex justify-between items-stretch">
                  {Array.from({ length: 26 }).map((_, i) => (
                    <div
                      key={i}
                      className={`bg-slate-900 ${i % 3 === 0 ? "w-0.5" : i % 5 === 0 ? "w-1" : i % 4 === 0 ? "w-1.5" : "w-[1px]"}`}
                    />
                  ))}
                </div>
                <span className="text-[8px] text-slate-400 mt-1 font-mono tracking-widest uppercase font-bold">{printedTicket.id.substring(0, 8)}</span>
              </div>
              
              <div className="mt-3 text-center text-[9px] font-sans text-slate-400 uppercase tracking-normal font-bold">
                Manténgase atento a los monitores de sala
              </div>
            </motion.div>

            {/* Actions for printed ticket state */}
            <div className="text-center space-y-3 pt-2">
              <div className="flex items-center justify-center gap-2 text-[#122e70] font-sans font-bold text-xs uppercase tracking-wide">
                <CheckCircle2 className="w-5 h-5 text-emerald-500 animate-bounce" />
                <span>Ticket Impreso con éxito</span>
              </div>
              
              <button
                id="btn-confirm-printed"
                onClick={() => setPrintedTicket(null)}
                className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm cursor-pointer"
              >
                Listo, Entendido
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-100 pt-3 text-center text-[9px] text-slate-400 tracking-widest font-mono uppercase font-bold">
        SISTEMA DE EMISIÓN DIGITAL DE TURNOS
      </div>
    </div>
  );
}
