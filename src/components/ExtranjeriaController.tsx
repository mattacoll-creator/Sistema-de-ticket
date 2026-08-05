import React, { useState, useEffect, useMemo } from 'react';
import { 
  Search, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw, 
  Check, 
  Clock,
  Printer,
  Calendar,
  Sliders,
  TrendingUp,
  Users,
  CheckSquare,
  FileText,
  ExternalLink,
  Play,
  Power,
  UserCheck,
  CreditCard,
  Building2,
  Download,
  Send,
  Boxes,
  HelpCircle,
  FileSpreadsheet,
  Inbox,
  ArrowLeft,
  ArrowRight,
  Volume2,
  Tv,
  Maximize,
  Minimize,
  Info,
  Plus,
  Trash2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AdminRole } from '../types';

const SELECT_TIMES_OPTIONS = [
  '12:00 AM', '12:30 AM', '01:00 AM', '01:30 AM', '02:00 AM', '02:30 AM', '03:00 AM', '03:30 AM',
  '04:00 AM', '04:30 AM', '05:00 AM', '05:30 AM', '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM',
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
  '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
];

// Extranjeria Mandatory Documents Checklists
const REQUISITOS_EXTRANJERIA = [
  { id: 'nota_migracion', name: 'Nota de Migración' },
  { id: 'carne_permanencia', name: 'Fotocopia de Carné de Permanencia' },
  { id: 'fotocopia_pasaporte', name: 'Fotocopia de Pasaporte' }
];

interface ExtranjeriaControllerProps {
  currentRole: AdminRole;
  forceSubRole?: ExtranjeriaSubRole;
}

// Extranjeria specific sub-profiles within Extranjeria view
type ExtranjeriaSubRole = 'supervisor' | 'atencion' | 'cubiculo' | 'pantalla';

interface Booth {
  id: number;
  name: string;
  active: boolean; // Enables cubicle attention
  staff: string;
  empty: boolean; // True for the 4 reserve booths initially empty
}

interface AppointmentMetadata {
  hasDocuments: boolean;
  checkedDocs: string[];
  passedToSupervisor: boolean;
  assignedCubiculo: number | null; // Booth ID from 1 to 8
  estadoTicket: 'ninguno' | 'en_proceso' | 'pagado_en_caja' | 'realizada';
  timestampCompletado?: string;
  staffResponsable?: string;
}

const getMinutesFromHourString = (timeStr: string) => {
  if (!timeStr) return 0;
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)?/i);
  if (!match) return 0;
  let hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  const ampm = match[3] ? match[3].toUpperCase() : '';
  if (ampm === 'PM' && hours < 12) hours += 12;
  if (ampm === 'AM' && hours === 12) hours = 0;
  return hours * 60 + minutes;
};

const isExtranjeriaAppointment = (app: any) => {
  const cat = (app.servicioCategoria || '').toLowerCase();
  const catName = (app.categoriaNombre || '').toLowerCase();
  const sub = (app.subServicioNombre || '').toLowerCase();
  const subId = (app.subServicioId || '').toLowerCase();
  return (
    cat === 'extranjeria' ||
    catName.includes('extranj') ||
    sub.includes('extranj') ||
    subId.includes('extranj')
  );
};

