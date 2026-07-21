import React from "react";
import { 
  CreditCard, 
  FileText, 
  ShieldCheck, 
  Globe, 
  Info,
  Building,
  CheckCircle2,
  Lock,
  ExternalLink
} from "lucide-react";

interface GatewayScreenProps {
  onSelectOption: (option: "cedulacion" | "registro_civil") => void;
}

export default function GatewayScreen({ onSelectOption }: GatewayScreenProps) {
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
      <div className="max-w-4xl w-full mx-auto px-4 py-8 sm:py-12 flex-grow flex flex-col justify-center gap-8 z-10">
        
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
              Sistema Unificado de Turnos
            </h2>
            <p className="text-xs text-slate-500 max-w-md mx-auto font-medium">
              Por favor seleccione el departamento del Tribunal Electoral donde desea realizar su trámite presencial hoy.
            </p>
          </div>
          <div className="h-[2px] bg-gradient-to-r from-transparent via-slate-200 to-transparent w-48 mx-auto"></div>
        </div>

        {/* 2 Big Main Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto w-full">
          {/* OPTION 1: CEDULACION */}
          <button
            type="button"
            id="gateway-opt-cedulacion"
            onClick={() => onSelectOption("cedulacion")}
            className="group flex flex-col text-left justify-between bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 hover:border-[#003087] hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer relative premium-glow-amber hover:bg-gradient-to-b hover:from-white hover:to-amber-50/5"
          >
            <div className="space-y-5">
              {/* Icon & Category Indicator */}
              <div className="flex items-center justify-between">
                <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-600 rounded-2xl group-hover:bg-amber-500 group-hover:text-white transition-all duration-300 shadow-sm">
                  <CreditCard className="w-8 h-8" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-amber-100 text-amber-850 px-3 py-1 rounded-full border border-amber-200">
                  Cédulas y Carnés
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
                  Trámites de cédulas de identidad personal para ciudadanos panameños por primera vez, renovaciones, duplicados, carné de residente permanente extranjero y registro biométrico oficial.
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

          {/* OPTION 2: REGISTRO CIVIL */}
          <button
            type="button"
            id="gateway-opt-registro-civil"
            onClick={() => onSelectOption("registro_civil")}
            className="group flex flex-col text-left justify-between bg-white border-2 border-slate-200 rounded-3xl p-6 sm:p-8 hover:border-[#003087] hover:shadow-2xl hover:scale-[1.02] transition-all duration-300 cursor-pointer relative premium-glow-blue hover:bg-gradient-to-b hover:from-white hover:to-blue-50/5"
          >
            <div className="space-y-5">
              {/* Icon & Category Indicator */}
              <div className="flex items-center justify-between">
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 text-[#003087] rounded-2xl group-hover:bg-[#003087] group-hover:text-white transition-all duration-300 shadow-sm">
                  <FileText className="w-8 h-8" />
                </div>
                <span className="text-[9px] font-black uppercase tracking-widest bg-blue-50 text-[#003087] px-3 py-1 rounded-full border border-blue-100">
                  Hechos Vitales
                </span>
              </div>

              {/* Text Blocks */}
              <div className="space-y-2">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 uppercase tracking-wide group-hover:text-[#003087] transition-colors">
                  Ticket de Registro Civil
                </h3>
                <p className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest leading-none">
                  Dirección Nacional de Registro Civil
                </p>
                <p className="text-xs text-slate-500 leading-relaxed font-medium pt-2">
                  Inscripciones oficiales de hechos vitales como nacimiento, matrimonio, defunción, legalización de firmas, emisión de certificados oficiales, actas de estado civil y rectificación de datos personales.
                </p>
              </div>
            </div>

            {/* CTA Arrow Bar */}
            <div className="border-t border-slate-100 mt-6 pt-4 w-full flex items-center justify-between text-[#003087] group-hover:text-[#003087] font-sans transition-colors">
              <span className="text-[11px] font-black uppercase tracking-widest">
                Iniciar Trámite de Registro Civil →
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
            <strong>Instrucciones:</strong> El terminal físico del Kiosco se autoconfigurará según el trámite seleccionado. Recuerde tener listos los documentos de identidad correspondientes antes de emitir su ticket físico.
          </p>
        </div>

      </div>

      {/* Corporate Panama Footer */}
      <div className="border-t border-slate-200 bg-white py-4.5 px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-[10px] text-slate-400 font-medium shrink-0 relative z-10 shadow-md">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-emerald-600 animate-pulse" />
          <span className="font-extrabold uppercase tracking-wider text-slate-500">Sistema Validado • Tribunal Electoral de Panamá</span>
        </div>
        <div className="flex items-center gap-1.5 font-sans">
          <span>Servidores Locales de Sincronización Supabase Cloud DB</span>
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.7)]"></span>
        </div>
      </div>
    </div>
  );
}
