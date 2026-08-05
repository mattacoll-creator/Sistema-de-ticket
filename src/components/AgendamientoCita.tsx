import React, { useState, useMemo } from 'react';
import { Sucursal } from '../types';
import { SUCURSALES_TE, HORAS_DISPONIBLES } from '../data';
import { ArrowLeft, ArrowRight, MapPin, Calendar, Clock, Sparkles, ChevronLeft, ChevronRight, Info } from 'lucide-react';

interface AgendamientoCitaProps {
  selectedSucursalId: string | null;
  selectedFecha: string | null;
  selectedHora: string | null;
  onBack: () => void;
  onSubmit: (sucursalId: string, fecha: string, hora: string) => void;
  selectedCategoria?: string | null;
  selectedSubServicioId?: string | null;
}

function timeToMinutes(timeStr: string): number {
  const match = timeStr.trim().match(/^(\d+):(\d+)\s*(AM|PM)$/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3].toUpperCase();
  
  if (ampm === 'PM' && hours !== 12) {
    hours += 12;
  } else if (ampm === 'AM' && hours === 12) {
    hours = 0;
  }
  return hours * 60 + minutes;
}

function formatMinutes(totalMinutes: number): string {
  const norm = totalMinutes % 1440;
  let hours24 = Math.floor(norm / 60);
  const minutes = norm % 65; // supports modulo correctly for minutes
  const trueMin = norm % 60;
  
  const ampm = hours24 >= 12 ? 'PM' : 'AM';
  let hours12 = hours24 % 12;
  if (hours12 === 0) hours12 = 12;
  
  const hh = String(hours12).padStart(2, '0');
  const mm = String(trueMin).padStart(2, '0');
  return `${hh}:${mm} ${ampm}`;
}

function generateExtranjeriaSlots(inicio: string, fin: string, intervaloMinutos: number): string[] {
  const startMin = timeToMinutes(inicio);
  let endMin = timeToMinutes(fin);
  
  if (endMin <= startMin) {
    endMin += 1440; // wrap around midnight
  }
  
  const slots: string[] = [];
  for (let min = startMin; min <= endMin; min += intervaloMinutos) {
    slots.push(formatMinutes(min));
  }
  return slots;
}

