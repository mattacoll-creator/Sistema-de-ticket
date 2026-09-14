import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Maximize,
  Minimize,
  Info,
  Plus,
  Trash2,
  Upload,
  Zap,
  CheckCheck,
  Settings
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { AdminRole } from '../types';
import { SUCURSALES_TE } from '../data';

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
}

interface AppointmentMetadata {
  hasDocuments: boolean;
  checkedDocs: string[];
  passedToSupervisor: boolean;
  assignedCubiculo: number | null; // Booth ID from 1 to 8
  estadoTicket: 'ninguno' | 'en_proceso' | 'en_atencion' | 'pagado_en_caja' | 'realizada';
  timestampCompletado?: string;
  timestampInicioAtencion?: string;
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

  return (
    cat === 'extranjeria' ||
    catName.includes('extranj') ||
    sub.includes('extranj') ||
    subId.includes('extranj') ||
    idStr.startsWith('EXT') ||
    txStr.startsWith('EXT') ||
    createdBy.includes('extranj') ||
    createdBy.includes('csv') ||
    createdBy.includes('importaci')
  );
};

export default function ExtranjeriaController({ currentRole, forceSubRole, initialSupervisorTab }: ExtranjeriaControllerProps) {
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [supervisorSearchQuery, setSupervisorSearchQuery] = useState('');
  const [supervisorAtencionSearchQuery, setSupervisorAtencionSearchQuery] = useState('');
  const [atencionSearchQuery, setAtencionSearchQuery] = useState('');
  const [atencionDateFilter, setAtencionDateFilter] = useState('');
  const [atencionShowAllDates, setAtencionShowAllDates] = useState(false);
  const [statusFilter, setStatusFilter] = useState('todos');
  const [dateFilter, setDateFilter] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' | null }>({ text: '', type: null });
  const [showConfirmSave, setShowConfirmSave] = useState(false);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);

  // Return the complete formatted citizen name
  const getExtranjeriaCitizenName = (app: any): string => {
    if (!app) return 'Ciudadano';
    const dp = app.datosPersonales;
    
    // 1. Structured names: primerNombre, segundoNombre, primerApellido, segundoApellido
    if (dp) {
      const parts = [
        dp.primerNombre || '',
        dp.segundoNombre || '',
        dp.primerApellido || '',
        dp.segundoApellido || ''
      ].map((s: any) => String(s || '').trim()).filter(Boolean);
      
      if (parts.length > 0) {
        return parts.join(' ');
      }

      if (dp.nombreCompleto && typeof dp.nombreCompleto === 'string' && dp.nombreCompleto.trim() && !['N/D', 'CIUDADANO N/D', 'SIN NOMBRE'].includes(dp.nombreCompleto.trim().toUpperCase())) {
        return dp.nombreCompleto.trim();
      }

      if (dp.nombre && typeof dp.nombre === 'string' && dp.nombre.trim() && !['N/D', 'CIUDADANO N/D', 'SIN NOMBRE'].includes(dp.nombre.trim().toUpperCase())) {
        return dp.nombre.trim();
      }

      if (dp.name && typeof dp.name === 'string' && dp.name.trim() && dp.name.trim().toUpperCase() !== 'N/D') {
        return dp.name.trim();
      }
    }

    // 2. Direct appointment-level names
    if (app.nombre && typeof app.nombre === 'string' && app.nombre.trim() && !['N/D', 'CIUDADANO N/D', 'SIN NOMBRE'].includes(app.nombre.trim().toUpperCase())) {
      return app.nombre.trim();
    }
    if (app.nombre_completo && typeof app.nombre_completo === 'string' && app.nombre_completo.trim() && !['N/D', 'CIUDADANO N/D', 'SIN NOMBRE'].includes(app.nombre_completo.trim().toUpperCase())) {
      return app.nombre_completo.trim();
    }
    if (app.ciudadano_nombre && typeof app.ciudadano_nombre === 'string' && app.ciudadano_nombre.trim() && app.ciudadano_nombre.trim().toUpperCase() !== 'N/D') {
      return app.ciudadano_nombre.trim();
    }

    // 3. Match from loaded extranjeria records by passport or ID
    const passport = String(dp?.pasaporte || app.pasaporte || app.identificacion || '').trim().toUpperCase();
    if (passport && typeof extranjeriaRecords !== 'undefined' && Array.isArray(extranjeriaRecords) && extranjeriaRecords.length > 0) {
      const matched = extranjeriaRecords.find(r => (r.pasaporte || '').trim().toUpperCase() === passport);
      if (matched && matched.nombre && matched.nombre.trim()) {
        return matched.nombre.trim();
      }
    }

    // 4. Dignified and clear citizen fallback if name was never entered
    if (passport && passport !== 'N/D') {
      return `Ciudadano (${passport})`;
    }
    if (dp?.nacionalidad && dp.nacionalidad !== 'No especificada') {
      return `Ciudadano de ${dp.nacionalidad}`;
    }

    return 'Ciudadano Extranjero';
  };

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

  const todayStr = React.useMemo(() => new Date().toISOString().substring(0, 10), []);
  const isStrictTodayOnly = React.useMemo(() => {
    if (atencionShowAllDates) return false;
    return currentRole === 'extranjeria_atencion' || subRole === 'atencion';
  }, [currentRole, subRole, atencionShowAllDates]);

  // Enforce today's date filter dynamically for attention staff
  React.useEffect(() => {
    if (isStrictTodayOnly) {
      setAtencionDateFilter(todayStr);
    } else {
      if (atencionShowAllDates) {
        setAtencionDateFilter('');
      }
    }
  }, [isStrictTodayOnly, todayStr, atencionShowAllDates]);

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
          }
        }
      }
    }
  }, [appointments]);

  // Auto-toggle "atencionShowAllDates" if there are no appointments for today, so past/future imported appointments appear immediately
  React.useEffect(() => {
    if (appointments && appointments.length > 0) {
      const hasToday = appointments.some((app: any) => app.fecha === todayStr);
      if (!hasToday && !atencionShowAllDates) {
        setAtencionShowAllDates(true);
      }
    }
  }, [appointments, todayStr, atencionShowAllDates]);

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

  // Supervisor tabs / sub-views (control of queues vs. calendar & creation/deletion panel vs. configuracion)
  const [supervisorTab, setSupervisorTab] = useState<'flujo' | 'calendario' | 'carga_expedientes' | 'configuracion' | 'reportes'>(initialSupervisorTab || 'flujo');

  useEffect(() => {
    if (initialSupervisorTab) {
      setSupervisorTab(initialSupervisorTab);
    }
  }, [initialSupervisorTab]);

  // Load real system users on mount
  useEffect(() => {
    const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token') || 'superadmin_token';
    fetch('/api/users', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.success && Array.isArray(data.users)) {
          setSystemUsers(data.users);
        }
      })
      .catch(err => console.error("Error loading system users in ExtranjeriaController:", err));
  }, []);
  
  // Extranjeria Importer States
  const [extranjeriaRecords, setExtranjeriaRecords] = useState<any[]>([]);
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
    if (supervisorTab === 'carga_expedientes') {
      fetchExtranjeriaRecords();
    }
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

        const capacityExceeded = parsedData.filter(d => d.numeroCitaDia > 56).length;

        setParsedExtranjeriaRows(parsedData);
        setExtranjeriaImportStatus({
          success: true,
          message: capacityExceeded > 0
            ? `¡Archivo analizado! Se detectaron ${parsedData.length} citas/expedientes. ⚠️ Atención: ${capacityExceeded} cita(s) tienen número N° superior a 56 (el límite máximo permitido para Extranjería es de 56 citas por día).`
            : `¡Archivo analizado con éxito! Se cargaron ${parsedData.length} citas/expedientes con control de secuencia diaria (Capacidad: 56 citas/día).`
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
    const slots = generateExtranjeriaSlots('07:00 AM', '01:45 PM', 15);
    const todayStr = new Date().toISOString().substring(0, 10);
    
    const sampleNames = [
      { n: "Carlos Eduardo Mendoza Silva", nac: "Colombia" },
      { n: "Elena Rostova Ivanova", nac: "Rusia" },
      { n: "David Chen Wu", nac: "China" },
      { n: "Maria Santos Da Silva", nac: "Brasil" },
      { n: "Jean Pierre Dupont", nac: "Francia" },
      { n: "Andrea Paola Gutierrez", nac: "Venezuela" },
      { n: "Marco Aurelio Rossi", nac: "Italia" },
      { n: "Sofia Nicole Castillo", nac: "Nicaragua" },
      { n: "Liam Alexander Smith", nac: "Estados Unidos" },
      { n: "Camila Alejandra Morales", nac: "Costa Rica" },
      { n: "Mateo Sebastian Vargas", nac: "Perú" },
      { n: "Isabella Marie Leclerc", nac: "Canadá" },
      { n: "Alejandro Jose Hernandez", nac: "República Dominicana" },
      { n: "Valeria Gomez Gomez", nac: "España" },
      { n: "Lucas Santiago Ferreira", nac: "Portugal" },
      { n: "Fatima Zahra Mansouri", nac: "Marruecos" },
      { n: "Kenji Sato Tanaka", nac: "Japón" },
      { n: "Ana Maria Alvarez", nac: "México" },
      { n: "Oliver James Wright", nac: "Reino Unido" },
      { n: "Lucia Fernandez Diaz", nac: "Argentina" },
      { n: "Gabriel Antonio Castro", nac: "El Salvador" },
      { n: "Emma Louise Mueller", nac: "Alemania" },
      { n: "Diego Andres Pineda", nac: "Honduras" },
      { n: "Mia Chloe Jansen", nac: "Países Bajos" },
      { n: "Samuel David Ocampo", nac: "Guatemala" },
      { n: "Clara Beatriz Romero", nac: "Chile" },
      { n: "Noah Benjamin Cohen", nac: "Israel" },
      { n: "Julieta Rocio Benitez", nac: "Paraguay" },
      { n: "Thiago Silva Barbosa", nac: "Brasil" },
      { n: "Zoe Charlotte Martin", nac: "Francia" },
      { n: "Sebastian Cruz Delgado", nac: "Ecuador" },
      { n: "Astrid Linnea Lind", nac: "Suecia" },
      { n: "Joaquin Manuel Rios", nac: "Uruguay" },
      { n: "Chloe Grace O'Connor", nac: "Irlanda" },
      { n: "Emilio Rafael Cardenas", nac: "Bolivia" },
      { n: "Min-Jun Park Kim", nac: "Corea del Sur" },
      { n: "Renata Luciana Pacheco", nac: "México" },
      { n: "Dmitry Sergeyev Popov", nac: "Rusia" },
      { n: "Mariana Soledad Flores", nac: "Argentina" },
      { n: "Lars Erik Hansen", nac: "Noruega" },
      { n: "Alonso Javier Sucre", nac: "Venezuela" },
      { n: "Hanna Marie Becker", nac: "Alemania" },
      { n: "Gonzalo Ignacio Paredes", nac: "Perú" },
      { n: "Amina Bint Youssef", nac: "Egipto" },
      { n: "Federico Dante Moretti", nac: "Italia" },
      { n: "Sara Ines Betancourt", nac: "Colombia" },
      { n: "William Robert Taylor", nac: "Australia" },
      { n: "Daniela Paola Navarro", nac: "Nicaragua" },
      { n: "Rajesh Kumar Patel", nac: "India" },
      { n: "Victoria Isabel Salazar", nac: "Costa Rica" },
      { n: "Ethan Bradley Miller", nac: "Estados Unidos" },
      { n: "Paulina Eugenia Cordero", nac: "Chile" },
      { n: "Klaus Dieter Schmidt", nac: "Suiza" },
      { n: "Catalina Maria Restrepo", nac: "Colombia" },
      { n: "Andrei Nicolae Radu", nac: "Rumania" },
      { n: "Beatriz Helena Moncada", nac: "Honduras" }
    ];

    let csvRows = '';
    for (let i = 0; i < 56; i++) {
      const seq = i + 1;
      const slotIdx = Math.min(slots.length - 1, Math.floor(i / 2));
      const hora = slots[slotIdx];
      const person = sampleNames[i] || { n: `Ciudadano Extranjero ${seq}`, nac: "Extranjero" };
      csvRows += `${todayStr},${seq},${hora},${person.n},Res. 5006${String(seq).padStart(2, '0')} de 15/05/2026,${person.nac}\n`;
    }
    
    const csvContent = '\uFEFF' + headers + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `plantilla_citas_extranjeria_56_cupos_${todayStr}.csv`);
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
        const slots = generateExtranjeriaSlots('07:00 AM', '01:45 PM', 15);
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
              datosPersonales: {
                primerNombre: r.nombre.split(' ')[0] || '',
                primerApellido: r.nombre.split(' ')[1] || '',
                nombreCompleto: r.nombre,
                pasaporte: r.pasaporte,
                nacionalidad: r.nacionalidad,
                numeroResolucion: r.resolucion,
                correo: 'extranjeria@te.gob.pa',
                telefono: 'N/A',
                tipoIdentificacion: 'Pasaporte'
              }
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

  // Auto-select first available date with appointments if today is empty to ensure user instantly sees appointments
  useEffect(() => {
    if (appointments && appointments.length > 0) {
      const today = new Date();
      const mm = String(today.getMonth() + 1).padStart(2, '0');
      const dd = String(today.getDate()).padStart(2, '0');
      const todayStr = `${today.getFullYear()}-${mm}-${dd}`;
      
      const hasToday = appointments.some(app => app.fecha === todayStr);
      if (!hasToday) {
        // Find the first appointment with a valid date and jump to that month & date
        const firstAppWithDate = appointments.find(app => app.fecha && /^\d{4}-\d{2}-\d{2}$/.test(app.fecha));
        if (firstAppWithDate && firstAppWithDate.fecha) {
          const targetDateStr = firstAppWithDate.fecha;
          setSelectedCalendarDateStr(targetDateStr);
          
          const parts = targetDateStr.split('-');
          if (parts.length === 3) {
            const y = parseInt(parts[0], 10);
            const m = parseInt(parts[1], 10);
            const d = parseInt(parts[2], 10);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
              setCalendarDate(new Date(y, m - 1, d));
            }
          }
        }
      }
    }
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
      { id: 1, name: "Cubículo 19", active: true, staff: "Gestor de Extranjería", empty: false },
      { id: 2, name: "Cubículo 20", active: true, staff: "Cubículo Ticket Extranjería", empty: false },
      { id: 3, name: "Cubículo 22", active: true, staff: "Supervisor de Extranjería", empty: false },
      { id: 4, name: "Cubículo 23", active: true, staff: "Atendimiento Entrada Extranjería", empty: false },
      { id: 5, name: "Cubículo 5", active: false, staff: "Turno de Reserva", empty: true },
      { id: 6, name: "Cubículo 6", active: false, staff: "Turno de Reserva", empty: true },
      { id: 7, name: "Cubículo 7", active: false, staff: "Turno de Reserva", empty: true },
      { id: 8, name: "Cubículo 8", active: false, staff: "Turno de Reserva", empty: true }
    ];
    if (loaded && Array.isArray(loaded)) {
      // Migrate old names if they match previous defaults
      return loaded.map(b => {
        let name = b.name;
        if (b.id === 1 && (b.name === "Cubículo 1" || b.name === "Cubiculo 1")) name = "Cubículo 19";
        if (b.id === 2 && (b.name === "Cubículo 2" || b.name === "Cubiculo 2")) name = "Cubículo 20";
        if (b.id === 3 && (b.name === "Cubículo 3" || b.name === "Cubiculo 3")) name = "Cubículo 22";
        if (b.id === 4 && (b.name === "Cubículo 4" || b.name === "Cubiculo 4")) name = "Cubículo 23";

        let staff = b.staff;
        if (b.id === 1 && (b.staff === "Lic. Ana Pérez" || b.staff === "Lic. Ana Perez")) staff = "Gestor de Extranjería";
        if (b.id === 2 && (b.staff === "Lic. Carlos Gómez" || b.staff === "Lic. Carlos Gomez")) staff = "Cubículo Ticket Extranjería";
        if (b.id === 3 && (b.staff === "Lic. María Rodríguez" || b.staff === "Lic. Maria Rodriguez")) staff = "Supervisor de Extranjería";
        if (b.id === 4 && (b.staff === "Lic. Juan Martínez" || b.staff === "Lic. Juan Martinez")) staff = "Atendimiento Entrada Extranjería";

        return { ...b, name, staff };
      });
    }
    return defaults;
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
    const stats: Record<string, { today: number; range: number }> = {};

    // Initialize stats for each operator
    availableCubiculoUsers.forEach(user => {
      stats[user] = { today: 0, range: 0 };
    });

    appointments.forEach(app => {
      if (!app.fecha) return;
      const meta = appMetadata[app.id];
      if (meta && meta.assignedCubiculo && meta.staffResponsable) {
        const op = meta.staffResponsable;
        if (stats[op]) {
          // Check if it's "realizada"
          const isRealizada = meta.estadoTicket === 'realizada';
          if (isRealizada) {
            // Is it today?
            if (app.fecha === todayStr) {
              stats[op].today += 1;
            }
            // Is it within the selected report range?
            if (app.fecha >= reportStartDate && app.fecha <= reportEndDate) {
              stats[op].range += 1;
            }
          }
        }
      }
    });

    return stats;
  }, [availableCubiculoUsers, appointments, appMetadata, todayStr, reportStartDate, reportEndDate]);

  // Fetch metadata from backend server
  const fetchServerMetadata = useCallback(async () => {
    try {
      const res = await fetch('/api/extranjeria/metadata');
      if (res.ok) {
        const json = await res.json();
        if (json && json.success && json.metadata) {
          setAppMetadata(prev => {
            const merged = { ...prev, ...json.metadata };
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
      await fetch('/api/extranjeria/metadata', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ metadata: payload })
      });
    } catch (e) {
      console.error('Failed to sync metadata to server:', e);
    }
  }, []);

  // Synchronize with server on mount and continuously every 2.5s
  useEffect(() => {
    fetchServerMetadata();
    const interval = setInterval(fetchServerMetadata, 2500);
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

  // Live clock state for Pantalla de Turnos
  const [liveTime, setLiveTime] = useState<Date>(new Date());
  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Audio control state for Pantalla de Turnos
  const [screenSoundEnabled, setScreenSoundEnabled] = useState(true);

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
  }) => {
    const callData = {
      ...payload,
      timestamp: Date.now(),
    };

    // 1. Cross-tab synchronization via localStorage
    try {
      localStorage.setItem('te_extranjeria_active_call', JSON.stringify(callData));
    } catch {}

    // 2. Real-time broadcast channel for open TV / monitor windows
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('te_extranjeria_calls');
        bc.postMessage({ type: 'CALL_CITIZEN', call: callData });
        bc.close();
      }
    } catch {}

    // 3. Local component state
    setLastCallEvent(callData);
  };

  // Cancel / clear active call on the Pantalla de Turnos (when agent starts attention or completes)
  const clearCallFromPantalla = (appId?: string) => {
    // 1. Remove active call from localStorage
    try {
      localStorage.removeItem('te_extranjeria_active_call');
    } catch {}

    // 2. Broadcast clear event across open TV / monitor windows
    try {
      if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
        const bc = new BroadcastChannel('te_extranjeria_calls');
        bc.postMessage({ type: 'CLEAR_CALL', appId });
        bc.close();
      }
    } catch {}

    // 3. Clear local state
    setLastCallEvent(null);

    // 4. Cancel active speech synthesis immediately
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
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
        const parsed = JSON.parse(stored);
        if (parsed && parsed.timestamp && (Date.now() - parsed.timestamp < 15000)) {
          handleCallAnnouncement(parsed);
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
              setLastCallEvent(event.data.call);
              handleCallAnnouncement(event.data.call);
            } else if (event.data.type === 'CLEAR_CALL') {
              setLastCallEvent(null);
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
            setLastCallEvent(parsed);
            handleCallAnnouncement(parsed);
          } catch {}
        } else {
          setLastCallEvent(null);
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
      const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token') || 'superadmin_token';
      const res = await fetch('/api/appointments', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (data && data.success && Array.isArray(data.appointments)) {
        let allAppointments = [...data.appointments];

        // Auto-heal any CSV appointments to full Extranjería nomenclature
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
          if (!dp.nombreCompleto && name && !name.startsWith('Ciudadano')) {
            dp.nombreCompleto = name;
          }
          const standardizedDate = standardizeDateString(app.fecha);
          return {
            ...app,
            fecha: standardizedDate || app.fecha,
            nombre: (app.nombre && app.nombre.trim() && app.nombre !== 'N/D' && app.nombre !== 'Ciudadano N/D') ? app.nombre : name,
            datosPersonales: dp
          };
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

    const existingDayCount = (appointmentsByDate[newCitaFecha] || []).length;
    if (existingDayCount >= 56) {
      showStatus('No es posible agendar: Se ha alcanzado el límite regulatorio de 56 citas para este día en Extranjería.', 'error');
      return;
    }
    const nextSeq = existingDayCount + 1;

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
      const transactionId = `EXT-${code}`;
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
        numeroCitaDia: nextSeq,
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
      const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token') || 'superadmin_token';
      const res = await fetch(`/api/appointments/${citaId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
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
    fetchAppointments();

    // Load schedule config from server
    fetch('/api/extranjeria/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.success && data.config) {
          const { capacidad: cap, intervalo: inter, horaInicio: hIni, horaFin: hFin, ticketKioscoUrl: tUrl } = data.config;
          setCapacidad(cap);
          setIntervalo(inter);
          setHoraInicio(hIni);
          setHoraFin(hFin);
          
          localStorage.setItem('extranjeria_capacidad_usuarios', String(cap));
          localStorage.setItem('extranjeria_intervalo_minutos', String(inter));
          localStorage.setItem('extranjeria_hora_inicio', hIni);
          localStorage.setItem('extranjeria_hora_fin', hFin);

          const cleanUrl = (tUrl && !tUrl.includes('sistema-de-ticket.vercel.app'))
            ? tUrl.trim()
            : 'https://test.te.gob.pa:8443/kiosco';
          setTicketKioscoUrl(cleanUrl);
          localStorage.setItem('extranjeria_ticket_kiosco_url', cleanUrl);
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
      const token = sessionStorage.getItem('admin_token') || 'superadmin_token';
      const res = await fetch('/api/extranjeria/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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

  // Activate/deactivate a reserve booth (casillero de atención)
  const toggleBoothActive = (boothId: number) => {
    setBooths(prev => prev.map(b => {
      if (b.id === boothId) {
        const nextActive = !b.active;
        let staffName = b.staff;
        if (nextActive && b.empty) {
          staffName = "Gestor de Extranjería";
        } else if (!nextActive && b.empty) {
          staffName = "Turno de Reserva";
        }
        return { ...b, active: nextActive, staff: staffName };
      }
      return b;
    }));
    showStatus(`Casillero ${boothId} actualizado con éxito.`, 'success');
  };

  // Re-assign operator staff of any booth
  const updateBoothStaff = (boothId: number, newStaff: string) => {
    setBooths(prev => prev.map(b => {
      if (b.id === boothId) {
        return { ...b, staff: newStaff };
      }
      return b;
    }));
    showStatus(`Operador asignado al Casillero ${boothId} actualizado a: ${newStaff}.`, 'success');
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

    const allDocs = REQUISITOS_EXTRANJERIA.map(r => r.id);
    const updatedItem: AppointmentMetadata = {
      ...meta,
      hasDocuments: true,
      checkedDocs: allDocs,
      passedToSupervisor: true,
      assignedCubiculo: null,
      estadoTicket: 'ninguno'
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

    showStatus(`Expediente de cita ${appId} verificado y enviado al Supervisor para asignación de cubículo.`, 'success');
    setSelectedAppForCheck(null);
  };

  // Assign appointment to cubicle (by supervisor)
  const handleAssignToCubiculo = (appId: string, cubiculoId: number) => {
    const app = appointments.find(a => a.id === appId || a.codigoTransaccion === appId);
    const existingMeta = appMetadata[appId] || (app?.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
    const meta = existingMeta || {
      hasDocuments: true,
      checkedDocs: REQUISITOS_EXTRANJERIA.map(r => r.id),
      passedToSupervisor: true,
      assignedCubiculo: null,
      estadoTicket: 'ninguno'
    };

    const updatedItem: AppointmentMetadata = {
      ...meta,
      assignedCubiculo: cubiculoId,
      estadoTicket: 'en_proceso'
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

    const codePart = (app?.codigoTransaccion || appId).slice(-4).toUpperCase();
    const cleanCitizenName = getExtranjeriaCitizenName(app);
    const boothName = booths.find(b => b.id === cubiculoId)?.name || `Cubículo ${cubiculoId}`;
    
    // Spelling out "E-" for Speech Synthesis to sound natural
    const codeSpelled = `E ${codePart.split('').join(' ')}`;
    const announcementText = `Turno E, ${codeSpelled}. ${cleanCitizenName}. Favor dirigirse al ${boothName}.`;

    // Emit call strictly to the Turn Screen (pantalla de turnos) - no sound on supervisor/operator console
    emitCallToPantalla({
      appId,
      codePart,
      cleanCitizenName,
      boothId: cubiculoId,
      boothName,
      announcementText,
      type: 'cubiculo'
    });

    showStatus(`Cita asignada al ${boothName}. Llamado emitido a la Pantalla de Turnos.`, 'success');
  };

  // Recall a citizen aloud strictly via the Turn Screen
  const handleRecallCitizen = (appId: string) => {
    const app = appointments.find(a => a.id === appId || a.codigoTransaccion === appId);
    if (!app) return;
    const meta = appMetadata[appId] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
    const cubiculoId = meta?.assignedCubiculo || selectedCubiculo;
    const codePart = (app.codigoTransaccion || appId).slice(-4).toUpperCase();
    const cleanCitizenName = getExtranjeriaCitizenName(app);
    const boothName = booths.find(b => b.id === cubiculoId)?.name || `Cubículo ${cubiculoId}`;

    const codeSpelled = `E ${codePart.split('').join(' ')}`;
    const announcementText = meta?.estadoTicket === 'pagado_en_caja'
      ? `Turno E, ${codeSpelled}. ${cleanCitizenName}. Favor dirigirse a la caja de pago.`
      : `Turno E, ${codeSpelled}. ${cleanCitizenName}. Favor dirigirse al ${boothName}.`;

    // Emit call strictly to the Turn Screen (pantalla de turnos)
    emitCallToPantalla({
      appId,
      codePart,
      cleanCitizenName,
      boothId: cubiculoId,
      boothName,
      announcementText,
      type: meta?.estadoTicket === 'pagado_en_caja' ? 'caja' : 'recall'
    });
    showStatus(`Re-llamado enviado a la Pantalla de Turnos: ${cleanCitizenName} (E-${codePart})`, 'info');
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

  // Marcar los 3 requisitos obligatorios al mismo tiempo y asignar/despachar inmediatamente
  const handleMarkAllAndAutoAssign = (appId: string) => {
    const allDocIds = REQUISITOS_EXTRANJERIA.map(r => r.id);
    setSupervisorCheckedDocs(allDocIds);

    const activeBooths = booths.filter(b => b.active);
    if (activeBooths.length === 0) {
      showStatus("Error: No hay cubículos activos para despachar el turno. Active un cubículo abajo.", "error");
      return;
    }

    const app = appointments.find(a => a.id === appId || a.codigoTransaccion === appId);
    const existingMeta = appMetadata[appId] || (app?.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);

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

    const updatedItem: AppointmentMetadata = {
      ...(existingMeta || { estadoTicket: 'ninguno' }),
      hasDocuments: true,
      checkedDocs: allDocIds,
      passedToSupervisor: true,
      assignedCubiculo: bestBooth.id,
      estadoTicket: 'en_proceso'
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

    const codePart = (app?.codigoTransaccion || appId).slice(-4).toUpperCase();
    const cleanCitizenName = getExtranjeriaCitizenName(app);
    const boothName = bestBooth.name;
    const codeSpelled = `E ${codePart.split('').join(' ')}`;
    const announcementText = `Turno E, ${codeSpelled}. ${cleanCitizenName}. Favor dirigirse al ${boothName}.`;

    emitCallToPantalla({
      appId,
      codePart,
      cleanCitizenName,
      boothId: bestBooth.id,
      boothName,
      announcementText,
      type: 'cubiculo'
    });

    setSelectedAppForSupervisor(null);
    setSupervisorCheckedDocs([]);
    showStatus(`¡Los 3 requisitos fueron marcados con éxito y el ciudadano fue asignado de inmediato al ${boothName}!`, 'success');
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

    const codePart = (app?.codigoTransaccion || appId).slice(-4).toUpperCase();
    const cleanCitizenName = getExtranjeriaCitizenName(app);
    const cubiculoId = meta.assignedCubiculo;
    const boothName = booths.find(b => b.id === cubiculoId)?.name || `Cubículo ${cubiculoId || ''}`;
    
    // Spelling out "E-"
    const codeSpelled = `E ${codePart.split('').join(' ')}`;
    const announcementText = `Turno E, ${codeSpelled}. ${cleanCitizenName}. Favor dirigirse a la caja de pago.`;

    // Emit call strictly to the Turn Screen (pantalla de turnos)
    emitCallToPantalla({
      appId,
      codePart,
      cleanCitizenName,
      boothId: cubiculoId || 0,
      boothName,
      announcementText,
      type: 'caja'
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
    return appointments.filter((app: any) => {
      // Search
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch = !query || (
        getExtranjeriaCitizenName(app).toLowerCase().includes(query) ||
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
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      const isExt = isExtranjeriaAppointment(app);
      const notPassed = !meta || (!meta.passedToSupervisor && !meta.hasDocuments);
      const notFinished = !meta || (meta.estadoTicket !== 'realizada' && meta.estadoTicket !== 'cancelada');
      
      // Strict: only today's appointments if isStrictTodayOnly
      if (isStrictTodayOnly && app.fecha !== todayStr) {
        return false;
      }

      return isExt && notPassed && notFinished;
    });
  }, [appointments, appMetadata, isStrictTodayOnly, todayStr]);

  // Unique appointment dates for quick selection in atención
  const availableAppointmentDates = useMemo(() => {
    const dates = new Set<string>();
    appointments.forEach(app => {
      if (app.fecha && isExtranjeriaAppointment(app)) {
        dates.add(app.fecha);
      }
    });
    return Array.from(dates).sort();
  }, [appointments]);

  // Filtered queue for Atención (Sala de Entrada) by live name/passport search and date filter
  const filteredQueueAtencionIn = useMemo(() => {
    return queueAtencionIn.filter(app => {
      // 1. Date filter (exact day match if selected)
      if (atencionDateFilter && app.fecha !== atencionDateFilter) {
        return false;
      }

      // 2. Search query (matches name, passport, transaction code or ID)
      if (atencionSearchQuery.trim()) {
        const q = atencionSearchQuery.trim().toLowerCase();
        const name = getExtranjeriaCitizenName(app).toLowerCase();
        const passport = String(app.datosPersonales?.pasaporte || app.identificacion || '').toLowerCase();
        const id = String(app.id || '').toLowerCase();
        const tx = String(app.codigoTransaccion || '').toLowerCase();

        return name.includes(q) || passport.includes(q) || id.includes(q) || tx.includes(q);
      }

      return true;
    });
  }, [queueAtencionIn, atencionSearchQuery, atencionDateFilter]);

  // Secondary matches for searches when a citizen was already processed/assigned to supervisor
  const atencionMatchesInOtherQueues = useMemo(() => {
    if (!atencionSearchQuery.trim()) return [];
    const q = atencionSearchQuery.trim().toLowerCase();
    return appointments.filter(app => {
      if (queueAtencionIn.some(a => a.id === app.id)) return false;
      if (atencionDateFilter && app.fecha !== atencionDateFilter) return false;

      const name = getExtranjeriaCitizenName(app).toLowerCase();
      const passport = String(app.datosPersonales?.pasaporte || app.identificacion || '').toLowerCase();
      const id = String(app.id || '').toLowerCase();
      const tx = String(app.codigoTransaccion || '').toLowerCase();

      return name.includes(q) || passport.includes(q) || id.includes(q) || tx.includes(q);
    });
  }, [appointments, queueAtencionIn, atencionSearchQuery, atencionDateFilter]);

  // 2. Atención View processed history (already sent to supervisor)
  const queueAtencionOut = useMemo(() => {
    return appointments.filter(app => {
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      const isExt = isExtranjeriaAppointment(app);
      const isPassed = Boolean(meta && (meta.passedToSupervisor === true || meta.hasDocuments === true));
      
      // Strict: only today's appointments if isStrictTodayOnly
      if (isStrictTodayOnly && app.fecha !== todayStr) {
        return false;
      }

      return isExt && isPassed;
    });
  }, [appointments, appMetadata, isStrictTodayOnly, todayStr]);

  // 3. Supervisor Queue: passed from atencion but NOT yet assigned a cubicle
  const queueSupervisorPending = useMemo(() => {
    return appointments.filter(app => {
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      const isExt = isExtranjeriaAppointment(app);
      const isPassed = Boolean(meta && (meta.passedToSupervisor === true || meta.hasDocuments === true));
      const notAssigned = !meta || meta.assignedCubiculo === null || meta.assignedCubiculo === undefined;
      const notFinished = !meta || (meta.estadoTicket !== 'realizada' && meta.estadoTicket !== 'cancelada');
      return isExt && isPassed && notAssigned && notFinished;
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

  // Filtered supervisor entrance hall list for quick search
  const filteredSupervisorAtencionIn = useMemo(() => {
    const query = supervisorAtencionSearchQuery.trim().toLowerCase();
    if (!query) return queueAtencionIn;
    return queueAtencionIn.filter(app => {
      const name = getExtranjeriaCitizenName(app).toLowerCase();
      const passport = (app.datosPersonales?.pasaporte || app.identificacion || '').toLowerCase();
      const id = String(app.id || '').toLowerCase();
      const tx = String(app.codigoTransaccion || '').toLowerCase();
      return name.includes(query) || passport.includes(query) || id.includes(query) || tx.includes(query);
    });
  }, [queueAtencionIn, supervisorAtencionSearchQuery]);

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

      if (supervisorPeriodFilter === 'todos') {
        return true;
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
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      return isExtranjeriaAppointment(app) && meta && Number(meta.assignedCubiculo) === Number(selectedCubiculo) && meta.estadoTicket !== 'realizada' && meta.estadoTicket !== 'cancelada';
    });
  }, [appointments, appMetadata, selectedCubiculo]);

  // Count of how many citizens were attended by the active cubicle/ventanilla today
  const attendedTodayCount = useMemo(() => {
    return appointments.filter(app => {
      const meta = appMetadata[app.id] || (app.codigoTransaccion ? appMetadata[app.codigoTransaccion] : null);
      return isExtranjeriaAppointment(app) && meta && Number(meta.assignedCubiculo) === Number(selectedCubiculo) && meta.estadoTicket === 'realizada';
    }).length;
  }, [appointments, appMetadata, selectedCubiculo]);

  // 5. Supervisor Analytics / Reports: appointments in selected interval, regardless of status
  const filterRealizadasByDateRange = (startStr: string, endStr: string) => {
    return appointments.filter(app => {
      if (!app.fecha) return false;
      const isWithinDate = app.fecha >= startStr && app.fecha <= endStr;
      if (!isWithinDate) return false;

      const meta = appMetadata[app.id];
      // Only include appointments that were processed/assigned to a cubicle (Ventanilla / Ticket)
      if (!meta || !meta.assignedCubiculo) return false;

      // Filter by dynamic Cubicle User/Operator if a specific one is selected
      if (reportOperatorFilter !== 'all') {
        if (meta.staffResponsable !== reportOperatorFilter) {
          return false;
        }
      }
      return true;
    });
  };

  // Download performed (realized) appointments report - CSV Format
  const handleDownloadRealizadasCSV = () => {
    const list = filterRealizadasByDateRange(reportStartDate, reportEndDate);
    if (list.length === 0) {
      alert('No se encontraron citas en el intervalo seleccionado para generar el reporte.');
      return;
    }

    const headers = ['N° Secuencia (1-56)', 'Fecha', 'Hora', 'Ciudadano', 'Pasaporte/ID', 'Resolución', 'ID Transacción', 'Operador Responsable', 'Cubículo', 'Estado', 'Hora Completado'];
    const rows = list.map(app => {
      const meta = appMetadata[app.id];
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

    const csvContent = "data:text/csv;charset=utf-8,\uFEFF" 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Extranjeria_Citas_${reportStartDate}_a_${reportEndDate}${filterText}.csv`);
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
      let titleText = 'REPORTE GENERAL DE ATENCIÓN DE CITAS (TODOS LOS ESTADOS) - EXTRANJERÍA';
      if (reportOperatorFilter !== 'all') {
        titleText += ` (OPERADOR: ${reportOperatorFilter.toUpperCase()})`;
      } else {
        titleText += ` (TODOS LOS OPERADORES DE VENTANILLA)`;
      }
      doc.text(titleText, 10, currentY);

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

      const dp = app.datosPersonales || {};
      const name = dp.nombreCompleto || (dp.primerNombre || dp.primerApellido ? `${dp.primerNombre || ''} ${dp.primerApellido || ''}`.trim() : '') || app.nombre || 'N/D';
      const nameShort = name.length > 32 ? name.slice(0, 30) + '...' : name;
      const passport = dp.pasaporte || app.identificacion || 'N/D';
      const labelPassport = passport.length > 15 ? passport.slice(0, 13) + '...' : passport;
      const cubiculoName = booths.find(b => b.id === meta?.assignedCubiculo)?.name || (meta?.assignedCubiculo ? `Cubículo ${meta.assignedCubiculo}` : 'Sin Asignar');
      const labelCubiculo = cubiculoName.length > 15 ? cubiculoName.slice(0, 13) + '...' : cubiculoName;
      const staffName = meta?.staffResponsable || 'Oficial General';
      const staffShort = staffName.length > 18 ? staffName.slice(0, 16) + '...' : staffName;
      
      const estado = (meta?.estadoTicket || app.status || 'Pendiente').toUpperCase();
      const tCompleted = meta?.timestampCompletado || 'N/D';

      const labelAppId = app.id.length > 14 ? app.id.slice(0, 12) + '...' : app.id;

      doc.text(labelAppId, 12, currentY + 5);
      doc.text(nameShort.toUpperCase(), 35, currentY + 5);
      doc.text(labelPassport, 80, currentY + 5);
      doc.text(labelCubiculo, 105, currentY + 5);
      
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
    const filterText = reportOperatorFilter !== 'all' 
      ? `_Operador_${reportOperatorFilter.replace(/\s+/g, '_')}` 
      : '';
    doc.save(`reporte_extranjeria_atendidos_${reportStartDate}_a_${reportEndDate}${filterText}.pdf`);
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
                <span>Pantalla de Turnos</span>
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
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-amber-300 text-xs">{activeBoothsCount} de {booths.length} Abiertos</span>
                        <span className="text-slate-400 text-[10.5px]">({booths.filter(b => b.active).map(b => b.name).join(', ')})</span>
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

                <button
                  type="button"
                  onClick={() => setSupervisorTab('configuracion')}
                  className="bg-amber-500/10 hover:bg-amber-500/20 active:bg-amber-500/30 text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-black uppercase px-3.5 py-2 rounded-lg transition flex items-center gap-2 cursor-pointer shrink-0 shadow-sm"
                >
                  <Settings className="w-3.5 h-3.5 text-amber-400" />
                  <span>Configurar Casilleros & Horarios ➜</span>
                </button>
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
                          <div className="text-[9.5px] text-slate-500 font-bold uppercase text-center flex items-center justify-center gap-1.5">
                            <span>O use "Marcar los 3 al mismo tiempo ✓" arriba para chequearlos antes de firmar</span>
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
                                  setSelectedAppForSupervisor(null);
                                  setSupervisorCheckedDocs([]);
                                }}
                                className="w-full mt-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-extrabold text-[10.5px] tracking-wider uppercase py-3 rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <span>Firmar y Despachar Turno a Pantalla ⚡</span>
                              </button>
                            </div>
                          ) : (
                            <div className="p-3 text-[10.5px] text-red-400 font-bold text-center">
                              ⚠️ No hay cubículos activos habilitados. Active uno a la izquierda en la consola del supervisor de extranjería.
                            </div>
                          )}
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

                    {/* SALA DE ENTRADA MONITOR FOR SUPERVISOR */}
                    {queueAtencionIn.length > 0 && (
                      <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-850 text-left space-y-3">
                        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800/80 pb-2 gap-2">
                          <div className="space-y-0.5">
                            <h5 className="text-[11px] font-black uppercase tracking-wider text-slate-200 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-blue-400" />
                              <span>En Sala de Entrada / Espera de Atención ({queueAtencionIn.length})</span>
                            </h5>
                            <p className="text-[9px] text-slate-450 font-bold uppercase">
                              Ciudadanos esperando revisión documental. Puede darles paso o despacharlos directamente:
                            </p>
                          </div>

                          {/* Quick Search for Waiting Room */}
                          <div className="relative w-full md:w-72 shrink-0">
                            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                            <input
                              type="text"
                              placeholder="Buscar por nombre, PAS o ID..."
                              value={supervisorAtencionSearchQuery}
                              onChange={(e) => setSupervisorAtencionSearchQuery(e.target.value)}
                              className="w-full bg-slate-900 border border-slate-800 rounded-md py-1.5 pl-9 pr-8 text-[11px] text-white focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-amber-500 font-medium placeholder-slate-600"
                            />
                            {supervisorAtencionSearchQuery && (
                              <button
                                type="button"
                                onClick={() => setSupervisorAtencionSearchQuery('')}
                                className="absolute right-2.5 top-1.5 text-slate-500 hover:text-white text-xs font-black px-1"
                              >
                                ✕
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="divide-y divide-slate-850/60 max-h-[260px] overflow-y-auto pr-1">
                          {filteredSupervisorAtencionIn.length === 0 ? (
                            <div className="py-8 text-center text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                              🔍 No se encontraron coincidencias para "{supervisorAtencionSearchQuery}"
                            </div>
                          ) : (
                            filteredSupervisorAtencionIn.map(app => {
                              const name = getExtranjeriaCitizenName(app);
                              const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';

                              return (
                                <div key={`sup-wait-${app.id}`} className="py-2.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-1">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[11px] font-mono font-black text-amber-400">{app.id}</span>
                                      <span className="text-[8px] bg-blue-950/40 text-blue-400 border border-blue-900/50 uppercase font-black px-1.5 py-0.2 rounded font-mono">
                                        Sala de Entrada
                                      </span>
                                    </div>
                                    <span className="text-[11px] font-bold text-slate-200 block uppercase">{name}</span>
                                    <span className="text-[9px] font-mono text-slate-450 block">PAS: {passport} | Hora: {app.hora}</span>
                                  </div>

                                  <div className="flex items-center gap-2 shrink-0">
                                    <button
                                      type="button"
                                      onClick={() => handleMarkAllAndAutoAssign(app.id)}
                                      className="flex items-center gap-1 text-emerald-300 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 transition font-black uppercase text-[9px] tracking-wider px-2.5 py-1.5 rounded-md cursor-pointer shadow-sm"
                                      title="Marcar los 3 requisitos y asignar cubículo inmediatamente"
                                    >
                                      <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                                      <span>Marcar 3 y Asignar ⚡</span>
                                    </button>

                                    <button
                                      type="button"
                                      onClick={() => handleSubmitVerification(app.id)}
                                      className="flex items-center gap-1 text-blue-300 hover:text-white bg-blue-950/80 hover:bg-blue-900 border border-blue-500/40 transition font-black uppercase text-[9px] tracking-wider px-2.5 py-1.5 rounded-md cursor-pointer shadow-sm"
                                      title="Dar paso inmediato a la bandeja del supervisor"
                                    >
                                      <Send className="w-3 h-3 text-blue-400" />
                                      <span>Dar Paso a Supervisor ⏩</span>
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
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
                            <div
                              key={app.id} 
                              className="w-full py-3.5 px-3 text-left transition hover:bg-slate-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-850/30 last:border-0 rounded-lg"
                            >
                              <div 
                                onClick={() => {
                                  setSelectedAppForSupervisor(app);
                                  setSupervisorCheckedDocs([]);
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
                                    setSupervisorCheckedDocs([]);
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

                    {/* ALWAYS VISIBLE WAITING ROOM MONITOR FOR SUPERVISOR */}
                    {queueAtencionIn.length > 0 && (
                      <div className="mt-4 pt-4 border-t border-slate-850/80 text-left space-y-2.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-blue-400" />
                            <span>En Sala de Entrada / Espera de Atención ({queueAtencionIn.length})</span>
                          </span>
                          <span className="text-[9px] text-slate-500 font-bold uppercase font-mono">
                            Acción rápida disponible
                          </span>
                        </div>

                        <div className="divide-y divide-slate-850/40 max-h-[160px] overflow-y-auto pr-1">
                          {filteredSupervisorAtencionIn.length === 0 ? (
                            <div className="py-4 text-center text-[10px] text-slate-500 font-bold uppercase">
                              Sin coincidencias
                            </div>
                          ) : (
                            filteredSupervisorAtencionIn.map(app => {
                              const name = getExtranjeriaCitizenName(app);
                              const passport = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';

                              return (
                                <div key={`sup-wait-sub-${app.id}`} className="py-2 flex items-center justify-between gap-2 text-xs">
                                  <div className="space-y-0.5 truncate">
                                    <div className="flex items-center gap-1.5">
                                      <span className="font-mono font-bold text-amber-400 text-[10px]">{app.id}</span>
                                      <span className="text-slate-200 font-bold uppercase truncate text-[11px]">{name}</span>
                                    </div>
                                    <span className="text-[9px] text-slate-450 font-mono block">PAS: {passport}</span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => handleMarkAllAndAutoAssign(app.id)}
                                    className="text-emerald-300 hover:text-white bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 transition font-black uppercase text-[8.5px] tracking-wider px-2 py-1 rounded cursor-pointer shrink-0"
                                    title="Marcar 3 y asignar a cubículo"
                                  >
                                    ⚡ Marcar 3 y Asignar
                                  </button>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
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
                    {(['todos', 'dia', 'semana', 'mes', 'año'] as const).map(period => (
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
                        {period === 'todos' ? 'Todos' : period === 'dia' ? 'Día' : period === 'semana' ? 'Semana' : period === 'mes' ? 'Mes' : 'Año'}
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
                      const name = getExtranjeriaCitizenName(app);
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
                              Pasaporte: <span className="font-mono text-slate-300 font-bold">{passport}</span> | Fecha: <span className="font-mono text-amber-300 font-bold">{formatFriendlyDate(app.fecha)}</span> ({app.hora})
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
                  {/* Date Input Range and Cubiculo Selectors */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-left">
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
                            const tStr = d.toISOString().substring(0, 10);
                            setReportStartDate(mStr);
                            setReportEndDate(tStr);
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
                          Año '26
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setReportStartDate("2026-01-01");
                            setReportEndDate("2026-12-31");
                          }}
                          className="bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-white px-1 py-1.5 rounded text-[9px] font-mono font-bold uppercase transition cursor-pointer"
                        >
                          Todo
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                        Usuario / Operador de Ventanilla
                      </label>
                      <select
                        value={reportOperatorFilter}
                        onChange={(e) => setReportOperatorFilter(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-amber-500 transition font-black"
                      >
                        <option value="all">TODOS LOS USUARIOS DE VENTANILLA</option>
                        {availableCubiculoUsers.map(user => {
                          const todayCount = cubiculoUserStats[user]?.today || 0;
                          const rangeCount = cubiculoUserStats[user]?.range || 0;
                          return (
                            <option key={user} value={user}>
                              {user.toUpperCase()} ({todayCount} atendidos hoy | {rangeCount} en rango)
                            </option>
                          );
                        })}
                      </select>
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
                        Gestione la disponibilidad operativa de los <strong className="text-white">Casilleros de Atención</strong> (4 fijos y 4 de reserva) y regule los parámetros de la jornada oficial de citas (<strong className="text-amber-300">56 cupos reglamentarios de 07:00 AM a 01:45 PM</strong>).
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
                              : 'bg-slate-950 border-slate-850 opacity-60'
                          }`}
                        >
                          <div className="space-y-2 text-left">
                            <div className="flex items-center justify-between">
                              <span className="text-[11px] font-black text-slate-250 uppercase">{b.name}</span>
                              <span className={`w-2.5 h-2.5 rounded-full ${b.active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`} />
                            </div>
                            
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

                            <div className="pt-1">
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
                            className={`w-full py-1.5 rounded text-[9px] font-black uppercase tracking-wider transition cursor-pointer ${
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
                        <p className="text-[9.5px] text-slate-450 font-bold uppercase">56 cupos oficiales de 07:00 AM a 01:45 PM</p>
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
                          }}
                          className="bg-slate-900 border border-slate-800 text-slate-400 hover:text-white hover:border-amber-500/50 p-2 rounded cursor-pointer transition font-bold"
                          title="Mes anterior"
                        >
                          &larr;
                        </button>
                        <span className="text-xs font-black uppercase tracking-wider text-amber-500 px-3 py-1 bg-amber-500/5 border border-amber-500/10 rounded font-mono">
                          {mesesNombres[safeCalendarDate.getMonth()]} {safeCalendarDate.getFullYear()}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const next = new Date(safeCalendarDate.getFullYear(), safeCalendarDate.getMonth() + 1, 1);
                            setCalendarDate(next);
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
                          className="ml-2 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-[10.5px] uppercase tracking-wider px-3.5 py-2 rounded transition flex items-center gap-1.5 shadow-md cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Crear Cita</span>
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
                              
                              {dayCitas.length > 0 && (
                                <span className={`text-[8.5px] font-black px-1.5 py-0.5 rounded font-mono shadow-xs ${
                                  dayCitas.length >= 56 
                                    ? 'bg-rose-600 text-white font-black' 
                                    : 'bg-amber-500 text-slate-950'
                                }`}>
                                  {dayCitas.length}/56
                                </span>
                              )}
                            </div>

                            {/* Informative contents placed inside the day */}
                            {dayCitas.length > 0 ? (
                              <div className="space-y-1 mt-1.5 w-full">
                                <div className={`px-1.5 py-0.5 rounded text-[8px] font-mono font-black uppercase flex items-center justify-between ${
                                  dayCitas.length >= 56 
                                    ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30' 
                                    : 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                }`}>
                                  <span>{dayCitas.length} citas</span>
                                  <span>{dayCitas.length >= 56 ? 'Lleno' : 'Disp.'}</span>
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
                            ) : (
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
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest block font-mono">Detalles de la Jornada</span>
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded font-mono border ${
                            (appointmentsByDate[selectedCalendarDateStr] || []).length >= 56
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-400 border-amber-500/30'
                          }`}>
                            {(appointmentsByDate[selectedCalendarDateStr] || []).length} / 56 Citas Permitidas
                          </span>
                        </div>
                        <h4 className="text-sm font-black text-white flex items-center gap-1.5">
                          <span>Citas para el {selectedCalendarDateStr}</span>
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
                          (appointmentsByDate[selectedCalendarDateStr] || []).map((app: any, appIdx: number) => {
                            const stepStatus = appMetadata[app.id]?.estadoTicket || 'En Entrada';
                            const pName = getExtranjeriaCitizenName(app);
                            const passportVal = app.datosPersonales?.pasaporte || app.identificacion || 'N/D';
                            
                            const subservice = app.subServicioNombre || (isExtranjeriaAppointment(app) ? 'Servicio de Extranjería' : 'Cédula Pasados de Edad');
                            
                            return (
                              <div key={`cal-det-${app.id}`} className="space-y-1.5 pt-3.5 first:pt-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                      <span className="text-[10px] font-black bg-amber-500/20 border border-amber-500/30 text-amber-300 px-1.5 py-0.5 rounded font-mono">
                                        N° {app.numeroCitaDia || (appIdx + 1)} de 56
                                      </span>
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
                    {filteredQueueAtencionIn.length}
                    {filteredQueueAtencionIn.length !== queueAtencionIn.length && ` / ${queueAtencionIn.length}`}
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

            {/* BUSCADOR POR NOMBRE O PASAPORTE Y FILTRO POR DÍA */}
            <div className="bg-slate-900/80 p-3 rounded-lg border border-slate-800 space-y-2.5 text-left">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                {/* Campo de búsqueda por Nombre o Pasaporte */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre o pasaporte..."
                    value={atencionSearchQuery}
                    onChange={(e) => setAtencionSearchQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-750 text-white rounded-md py-1.5 pl-9 pr-8 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-medium placeholder-slate-500"
                  />
                  {atencionSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setAtencionSearchQuery('')}
                      className="absolute right-2.5 top-1.5 text-slate-400 hover:text-white text-xs font-black px-1"
                      title="Limpiar búsqueda"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filtro de Citas en el Día */}
                {isStrictTodayOnly ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-950/40 border border-blue-900/50 rounded-lg text-[11px] font-black uppercase text-blue-300">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>Solo Citas de Hoy: {todayStr}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAtencionShowAllDates(true)}
                      className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-850 rounded-md text-[10.5px] font-black uppercase tracking-wider transition cursor-pointer flex items-center gap-1 hover:text-amber-400"
                      title="Ver citas de cualquier fecha, incluyendo importaciones CSV o citas de otras fechas"
                    >
                      <span>Ver Todas las Fechas 📂</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 shrink-0 flex-wrap">
                    <div className="relative">
                      <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2 pointer-events-none" />
                      <input
                        type="date"
                        value={atencionDateFilter}
                        onChange={(e) => setAtencionDateFilter(e.target.value)}
                        className="bg-slate-950 border border-slate-750 text-white rounded-md py-1.5 pl-8 pr-2 text-xs focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 font-mono cursor-pointer"
                        title="Seleccionar fecha de citas"
                      />
                    </div>

                    {/* Botón rápido "Hoy" */}
                    <button
                      type="button"
                      onClick={() => {
                        const today = new Date().toISOString().substring(0, 10);
                        setAtencionDateFilter(atencionDateFilter === today ? '' : today);
                      }}
                      className={`px-2.5 py-1.5 rounded-md text-[11px] font-bold uppercase transition flex items-center gap-1 cursor-pointer whitespace-nowrap border ${
                        atencionDateFilter === new Date().toISOString().substring(0, 10)
                          ? 'bg-blue-600 text-white border-blue-500 shadow-sm'
                          : 'bg-slate-950 hover:bg-slate-850 text-slate-300 border-slate-750'
                      }`}
                      title="Filtrar citas del día de hoy"
                    >
                      <span>Hoy 📅</span>
                    </button>

                    {/* Botón rápido para volver a "Solo Hoy" */}
                    <button
                      type="button"
                      onClick={() => {
                        setAtencionShowAllDates(false);
                      }}
                      className="px-2.5 py-1.5 rounded-md text-[11px] font-black uppercase bg-slate-900 hover:bg-slate-850 text-amber-400 border border-slate-800 transition flex items-center gap-1 cursor-pointer"
                      title="Forzar vista a sólo citas del día actual"
                    >
                      <span>🔒 Solo Hoy</span>
                    </button>

                    {/* Botón "Todas" */}
                    {atencionDateFilter && (
                      <button
                        type="button"
                        onClick={() => setAtencionDateFilter('')}
                        className="px-2 py-1.5 rounded-md text-[11px] font-bold uppercase bg-slate-950 hover:bg-slate-850 text-slate-400 hover:text-white border border-slate-750 transition cursor-pointer"
                        title="Ver citas de todas las fechas"
                      >
                        Todas
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Días con citas cargadas (si hay más de 1 fecha disponible y no es rol de atención estricta) */}
              {!isStrictTodayOnly && availableAppointmentDates.length > 1 && (
                <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5 pt-0.5 text-[9.5px]">
                  <span className="text-slate-500 font-bold uppercase shrink-0">Días con citas:</span>
                  {availableAppointmentDates.map(d => (
                    <button
                      key={`atencion-d-${d}`}
                      type="button"
                      onClick={() => setAtencionDateFilter(atencionDateFilter === d ? '' : d)}
                      className={`px-2 py-0.5 rounded font-mono font-bold transition whitespace-nowrap border cursor-pointer ${
                        atencionDateFilter === d
                          ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              )}

              {/* Indicador de filtros activos */}
              {(atencionSearchQuery || (atencionDateFilter && !isStrictTodayOnly)) && (
                <div className="flex flex-wrap items-center justify-between text-[10.5px] text-slate-400 pt-1 border-t border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <span>Coincidencias: <strong className="text-white font-mono">{filteredQueueAtencionIn.length}</strong></span>
                    {atencionDateFilter && (
                      <span className="text-blue-400 font-mono bg-blue-950/60 border border-blue-900/50 px-1.5 py-0.2 rounded text-[9.5px]">
                        📅 {atencionDateFilter}
                      </span>
                    )}
                    {atencionSearchQuery && (
                      <span className="text-amber-400 font-mono bg-amber-950/60 border border-amber-900/50 px-1.5 py-0.2 rounded text-[9.5px]">
                        🔍 "{atencionSearchQuery}"
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setAtencionSearchQuery('');
                      if (!isStrictTodayOnly) {
                        setAtencionDateFilter('');
                      }
                    }}
                    className="text-[10px] text-slate-400 hover:text-amber-400 font-bold underline cursor-pointer"
                  >
                    Limpiar filtros
                  </button>
                </div>
              )}
            </div>

            {/* List */}
            {filteredQueueAtencionIn.length === 0 ? (
              <div className="py-14 text-center space-y-2 text-slate-450 border border-dashed border-slate-850 rounded">
                {atencionSearchQuery || (atencionDateFilter && !isStrictTodayOnly) ? (
                  <>
                    <Search className="w-8 h-8 text-slate-600 mx-auto" />
                    <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-350">
                      Sin resultados para esta búsqueda
                    </span>
                    <p className="text-[10px] max-w-xs mx-auto leading-relaxed text-slate-400">
                      No se encontraron ciudadanos en sala de entrada con {atencionSearchQuery ? `"${atencionSearchQuery}"` : ''} {atencionDateFilter && !isStrictTodayOnly ? `en la fecha ${atencionDateFilter}` : ''}.
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setAtencionSearchQuery('');
                        if (!isStrictTodayOnly) {
                          setAtencionDateFilter('');
                        }
                      }}
                      className="text-[10.5px] text-blue-400 hover:text-blue-300 font-bold underline cursor-pointer inline-block mt-1"
                    >
                      Limpiar filtros y ver todos
                    </button>
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-8 h-8 text-slate-600 mx-auto" />
                    <span className="text-[11px] font-bold uppercase tracking-wider block text-slate-350">Sin citas en espera</span>
                    <p className="text-[10px] max-w-xs mx-auto leading-relaxed">Todos los ciudadanos registrados de Extranjería ya han sido procesados por la Unidad de Entrada.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
                {filteredQueueAtencionIn.map(app => {
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
                        <span className="text-[9.5px] font-bold text-slate-450 block font-mono">PAS: {passport}  |  Fecha: {formatFriendlyDate(app.fecha)} ({app.hora})</span>
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

            {currentRole === 'extranjeria_cubiculo' && (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-slate-900/60 border border-slate-800/80 rounded-xl mb-2">
                <div className="text-left space-y-1">
                  <span className="text-[9px] font-black text-slate-450 uppercase block tracking-wider">Estación Operando</span>
                  <span className="text-xs font-black text-indigo-400">{booths.find(b => b.id === selectedCubiculo)?.name || 'N/D'}</span>
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
              </div>
            )}

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
                  const meta = appMetadata[app.id];
                  const isInAttention = meta?.estadoTicket === 'en_atencion';
                  const isPaidInCaja = meta?.estadoTicket === 'pagado_en_caja';

                  return (
                    <div 
                      key={`cubiculo-row-${app.id}`} 
                      className={`border p-5 rounded-lg space-y-4 shadow-md text-left transition ${
                        isInAttention 
                          ? 'bg-slate-900/90 border-emerald-500/80 ring-1 ring-emerald-500/40 shadow-emerald-950/30' 
                          : 'bg-slate-900/60 border-slate-850'
                      }`}
                    >
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
                          <h5 className="text-sm font-black text-slate-100 uppercase leading-snug">{name}</h5>
                          <span className="text-[10px] text-emerald-400 font-bold block">Agendado por: {app.creadoPor || app.datosPersonales?.creadoPor || 'Portal del Ciudadano'}</span>
                          <span className="text-[10px] text-slate-450 font-bold block">Nacionalidad: {app.datosPersonales?.nacionalidad || 'N/D'}  |  Pasaporte: {passport}</span>
                        </div>

                        {/* Status Badge */}
                        <div className="shrink-0 flex items-center gap-2">
                          {isInAttention ? (
                            <span className="bg-emerald-950/90 border border-emerald-500/80 text-emerald-300 font-black text-[10.5px] uppercase px-3.5 py-1 rounded-full flex items-center gap-2 shadow-sm">
                              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                              <span>EN ATENCIÓN ACTIVA</span>
                            </span>
                          ) : isPaidInCaja ? (
                            <span className="bg-indigo-950/90 border border-indigo-500/80 text-indigo-300 font-black text-[10px] uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                              <CreditCard className="w-3.5 h-3.5 text-indigo-400" />
                              <span>ENVIADO A CAJA</span>
                            </span>
                          ) : (
                            <span className="bg-amber-950/80 border border-amber-500/60 text-amber-300 font-black text-[10px] uppercase px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                              <Clock className="w-3.5 h-3.5 text-amber-400" />
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
        // Encontrar ciudadano actualmente llamado en pantalla (NO debe estar 'en_atencion' ni 'realizada')
        // El llamado se quita de inmediato cuando el agente presiona "Iniciar Atención"
        let featuredApp: any = null;
        let featuredBooth: any = null;

        // 1. Verificar si hay un evento de llamado activo emitido recientemente
        if (lastCallEvent && (Date.now() - lastCallEvent.timestamp < 90000)) {
          const matchingApp = appointments.find(a => a.id === lastCallEvent.appId);
          const meta = matchingApp ? appMetadata[matchingApp.id] : null;
          // Si el ciudadano ya pasó a "en_atencion" o "realizada", el llamado se retira de inmediato
          if (matchingApp && meta?.estadoTicket !== 'en_atencion' && meta?.estadoTicket !== 'realizada') {
            featuredApp = matchingApp;
            featuredBooth = booths.find(b => b.id === (meta?.assignedCubiculo || lastCallEvent.boothId));
          }
        }

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

        // Helper to format clean, readable ticket code for waiting room screen
        const getDisplayTurnCode = (app: any) => {
          if (!app) return '---';
          if (app.codigoTransaccion && app.codigoTransaccion.trim()) {
            return app.codigoTransaccion.trim().toUpperCase();
          }
          const cleanId = String(app.id || '').trim();
          const parts = cleanId.split('-');
          const last = parts[parts.length - 1];
          if (last && !isNaN(Number(last))) {
            return `E-${last}`;
          }
          return `E-${cleanId.slice(-4).replace(/^-+/, '').toUpperCase()}`;
        };

        return (
          <div 
            ref={screenContainerRef} 
            onDoubleClick={toggleFullscreen}
            className={`animate-fade-in text-left ${
              isFullscreen 
                ? 'bg-slate-950 p-6 lg:p-10 h-screen min-h-screen w-full flex flex-col justify-between select-none overflow-hidden space-y-6' 
                : 'space-y-6'
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

            {/* Header Area styled with Tribunal logo and Real-time clock (HIDDEN IN FULLSCREEN) */}
            {!isFullscreen && (
              <div className="bg-slate-950 p-5 lg:p-6 rounded-2xl border-2 border-slate-800 shadow-2xl flex flex-col lg:flex-row items-center justify-between gap-5">
                {/* Tribunal Electoral Logo & Title Badge */}
                <div className="flex items-center gap-4 sm:gap-5 w-full lg:w-auto">
                  <div className="relative shrink-0">
                    <div className="absolute -inset-1 bg-amber-500/15 rounded-2xl blur" />
                    <img
                      src="/images/logo-sede-te-1.png"
                      alt="Tribunal Electoral Logo"
                      className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-xl bg-white p-2 border border-amber-500/40 relative z-10 shadow-md"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div className="space-y-1">
                    <span className="text-xs sm:text-sm font-black tracking-widest text-[#d9a74a] uppercase font-mono block">
                      REPÚBLICA DE PANAMÁ ● TRIBUNAL ELECTORAL
                    </span>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                      SISTEMA DE ASIGNACIÓN DE TURNOS
                    </h2>
                    <p className="text-xs sm:text-sm text-slate-300 font-bold uppercase tracking-wider">
                      DEPARTAMENTO DE EXTRANJERÍA ● MONITOR OFICIAL DE SALA
                    </p>
                  </div>
                </div>
   
                {/* Real-time Clock Info Panel */}
                <div className="flex flex-wrap items-center justify-center lg:justify-end gap-3 w-full lg:w-auto">
                  <div className="bg-slate-900 border-2 border-slate-800 rounded-2xl px-5 py-3 text-center lg:text-right shrink-0 min-w-[220px] shadow-lg font-sans">
                    <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono tracking-widest uppercase leading-none mb-1">
                      {formattedTime}
                    </div>
                    <div className="text-xs sm:text-sm font-black text-slate-200 uppercase">
                      <span className="text-amber-500 font-black">{formattedDay}</span>, {formattedDate}
                    </div>
                  </div>
   
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
                      className={`border px-3.5 py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer select-none text-xs sm:text-sm font-black uppercase tracking-wider ${
                        screenSoundEnabled 
                          ? 'bg-amber-950/80 border-amber-500/60 text-amber-300 hover:bg-amber-900/80 shadow-md shadow-amber-950/40' 
                          : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                      title={screenSoundEnabled ? "Sonido activado en esta pantalla de turnos" : "Sonido silenciado en esta pantalla"}
                    >
                      {screenSoundEnabled ? <Volume2 className="w-4 h-4 text-amber-400" /> : <VolumeX className="w-4 h-4 text-slate-500" />}
                      <span className="hidden sm:inline">{screenSoundEnabled ? "Audio TV Activo" : "Audio Mute"}</span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleFullscreen}
                      className="bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-slate-850 text-slate-300 hover:text-amber-400 p-2.5 sm:px-3.5 sm:py-2.5 rounded-xl transition flex items-center gap-2 cursor-pointer text-xs sm:text-sm font-black uppercase tracking-wider"
                      title={isFullscreen ? "Salir de pantalla completa" : "Poner en pantalla completa para TV"}
                    >
                      {isFullscreen ? <Minimize className="w-4 h-4 text-amber-500" /> : <Maximize className="w-4 h-4 text-amber-500" />}
                      <span className="hidden sm:inline">
                        {isFullscreen ? "Salir" : "Pantalla Completa 📺"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={fetchAppointments}
                      disabled={loading}
                      className="bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-300 p-2.5 sm:p-3 rounded-xl transition"
                      title="Actualizar Datos"
                    >
                      <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* HIGHLIGHTED HERO SPOTLIGHT HEADER: Pulsing called ticket attention box */}
            {featuredApp && featuredBooth ? (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-600/35 via-amber-950/45 to-slate-950 border-3 border-amber-400 p-6 lg:p-8 shadow-2xl shadow-amber-500/20 animate-pulse">
                <div className="absolute top-0 right-0 px-4 py-2 text-xs sm:text-sm bg-amber-500 text-slate-950 rounded-bl-2xl font-black font-mono tracking-widest uppercase shadow-md">
                  🔔 ¡LLAMANDO CITACIÓN!
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  <div className="md:col-span-5 text-center md:text-left space-y-2 border-b md:border-b-0 md:border-r border-amber-500/35 pb-5 md:pb-0 md:pr-6">
                    <span className="inline-block px-3 py-1 rounded-md text-xs font-black uppercase tracking-wider text-amber-300 bg-amber-950 border border-amber-500/40">
                      TRÁMITE DE EXTRANJERÍA
                    </span>
                    <div className="text-xs sm:text-sm font-black text-slate-300 uppercase tracking-widest font-mono">
                      CIUDADANO CONVOCADO:
                    </div>
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight leading-tight">
                      {getExtranjeriaCitizenName(featuredApp)}
                    </div>
                    <span className="text-xs sm:text-sm text-emerald-400 block font-bold">
                      Agendado por: {featuredApp.creadoPor || featuredApp.datosPersonales?.creadoPor || 'Portal del Ciudadano'}
                    </span>
                  </div>

                  <div className="md:col-span-4 text-center py-2">
                    <span className="text-xs sm:text-sm font-black uppercase tracking-widest text-amber-300 block mb-1">
                      CÓDIGO DE TURNO
                    </span>
                    <div className="text-5xl sm:text-6xl lg:text-7xl font-mono font-black tracking-widest text-[#f8c95c] drop-shadow-[0_0_18px_rgba(248,201,92,0.6)]">
                      {getDisplayTurnCode(featuredApp)}
                    </div>
                  </div>

                  <div className="md:col-span-3 text-center md:text-right space-y-2">
                    <span className="text-xs sm:text-sm font-black tracking-widest text-slate-300 block uppercase">
                      DIRÍJASE AL
                    </span>
                    <div className="text-2xl sm:text-3xl lg:text-4xl font-black text-white uppercase tracking-tight">
                      {featuredBooth.name}
                    </div>
                    <div className="pt-2">
                      <span className="inline-flex items-center gap-2 text-xs sm:text-sm font-black uppercase tracking-widest text-emerald-300 bg-emerald-950/90 px-3.5 py-1.5 rounded-lg border border-emerald-500/40 shadow-md">
                        <span className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
                        Paso Habilitado
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/80 border-2 border-slate-800/90 p-6 lg:p-8 rounded-2xl text-center space-y-2.5 shadow-xl">
                <span className="inline-block px-3.5 py-1 rounded-full text-xs sm:text-sm font-black text-amber-400 bg-amber-950/60 border border-amber-500/30 uppercase tracking-widest font-mono">
                  TRIBUNAL ELECTORAL ● MÓDULO EXTRANJERÍA
                </span>
                <h3 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white tracking-wide uppercase">
                  SALA DE ESPERA OPERATIVA
                </h3>
                <p className="text-sm sm:text-base lg:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-semibold">
                  No hay turnos activos llamados en este momento. Por favor tome asiento y permanezca atento a su llamado en pantalla.
                </p>
              </div>
            )}

            {/* Main Monitor Display Grid - High Visibility Booths */}
            <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 ${isFullscreen ? 'flex-1 items-stretch' : ''}`}>
              {booths.filter(b => b.active).map(b => {
                // Find active appointments for this booth (not completed/realizada)
                const assignedApps = appointments.filter(app => {
                  const meta = appMetadata[app.id];
                  return meta && meta.assignedCubiculo === b.id && meta.estadoTicket !== 'realizada';
                });

                // Current serving
                const activeApp = assignedApps[0]; 
                const queueRemaining = assignedApps.slice(1);

                // Dynamic name sizing for big view
                const citizenName = activeApp ? getExtranjeriaCitizenName(activeApp) : '';
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
                      activeApp 
                        ? (appMetadata[activeApp.id]?.estadoTicket === 'en_atencion'
                            ? 'border-emerald-500/80 border-3 shadow-2xl shadow-emerald-950/30 bg-gradient-to-b from-slate-900 via-slate-900/95 to-emerald-950/25'
                            : 'border-amber-400 border-3 shadow-2xl shadow-amber-500/20 bg-gradient-to-b from-slate-900 via-slate-900/95 to-amber-950/30 scale-[1.01]')
                        : 'border-slate-800/90 shadow-lg shadow-black/50'
                    }`}
                  >
                    {/* Top Header of booth */}
                    <div className="border-b border-slate-800 pb-3.5">
                      <div className="flex items-center justify-between">
                        <span className={`font-black text-white uppercase tracking-wider ${isFullscreen ? 'text-2xl sm:text-3xl xl:text-4xl' : 'text-lg sm:text-xl'}`}>
                          {b.name}
                        </span>
                        <div className="flex items-center gap-2">
                          {activeApp && (
                            appMetadata[activeApp.id]?.estadoTicket === 'en_atencion' ? (
                              <span className={`bg-emerald-950 text-emerald-300 border border-emerald-500/50 rounded-md font-black tracking-wider uppercase flex items-center gap-1.5 shadow-sm ${isFullscreen ? 'text-sm px-3.5 py-1.5' : 'text-xs px-2.5 py-1'}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                                ATENDIENDO
                              </span>
                            ) : (
                              <span className={`bg-amber-950 text-amber-300 border border-amber-500/50 rounded-md font-black tracking-wider uppercase shadow-sm ${isFullscreen ? 'text-sm px-3.5 py-1.5' : 'text-xs px-2.5 py-1'}`}>
                                LLAMANDO
                              </span>
                            )
                          )}
                          <span className={`rounded-full ${
                            isFullscreen ? 'w-4 h-4' : 'w-3.5 h-3.5'
                          } ${
                            activeApp 
                              ? (appMetadata[activeApp.id]?.estadoTicket === 'en_atencion' ? 'bg-emerald-400' : 'bg-amber-400 animate-ping')
                              : 'bg-emerald-500'
                          }`} />
                        </div>
                      </div>
                    </div>

                    {/* Mid Content - Big High Visibility Ticket Code, Procedure and Name */}
                    <div className="py-4 my-auto text-center space-y-3 flex flex-col justify-center items-center">
                      {activeApp ? (
                        <div className="animate-fade-in space-y-2.5 w-full">
                          {appMetadata[activeApp.id]?.estadoTicket === 'en_atencion' ? (
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
                            appMetadata[activeApp.id]?.estadoTicket === 'en_atencion'
                              ? 'text-emerald-300 drop-shadow-[0_0_12px_rgba(52,211,153,0.4)]'
                              : 'text-[#f5c358] drop-shadow-[0_0_15px_rgba(245,195,88,0.5)]'
                          } ${nameSizeClass}`}>
                            {citizenName}
                          </div>
                          
                          <div className={`font-mono font-black text-slate-300 bg-slate-950/60 border border-slate-800/80 rounded-lg px-4 py-1.5 mx-auto w-fit uppercase tracking-widest ${
                            isFullscreen ? 'text-lg sm:text-xl lg:text-2xl' : 'text-xs sm:text-sm'
                          }`}>
                            Cita: <span className="text-amber-400 select-all">{getDisplayTurnCode(activeApp)}</span>
                          </div>

                          <span className={`text-emerald-400 block font-bold truncate px-1 mt-0.5 ${
                            isFullscreen ? 'text-sm lg:text-base' : 'text-xs sm:text-sm'
                          }`}>
                            Agendado por: {activeApp.creadoPor || activeApp.datosPersonales?.creadoPor || 'Portal del Ciudadano'}
                          </span>

                        </div>
                      ) : (
                        <div className="space-y-2">
                          <span className={`font-black uppercase tracking-wider block bg-emerald-950/60 border border-emerald-500/30 rounded-md mx-auto w-fit ${
                            isFullscreen ? 'text-sm sm:text-base py-1.5 px-4' : 'text-xs sm:text-sm py-1 px-3'
                          }`}>
                            CUBÍCULO DISPONIBLE
                          </span>
                          <div className={`font-mono font-black text-slate-700 tracking-widest select-none py-1 ${
                            isFullscreen ? 'text-6xl sm:text-7xl lg:text-8xl xl:text-[6.5rem]' : 'text-4xl sm:text-5xl lg:text-6xl'
                          }`}>
                            ----
                          </div>
                          <p className={`text-slate-450 font-extrabold uppercase mt-1 leading-none ${
                            isFullscreen ? 'text-sm sm:text-base tracking-widest' : 'text-xs sm:text-sm'
                          }`}>
                            Esperando Ciudadano
                          </p>
                        </div>
                      )}
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
