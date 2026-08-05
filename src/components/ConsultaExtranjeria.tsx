import React, { useState } from 'react';
import { 
  Globe, 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  Info, 
  Calendar, 
  MapPin, 
  PhoneCall, 
  User, 
  ShieldAlert
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConsultaExtranjeriaProps {
  onRedirectToBook: (passportNum: string) => void;
}

interface VerificationResult {
  found: boolean;
  record?: {
    pasaporte: string;
    nombre: string;
    nacionalidad?: string;
    elegible: boolean;
    motivo: string;
  };
  message?: string;
}

export default function ConsultaExtranjeria({ onRedirectToBook }: ConsultaExtranjeriaProps) {
  const [pasaporteInput, setPasaporteInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [lastQueried, setLastQueried] = useState('');

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pasaporteInput.trim()) return;

    setLoading(true);
    setResult(null);
    const searchPassport = pasaporteInput.trim().toUpperCase();
    setLastQueried(searchPassport);

    try {
      const response = await fetch('/api/extranjeria/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pasaporte: searchPassport })
      });
      const data = await response.json();
      if (data && data.success) {
        setResult({
          found: data.found,
          record: data.record,
          message: data.message
        });
      } else {
        setResult({
          found: false,
          message: "No se pudo establecer conexión con la pasarela de control migratorio. Intente de nuevo más tarde."
        });
      }
    } catch (err) {
      console.error(err);
      setResult({
        found: false,
        message: "Error de red al establecer comunicación con el portal tecnológico de Extranjería. Intente presencialmente."
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div id="consulta-extranjeria-container" className="bg-white border border-slate-200 rounded shadow-sm p-4 md:p-6 space-y-6">
      
      {/* SECTION BANNER HEADER */}
      <div className="border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-50 p-2.5 rounded-lg border border-blue-100">
            <Globe className="w-6 h-6 text-blue-700" />
          </div>
          <div>
            <h3 className="text-base font-black uppercase text-blue-950 tracking-wider">Validación de Turno de Extranjería</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">
              Consulte si su documento de pasaporte se encuentra habilitado por el Servicio Nacional de Migración (SNM) de Panamá para tramitar su cédula presencial sin contratiempos.
            </p>
          </div>
        </div>
      </div>

      {/* CORE SEARCH FORM */}
      <form onSubmit={handleVerify} className="max-w-lg mx-auto space-y-4 pt-2">
        <div className="space-y-1.5">
          <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider block">Ingrese su número de pasaporte completo</label>
          <div className="relative flex gap-2">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                placeholder="Ejemplo: PA123456"
                value={pasaporteInput}
                onChange={(e) => setPasaporteInput(e.target.value)}
                className="w-full bg-slate-50 border border-slate-250 text-slate-800 rounded pl-11 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 focus:bg-white uppercase font-black tracking-wider"
              />
            </div>
            <button
              type="submit"
              disabled={loading || !pasaporteInput.trim()}
              className="bg-blue-900 hover:bg-blue-950 text-white font-extrabold text-xs uppercase tracking-widest px-6 rounded transition shadow-md flex items-center gap-2 whitespace-nowrap cursor-pointer disabled:opacity-50"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span>Validar</span>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* RESULTS DISPLAY PANEL */}
      <AnimatePresence mode="wait">
        {result && (
          <motion.div
            key={lastQueried}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="max-w-2xl mx-auto pt-2"
          >
            {result.found && result.record ? (
              result.record.elegible ? (
                /* 🟢 CASE 1: AUTHORIZED / ELEGIBLE CLIENT */
                <div role="status" className="bg-emerald-50 border border-emerald-250 rounded-lg p-5 space-y-4 shadow-sm animate-fade-in text-emerald-950">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="w-10 h-10 text-emerald-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-emerald-700 bg-emerald-100 border border-emerald-200 px-2 py-0.5 rounded">
                        Estatus: AUTORIZADO (ELEGIBLE)
                      </span>
                      <h4 className="text-sm font-extrabold text-emerald-950 leading-snug">
                        ¡Hola {result.record.nombre}! Usted califica para agendar cita.
                      </h4>
                      <p className="text-xs text-emerald-800 leading-relaxed font-semibold">
                        El Servicio Nacional de Migración ha validado su expediente del Pasaporte <strong className="font-mono tracking-wider text-emerald-900">{result.record.pasaporte}</strong> de nacionalidad <strong className="text-emerald-900 font-extrabold">{result.record.nacionalidad}</strong> como apto para tramitar.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-emerald-100 p-3 rounded text-xs space-y-1.5 font-sans">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Observación Oficial SNM:</span>
                    <p className="text-slate-800 italic leading-relaxed font-medium">
                      "{result.record.motivo}"
                    </p>
                  </div>

                  <div className="border-t border-emerald-200/55 pt-3.5 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <span className="text-[10px] text-emerald-700 font-bold leading-relaxed max-w-sm">
                      * Su turno será validado contra esta base presencialmente. Proceda a agendar su cita en la sucursal de preferencia.
                    </span>
                    <button
                      type="button"
                      onClick={() => onRedirectToBook(lastQueried)}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs uppercase tracking-wider py-2 px-5 rounded transition shadow-md flex items-center gap-1.5 shrink-0 grow sm:grow-0 cursor-pointer"
                    >
                      <Calendar className="w-4 h-4" />
                      Proceder a Agendar Cita
                    </button>
                  </div>
                </div>
              ) : (
                /* 🔴 CASE 2: UNAUTHORIZED / SUSPENDED */
                <div role="status" className="bg-red-50 border border-red-250 rounded-lg p-5 space-y-4 shadow-sm animate-fade-in text-red-950">
                  <div className="flex items-start gap-3">
                    <ShieldAlert className="w-10 h-10 text-red-650 shrink-0 mt-0.5 animate-pulse" />
                    <div className="space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-widest text-red-700 bg-red-100 border border-red-200 px-2 py-0.5 rounded">
                        Estatus: NO ELEGIBLE (REVISIÓN)
                      </span>
                      <h4 className="text-sm font-extrabold text-red-950 leading-snug">
                        Validación Pendiente para: {result.record.nombre}
                      </h4>
                      <p className="text-xs text-red-800 leading-relaxed font-semibold">
                        Su pasaporte <strong className="font-mono tracking-wider text-red-900">{result.record.pasaporte}</strong> de nacionalidad <strong className="text-red-900 font-extrabold">{result.record.nacionalidad}</strong> presenta retenciones administrativas u observaciones en el sistema.
                      </p>
                    </div>
                  </div>

                  <div className="bg-white border border-red-100 p-3.5 rounded text-xs space-y-1.5 font-sans text-left">
                    <span className="text-[10px] font-bold text-red-500 uppercase tracking-widest block">Restricción Reportada:</span>
                    <p className="text-slate-800 font-extrabold leading-relaxed bg-red-50/50 p-2 rounded.5 border border-dashed border-red-200 italic">
                      "{result.record.motivo}"
                    </p>
                  </div>

                  <div className="bg-slate-100 p-3 rounded.5 border border-slate-200.5 flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-500 shrink-0" />
                    <span className="text-[10px] text-slate-650 font-medium">
                      <strong>Requisito Resolutivo:</strong> Para regularizar su perfil, debe acudir presencialmente a la sede de Migración Panamá para solventar las retenciones indicadas antes de agendar.
                    </span>
                  </div>
                </div>
              )
            ) : (
              /* 🟡 CASE 3: PASSPORT NOT REGISTERED */
              <div role="status" className="bg-amber-50 border border-amber-250 rounded-lg p-5 space-y-4 shadow-sm animate-fade-in text-amber-950">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-10 h-10 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-700 bg-amber-105 border border-amber-200 px-2 py-0.5 rounded">
                      Estatus: NO ENCONTRADO
                    </span>
                    <h4 className="text-sm font-extrabold text-amber-950 leading-snug">
                      Documento No Registrado
                    </h4>
                    <p className="text-xs text-amber-800 leading-relaxed font-semibold">
                      El número de pasaporte <strong className="font-mono tracking-wider text-amber-900 uppercase font-bold">{lastQueried}</strong> ingresado no figura aún en el listado tecnológico consolidado por Inmigración para agendar turnos automatizados.
                    </p>
                  </div>
                </div>

                <div className="bg-white border border-amber-100 p-3.5 rounded text-xs space-y-1.5 leading-relaxed font-sans text-slate-700 font-medium">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">¿Qué significa esto?</span>
                  <p>
                    Su aprobación definitiva como extranjero puede no haberse transmitido aún o estar en proceso de firma intermedia. Acuda de forma presencial con su resolución de migración foliada a la sucursal de Ancon del Tribunal Electoral, o consulte con un soporte institucional de extranjería.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* INFORMATIONAL CARDS GRID FOOTER */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-slate-100">
        <div className="bg-slate-50 border border-slate-200 p-4 rounded text-center space-y-1">
          <Calendar className="w-5 h-5 text-blue-700 mx-auto" />
          <h4 className="text-[11px] font-extrabold text-blue-950 uppercase tracking-wider">Habilitación Previa</h4>
          <p className="text-[10px] text-slate-550 leading-relaxed">
            Debe contar con resolución residencial aprobada por el SNM para realizar el trámite presencial de cedulación.
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-4 rounded text-center space-y-1">
          <MapPin className="w-5 h-5 text-blue-700 mx-auto" />
          <h4 className="text-[11px] font-extrabold text-blue-950 uppercase tracking-wider">Sede Exclusiva</h4>
          <p className="text-[10px] text-slate-550 leading-relaxed">
            La atención técnica biométrica para Cédula de Extranjería se asocia preferencialmente al edificio central de Ancón, Panamá de lunes a viernes.
          </p>
        </div>
        <div className="bg-slate-50 border border-slate-200 p-4 rounded text-center space-y-1">
          <PhoneCall className="w-5 h-5 text-blue-700 mx-auto" />
          <h4 className="text-[11px] font-extrabold text-blue-950 uppercase tracking-wider">Centro de Llamadas</h4>
          <p className="text-[10px] text-slate-550 leading-relaxed">
            Ante cualquier discrepancia en su pasaporte, comuníquese telefónicamente al número único 312-SNM (766) para aclaraciones expeditas.
          </p>
        </div>
      </div>

    </div>
  );
}