export default function ExtranjeriaController({ currentRole, forceSubRole }: ExtranjeriaControllerProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [supervisorSearchQuery, setSupervisorSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });
  const [showConfirmSave, setShowConfirmSave] = useState(false);

  // Return the complete formatted citizen name
  const getExtranjeriaCitizenName = (app: any) => {
    if (!app) return 'N/D';
    const dp = app.datosPersonales;
    if (dp) {
      const parts = [
        dp.primerNombre || '',
        dp.segundoNombre || '',
        dp.primerApellido || '',
        dp.segundoApellido || ''
      ].map(s => s.trim()).filter(Boolean);
      
      if (parts.length > 0) {
        return parts.join(' ');
      }
      if (dp.nombreCompleto) return dp.nombreCompleto;
    }
    return app.nombre || 'N/D';
  };

  // Profile Simulator selection
  const [subRole, setSubRole] = useState<ExtranjeriaSubRole>(() => {
    if (forceSubRole) return forceSubRole;
    return (localStorage.getItem('extranjeria_sub_role') as ExtranjeriaSubRole) || 'supervisor';
  });

  // Synchronize subRole dynamically if a specific Extranjería user logs in or if forceSubRole changes
  React.useEffect(() => {
    if (forceSubRole) {
      setSubRole(forceSubRole);
      return;
    }
    if (currentRole === 'extranjeria_supervisor') {
      setSubRole('supervisor');
    } else if (currentRole === 'extranjeria_atencion') {
      setSubRole('atencion');
    } else if (currentRole === 'extranjeria_cubiculo') {
      setSubRole('cubiculo');
    }
  }, [currentRole, forceSubRole]);

  // Selected Cubicle in the "Cubículo" view
  const [selectedCubiculo, setSelectedCubiculo] = useState<number>(() => {
    return parseInt(localStorage.getItem('extranjeria_selected_cubiculo') || '1', 10);
  });

  // Selected appointment for details check-in
  const [selectedAppForCheck, setSelectedAppForCheck] = useState<any | null>(null);

  // Document checklist in the "Atención" verification
  const [tempCheckedDocs, setTempCheckedDocs] = useState<string[]>([]);

  // Selected appointment for supervisor validation
  const [selectedAppForSupervisor, setSelectedAppForSupervisor] = useState<any | null>(null);
  const [supervisorCheckedDocs, setSupervisorCheckedDocs] = useState<string[]>([]);
  
  // Supervisor custom period visibility filter
  const [supervisorPeriodFilter, setSupervisorPeriodFilter] = useState<'dia' | 'semana' | 'mes' | 'año'>('dia');

  // New Date Range State for reports
  const [reportStartDate, setReportStartDate] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-01`;
  });
  const [reportEndDate, setReportEndDate] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  });

  // Supervisor tabs / sub-views (control of queues vs. calendar & creation/deletion panel)
  const [supervisorTab, setSupervisorTab] = useState<'flujo' | 'calendario'>('flujo');
  const [calendarDate, setCalendarDate] = useState<Date>(new Date());
  
  // Parse today's date formatted as YYYY-MM-DD
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  });

  // Calendar translation names
  const mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  const diasSemanaNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

  // Calculate grid representation of month days
  const monthDays = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const firstDayIndex = firstDay.getDay(); // 0 is Sunday, 1 is Monday...
    
    // Total days in the current month
    const totalDaysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Days in previous month to fill the first row
    const totalDaysInPrevMonth = new Date(year, month, 0).getDate();
    
    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean; key: string }[] = [];
    
    // Fill in previous month's trailing days
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const prevDay = totalDaysInPrevMonth - i;
      const prevMonth = month === 0 ? 11 : month - 1;
      const prevYear = month === 0 ? year - 1 : year;
      const dStr = `${prevYear}-${String(prevMonth + 1).padStart(2, '0')}-${String(prevDay).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: prevDay,
        isCurrentMonth: false,
        key: `prev-${prevDay}`
      });
    }
    
    // Fill in current month's days
    for (let i = 1; i <= totalDaysInMonth; i++) {
      const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: i,
        isCurrentMonth: true,
        key: `curr-${i}`
      });
    }
    
    // Fill in next month's leading days to make a perfect grid multiple of 7
    const remaining = 42 - days.length; // 6 rows of 7 days
    for (let i = 1; i <= remaining; i++) {
      const nextMonth = month === 11 ? 0 : month + 1;
      const nextYear = month === 11 ? year + 1 : year;
      const dStr = `${nextYear}-${String(nextMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      days.push({
        dateStr: dStr,
        dayNum: i,
        isCurrentMonth: false,
        key: `next-${i}`
      });
    }
    
    return days;
  }, [calendarDate]);

  // Appointments grouped by date for fast lookup in calendars, sorted by hour
  const appointmentsByDate = useMemo(() => {
    const g: Record<string, any[]> = {};
    appointments.forEach(app => {
      const d = app.fecha; // YYYY-MM-DD
      if (d) {
        if (!g[d]) g[d] = [];
        g[d].push(app);
      }
    });
    // Sort each day's appointments by hour
    Object.keys(g).forEach(key => {
      g[key].sort((a, b) => {
        const timeA = getMinutesFromHourString(a.hora || '');
        const timeB = getMinutesFromHourString(b.hora || '');
        return timeA - timeB;
      });
    });
    return g;
  }, [appointments]);

  // Form states for creating a new appointment
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCitaNombre, setNewCitaNombre] = useState('');
  const [newCitaPasaporte, setNewCitaPasaporte] = useState('');
  const [newCitaNacionalidad, setNewCitaNacionalidad] = useState('');
  const [newCitaCorreo, setNewCitaCorreo] = useState('');
  const [newCitaTelefono, setNewCitaTelefono] = useState('');
  const [newCitaFecha, setNewCitaFecha] = useState('');
  const [newCitaHora, setNewCitaHora] = useState('08:00 AM');

  // Capacity / Schedule setups
  const [capacidad, setCapacidad] = useState<number>(() => {
    return parseInt(localStorage.getItem('extranjeria_capacidad_usuarios') || '2', 10);
  });
  const [intervalo, setIntervalo] = useState<number>(() => {
    return parseInt(localStorage.getItem('extranjeria_intervalo_minutos') || '15', 10);
  });
  const [horaInicio, setHoraInicio] = useState<string>(() => {
    return localStorage.getItem('extranjeria_hora_inicio') || '07:00 AM';
  });
  const [horaFin, setHoraFin] = useState<string>(() => {
    return localStorage.getItem('extranjeria_hora_fin') || '02:00 AM';
  });

  const screenContainerRef = React.useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = () => {
    if (!screenContainerRef.current) return;
    if (!document.fullscreenElement) {
      screenContainerRef.current.requestFullscreen().catch((err: any) => {
        console.error("Error going fullscreen:", err);
      });
    } else {
      document.exitFullscreen().catch((err: any) => {
        console.error("Error exiting fullscreen:", err);
      });
    }
  };

  // Booth / Cubiculos state (4 enabled with staff, 4 reserve empty)
  const [booths, setBooths] = useState<Booth[]>(() => {
    const raw = localStorage.getItem('extranjeria_booths');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        // Fallback below
      }
    }
    return [
      { id: 1, name: "Cubículo 1", active: true, staff: "Lic. Ana Pérez", empty: false },
      { id: 2, name: "Cubículo 2", active: true, staff: "Lic. Carlos Gómez", empty: false },
      { id: 3, name: "Cubículo 3", active: true, staff: "Lic. María Rodríguez", empty: false },
      { id: 4, name: "Cubículo 4", active: true, staff: "Lic. Juan Martínez", empty: false },
      { id: 5, name: "Cubículo 5", active: false, staff: "Turno de Reserva", empty: true },
      { id: 6, name: "Cubículo 6", active: false, staff: "Turno de Reserva", empty: true },
      { id: 7, name: "Cubículo 7", active: false, staff: "Turno de Reserva", empty: true },
      { id: 8, name: "Cubículo 8", active: false, staff: "Turno de Reserva", empty: true }
    ];
  });

  // Extranjería custom metadata tracking (document checks, supervisor forwarding, booth assignments, ticketing)
  const [appMetadata, setAppMetadata] = useState<Record<string, AppointmentMetadata>>(() => {
    const raw = localStorage.getItem('extranjeria_appointment_metadata');
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  // Keep localStorage up-to-date
  useEffect(() => {
    localStorage.setItem('extranjeria_sub_role', subRole);
  }, [subRole]);

  useEffect(() => {
    localStorage.setItem('extranjeria_selected_cubiculo', String(selectedCubiculo));
  }, [selectedCubiculo]);

  useEffect(() => {
    localStorage.setItem('extranjeria_booths', JSON.stringify(booths));
  }, [booths]);

  useEffect(() => {
    localStorage.setItem('extranjeria_appointment_metadata', JSON.stringify(appMetadata));
  }, [appMetadata]);

  // Live clock state for Pantalla de Turnos
  const [liveTime, setLiveTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Synthesis-based sound alert for public display chimes
  const playChimeSound = (announcementText?: string) => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioContext) {
        if (announcementText && 'speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(announcementText);
          utterance.lang = 'es-PA';
          utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
        }
        return;
      }
      const ctx = new AudioContext();
      
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      osc1.connect(gainNode);
      osc2.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      osc1.frequency.setValueAtTime(587.33, ctx.currentTime); // D5
      osc1.type = 'sine';
      
      osc2.frequency.setValueAtTime(880.00, ctx.currentTime + 0.12); // A5
      osc2.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.12, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.7);
      
      osc1.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.35);
      
      osc2.start(ctx.currentTime + 0.12);
      osc2.stop(ctx.currentTime + 0.7);

      if (announcementText && 'speechSynthesis' in window) {
        setTimeout(() => {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(announcementText);
          utterance.lang = 'es-PA';
          utterance.rate = 0.95;
          window.speechSynthesis.speak(utterance);
        }, 805);
      }
    } catch (e) {
      console.log('Audio error:', e);
      if (announcementText && 'speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(announcementText);
        utterance.lang = 'es-PA';
        utterance.rate = 0.95;
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // Helper helper to fetch appointments from server and filter extranjería
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const res = await fetch('/api/appointments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.appointments)) {
        const filtered = data.appointments.filter((app: any) => {
          const cat = (app.servicioCategoria || '').toLowerCase();
          const catName = (app.categoriaNombre || '').toLowerCase();
          const sub = (app.subServicioNombre || '').toLowerCase();
          const subId = (app.subServicioId || '').toLowerCase();
          const isTardia = subId === 'ced_pasados_edad' || sub.includes('tardía') || sub.includes('tardia');
          return (
            cat === 'extranjeria' ||
            catName.includes('extranj') ||
            sub.includes('extranj') ||
            subId.includes('extranj') ||
            isTardia
          );
        });
        setAppointments(filtered);
      } else {
        showStatus('Error al recibir listado de citas.', 'error');
      }
    } catch (err) {
      console.error(err);
      showStatus('Fallo de red al conectar con el servidor de citas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateCitaSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCitaNombre.trim() || !newCitaPasaporte.trim() || !newCitaFecha || !newCitaHora) {
      showStatus('Por favor, complete nombre, pasaporte, fecha y hora.', 'error');
      return;
    }

    try {
      const transactionId = 'EXT-' + Math.random().toString(36).substring(2, 8).toUpperCase();
      const creatorName = sessionStorage.getItem('admin_username') || 'Supervisor de Extranjería';
      const payload = {
        id: transactionId,
        correo: newCitaCorreo.trim() || 'extranjeria@te.gob.pa',
        codigoTransaccion: transactionId,
        servicioCategoria: 'extranjeria',
        categoriaNombre: 'Trámites de Extranjería',
        subServicioId: 'ext_primera_vez',
        subServicioNombre: 'Carné de residente permanente por primera vez',
        fecha: newCitaFecha,
        hora: newCitaHora,
        sucursalId: 'anc_main',
        sucursalNombre: 'Sede Principal de Ancón (Extranjería)',
        sucursalDireccion: 'Ciudad de Panamá, Ancón, Ave. Omar Torrijos Herrera',
        estado: 'confirmada',
        telefono: newCitaTelefono.trim() || 'N/A',
        nombre: newCitaNombre.trim(),
        creadoPor: creatorName,
        datosPersonales: {
          primerNombre: newCitaNombre.split(' ')[0] || '',
          primerApellido: newCitaNombre.split(' ')[1] || '',
          nombreCompleto: newCitaNombre.trim(),
          pasaporte: newCitaPasaporte.trim(),
          nacionalidad: newCitaNacionalidad.trim() || 'No especificada',
          correo: newCitaCorreo.trim() || 'extranjeria@te.gob.pa',
          telefono: newCitaTelefono.trim() || 'N/A',
          creadoPor: creatorName
        },
        requisitos: [
          'Precio (efectivo) B/. 100.00',
          'Requiere contar con cita programada',
          'Nota del Servicio Nacional de Migración',
          'Fotocopia del carné expedido por el Servicio Nacional de Migración',
          'Fotocopia de la página de las generales del pasaporte'
        ]
      };

      const res = await fetch('/api/register-appointment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showStatus('Cita de Extranjería creada con éxito.', 'success');
        
        // Reset form
        setNewCitaNombre('');
        setNewCitaPasaporte('');
        setNewCitaNacionalidad('');
        setNewCitaCorreo('');
        setNewCitaTelefono('');
        setNewCitaFecha('');
        setShowCreateForm(false);

        // Fetch list to sync
        fetchAppointments();
      } else {
        showStatus(data.error || 'No se pudo crear la cita en el servidor.', 'error');
      }
    } catch (err: any) {
      console.error(err);
      showStatus('Error de red al registrar la cita.', 'error');
    }
  };

  const handleDeleteCitaSupervisor = async (citaId: string) => {
    if (!window.confirm('¿Está seguro de que desea eliminar permanentemente esta cita de Extranjería? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const res = await fetch(`/api/appointments/${citaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showStatus('Cita eliminada correctamente de manera permanente.', 'success');
        
        // Remove from selected supervisor if it was that one
        if (selectedAppForSupervisor && selectedAppForSupervisor.id === citaId) {
          setSelectedAppForSupervisor(null);
        }

        // Fetch list to sync
        fetchAppointments();
      } else {
        showStatus(data.error || 'No se pudo eliminar la cita.', 'error');
      }
    } catch (err) {
      console.error(err);
      showStatus('Error de red al intentar eliminar la cita.', 'error');
    }
  };

  useEffect(() => {
    fetchAppointments();

    // Load schedule config from server
    fetch('/api/extranjeria/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.config) {
          const { capacidad: cap, intervalo: inter, horaInicio: hIni, horaFin: hFin } = data.config;
          setCapacidad(cap);
          setIntervalo(inter);
          setHoraInicio(hIni);
          setHoraFin(hFin);
          
          localStorage.setItem('extranjeria_capacidad_usuarios', String(cap));
          localStorage.setItem('extranjeria_intervalo_minutos', String(inter));
          localStorage.setItem('extranjeria_hora_inicio', hIni);
          localStorage.setItem('extranjeria_hora_fin', hFin);
        }
      })
      .catch(err => console.warn("Failed to load extranjeria config from server:", err));
  }, []);

  const showStatus = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(prev => prev.text === text ? { text: '', type: null } : prev);
    }, 5000);
  };

  // Save timing config handler
  const promptSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentRole !== 'super') {
      showStatus('Operación denegada. Solo el Super Administrador puede configurar la capacidad y horarios.', 'error');
      return;
    }
    setShowConfirmSave(true);
  };

  const executeSaveConfig = async () => {
    setShowConfirmSave(false);
    localStorage.setItem('extranjeria_capacidad_usuarios', String(capacidad));
    localStorage.setItem('extranjeria_intervalo_minutos', String(intervalo));
    localStorage.setItem('extranjeria_hora_inicio', horaInicio);
    localStorage.setItem('extranjeria_hora_fin', horaFin);
    
    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const res = await fetch('/api/extranjeria/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ capacidad, intervalo, horaInicio, horaFin })
      });
      const data = await res.json();
      if (data && data.success) {
        showStatus('¡Éxito! Configuración de citas para Extranjería actualizada y sincronizada en el servidor.', 'success');
      } else {
        showStatus('Configuración guardada localmente, pero falló la sincronización con el servidor.', 'info');
      }
    } catch (err) {
      console.error(err);
      showStatus('Configuración guardada localmente, pero falló la sincronización con el servidor.', 'info');
    }
  };

  // Activate/deactivate a reserve booth (casillero de atención)
  const toggleBoothActive = (boothId: number) => {
    setBooths(prev => prev.map(b => {
      if (b.id === boothId) {
        const nextActive = !b.active;
        let staffName = b.staff;
        if (nextActive && b.empty) {
          staffName = `Lic. Auxiliar (Casillero ${b.id})`;
        } else if (!nextActive && b.empty) {
          staffName = "Turno de Reserva";
        }
        return { ...b, active: nextActive, staff: staffName };
      }
      return b;
    }));
    showStatus(`Casillero ${boothId} actualizado con éxito.`, 'success');
  };

  // Get active booths count
  const activeBoothsCount = useMemo(() => {
    return booths.filter(b => b.active).length;
  }, [booths]);

  // Handle checking of single document
  const handleToggleDocCheck = (docId: string) => {
    setTempCheckedDocs(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  // Handle checking of single document in second control (supervisor)
  const handleToggleSupervisorDocCheck = (docId: string) => {
    setSupervisorCheckedDocs(prev => 
      prev.includes(docId) ? prev.filter(id => id !== docId) : [...prev, docId]
    );
  };

  // Submit verified documents and forward to supervisor
  const handleSubmitVerification = (appId: string) => {
    const meta = appMetadata[appId] || {
      hasDocuments: false,
      checkedDocs: [],
      passedToSupervisor: false,
      assignedCubiculo: null,
      estadoTicket: 'ninguno'
    };

    const allDocs = REQUISITOS_EXTRANJERIA.map(r => r.id);

    setAppMetadata(prev => ({
      ...prev,
      [appId]: {
        ...meta,
        hasDocuments: true,
        checkedDocs: allDocs,
        passedToSupervisor: true
      }
    }));

    showStatus(`Expediente de cita ${appId} verificado y enviado al Supervisor para asignación de cubículo.`, 'success');
    setSelectedAppForCheck(null);
  };

  // Assign appointment to cubicle (by supervisor)
  const handleAssignToCubiculo = (appId: string, cubiculoId: number) => {
    const meta = appMetadata[appId] || {
      hasDocuments: true,
      checkedDocs: REQUISITOS_EXTRANJERIA.map(r => r.id),
      passedToSupervisor: true,
      assignedCubiculo: null,
      estadoTicket: 'ninguno'
    };

    setAppMetadata(prev => ({
      ...prev,
      [appId]: {
        ...meta,
        assignedCubiculo: cubiculoId,
        estadoTicket: 'en_proceso'
      }
    }));

    const app = appointments.find(a => a.id === appId);
    const codePart = appId.slice(-4).toUpperCase();
    const cleanCitizenName = getExtranjeriaCitizenName(app);
    const boothName = booths.find(b => b.id === cubiculoId)?.name || `Cubículo ${cubiculoId}`;
    
    // Spelling out "E-" for Speech Synthesis to sound natural
    const codeSpelled = `E ${codePart.split('').join(' ')}`;
    const announcementText = `Turno E, ${codeSpelled}. ${cleanCitizenName}. Favor dirigirse al ${boothName}.`;

    // Trigger audible chime for public display updates with voice
    playChimeSound(announcementText);

    showStatus(`Cita asignada exitosamente al ${boothName}. El operador a cargo ya puede atender al ciudadano.`, 'success');
  };

  // Recall a citizen aloud from a cubicle
  const handleRecallCitizen = (appId: string) => {
    const app = appointments.find(a => a.id === appId);
    if (!app) return;
    const meta = appMetadata[appId];
    const cubiculoId = meta?.assignedCubiculo || selectedCubiculo;
    const codePart = appId.slice(-4).toUpperCase();
    const cleanCitizenName = getExtranjeriaCitizenName(app);
    const boothName = booths.find(b => b.id === cubiculoId)?.name || `Cubículo ${cubiculoId}`;

    const codeSpelled = `E ${codePart.split('').join(' ')}`;
    const announcementText = meta?.estadoTicket === 'pagado_en_caja'
      ? `Turno E, ${codeSpelled}. ${cleanCitizenName}. Favor dirigirse a la caja de pago.`
      : `Turno E, ${codeSpelled}. ${cleanCitizenName}. Favor dirigirse al ${boothName}.`;

    playChimeSound(announcementText);
    showStatus(`Re-llamando a ciudadano: ${cleanCitizenName} (E-${codePart})`, 'info');
  };

  // Automatically assign appointment to the active booth with the least load (load balancing)
  const handleAutoAssignToCubiculo = (appId: string) => {
    const activeBooths = booths.filter(b => b.active);
    if (activeBooths.length === 0) {
      showStatus("Error: No hay cubículos activos en este momento.", "error");
      return null;
    }

    // Count currently active appointments assigned to each active booth
    const counts: Record<number, number> = {};
    activeBooths.forEach(b => {
      counts[b.id] = 0;
    });

    Object.keys(appMetadata).forEach(id => {
      const meta = appMetadata[id];
      if (meta && meta.assignedCubiculo && meta.estadoTicket !== 'realizada') {
        if (counts[meta.assignedCubiculo] !== undefined) {
          counts[meta.assignedCubiculo]++;
        }
      }
    });

    // Find active booth with minimum load
    let bestBooth = activeBooths[0];
    let minCount = counts[bestBooth.id] ?? 0;

    for (let i = 1; i < activeBooths.length; i++) {
      const b = activeBooths[i];
      const cnt = counts[b.id] ?? 0;
      if (cnt < minCount) {
        minCount = cnt;
        bestBooth = b;
      }
    }

    handleAssignToCubiculo(appId, bestBooth.id);
    return bestBooth;
  };

  // Trigger Ticket Call and Send to Cashier (Caja) for Payment
  const handleSendToCaja = (appId: string) => {
    const meta = appMetadata[appId];
    if (!meta) return;

    setAppMetadata(prev => ({
      ...prev,
      [appId]: {
        ...meta,
        estadoTicket: 'pagado_en_caja'
      }
    }));

    const app = appointments.find(a => a.id === appId);
    const codePart = appId.slice(-4).toUpperCase();
    const cleanCitizenName = getExtranjeriaCitizenName(app);
    const cubiculoId = meta.assignedCubiculo;
    const boothName = booths.find(b => b.id === cubiculoId)?.name || `Cubículo ${cubiculoId || ''}`;
    
    // Spelling out "E-"
    const codeSpelled = `E ${codePart.split('').join(' ')}`;
    const announcementText = `Turno E, ${codeSpelled}. ${cleanCitizenName}. Favor dirigirse a la caja de pago.`;

    // Play chime sound and speak
    playChimeSound(announcementText);

    showStatus(`Llamada de ticket generada. Ciudadano enviado a la Caja de Pago (https://sistema-de-ticket.vercel.app/).`, 'info');
  };

  // Complete Payment/Appointment and save to Completed (Realizadas) Report
  const handleCompleteAppointment = (appId: string) => {
    const meta = appMetadata[appId];
    if (!meta) return;

    const rightNow = new Date();
    const timestampFormatted = `${rightNow.toLocaleDateString('es-ES')} ${rightNow.toLocaleTimeString('es-ES')}`;

    setAppMetadata(prev => ({
      ...prev,
      [appId]: {
        ...meta,
        estadoTicket: 'realizada',
        timestampCompletado: timestampFormatted,
        staffResponsable: booths.find(b => b.id === meta.assignedCubiculo)?.staff || 'Atención Extranjería'
      }
    }));

    showStatus(`Trámite finalizado con éxito para la cita ${appId}. Registro guardado en el reporte diario de atención.`, 'success');
  };

  // Filter appointments for the general table filter (matches query and filters)
  const filteredGeneralAppointments = useMemo(() => {
    return appointments.filter((app: any) => {
      // Search
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || (
        (app.datosPersonales?.nombreCompleto || app.nombre || '').toLowerCase().includes(query) ||
        (app.datosPersonales?.primerNombre || '').toLowerCase().includes(query) ||
        (app.datosPersonales?.pasaporte || app.identificacion || '').toLowerCase().includes(query) ||
        (app.correo || app.datosPersonales?.correo || '').toLowerCase().includes(query) ||
        (app.codigoTransaccion || '').toLowerCase().includes(query) ||
        (app.id || '').toLowerCase().includes(query)
      );

      // Status
      const matchesStatus = statusFilter === 'todos' || app.estado === statusFilter;

      // Date
      const matchesDate = !dateFilter || app.fecha === dateFilter;

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [appointments, searchQuery, statusFilter, dateFilter]);

  // Appointments grouped by dynamic workflow queues:
  // 1. Atención View queue: Extranjería appointments that are NOT yet passed to supervisor
  const queueAtencionIn = useMemo(() => {
    return appointments.filter(app => {
      const meta = appMetadata[app.id];
      return isExtranjeriaAppointment(app) && (!meta || !meta.passedToSupervisor);
    });
  }, [appointments, appMetadata]);

  // 2. Atención View processed history (already sent to supervisor)
  const queueAtencionOut = useMemo(() => {
    return appointments.filter(app => {
      const meta = appMetadata[app.id];
      return isExtranjeriaAppointment(app) && meta && meta.passedToSupervisor;
    });
  }, [appointments, appMetadata]);

  // 3. Supervisor Queue: passed from atencion but NOT yet assigned a cubicle
  const queueSupervisorPending = useMemo(() => {
    return appointments.filter(app => {
      const meta = appMetadata[app.id];
      return isExtranjeriaAppointment(app) && meta && meta.passedToSupervisor && meta.assignedCubiculo === null;
    });
  }, [appointments, appMetadata]);

  // Filtered supervisor pending list for quick search
  const filteredQueueSupervisorPending = useMemo(() => {
    const query = supervisorSearchQuery.trim().toLowerCase();
    if (!query) return queueSupervisorPending;
    return queueSupervisorPending.filter(app => {
      const name = getExtranjeriaCitizenName(app).toLowerCase();
      const passport = (app.datosPersonales?.pasaporte || app.identificacion || '').toLowerCase();
      const id = app.id.toLowerCase();
      const subServicio = (app.subServicioNombre || 'Servicio de Cedulación Extranjera').toLowerCase();
      const createdBy = (app.creadoPor || app.datosPersonales?.creadoPor || 'Portal del Ciudadano').toLowerCase();
      return (
        name.includes(query) ||
        passport.includes(query) ||
        id.includes(query) ||
        subServicio.includes(query) ||
        createdBy.includes(query)
      );
    });
  }, [queueSupervisorPending, supervisorSearchQuery]);

  // Filtered appointments for the supervisor's period dashboard
  const supervisorFilteredAppointments = useMemo(() => {
    const now = new Date('2026-06-05T12:00:00');
    return appointments.filter((app: any) => {
      if (!app.fecha) return false;
      const appDate = new Date(app.fecha + 'T12:00:00');
      if (isNaN(appDate.getTime())) return false;

      if (supervisorPeriodFilter === 'dia') {
        const todayStr = '2026-06-05';
        return app.fecha === todayStr;
      }

      if (supervisorPeriodFilter === 'semana') {
        const getSunday = (dObj: Date) => {
          const d = new Date(dObj);
          const day = d.getDay();
          const pDiff = d.getDate() - day;
          const sun = new Date(d.setDate(pDiff));
          sun.setHours(0,0,0,0);
          return sun.getTime();
        };
        return getSunday(now) === getSunday(appDate);
      }

      if (supervisorPeriodFilter === 'mes') {
        return appDate.getFullYear() === now.getFullYear() && appDate.getMonth() === now.getMonth();
      }

      if (supervisorPeriodFilter === 'año') {
        return appDate.getFullYear() === now.getFullYear();
      }

      return true;
    }).sort((a, b) => {
      const dateA = a.fecha || '';
      const dateB = b.fecha || '';
      if (dateA !== dateB) {
        return dateA.localeCompare(dateB);
      }
      const timeA = getMinutesFromHourString(a.hora || '');
      const timeB = getMinutesFromHourString(b.hora || '');
      return timeA - timeB;
    });
  }, [appointments, supervisorPeriodFilter]);

  // Recommended booth based on load balancing
  const recommendedBooth = useMemo(() => {
    const activeBooths = booths.filter(b => b.active);
    if (activeBooths.length === 0) return null;
    
    const counts: Record<number, number> = {};
    activeBooths.forEach(b => {
      counts[b.id] = 0;
    });

    Object.keys(appMetadata).forEach(id => {
      const meta = appMetadata[id];
      if (meta && meta.assignedCubiculo && meta.estadoTicket !== 'realizada') {
        if (counts[meta.assignedCubiculo] !== undefined) {
          counts[meta.assignedCubiculo]++;
        }
      }
    });

    let bestBooth = activeBooths[0];
    let minCount = counts[bestBooth.id] ?? 0;

    for (let i = 1; i < activeBooths.length; i++) {
      const b = activeBooths[i];
      const cnt = counts[b.id] ?? 0;
      if (cnt < minCount) {
        minCount = cnt;
        bestBooth = b;
      }
    }
    return bestBooth;
  }, [booths, appMetadata]);

  // 4. Cubículo View: appointments assigned to the currently selected cubicle
  const queueCubiculoAssigned = useMemo(() => {
    return appointments.filter(app => {
      const meta = appMetadata[app.id];
      return isExtranjeriaAppointment(app) && meta && meta.assignedCubiculo === selectedCubiculo && meta.estadoTicket !== 'realizada';
    });
  }, [appointments, appMetadata, selectedCubiculo]);

  // 5. Supervisor Analytics / Reports: appointments in selected interval, regardless of status
  const filterRealizadasByDateRange = (startStr: string, endStr: string) => {
    return appointments.filter(app => {
      if (!app.fecha) return false;
      return app.fecha >= startStr && app.fecha <= endStr;
    });
  };

  // Download performed (realized) appointments report - CSV Format
  const handleDownloadRealizadasCSV = () => {
    const list = filterRealizadasByDateRange(reportStartDate, reportEndDate);
    if (list.length === 0) {
      alert('No se encontraron citas en el intervalo seleccionado para generar el reporte.');
      return;
    }

    const headers = ['ID de Cita', 'Ciudadano', 'Pasaporte/ID', 'Fecha Cita', 'Hora', 'Operador Responsable', 'Cubículo', 'Estado', 'Hora Completado/Modificado'];
    const rows = list.map(app => {
      const meta = appMetadata[app.id];
      const name = app.datosPersonales?.nombreCompleto || app.nombre || 'N/D';
      const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
      const cubiculoName = booths.find(b => b.id === meta?.assignedCubiculo)?.name || (meta?.assignedCubiculo ? `Cubículo ${meta.assignedCubiculo}` : 'N/A');
      const estado = meta?.estadoTicket || app.status || 'Pendiente';
      return [
        app.id,
        name,
        passport,
        app.fecha,
        app.hora,
        meta?.staffResponsable || 'N/D',
        cubiculoName,
        estado.toUpperCase(),
        meta?.timestampCompletado || 'N/D'
      ];
    });

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Extranjeria_Citas_${reportStartDate}_a_${reportEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download performed (realized) appointments report - PDF Format using jsPDF helper
  const handleDownloadRealizadasPDF = () => {
    const list = filterRealizadasByDateRange(reportStartDate, reportEndDate);
    if (list.length === 0) {
      alert('No se encontraron citas en el intervalo seleccionado para generar el reporte PDF.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageW = doc.internal.pageSize.getWidth();

    const primaryColor = [15, 23, 42]; // Slate 900
    const accentColor = [217, 119, 6];  // Amber 600

    let currentY = 15;

    const drawHeader = () => {
      // Top accent bar
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(10, currentY, pageW - 20, 10, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('TRIBUNAL ELECTORAL DE PANAMÁ', 15, currentY + 6.5);

      // Report Header Section
      currentY += 16;
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('REPORTE GENERAL DE ATENCIÓN DE CITAS (TODOS LOS ESTADOS) - EXTRANJERÍA', 10, currentY);

      currentY += 5;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(8.5);
      doc.setTextColor(100, 116, 139);
      doc.text('Control Operativo de Supervisor de Extranjería', 10, currentY);

      currentY += 5;
      doc.text(`Intervalo analizado: Desde ${reportStartDate} Hasta ${reportEndDate}  |  Fecha de emisión: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, 10, currentY);

      currentY += 4;
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(0.8);
      doc.line(10, currentY, pageW - 10, currentY);
      currentY += 8;
    };

    drawHeader();

    // Summary Statistics box counting statuses
    const totalCount = list.length;
    const completedCount = list.filter(app => appMetadata[app.id]?.estadoTicket === 'realizada').length;
    const cancelledCount = list.filter(app => appMetadata[app.id]?.estadoTicket === 'cancelada').length;
    const pendingCount = totalCount - completedCount - cancelledCount;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.25);
    doc.rect(10, currentY, pageW - 20, 26, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('RESUMEN ESTADÍSTICO DE OPERACIÓN', 15, currentY + 5.5);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    doc.text(`• Total Citas Registradas: ${totalCount}  |  Completadas: ${completedCount}  |  Pendientes: ${pendingCount}  |  Canceladas: ${cancelledCount}`, 15, currentY + 11);
    doc.text(`• Capacidad Máxima del Periodo: Regulada por intervalos de ${intervalo} min con promedio de ${capacidad} slots`, 15, currentY + 15);
    doc.text(`• Casilleros Activos totales: ${activeBoothsCount} puestos`, pageW - 85, currentY + 11);
    doc.text(`• Reporte Oficial con Estados Generales`, pageW - 85, currentY + 15);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('• GUÍA DE NOMENCLATURAS: ', 15, currentY + 20.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('ATENDIDO (Atendida con éxito y biometría validada) | PENDIENTE/CONFIRMADA (Activa programada) | CANCELADA (Anulada/Inasistencia)', 54, currentY + 20.5);
    
    currentY += 32;

    // Table Headers
    const drawTableHead = (y: number) => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(10, y, pageW - 20, 7, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      
      doc.text('ID CITA', 12, y + 4.8);
      doc.text('CIUDADANO EXTRANJERO', 35, y + 4.8);
      doc.text('PASAPORTE', 80, y + 4.8);
      doc.text('CUBÍCULO', 105, y + 4.8);
      doc.text('ESTADO', 130, y + 4.8);
      doc.text('OPERADOR / ATENDIDO', 155, y + 4.8);
    };

    drawTableHead(currentY);
    currentY += 7;

    // Render Completed Appointments
    list.forEach((app, index) => {
      const meta = appMetadata[app.id];
      if (currentY > 245) {
        doc.addPage();
        currentY = 15;
        drawHeader();
        drawTableHead(currentY);
        currentY += 7;
      }

      // Zebra rows striped
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(10, currentY, pageW - 20, 8, 'F');
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);

      const name = app.datosPersonales?.nombreCompleto || app.nombre || 'N/D';
      const nameShort = name.length > 25 ? name.slice(0, 23) + '...' : name;
      const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
      const cubiculoName = booths.find(b => b.id === meta?.assignedCubiculo)?.name || (meta?.assignedCubiculo ? `Cubículo ${meta.assignedCubiculo}` : 'Sin Asignar');
      const staffName = meta?.staffResponsable || 'Oficial General';
      const staffShort = staffName.length > 18 ? staffName.slice(0, 16) + '...' : staffName;
      
      const estado = (meta?.estadoTicket || app.status || 'Pendiente').toUpperCase();
      const tCompleted = meta?.timestampCompletado || 'N/D';

      doc.text(app.id, 12, currentY + 5);
      doc.text(nameShort.toUpperCase(), 35, currentY + 5);
      doc.text(passport, 80, currentY + 5);
      doc.text(cubiculoName, 105, currentY + 5);
      
      // Draw status with colors
      if (estado === 'REALIZADA' || estado === 'COMPLETADA' || estado === 'CONFIRMADA' || estado === 'ATENDIDO') {
        doc.setTextColor(16, 124, 65);
        doc.setFont('Helvetica', 'bold');
      } else if (estado === 'CANCELADA' || estado === 'CANCELADO' || estado === 'INASISTENCIA') {
        doc.setTextColor(185, 28, 28);
        doc.setFont('Helvetica', 'bold');
      } else {
        doc.setTextColor(180, 83, 9);
        doc.setFont('Helvetica', 'bold');
      }
      doc.text(estado, 130, currentY + 5);
      
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'normal');
      doc.text(`${staffShort} / ${tCompleted}`, 155, currentY + 5);

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.1);
      doc.line(10, currentY + 8, pageW - 10, currentY + 8);

      currentY += 8;
    });

    // Signature Area removed per user request
    doc.save(`reporte_extranjeria_atendidos_${reportStartDate}_a_${reportEndDate}.pdf`);
  };

  const handlePrintPDF = () => {
    window.print();
  };

  return (
    <div id="extranjeria-controller-root" className="space-y-6 text-slate-100 font-sans">
      
      {/* Dynamic Print Styles for PDF Export */}
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          body * {
            visibility: hidden;
            background: transparent !important;
          }
          #print-area-extranjeria, #print-area-extranjeria * {
            visibility: visible;
          }
          #print-area-extranjeria {
            display: block !important;
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            background: white !important;
            color: black !important;
            padding: 1.25in !important;
          }
          @page {
            margin: 1cm;
          }
        }
      `}} />

      {/* Profile simulation switcher at the top */}
      {(currentRole === 'super' || currentRole === 'extranjeria') ? (
        <div className="bg-slate-900 border border-slate-850 p-1.5 rounded-xl flex flex-wrap gap-2 items-center justify-between shadow-xl">
          <div className="flex items-center gap-2.5 px-3 py-1.5">
            <Boxes className="w-5 h-5 text-amber-500" />
            <div className="text-left">
              <span className="text-[9px] font-black tracking-widest text-slate-500 uppercase block">Simulador de Roles de Extranjería</span>
              <span className="text-xs font-bold text-slate-200">Haga clic abajo para intercambiar el perfil activo:</span>
            </div>
          </div>

          <div className="flex flex-wrap gap-1">
            <button
              type="button"
              onClick={() => { setSubRole('supervisor'); setSelectedAppForCheck(null); setSelectedAppForSupervisor(null); }}
              className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                subRole === 'supervisor'
                  ? 'bg-amber-600 text-white shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Supervisor 👑</span>
            </button>

            <button
              type="button"
              onClick={() => { setSubRole('atencion'); setSelectedAppForCheck(null); setSelectedAppForSupervisor(null); }}
              className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                subRole === 'atencion'
                  ? 'bg-blue-600 text-white shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              <span>Atención (Entrada) 📋</span>
            </button>

            <button
              type="button"
              onClick={() => { setSubRole('cubiculo'); setSelectedAppForCheck(null); setSelectedAppForSupervisor(null); }}
              className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                subRole === 'cubiculo'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Cubículo (Ticket) 🖥️</span>
            </button>

            <button
              type="button"
              onClick={() => { setSubRole('pantalla'); setSelectedAppForCheck(null); setSelectedAppForSupervisor(null); }}
              className={`px-4 py-2.5 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-2 transition cursor-pointer ${
                subRole === 'pantalla'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Tv className="w-4 h-4" />
              <span>Pantalla de Turnos 📺</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-amber-600/10 via-amber-700/10 to-amber-900/10 border border-amber-500/20 p-4 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-600/20 text-amber-400 rounded-lg">
              {currentRole === 'extranjeria_supervisor' ? (
                <Users className="w-5 h-5 text-amber-400" />
              ) : currentRole === 'extranjeria_atencion' ? (
                <CheckSquare className="w-5 h-5 text-amber-400" />
              ) : (
                <Building2 className="w-5 h-5 text-amber-400" />
              )}
            </div>
            <div className="text-left">
              <p className="text-[11px] font-black leading-none text-white uppercase tracking-wider select-none">
                {currentRole === 'extranjeria_supervisor' ? 'SALA DE SUPERVISIÓN DE EXTRANJERÍA (FIJO)' : currentRole === 'extranjeria_atencion' ? 'ESTACIÓN DE ATENCIÓN DE EXTRANJERÍA - ENTRADA (FIJO)' : 'MÓDULO DE ATENCIÓN EN CUBÍCULO - EMISIÓN DE TICKETS (FIJO)'}
              </p>
              <p className="text-xs text-slate-405 leading-normal max-w-xl mt-1 text-slate-400">
                Su usuario ha sido configurado con permisos estrictos de acceso. Toda la actividad de emisión, registros de firmas, habilitación de casilleros y descargas de reportes se asocia con su clave de estación de forma segura.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                if (subRole === 'pantalla') {
                  if (currentRole === 'extranjeria_supervisor') setSubRole('supervisor');
                  else if (currentRole === 'extranjeria_atencion') setSubRole('atencion');
                  else setSubRole('cubiculo');
                } else {
                  setSubRole('pantalla');
                }
              }}
              className="bg-emerald-950/40 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 font-black text-[10px] uppercase py-1.5 px-3 rounded-lg transition cursor-pointer select-none flex items-center gap-1.5"
            >
              <Tv className="w-3.5 h-3.5" />
              <span>{subRole === 'pantalla' ? 'Regresar a Consola' : 'Ver Pantalla de Turnos 📺'}</span>
            </button>
            <div className="bg-amber-500/20 px-3 py-1.5 border border-amber-500/30 rounded-lg text-amber-400 font-mono text-[10px] uppercase font-bold tracking-wider select-none">
              🔴 Estación Activa
            </div>
          </div>
        </div>
      )}

      {/* Banner de Estado de Procedimientos */}
      {statusMessage.text && (
        <div className={`p-4 rounded-xl border text-xs font-bold leading-relaxed flex items-center gap-3 animate-fade-in ${
          statusMessage.type === 'success' 
            ? 'bg-emerald-950/90 text-emerald-300 border-emerald-800' 
            : statusMessage.type === 'error'
              ? 'bg-red-950/90 text-red-300 border-red-900'
              : 'bg-slate-900 text-slate-300 border-slate-800'
        }`}>
          {statusMessage.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : statusMessage.type === 'error' ? (
            <XCircle className="w-5 h-5 shrink-0 text-red-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-blue-400" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* CORE INTERFACES PER SUBROLE */}
      {/* ======================================================== */}
      
      {/* PROFILE 1: SUPERVISOR DE EXTRANJERÍA */}
      {subRole === 'supervisor' && (
        <div className="space-y-6 animate-fade-in">
          
          {/* Quick Header instructions for supervisor */}
          <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block">Consola General del Supervisor</span>
              <p className="text-xs text-slate-350 leading-relaxed font-semibold">
                Como Supervisor tiene control total de los flujos de cita. Puede: <strong className="text-white">1) Activar/desactivar casilleros de atención</strong> (4 asignados + 4 de reserva), <strong className="text-white">2) Asignar citas</strong> pre-verificadas a los cubículos, <strong className="text-white">3) Descargar informes de atención</strong> de los trámites finalizados por intervalo de fechas, y <strong className="text-white">4) Modificar parámetros</strong> de slots.
              </p>
            </div>
          </div>

          {/* Supervisor Sub Tabs */}
          <div className="flex border-b border-slate-850 gap-1 overflow-x-auto pb-px">
            <button
              type="button"
              onClick={() => setSupervisorTab('flujo')}
              className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition whitespace-nowrap cursor-pointer ${
                supervisorTab === 'flujo'
                  ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                  : 'border-transparent text-slate-450 hover:text-slate-250 hover:bg-slate-900/40'
              }`}
            >
              Control de Flujo / Asignaciones
            </button>
            <button
              type="button"
              onClick={() => setSupervisorTab('calendario')}
              className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition whitespace-nowrap cursor-pointer ${
                supervisorTab === 'calendario'
                  ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                  : 'border-transparent text-slate-450 hover:text-slate-250 hover:bg-slate-900/40'
              }`}
            >
              Calendario de Citas Extranjería 📅
            </button>
          </div>

          {supervisorTab === 'flujo' ? (
            <div className={currentRole === 'super' ? "grid grid-cols-1 lg:grid-cols-12 gap-6" : "space-y-6"}>
            
            {/* Left side: Casilleros and Controls */}
            {currentRole === 'super' && (
              <div className="lg:col-span-5 space-y-6">
                
                {/* CASILLEROS DE ATENCIÓN (CUBÍCULOS MANAGER) */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
                  <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                    <div className="space-y-0.5">
                      <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                        <Building2 className="w-4 h-4 text-amber-500" />
                        <span>Casilleros de Atención</span>
                      </h4>
                      <p className="text-[9.5px] text-slate-455 font-bold uppercase">4 Operativos fijos  |  4 Puestos de reserva</p>
                    </div>
                    <span className="text-xs font-mono font-black px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-400">
                      {activeBoothsCount} Abiertos
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-3.5 pt-1">
                    {booths.map(b => (
                      <div 
                        key={b.id} 
                        className={`p-3.5 rounded-lg border transition flex flex-col justify-between gap-3 ${
                          b.active 
                            ? 'bg-slate-900/90 border-emerald-500/40 shadow-inner' 
                            : 'bg-slate-950 border-slate-850 opacity-60'
                        }`}
                      >
                        <div className="space-y-1 text-left">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-slate-250 uppercase">{b.name}</span>
                            <span className={`w-2.5 h-2.5 rounded-full ${b.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                          </div>
                          <span className="text-[9.5px] font-bold text-slate-400 font-mono block">Personal: {b.staff}</span>
                          <div className="pt-1.5">
                            {b.empty ? (
                              <span className="text-[8px] bg-slate-900/50 text-slate-450 border border-slate-800 font-black uppercase px-2 py-0.5 rounded">
                                Reserva Vacía
                              </span>
                            ) : (
                              <span className="text-[8px] bg-emerald-950/40 text-emerald-400 border border-emerald-900 font-black uppercase px-2 py-0.5 rounded">
                                Fijo Habilitado
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Enable/Disable dynamic switch button */}
                        <button
                          type="button"
                          onClick={() => toggleBoothActive(b.id)}
                          className={`w-full py-1.5 rounded text-[9px] font-black uppercase tracking-wider transition ${
                            b.active 
                              ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800' 
                              : 'bg-amber-600/90 hover:bg-amber-700 text-white shadow-md'
                          }`}
                        >
                          {b.active ? 'Desactivar' : b.empty ? 'Activar Reserva' : 'Activar Casillero'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* TIMING CONFIGURATOR */}
                <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-500" />
                    <span>Control Horarios & Cupos</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                    Modifique los cupos por slot y el intervalo hábil oficial para trámites migratorios.
                  </p>

                  <form onSubmit={promptSaveConfig} className="space-y-4 pt-1">
                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Capacidad por Intervalo (Slots)</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={capacidad}
                        onChange={(e) => setCapacidad(parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-slate-900 border border-slate-750 text-white p-2.5 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                      />
                    </div>

                    <div className="space-y-1 text-left">
                      <label className="text-[9px] font-extrabold uppercase text-slate-440 block">Intervalo de Duración</label>
                      <select
                        value={intervalo}
                        onChange={(e) => setIntervalo(parseInt(e.target.value, 10))}
                        className="w-full bg-slate-900 border border-slate-755 text-white p-2.5 rounded text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                      >
                        <option value="10">10 minutos</option>
                        <option value="15">15 minutos</option>
                        <option value="20">20 minutos</option>
                        <option value="30">30 minutos</option>
                        <option value="60">60 minutos</option>
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-extrabold uppercase text-slate-440 block">Apertura</label>
                        <select
                          value={horaInicio}
                          onChange={(e) => setHoraInicio(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-750 text-white p-2 rounded text-xs cursor-pointer focus:outline-none font-medium"
                        >
                          {SELECT_TIMES_OPTIONS.map(time => (
                            <option key={`start-${time}`} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>

                      <div className="space-y-1 text-left">
                        <label className="text-[9px] font-extrabold uppercase text-slate-440 block">Cierre</label>
                        <select
                          value={horaFin}
                          onChange={(e) => setHoraFin(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-750 text-white p-2 rounded text-xs cursor-pointer focus:outline-none font-medium"
                        >
                          {SELECT_TIMES_OPTIONS.map(time => (
                            <option key={`end-${time}`} value={time}>{time}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5 text-white" />
                      <span>Aplicar Programación</span>
                    </button>
                  </form>
                </div>

              </div>
            )}

            {/* Right side: Waiting List for Assignments and Management Reports */}
            <div className={currentRole === 'super' ? "lg:col-span-7 space-y-6" : "space-y-6"}>

              {/* OUTSTANDING CITATIONS FOR CUBICLE ASSIGNMENT */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
                <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                  <div className="space-y-0.5 text-left">
                    <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                      <Sliders className="w-4 h-4 text-amber-500" />
                      <span>Bandeja de Asignación por Supervisor</span>
                    </h4>
                    <p className="text-[9.5px] text-slate-450 font-bold uppercase">Citas verificadas por Atención en espera de cubículo habilitado</p>
                  </div>
                  <span className="text-xs font-mono font-black px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-400">
                    {queueSupervisorPending.length} Pendiente(s)
                  </span>
                </div>

                {selectedAppForSupervisor ? (
                  <div className="space-y-4 animate-fade-in text-left">
                    {/* Header snapshot with back button */}
                    <div className="flex items-center justify-between bg-slate-900/85 p-3.5 rounded-lg border border-slate-800">
                      <div className="space-y-0.5">
                        <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest block font-mono">Segundo Chequeo Activo</span>
                        <div className="text-[11px] font-mono font-black text-white">{selectedAppForSupervisor.id}</div>
                        <div className="text-xs font-bold text-slate-150 uppercase">
                          {getExtranjeriaCitizenName(selectedAppForSupervisor)}
                        </div>
                        <div className="text-[10px] text-emerald-400 font-bold block font-sans">
                          Agendado por: {selectedAppForSupervisor.creadoPor || selectedAppForSupervisor.datosPersonales?.creadoPor || 'Portal del Ciudadano'}
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedAppForSupervisor(null);
                          setSupervisorCheckedDocs([]);
                        }}
                        className="bg-slate-950 hover:bg-slate-900 text-slate-350 hover:text-white border border-slate-800 text-[10px] font-bold uppercase px-3 py-1.5 rounded transition flex items-center gap-1 cursor-pointer"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Volver</span>
                      </button>
                    </div>

                    {/* Alert */}
                    <div className="bg-amber-950/20 border border-amber-500/20 p-3.5 rounded-lg text-[10px] text-amber-400 leading-relaxed font-semibold flex items-start gap-2.5">
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
                      <span>
                        <strong>Control Cruzado de Seguridad:</strong> El Supervisor de Extranjería debe certificar individualmente que el ciudadano presenta cada uno de los requisitos antes de habilitar su despacho a ventanilla.
                      </span>
                    </div>

                    {/* Checkboxes of REQUISITOS_EXTRANJERIA */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-455 block">Re-Verificación Obligatoria (2do Control)</span>
                        <button
                          type="button"
                          onClick={() => setSupervisorCheckedDocs(REQUISITOS_EXTRANJERIA.map(r => r.id))}
                          className="text-[9.5px] font-black text-amber-500 hover:text-amber-400 bg-amber-950/40 hover:bg-amber-950 border border-amber-500/30 rounded px-2 py-0.5 transition cursor-pointer flex items-center gap-1"
                        >
                          <span>Marcar todos ✓</span>
                        </button>
                      </div>
                      {REQUISITOS_EXTRANJERIA.map(req => {
                        const isChecked = supervisorCheckedDocs.includes(req.id);
                        return (
                          <button
                            key={`sup-doc-check-${req.id}`}
                            type="button"
                            onClick={() => handleToggleSupervisorDocCheck(req.id)}
                            className={`w-full p-3 rounded-lg border text-left flex items-center justify-between gap-3 transition cursor-pointer ${
                              isChecked 
                                ? 'bg-amber-950/25 border-amber-500/40 text-amber-300' 
                                : 'bg-slate-900/40 border-slate-850 text-slate-400 hover:border-slate-800'
                            }`}
                          >
                            <span className="text-[10.5px] font-semibold leading-relaxed">{req.name}</span>
                            <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                              isChecked ? 'bg-amber-600 border-amber-500 text-white' : 'border-slate-700'
                            }`}>
                              {isChecked && <Check className="w-3 h-3 text-white stroke-[3px]" />}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Assignment part */}
                    <div className="pt-2 border-t border-slate-850 space-y-3">
                      <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Despacho de Turno a Cubículo</span>
                      
                      {supervisorCheckedDocs.length < REQUISITOS_EXTRANJERIA.length ? (
                        <div className="p-3 bg-slate-900/80 rounded border border-slate-850 text-[10px] text-slate-450 font-bold uppercase text-center">
                          🔒 Marque los {REQUISITOS_EXTRANJERIA.length} requisitos arriba para habilitar la asignación automática
                        </div>
                      ) : (
                        <div className="space-y-3.5 animate-fade-in bg-slate-950/80 p-4 rounded-lg border border-slate-800">
                          <div className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1.5 justify-center">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span>Control completado con éxito</span>
                          </div>

                          {recommendedBooth ? (
                            <div className="space-y-2 text-center bg-slate-900/60 p-3 rounded border border-slate-800">
                              <span className="text-[9px] font-black text-slate-450 block uppercase tracking-wider">Siguiente Cubículo Disponible (Por Balance de Carga)</span>
                              <div className="text-sm font-black text-white">{recommendedBooth.name}</div>
                              <div className="text-[10.5px] text-slate-400 font-medium">Operador: <strong className="text-amber-500">{recommendedBooth.staff}</strong></div>
                              
                              <button
                                type="button"
                                onClick={() => {
                                  handleAutoAssignToCubiculo(selectedAppForSupervisor.id);
                                  setSelectedAppForSupervisor(null);
                                  setSupervisorCheckedDocs([]);
                                }}
                                className="w-full mt-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-[10.5px] tracking-wider uppercase py-3 rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span>Firmar y Despachar Turno Automáticamente ⚡</span>
                              </button>
                            </div>
                          ) : (
                            <div className="p-3 text-[10.5px] text-red-400 font-bold text-center">
                              ⚠️ No hay cubículos activos habilitados. Active uno abajo en la consola del supervisor de extranjería.
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ) : queueSupervisorPending.length === 0 ? (
                  <div className="p-10 border border-dashed border-slate-850 rounded-lg text-center space-y-2 text-slate-450">
                    <Inbox className="w-8 h-8 mx-auto text-slate-600" />
                    <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-350">Bandeja Vacía</span>
                    <p className="text-[10px] max-w-sm mx-auto leading-relaxed">
                      No hay citas pendientes de asignación por el momento. Cuando el <strong className="text-slate-300">Usuario de Atención</strong> verifique la documentación, las solicitudes aparecerán aquí.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {/* Live Search Input for Supervisor Pending Queue */}
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                      <input
                        type="text"
                        placeholder="Búsqueda rápida por Nombre, ID, Pasaporte, Trámite, Creado por..."
                        value={supervisorSearchQuery}
                        onChange={(e) => setSupervisorSearchQuery(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-800 rounded-md py-1.5 pl-9 pr-8 text-[11px] text-white focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-amber-500 font-medium placeholder-slate-600"
                      />
                      {supervisorSearchQuery && (
                        <button
                          type="button"
                          onClick={() => setSupervisorSearchQuery('')}
                          className="absolute right-2.5 top-1.5 text-slate-500 hover:text-white text-xs font-black px-1"
                        >
                          ✕
                        </button>
                      )}
                    </div>

                    {filteredQueueSupervisorPending.length === 0 ? (
                      <div className="py-12 border border-dashed border-slate-850 rounded-lg text-center space-y-1.5 text-slate-500">
                        <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-400">Sin Coincidencias</span>
                        <p className="text-[10px] max-w-xs mx-auto leading-relaxed">
                          No se encontraron expedientes con la búsqueda "<strong className="text-slate-300">{supervisorSearchQuery}</strong>". Intente con otro criterio.
                        </p>
                      </div>
                    ) : (
                      <div className="divide-y divide-slate-850/60 max-h-[360px] overflow-y-auto pr-1">
                        {filteredQueueSupervisorPending.map(app => {
                          const name = getExtranjeriaCitizenName(app);
                          const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                          
                          return (
                            <button
                              key={app.id} 
                              type="button"
                              onClick={() => {
                                setSelectedAppForSupervisor(app);
                                setSupervisorCheckedDocs([]);
                              }}
                              className="w-full py-3.5 px-3 text-left transition hover:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850/30 last:border-0 rounded-lg cursor-pointer"
                            >
                              <div className="space-y-1 text-left">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold font-mono text-amber-400">{app.id}</span>
                                  <span className="text-[8.5px] bg-amber-950/20 border border-amber-500/30 text-amber-400 uppercase font-bold px-1.5 py-0.2 rounded font-mono">
                                    Pre-verificado (Atención)
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-slate-200 block uppercase">{name}</span>
                                <span className="text-[9.5px] font-mono text-slate-450 block font-semibold">PAS: {passport} | Fecha: {app.fecha} ({app.hora})</span>
                                <span className="text-[9.5px] text-emerald-400 block font-semibold">Agendado por: {app.creadoPor || app.datosPersonales?.creadoPor || 'Portal del Ciudadano'}</span>
                              </div>

                              <div className="flex items-center gap-1.5 text-slate-400 hover:text-white transition font-black uppercase text-[9.5px] tracking-wider shrink-0 bg-slate-900 border border-slate-800 px-3 py-2 rounded-md">
                                <span>Verificar Requisitos</span>
                                <ArrowRight className="w-3.5 h-3.5" />
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ATENCION & PERFORMANCE REPORTS (REALIZED CITATIONS DOWNLOAD) */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-5 shadow-xl">
                <div className="border-b border-slate-900 pb-3 text-left">
                  <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5 font-sans">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span>Reportes de Atención de Citas Realizadas</span>
                  </h4>
                  <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono">Descargue reportes con las citas completadas de Extranjería efectivamente atendidas por rango de fechas</p>
                </div>

                <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl space-y-4">
                  {/* Date Input Range Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                        Intervalo de Fecha Desde
                      </label>
                      <input
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                        Intervalo de Fecha Hasta
                      </label>
                      <input
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-850">
                    <div className="text-left space-y-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block font-mono">
                        Citas Atendidas Encontradas
                      </span>
                      <p className="text-xl font-mono font-black text-white">
                        {filterRealizadasByDateRange(reportStartDate, reportEndDate).length} <span className="text-xs font-sans font-medium text-slate-400">citas completadas</span>
                      </p>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                      <button
                        type="button"
                        onClick={handleDownloadRealizadasCSV}
                        className="flex-1 sm:flex-none bg-slate-950 hover:bg-slate-800 border border-slate-800 px-4 py-2.5 rounded text-[10px] font-black uppercase text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer transition min-w-[100px]"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        <span>EXPORTAR CSV</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleDownloadRealizadasPDF}
                        className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700 text-white px-4 py-2.5 rounded text-[10px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition min-w-[100px]"
                      >
                        <Download className="w-4 h-4" />
                        <span>DESCARGAR PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* VISUALIZADOR DE CITAS REGISTRADAS POR PERIODO */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl text-left">
                <div className="border-b border-slate-900 pb-3 text-left flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5 font-sans">
                      <Calendar className="w-4 h-4 text-amber-500" />
                      <span>Visualizador de Citas por Período</span>
                    </h4>
                    <p className="text-[10px] text-slate-450 font-bold uppercase font-mono">Citas agendadas en Sede Principal de Extranjería</p>
                  </div>
                  
                  {/* Period Switcher Tabs */}
                  <div className="flex bg-slate-900 rounded p-1 border border-slate-800 w-fit shrink-0">
                    {(['dia', 'semana', 'mes', 'año'] as const).map(period => (
                      <button
                        key={`tab-v-${period}`}
                        type="button"
                        onClick={() => setSupervisorPeriodFilter(period)}
                        className={`px-3 py-1 text-[9.5px] font-black uppercase rounded transition tracking-wider cursor-pointer ${
                          supervisorPeriodFilter === period
                            ? 'bg-amber-600 text-white shadow-sm font-extrabold'
                            : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
                        }`}
                      >
                        {period === 'dia' ? 'Día' : period === 'semana' ? 'Semana' : period === 'mes' ? 'Mes' : 'Año'}
                      </button>
                    ))}
                  </div>
                </div>

                {supervisorFilteredAppointments.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-850 rounded-lg text-center space-y-1 text-slate-450">
                    <Info className="w-6 h-6 mx-auto text-slate-600" />
                    <span className="text-[10px] font-bold uppercase tracking-wider block text-slate-400">Sin Citas</span>
                    <p className="text-[9.5px] leading-relaxed max-w-xs mx-auto text-slate-500 font-medium">
                      No se encontraron citas agendadas registradas para el período seleccionado.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[350px] overflow-y-auto pr-1 divide-y divide-slate-850 border border-slate-900 bg-slate-900/10 p-2 rounded-lg">
                    {supervisorFilteredAppointments.map((app: any) => {
                      const name = app.datosPersonales?.nombreCompleto || app.nombre || 'Ciudadano N/D';
                      const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                      const subservice = app.subServicioNombre || 'Servicio de Extranjería';
                      const stepStatus = appMetadata[app.id]?.estadoTicket || 'En Entrada';

                      // Status Badge color
                      let badgeStyle = 'bg-slate-900 border-slate-850 text-slate-350';
                      if (app.estado === 'cancelada') {
                        badgeStyle = 'bg-red-950/20 border-red-900/30 text-red-400';
                      } else if (app.estado === 'confirmada' || stepStatus === 'realizada') {
                        badgeStyle = 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400';
                      } else if (stepStatus === 'modulo') {
                        badgeStyle = 'bg-blue-950/20 border-blue-900/30 text-blue-400';
                      } else if (stepStatus === 'supervisor') {
                        badgeStyle = 'bg-amber-950/25 border-amber-800/30 text-amber-500';
                      }

                      return (
                        <div key={`supervisor-v-${app.id}`} className="pt-2 last:pb-1 first:pt-0 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs leading-relaxed">
                          <div className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-black text-amber-500 text-[11px]">{app.id}</span>
                              <span className="text-[8.5px] uppercase tracking-wide bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded font-black text-slate-400 font-mono">
                                {subservice}
                              </span>
                            </div>
                            <h5 className="font-bold text-slate-200 uppercase tracking-wide">{name}</h5>
                            <p className="text-[10px] text-slate-450 font-semibold leading-none">
                              Pasaporte: <span className="font-mono text-slate-300 font-bold">{passport}</span> | Fecha: <span className="font-mono text-amber-300 font-bold">{app.fecha}</span> ({app.hora})
                            </p>
                          </div>

                          <div className="shrink-0 flex flex-col items-end gap-1 font-sans">
                            <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded border tracking-wider font-mono ${badgeStyle}`}>
                              {app.estado === 'cancelada' ? 'Cancelada' : stepStatus === 'realizada' ? 'Atendido' : stepStatus === 'modulo' ? 'En Módulo' : stepStatus === 'supervisor' ? 'S. Control' : 'En Cola'}
                            </span>
                            {app.telefono && (
                              <span className="text-[9px] font-mono text-slate-500 font-bold">{app.telefono}</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

            </div>

          </div>
          ) : (
            /* CALENDAR VIEW */
            <div className="space-y-6 animate-fade-in text-slate-100">
              
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* 1. MONTHLY CALENDAR GRID CONTAINER (8 Columns) */}
                <div className="xl:col-span-8 bg-slate-950 border border-slate-800 p-5 rounded-xl shadow-xl space-y-4 text-left">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-900 pb-3">
                    <div className="space-y-1">
                      <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                        <Calendar className="w-5 h-5 text-amber-500" />
                        <span>Planeador y Calendario de Extranjería</span>
                      </h4>
                      <p className="text-[10px] text-slate-450 font-bold uppercase font-mono">
                        Visualice la carga diaria, agende o elimine citas autorizadas
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          const prev = new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1);
                          setCalendarDate(prev);
                        }}
                        className="bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-amber-500/50 p-2 rounded cursor-pointer transition font-bold"
                      >
                        &larr;
                      </button>
                      <span className="text-xs font-black uppercase tracking-wider text-amber-500 px-3 py-1 bg-amber-500/5 border border-amber-500/10 rounded font-mono">
                        {mesesNombres[calendarDate.getMonth()]} {calendarDate.getFullYear()}
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1);
                          setCalendarDate(next);
                        }}
                        className="bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-amber-500/50 p-2 rounded cursor-pointer transition font-bold"
                      >
                        &rarr;
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setNewCitaFecha(selectedCalendarDateStr);
                          setShowCreateForm(!showCreateForm);
                        }}
                        className="ml-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10.5px] uppercase tracking-wider px-3.5 py-2 rounded transition flex items-center gap-1.5 shadow-md cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Crear Cita</span>
                      </button>
                    </div>
                  </div>

                  {/* Calendar main monthly grid */}
                  <div className="space-y-2">
                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 gap-1 text-center font-mono text-[9px] font-black text-slate-500 uppercase tracking-wider">
                      {diasSemanaNombres.map(dName => (
                        <div key={`cal-hdr-${dName}`} className="py-1">
                          {dName}
                        </div>
                      ))}
                    </div>

                    {/* Day tiles */}
                    <div className="grid grid-cols-7 gap-1">
                      {monthDays.map(day => {
                        const isSelected = selectedCalendarDateStr === day.dateStr;
                        const dayCitas = appointmentsByDate[day.dateStr] || [];
                        const isToday = (() => {
                          const t = new Date();
                          const mm = String(t.getMonth() + 1).padStart(2, '0');
                          const dd = String(t.getDate()).padStart(2, '0');
                          return `${t.getFullYear()}-${mm}-${dd}` === day.dateStr;
                        })();

                        return (
                          <button
                            key={`tile-${day.key}`}
                            type="button"
                            onClick={() => setSelectedCalendarDateStr(day.dateStr)}
                            className={`min-h-[75px] p-2 rounded-lg border transition text-left flex flex-col justify-between cursor-pointer ${
                              isSelected 
                                ? 'bg-amber-950/20 border-amber-500 shadow-md ring-1 ring-amber-500/35' 
                                : day.isCurrentMonth
                                  ? 'bg-slate-900/40 border-slate-850 hover:bg-slate-900/80 hover:border-slate-750'
                                  : 'bg-slate-950 border-slate-900 opacity-30 hover:opacity-50'
                            }`}
                          >
                            <div className="flex items-center justify-between w-full">
                              <span className={`text-[11px] font-mono font-bold leading-none ${
                                isSelected ? 'text-amber-400 font-black' : isToday ? 'text-emerald-400 font-extrabold' : 'text-slate-200'
                              }`}>
                                {day.dayNum}
                                {isToday && <span className="text-[7.5px] font-sans ml-1 text-emerald-500 uppercase font-black tracking-widest">(HOY)</span>}
                              </span>
                              
                              {dayCitas.length > 0 && (
                                <span className="bg-amber-500 text-slate-950 text-[9px] font-black w-4.5 h-4.5 rounded-full flex items-center justify-center font-mono">
                                  {dayCitas.length}
                                </span>
                              )}
                            </div>

                            {/* Small preview list on day tile if space permit */}
                            <div className="space-y-0.5 mt-1 overflow-hidden max-h-[36px] w-full hidden sm:block">
                              {dayCitas.slice(0, 2).map((c: any) => (
                                <div key={`prev-line-${c.id}`} className="text-[8px] font-bold text-slate-400 truncate tracking-tight uppercase leading-none font-sans">
                                  • {c.nombre || c.datosPersonales?.nombreCompleto || 'Cita'}
                                </div>
                              ))}
                              {dayCitas.length > 2 && (
                                <div className="text-[7.5px] text-amber-500/80 font-mono leading-none">
                                  +{dayCitas.length - 2} más
                                </div>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 2. DATE DETAILS & ACTION PANEL (4 Columns) */}
                <div className="xl:col-span-4 bg-slate-950 border border-slate-800 p-5 rounded-xl shadow-xl flex flex-col justify-between text-left gap-4 min-h-[500px]">
                  
                  {/* Collapsible / inline Form for creating new appointment */}
                  {showCreateForm ? (
                    <div className="space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-900">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block font-mono">Registro de Nueva Cita</span>
                        <button
                          type="button"
                          onClick={() => setShowCreateForm(false)}
                          className="text-xs text-slate-455 hover:text-white font-bold cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>

                      <form onSubmit={handleCreateCitaSupervisor} className="space-y-3.5">
                        <div className="space-y-1">
                          <label className="text-[9.5px] font-extrabold uppercase text-slate-450 block">Nombre Completo del Ciudadano *</label>
                          <input
                            type="text"
                            required
                            placeholder="Ej. Juan Andrés Pérez"
                            value={newCitaNombre}
                            onChange={(e) => setNewCitaNombre(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-800 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9.5px] font-extrabold uppercase text-slate-450 block">No. Pasaporte *</label>
                            <input
                              type="text"
                              required
                              placeholder="Ej. PE981726"
                              value={newCitaPasaporte}
                              onChange={(e) => setNewCitaPasaporte(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono font-bold"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9.5px] font-extrabold uppercase text-slate-450 block">Nacionalidad</label>
                            <input
                              type="text"
                              placeholder="Ej. Venezolana"
                              value={newCitaNacionalidad}
                              onChange={(e) => setNewCitaNacionalidad(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 text-slate-100"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9.5px] font-extrabold uppercase text-slate-450 block">Fecha Cita *</label>
                            <input
                              type="date"
                              required
                              value={newCitaFecha}
                              onChange={(e) => setNewCitaFecha(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-slate-100 cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9.5px] font-extrabold uppercase text-slate-450 block">Hora Cita *</label>
                            <select
                              required
                              value={newCitaHora}
                              onChange={(e) => setNewCitaHora(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-slate-100 cursor-pointer"
                            >
                              <option value="07:00 AM">07:00 AM</option>
                              <option value="07:30 AM">07:30 AM</option>
                              <option value="08:00 AM">08:00 AM</option>
                              <option value="08:30 AM">08:30 AM</option>
                              <option value="09:00 AM">09:00 AM</option>
                              <option value="09:30 AM">09:30 AM</option>
                              <option value="10:00 AM">10:00 AM</option>
                              <option value="10:30 AM">10:30 AM</option>
                              <option value="11:00 AM">11:00 AM</option>
                              <option value="11:30 AM">11:30 AM</option>
                              <option value="12:00 PM">12:00 PM</option>
                              <option value="12:30 PM">12:30 PM</option>
                              <option value="01:00 PM">01:00 PM</option>
                              <option value="01:30 PM">01:30 PM</option>
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9.5px] font-extrabold uppercase text-slate-450 block">Correo Electrónico</label>
                            <input
                              type="email"
                              placeholder="ejemplo@correo.com"
                              value={newCitaCorreo}
                              onChange={(e) => setNewCitaCorreo(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9.5px] font-extrabold uppercase text-slate-450 block">Teléfono / Celular</label>
                            <input
                              type="text"
                              placeholder="+507 9999-9999"
                              value={newCitaTelefono}
                              onChange={(e) => setNewCitaTelefono(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                            />
                          </div>
                        </div>

                        <button
                          type="submit"
                          className="w-full bg-amber-600 hover:bg-amber-700 text-white font-black text-xs uppercase tracking-wider py-3 rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Check className="w-4 h-4" />
                          <span>Agendar Cita Oficial</span>
                        </button>
                      </form>
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      <div className="space-y-1">
                        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block font-mono">Detalles del Día</span>
                        <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>Citas para el {selectedCalendarDateStr}</span>
                          <span className="bg-slate-900 px-2 py-0.5 rounded font-mono border border-slate-800 text-xs font-bold text-slate-350">
                            {(appointmentsByDate[selectedCalendarDateStr] || []).length} cita(s)
                          </span>
                        </h4>
                      </div>

                      {/* List of appointments for selected day */}
                      <div className="flex-1 mt-2 overflow-y-auto max-h-[380px] space-y-3.5 pr-1 divide-y divide-slate-850">
                        {(appointmentsByDate[selectedCalendarDateStr] || []).length === 0 ? (
                          <div className="h-full flex flex-col items-center justify-center py-10 text-center gap-2 text-slate-500">
                            <Inbox className="w-8 h-8 text-slate-650" />
                            <p className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">Día sin citas</p>
                            <p className="text-[10px] text-slate-550 leading-relaxed font-semibold max-w-[200px] mx-auto">
                              No se encontraron reservas de Extranjería para este día en el sistema.
                            </p>
                          </div>
                        ) : (
                          (appointmentsByDate[selectedCalendarDateStr] || []).map((app: any) => {
                            const stepStatus = appMetadata[app.id]?.estadoTicket || 'En Entrada';
                            const pName = app.nombre || app.datosPersonales?.nombreCompleto || 'Ciudadano N/D';
                            const passportVal = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                            
                            const subservice = app.subServicioNombre || (isExtranjeriaAppointment(app) ? 'Servicio de Extranjería' : 'Cédula Pasados de Edad');
                            
                            return (
                              <div key={`cal-det-${app.id}`} className="space-y-1.5 pt-3.5 first:pt-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-amber-500 font-mono font-black text-xs">{app.id}</span>
                                      <span className="text-[9px] bg-slate-900 text-slate-400 border border-slate-800 px-1 rounded font-mono font-bold leading-none py-0.5">
                                        {app.hora}
                                      </span>
                                      <span className="text-[8px] uppercase tracking-wide bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded font-black text-slate-400 font-mono">
                                        {subservice}
                                      </span>
                                    </div>
                                    <h5 className="font-extrabold text-white text-[11px] uppercase truncate max-w-[170px]">
                                      {pName}
                                    </h5>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCitaSupervisor(app.id)}
                                    className="p-1 px-1.5 rounded bg-red-950/45 hover:bg-red-900 border border-red-900/40 text-red-400 hover:text-white transition cursor-pointer"
                                    title="Eliminar cita permanentemente"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>

                                <div className="text-[9.5px] text-slate-455 space-y-0.5 font-sans leading-relaxed">
                                  <div>PAS: <span className="font-mono text-slate-350">{passportVal}</span></div>
                                  <div>Contacto: <span className="font-mono text-slate-350">{app.telefono || 'N/D'}</span> | <span className="text-slate-350">{app.correo || 'N/D'}</span></div>
                                  <div className="flex items-center gap-1.5 pt-0.5">
                                    <span className="text-[8.5px] font-black uppercase text-slate-500">Estado:</span>
                                    <span className={`text-[8px] font-bold uppercase px-1.5 py-0.2 rounded font-mono border ${
                                      app.estado === 'cancelada' 
                                        ? 'bg-red-950/20 text-red-400 border-red-900/30' 
                                        : stepStatus === 'realizada' 
                                          ? 'bg-emerald-950/20 text-emerald-400 border-emerald-900/30' 
                                          : 'bg-amber-950/25 text-amber-500 border-amber-800/30'
                                    }`}>
                                      {app.estado === 'cancelada' ? 'Cancelada' : stepStatus === 'realizada' ? 'Atendido' : 'Confirmada'}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>

                      {/* Info footer box */}
                      <div className="p-3.5 bg-slate-900/60 rounded-lg border border-slate-800 text-[9.5px] text-slate-400 leading-normal font-medium mt-1">
                        🔒 **Control Reservado**: La creación y eliminación de citas actualiza la base de datos central de Extranjería en tiempo real.
                      </div>
                    </div>
                  )}

                </div>

              </div>

            </div>
          )}

        </div>
      )}

      {/* PROFILE 2: USUARIO EXTRANJERÍA ATENCIÓN (SALA DE ENTRADA) */}
      {subRole === 'atencion' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
          
          {/* Left panel: general citations */}
          <div className="lg:col-span-7 bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-900">
              <div className="space-y-0.5 text-left">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <span>Ciudadanos en Entrada de Extranjería</span>
                  <span className="bg-slate-900 border border-slate-750 text-slate-400 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono">
                    {queueAtencionIn.length}
                  </span>
                </h4>
                <p className="text-[10px] text-slate-455 font-bold uppercase leading-relaxed text-left">Seleccione el ciudadano para verificar documentos y pasarlo al Supervisor</p>
              </div>

              <button
                type="button"
                onClick={fetchAppointments}
                disabled={loading}
                className="text-slate-400 hover:text-white transition bg-slate-900 p-2 rounded border border-slate-800 flex items-center gap-1 text-[10px] font-extrabold uppercase"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* List */}
            {queueAtencionIn.length === 0 ? (
              <div className="py-20 text-center space-y-2 text-slate-450 border border-dashed border-slate-850 rounded">
                <CheckCircle className="w-8 h-8 text-slate-600 mx-auto" />
                <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-350">Sin citas en espera</span>
                <p className="text-[10px] max-w-xs mx-auto leading-relaxed">Todos los ciudadanos registrados de Extranjería ya han sido procesados por la Unidad de Entrada.</p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {queueAtencionIn.map(app => {
                  const name = getExtranjeriaCitizenName(app);
                  const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                  const isSelected = selectedAppForCheck?.id === app.id;

                  return (
                    <button
                      key={`atencion-list-${app.id}`}
                      type="button"
                      onClick={() => {
                        setSelectedAppForCheck(app);
                        const meta = appMetadata[app.id];
                        setTempCheckedDocs(meta?.checkedDocs || []);
                      }}
                      className={`w-full p-4 rounded-lg border text-left flex items-start justify-between gap-4 transition cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-950/45 border-blue-500 shadow-md shadow-blue-950/25'
                          : 'bg-slate-900/60 border-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono font-black text-amber-500">{app.id}</span>
                          <span className="text-[8.5px] bg-slate-950 border border-slate-800 text-slate-400 font-extrabold px-1.5 py-0.2 rounded font-mono">
                            Código Tx: {app.codigoTransaccion}
                          </span>
                        </div>
                        <span className="text-xs font-bold text-slate-100 block uppercase">{name}</span>
                        <span className="text-[9.5px] font-bold text-slate-450 block font-mono">PAS: {passport}  |  Fecha: {app.fecha} ({app.hora})</span>
                        <span className="text-[9.5px] text-emerald-400 block font-semibold">Agendado por: {app.creadoPor || app.datosPersonales?.creadoPor || 'Portal del Ciudadano'}</span>
                      </div>

                      <div className="py-1">
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-blue-900 bg-blue-950/30 text-blue-400">
                          Sala de Entrada
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right panel: checklist */}
          <div className="lg:col-span-5 bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
            <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5 pb-3 border-b border-slate-900">
              <CheckSquare className="w-4 h-4 text-blue-500" />
              <span>Verificación de Documentos</span>
            </h4>

            {!selectedAppForCheck ? (
              <div className="py-24 text-center space-y-3 text-slate-500">
                <FileText className="w-9 h-9 text-slate-700 mx-auto" />
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Ningún ciudadano seleccionado</p>
                <p className="text-[9.5px] max-w-[200px] mx-auto leading-relaxed">
                  Haga clic en una de las tarjetas de ciudadano de la izquierda para comenzar la validación de sus requisitos de nacionalidad y cedulación.
                </p>
              </div>
            ) : (
              <div className="space-y-5 animate-fade-in text-left">
                
                {/* Details snapshot */}
                <div className="bg-slate-900 p-3.5 rounded-lg border border-slate-850 space-y-1.5">
                  <span className="text-[9px] font-black text-blue-400 uppercase tracking-widest block font-mono">Cita para Validación</span>
                  <div className="text-xs font-mono font-black text-white">{selectedAppForCheck.id}</div>
                  <div className="text-sm font-bold text-slate-100 uppercase">{getExtranjeriaCitizenName(selectedAppForCheck)}</div>
                  <div className="text-[10px] text-emerald-400 font-bold block font-sans">
                    Agendado por: {selectedAppForCheck.creadoPor || selectedAppForCheck.datosPersonales?.creadoPor || 'Portal del Ciudadano'}
                  </div>
                  <div className="text-[10px] text-slate-450 leading-relaxed font-semibold">
                    Pasaporte: {selectedAppForCheck.datosPersonales?.pasaporte || selectedAppForCheck.identificacion} <br />
                    Trámite: {selectedAppForCheck.subServicioNombre || 'Servicio de Cedulación Extranjera'}
                  </div>
                </div>

                {/* Checklist form */}
                <div className="space-y-3 bg-slate-900/40 p-4 rounded-lg border border-slate-900 text-left">
                  <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Documentación a Validar</span>
                  <ul className="space-y-2 text-slate-300">
                    {REQUISITOS_EXTRANJERIA.map(req => (
                      <li key={`req-item-${req.id}`} className="text-[10.5px] font-semibold leading-relaxed flex items-start gap-2">
                        <span className="text-blue-500 font-bold shrink-0">•</span>
                        <span>{req.name}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Summary checklist alert */}
                <div className="bg-slate-900/50 p-3 rounded border border-slate-900 text-[10px] text-slate-400 leading-relaxed font-semibold">
                  Al confirmar, se asumirá que se ha validado toda la documentación física original presentada. El expediente se enviará de inmediato al Supervisor de Extranjería para la asignación de cubículo de atención.
                </div>

                {/* Actions */}
                <div className="pt-2 text-right">
                   <button
                     type="button"
                     onClick={() => handleSubmitVerification(selectedAppForCheck.id)}
                     className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] tracking-wider uppercase py-3 rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                   >
                     <Send className="w-3.5 h-3.5" />
                     <span>Confirmar Docs & Enviar a Supervisor</span>
                   </button>
                </div>

              </div>
            )}

            {/* List of already processed by Atencion (Forwarded tracker) */}
            {queueAtencionOut.length > 0 && (
              <div className="pt-4 border-t border-slate-900 text-left space-y-2.5">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Registro de Tramitados de Entrada</span>
                <div className="space-y-1.5 max-h-[150px] overflow-y-auto">
                  {queueAtencionOut.map(app => {
                    const meta = appMetadata[app.id];
                    const name = app.datosPersonales?.nombreCompleto || app.nombre || 'N/D';
                    const nameShort = name.length > 25 ? name.slice(0, 23) + '...' : name;
                    
                    const boothObj = meta?.assignedCubiculo ? booths.find(b => b.id === meta.assignedCubiculo) : null;

                    return (
                      <div key={`atencion-done-${app.id}`} className="bg-slate-900/40 border border-slate-900/80 px-3 py-2 rounded flex items-center justify-between gap-3 text-[10.5px]">
                        <div>
                          <strong className="text-slate-350 font-mono">{app.id}</strong>
                          <span className="text-slate-500 font-bold uppercase ml-2 select-none">-</span>
                          <span className="text-slate-400 uppercase font-semibold ml-2">{nameShort}</span>
                        </div>
                        {boothObj ? (
                          <span className="text-[8px] font-black uppercase bg-indigo-950/60 text-indigo-400 border border-indigo-900/50 px-2 py-0.2 rounded">
                            Asignado: {boothObj.name}
                          </span>
                        ) : (
                          <span className="text-[8px] font-black uppercase bg-slate-900 text-amber-500 border border-slate-800 px-2 py-0.2 rounded animate-pulse">
                            Espera Supervisor
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          </div>

        </div>
      )}

      {/* PROFILE 3: USUARIO EXTRANJERÍA CUBÍCULO (TICKET PROCESS SYSTEM) */}
      {subRole === 'cubiculo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-left">
          
          {/* Left panel: Cubicle selection and status indicator */}
          {currentRole !== 'extranjeria_cubiculo' && (
            <div className="lg:col-span-4 space-y-5">
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
                <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-900">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  <span>Puesto de Trabajo</span>
                </h4>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Seleccione el Cubículo a Operar:</label>
                  <select
                    value={selectedCubiculo}
                    onChange={(e) => setSelectedCubiculo(parseInt(e.target.value, 10))}
                    className="w-full bg-slate-900 border border-slate-800 text-slate-200 rounded text-xs p-3.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-black cursor-pointer"
                  >
                    {booths.map(b => (
                      <option key={`cubiculo-view-opt-${b.id}`} value={b.id}>
                        {b.name} {b.active ? ' (ACTIVO)' : ' (INACTIVO)'} - {b.staff}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status display for booth */}
                {(() => {
                  const b = booths.find(x => x.id === selectedCubiculo);
                  return (
                    <div className="bg-slate-900 p-3.5 rounded border border-slate-850 space-y-2.5">
                      <span className="text-[9.5px] font-black text-slate-450 uppercase block tracking-widest font-mono">Estado del Casillero</span>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-white uppercase">{b?.name}</span>
                        <span className={`text-[8.5px] font-extrabold uppercase px-2 py-0.5 rounded-full border ${
                          b?.active 
                            ? 'bg-emerald-950/80 border-emerald-900 text-emerald-400' 
                            : 'bg-slate-950 border-slate-800 text-slate-500'
                        }`}>
                          {b?.active ? 'Estación Activa' : 'Estación Cerrada'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                        Operador asignado: <strong className="text-slate-200">{b?.staff}</strong>
                        {!b?.active && (
                          <p className="text-[9px] text-amber-500 mt-2 font-bold leading-normal">
                            ⚠️ ATENCIÓN: Este casillero figura desactivado por el Supervisor. Cámbiese de cubículo o pida al Supervisor que lo active.
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* QUICK STATS FOR ACTIVE CUBICLE */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-3.5 shadow-xl">
                <span className="text-[10px] font-black uppercase text-slate-450 tracking-wider block">Eficiencia del Operador</span>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-900 p-3 rounded border border-slate-850 text-center">
                    <span className="text-[8px] text-slate-450 uppercase font-black block">Atendidos Hoy</span>
                    <span className="text-xl font-mono font-black text-indigo-400">
                      {appointments.filter(app => {
                        const meta = appMetadata[app.id];
                        return meta && meta.assignedCubiculo === selectedCubiculo && meta.estadoTicket === 'realizada';
                      }).length}
                    </span>
                  </div>
                  <div className="bg-slate-900 p-3 rounded border border-slate-850 text-center">
                    <span className="text-[8px] text-slate-450 uppercase font-black block">Tránsito</span>
                    <span className="text-xl font-mono font-black text-white">Normal</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right panel: queuing and ticket execution */}
          <div className={`${
            currentRole === 'extranjeria_cubiculo' ? 'lg:col-span-12' : 'lg:col-span-8'
          } bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-5 shadow-xl`}>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2 pb-3 border-b border-slate-900">
              <span>Ciudadanos Asignados - Cola de Atención de {booths.find(b => b.id === selectedCubiculo)?.name}</span>
              <span className="bg-slate-900 border border-slate-750 text-slate-450 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono">
                {queueCubiculoAssigned.length} En Espera
              </span>
            </h4>

            {queueCubiculoAssigned.length === 0 ? (
              <div className="py-24 text-center space-y-2 text-slate-500 border border-dashed border-slate-850 rounded">
                <UserCheck className="w-9 h-9 text-slate-700 mx-auto" />
                <span className="text-[11.5px] font-bold uppercase tracking-wider block text-slate-300">Cola Vacía</span>
                <p className="text-[10px] max-w-sm mx-auto leading-relaxed text-slate-450">
                  No tiene ciudadanos asignados en su cubículo por el momento. Avise al <strong className="text-slate-350">Supervisor de Extranjería</strong> para que le asigne algún expediente de la cola general.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {queueCubiculoAssigned.map(app => {
                  const name = getExtranjeriaCitizenName(app);
                  const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';

                  return (
                    <div key={`cubiculo-row-${app.id}`} className="bg-slate-900/60 border border-slate-850 p-5 rounded-lg space-y-4 shadow-md text-left">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold font-mono text-amber-500">{app.id}</span>
                            <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-400 font-black px-1.5 py-0.2 rounded font-mono">
                              Tx: {app.codigoTransaccion}
                            </span>
                          </div>
                          <h5 className="text-sm font-black text-slate-100 uppercase leading-snug">{name}</h5>
                          <span className="text-[10px] text-emerald-400 font-bold block">Agendado por: {app.creadoPor || app.datosPersonales?.creadoPor || 'Portal del Ciudadano'}</span>
                          <span className="text-[10px] text-slate-450 font-bold block">Nacionalidad: {app.datosPersonales?.nacionalidad || 'N/D'}  |  Pasaporte: {passport}</span>
                        </div>
                      </div>

                      <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-lg">
                        <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                          Ciudadano asignado a este cubículo para atención presencial. Al terminar la atención, use el botón a continuación para dar por concluido el trámite. El cubículo quedará disponible de inmediato para el siguiente ciudadano.
                        </p>
                      </div>

                      {/* TICKET SYSTEM SIMULATION PANEL BLOCK */}
                      <div className="bg-slate-950 border border-slate-850 p-4 rounded-lg space-y-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <CreditCard className="w-4 h-4 text-indigo-400" />
                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wide">Módulo de Sistema de Tickets Oficial</span>
                          </div>
                          <a 
                            href="https://sistema-de-ticket.vercel.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 text-slate-350 hover:text-white px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition select-none"
                            referrerPolicy="no-referrer"
                          >
                            <span>Abrir Ticket App</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>

                        <p className="text-[10.5px] text-slate-400 leading-relaxed font-semibold">
                          Por normativas, todo trámite migratorio presencial en el Tribunal Electoral requiere emitirse primero con el número oficial de ticket de caja en <strong className="text-slate-200 font-mono">https://sistema-de-ticket.vercel.app/</strong> para la recaudación tributaria.
                        </p>
                      </div>

                      {/* Final closure button */}
                      <div className="pt-2 flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => handleCompleteAppointment(app.id)}
                          className="px-5 py-2.5 rounded-lg text-[10.5px] font-black uppercase tracking-wider shadow flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 cursor-pointer transition"
                          title="Concluir el trámite"
                        >
                          <UserCheck className="w-4 h-4" />
                          <span>Concluir trámite</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* PROFILE 4: PANTALLA DE TURNOS EN VIVO */}
      {/* ======================================================== */}
      {subRole === 'pantalla' && (() => {
        // Find all active booths with people assigned
        const activePeople = appointments.filter(app => {
          const meta = appMetadata[app.id];
          return meta && meta.assignedCubiculo !== null && meta.estadoTicket !== 'realizada';
        });

        // Get the most recently called citizen (or first active serving) for the spotlight
        const featuredApp = activePeople[0];
        const featuredBooth = featuredApp ? booths.find(b => b.id === appMetadata[featuredApp.id]?.assignedCubiculo) : null;

        const formattedDay = liveTime.toLocaleDateString('es-PA', { weekday: 'long' });
        const formattedDate = liveTime.toLocaleDateString('es-PA', {
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });
        const formattedTime = liveTime.toLocaleTimeString('es-PA', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: true
        });

        return (
          <div ref={screenContainerRef} className={`space-y-6 animate-fade-in text-left ${isFullscreen ? 'bg-slate-950 p-8 lg:p-12 min-h-screen w-full overflow-y-auto' : ''}`}>
            {/* Header Area styled with Tribunal logo and Real-time clock */}
            <div className="bg-slate-950 p-5 rounded-2xl border border-slate-800/80 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-5">
              {/* Tribunal Electoral Logo & Title Badge */}
              <div className="flex items-center gap-4 w-full lg:w-auto">
                <div className="relative shrink-0">
                  <div className="absolute -inset-1 bg-amber-500/10 rounded-xl blur" />
                  <img
                    src="https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-30-at-09.45.35.png"
                    alt="Tribunal Electoral Logo"
                    className="w-16 h-16 object-contain rounded-xl bg-white p-1.5 border border-amber-500/30 relative z-10"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      // Silently fall back if blocking happens
                      (e.target as HTMLImageElement).src = "https://images.unsplash.com/photo-1541872703-74c5e44368f9?auto=format&fit=crop&w=120&q=80";
                    }}
                  />
                </div>
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black tracking-widest text-[#d9a74a] uppercase font-mono block">
                    REPÚBLICA DE PANAMÁ ● TRIBUNAL ELECTORAL
                  </span>
                  <h2 className="text-lg font-black text-white uppercase tracking-tight flex items-center gap-2">
                    SISTEMA DE ASIGNACIÓN DE TURNOS
                  </h2>
                  <p className="text-[10.5px] text-slate-400 font-semibold uppercase tracking-wider">
                    DEPARTAMENTO DE EXTRANJERÍA ● MONITOR OFICIAL
                  </p>
                </div>
              </div>
 
              {/* Real-time Clock Info Panel */}
              <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 w-full lg:w-auto">
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-4 py-2 text-center lg:text-right shrink-0 min-w-[200px] shadow-inner font-sans">
                  <div className="text-[13px] font-black text-amber-400 font-mono tracking-widest uppercase">
                    {formattedTime}
                  </div>
                  <div className="text-[9.5px] font-extrabold text-slate-300 uppercase">
                    <span className="text-amber-500/90 font-black">{formattedDay}</span>, {formattedDate}
                  </div>
                </div>
 
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 hover:bg-slate-850 text-slate-350 hover:text-amber-400 p-2.5 rounded-lg transition flex items-center gap-2 cursor-pointer"
                    title={isFullscreen ? "Salir de pantalla completa" : "Poner en pantalla completa para TV"}
                  >
                    {isFullscreen ? <Minimize className="w-4 h-4 text-amber-500" /> : <Maximize className="w-4 h-4 text-amber-500" />}
                    <span className="text-[10px] font-black uppercase tracking-wider hidden sm:inline">
                      {isFullscreen ? "Salir" : "Pantalla Completa 📺"}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={fetchAppointments}
                    disabled={loading}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 p-2.5 rounded-lg transition"
                    title="Actualizar Datos"
                  >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* HIGHLIGHTED HERO SPOTLIGHT HEADER: Pulsing called ticket attention box */}
            {featuredApp && featuredBooth ? (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600/30 to-amber-950/35 border-2 border-amber-500/85 p-5 lg:p-7 shadow-2xl shadow-amber-500/10 animate-pulse">
                <div className="absolute top-0 right-0 p-3 text-[10px] bg-amber-500/20 border-l border-b border-amber-500/40 rounded-bl-xl font-bold font-mono tracking-widest text-amber-300">
                  🔔 ¡LLAMANDO CITACIÓN!
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-center">
                  <div className="md:col-span-5 text-center md:text-left space-y-1.5 border-b md:border-b-0 md:border-r border-amber-500/30 pb-4 md:pb-0 md:pr-4">
                    <span className="inline-block px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider text-amber-300 bg-amber-950 border border-amber-500/35">
                      TRÁMITE DE EXTRANJERÍA
                    </span>
                    <div className="text-[11px] font-black text-slate-300 uppercase tracking-widest font-mono">CIUDADANO CONVOCADO:</div>
                    <div className="text-2xl font-black text-white uppercase tracking-tight truncate">
                      {getExtranjeriaCitizenName(featuredApp)}
                    </div>
                    <span className="text-[10px] text-emerald-400 block font-semibold">
                      Agendado por: {featuredApp.creadoPor || featuredApp.datosPersonales?.creadoPor || 'Portal del Ciudadano'}
                    </span>
                  </div>

                  <div className="md:col-span-4 text-center py-1">
                    <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 block">CÓDIGO DE TURNO</span>
                    <div className="text-4xl lg:text-5xl font-mono font-black tracking-widest text-[#e8b958] drop-shadow-[0_0_12px_rgba(232,185,88,0.45)] mt-1">
                      E-{featuredApp.id.slice(-4).toUpperCase()}
                    </div>
                  </div>

                  <div className="md:col-span-3 text-center md:text-right space-y-1">
                    <span className="text-[10px] font-black tracking-widest text-slate-350 block uppercase">DIRÍJASE AL</span>
                    <div className="text-xl font-black text-white uppercase tracking-tight">
                      {featuredBooth.name}
                    </div>
                    <div className="pt-1.5">
                      <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                        Paso Habilitado
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/60 border border-slate-800 p-5 rounded-2xl text-center space-y-1 py-10">
                <p className="text-xs font-bold text-slate-450 uppercase tracking-wider">TRIBUNAL ELECTORAL ● MÓDULO EXTRANJERÍA</p>
                <h3 className="text-lg font-black text-slate-300">SALA DE ESPERA OPERATIVA</h3>
                <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">No hay turnos activos llamados en este momento. Por favor tome asiento y espere a ser convocado en la pantalla.</p>
              </div>
            )}

            {/* Main Monitor Display Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {booths.filter(b => b.active).map(b => {
                // Find active appointments for this booth (not completed/realizada)
                const assignedApps = appointments.filter(app => {
                  const meta = appMetadata[app.id];
                  return meta && meta.assignedCubiculo === b.id && meta.estadoTicket !== 'realizada';
                });

                // Current serving
                const activeApp = assignedApps[0]; 
                const queueRemaining = assignedApps.slice(1);

                return (
                  <div 
                    key={`tv-booth-${b.id}`} 
                    className={`bg-slate-900 border rounded-2xl p-5 transition-all duration-300 flex flex-col h-[290px] justify-between relative overflow-hidden ${
                      activeApp 
                        ? 'border-amber-500 border-2 shadow-2xl shadow-amber-500/10 bg-gradient-to-b from-slate-900 via-slate-900/95 to-amber-950/20 scale-[1.01]' 
                        : 'border-slate-800 shadow-md shadow-black/40'
                    }`}
                  >
                    {/* Top Header of booth */}
                    <div className="border-b border-slate-850 pb-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-black text-slate-200 uppercase tracking-widest">{b.name}</span>
                        <div className="flex items-center gap-1.5">
                          {activeApp && (
                            <span className="text-[8px] bg-amber-950 text-amber-400 border border-amber-500/30 px-1 py-0.2 rounded font-black tracking-wider uppercase">
                              LLAMANDO
                            </span>
                          )}
                          <span className={`w-2.5 h-2.5 rounded-full ${activeApp ? 'bg-amber-400 animate-ping' : 'bg-emerald-500'}`} />
                        </div>
                      </div>
                    </div>

                    {/* Mid Content - Big Ticket Code, Procedure and Name */}
                    <div className="py-4 my-auto text-center space-y-2 flex flex-col justify-center items-center">
                      {activeApp ? (
                        <div className="animate-fade-in space-y-1.5 w-full">
                          <div className="text-[9px] font-black uppercase text-amber-400 tracking-widest bg-amber-950/70 border border-amber-500/30 py-0.5 px-2.5 rounded mx-auto w-fit">
                            TRÁMITE DE EXTRANJERÍA 🛡️
                          </div>
                          
                          <div className="text-3xl font-mono font-black tracking-widest text-[#e8b958] drop-shadow-[0_0_8px_rgba(232,185,88,0.3)] mt-1">
                            E-{activeApp.id.slice(-4).toUpperCase()}
                          </div>
                          
                          <div className="text-[13px] font-extrabold text-white uppercase truncate px-1 max-w-full">
                            {getExtranjeriaCitizenName(activeApp)}
                          </div>
                          <span className="text-[9.5px] text-emerald-400 block font-semibold truncate px-1 mt-0.5">
                            Agendado por: {activeApp.creadoPor || activeApp.datosPersonales?.creadoPor || 'Portal del Ciudadano'}
                          </span>

                        </div>
                      ) : (
                        <div className="space-y-1">
                          <span className="text-[8.5px] font-black uppercase text-emerald-400 tracking-wider block bg-emerald-950/45 border border-emerald-500/20 py-0.5 px-2 rounded-sm mx-auto w-fit">
                            CUBÍCULO DISPONIBLE
                          </span>
                          <div className="text-3xl font-mono font-black text-slate-700 tracking-widest select-none">
                            ----
                          </div>
                          <p className="text-[10px] text-slate-500 font-bold uppercase mt-1 leading-none">Esperando Ciudadano</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Footer - Queue counts */}
                    <div className="border-t border-slate-850 pt-3 flex items-center justify-between text-[10px]">
                      <span className="text-slate-450 font-bold uppercase">Siguiente turno:</span>
                      {queueRemaining.length > 0 ? (
                        <span className="font-mono bg-slate-950 text-slate-200 border border-slate-800 px-2 py-0.5 rounded font-black text-[9px]">
                          E-{queueRemaining[0].id.slice(-4).toUpperCase()} (+{queueRemaining.length - 1})
                        </span>
                      ) : (
                        <span className="text-slate-550 font-mono italic">Sin cola asignada</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Section: Sala de Espera y Queue de Supervisor */}
            <div className="pt-2">
              {/* Cola general del día esperando verificación */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 bg-indigo-500 rounded-full" />
                    <span className="text-xs font-black uppercase tracking-wider text-slate-200">Próximos Despachos del Supervisor (En Espera)</span>
                  </div>
                  <span className="font-mono text-[10px] font-bold bg-slate-950 px-2 rounded border border-slate-850 text-slate-400">
                    {queueSupervisorPending.length} Ciudadano(s) Listo(s)
                  </span>
                </div>

                {queueSupervisorPending.length === 0 ? (
                  <div className="p-10 text-center text-slate-505 text-xs font-bold italic text-slate-500">
                    No hay ciudadanos listos en cola esperando despacho de cubículo.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 max-h-[220px] overflow-y-auto pr-1">
                    {queueSupervisorPending.map(app => (
                      <div key={`tv-queue-${app.id}`} className="bg-slate-950/80 p-3.5 rounded-lg border border-slate-850 flex items-center justify-between gap-3">
                        <div className="text-left space-y-0.5 truncate">
                          <span className="text-xs font-bold text-slate-200 uppercase truncate block font-semibold text-slate-100">
                            {getExtranjeriaCitizenName(app)}
                          </span>
                          <span className="text-[9.5px] text-emerald-400 block font-semibold truncate leading-none">
                            Agendado por: {app.creadoPor || app.datosPersonales?.creadoPor || 'Portal del Ciudadano'}
                          </span>
                          <span className="text-[9.5px] font-mono text-indigo-400 font-bold block">
                            E-{app.id.slice(-4).toUpperCase()} (Extranjería)
                          </span>
                        </div>
                        <span className="text-[8.5px] bg-indigo-950/40 border border-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded font-black uppercase tracking-wider font-mono">
                          ESPERA
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* SECCIÓN IMPRIMIBLE OCULTA (OPTIMIZADA PARA PDF DE CITAS) */}
      {/* ======================================================== */}
      <div id="print-area-extranjeria" className="hidden text-black bg-white p-12 max-w-4xl mx-auto border-4 border-double border-black font-sans">
        <div className="text-center space-y-1 border-b-2 border-black pb-4">
          <h1 className="text-lg font-black tracking-widest uppercase m-0 leading-tight">REPÚBLICA DE PANAMÁ</h1>
          <h2 className="text-sm font-extrabold m-0 uppercase tracking-widest">TRIBUNAL ELECTORAL</h2>
          <h3 className="text-xs font-bold text-slate-700 m-0 uppercase tracking-wide">DIRECCIÓN NACIONAL DE CEDULACIÓN / REGISTRO CIVIL</h3>
          <p className="text-[10px] font-mono m-0 text-slate-600 mt-1">SISTEMA INTEGRAL DE RESERVA DE CITAS PRESENCIALES - EXTRANJERÍA</p>
        </div>

        <div className="grid grid-cols-2 gap-4 my-6 text-[11px] leading-relaxed">
          <div className="text-left">
            <p className="m-0 font-bold uppercase"><strong className="text-slate-600">DEPARTAMENTO:</strong> Unidad de Extranjería / Trámites de Naturalización</p>
            <p className="m-0 font-bold uppercase"><strong className="text-slate-600">DIRECCIÓN SEDE:</strong> Sede Principal de Ancón, Ciudad de Panamá</p>
            <p className="m-0 font-bold uppercase"><strong className="text-slate-600">REPORTE GENERADO POR:</strong> {currentRole.toUpperCase()} (MÓDULO INTERNO)</p>
          </div>
          <div className="text-right">
            <p className="m-0 font-bold uppercase"><strong className="text-slate-600">FECHA DE EMISIÓN:</strong> {new Date().toLocaleString()}</p>
            <p className="m-0 font-bold uppercase"><strong className="text-slate-600">TOTAL DE CITAS EN BASE Extranjería:</strong> {appointments.length} Cita(s)</p>
          </div>
        </div>

        <h4 className="text-center text-sm font-black uppercase tracking-wider mb-4 border-2 border-slate-300 py-1.5 bg-slate-100">
          LISTADO OFICIAL DE CITACIONES REGISTRADAS - EXTRANJERÍA
        </h4>

        {filteredGeneralAppointments.length === 0 ? (
          <div className="text-center py-8 font-extrabold italic text-slate-500 text-xs">
            No se encontraron citas programadas en los parámetros seleccionados.
          </div>
        ) : (
          <table className="w-full border-collapse border border-black text-[10px] mb-8">
            <thead>
              <tr className="bg-slate-200 border-b border-black text-left font-black uppercase text-slate-800">
                <th className="border border-black p-2 w-1/4">CÓDIGO DE CITA</th>
                <th className="border border-black p-2 w-1/5">FECHA Y HORA</th>
                <th className="border border-black p-2">CIUDADANO</th>
                <th className="border border-black p-2 w-1/6 text-center">PASAPORTE</th>
                <th className="border border-black p-2 w-1/6 text-center">ESTADO</th>
              </tr>
            </thead>
            <tbody>
              {filteredGeneralAppointments.map((app: any) => (
                <tr key={app.id} className="border-b border-black">
                  <td className="border border-black p-2 font-mono font-bold">{app.id}</td>
                  <td className="border border-black p-2 uppercase">{app.fecha} - {app.hora}</td>
                  <td className="border border-black p-2 font-bold uppercase">{app.datosPersonales?.nombreCompleto || app.nombre}</td>
                  <td className="border border-black p-2 text-center font-mono font-bold uppercase">{app.datosPersonales?.pasaporte || app.identificacion}</td>
                  <td className="border border-black p-2 text-center font-bold uppercase">{app.estado === 'asistire' || app.estado === 'confirmada' ? 'CONFIRMADA' : app.estado.toUpperCase()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="mt-16 text-[10.5px]">
          <div className="grid grid-cols-2 gap-12 text-center text-slate-600 pt-8 font-sans">
            <div className="space-y-1">
              <div className="border-t border-black w-2/3 mx-auto pt-1"></div>
              <p className="m-0 uppercase font-bold text-[9px] text-black">FIRMA DE AUTORIDAD DE CEDULACIÓN</p>
              <p className="m-0 text-[8px] tracking-wide uppercase">Tribunal Electoral de Panamá</p>
            </div>
            <div className="space-y-1">
              <div className="border-t border-black w-2/3 mx-auto pt-1"></div>
              <p className="m-0 uppercase font-bold text-[9px] text-black">JEFE DE SERVICIO DE MIGRACIÓN/REGISTRO</p>
              <p className="m-0 text-[8px] tracking-wide uppercase font-mono">ID Firma Electrónica: #TE-591244</p>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIRMATION DIALOG MODAL */}
      {showConfirmSave && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in font-sans">
          <div className="bg-slate-900 border border-amber-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 border-b border-amber-550/20 pb-3 text-amber-500">
              <AlertCircle className="w-6 h-6 shrink-0 text-amber-500" />
              <h4 className="text-sm font-black uppercase tracking-wider text-slate-100 font-sans">Confirmar Cambios de Programación</h4>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed font-semibold">
              ¿Está seguro de que desea aplicar estos cambios a la planificación de citas de Extranjería? 
              Los nuevos cupos, de atención y horarios regirán de manera inmediata para todos los ciudadanos.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmSave(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 border border-slate-700 rounded text-xs font-black uppercase cursor-pointer transition font-sans"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={executeSaveConfig}
                className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-black uppercase shadow-md cursor-pointer transition flex items-center gap-1 font-sans"
              >
                Sí, Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
