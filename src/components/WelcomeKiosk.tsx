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
  };

  return (
    <div id="welcome-kiosk-panel" className="bg-white dark:bg-slate-900 rounded-none border-2 border-slate-900 dark:border-slate-800 p-6 flex flex-col justify-between h-full min-h-[580px] relative">
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between border-b-2 border-slate-900 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-600 text-white rounded-none">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 leading-tight">
                Emisión de Turnos
              </h3>
              <p className="text-xs text-slate-500 uppercase tracking-widest mt-0.5">Autoservicio Kiosco</p>
            </div>
          </div>
          <span className="px-2 py-1 text-[8px] uppercase tracking-widest font-mono bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-bold border border-slate-300 dark:border-slate-700">
            DISPONIBLE
          </span>
        </div>

        {!printedTicket ? (
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Input Name */}
            <div className="space-y-1.5">
              <label htmlFor="client-name-input" className="block text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
                Nombre del Ciudadano
              </label>
              <div className={`relative flex items-center transition-all bg-white dark:bg-slate-950 rounded-none border-2 ${inputFocused ? 'border-indigo-600' : 'border-slate-900 dark:border-slate-800'}`}>
                <div className="pl-3.5 text-slate-900 dark:text-slate-100">
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
                  className="w-full pl-2.5 pr-3 py-3 text-sm focus:outline-none placeholder:text-slate-400 font-sans text-slate-900 dark:text-white"
                  required
                />
              </div>
            </div>

            {/* Priority check */}
            <div className="bg-amber-50 dark:bg-amber-950/25 border-2 border-amber-500 p-4 rounded-none flex items-center justify-between gap-5">
              <div className="flex items-start gap-2.5">
                <div className="p-1.5 bg-amber-500 text-white rounded-none mt-0.5">
                  <Accessibility className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-amber-950 dark:text-amber-300 uppercase tracking-wide">Atención Preferencial</h4>
                  <p className="text-[10px] text-amber-900 dark:text-amber-400 mt-1 leading-relaxed">
                    Prioridad exclusiva para embarazadas, personas con discapacidad o adultos mayores.
                  </p>
                </div>
              </div>
              <label htmlFor="priority-switch" className="relative inline-flex items-center cursor-pointer">
                <input
                  id="priority-switch"
                  type="checkbox"
                  checked={priority}
                  onChange={(e) => setPriority(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-6 bg-slate-200 dark:bg-slate-800 rounded-none border border-slate-400 dark:border-slate-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-slate-300 after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {/* Trámites / Service Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-700 dark:text-slate-300">
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
                      className={`relative flex flex-col p-3 rounded-none text-left border-2 transition-all cursor-pointer ${
                        isSelected
                          ? "bg-indigo-600 border-indigo-700 text-white"
                          : "bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-800 text-slate-800 dark:text-slate-200 hover:border-slate-900 dark:hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between w-full mb-1.5">
                        <span className={`px-2 py-0.5 text-[8px] font-mono tracking-wider font-bold ${
                          isSelected ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
                        }`}>
                          {service.prefix}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold uppercase tracking-wide truncate w-full">{service.name}</h4>
                      <p className={`text-[9px] font-mono mt-1 ${isSelected ? "text-indigo-200" : "text-slate-400"}`}>
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
                className={`w-full py-3 px-4 font-sans font-bold text-xs uppercase tracking-wider text-center text-white transition-all flex items-center justify-center gap-2 rounded-none border-2 ${
                  !selectedService 
                    ? "bg-slate-200 text-slate-400 border-slate-300 cursor-not-allowed" 
                    : isPrinting
                      ? "bg-indigo-500 border-indigo-600 cursor-wait"
                      : "bg-slate-900 hover:bg-slate-800 border-slate-900 cursor-pointer text-white"
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
              className="bg-white border-2 border-slate-900 p-5 rounded-none font-mono text-slate-950 flex flex-col justify-between max-w-[280px] mx-auto text-xs relative overflow-hidden"
              style={{
                backgroundImage: "linear-gradient(#f9f9f9 1px, transparent 1px)",
                backgroundSize: "100% 12px"
              }}
            >
              <div className="absolute top-0 left-0 right-0 h-2 bg-indigo-600" />
              
              <div className="text-center pb-3 border-b-2 border-dashed border-slate-300 mt-2">
                <h4 className="font-bold text-sm uppercase tracking-wider">TICKET DE TURNO</h4>
                <p className="text-[9px] text-slate-500 uppercase tracking-widest mt-0.5">SISTEMA CONTROL DIGITAL</p>
              </div>

              <div className="text-center py-4 space-y-1">
                <p className="text-[10px] text-slate-500 uppercase tracking-widest">NÚMERO DE ATENCIÓN</p>
                <h2 className="text-5xl font-black text-indigo-700 tracking-wide font-sans py-1">
                  {printedTicket.numberCode}
                </h2>
                {printedTicket.priority && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white font-bold text-[9px] uppercase tracking-wide">
                    <Accessibility className="w-3 h-3" /> PRIORIDAD ALTA
                  </span>
                )}
              </div>

              <div className="space-y-2 border-t-2 border-dashed border-slate-300 pt-3 text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase tracking-widest text-[9px]">CIUDADANO:</span>
                  <span className="font-bold truncate text-right max-w-[120px]">{printedTicket.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase tracking-widest text-[9px]">TRÁMITE:</span>
                  <span className="font-bold text-right uppercase">{SERVICES_CONFIG[printedTicket.serviceType].name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500 uppercase tracking-widest text-[9px]">REGISTRO:</span>
                  <span className="font-bold text-right">
                    {new Date(printedTicket.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              </div>

              {/* Barcode representation */}
              <div className="mt-4 pt-3 border-t-2 border-dashed border-slate-300 flex flex-col items-center">
                <div className="w-full h-8 flex justify-between items-stretch">
                  {Array.from({ length: 26 }).map((_, i) => (
                    <div
                      key={i}
                      className={`bg-slate-900 ${i % 3 === 0 ? "w-0.5" : i % 5 === 0 ? "w-1" : i % 4 === 0 ? "w-1.5" : "w-[1px]"}`}
                    />
                  ))}
                </div>
                <span className="text-[8px] text-slate-500 mt-1 font-mono tracking-widest uppercase">{printedTicket.id.substring(0, 8)}</span>
              </div>
              
              <div className="mt-3 text-center text-[9px] font-sans text-slate-500 uppercase tracking-normal">
                Manténgase atento a los monitores de sala
              </div>
            </motion.div>

            {/* Actions for printed ticket state */}
            <div className="text-center space-y-3 pt-2">
              <div className="flex items-center justify-center gap-2 text-indigo-700 font-sans font-bold text-xs uppercase tracking-wide">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Ticket Impreso</span>
              </div>
              
              <button
                id="btn-confirm-printed"
                onClick={() => setPrintedTicket(null)}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-bold uppercase tracking-wider rounded-none cursor-pointer"
              >
                Listo, Entendido
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-slate-200 dark:border-slate-800 pt-3 text-center text-[9px] text-slate-400 dark:text-slate-500 tracking-widest font-mono uppercase">
        SISTEMA DE EMISIÓN DIGITAL DE TURNOS
      </div>
    </div>
  );
}
