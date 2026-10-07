import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react';
import { 
  Search, 
  CheckCircle, 
  CheckCircle2,
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
  VolumeX,
  Tv,
  Globe,
  Maximize,
  Minimize,
  Info,
  Plus,
  UserPlus,
  Trash2,
  Upload,
  Zap,
  CheckCheck,
  Settings,
  Star,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AdminRole } from '../types';
import { SUCURSALES_TE } from '../data';
import { resolveCitizenName, isGenericPlaceholderName, extractNameFromEmail } from '../utils/citizenNameResolver';

const SELECT_TIMES_OPTIONS = [
  '12:00 AM', '12:30 AM', '01:00 AM', '01:30 AM', '02:00 AM', '02:30 AM', '03:00 AM', '03:30 AM',
  '04:00 AM', '04:30 AM', '05:00 AM', '05:30 AM', '06:00 AM', '06:30 AM', '07:00 AM', '07:30 AM',
  '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM', '10:30 AM', '11:00 AM', '11:30 AM',
  '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM',
  '04:00 PM', '04:30 PM', '05:00 PM', '05:30 PM', '06:00 PM', '06:30 PM', '07:00 PM', '07:30 PM',
  '08:00 PM', '08:30 PM', '09:00 PM', '09:30 PM', '10:00 PM', '10:30 PM', '11:00 PM', '11:30 PM'
];

const EXTRANJERIA_SLOTS_OPTIONS = [
  '07:00 AM', '07:15 AM', '07:30 AM', '07:45 AM',
  '08:00 AM', '08:15 AM', '08:30 AM', '08:45 AM',
  '09:00 AM', '09:15 AM', '09:30 AM', '09:45 AM',
  '10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM',
  '11:00 AM', '11:15 AM', '11:30 AM', '11:45 AM',
  '12:00 PM', '12:15 PM', '12:30 PM', '12:45 PM',
  '01:00 PM', '01:15 PM', '01:30 PM', '01:45 PM',
  '02:00 PM', '02:15 PM', '02:30 PM', '02:45 PM',
  '03:00 PM', '03:15 PM', '03:30 PM', '03:45 PM',
  '04:00 PM'
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
  initialSupervisorTab?: 'flujo' | 'calendario' | 'carga_expedientes' | 'configuracion' | 'reportes';
}

// Extranjeria specific sub-profiles within Extranjeria view
type ExtranjeriaSubRole = 'supervisor' | 'atencion' | 'cubiculo' | 'pantalla';

interface Booth {
  id: number;
  name: string;
  active: boolean; // Enables cubicle attention
  staff: string;
  empty: boolean; // True for the 4 reserve booths initially empty
  receso?: boolean; // Is the operator currently on recess/break?
  disabledBy?: string; // Supervisor who disabled the booth
  disabledAt?: string; // Timestamp when disabled
}

interface AppointmentMetadata {
  hasDocuments: boolean;
  checkedDocs: string[];
  passedToSupervisor: boolean;
  assignedCubiculo: number | null; // Booth ID from 1 to 8
  estadoTicket: 'ninguno' | 'en_proceso' | 'en_atencion' | 'pagado_en_caja' | 'realizada';
  timestampCompletado?: string;
  fechaCompletado?: string; // YYYY-MM-DD
  timestampInicioAtencion?: string;
  staffResponsable?: string;
  reatencion?: boolean;
  timestampReatencion?: string;
}

// Helper to determine if an appointment was attended/completed strictly TODAY (never yesterday or previous days)
export const isCompletedToday = (app: any, meta?: AppointmentMetadata | null, currentTodayStr?: string): boolean => {
  if (!meta || meta.estadoTicket !== 'realizada') return false;

  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const todayYmd = currentTodayStr || `${y}-${m}-${d}`;
  
  // 1. Direct match on fechaCompletado if present
  if (meta.fechaCompletado) {
    return meta.fechaCompletado === todayYmd;
  }

  // 2. Formats for today
  const dayNum = now.getDate();
  const monthNum = now.getMonth() + 1;
  const todayDmyPadded = `${d}/${m}/${y}`;
  const todayDmyUnpadded = `${dayNum}/${monthNum}/${y}`;

  if (meta.timestampCompletado && typeof meta.timestampCompletado === 'string') {
    const ts = meta.timestampCompletado.trim();
    // If timestamp explicitly contains today's date
    if (ts.includes(todayYmd) || ts.includes(todayDmyPadded) || ts.includes(todayDmyUnpadded)) {
      return true;
    }
    
    // Check if timestamp contains ANY date format that does NOT match today (e.g. yesterday)
    const ymdMatch = ts.match(/\b\d{4}-\d{2}-\d{2}\b/);
    if (ymdMatch && ymdMatch[0] !== todayYmd) {
      return false;
    }
    const dmyMatch = ts.match(/\b\d{1,2}\/\d{1,2}\/\d{4}\b/);
    if (dmyMatch && dmyMatch[0] !== todayDmyPadded && dmyMatch[0] !== todayDmyUnpadded) {
      return false;
    }
  }

  // 3. If timestampCompletado didn't specify a date, check if the appointment was scheduled for today
  if (app && app.fecha) {
    const stdDate = standardizeDateString(app.fecha);
    return stdDate === todayYmd;
  }

  return false;
};

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

function generateExtranjeriaSlots(inicio: string, fin: string, intervaloMinutos: number): string[] {
  const timeToMin = (t: string) => {
    const m = t.match(/(\d+):(\d+)\s*(AM|PM)?/i);
    if (!m) return 0;
    let h = parseInt(m[1], 10);
    const min = parseInt(m[2], 10);
    const ap = m[3] ? m[3].toUpperCase() : '';
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return h * 60 + min;
  };
  const formatMin = (m: number) => {
    let h = Math.floor(m / 60) % 24;
    const min = m % 60;
    const ap = h >= 12 ? 'PM' : 'AM';
    if (h === 0) h = 12;
    else if (h > 12) h -= 12;
    return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')} ${ap}`;
  };
  const startMin = timeToMin(inicio);
  let endMin = timeToMin(fin);
  if (endMin <= startMin) endMin += 1440;
  const slots: string[] = [];
  for (let cur = startMin; cur <= endMin; cur += intervaloMinutos) {
    slots.push(formatMin(cur));
  }
  return slots;
}

const standardizeDateString = (rawDate: string): string => {
  if (!rawDate) return '';
  let clean = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(clean)) return clean.replace(/\//g, '-');
  
  const parts = clean.split(/[/\-.]/);
  if (parts.length === 3) {
    let p0 = parts[0].trim();
    let p1 = parts[1].trim();
    let p2 = parts[2].trim();
    
    // Normalize 2-digit year (e.g. '26' -> '2026')
    if (p2.length === 2 && /^\d{2}$/.test(p2)) {
      p2 = `20${p2}`;
    }
    if (p0.length === 2 && /^\d{2}$/.test(p0) && parseInt(p0, 10) > 31) {
      p0 = `20${p0}`;
    }

    if (p2.length === 4 && /^\d{4}$/.test(p2)) {
      const year = p2;
      const val0 = parseInt(p0, 10);
      const val1 = parseInt(p1, 10);
      if (val1 > 12) {
        // e.g. 09/14/2026 -> month 09, day 14
        return `${year}-${p0.padStart(2, '0')}-${p1.padStart(2, '0')}`;
      } else if (val0 > 12) {
        // e.g. 14/09/2026 -> day 14, month 09
        return `${year}-${p1.padStart(2, '0')}-${p0.padStart(2, '0')}`;
      }
      // Both <= 12: MM/DD/YYYY standard as imported from CSVs (e.g. 09/11/26 -> 2026-09-11)
      return `${year}-${p0.padStart(2, '0')}-${p1.padStart(2, '0')}`;
    }
    if (p0.length === 4 && /^\d{4}$/.test(p0)) {
      return `${p0}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
    }
  }
  return clean;
};

const isExtranjeriaAppointment = (app: any) => {
  if (!app) return false;
  const cat = (app.servicioCategoria || '').toLowerCase();
  const catName = (app.categoriaNombre || '').toLowerCase();
  const sub = (app.subServicioNombre || '').toLowerCase();
  const subId = (app.subServicioId || '').toLowerCase();
  const idStr = String(app.id || '').toUpperCase();
  const txStr = String(app.codigoTransaccion || '').toUpperCase();
  const createdBy = String(app.creadoPor || '').toLowerCase();
  const sucId = (app.sucursalId || '').toLowerCase();
  const sucName = (app.sucursalNombre || '').toLowerCase();

  return (
    cat === 'extranjeria' ||
    catName.includes('extranj') ||
    sub.includes('extranj') ||
    subId.includes('extranj') ||
    idStr.startsWith('EXT') ||
    txStr.startsWith('EXT') ||
    createdBy.includes('extranj') ||
    createdBy.includes('csv') ||
    createdBy.includes('importaci') ||
    sucId.includes('anc_main') ||
    sucName.includes('extranj') ||
    sucName.includes('ancon') ||
    sucName.includes('ancón')
  );
};

// Isolated real-time clock for Pantalla de Turnos to avoid triggering re-renders of the entire application
const TurnScreenClock = React.memo(function TurnScreenClock() {
  const [time, setTime] = useState<Date>(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDay = time.toLocaleDateString('es-PA', { weekday: 'long' });
  const formattedDate = time.toLocaleDateString('es-PA', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
  const formattedTime = time.toLocaleTimeString('es-PA', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  });

  return (
    <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl px-5 py-3 text-center lg:text-right shrink-0 min-w-[220px] shadow-lg font-sans">
      <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-widest uppercase leading-none mb-1">
        {formattedTime}
      </div>
      <div className="text-xs sm:text-sm font-black text-slate-200 uppercase">
        <span className="text-amber-500 font-black">{formattedDay}</span>, {formattedDate}
      </div>
    </div>
  );
});

export default function ExtranjeriaController({ currentRole, forceSubRole, initialSupervisorTab }: ExtranjeriaControllerProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [hasAutoJumped, setHasAutoJumped] = useState(false);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [supervisorSearchQuery, setSupervisorSearchQuery] = useState('');
  const [supervisorAtencionSearchQuery, setSupervisorAtencionSearchQuery] = useState('');
  const [atencionSearchQuery, setAtencionSearchQuery] = useState('');

  // Local input values to type at 60fps without lag before hitting Enter or clicking Search
  const [localSupervisorSearchQuery, setLocalSupervisorSearchQuery] = useState('');
  const [localSupervisorAtencionSearchQuery, setLocalSupervisorAtencionSearchQuery] = useState('');
  const [localAtencionSearchQuery, setLocalAtencionSearchQuery] = useState('');

  // Deferred values guarantee 60fps instant keystrokes in search inputs without blocking rendering
  const deferredSearchQuery = useDeferredValue(searchQuery);
  const deferredSupervisorSearchQuery = useDeferredValue(supervisorSearchQuery);
  const deferredSupervisorAtencionSearchQuery = useDeferredValue(supervisorAtencionSearchQuery);
  const deferredAtencionSearchQuery = useDeferredValue(atencionSearchQuery);

  const [atencionDateFilter, setAtencionDateFilter] = useState('');
  const [atencionShowAllDates, setAtencionShowAllDates] = useState(false);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);

  // States for the brand new Direct Manual Assignment feature for Supervisors
  const [manualCitizenName, setManualCitizenName] = useState('');
  const [manualCitizenDoc, setManualCitizenDoc] = useState('');
  const [manualTramiteType, setManualTramiteType] = useState('ext_primera_vez');
  const [manualSelectedBooth, setManualSelectedBooth] = useState('');

  // Extranjeria Foreign Records database cache for resolving citizen names
  const [extranjeriaRecords, setExtranjeriaRecords] = useState<any[]>([]);

  // Return the complete formatted citizen name, prioritizing human names, extranjería records, and email fallback
  const getExtranjeriaCitizenName = useCallback((app: any): string => {
    if (!app) return 'Ciudadano';
    return resolveCitizenName(app, extranjeriaRecords);
  }, [extranjeriaRecords]);

  // Cached searchable string per appointment for lightning-fast filter loops
  const appointmentSearchCache = useMemo(() => new WeakMap<object, string>(), []);
  const getSearchText = useCallback((app: any): string => {
    if (!app || typeof app !== 'object') return '';
    let cached = appointmentSearchCache.get(app);
    if (cached === undefined) {
      const name = getExtranjeriaCitizenName(app);
      const dp = app.datosPersonales || {};
      const passport = String(dp.pasaporte || app.identificacion || '');
      const id = String(app.id || '');
      const tx = String(app.codigoTransaccion || '');
      const email = String(app.correo || dp.correo || '');
      const sub = String(app.subServicioNombre || '');
      const creator = String(app.creadoPor || dp.creadoPor || '');
      cached = `${name} ${passport} ${id} ${tx} ${email} ${sub} ${creator}`.toLowerCase();
      appointmentSearchCache.set(app, cached);
    }
    return cached;
  }, [appointmentSearchCache]);

  // Helper to dynamically resolve the operator name of any booth (shows logged-in agent's name when occupied)
  const getBoothStaffName = (b: Booth | undefined): string => {
    if (!b) return 'Sin Asignar';
    const occupant = appMetadata[`booth_occupant_${b.id}`];
    if (occupant) {
      return occupant.staffName || occupant.staffResponsable || b.staff;
    }
    return b.staff;
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

  // Helper to dynamically get local today in YYYY-MM-DD
  const getLocalTodayDateString = (): string => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [todayStr, setTodayStr] = useState<string>(getLocalTodayDateString);
  const isStrictTodayOnly = React.useMemo(() => {
    if (atencionShowAllDates) return false;
    return true; // Enforce today-only mode strictly for ALL roles by default to prevent heavy loading and RAM consumption
  }, [atencionShowAllDates]);

  // Ensure Atención Entrada starts with a valid focused date (today if has appointments, or default today)
  React.useEffect(() => {
    if (!atencionDateFilter) {
      setAtencionDateFilter(todayStr);
    }
  }, [atencionDateFilter, todayStr]);

  // Safe utility to parse any date string format robustly
  const parseSafeDate = (dateStr: string): Date | null => {
    if (!dateStr) return null;
    let clean = dateStr.trim();
    
    // Try YYYY-MM-DD
    let match = clean.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const d = parseInt(match[3], 10);
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) return date;
    }
    
    // Try DD/MM/YYYY
    match = clean.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (match) {
      const d = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const y = parseInt(match[3], 10);
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) return date;
    }
    
    // Try YYYY/MM/DD
    match = clean.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
    if (match) {
      const y = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      const d = parseInt(match[3], 10);
      const date = new Date(y, m - 1, d);
      if (!isNaN(date.getTime())) return date;
    }
    
    // Fallback to standard Date parsing
    const fallback = new Date(clean);
    if (!isNaN(fallback.getTime())) return fallback;
    
    return null;
  };

  const formatFriendlyDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const date = parseSafeDate(dateStr);
    if (date) {
      // Formato amigable en español de Panamá: "vie, 11 de sep"
      return date.toLocaleDateString('es-PA', { weekday: 'short', day: 'numeric', month: 'short' });
    }
    return dateStr;
  };

  // Auto-jump calendar date to September 2026 (or first available month with appointments) on load if current month is empty
  React.useEffect(() => {
    if (hasAutoJumped) return;
    if (appointments && appointments.length > 0) {
      let currentVal = calendarDate;
      // Self-heal if the current calendarDate is invalid
      if (!currentVal || isNaN(currentVal.getTime())) {
        currentVal = new Date();
        setCalendarDate(currentVal);
      }
      
      const currentYear = currentVal.getFullYear();
      const currentMonth = currentVal.getMonth();
      
      const hasCitasInCurrentMonth = appointments.some((app: any) => {
        if (!app.fecha) return false;
        const appDate = parseSafeDate(app.fecha);
        if (!appDate) return false;
        return appDate.getFullYear() === currentYear && appDate.getMonth() === currentMonth;
      });

      if (!hasCitasInCurrentMonth) {
        // Find the earliest appointment with a valid date
        const validApps = appointments
          .map((app: any) => ({ app, date: parseSafeDate(app.fecha) }))
          .filter((item: any) => item.date !== null)
          .sort((a: any, b: any) => (a.date as Date).getTime() - (b.date as Date).getTime());
          
        if (validApps.length > 0) {
          const firstItem = validApps[0];
          const targetDate = new Date((firstItem.date as Date).getFullYear(), (firstItem.date as Date).getMonth(), 1);
          if (!isNaN(targetDate.getTime())) {
            setCalendarDate(targetDate);
            setSelectedCalendarDateStr(firstItem.app.fecha);
            setHasAutoJumped(true);
          }
        }
      } else {
        setHasAutoJumped(true);
      }
    }
  }, [appointments, hasAutoJumped]);

  // Auto-select active appointment date if there are no appointments for today, ensuring Atención Entrada always has a focused day
  React.useEffect(() => {
    if (appointments && appointments.length > 0) {
      const hasToday = appointments.some((app: any) => isExtranjeriaAppointment(app) && app.fecha === todayStr);
      if (!hasToday && !atencionDateFilter) {
        const firstValid = appointments.find((app: any) => isExtranjeriaAppointment(app) && app.fecha)?.fecha;
        if (firstValid) {
          setAtencionDateFilter(firstValid);
        }
      }
    }
  }, [appointments, todayStr, atencionDateFilter]);

  // Selected Cubicle in the "Cubículo" view
  const [selectedCubiculo, setSelectedCubiculo] = useState<number>(() => {
    return parseInt(localStorage.getItem('extranjeria_selected_cubiculo') || '1', 10);
  });

  // Track if the agent has chosen their working cubicle for this login session
  const [hasSelectedCubiculo, setHasSelectedCubiculo] = useState<boolean>(() => {
    return sessionStorage.getItem('extranjeria_cubiculo_chosen_session') === 'true';
  });

  const selectCubiculoAndUnlock = async (bId: number) => {
    const currentAgentUser = sessionStorage.getItem('admin_username') || 'agente_cubiculo';
    const currentAgentName = sessionStorage.getItem('admin_nombre') || currentAgentUser;
    
    // Check if another agent already occupies this booth
    const occupier = appMetadata[`booth_occupant_${bId}`]?.staffResponsable;
    if (occupier && occupier !== currentAgentUser) {
      alert(`El Cubículo ${bId} ya está ocupado por @${occupier}. Por favor elija otro.`);
      return;
    }
    
    const updatedMeta = { ...appMetadata };
    
    // Clear any previous booth occupied by the SAME agent
    for (let i = 1; i <= 8; i++) {
      const occKey = `booth_occupant_${i}`;
      if (updatedMeta[occKey]?.staffResponsable === currentAgentUser) {
        delete updatedMeta[occKey];
      }
    }
    
    // Set new booth occupancy
    updatedMeta[`booth_occupant_${bId}`] = {
      hasDocuments: false,
      checkedDocs: [],
      passedToSupervisor: false,
      assignedCubiculo: bId,
      estadoTicket: 'ninguno',
      staffResponsable: currentAgentUser,
      staffName: currentAgentName
    };
    
    setSelectedCubiculo(bId);
    localStorage.setItem('extranjeria_selected_cubiculo', String(bId));
    sessionStorage.setItem('extranjeria_cubiculo_chosen_session', 'true');
    setHasSelectedCubiculo(true);
    
    await persistMetadata(updatedMeta);
  };

  const handleReleaseCubiculo = async () => {
    const currentAgentUser = sessionStorage.getItem('admin_username') || 'agente_cubiculo';
    const updatedMeta = { ...appMetadata };
    
    // Clear occupancy for this agent
    for (let i = 1; i <= 8; i++) {
      const occKey = `booth_occupant_${i}`;
      if (updatedMeta[occKey]?.staffResponsable === currentAgentUser) {
        delete updatedMeta[occKey];
      }
    }
    
    setHasSelectedCubiculo(false);
    sessionStorage.removeItem('extranjeria_cubiculo_chosen_session');
    await persistMetadata(updatedMeta);
  };

  // Selected appointment for details check-in
  const [selectedAppForCheck, setSelectedAppForCheck] = useState<any | null>(null);

  // Document checklist in the "Atención" verification
  const [tempCheckedDocs, setTempCheckedDocs] = useState<string[]>([]);

  // Selected appointment for supervisor validation
  const [selectedAppForSupervisor, setSelectedAppForSupervisor] = useState<any | null>(null);
  const [supervisorCheckedDocs, setSupervisorCheckedDocs] = useState<string[]>([]);
  
  // Supervisor custom period visibility filter
  const [supervisorPeriodFilter, setSupervisorPeriodFilter] = useState<'dia' | 'semana' | 'mes' | 'año' | 'todos'>('todos');
  const [reatencionSearchQuery, setReatencionSearchQuery] = useState('');
  const [showDiagnosticPanel, setShowDiagnosticPanel] = useState(false);

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
  const [reportOperatorFilter, setReportOperatorFilter] = useState<string>('all');
  const [reportStatusFilter, setReportStatusFilter] = useState<'all' | 'completadas' | 'pendientes' | 'canceladas'>('all');

  // Supervisor tabs / sub-views (control of queues vs. calendar & creation/deletion panel vs. configuracion)
  const [supervisorTab, setSupervisorTab] = useState<'flujo' | 'calendario' | 'carga_expedientes' | 'configuracion' | 'reportes' | 'cola_cubiculos'>(initialSupervisorTab || 'flujo');

  useEffect(() => {
    if (initialSupervisorTab) {
      setSupervisorTab(initialSupervisorTab);
    }
  }, [initialSupervisorTab]);

  // Load real system users on mount
  useEffect(() => {
    const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token');
    const headers: Record<string, string> = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    fetch('/api/users', { headers })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.users)) {
          setSystemUsers(data.users);
        }
      })
      .catch(err => console.error("Error loading system users in ExtranjeriaController:", err));
  }, []);
  
  // Extranjeria Importer States
  const [loadingExtranjeria, setLoadingExtranjeria] = useState(false);
  const [extranjeriaSearchQuery, setExtranjeriaSearchQuery] = useState('');
  const [parsedExtranjeriaRows, setParsedExtranjeriaRows] = useState<any[]>([]);
  const [extranjeriaDragActive, setExtranjeriaDragActive] = useState(false);
  const [extranjeriaImportStatus, setExtranjeriaImportStatus] = useState<{ success: boolean; message: string } | null>(null);
  const [isProcessingExtranjeria, setIsProcessingExtranjeria] = useState(false);

  const fetchExtranjeriaRecords = async () => {
    setLoadingExtranjeria(true);
    try {
      const res = await fetch('/api/extranjeria/list');
      const data = await res.json();
      if (data.success && Array.isArray(data.records)) {
        const filtered = data.records.filter((rec: any) => {
          if (!rec || !rec.pasaporte) return false;
          const pass = rec.pasaporte.toUpperCase();
          if (pass.startsWith("PA123456") || pass.startsWith("PA987654") || pass.startsWith("PA555444") || pass.startsWith("PA000111")) return false;
          return true;
        });
        setExtranjeriaRecords(filtered);
      }
    } catch (err) {
      console.error("Error fetching extranjería records:", err);
    } finally {
      setLoadingExtranjeria(false);
    }
  };

  useEffect(() => {
    fetchExtranjeriaRecords();
  }, [supervisorTab]);

  const handleExtranjeriaFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;

      try {
        const rows: string[][] = [];
        let row: string[] = [""];
        let inQuotes = false;

        for (let i = 0; i < text.length; i++) {
          const char = text[i];
          const nextChar = text[i + 1];

          if (char === '"') {
            if (inQuotes && nextChar === '"') {
              row[row.length - 1] += '"';
              i++;
            } else {
              inQuotes = !inQuotes;
            }
          } else if (char === ',' || char === ';') {
            if (inQuotes) {
              row[row.length - 1] += char;
            } else {
              row.push("");
            }
          } else if (char === '\r' || char === '\n') {
            if (inQuotes) {
              row[row.length - 1] += char;
            } else {
              if (char === '\r' && nextChar === '\n') {
                i++;
              }
              rows.push(row);
              row = [""];
            }
          } else {
            row[row.length - 1] += char;
          }
        }
        if (row.length > 1 || row[0] !== "") {
          rows.push(row);
        }

        if (rows.length < 2) {
          setExtranjeriaImportStatus({
            success: false,
            message: "El archivo CSV parece estar vacío o no tener filas de datos."
          });
          return;
        }

        const headers = rows[0].map(h => h.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
        
        const sequenceIdx = headers.findIndex(h => 
          h === "n" || 
          h === "no" || 
          h === "n." ||
          h === "#" ||
          h.startsWith("n°") || 
          h.startsWith("nº") || 
          h.startsWith("no.") ||
          h.includes("secuencia") ||
          h.includes("orden") ||
          (h.includes("numero") && !h.includes("resolucion") && !h.includes("pasaporte"))
        );

        const dateIdx = headers.findIndex(h => 
          (h.includes("fecha") && !h.includes("resolucion")) || 
          h.includes("date") || 
          h.includes("dia")
        );

        const timeIdx = headers.findIndex(h => 
          h.includes("hora") || 
          h.includes("time") || 
          h.includes("horario")
        );

        const nameIdx = headers.findIndex(h => 
          h.includes("nombre") || 
          h.includes("name") || 
          h.includes("ciudadano") || 
          h.includes("completo")
        );

        const resolutionIdx = headers.findIndex(h => 
          h.includes("resolucion") || 
          h.includes("resolution") || 
          h.includes("res.") ||
          h.includes("resol")
        );

        const nationalityIdx = headers.findIndex(h => 
          h.includes("nacionalidad") || 
          h.includes("pais") || 
          h.includes("country") || 
          h.includes("nationality")
        );

        const passportIdx = headers.findIndex(h => 
          h.includes("pasaporte") || 
          h.includes("passport") || 
          h.includes("cedula") || 
          (h.includes("doc") && !h.includes("nombre")) ||
          (h.includes("id") && !h.includes("valido") && !h.includes("nacionalidad"))
        );

        const eligibleIdx = headers.findIndex(h => 
          h.includes("elegible") || 
          h.includes("eligible") || 
          h.includes("aprobado") || 
          h.includes("habilitado")
        );

        const reasonIdx = headers.findIndex(h => 
          h.includes("motivo") || 
          h.includes("razon") || 
          h.includes("reason") || 
          h.includes("comentario")
        );

        if (nameIdx === -1 && passportIdx === -1 && sequenceIdx === -1) {
          setExtranjeriaImportStatus({
            success: false,
            message: "Encabezados inválidos. Asegúrese de que el CSV contenga al menos la columna 'Nombre' y 'N°' o 'Pasaporte'."
          });
          return;
        }

        const dataRows = rows.slice(1).filter(r => r.length > 1 && (
          (nameIdx !== -1 && r[nameIdx]?.trim()) ||
          (passportIdx !== -1 && r[passportIdx]?.trim()) ||
          (sequenceIdx !== -1 && r[sequenceIdx]?.trim())
        ));

        const parsedData = dataRows.map((r, rIdx) => {
          const rawName = nameIdx !== -1 ? (r[nameIdx]?.trim() || "") : "";
          const rawSeq = sequenceIdx !== -1 ? (r[sequenceIdx]?.trim() || "") : "";
          const rawDate = dateIdx !== -1 ? (r[dateIdx]?.trim() || "") : "";
          const rawTime = timeIdx !== -1 ? (r[timeIdx]?.trim() || "") : "";
          const rawResolution = resolutionIdx !== -1 ? (r[resolutionIdx]?.trim() || "") : "";
          const rawNationality = nationalityIdx !== -1 ? (r[nationalityIdx]?.trim() || "No especificada") : "No especificada";
          const rawEligible = eligibleIdx !== -1 ? (r[eligibleIdx]?.trim().toLowerCase() || "si") : "si";
          const rawReason = reasonIdx !== -1 ? (r[reasonIdx]?.trim() || "") : "";

          const isEligible = rawEligible === "true" || rawEligible === "si" || rawEligible === "sí" || rawEligible === "1" || rawEligible === "yes" || rawEligible === "eligible";

          // Parse daily appointment sequence (1 to 56 per day)
          const parsedSeq = rawSeq ? parseInt(rawSeq.replace(/[^0-9]/g, ''), 10) : (rIdx + 1);

          // Get or build official identifier / passport
          let rawPassport = passportIdx !== -1 ? (r[passportIdx]?.trim() || "") : "";
          if (!rawPassport) {
            if (rawResolution) {
              const cleanRef = rawResolution.replace(/[^a-zA-Z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 18);
              rawPassport = cleanRef ? `RES-${cleanRef}` : `EXT-${rawDate ? rawDate.replace(/[^0-9]/g, '') : '2026'}-${parsedSeq}`;
            } else {
              rawPassport = `EXT-${rawDate ? rawDate.replace(/[^0-9]/g, '') : '2026'}-${parsedSeq}`;
            }
          }

          return {
            id: `parsed-${rIdx}-${Date.now()}`,
            pasaporte: rawPassport.toUpperCase(),
            nombre: rawName,
            nacionalidad: rawNationality || "No especificada",
            elegible: isEligible,
            motivo: rawReason || (rawResolution ? `Resolución: ${rawResolution}` : "Consulte en ventanilla"),
            fecha: rawDate,
            hora: rawTime,
            numeroCitaDia: isNaN(parsedSeq) ? (rIdx + 1) : parsedSeq,
            resolucion: rawResolution
          };
        });

        if (parsedData.length === 0) {
          setExtranjeriaImportStatus({
            success: false,
            message: "No se encontraron filas con datos válidos para procesar."
          });
          return;
        }

        const capacityExceeded = parsedData.filter(d => d.numeroCitaDia > 71).length;

        setParsedExtranjeriaRows(parsedData);
        setExtranjeriaImportStatus({
          success: true,
          message: capacityExceeded > 0
            ? `¡Archivo analizado! Se detectaron ${parsedData.length} citas/expedientes. ⚠️ Atención: ${capacityExceeded} cita(s) tienen número N° superior a 71 (el límite máximo permitido para Extranjería es de 71 citas por día: 56 web + 15 supervisor).`
            : `¡Archivo analizado con éxito! Se cargaron ${parsedData.length} citas/expedientes con control de secuencia diaria (Capacidad: 71 citas/día).`
        });
      } catch (err) {
        console.error(err);
        setExtranjeriaImportStatus({
          success: false,
          message: "Ocurrió un error inesperado al procesar el formato de su archivo CSV."
        });
      }
    };
    reader.readAsText(file);
  };

  const handleDownloadExtranjeriaTemplate = () => {
    const headers = 'Fecha,N°,Hora,Nombre,Resolución / Fecha,Nacionalidad\n';
    const slots = generateExtranjeriaSlots('07:00 AM', '02:45 PM', 15);
    const todayStr = new Date().toISOString().substring(0, 10);

    let csvRows = '';
    // Generate clean empty template rows for the supervisor to fill with real citizen data
    for (let i = 0; i < 71; i++) {
      const seq = i + 1;
      const slotIdx = Math.min(slots.length - 1, Math.floor(i / 2));
      const hora = slots[slotIdx];
      csvRows += `${todayStr},${seq},${hora},,,,\n`;
    }
    
    const csvContent = '\uFEFF' + headers + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `plantilla_oficial_citas_extranjeria_71_cupos_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSaveExtranjeriaRecords = async () => {
    if (parsedExtranjeriaRows.length === 0) return;
    setIsProcessingExtranjeria(true);

    try {
      // 1. Save eligibility records
      const existingMap = new Map(extranjeriaRecords.map(r => [r.pasaporte, r]));
      
      parsedExtranjeriaRows.forEach(parsed => {
        existingMap.set(parsed.pasaporte, {
          pasaporte: parsed.pasaporte,
          nombre: parsed.nombre,
          nacionalidad: parsed.nacionalidad,
          elegible: parsed.elegible,
          motivo: parsed.motivo,
          fecha: parsed.fecha,
          hora: parsed.hora,
          numeroCitaDia: parsed.numeroCitaDia,
          resolucion: parsed.resolucion
        });
      });

      const combinedRecords = Array.from(existingMap.values());

      const res = await fetch('/api/extranjeria/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: combinedRecords })
      });

      const data = await res.json();

      // 2. If records have dates, also schedule directly into calendar appointments (56 slots max)
      const rowsWithDates = parsedExtranjeriaRows.filter(r => r.fecha);
      let registeredCount = 0;

      if (rowsWithDates.length > 0) {
        const slots = generateExtranjeriaSlots('07:00 AM', '02:45 PM', 15);
        for (const r of rowsWithDates) {
          try {
            const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
            let code = '';
            for (let i = 0; i < 5; i++) {
              code += alpha.charAt(Math.floor(Math.random() * alpha.length));
            }
            const txId = `EXT-${code}`;
            const seqNum = r.numeroCitaDia || 1;
            
            // Assign slot based on sequence if hora is not explicitly given (1 & 2 -> 07:00 AM, 3 & 4 -> 07:15 AM, ..., up to 56)
            let assignedTime = r.hora;
            if (!assignedTime) {
              const slotIdx = Math.min(slots.length - 1, Math.floor((seqNum - 1) / 2));
              assignedTime = slots[slotIdx] || '07:00 AM';
            }

            const appPayload = {
              id: txId,
              correo: 'extranjeria@te.gob.pa',
              codigoTransaccion: txId,
              servicioCategoria: 'extranjeria',
              categoriaNombre: 'Trámites de Extranjería',
              subServicioId: 'ext_primera_vez',
              subServicioNombre: 'Carné de residente permanente por primera vez',
              fecha: r.fecha,
              hora: assignedTime,
              sucursalId: 'anc_main',
              sucursalNombre: 'Sede Principal de Ancón (Extranjería)',
              sucursalDireccion: 'Ciudad de Panamá, Ancón, Ave. Omar Torrijos Herrera',
              estado: 'confirmada',
              telefono: 'N/A',
              nombre: r.nombre,
              creadoPor: 'Importación CSV Secuencia Diaria',
              numeroCitaDia: seqNum,
              resolucion: r.resolucion || r.motivo,
              datosPersonales: (() => {
                const nParts = (r.nombre || '').trim().split(/\s+/).filter(Boolean);
                let pNom = '';
                let sNom = '';
                let pApe = '';
                let sApe = '';
                if (nParts.length >= 4) {
                  pNom = nParts[0];
                  sNom = nParts[1];
                  pApe = nParts[2];
                  sApe = nParts.slice(3).join(' ');
                } else if (nParts.length === 3) {
                  pNom = nParts[0];
                  pApe = nParts[1];
                  sApe = nParts[2];
                } else if (nParts.length === 2) {
                  pNom = nParts[0];
                  pApe = nParts[1];
                } else {
                  pNom = nParts[0] || '';
                }
                return {
                  primerNombre: pNom,
                  segundoNombre: sNom || undefined,
                  primerApellido: pApe,
                  segundoApellido: sApe || undefined,
                  nombreCompleto: r.nombre,
                  pasaporte: r.pasaporte,
                  nacionalidad: r.nacionalidad,
                  numeroResolucion: r.resolucion,
                  correo: 'extranjeria@te.gob.pa',
                  telefono: 'N/A',
                  tipoIdentificacion: 'Pasaporte'
                };
              })()
            };

            const appRes = await fetch('/api/register-appointment', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(appPayload)
            });
            if (appRes.ok) {
              registeredCount++;
            }
          } catch (appErr) {
            console.warn("Error registering appointment from CSV:", appErr);
          }
        }
        fetchAppointments();
      }

      if (data && data.success) {
        setExtranjeriaImportStatus({
          success: true,
          message: registeredCount > 0
            ? `¡Carga e integración completada! Se guardaron ${parsedExtranjeriaRows.length} expedientes y se sincronizaron ${registeredCount} citas oficiales en el calendario con secuencia N° (del 1 al 56).`
            : `¡Carga completa! Se guardaron ${parsedExtranjeriaRows.length} registros en la base de datos de Extranjería.`
        });
        setParsedExtranjeriaRows([]);
        fetchExtranjeriaRecords();
      } else {
        setExtranjeriaImportStatus({
          success: false,
          message: data.error || "Ocurrió un error al guardar los expedientes en el servidor."
        });
      }
    } catch (err) {
      console.error(err);
      setExtranjeriaImportStatus({
        success: false,
        message: "Error de red al intentar guardar los registros en la base de datos."
      });
    } finally {
      setIsProcessingExtranjeria(false);
    }
  };

  const handleDeleteExtranjeriaRecord = async (passportToDelete: string) => {
    if (!window.confirm(`¿Está seguro de eliminar el pasaporte ${passportToDelete}? El ciudadano ya no podrá agendar citas.`)) return;
    
    try {
      const remaining = extranjeriaRecords.filter(r => r.pasaporte !== passportToDelete);
      const res = await fetch('/api/extranjeria/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: remaining })
      });
      const data = await res.json();
      if (data && data.success) {
        setExtranjeriaRecords(remaining);
        setExtranjeriaImportStatus({
          success: true,
          message: "Expediente eliminado correctamente de la base de datos."
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleClearAllExtranjeriaRecords = async () => {
    if (!window.confirm("¿Está seguro de eliminar absolutamente TODOS los expedientes de Extranjería? Esta acción no se puede deshacer.")) return;

    try {
      const res = await fetch('/api/extranjeria/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ records: [] })
      });
      const data = await res.json();
      if (data && data.success) {
        setExtranjeriaRecords([]);
        setExtranjeriaImportStatus({
          success: true,
          message: "Todos los expedientes han sido eliminados con éxito de la base de datos."
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [calendarDate, setCalendarDate] = useState<Date>(new Date());

  // Guarantee calendarDate is always a valid Date object
  const safeCalendarDate = useMemo(() => {
    if (!calendarDate || isNaN(calendarDate.getTime())) {
      return new Date();
    }
    return calendarDate;
  }, [calendarDate]);
  
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
    const year = safeCalendarDate.getFullYear();
    const month = safeCalendarDate.getMonth();
    
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
  }, [safeCalendarDate]);

  // Appointments grouped by date for fast lookup in calendars, sorted by hour
  const appointmentsByDate = useMemo(() => {
    const g: Record<string, any[]> = {};
    appointments.forEach(app => {
      const d = standardizeDateString(app.fecha); // YYYY-MM-DD
      if (d) {
        if (!g[d]) g[d] = [];
        g[d].push({ ...app, fecha: d });
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

  // Distinct months that contain appointments (for organized month navigation without endless date lists)
  const monthsWithAppointments = useMemo(() => {
    const map = new Map<string, { year: number; month: number; label: string; count: number }>();
    Object.keys(appointmentsByDate).forEach(dStr => {
      const count = appointmentsByDate[dStr].length;
      if (count === 0) return;
      const parts = dStr.split('-');
      if (parts.length === 3) {
        const y = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10); // 1-12
        if (!isNaN(y) && !isNaN(m) && m >= 1 && m <= 12) {
          const key = `${y}-${String(m).padStart(2, '0')}`;
          if (!map.has(key)) {
            map.set(key, {
              year: y,
              month: m - 1, // 0-11
              label: `${mesesNombres[m - 1]} ${y}`,
              count: 0
            });
          }
          map.get(key)!.count += count;
        }
      }
    });
    return Array.from(map.values()).sort((a, b) => {
      if (a.year !== b.year) return a.year - b.year;
      return a.month - b.month;
    });
  }, [appointmentsByDate, mesesNombres]);

  // Form states for creating a new special appointment (authorized supervisor additional quota)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCitaNombre, setNewCitaNombre] = useState('');
  const [newCitaPasaporte, setNewCitaPasaporte] = useState('');
  const [newCitaNacionalidad, setNewCitaNacionalidad] = useState('');
  const [newCitaResolucion, setNewCitaResolucion] = useState('');
  const [newCitaMotivoEspecial, setNewCitaMotivoEspecial] = useState('Autorización de Supervisión (Cupo Especial)');
  const [newCitaCorreo, setNewCitaCorreo] = useState('');
  const [newCitaTelefono, setNewCitaTelefono] = useState('');
  const [newCitaFecha, setNewCitaFecha] = useState('');
  const [newCitaHora, setNewCitaHora] = useState('08:00 AM');

  // Hours that are already booked on the target date for special appointments (overlap prevention)
  const occupiedHoursForSpecialAppt = useMemo(() => {
    const targetDate = standardizeDateString(newCitaFecha || selectedCalendarDateStr);
    const dayCitas = appointmentsByDate[targetDate] || [];
    const map: Record<string, string> = {};
    dayCitas.forEach((c: any) => {
      if (c.hora && c.estado !== 'cancelada' && c.status !== 'cancelada') {
        const cName = getExtranjeriaCitizenName(c);
        map[c.hora] = cName || c.id || 'Cita ocupada';
      }
    });
    return map;
  }, [appointmentsByDate, newCitaFecha, selectedCalendarDateStr]);

  // Capacity / Schedule setups (Extranjería jornada ampliada interna: 07:00 AM a 02:45 PM)
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
    return localStorage.getItem('extranjeria_hora_fin') || '02:45 PM';
  });
  const [ticketKioscoUrl, setTicketKioscoUrl] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('extranjeria_ticket_kiosco_url');
      if (saved && !saved.includes('sistema-de-ticket.vercel.app') && saved.trim()) {
        return saved.trim();
      }
    } catch {}
    return 'https://test.te.gob.pa:8443/kiosco';
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

  const copyTvLink = () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/tv/extranjeria`;
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(url)
        .then(() => showStatus(`¡Enlace copiado al portapapeles! ${url}`, 'success'))
        .catch(() => showStatus(`Enlace de Pantalla TV: ${url}`, 'info'));
    } else {
      showStatus(`Enlace de Pantalla TV: ${url}`, 'info');
    }
  };

  // Booth / Cubiculos state (4 enabled with staff, 4 reserve empty)
  const [booths, setBooths] = useState<Booth[]>(() => {
    const raw = localStorage.getItem('extranjeria_booths');
    let loaded: Booth[] | null = null;
    if (raw) {
      try {
        loaded = JSON.parse(raw);
      } catch (e) {
        // Fallback below
      }
    }
    const defaults = [
      { id: 1, name: "Cubículo 19", active: true, staff: "Gestor de Extranjería", empty: false, receso: false },
      { id: 2, name: "Cubículo 20", active: true, staff: "Cubículo Ticket Extranjería", empty: false, receso: false },
      { id: 3, name: "Cubículo 22", active: true, staff: "Gestor de Extranjería", empty: false, receso: false },
      { id: 4, name: "Cubículo 23", active: true, staff: "Cubículo Ticket Extranjería", empty: false, receso: false },
      { id: 5, name: "Cubículo 5", active: false, staff: "Turno de Reserva", empty: true, receso: false },
      { id: 6, name: "Cubículo 6", active: false, staff: "Turno de Reserva", empty: true, receso: false },
      { id: 7, name: "Cubículo 7", active: false, staff: "Turno de Reserva", empty: true, receso: false },
      { id: 8, name: "Cubículo 8", active: false, staff: "Turno de Reserva", empty: true, receso: false }
    ];
    if (loaded && Array.isArray(loaded)) {
      // Migrate names to guarantee correct numbering for Extranjería
      return loaded.map(b => {
        let name = b.name;
        if (Number(b.id) === 1 || b.id === 1 || b.name === "Cubículo 1" || b.name === "Cubiculo 1") name = "Cubículo 19";
        if (Number(b.id) === 2 || b.id === 2 || b.name === "Cubículo 2" || b.name === "Cubiculo 2") name = "Cubículo 20";
        if (Number(b.id) === 3 || b.id === 3 || b.name === "Cubículo 3" || b.name === "Cubiculo 3") name = "Cubículo 22";
        if (Number(b.id) === 4 || b.id === 4 || b.name === "Cubículo 4" || b.name === "Cubiculo 4") name = "Cubículo 23";

        let staff = b.staff;
        if (b.id === 1 && (b.staff === "Lic. Ana Pérez" || b.staff === "Lic. Ana Perez")) staff = "Gestor de Extranjería";
        if (b.id === 2 && (b.staff === "Lic. Carlos Gómez" || b.staff === "Lic. Carlos Gomez")) staff = "Cubículo Ticket Extranjería";
        if (b.id === 3 && (b.staff === "Lic. María Rodríguez" || b.staff === "Lic. Maria Rodriguez" || b.staff === "Supervisor de Extranjería")) staff = "Gestor de Extranjería";
        if (b.id === 4 && (b.staff === "Lic. Juan Martínez" || b.staff === "Lic. Juan Martinez" || b.staff === "Atendimiento Entrada Extranjería")) staff = "Cubículo Ticket Extranjería";

        return { 
          ...b, 
          name, 
          staff, 
          receso: b.receso !== undefined ? b.receso : false,
          disabledBy: b.disabledBy || undefined,
          disabledAt: b.disabledAt || undefined
        };
      });
    }
    return defaults;
  });

  // Helper canónico para garantizar que los nombres de los cubículos activos sean siempre Cubículo 19, Cubículo 20, Cubículo 22, Cubículo 23
  const getBoothDisplayName = useCallback((boothIdOrObj: any): string => {
    if (!boothIdOrObj) return 'Cubículo 19';
    if (typeof boothIdOrObj === 'object') {
      const bName = String(boothIdOrObj.name || '');
      if (bName.includes('20')) return 'Cubículo 20';
      if (bName.includes('19')) return 'Cubículo 19';
      if (bName.includes('22')) return 'Cubículo 22';
      if (bName.includes('23')) return 'Cubículo 23';
      const bId = Number(boothIdOrObj.id);
      if (bId === 1 || bId === 19) return 'Cubículo 19';
      if (bId === 2 || bId === 20) return 'Cubículo 20';
      if (bId === 3 || bId === 22) return 'Cubículo 22';
      if (bId === 4 || bId === 23) return 'Cubículo 23';
      return boothIdOrObj.name || `Cubículo ${boothIdOrObj.id}`;
    }
    const num = Number(boothIdOrObj);
    if (num === 1 || num === 19) return 'Cubículo 19';
    if (num === 2 || num === 20) return 'Cubículo 20';
    if (num === 3 || num === 22) return 'Cubículo 22';
    if (num === 4 || num === 23) return 'Cubículo 23';
    const found = booths.find(b => Number(b.id) === num);
    if (found?.name) {
      if (Number(found.id) === 2 || found.name.includes('20')) return 'Cubículo 20';
      if (Number(found.id) === 1 || found.name.includes('19')) return 'Cubículo 19';
      if (Number(found.id) === 3 || found.name.includes('22')) return 'Cubículo 22';
      if (Number(found.id) === 4 || found.name.includes('23')) return 'Cubículo 23';
      return found.name;
    }
    return `Cubículo ${boothIdOrObj}`;
  }, [booths]);

  // Extranjería custom metadata tracking (document checks, supervisor forwarding, booth assignments, ticketing)
  const [appMetadata, setAppMetadata] = useState<Record<string, AppointmentMetadata>>(() => {
    const raw = localStorage.getItem('extranjeria_appointment_metadata');
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        const cleaned: Record<string, any> = {};
        Object.entries(parsed).forEach(([k, v]: [string, any]) => {
          if (k.startsWith('booth_') || k === 'active_call' || k === 'booths_config') {
            cleaned[k] = v;
            return;
          }
          const cName = String(v?.citizenName || v?.nombre || '').toUpperCase();
          if (
            k.includes('CSV-09') ||
            k.includes('Q54QJ') ||
            k.includes('20260928-122') ||
            k.includes('154') ||
            cName.includes('ISABEL') ||
            cName.includes('WALTER') ||
            cName.includes('CARLOS') ||
            cName.includes('SANCHEZ') ||
            cName.includes('SÁNCHEZ')
          ) {
            return; // Discard stale/demo key
          }
          cleaned[k] = v;
        });
        return cleaned;
      } catch (e) {
        return {};
      }
    }
    return {};
  });

  // Dynamic list of unique operators (users) of "Cubículo Extranjería (Ventanilla/Ticket)"
  const availableCubiculoUsers = useMemo(() => {
    const usersSet = new Set<string>();

    // 1. Add real users fetched from `/api/users` with extranjería roles
    systemUsers.forEach(u => {
      const roleLower = String(u.role || '').toLowerCase();
      if (roleLower.includes('extranjeria') || roleLower === 'extranjeria' || u.username === 'cubiculomigra') {
        if (u.nombre && u.nombre !== 'Sin Asignar' && u.nombre !== 'Oficial General') {
          usersSet.add(u.nombre);
        }
      }
    });

    // 2. Add current booth staff names (excluding old demo names)
    booths.forEach(b => {
      const staffName = getBoothStaffName(b);
      if (staffName && staffName !== 'Sin Asignar' && staffName !== 'Oficial General' && staffName !== 'Turno de Reserva') {
        const isDemoName = [
          "Lic. Ana Pérez", "Lic. Carlos Gómez", "Lic. María Rodríguez", "Lic. Juan Martínez",
          "Lic. Ana Perez", "Lic. Carlos Gomez", "Lic. Maria Rodriguez", "Lic. Juan Martinez"
        ].includes(staffName);
        if (!isDemoName) {
          usersSet.add(staffName);
        }
      }
    });

    // 3. Scan all app metadata for actual names assigned to cubicles
    if (appMetadata && typeof appMetadata === 'object') {
      Object.keys(appMetadata).forEach(id => {
        const meta = appMetadata[id];
        if (meta && meta.assignedCubiculo && meta.staffResponsable) {
          const staff = meta.staffResponsable;
          const isDemoName = [
            "Lic. Ana Pérez", "Lic. Carlos Gómez", "Lic. María Rodríguez", "Lic. Juan Martínez",
            "Lic. Ana Perez", "Lic. Carlos Gomez", "Lic. Maria Rodriguez", "Lic. Juan Martinez"
          ].includes(staff);
          if (
            staff !== 'Sin Asignar' &&
            staff !== 'Oficial General' &&
            staff !== 'Agente Importador (Histórico)' &&
            staff !== 'Atención Extranjería' &&
            staff !== 'Turno de Reserva' &&
            !isDemoName
          ) {
            usersSet.add(staff);
          }
        }
      });
    }

    return Array.from(usersSet).filter(Boolean).sort();
  }, [booths, appMetadata, systemUsers]);

  // Memoized count of completed appointments today and in the selected date range for each operator
  const cubiculoUserStats = useMemo(() => {
    const stats: Record<string, { today: number; range: number; booths: Set<string> }> = {};

    // Initialize stats for each operator
    availableCubiculoUsers.forEach(user => {
      stats[user] = { today: 0, range: 0, booths: new Set() };
    });

    appointments.forEach(app => {
      if (!isExtranjeriaAppointment(app)) return;
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      if (meta && meta.assignedCubiculo && meta.staffResponsable) {
        const op = meta.staffResponsable;
        if (!stats[op]) {
          stats[op] = { today: 0, range: 0, booths: new Set() };
        }
        stats[op].booths.add(getBoothDisplayName(meta.assignedCubiculo));

        // Check if it's "realizada"
        const isRealizada = meta.estadoTicket === 'realizada';
        if (isRealizada) {
          const stdAppDate = standardizeDateString(app.fecha || app.date || '');
          const stdStart = standardizeDateString(reportStartDate);
          const stdEnd = standardizeDateString(reportEndDate);
          // Is it today?
          if (stdAppDate === todayStr || isCompletedToday(app, meta, todayStr)) {
            stats[op].today += 1;
          }
          // Is it within the selected report range?
          if (stdAppDate && stdAppDate >= stdStart && stdAppDate <= stdEnd) {
            stats[op].range += 1;
          }
        }
      }
    });

    return stats;
  }, [availableCubiculoUsers, appointments, appMetadata, todayStr, reportStartDate, reportEndDate]);

  // Total completed appointments today across all booths in Extranjería
  const totalTodayCompletedAllBooths = useMemo(() => {
    return appointments.filter(app => {
      if (!isExtranjeriaAppointment(app)) return false;
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      return isCompletedToday(app, meta, todayStr);
    }).length;
  }, [appointments, appMetadata, todayStr]);

  // Helper to determine if a cubicle is busy with an active attention or call
  const isCubiculoBusy = useCallback((cubiculoId: number) => {
    return appointments.some(app => {
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      if (meta && Number(meta.assignedCubiculo) === Number(cubiculoId) && 
             (meta.estadoTicket === 'en_proceso' || meta.estadoTicket === 'en_atencion')) {
        return true;
      }
      return false;
    });
  }, [appointments, appMetadata]);

  // Fetch metadata from backend server
  const fetchServerMetadata = useCallback(async () => {
    try {
      const res = await fetch('/api/extranjeria/metadata');
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.metadata) {
          // Synchronize active_call across remote displays / Smart TVs in real time
          if (json.metadata.active_call !== undefined) {
            const serverActiveCall = json.metadata.active_call;
            if (serverActiveCall && serverActiveCall.timestamp) {
              if (
                serverActiveCall.cleanCitizenName?.includes('Carlos') ||
                serverActiveCall.cleanCitizenName?.includes('Sanchez') ||
                serverActiveCall.cleanCitizenName?.includes('Sánchez') ||
                serverActiveCall.citizenName?.includes('Carlos') ||
                serverActiveCall.citizenName?.includes('Sanchez') ||
                serverActiveCall.citizenName?.includes('Sánchez') ||
                serverActiveCall.appId === 'EXT-8K2P9'
              ) {
                setLastCallEvent(null);
              } else if (Math.abs(Date.now() - serverActiveCall.timestamp) < 300000) {
                setLastCallEvent(prev => {
                  if (!prev || prev.timestamp !== serverActiveCall.timestamp) {
                    setIsCallOverlayMinimized(false);
                    setCallRemainingSeconds(10);
                    return serverActiveCall;
                  }
                  return prev;
                });
              } else {
                setLastCallEvent(prev => (prev ? null : prev));
              }
            } else if (serverActiveCall === null) {
              setLastCallEvent(prev => (prev ? null : prev));
            }
          }

          // Synchronize authoritative supervisor booths configuration across all screens only when changed
          if (Array.isArray(json.metadata.booths_config) && json.metadata.booths_config.length > 0) {
            setBooths(prev => {
              const incoming = json.metadata.booths_config;
              if (prev.length === incoming.length) {
                const isIdentical = prev.every((b, idx) => {
                  const inc = incoming[idx];
                  return (
                    inc &&
                    b.id === inc.id &&
                    b.nombre === inc.nombre &&
                    b.activo === inc.activo &&
                    b.receso === inc.receso &&
                    b.currentUser === inc.currentUser
                  );
                });
                if (isIdentical) return prev;
              }
              return incoming;
            });
          }

          setAppMetadata(prev => {
            const newMeta = json.metadata;
            const newKeys = Object.keys(newMeta);
            const prevKeys = Object.keys(prev);

            // Fast bail-out check: avoid creating a new object reference if data is unchanged
            if (newKeys.length === prevKeys.length) {
              let hasChanged = false;
              for (let i = 0; i < newKeys.length; i++) {
                const k = newKeys[i];
                const p = prev[k];
                const n = newMeta[k];
                if (!p ||
                    p.assignedCubiculo !== n.assignedCubiculo ||
                    p.estadoTicket !== n.estadoTicket ||
                    p.passedToSupervisor !== n.passedToSupervisor ||
                    p.hasDocuments !== n.hasDocuments ||
                    p.staffResponsable !== n.staffResponsable ||
                    p.reatencion !== n.reatencion ||
                    (p as any).active !== (n as any).active ||
                    (p as any).disabledBy !== (n as any).disabledBy ||
                    (p.checkedDocs?.length || 0) !== (n.checkedDocs?.length || 0)) {
                  hasChanged = true;
                  break;
                }
              }
              if (!hasChanged) {
                return prev; // Retain reference -> Zero re-renders across the entire component!
              }
            }

            const merged = { ...prev, ...newMeta };
            try {
              localStorage.setItem('extranjeria_appointment_metadata', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }
      }
    } catch (e) {
      console.warn('Error fetching extranjeria metadata from server:', e);
    }
  }, []);

  // Post metadata update to server and broadcast across tabs/windows
  const persistMetadata = useCallback(async (updated: Record<string, AppointmentMetadata>, incremental?: Record<string, AppointmentMetadata>) => {
    setAppMetadata(updated);
    try {
      localStorage.setItem('extranjeria_appointment_metadata', JSON.stringify(updated));
    } catch {}

    // Broadcast across windows in real time
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('te_extranjeria_metadata_channel');
        bc.postMessage({ type: 'METADATA_UPDATE', metadata: updated });
        bc.close();
      }
    } catch {}

    // Post to backend server for persistent database storage
    try {
      const payload = incremental || updated;
      const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      await fetch('/api/extranjeria/metadata', {
        method: 'POST',
        headers,
        body: JSON.stringify({ metadata: payload })
      });
    } catch (e) {
      console.error('Failed to sync metadata to server:', e);
    }
  }, []);

  // Synchronize with server on mount and periodically every 8s (pausing when tab is hidden)
  useEffect(() => {
    fetchServerMetadata();
    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      fetchServerMetadata();
    }, 8000);
    return () => clearInterval(interval);
  }, [fetchServerMetadata]);

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

  // Sync booths recess status and active/disabled status from appMetadata in real time across ALL supervisors
  useEffect(() => {
    setBooths(prev => {
      let changed = false;
      const updated = prev.map(b => {
        let currentB = { ...b };
        const recesoKey = `booth_receso_${b.id}`;
        const serverReceso = Boolean(appMetadata[recesoKey]?.reatencion);
        if (currentB.receso !== serverReceso) {
          changed = true;
          currentB.receso = serverReceso;
        }

        const statusKey = `booth_status_${b.id}`;
        const statusMeta = appMetadata[statusKey] as any;
        if (statusMeta && statusMeta.active !== undefined) {
          const serverActive = Boolean(statusMeta.active);
          const serverDisabledBy = statusMeta.disabledBy || undefined;
          const serverDisabledAt = statusMeta.disabledAt || undefined;
          if (currentB.active !== serverActive || currentB.disabledBy !== serverDisabledBy || currentB.disabledAt !== serverDisabledAt) {
            changed = true;
            currentB.active = serverActive;
            currentB.disabledBy = serverDisabledBy;
            currentB.disabledAt = serverDisabledAt;
          }
        }
        return currentB;
      });
      return changed ? updated : prev;
    });
  }, [appMetadata]);

  // Synchronize appointment metadata across multiple tabs/windows in real time (StorageEvent & BroadcastChannel)
  useEffect(() => {
    const handleStorageMeta = (e: StorageEvent) => {
      if (e.key === 'extranjeria_appointment_metadata' && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          setAppMetadata(parsed);
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorageMeta);

    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('te_extranjeria_metadata_channel');
        bc.onmessage = (event) => {
          if (event.data?.type === 'METADATA_UPDATE' && event.data.metadata) {
            setAppMetadata(prev => ({ ...prev, ...event.data.metadata }));
          }
        };
      }
    } catch {}

    return () => {
      window.removeEventListener('storage', handleStorageMeta);
      if (bc) bc.close();
    };
  }, []);

  // Audio control state for Pantalla de Turnos
  const [screenSoundEnabled, setScreenSoundEnabled] = useState(true);

  // Persistent BroadcastChannel reference to prevent async dropping of messages
  const bcRef = React.useRef<BroadcastChannel | null>(null);

  React.useEffect(() => {
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      bcRef.current = new BroadcastChannel('te_extranjeria_calls');
    }
    return () => {
      if (bcRef.current) {
        try { bcRef.current.close(); } catch {}
      }
    };
  }, []);

  // Call event state for broadcasting citizen calls to the Turn Display Screen exclusively
  const [lastCallEvent, setLastCallEvent] = useState<{
    appId: string;
    codePart: string;
    cleanCitizenName: string;
    boothId: number;
    boothName: string;
    announcementText: string;
    type: 'cubiculo' | 'caja' | 'recall';
    timestamp: number;
  } | null>(null);

  const [isCallOverlayMinimized, setIsCallOverlayMinimized] = useState<boolean>(false);
  const [callRemainingSeconds, setCallRemainingSeconds] = useState<number>(10);

  useEffect(() => {
    if (lastCallEvent && lastCallEvent.timestamp) {
      // Regla estricta: Descartar llamadas de días anteriores de inmediato
      const callDay = new Date(lastCallEvent.timestamp).toLocaleDateString('en-CA');
      const currentDay = getLocalTodayDateString();
      if (callDay !== currentDay) {
        setLastCallEvent(null);
        try { localStorage.removeItem('te_extranjeria_active_call'); } catch {}
        return;
      }

      // Regla estricta: Purgar y descartar llamadas viejas de demostración con "Carlos" o "Sanchez"
      if (
        lastCallEvent.cleanCitizenName?.includes('Carlos') ||
        lastCallEvent.cleanCitizenName?.includes('Sanchez') ||
        lastCallEvent.cleanCitizenName?.includes('Sánchez') ||
        (lastCallEvent as any).citizenName?.includes('Carlos') ||
        (lastCallEvent as any).citizenName?.includes('Sanchez') ||
        (lastCallEvent as any).citizenName?.includes('Sánchez') ||
        lastCallEvent.appId === 'EXT-8K2P9'
      ) {
        setLastCallEvent(null);
        try { localStorage.removeItem('te_extranjeria_active_call'); } catch {}
        return;
      }

      setIsCallOverlayMinimized(false);
      setCallRemainingSeconds(10);

      let remaining = 10;
      const interval = setInterval(() => {
        remaining -= 1;
        setCallRemainingSeconds(Math.max(0, remaining));
        if (remaining <= 0) {
          setIsCallOverlayMinimized(true);
          clearInterval(interval);
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [lastCallEvent?.timestamp, lastCallEvent?.appId]);

  const lastAnnouncedTimestampRef = React.useRef<number>(0);

  // Synthesis-based sound alert for public display chimes
  // REGLA CRÍTICA DE AUDIO: El sonido y voz del llamado debe sonar ÚNICAMENTE en la Pantalla de Turnos (subRole === 'pantalla').
  // Las demás consolas (supervisor, cubículos de atención, recepción) NO deben reproducir sonido.
  const playChimeSound = (announcementText?: string) => {
    if (subRole !== 'pantalla' || !screenSoundEnabled) {
      return;
    }

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
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      
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

      setTimeout(() => {
        try {
          ctx.close().catch(() => {});
        } catch {}
      }, 1000);

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

  // Dispatch call announcement exclusively to the Turn Screen (TV/Monitor)
  const emitCallToPantalla = (payload: {
    appId: string;
    codePart: string;
    cleanCitizenName: string;
    boothId: number;
    boothName: string;
    announcementText: string;
    type: 'cubiculo' | 'caja' | 'recall';
    turnCode?: string;
  }) => {
    const callData = {
      ...payload,
      citizenName: payload.cleanCitizenName,
      timestamp: Date.now(),
    };

    // 1. Cross-tab synchronization via localStorage
    try {
      localStorage.setItem('te_extranjeria_active_call', JSON.stringify(callData));
    } catch {}

    // 2. Real-time broadcast channel for open TV / monitor windows
    try {
      if (bcRef.current) {
        bcRef.current.postMessage({ type: 'CALL_CITIZEN', call: callData });
      } else if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const tempBc = new BroadcastChannel('te_extranjeria_calls');
        tempBc.postMessage({ type: 'CALL_CITIZEN', call: callData });
        setTimeout(() => {
          try { tempBc.close(); } catch {}
        }, 3000);
      }
    } catch (e) {
      console.warn("BroadcastChannel postMessage error:", e);
    }

    // 3. Local component state
    setLastCallEvent(callData);

    // 4. Cross-device network synchronization to server for Smart TVs / remote displays
    try {
      const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      fetch('/api/extranjeria/metadata', {
        method: 'POST',
        headers,
        body: JSON.stringify({ metadata: { active_call: callData } })
      }).catch(() => {});
    } catch {}
  };

  // Cancel / clear active call on the Pantalla de Turnos (when agent starts attention or completes)
  const clearCallFromPantalla = (appId?: string) => {
    // 1. Remove active call from localStorage
    try {
      localStorage.removeItem('te_extranjeria_active_call');
    } catch {}

    // 2. Broadcast clear event across open TV / monitor windows
    try {
      if (bcRef.current) {
        bcRef.current.postMessage({ type: 'CLEAR_CALL', appId });
      } else if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const tempBc = new BroadcastChannel('te_extranjeria_calls');
        tempBc.postMessage({ type: 'CLEAR_CALL', appId });
        setTimeout(() => {
          try { tempBc.close(); } catch {}
        }, 3000);
      }
    } catch (e) {
      console.warn("BroadcastChannel clear postMessage error:", e);
    }

    // 3. Clear local state
    setLastCallEvent(null);

    // 4. Cancel active speech synthesis immediately
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    } catch {}

    // 5. Clear active call on server for cross-device Smart TVs
    try {
      const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      fetch('/api/extranjeria/metadata', {
        method: 'POST',
        headers,
        body: JSON.stringify({ metadata: { active_call: null } })
      }).catch(() => {});
    } catch {}
  };

  // Turn Screen Audio Listener: executes sound and voice strictly when subRole === 'pantalla'
  useEffect(() => {
    if (subRole !== 'pantalla') return;

    const handleCallAnnouncement = (call: typeof lastCallEvent) => {
      if (!call || !call.timestamp || !call.announcementText) return;
      if (lastAnnouncedTimestampRef.current === call.timestamp) return;
      lastAnnouncedTimestampRef.current = call.timestamp;

      // Play audio chime and speak voice announcement on the Turn Screen ONLY
      playChimeSound(call.announcementText);
    };

    // In-memory call event
    if (lastCallEvent && lastCallEvent.timestamp !== lastAnnouncedTimestampRef.current) {
      handleCallAnnouncement(lastCallEvent);
    }

    // Check localStorage on mount or view change
    try {
      const stored = localStorage.getItem('te_extranjeria_active_call');
      if (stored) {
        if (stored.includes('Carlos') || stored.includes('Sanchez') || stored.includes('Sánchez') || stored.includes('8K2P9')) {
          localStorage.removeItem('te_extranjeria_active_call');
        } else {
          const parsed = JSON.parse(stored);
          // Robust check allowing up to 3 minutes of clock skew (either positive or negative)
          if (parsed && parsed.timestamp && (Math.abs(Date.now() - parsed.timestamp) < 180000)) {
            setIsCallOverlayMinimized(false);
            setCallRemainingSeconds(10);
            handleCallAnnouncement(parsed);
          }
        }
      }
    } catch {}

    // Listen on BroadcastChannel
    let bc: BroadcastChannel | null = null;
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        bc = new BroadcastChannel('te_extranjeria_calls');
        bc.onmessage = (event) => {
          if (event.data) {
            if (event.data.type === 'CALL_CITIZEN' && event.data.call) {
              const call = event.data.call;
              if (
                call.cleanCitizenName?.includes('Carlos') ||
                call.cleanCitizenName?.includes('Sanchez') ||
                call.cleanCitizenName?.includes('Sánchez') ||
                call.citizenName?.includes('Carlos') ||
                call.citizenName?.includes('Sanchez') ||
                call.citizenName?.includes('Sánchez') ||
                call.appId === 'EXT-8K2P9'
              ) {
                return;
              }
              setIsCallOverlayMinimized(false);
              setCallRemainingSeconds(10);
              setLastCallEvent(call);
              handleCallAnnouncement(call);
            } else if (event.data.type === 'CLEAR_CALL') {
              setLastCallEvent(null);
              setIsCallOverlayMinimized(true);
              if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
              }
            }
          }
        };
      }
    } catch {}

    // Listen on storage event (when call is triggered or cleared from another operator tab)
    const onStorage = (e: StorageEvent) => {
      if (e.key === 'te_extranjeria_active_call') {
        if (e.newValue) {
          try {
            const parsed = JSON.parse(e.newValue);
            if (
              parsed.cleanCitizenName?.includes('Carlos') ||
              parsed.cleanCitizenName?.includes('Sanchez') ||
              parsed.cleanCitizenName?.includes('Sánchez') ||
              parsed.citizenName?.includes('Carlos') ||
              parsed.citizenName?.includes('Sanchez') ||
              parsed.citizenName?.includes('Sánchez') ||
              parsed.appId === 'EXT-8K2P9'
            ) {
              localStorage.removeItem('te_extranjeria_active_call');
              return;
            }
            setIsCallOverlayMinimized(false);
            setCallRemainingSeconds(10);
            setLastCallEvent(parsed);
            handleCallAnnouncement(parsed);
          } catch {}
        } else {
          setLastCallEvent(null);
          setIsCallOverlayMinimized(true);
          if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
            window.speechSynthesis.cancel();
          }
        }
      }
    };
    window.addEventListener('storage', onStorage);

    return () => {
      if (bc) bc.close();
      window.removeEventListener('storage', onStorage);
    };
  }, [subRole, lastCallEvent, screenSoundEnabled]);

  // Helper helper to fetch appointments from server and filter extranjería
  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token');
      let allAppointments: any[] = [];
      
      try {
        const extRes = await fetch('/api/extranjeria/appointments');
        if (extRes.ok) {
          const extData = await extRes.json();
          if (extData && extData.success && Array.isArray(extData.appointments)) {
            allAppointments = [...extData.appointments];
          }
        }
      } catch (extErr) {
        console.warn('Network issue fetching extranjeria appointments:', extErr);
      }

      try {
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/appointments', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.appointments)) {
            const existingIds = new Set(allAppointments.map((a: any) => String(a.id || '')));
            data.appointments.forEach((app: any) => {
              if (app && app.id && !existingIds.has(String(app.id))) {
                allAppointments.push(app);
                existingIds.add(String(app.id));
              }
            });
          }
        }
      } catch (netErr) {
        console.warn('Network issue fetching appointments, attempting local storage sync:', netErr);
      }

      // Clean and sanitize local storage appointments so stale demo records do not contaminate Extranjería
      try {
        const saved = localStorage.getItem('citas_tribunal_electoral_v2');
        if (saved) {
          const localList = JSON.parse(saved);
          if (Array.isArray(localList) && localList.length > 0) {
            const purgedList = localList.filter((localApp: any) => {
              const id = String(localApp?.id || '');
              const name = String(localApp?.nombre || '').toUpperCase();
              return !(
                id.includes('CSV-09') ||
                id.includes('Q54QJ') ||
                id.includes('20260928-122') ||
                id.includes('20260908-101') ||
                id.includes('ESP-TEST') ||
                name.includes('ISABEL CASTELLANO') ||
                name.includes('WALTER LOPEZ') ||
                name.includes('CARLOS SANCHEZ') ||
                name.includes('CARLOS SÁNCHEZ') ||
                name.includes('JOVANNA OLIVARES') ||
                name.includes('JEAN DUPONT') ||
                name.includes('JOHN SMITH')
              );
            });
            if (purgedList.length !== localList.length) {
              localStorage.setItem('citas_tribunal_electoral_v2', JSON.stringify(purgedList));
            }
          }
        }
      } catch (locErr) {
        console.warn('Error sanitizing local appointments in Extranjería:', locErr);
      }

      if (allAppointments.length > 0) {
        // Auto-heal any CSV appointments to full Extranjería nomenclature, preserving their original dates
        allAppointments = allAppointments.map((app: any) => {
          if (!app) return app;
          let updated = { ...app };
          
          // Always standardize the date format to YYYY-MM-DD for consistency
          if (updated.fecha) {
            updated.fecha = standardizeDateString(updated.fecha);
          }
          
          const isCsv = String(updated.id || '').includes('CSV') || 
                        String(updated.codigoTransaccion || '').includes('CSV') || 
                        String(updated.creadoPor || '').toLowerCase().includes('csv') || 
                        String(updated.creadoPor || '').toLowerCase().includes('importaci') ||
                        String(updated.id || '').startsWith('TE-CSV');

          if (isCsv) {
            if (String(updated.id || '').startsWith('TE-')) {
              updated.id = updated.id.replace(/^TE-/, 'EXT-');
            }
            if (String(updated.codigoTransaccion || '').startsWith('TE-')) {
              updated.codigoTransaccion = updated.codigoTransaccion.replace(/^TE-/, 'EXT-');
            }
            updated.servicioCategoria = 'extranjeria';
            updated.categoriaNombre = 'Trámites de Extranjería';
            updated.subServicioId = 'ext_primera_vez';
            updated.subServicioNombre = 'Carné de residente permanente por primera vez';
            updated.sucursalId = 'anc_main';
            updated.sucursalNombre = 'Sede Principal de Ancón (Extranjería)';
            updated.sucursalDireccion = 'Ciudad de Panamá, Ancón, Ave. Omar Torrijos Herrera';
            updated.tipoIdentificacion = 'Pasaporte';
            updated.creadoPor = 'Importación CSV Extranjería';
            if (!updated.requisitos || updated.requisitos.length === 0) {
              updated.requisitos = [
                "Precio (efectivo) B/. 100.00",
                "Requiere contar con cita programada",
                "Nota del Servicio Nacional de Migración",
                "Fotocopia del carné expedido por el Servicio Nacional de Migración",
                "Fotocopia de la página de las generales del pasaporte"
              ];
            }
          }
          return updated;
        });

        const filtered = allAppointments.filter((app: any) => {
          const id = (app.id || '').toUpperCase();
          const tx = (app.codigoTransaccion || '').toUpperCase();
          const nom = (app.nombre || app.datosPersonales?.nombreCompleto || '').toUpperCase();

          // Strictly filter out any demo or test citizens
          if (
            id.includes('20260908-101') ||
            id.includes('ESP-TEST') ||
            id.includes('20260907-001') ||
            nom.includes('JOVANNA OLIVARES') ||
            nom.includes('JEAN DUPONT') ||
            nom.includes('JOHN SMITH') ||
            nom.includes('ISABEL CASTELLANO') ||
            nom.includes('WALTER LOPEZ') ||
            nom.includes('CARLOS SANCHEZ')
          ) {
            return false;
          }

          const cat = (app.servicioCategoria || '').toLowerCase();
          const catName = (app.categoriaNombre || '').toLowerCase();
          const sub = (app.subServicioNombre || '').toLowerCase();
          const subId = (app.subServicioId || '').toLowerCase();
          const creado = (app.creadoPor || '').toLowerCase();
          const isTardia = subId === 'ced_pasados_edad' || sub.includes('tardía') || sub.includes('tardia');
          const isCsv = id.includes('CSV') || tx.includes('CSV') || creado.includes('csv') || creado.includes('importaci') || id.startsWith('EXT-') || tx.startsWith('EXT-');
          return (
            cat === 'extranjeria' ||
            catName.includes('extranj') ||
            sub.includes('extranj') ||
            subId.includes('extranj') ||
            id.startsWith('EXT') ||
            tx.startsWith('EXT') ||
            isCsv ||
            isTardia
          );
        }).map((app: any) => {
          const name = getExtranjeriaCitizenName(app);
          const dp = app.datosPersonales ? { ...app.datosPersonales } : {};
          if (name && !isGenericPlaceholderName(name)) {
            dp.nombreCompleto = name;
          }
          const standardizedDate = standardizeDateString(app.fecha);
          const finalNombre = (name && !isGenericPlaceholderName(name)) ? name : ((app.nombre && !isGenericPlaceholderName(app.nombre)) ? app.nombre : 'Ciudadano');
          return {
            ...app,
            fecha: standardizedDate || app.fecha,
            nombre: finalNombre,
            datosPersonales: dp
          };
        });

        // Set the full appointments list so all dates appear on the calendar
        setAppointments(filtered);

        // Auto-heal localStorage appointments so permanent storage reflects the real citizen names
        try {
          const savedLocal = localStorage.getItem('citas_tribunal_electoral_v2');
          if (savedLocal) {
            let localList = JSON.parse(savedLocal);
            if (Array.isArray(localList) && localList.length > 0) {
              let updatedCount = 0;
              localList = localList.map((locApp: any) => {
                if (!locApp) return locApp;
                const match = filtered.find((f: any) => String(f.id) === String(locApp.id));
                if (match && match.nombre && (!locApp.nombre || isGenericPlaceholderName(locApp.nombre) || locApp.nombre !== match.nombre)) {
                  updatedCount++;
                  return {
                    ...locApp,
                    nombre: match.nombre,
                    datosPersonales: {
                      ...(locApp.datosPersonales || {}),
                      nombreCompleto: match.nombre
                    }
                  };
                }
                return locApp;
              });
              if (updatedCount > 0) {
                localStorage.setItem('citas_tribunal_electoral_v2', JSON.stringify(localList));
              }
            }
          }
        } catch (healErr) {
          console.warn('Error auto-healing localStorage appointments:', healErr);
        }
      } else {
        setAppointments([]);
      }
    } catch (err) {
      console.error(err);
      showStatus('Fallo de red al conectar con el servidor de citas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Auto-detect day rollover (cambio de día y paso de medianoche) para actualizar la TV y limpiar datos de ayer
  useEffect(() => {
    const checkDayRollover = () => {
      const freshToday = getLocalTodayDateString();
      if (freshToday !== todayStr) {
        console.log(`[Extranjería TV] Cambio de día detectado: ${todayStr} -> ${freshToday}. Realizando transición a nuevo día.`);
        setTodayStr(freshToday);
        setAtencionDateFilter(freshToday);
        setSelectedCalendarDateStr('');
        setLastCallEvent(null);
        setIsCallOverlayMinimized(true);
        try { localStorage.removeItem('te_extranjeria_active_call'); } catch {}

        // Limpiar metadatos de atención y recesos del día anterior para que no resuciten en cubículos ni TV
        setAppMetadata(prev => {
          const updated = { ...prev };
          let changed = false;
          Object.keys(prev).forEach(key => {
            if (key.startsWith('booth_receso_')) {
              delete updated[key];
              changed = true;
            } else if (!key.startsWith('booth_occupant_') && !key.startsWith('booths_config') && key !== 'active_call') {
              const meta = prev[key];
              if (meta && (meta.estadoTicket === 'en_atencion' || meta.estadoTicket === 'llamando' || meta.estadoTicket === 'en_proceso')) {
                updated[key] = {
                  ...meta,
                  estadoTicket: 'realizada'
                };
                changed = true;
              }
            }
          });
          if (changed) {
            try {
              localStorage.setItem('extranjeria_appointment_metadata', JSON.stringify(updated));
            } catch {}
          }
          return changed ? updated : prev;
        });

        fetchAppointments();
        fetchServerMetadata();
      }
    };

    const interval = setInterval(() => {
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;
      checkDayRollover();
    }, 20000);
    return () => clearInterval(interval);
  }, [todayStr]);

  const handleCreateCitaSupervisor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCitaNombre.trim() || !newCitaPasaporte.trim() || !newCitaFecha || !newCitaHora) {
      showStatus('Por favor, complete nombre, pasaporte, fecha y hora.', 'error');
      return;
    }

    // Las citas que crean los supervisores de Extranjería son CUPOS ADICIONALES para la jornada ampliada (hasta 71 citas: 56 web + 15 supervisor)
    const dayAppointments = appointmentsByDate[newCitaFecha] || [];
    const regularAppointments = dayAppointments.filter((a: any) => !a.creadaPorSupervisor && !a.esEspecial && !a.citaEspecial && !a.esCupoAdicional && a.estado !== 'cancelada');
    const specialAppointments = dayAppointments.filter((a: any) => (a.creadaPorSupervisor || a.esEspecial || a.citaEspecial || a.esCupoAdicional) && a.estado !== 'cancelada');

    if (specialAppointments.length >= 15 || (regularAppointments.length + specialAppointments.length) >= 71) {
      showStatus('Se ha alcanzado la capacidad máxima de 71 citas para este día (56 cupos web + 15 cupos especiales de supervisión).', 'error');
      return;
    }

    // Los supervisores pueden generar citas en cualquier horario de la jornada (incluyendo franja ampliada hasta 2:45 PM y cualquier horario)
    // Numeración de la cita: si es antes de los 56 cupos ordinarios de la web, toma el correlativo; si es adicional de supervisión, se numera del 57 al 71
    const nextSeq = regularAppointments.length < 56 
      ? regularAppointments.length + 1 
      : 56 + specialAppointments.length + 1;

    const anconSucursal = SUCURSALES_TE.find(s => s.id === 'anc_main');
    if (anconSucursal && anconSucursal.acceptsNationalAppointments === false) {
      showStatus('La Sede Principal de Ancón (Extranjería) está deshabilitada para citas nacionales por el Super Administrador.', 'error');
      return;
    }

    try {
      const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let i = 0; i < 5; i++) {
        code += alpha.charAt(Math.floor(Math.random() * alpha.length));
      }
      const transactionId = `EXT-ESP-${code}`;
      const creatorName = sessionStorage.getItem('admin_username') || 'Supervisor de Extranjería';
      const motivoVal = newCitaMotivoEspecial.trim() || 'Autorización de Supervisión (Cupo Especial)';
      const resolucionVal = newCitaResolucion.trim();

      const payload = {
        id: transactionId,
        correo: newCitaCorreo.trim() || 'extranjeria@te.gob.pa',
        codigoTransaccion: transactionId,
        servicioCategoria: 'extranjeria',
        categoriaNombre: 'Trámites de Extranjería',
        subServicioId: 'ext_primera_vez',
        subServicioNombre: 'Carné de residente permanente por primera vez (Cita Especial)',
        fecha: newCitaFecha,
        hora: newCitaHora,
        sucursalId: 'anc_main',
        sucursalNombre: 'Sede Principal de Ancón (Extranjería)',
        sucursalDireccion: 'Ciudad de Panamá, Ancón, Ave. Omar Torrijos Herrera',
        estado: 'confirmada',
        telefono: newCitaTelefono.trim() || 'N/A',
        nombre: newCitaNombre.trim(),
        creadoPor: `${creatorName} (Cupo Especial)`,
        creadaPorSupervisor: true,
        esEspecial: true,
        citaEspecial: true,
        esCupoAdicional: true,
        motivoEspecial: motivoVal,
        numeroCitaDia: nextSeq,
        resolucion: resolucionVal || undefined,
        datosPersonales: (() => {
          const nParts = newCitaNombre.trim().split(/\s+/).filter(Boolean);
          let pNom = '';
          let sNom = '';
          let pApe = '';
          let sApe = '';
          if (nParts.length >= 4) {
            pNom = nParts[0];
            sNom = nParts[1];
            pApe = nParts[2];
            sApe = nParts.slice(3).join(' ');
          } else if (nParts.length === 3) {
            pNom = nParts[0];
            pApe = nParts[1];
            sApe = nParts[2];
          } else if (nParts.length === 2) {
            pNom = nParts[0];
            pApe = nParts[1];
          } else {
            pNom = nParts[0] || '';
          }
          return {
            primerNombre: pNom,
            segundoNombre: sNom || undefined,
            primerApellido: pApe,
            segundoApellido: sApe || undefined,
            nombreCompleto: newCitaNombre.trim(),
            pasaporte: newCitaPasaporte.trim(),
            nacionalidad: newCitaNacionalidad.trim() || 'No especificada',
            correo: newCitaCorreo.trim() || 'extranjeria@te.gob.pa',
            telefono: newCitaTelefono.trim() || 'N/A',
            numeroResolucion: resolucionVal || undefined,
            creadoPor: `${creatorName} (Cupo Especial)`,
            creadaPorSupervisor: true,
            esEspecial: true,
            citaEspecial: true,
            esCupoAdicional: true,
            motivoEspecial: motivoVal
          };
        })(),
        requisitos: [
          'Precio (efectivo) B/. 100.00',
          'Cita especial autorizada por Supervisión de Extranjería (Cupo Adicional)',
          'Nota del Servicio Nacional de Migración',
          'Fotocopia del carné expedido por el Servicio Nacional de Migración',
          'Fotocopia de la página de las generales del pasaporte'
        ]
      };

      const sessionToken = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (sessionToken) headers['Authorization'] = `Bearer ${sessionToken}`;
      const res = await fetch('/api/register-appointment', {
        method: 'POST',
        headers,
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showStatus(`¡Cita Especial registrada con éxito! Cupo adicional autorizado para el ${newCitaFecha} a las ${newCitaHora}.`, 'success');
        
        // Reset form
        setNewCitaNombre('');
        setNewCitaPasaporte('');
        setNewCitaNacionalidad('');
        setNewCitaResolucion('');
        setNewCitaMotivoEspecial('Autorización de Supervisión (Cupo Especial)');
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
      const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(`/api/appointments/${citaId}`, {
        method: 'DELETE',
        headers
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showStatus('Cita eliminada correctamente de manera permanente.', 'success');
        
        // Remove from local storage to prevent it from reviving
        try {
          const saved = localStorage.getItem('citas_tribunal_electoral_v2');
          if (saved) {
            const localList = JSON.parse(saved);
            if (Array.isArray(localList)) {
              const updated = localList.filter((a: any) => a.id !== citaId);
              localStorage.setItem('citas_tribunal_electoral_v2', JSON.stringify(updated));
            }
          }
        } catch (e) {
          console.error(e);
        }

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
    const autoRestore = async () => {
      try {
        const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token');
        const headers: Record<string, string> = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;
        const res = await fetch('/api/appointments', { headers });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && Array.isArray(data.appointments)) {
            const fetchedList = data.appointments;
            const rawMetadata = localStorage.getItem('extranjeria_appointment_metadata');
            let currentMeta: Record<string, AppointmentMetadata> = {};
            if (rawMetadata) {
              try {
                currentMeta = JSON.parse(rawMetadata);
              } catch {}
            }
            
            const updatedMap = { ...currentMeta };
            let restoredCount = 0;
            const incremental: Record<string, AppointmentMetadata> = {};

            fetchedList.forEach((app: any) => {
              if (!app) return;
              const stdDate = standardizeDateString(app.fecha);
              const isToday = stdDate === todayStr;
              const isNotActuallyFinished = app.status !== 'atendido' && 
                                            app.status !== 'realizada' && 
                                            app.status !== 'completada' && 
                                            app.status !== 'cancelada';

              if (isToday && isNotActuallyFinished) {
                const meta = updatedMap[app.id];
                if (!meta || meta.estadoTicket === 'realizada') {
                  const updatedMeta = {
                    ...(meta || {
                      hasDocuments: true,
                      checkedDocs: [],
                      passedToSupervisor: false,
                    }),
                    estadoTicket: 'ninguno' as const,
                    assignedCubiculo: null
                  };
                  updatedMap[app.id] = updatedMeta;
                  incremental[app.id] = updatedMeta;
                  restoredCount++;
                }
              }
            });

            if (restoredCount > 0) {
              await persistMetadata(updatedMap, incremental);
              await fetchAppointments();
              console.log(`[Auto-Heal] Auto-restored ${restoredCount} today's unserved appointments.`);
            }
          }
        }
      } catch (e) {
        console.warn('Auto-restore failed:', e);
      }
    };

    autoRestore();
  }, [todayStr]);

  useEffect(() => {
    fetchAppointments();

    // Polling interval: keep appointments fresh in real time for TV screens and consoles
    const apptInterval = setInterval(() => {
      fetchAppointments();
    }, subRole === 'pantalla' ? 4000 : 8000);

    // Load schedule config from server
    fetch('/api/extranjeria/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.config) {
          const { capacidad: cap, intervalo: inter, horaInicio: hIni, horaFin: hFin, ticketKioscoUrl: tUrl } = data.config;
          setCapacidad(cap);
          setIntervalo(inter);
          setHoraInicio(hIni);
          const internalFin = (hFin === '01:45 PM' || !hFin) ? '02:45 PM' : hFin;
          setHoraFin(internalFin);
          
          localStorage.setItem('extranjeria_capacidad_usuarios', String(cap));
          localStorage.setItem('extranjeria_intervalo_minutos', String(inter));
          localStorage.setItem('extranjeria_hora_inicio', hIni);
          localStorage.setItem('extranjeria_hora_fin', internalFin);

          const cleanUrl = (tUrl && !tUrl.includes('sistema-de-ticket.vercel.app'))
            ? tUrl.trim()
            : 'https://test.te.gob.pa:8443/kiosco';
          setTicketKioscoUrl(cleanUrl);
          localStorage.setItem('extranjeria_ticket_kiosco_url', cleanUrl);
        }
      })
      .catch(err => console.warn("Failed to load extranjeria config from server:", err));

    return () => clearInterval(apptInterval);
  }, [subRole]);

  const showStatus = (text: string, type: 'success' | 'error' | 'info') => {
    setStatusMessage({ text, type });
    setTimeout(() => {
      setStatusMessage(prev => prev.text === text ? { text: '', type: null } : prev);
    }, 5000);
  };

  // Save timing config handler
  const promptSaveConfig = (e: React.FormEvent) => {
    e.preventDefault();
    const canConfigure = currentRole === 'super' || currentRole === 'extranjeria_supervisor' || currentRole === 'extranjeria';
    if (!canConfigure) {
      showStatus('Operación denegada. Solo el Administrador o Supervisor de Extranjería puede configurar la capacidad, horarios y enlace de tickets.', 'error');
      return;
    }
    setShowConfirmSave(true);
  };

  const executeSaveConfig = async () => {
    setShowConfirmSave(false);
    const cleanUrl = (ticketKioscoUrl && !ticketKioscoUrl.includes('sistema-de-ticket.vercel.app'))
      ? ticketKioscoUrl.trim()
      : 'https://test.te.gob.pa:8443/kiosco';

    setTicketKioscoUrl(cleanUrl);
    localStorage.setItem('extranjeria_capacidad_usuarios', String(capacidad));
    localStorage.setItem('extranjeria_intervalo_minutos', String(intervalo));
    localStorage.setItem('extranjeria_hora_inicio', horaInicio);
    localStorage.setItem('extranjeria_hora_fin', horaFin);
    localStorage.setItem('extranjeria_ticket_kiosco_url', cleanUrl);
    
    try {
      const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/extranjeria/config', {
        method: 'POST',
        headers,
        body: JSON.stringify({ capacidad, intervalo, horaInicio, horaFin, ticketKioscoUrl: cleanUrl })
      });
      const data = await res.json();
      if (data && data.success) {
        showStatus('¡Éxito! Configuración de citas para Extranjería y URL de tickets actualizada y sincronizada en el servidor.', 'success');
      } else {
        showStatus('Configuración guardada localmente, pero falló la sincronización con el servidor.', 'info');
      }
    } catch (err) {
      console.error(err);
      showStatus('Configuración guardada localmente, pero falló la sincronización con el servidor.', 'info');
    }
  };

  // Activate/deactivate a reserve or regular booth (casillero de atención)
  const toggleBoothActive = (boothId: number) => {
    const currentSupervisorUser = sessionStorage.getItem('admin_username') || localStorage.getItem('admin_username') || 'Supervisor';
    let nextActive = false;
    let staffName = '';
    let disabledByVal: string | undefined = undefined;
    let disabledAtVal: string | undefined = undefined;

    const updatedBooths = booths.map(b => {
      if (b.id === boothId) {
        nextActive = !b.active;
        staffName = b.staff;
        if (nextActive && b.empty) {
          staffName = "Gestor de Extranjería";
        } else if (!nextActive && b.empty) {
          staffName = "Turno de Reserva";
        }
        disabledByVal = nextActive ? undefined : currentSupervisorUser;
        disabledAtVal = nextActive ? undefined : new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit' });
        return { 
          ...b, 
          active: nextActive, 
          staff: staffName,
          disabledBy: disabledByVal,
          disabledAt: disabledAtVal
        };
      }
      return b;
    });

    setBooths(updatedBooths);

    // Broadcast status to all supervisors and persist to server
    const statusKey = `booth_status_${boothId}`;
    const statusItem: any = {
      hasDocuments: false,
      checkedDocs: [],
      passedToSupervisor: false,
      assignedCubiculo: boothId,
      estadoTicket: 'ninguno' as const,
      active: nextActive,
      disabledBy: disabledByVal || null,
      disabledAt: disabledAtVal || null
    };

    const incremental: Record<string, any> = { 
      [statusKey]: statusItem,
      booths_config: updatedBooths
    };
    const updatedMap = {
      ...appMetadata,
      ...incremental
    };
    persistMetadata(updatedMap, incremental);

    if (nextActive) {
      showStatus(`Casillero ${boothId} habilitado con éxito. Ahora recibirá citas para atención.`, 'success');
    } else {
      showStatus(`Casillero ${boothId} DESHABILITADO por ${currentSupervisorUser}. Ningún supervisor ni el sistema le asignará citas.`, 'info');
    }
  };

  // Re-assign operator staff of any booth
  const updateBoothStaff = (boothId: number, newStaff: string) => {
    const updatedBooths = booths.map(b => {
      if (b.id === boothId) {
        return { ...b, staff: newStaff };
      }
      return b;
    });
    setBooths(updatedBooths);
    persistMetadata({ ...appMetadata, booths_config: updatedBooths as any }, { booths_config: updatedBooths as any });
    showStatus(`Operador asignado al Casillero ${boothId} actualizado a: ${newStaff}.`, 'success');
  };

  // Toggle recess/break status for any booth
  const toggleBoothReceso = async (boothId: number) => {
    let nextState = 'DISPONIBLE';
    let nextReceso = false;
    const updatedBooths = booths.map(b => {
      if (b.id === boothId) {
        nextReceso = !b.receso;
        nextState = nextReceso ? 'EN RECESO' : 'DISPONIBLE';
        return { ...b, receso: nextReceso };
      }
      return b;
    });
    setBooths(updatedBooths);

    const key = `booth_receso_${boothId}`;
    const incremental: Record<string, any> = {
      [key]: {
        hasDocuments: false,
        checkedDocs: [],
        passedToSupervisor: false,
        assignedCubiculo: boothId,
        estadoTicket: 'ninguno' as const,
        reatencion: nextReceso
      },
      booths_config: updatedBooths
    };
    const updatedMeta = {
      ...appMetadata,
      ...incremental
    };
    await persistMetadata(updatedMeta, incremental);

    showStatus(`Casillero ${boothId} cambiado a estado: ${nextState}.`, 'success');
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
    const app = appointments.find(a => a.id === appId || a.codigoTransaccion === appId);
    const existingMeta = appMetadata[appId] || (app?.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
    const meta = existingMeta || {
      hasDocuments: false,
      checkedDocs: [],
      passedToSupervisor: false,
      assignedCubiculo: null,
      estadoTicket: 'ninguno'
    };

    const cleanCitizenName = (app?.nombre && !isGenericPlaceholderName(app.nombre) && app.nombre !== 'Ciudadano en Atención')
      ? app.nombre
      : (app?.datosPersonales?.nombreCompleto && !isGenericPlaceholderName(app.datosPersonales.nombreCompleto))
        ? app.datosPersonales.nombreCompleto
        : getExtranjeriaCitizenName(app);

    const allDocs = REQUISITOS_EXTRANJERIA.map(r => r.id);
    const updatedItem: AppointmentMetadata = {
      ...meta,
      hasDocuments: true,
      checkedDocs: allDocs,
      passedToSupervisor: true,
      assignedCubiculo: null,
      estadoTicket: 'ninguno',
      citizenName: cleanCitizenName,
      nombre: cleanCitizenName,
      codigoTransaccion: app?.codigoTransaccion || appId
    } as any;

    const incremental: Record<string, AppointmentMetadata> = { [appId]: updatedItem };
    if (app && app.codigoTransaccion && app.codigoTransaccion !== appId) {
      incremental[app.codigoTransaccion] = updatedItem;
    }

    const updatedMap = {
      ...appMetadata,
      ...incremental
    };

    persistMetadata(updatedMap, incremental);

    showStatus(`Expediente de cita ${appId} verificado y enviado al Supervisor para asignación de cubículo.`, 'success');
    setSelectedAppForCheck(null);
  };

  // Assign appointment to cubicle (by supervisor)
  const handleAssignToCubiculo = (appId: string, cubiculoId: number) => {
    const targetBooth = booths.find(b => b.id === cubiculoId);
    if (!targetBooth?.active) {
      const disabledMsg = targetBooth?.disabledBy 
        ? `No se puede asignar: El ${targetBooth.name} fue DESHABILITADO por el supervisor ${targetBooth.disabledBy}.`
        : `No se puede asignar: El ${targetBooth?.name || 'cubículo'} se encuentra deshabilitado por supervisión.`;
      showStatus(disabledMsg, 'error');
      return;
    }
    if (targetBooth?.receso) {
      showStatus(`No se puede asignar: El ${targetBooth.name} se encuentra EN RECESO.`, 'error');
      return;
    }

    const app = appointments.find(a => String(a.id) === String(appId) || (a.codigoTransaccion && String(a.codigoTransaccion) === String(appId)));
    const existingMeta = appMetadata[appId] || (app?.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null) || appMetadata[String(appId)];
    const meta = existingMeta || {
      hasDocuments: true,
      checkedDocs: REQUISITOS_EXTRANJERIA.map(r => r.id),
      passedToSupervisor: true,
      assignedCubiculo: null,
      estadoTicket: 'ninguno'
    };

    const cleanCitizenName = (app?.nombre && !isGenericPlaceholderName(app.nombre) && app.nombre !== 'Ciudadano en Atención')
      ? app.nombre
      : (app?.datosPersonales?.nombreCompleto && !isGenericPlaceholderName(app.datosPersonales.nombreCompleto))
        ? app.datosPersonales.nombreCompleto
        : (meta.citizenName && !isGenericPlaceholderName(meta.citizenName) && meta.citizenName !== 'Ciudadano en Atención')
          ? meta.citizenName
          : getExtranjeriaCitizenName(app);

    const appointmentNumber = String(app?.codigoTransaccion || app?.codigoCita || app?.id || appId).trim().toUpperCase();
    const boothName = getBoothDisplayName(targetBooth || cubiculoId);

    // REGLA CRÍTICA: NO hacer el llamado si el cubículo no está libre
    const isFree = !isCubiculoBusy(Number(cubiculoId));

    const updatedItem: AppointmentMetadata = {
      ...meta,
      hasDocuments: true,
      checkedDocs: meta.checkedDocs && meta.checkedDocs.length > 0 ? meta.checkedDocs : REQUISITOS_EXTRANJERIA.map(r => r.id),
      passedToSupervisor: true,
      assignedCubiculo: cubiculoId,
      estadoTicket: isFree ? 'en_proceso' : 'en_espera',
      citizenName: cleanCitizenName,
      nombre: cleanCitizenName,
      codigoTransaccion: appointmentNumber,
      turnCode: appointmentNumber,
      timestampAsignacion: new Date().toISOString()
    } as any;

    const incremental: Record<string, AppointmentMetadata> = { [appId]: updatedItem };
    if (app && app.codigoTransaccion && app.codigoTransaccion !== appId) {
      incremental[app.codigoTransaccion] = updatedItem;
    }

    const updatedMap = {
      ...appMetadata,
      ...incremental
    };

    persistMetadata(updatedMap, incremental);

    setSelectedAppForSupervisor(null);
    setSupervisorCheckedDocs([]);

    if (isFree) {
      // Regla: Solo llamar el nombre del ciudadano y el cubículo correspondiente cuando esté libre
      const announcementText = `${cleanCitizenName}. Favor dirigirse al ${boothName}.`;

      emitCallToPantalla({
        appId,
        codePart: appointmentNumber,
        cleanCitizenName,
        boothId: cubiculoId,
        boothName,
        announcementText,
        type: 'cubiculo',
        turnCode: appointmentNumber
      });

      showStatus(`Cita asignada al ${boothName} (libre). Llamado emitido a la Pantalla de Turnos.`, 'success');
    } else {
      showStatus(`Cita asignada a la cola de ${boothName}. El cubículo no está libre actualmente; NO se emite llamado hasta que se desocupe.`, 'info');
    }
  };

  // Assign or return a citizen to a cubicle for re-attention (reatención)
  const handleReassignForReattention = (appId: string, cubiculoId: number) => {
    const targetBooth = booths.find(b => b.id === cubiculoId);
    if (targetBooth?.receso) {
      showStatus(`No se puede reasignar: El ${targetBooth.name} se encuentra EN RECESO.`, 'error');
      return;
    }
    if (!targetBooth?.active) {
      showStatus(`No se puede reasignar: El ${targetBooth?.name || 'cubículo'} está deshabilitado.`, 'error');
      return;
    }

    const app = appointments.find(a => a.id === appId || a.codigoTransaccion === appId);
    if (!app) return;
    
    const existingMeta = appMetadata[appId] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
    const appointmentNumber = String(app?.codigoTransaccion || app?.codigoCita || app?.id || appId).trim().toUpperCase();
    const isFree = !isCubiculoBusy(Number(cubiculoId));
    
    const updatedItem: AppointmentMetadata = {
      ...(existingMeta || {
        hasDocuments: true,
        checkedDocs: REQUISITOS_EXTRANJERIA.map(r => r.id),
        passedToSupervisor: true,
        assignedCubiculo: null,
        estadoTicket: 'ninguno'
      }),
      hasDocuments: true,
      checkedDocs: existingMeta?.checkedDocs && existingMeta.checkedDocs.length > 0 ? existingMeta.checkedDocs : REQUISITOS_EXTRANJERIA.map(r => r.id),
      passedToSupervisor: true,
      assignedCubiculo: cubiculoId,
      estadoTicket: isFree ? 'en_proceso' : 'en_espera',
      reatencion: true,
      codigoTransaccion: appointmentNumber,
      turnCode: appointmentNumber,
      timestampReatencion: new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
    };

    const incremental: Record<string, AppointmentMetadata> = { [appId]: updatedItem };
    if (app.codigoTransaccion && app.codigoTransaccion !== appId) {
      incremental[app.codigoTransaccion] = updatedItem;
    }

    const updatedMap = {
      ...appMetadata,
      ...incremental
    };

    persistMetadata(updatedMap, incremental);

    const cleanCitizenName = (app?.nombre && !isGenericPlaceholderName(app.nombre) && app.nombre !== 'Ciudadano en Atención')
      ? app.nombre
      : (app?.datosPersonales?.nombreCompleto && !isGenericPlaceholderName(app.datosPersonales.nombreCompleto))
        ? app.datosPersonales.nombreCompleto
        : (existingMeta?.citizenName && !isGenericPlaceholderName(existingMeta.citizenName) && existingMeta.citizenName !== 'Ciudadano en Atención')
          ? existingMeta.citizenName
          : getExtranjeriaCitizenName(app);
    const boothName = getBoothDisplayName(targetBooth || cubiculoId);
    
    if (isFree) {
      const announcementText = `${cleanCitizenName}. Favor dirigirse al ${boothName}.`;

      emitCallToPantalla({
        appId,
        codePart: appointmentNumber,
        cleanCitizenName,
        boothId: cubiculoId,
        boothName,
        announcementText,
        type: 'cubiculo',
        turnCode: appointmentNumber
      });

      showStatus(`Cita ${appointmentNumber} reasignada para REATENCIÓN en el ${boothName} (libre). Llamado emitido a pantalla.`, 'success');
    } else {
      showStatus(`Cita ${appointmentNumber} en cola de reatención de ${boothName}. El cubículo no está libre; no se emite llamado hasta que se desocupe.`, 'info');
    }
  };

  // Recall a citizen aloud strictly via the Turn Screen
  const handleRecallCitizen = (appId: string) => {
    const app = appointments.find(a => a.id === appId || a.codigoTransaccion === appId);
    if (!app) return;
    const meta = appMetadata[appId] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
    const cubiculoId = meta?.assignedCubiculo || selectedCubiculo;
    const boothName = getBoothDisplayName(cubiculoId);
    const targetBooth = booths.find(b => Number(b.id) === Number(cubiculoId));

    if (targetBooth?.receso) {
      showStatus(`No se puede llamar: El ${boothName} se encuentra EN RECESO.`, 'error');
      return;
    }
    if (!targetBooth?.active) {
      showStatus(`No se puede llamar: El ${boothName} se encuentra DESHABILITADO.`, 'error');
      return;
    }

    // REGLA ESTRICTA: NO hacer el llamado si el cubículo no está libre
    // (es decir, si ya está atendiendo o llamando a otro ciudadano en curso)
    const isAttendingOther = Object.keys(appMetadata).some(id => {
      if (id.startsWith('booth_') || id === 'active_call' || id === 'booths_config') return false;
      if (id === appId || (app.codigoTransaccion && id === app.codigoTransaccion)) return false;
      const m = appMetadata[id];
      return m && Number(m.assignedCubiculo) === Number(cubiculoId) && (m.estadoTicket === 'en_atencion' || m.estadoTicket === 'en_proceso');
    });

    if (isAttendingOther) {
      showStatus(`No se puede realizar el llamado: El ${boothName} no está libre (se encuentra ocupado con otro ciudadano en curso). Concluya la atención actual primero.`, 'error');
      return;
    }

    const appointmentNumber = String(app.codigoTransaccion || app.codigoCita || app.id || appId).trim().toUpperCase();
    const cleanCitizenName = (app?.nombre && !isGenericPlaceholderName(app.nombre) && app.nombre !== 'Ciudadano en Atención')
      ? app.nombre
      : (app?.datosPersonales?.nombreCompleto && !isGenericPlaceholderName(app.datosPersonales.nombreCompleto))
        ? app.datosPersonales.nombreCompleto
        : (meta?.citizenName && !isGenericPlaceholderName(meta.citizenName) && meta.citizenName !== 'Ciudadano en Atención')
          ? meta.citizenName
          : getExtranjeriaCitizenName(app);

    // Actualizar estado a 'en_proceso' (llamando)
    const updatedItem: AppointmentMetadata = {
      ...(meta || {
        hasDocuments: true,
        checkedDocs: REQUISITOS_EXTRANJERIA.map(r => r.id),
        passedToSupervisor: true,
        assignedCubiculo: cubiculoId,
        estadoTicket: 'en_proceso'
      }),
      assignedCubiculo: cubiculoId,
      estadoTicket: 'en_proceso',
      citizenName: cleanCitizenName,
      codigoTransaccion: appointmentNumber,
      turnCode: appointmentNumber,
      timestampLlamado: new Date().toISOString()
    };
    persistMetadata({ ...appMetadata, [appId]: updatedItem }, { [appId]: updatedItem });

    const announcementText = meta?.estadoTicket === 'pagado_en_caja'
      ? `${cleanCitizenName}. Favor dirigirse a la caja de pago.`
      : `${cleanCitizenName}. Favor dirigirse al ${boothName}.`;

    // Emit call strictly to the Turn Screen (pantalla de turnos)
    emitCallToPantalla({
      appId,
      codePart: appointmentNumber,
      cleanCitizenName,
      boothId: cubiculoId,
      boothName,
      announcementText,
      type: meta?.estadoTicket === 'pagado_en_caja' ? 'caja' : 'recall',
      turnCode: appointmentNumber
    });
    showStatus(`Llamado emitido a la Pantalla de Turnos: ${cleanCitizenName} ➔ ${boothName}`, 'info');
  };

  // Purgar citas colgadas o activas del día anterior o de hoy (para mantenimiento)
  const handlePurgeStaleAppointments = (includeToday: boolean = false) => {
    let changedCount = 0;
    const updatedMap = { ...appMetadata };
    const incremental: Record<string, AppointmentMetadata> = {};

    Object.keys(appMetadata).forEach(id => {
      if (id.startsWith('booth_occupant_') || id.startsWith('booth_receso_')) return;
      const meta = appMetadata[id];
      if (meta && meta.assignedCubiculo && (meta.estadoTicket === 'llamando' || meta.estadoTicket === 'en_proceso' || meta.estadoTicket === 'en_atencion')) {
        const app = appointments.find(a => String(a.id) === String(id) || (a.codigoTransaccion && String(a.codigoTransaccion) === String(id)));
        
        if (includeToday || !app || app.fecha !== todayStr) {
          const updated: AppointmentMetadata = {
            ...meta,
            estadoTicket: 'realizada'
          };
          updatedMap[id] = updated;
          incremental[id] = updated;
          changedCount++;
        }
      }
    });

    if (changedCount > 0) {
      persistMetadata(updatedMap, incremental);
      showStatus(`Éxito: Se purgaron y completaron ${changedCount} citas activas/colgadas del sistema.`, 'success');
    } else {
      showStatus('No se encontraron citas activas o colgadas para purgar.', 'info');
    }
  };

  // Vaciar y reiniciar todo para empezar desde cero (sin ninguna cita anterior)
  const handleWipeAllAppointments = async () => {
    if (!window.confirm("¿Está ABSOLUTAMENTE seguro de borrar y vaciar toda la base de datos de Extranjería?\n\nEsto eliminará todas las citas de la pantalla, borrará el historial de hoy y dejará la TV y los cubículos completamente vacíos para empezar limpios.")) {
      return;
    }
    setLoading(true);
    try {
      // 1. Clear local storage
      localStorage.removeItem('citas_tribunal_electoral_v2');
      localStorage.removeItem('te_extranjeria_active_call');
      localStorage.removeItem('extranjeria_appointment_metadata');
      
      // 2. We create an empty metadata set for all existing appointment IDs to be 'realizada'
      const clearedMeta: Record<string, AppointmentMetadata> = {};
      Object.keys(appMetadata).forEach(id => {
        if (id.startsWith('booth_occupant_') || id.startsWith('booth_receso_')) {
          clearedMeta[id] = appMetadata[id];
          return;
        }
        const meta = appMetadata[id];
        if (meta) {
          clearedMeta[id] = {
            ...meta,
            estadoTicket: 'realizada',
            assignedCubiculo: null
          };
        }
      });
      
      // If we have appointments, mark them all as 'realizada'
      appointments.forEach(app => {
        clearedMeta[app.id] = {
          hasDocuments: true,
          checkedDocs: [],
          passedToSupervisor: false,
          assignedCubiculo: null,
          estadoTicket: 'realizada'
        };
      });

      await persistMetadata(clearedMeta);
      
      // 3. Clear our appointments state
      setAppointments([]);
      
      // 4. Send clear event to the TV
      if (bcRef.current) {
        bcRef.current.postMessage({ type: 'CLEAR_CALL', appId: 'all' });
      }
      setLastCallEvent(null);
      
      showStatus("Éxito: Se ha limpiado la pantalla por completo y restablecido a cero.", "success");
    } catch (e) {
      console.error(e);
      showStatus("Error al limpiar el sistema.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Crear y asignar turno manual (Walk-in / Sin Cita Previa) inmediatamente a un cubículo y llamar
  const handleCreateAndCallManualAppointment = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    if (!manualCitizenName.trim()) {
      showStatus("Por favor ingrese el nombre completo del ciudadano.", "error");
      return;
    }
    
    if (!manualSelectedBooth) {
      showStatus("Por favor seleccione un cubículo para asignar el turno.", "error");
      return;
    }

    const boothNum = Number(manualSelectedBooth);
    const boothLabel = getBoothDisplayName(boothNum);
    const targetB = booths.find(b => Number(b.id) === boothNum);
    if (!targetB?.active) {
      const disBy = targetB?.disabledBy ? ` por el supervisor ${targetB.disabledBy}` : '';
      showStatus(`No se puede asignar: El ${boothLabel} fue DESHABILITADO${disBy}.`, "error");
      return;
    }
    if (targetB?.receso) {
      showStatus(`No se puede asignar: El ${boothLabel} se encuentra EN RECESO.`, "error");
      return;
    }
    if (isCubiculoBusy(boothNum)) {
      showStatus(`No se puede realizar el llamado: El ${boothLabel} no está libre (se encuentra ocupado atendiendo a otro ciudadano).`, "error");
      return;
    }

    const docStr = manualCitizenDoc.trim() || 'N/A';
    const cleanName = manualCitizenName.trim();
    
    // Generate a unique transaction/ticket code starting with EXT-M (for Manual) followed by a random 4-digit code
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const uniqueId = `EXT-M-${randomCode}`;
    
    // Choose selected subService details based on value
    let subServiceNombre = 'Carné de residente permanente por primera vez';
    if (manualTramiteType === 'ext_renovacion') subServiceNombre = 'Renovación de carné extranjero';
    if (manualTramiteType === 'ext_entrega') subServiceNombre = 'Entrega de carné permanente';
    if (manualTramiteType === 'ext_cedulacion') subServiceNombre = 'Trámite de Cédula de Extranjería';

    const newApp = {
      id: uniqueId,
      codigoTransaccion: uniqueId,
      fecha: todayStr, // Standardized current day date
      hora: new Date().toLocaleTimeString('es-PA', { hour: '2-digit', minute: '2-digit', hour12: false }),
      nombre: cleanName,
      servicioCategoria: 'extranjeria',
      categoriaNombre: 'Trámites de Extranjería',
      subServicioId: manualTramiteType,
      subServicioNombre: subServiceNombre,
      sucursalId: 'anc_main',
      sucursalNombre: 'Sede Principal de Ancón (Extranjería)',
      tipoIdentificacion: 'Pasaporte',
      identificacion: docStr,
      creadoPor: 'Asignación Manual Supervisor',
      datosPersonales: {
        nombreCompleto: cleanName,
        identificacion: docStr,
        tipoIdentificacion: 'Pasaporte'
      }
    };

    try {
      setLoading(true);

      // 1. Add to appointments list in memory
      const updatedAppointments = [newApp, ...appointments];
      setAppointments(updatedAppointments);

      // 2. Save new appointment list to local storage
      localStorage.setItem('citas_tribunal_electoral_v2', JSON.stringify(updatedAppointments));

      // 3. Create metadata for this manual appointment
      const newMeta: AppointmentMetadata = {
        hasDocuments: true,
        checkedDocs: ["req_precio", "req_cita", "req_nota_migracion", "req_carne_migracion", "req_pasaporte_generales"],
        passedToSupervisor: true,
        assignedCubiculo: Number(manualSelectedBooth),
        estadoTicket: 'en_proceso', // Set to en_proceso for calling queue compatibility
        timestampLlamado: new Date().toISOString()
      } as any;

      const updatedMetadata = {
        ...appMetadata,
        [uniqueId]: newMeta
      };

      await persistMetadata(updatedMetadata, { [uniqueId]: newMeta });

      // 4. Emit the calling signal to the TV screen!
      const boothLabel = getBoothDisplayName(manualSelectedBooth);
      const announcementText = `${cleanName}. Favor dirigirse al ${boothLabel}.`;
      
      const callData = {
        appId: uniqueId,
        citizenName: cleanName,
        turnCode: uniqueId,
        boothId: manualSelectedBooth,
        boothName: boothLabel,
        timestamp: Date.now(),
        announcementText
      };

      if (bcRef.current) {
        bcRef.current.postMessage({ type: 'CALL_CITIZEN', call: callData });
      }
      setLastCallEvent(callData);

      // Save call to localStorage for secondary recovery sync
      localStorage.setItem('te_extranjeria_active_call', JSON.stringify(callData));

      // 5. Clean form input states
      setManualCitizenName('');
      setManualCitizenDoc('');
      
      showStatus(`Cita manual ${uniqueId} asignada y llamada al ${boothLabel} correctamente.`, 'success');
    } catch (e) {
      console.error(e);
      showStatus("Error al realizar la asignación manual.", "error");
    } finally {
      setLoading(false);
    }
  };

  // Iniciar atención presencial del ciudadano en el cubículo
  const handleStartAttention = (appId: string) => {
    const app = appointments.find(a => a.id === appId || a.codigoTransaccion === appId);
    const meta = appMetadata[appId] || (app?.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
    if (!meta) return;

    const updatedItem: AppointmentMetadata = {
      ...meta,
      estadoTicket: 'en_atencion',
      timestampInicioAtencion: new Date().toISOString()
    };

    const incremental: Record<string, AppointmentMetadata> = { [appId]: updatedItem };
    if (app && app.codigoTransaccion && app.codigoTransaccion !== appId) {
      incremental[app.codigoTransaccion] = updatedItem;
    }

    const updatedMeta = {
      ...appMetadata,
      ...incremental
    };

    persistMetadata(updatedMeta, incremental);

    // Quitar inmediatamente el llamado en la Pantalla de Turnos y cancelar la voz/timbre en reproducción
    clearCallFromPantalla(appId);

    const citizenName = getExtranjeriaCitizenName(app);
    showStatus(`Atención iniciada con ${citizenName}. El llamado en la Pantalla de Turnos ha sido retirado.`, 'success');
  };

  // Automatically assign appointment to the active booth with the least load (load balancing)
  const handleAutoAssignToCubiculo = (appId: string) => {
    const activeBooths = booths.filter(b => b.active && !b.receso);
    if (activeBooths.length === 0) {
      const activeButInRecess = booths.filter(b => b.active && b.receso);
      if (activeButInRecess.length > 0) {
        showStatus("No se puede asignar automáticamente: Todos los cubículos activos están en receso.", "error");
        return null;
      }
      showStatus("No se puede asignar automáticamente: Todos los cubículos están deshabilitados. Por favor active un cubículo en Monitoreo o Configuración.", "error");
      return null;
    }

    // EXCLUDE BUSY BOOTHS: Prioritize booths not currently attending or calling a citizen
    const freeBooths = activeBooths.filter(b => !isCubiculoBusy(b.id));
    const candidateBooths = freeBooths.length > 0 ? freeBooths : activeBooths;

    // Count currently active appointments assigned to each booth
    const counts: Record<number, number> = {};
    candidateBooths.forEach(b => {
      counts[b.id] = 0;
    });

    Object.keys(appMetadata).forEach(id => {
      if (id.startsWith('booth_') || id === 'active_call' || id === 'booths_config') return;
      const meta = appMetadata[id];
      if (meta && meta.assignedCubiculo && meta.estadoTicket !== 'realizada' && meta.estadoTicket !== 'cancelada') {
        if (counts[meta.assignedCubiculo] !== undefined) {
          counts[meta.assignedCubiculo]++;
        }
      }
    });

    // Find candidate booth with minimum load
    let bestBooth = candidateBooths[0];
    let minCount = counts[bestBooth.id] ?? 0;

    for (let i = 1; i < candidateBooths.length; i++) {
      const b = candidateBooths[i];
      const cnt = counts[b.id] ?? 0;
      if (cnt < minCount) {
        minCount = cnt;
        bestBooth = b;
      }
    }

    handleAssignToCubiculo(appId, bestBooth.id);
    return bestBooth;
  };

  // Marcar los 3 requisitos obligatorios al mismo tiempo y asignar/despachar inmediatamente
  const handleMarkAllAndAutoAssign = (appId: string) => {
    const allDocIds = REQUISITOS_EXTRANJERIA.map(r => r.id);
    setSupervisorCheckedDocs(allDocIds);

    const activeBooths = booths.filter(b => b.active && !b.receso);
    if (activeBooths.length === 0) {
      const activeButInRecess = booths.filter(b => b.active && b.receso);
      if (activeButInRecess.length > 0) {
        showStatus("No se puede asignar automáticamente: Todos los cubículos activos están en receso.", "error");
        return;
      }
      showStatus("No se puede asignar: Todos los cubículos están deshabilitados. Por favor active un cubículo en Monitoreo o Configuración.", "error");
      return;
    }

    // EXCLUDE BUSY BOOTHS: Prioritize booths not currently attending or calling a citizen
    const freeBooths = activeBooths.filter(b => !isCubiculoBusy(b.id));
    const candidateBooths = freeBooths.length > 0 ? freeBooths : activeBooths;

    const counts: Record<number, number> = {};
    candidateBooths.forEach(b => {
      counts[b.id] = 0;
    });

    Object.keys(appMetadata).forEach(id => {
      if (id.startsWith('booth_') || id === 'active_call' || id === 'booths_config') return;
      const meta = appMetadata[id];
      if (meta && meta.assignedCubiculo && meta.estadoTicket !== 'realizada' && meta.estadoTicket !== 'cancelada') {
        if (counts[meta.assignedCubiculo] !== undefined) {
          counts[meta.assignedCubiculo]++;
        }
      }
    });

    let bestBooth = candidateBooths[0];
    let minCount = counts[bestBooth.id] ?? 0;
    for (let i = 1; i < candidateBooths.length; i++) {
      const b = candidateBooths[i];
      const cnt = counts[b.id] ?? 0;
      if (cnt < minCount) {
        minCount = cnt;
        bestBooth = b;
      }
    }

    handleAssignToCubiculo(appId, bestBooth.id);
  };

  // Trigger Ticket Call and Send to Cashier (Caja) for Payment strictly via Turn Screen
  const handleSendToCaja = (appId: string) => {
    const app = appointments.find(a => a.id === appId || a.codigoTransaccion === appId);
    const meta = appMetadata[appId] || (app?.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
    if (!meta) return;

    const updatedItem: AppointmentMetadata = {
      ...meta,
      estadoTicket: 'pagado_en_caja'
    };

    const incremental: Record<string, AppointmentMetadata> = { [appId]: updatedItem };
    if (app && app.codigoTransaccion && app.codigoTransaccion !== appId) {
      incremental[app.codigoTransaccion] = updatedItem;
    }

    const updatedMap = {
      ...appMetadata,
      ...incremental
    };

    persistMetadata(updatedMap, incremental);

    const appointmentNumber = String(app?.codigoTransaccion || app?.codigoCita || app?.id || appId).trim().toUpperCase();
    const cleanCitizenName = (app?.nombre && !isGenericPlaceholderName(app.nombre) && app.nombre !== 'Ciudadano en Atención')
      ? app.nombre
      : getExtranjeriaCitizenName(app);
    const cubiculoId = meta.assignedCubiculo;
    const boothName = getBoothDisplayName(cubiculoId);
    
    const announcementText = `${cleanCitizenName}. Favor dirigirse a la caja de pago.`;

    // Emit call strictly to the Turn Screen (pantalla de turnos)
    emitCallToPantalla({
      appId,
      codePart: appointmentNumber,
      cleanCitizenName,
      boothId: cubiculoId || 0,
      boothName,
      announcementText,
      type: 'caja',
      turnCode: appointmentNumber
    });

    showStatus(`Llamada enviada a la Pantalla de Turnos. Ciudadano enviado a la Caja de Pago (${ticketKioscoUrl}).`, 'info');
  };

  // Complete Payment/Appointment and save to Completed (Realizadas) Report
  const handleCompleteAppointment = (appId: string) => {
    const app = appointments.find(a => a.id === appId || a.codigoTransaccion === appId);
    const meta = appMetadata[appId] || (app?.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
    if (!meta) return;

    const rightNow = new Date();
    const timestampFormatted = `${rightNow.toLocaleDateString('es-ES')} ${rightNow.toLocaleTimeString('es-ES')}`;

    const updatedItem: AppointmentMetadata = {
      ...meta,
      estadoTicket: 'realizada',
      timestampCompletado: timestampFormatted,
      fechaCompletado: todayStr,
      staffResponsable: getBoothStaffName(booths.find(b => b.id === meta.assignedCubiculo)) || 'Atención Extranjería'
    };

    const incremental: Record<string, AppointmentMetadata> = { [appId]: updatedItem };
    if (app && app.codigoTransaccion && app.codigoTransaccion !== appId) {
      incremental[app.codigoTransaccion] = updatedItem;
    }

    const updatedMap = {
      ...appMetadata,
      ...incremental
    };

    persistMetadata(updatedMap, incremental);

    // Retirar llamado de la pantalla si estuviese activo
    clearCallFromPantalla(appId);

    showStatus(`Trámite finalizado con éxito para la cita ${appId}. Registro guardado en el reporte diario de atención.`, 'success');
  };

  // Filter appointments for the general table filter (matches query and filters)
  const filteredGeneralAppointments = useMemo(() => {
    const query = deferredSearchQuery.trim().toLowerCase();
    return appointments.filter((app: any) => {
      const matchesSearch = !query || getSearchText(app).includes(query);
      const matchesStatus = statusFilter === 'todos' || app.estado === statusFilter;
      const matchesDate = !dateFilter || app.fecha === dateFilter;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [appointments, deferredSearchQuery, statusFilter, dateFilter, getSearchText]);

  // Unique appointment dates for quick selection in atención
  const availableAppointmentDates = useMemo(() => {
    const dates = new Set<string>();
    appointments.forEach(app => {
      if (app.fecha && isExtranjeriaAppointment(app)) {
        dates.add(standardizeDateString(app.fecha));
      }
    });
    return Array.from(dates).sort();
  }, [appointments]);

  // Active working date for Extranjería Atención (Sala de Entrada) y Pantalla TV
  const activeAtencionDate = useMemo(() => {
    // REGLA CRÍTICA PARA PANTALLA DE TV (subRole === 'pantalla'):
    // La pantalla de TV en sala de espera NUNCA debe mostrar citas de días anteriores.
    // Su universo de atención en vivo es ESTRICTAMENTE el día de hoy (todayStr).
    if (subRole === 'pantalla') {
      return todayStr;
    }

    if (subRole === 'supervisor' && selectedCalendarDateStr) {
      return standardizeDateString(selectedCalendarDateStr);
    }
    if (atencionDateFilter) return standardizeDateString(atencionDateFilter);

    // Por defecto en la operativa diaria (Atención, Cubículos), la fecha activa es SIEMPRE HOY.
    // Si hoy no tiene citas cargadas aún, se mantiene en hoy (0 citas), NUNCA salta a ayer.
    return todayStr;
  }, [subRole, selectedCalendarDateStr, atencionDateFilter, todayStr]);

  // Dedicated universe for Atención Entrada on the active date:
  // Strictly the ordinary appointments (no slice to prevent hiding citizens) + any appointment created by the supervisor for that day
  const atencionDayUniverse = useMemo(() => {
    const targetDate = activeAtencionDate;
    const dayAppointments = appointments.filter((app: any) => {
      if (!app) return false;
      const appDate = standardizeDateString(app.fecha || '');
      const tDate = standardizeDateString(targetDate || '');
      return isExtranjeriaAppointment(app) && appDate === tDate;
    });

    const ordinary: any[] = [];
    const supervisorCreated: any[] = [];

    dayAppointments.forEach((app: any) => {
      const isSup = Boolean(
        app.creadaPorSupervisor === true || 
        app.esCupoAdicional === true || 
        app.citaEspecial === true || 
        app.esEspecial === true || 
        (app.creadoPor && String(app.creadoPor).toLowerCase().includes('supervisor'))
      );
      if (isSup) {
        supervisorCreated.push(app);
      } else {
        ordinary.push(app);
      }
    });

    // Sort ordinary appointments chronologically and by daily sequence
    ordinary.sort((a, b) => {
      if (a.numeroCitaDia && b.numeroCitaDia) return a.numeroCitaDia - b.numeroCitaDia;
      const timeA = getMinutesFromHourString(a.hora || '');
      const timeB = getMinutesFromHourString(b.hora || '');
      return timeA - timeB;
    });

    // Keep all ordinary appointments so no citizen is left un-attended (no slice)
    const ordinary56 = ordinary;

    // Combine strictly: the ordinary appointments + supervisor-created appointments of that day
    const totalUniverse = [...ordinary56, ...supervisorCreated];

    return {
      targetDate,
      ordinary56,
      supervisorCreated,
      totalUniverse
    };
  }, [appointments, activeAtencionDate]);

  // Appointments grouped by dynamic workflow queues:
  // 1. Atención View queue: Extranjería appointments of the current day (hoy) / active date
  // Strictly constrained to the active day's total universe of appointments (ordinary + supervisor-created)
  // Ensures all appointments of today are always visible in "En Sala de Entrada / Espera de Atención" for both supervisor and atención
  const queueAtencionIn = useMemo(() => {
    return atencionDayUniverse.totalUniverse.filter((app: any) => {
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      const isCancelled = meta?.estadoTicket === 'cancelada' || app?.estado === 'cancelada';
      return !isCancelled;
    });
  }, [atencionDayUniverse.totalUniverse, appMetadata]);

  // 2. Atención View processed history (already sent to supervisor) for the active day
  const queueAtencionOut = useMemo(() => {
    return atencionDayUniverse.totalUniverse.filter((app: any) => {
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      return Boolean(meta && (meta.passedToSupervisor === true || meta.hasDocuments === true));
    });
  }, [atencionDayUniverse.totalUniverse, appMetadata]);

  // Filtered queue for Atención (Sala de Entrada) by live name/passport search
  // Ultra-fast instant search (0ms) restricted strictly to the 56 ordinary + supervisor-created appointments of the day
  const filteredQueueAtencionIn = useMemo(() => {
    const q = (atencionSearchQuery || localAtencionSearchQuery).trim().toLowerCase();
    if (!q) return queueAtencionIn;
    return queueAtencionIn.filter((app: any) => getSearchText(app).includes(q));
  }, [queueAtencionIn, atencionSearchQuery, localAtencionSearchQuery, getSearchText]);

  // Secondary matches for searches when a citizen was already processed/assigned to supervisor on this day
  const atencionMatchesInOtherQueues = useMemo(() => {
    const q = (atencionSearchQuery || localAtencionSearchQuery).trim().toLowerCase();
    if (!q) return [];
    return queueAtencionOut.filter((app: any) => getSearchText(app).includes(q));
  }, [queueAtencionOut, atencionSearchQuery, localAtencionSearchQuery, getSearchText]);

  // Filtered candidates for re-attention searching
  const reatencionCandidates = useMemo(() => {
    if (!reatencionSearchQuery.trim()) return [];
    const q = reatencionSearchQuery.trim().toLowerCase();
    return atencionDayUniverse.totalUniverse.filter((app: any) => {
      if (!app) return false;
      const name = getExtranjeriaCitizenName(app).toLowerCase();
      const passport = (app.datosPersonales?.pasaporte || '').toLowerCase();
      const identification = (app.identificacion || '').toLowerCase();
      const code = String(app.id || '').slice(-4).toLowerCase();
      return name.includes(q) || passport.includes(q) || identification.includes(q) || code.includes(q);
    });
  }, [atencionDayUniverse.totalUniverse, reatencionSearchQuery]);

  // 3. Supervisor Queue: passed from atencion but NOT yet assigned a cubicle
  const queueSupervisorPending = useMemo(() => {
    return appointments.filter(app => {
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      const isExt = isExtranjeriaAppointment(app);
      
      const isSpecial = Boolean(
        app.creadaPorSupervisor === true || 
        app.esCupoAdicional === true || 
        app.citaEspecial === true || 
        app.esEspecial === true || 
        (app.creadoPor && String(app.creadoPor).toLowerCase().includes('supervisor'))
      );

      const isPassed = isSpecial || Boolean(meta && (meta.passedToSupervisor === true || meta.hasDocuments === true));
      const notAssigned = !meta || meta.assignedCubiculo === null || meta.assignedCubiculo === undefined;
      const notFinished = !meta || (meta.estadoTicket !== 'realizada' && meta.estadoTicket !== 'cancelada');
      
      // Strict: match target date (for TV screen mode subRole === 'pantalla', strictly todayStr)
      const targetDate = subRole === 'pantalla' ? todayStr : (selectedCalendarDateStr || atencionDateFilter || todayStr);
      const appDate = standardizeDateString(app.fecha || '');
      const tDate = standardizeDateString(targetDate || '');
      if (appDate !== tDate) {
        return false;
      }

      return isExt && isPassed && notAssigned && notFinished;
    });
  }, [appointments, appMetadata, subRole, selectedCalendarDateStr, atencionDateFilter, todayStr]);

  // Filtered supervisor pending list for quick search
  const filteredQueueSupervisorPending = useMemo(() => {
    const query = deferredSupervisorSearchQuery.trim().toLowerCase();
    if (!query) return queueSupervisorPending;
    return queueSupervisorPending.filter(app => getSearchText(app).includes(query));
  }, [queueSupervisorPending, deferredSupervisorSearchQuery, getSearchText]);

  // Filtered supervisor entrance hall list for quick search
  const filteredSupervisorAtencionIn = useMemo(() => {
    const query = deferredSupervisorAtencionSearchQuery.trim().toLowerCase();
    if (!query) return queueAtencionIn;
    return queueAtencionIn.filter(app => getSearchText(app).includes(query));
  }, [queueAtencionIn, deferredSupervisorAtencionSearchQuery, getSearchText]);

  // Filtered appointments for the supervisor's period dashboard
  const supervisorFilteredAppointments = useMemo(() => {
    if (supervisorPeriodFilter === 'todos') return appointments;
    const now = new Date('2026-06-05T12:00:00');
    const nowYear = now.getFullYear();
    const nowMonth = now.getMonth();
    const todayStr = '2026-06-05';

    let sundayNow = 0;
    if (supervisorPeriodFilter === 'semana') {
      const d = new Date(now);
      const day = d.getDay();
      const pDiff = d.getDate() - day;
      const sun = new Date(d.setDate(pDiff));
      sun.setHours(0,0,0,0);
      sundayNow = sun.getTime();
    }

    return appointments.filter((app: any) => {
      if (!app.fecha) return false;
      if (supervisorPeriodFilter === 'dia') {
        return app.fecha === todayStr;
      }
      const appDate = new Date(app.fecha + 'T12:00:00');
      if (isNaN(appDate.getTime())) return false;

      if (supervisorPeriodFilter === 'semana') {
        const d = new Date(appDate);
        const day = d.getDay();
        const pDiff = d.getDate() - day;
        const sun = new Date(d.setDate(pDiff));
        sun.setHours(0,0,0,0);
        return sundayNow === sun.getTime();
      }

      if (supervisorPeriodFilter === 'mes') {
        return appDate.getFullYear() === nowYear && appDate.getMonth() === nowMonth;
      }

      if (supervisorPeriodFilter === 'año') {
        return appDate.getFullYear() === nowYear;
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
    // Only consider booths that are active and not in recess
    let activeBooths = booths.filter(b => b.active && !b.receso);
    if (activeBooths.length === 0) return null;

    // Prioritize booths that are not busy attending
    const freeBooths = activeBooths.filter(b => !isCubiculoBusy(b.id));
    const candidateBooths = freeBooths.length > 0 ? freeBooths : activeBooths;
    
    const counts: Record<number, number> = {};
    candidateBooths.forEach(b => {
      counts[b.id] = 0;
    });

    Object.keys(appMetadata).forEach(id => {
      if (id.startsWith('booth_') || id === 'active_call' || id === 'booths_config') return;
      const meta = appMetadata[id];
      if (meta && meta.assignedCubiculo && meta.estadoTicket !== 'realizada' && meta.estadoTicket !== 'cancelada') {
        if (counts[meta.assignedCubiculo] !== undefined) {
          counts[meta.assignedCubiculo]++;
        }
      }
    });

    let bestBooth = candidateBooths[0];
    let minCount = counts[bestBooth.id] ?? 0;

    for (let i = 1; i < candidateBooths.length; i++) {
      const b = candidateBooths[i];
      const cnt = counts[b.id] ?? 0;
      if (cnt < minCount) {
        minCount = cnt;
        bestBooth = b;
      }
    }
    return bestBooth;
  }, [booths, appMetadata, isCubiculoBusy]);

  // 4. Cubículo View: appointments assigned to the currently selected cubicle
  const queueCubiculoAssigned = useMemo(() => {
    return appointments.filter(app => {
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      if (isStrictTodayOnly && app.fecha !== todayStr) {
        return false;
      }
      return isExtranjeriaAppointment(app) && meta && Number(meta.assignedCubiculo) === Number(selectedCubiculo) && meta.estadoTicket !== 'realizada' && meta.estadoTicket !== 'cancelada';
    });
  }, [appointments, appMetadata, selectedCubiculo, isStrictTodayOnly, todayStr]);

  // Appointments completed exclusively TODAY by the active cubicle (never yesterday or previous dates)
  const cubiculoCompletedTodayApps = useMemo(() => {
    return appointments.filter(app => {
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      if (!isExtranjeriaAppointment(app) || !meta) return false;
      const isAssigned = Number(meta.assignedCubiculo) === Number(selectedCubiculo);
      if (!isAssigned) return false;
      return isCompletedToday(app, meta, todayStr);
    });
  }, [appointments, appMetadata, selectedCubiculo, todayStr]);

  // Count of how many citizens were attended by the active cubicle/ventanilla today
  const attendedTodayCount = cubiculoCompletedTodayApps.length;

  // 5. Supervisor Analytics / Reports: appointments in selected interval, regardless of status
  const filterRealizadasByDateRange = useCallback((startStr: string, endStr: string) => {
    const stdStart = standardizeDateString(startStr);
    const stdEnd = standardizeDateString(endStr);

    return appointments.filter(app => {
      if (!isExtranjeriaAppointment(app)) return false;

      const rawDate = app.fecha || app.date || app.fechaCita || app.datosPersonales?.fecha || '';
      const stdDate = standardizeDateString(rawDate);
      if (!stdDate) return false;

      const isWithinDate = stdDate >= stdStart && stdDate <= stdEnd;
      if (!isWithinDate) return false;

      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);

      // Filter by dynamic Cubicle User/Operator if a specific one is selected
      if (reportOperatorFilter !== 'all') {
        if (!meta || meta.staffResponsable !== reportOperatorFilter) {
          return false;
        }
      }

      // Filter by Status
      if (reportStatusFilter === 'completadas') {
        const isCompleted = meta?.estadoTicket === 'realizada' || 
                            app.status === 'atendido' || 
                            app.status === 'realizada' || 
                            app.status === 'completada';
        if (!isCompleted) return false;
      } else if (reportStatusFilter === 'pendientes') {
        const isPending = (!meta?.estadoTicket || meta.estadoTicket === 'ninguno' || meta.estadoTicket === 'en_proceso' || meta.estadoTicket === 'en_atencion') &&
                          app.status !== 'cancelada' && app.status !== 'atendido' && app.status !== 'realizada' && app.status !== 'completada';
        if (!isPending) return false;
      } else if (reportStatusFilter === 'canceladas') {
        const isCancelled = meta?.estadoTicket === 'cancelada' || app.status === 'cancelada';
        if (!isCancelled) return false;
      }

      return true;
    }).sort((a, b) => {
      const dateA = standardizeDateString(a.fecha || '');
      const dateB = standardizeDateString(b.fecha || '');
      if (dateA !== dateB) return dateA.localeCompare(dateB);
      const seqA = a.numeroCitaDia || 999;
      const seqB = b.numeroCitaDia || 999;
      if (seqA !== seqB) return seqA - seqB;
      return (a.hora || '').localeCompare(b.hora || '');
    });
  }, [appointments, appMetadata, reportOperatorFilter, reportStatusFilter]);

  // Derived matching appointments and metrics for the reports view
  const matchingAppointments = useMemo(() => {
    return filterRealizadasByDateRange(reportStartDate, reportEndDate);
  }, [filterRealizadasByDateRange, reportStartDate, reportEndDate]);

  const matchingCompleted = useMemo(() => {
    return matchingAppointments.filter(app => {
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      return meta?.estadoTicket === 'realizada' || app.status === 'atendido' || app.status === 'realizada' || app.status === 'completada';
    }).length;
  }, [matchingAppointments, appMetadata]);

  const matchingPending = useMemo(() => {
    return matchingAppointments.filter(app => {
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      return (!meta?.estadoTicket || meta.estadoTicket === 'ninguno' || meta.estadoTicket === 'en_proceso' || meta.estadoTicket === 'en_atencion') &&
             app.status !== 'cancelada' && app.status !== 'atendido' && app.status !== 'realizada' && app.status !== 'completada';
    }).length;
  }, [matchingAppointments, appMetadata]);

  const matchingCancelled = useMemo(() => {
    return matchingAppointments.filter(app => {
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      return meta?.estadoTicket === 'cancelada' || app.status === 'cancelada';
    }).length;
  }, [matchingAppointments, appMetadata]);

  // Download performed (realized) appointments report - CSV Format
  const handleDownloadRealizadasCSV = () => {
    const list = matchingAppointments;
    if (list.length === 0) {
      showStatus('No se encontraron citas en el rango seleccionado para exportar el CSV.', 'info');
      return;
    }

    const headers = ['N° Secuencia (1-71)', 'Fecha', 'Hora', 'Ciudadano', 'Pasaporte/ID', 'Resolución', 'ID Transacción', 'Operador Responsable', 'Cubículo', 'Estado', 'Hora Completado'];
    const rows = list.map(app => {
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      const name = getExtranjeriaCitizenName(app);
      const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
      const cubiculoName = booths.find(b => b.id === meta?.assignedCubiculo)?.name || (meta?.assignedCubiculo ? `Cubículo ${meta.assignedCubiculo}` : 'N/A');
      const estado = meta?.estadoTicket || app.status || 'Pendiente';
      return [
        app.numeroCitaDia ? `N° ${app.numeroCitaDia}` : 'N/D',
        app.fecha,
        app.hora,
        name,
        passport,
        app.resolucion || app.datosPersonales?.numeroResolucion || 'N/D',
        app.id,
        meta?.staffResponsable || 'N/D',
        cubiculoName,
        estado.toUpperCase(),
        meta?.timestampCompletado || 'N/D'
      ];
    });

    const filterText = reportOperatorFilter !== 'all' 
      ? `_Operador_${reportOperatorFilter.replace(/\s+/g, '_')}` 
      : '';
    const statusText = reportStatusFilter !== 'all' ? `_${reportStatusFilter}` : '';

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Extranjeria_Citas_${reportStartDate}_a_${reportEndDate}${statusText}${filterText}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showStatus(`Reporte CSV exportado con éxito (${list.length} citas).`, 'success');
  };

  // Download performed (realized) appointments report - PDF Format using jsPDF helper
  const handleDownloadRealizadasPDF = () => {
    try {
      const list = matchingAppointments;
      if (list.length === 0) {
        showStatus(`No se encontraron citas de Extranjería en el rango seleccionado (${reportStartDate} al ${reportEndDate}).`, 'info');
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
        doc.setFontSize(8);
        doc.setFont('Helvetica', 'normal');
        doc.text('DIRECCIÓN NACIONAL DE CEDULACIÓN - EXTRANJERÍA', pageW - 95, currentY + 6.5);

        // Report Header Section
        currentY += 16;
        doc.setTextColor(15, 23, 42);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(11);
        
        let titleText = 'REPORTE OFICIAL DE CITAS DE EXTRANJERÍA';
        if (reportStatusFilter === 'completadas') titleText = 'REPORTE DE CITAS ATENDIDAS Y COMPLETADAS - EXTRANJERÍA';
        else if (reportStatusFilter === 'pendientes') titleText = 'REPORTE DE CITAS PROGRAMADAS / PENDIENTES - EXTRANJERÍA';
        else if (reportStatusFilter === 'canceladas') titleText = 'REPORTE DE CITAS CANCELADAS - EXTRANJERÍA';
        else titleText = 'REPORTE GENERAL DE CITAS (TODOS LOS ESTADOS) - EXTRANJERÍA';

        if (reportOperatorFilter !== 'all') {
          titleText += ` (OPERADOR: ${reportOperatorFilter.toUpperCase()})`;
        }
        doc.text(titleText, 10, currentY);

        currentY += 5;
        doc.setFont('Helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Control Operativo de Supervisor de Extranjería - Sede Principal Ancón', 10, currentY);

        currentY += 5;
        doc.text(`Intervalo: Del ${reportStartDate} al ${reportEndDate}  |  Emisión: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, 10, currentY);

        currentY += 4;
        doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
        doc.setLineWidth(0.8);
        doc.line(10, currentY, pageW - 10, currentY);
        currentY += 8;
      };

      drawHeader();

      // Summary Statistics box counting statuses
      const totalCount = list.length;
      const completedCount = list.filter(app => {
        const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
        return meta?.estadoTicket === 'realizada' || app.status === 'atendido' || app.status === 'realizada' || app.status === 'completada';
      }).length;
      const cancelledCount = list.filter(app => {
        const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
        return meta?.estadoTicket === 'cancelada' || app.status === 'cancelada';
      }).length;
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
      doc.text(`• Total Citas en Reporte: ${totalCount}  |  Atendidas: ${completedCount}  |  Programadas/Pendientes: ${pendingCount}  |  Canceladas: ${cancelledCount}`, 15, currentY + 11);
      doc.text(`• Intervalo de Selección: ${reportStartDate} al ${reportEndDate}`, 15, currentY + 15);
      doc.text(`• Filtro de Estado: ${reportStatusFilter.toUpperCase()}`, pageW - 85, currentY + 11);
      doc.text(`• Casilleros Activos: ${activeBoothsCount} puestos`, pageW - 85, currentY + 15);

      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(15, 23, 42);
      doc.text('• CONVENCIONES: ', 15, currentY + 20.5);
      doc.setFont('Helvetica', 'normal');
      doc.setTextColor(71, 85, 105);
      doc.text('ATENDIDO (Completada con éxito) | PENDIENTE (En agenda / espera) | CANCELADA (Inasistencia o rechazo)', 46, currentY + 20.5);
      
      currentY += 32;

      // Table Headers
      const drawTableHead = (y: number) => {
        doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
        doc.rect(10, y, pageW - 20, 7, 'F');
        
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        
        doc.text('ID / N°', 12, y + 4.8);
        doc.text('FECHA / HORA', 32, y + 4.8);
        doc.text('CIUDADANO EXTRANJERO', 65, y + 4.8);
        doc.text('PASAPORTE / RES', 120, y + 4.8);
        doc.text('CUBÍCULO / OPERADOR', 152, y + 4.8);
        doc.text('ESTADO', 188, y + 4.8);
      };

      drawTableHead(currentY);
      currentY += 7;

      // Render Appointments in the range
      list.forEach((app, index) => {
        const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
        if (currentY > 250) {
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

        const dp = app.datosPersonales || {};
        const name = getExtranjeriaCitizenName(app);
        const nameShort = name.length > 28 ? name.slice(0, 26) + '...' : name;
        const passport = dp.pasaporte || app.identificacion || 'N/D';
        const resolucion = app.resolucion || dp.numeroResolucion || '';
        const passOrRes = resolucion ? `${passport} (${resolucion.slice(0, 10)})` : passport;
        const labelPassport = passOrRes.length > 18 ? passOrRes.slice(0, 16) + '...' : passOrRes;
        const cubiculoName = booths.find(b => b.id === meta?.assignedCubiculo)?.name || (meta?.assignedCubiculo ? `C.${meta.assignedCubiculo}` : 'Sin Asignar');
        const staffName = meta?.staffResponsable || 'Sin Asignar';
        const cubStaff = `${cubiculoName} / ${staffName}`.length > 20 ? `${cubiculoName} / ${staffName}`.slice(0, 18) + '...' : `${cubiculoName} / ${staffName}`;

        const estado = (meta?.estadoTicket || app.status || 'Pendiente').toUpperCase();
        const seqStr = app.numeroCitaDia ? `#${app.numeroCitaDia}` : (app.id.length > 10 ? app.id.slice(0, 8) + '...' : app.id);
        const fechaHora = `${app.fecha || ''} ${app.hora || ''}`.trim();

        doc.text(seqStr, 12, currentY + 5);
        doc.text(fechaHora, 32, currentY + 5);
        doc.text(nameShort.toUpperCase(), 65, currentY + 5);
        doc.text(labelPassport, 120, currentY + 5);
        doc.text(cubStaff, 152, currentY + 5);
        
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
        doc.text(estado, 188, currentY + 5);

        doc.setDrawColor(241, 245, 249);
        doc.setLineWidth(0.1);
        doc.line(10, currentY + 8, pageW - 10, currentY + 8);

        currentY += 8;
      });

      const filterText = reportOperatorFilter !== 'all' 
        ? `_Operador_${reportOperatorFilter.replace(/\s+/g, '_')}` 
        : '';
      const statusText = reportStatusFilter !== 'all' ? `_${reportStatusFilter}` : '';
      doc.save(`reporte_extranjeria_${reportStartDate}_a_${reportEndDate}${statusText}${filterText}.pdf`);
      showStatus(`Reporte PDF generado y descargado con éxito (${list.length} citas).`, 'success');
    } catch (err: any) {
      console.error('Error generating PDF report:', err);
      showStatus('Error al generar el archivo PDF: ' + (err?.message || 'Error desconocido'), 'error');
    }
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
      {forceSubRole !== 'pantalla' && (
        (currentRole === 'super' || currentRole === 'extranjeria') ? (
          <div className="bg-slate-900 border border-slate-850 p-1.5 rounded-xl flex flex-wrap gap-2 items-center justify-between shadow-xl">
            <div className="flex items-center gap-2.5 px-3 py-1.5">
              <Boxes className="w-5 h-5 text-amber-500" />
              <div className="text-left">
                <span className="text-[9px] font-black tracking-widest text-amber-500/90 uppercase block">Estaciones Operativas de Extranjería</span>
                <span className="text-xs font-bold text-slate-200">Seleccione la estación o perfil de trabajo:</span>
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
                <span>Supervisor</span>
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
                <span>Atención (Entrada)</span>
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
                <span>Cubículo (Ventanilla)</span>
              </button>

              {subRole !== 'atencion' && subRole !== 'cubiculo' && (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => { setSubRole('pantalla'); setSelectedAppForCheck(null); setSelectedAppForSupervisor(null); }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer ${
                      subRole === 'pantalla'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-slate-950/60 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    <Tv className="w-4 h-4" />
                    <span>Pantalla de Turnos</span>
                  </button>

                  <a
                    href="/tv/extranjeria"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition cursor-pointer bg-slate-950/80 hover:bg-slate-850 text-emerald-400 hover:text-emerald-300 border border-emerald-500/30 shadow-sm"
                    title="Abrir la Pantalla de Turnos en una nueva pestaña (ideal para monitores de TV de sala de espera)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Abrir TV 📺</span>
                  </a>

                  <button
                    type="button"
                    onClick={copyTvLink}
                    className="px-2.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer bg-slate-950/80 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800"
                    title="Copiar enlace de TV directo (/tv/extranjeria) al portapapeles"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Copiar Link</span>
                  </button>
                </div>
              )}
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
            <div className="flex items-center gap-2 self-start md:self-auto shrink-0 flex-wrap">
              {currentRole !== 'extranjeria_atencion' && currentRole !== 'extranjeria_cubiculo' && (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      if (subRole === 'pantalla') {
                        if ((currentRole as string) === 'extranjeria_supervisor') setSubRole('supervisor');
                        else if ((currentRole as string) === 'extranjeria_atencion') setSubRole('atencion');
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

                  <a
                    href="/tv/extranjeria"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-slate-950 border border-slate-800 hover:border-emerald-500/40 text-emerald-400 hover:text-emerald-300 font-black text-[10px] uppercase py-1.5 px-2.5 rounded-lg transition cursor-pointer select-none flex items-center gap-1"
                    title="Abrir en ventana independiente para TV"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Abrir en TV</span>
                  </a>

                  <button
                    type="button"
                    onClick={copyTvLink}
                    className="bg-slate-950 border border-slate-800 hover:border-amber-500/40 text-slate-300 hover:text-white font-black text-[10px] uppercase py-1.5 px-2.5 rounded-lg transition cursor-pointer select-none flex items-center gap-1"
                    title="Copiar link directo de TV (/tv/extranjeria)"
                  >
                    <Download className="w-3 h-3 text-amber-400" />
                    <span>Link</span>
                  </button>
                </>
              )}
              <div className="bg-amber-500/20 px-3 py-1.5 border border-amber-500/30 rounded-lg text-amber-400 font-mono text-[10px] uppercase font-bold tracking-wider select-none">
                🔴 Estación Activa
              </div>
            </div>
          </div>
        )
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
            <button
              type="button"
              onClick={() => setSupervisorTab('configuracion')}
              className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                supervisorTab === 'configuracion'
                  ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                  : 'border-transparent text-slate-450 hover:text-slate-250 hover:bg-slate-900/40'
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Configuración (Casilleros & Horarios) ⚙️</span>
            </button>
            <button
              type="button"
              onClick={() => setSupervisorTab('reportes')}
              className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                supervisorTab === 'reportes'
                  ? 'border-amber-500 text-amber-500 bg-amber-500/5'
                  : 'border-transparent text-slate-450 hover:text-slate-250 hover:bg-slate-900/40'
              }`}
            >
              <FileText className="w-3.5 h-3.5 text-amber-500" />
              <span>Reportes de Atención 📊</span>
            </button>
            <button
              type="button"
              onClick={() => setSupervisorTab('cola_cubiculos')}
              className={`px-5 py-3 text-xs font-black uppercase tracking-wider border-b-2 transition whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                supervisorTab === 'cola_cubiculos'
                  ? 'border-emerald-500 text-emerald-500 bg-emerald-500/5'
                  : 'border-transparent text-slate-450 hover:text-slate-250 hover:bg-slate-900/40'
              }`}
            >
              <Users className="w-3.5 h-3.5 text-emerald-500" />
              <span>Monitoreo de Cubículos 👥</span>
            </button>
          </div>

          {supervisorTab === 'flujo' && (
            <div className="space-y-6 animate-fade-in">
              
              {/* TOP STATUS BAR: CASILLEROS & HORARIOS RESUMEN CON ACCESO A CONFIGURACIÓN */}
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md">
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      <Building2 className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <span className="text-slate-400 font-bold uppercase text-[9.5px] block">Casilleros de Atención</span>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-black text-amber-300 text-xs">{activeBoothsCount} de {booths.length} Abiertos</span>
                        <span className="text-slate-400 text-[10.5px]">({booths.filter(b => b.active).map(b => b.name).join(', ')})</span>
                        {booths.filter(b => !b.active).length > 0 && (
                          <span className="text-rose-300 text-[9.5px] font-mono font-bold bg-rose-950/80 border border-rose-800/80 px-2 py-0.5 rounded">
                            🚫 Inactivos: {booths.filter(b => !b.active).map(b => `${b.name} (${b.disabledBy || 'Supervisor'})`).join(', ')}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="hidden md:block w-px h-7 bg-slate-800" />
                  <div className="flex items-center gap-2.5">
                    <span className="p-2 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      <Clock className="w-4 h-4" />
                    </span>
                    <div className="text-left">
                      <span className="text-slate-400 font-bold uppercase text-[9.5px] block">Control Horarios & Cupos</span>
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-slate-200 text-xs">{horaInicio} - {horaFin}</span>
                        <span className="text-slate-400 text-[10.5px]">({capacidad} cupo(s) cada {intervalo} min)</span>
                      </div>
                    </div>
                  </div>
                </div>


              </div>

              {/* ASIGNACIÓN MANUAL DIRECTA (Walk-ins / Entrada Directa) */}
              <div className="bg-slate-950 rounded-xl border-2 border-amber-500/40 p-5 space-y-4 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 px-3 py-1 text-[9px] font-mono font-black tracking-widest text-amber-300 bg-amber-950/90 border-l border-b border-amber-500/30 uppercase rounded-bl-lg">
                  MÓDULO DE EMISIÓN DE TURNOS
                </div>
                
                <div className="space-y-1 text-left pb-3 border-b border-slate-900">
                  <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                    <UserPlus className="w-4 h-4 text-amber-500" />
                    <span>Asignación Manual de Turno (Entrada Directa / Sin Cita Previa)</span>
                  </h4>
                  <p className="text-[9.5px] text-slate-400 font-bold uppercase">
                    Utilice este formulario para registrar y llamar ciudadanos directamente a un cubículo de extranjería (ideal si inician sin citas anteriores)
                  </p>
                </div>

                <form onSubmit={handleCreateAndCallManualAppointment} className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
                  <div className="md:col-span-4 space-y-1.5 text-left">
                    <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-300 block">
                      Nombre Completo del Ciudadano
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. Juan Manuel Pérez"
                      value={manualCitizenName}
                      onChange={(e) => setManualCitizenName(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition"
                    />
                  </div>

                  <div className="md:col-span-2 space-y-1.5 text-left">
                    <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-300 block">
                      Pasaporte / Cédula
                    </label>
                    <input
                      type="text"
                      placeholder="Ej. N-123456"
                      value={manualCitizenDoc}
                      onChange={(e) => setManualCitizenDoc(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-600 outline-none transition"
                    />
                  </div>

                  <div className="md:col-span-3 space-y-1.5 text-left">
                    <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-300 block">
                      Trámite de Extranjería
                    </label>
                    <select
                      value={manualTramiteType}
                      onChange={(e) => setManualTramiteType(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition cursor-pointer"
                    >
                      <option value="ext_primera_vez">Carné de residente permanente (1ra Vez)</option>
                      <option value="ext_renovacion">Renovación de carné extranjero</option>
                      <option value="ext_entrega">Entrega de carné permanente</option>
                      <option value="ext_cedulacion">Trámite de Cédula de Extranjería</option>
                    </select>
                  </div>

                  <div className="md:col-span-3 space-y-1.5 text-left">
                    <label className="text-[9.5px] font-black uppercase tracking-wider text-slate-300 block">
                      Asignar y Llamar a Cubículo
                    </label>
                    <div className="flex gap-2">
                      <select
                        value={manualSelectedBooth}
                        onChange={(e) => setManualSelectedBooth(e.target.value)}
                        className="flex-1 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-lg px-3 py-2 text-xs text-white outline-none transition cursor-pointer"
                      >
                        <option value="">-- Cubículo --</option>
                        {booths.filter(b => b.active).map(b => (
                          <option key={b.id} value={b.id}>{b.name}</option>
                        ))}
                      </select>

                      <button
                        type="submit"
                        disabled={loading}
                        className="bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase px-4.5 py-2 rounded-lg transition shrink-0 flex items-center gap-1 cursor-pointer disabled:opacity-50"
                        title="Registra el turno y lo llama inmediatamente en la TV del lobby"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>Llamar 📺</span>
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* OUTSTANDING CITATIONS FOR CUBICLE ASSIGNMENT */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-900 gap-3">
                  <div className="space-y-0.5 text-left">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                        <Sliders className="w-4 h-4 text-amber-500" />
                        <span>Bandeja de Asignación por Supervisor</span>
                      </h4>
                      <span className="flex items-center gap-1 text-[9px] text-emerald-400 font-mono font-bold bg-emerald-950/50 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> Sincronizado en Vivo
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-450 font-bold uppercase">Citas verificadas por Atención en espera de cubículo habilitado</p>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        fetchAppointments();
                        fetchServerMetadata();
                        showStatus('Flujo de citas y estados sincronizados con el servidor.', 'info');
                      }}
                      className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-800 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-md transition flex items-center gap-1.5 cursor-pointer shadow-sm"
                      title="Forzar sincronización inmediata con el servidor"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 text-amber-500 ${loading ? 'animate-spin' : ''}`} />
                      <span>Sincronizar Flujo 🔄</span>
                    </button>

                    <span className="text-xs font-mono font-black px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-amber-400">
                      {queueSupervisorPending.length} Pendiente(s)
                    </span>
                  </div>
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
                        <strong>Control Cruzado de Seguridad:</strong> El Supervisor de Extranjería puede certificar los 3 requisitos obligatorios con un solo clic o individualmente antes de habilitar su despacho a ventanilla.
                      </span>
                    </div>

                    {/* Checkboxes of REQUISITOS_EXTRANJERIA */}
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Re-Verificación Obligatoria (2do Control)</span>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              if (supervisorCheckedDocs.length === REQUISITOS_EXTRANJERIA.length) {
                                setSupervisorCheckedDocs([]);
                              } else {
                                setSupervisorCheckedDocs(REQUISITOS_EXTRANJERIA.map(r => r.id));
                              }
                            }}
                            className="text-[9.5px] font-black text-amber-400 hover:text-white bg-amber-950/60 hover:bg-amber-900 border border-amber-500/40 rounded px-2.5 py-1 transition cursor-pointer flex items-center gap-1"
                          >
                            <span>{supervisorCheckedDocs.length === REQUISITOS_EXTRANJERIA.length ? 'Desmarcar los 3' : 'Marcar los 3 al mismo tiempo ✓'}</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleMarkAllAndAutoAssign(selectedAppForSupervisor.id)}
                            className="text-[9.5px] font-black text-emerald-300 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 rounded px-2.5 py-1 transition cursor-pointer flex items-center gap-1.5 shadow-sm"
                            title="Marcar los 3 requisitos y asignar cubículo inmediatamente"
                          >
                            <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                            <span>Marcar los 3 y Asignar ⚡</span>
                          </button>
                        </div>
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
                        <div className="space-y-3 bg-slate-950/80 p-4 rounded-lg border border-slate-850">
                          {recommendedBooth && (
                            <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 font-mono">
                              <span>Próximo cubículo sugerido:</span>
                              <span className="text-amber-400 font-bold">{recommendedBooth.name} ({recommendedBooth.staff})</span>
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => handleMarkAllAndAutoAssign(selectedAppForSupervisor.id)}
                            className="w-full bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:via-teal-500 hover:to-emerald-600 text-white font-black text-[11px] tracking-wider uppercase py-3.5 px-4 rounded-lg transition shadow-lg shadow-emerald-950/30 flex items-center justify-center gap-2 cursor-pointer border border-emerald-500/40"
                          >
                            <CheckCheck className="w-4 h-4 text-emerald-200" />
                            <span>Marcar los 3 Requisitos y Asignar Automáticamente ⚡</span>
                          </button>
                          
                          {/* Direct Booth Selector Grid */}
                          <div className="space-y-2 pt-2 border-t border-slate-850">
                            <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">
                              O Asignar Directamente a un Cubículo:
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {booths.map(booth => {
                                if (!booth.active) {
                                  return (
                                    <div
                                      key={`quick-assign-booth-${booth.id}`}
                                      className="p-2.5 rounded-lg border border-rose-900/40 bg-slate-950/80 text-left flex flex-col justify-between gap-1 opacity-60 cursor-not-allowed select-none"
                                      title={`Deshabilitado por ${booth.disabledBy || 'Supervisión'}`}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span className="text-xs font-black text-slate-400">{booth.name}</span>
                                        <span className="text-[8px] bg-rose-950 text-rose-400 border border-rose-800/60 px-1 py-0.2 rounded font-mono font-bold">
                                          🚫 Deshabilitado
                                        </span>
                                      </div>
                                      <div className="text-[8.5px] text-rose-400/90 truncate font-mono">
                                        Por: {booth.disabledBy || 'Supervisor'}
                                      </div>
                                      <div className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">
                                        No disponible
                                      </div>
                                    </div>
                                  );
                                }

                                return (
                                  <button
                                    key={`quick-assign-booth-${booth.id}`}
                                    type="button"
                                    onClick={() => handleAssignToCubiculo(selectedAppForSupervisor.id, booth.id)}
                                    className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-850 hover:border-emerald-500/50 text-left transition flex flex-col justify-between gap-1 group cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="text-xs font-black text-white group-hover:text-emerald-400">{booth.name}</span>
                                      <span className="text-[8px] bg-emerald-950/60 text-emerald-400 border border-emerald-800/50 px-1 py-0.2 rounded font-mono font-bold">Activo</span>
                                    </div>
                                    <div className="text-[9px] text-slate-400 truncate">{booth.staff}</div>
                                    <div className="text-[8.5px] text-emerald-400 font-extrabold uppercase mt-0.5 flex items-center gap-1">
                                      <span>Asignar Aquí ⚡</span>
                                      <ArrowRight className="w-2.5 h-2.5" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-3.5 animate-fade-in bg-slate-950/80 p-4 rounded-lg border border-slate-800">
                          <div className="text-[10px] text-emerald-400 font-bold uppercase flex items-center gap-1.5 justify-center">
                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                            <span>Los 3 Requisitos han sido verificados satisfactoriamente</span>
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
                                }}
                                className="w-full mt-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-[10.5px] tracking-wider uppercase py-3 rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span>Firmar y Despachar a {recommendedBooth.name} ⚡</span>
                              </button>
                            </div>
                          ) : (
                            <div className="p-3 text-[10.5px] text-amber-400 font-bold text-center bg-amber-950/20 border border-amber-800/40 rounded space-y-1">
                              <div>⚠️ No hay cubículos habilitados disponibles</div>
                              <div className="text-[9px] text-slate-400 font-normal">Todos los cubículos han sido deshabilitados por supervisión o están en receso. Reactive un cubículo en Monitoreo o Configuración para continuar.</div>
                            </div>
                          )}

                          {/* Direct Booth Selector Grid */}
                          <div className="space-y-2 pt-2 border-t border-slate-800/80">
                            <span className="text-[9px] font-black text-slate-400 block uppercase tracking-wider">
                              O Seleccionar Cubículo Específico:
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              {booths.map(booth => {
                                if (!booth.active) {
                                  return (
                                    <div
                                      key={`assign-direct-booth-${booth.id}`}
                                      className="p-2.5 rounded-lg border border-rose-900/40 bg-slate-950/80 text-left flex flex-col justify-between gap-1 opacity-60 cursor-not-allowed select-none"
                                      title={`Deshabilitado por ${booth.disabledBy || 'Supervisión'}`}
                                    >
                                      <div className="flex items-center justify-between w-full">
                                        <span className="text-xs font-black text-slate-400">{booth.name}</span>
                                        <span className="text-[8px] bg-rose-950 text-rose-400 border border-rose-800/60 px-1 py-0.2 rounded font-mono font-bold">
                                          🚫 Deshabilitado
                                        </span>
                                      </div>
                                      <div className="text-[8.5px] text-rose-400/90 truncate font-mono">
                                        Por: {booth.disabledBy || 'Supervisor'}
                                      </div>
                                      <div className="text-[8px] text-slate-500 font-bold uppercase mt-0.5">
                                        No disponible
                                      </div>
                                    </div>
                                  );
                                }

                                const countForBooth = Object.values(appMetadata).filter(
                                  (m: any) => m && Number(m.assignedCubiculo) === booth.id && m.estadoTicket !== 'realizada' && m.estadoTicket !== 'cancelada'
                                ).length;

                                return (
                                  <button
                                    key={`assign-direct-booth-${booth.id}`}
                                    type="button"
                                    onClick={() => handleAssignToCubiculo(selectedAppForSupervisor.id, booth.id)}
                                    className="p-2.5 rounded-lg border border-slate-800 bg-slate-900/90 hover:bg-slate-850 hover:border-amber-500/50 text-left transition flex flex-col justify-between gap-1 group cursor-pointer"
                                  >
                                    <div className="flex items-center justify-between w-full">
                                      <span className="text-xs font-black text-white group-hover:text-amber-400">{booth.name}</span>
                                      <span className="text-[8.5px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                                        {countForBooth} en cola
                                      </span>
                                    </div>
                                    <div className="text-[9.5px] text-slate-400 truncate">{booth.staff}</div>
                                    <div className="text-[8.5px] text-amber-500 font-extrabold uppercase mt-0.5 flex items-center gap-1">
                                      <span>Asignar aquí</span>
                                      <ArrowRight className="w-2.5 h-2.5" />
                                    </div>
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : queueSupervisorPending.length === 0 ? (
                  <div className="space-y-4">
                    <div className="p-8 border border-dashed border-slate-850 rounded-lg text-center space-y-3 text-slate-450 bg-slate-900/20">
                      <Inbox className="w-8 h-8 mx-auto text-amber-500/80" />
                      <div className="space-y-1">
                        <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-350">Bandeja Vacía de Asignación</span>
                        <p className="text-[10px] max-w-sm mx-auto leading-relaxed text-slate-450">
                          No hay citas pendientes de asignación en este momento. Las citas verificadas por el <strong className="text-slate-300">Usuario de Atención</strong> aparecen aquí automáticamente en tiempo real.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          fetchAppointments();
                          fetchServerMetadata();
                          showStatus('Sincronizando expedientes con el servidor central...', 'info');
                        }}
                        className="bg-amber-600/20 hover:bg-amber-600/40 text-amber-300 border border-amber-500/30 text-[10px] font-black uppercase px-3 py-1.5 rounded-md transition inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Sincronizar Citas Ahora 🔄</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3.5">
                    {/* Search Input for Supervisor Pending Queue with Search Button */}
                    <div className="flex items-center gap-1.5">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          placeholder="Búsqueda rápida por Nombre, ID, Pasaporte, Trámite, Creado por..."
                          value={localSupervisorSearchQuery}
                          onChange={(e) => setLocalSupervisorSearchQuery(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              setSupervisorSearchQuery(localSupervisorSearchQuery);
                            }
                          }}
                          className="w-full bg-slate-900 border border-slate-800 rounded-md py-1.5 pl-9 pr-8 text-[11px] text-white focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-amber-500 font-medium placeholder-slate-600"
                        />
                        {(localSupervisorSearchQuery || supervisorSearchQuery) && (
                          <button
                            type="button"
                            onClick={() => {
                              setLocalSupervisorSearchQuery('');
                              setSupervisorSearchQuery('');
                            }}
                            className="absolute right-2.5 top-1.5 text-slate-500 hover:text-white text-xs font-black px-1"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => setSupervisorSearchQuery(localSupervisorSearchQuery)}
                        className="bg-amber-600 hover:bg-amber-500 text-slate-950 font-black uppercase text-[10px] px-3 py-1.5 rounded-md transition shadow-sm shrink-0 cursor-pointer"
                      >
                        Buscar
                      </button>
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
                        {filteredQueueSupervisorPending.length > 50 && (
                          <div className="p-2 mb-2 text-center bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-bold uppercase rounded-md">
                            Mostrando los primeros 50 de {filteredQueueSupervisorPending.length} expedientes. Use el buscador para refinar.
                          </div>
                        )}
                        {filteredQueueSupervisorPending.slice(0, 50).map(app => {
                          const name = getExtranjeriaCitizenName(app);
                          const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                          
                          return (
                            <div
                              key={app.id} 
                              className="w-full py-3.5 px-3 text-left transition hover:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850/30 last:border-0 rounded-lg"
                            >
                              <div 
                                onClick={() => {
                                  setSelectedAppForSupervisor(app);
                                  const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
                                  const initialDocs = (meta?.checkedDocs && meta.checkedDocs.length > 0)
                                    ? meta.checkedDocs
                                    : REQUISITOS_EXTRANJERIA.map(r => r.id);
                                  setSupervisorCheckedDocs(initialDocs);
                                }}
                                className="space-y-1 text-left cursor-pointer flex-1"
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold font-mono text-amber-400">{app.id}</span>
                                  <span className="text-[8.5px] bg-amber-950/20 border border-amber-500/30 text-amber-400 uppercase font-bold px-1.5 py-0.2 rounded font-mono">
                                    Pre-verificado (Atención)
                                  </span>
                                </div>
                                <span className="text-xs font-bold text-slate-200 block uppercase">{name}</span>
                                <span className="text-[9.5px] font-mono text-slate-450 block font-semibold">PAS: {passport} | Fecha: {formatFriendlyDate(app.fecha)} ({app.hora})</span>
                                <span className="text-[9.5px] text-emerald-400 block font-semibold">Agendado por: {app.creadoPor || app.datosPersonales?.creadoPor || 'Portal del Ciudadano'}</span>
                              </div>

                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkAllAndAutoAssign(app.id);
                                  }}
                                  className="flex items-center gap-1.5 text-emerald-300 hover:text-white bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-500/40 transition font-black uppercase text-[9.5px] tracking-wider px-3 py-2 rounded-md shadow-sm cursor-pointer"
                                  title="Marcar los 3 requisitos obligatorios y asignar cubículo automáticamente"
                                >
                                  <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                                  <span>Marcar 3 y Asignar ⚡</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedAppForSupervisor(app);
                                    const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
                                    const initialDocs = (meta?.checkedDocs && meta.checkedDocs.length > 0)
                                      ? meta.checkedDocs
                                      : REQUISITOS_EXTRANJERIA.map(r => r.id);
                                    setSupervisorCheckedDocs(initialDocs);
                                  }}
                                  className="flex items-center gap-1.5 text-slate-400 hover:text-white transition font-black uppercase text-[9.5px] tracking-wider shrink-0 bg-slate-900 hover:bg-slate-850 border border-slate-800 px-3 py-2 rounded-md cursor-pointer"
                                >
                                  <span>Verificar Requisitos</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ======================================================== */}
              {/* SECCIÓN SEPARADA: EN SALA DE ENTRADA / ESPERA DE ATENCIÓN */}
              {/* ======================================================== */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl text-left">
                {/* Header with Title and Counter */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-900 gap-3">
                  <div className="space-y-0.5 text-left">
                    <div className="flex items-center gap-2">
                      <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-400" />
                        <span>En Sala de Entrada / Espera de Atención</span>
                      </h4>
                      <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-blue-300">
                        {queueAtencionIn.length} en Sala
                      </span>
                    </div>
                    <p className="text-[9.5px] text-slate-450 font-bold uppercase">
                      Ciudadanos registrados esperando revisión documental o asignación directa a cubículo
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[9.5px] text-slate-450 font-mono font-bold uppercase bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
                      Acción Rápida Disponible
                    </span>
                  </div>
                </div>

                {/* DEDICATED SEARCH BAR (BUSCADOR EXCLUSIVO PARA SALA DE ENTRADA) */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar en Sala de Entrada por Nombre, ID, Pasaporte, Creado por..."
                      value={localSupervisorAtencionSearchQuery}
                      onChange={(e) => {
                        setLocalSupervisorAtencionSearchQuery(e.target.value);
                        setSupervisorAtencionSearchQuery(e.target.value);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setSupervisorAtencionSearchQuery(localSupervisorAtencionSearchQuery);
                        }
                      }}
                      className="w-full bg-slate-900 border border-slate-800 rounded-lg py-2 pl-10 pr-9 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium transition"
                    />
                    {(localSupervisorAtencionSearchQuery || supervisorAtencionSearchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocalSupervisorAtencionSearchQuery('');
                          setSupervisorAtencionSearchQuery('');
                        }}
                        className="absolute right-3 top-2 text-slate-400 hover:text-white text-xs font-black px-1 cursor-pointer"
                        title="Limpiar búsqueda"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSupervisorAtencionSearchQuery(localSupervisorAtencionSearchQuery)}
                    className="bg-blue-600 hover:bg-blue-500 active:bg-blue-700 text-white font-black uppercase text-[11px] px-4 py-2 rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Buscar</span>
                  </button>
                </div>

                {/* Sub-counter status */}
                <div className="flex items-center justify-between text-[10px] text-slate-400 font-medium px-1">
                  <span>
                    {supervisorAtencionSearchQuery ? (
                      <>Resultados para "<strong className="text-amber-300">{supervisorAtencionSearchQuery}</strong>": <span className="font-bold text-white">{filteredSupervisorAtencionIn.length}</span> de {queueAtencionIn.length}</>
                    ) : (
                      <>Total en espera en sala de entrada: <span className="font-bold text-white">{queueAtencionIn.length}</span> ciudadanos</>
                    )}
                  </span>
                  {supervisorAtencionSearchQuery && (
                    <button
                      type="button"
                      onClick={() => {
                        setLocalSupervisorAtencionSearchQuery('');
                        setSupervisorAtencionSearchQuery('');
                      }}
                      className="text-blue-400 hover:underline font-bold"
                    >
                      Mostrar todos los {queueAtencionIn.length}
                    </button>
                  )}
                </div>

                {/* Citizens List */}
                <div className="divide-y divide-slate-850/60 max-h-[380px] overflow-y-auto pr-1">
                  {filteredSupervisorAtencionIn.length === 0 ? (
                    <div className="py-10 border border-dashed border-slate-850 rounded-lg text-center space-y-2 text-slate-500">
                      <Users className="w-7 h-7 text-slate-600 mx-auto" />
                      <span className="text-xs font-bold uppercase tracking-wider block text-slate-400">
                        {supervisorAtencionSearchQuery ? 'Sin coincidencias en Sala de Entrada' : 'No hay ciudadanos en Sala de Entrada'}
                      </span>
                      <p className="text-[10px] max-w-xs mx-auto leading-relaxed">
                        {supervisorAtencionSearchQuery
                          ? `No se encontró ningún ciudadano con "${supervisorAtencionSearchQuery}". Intente con otro nombre o pasaporte.`
                          : 'No hay ciudadanos en sala de entrada esperando en este momento.'}
                      </p>
                      {supervisorAtencionSearchQuery && (
                        <button
                          type="button"
                          onClick={() => {
                            setLocalSupervisorAtencionSearchQuery('');
                            setSupervisorAtencionSearchQuery('');
                          }}
                          className="text-[10px] bg-slate-900 border border-slate-800 text-slate-300 hover:text-white px-3 py-1 rounded-md font-bold"
                        >
                          Limpiar Búsqueda
                        </button>
                      )}
                    </div>
                  ) : (
                    <>
                      {filteredSupervisorAtencionIn.map(app => {
                        const name = getExtranjeriaCitizenName(app);
                        const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                        const subTramiteName = app.subTramite || app.tramite || 'Atención Extranjería';

                        return (
                          <div
                            key={`supervisor-sala-${app.id}`}
                            className="py-3 px-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition hover:bg-slate-900/40 rounded-lg border-b border-slate-850/30 last:border-0"
                          >
                            <div className="space-y-1 text-left flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-xs font-mono font-black text-amber-400">{app.id}</span>
                                <span className="text-[8.5px] bg-blue-950/60 text-blue-300 border border-blue-800/60 uppercase font-black px-2 py-0.5 rounded font-mono">
                                  Sala de Entrada
                                </span>
                                {((appMetadata[app.id]?.passedToSupervisor) || (app.codigoTransaccion && appMetadata[app.codigoTransaccion]?.passedToSupervisor)) && (
                                  <span className="text-[8.5px] bg-emerald-950/60 text-emerald-300 border border-emerald-800/60 uppercase font-black px-2 py-0.5 rounded font-mono">
                                    En Supervisor ✓
                                  </span>
                                )}
                                {app.creadaPorSupervisor && (
                                  <span className="text-[8px] bg-purple-950/60 text-purple-300 border border-purple-800/60 uppercase font-bold px-1.5 py-0.5 rounded font-mono">
                                    Cupo Especial
                                  </span>
                                )}
                              </div>
                              <span className="text-xs font-bold text-slate-200 block uppercase truncate">
                                {name}
                              </span>
                              <div className="flex items-center gap-3 text-[10px] text-slate-450 font-mono flex-wrap">
                                <span>PAS: <strong className="text-slate-300">{passport}</strong></span>
                                <span>Hora: <strong className="text-slate-300">{app.hora}</strong></span>
                                <span className="text-slate-500">|</span>
                                <span className="text-slate-400 font-sans truncate">{subTramiteName}</span>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                type="button"
                                onClick={() => handleMarkAllAndAutoAssign(app.id)}
                                className="flex items-center gap-1.5 text-emerald-300 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 transition font-black uppercase text-[10px] tracking-wider px-3 py-2 rounded-md cursor-pointer shadow-sm"
                                title="Marcar los 3 requisitos y asignar cubículo inmediatamente"
                              >
                                <Zap className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />
                                <span>Marcar 3 y Asignar ⚡</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleSubmitVerification(app.id)}
                                className="flex items-center gap-1 text-blue-300 hover:text-white bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 transition font-black uppercase text-[10px] tracking-wider px-3 py-2 rounded-md cursor-pointer shadow-sm"
                                title="Dar paso inmediato a la bandeja del supervisor"
                              >
                                <Send className="w-3.5 h-3.5 text-blue-400" />
                                <span>Dar Paso a Supervisor ⏩</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </>
                  )}
                </div>
              </div>



            </div>
          )}

          {supervisorTab === 'cola_cubiculos' && (
            <div className="space-y-6 animate-fade-in text-slate-100">
              
              {/* Header */}
              <div className="bg-slate-900 border border-slate-800 p-6 rounded-2xl space-y-3 text-left shadow-xl">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-500/30 flex items-center justify-center shrink-0">
                    <Tv className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-base font-black uppercase text-white tracking-wider font-sans">
                      Tablero de Monitoreo de Colas & Atenciones en Cubículos 👥
                    </h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      Supervise en tiempo real el estado de atención de cada cubículo, quién lo está atendiendo actualmente, quién está en cola de espera para ese cubículo y el historial de ciudadanos atendidos hoy.
                    </p>
                  </div>
                </div>
              </div>

              {/* Status statistics grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-left">
                  <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">Cubículos Activos</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-white">{booths.filter(b => b.active).length}</span>
                    <span className="text-xs font-bold text-slate-500">de {booths.length} configurados</span>
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-left">
                  <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">Ciudadanos En Atención Activa</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-emerald-400">
                      {appointments.filter(app => appMetadata[app.id]?.estadoTicket === 'en_atencion').length}
                    </span>
                    <span className="text-xs font-bold text-slate-500">en ventanilla</span>
                  </div>
                </div>
                <div className="bg-slate-950 p-4 rounded-xl border border-slate-850 text-left">
                  <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block">Pendientes en Cola de Cubículos</span>
                  <div className="flex items-baseline gap-2 mt-1">
                    <span className="text-2xl font-black text-amber-400">
                      {appointments.filter(app => {
                        const meta = appMetadata[app.id];
                        return meta && meta.assignedCubiculo && (meta.estadoTicket === 'llamando' || meta.estadoTicket === 'asignada');
                      }).length}
                    </span>
                    <span className="text-xs font-bold text-slate-500">esperando llamado</span>
                  </div>
                </div>
              </div>

              {/* PANEL GENERAL DE REATENCIÓN DE CITAS (SOLO SUPERVISOR) */}
              <div className="bg-slate-900 border border-slate-800 p-5 rounded-2xl space-y-4 text-left shadow-xl">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-amber-950/80 border border-amber-500/30 flex items-center justify-center shrink-0">
                    <RefreshCw className="w-4 h-4 text-amber-400" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black uppercase text-white tracking-wider">
                      Módulo de Reasignación & Reatención de Citas 🔄
                    </h4>
                    <p className="text-[10.5px] text-slate-400 font-bold uppercase tracking-wider font-mono">
                      Busque cualquier ciudadano atendido o asignado hoy para re-enviarlo a reatención en cualquier cubículo activo
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                  <div className="space-y-1.5 md:col-span-2">
                    <label className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                      Buscar Ciudadano (Nombre, Cédula, Pasaporte o Turno)
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder="Buscar por Nombre, Pasaporte, Cédula o número de Turno..."
                        value={reatencionSearchQuery}
                        onChange={(e) => setReatencionSearchQuery(e.target.value)}
                        className="w-full text-xs bg-slate-950 border border-slate-800 text-white rounded-lg pl-3 pr-10 py-2.5 focus:outline-none focus:border-amber-500 font-bold"
                      />
                      {reatencionSearchQuery && (
                        <button
                          onClick={() => setReatencionSearchQuery("")}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs font-bold font-mono"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 font-semibold block">
                      Total de citas hoy: {atencionDayUniverse.totalUniverse.length}
                    </span>
                  </div>
                </div>

                {reatencionSearchQuery.trim() && (
                  <div className="border border-slate-850 rounded-xl bg-slate-950/50 p-3 space-y-2 max-h-[250px] overflow-y-auto">
                    {reatencionCandidates.length > 0 ? (
                      reatencionCandidates.map((app: any) => {
                        const name = getExtranjeriaCitizenName(app);
                        const appCode = String(app?.id || '').slice(-4).toUpperCase();
                        const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
                        const currentStatus = meta?.estadoTicket || 'ninguno';
                        const currentBoothName = meta?.assignedCubiculo ? (booths.find(b => b.id === meta.assignedCubiculo)?.name || `C.${meta.assignedCubiculo}`) : 'Ninguno';
                        
                        let badgeBg = 'bg-slate-900 border-slate-800 text-slate-400';
                        let labelText = 'Sin iniciar';
                        if (currentStatus === 'realizada') {
                          badgeBg = 'bg-emerald-950 border-emerald-900 text-emerald-400';
                          labelText = 'Completado';
                        } else if (currentStatus === 'en_atencion') {
                          badgeBg = 'bg-blue-950 border-blue-900 text-blue-400';
                          labelText = 'En Ventanilla';
                        } else if (currentStatus === 'en_proceso') {
                          badgeBg = 'bg-amber-950 border-amber-900 text-amber-400';
                          labelText = 'Llamando/En Cola';
                        } else if (currentStatus === 'pagado_en_caja') {
                          badgeBg = 'bg-purple-950 border-purple-900 text-purple-400';
                          labelText = 'Pagando en Caja';
                        }

                        return (
                          <div key={`reatencion-candidate-${app.id}`} className="bg-slate-900 border border-slate-850 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                            <div className="min-w-0 text-left space-y-1">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[10px] font-mono font-black text-amber-500 bg-slate-950 border border-slate-850 px-1.5 py-0.5 rounded shrink-0">
                                  E-{appCode}
                                </span>
                                <h5 className="text-[12px] font-black text-white uppercase truncate max-w-[200px] leading-none mt-0.5">{name}</h5>
                                <span className={`text-[8.5px] border font-black px-1.5 py-0.2 rounded uppercase shrink-0 ${badgeBg}`}>
                                  {labelText}
                                </span>
                                {meta?.reatencion && (
                                  <span className="text-[8.5px] bg-red-950 border border-red-900 text-red-400 font-black px-1.5 py-0.2 rounded uppercase shrink-0 animate-pulse">
                                    Reatención Activa
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-500 font-semibold pl-0.5">
                                ID: <span className="text-slate-400">{app.identificacion || 'N/D'}</span> | Pasaporte: <span className="text-slate-400">{app.datosPersonales?.pasaporte || 'N/D'}</span> | Última estación: <span className="text-slate-400">{currentBoothName}</span>
                              </p>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <label className="text-[9px] text-slate-450 font-black uppercase tracking-wider hidden sm:inline">Reasignar a:</label>
                              <select
                                className="text-xs bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-slate-200 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val) {
                                    handleReassignForReattention(app.id, Number(val));
                                    e.target.value = ""; // reset input
                                  }
                                }}
                                defaultValue=""
                              >
                                <option value="" disabled>Seleccionar cubículo...</option>
                                {booths.filter(booth => booth.active).map(booth => (
                                  <option key={`general-reassign-booth-${app.id}-${booth.id}`} value={booth.id}>
                                    {booth.name} ({getBoothStaffName(booth)})
                                  </option>
                                ))}
                              </select>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-xs text-slate-500 italic font-bold">
                        No se encontró ningún ciudadano con "{reatencionSearchQuery}" asignado hoy
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Main Cubicles Status Board */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {booths.map(b => {
                  const operator = getBoothStaffName(b);
                  
                  if (!b.active) {
                    return (
                      <div key={`supervisor-monitor-booth-${b.id}`} className="bg-slate-950 border-2 border-rose-900/60 rounded-2xl p-5 space-y-4 text-left shadow-xl relative overflow-hidden">
                        <div className="flex items-center justify-between border-b border-rose-900/40 pb-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="text-sm font-black text-rose-300 uppercase tracking-wider">{b.name}</h4>
                              <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-2 py-0.5 rounded font-black uppercase font-mono">
                                🚫 Deshabilitado
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-400">
                              Operador asignado: <strong className="text-slate-300">{operator}</strong>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleBoothActive(b.id)}
                            className="text-[10px] font-black uppercase px-3 py-1.5 rounded-lg bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-800 transition cursor-pointer flex items-center gap-1 shadow-sm"
                            title="Habilitar este cubículo para recibir citas"
                          >
                            <span>Habilitar Cubículo 🟢</span>
                          </button>
                        </div>

                        <div className="bg-rose-950/25 border border-rose-900/40 rounded-xl p-4 space-y-2.5">
                          <div className="flex items-center gap-2 text-rose-200 text-xs font-black">
                            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                            <span>Cubículo Deshabilitado por Supervisión</span>
                          </div>
                          <div className="text-[11px] text-slate-300 space-y-1.5 font-sans">
                            <div className="flex items-center gap-1.5">
                              <span className="text-slate-400 font-medium">👤 Deshabilitado por:</span>
                              <strong className="text-amber-300 font-mono font-bold bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                                {b.disabledBy || 'Supervisor de Extranjería'}
                              </strong>
                            </div>
                            {b.disabledAt && (
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 font-medium">⏱ Hora de desactivación:</span>
                                <strong className="text-slate-200 font-mono">{b.disabledAt}</strong>
                              </div>
                            )}
                          </div>
                          <p className="text-[10px] text-rose-300/80 leading-relaxed pt-2 border-t border-rose-900/30 font-medium">
                            🔒 <strong>Protección de asignación activa:</strong> El sistema tiene bloqueada la asignación automática y manual de turnos para este cubículo. Ningún supervisor ni el algoritmo le asignará ciudadanos mientras permanezca deshabilitado.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  // Find all active appointments for this booth (not completed/realizada)
                  const assignedApps = appointments.filter(app => {
                    const meta = appMetadata[app.id];
                    return app.fecha === todayStr && meta && meta.assignedCubiculo === b.id && meta.estadoTicket !== 'realizada' && meta.estadoTicket !== 'cancelada';
                  });

                  // Current active serving (en_atencion)
                  const attendingApp = assignedApps.find(app => appMetadata[app.id]?.estadoTicket === 'en_atencion');
                  
                  // Remaining queued items
                  const waitingApps = assignedApps.filter(app => app.id !== attendingApp?.id);

                  // Historically completed appointments today for this cubicle (strictly today, never yesterday)
                  const completedApps = appointments.filter(app => {
                    const meta = appMetadata[app.id];
                    return meta && meta.assignedCubiculo === b.id && isCompletedToday(app, meta, todayStr);
                  });

                  return (
                    <div key={`supervisor-monitor-booth-${b.id}`} className="bg-slate-950 border border-slate-850 rounded-2xl p-5 space-y-5 text-left shadow-lg">
                      
                      {/* Top Header */}
                      <div className="flex items-center justify-between border-b border-slate-850 pb-3">
                        <div className="space-y-1">
                          <h4 className="text-sm font-black text-white uppercase tracking-wider">{b.name}</h4>
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                            <span className={`w-2 h-2 rounded-full ${b.receso ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                            <span>Operador: <strong className="text-slate-200">{operator}</strong></span>
                          </div>
                        </div>
                        {b.receso ? (
                          <span className="text-[10px] bg-amber-950 border border-amber-850 text-amber-400 px-2.5 py-1 rounded-md font-black uppercase tracking-wider animate-pulse">
                            En Receso ⏸
                          </span>
                        ) : (
                          <span className="text-[10px] bg-emerald-950 border border-emerald-900 text-emerald-400 px-2.5 py-1 rounded-md font-black uppercase tracking-wider">
                            Disponible 🟢
                          </span>
                        )}
                      </div>

                      {/* A. SECCIÓN: CIUDADANO SIENDO ATENDIDO ACTUALMENTE */}
                      <div className="space-y-2">
                        <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block font-bold">Atención en Curso</span>
                        {attendingApp ? (() => {
                          const name = getExtranjeriaCitizenName(attendingApp);
                          const appCode = attendingApp.id.slice(-4).toUpperCase();
                          return (
                            <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-4 space-y-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-black text-emerald-300 font-mono">TURNO: E-{appCode}</span>
                                <span className="bg-emerald-950 text-emerald-400 border border-emerald-500/40 text-[9px] font-black uppercase px-2 py-0.5 rounded flex items-center gap-1.5 animate-pulse">
                                  <span className="w-1 h-1 rounded bg-emerald-400" />
                                  Atendiendo
                                </span>
                              </div>
                              <div className="text-sm font-black text-white uppercase">{name}</div>
                              <div className="text-[10.5px] text-slate-400 space-y-1">
                                <p>👤 <span className="font-semibold text-slate-350">Atendido por:</span> <strong className="text-emerald-400">{operator}</strong></p>
                                <p>📺 <span className="font-semibold text-slate-350">Asignado a:</span> <strong className="text-emerald-400">{b.name}</strong></p>
                              </div>

                              {/* Reassign currently attending citizen */}
                              <div className="mt-2.5 pt-2 border-t border-emerald-500/20 flex items-center justify-between gap-2">
                                <span className="text-[9px] text-slate-400 font-bold uppercase">Reatención / Reasignar:</span>
                                <select
                                  className="text-[9px] bg-slate-950 border border-emerald-500/30 rounded px-1.5 py-0.5 text-amber-400 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    if (val) {
                                      handleReassignForReattention(attendingApp.id, Number(val));
                                      e.target.value = "";
                                    }
                                  }}
                                  defaultValue=""
                                >
                                  <option value="" disabled>Cambiar cubículo...</option>
                                  {booths.filter(booth => booth.active && booth.id !== b.id).map(booth => (
                                    <option key={`attending-reassign-opt-${attendingApp.id}-${booth.id}`} value={booth.id} className="text-slate-300">
                                      Mover a {booth.name}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          );
                        })() : (
                          <div className="bg-slate-900/40 border border-slate-850 border-dashed rounded-xl p-4 text-center text-xs text-slate-500 italic font-bold">
                            Sin ciudadano en atención en este momento
                          </div>
                        )}
                      </div>

                      {/* B. SECCIÓN: COLA DE ESPERA EN CUBÍCULO */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block font-bold">Cola de Espera</span>
                          <span className="text-[10px] font-mono font-bold bg-slate-900 border border-slate-850 text-slate-300 px-2 py-0.2 rounded">
                            {waitingApps.length} esperando
                          </span>
                        </div>

                        {waitingApps.length > 0 ? (
                          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                            {waitingApps.map(app => {
                              const name = getExtranjeriaCitizenName(app);
                              const appCode = app.id.slice(-4).toUpperCase();
                              return (
                                <div key={`supervisor-monitor-queue-${app.id}`} className="bg-slate-900/60 border border-slate-850 rounded-lg p-3 flex items-center justify-between gap-3 shadow-sm hover:border-slate-800 transition">
                                  <div className="min-w-0 flex-1 text-left space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[10px] font-mono font-black text-amber-500 bg-slate-950 border border-slate-850 px-1.5 py-0.2 rounded">
                                        E-{appCode}
                                      </span>
                                      <h6 className="text-[11.5px] font-black text-slate-200 uppercase truncate leading-none mt-0.5">{name}</h6>
                                    </div>
                                    <div className="text-[9.5px] text-slate-500 space-y-0.5 pl-0.5">
                                      <p>Atiende: <strong className="text-slate-400">{operator}</strong> | Cubículo: <strong className="text-slate-400">{b.name}</strong></p>
                                    </div>
                                  </div>
                                  <div className="flex flex-col items-end gap-1 shrink-0">
                                    <span className="text-[8px] bg-amber-950 border border-amber-800/40 text-amber-400 font-black px-1.5 py-0.5 rounded uppercase">
                                      En Cola
                                    </span>
                                    <select
                                      className="text-[9px] bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-amber-400 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                                      onChange={(e) => {
                                        const val = e.target.value;
                                        if (val) {
                                          handleReassignForReattention(app.id, Number(val));
                                          e.target.value = "";
                                        }
                                      }}
                                      defaultValue=""
                                    >
                                      <option value="" disabled>Mover...</option>
                                      {booths.filter(booth => booth.active && booth.id !== b.id).map(booth => (
                                        <option key={`waiting-reassign-opt-${app.id}-${booth.id}`} value={booth.id} className="text-slate-300">
                                          A {booth.name}
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-slate-900/20 border border-slate-900 border-dashed rounded-xl py-3 text-center text-[11px] text-slate-600 italic">
                            Sin cola de espera asignada
                          </div>
                        )}
                      </div>

                      {/* C. SECCIÓN: HISTÓRICO DE CIUDADANOS ATENDIDOS HOY */}
                      <div className="space-y-2 pt-2 border-t border-slate-900">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] text-slate-450 font-black uppercase tracking-wider block font-bold">Atendidos Hoy</span>
                          <span className="text-[10px] font-mono font-bold bg-slate-900 border border-slate-850 text-emerald-400 px-2 py-0.2 rounded">
                            {completedApps.length} completados
                          </span>
                        </div>

                        {completedApps.length > 0 ? (
                          <div className="space-y-2 max-h-[130px] overflow-y-auto pr-1">
                            {completedApps.map(app => {
                              const name = getExtranjeriaCitizenName(app);
                              const appCode = app.id.slice(-4).toUpperCase();
                              const meta = appMetadata[app.id];
                              const attendedBy = meta?.staffResponsable || operator;
                              return (
                                <div key={`supervisor-monitor-completed-${app.id}`} className="bg-slate-900/30 border border-slate-900 rounded-lg p-2.5 flex items-center justify-between gap-3 text-xs">
                                  <div className="min-w-0 flex-1 space-y-0.5">
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[9.5px] font-mono font-bold text-slate-400">E-{appCode}</span>
                                      <h6 className="text-[11px] font-black text-slate-350 uppercase truncate leading-none">{name}</h6>
                                    </div>
                                    <div className="text-[9.5px] text-slate-500 pl-0.5">
                                      <p>Atendido por: <strong className="text-slate-400">{attendedBy}</strong> | Cubículo: <strong className="text-slate-400">{b.name}</strong></p>
                                    </div>
                                  </div>
                                  <div className="text-right shrink-0">
                                    <span className="text-[8px] bg-emerald-950 border border-emerald-900 text-emerald-400 font-black px-1.5 py-0.5 rounded uppercase block w-fit ml-auto">
                                      Listo
                                    </span>
                                    {meta?.timestampCompletado && (
                                      <span className="text-[8.5px] font-mono font-semibold text-slate-500 block mt-0.5">
                                        {meta.timestampCompletado.split(' ').pop()}
                                      </span>
                                    )}
                                    {/* Quick re-assign to any active booth */}
                                    <div className="mt-1">
                                      <select
                                        className="text-[9px] bg-slate-950 border border-slate-800 rounded px-1 py-0.5 text-amber-400 font-bold focus:outline-none focus:border-amber-500 cursor-pointer"
                                        onChange={(e) => {
                                          const val = e.target.value;
                                          if (val) {
                                            handleReassignForReattention(app.id, Number(val));
                                            e.target.value = ""; // reset
                                          }
                                        }}
                                        defaultValue=""
                                      >
                                        <option value="" disabled>🔄 Reatención</option>
                                        {booths.filter(booth => booth.active).map(booth => (
                                          <option key={`quick-reassign-opt-${app.id}-${booth.id}`} value={booth.id} className="text-slate-300">
                                            Enviar a {booth.name}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="bg-slate-900/10 rounded-xl py-2.5 text-center text-[10.5px] text-slate-600 italic">
                            No se han completado trámites en este cubículo hoy
                          </div>
                        )}
                      </div>

                    </div>
                  );
                })}
              </div>

            </div>
          )}

          {supervisorTab === 'reportes' && (
            <div className="space-y-6 animate-fade-in text-slate-100">
              
              {/* ATENCION & PERFORMANCE REPORTS (REALIZED CITATIONS DOWNLOAD) */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-5 shadow-xl text-left">
                <div className="border-b border-slate-900 pb-3 text-left">
                  <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5 font-sans">
                    <FileText className="w-4 h-4 text-amber-500" />
                    <span>Reportes de Atención de Citas Realizadas</span>
                  </h4>
                  <p className="text-[10px] text-slate-450 font-bold uppercase tracking-wider font-mono">Descargue reportes con las citas completadas de Extranjería efectivamente atendidas por rango de fechas</p>
                </div>

                {/* Natural language friendly date helper text */}
                {reportStartDate && reportEndDate && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-300 rounded-lg p-3 text-xs flex items-center gap-2.5">
                    <span className="text-base">📅</span>
                    <span className="font-mono text-left font-bold">
                      {(() => {
                        try {
                          const sParts = reportStartDate.split('-');
                          const eParts = reportEndDate.split('-');
                          const months = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
                          if (sParts.length === 3 && eParts.length === 3) {
                            const sStr = `${parseInt(sParts[2], 10)} de ${months[parseInt(sParts[1], 10) - 1]} de ${sParts[0]}`;
                            const eStr = `${parseInt(eParts[2], 10)} de ${months[parseInt(eParts[1], 10) - 1]} de ${eParts[0]}`;
                            if (reportStartDate === reportEndDate) {
                              return `Reportando el día: ${sStr}`;
                            }
                            return `Reportando desde el ${sStr} hasta el ${eStr}`;
                          }
                        } catch(e) {}
                        return `Rango de fechas seleccionado: ${reportStartDate} al ${reportEndDate}`;
                      })()}
                    </span>
                  </div>
                )}

                <div className="bg-slate-900/60 border border-slate-850 p-4 rounded-xl space-y-4">
                  {/* Date Input Range, Cubiculo, and Status Selectors */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-left">
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                        Fecha Desde
                      </label>
                      <input
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition cursor-pointer"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                        Fecha Hasta
                      </label>
                      <input
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition cursor-pointer"
                      />
                    </div>

                    {/* Predefined range buttons for friendlier experience */}
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                        Rango Rápido Amigable
                      </label>
                      <div className="grid grid-cols-3 gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            const today = new Date().toISOString().substring(0, 10);
                            setReportStartDate(today);
                            setReportEndDate(today);
                          }}
                          className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-white px-1 py-1.5 rounded text-[9px] font-mono font-bold uppercase transition cursor-pointer"
                        >
                          Hoy
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const yesterday = new Date();
                            yesterday.setDate(yesterday.getDate() - 1);
                            const yStr = yesterday.toISOString().substring(0, 10);
                            setReportStartDate(yStr);
                            setReportEndDate(yStr);
                          }}
                          className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-white px-1 py-1.5 rounded text-[9px] font-mono font-bold uppercase transition cursor-pointer"
                        >
                          Ayer
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const past = new Date();
                            past.setDate(past.getDate() - 7);
                            const pStr = past.toISOString().substring(0, 10);
                            const tStr = new Date().toISOString().substring(0, 10);
                            setReportStartDate(pStr);
                            setReportEndDate(tStr);
                          }}
                          className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-white px-1 py-1.5 rounded text-[9px] font-mono font-bold uppercase transition cursor-pointer"
                        >
                          7 Días
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const d = new Date();
                            const mStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
                            const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
                            const endMonthStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
                            setReportStartDate(mStr);
                            setReportEndDate(endMonthStr);
                          }}
                          className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-white px-1 py-1.5 rounded text-[9px] font-mono font-bold uppercase transition cursor-pointer"
                        >
                          Mes
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const y = new Date().getFullYear();
                            setReportStartDate(`${y}-01-01`);
                            setReportEndDate(`${y}-12-31`);
                          }}
                          className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-white px-1 py-1.5 rounded text-[9px] font-mono font-bold uppercase transition cursor-pointer"
                        >
                          Año
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReportStartDate("2026-01-01");
                            setReportEndDate("2026-12-31");
                          }}
                          className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-white px-1 py-1.5 rounded text-[9px] font-mono font-bold uppercase transition cursor-pointer"
                        >
                          Todo '26
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                        Operador de Ventanilla
                      </label>
                      <select
                        value={reportOperatorFilter}
                        onChange={(e) => setReportOperatorFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition font-black"
                      >
                        <option value="all">TODOS LOS OPERADORES</option>
                        {availableCubiculoUsers.map(user => {
                          const todayCount = cubiculoUserStats[user]?.today || 0;
                          const rangeCount = cubiculoUserStats[user]?.range || 0;
                          return (
                            <option key={user} value={user}>
                              {user.toUpperCase()} ({todayCount} hoy | {rangeCount} rango)
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                        Estado de las Citas
                      </label>
                      <select
                        value={reportStatusFilter}
                        onChange={(e) => setReportStatusFilter(e.target.value as any)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition font-black"
                      >
                        <option value="all">TODOS LOS ESTADOS</option>
                        <option value="completadas">SOLO ATENDIDAS / REALIZADAS</option>
                        <option value="pendientes">SOLO PROGRAMADAS / PENDIENTES</option>
                        <option value="canceladas">SOLO CANCELADAS</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800">
                    <div className="text-left space-y-1">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                        Citas en el Rango Seleccionado
                      </span>
                      <div className="flex flex-wrap items-baseline gap-2">
                        <p className="text-xl font-mono font-black text-amber-400">
                          {matchingAppointments.length} <span className="text-xs font-sans font-medium text-slate-300">citas encontradas</span>
                        </p>
                        <span className="text-xs font-mono text-slate-400">
                          ({matchingCompleted} atendidas | {matchingPending} pendientes | {matchingCancelled} canceladas)
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 w-full sm:w-auto shrink-0 justify-end">
                      <button
                        type="button"
                        onClick={handleDownloadRealizadasCSV}
                        disabled={matchingAppointments.length === 0}
                        className="flex-1 sm:flex-none bg-slate-950 hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed border border-slate-800 px-4 py-2.5 rounded text-[10px] font-black uppercase text-slate-300 flex items-center justify-center gap-1.5 cursor-pointer transition min-w-[110px]"
                      >
                        <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
                        <span>EXPORTAR CSV</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={handleDownloadRealizadasPDF}
                        disabled={matchingAppointments.length === 0}
                        className="flex-1 sm:flex-none bg-amber-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2.5 rounded text-[10px] font-black uppercase flex items-center justify-center gap-1.5 cursor-pointer shadow-md transition min-w-[120px]"
                      >
                        <Download className="w-4 h-4" />
                        <span>DESCARGAR PDF</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* INFORME DIARIO DE ATENCIONES POR USUARIO / OPERADOR */}
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-5 shadow-xl text-left">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                  <div className="space-y-0.5 text-left">
                    <h5 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-2">
                      <Users className="w-4 h-4 text-amber-500" />
                      <span>Informe Diario de Atenciones por Usuario / Operador</span>
                      <span className="bg-amber-950/80 border border-amber-500/40 text-amber-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded">
                        {availableCubiculoUsers.length} Operadores
                      </span>
                    </h5>
                    <p className="text-[10px] text-slate-400 font-semibold">
                      Registro consolidado de atenciones concluidas hoy ({todayStr}) y conteo por usuario en el rango seleccionado.
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                      <span>Total Sala Hoy: <strong>{totalTodayCompletedAllBooths}</strong> atenciones</span>
                    </div>
                    {reportOperatorFilter !== 'all' && (
                      <button
                        type="button"
                        onClick={() => setReportOperatorFilter('all')}
                        className="bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/40 text-[10px] font-black uppercase px-2.5 py-1.5 rounded-lg transition cursor-pointer"
                      >
                        Mostrar Todos ✕
                      </button>
                    )}
                  </div>
                </div>

                {/* Tarjetas de Operadores con Conteo Diario */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {availableCubiculoUsers.map(user => {
                    const stats = cubiculoUserStats[user] || { today: 0, range: 0, booths: new Set() };
                    const boothList = Array.from(stats.booths || []).join(', ') || 'Cubículo Asignado';
                    const isSelected = reportOperatorFilter === user;

                    return (
                      <div
                        key={`report-user-card-${user}`}
                        className={`p-3.5 rounded-xl border transition flex flex-col justify-between gap-3 text-left ${
                          isSelected
                            ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/30'
                            : 'bg-slate-900/60 border-slate-850 hover:border-slate-750'
                        }`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11.5px] font-black text-white uppercase truncate" title={user}>
                              {user}
                            </span>
                            <span className="text-[9px] bg-indigo-950/80 border border-indigo-800 text-indigo-300 font-mono font-bold px-1.5 py-0.2 rounded shrink-0">
                              {boothList}
                            </span>
                          </div>
                          <span className="text-[9.5px] text-slate-400 block font-medium">
                            Funcionario / Operador de Ventanilla
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-center">
                          <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                            <span className="text-[8px] text-slate-400 uppercase font-black block font-mono">Hoy</span>
                            <span className="text-base font-mono font-black text-emerald-400">
                              {stats.today}
                            </span>
                          </div>
                          <div className="bg-slate-950/80 p-2 rounded border border-slate-800">
                            <span className="text-[8px] text-slate-400 uppercase font-black block font-mono">En Rango</span>
                            <span className="text-base font-mono font-black text-amber-400">
                              {stats.range}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setReportOperatorFilter(isSelected ? 'all' : user)}
                          className={`w-full py-1.5 rounded-lg text-[9.5px] font-black uppercase tracking-wider transition cursor-pointer flex items-center justify-center gap-1.5 ${
                            isSelected
                              ? 'bg-amber-500 text-slate-950 shadow-sm font-black'
                              : 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800'
                          }`}
                        >
                          <span>{isSelected ? '✓ Filtrando este Usuario' : 'Filtrar Informe 🔍'}</span>
                        </button>
                      </div>
                    );
                  })}
                </div>

                {/* TABLA PREVIA DE CITAS DEL INFORME */}
                <div className="pt-3 border-t border-slate-900 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300 font-mono">
                      Detalle de Citas del Informe ({matchingAppointments.length} resultados)
                    </span>
                    {reportOperatorFilter !== 'all' && (
                      <span className="text-[9.5px] text-amber-400 font-bold font-mono">
                        Filtrado por usuario: {reportOperatorFilter.toUpperCase()}
                      </span>
                    )}
                  </div>

                  {matchingAppointments.length === 0 ? (
                    <div className="bg-slate-900/40 border border-dashed border-slate-800 rounded-xl p-6 text-center text-slate-500 text-xs">
                      No se encontraron citas con los filtros y fechas seleccionados.
                    </div>
                  ) : (
                    <div className="max-h-[340px] overflow-y-auto border border-slate-850 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs text-slate-300">
                        <thead className="bg-slate-900 text-[9.5px] font-black uppercase text-slate-400 tracking-wider sticky top-0 border-b border-slate-850">
                          <tr>
                            <th className="py-2.5 px-3">Fecha / Hora</th>
                            <th className="py-2.5 px-3">N° Cita / Tx</th>
                            <th className="py-2.5 px-3">Ciudadano</th>
                            <th className="py-2.5 px-3">Pasaporte</th>
                            <th className="py-2.5 px-3">Cubículo</th>
                            <th className="py-2.5 px-3">Operador</th>
                            <th className="py-2.5 px-3">Estado</th>
                            <th className="py-2.5 px-3 text-right">Hora Conclusión</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-850 bg-slate-950/60 font-mono text-[11px]">
                          {matchingAppointments.slice(0, 100).map(app => {
                            const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
                            const name = getExtranjeriaCitizenName(app);
                            const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                            const boothName = booths.find(b => b.id === meta?.assignedCubiculo)?.name || (meta?.assignedCubiculo ? `Cubículo ${meta.assignedCubiculo}` : '---');
                            const op = meta?.staffResponsable || 'Sin Asignar';
                            const isDone = meta?.estadoTicket === 'realizada';

                            return (
                              <tr key={`report-row-${app.id}`} className="hover:bg-slate-900/50 transition">
                                <td className="py-2 px-3 text-slate-400">{app.fecha} ({app.hora})</td>
                                <td className="py-2 px-3 font-bold text-amber-400">{app.codigoTransaccion || app.id}</td>
                                <td className="py-2 px-3 font-sans font-bold text-white uppercase truncate max-w-[150px]">{name}</td>
                                <td className="py-2 px-3 text-slate-400">{passport}</td>
                                <td className="py-2 px-3 text-indigo-300">{boothName}</td>
                                <td className="py-2 px-3 font-sans text-slate-300 truncate max-w-[140px]">{op}</td>
                                <td className="py-2 px-3">
                                  <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded font-sans ${
                                    isDone
                                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                                      : 'bg-amber-950 text-amber-400 border border-amber-800'
                                  }`}>
                                    {isDone ? 'Atendida' : 'Pendiente'}
                                  </span>
                                </td>
                                <td className="py-2 px-3 text-right text-slate-400 font-mono text-[10px]">
                                  {meta?.timestampCompletado ? meta.timestampCompletado.split(' ').pop() : '---'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

            </div>
          )}

          {supervisorTab === 'configuracion' && (
            <div className="space-y-6 animate-fade-in text-slate-100">
              
              {/* CONFIGURATION BANNER HEADER */}
              <div className="bg-slate-950 p-5 rounded-xl border border-slate-800 space-y-3 shadow-xl">
                <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-3 bg-amber-500/10 text-amber-400 rounded-lg border border-amber-500/20">
                      <Settings className="w-6 h-6" />
                    </div>
                    <div className="text-left">
                      <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                        <span>Configuración de Extranjería</span>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Casilleros & Horarios</span>
                      </h4>
                      <p className="text-xs text-slate-400 font-semibold leading-relaxed mt-1">
                        Gestione la disponibilidad operativa de los <strong className="text-white">Casilleros de Atención</strong> (4 fijos y 4 de reserva) y regule los parámetros de la jornada oficial de citas (<strong className="text-amber-300">71 cupos reglamentarios (56 web + extras supervisor de 07:00 AM a 02:45 PM)</strong>).
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setSupervisorTab('flujo')}
                    className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-750 text-xs font-bold px-4 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer shrink-0 shadow-sm"
                  >
                    <ArrowLeft className="w-4 h-4 text-amber-400" />
                    <span>Volver a Control de Flujo</span>
                  </button>
                </div>
              </div>

              {/* GRID: CASILLEROS DE ATENCIÓN & CONTROL HORARIOS & CUPOS */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                
                {/* 1. CASILLEROS DE ATENCIÓN (CUBÍCULOS MANAGER) */}
                <div className="lg:col-span-7 space-y-6">
                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                      <div className="space-y-0.5 text-left">
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

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                      {booths.map(b => (
                        <div 
                          key={b.id} 
                          className={`p-3.5 rounded-lg border transition flex flex-col justify-between gap-3 ${
                            b.active 
                              ? 'bg-slate-900/90 border-emerald-500/40 shadow-inner' 
                              : 'bg-slate-950 border-rose-900/50'
                          }`}
                        >
                          <div className="space-y-2 text-left">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-slate-250 uppercase">{b.name}</span>
                              <div className="flex items-center gap-1.5">
                                {!b.active && (
                                  <span className="text-[8px] bg-rose-950 text-rose-300 border border-rose-800 font-mono font-bold uppercase px-1.5 py-0.2 rounded">
                                    Deshabilitado
                                  </span>
                                )}
                                <span className={`w-2.5 h-2.5 rounded-full ${b.active ? 'bg-emerald-500 animate-pulse' : 'bg-rose-600'}`} />
                              </div>
                            </div>

                            {!b.active && (
                              <div className="bg-rose-950/40 border border-rose-800/60 rounded px-2.5 py-1.5 text-[9.5px] text-rose-300 space-y-0.5 font-sans">
                                <div className="font-bold flex items-center gap-1">
                                  <span>🚫 Deshabilitado por:</span>
                                  <strong className="text-amber-300 font-mono">{b.disabledBy || 'Supervisor de Extranjería'}</strong>
                                </div>
                                {b.disabledAt && (
                                  <div className="text-[8.5px] text-slate-400 font-mono">
                                    Hora: {b.disabledAt}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* Operator / Staff dropdown selection */}
                            <div className="space-y-1 pt-0.5">
                              <label className="text-[8.5px] font-black uppercase tracking-wider text-slate-450 font-mono block">
                                Operador Asignado
                              </label>
                              <select
                                value={b.staff}
                                onChange={(e) => updateBoothStaff(b.id, e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 hover:border-slate-700 rounded px-2 py-1 text-[10px] font-mono text-white focus:outline-none focus:border-amber-500 transition cursor-pointer"
                              >
                                {b.empty && <option value="Turno de Reserva">Turno de Reserva</option>}
                                <option value="Sin Asignar">Sin Asignar</option>
                                {(Array.from(new Set(
                                  systemUsers
                                    .filter(u => {
                                      const r = String(u.role || '').toLowerCase();
                                      return r.includes('extranjeria') || r.includes('migra') || u.username === 'cubiculomigra' || r === 'super';
                                    })
                                    .map(u => String(u.nombre || ''))
                                    .filter(Boolean)
                                )) as string[])
                                .filter(name => {
                                  // Exclude old demonstration names from dropdown selection
                                  return ![
                                    "Lic. Ana Pérez", "Lic. Carlos Gómez", "Lic. María Rodríguez", "Lic. Juan Martínez",
                                    "Lic. Ana Perez", "Lic. Carlos Gomez", "Lic. Maria Rodriguez", "Lic. Juan Martinez",
                                    "Sin Asignar", "Oficial General", "Turno de Reserva"
                                  ].includes(name);
                                })
                                .map(name => (
                                  <option key={`op-select-${name}`} value={name}>
                                    {name}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="pt-1 flex items-center justify-between gap-2 flex-wrap">
                              {b.empty ? (
                                <span className="text-[8px] bg-slate-900/50 text-slate-450 border border-slate-800 font-black uppercase px-2 py-0.5 rounded">
                                  Reserva Vacía
                                </span>
                              ) : (
                                <span className="text-[8px] bg-emerald-950/40 text-emerald-400 border border-emerald-900 font-black uppercase px-2 py-0.5 rounded">
                                  Fijo Habilitado
                                </span>
                              )}
                              
                              {b.active && (
                                <button
                                  type="button"
                                  onClick={() => toggleBoothReceso(b.id)}
                                  className={`px-2 py-0.5 rounded text-[8px] font-extrabold uppercase transition cursor-pointer border ${
                                    b.receso
                                      ? 'bg-amber-950 text-amber-400 border-amber-800 animate-pulse font-bold'
                                      : 'bg-emerald-950 text-emerald-400 border-emerald-900 hover:bg-emerald-900/50 font-bold'
                                  }`}
                                  title="Alternar estado de receso de la estación"
                                >
                                  {b.receso ? '⏸ En Receso' : '🟢 Disponible'}
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Enable/Disable dynamic switch button */}
                          <button
                            type="button"
                            onClick={() => toggleBoothActive(b.id)}
                            className={`w-full py-1.5 rounded text-[9px] font-black uppercase tracking-wider transition cursor-pointer ${
                              b.active 
                                ? 'bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800' 
                                : 'bg-emerald-600/90 hover:bg-emerald-700 text-white shadow-md'
                            }`}
                          >
                            {b.active ? 'Desactivar' : b.empty ? 'Habilitar Reserva' : 'Habilitar Casillero'}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 2. TIMING CONFIGURATOR (CONTROL HORARIOS & CUPOS) */}
                <div className="lg:col-span-5 space-y-6">
                  <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl text-left">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-900">
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span>Control Horarios & Cupos</span>
                        </h4>
                        <p className="text-[9.5px] text-slate-450 font-bold uppercase">71 cupos oficiales (56 web + extras supervisor) de 07:00 AM a 02:45 PM</p>
                      </div>
                    </div>

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
                          <option value="15">15 minutos (Reglamentario)</option>
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

                      {/* TICKET KIOSCO URL */}
                      <div className="space-y-1.5 text-left pt-2 border-t border-slate-900">
                        <div className="flex items-center justify-between">
                          <label className="text-[9px] font-extrabold uppercase text-slate-440 flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-amber-500" />
                            <span>URL Sistema de Tickets / Kiosco</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setTicketKioscoUrl('https://test.te.gob.pa:8443/kiosco')}
                            className="text-[9px] text-amber-500 hover:text-amber-400 font-bold underline cursor-pointer"
                            title="Restablecer valor por defecto"
                          >
                            Restablecer
                          </button>
                        </div>
                        <input
                          type="url"
                          value={ticketKioscoUrl}
                          onChange={(e) => setTicketKioscoUrl(e.target.value)}
                          placeholder="https://test.te.gob.pa:8443/kiosco"
                          className="w-full bg-slate-900 border border-slate-750 text-white p-2.5 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono"
                        />
                        <div className="flex items-center justify-between text-[9.5px] text-slate-450">
                          <span>Ticket oficial de caja para trámites tributarios</span>
                          <a
                            href={ticketKioscoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-amber-400 hover:text-amber-300 font-bold flex items-center gap-1 inline-flex"
                            referrerPolicy="no-referrer"
                          >
                            <span>Probar Kiosco</span>
                            <ExternalLink className="w-2.5 h-2.5" />
                          </a>
                        </div>
                      </div>

                      <button
                        type="submit"
                        className="w-full bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 rounded transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5 text-white" />
                        <span>Aplicar Programación y Enlaces</span>
                      </button>
                    </form>
                  </div>
                </div>

              </div>
            </div>
          )}

          {supervisorTab === 'calendario' && (
            /* CALENDAR VIEW */
            <div className="space-y-6 animate-fade-in text-slate-100">
              
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                
                {/* 1. MONTHLY CALENDAR GRID CONTAINER (8 Columns) */}
                <div className="xl:col-span-8 bg-slate-950 border border-slate-800 p-5 rounded-xl shadow-xl space-y-4 text-left">
                  <div className="flex flex-col gap-3 border-b border-slate-900 pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="space-y-1">
                        <h4 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-amber-500" />
                          <span>Planeador y Calendario de Extranjería</span>
                        </h4>
                        <p className="text-[10px] text-slate-450 font-bold uppercase font-mono">
                          Visualice la carga diaria directamente dentro de cada día del mes
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const prev = new Date(safeCalendarDate.getFullYear(), safeCalendarDate.getMonth() - 1, 1);
                            setCalendarDate(prev);
                            const mStr = String(prev.getMonth() + 1).padStart(2, '0');
                            const prefix = `${prev.getFullYear()}-${mStr}`;
                            const found = Object.keys(appointmentsByDate).filter(d => d.startsWith(prefix)).sort()[0];
                            setSelectedCalendarDateStr(found || `${prefix}-01`);
                          }}
                          className="bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-amber-500/50 p-2 rounded cursor-pointer transition font-bold"
                          title="Mes anterior"
                        >
                          &larr;
                        </button>
                        <select
                          value={`${safeCalendarDate.getFullYear()}-${safeCalendarDate.getMonth()}`}
                          onChange={(e) => {
                            const [y, m] = e.target.value.split('-').map(Number);
                            const newD = new Date(y, m, 1);
                            setCalendarDate(newD);
                            const mStr = String(m + 1).padStart(2, '0');
                            const prefix = `${y}-${mStr}`;
                            const found = Object.keys(appointmentsByDate).filter(d => d.startsWith(prefix)).sort()[0];
                            setSelectedCalendarDateStr(found || `${prefix}-01`);
                          }}
                          className="text-xs font-black uppercase tracking-wider text-amber-500 px-2.5 py-1.5 bg-slate-900 border border-amber-500/30 rounded font-mono cursor-pointer outline-none hover:border-amber-400"
                          title="Seleccionar mes y año"
                        >
                          <optgroup label="Año 2026" className="bg-slate-900 text-slate-200">
                            {mesesNombres.map((mName, idx) => (
                              <option key={`opt-2026-${idx}`} value={`2026-${idx}`}>
                                {mName} 2026
                              </option>
                            ))}
                          </optgroup>
                          <optgroup label="Año 2027" className="bg-slate-900 text-slate-200">
                            {mesesNombres.map((mName, idx) => (
                              <option key={`opt-2027-${idx}`} value={`2027-${idx}`}>
                                {mName} 2027
                              </option>
                            ))}
                          </optgroup>
                        </select>
                        <button
                          type="button"
                          onClick={() => {
                            const next = new Date(safeCalendarDate.getFullYear(), safeCalendarDate.getMonth() + 1, 1);
                            setCalendarDate(next);
                            const mStr = String(next.getMonth() + 1).padStart(2, '0');
                            const prefix = `${next.getFullYear()}-${mStr}`;
                            const found = Object.keys(appointmentsByDate).filter(d => d.startsWith(prefix)).sort()[0];
                            setSelectedCalendarDateStr(found || `${prefix}-01`);
                          }}
                          className="bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-amber-500/50 p-2 rounded cursor-pointer transition font-bold"
                          title="Mes siguiente"
                        >
                          &rarr;
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setNewCitaFecha(selectedCalendarDateStr);
                            setShowCreateForm(!showCreateForm);
                          }}
                          className="ml-2 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white font-extrabold text-[10.5px] uppercase tracking-wider px-3.5 py-2 rounded-lg transition flex items-center gap-1.5 shadow-md cursor-pointer border border-amber-400/40"
                          title="Crear cita especial autorizada por supervisión (cupo adicional que supera el límite de 56)"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-200 fill-amber-300" />
                          <span>+ Cita Especial</span>
                        </button>
                      </div>
                    </div>

                    {/* Quick month tabs if appointments exist in multiple months */}
                    {monthsWithAppointments.length > 1 && (
                      <div className="flex flex-wrap items-center gap-1.5 pt-2 border-t border-slate-900/60">
                        <span className="text-[9px] font-bold text-slate-500 uppercase font-mono mr-1">
                          Meses programados:
                        </span>
                        {monthsWithAppointments.map(m => {
                          const isCurrentActive = safeCalendarDate.getFullYear() === m.year && safeCalendarDate.getMonth() === m.month;
                          return (
                            <button
                              key={`month-tab-${m.year}-${m.month}`}
                              type="button"
                              onClick={() => {
                                setCalendarDate(new Date(m.year, m.month, 1));
                                const firstDateInMonth = Object.keys(appointmentsByDate)
                                  .filter(d => d.startsWith(`${m.year}-${String(m.month + 1).padStart(2, '0')}`))
                                  .sort()[0];
                                if (firstDateInMonth) {
                                  setSelectedCalendarDateStr(firstDateInMonth);
                                }
                              }}
                              className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold transition flex items-center gap-1.5 cursor-pointer border ${
                                isCurrentActive
                                  ? 'bg-amber-500 text-slate-950 border-amber-400 shadow-sm font-black'
                                  : 'bg-slate-900 hover:bg-slate-850 text-slate-300 border-slate-800 hover:border-slate-700'
                              }`}
                            >
                              <span>{m.label}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[8.5px] ${
                                isCurrentActive ? 'bg-slate-950 text-amber-400 font-black' : 'bg-slate-800 text-slate-400'
                              }`}>
                                {m.count}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}
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
                            onClick={() => {
                              setSelectedCalendarDateStr(day.dateStr);
                              if (!day.isCurrentMonth) {
                                const parts = day.dateStr.split('-');
                                if (parts.length === 3) {
                                  const y = parseInt(parts[0], 10);
                                  const m = parseInt(parts[1], 10);
                                  const d = parseInt(parts[2], 10);
                                  if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                                    setCalendarDate(new Date(y, m - 1, d));
                                  }
                                }
                              }
                            }}
                            className={`min-h-[85px] p-2 rounded-lg border transition text-left flex flex-col justify-between cursor-pointer ${
                              isSelected 
                                ? 'bg-amber-950/30 border-amber-400 shadow-md ring-2 ring-amber-500/40' 
                                : day.isCurrentMonth
                                  ? dayCitas.length > 0
                                    ? 'bg-slate-900/80 border-slate-750 hover:bg-slate-850 hover:border-amber-500/50'
                                    : 'bg-slate-900/40 border-slate-850 hover:bg-slate-900/80 hover:border-slate-750'
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
                              
                              {dayCitas.length > 0 && (() => {
                                const regularCitas = dayCitas.filter((c: any) => !c.creadaPorSupervisor && !c.esEspecial && !c.citaEspecial && !c.esCupoAdicional);
                                const specialCitas = dayCitas.filter((c: any) => c.creadaPorSupervisor || c.esEspecial || c.citaEspecial || c.esCupoAdicional);
                                return (
                                  <div className="flex items-center gap-1">
                                    {specialCitas.length > 0 && (
                                      <span className="text-[8px] font-black px-1.5 py-0.5 rounded font-mono bg-purple-600 text-white shadow-xs border border-purple-400/40" title={`${specialCitas.length} Cita(s) Especial(es) adicional(es) autorizada(s) por supervisión`}>
                                        +{specialCitas.length}★
                                      </span>
                                    )}
                                    <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded font-mono shadow-xs ${
                                      regularCitas.length >= 56 
                                        ? 'bg-rose-600 text-white font-black' 
                                        : 'bg-amber-500 text-slate-950'
                                    }`}>
                                      {regularCitas.length}/56
                                    </span>
                                  </div>
                                );
                              })()}
                            </div>

                            {/* Informative contents placed inside the day */}
                            {dayCitas.length > 0 ? (() => {
                              const regularCitas = dayCitas.filter((c: any) => !c.creadaPorSupervisor && !c.esEspecial && !c.citaEspecial && !c.esCupoAdicional);
                              const specialCitas = dayCitas.filter((c: any) => c.creadaPorSupervisor || c.esEspecial || c.citaEspecial || c.esCupoAdicional);
                              return (
                                <div className="space-y-1 mt-1.5 w-full">
                                  <div className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase flex items-center justify-between ${
                                    regularCitas.length >= 56 
                                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' 
                                      : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                  }`}>
                                    <span>{regularCitas.length} ord {specialCitas.length > 0 ? `+ ${specialCitas.length} esp` : ''}</span>
                                    <span>{regularCitas.length >= 56 ? (specialCitas.length > 0 ? 'Cupo Esp.' : 'Lleno') : 'Disp.'}</span>
                                  </div>
                                <div className="space-y-0.5 overflow-hidden max-h-[34px] w-full hidden sm:block">
                                  {dayCitas.slice(0, 2).map((c: any) => (
                                    <div key={`prev-line-${c.id}`} className="text-[8px] font-medium text-slate-350 truncate tracking-tight uppercase leading-none font-sans">
                                      • {c.numeroCitaDia ? `[#${c.numeroCitaDia}] ` : ''}{getExtranjeriaCitizenName(c)}
                                    </div>
                                  ))}
                                  {dayCitas.length > 2 && (
                                    <div className="text-[7.5px] text-amber-400/90 font-mono leading-none font-bold">
                                      +{dayCitas.length - 2} más
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })() : (
                              <div className="mt-1 hidden sm:block text-[8px] font-mono text-slate-650 italic">
                                Sin citas
                              </div>
                            )}
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
                        <div className="flex items-center gap-1.5">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          <span className="text-[10.5px] font-black text-amber-400 uppercase tracking-widest block font-mono">
                            Cita Especial de Supervisión
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setShowCreateForm(false)}
                          className="text-xs text-slate-455 hover:text-white font-bold cursor-pointer"
                        >
                          Cancelar
                        </button>
                      </div>

                      {/* Informative banner about supervisor special quota */}
                      {(() => {
                        const targetDayAppointments = appointmentsByDate[newCitaFecha || selectedCalendarDateStr] || [];
                        const currentSpecialCount = targetDayAppointments.filter((a: any) => a.creadaPorSupervisor || a.esEspecial || a.citaEspecial || a.esCupoAdicional).length;
                        const isLimitReached = currentSpecialCount >= 30;

                        return (
                          <div className="bg-amber-950/30 border border-amber-500/40 rounded-lg p-2.5 space-y-1.5">
                            <div className="flex items-center justify-between gap-1.5 text-amber-300 text-[10px] font-black uppercase font-mono">
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                                <span>Cupo Adicional Autorizado</span>
                              </div>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-mono border ${
                                isLimitReached
                                  ? 'bg-rose-950/80 text-rose-300 border-rose-800 font-bold'
                                  : 'bg-purple-950/80 text-purple-300 border-purple-800'
                              }`}>
                                {currentSpecialCount} / 30 Extras
                              </span>
                            </div>
                            <p className="text-[9.5px] text-slate-350 leading-relaxed">
                              Las citas creadas por supervisores son <strong className="text-amber-200">cupos adicionales para la jornada ampliada (hasta 71 citas de 07:00 AM a 02:45 PM)</strong> por encima de los 56 cupos ordinarios de la web.
                            </p>
                            {isLimitReached && (
                              <p className="text-[9.5px] text-rose-400 font-bold">
                                ⚠️ Se ha alcanzado el límite reglamentario global de cupos especiales autorizados para esta fecha.
                              </p>
                            )}
                          </div>
                        );
                      })()}

                      <form onSubmit={handleCreateCitaSupervisor} className="space-y-3">
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
                            <label className="text-[9.5px] font-extrabold uppercase text-slate-450 block">No. Resolución Migratoria</label>
                            <input
                              type="text"
                              placeholder="Ej. RES-2024-8910"
                              value={newCitaResolucion}
                              onChange={(e) => setNewCitaResolucion(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-slate-100"
                            />
                          </div>

                          <div className="space-y-1">
                            <label className="text-[9.5px] font-extrabold uppercase text-slate-450 block">Motivo Cita Especial</label>
                            <input
                              type="text"
                              placeholder="Motivo o justificación"
                              value={newCitaMotivoEspecial}
                              onChange={(e) => setNewCitaMotivoEspecial(e.target.value)}
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
                              min="2026-01-04"
                              value={newCitaFecha}
                              onChange={(e) => setNewCitaFecha(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-slate-100 cursor-pointer"
                            />
                          </div>

                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <label className="text-[9.5px] font-extrabold uppercase text-slate-450 block">Hora Cita *</label>
                              <span className="text-[8px] text-emerald-400 font-mono font-bold">Cualquier horario permitido</span>
                            </div>
                            <select
                              required
                              value={newCitaHora}
                              onChange={(e) => setNewCitaHora(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono text-slate-100 cursor-pointer"
                            >
                              {EXTRANJERIA_SLOTS_OPTIONS.map((timeOption) => {
                                const isOccupied = Boolean(occupiedHoursForSpecialAppt[timeOption]);
                                const occName = occupiedHoursForSpecialAppt[timeOption];
                                return (
                                  <option 
                                    key={timeOption} 
                                    value={timeOption} 
                                    className="text-emerald-300 bg-slate-900 font-bold"
                                  >
                                    {timeOption} {isOccupied ? `— (Horario con cita: ${occName} — Cupo adicional permitido)` : '— (Disponible)'}
                                  </option>
                                );
                              })}
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

                        {(() => {
                          const targetDayAppointments = appointmentsByDate[newCitaFecha || selectedCalendarDateStr] || [];
                          const currentSpecialCount = targetDayAppointments.filter((a: any) => a.creadaPorSupervisor || a.esEspecial || a.citaEspecial || a.esCupoAdicional).length;
                          const isLimitReached = currentSpecialCount >= 30;

                          return (
                            <button
                              type="submit"
                              disabled={isLimitReached}
                              className={`w-full font-black text-xs uppercase tracking-wider py-3 rounded-lg transition shadow-md flex items-center justify-center gap-1.5 border ${
                                isLimitReached
                                  ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed opacity-60'
                                  : 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-amber-400/30 cursor-pointer'
                              }`}
                            >
                              <Star className="w-4 h-4 text-amber-200 fill-amber-300" />
                              <span>{isLimitReached ? 'Límite de 30 Cupos Extras Alcanzado' : 'Agendar Cita Especial (Cupo Adicional)'}</span>
                            </button>
                          );
                        })()}
                      </form>
                    </div>
                  ) : (
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      {(() => {
                        const dayAllCitas = appointmentsByDate[selectedCalendarDateStr] || [];
                        const regCount = dayAllCitas.filter((c: any) => !c.creadaPorSupervisor && !c.esEspecial && !c.citaEspecial && !c.esCupoAdicional).length;
                        const specCount = dayAllCitas.filter((c: any) => c.creadaPorSupervisor || c.esEspecial || c.citaEspecial || c.esCupoAdicional).length;

                        return (
                          <div className="space-y-1">
                            <div className="flex items-center justify-between flex-wrap gap-1">
                              <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block font-mono">Detalles de la Jornada</span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[10px] font-black px-2 py-0.5 rounded font-mono border ${
                                  regCount >= 56
                                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                    : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                                }`}>
                                  {regCount} / 56 Web
                                </span>
                                {specCount > 0 && (
                                  <span className="text-[10px] font-black px-2 py-0.5 rounded font-mono border bg-purple-950/40 text-purple-300 border-purple-500/40">
                                    +{specCount} Supervisor
                                  </span>
                                )}
                                <span className="text-[10px] font-black px-2 py-0.5 rounded font-mono border bg-slate-900 text-slate-300 border-slate-700">
                                  {regCount + specCount} / 71 Total
                                </span>
                              </div>
                            </div>
                            <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                              <span>Citas para el {selectedCalendarDateStr}</span>
                            </h4>
                          </div>
                        );
                      })()}

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
                          (appointmentsByDate[selectedCalendarDateStr] || []).map((app: any, appIdx: number) => {
                            const stepStatus = appMetadata[app.id]?.estadoTicket || 'En Entrada';
                            const pName = getExtranjeriaCitizenName(app);
                            const passportVal = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                            const isSpecial = Boolean(app.creadaPorSupervisor || app.esEspecial || app.citaEspecial || app.esCupoAdicional);
                            const resolucionNum = app.resolucion || app.datosPersonales?.numeroResolucion;
                            const motivoEsp = app.motivoEspecial || app.datosPersonales?.motivoEspecial;
                            
                            const subservice = app.subServicioNombre || (isExtranjeriaAppointment(app) ? 'Servicio de Extranjería' : 'Cédula Pasados de Edad');
                            
                            return (
                              <div key={`cal-det-${app.id}`} className="space-y-1.5 pt-3.5 first:pt-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      {isSpecial ? (
                                        <span className="text-[9.5px] font-black bg-purple-600/30 border border-purple-400/50 text-purple-200 px-1.5 py-0.5 rounded font-mono flex items-center gap-1">
                                          <Star className="w-2.5 h-2.5 text-purple-300 fill-purple-300" />
                                          <span>CITA ESPECIAL (N° {app.numeroCitaDia || (appIdx + 1)} de 71)</span>
                                        </span>
                                      ) : (
                                        <span className="text-[10px] font-black bg-amber-500/20 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                                          N° {app.numeroCitaDia || (appIdx + 1)} de 71
                                        </span>
                                      )}
                                      <span className="text-amber-500 font-mono font-black text-xs">{app.id}</span>
                                      <span className="text-[9px] bg-slate-900 text-slate-400 border border-slate-800 px-1 rounded font-mono font-bold leading-none py-0.5">
                                        {app.hora}
                                      </span>
                                      <span className="text-[8px] uppercase tracking-wide bg-slate-900 border border-slate-800 px-1.5 py-0.2 rounded font-black text-slate-400 font-mono">
                                        {subservice}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <h5 className="font-extrabold text-white text-[11px] uppercase truncate max-w-[320px] md:max-w-[420px]" title={pName}>
                                        {pName}
                                      </h5>
                                    </div>
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
                                  {resolucionNum && (
                                    <div>Res. Migración: <span className="font-mono text-amber-300/90">{resolucionNum}</span></div>
                                  )}
                                  {motivoEsp && (
                                    <div className="text-[9px] text-purple-300/80 font-mono">Motivo: {motivoEsp}</div>
                                  )}
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
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-2">
                    <Users className="w-4 h-4 text-blue-400" />
                    <span>En Sala de Entrada / Espera de Atención</span>
                  </h4>
                  <span className="text-xs font-mono font-black px-2.5 py-0.5 rounded bg-blue-950/80 border border-blue-500/40 text-blue-300">
                    {queueAtencionIn.length} en Sala
                  </span>
                </div>
                <p className="text-[10px] text-slate-455 font-bold uppercase leading-relaxed text-left">
                  Ciudadanos registrados esperando revisión documental o dar paso al Supervisor
                </p>
              </div>

              <button
                type="button"
                onClick={fetchAppointments}
                disabled={loading}
                className="text-slate-400 hover:text-white transition bg-slate-900 p-2 rounded border border-slate-800 flex items-center gap-1 text-[10px] font-extrabold uppercase cursor-pointer"
                title="Actualizar lista de citas"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {/* BUSCADOR POR NOMBRE O PASAPORTE Y FILTRO POR DÍA */}
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2.5 text-left">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Campo de búsqueda por Nombre o Pasaporte con Búsqueda Instantánea en las 56 + Cupos Supervisor */}
                <div className="flex items-center gap-1.5 flex-1">
                  <div className="relative flex-1">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="Buscar por nombre, pasaporte o código en las 56 del día..."
                      value={localAtencionSearchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocalAtencionSearchQuery(val);
                        setAtencionSearchQuery(val);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setAtencionSearchQuery(localAtencionSearchQuery);
                        }
                      }}
                      className="w-full bg-slate-950 border border-slate-750 text-white rounded-md py-1.5 pl-9 pr-8 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium placeholder-slate-500"
                    />
                    {(localAtencionSearchQuery || atencionSearchQuery) && (
                      <button
                        type="button"
                        onClick={() => {
                          setLocalAtencionSearchQuery('');
                          setAtencionSearchQuery('');
                        }}
                        className="absolute right-2.5 top-1.5 text-slate-400 hover:text-white text-xs font-black px-1 cursor-pointer"
                        title="Limpiar búsqueda"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setAtencionSearchQuery(localAtencionSearchQuery)}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase text-xs px-3 py-1.5 rounded-md transition shadow-sm shrink-0 cursor-pointer"
                  >
                    Buscar
                  </button>
                </div>

                {/* Filtro y Selector de Día de Atención */}
                <div className="flex items-center gap-2 shrink-0 flex-wrap">
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/60 border border-blue-800/60 rounded-lg text-[11px] font-black uppercase text-blue-300">
                    <Calendar className="w-3.5 h-3.5 text-blue-400" />
                    <span>Día: {activeAtencionDate}</span>
                  </div>

                  <div className="relative">
                    <input
                      type="date"
                      value={atencionDateFilter || activeAtencionDate}
                      onChange={(e) => {
                        setAtencionDateFilter(e.target.value);
                      }}
                      className="bg-slate-950 border border-slate-750 text-white rounded-md py-1.5 px-2.5 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono cursor-pointer"
                      title="Seleccionar fecha de atención"
                    />
                  </div>

                  {/* Botón rápido "Hoy" */}
                  <button
                    type="button"
                    onClick={() => {
                      setAtencionDateFilter(todayStr);
                    }}
                    className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase transition flex items-center gap-1 cursor-pointer whitespace-nowrap border ${
                      (atencionDateFilter || activeAtencionDate) === todayStr
                        ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                        : 'bg-slate-950 hover:bg-slate-850 text-slate-300 border-slate-750'
                    }`}
                    title="Filtrar citas del día de hoy"
                  >
                    <span>Hoy 📅</span>
                  </button>
                </div>
              </div>

              {/* Días con citas cargadas para selección rápida */}
              {availableAppointmentDates.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 text-[9.5px]">
                  <span className="text-slate-500 font-bold uppercase shrink-0">Días con citas:</span>
                  {availableAppointmentDates.map(d => (
                    <button
                      key={`atencion-d-${d}`}
                      type="button"
                      onClick={() => setAtencionDateFilter(d)}
                      className={`px-2 py-0.5 rounded font-mono font-bold transition whitespace-nowrap border cursor-pointer ${
                        activeAtencionDate === d
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {/* Banner Regulatorio Oficial: 56 Web + Cupos Supervisor (Hasta 71) */}
              <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] bg-slate-950/70 p-2 rounded-lg border border-slate-850">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-blue-400 font-black uppercase tracking-wider">Universo de Citas:</span>
                  <span className="text-emerald-400 font-mono font-bold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                    56 Web ({atencionDayUniverse.ordinary56.length})
                  </span>
                  {atencionDayUniverse.supervisorCreated.length > 0 ? (
                    <span className="text-amber-300 font-mono font-bold bg-amber-950/40 border border-amber-800/40 px-2 py-0.5 rounded">
                      + {atencionDayUniverse.supervisorCreated.length} Supervisor
                    </span>
                  ) : (
                    <span className="text-slate-500 font-mono text-[9px]">
                      (Sin cupos supervisor creados hoy)
                    </span>
                  )}
                  <span className="text-slate-300 font-mono font-bold bg-slate-900 border border-slate-750 px-2 py-0.5 rounded">
                    Total: {atencionDayUniverse.totalUniverse.length} / 71
                  </span>
                </div>
                <div className="text-slate-400 font-mono text-[9.5px]">
                  Total activo del día: <strong className="text-white">{atencionDayUniverse.totalUniverse.length}</strong> | En sala: <strong className="text-white">{queueAtencionIn.length}</strong>
                </div>
              </div>

              {/* Indicador de búsqueda activa */}
              {(localAtencionSearchQuery || atencionSearchQuery) && (
                <div className="flex flex-wrap items-center justify-between text-[10.5px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span>Coincidencias: <strong className="text-white font-mono">{filteredQueueAtencionIn.length}</strong> de {queueAtencionIn.length} en sala</span>
                    <span className="text-amber-400 font-mono bg-amber-950/60 border border-amber-900/50 px-1.5 py-0.2 rounded text-[9.5px]">
                      🔍 "{localAtencionSearchQuery || atencionSearchQuery}"
                    </span>
                    <span className="text-slate-500 text-[9.5px]">
                      (Búsqueda instantánea en las 71 del día)
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setLocalAtencionSearchQuery('');
                      setAtencionSearchQuery('');
                    }}
                    className="text-[10px] text-slate-400 hover:text-amber-400 font-bold underline cursor-pointer"
                  >
                    Limpiar búsqueda
                  </button>
                </div>
              )}
            </div>

            {/* List */}
            {filteredQueueAtencionIn.length === 0 ? (
              <div className="py-14 text-center space-y-2 text-slate-450 border border-dashed border-slate-850 rounded">
                {(localAtencionSearchQuery || atencionSearchQuery) ? (
                  <>
                    <Search className="w-8 h-8 text-slate-600 mx-auto" />
                    <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-350">
                      Sin resultados en las citas de hoy
                    </span>
                    <p className="text-[10px] max-w-xs mx-auto leading-relaxed text-slate-400">
                      No se encontraron ciudadanos en las 71 citas del día ({activeAtencionDate}) con "{localAtencionSearchQuery || atencionSearchQuery}".
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setLocalAtencionSearchQuery('');
                        setAtencionSearchQuery('');
                      }}
                      className="text-[10.5px] text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer inline-block mt-1"
                    >
                      Limpiar búsqueda
                    </button>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-8 h-8 text-slate-600 mx-auto" />
                    <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-350">Sin citas en espera para este día</span>
                    <p className="text-[10px] max-w-xs mx-auto leading-relaxed">Todos los ciudadanos del día ({activeAtencionDate}) han sido procesados por la Unidad de Entrada o no hay citas registradas para esta fecha.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredQueueAtencionIn.map((app, appIdx) => {
                  const name = getExtranjeriaCitizenName(app);
                  const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                  const isSelected = selectedAppForCheck?.id === app.id;
                  const isSupervisorQuota = Boolean(
                    app.creadaPorSupervisor || 
                    app.esCupoAdicional || 
                    app.citaEspecial || 
                    app.esEspecial || 
                    (app.creadoPor && String(app.creadoPor).toLowerCase().includes('supervisor'))
                  );

                  return (
                    <div
                      key={`atencion-list-${app.id}`}
                      onClick={() => {
                        setSelectedAppForCheck(app);
                        const meta = appMetadata[app.id];
                        setTempCheckedDocs(meta?.checkedDocs || []);
                      }}
                      className={`w-full p-4 rounded-lg border text-left flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition cursor-pointer ${
                        isSelected 
                          ? 'bg-blue-950/45 border-blue-500 shadow-md shadow-blue-950/25'
                          : 'bg-slate-900/60 border-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1 flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-xs font-mono font-black text-amber-500">{app.id}</span>
                          <span className="text-[8.5px] bg-slate-950 border border-slate-800 text-slate-400 font-extrabold px-1.5 py-0.2 rounded font-mono">
                            Código Tx: {app.codigoTransaccion}
                          </span>
                          {isSupervisorQuota ? (
                            <span className="text-[8.5px] bg-amber-950/80 border border-amber-600/60 text-amber-300 font-black px-1.5 py-0.2 rounded font-mono">
                              ⭐ Cupo Especial Supervisor (N° {app.numeroCitaDia || (appIdx + 1)} de 71)
                            </span>
                          ) : (
                            <span className="text-[8.5px] bg-emerald-950/80 border border-emerald-600/60 text-emerald-300 font-black px-1.5 py-0.2 rounded font-mono">
                              Cita N° {app.numeroCitaDia || (appIdx + 1)} de 71
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-100 block uppercase truncate">{name}</span>
                        </div>
                        <span className="text-[9.5px] font-bold text-slate-450 block font-mono">PAS: {passport}  |  Fecha: {formatFriendlyDate(app.fecha)} ({app.hora})</span>
                        <span className="text-[9.5px] text-emerald-400 block font-semibold truncate">Agendado por: {app.creadoPor || app.datosPersonales?.creadoPor || 'Portal del Ciudadano'}</span>
                      </div>

                      <div className="py-1 shrink-0 flex items-center gap-2">
                        <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-blue-900 bg-blue-950/30 text-blue-400">
                          Sala de Entrada
                        </span>
                        {(appMetadata[app.id]?.passedToSupervisor || (app.codigoTransaccion && appMetadata[app.codigoTransaccion]?.passedToSupervisor)) && (
                          <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded border border-emerald-800 bg-emerald-950/40 text-emerald-300">
                            En Supervisor ✓
                          </span>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSubmitVerification(app.id);
                          }}
                          className="flex items-center gap-1 text-blue-300 hover:text-white bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 transition font-black uppercase text-[10px] tracking-wider px-2.5 py-1.5 rounded-md cursor-pointer shadow-sm"
                          title="Dar paso inmediato a la bandeja del supervisor"
                        >
                          <Send className="w-3.5 h-3.5 text-blue-400" />
                          <span>Dar Paso a Supervisor ⏩</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Aviso de citas coincidentes ya procesadas en otras colas */}
            {atencionMatchesInOtherQueues.length > 0 && (
              <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-lg text-left space-y-2">
                <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase">
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Citas coincidentes ya procesadas de entrada ({atencionMatchesInOtherQueues.length})</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Las siguientes citas con este criterio ya pasaron la verificación y no están en sala de espera inicial:
                </p>
                <div className="space-y-1 max-h-[110px] overflow-y-auto pr-1">
                  {atencionMatchesInOtherQueues.map(app => {
                    const meta = appMetadata[app.id];
                    const name = getExtranjeriaCitizenName(app);
                    const booth = meta?.assignedCubiculo ? booths.find(b => b.id === meta.assignedCubiculo) : null;
                    const statusText = booth 
                      ? `En ${booth.name}` 
                      : (meta?.estadoTicket === 'realizada' ? 'Atención finalizada' : 'En espera de Supervisor');
                    return (
                      <div key={`other-q-${app.id}`} className="flex items-center justify-between text-[10.5px] bg-slate-900/60 p-2 rounded border border-slate-800">
                        <div>
                          <span className="font-mono text-amber-400 font-bold mr-2">{app.id}</span>
                          <span className="text-slate-200 font-semibold">{name}</span>
                          <span className="text-slate-500 ml-2 font-mono text-[9.5px]">PAS: {app.datosPersonales?.pasaporte || app.identificacion}</span>
                        </div>
                        <span className="text-[8.5px] font-bold uppercase px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {statusText}
                        </span>
                      </div>
                    );
                  })}
                </div>
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
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-slate-100 uppercase">{getExtranjeriaCitizenName(selectedAppForCheck)}</div>
                  </div>
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
                    const name = getExtranjeriaCitizenName(app);
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
      {subRole === 'cubiculo' && currentRole === 'extranjeria_cubiculo' && !hasSelectedCubiculo ? (
        <div className="max-w-4xl mx-auto py-10 px-4 animate-fade-in text-center space-y-8">
          <div className="space-y-3">
            <div className="inline-flex relative">
              <div className="absolute -inset-1 bg-indigo-500/10 rounded-2xl blur" />
              <img
                src="/images/logo-sede-te-1.png"
                alt="Tribunal Electoral Logo"
                className="w-20 h-20 sm:w-24 sm:h-24 object-contain rounded-2xl bg-white p-2.5 border border-amber-500/40 relative z-10 shadow-lg"
                referrerPolicy="no-referrer"
              />
            </div>
            <div className="space-y-1">
              <span className="text-xs sm:text-sm font-black tracking-widest text-[#d9a74a] uppercase font-mono block">
                REPÚBLICA DE PANAMÁ ● TRIBUNAL ELECTORAL
              </span>
              <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white uppercase tracking-tight">
                ESTACIONES OPERATIVAS DE EXTRANJERÍA
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 font-bold max-w-lg mx-auto uppercase tracking-wider">
                Asignación obligatoria de puesto de trabajo
              </p>
              <p className="text-xs sm:text-sm text-slate-400 font-semibold max-w-lg mx-auto">
                Seleccione el cubículo habilitado donde operará en este turno para cargar su cola de ciudadanos:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4">
            {booths.filter(b => b.active).map(b => {
              const currentAgentUser = sessionStorage.getItem('admin_username') || 'agente_cubiculo';
              const occupant = appMetadata[`booth_occupant_${b.id}`]?.staffResponsable;
              const isOccupiedByOther = occupant && occupant !== currentAgentUser;

              return (
                <button
                  key={`selection-cubiculo-${b.id}`}
                  type="button"
                  disabled={isOccupiedByOther}
                  onClick={() => selectCubiculoAndUnlock(b.id)}
                  className={`group relative bg-slate-950 rounded-2xl p-6 text-left transition-all duration-200 shadow-xl text-white flex flex-col justify-between h-48 select-none border-2 ${
                    isOccupiedByOther 
                      ? 'opacity-50 border-red-900/60 cursor-not-allowed' 
                      : 'hover:bg-slate-900 border-slate-800 hover:border-indigo-500 cursor-pointer hover:shadow-indigo-950/20'
                  }`}
                >
                  <div className="space-y-3 w-full">
                    <div className="flex items-center justify-between">
                      <span className="text-sm sm:text-base font-black tracking-wide text-slate-100 group-hover:text-indigo-400 transition-colors uppercase">
                        {b.name}
                      </span>
                      {isOccupiedByOther ? (
                        <span className="text-[9px] font-extrabold uppercase px-2 py-1 rounded-full border bg-red-950/80 border-red-900 text-red-400">
                          Ocupado por @{occupant}
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold uppercase px-2 py-1 rounded-full border bg-emerald-950/60 border-emerald-800 text-emerald-400">
                          Disponible
                        </span>
                      )}
                    </div>
                    
                    {occupant ? (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-black tracking-widest text-emerald-400 block font-mono">
                          Operador Activo:
                        </span>
                        <p className="text-xs sm:text-sm font-black text-emerald-300 uppercase">
                          {getBoothStaffName(b)}
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <span className="text-[10px] uppercase font-black tracking-widest text-slate-450 block font-mono">
                          Operador por Defecto:
                        </span>
                        <p className="text-xs sm:text-sm font-black text-slate-200 uppercase">
                          {b.staff}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-xs font-black pt-2 border-t border-slate-900 w-full justify-between">
                    {isOccupiedByOther ? (
                      <span className="text-red-500 uppercase">ESTACIÓN NO DISPONIBLE</span>
                    ) : (
                      <>
                        <span className="text-indigo-400 group-hover:text-indigo-350">INICIAR EN ESTA ESTACIÓN</span>
                        <ArrowRight className="w-4 h-4 transform group-hover:translate-x-1 transition-transform text-indigo-400" />
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 max-w-md mx-auto text-[11px] text-slate-400 font-medium leading-relaxed">
            💡 <strong>Aviso del Administrador:</strong> Su registro de firmas, tiempos de atención y bitácoras de llamados se registrarán bajo la estación seleccionada. Si requiere cambiar de cubículo más tarde, podrá hacerlo desde la parte superior de la cola.
          </div>
        </div>
      ) : subRole === 'cubiculo' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in text-left">
          
          {/* Left panel: Cubicle selection and status indicator */}
          {currentRole !== 'extranjeria_cubiculo' && (
            <div className="lg:col-span-4 space-y-5">
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-5 space-y-4 shadow-xl">
                <h4 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5 pb-2 border-b border-slate-900">
                  <Building2 className="w-4 h-4 text-indigo-500" />
                  <span>Puesto de Trabajo</span>
                </h4>

                <div className="space-y-1.5">
                  <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Seleccione el Cubículo a Operar:</label>
                  <div className="flex flex-wrap gap-2">
                    {booths.filter(b => b.active).map(b => (
                      <button
                        key={`cubiculo-tab-btn-${b.id}`}
                        type="button"
                        onClick={() => setSelectedCubiculo(b.id)}
                        className={`px-3 py-1.5 rounded text-xs font-black transition-all cursor-pointer border ${
                          selectedCubiculo === b.id
                            ? 'bg-indigo-600 border-indigo-500 text-white shadow-md'
                            : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-850'
                        }`}
                      >
                        {b.name}
                      </button>
                    ))}
                  </div>
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
                        Operador asignado: <strong className="text-slate-200">{getBoothStaffName(b)}</strong>
                        {!b?.active && (
                          <p className="text-[9px] text-amber-500 mt-2 font-bold leading-normal">
                            ⚠️ ATENCIÓN: Este casillero figura desactivado por el Supervisor. Cámbiese de cubículo o pida al Supervisor que lo active.
                          </p>
                        )}
                      </div>

                      {/* Contador de Atenciones Realizadas Hoy en la Estación para el Informe Diario */}
                      <div className="bg-emerald-950/70 border border-emerald-500/40 rounded-xl p-3 flex items-center justify-between shadow-sm">
                        <div className="space-y-0.5 text-left">
                          <span className="text-[9px] font-black uppercase tracking-wider text-emerald-400 block font-mono">
                            Informe Diario de la Estación
                          </span>
                          <span className="text-xs font-bold text-slate-200">
                            Atenciones Concluidas Hoy:
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-xl font-mono font-black text-emerald-300">
                            {attendedTodayCount}
                          </span>
                          <span className="text-[9px] text-emerald-400 font-bold block uppercase">
                            {attendedTodayCount === 1 ? 'trámite' : 'trámites'}
                          </span>
                        </div>
                      </div>

                      {b?.active && (
                        <div className="pt-2 border-t border-slate-800/60 flex flex-col gap-1.5">
                          <span className="text-[8.5px] font-black uppercase text-slate-450 block font-mono">Modo de Atención</span>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                if (b.receso) {
                                  toggleBoothReceso(b.id);
                                }
                              }}
                              className={`flex-1 py-1 px-2 text-[10px] font-black rounded border transition cursor-pointer text-center ${
                                !b.receso
                                  ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              🟢 Disponible
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (!b.receso) {
                                  toggleBoothReceso(b.id);
                                }
                              }}
                              className={`flex-1 py-1 px-2 text-[10px] font-black rounded border transition cursor-pointer text-center ${
                                b.receso
                                  ? 'bg-amber-950/80 border-amber-500/60 text-amber-400 font-bold'
                                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                              }`}
                            >
                              ⏸ En Receso
                            </button>
                          </div>
                          {b.receso && (
                            <p className="text-[9px] text-amber-400/95 font-bold mt-1.5 animate-pulse bg-amber-950/20 border border-amber-950/40 p-1.5 rounded leading-relaxed">
                              ⏸ ALERTA DE RECESO: No se le asignarán ciudadanos automáticamente mientras se encuentre en este estado. Cambie a "Disponible" para retomar.
                            </p>
                          )}
                        </div>
                      )}
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
                      {attendedTodayCount}
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
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center justify-between gap-2 pb-3 border-b border-slate-900">
              <span className="flex items-center gap-2">
                <span>Ciudadanos Asignados - Cola de Atención de {booths.find(b => b.id === selectedCubiculo)?.name}</span>
                {currentRole === 'extranjeria_cubiculo' && (
                  <button
                    onClick={() => handleReleaseCubiculo()}
                    className="ml-2 bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-[10px] font-black text-indigo-400 px-2.5 py-1 rounded transition-colors cursor-pointer"
                  >
                    Cambiar Cubículo 🔄
                  </button>
                )}
              </span>
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="bg-indigo-950 border border-indigo-750 text-indigo-300 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono">
                  {attendedTodayCount} Atendidos Hoy ✅
                </span>
                {queueCubiculoAssigned.filter(a => appMetadata[a.id]?.estadoTicket === 'en_atencion').length > 0 && (
                  <span className="bg-emerald-950/80 border border-emerald-600/80 text-emerald-400 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    {queueCubiculoAssigned.filter(a => appMetadata[a.id]?.estadoTicket === 'en_atencion').length} En Atención
                  </span>
                )}
                <span className="bg-slate-900 border border-slate-750 text-slate-400 px-2.5 py-0.5 rounded-full text-[10px] font-black font-mono">
                  {queueCubiculoAssigned.filter(a => appMetadata[a.id]?.estadoTicket !== 'en_atencion').length} En Espera
                </span>
              </div>
            </h4>

            {currentRole === 'extranjeria_cubiculo' && (() => {
              const b = booths.find(x => x.id === selectedCubiculo);
              return (
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl mb-2">
                  <div className="text-left space-y-1">
                    <span className="text-[9px] font-black text-slate-450 uppercase block tracking-wider">Estación Operando</span>
                    <span className="text-xs font-black text-indigo-400">{b?.name || 'N/D'}</span>
                  </div>
                  <div className="text-left space-y-1">
                    <span className="text-[9px] font-black text-slate-450 uppercase block tracking-wider">Personas Atendidas en el Día</span>
                    <span className="text-xs font-mono font-black text-emerald-400 flex items-center gap-1">
                      <span>{attendedTodayCount} Ciudadanos</span>
                      <span className="text-[8px] bg-emerald-950/80 border border-emerald-800/60 px-1.5 py-0.2 rounded font-sans uppercase font-bold">✓ Conteo Activo</span>
                    </span>
                  </div>
                  <div className="text-left space-y-1">
                    <span className="text-[9px] font-black text-slate-450 uppercase block tracking-wider">Usuario / Operador</span>
                    <span className="text-xs font-semibold text-slate-300 truncate block">
                      {sessionStorage.getItem('admin_nombre') || sessionStorage.getItem('admin_username') || 'Usuario de Ventanilla'}
                    </span>
                  </div>
                  <div className="text-left space-y-1 bg-slate-950/60 p-2.5 rounded border border-slate-800/60 flex flex-col justify-between">
                    <span className="text-[8.5px] font-black uppercase text-slate-455 block font-mono">Modo de Atención</span>
                    {b && (
                      <div className="flex gap-1.5 mt-1">
                        <button
                          type="button"
                          onClick={() => {
                            if (b.receso) {
                              toggleBoothReceso(b.id);
                            }
                          }}
                          className={`flex-1 py-1 text-[9px] font-black rounded border transition cursor-pointer text-center ${
                            !b.receso
                              ? 'bg-emerald-950/80 border-emerald-500/60 text-emerald-400'
                              : 'bg-slate-900 border-slate-800 text-slate-450 hover:text-slate-200'
                          }`}
                        >
                          🟢 Disp.
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!b.receso) {
                              toggleBoothReceso(b.id);
                            }
                          }}
                          className={`flex-1 py-1 text-[9px] font-black rounded border transition cursor-pointer text-center ${
                            b.receso
                              ? 'bg-amber-950/80 border-amber-500/60 text-amber-400 font-bold'
                              : 'bg-slate-900 border-slate-800 text-slate-450 hover:text-slate-200'
                          }`}
                        >
                          ⏸ Receso
                        </button>
                      </div>
                    )}
                  </div>
                  {b?.receso && (
                    <div className="sm:col-span-4 mt-2">
                      <p className="text-[9.5px] text-amber-400 font-bold leading-normal bg-amber-950/35 border border-amber-800/40 p-2 rounded animate-pulse">
                        ⚠️ ATENCIÓN: Se encuentra en estado de RECESO (Break). No se le asignarán ciudadanos automáticamente hasta que marque su estado como "Disponible".
                      </p>
                    </div>
                  )}
                </div>
              );
            })()}

            {queueCubiculoAssigned.length === 0 ? (
              <div className="py-24 text-center space-y-2 text-slate-500 border border-dashed border-slate-850 rounded">
                <UserCheck className="w-9 h-9 text-slate-700 mx-auto" />
                <span className="text-[11.5px] font-bold uppercase tracking-wider block text-slate-300">Cola Vacía</span>
                <p className="text-[10px] max-w-sm mx-auto leading-relaxed text-slate-450">
                  No tiene ciudadanos asignados en su cubículo por el momento. Avise al <strong className="text-slate-350">Supervisor de Extranjería</strong> para que le asigne algún expediente de la cola general.
                </p>
              </div>
            ) : (
              (() => {
                const attendingApp = queueCubiculoAssigned.find(app => appMetadata[app.id]?.estadoTicket === 'en_atencion');
                const activeMainApp = attendingApp || queueCubiculoAssigned[0];
                const listApps = queueCubiculoAssigned.filter(app => app.id !== activeMainApp?.id);

                return (
                  <div className="space-y-6">
                    {/* 1. SECCIÓN PRINCIPAL: CIUDADANO EN ATENCIÓN / POR INICIAR (GRANDE) */}
                    {activeMainApp && (() => {
                      const app = activeMainApp;
                      const name = getExtranjeriaCitizenName(app);
                      const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                      const meta = appMetadata[app.id];
                      const isInAttention = meta?.estadoTicket === 'en_atencion';
                      const isPaidInCaja = meta?.estadoTicket === 'pagado_en_caja';

                      return (
                        <div 
                          key={`cubiculo-row-main-${app.id}`} 
                          className={`border p-5 rounded-lg space-y-4 shadow-md text-left transition ${
                            isInAttention 
                              ? 'bg-slate-900 border-emerald-500/80 ring-1 ring-emerald-500/40 shadow-emerald-950/30' 
                              : 'bg-slate-900 border-indigo-500/50 ring-1 ring-indigo-500/20 shadow-indigo-950/25'
                          }`}
                        >
                          {/* Banner explicativo del estado principal */}
                          <div className="flex items-center gap-2 px-3 py-1.5 rounded bg-slate-950 border border-slate-900 text-[10px] font-black uppercase tracking-wider text-indigo-400 w-fit">
                            <span>Foco de Atención Activa</span>
                          </div>

                          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-slate-800">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold font-mono text-amber-500">{app.id}</span>
                                <span className="text-[9px] bg-slate-950 border border-slate-800 text-slate-400 font-black px-1.5 py-0.2 rounded font-mono">
                                  Tx: {app.codigoTransaccion}
                                </span>
                                <span className="text-[9px] bg-slate-950 border border-indigo-900/60 text-indigo-400 font-black px-2 py-0.2 rounded font-mono">
                                  Turno: E-{app.id.slice(-4).toUpperCase()}
                                </span>
                              </div>
                              <h5 className="text-base font-black text-slate-100 uppercase leading-snug">{name}</h5>
                              <span className="text-[11px] text-emerald-400 font-bold block">Agendado por: {app.creadoPor || app.datosPersonales?.creadoPor || 'Portal del Ciudadano'}</span>
                              <span className="text-[11px] text-slate-450 font-bold block">Nacionalidad: {app.datosPersonales?.nacionalidad || 'N/D'}  |  Pasaporte: {passport}</span>
                            </div>

                            {/* Status Badge */}
                            <div className="shrink-0 flex items-center gap-2">
                              {isInAttention ? (
                                <span className="bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 font-black text-[10.5px] uppercase px-3.5 py-1.5 rounded-full flex items-center gap-2 shadow-sm">
                                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                                  <span>EN ATENCIÓN ACTIVA</span>
                                </span>
                              ) : isPaidInCaja ? (
                                <span className="bg-indigo-950/90 border border-indigo-500/80 text-indigo-300 font-black text-[10.5px] uppercase px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                                  <CreditCard className="w-4 h-4 text-indigo-400" />
                                  <span>ENVIADO A CAJA</span>
                                </span>
                              ) : (
                                <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 font-black text-[10.5px] uppercase px-3.5 py-1.5 rounded-full flex items-center gap-1.5 shadow-sm">
                                  <Clock className="w-4 h-4 text-amber-400" />
                                  <span>EN ESPERA DE ATENCIÓN</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="bg-slate-950/40 border border-slate-850 p-4 rounded-lg">
                            <p className="text-xs text-slate-400 leading-relaxed font-semibold">
                              {isInAttention ? (
                                <span className="text-emerald-300">
                                  🟢 <strong>Atención presencial en progreso:</strong> El ciudadano está siendo atendido en su cubículo. Cuando complete la entrevista o verificación, puede enviarlo a caja con su ticket o dar por concluido el trámite.
                                </span>
                              ) : (
                                <span>
                                  Ciudadano asignado a este cubículo. Si el ciudadano no se ha presentado, puede pulsar <strong>Llamar a Pantalla</strong> para emitir el anuncio por la Pantalla de Turnos (sin sonido en su equipo). Cuando el ciudadano esté listo en su cubículo, presione <strong>Iniciar Atención</strong>.
                                </span>
                              )}
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
                                href={ticketKioscoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="bg-slate-900 hover:bg-slate-850 border border-slate-850 text-slate-350 hover:text-white px-2.5 py-1 rounded text-[9px] font-black uppercase tracking-wider flex items-center gap-1 cursor-pointer transition select-none"
                                referrerPolicy="no-referrer"
                              >
                                <span>Abrir Kiosco de Tickets</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            </div>

                            <p className="text-[10.5px] text-slate-400 leading-relaxed font-semibold">
                              Por normativas, todo trámite migratorio presencial en el Tribunal Electoral requiere emitirse primero con el número oficial de ticket de caja en <strong className="text-slate-200 font-mono break-all">{ticketKioscoUrl}</strong> para la recaudación tributaria.
                            </p>
                          </div>

                          {/* Cubicle Action Controls */}
                          <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 border-t border-slate-800/80">
                            {/* Call citizen to Turn Screen (no sound on operator workstation) */}
                            <button
                              type="button"
                              onClick={() => handleRecallCitizen(app.id)}
                              className="px-3.5 py-2.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white border border-slate-750 cursor-pointer transition flex items-center justify-center gap-1.5"
                              title="Llamar al ciudadano a través de la Pantalla de Turnos en sala (sin sonido en este equipo)"
                            >
                              <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                              <span>Llamar a Pantalla</span>
                            </button>

                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {/* BOTÓN INICIAR ATENCIÓN */}
                              {!isInAttention ? (
                                <button
                                  type="button"
                                  onClick={() => handleStartAttention(app.id)}
                                  className="px-5 py-2.5 rounded-lg text-[10.5px] font-black uppercase tracking-wider shadow-lg flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 cursor-pointer transition shadow-emerald-950/40"
                                  title="Haga clic para iniciar la atención presencial de este ciudadano"
                                >
                                  <Play className="w-4 h-4 fill-white" />
                                  <span>Iniciar Atención</span>
                                </button>
                              ) : (
                                <div className="flex items-center gap-1.5 bg-emerald-950/90 border border-emerald-600/80 px-4 py-2 rounded-lg text-emerald-300 text-[10.5px] font-black uppercase tracking-wider shadow-inner">
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                  <span>Atención en Curso</span>
                                </div>
                              )}

                              {/* Concluir trámite */}
                              <button
                                type="button"
                                onClick={() => handleCompleteAppointment(app.id)}
                                className="px-5 py-2.5 rounded-lg text-[10.5px] font-black uppercase tracking-wider shadow flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white border border-indigo-700 cursor-pointer transition"
                                title="Concluir el trámite y liberar el cubículo"
                              >
                                <UserCheck className="w-4 h-4" />
                                <span>Concluir Trámite</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* 2. PRÓXIMOS EN COLA DE ESPERA: TAMAÑO MÁS CHICO Y EN LISTA ABAJO */}
                    {listApps.length > 0 && (
                      <div className="space-y-3.5 pt-4">
                        <div className="flex items-center gap-2 border-b border-slate-900 pb-3">
                          <Users className="w-4 h-4 text-indigo-400" />
                          <span className="text-[10px] font-black uppercase tracking-widest text-slate-300">
                            Próximos en Cola de Espera ({listApps.length})
                          </span>
                        </div>

                        <div className="space-y-3">
                          {listApps.map(app => {
                            const name = getExtranjeriaCitizenName(app);
                            const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                            const meta = appMetadata[app.id];
                            const isPaidInCaja = meta?.estadoTicket === 'pagado_en_caja';

                            return (
                              <div 
                                key={`cubiculo-row-compact-${app.id}`}
                                className="bg-slate-900/40 hover:bg-slate-900/70 border border-slate-850 rounded-xl p-4 transition duration-250 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm"
                              >
                                <div className="flex items-start gap-3 min-w-0 flex-1">
                                  {/* Small Badge */}
                                  <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-850 flex items-center justify-center shrink-0">
                                    <span className="text-[9.5px] font-black font-mono text-amber-500">
                                      E-{app.id.slice(-3).toUpperCase()}
                                    </span>
                                  </div>
                                  
                                  <div className="min-w-0 text-left space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                      <h6 className="text-xs font-black text-slate-200 uppercase leading-tight truncate">
                                        {name}
                                      </h6>
                                      {isPaidInCaja ? (
                                        <span className="text-[8px] bg-indigo-950/80 border border-indigo-800/40 text-indigo-300 font-black px-2 py-0.2 rounded uppercase">
                                          Enviado a Caja
                                        </span>
                                      ) : (
                                        <span className="text-[8px] bg-amber-950/80 border border-amber-800/40 text-amber-300 font-black px-2 py-0.2 rounded uppercase">
                                          En Espera
                                        </span>
                                      )}
                                    </div>
                                    <p className="text-[10px] text-slate-450 font-bold block truncate leading-none">
                                      Nac: <span className="text-slate-350">{app.datosPersonales?.nacionalidad || 'N/D'}</span> | Pasaporte: <span className="text-slate-350">{passport}</span> | Tx: <span className="text-slate-350 font-mono">{app.codigoTransaccion}</span>
                                    </p>
                                  </div>
                                </div>

                                {/* Compact Actions */}
                                <div className="flex flex-wrap items-center gap-2 shrink-0 md:self-center">
                                  {/* Llamar a pantalla */}
                                  <button
                                    type="button"
                                    onClick={() => handleRecallCitizen(app.id)}
                                    className="p-2 bg-slate-950 hover:bg-slate-850 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded-lg transition cursor-pointer"
                                    title="Llamar a Pantalla 📺"
                                  >
                                    <Volume2 className="w-3.5 h-3.5 text-amber-400" />
                                  </button>

                                  {/* Iniciar atención */}
                                  <button
                                    type="button"
                                    onClick={() => handleStartAttention(app.id)}
                                    className="px-3.5 py-1.5 bg-emerald-600/90 hover:bg-emerald-500 hover:text-white text-white rounded-lg text-[9.5px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 shadow-sm"
                                    title="Iniciar Atención"
                                  >
                                    <Play className="w-3 h-3 fill-white" />
                                    <span>Iniciar</span>
                                  </button>

                                  {/* Concluir trámite */}
                                  <button
                                    type="button"
                                    onClick={() => handleCompleteAppointment(app.id)}
                                    className="px-3.5 py-1.5 bg-indigo-600/90 hover:bg-indigo-700 hover:text-white text-white rounded-lg text-[9.5px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 shadow-sm"
                                    title="Concluir Trámite"
                                  >
                                    <UserCheck className="w-3 h-3" />
                                    <span>Concluir</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()
            )}

            {/* SECCIÓN: HISTORIAL DE ATENDIDOS HOY EN ESTE CUBÍCULO (EXCLUSIVAMENTE HOY) */}
            <div className="pt-5 border-t border-slate-900 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="space-y-0.5">
                  <h5 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                    <UserCheck className="w-4 h-4 text-emerald-400" />
                    <span>Ciudadanos Atendidos Hoy en este Cubículo</span>
                    <span className="bg-emerald-950/80 border border-emerald-800 text-emerald-300 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold">
                      {cubiculoCompletedTodayApps.length}
                    </span>
                  </h5>
                  <p className="text-[10px] text-slate-450 font-semibold">
                    Solo muestra los trámites concluidos en esta estación hoy ({todayStr}). Las citas de días anteriores no se muestran aquí.
                  </p>
                </div>
              </div>

              {cubiculoCompletedTodayApps.length === 0 ? (
                <div className="bg-slate-900/40 border border-slate-850 border-dashed rounded-xl p-4 text-center text-slate-500 text-[11px] italic">
                  Aún no se han concluido trámites hoy en esta estación.
                </div>
              ) : (
                <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                  {cubiculoCompletedTodayApps.map(app => {
                    const name = getExtranjeriaCitizenName(app);
                    const appCode = app.id.slice(-4).toUpperCase();
                    const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
                    const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                    const timeOnly = meta?.timestampCompletado ? meta.timestampCompletado.split(' ').pop() : '';

                    return (
                      <div
                        key={`cubiculo-completed-${app.id}`}
                        className="bg-slate-900/60 border border-slate-850 hover:border-slate-800 rounded-lg p-3 flex items-center justify-between gap-3 text-xs transition"
                      >
                        <div className="min-w-0 flex-1 space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono font-bold text-indigo-400 bg-indigo-950/80 border border-indigo-900/80 px-2 py-0.5 rounded">
                              TURNO: E-{appCode}
                            </span>
                            <h6 className="text-[11.5px] font-black text-slate-200 uppercase truncate">
                              {name}
                            </h6>
                          </div>
                          <p className="text-[10px] text-slate-400 font-medium truncate">
                            Pasaporte: <span className="text-slate-300 font-mono">{passport}</span> | Trámite: <span className="text-slate-300">{app.subTramite || app.tramite || 'Atención Extranjería'}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0 space-y-0.5">
                          <span className="text-[8.5px] bg-emerald-950 border border-emerald-800 text-emerald-400 font-black px-2 py-0.5 rounded uppercase block w-fit ml-auto">
                            ✓ Concluido Hoy
                          </span>
                          {timeOnly && (
                            <span className="text-[9px] font-mono font-semibold text-slate-400 block">
                              Hora: {timeOnly}
                            </span>
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
      )}

      {/* ======================================================== */}
      {/* PROFILE 4: PANTALLA DE TURNOS EN VIVO */}
      {/* ======================================================== */}
      {subRole === 'pantalla' && (() => {
        // Encontrar ciudadano actualmente llamado en pantalla (NO debe estar 'en_atencion' ni 'realizada')
        // El llamado se quita de inmediato cuando el agente presiona "Iniciar Atención"
        let featuredApp: any = null;
        let featuredBooth: any = null;

        // 1. Verificar si hay un evento de llamado activo emitido recientemente
        if (lastCallEvent && (Math.abs(Date.now() - lastCallEvent.timestamp) < 300000)) {
          // Descartar llamadas de días anteriores de inmediato en pantalla
          const callDay = new Date(lastCallEvent.timestamp).toLocaleDateString('en-CA');
          if (callDay !== todayStr) {
            featuredApp = null;
            featuredBooth = null;
          } else {
            // Descartar cualquier residuo de demo
            const rawName = String(lastCallEvent.cleanCitizenName || (lastCallEvent as any).citizenName || '').toUpperCase();
            if (
              rawName.includes('CARLOS') ||
              rawName.includes('SANCHEZ') ||
              rawName.includes('SÁNCHEZ') ||
              rawName.includes('ISABEL') ||
              rawName.includes('WALTER') ||
              lastCallEvent.appId === 'EXT-8K2P9'
            ) {
              featuredApp = null;
              featuredBooth = null;
            } else {
              const matchingApp = appointments.find(a => 
                (String(a.id) === String(lastCallEvent.appId) || a.codigoTransaccion === lastCallEvent.appId) &&
                (!a.fecha || standardizeDateString(a.fecha) === todayStr)
              );
              if (!matchingApp) {
                featuredApp = null;
                featuredBooth = null;
              } else {
              const meta = appMetadata[matchingApp.id] || (matchingApp.codigoTransaccion ? appMetadata[matchingApp.codigoTransaccion] : null);

              // Si el agente en el cubículo ya presionó "Iniciar Atención" (en_atencion), el llamado se retira
              if (meta?.estadoTicket !== 'en_atencion') {
              const bId = Number(lastCallEvent.boothId) || Number(meta?.assignedCubiculo) || 1;
              const bName = lastCallEvent.boothName || getBoothDisplayName(bId);
              const realCitizenName = lastCallEvent.cleanCitizenName || 
                                      (lastCallEvent as any).citizenName || 
                                      (matchingApp ? getExtranjeriaCitizenName(matchingApp) : '') ||
                                      'Ciudadano';

              const displayAppCode = String(
                (lastCallEvent as any).turnCode ||
                lastCallEvent.codePart ||
                matchingApp?.codigoTransaccion ||
                matchingApp?.codigoCita ||
                lastCallEvent.appId
              ).trim().toUpperCase();

              featuredApp = {
                ...(matchingApp || {}),
                id: lastCallEvent.appId,
                codigoTransaccion: displayAppCode,
                turnCode: displayAppCode,
                nombre: realCitizenName,
                creadoPor: matchingApp?.creadoPor || 'Portal del Ciudadano',
                subServicioNombre: matchingApp?.subServicioNombre || matchingApp?.subTramite || 'Atención de Extranjería',
                datosPersonales: {
                  ...(matchingApp?.datosPersonales || {}),
                  nombreCompleto: realCitizenName
                }
              };
              featuredBooth = { id: bId, name: bName };
            }
          }
        }
      }
    }

        // Helper para mostrar el número de cita enviado desde la web o asignado por el sistema
        const getDisplayAppointmentNumber = (app: any) => {
          if (!app) return '---';
          if (app.codigoTransaccion && String(app.codigoTransaccion).trim()) {
            return String(app.codigoTransaccion).trim().toUpperCase();
          }
          if (app.codigoCita && String(app.codigoCita).trim()) {
            return String(app.codigoCita).trim().toUpperCase();
          }
          const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null) || appMetadata[String(app.id)];
          if (meta && (meta as any).codigoTransaccion && String((meta as any).codigoTransaccion).trim()) {
            return String((meta as any).codigoTransaccion).trim().toUpperCase();
          }
          if (meta && (meta as any).turnCode && String((meta as any).turnCode).trim()) {
            return String((meta as any).turnCode).trim().toUpperCase();
          }
          if (app.id && String(app.id).trim() && !String(app.id).startsWith('EXT-CSV-') && !String(app.id).startsWith('temp-')) {
            return String(app.id).trim().toUpperCase();
          }
          return 'CITA EN ATENCIÓN';
        };
        const getDisplayTurnCode = getDisplayAppointmentNumber;

        const activeBoothsList = booths.filter(b => b.active);

        return (
          <div 
            ref={screenContainerRef} 
            onDoubleClick={toggleFullscreen}
            className={`animate-fade-in text-left ${
              isFullscreen 
                ? 'bg-slate-950 p-6 lg:p-10 h-screen min-h-screen w-full flex flex-col justify-between select-none overflow-hidden space-y-6' 
                : 'space-y-5'
            }`}
          >
            {/* Hover-reveal floating exit button for TV/Touchscreen convenience */}
            {isFullscreen && (
              <button
                type="button"
                onClick={toggleFullscreen}
                className="fixed top-3 right-3 z-50 bg-slate-900/60 hover:bg-slate-800 border border-slate-700/60 text-slate-300 px-3.5 py-2 rounded-xl opacity-0 hover:opacity-100 transition-opacity duration-200 text-xs font-black uppercase tracking-wider cursor-pointer"
                title="Doble clic en el fondo o presione ESC para salir"
              >
                Salir de Pantalla Completa ✕
              </button>
            )}

            {/* Encabezado Institucional Oficial con Título */}
            <div className="flex flex-col md:flex-row items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 p-4 lg:p-5 rounded-2xl shadow-xl select-none">
              <div className="flex items-center gap-4">
                <div className="inline-flex relative shrink-0">
                  <img
                    src="/images/logo-sede-te-1.png"
                    alt="Tribunal Electoral Logo"
                    className="w-14 h-14 sm:w-16 sm:h-16 object-contain rounded-xl bg-white p-1.5 border border-amber-500/40 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="space-y-0.5 text-left">
                  <span className="text-[10px] sm:text-xs font-black tracking-widest text-[#d9a74a] uppercase font-mono block">
                    REPÚBLICA DE PANAMÁ ● TRIBUNAL ELECTORAL
                  </span>
                  <h1 className="text-lg sm:text-2xl lg:text-3xl font-black text-white uppercase tracking-tight">
                    SALA DE ATENCIÓN DE EXTRANJERÍA
                  </h1>
                  <span className="text-[10px] sm:text-xs font-bold text-slate-400 block tracking-wide">
                    DIRECCIÓN NACIONAL DE CEDULACIÓN • SEDE ANCÓN
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <TurnScreenClock />

                <div className="flex items-center gap-2">
                  {/* Sound Status Indicator for Pantalla */}
                  <button
                    type="button"
                    onClick={() => {
                      const next = !screenSoundEnabled;
                      setScreenSoundEnabled(next);
                      if (next) {
                        playChimeSound("Audio de pantalla activado.");
                      }
                    }}
                    className={`border px-3.5 py-1.5 rounded-xl transition flex items-center gap-2 cursor-pointer select-none text-xs font-black uppercase tracking-wider ${
                      screenSoundEnabled 
                        ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 hover:bg-amber-900/80 shadow-md shadow-amber-950/40' 
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                    title={screenSoundEnabled ? "Sonido activado en esta pantalla de turnos" : "Sonido silenciado en esta pantalla"}
                  >
                    {screenSoundEnabled ? <Volume2 className="w-3.5 h-3.5 text-amber-400" /> : <VolumeX className="w-3.5 h-3.5 text-slate-500" />}
                    <span>{screenSoundEnabled ? "Audio Activo" : "Audio Mute"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 text-slate-300 hover:text-amber-400 px-3.5 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer text-xs font-black uppercase tracking-wider"
                    title={isFullscreen ? "Salir de pantalla completa" : "Poner en pantalla completa para TV"}
                  >
                    {isFullscreen ? <Minimize className="w-3.5 h-3.5 text-amber-500" /> : <Maximize className="w-3.5 h-3.5 text-amber-500" />}
                    <span>{isFullscreen ? "Salir" : "Pantalla Completa 📺"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      const realApp = appointments.find(a => isExtranjeriaAppointment(a)) || appointments[0];
                      if (!realApp) {
                        showStatus("No hay citas de extranjería registradas en la base de datos.", "info");
                        return;
                      }
                      const citizenName = getExtranjeriaCitizenName(realApp) || realApp.nombre || 'Ciudadano';
                      const appId = String(realApp.codigoTransaccion || realApp.codigoCita || realApp.id);
                      const targetBooth = booths.find(b => b.active) || booths[0] || { id: 1, name: 'Cubículo 19' };
                      const boothId = targetBooth.id;
                      const boothName = getBoothDisplayName(targetBooth);
                      const announcementText = `${citizenName}. Favor dirigirse al ${boothName}.`;
                      
                      setIsCallOverlayMinimized(false);
                      setCallRemainingSeconds(10);
                      emitCallToPantalla({
                        appId,
                        codePart: appId,
                        cleanCitizenName: citizenName,
                        boothId,
                        boothName,
                        announcementText,
                        type: 'cubiculo',
                        turnCode: appId
                      });
                      playChimeSound(announcementText);
                    }}
                    className="bg-amber-950/70 border border-amber-500/50 hover:bg-amber-900/80 text-amber-300 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer text-xs font-black uppercase tracking-wider"
                    title="Emitir llamado con la cita activa de la base de datos para verificar pantalla gigante y voz"
                  >
                    <span>🔔 Probar Llamado BD</span>
                  </button>

                  <button
                    type="button"
                    onClick={copyTvLink}
                    className="bg-slate-900 border border-slate-800 hover:border-emerald-500/50 hover:bg-slate-850 text-slate-300 hover:text-emerald-400 px-3 py-1.5 rounded-xl transition flex items-center gap-1.5 cursor-pointer text-xs font-black uppercase tracking-wider"
                    title="Copiar URL directa de la pantalla de TV (/tv/extranjeria)"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Link TV</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      fetchAppointments();
                      fetchServerMetadata();
                    }}
                    disabled={loading}
                    className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 p-2 rounded-xl transition cursor-pointer"
                    title="Actualizar Datos"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* FULLSCREEN CALL TAKEOVER OVERLAY (PANTALLA COMPLETA DE CONVOCATORIA) */}
            {featuredApp && featuredBooth && !isCallOverlayMinimized && (() => {
              const featuredCitizenName = (featuredApp.nombre && !isGenericPlaceholderName(featuredApp.nombre) && featuredApp.nombre !== 'Ciudadano en Atención') 
                ? featuredApp.nombre 
                : (featuredApp.datosPersonales?.nombreCompleto && !isGenericPlaceholderName(featuredApp.datosPersonales.nombreCompleto))
                  ? featuredApp.datosPersonales.nombreCompleto
                  : (getExtranjeriaCitizenName(featuredApp) && getExtranjeriaCitizenName(featuredApp) !== 'Ciudadano en Atención')
                    ? getExtranjeriaCitizenName(featuredApp)
                    : ((lastCallEvent as any)?.citizenName || lastCallEvent?.cleanCitizenName || 'Ciudadano');

              const appNumber = getDisplayAppointmentNumber(featuredApp);

              return (
                <div className="fixed inset-0 z-50 bg-slate-950/98 backdrop-blur-md flex flex-col justify-between p-6 sm:p-10 lg:p-12 select-none animate-fade-in text-left">
                  {/* Encabezado Institucional en Pantalla Completa */}
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4 pb-6 border-b border-slate-800 shrink-0">
                    <div className="flex items-center gap-4">
                      <img
                        src="/images/logo-sede-te-1.png"
                        alt="Tribunal Electoral Logo"
                        className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl bg-white p-2 border-2 border-amber-500/60 shadow-xl"
                        referrerPolicy="no-referrer"
                      />
                      <div className="space-y-1">
                        <span className="text-xs sm:text-sm font-black tracking-widest text-[#d9a74a] uppercase font-mono block">
                          REPÚBLICA DE PANAMÁ ● TRIBUNAL ELECTORAL
                        </span>
                        <h1 className="text-xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight">
                          SALA DE ATENCIÓN DE EXTRANJERÍA
                        </h1>
                        <span className="text-xs sm:text-sm font-bold text-slate-400 block tracking-wide">
                          DIRECCIÓN NACIONAL DE CEDULACIÓN • SEDE ANCÓN
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <TurnScreenClock />
                      <div className="bg-slate-900 border border-amber-500/40 text-amber-300 px-3 py-1.5 rounded-xl font-mono text-xs font-bold flex items-center gap-1.5 shadow-md">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                        <span>{callRemainingSeconds}s</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsCallOverlayMinimized(true)}
                        className="bg-slate-900 border border-slate-700 hover:bg-slate-800 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider transition cursor-pointer flex items-center gap-2 shadow-lg"
                        title="Ver cuadrícula de cubículos"
                      >
                        <span>Ver Cubículos</span>
                        <Minimize className="w-4 h-4 text-amber-400" />
                      </button>
                    </div>
                  </div>

                  {/* Cuerpo Central del Llamado en Pantalla Completa */}
                  <div className="my-auto py-6 text-center space-y-6 max-w-6xl mx-auto w-full">
                    {/* Badge de Llamando con halo y pulso */}
                    <div className="inline-flex items-center gap-3 bg-amber-500 text-slate-950 px-8 py-3 rounded-full font-black text-sm sm:text-base lg:text-lg uppercase tracking-widest shadow-2xl shadow-amber-500/50 animate-bounce">
                      <span className="w-3.5 h-3.5 rounded-full bg-slate-950 animate-ping" />
                      <span>🔔 ¡LLAMANDO A CUBÍCULO!</span>
                    </div>

                    {/* Nombre del Ciudadano en Tamaño Gigante */}
                    <div className="space-y-2">
                      <span className="text-sm sm:text-base lg:text-lg font-black uppercase tracking-widest text-slate-400 font-mono block">
                        CIUDADANO CONVOCADO
                      </span>
                      <div className="text-5xl sm:text-7xl lg:text-8xl xl:text-9xl font-black text-[#f8c95c] uppercase tracking-tight leading-none drop-shadow-[0_0_40px_rgba(248,201,92,0.6)] break-words">
                        {featuredCitizenName}
                      </div>
                    </div>

                    {/* Cubículo de Destino y Número de Cita */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 max-w-4xl mx-auto items-stretch">
                      {/* Cubículo Box Gigante */}
                      <div className="bg-emerald-950/85 border-4 border-emerald-400 rounded-3xl p-6 lg:p-8 shadow-2xl shadow-emerald-500/30 flex flex-col justify-center items-center space-y-3">
                        <span className="text-sm sm:text-base font-black tracking-widest text-emerald-300 uppercase block">
                          FAVOR DIRIGIRSE AL
                        </span>
                        <div className="text-5xl sm:text-7xl lg:text-8xl font-black text-emerald-300 uppercase tracking-tight drop-shadow-[0_0_25px_rgba(52,211,153,0.5)]">
                          {featuredBooth.name}
                        </div>
                        <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-200 bg-emerald-900/90 px-4 py-1.5 rounded-xl border border-emerald-400/40">
                          <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                          <span>PASO HABILITADO</span>
                        </div>
                      </div>

                      {/* Número de Cita Box */}
                      <div className="bg-slate-900/90 border-4 border-slate-700/80 rounded-3xl p-6 lg:p-8 shadow-2xl flex flex-col justify-center items-center space-y-2">
                        <span className="text-sm sm:text-base font-black tracking-widest text-amber-400 uppercase font-mono block">
                          NÚMERO DE CITA
                        </span>
                        <div className="text-4xl sm:text-5xl lg:text-6xl font-mono font-black tracking-widest text-white drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                          {appNumber}
                        </div>
                        {featuredApp.subServicioNombre && (
                          <div className="text-xs sm:text-sm text-slate-300 font-bold uppercase tracking-wide truncate max-w-xs pt-1">
                            {featuredApp.subServicioNombre}
                          </div>
                        )}
                        <span className="text-xs sm:text-sm text-emerald-400 font-semibold block pt-1">
                          Agendado por: {featuredApp.creadoPor || featuredApp.datosPersonales?.creadoPor || 'Portal del Ciudadano'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Barra de cuenta regresiva de 10 segundos */}
                  <div className="w-full max-w-4xl mx-auto space-y-1.5 shrink-0 pt-2">
                    <div className="flex items-center justify-between text-[11px] font-mono font-bold text-slate-400">
                      <span>Mostrando llamado en grande: <strong className="text-amber-400 font-black">{callRemainingSeconds}s</strong></span>
                      <span>Volviendo a los cubículos en {callRemainingSeconds}s</span>
                    </div>
                    <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                      <div 
                        className="bg-gradient-to-r from-amber-500 via-[#f8c95c] to-emerald-400 h-full transition-all duration-300"
                        style={{ width: `${Math.min(100, Math.max(0, (callRemainingSeconds / 10) * 100))}%` }}
                      />
                    </div>
                  </div>

                  {/* Barra inferior informativa */}
                  <div className="flex items-center justify-between text-xs text-slate-400 border-t border-slate-800 pt-4 shrink-0">
                    <span>Sede Central Ancón ● Dirección Nacional de Cedulación</span>
                    <button
                      type="button"
                      onClick={() => setIsCallOverlayMinimized(true)}
                      className="text-amber-400 hover:text-amber-300 font-bold uppercase tracking-wider cursor-pointer underline text-xs"
                    >
                      Ver cuadrícula de todos los cubículos
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* COMPACT CALL BANNER (CUANDO EL USUARIO MINIMIZA EL OVERLAY PARA VER LOS CUBÍCULOS) */}
            {featuredApp && featuredBooth && isCallOverlayMinimized && (
              <div className="bg-amber-950/80 border-2 border-amber-500/80 p-4 rounded-2xl flex items-center justify-between gap-4 shadow-lg animate-pulse">
                <div className="flex items-center gap-3">
                  <span className="text-xl">🔔</span>
                  <div>
                    <span className="text-xs font-black text-amber-400 uppercase font-mono">Llamado Activo:</span>
                    <span className="text-sm sm:text-base font-black text-white ml-2 uppercase">
                      {(featuredApp.nombre && !isGenericPlaceholderName(featuredApp.nombre) && featuredApp.nombre !== 'Ciudadano en Atención') ? featuredApp.nombre : 'Ciudadano'}
                    </span>
                    <span className="text-emerald-400 font-black ml-2 uppercase">➔ {featuredBooth.name}</span>
                    <span className="text-slate-400 text-xs font-mono ml-2">(Cita: {getDisplayAppointmentNumber(featuredApp)})</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsCallOverlayMinimized(false)}
                  className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase px-4 py-2 rounded-xl transition cursor-pointer shadow-md flex items-center gap-1.5"
                >
                  <Maximize className="w-3.5 h-3.5" />
                  <span>Ver Pantalla Completa 📺</span>
                </button>
              </div>
            )}

            {!featuredApp && (
              <div className="bg-slate-900/80 border-2 border-slate-800/90 p-4 lg:p-5 rounded-2xl text-center space-y-1.5 shadow-xl">
                <span className="inline-block px-3.5 py-1 rounded-full text-xs font-black text-amber-400 bg-amber-950/60 border border-amber-500/30 uppercase tracking-widest font-mono">
                  SALA DE ESPERA ● MÓDULO EXTRANJERÍA
                </span>
                <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mx-auto font-semibold">
                  Por favor permanezca atento a su llamado en pantalla. Su nombre y cubículo asignado se anunciarán automáticamente.
                </p>
              </div>
            )}

            {/* Main Monitor Display Grid - High Visibility Booths (SOLO LOS CUBÍCULOS HABILITADOS POR EL SUPERVISOR) */}
            <div className={`grid gap-6 ${
              activeBoothsList.length === 1 
                ? 'grid-cols-1 max-w-2xl mx-auto w-full' 
                : activeBoothsList.length === 2 
                  ? 'grid-cols-1 md:grid-cols-2 max-w-5xl mx-auto w-full' 
                  : activeBoothsList.length === 3 
                    ? 'grid-cols-1 md:grid-cols-3' 
                    : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
            } ${isFullscreen ? 'flex-1 items-stretch' : ''}`}>
              {activeBoothsList.map(b => {
                // If the cubicle is in recess, it CANNOT be attending or calling
                if (b.receso) {
                  return (
                    <div 
                      key={`tv-booth-${b.id}`} 
                      className={`bg-slate-900 border rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between relative overflow-hidden border-amber-600/45 shadow-lg shadow-amber-950/20 bg-gradient-to-b from-slate-900 via-slate-900/95 to-amber-950/15 ${
                        isFullscreen ? 'h-full py-8 lg:py-12 xl:py-16' : 'min-h-[340px] lg:min-h-[380px]'
                      }`}
                    >
                      {/* Top Header */}
                      <div className="border-b border-slate-800 pb-3.5">
                        <div className="flex items-center justify-between">
                          <span className={`font-black text-white uppercase tracking-wider ${isFullscreen ? 'text-2xl sm:text-3xl xl:text-4xl' : 'text-lg sm:text-xl'}`}>
                            {getBoothDisplayName(b)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`bg-amber-950/80 text-amber-400 border border-amber-500/40 rounded-md font-black tracking-wider uppercase shadow-sm animate-pulse ${isFullscreen ? 'text-sm px-3.5 py-1.5' : 'text-xs px-2.5 py-1'}`}>
                              RECESO ⏸
                            </span>
                            <span className={`rounded-full ${isFullscreen ? 'w-4 h-4' : 'w-3.5 h-3.5'} bg-amber-500 animate-pulse`} />
                          </div>
                        </div>
                      </div>

                      {/* Mid Content - Receso */}
                      <div className="py-4 my-auto text-center space-y-3 flex flex-col justify-center items-center">
                        <div className="space-y-2">
                          <span className={`font-black uppercase tracking-wider block bg-amber-950/80 border border-amber-500/40 text-amber-400 rounded-md mx-auto w-fit animate-pulse ${
                            isFullscreen ? 'text-sm sm:text-base py-1.5 px-4' : 'text-xs sm:text-sm py-1 px-3'
                          }`}>
                            CUBÍCULO EN RECESO ⏸
                          </span>
                          <div className={`font-mono font-black text-amber-950/40 tracking-widest select-none py-1 ${
                            isFullscreen ? 'text-6xl sm:text-7xl lg:text-8xl xl:text-[6.5rem]' : 'text-4xl sm:text-5xl lg:text-6xl'
                          }`}>
                            ----
                          </div>
                          <p className={`text-amber-400 font-extrabold uppercase mt-1 leading-none ${
                            isFullscreen ? 'text-sm sm:text-base tracking-widest' : 'text-xs sm:text-sm'
                          }`}>
                            En Receso
                          </p>
                        </div>
                      </div>

                      {/* Bottom Footer */}
                      <div className="border-t border-slate-800 pt-3.5 flex items-center justify-between text-xs sm:text-sm">
                        <span className={`text-slate-450 font-extrabold uppercase ${isFullscreen ? 'text-sm lg:text-base' : 'text-xs sm:text-sm'}`}>Estado:</span>
                        <span className="text-amber-400 font-mono font-bold text-xs uppercase">En Receso</span>
                      </div>
                    </div>
                  );
                }

                // Booth is active and available:
                // An appointment is ONLY shown if an operator is currently attending it in real time
                // or actively calling it right now (from today's uncancelled appointments)
                const attendingApp = atencionDayUniverse.totalUniverse.find(app => {
                  const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
                  return meta && Number(meta.assignedCubiculo) === Number(b.id) && meta.estadoTicket === 'en_atencion';
                });

                let callingApp: any = null;
                if (!attendingApp && lastCallEvent && Number(lastCallEvent.boothId) === Number(b.id) && (Math.abs(Date.now() - lastCallEvent.timestamp) < 30000)) {
                  callingApp = atencionDayUniverse.totalUniverse.find(a => 
                    String(a.id) === String(lastCallEvent.appId) || 
                    a.codigoTransaccion === lastCallEvent.appId
                  );
                }

                const activeApp = attendingApp || callingApp || null;
                const isAttending = Boolean(attendingApp);

                // Queue remaining assigned to this booth from today's real appointments
                const queueRemaining = atencionDayUniverse.totalUniverse.filter(app => {
                  const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
                  if (!meta || Number(meta.assignedCubiculo) !== Number(b.id)) return false;
                  if (activeApp && (String(app.id) === String(activeApp.id) || app.codigoTransaccion === activeApp.codigoTransaccion)) return false;
                  return meta.estadoTicket === 'en_espera' || meta.estadoTicket === 'ninguno';
                });

                if (!activeApp) {
                  // Agent is not attending or waiting for appointment assignment:
                  // "si agente no esta disponible no be salir nada debe salir esperando que lo asignen"
                  return (
                    <div 
                      key={`tv-booth-${b.id}`} 
                      className={`bg-slate-900 border rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between relative overflow-hidden border-slate-800/90 shadow-lg shadow-black/50 ${
                        isFullscreen ? 'h-full py-8 lg:py-12 xl:py-16' : 'min-h-[340px] lg:min-h-[380px]'
                      }`}
                    >
                      {/* Top Header of booth */}
                      <div className="border-b border-slate-800 pb-3.5">
                        <div className="flex items-center justify-between">
                          <span className={`font-black text-white uppercase tracking-wider ${isFullscreen ? 'text-2xl sm:text-3xl xl:text-4xl' : 'text-lg sm:text-xl'}`}>
                            {getBoothDisplayName(b)}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className={`bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 rounded-md font-black tracking-wider uppercase shadow-sm ${isFullscreen ? 'text-sm px-3.5 py-1.5' : 'text-xs px-2.5 py-1'}`}>
                              DISPONIBLE
                            </span>
                            <span className={`rounded-full ${isFullscreen ? 'w-4 h-4' : 'w-3.5 h-3.5'} bg-emerald-500`} />
                          </div>
                        </div>
                      </div>

                      {/* Mid Content - Esperando que lo asignen */}
                      <div className="py-4 my-auto text-center space-y-3 flex flex-col justify-center items-center">
                        <div className="space-y-2">
                          <span className={`font-black uppercase tracking-wider block bg-emerald-950/60 border border-emerald-500/30 text-emerald-400 rounded-md mx-auto w-fit ${
                            isFullscreen ? 'text-sm sm:text-base py-1.5 px-4' : 'text-xs sm:text-sm py-1 px-3'
                          }`}>
                            CUBÍCULO DISPONIBLE
                          </span>
                          <div className={`font-mono font-black text-slate-700 tracking-widest select-none py-1 ${
                            isFullscreen ? 'text-6xl sm:text-7xl lg:text-8xl xl:text-[6.5rem]' : 'text-4xl sm:text-5xl lg:text-6xl'
                          }`}>
                            ----
                          </div>
                          <p className={`text-slate-300 font-extrabold uppercase mt-1 leading-none ${
                            isFullscreen ? 'text-sm sm:text-base tracking-widest' : 'text-xs sm:text-sm'
                          }`}>
                            Esperando que lo asignen
                          </p>
                        </div>
                      </div>

                      {/* Bottom Footer */}
                      <div className="border-t border-slate-800 pt-3.5 flex items-center justify-between text-xs sm:text-sm">
                        <span className={`text-slate-450 font-extrabold uppercase ${isFullscreen ? 'text-sm lg:text-base' : 'text-xs sm:text-sm'}`}>Estado:</span>
                        <span className={`text-emerald-400 font-mono font-bold uppercase ${isFullscreen ? 'text-sm sm:text-base' : 'text-xs'}`}>Esperando que lo asignen</span>
                      </div>
                    </div>
                  );
                }

                // If activeApp is present (currently being attended or called):
                const activeMeta = appMetadata[activeApp.id] || (activeApp.codigoTransaccion ? appMetadata[activeApp.codigoTransaccion] : null);

                // Dynamic name resolution for booth view
                let citizenName = '';
                if (activeMeta?.citizenName && !isGenericPlaceholderName(activeMeta.citizenName) && activeMeta.citizenName !== 'Ciudadano en Atención') {
                  citizenName = activeMeta.citizenName;
                } else if (activeApp.nombre && !isGenericPlaceholderName(activeApp.nombre) && activeApp.nombre !== 'Ciudadano en Atención') {
                  citizenName = activeApp.nombre;
                } else if (activeApp.datosPersonales?.nombreCompleto && !isGenericPlaceholderName(activeApp.datosPersonales.nombreCompleto)) {
                  citizenName = activeApp.datosPersonales.nombreCompleto;
                } else {
                  citizenName = getExtranjeriaCitizenName(activeApp) || 'Ciudadano';
                }

                const getDynamicNameSizeClass = (nameStr: string) => {
                  const len = nameStr.length;
                  if (isFullscreen) {
                    if (len <= 15) return 'text-4xl sm:text-5xl lg:text-6xl xl:text-7xl';
                    if (len <= 25) return 'text-3xl sm:text-4xl lg:text-5xl xl:text-6xl';
                    if (len <= 35) return 'text-2xl sm:text-3xl lg:text-4xl xl:text-5xl';
                    return 'text-xl sm:text-2xl lg:text-3xl xl:text-4xl';
                  } else {
                    if (len <= 15) return 'text-2xl sm:text-3xl lg:text-4xl';
                    if (len <= 25) return 'text-xl sm:text-2xl lg:text-3xl';
                    if (len <= 35) return 'text-lg sm:text-xl lg:text-2xl';
                    return 'text-sm sm:text-base lg:text-lg';
                  }
                };
                const nameSizeClass = getDynamicNameSizeClass(citizenName);

                return (
                  <div 
                    key={`tv-booth-${b.id}`} 
                    className={`bg-slate-900 border rounded-2xl p-6 transition-all duration-300 flex flex-col justify-between relative overflow-hidden ${
                      isFullscreen 
                        ? 'h-full py-8 lg:py-12 xl:py-16' 
                        : 'min-h-[340px] lg:min-h-[380px]'
                    } ${
                      isAttending
                        ? 'border-emerald-500/80 border-3 shadow-2xl shadow-emerald-950/30 bg-gradient-to-b from-slate-900 via-slate-900/95 to-emerald-950/25'
                        : 'border-amber-400 border-3 shadow-2xl shadow-amber-500/20 bg-gradient-to-b from-slate-900 via-slate-900/95 to-amber-950/30 scale-[1.01]'
                    }`}
                  >
                    {/* Top Header of booth */}
                    <div className="border-b border-slate-800 pb-3.5">
                      <div className="flex items-center justify-between">
                        <span className={`font-black text-white uppercase tracking-wider ${isFullscreen ? 'text-2xl sm:text-3xl xl:text-4xl' : 'text-lg sm:text-xl'}`}>
                          {getBoothDisplayName(b)}
                        </span>
                        <div className="flex items-center gap-2">
                          {isAttending ? (
                            <span className={`bg-emerald-950 text-emerald-300 border border-emerald-500/50 rounded-md font-black tracking-wider uppercase flex items-center gap-1.5 shadow-sm ${isFullscreen ? 'text-sm px-3.5 py-1.5' : 'text-xs px-2.5 py-1'}`}>
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                              ATENDIENDO
                            </span>
                          ) : (
                            <span className={`bg-amber-950 text-amber-300 border border-amber-500/50 rounded-md font-black tracking-wider uppercase shadow-sm ${isFullscreen ? 'text-sm px-3.5 py-1.5' : 'text-xs px-2.5 py-1'}`}>
                              LLAMANDO
                            </span>
                          )}
                          <span className={`rounded-full ${
                            isFullscreen ? 'w-4 h-4' : 'w-3.5 h-3.5'
                          } ${isAttending ? 'bg-emerald-400' : 'bg-amber-400 animate-ping'}`} />
                        </div>
                      </div>
                    </div>

                    {/* Mid Content - Big High Visibility Ticket Code, Procedure and Name */}
                    <div className="py-4 my-auto text-center space-y-3 flex flex-col justify-center items-center">
                      <div className="animate-fade-in space-y-2.5 w-full">
                        {isAttending ? (
                          <div className="text-xs sm:text-sm font-black uppercase text-emerald-300 tracking-wider bg-emerald-950/90 border border-emerald-500/50 py-1 px-3.5 rounded-lg mx-auto w-fit flex items-center gap-2 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            <span>EN ATENCIÓN EN CUBÍCULO</span>
                          </div>
                        ) : (
                          <div className="text-xs sm:text-sm font-black uppercase text-amber-300 tracking-widest bg-amber-950/80 border border-amber-500/40 py-1 px-3.5 rounded-lg mx-auto w-fit flex items-center gap-2 shadow-sm">
                            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                            <span>CONVOCANDO A CUBÍCULO 🔔</span>
                          </div>
                        )}
                        
                        <div className={`font-black uppercase leading-tight tracking-wide mt-1 px-1 break-words ${
                          isAttending
                            ? 'text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                            : 'text-[#f5c358] drop-shadow-[0_0_15px_rgba(245,195,88,0.5)]'
                        } ${nameSizeClass}`}>
                          {citizenName}
                        </div>
                        
                        <div className={`font-mono font-black text-slate-300 bg-slate-950/60 border border-slate-800/80 rounded-lg px-4 py-1.5 mx-auto w-fit uppercase tracking-widest ${
                          isFullscreen ? 'text-lg sm:text-xl lg:text-2xl' : 'text-xs sm:text-sm'
                        }`}>
                          N° Cita: <span className="text-amber-400 select-all">{getDisplayAppointmentNumber(activeApp)}</span>
                        </div>

                        {(activeApp.subServicioNombre || activeApp.categoriaNombre) && (
                          <div className={`text-slate-300 font-bold uppercase tracking-wide truncate max-w-xs mx-auto px-1 ${
                            isFullscreen ? 'text-xs sm:text-sm' : 'text-[11px]'
                          }`}>
                            {activeApp.subServicioNombre || activeApp.categoriaNombre}
                          </div>
                        )}

                        <span className={`text-emerald-400 block font-bold truncate px-1 mt-0.5 ${
                          isFullscreen ? 'text-sm lg:text-base' : 'text-xs sm:text-sm'
                        }`}>
                          Agendado por: {activeApp.creadoPor || activeApp.datosPersonales?.creadoPor || 'Portal del Ciudadano'}
                        </span>
                      </div>
                    </div>

                    {/* Bottom Footer - Queue counts */}
                    <div className="border-t border-slate-800 pt-3.5 flex items-center justify-between text-xs sm:text-sm">
                      <span className={`text-slate-450 font-extrabold uppercase ${isFullscreen ? 'text-sm lg:text-base' : 'text-xs sm:text-sm'}`}>Siguiente turno:</span>
                      {queueRemaining.length > 0 ? (
                        <span className={`font-mono bg-slate-950 text-amber-300 border border-slate-700 rounded-md font-black ${
                          isFullscreen ? 'text-sm sm:text-base lg:text-lg px-3.5 py-1.5' : 'text-xs sm:text-sm px-2.5 py-1'
                        }`}>
                          {getDisplayTurnCode(queueRemaining[0])} (+{queueRemaining.length - 1})
                        </span>
                      ) : (
                        <span className={`text-slate-500 font-mono italic ${isFullscreen ? 'text-sm' : 'text-xs'}`}>Sin cola asignada</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Section: Sala de Espera y Queue de Supervisor (HIDDEN IN FULLSCREEN) */}
            {!isFullscreen && (
              <div className="pt-2">
                {/* Cola general del día esperando verificación */}
                <div className="bg-slate-900 border-2 border-slate-800 p-6 rounded-2xl space-y-4 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-3.5 h-3.5 bg-indigo-500 rounded-full" />
                      <span className="text-sm sm:text-base lg:text-lg font-black uppercase tracking-wider text-slate-100">
                        Próximos Despachos del Supervisor (En Espera)
                      </span>
                    </div>
                    <span className="font-mono text-xs sm:text-sm font-black bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                      {queueSupervisorPending.length} Ciudadano(s) Listo(s)
                    </span>
                  </div>

                  {queueSupervisorPending.length === 0 ? (
                    <div className="p-10 text-center text-slate-400 text-sm sm:text-base font-bold italic">
                      No hay ciudadanos listos en cola esperando despacho de cubículo.
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 max-h-[260px] overflow-y-auto pr-1">
                      {queueSupervisorPending.map(app => (
                        <div key={`tv-queue-${app.id}`} className="bg-slate-950 p-4 rounded-xl border border-slate-800 flex items-center justify-between gap-3 shadow-md hover:border-slate-700 transition">
                          <div className="text-left space-y-1 truncate">
                            <span className="text-sm sm:text-base font-black text-white uppercase truncate block tracking-wide">
                              {getExtranjeriaCitizenName(app)}
                            </span>
                            <span className="text-xs text-emerald-400 block font-bold truncate leading-none">
                              Agendado por: {app.creadoPor || app.datosPersonales?.creadoPor || 'Portal del Ciudadano'}
                            </span>
                            <span className="text-xs sm:text-sm font-mono text-amber-400 font-black block">
                              {getDisplayTurnCode(app)} (Extranjería)
                            </span>
                          </div>
                          <span className="text-xs bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 px-2.5 py-1.5 rounded-md font-black uppercase tracking-wider font-mono shrink-0">
                            ESPERA
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Cintillo Informativo de Turnos en la Parte Inferior (Cintillo de Agendamiento) */}
            <div className="w-full bg-slate-900/90 border-2 border-amber-500/40 p-3.5 sm:p-4 rounded-2xl shadow-xl flex flex-col sm:flex-row items-center justify-center gap-3 mt-2 shrink-0 backdrop-blur-sm">
              <span className="flex-shrink-0 inline-flex items-center gap-1.5 bg-amber-500 text-slate-950 text-xs sm:text-sm font-black uppercase px-3 py-1.5 rounded-lg shadow-md animate-pulse">
                <Globe className="w-4 h-4 animate-spin-slow" />
                <span>NUEVA CITA ONLINE</span>
              </span>
              <p className="text-xs sm:text-sm lg:text-base font-black text-slate-100 uppercase tracking-wide text-center leading-normal">
                Agende su nueva cita ingresando aquí: <span className="text-amber-300 underline select-all font-mono font-black ml-1 tracking-wider bg-slate-950 px-3.5 py-1.5 rounded-lg border border-slate-800/80">agendate.te.gob.pa/citas/extranjeria/ext_primera_vez</span>
              </p>
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
          <h3 className="text-xs font-bold text-slate-700 m-0 uppercase tracking-wide">DIRECCIÓN NACIONAL DE CEDULACIÓN</h3>
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
                  <td className="border border-black p-2 uppercase">{formatFriendlyDate(app.fecha)} - {app.hora}</td>
                  <td className="border border-black p-2 font-bold uppercase">{getExtranjeriaCitizenName(app)}</td>
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

      {/* PANEL DE DIAGNÓSTICO Y AUTOCURACIÓN DE CITAS DE EXTRANJERÍA */}
      <div className="mt-8 bg-slate-900 border border-slate-800 rounded-xl p-5 text-left space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <AlertCircle className="w-4 h-4 text-amber-400" />
            </span>
            <div>
              <h4 className="text-xs font-black uppercase text-white tracking-wider">
                Consola de Diagnóstico & Sincronización de Citas
              </h4>
              <p className="text-[10px] text-slate-450 uppercase font-bold">
                Resolución de problemas de sincronización, fechas y roles
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowDiagnosticPanel(!showDiagnosticPanel)}
            className="text-[10px] bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold uppercase py-1.5 px-3 rounded border border-slate-750 transition flex items-center gap-1 cursor-pointer"
          >
            <span>{showDiagnosticPanel ? 'Ocultar Diagnóstico ▴' : 'Mostrar Diagnóstico ▾'}</span>
          </button>
        </div>

        {showDiagnosticPanel && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-slate-850/60 animate-fade-in text-[11px] text-slate-300">
            <div className="space-y-3 bg-slate-950 p-4 rounded-lg border border-slate-850/50">
              <h5 className="font-bold text-amber-400 uppercase text-[10px] tracking-wider">Estado de Base de Datos y Sesión</h5>
              <ul className="space-y-2 list-none p-0 m-0 font-medium">
                <li className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400 font-semibold">Total Citas en Servidor:</span>
                  <span className="font-mono font-bold text-white">{appointments.length}</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400 font-semibold">Citas de Extranjería Filtradas:</span>
                  <span className="font-mono font-bold text-emerald-400">
                    {appointments.filter(isExtranjeriaAppointment).length}
                  </span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400 font-semibold">Rol Actual Detectado:</span>
                  <span className="font-mono font-bold text-amber-300">{currentRole}</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400 font-semibold">Sub-rol de Trabajo:</span>
                  <span className="font-mono font-bold text-amber-300">{subRole}</span>
                </li>
                <li className="flex justify-between py-1 border-b border-slate-900">
                  <span className="text-slate-400 font-semibold">Fecha de Servidor (Hoy):</span>
                  <span className="font-mono font-bold text-white">{todayStr}</span>
                </li>
                <li className="flex justify-between py-1">
                  <span className="text-slate-400 font-semibold">Filtro de Fecha Atención:</span>
                  <span className="font-mono font-bold text-blue-400">
                    {atencionDateFilter || 'Ver todas las fechas'}
                  </span>
                </li>
              </ul>
            </div>

            <div className="space-y-3 bg-slate-950 p-4 rounded-lg border border-slate-850/50 flex flex-col justify-between">
              <div>
                <h5 className="font-bold text-amber-400 uppercase text-[10px] tracking-wider">Herramientas de Autocuración</h5>
                <p className="text-[10px] text-slate-400 leading-relaxed mt-1">
                  Si las citas cargadas por el CSV no aparecen, puede ser debido a que están agendadas para otra fecha o que la sesión ha expirado. Use estas acciones rápidas para solucionar los problemas comunes de forma instantánea.
                </p>
              </div>
              
              <div className="space-y-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setAtencionShowAllDates(true);
                    setAtencionDateFilter('');
                    showStatus('Filtro de fecha removido. Mostrando citas de todas las fechas.', 'success');
                  }}
                  className="w-full bg-blue-950/40 hover:bg-blue-900/40 text-blue-300 border border-blue-800/40 transition font-black uppercase text-[10px] py-2.5 rounded flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span>Ignorar Filtro de Fecha de Hoy 📂</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    fetchAppointments();
                    showStatus('Base de datos central de citas sincronizada con éxito.', 'success');
                  }}
                  className="w-full bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-800/40 transition font-black uppercase text-[10px] py-2.5 rounded flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Sincronizar Datos Centrales de Citas 🔄</span>
                </button>
              </div>
            </div>
          </div>
        )}
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
