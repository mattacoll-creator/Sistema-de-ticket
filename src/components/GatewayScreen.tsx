import React from "react";
import { 
  CreditCard, 
  Info,
  CalendarCheck2,
  Smartphone,
  Tv,
  UserCheck,
  Printer
} from "lucide-react";

interface GatewayScreenProps {
  onSelectOption: (option: "cedulacion" | "registro_civil") => void;
  onSelectCitas?: () => void;
  onSelectView?: (view: string) => void;
}

export default function GatewayScreen({ onSelectOption, onSelectCitas, onSelectView }: GatewayScreenProps) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between font-sans relative overflow-hidden">
      {/* Upper Panama Flag Ribbon */}
      <div className="w-full h-1 flex select-none shrink-0 relative z-30 shadow-sm">
        <div className="bg-[#da121a] flex-1"></div>
        <div className="bg-[#003087] flex-1"></div>
      </div>

      {/* Decorative ambient background curves */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] bg-[#003087]/5 rounded-full blur-3xl pointer-events-none -z-10 animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-[#da121a]/5 rounded-full blur-3xl pointer-events-none -z-10" />

      {/* Main Container */}
      <div className="max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 flex-grow flex flex-col justify-center gap-6 z-10">
        
        {/* Header Block */}
        <div className="text-center space-y-3">
          <div className="flex justify-center items-center gap-3">
            <img 
              src="/images/agendate-logo-1.png" 
              referrerPolicy="no-referrer" 
              alt="Tribunal Electoral de Panamá" 
              className="h-16 md:h-20 w-auto object-contain drop-shadow-md select-none hover:scale-[1.02] transition-transform duration-500" 
            />
          </div>
          
          <div className="space-y-1">
            <h1 className="text-xs font-black uppercase tracking-[0.3em] text-[#003087]">
              República de Panamá • Tribunal Electoral
            </h1>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900">
              Portal Unificado de Atención, Citas y Turnos
            </h2>
            <p className="text-xs text-slate-500 max-w-lg mx-auto font-medium">
              Seleccione el módulo al que desea ingresar: Kiosko de turnos, agendamiento de citas, pantalla de TV de sala, consola de agente o seguimiento móvil.
            </p>
          </div>
          <div className="h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent w-48 mx-auto"></div>
        </div>

        {/* 4 Primary Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4.5 max-w-4xl mx-auto w-full">
          {/* OPTION 1: AGENDAMIENTO DE CITAS (CITASTE) */}
          <button
            type="button"
            id="gateway-opt-citas"
            onClick={() => onSelectCitas && onSelectCitas()}
            className="group flex flex-col text-left justify-between bg-gradient-to-b from-blue-950 to-blue-900 text-white border-2 border-blue-800 rounded-3xl p-5 hover:border-amber-400 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer relative shadow-md"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3.5 bg-amber-500 text-slate-950 rounded-2xl group-hover:bg-amber-400 transition-all duration-300 shadow-md">
                  <CalendarCheck2 className="w-6 h-6" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full border border-amber-400/30">
                  Citas en Línea
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide group-hover:text-amber-300 transition-colors">
                  Agendamiento de Citas (CitasTE)
                </h3>
                <p className="text-[9.5px] text-blue-200 font-extrabold uppercase tracking-widest leading-none">
                  Portal Web de Citas Previas
                </p>
                <p className="text-xs text-blue-100/90 leading-relaxed font-medium pt-1">
                  Agende su cita previa por internet para trámites de extranjería, cedulación u organización electoral.
                </p>
              </div>
            </div>

            <div className="border-t border-blue-800 mt-4 pt-3 w-full flex items-center justify-between text-amber-400 group-hover:text-amber-300 font-sans transition-colors">
              <span className="text-[10.5px] font-black uppercase tracking-widest">
                Agendar o Consultar Cita →
              </span>
              <span className="text-[9px] text-blue-300 font-bold uppercase">
                /citas
              </span>
            </div>
          </button>

          {/* OPTION 2: KIOSKO DE TURNOS PRESENCIAL */}
          <button
            type="button"
            id="gateway-opt-cedulacion"
            onClick={() => onSelectOption("cedulacion")}
            className="group flex flex-col text-left justify-between bg-white border-2 border-slate-200 rounded-3xl p-5 hover:border-[#003087] hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer relative hover:bg-blue-50/20"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3.5 bg-blue-50 border border-blue-200 text-[#003087] rounded-2xl group-hover:bg-[#003087] group-hover:text-white transition-all duration-300 shadow-sm">
                  <Printer className="w-6 h-6 text-amber-500 group-hover:text-white" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-900 px-3 py-1 rounded-full border border-amber-200">
                  Emisión Presencial
                </span>
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide group-hover:text-[#003087] transition-colors">
                  Kiosko de Turnos (Clientes)
                </h3>
                <p className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">
                  Dirección Nacional de Cedulación
                </p>
                <p className="text-xs text-slate-500 leading-relaxed font-medium pt-1">
                  Emita tickets para cédula por primera vez, renovación, duplicado, cédula juvenil o certificados.
                </p>
              </div>
            </div>

            <div className="border-t border-slate-100 mt-4 pt-3 w-full flex items-center justify-between text-[#003087] group-hover:text-amber-600 font-sans transition-colors">
              <span className="text-[10.5px] font-black uppercase tracking-widest">
                Abrir Kiosko de Turnos →
              </span>
              <span className="text-[9px] text-slate-450 font-bold uppercase">
                /kiosco
              </span>
            </div>
          </button>

          {/* OPTION 3: PANTALLAS DE TELEVISOR / MONITORES DE SALA */}
          {onSelectView && (
            <button
              type="button"
              id="gateway-opt-tv"
              onClick={() => onSelectView("tv/general")}
              className="group flex flex-col text-left justify-between bg-gradient-to-b from-slate-900 to-[#0c1f4a] text-white border-2 border-slate-800 rounded-3xl p-5 hover:border-amber-400 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer relative shadow-md"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3.5 bg-purple-500/20 border border-purple-400/30 text-purple-300 rounded-2xl group-hover:bg-purple-600 group-hover:text-white transition-all duration-300 shadow-md">
                    <Tv className="w-6 h-6 text-amber-400" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-purple-400/20 text-purple-200 px-3 py-1 rounded-full border border-purple-400/30">
                    Monitores de Sala
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide group-hover:text-amber-300 transition-colors">
                    Pantallas de Televisor (TV Sala)
                  </h3>
                  <p className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">
                    Llamado Sonoro y Visual de Turnos
                  </p>
                  <p className="text-xs text-slate-300 leading-relaxed font-medium pt-1">
                    Visualización en tiempo real para pantallas LED: Sala de Caja, Tríada/Foto, Registro Civil y Multicanal.
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-800 mt-4 pt-3 w-full flex items-center justify-between text-amber-400 group-hover:text-amber-300 font-sans transition-colors">
                <span className="text-[10.5px] font-black uppercase tracking-widest">
                  Abrir Pantalla de TV →
                </span>
                <span className="text-[9px] text-slate-400 font-bold uppercase">
                  /tv
                </span>
              </div>
            </button>
          )}

          {/* OPTION 4: CONSOLA DEL AGENTE (ATENCIÓN EN VENTANILLA) */}
          {onSelectView && (
            <button
              type="button"
              id="gateway-opt-agente"
              onClick={() => onSelectView("agente")}
              className="group flex flex-col text-left justify-between bg-white border-2 border-slate-200 rounded-3xl p-5 hover:border-emerald-600 hover:shadow-xl hover:scale-[1.01] transition-all duration-300 cursor-pointer relative hover:bg-emerald-50/20"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl group-hover:bg-emerald-600 group-hover:text-white transition-all duration-300 shadow-sm">
                    <UserCheck className="w-6 h-6 text-emerald-600 group-hover:text-white" />
                  </div>
                  <span className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-900 px-3 py-1 rounded-full border border-emerald-200">
                    Funcionarios
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase tracking-wide group-hover:text-emerald-700 transition-colors">
                    Portal de Agentes y Citas
                  </h3>
                  <p className="text-[9.5px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">
                    Operación de Ventanillas y Administración de Citas
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed font-medium pt-1">
                    Llamado de turnos en Caja/Tríada y control integral de citas (Extranjería, Pasados de Edad, agendas y reportes).
                  </p>
                </div>
              </div>

              <div className="border-t border-slate-100 mt-4 pt-3 w-full flex items-center justify-between text-emerald-700 group-hover:text-emerald-800 font-sans transition-colors">
                <span className="text-[10.5px] font-black uppercase tracking-widest">
                  Ingresar a Consola de Agente →
                </span>
                <span className="text-[9px] text-slate-450 font-bold uppercase">
                  /agente
                </span>
              </div>
            </button>
          )}
        </div>

        {/* OPTION 5: SEGUIMIENTO MÓVIL DE TURNO */}
        {onSelectView && (
          <div className="max-w-4xl mx-auto w-full">
            <button
              type="button"
              id="gateway-opt-seguimiento"
              onClick={() => onSelectView("seguimiento")}
              className="w-full bg-gradient-to-r from-[#003087] via-[#122e70] to-[#003087] text-white border-2 border-blue-700/60 rounded-3xl p-4.5 sm:p-5 hover:border-amber-400 hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-4 text-left group"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-amber-400 text-slate-950 rounded-2xl group-hover:scale-105 transition-transform shrink-0 shadow-md">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-amber-400/20 text-amber-300 text-[9px] font-black uppercase tracking-wider rounded-full mb-1 border border-amber-400/30">
                    <span>Vibración en Celular</span>
                  </div>
                  <h3 className="text-sm sm:text-base font-black uppercase text-white tracking-wide group-hover:text-amber-300 transition-colors">
                    ¿Ya tiene su Ticket Impreso? Seguimiento Móvil
                  </h3>
                  <p className="text-xs text-blue-100/90 font-medium">
                    Consulte el avance de su turno en tiempo real desde cualquier dispositivo móvil.
                  </p>
                </div>
              </div>
              <span className="px-4 py-2 bg-amber-400 group-hover:bg-amber-300 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl whitespace-nowrap shadow-sm shrink-0">
                Consultar Turno →
              </span>
            </button>
          </div>
        )}

        {/* Informative bottom card */}
        <div className="bg-blue-50/60 border border-blue-100/80 rounded-2xl p-4 max-w-lg mx-auto flex items-start gap-3 shadow-xs">
          <Info className="w-4 h-4 text-[#003087] shrink-0 mt-0.5" />
          <p className="text-[10.5px] text-blue-900 font-semibold leading-relaxed">
            <strong>Acceso Directo:</strong> Puede acceder directamente a cualquier pantalla mediante su dirección URL: <code>/kiosco</code>, <code>/tv</code>, <code>/agente</code>, <code>/citas</code> o <code>/seguimiento</code>.
          </p>
        </div>

        <div className="text-center mt-2">
          <span className="text-[10px] text-slate-400 font-mono font-medium uppercase tracking-widest">
            V5.15-TEST
          </span>
        </div>

      </div>
    </div>
  );
}

