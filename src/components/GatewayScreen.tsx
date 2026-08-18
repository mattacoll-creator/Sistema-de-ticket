import React from "react";
import { 
  CreditCard, 
  Info,
  CalendarCheck2
} from "lucide-react";

interface GatewayScreenProps {
  onSelectOption: (option: "cedulacion" | "registro_civil") => void;
  onSelectCitas?: () => void;
  onSelectView?: (view: string) => void;
}

export default function GatewayScreen({ onSelectOption, onSelectCitas }: GatewayScreenProps) {
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
      <div className="max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 flex-grow flex flex-col justify-center gap-8 z-10">
        
        {/* Header Block */}
        <div className="text-center space-y-4">
          <div className="flex justify-center items-center gap-3">
            <img 
              src="https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/05/AGENDATE-01.png" 
              referrerPolicy="no-referrer" 
              alt="Tribunal Electoral de Panamá" 
              className="h-16 md:h-20 w-auto object-contain drop-shadow-md select-none hover:scale-[1.02] transition-transform duration-500" 
            />
          </div>
          
          <div className="space-y-1.5">
            <h1 className="text-xs font-black uppercase tracking-[0.3em] text-[#003087]">
              República de Panamá • Tribunal Electoral
            </h1>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900">
              Sistema Unificado de Citas y Turnos
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
              Seleccione la opción deseada: Agendar una Cita Previa en Línea o emitir un Ticket de Atención Presencial en Kiosco.
            </p>
          </div>
          <div className="h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent w-48 mx-auto"></div>
        </div>

        {/* 2 Main Option Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
          {/* OPTION 1: AGENDAMIENTO DE CITAS (CITASTE) */}
          <button
            type="button"
            id="gateway-opt-citas"
            onClick={() => onSelectCitas && onSelectCitas()}
            className="group flex flex-col text-left justify-between bg-gradient-to-b from-blue-950 to-blue-900 text-white border-2 border-blue-800 rounded-3xl p-6 hover:border-amber-400 hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer relative shadow-lg"
          >
            <div className="space-y-5">
              {/* Icon & Category Indicator */}
              <div className="flex items-center justify-between">
                <div className="p-4 bg-amber-500 text-slate-950 rounded-2xl group-hover:bg-amber-400 transition-all duration-300 shadow-md">
                  <CalendarCheck2 className="w-7 h-7" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-amber-400/20 text-amber-300 px-3 py-1 rounded-full border border-amber-400/30">
                  Citas Previas
                </span>
              </div>

              {/* Text Blocks */}
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-black text-white uppercase tracking-wide group-hover:text-amber-300 transition-colors">
                  Agendamiento de Citas (CitasTE)
                </h3>
                <p className="text-[10px] text-blue-200 font-extrabold uppercase tracking-widest leading-none">
                  Portal en Línea • Citas Tecnológicas
                </p>
                <p className="text-xs text-blue-100/90 leading-relaxed font-medium pt-2">
                  Agende su cita previa por internet para trámites de extranjería, cedulación u organización electoral sin hacer filas presenciales.
                </p>
              </div>
            </div>

            {/* CTA Arrow Bar */}
            <div className="border-t border-blue-800 mt-6 pt-4 w-full flex items-center justify-between text-amber-400 group-hover:text-amber-300 font-sans transition-colors">
              <span className="text-[11px] font-black uppercase tracking-widest">
                Agendar o Consultar Cita →
              </span>
              <span className="text-[9px] text-blue-300 font-bold uppercase">
                Portal Citas
              </span>
            </div>
          </button>

          {/* OPTION 2: CEDULACION (TURNO PRESENCIAL) */}
          <button
            type="button"
            id="gateway-opt-cedulacion"
            onClick={() => onSelectOption("cedulacion")}
            className="group flex flex-col text-left justify-between bg-white border-2 border-slate-200 rounded-3xl p-6 hover:border-[#003087] hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer relative hover:bg-amber-50/10"
          >
            <div className="space-y-5">
              {/* Icon & Category Indicator */}
              <div className="flex items-center justify-between">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-sm">
                  <CreditCard className="w-7 h-7" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-850 px-3 py-1 rounded-full border border-amber-200">
                  Turno Presencial
                </span>
              </div>

              {/* Text Blocks */}
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wide group-hover:text-[#003087] transition-colors">
                  Ticket de Cedulación
                </h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">
                  Dirección Nacional de Cedulación
                </p>
                <p className="text-xs text-slate-500 leading-relaxed font-medium pt-2">
                  Trámites de cédulas para panameños por primera vez, renovaciones, duplicados, carné de residente permanente y registro biométrico.
                </p>
              </div>
            </div>

            {/* CTA Arrow Bar */}
            <div className="border-t border-slate-100 mt-6 pt-4 w-full flex items-center justify-between text-[#003087] group-hover:text-amber-600 font-sans transition-colors">
              <span className="text-[11px] font-black uppercase tracking-widest">
                Iniciar Trámite de Cédula →
              </span>
              <span className="text-[9px] text-slate-450 font-bold uppercase">
                Acceso Kiosco
              </span>
            </div>
          </button>
        </div>

        {/* Informative bottom card */}
        <div className="bg-blue-50/60 border border-blue-100/80 rounded-2xl p-4.5 max-w-lg mx-auto flex items-start gap-3 shadow-xs">
          <Info className="w-4 h-4 text-[#003087] shrink-0 mt-0.5" />
          <p className="text-[10.5px] text-blue-900 font-semibold leading-relaxed">
            <strong>Instrucciones:</strong> Si ya tiene una cita agendada en línea o desea agendar una nueva, utilice el botón <strong>Agendamiento de Citas</strong>. Para atención en kiosco físico presencial, seleccione <strong>Cedulación</strong>.
          </p>
        </div>

      </div>
    </div>
  );
}