export default function AgendamientoCita({
  selectedSucursalId,
  selectedFecha,
  selectedHora,
  onBack,
  onSubmit,
  selectedCategoria,
  selectedSubServicioId,
}: AgendamientoCitaProps) {
  const isExtranjeria = useMemo(() => {
    return selectedCategoria === 'extranjeria' || 
      (selectedSubServicioId && (selectedSubServicioId.includes('extranjero') || selectedSubServicioId.startsWith('ext_')));
  }, [selectedCategoria, selectedSubServicioId]);

  const isPastAgeTrámiteSelected = selectedSubServicioId === 'ced_pasados_edad';

  // Load custom settings from localStorage or fallback to standard properties
  const [extranjeriaConfig, setExtranjeriaConfig] = useState(() => {
    const start = localStorage.getItem('extranjeria_hora_inicio') || '07:00 AM';
    let end = localStorage.getItem('extranjeria_hora_fin') || '01:45 PM';
    if (end === '02:00 AM' || end === '02:00 PM') {
      end = '01:45 PM';
    }
    const interval = parseInt(localStorage.getItem('extranjeria_intervalo_minutos') || '15', 10);
    const capacity = parseInt(localStorage.getItem('extranjeria_capacidad_usuarios') || '2', 10);
    return { start, end, interval, capacity };
  });

  const [tardiaConfig, setTardiaConfig] = useState(() => {
    const start = localStorage.getItem('tardia_hora_inicio') || '08:00 AM';
    const end = localStorage.getItem('tardia_hora_fin') || '11:30 AM';
    const interval = parseInt(localStorage.getItem('tardia_intervalo_minutos') || '30', 10);
    const capacityTotal = parseInt(localStorage.getItem('tardia_capacidad_total_dia') || '4', 10);
    return { start, end, interval, capacityTotal };
  });

  // Query server to keep setup perfectly in-sync
  React.useEffect(() => {
    if (isExtranjeria) {
      fetch('/api/extranjeria/config')
        .then(res => res.json())
        .then(data => {
          if (data && data.success && data.config) {
            let { capacidad, intervalo, horaInicio, horaFin } = data.config;
            if (horaFin === '02:00 AM' || horaFin === '02:00 PM') {
              horaFin = '01:45 PM';
            }
            setExtranjeriaConfig({
              start: horaInicio,
              end: horaFin,
              interval: intervalo,
              capacity: capacidad
            });
            // Also keep localstorage synced
            localStorage.setItem('extranjeria_capacidad_usuarios', String(capacidad));
            localStorage.setItem('extranjeria_intervalo_minutos', String(intervalo));
            localStorage.setItem('extranjeria_hora_inicio', horaInicio);
            localStorage.setItem('extranjeria_hora_fin', horaFin);
          }
        })
        .catch(err => console.warn("Failed to retrieve extranjeria remote configs:", err));
    }
  }, [isExtranjeria]);

  React.useEffect(() => {
    fetch('/api/tardia/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.config) {
          const { capacidadTotalDia, intervalo, horaInicio, horaFin } = data.config;
          setTardiaConfig({
            start: horaInicio,
            end: horaFin,
            interval: intervalo,
            capacityTotal: capacidadTotalDia
          });
          localStorage.setItem('tardia_capacidad_total_dia', String(capacidadTotalDia));
          localStorage.setItem('tardia_intervalo_minutos', String(intervalo));
          localStorage.setItem('tardia_hora_inicio', horaInicio);
          localStorage.setItem('tardia_hora_fin', horaFin);
        }
      })
      .catch(err => console.warn("Failed to retrieve tardia remote configs:", err));
  }, []);

  const availableSlots = useMemo(() => {
    if (isExtranjeria) {
      return generateExtranjeriaSlots(
        extranjeriaConfig.start,
        extranjeriaConfig.end,
        extranjeriaConfig.interval
      );
    }
    if (isPastAgeTrámiteSelected) {
      return ['08:00 AM', '09:00 AM', '10:30 AM', '11:30 AM'];
    }
    return HORAS_DISPONIBLES;
  }, [isExtranjeria, isPastAgeTrámiteSelected, extranjeriaConfig]);

  // Load active bookings in order to enforce dynamic capacity constraints
  const activeBookings = useMemo(() => {
    try {
      const stored = localStorage.getItem('te_panama_citas');
      if (stored) {
        return JSON.parse(stored) as any[];
      }
    } catch (e) {
      console.error("Could not load te_panama_citas in AgendamientoCita", e);
    }
    return [];
  }, []);

  const [serverBookings, setServerBookings] = useState<any[]>([]);

  React.useEffect(() => {
    fetch('/api/appointments')
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && Array.isArray(data.appointments)) {
          setServerBookings(data.appointments);
        }
      })
      .catch((err) => console.warn("Failed to retrieve server appointments:", err));
  }, []);

  const mergedBookings = useMemo(() => {
    const map = new Map<string, any>();
    // Add local bookings
    activeBookings.forEach((b) => {
      if (b.id) map.set(b.id, b);
    });
    // Add server bookings (overwriting if same ID)
    serverBookings.forEach((sb) => {
      const mapped = {
        id: sb.id,
        fecha: sb.fecha,
        hora: sb.hora,
        subServicioId: sb.subServicioId || (sb.subServicioNombre?.toLowerCase().includes('pasado') || sb.subServicioNombre?.toLowerCase().includes('tardía') ? 'ced_pasados_edad' : undefined),
        servicioCategoria: sb.categoriaNombre,
        estado: sb.estado
      };
      map.set(sb.id, mapped);
    });
    return Array.from(map.values());
  }, [activeBookings, serverBookings]);

  const [selectedProvincia, setSelectedProvincia] = useState<string>(isExtranjeria ? 'Panamá' : 'Todos');
  const [sucursalId, setSucursalId] = useState<string>(isExtranjeria ? 'anc_main' : (selectedSucursalId || ''));
  const [fecha, setFecha] = useState<string>(selectedFecha || '');
  const [hora, setHora] = useState<string>(selectedHora || '');

  const countPasadosEdadForSelectedDay = useMemo(() => {
    if (!fecha) return 0;
    return mergedBookings.filter((c) => 
      c.fecha === fecha && 
      (c.subServicioId === 'ced_pasados_edad' || c.subServicioNombre?.toLowerCase().includes('pasado') || c.subServicioNombre?.toLowerCase().includes('tardía')) &&
      c.estado !== 'cancelada'
    ).length;
  }, [fecha, mergedBookings]);

  // Automatically switch to Ancón and Panamá province when component is loaded or switching to Extranjería or Pasados de Edad
  React.useEffect(() => {
    if (isExtranjeria || isPastAgeTrámiteSelected) {
      setSucursalId('anc_main');
      setSelectedProvincia('Panamá');
    }
  }, [isExtranjeria, isPastAgeTrámiteSelected]);

  // Extract unique provinces
  const provincias = useMemo(() => {
    if (isExtranjeria || isPastAgeTrámiteSelected) {
      return ['Panamá'];
    }
    const list = SUCURSALES_TE.map((s) => s.provincia);
    return ['Todos', ...Array.from(new Set(list))];
  }, [isExtranjeria, isPastAgeTrámiteSelected]);

  // Filter sucursales based on selected province
  const filteredSucursales = useMemo(() => {
    if (isExtranjeria || isPastAgeTrámiteSelected) {
      return SUCURSALES_TE.filter((s) => s.id === 'anc_main');
    }
    if (selectedProvincia === 'Todos') {
      return SUCURSALES_TE;
    }
    return SUCURSALES_TE.filter((s) => s.provincia === selectedProvincia);
  }, [selectedProvincia, isExtranjeria, isPastAgeTrámiteSelected]);

  const selectedSucursal = useMemo(() => {
    return SUCURSALES_TE.find((s) => s.id === sucursalId);
  }, [sucursalId]);

  // Set default calendar month to current actual month/year or selected date's month
  const [currentMonth, setCurrentMonth] = useState(() => {
    if (selectedFecha) {
      const parsed = new Date(selectedFecha + 'T12:00:00');
      if (!isNaN(parsed.getTime())) return parsed.getMonth();
    }
    return new Date().getMonth();
  });

  const [currentYear, setCurrentYear] = useState(() => {
    if (selectedFecha) {
      const parsed = new Date(selectedFecha + 'T12:00:00');
      if (!isNaN(parsed.getTime())) return parsed.getFullYear();
    }
    return new Date().getFullYear();
  });

  const MONTH_NAMES_ES = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const WEEK_DAYS_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Calculate calendar days
  const calendarCells = useMemo(() => {
    if (!selectedSucursal) return [];

    const cells: { 
      dateString: string; 
      dayNumber: number; 
      isPast: boolean; 
      isValidWorkingDay: boolean; 
      isFull: boolean;
      bookedCount: number;
      isToday: boolean;
      isEmptyCell: boolean;
    }[] = [];

    // Empty cells at the start of the month
    const firstDayOfWeek = new Date(currentYear, currentMonth, 1).getDay();
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push({
        dateString: '',
        dayNumber: 0,
        isPast: true,
        isValidWorkingDay: false,
        isFull: false,
        bookedCount: 0,
        isToday: false,
        isEmptyCell: true
      });
    }

    // Days in current month
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const todaySimulated = new Date();
    todaySimulated.setHours(0, 0, 0, 0);
    const isTuesdayToSaturday = selectedSucursal.horario.toLowerCase().includes('martes a sábado');

    const sysDateObj = new Date();
    const sysYear = sysDateObj.getFullYear();
    const sysMonth = sysDateObj.getMonth();
    const sysDay = sysDateObj.getDate();
    const todayFormattedString = `${sysYear}-${String(sysMonth + 1).padStart(2, '0')}-${String(sysDay).padStart(2, '0')}`;

    for (let day = 1; day <= daysInMonth; day++) {
      const yyyy = currentYear;
      const mm = String(currentMonth + 1).padStart(2, '0');
      const dd = String(day).padStart(2, '0');
      const dateString = `${yyyy}-${mm}-${dd}`;

      const targetDate = new Date(dateString + 'T00:00:00');
      const isPast = targetDate < todaySimulated;
      const isToday = dateString === todayFormattedString;

      // Verify sucursal working day
      const dayOfWeek = targetDate.getDay();
      let isValidWorkingDay = false;
      if (isPastAgeTrámiteSelected) {
        // Only lunes a jueves (Monday to Thursday) are permitted
        if (dayOfWeek >= 1 && dayOfWeek <= 4) {
          isValidWorkingDay = true;
        }
      } else if (isTuesdayToSaturday) {
        if (dayOfWeek >= 2 && dayOfWeek <= 6) {
          isValidWorkingDay = true;
        }
      } else {
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          isValidWorkingDay = true;
        }
      }

      // Avoid booking for today if past 15:00
      if (isToday) {
        const hObj = new Date();
        if (hObj.getHours() >= 15) {
          isValidWorkingDay = false;
        }
      }

      // Counting bookings
      let isFull = false;
      let bookedCount = 0;

      if (isExtranjeria) {
        // Daily quota limit for Extranjería = 20
        bookedCount = mergedBookings.filter((c) => 
          c.fecha === dateString && 
          (c.servicioCategoria === 'extranjeria' || c.subServicioId?.includes('extranjero') || c.subServicioId?.startsWith('ext_')) &&
          c.estado !== 'cancelada'
        ).length;
        
        if (bookedCount >= 20) {
          isFull = true;
        }
      } else if (isPastAgeTrámiteSelected) {
        // Daily limit for Tardia / Pasados de Edad
        bookedCount = mergedBookings.filter((c) => 
          c.fecha === dateString && 
          (c.subServicioId === 'ced_pasados_edad' || c.subServicioNombre?.toLowerCase().includes('pasado') || c.subServicioNombre?.toLowerCase().includes('tardía')) &&
          c.estado !== 'cancelada'
        ).length;
        
        if (bookedCount >= tardiaConfig.capacityTotal) {
          isFull = true;
        }
      }

      cells.push({
        dateString,
        dayNumber: day,
        isPast,
        isValidWorkingDay,
        isFull,
        bookedCount,
        isToday,
        isEmptyCell: false
      });
    }

    return cells;
  }, [currentMonth, currentYear, selectedSucursal, isExtranjeria, isPastAgeTrámiteSelected, mergedBookings, tardiaConfig]);

  const handlePrevMonth = () => {
    const sysDate = new Date();
    if (currentYear < sysDate.getFullYear() || (currentYear === sysDate.getFullYear() && currentMonth <= sysDate.getMonth())) return;
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentYear === 2027 && currentMonth === 11) return;
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  // Reset selected date if sucursal changes and the previously selected date is not a working day for the newly selected sucursal
  React.useEffect(() => {
    if (selectedSucursal && fecha) {
      const parsed = new Date(fecha + 'T12:00:00');
      const isTuesdayToSaturday = selectedSucursal.horario.toLowerCase().includes('martes a sábado');
      const dayOfWeek = parsed.getDay();
      let isValid = false;
      if (isTuesdayToSaturday) {
        if (dayOfWeek >= 2 && dayOfWeek <= 6) isValid = true;
      } else {
        if (dayOfWeek >= 1 && dayOfWeek <= 5) isValid = true;
      }
      if (!isValid) {
        setFecha('');
        setHora('');
      }
    } else {
      setFecha('');
      setHora('');
    }
  }, [sucursalId, selectedSucursal]);

  const formatFechaEs = (fechaStr: string) => {
    if (!fechaStr) return '';
    const parts = fechaStr.split('-');
    if (parts.length !== 3) return fechaStr;
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1;
    const day = parseInt(parts[2], 10);
    const dateObj = new Date(year, month, day);
    if (isNaN(dateObj.getTime())) return fechaStr;
    const daysEs = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const monthsEs = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    return `${daysEs[dateObj.getDay()]}, ${day} de ${monthsEs[month]} de ${year}`;
  };

  const handleBookingSubmit = () => {
    if (sucursalId && fecha && hora) {
      onSubmit(sucursalId, fecha, hora);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
        <button
          type="button"
          onClick={onBack}
          className="p-1.5 rounded hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer border border-slate-200"
          title="Regresar a selección de trámite"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h3 className="text-base font-bold text-slate-800 tracking-tight">Oficina, Fecha y Horario</h3>
          <p className="text-xs text-slate-500 font-medium">
            Seleccione la sucursal regional del Tribunal Electoral y asigne el día y la hora más convenientes para usted.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left column: Choose office (sucursal) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Seleccione la Sede <span className="text-red-500">*</span>
            </label>
            
            <select
              value={selectedProvincia}
              aria-label="Filtrar por provincia"
              onChange={(e) => setSelectedProvincia(e.target.value)}
              className="bg-white border border-slate-300 rounded py-1 px-2.5 text-xs text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-700 cursor-pointer font-semibold"
              disabled={isExtranjeria || isPastAgeTrámiteSelected}
            >
              {provincias.map((p) => (
                <option key={p} value={p}>
                  {p === 'Todos' ? 'Todas las regionales' : p}
                </option>
              ))}
            </select>
          </div>

          {isExtranjeria && (
            <div className="bg-amber-50 border border-amber-200 text-amber-950 p-3 rounded text-xs font-semibold flex flex-col gap-1.5 leading-relaxed shadow-sm">
              <span className="text-amber-800 font-extrabold uppercase tracking-wide flex items-center gap-1">
                ⚠️ Trámite Exclusivo de Extranjería
              </span>
              <span>
                Por regulación institucional del Tribunal Electoral de Panamá, toda la atención presencial para trámites de extranjería se gestiona de manera centralizada exclusivamente en la Sede Principal de Ancón (Tribunal Electoral de Panamá).
              </span>
            </div>
          )}

          {isPastAgeTrámiteSelected && (
            <div className="bg-blue-50 border border-blue-200 text-blue-950 p-3 rounded text-xs font-semibold flex flex-col gap-1.5 leading-relaxed shadow-sm">
              <span className="text-blue-850 font-extrabold uppercase tracking-wide flex items-center gap-1">
                ⚠️ Información de Atención
              </span>
              <span className="whitespace-pre-line text-slate-700 font-medium">
                Este trámite se realiza en todas las oficinas regionales o distritales a nivel nacional este servicio se brinda sin previa cita. Consulte las ubicaciones en:{" "}
                <a
                  href="https://www.tribunal-electoral.gob.pa/contactenos/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-700 underline font-bold"
                >
                  https://www.tribunal-electoral.gob.pa/contactenos/
                </a>
                {"\n\n"}
                En la sede de Ancón se realiza en el Departamento de Verificación de Identidad ubicado en Edificio del Tribunal Electoral, primer piso contactándonos en la cuenta de correo electrónico:{" "}
                <a
                  href="mailto:verificacionid@tribunal-electoral.gob.pa"
                  className="text-blue-700 underline font-bold"
                >
                  verificacionid@tribunal-electoral.gob.pa
                </a>
              </span>
            </div>
          )}

          {/* List of branch offices */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1 border border-slate-200 rounded p-2 bg-slate-50">
            {filteredSucursales.map((suc) => {
              const isSelected = sucursalId === suc.id;
              return (
                <button
                  key={suc.id}
                  type="button"
                  onClick={() => setSucursalId(suc.id)}
                  className={`w-full text-left p-3 rounded border transition-all cursor-pointer flex items-start gap-2.5 bg-white ${
                    isSelected
                      ? 'border-blue-700 bg-blue-50/20 shadow-sm ring-1 ring-blue-700'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-blue-700' : 'text-slate-400'}`} />
                  <div className="space-y-1">
                    <h5 className="text-xs font-bold text-slate-800 leading-tight">{suc.nombre}</h5>
                    <p className="text-[11px] text-slate-500 leading-tight font-medium">{suc.direccion}</p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <span className="text-[10px] bg-slate-100 text-slate-600 rounded px-1.5 py-0.5 leading-none font-bold">
                        {suc.horario}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Right column: Choose Date and Time Slot */}
        <div className="lg:col-span-7 space-y-5">
          {selectedSucursal ? (
            <div className="space-y-5">
              
              {/* DATE PICKING (ANNUAL CALENDAR VIEW) */}
              <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200">
                  <div className="space-y-1 text-left">
                    <label className="block text-xs font-black text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-blue-700" />
                      <span>2. Seleccione el Día Mandatorio (Calendario Anual)</span>
                      <span className="text-red-500">*</span>
                    </label>
                    <p className="text-[11px] text-slate-500 font-medium">
                      {isExtranjeria 
                        ? 'Citas de Extranjería limitadas a un cupo diario máximo de 20 personas.' 
                        : 'Seleccione un día laborable del año para agendar su cita.'}
                    </p>
                  </div>
                  
                  {/* Month Switcher Controls */}
                  <div className="flex items-center gap-1 self-start sm:self-center">
                    <button
                      type="button"
                      onClick={handlePrevMonth}
                      disabled={currentYear < new Date().getFullYear() || (currentYear === new Date().getFullYear() && currentMonth <= new Date().getMonth())}
                      className="p-1 px-2.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-black flex items-center gap-1"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      <span>Ant</span>
                    </button>
                    <span className="text-xs font-bold text-slate-800 px-2 min-w-[100px] text-center uppercase font-mono tracking-wider">
                      {MONTH_NAMES_ES[currentMonth]} {currentYear}
                    </span>
                    <button
                      type="button"
                      onClick={handleNextMonth}
                      disabled={currentYear === 2027 && currentMonth === 11}
                      className="p-1 px-2.5 rounded bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition text-xs font-black flex items-center gap-1"
                    >
                      <span>Sig</span>
                      <ChevronRight className="w-3.5 h-3.5 text-slate-700" />
                    </button>
                  </div>
                </div>

                {/* Weekday Labels row */}
                <div className="grid grid-cols-7 gap-1 text-center font-bold text-[10px] uppercase text-slate-500 py-1 font-sans">
                  {WEEK_DAYS_ES.map(dayLabel => (
                    <div key={`weekday-${dayLabel}`} className="py-0.5">{dayLabel}</div>
                  ))}
                </div>

                {/* Days Grid */}
                <div className="grid grid-cols-7 gap-1">
                  {calendarCells.map((cell, idx) => {
                    if (cell.isEmptyCell) {
                      return <div key={`empty-${idx}`} className="p-1" />;
                    }

                    const isSelected = fecha === cell.dateString;
                    const isDisabled = cell.isPast || !cell.isValidWorkingDay;

                    // If full, the day disappears as an option (renders empty / faded empty with alert)
                    if (cell.isFull) {
                      return (
                        <div 
                          key={cell.dateString} 
                          title="Fila de cupos agotada para este día (Desaparecido para agendar)" 
                          className="h-11 sm:h-12 border border-dashed border-red-200 rounded bg-red-10 border-red-300 bg-red-50/50 flex flex-col items-center justify-center opacity-40 select-none relative overflow-hidden"
                        >
                          <span className="text-[10px] font-mono font-black text-red-500 strikethrough line-through">
                            {cell.dayNumber}
                          </span>
                          <span className="text-[7.5px] font-black text-red-600 uppercase tracking-tighter leading-none mt-0.5 scale-90">
                            Agotado
                          </span>
                        </div>
                      );
                    }

                    return (
                      <button
                        key={cell.dateString}
                        type="button"
                        disabled={isDisabled}
                        onClick={() => {
                          setFecha(cell.dateString);
                          setHora('');
                        }}
                        className={`h-11 sm:h-12 rounded border text-center transition flex flex-col items-center justify-center relative select-none cursor-pointer ${
                          isSelected
                            ? 'border-blue-700 bg-blue-100 text-blue-900 font-extrabold shadow-sm ring-2 ring-blue-600/20'
                            : isDisabled
                              ? 'border-slate-100 bg-slate-100/60 text-slate-350 cursor-not-allowed text-[11px]'
                              : cell.isToday
                                ? 'border-amber-400 bg-amber-50/60 text-amber-900 font-bold hover:bg-amber-100'
                                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`text-[12px] font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                          {cell.dayNumber}
                        </span>
                        
                        {!isDisabled && (
                          <span className="text-[7.5px] font-bold uppercase tracking-tight scale-90">
                            {isExtranjeria ? (
                              <span className="text-slate-500 font-mono">
                                {20 - cell.bookedCount} L
                              </span>
                            ) : isPastAgeTrámiteSelected ? (
                              <span className="text-blue-600 font-mono">
                                {tardiaConfig.capacityTotal - cell.bookedCount} L
                              </span>
                            ) : (
                              <span className="text-emerald-500 font-bold">✓</span>
                            )}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Calendar Legend Info */}
                <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] text-slate-500 font-medium pt-2 border-t border-slate-200 mt-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-white border border-slate-200" />
                      <span>Disponible</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-slate-100 border border-slate-200" />
                      <span>Cerrado / No laborable</span>
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded bg-red-50 border border-dashed border-red-200 text-red-500 font-bold flex items-center justify-center text-[8px]" />
                      <span>Cupo Exhausto (Desaparece del calendario)</span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-slate-400">
                    <Info className="w-3 h-3 shrink-0" />
                    <span>L = Cupos libres diarios</span>
                  </div>
                </div>
              </div>

              {/* TIME PICKING */}
              {fecha ? (
                <div className="space-y-4 border-t border-slate-100 pt-4">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-slate-500" />
                    <span>3. Seleccione el Intervalo de Hora</span>
                    <span className="text-red-500">*</span>
                  </label>

                  {isPastAgeTrámiteSelected && (
                    <div className="bg-blue-50/50 border border-blue-200 text-blue-950 p-3.5 rounded text-xs leading-relaxed space-y-1">
                      <strong className="text-blue-805 font-black uppercase tracking-wide flex items-center gap-1">
                        🛡️ Regulación Especial de Pasado de Edad
                      </strong>
                      <p className="font-medium text-slate-600">
                        La Dirección Nacional de Registro Civil limita la atención presencial de cedulación tardía a un <strong>máximo de {tardiaConfig.capacityTotal} ciudadanos por día</strong> para garantizar la exhaustividad biométrica del proceso.
                      </p>
                    </div>
                  )}

                  {isPastAgeTrámiteSelected && countPasadosEdadForSelectedDay >= tardiaConfig.capacityTotal ? (
                    <div className="bg-red-50 border border-red-200 text-red-950 p-4 rounded text-center space-y-2.5 shadow-sm">
                      <p className="font-extrabold text-sm uppercase text-red-700 tracking-wide">
                        🚫 Límite de Cupos Agotado
                      </p>
                      <p className="text-xs font-semibold text-slate-605 max-w-sm mx-auto leading-relaxed">
                        Este día ya cuenta con el límite de **{tardiaConfig.capacityTotal} citas para Pasados de Edad registradas**. Por favor, seleccione un día diferente en el panel del calendario superior.
                      </p>
                    </div>
                  ) : (
                    <>
                      <p className="text-xs text-slate-500 font-bold">
                        Horarios de atención disponibles:
                      </p>

                      {(() => {
                        const filteredSlots = availableSlots.filter((slot) => {
                          if (isExtranjeria) {
                            const bookedCount = mergedBookings.filter(c => 
                              c.fecha === fecha && 
                              c.hora === slot && 
                              (c.servicioCategoria === 'extranjeria' || c.subServicioId?.includes('extranjero') || c.subServicioId?.startsWith('ext_')) &&
                              c.estado !== 'cancelada'
                            ).length;
                            return bookedCount < extranjeriaConfig.capacity;
                          }
                          if (isPastAgeTrámiteSelected) {
                            const bookedCount = mergedBookings.filter(c => 
                              c.fecha === fecha && 
                              c.hora === slot && 
                              (c.subServicioId === 'ced_pasados_edad' || c.subServicioNombre?.toLowerCase().includes('pasado') || c.subServicioNombre?.toLowerCase().includes('tardía')) &&
                              c.estado !== 'cancelada'
                            ).length;
                            return bookedCount < 1; // 1 person per slot max for Pasados de Edad -> hidden if booked
                          }
                          // General/standard appointments: if already booked on this date, hide it
                          const bookedCountGeneral = mergedBookings.filter(c => 
                            c.fecha === fecha && 
                            c.hora === slot && 
                            c.estado !== 'cancelada'
                          ).length;
                          return bookedCountGeneral < 1;
                        });

                        if (filteredSlots.length === 0) {
                          return (
                            <div className="bg-amber-50 border border-amber-200 text-amber-950 p-4 rounded text-center space-y-2 shadow-sm">
                              <p className="font-extrabold text-xs uppercase text-amber-800 tracking-wide">
                                {isPastAgeTrámiteSelected ? '⚠️ Horarios de Pasado de Edad Agotados' : '⚠️ Horarios de Extranjería Agotados'}
                              </p>
                              <p className="text-[11px] font-semibold text-slate-650 max-w-sm mx-auto leading-relaxed">
                                {isPastAgeTrámiteSelected 
                                  ? 'Todos los cupos de pasados de edad para este día han sido reservados (máximo 1 persona por cada horario: 8:00 AM, 9:00 AM, 10:30 AM y 11:30 AM). Por favor, seleccione otra fecha en el calendario.'
                                  : `Todos los cupos horarios de extranjería para este día han sido completados (máximo ${extranjeriaConfig.capacity} personas por intervalo). Por favor, seleccione otra fecha en el calendario.`
                                }
                              </p>
                            </div>
                          );
                        }

                        return (
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                            {filteredSlots.map((slot) => {
                              const isSelected = hora === slot;
                              
                              // Count current bookings in this slot to apply slot limitations
                              const bookedCount = mergedBookings.filter(c => 
                                c.fecha === fecha && 
                                c.hora === slot && 
                                (c.servicioCategoria === 'extranjeria' || c.subServicioId?.includes('extranjero') || c.subServicioId?.startsWith('ext_')) &&
                                c.estado !== 'cancelada'
                              ).length;
                              
                              const isFull = isExtranjeria && bookedCount >= extranjeriaConfig.capacity;
                              
                              return (
                                <button
                                  key={slot}
                                  type="button"
                                  disabled={isFull && !isSelected}
                                  onClick={() => setHora(slot)}
                                  className={`p-2.5 rounded border text-center text-xs font-bold transition flex flex-col items-center justify-center gap-1 ${
                                    isSelected
                                      ? 'border-blue-700 bg-blue-700 text-white shadow-sm shadow-blue-100'
                                      : isFull
                                        ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                                        : 'border-slate-200 hover:border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                                  }`}
                                >
                                  <span className="tracking-tight text-[11px] font-bold">{slot}</span>
                                  {isExtranjeria && isFull && (
                                    <span className={`text-[9px] tracking-tight block ${
                                      isSelected 
                                        ? 'text-blue-200 font-medium' 
                                        : 'text-red-500 font-bold'
                                    }`}>
                                      ⛔ Lleno
                                    </span>
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </>
                  )}
                </div>
              ) : (
                <div className="bg-slate-50 border border-slate-200 rounded p-6 text-center text-slate-400 mt-2 text-xs font-medium">
                  Por favor, elija un día del calendario para habilitar los intervalos de atención presencial.
                </div>
              )}

              {/* Show Selection Summary */}
              {fecha && hora && (
                <div className="bg-blue-50/50 border border-blue-100 rounded p-3.5 flex items-center gap-3">
                  <div className="p-2 rounded bg-blue-700 text-white">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="space-y-0.5">
                    <h5 className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wider">Turno Seleccionado</h5>
                    <p className="text-xs text-slate-700 font-medium leading-normal">
                      Asistencia en <strong className="text-slate-900">{selectedSucursal.nombre}</strong> el día{' '}
                      <strong className="text-slate-900">
                        {formatFechaEs(fecha)}
                      </strong>{' '}
                      a las <strong className="text-slate-900">{hora}</strong>.
                    </p>
                  </div>
                </div>
              )}

            </div>
          ) : (
            <div className="h-full min-h-[220px] bg-slate-50 border border-slate-200 rounded flex flex-col items-center justify-center p-6 text-center text-slate-400">
              <MapPin className="w-10 h-10 stroke-1 text-slate-300 mb-2" />
              <p className="text-xs font-bold text-slate-700">Seleccione primero una sucursal del listado izquierdo</p>
              <p className="text-[11px] text-slate-500 mt-0.5 max-w-xs font-medium">
                Esto habilita las fechas operativas del calendario en base a los días válidos del Tribunal Electoral de Panamá.
              </p>
            </div>
          )}
        </div>

      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between pt-4 border-t border-slate-100">
        <button
          type="button"
          onClick={onBack}
          className="w-full sm:w-auto h-12 px-6 rounded border border-slate-300 text-slate-700 font-bold uppercase tracking-wider text-xs hover:bg-slate-50 transition cursor-pointer text-center flex items-center justify-center"
        >
          Regresar a trámites
        </button>

        <button
          type="button"
          onClick={handleBookingSubmit}
          disabled={!sucursalId || !fecha || !hora}
          className={`w-full sm:w-auto h-12 font-bold px-8 rounded shadow-lg uppercase tracking-wider text-xs transition duration-150 flex items-center justify-center gap-2 ${
            sucursalId && fecha && hora
              ? 'bg-blue-700 hover:bg-blue-800 text-white cursor-pointer shadow-blue-100'
              : 'bg-slate-200 text-slate-400 cursor-not-allowed'
          }`}
        >
          <span>Agendar Cita Oficial</span>
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
