import React, { useState } from 'react';
import { 
  Building2, 
  ArrowLeft, 
  Calendar, 
  Users, 
  HeartHandshake, 
  CheckCircle2, 
  Clock, 
  Info,
  ChevronRight
} from 'lucide-react';

interface VisitasGuiadasFormProps {
  onBack: () => void;
}

export default function VisitasGuiadasForm({ onBack }: VisitasGuiadasFormProps) {
  // Form state
  const [formData, setFormData] = useState({
    nombre: '',
    identificacion: '',
    correo: '',
    telefono: '',
    tieneDiscapacidad: false,
    tipoVisitante: 'Persona individual',
    nombreInstitucion: '',
    cantidadPersonas: '1 persona',
    responsableGrupo: '',
    cargoRelacion: '',
    fechaPreferida: '',
    horarioPreferido: '9:00 a.m.',
    fechaAlternativa: '',
    intereses: [] as string[],
    motivo: '',
    aceptaCondiciones: false,
    aceptaConfirmacion: false
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Lists of options
  const tiposVisitante = [
    'Persona individual',
    'Grupo escolar',
    'Universidad',
    'Institución',
    'Organización',
    'Otro'
  ];

  const rangosPersonas = [
    '1 persona',
    '2 a 5 personas',
    '6 a 10 personas',
    '11 a 15 personas',
    '16 a 20 personas'
  ];

  const horarios = [
    '9:00 a.m.',
    '10:00 a.m.',
    '11:00 a.m.',
    '2:00 p.m.',
    '3:00 p.m.'
  ];

  const interesesRecorrido = [
    'Historia del Tribunal Electoral',
    'Funciones del Tribunal Electoral',
    'Democracia y procesos electorales',
    'Registro Civil',
    'Cedulación',
    'Espacios institucionales',
    'Todo el recorrido general'
  ];

  const handleInterestChange = (interes: string) => {
    setFormData(prev => {
      const isSelected = prev.intereses.includes(interes);
      if (isSelected) {
        return {
          ...prev,
          intereses: prev.intereses.filter(i => i !== interes)
        };
      } else {
        return {
          ...prev,
          intereses: [...prev.intereses, interes]
        };
      }
    });
  };

  const isGroup = formData.cantidadPersonas !== '1 persona' || formData.tipoVisitante !== 'Persona individual';

  const getExistingVisits = () => {
    try {
      const stored = localStorage.getItem('te_panama_visitas_guiadas');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  };

  const getPersonCount = (rango: string): number => {
    if (!rango) return 1;
    if (rango === '1 persona' || rango.includes('1 persona')) return 1;
    const match = rango.match(/(\d+)\s+a\s+(\d+)/);
    if (match) {
      return parseInt(match[2], 10); // Use the maximum value of the range
    }
    return 1;
  };

  const getOccupiedSpaces = (dateStr: string) => {
    if (!dateStr) return 0;
    const visits = getExistingVisits();
    let total = 0;
    visits.forEach((v: any) => {
      if (v.fechaPreferida === dateStr && v.estado !== 'cancelada') {
        total += getPersonCount(v.cantidadPersonas);
      }
    });
    return total;
  };

  const currentGroupSize = formData.tipoVisitante === 'Persona individual' ? 1 : getPersonCount(formData.cantidadPersonas);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.nombre.trim()) {
      newErrors.nombre = 'El nombre completo es obligatorio';
    }
    if (!formData.identificacion.trim()) {
      newErrors.identificacion = 'El número de cédula o pasaporte es obligatorio';
    }
    if (!formData.correo.trim()) {
      newErrors.correo = 'El correo electrónico es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.correo)) {
      newErrors.correo = 'El formato de correo no es válido';
    }
    if (!formData.telefono.trim()) {
      newErrors.telefono = 'El número de teléfono / WhatsApp es obligatorio';
    }

    if (formData.tipoVisitante !== 'Persona individual' && !formData.nombreInstitucion.trim()) {
      newErrors.nombreInstitucion = 'Especifique el nombre de la institución o escuela';
    }

    if (isGroup && !formData.responsableGrupo.trim()) {
      newErrors.responsableGrupo = 'El nombre del responsable del grupo es obligatorio';
    }

    if (!formData.fechaPreferida) {
      newErrors.fechaPreferida = 'Debe seleccionar una fecha preferida';
    } else {
      const occupied = getOccupiedSpaces(formData.fechaPreferida);
      const remaining = 20 - occupied;
      const requested = currentGroupSize;
      if (remaining <= 0) {
        newErrors.fechaPreferida = 'Esta fecha está completamente agotada (20 de 20 cupos utilizados). Elija otra.';
      } else if (remaining < requested) {
        newErrors.fechaPreferida = `No hay suficientes cupos libres para el tamaño de su grupo. Solo quedan ${remaining} cupos de 20 disponibles, pero su grupo requiere ${requested} cupos.`;
      }
    }

    if (formData.fechaAlternativa) {
      const occupiedAlt = getOccupiedSpaces(formData.fechaAlternativa);
      const remainingAlt = 20 - occupiedAlt;
      const requested = currentGroupSize;
      if (remainingAlt <= 0) {
        newErrors.fechaAlternativa = 'La fecha alternativa seleccionada también está completamente agotada (20 de 20 cupos utilizados).';
      } else if (remainingAlt < requested) {
        newErrors.fechaAlternativa = `La fecha alternativa no cuenta con cupos suficientes. Solo quedan ${remainingAlt} cupos de 20.`;
      }
    }

    if (!formData.aceptaCondiciones) {
      newErrors.aceptaCondiciones = 'Debe confirmar y autorizar las condiciones';
    }
    if (!formData.aceptaConfirmacion) {
      newErrors.aceptaConfirmacion = 'Debe aceptar recibir confirmaciones';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      // Save to localStorage so administrators can keep track of requests
      try {
        const stored = localStorage.getItem('te_panama_visitas_guiadas');
        const list = stored ? JSON.parse(stored) : [];
        const newRequest = {
          id: `VG-${Date.now()}`,
          fechaRegistro: new Date().toISOString(),
          estado: 'pendiente',
          ...formData
        };
        list.push(newRequest);
        localStorage.setItem('te_panama_visitas_guiadas', JSON.stringify(list));
      } catch (err) {
        console.warn('No se pudo persistir el registro de visita guiada', err);
      }

      setSubmitted(true);
    } else {
      // Scroll to the first error
      const errorKeys = Object.keys(errors);
      if (errorKeys.length > 0) {
        const firstErrorElement = document.getElementById(`field-${errorKeys[0]}`);
        if (firstErrorElement) {
          firstErrorElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }
    }
  };

  if (submitted) {
    return (
      <div className="max-w-xl mx-auto py-10 px-6 text-center space-y-6 animate-fade-in bg-white rounded-2xl border border-slate-100 shadow-xl mt-4">
        <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto text-emerald-600">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        
        <div className="space-y-2">
          <h3 className="text-xl font-extrabold text-slate-800">
            ¡Registro Recibido con Éxito!
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed font-medium">
            Gracias por registrarte para las visitas guiadas al Tribunal Electoral de Panamá.
          </p>
        </div>

        <div className="bg-slate-50 border border-slate-100 rounded-xl p-5 text-left text-xs text-slate-550 leading-relaxed space-y-2 font-medium">
          <p className="font-bold text-slate-700">¿Qué sigue ahora?</p>
          <p>
            Tu solicitud ha sido recibida correctamente. El equipo organizador de Relaciones Públicas revisará la disponibilidad de fecha, horario y cupo, y se estará comunicando contigo por correo electrónico o WhatsApp para confirmar oficialmente la visita.
          </p>
        </div>

        <div className="pt-4">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
          >
            Regresar al Inicio
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header section with inline Back Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-slate-150 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/50 flex items-center justify-center text-indigo-700">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold uppercase text-indigo-600 px-2 py-0.5 rounded bg-indigo-50">
              Servicio Institucional
            </span>
            <h2 className="text-lg font-black text-slate-800 leading-snug">
              Registro para Visitas Guiadas
            </h2>
          </div>
        </div>

        <button
          type="button"
          onClick={onBack}
          className="md:self-center px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-850 rounded-lg transition text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer bg-white"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Otras Opciones
        </button>
      </div>

      {/* Sede Principal Only Notice Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 shadow-xs">
        <Info className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs text-amber-900 leading-relaxed font-medium">
          <strong className="font-extrabold text-amber-950 uppercase tracking-wide block mb-0.5">Sede Única de Recorrido</strong>
          Las visitas guiadas se realizan de manera exclusiva en la <strong className="font-black text-amber-950">Sede Principal del Tribunal Electoral</strong> (Ancón, Ciudad de Panamá). Por favor, considere esto al programar su traslado.
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* SECTION A: DATOS PERSONALES */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm relative overflow-hidden">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-full translate-x-12 -translate-y-12 opacity-50 -z-0"></div>
          <div className="relative z-10">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-extrabold flex items-center justify-center">A</span>
              Datos Personales
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div id="field-nombre" className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  Nombre Completo <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: Juan Antonio Pérez Gómez"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border ${errors.nombre ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'} rounded-lg focus:outline-none focus:ring-2 font-medium text-slate-800`}
                />
                {errors.nombre && <p className="text-[10px] font-bold text-red-500 mt-0.5">{errors.nombre}</p>}
              </div>

              <div id="field-identificacion" className="space-y-1.5">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  Número de Cédula o Pasaporte <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: 8-123-456 o N-12345"
                  value={formData.identificacion}
                  onChange={(e) => setFormData(prev => ({ ...prev, identificacion: e.target.value }))}
                  className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border ${errors.identificacion ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'} rounded-lg focus:outline-none focus:ring-2 font-medium text-slate-800`}
                />
                {errors.identificacion && <p className="text-[10px] font-bold text-red-500 mt-0.5">{errors.identificacion}</p>}
              </div>

              <div id="field-correo" className="space-y-1.5">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  Correo Electrónico <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  placeholder="usuario@ejemplo.com"
                  value={formData.correo}
                  onChange={(e) => setFormData(prev => ({ ...prev, correo: e.target.value }))}
                  className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border ${errors.correo ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'} rounded-lg focus:outline-none focus:ring-2 font-medium text-slate-800`}
                />
                {errors.correo && <p className="text-[10px] font-bold text-red-500 mt-0.5">{errors.correo}</p>}
              </div>

              <div id="field-telefono" className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  Número de Teléfono / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ej: +507 6612-3456"
                  value={formData.telefono}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono: e.target.value }))}
                  className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border ${errors.telefono ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'} rounded-lg focus:outline-none focus:ring-2 font-medium text-slate-800`}
                />
                {errors.telefono && <p className="text-[10px] font-bold text-red-500 mt-0.5">{errors.telefono}</p>}
              </div>

              <div id="field-discapacidad" className="flex items-start gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg transition hover:bg-slate-100 col-span-1 md:col-span-2">
                <input
                  type="checkbox"
                  id="visita_tiene_discapacidad"
                  checked={formData.tieneDiscapacidad}
                  onChange={(e) => setFormData(prev => ({ ...prev, tieneDiscapacidad: e.target.checked }))}
                  className="mt-1 h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                />
                <div className="flex flex-col gap-0.5 cursor-pointer select-none" onClick={() => setFormData(prev => ({ ...prev, tieneDiscapacidad: !prev.tieneDiscapacidad }))}>
                  <label htmlFor="visita_tiene_discapacidad" className="text-xs font-bold text-slate-800 cursor-pointer">
                    Indique si tiene alguna discapacidad (marque la casilla si aplica)
                  </label>
                  <span className="text-[10px] text-slate-500">
                    Esta información nos ayuda a brindarle una atención preferencial y adecuada a sus necesidades.
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION B: TIPO DE VISITANTE */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-extrabold flex items-center justify-center">B</span>
              Tipo de Visitante
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                  ¿Cómo desea registrarse? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {tiposVisitante.map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, tipoVisitante: tipo }))}
                      className={`px-3 py-2 text-xs rounded-xl border text-left font-bold transition-all cursor-pointer flex items-center justify-between ${
                        formData.tipoVisitante === tipo
                          ? 'border-blue-600 bg-blue-50/50 text-blue-900 ring-1 ring-blue-600/30'
                          : 'border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      <span>{tipo}</span>
                      {formData.tipoVisitante === tipo && (
                        <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {formData.tipoVisitante !== 'Persona individual' && (
                <div id="field-nombreInstitucion" className="space-y-1.5 animate-fade-in">
                  <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                    Nombre de la institución, escuela, universidad u organización <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="Ej: Escuela República de Panamá / Universidad Tecnológica"
                    value={formData.nombreInstitucion}
                    onChange={(e) => setFormData(prev => ({ ...prev, nombreInstitucion: e.target.value }))}
                    className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border ${errors.nombreInstitucion ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'} rounded-lg focus:outline-none focus:ring-2 font-medium text-slate-800`}
                  />
                  {errors.nombreInstitucion && <p className="text-[10px] font-bold text-red-500 mt-0.5">{errors.nombreInstitucion}</p>}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* SECTION C: INFORMACIÓN DEL GRUPO */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-extrabold flex items-center justify-center">C</span>
              Información del Grupo
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 col-span-1 md:col-span-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                  Cantidad de personas que asistirán <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.cantidadPersonas}
                  onChange={(e) => setFormData(prev => ({ ...prev, cantidadPersonas: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-850 cursor-pointer"
                >
                  {rangosPersonas.map((rango) => (
                    <option key={rango} value={rango}>
                      {rango}
                    </option>
                  ))}
                </select>
              </div>

              {isGroup && (
                <>
                  <div id="field-responsableGrupo" className="space-y-1.5 col-span-1 md:col-span-2 animate-fade-in">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                      Nombre del responsable del grupo <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Ej: Prof. María Castro"
                      value={formData.responsableGrupo}
                      onChange={(e) => setFormData(prev => ({ ...prev, responsableGrupo: e.target.value }))}
                      className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border ${errors.responsableGrupo ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'} rounded-lg focus:outline-none focus:ring-2 font-medium text-slate-800`}
                    />
                    {errors.responsableGrupo && <p className="text-[10px] font-bold text-red-500 mt-0.5">{errors.responsableGrupo}</p>}
                  </div>

                  <div className="space-y-1.5 col-span-1 md:col-span-2 animate-fade-in">
                    <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                      Cargo o relación con el grupo
                    </label>
                    <span className="text-[10px] text-slate-400 font-semibold block -mt-1 mb-1">
                      Ejemplos: docente, coordinador, padre/madre, representante institucional
                    </span>
                    <input
                      type="text"
                      placeholder="Ej: Docente de Cívica"
                      value={formData.cargoRelacion}
                      onChange={(e) => setFormData(prev => ({ ...prev, cargoRelacion: e.target.value }))}
                      className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800"
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* SECTION D: FECHA Y HORARIO */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-extrabold flex items-center justify-center">D</span>
              Fecha y Horario
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div id="field-fechaPreferida" className="space-y-1.5">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-blue-600" />
                  Fecha preferida para la visita <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={formData.fechaPreferida}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData(prev => ({ ...prev, fechaPreferida: e.target.value }))}
                  className={`w-full px-3.5 py-2.5 text-xs bg-slate-50 border ${errors.fechaPreferida ? 'border-red-400 focus:ring-red-500' : 'border-slate-200 focus:ring-blue-500'} rounded-lg focus:outline-none focus:ring-2 font-bold text-slate-850 cursor-pointer`}
                />
                {formData.fechaPreferida && (
                  <div className="mt-1.5 p-2 bg-slate-50 border border-slate-150 rounded-lg text-[11px] font-medium leading-relaxed">
                    {(() => {
                      const occupied = getOccupiedSpaces(formData.fechaPreferida);
                      const remaining = 20 - occupied;
                      const requested = currentGroupSize;
                      if (remaining <= 0) {
                        return <span className="text-red-650 font-bold flex items-center gap-1">❌ Esta fecha está completamente agotada (0 cupos libres de 20).</span>;
                      } else if (remaining < requested) {
                        return <span className="text-amber-650 font-bold flex items-center gap-1">⚠️ Quedan solo {remaining} cupos de 20, pero su grupo es de {requested} personas.</span>;
                      } else {
                        return <span className="text-emerald-650 font-bold flex items-center gap-1">✅ ¡Disponible! Quedan {remaining} de 20 cupos libres para el tamaño de su grupo ({requested} {requested === 1 ? 'persona' : 'personas'}).</span>;
                      }
                    })()}
                  </div>
                )}
                {errors.fechaPreferida && <p className="text-[10px] font-bold text-red-500 mt-0.5">{errors.fechaPreferida}</p>}
              </div>

              <div id="field-fechaAlternativa" className="space-y-1.5">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Fecha alternativa (Recomendable)
                </label>
                <input
                  type="date"
                  value={formData.fechaAlternativa}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setFormData(prev => ({ ...prev, fechaAlternativa: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold text-slate-850 cursor-pointer"
                />
                {formData.fechaAlternativa && (
                  <div className="mt-1.5 p-2 bg-slate-50 border border-slate-150 rounded-lg text-[11px] font-medium leading-relaxed">
                    {(() => {
                      const occupiedAlt = getOccupiedSpaces(formData.fechaAlternativa);
                      const remainingAlt = 20 - occupiedAlt;
                      const requested = currentGroupSize;
                      if (remainingAlt <= 0) {
                        return <span className="text-red-650 font-bold flex items-center gap-1">❌ Fecha alternativa agotada (0 cupos de 20).</span>;
                      } else if (remainingAlt < requested) {
                        return <span className="text-amber-650 font-bold flex items-center gap-1">⚠️ Solo quedan {remainingAlt} cupos de 20 para su grupo.</span>;
                      } else {
                        return <span className="text-emerald-650 font-bold flex items-center gap-1">✅ Alternativa viable: Quedan {remainingAlt} de 20 cupos libres.</span>;
                      }
                    })()}
                  </div>
                )}
                {errors.fechaAlternativa && <p className="text-[10px] font-bold text-red-500 mt-0.5">{errors.fechaAlternativa}</p>}
              </div>

              <div className="space-y-2 col-span-1 md:col-span-2 pt-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Horario preferido <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                  {horarios.map((h) => (
                    <button
                      key={h}
                      type="button"
                      onClick={() => setFormData(p => ({ ...p, horarioPreferido: h }))}
                      className={`px-2 py-2 text-xs rounded-lg border text-center font-extrabold transition-all cursor-pointer ${
                        formData.horarioPreferido === h
                          ? 'border-blue-600 bg-blue-50 text-blue-900 ring-1 ring-blue-600/20'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-55 shadow-sm'
                      }`}
                    >
                      {h}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION E: INTERÉS DE LA VISITA */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4 shadow-sm">
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-100 pb-2 mb-4">
              <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-extrabold flex items-center justify-center">E</span>
              Interés de la Visita
            </h3>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider block">
                  ¿Qué le gustaría conocer durante el recorrido? <span className="text-slate-400">(Seleccione todas las que apliquen)</span>
                </label>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                  {interesesRecorrido.map((int) => {
                    const isChecked = formData.intereses.includes(int);
                    return (
                      <button
                        key={int}
                        type="button"
                        onClick={() => handleInterestChange(int)}
                        className={`p-3 rounded-xl border text-left text-xs font-bold transition-all flex items-center gap-3 cursor-pointer ${
                          isChecked
                            ? 'border-blue-600 bg-blue-50/40 text-blue-900'
                            : 'border-slate-150 bg-slate-50 text-slate-650 hover:bg-slate-100'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-all ${
                          isChecked ? 'bg-blue-600 border-blue-600 text-white' : 'border-slate-300 bg-white'
                        }`}>
                          {isChecked && <span className="text-[9px] font-black">✓</span>}
                        </div>
                        <span className="leading-tight">{int}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-black text-slate-600 uppercase tracking-wider">
                  Motivo de la visita
                </label>
                <span className="text-[10px] text-slate-400 font-semibold block -mt-1 mb-1">
                  Ejemplos: actividad educativa, interés ciudadano, visita institucional, turismo cívico.
                </span>
                <textarea
                  rows={3}
                  placeholder="Por favor, comparta brevemente el motivo principal de su interés en realizar esta visita parlamentaria o cívica."
                  value={formData.motivo}
                  onChange={(e) => setFormData(prev => ({ ...prev, motivo: e.target.value }))}
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-slate-800 leading-relaxed"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION F: CONDICIONES Y AUTORIZACIÓN */}
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 md:p-6 space-y-4">
          <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-2 border-b border-slate-200 pb-2 mb-3">
            <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[11px] font-extrabold flex items-center justify-center">F</span>
            Condiciones y Autorización
          </h3>

          <div className="space-y-3">
            
            <div id="field-aceptaCondiciones" className="flex items-start gap-3">
              <label className="relative flex items-center cursor-pointer mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={formData.aceptaCondiciones}
                  onChange={(e) => setFormData(p => ({ ...p, aceptaCondiciones: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                  formData.aceptaCondiciones ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-slate-350 bg-white'
                }`}>
                  {formData.aceptaCondiciones && <span className="text-[10px] font-black">✓</span>}
                </div>
              </label>
              <div className="text-xs leading-relaxed font-semibold text-slate-650">
                Confirmo que la información suministrada es correcta y que entiendo que el registro está sujeto a disponibilidad de cupo. <span className="text-red-500">*</span>
                {errors.aceptaCondiciones && <p className="text-[10px] font-bold text-red-500 mt-0.5">{errors.aceptaCondiciones}</p>}
              </div>
            </div>

            <div id="field-aceptaConfirmacion" className="flex items-start gap-3 pb-1">
              <label className="relative flex items-center cursor-pointer mt-0.5 shrink-0">
                <input
                  type="checkbox"
                  checked={formData.aceptaConfirmacion}
                  onChange={(e) => setFormData(p => ({ ...p, aceptaConfirmacion: e.target.checked }))}
                  className="sr-only peer"
                />
                <div className={`w-5 h-5 rounded border transition-all flex items-center justify-center ${
                  formData.aceptaConfirmacion ? 'bg-blue-600 border-blue-600 text-white shadow-sm' : 'border-slate-350 bg-white'
                }`}>
                  {formData.aceptaConfirmacion && <span className="text-[10px] font-black">✓</span>}
                </div>
              </label>
              <div className="text-xs leading-relaxed font-semibold text-slate-650">
                Acepto recibir confirmación o información adicional a través del correo o teléfono suministrado. <span className="text-red-500">*</span>
                {errors.aceptaConfirmacion && <p className="text-[10px] font-bold text-red-500 mt-0.5">{errors.aceptaConfirmacion}</p>}
              </div>
            </div>

          </div>
        </div>

        {/* Actions Bar */}
        <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-end gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-full sm:w-auto px-5 py-2.5 border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-800 font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer bg-white text-center"
          >
            Atrás
          </button>
          
          <button
            type="submit"
            className="w-full sm:w-auto px-6 py-2.5 bg-blue-700 hover:bg-blue-800 text-white font-extrabold text-xs uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md hover:shadow-lg"
          >
            <span>Generar Solicitud de Visita</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

      </form>
    </div>
  );
}
