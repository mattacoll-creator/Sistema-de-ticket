/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { ServiceType, SERVICES_CONFIG, Ticket, OFFICES_CONFIG } from "../types";
import { motion } from "motion/react";
import { User, Accessibility, Printer, CheckCircle2, Ticket as TicketIcon, HelpCircle, Calendar, AlertTriangle, Play } from "lucide-react";
import { isOfficeOpenNow, getOfficeSchedule, OfficeSchedule } from "../utils/scheduleStorage";

interface WelcomeKioskProps {
  onCreateTicket: (name: string, serviceType: ServiceType, priority: boolean, isAppointment?: boolean, procedure?: string) => Ticket;
  currentOfficeId?: string;
  gatewaySelection?: "cedulacion" | "registro_civil";
}

export const REGISTRO_PROCEDURES = [
  { id: "OR", name: "Oficial de Recepción", description: "Recepción de documentos y orientación inicial" },
  { id: "OI", name: "Oficial de Investigación", description: "Investigaciones vitales y validación especial" },
  { id: "SI", name: "Supervisión de Investigación", description: "Revisión técnica de expedientes complejos" },
  { id: "RMAT", name: "Recepción de Matrimonio", description: "Trámites, actas y bodas civiles" },
  { id: "RS", name: "Recepción de Sentencia", description: "Inscripción de divorcios, filiaciones y fallos" },
  { id: "ED", name: "Entrega de documento", description: "Retiro de certificados y actas procesadas" },
  { id: "SAU", name: "Servicio de Atención al Usuario", description: "Información general, consultas y reclamos" },
  { id: "OHV", name: "Oficial de Hechos Vitales", description: "Inscripciones de nacimiento, matrimonio y defunción" },
  { id: "STR", name: "Solicitud de Trámites", description: "Rectificaciones, adiciones y correcciones" },
  { id: "OTR", name: "Otros Trámites", description: "Gestiones especiales no especificadas" }
];

export const CEDULACION_PROCEDURES = [
  { id: "CPV", name: "Cédula por Primera Vez", description: "Trámite de primera cédula para panameños" },
  { id: "REN", name: "Renovación de Cédula", description: "Renovación por vencimiento de documento" },
  { id: "DUP", name: "Duplicado de Cédula", description: "Reposición por pérdida, robo o deterioro" },
  { id: "CJ", name: "Cédula Juvenil", description: "Documento de identidad para menores de edad" },
  { id: "CRP", name: "Carné de Residente", description: "Carné de residente permanente extranjero" },
  { id: "RBM", name: "Registro Biométrico", description: "Enrolamiento de huellas, foto y firma oficial" }
];

export const getProcedureName = (procId: string): string => {
  const regProc = REGISTRO_PROCEDURES.find(p => p.id === procId);
  if (regProc) return regProc.name;
  const cedProc = CEDULACION_PROCEDURES.find(p => p.id === procId);
  if (cedProc) return cedProc.name;
  return procId;
};

export default function WelcomeKiosk({ onCreateTicket, currentOfficeId = "OFF-1", gatewaySelection = "cedulacion" }: WelcomeKioskProps) {
  const [name, setName] = useState("");
  const [priority, setPriority] = useState(false);
  const [selectedService, setSelectedService] = useState<ServiceType | null>(null);
  const [selectedProcedure, setSelectedProcedure] = useState<string | null>(null);
  const [printedTicket, setPrintedTicket] = useState<Ticket | null>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [ignoreSchedule, setIgnoreSchedule] = useState(false);
  const [paperSize, setPaperSize] = useState<"80mm" | "58mm">(() => {
    return (localStorage.getItem("ticket_system_paper_size_v1") as "80mm" | "58mm") || "80mm";
  });

  const handlePaperSizeChange = (size: "80mm" | "58mm") => {
    setPaperSize(size);
    localStorage.setItem("ticket_system_paper_size_v1", size);
  };

  // Focus simulation
  const [inputFocused, setInputFocused] = useState(false);

  // Office schedule state checks
  const [scheduleStatus, setScheduleStatus] = useState(() => isOfficeOpenNow(currentOfficeId));

  useEffect(() => {
    const checkSchedule = () => {
      setScheduleStatus(isOfficeOpenNow(currentOfficeId));
    };
    checkSchedule();

    // Listen to admin calendar and time changes immediately
    window.addEventListener("storage", checkSchedule);
    const interval = setInterval(checkSchedule, 5000); // Check every 5 seconds

    return () => {
      window.removeEventListener("storage", checkSchedule);
      clearInterval(interval);
    };
  }, [currentOfficeId]);

  useEffect(() => {
    if (gatewaySelection === "registro_civil") {
      setSelectedService(ServiceType.REGISTRO);
    } else {
      setSelectedService(null);
    }
    setSelectedProcedure(null);
  }, [gatewaySelection]);

  // Trigger physical thermal printer immediately upon ticket generation
  useEffect(() => {
    if (printedTicket) {
      const autoPrintTimer = setTimeout(() => {
        try {
          window.print();
        } catch (error) {
          console.error("Auto print triggered but restricted by browser sandbox:", error);
        }
      }, 750); // Give enough time for state rendering and ticket fade-ins
      return () => clearTimeout(autoPrintTimer);
    }
  }, [printedTicket]);

  const office = OFFICES_CONFIG.find(o => o.id === currentOfficeId) || OFFICES_CONFIG[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService) return;

    setIsPrinting(true);
    
    // Simular retraso físico de la impresora térmica de tickets
    setTimeout(() => {
      const sanitizedName = name.trim() || "Ciudadano";
      const ticket = onCreateTicket(sanitizedName, selectedService, priority, false, selectedProcedure || undefined);
      setPrintedTicket(ticket);
      setIsPrinting(false);
      // Limpiar campos para la siguiente persona
      setName("");
      setPriority(false);
      setSelectedService(null);
      setSelectedProcedure(null);
    }, 1250);
  };

  return (
    <div id="welcome-kiosk-panel" className="bg-white rounded-2xl border border-slate-250 p-6 flex flex-col justify-between h-full min-h-[580px] relative shadow-sm">
      <div className="space-y-4">
        {/* Iframe Warning with direct link */}
        {window.self !== window.top && (
          <div className="bg-gradient-to-r from-[#122e70] to-blue-900 text-white rounded-xl p-4 shadow-md space-y-3 font-sans relative border-l-4 border-amber-500 animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <div className="p-1 px-1.5 bg-amber-500 text-slate-950 font-black rounded text-[9px] uppercase tracking-wider shrink-0">
                Impresora Bloqueada
              </div>
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-300 leading-tight">
                  Advertencia: Visor de AI Studio Bloquea Impresoras
                </h4>
                <p className="text-[11px] text-slate-100 mt-1 leading-relaxed">
                  Por seguridad de su navegador, los cuadros integrados (iframes) de AI Studio <strong>no pueden abrir el selector de impresión</strong> para elegir su Bixolon SRP-Q302.
                </p>
              </div>
            </div>
            <div className="pt-1 flex flex-col sm:flex-row items-center gap-2.5">
              <a
                href={window.location.href}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full sm:w-auto px-4 py-2 bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-[11px] uppercase tracking-wider rounded-lg shadow-sm text-center flex items-center justify-center gap-1.5 transition-all cursor-pointer hover:scale-[1.01]"
              >
                <Printer className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
                <span>Abrir en Pestaña Nueva para Imprimir</span>
              </a>
              <span className="text-[10.5px] text-slate-300 font-semibold italic">
                (¡Esto activará la selección de su impresora!)
              </span>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#122e70] text-white rounded-xl shadow-sm">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">
                Emisión de Turnos {gatewaySelection === "registro_civil" ? "• Registro Civil" : "• Cedulación"}
              </h3>
              <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest mt-0.5">
                Kiosco {gatewaySelection === "registro_civil" ? "DNRC" : "DNC"} — {office.name.replace("Dirección Regional de ", "").replace("Tribunal Electoral de ", "")}
              </p>
            </div>
          </div>
          <span className={`px-2 py-1 text-[8.5px] uppercase tracking-widest font-mono font-extrabold rounded border shadow-sm ${
            scheduleStatus.isOpen || ignoreSchedule
              ? "bg-emerald-50 text-emerald-700 border-emerald-200 animate-pulse"
              : "bg-rose-50 text-rose-700 border-rose-200"
          }`}>
            {scheduleStatus.isOpen || ignoreSchedule ? "DISPONIBLE" : "CERRADO"}
          </span>
        </div>

        {!printedTicket ? (
          (!scheduleStatus.isOpen && !ignoreSchedule) ? (
            <div className="bg-slate-50 border border-slate-200 p-6 rounded-2xl text-center space-y-5 animate-fadeIn">
              <div className="w-14 h-14 bg-rose-50 text-rose-650 rounded-full flex items-center justify-center border border-rose-100 mx-auto">
                <AlertTriangle className="w-7 h-7 text-rose-600 animate-bounce" />
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-black text-rose-950 uppercase tracking-wider">Sede fuera de servicio</h4>
                <div className="text-xs text-slate-800 font-bold leading-relaxed bg-rose-500/10 border border-rose-200 p-2.5 rounded-lg">
                  {scheduleStatus.reason}
                </div>
                <div className="bg-white border border-slate-200 rounded-xl p-3 text-left font-sans text-[11px] text-slate-700 space-y-1.5 mt-2">
                  <div className="flex justify-between font-bold border-b border-slate-100 pb-1">
                    <span>Horario regular:</span>
                    <span className="font-mono text-[#122e70]">{scheduleStatus.schedule.openTime} a.m. a {scheduleStatus.schedule.closeTime} p.m.</span>
                  </div>
                  <div className="flex justify-between font-medium">
                    <span>Días laborables:</span>
                    <span>Lunes a Viernes</span>
                  </div>
                </div>
              </div>
              
              <div className="pt-3 border-t border-slate-200 space-y-2">
                <p className="text-[10px] text-slate-400 font-medium leading-normal">
                  ¿Es usted un administrador o evaluador? Puede omitir temporalmente esta restricción horaria en caliente.
                </p>
                <button
                  type="button"
                  onClick={() => setIgnoreSchedule(true)}
                  className="px-4 py-2 bg-[#122e70] hover:bg-blue-850 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5 mx-auto"
                >
                  <Play className="w-3 h-3 text-amber-400 shrink-0 fill-amber-400" />
                  <span>Omitir Horario (Modo Pruebas)</span>
                </button>
              </div>
            </div>
          ) : (
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
                Seleccione el Trámite Requerido <span className="text-rose-500">*</span>
              </label>
              
              {gatewaySelection === "registro_civil" ? (
                /* REGISTRO CIVIL SUB-PROCEDURES */
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 w-full">
                  {REGISTRO_PROCEDURES.map((proc) => {
                    const isSelected = selectedProcedure === proc.id;
                    return (
                      <button
                        id={`procedure-select-${proc.id.toLowerCase()}`}
                        key={proc.id}
                        type="button"
                        onClick={() => {
                          setSelectedService(ServiceType.REGISTRO);
                          setSelectedProcedure(proc.id);
                        }}
                        className={`relative flex flex-col p-3 rounded-xl text-left border transition-all cursor-pointer h-full min-h-[110px] justify-between ${
                          isSelected
                            ? "bg-blue-600 border-blue-800 text-white shadow-md shadow-blue-100/50 scale-[1.02]"
                            : "bg-white hover:bg-slate-50 border-slate-200 text-slate-800 hover:border-slate-300 shadow-sm"
                        }`}
                      >
                        <div>
                          <div className={`text-xl sm:text-2xl font-black tracking-tight leading-none mb-1.5 ${
                            isSelected ? "text-white" : "text-[#122e70]"
                          }`}>
                            {proc.id}
                          </div>
                          <h4 className={`text-[10px] font-extrabold uppercase tracking-wide leading-tight line-clamp-2 ${
                            isSelected ? "text-blue-100" : "text-slate-700"
                          }`}>
                            {proc.name}
                          </h4>
                        </div>
                        <p className={`text-[8.5px] leading-tight mt-1 line-clamp-1 ${
                          isSelected ? "text-blue-200" : "text-slate-400 font-medium"
                        }`}>
                          {proc.description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              ) : (
                /* DEFAULT CHANNELS (CEDULACION / MULTI-SERVICE KIOSK) */
                <div className="grid grid-cols-2 gap-3">
                  {Object.values(SERVICES_CONFIG)
                    .filter((service) => !(currentOfficeId !== "OFF-1" && service.id === ServiceType.EXTRANJERIA))
                    .map((service) => {
                      const isSelected = selectedService === service.id;
                      return (
                        <button
                          id={`service-select-${service.id.toLowerCase()}`}
                          key={service.id}
                          type="button"
                          onClick={() => {
                            setSelectedService(service.id);
                            setSelectedProcedure(null);
                          }}
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
              )}


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
          )
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
                  src="https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/05/AGENDATE-01.png" 
                  referrerPolicy="no-referrer" 
                  alt="Tribunal Electoral de Panamá Logo" 
                  className="h-12 w-auto object-contain mb-2.5" 
                />
                <h4 className="font-extrabold text-sm uppercase tracking-wider text-slate-900">TICKET DE TURNO</h4>
                <p className="text-[10px] font-black text-[#122e70] uppercase tracking-wide mt-1 text-center leading-tight">
                  {office.name.replace("Dirección Regional de ", "").replace("Tribunal Electoral de ", "")}
                </p>
                <p className="text-[8px] text-slate-400 uppercase mt-1 text-center font-bold tracking-tight max-w-[220px] leading-normal">
                  {office.address}
                </p>
              </div>

              <div className="text-center py-4 space-y-1">
                <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">NÚMERO DE ATENCIÓN</p>
                <h2 className="text-5xl font-black text-[#122e70] tracking-wide font-sans py-1">
                  {printedTicket.numberCode}
                </h2>
                <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
                  {printedTicket.priority && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-500 text-white font-black text-[9px] uppercase tracking-wide rounded-md shadow-sm">
                      <Accessibility className="w-3 h-3" /> PRIORIDAD ALTA
                    </span>
                  )}

                </div>
              </div>

              <div className="space-y-2 border-t-2 border-dashed border-slate-200 pt-3 text-[11px] text-slate-800">
                <div className="flex justify-between">
                  <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold">CIUDADANO:</span>
                  <span className="font-bold truncate text-right max-w-[120px] text-slate-900">{printedTicket.name}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-400 uppercase tracking-widest text-[9px] font-bold shrink-0">TRÁMITE:</span>
                  <span className="font-bold text-right uppercase text-slate-900 truncate">
                    {printedTicket.procedure 
                      ? getProcedureName(printedTicket.procedure)
                      : SERVICES_CONFIG[printedTicket.serviceType].name}
                  </span>
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

              {/* Iframe Detection Warning */}
              {window.self !== window.top && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5 text-left text-[11.5px] text-amber-950 leading-relaxed font-sans mt-1 shadow-sm">
                  <div className="font-bold flex items-center gap-1.5 text-amber-900 mb-1">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span className="font-extrabold uppercase tracking-wide">⚠️ IMPRESIÓN BLOQUEADA EN ESTA PANTALLA</span>
                  </div>
                  <p className="text-slate-700 font-medium">
                    Está visualizando el sistema dentro de AI Studio (iframe), espacio donde los navegadores <strong>restringen por seguridad el diálogo de elección de impresoras</strong>.
                  </p>
                  <div className="mt-2 bg-white border border-amber-200 p-2.5 rounded-lg text-slate-800 space-y-2">
                    <p className="font-bold text-[#122e70]">
                      👉 Solución de un solo paso:
                    </p>
                    <p className="text-[11px] font-medium text-slate-700">
                      Presione el botón de abajo para clonar este sistema en una pestaña normal de su navegador. ¡Al hacerlo, el diálogo se activará inmediatamente para que elija su impresora <strong>Bixolon SRP-Q302</strong>!
                    </p>
                    <a
                      href={window.location.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full py-2 px-3 bg-amber-500 hover:bg-amber-600 font-extrabold text-slate-950 text-[10.5px] uppercase tracking-wider rounded-lg shadow-sm text-center transition-all cursor-pointer hover:scale-[1.01]"
                    >
                      🚀 Abrir en Pestaña Nueva e Imprimir
                    </a>
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    try {
                      window.print();
                    } catch (e) {
                      console.error("No se pudo iniciar el diálogo de impresión manual:", e);
                    }
                  }}
                  className="py-3 px-3 w-full bg-blue-700 hover:bg-blue-800 text-white font-sans text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm cursor-pointer flex items-center justify-center gap-1.5"
                  title="Mandar orden a la impresora física de tickets (Abre selección de impresora)"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Imprimir de Nuevo</span>
                </button>
                <button
                  id="btn-confirm-printed"
                  onClick={() => setPrintedTicket(null)}
                  className="py-3 px-3 w-full bg-slate-900 hover:bg-slate-800 text-white font-sans text-xs font-bold uppercase tracking-wider rounded-xl shadow-sm cursor-pointer border border-slate-900 text-center"
                >
                  Confirmar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 5. COPIA DE IMPRESIÓN FÍSICA PARA IMPRESORAS TÉRMICAS (VISIBLE EXCLUSIVAMENTE CON @media print RENDERIZADO FUERA DE #ROOT) */}
      {printedTicket && createPortal(
        <>
          <style dangerouslySetInnerHTML={{
            __html: `
              @media print {
                @page {
                  size: ${paperSize === "58mm" ? "58mm" : "80mm"} auto !important;
                  margin: 0mm !important;
                }
              }
            `
          }} />
          <div id="thermal-receipt-print-area" className={`print-only ${paperSize === "58mm" ? "paper-58mm" : "paper-80mm"}`}>
            <img 
              src="https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/05/AGENDATE-01.png" 
              referrerPolicy="no-referrer" 
              alt="TE Logo"
              className="h-12 mx-auto object-contain mb-2 ticket-header-logo"
            />
            <h3 className="text-xs font-black uppercase text-center tracking-tight" style={{ margin: "5px 0 2px 0" }}>
              TRIBUNAL ELECTORAL DE PANAMÁ
            </h3>
            <p className="text-[8px] text-center uppercase tracking-wider font-bold mb-1">
              {office.name}
            </p>
            <div style={{ borderBottom: "2px dashed #000000", margin: "8px 0" }}></div>
            
            <p className="text-[7.5px] uppercase font-bold text-center tracking-widest mt-1">
              NÚMERO DE ATENCIÓN DE TURNO
            </p>
            <h1 className="big-number text-5xl font-black text-center font-mono my-3 leading-none" style={{ fontSize: "36pt", fontWeight: "900", margin: "5px 0" }}>
              {printedTicket.numberCode}
            </h1>
            
            <div className="flex flex-col items-center gap-1 my-1">
              {printedTicket.priority && (
                <span style={{ fontSize: "8.5pt", fontWeight: "bold", border: "1px solid #000", padding: "1px 6px", textTransform: "uppercase" }}>
                  ** PRIORIDAD ALTA **
                </span>
              )}

            </div>

            <div style={{ borderBottom: "2px dashed #000000", margin: "8px 0" }}></div>
            
            <div className="meta-row">
              <span className="meta-label">Ciudadano:</span>
              <span className="meta-value font-bold">{printedTicket.name}</span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Trámite:</span>
              <span className="meta-value font-bold uppercase">
                {printedTicket.procedure 
                  ? getProcedureName(printedTicket.procedure)
                  : SERVICES_CONFIG[printedTicket.serviceType].name}
              </span>
            </div>
            <div className="meta-row">
              <span className="meta-label">Registro:</span>
              <span className="meta-value">{new Date(printedTicket.createdAt).toLocaleTimeString()}</span>
            </div>
            <div className="meta-row" style={{ borderBottom: "none" }}>
              <span className="meta-label">Fecha:</span>
              <span className="meta-value">{new Date(printedTicket.createdAt).toLocaleDateString()}</span>
            </div>
            
            <div style={{ borderBottom: "2px dashed #000000", margin: "8px 0" }}></div>
            
            {/* Barcode Simulator */}
            <div style={{ height: "14px", display: "flex", justifyContent: "center", gap: "1.5px", overflow: "hidden", margin: "8px 0 2px 0" }}>
              {Array.from({ length: 32 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    backgroundColor: "#000000",
                    width: i % 3 === 0 ? "2px" : i % 5 === 0 ? "3.2px" : "1px",
                    height: "100%"
                  }}
                />
              ))}
            </div>
            <p className="text-[6.5px] text-center font-mono my-0.5 font-bold uppercase tracking-widest">
              TE-{printedTicket.id.substring(0, 8).toUpperCase()}
            </p>
            
            <p className="text-[8px] text-center font-serif font-black italic mt-3">
              "La Patria la hacemos todos"
            </p>
            <p className="text-[7.5px] text-center font-sans mt-1">
              Por favor espere su turno en los monitores de sala
            </p>
          </div>
        </>,
        document.body
      )}

      <div className="border-t border-slate-100 pt-3 flex flex-col sm:flex-row items-center gap-2 sm:gap-0 justify-between text-[9px] text-slate-400 font-mono uppercase font-bold">
        <span className="tracking-widest">SISTEMA DE EMISIÓN DIGITAL DE TURNOS</span>
        <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200 no-print">
          <span className="text-[7.5px] px-1 text-slate-500 font-sans font-bold normal-case">Impresora Bixolon:</span>
          <button
            type="button"
            onClick={() => handlePaperSizeChange("80mm")}
            className={`px-1.5 py-0.5 rounded text-[8px] font-sans font-black transition-all cursor-pointer ${
              paperSize === "80mm"
                ? "bg-[#122e70] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200 bg-white"
            }`}
            title="Ancho estándar de 3 pulgadas (80mm)"
          >
            80mm
          </button>
          <button
            type="button"
            onClick={() => handlePaperSizeChange("58mm")}
            className={`px-1.5 py-0.5 rounded text-[8px] font-sans font-black transition-all cursor-pointer ${
              paperSize === "58mm"
                ? "bg-[#122e70] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-200 bg-white"
            }`}
            title="Ancho opcional de 2 pulgadas (58mm)"
          >
            58mm
          </button>
        </div>
      </div>
    </div>
  );
}
