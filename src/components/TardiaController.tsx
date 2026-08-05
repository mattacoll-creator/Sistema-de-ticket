import React, { useState, useMemo, useEffect } from 'react';
import { 
  Shield, 
  Download, 
  CheckCircle, 
  TrendingUp, 
  Users, 
  Calendar, 
  AlertCircle, 
  Filter, 
  Check, 
  X, 
  Search, 
  FileText, 
  Clock,
  Plus,
  Copy,
  Link,
  Share2,
  Trash2,
  RefreshCw,
  FileSpreadsheet,
  ChevronDown,
  Lock,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  CalendarDays
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import { Cita, AdminRole, TipoIdentificacion } from '../types';
import { SUCURSALES_TE } from '../data';

interface TardiaControllerProps {
  citas: Cita[];
  onUpdateCitas: (updatedList: Cita[]) => void;
  currentRole: AdminRole;
  activeUsername: string;
}

export default function TardiaController({ 
  citas, 
  onUpdateCitas, 
  currentRole, 
  activeUsername 
}: TardiaControllerProps) {
  
  // Persona control (can switch between Supervisor and Operator if role is 'super' or for troubleshooting)
  const luser = activeUsername.toLowerCase();
  const isSuperAdmin = currentRole === 'super';
  
  const [activePersona, setActivePersona] = useState<'superit' | 'adminpedad'>(() => {
    if (currentRole === 'pasado_edad_supervisor') return 'superit';
    if (currentRole === 'pasado_edad_admin') return 'adminpedad';
    if (luser === 'superit') return 'superit';
    if (luser === 'adminpedad') return 'adminpedad';
    // Fallback or Super Admin select
    return 'superit';
  });

  // Sync activePersona in case activeUsername or currentRole changes
  useEffect(() => {
    if (currentRole === 'pasado_edad_supervisor') {
      setActivePersona('superit');
    } else if (currentRole === 'pasado_edad_admin') {
      setActivePersona('adminpedad');
    } else if (luser === 'superit') {
      setActivePersona('superit');
    } else if (luser === 'adminpedad') {
      setActivePersona('adminpedad');
    }
  }, [luser, currentRole]);

  // STATES FOR REGISTRATION FORM (adminpedad)
  const [expName, setExpName] = useState('');
  const [expIdentificacion, setExpIdentificacion] = useState('');
  const [expFechaNacimiento, setExpFechaNacimiento] = useState('');
  const [expCorreo, setExpCorreo] = useState('');
  const [expTelefono, setExpTelefono] = useState('');
  const [expNotes, setExpNotes] = useState('');
  const [expCategory, setExpCategory] = useState('Primera vez nacional, sin biometría');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Default link base state
  const [pasadoEdadLinkBase, setPasadoEdadLinkBase] = useState(() => {
    const stored = localStorage.getItem('te_panama_pasado_edad_link_base');
    if (stored) return stored;
    return typeof window !== 'undefined' ? window.location.origin : 'https://citas.tribunal-electoral.gob.pa';
  });

  const [generatedExp, setGeneratedExp] = useState<{
    number: string;
    citizenName: string;
    textMessage: string;
    link: string;
  } | null>(null);

  const [searchExpQuery, setSearchExpQuery] = useState('');
  const [searchExpCategory, setSearchExpCategory] = useState('Todas');

  const [historicalExp, setHistoricalExp] = useState<any[]>(() => {
    const demoExpedientes = [
      {
        id: "VID-26-000-111",
        number: "VID-26-000-111",
        citizenName: "Esteban Caballero Pérez",
        identificacion: "8-445-667",
        fechaNacimiento: "2005-06-12",
        correo: "esteban.caballero@example.com",
        telefono: "+507 6201-9988",
        category: "Primera vez nacional, sin biometría",
        notes: "Trámite de filiación tardía para obtención de cédula por primera vez.",
        fechaCreacion: new Date().toISOString()
      },
      {
        id: "VID-26-000-222",
        number: "VID-26-000-222",
        citizenName: "María Luz González",
        identificacion: "4-789-102",
        fechaNacimiento: "2004-10-15",
        correo: "maria.gonzalez@example.com",
        telefono: "+507 6655-4433",
        category: "Primera vez nacional, inscripción tardía (Hasta 6 meses)",
        notes: "Inscripción tardía aprobada por la Dirección de Registro Civil.",
        fechaCreacion: new Date().toISOString()
      },
      {
        id: "VID-26-000-333",
        number: "VID-26-000-333",
        citizenName: "Carlos Alberto Samudio",
        identificacion: "9-122-384",
        fechaNacimiento: "2003-02-28",
        correo: "carlos.samudio@example.com",
        telefono: "+507 6100-2211",
        category: "Primera vez nacional con 20 años y 1 día cumplidos",
        notes: "Trámite de cédula tardía para ciudadanos de 20 años o más.",
        fechaCreacion: new Date().toISOString()
      },
      {
        id: "VID-26-000-444",
        number: "VID-26-000-444",
        citizenName: "Milagros de Gracia",
        identificacion: "8-999-1002",
        fechaNacimiento: "2002-12-15",
        correo: "milagros.degracia@example.com",
        telefono: "+507 6911-3829",
        category: "Renovación blanco y negro",
        notes: "Autorización de renovación para cédula tardía.",
        fechaCreacion: new Date().toISOString()
      },
      {
        id: "VID-26-000-555",
        number: "VID-26-000-555",
        citizenName: "José Arispe Urriola",
        identificacion: "2-105-992",
        fechaNacimiento: "2006-03-24",
        correo: "jose.arispe@example.com",
        telefono: "+507 6492-3311",
        category: "Primera vez nacional, sin biometría",
        notes: "Pendiente de toma de datos biométricos para filiación.",
        fechaCreacion: new Date().toISOString()
      },
      {
        id: "VID-26-000-666",
        number: "VID-26-000-666",
        citizenName: "Diana Patricia Vergara",
        identificacion: "7-712-453",
        fechaNacimiento: "2005-09-08",
        correo: "diana.vergara@example.com",
        telefono: "+507 6599-2211",
        category: "Primera vez nacional, inscripción tardía (Hasta 6 meses)",
        notes: "Expediente autorizado para agendamiento presencial de Toma de Fotos.",
        fechaCreacion: new Date().toISOString()
      },
      {
        id: "NºSP-26-888-999",
        number: "NºSP-26-888-999",
        citizenName: "Roberto Carlos Alvarado",
        identificacion: "8-111-2222",
        fechaNacimiento: "1978-11-05",
        correo: "roberto.alvarado@example.com",
        telefono: "6222-3333",
        category: "Renovación blanco y negro",
        notes: "Renovación blanco y negro - Creado de forma automática por el Supervisor/SuperIT al programar cita directa.",
        fechaCreacion: new Date().toISOString()
      }
    ];

    const stored = localStorage.getItem('te_panama_historical_expedientes');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // If our primary demo tracking code is missing, merge them!
        const hasDemo = parsed.some((e: any) => e.id === "VID-26-000-111");
        if (!hasDemo) {
          const merged = [...parsed];
          demoExpedientes.forEach(demo => {
            if (!merged.some((e: any) => e.id === demo.id)) {
              merged.push(demo);
            }
          });
          localStorage.setItem('te_panama_historical_expedientes', JSON.stringify(merged));
          return merged;
        }
        return parsed;
      } catch (e) {
        return demoExpedientes;
      }
    }
    localStorage.setItem('te_panama_historical_expedientes', JSON.stringify(demoExpedientes));
    return demoExpedientes;
  });

  // STATES FOR PLANNING OPERATION CONFIG (adminpedad)
  const [tardiaCapacidadTotal, setTardiaCapacidadTotal] = useState<number>(4);
  const [tardiaIntervalo, setTardiaIntervalo] = useState<number>(30);
  const [tardiaHoraInicio, setTardiaHoraInicio] = useState<string>('08:00 AM');
  const [tardiaHoraFin, setTardiaHoraFin] = useState<string>('11:30 AM');
  const [showConfirmTardiaSave, setShowConfirmTardiaSave] = useState(false);

  // NEW STATE VARIABLES FOR INTERACTIVE SUPERVISOR CALENDAR
  const [superViewMode, setSuperViewMode] = useState<'table' | 'calendar'>('table');
  const [calendarView, setCalendarView] = useState<'mes' | 'semana' | 'dia'>('mes');
  const [calendarDate, setCalendarDate] = useState<Date>(() => new Date('2026-05-27T12:00:00'));
  const [selectedCalendarDateStr, setSelectedCalendarDateStr] = useState<string>('2026-05-27');

  // STATES FOR FILTERING AND LISTING COMPLETED CITAS (superit)
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'todos' | 'confirmada' | 'cancelada' | 'realizada'>('todos');
  const [exportLoading, setExportLoading] = useState<string | null>(null);

  // New Date Range State for reports
  const [reportStartDate, setReportStartDate] = useState<string>(() => {
    return '2026-05-01';
  });
  const [reportEndDate, setReportEndDate] = useState<string>(() => {
    return '2026-05-31';
  });

  // EXTRA POWERS FOR SUPERVISORS (Crear Cita variables)
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newCitaNombre, setNewCitaNombre] = useState('');
  const [newCitaTipoIdent, setNewCitaTipoIdent] = useState<TipoIdentificacion>('Cedula');
  const [newCitaIdent, setNewCitaIdent] = useState('');
  const [newCitaFechaNac, setNewCitaFechaNac] = useState('');
  const [newCitaCorreo, setNewCitaCorreo] = useState('');
  const [newCitaTelefono, setNewCitaTelefono] = useState('');
  const [newCitaSucursal, setNewCitaSucursal] = useState('anc_main');
  const [newCitaFecha, setNewCitaFecha] = useState('2026-05-27');
  const [newCitaHora, setNewCitaHora] = useState('08:00 AM');

  // Sync configuration from server on mount
  useEffect(() => {
    const fetchTardiaConfig = async () => {
      try {
        const res = await fetch('/api/tardia/config');
        if (res.ok) {
          const data = await res.json();
          if (data && data.config) {
            setTardiaCapacidadTotal(data.config.capacidadTotalDia || 4);
            setTardiaIntervalo(data.config.intervalo || 30);
            setTardiaHoraInicio(data.config.horaInicio || '08:00 AM');
            setTardiaHoraFin(data.config.horaFin || '11:30 AM');
          }
        }
      } catch (err) {
        console.warn('Erro fetching server configurations, using local fallbacks.', err);
      }
    };
    fetchTardiaConfig();
  }, []);

  // Filter ONLY appointments corresponding to 'ced_pasados_edad'
  const allTardiaCitas = useMemo(() => {
    return citas.filter(cita => cita.subServicioId === 'ced_pasados_edad');
  }, [citas]);

  // Derived Supervisor Statistics
  const stats = useMemo(() => {
    const total = allTardiaCitas.length;
    const realizadas = allTardiaCitas.filter(c => c.estado === 'realizada').length;
    const confirmadas = allTardiaCitas.filter(c => c.estado === 'confirmada' || c.estado === 'asistire').length;
    const canceladas = allTardiaCitas.filter(c => c.estado === 'cancelada' || c.estado === 'no_asistire').length;
    const especiales = allTardiaCitas.filter(c => c.creadaPorSupervisor === true).length;
    return { total, realizadas, confirmadas, canceladas, especiales };
  }, [allTardiaCitas]);

  // CALENDAR ARRAYS AND MEMOS for pasados de edad (VID)
  const mesesNombres = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];
  
  const diasSemanaNombres = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

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

  const weekDays = useMemo(() => {
    // Let's find the Monday of the current week of calendarDate
    const current = new Date(calendarDate.getTime());
    const day = current.getDay();
    const diff = current.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
    const monday = new Date(current.setDate(diff));
    
    const days: { dateStr: string; label: string; dateObj: Date }[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(monday.getTime() + i * 24 * 60 * 60 * 1000);
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const dateNum = d.getDate();
      const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(dateNum).padStart(2, '0')}`;
      days.push({
        dateStr,
        label: `${diasSemanaNombres[d.getDay()]} ${dateNum}`,
        dateObj: d
      });
    }
    return days;
  }, [calendarDate]);

  // Appointments grouped by date for fast lookup
  const citationsByDate = useMemo(() => {
    const g: Record<string, Cita[]> = {};
    allTardiaCitas.forEach(cita => {
      const d = cita.fecha; // YYYY-MM-DD
      if (!g[d]) g[d] = [];
      g[d].push(cita);
    });
    return g;
  }, [allTardiaCitas]);

  const monthAppointments = useMemo(() => {
    const year = calendarDate.getFullYear();
    const month = calendarDate.getMonth();
    return allTardiaCitas.filter(c => {
      try {
        const d = new Date(c.fecha + 'T00:00:00');
        return d.getFullYear() === year && d.getMonth() === month;
      } catch (err) {
        return false;
      }
    });
  }, [allTardiaCitas, calendarDate]);

  const weekAppointments = useMemo(() => {
    if (weekDays.length === 0) return [];
    const minDateStr = weekDays[0].dateStr;
    const maxDateStr = weekDays[6].dateStr;
    return allTardiaCitas.filter(c => {
      return c.fecha >= minDateStr && c.fecha <= maxDateStr;
    });
  }, [allTardiaCitas, weekDays]);

  const dayAppointments = useMemo(() => {
    return allTardiaCitas.filter(c => c.fecha === selectedCalendarDateStr);
  }, [allTardiaCitas, selectedCalendarDateStr]);

  const handlePrevDate = () => {
    const newD = new Date(calendarDate.getTime());
    if (calendarView === 'mes') {
      newD.setMonth(newD.getMonth() - 1);
    } else if (calendarView === 'semana') {
      newD.setDate(newD.getDate() - 7);
    } else {
      newD.setDate(newD.getDate() - 1);
      const y = newD.getFullYear();
      const m = newD.getMonth() + 1;
      const d = newD.getDate();
      setSelectedCalendarDateStr(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    setCalendarDate(newD);
  };

  const handleNextDate = () => {
    const newD = new Date(calendarDate.getTime());
    if (calendarView === 'mes') {
      newD.setMonth(newD.getMonth() + 1);
    } else if (calendarView === 'semana') {
      newD.setDate(newD.getDate() + 7);
    } else {
      newD.setDate(newD.getDate() + 1);
      const y = newD.getFullYear();
      const m = newD.getMonth() + 1;
      const d = newD.getDate();
      setSelectedCalendarDateStr(`${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
    }
    setCalendarDate(newD);
  };

  const handleGoToToday = () => {
    const today = new Date('2026-05-27T12:00:00');
    setCalendarDate(today);
    setSelectedCalendarDateStr('2026-05-27');
  };

  // Handle Generate Expedientes Followup code (adminpedad role)
  const handleGenerateExpediente = (e: React.FormEvent) => {
    e.preventDefault();
    if (!expName.trim() || !expIdentificacion.trim() || !expCorreo.trim() || !expTelefono.trim()) {
      alert('Por favor complete todos los datos obligatorios del ciudadano.');
      return;
    }

    const part1 = Math.floor(10 + Math.random() * 90);
    const part2 = Math.floor(100 + Math.random() * 900);
    const part3 = Math.floor(100 + Math.random() * 900);
    const uniqueNumber = `Nº${part1}-${part2}-${part3}`;
    
    let base = pasadoEdadLinkBase.trim();
    if (base.endsWith('/')) {
      base = base.slice(0, -1);
    }
    const directLink = `${base}/?tramite=ced_pasados_edad&seguimiento=${uniqueNumber}`;

    const textMessage = `Estimado(a) ${expName.trim()}, el Departamento de Verificación de Identidad de la Dirección Nacional de Cedulación del Tribunal Electoral, le informa que su solicitud ha sido procesada. Para continuar con el trámite de atención presencial agende su cita, ingresando al siguiente enlace:

${directLink}

Recuerde el día de la cita presentarse 15 minutos antes de la hora programada.

Su número de seguimiento es: ${uniqueNumber}`;

    const finalNotes = expCategory + (expNotes.trim() ? ` - ${expNotes.trim()}` : '');

    const newRecord = {
      id: uniqueNumber,
      number: uniqueNumber,
      citizenName: expName.trim(),
      identificacion: expIdentificacion.trim(),
      fechaNacimiento: expFechaNacimiento,
      correo: expCorreo.trim(),
      telefono: expTelefono.trim(),
      category: expCategory,
      notes: finalNotes,
      directLink,
      textMessage,
      fechaCreacion: new Date().toISOString()
    };

    const updated = [newRecord, ...historicalExp];
    setHistoricalExp(updated);
    try {
      localStorage.setItem('te_panama_historical_expedientes', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    setGeneratedExp({
      number: uniqueNumber,
      citizenName: expName.trim(),
      textMessage,
      link: directLink
    });

    // Reset inputs
    setExpName('');
    setExpIdentificacion('');
    setExpFechaNacimiento('');
    setExpCorreo('');
    setExpTelefono('');
    setExpNotes('');
    setExpCategory('Primera vez nacional, sin biometría');
  };

  // Safe tracking PDF downloader for single tracking records
  const handleDownloadTrackingPDF = (exp: any) => {
    if (!exp) return;
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageW = doc.internal.pageSize.getWidth();

    // Dark slate band header
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pageW, 40, 'F');

    // Accent line (Gold/Amber)
    doc.setFillColor(217, 119, 6);
    doc.rect(0, 40, pageW, 2.5, 'F');

    // Title / Header Text
    doc.setTextColor(255, 255, 255);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TRIBUNAL ELECTORAL DE PANAMÁ', 20, 16);
    doc.setFontSize(8);
    doc.setFont('Helvetica', 'normal');
    doc.text('DIRECCIÓN NACIONAL DE CEDULACIÓN / REGISTRO CIVIL', 20, 21);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('CONSTANCIA DE EXPEDIENTE Y SEGUIMIENTO ACTIVO', 20, 31);

    let currentY = 55;
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('CONSTANCIA OFICIAL PARA CITAS DE PASADOS DE EDAD', 20, currentY);
    
    currentY += 9;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(71, 85, 105);
    doc.text('Estimado(a) ciudadano(a), el Tribunal Electoral de Panamá hace constar que se ha registrado su expediente de filiación de pasados de edad presencial bajo las siguientes credenciales autorizadas:', 20, currentY, { maxWidth: pageW - 40 });

    currentY += 15;

    // Info card box
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.rect(20, currentY, pageW - 40, 52, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DATOS DECLARADOS DEL SOLICITANTE', 26, currentY + 8);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    doc.setFont('Helvetica', 'bold'); doc.text('Nombre Completo:', 26, currentY + 17);
    doc.setFont('Helvetica', 'normal'); doc.text(exp.citizenName || exp.nombreCompleto || 'N/A', 65, currentY + 17);

    doc.setFont('Helvetica', 'bold'); doc.text('Identificación / Cédula:', 26, currentY + 24);
    doc.setFont('Helvetica', 'normal'); doc.text(exp.identificacion, 65, currentY + 24);

    doc.setFont('Helvetica', 'bold'); doc.text('Código de Seguimiento:', 26, currentY + 31);
    doc.setFont('Helvetica', 'bold'); doc.setTextColor(29, 78, 216); doc.text(exp.number || exp.id, 65, currentY + 31);
    doc.setTextColor(71, 85, 105);

    doc.setFont('Helvetica', 'bold'); doc.text('Contacto Registrado:', 26, currentY + 38);
    doc.setFont('Helvetica', 'normal'); doc.text(`${exp.correo} / ${exp.telefono}`, 65, currentY + 38);

    doc.setFont('Helvetica', 'bold'); doc.text('Fecha Creación:', 26, currentY + 45);
    doc.setFont('Helvetica', 'normal'); doc.text(exp.fechaCreacion ? exp.fechaCreacion.substring(0, 10) : '2026-05-27', 65, currentY + 45);

    currentY += 62;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59);
    doc.text('PASO OBLIGATORIO DE AGENDAMIENTO', 20, currentY);

    currentY += 6;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text('Este documento le faculta para agendar de forma autónoma su cita en el sistema electoral. Ingrese al enlace provisto a continuación o escanee las credenciales correspondientes:', 20, currentY, { maxWidth: pageW - 40 });

    currentY += 12;
    doc.setFillColor(239, 246, 255);
    doc.setDrawColor(191, 219, 254);
    doc.rect(20, currentY, pageW - 40, 16, 'FD');

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(29, 78, 216);
    const linkToRender = exp.link || exp.directLink || '';
    doc.text(linkToRender, 24, currentY + 10, { maxWidth: pageW - 48 });

    currentY += 28;
    doc.setDrawColor(226, 232, 240);
    doc.line(20, currentY, pageW - 20, currentY);

    currentY += 10;
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('TRIBUNAL ELECTORAL DE PANAMÁ - CONTROL PASADOS DE EDAD', 20, currentY);
    doc.text('SISTEMA DE ASIGNACIÓN Y SEGUIMIENTO AUTOMATIZADO - VIGENCIA 2026', pageW - 135, currentY);

    doc.save(`Tracking_${exp.number || exp.id}.pdf`);
  };

  // Save schedules config (adminpedad UI trigger)
  const promptSaveTardiaConfig = (e: React.FormEvent) => {
    e.preventDefault();
    setShowConfirmTardiaSave(true);
  };

  const executeSaveTardiaConfig = async () => {
    setShowConfirmTardiaSave(false);
    
    localStorage.setItem('tardia_capacidad_total_dia', String(tardiaCapacidadTotal));
    localStorage.setItem('tardia_intervalo_minutos', String(tardiaIntervalo));
    localStorage.setItem('tardia_hora_inicio', tardiaHoraInicio);
    localStorage.setItem('tardia_hora_fin', tardiaHoraFin);
    
    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const res = await fetch('/api/tardia/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          capacidadTotalDia: tardiaCapacidadTotal,
          intervalo: tardiaIntervalo,
          horaInicio: tardiaHoraInicio,
          horaFin: tardiaHoraFin
        })
      });
      const data = await res.json();
      if (data && data.success) {
        alert('¡Éxito! Configuración de citas para pasados de edad (VID) actualizada y sincronizada en el servidor.');
      } else {
        alert('Configuración guardada localmente, pero falló la sincronización con el servidor.');
      }
    } catch (err) {
      console.error(err);
      alert('Error de conexión al guardar configuración.');
    }
  };

  // Supervisor state updates for citations
  const handleUpdateCitaStatus = (citaId: string, newStatus: 'confirmada' | 'cancelada' | 'realizada') => {
    const updated = citas.map(c => {
      if (c.id === citaId) {
        return { ...c, estado: newStatus };
      }
      return c;
    });
    onUpdateCitas(updated);
  };

  // Supervisor delete citation action
  const handleDeleteCita = (citaId: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar permanentemente esta cita de la base de datos? Esta acción no se puede deshacer.')) {
      const updated = citas.filter(c => c.id !== citaId);
      onUpdateCitas(updated);
    }
  };

  // Supervisor create new citation action
  const handleCreateCita = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCitaNombre.trim() || !newCitaIdent.trim() || !newCitaFecha || !newCitaHora) {
      alert('Por favor complete los campos obligatorios: Nombre, Identificación, Fecha y Hora.');
      return;
    }

    const shortYearMonthDay = newCitaFecha.replace(/-/g, '');
    const randId = Math.floor(1000 + Math.random() * 9000);
    
    // Special supervisor nomenclature: "PAS-SP-" prefix for the transaction/appointment code
    const transCode = `PAS-SP-${Math.floor(100000 + Math.random() * 900000)}`;
    
    // Special supervisor nomenclature: "NºSP-" prefix for the expediente tracking number
    const part1 = Math.floor(10 + Math.random() * 90);
    const part2 = Math.floor(100 + Math.random() * 900);
    const part3 = Math.floor(100 + Math.random() * 900);
    const trackNum = `NºSP-${part1}-${part2}-${part3}`;

    const newAppointment: Cita = {
      // Special supervisor nomenclature: "TE-SP-" prefix for the appointment/citation ID
      id: `TE-SP-${shortYearMonthDay}-${randId}`,
      datosPersonales: {
        tipoIdentificacion: newCitaTipoIdent,
        identificacion: newCitaIdent.trim(),
        fechaNacimiento: newCitaFechaNac,
        telefono: newCitaTelefono.trim(),
        correo: newCitaCorreo.trim(),
        nombreCompleto: newCitaNombre.trim(),
        numeroSeguimiento: trackNum
      },
      servicioCategoria: 'cedulacion',
      subServicioId: 'ced_pasados_edad',
      sucursalId: newCitaSucursal,
      fecha: newCitaFecha,
      hora: newCitaHora,
      codigoTransaccion: transCode,
      fechaCreacion: new Date().toISOString(),
      estado: 'confirmada',
      creadaPorSupervisor: true
    };

    // Automatically generate the companion authorized tracking expediente record
    let base = pasadoEdadLinkBase.trim();
    if (base.endsWith('/')) {
      base = base.slice(0, -1);
    }
    const directLink = `${base}/?tramite=ced_pasados_edad&seguimiento=${trackNum}`;

    const textMessage = `Estimado(a) ${newCitaNombre.trim()}, el Departamento de Verificación de Identidad de la Dirección Nacional de Cedulación del Tribunal Electoral, le informa que su solicitud ha sido procesada. Para continuar con el trámite de atención presencial agende su cita, ingresando al siguiente enlace:

${directLink}

Recuerde el día de la cita presentarse 15 minutos antes de la hora programada.

Su número de seguimiento es: ${trackNum}`;

    const newRecord = {
      id: trackNum,
      number: trackNum,
      citizenName: newCitaNombre.trim(),
      identificacion: newCitaIdent.trim(),
      fechaNacimiento: newCitaFechaNac,
      correo: newCitaCorreo.trim(),
      telefono: newCitaTelefono.trim(),
      notes: `Creado de forma automática por el Supervisor/SuperIT al programar cita directa para el ${newCitaFecha} ${newCitaHora}.`,
      directLink,
      textMessage,
      fechaCreacion: new Date().toISOString()
    };

    const updatedExp = [newRecord, ...historicalExp];
    setHistoricalExp(updatedExp);
    try {
      localStorage.setItem('te_panama_historical_expedientes', JSON.stringify(updatedExp));
    } catch (err) {
      console.error('Error saving generated expediente for supervisor appointment:', err);
    }

    onUpdateCitas([...citas, newAppointment]);
    alert(`¡Éxito! Cita para ${newCitaNombre.trim()} creada de forma exitosa para el ${newCitaFecha} a las ${newCitaHora}.\nSe ha generado automáticamente el Expediente de Pasados de Edad con el Número de Seguimiento: ${trackNum}`);
    
    // Reset form fields
    setNewCitaNombre('');
    setNewCitaIdent('');
    setNewCitaFechaNac('');
    setNewCitaCorreo('');
    setNewCitaTelefono('');
    setNewCitaSucursal('anc_main');
    setNewCitaFecha('2026-05-27');
    setNewCitaHora('08:00 AM');
    setShowCreateForm(false);
  };

  // Dynamic filter lists for citations in Supervisor view based on search/filters
  const filteredTardiaCitas = useMemo(() => {
    return allTardiaCitas.filter(c => {
      // Search text match
      const query = searchQuery.trim().toLowerCase();
      const citizen = c.datosPersonales;
      const matchSearch = !query || 
        (citizen?.nombreCompleto || '').toLowerCase().includes(query) ||
        (citizen?.identificacion || '').toLowerCase().includes(query) ||
        (citizen?.correo || '').toLowerCase().includes(query) ||
        (citizen?.telefono || '').toLowerCase().includes(query) ||
        c.codigoTransaccion.toLowerCase().includes(query);

      // Status match
      const matchStatus = statusFilter === 'todos' || 
        (statusFilter === 'realizada' && c.estado === 'realizada') ||
        (statusFilter === 'confirmada' && (c.estado === 'confirmada' || c.estado === 'asistire')) ||
        (statusFilter === 'cancelada' && (c.estado === 'cancelada' || c.estado === 'no_asistire'));

      return matchSearch && matchStatus;
    });
  }, [allTardiaCitas, searchQuery, statusFilter]);

  // Filtered list of authorized trackings/expedientes
  const filteredHistoricalExp = useMemo(() => {
    let result = historicalExp;

    if (searchExpCategory !== 'Todas') {
      result = result.filter(rec => {
        const cat = (rec.category || '').toLowerCase();
        const notes = (rec.notes || '').toLowerCase();
        const lowerCatSelected = searchExpCategory.toLowerCase();
        return cat === lowerCatSelected || notes.includes(lowerCatSelected);
      });
    }

    const query = searchExpQuery.trim().toLowerCase();
    if (!query) return result;

    return result.filter(rec => {
      const name = (rec.citizenName || '').toLowerCase();
      const number = (rec.number || '').toLowerCase();
      const id = (rec.id || '').toLowerCase();
      const identificacion = (rec.identificacion || '').toLowerCase();
      const correo = (rec.correo || '').toLowerCase();
      const notes = (rec.notes || '').toLowerCase();
      const category = (rec.category || '').toLowerCase();
      return (
        name.includes(query) ||
        number.includes(query) ||
        id.includes(query) ||
        identificacion.includes(query) ||
        correo.includes(query) ||
        notes.includes(query) ||
        category.includes(query)
      );
    });
  }, [historicalExp, searchExpQuery, searchExpCategory]);

  // Filter helper for exact period of appointments based on date range
  const getCitasByDateRange = (startStr: string, endStr: string) => {
    return allTardiaCitas.filter(c => {
      if (!c.fecha) return false;
      return c.fecha >= startStr && c.fecha <= endStr;
    });
  };

  // TRIGGER PDF GENERATION REPORT FOR PERIOD
  const handleDownloadReportPDF = (startStr: string, endStr: string) => {
    setExportLoading('pdf');

    setTimeout(() => {
      const records = getCitasByDateRange(startStr, endStr);
      const periodLabel = `Desde ${startStr} Hasta ${endStr}`;

      const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'letter'
      });

      const pageW = doc.internal.pageSize.getWidth();

      const drawHeader = (y: number) => {
        // Dark slate band header
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, y, pageW, 45, 'F');

        // Accent border line (Emerald green representing realized/completed successfully)
        doc.setFillColor(16, 185, 129); // emerald-500
        doc.rect(0, y + 45, pageW, 2.5, 'F');

        // Title & Header Text
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(14);
        doc.text('TRIBUNAL ELECTORAL DE PANAMÁ', 20, y + 16);
        doc.setFontSize(8.5);
        doc.setFont('Helvetica', 'normal');
        doc.setTextColor(203, 213, 225); // slate-300
        doc.text('DIRECCIÓN DE CEDULACIÓN — OFICIALÍA ESPECIALIZADA DE PASADOS DE EDAD (VID)', 20, y + 22);

        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(15);
        doc.setTextColor(255, 255, 255);
        doc.text('REPORTE OFICIAL DE CITAS REGISTRADAS (VID)', 20, y + 34);
      };

      const drawTableHead = (y: number) => {
        doc.setFillColor(30, 41, 59); // slate-800
        doc.rect(20, y, pageW - 40, 7.5, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFont('Helvetica', 'bold');
        doc.setFontSize(7.5);
        
        doc.text('FECHA/HORA', 22, y + 5);
        doc.text('CIUDADANO SOLICITANTE', 48, y + 5);
        doc.text('CÉDULA / ID', 105, y + 5);
        doc.text('SUCURSAL', 135, y + 5);
        doc.text('ESTADO', pageW - 38, y + 5);
      };

      // Draw initial page header
      drawHeader(0);

      let currentY = 58;

      // Meta text
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(`INTERVALO DE FECHAS: ${periodLabel.toUpperCase()}`, 20, currentY);
      
      currentY += 6;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(71, 85, 105);
      doc.text(`Constancia generada para el control de citas operativas registradas en el sistema para ciudadanos rezagados (pasados de edad).`, 20, currentY, { maxWidth: pageW - 40 });

      currentY += 12;

      // Overview Score Card with Nomenclature Explanation
      doc.setFillColor(240, 253, 250); // emerald-50
      doc.setDrawColor(110, 231, 183); // emerald-300
      doc.setLineWidth(0.3);
      doc.rect(20, currentY, pageW - 40, 28, 'FD'); // Expanded from 16 to 28 height

      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(`CANTIDAD TOTAL DE CITAS ENCONTRADAS (VID): `, 26, currentY + 10);
      doc.setFontSize(11);
      doc.setTextColor(5, 150, 105); // emerald-600
      doc.text(`${records.length} Citas`, pageW - 50, currentY + 10);

      // Nomenclature breakdown in VID Report
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('EXPLICACIÓN DE NOMENCLATURAS (ESTADOS DE CITAS):', 26, currentY + 17);
      
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(71, 85, 105);
      doc.text('• ATENDIDO: Cita presencial completada con éxito y biometría totalmente validada.', 26, currentY + 21);
      doc.text('• CONFIRMADA: Cupo reservado y cita oficial activa planificada.  |  • CANCELADA: Cita anulada.', 26, currentY + 25);

      currentY += 38; // Adjusted to prevent overlaps and fit the expanded block properly

      // Draw initial table header
      drawTableHead(currentY);
      currentY += 7.5;

      // Draw table rows
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(51, 65, 85);

      if (records.length === 0) {
        doc.setDrawColor(226, 232, 240);
        doc.rect(20, currentY, pageW - 40, 12, 'D');
        doc.text('No se encontraron registros de citas dentro de este lapso temporal.', 25, currentY + 8);
        currentY += 15;
      } else {
        records.forEach((rec, idx) => {
          // If we are reaching the bottom of the page, add page and reset headers
          if (currentY > 245) {
            doc.addPage();
            drawHeader(0);
            currentY = 55;
            drawTableHead(currentY);
            currentY += 7.5;
          }

          doc.setDrawColor(241, 245, 249);
          doc.rect(20, currentY, pageW - 40, 9, 'D');
          
          doc.setFont('Helvetica', 'bold');
          doc.setTextColor(15, 23, 42);
          doc.text(`${rec.fecha} ${rec.hora}`, 22, currentY + 6);
          doc.setFont('Helvetica', 'normal');
          doc.setTextColor(51, 65, 85);
          
          const fullName = rec.datosPersonales.nombreCompleto || 'Desconocido';
          const truncatedName = fullName.length > 25 ? fullName.substring(0, 22) + '...' : fullName;
          doc.text(truncatedName, 48, currentY + 6);
          doc.text(rec.datosPersonales.identificacion, 110, currentY + 6);
          
          const sName = rec.sucursalId ? rec.sucursalId.replace(/_/g, ' ').toUpperCase() : 'CENTRAL';
          const sTruncated = sName.length > 15 ? sName.substring(0, 13) + '.' : sName;
          doc.text(sTruncated, 137, currentY + 6);
          
          doc.setFont('Helvetica', 'bold');
          const est = (rec.estado || 'CONFIRMADA').toUpperCase();
          if (est === 'REALIZADA' || est === 'COMPLETADA' || est === 'ATENDIDO') {
            doc.setTextColor(16, 124, 65);
            doc.text('ATENDIDO', pageW - 38, currentY + 6);
          } else if (est === 'CANCELADA' || est === 'NO_ASISTIRE' || est === 'CANCELADO') {
            doc.setTextColor(185, 28, 28);
            doc.text('CANCELADA', pageW - 38, currentY + 6);
          } else {
            doc.setTextColor(29, 78, 216); // Blue
            doc.text('CONFIRMADA', pageW - 38, currentY + 6);
          }
          doc.setTextColor(51, 65, 85);
          
          currentY += 9;
        });
      }

      // No signature or metadata footer needed per user request
      doc.save(`Reporte_Citas_VID_${startStr}_a_${endStr}.pdf`);
      setExportLoading(null);
    }, 600);
  };

  // TRIGGER CSV GENERATION REPORT FOR PERIOD
  const handleDownloadReportCSV = (startStr: string, endStr: string) => {
    const records = getCitasByDateRange(startStr, endStr);
    const headers = ['ID Cita', 'Fecha', 'Hora', 'Nombre Ciudadano', 'Identificacion', 'Correo', 'Telefono', 'Sucursal', 'Estado'];
    
    const rows = records.map(rec => [
      rec.id,
      rec.fecha,
      rec.hora,
      rec.datosPersonales.nombreCompleto || '',
      rec.datosPersonales.identificacion || '',
      rec.datosPersonales.correo || '',
      rec.datosPersonales.telefono || '',
      rec.sucursalId || '',
      rec.estado
    ]);

    let csvContent = "data:text/csv;charset=utf-8,\uFEFF";
    csvContent += headers.join(",") + "\n";
    rows.forEach(row => {
      const escapedRow = row.map(val => `"${val.replace(/"/g, '""')}"`);
      csvContent += escapedRow.join(",") + "\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Reporte_Citas_VID_${startStr}_a_${endStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      
      {/* SIMULATOR SWITCH / ROLE BAR */}
      <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-blue-550/15 rounded-lg border border-blue-500/30 text-blue-400">
            <Shield className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-white text-sm font-black uppercase tracking-wider flex items-center gap-2">
              <span>Módulo Verificación de Identidad (VID)</span>
              <span className="bg-blue-600/20 text-blue-300 border border-blue-700 text-[9px] px-2 py-0.5 rounded-full font-extrabold uppercase">
                Pasados De Edad
              </span>
            </h3>
            <p className="text-[11.5px] text-slate-400 font-medium">
              Gestor institucional de asignaciones de seguimientos y constataciones de agendas de trámites.
            </p>
          </div>
        </div>

        {/* Dynamic simulator trigger for testing and admin users */}
        {(currentRole === 'super' || currentRole === 'pasado_edad') ? (
          <div className="flex items-center gap-2 bg-slate-950 p-1.5 rounded-lg border border-slate-800 self-stretch sm:self-auto justify-between shadow">
            <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider px-2 block">
              Persona Activa:
            </span>
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setActivePersona('superit')}
                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 ${
                  activePersona === 'superit'
                    ? 'bg-emerald-600 text-white font-extrabold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>SuperIT (Supervisor)</span>
              </button>
              <button
                type="button"
                onClick={() => setActivePersona('adminpedad')}
                className={`text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded transition cursor-pointer flex items-center gap-1.5 ${
                  activePersona === 'adminpedad'
                    ? 'bg-blue-600 text-white font-extrabold shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>adminpedad (Usuario)</span>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-blue-950/40 px-3.5 py-2 border border-blue-900/50 rounded-lg flex items-center gap-2 text-xs text-blue-400 self-stretch sm:self-auto font-medium select-none shadow">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
            </span>
            <span>
              Estación Activa: 
              <strong className="font-extrabold text-blue-300 uppercase tracking-wide ml-1">
                {currentRole === 'pasado_edad_supervisor' ? '👑 Supervisor General' : currentRole === 'pasado_edad_admin' ? '📋 Operador Seguimiento IT' : '🛡️ Administrador IT'}
              </strong>
            </span>
          </div>
        )}
      </div>

      {/* VISTA 1: SUPERVISOR (SuperIT) */}
      {activePersona === 'superit' && (
        <div className="space-y-6 animate-fade-in text-slate-100">
          
          {/* STATS COUNT */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            
            <div className="bg-slate-950/80 p-5 rounded-lg border border-slate-850 shadow-lg flex flex-col justify-between">
              <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-450 block">Total de citas</span>
              <div className="flex items-end justify-between mt-2.5">
                <span className="text-2xl font-black font-mono tracking-tight text-white">{stats.total}</span>
                <span className="text-[9px] text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-900/40">Citas</span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-5 rounded-lg border border-slate-850 shadow-lg flex flex-col justify-between">
              <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-450 block">Citas Realizadas</span>
              <div className="flex items-end justify-between mt-2.5">
                <span className="text-2xl font-black font-mono tracking-tight text-emerald-400">{stats.realizadas}</span>
                <span className="text-[9px] text-emerald-400 bg-emerald-950/50 px-1.5 py-0.5 rounded border border-emerald-900/40 font-bold">Completadas</span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-5 rounded-lg border border-slate-850 shadow-lg flex flex-col justify-between">
              <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-450 block">Citas Confirmadas</span>
              <div className="flex items-end justify-between mt-2.5">
                <span className="text-2xl font-black font-mono tracking-tight text-blue-450">{stats.confirmadas}</span>
                <span className="text-[9px] text-blue-400 bg-blue-950/50 px-1.5 py-0.5 rounded border border-blue-900/40 font-bold">Pendientes</span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-5 rounded-lg border border-slate-850 shadow-lg flex flex-col justify-between">
              <span className="text-[9.5px] font-black uppercase tracking-widest text-slate-450 block">Citas Canceladas</span>
              <div className="flex items-end justify-between mt-2.5">
                <span className="text-2xl font-black font-mono tracking-tight text-red-400">{stats.canceladas}</span>
                <span className="text-[9px] text-red-500 bg-red-950/50 px-1.5 py-0.5 rounded border border-red-900/40 font-bold">Canceladas</span>
              </div>
            </div>

            <div className="bg-slate-950/80 p-5 rounded-lg border border-amber-950/40 shadow-lg flex flex-col justify-between col-span-2 lg:col-span-1 ring-1 ring-amber-500/10">
              <span className="text-[9.5px] font-black uppercase tracking-widest text-amber-500 block">★ Citas Especiales</span>
              <div className="flex items-end justify-between mt-2.5">
                <span className="text-2xl font-black font-mono tracking-tight text-amber-400">{stats.especiales}</span>
                <span className="text-[9px] text-amber-500 bg-amber-950/50 px-1.5 py-0.5 rounded border border-amber-900/40 font-bold">Manuales (Súper)</span>
              </div>
            </div>

          </div>

          {/* MODE SWITCHER & CREATION TOGGLE */}
          <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
            <div className="flex bg-slate-950 p-1.5 rounded-xl border border-slate-850 max-w-sm w-full sm:w-auto shadow-xl">
              <button
                type="button"
                onClick={() => setSuperViewMode('table')}
                className={`flex-1 text-center py-2 px-5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  superViewMode === 'table'
                    ? 'bg-blue-600 text-white shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                Tabla de Citas
              </button>
              <button
                type="button"
                onClick={() => setSuperViewMode('calendar')}
                className={`flex-1 text-center py-2 px-5 rounded-lg text-xs font-extrabold uppercase tracking-wider transition-all duration-150 cursor-pointer ${
                  superViewMode === 'calendar'
                    ? 'bg-blue-600 text-white shadow-md font-black'
                    : 'text-slate-400 hover:text-white hover:bg-slate-900'
                }`}
              >
                Calendario Planeador
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setNewCitaFecha(selectedCalendarDateStr);
                setShowCreateForm(!showCreateForm);
              }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs uppercase tracking-wider px-5 py-3 rounded-xl shadow-lg border border-emerald-500/30 flex items-center gap-2 transition duration-150 cursor-pointer w-full sm:w-auto justify-center"
            >
              <Plus className="w-4.5 h-4.5" />
              <span>{showCreateForm ? 'Cerrar Formulario' : 'Crear Nueva Cita Pasados de Edad'}</span>
            </button>
          </div>

          {/* CREATION FORM CARD */}
          {showCreateForm && (
            <div className="bg-slate-950 p-6 rounded-xl border border-slate-850 shadow-2xl space-y-4 animate-fade-in">
              <div className="border-b border-slate-900 pb-3">
                <h4 className="text-xs font-black uppercase text-indigo-400 tracking-wider flex items-center gap-2">
                  <Plus className="w-4.5 h-4.5 text-indigo-500" />
                  Formulario de Reserva Manual por el Supervisor
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Ingrese los datos personales del ciudadano que ha superado el límite de edad para ingresarle una cita presencial de forma inmediata.
                </p>
              </div>

              <form onSubmit={handleCreateCita} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                
                {/* Nombre de ciudadano */}
                <div className="space-y-1.5 text-left">
                  <label className="text-slate-400 font-bold block">Nombre Completo <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Roberto Alexander Herrera"
                    value={newCitaNombre}
                    onChange={(e) => setNewCitaNombre(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 placeholder-slate-600"
                  />
                </div>

                {/* Tipo de identificación */}
                <div className="space-y-1.5 text-left">
                  <label className="text-slate-400 font-bold block">Tipo de Documento</label>
                  <select
                    value={newCitaTipoIdent}
                    onChange={(e) => setNewCitaTipoIdent(e.target.value as any)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 uppercase font-mono"
                  >
                    <option value="Cedula">Cédula de Identidad</option>
                    <option value="CedulaJuvenil">Cédula Juvenil</option>
                    <option value="Extranjero">Carné de Extranjero</option>
                    <option value="Pasaporte">Pasaporte Oficial</option>
                  </select>
                </div>

                {/* Identificación / Cédula */}
                <div className="space-y-1.5 text-left">
                  <label className="text-slate-400 font-bold block">Número de Identidad / Cédula <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. 8-902-124 o PE-12-345"
                    value={newCitaIdent}
                    onChange={(e) => setNewCitaIdent(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono placeholder-slate-600"
                  />
                </div>

                {/* Fecha de nacimiento */}
                <div className="space-y-1.5 text-left">
                  <label className="text-slate-400 font-bold block">Fecha de Nacimiento</label>
                  <input
                    type="date"
                    value={newCitaFechaNac}
                    onChange={(e) => setNewCitaFechaNac(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Correo */}
                <div className="space-y-1.5 text-left">
                  <label className="text-slate-400 font-bold block">Correo Electrónico</label>
                  <input
                    type="email"
                    placeholder="ejemplo@dominio.com"
                    value={newCitaCorreo}
                    onChange={(e) => setNewCitaCorreo(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono placeholder-slate-600"
                  />
                </div>

                {/* Teléfono */}
                <div className="space-y-1.5 text-left">
                  <label className="text-slate-400 font-bold block">Teléfono / Celular</label>
                  <input
                    type="tel"
                    placeholder="Ej. 6555-1234"
                    value={newCitaTelefono}
                    onChange={(e) => setNewCitaTelefono(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono placeholder-slate-600"
                  />
                </div>

                {/* Sucursal selection */}
                <div className="space-y-1.5 text-left">
                  <label className="text-slate-400 font-bold block">Sucursal Regional del Tribunal Electoral</label>
                  <select
                    value={newCitaSucursal}
                    onChange={(e) => setNewCitaSucursal(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 font-semibold"
                  >
                    {SUCURSALES_TE.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.provincia} - {s.nombre}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Fecha Cita */}
                <div className="space-y-1.5 text-left">
                  <label className="text-slate-400 font-bold block">Fecha para la Atención <span className="text-red-500">*</span></label>
                  <input
                    type="date"
                    required
                    value={newCitaFecha}
                    onChange={(e) => setNewCitaFecha(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  />
                </div>

                {/* Hora Cita */}
                <div className="space-y-1.5 text-left">
                  <label className="text-slate-400 font-bold block">Horario Asignado <span className="text-red-500">*</span></label>
                  <select
                    value={newCitaHora}
                    onChange={(e) => setNewCitaHora(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-800 rounded p-2.5 text-white focus:outline-none focus:border-indigo-500 font-mono"
                  >
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
                    <option value="02:00 PM">02:00 PM</option>
                    <option value="02:30 PM">02:30 PM</option>
                    <option value="03:00 PM">03:00 PM</option>
                    <option value="03:30 PM">03:30 PM</option>
                  </select>
                </div>

                <div className="md:col-span-2 lg:col-span-3 flex justify-end gap-3 pt-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="bg-slate-900 hover:bg-slate-800 text-slate-350 font-semibold px-5 py-2.5 rounded border border-slate-800 cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold uppercase tracking-wide px-6 py-2.5 rounded shadow-md border border-emerald-500/20 cursor-pointer flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirmar Crear Cita</span>
                  </button>
                </div>

              </form>
            </div>
          )}

          {superViewMode === 'table' ? (
            <div className="flex flex-col gap-6">
            
            {/* LEFT: DOWNLOAD REPORTS FOR COMPLETED CITAS BY PERIOD */}
            <div className="w-full bg-slate-950 p-5 rounded-xl border border-slate-850 shadow-xl space-y-4 order-2">
              <div className="border-b border-slate-900 pb-3">
                <h4 className="text-xs font-black uppercase text-slate-350 tracking-wider flex items-center gap-2">
                  <Download className="w-4 h-4 text-emerald-500" />
                  Consolidado de Descargas (Citas Realizadas)
                </h4>
                <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                  Consulte y descargue instantáneamente las citas de pasados de edad realizadas y confirmadas. Los reportes están disponibles en formato PDF oficial firmado o CSV estructurado.
                </p>
              </div>

              {/* REPORT CARDS */}
              <div className="space-y-3.5 pt-1">
                
                <div className="bg-slate-900/60 border border-slate-800 p-4 rounded-xl space-y-4">
                  {/* Date Input Range Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-450 block font-mono">
                        Intervalo de Fecha Desde
                      </label>
                      <input
                        type="date"
                        value={reportStartDate}
                        onChange={(e) => setReportStartDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                    
                    <div className="space-y-1">
                      <label className="text-[10.5px] font-black uppercase tracking-wider text-slate-450 block font-mono">
                        Intervalo de Fecha Hasta
                      </label>
                      <input
                        type="date"
                        value={reportEndDate}
                        onChange={(e) => setReportEndDate(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500 transition"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-850">
                    <div className="text-left space-y-0.5">
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block font-mono">
                        Citas Encontradas (VID)
                      </span>
                      <p className="text-xl font-mono font-black text-white">
                        {getCitasByDateRange(reportStartDate, reportEndDate).length} <span className="text-xs font-sans font-medium text-slate-400">citas registradas</span>
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2 w-full sm:w-auto shrink-0 justify-end">
                      <button
                        type="button"
                        onClick={() => handleDownloadReportPDF(reportStartDate, reportEndDate)}
                        disabled={exportLoading !== null}
                        className="bg-emerald-950 hover:bg-emerald-900 border border-emerald-900 px-4 py-2 text-[10px] font-extrabold uppercase text-emerald-400 rounded flex items-center justify-center gap-1.5 cursor-pointer transition"
                      >
                        {exportLoading === 'pdf' ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <FileText className="w-3.5 h-3.5" />
                        )}
                        <span>PDF</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDownloadReportCSV(reportStartDate, reportEndDate)}
                        className="bg-slate-950 hover:bg-slate-800 border border-slate-800 px-4 py-2 text-[10px] font-extrabold uppercase text-slate-300 rounded flex items-center justify-center gap-1.5 cursor-pointer transition"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-blue-450" />
                        <span>CSV</span>
                      </button>
                    </div>
                  </div>
                </div>

              </div>

            </div>

            {/* RIGHT: COMPREHENSIVE VIEW & SUPERVISORY LIST SEARCH */}
            <div className="w-full bg-slate-950 rounded-xl border border-slate-850 overflow-hidden shadow-xl space-y-4 p-5 order-1">
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                <div className="space-y-1">
                  <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider flex items-center gap-1.5">
                    <Calendar className="w-4.5 h-4.5 text-blue-500" />
                    Listado de Citas (Pasados de Edad)
                  </h4>
                  <span className="text-[10.5px] text-slate-500 block leading-none font-medium">
                    Gestione estados presenciales de solicitantes Pasados de Edad.
                  </span>
                </div>

                {/* Filters */}
                <div className="flex gap-2 items-center">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="bg-slate-900 border border-slate-750 text-slate-300 text-[11px] p-1.5 px-3 rounded focus:outline-none focus:ring-1 focus:ring-blue-600 font-semibold uppercase cursor-pointer"
                  >
                    <option value="todos">Todos los Estados</option>
                    <option value="confirmada">Confirmada</option>
                    <option value="realizada">Realizada</option>
                    <option value="cancelada">Cancelada</option>
                  </select>
                </div>
              </div>

              {/* Live Search Input */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
                <input
                  type="text"
                  placeholder="Buscar por Nombre, ID, Cédula, Correo o Código Transacción..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900/60 border border-slate-800 rounded-lg p-2.5 pl-10 text-xs text-white focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-blue-600 font-medium placeholder-slate-600"
                />
              </div>

              {/* RESULT TABLE CITAS */}
              {filteredTardiaCitas.length === 0 ? (
                <div className="bg-slate-900/30 border border-dashed border-slate-800 p-16 rounded-lg text-center text-[11px] text-slate-500">
                  <Calendar className="w-10 h-10 text-slate-800 mx-auto mb-2" />
                  <span>No se encontraron citas de pasados de edad con los criterios seleccionados.</span>
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-900 rounded-lg">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-900/60 text-[9px] font-black uppercase tracking-widest text-slate-450 border-b border-slate-800">
                        <th className="p-3">Cita / Fecha</th>
                        <th className="p-3">Solicitante</th>
                        <th className="p-3">Datos Contacto</th>
                        <th className="p-3 text-center">Estado actual</th>
                        <th className="p-3 text-right">Acciones Supervisor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-900 text-xs text-slate-350">
                      {filteredTardiaCitas.map(cita => {
                        const citizen = cita.datosPersonales;
                        const isRealizada = cita.estado === 'realizada';
                        const isCancelada = cita.estado === 'cancelada' || cita.estado === 'no_asistire';
                        const isConfirmada = !isRealizada && !isCancelada;

                        return (
                          <tr key={cita.id} className="hover:bg-slate-900/20 transition">
                            <td className="p-3 font-mono space-y-0.5">
                              <div className="text-[10px] text-slate-500">{cita.id}</div>
                              <div className="text-white font-bold">{cita.fecha}</div>
                              <div className="text-[10.5px] text-slate-400 font-extrabold">{cita.hora}</div>
                            </td>
                            <td className="p-3 font-semibold space-y-0.5">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-white text-xs">{citizen.nombreCompleto || 'N/A'}</span>
                                {cita.creadaPorSupervisor && (
                                  <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[8px] font-black uppercase px-1.5 py-0.5 rounded tracking-wider shadow-inner font-mono">
                                    ★ Cita Especial
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-450 text-[10.5px] font-mono">{citizen.identificacion}</div>
                            </td>
                            <td className="p-3 font-mono text-[10px] space-y-0.5">
                              <div className="text-slate-400">{citizen.correo}</div>
                              <div className="text-slate-500">{citizen.telefono}</div>
                            </td>
                            <td className="p-3 text-center">
                              {isRealizada ? (
                                <span className="bg-emerald-950/80 text-emerald-400 border border-emerald-900/50 text-[9px] font-black uppercase px-2.5 py-1 rounded">
                                  ✓ Realizada
                                </span>
                              ) : isCancelada ? (
                                <span className="bg-red-950/80 text-red-400 border border-red-900/50 text-[9px] font-black uppercase px-2.5 py-1 rounded">
                                  ✗ Cancelada
                                </span>
                              ) : (
                                <span className="bg-blue-950/80 text-blue-400 border border-blue-900/50 text-[9px] font-black uppercase px-2.5 py-1 rounded">
                                  Confirmada
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                {!isRealizada && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCitaStatus(cita.id, 'realizada')}
                                    className="bg-emerald-600/10 hover:bg-emerald-600 text-emerald-500 hover:text-white px-2 py-1 rounded text-[10px] font-bold border border-emerald-500/20 hover:border-transparent transition flex items-center gap-0.5 cursor-pointer"
                                    title="Marcar Cita como Realizada"
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>Completar</span>
                                  </button>
                                )}
                                {!isCancelada && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (window.confirm(`¿Está seguro de cancelar la cita del ciudadano ${citizen.nombreCompleto}?`)) {
                                        handleUpdateCitaStatus(cita.id, 'cancelada');
                                      }
                                    }}
                                    className="bg-red-650/10 hover:bg-red-650 text-red-505 hover:text-white px-2 py-1 rounded text-[10px] font-bold border border-red-550/20 hover:border-transparent transition flex items-center gap-0.5 cursor-pointer"
                                    title="Cancelar Cita"
                                  >
                                    <X className="w-3 h-3" />
                                    <span>Cancelar</span>
                                  </button>
                                )}
                                {(isRealizada || isCancelada) && (
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateCitaStatus(cita.id, 'confirmada')}
                                    className="bg-slate-900 hover:bg-slate-800 text-slate-300 px-2 py-1 rounded text-[10px] font-bold border border-slate-750 transition flex items-center gap-0.5 cursor-pointer"
                                    title="Reestablecer a Confirmada (Reservada)"
                                  >
                                    <span>Reestablecer</span>
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => handleDeleteCita(cita.id)}
                                  className="bg-red-950/40 hover:bg-red-600 text-red-400 hover:text-white px-2 py-1 rounded text-[10px] font-bold border border-red-900/30 hover:border-transparent transition flex items-center gap-0.5 cursor-pointer"
                                  title="Eliminar Cita de la Base"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Eliminar</span>
                                </button>
                              </div>
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
        ) : (
          <div className="space-y-6 animate-fade-in pb-10">
          
          {/* CALENDAR CONTROLS HEADER */}
          <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl">
            
            {/* Switch view level (Month, Week, Day) */}
            <div className="flex bg-slate-900 p-1 rounded-lg border border-slate-800 shadow">
              <button
                type="button"
                onClick={() => setCalendarView('mes')}
                className={`text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded transition cursor-pointer ${
                  calendarView === 'mes'
                    ? 'bg-blue-600 text-white shadow font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ver por Mes
              </button>
              <button
                type="button"
                onClick={() => setCalendarView('semana')}
                className={`text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded transition cursor-pointer ${
                  calendarView === 'semana'
                    ? 'bg-blue-600 text-white shadow font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ver por Semana
              </button>
              <button
                type="button"
                onClick={() => setCalendarView('dia')}
                className={`text-[11px] font-black uppercase tracking-wider px-3.5 py-1.5 rounded transition cursor-pointer ${
                  calendarView === 'dia'
                    ? 'bg-blue-600 text-white shadow font-extrabold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Ver por Día
              </button>
            </div>

            {/* Navigation: Prev, Month/Period Title, Next, Hoy */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={handlePrevDate}
                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="text-sm font-black uppercase tracking-wide text-white min-w-[200px] text-center font-mono">
                {calendarView === 'mes' && `${mesesNombres[calendarDate.getMonth()]} ${calendarDate.getFullYear()}`}
                {calendarView === 'semana' && `${weekDays[0].dateStr} al ${weekDays[6].dateStr}`}
                {calendarView === 'dia' && `Día: ${selectedCalendarDateStr}`}
              </span>

              <button
                type="button"
                onClick={handleNextDate}
                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 transition cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>

              <button
                type="button"
                onClick={handleGoToToday}
                className="text-[10px] font-black uppercase tracking-wider px-3 py-1.5 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 transition cursor-pointer"
              >
                Hoy
              </button>
            </div>

            <div className="text-[11.5px] text-blue-400 font-bold bg-slate-900 px-3 py-1.5 rounded border border-slate-850/80 font-mono flex items-center gap-1.5 shadow-inner">
              <CalendarDays className="w-4 h-4 text-blue-500" />
              {calendarView === 'mes' && `${monthAppointments.length} citas en mes`}
              {calendarView === 'semana' && `${weekAppointments.length} citas en semana`}
              {calendarView === 'dia' && `${dayAppointments.length} citas este día`}
            </div>
          </div>

          {/* CALENDAR BODY CONTAINERS */}
          {calendarView === 'mes' && (
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 shadow-xl space-y-4">
              <div className="border-b border-slate-900/60 pb-2.5">
                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">Distribución Mensual Informativa</h4>
                <span className="text-[10px] text-slate-500 block">Pulse un día para inspeccionar el listado detallado de ciudadanos planificados.</span>
              </div>

              {/* Grid header */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {diasSemanaNombres.map(dName => (
                  <div key={dName} className="text-[10px] font-black uppercase tracking-widest text-slate-500 py-1 font-mono">
                    {dName}
                  </div>
                ))}
              </div>

              {/* Grid days */}
              <div className="grid grid-cols-7 gap-2">
                {monthDays.map(item => {
                  const dayCits = citationsByDate[item.dateStr] || [];
                  const isSelected = selectedCalendarDateStr === item.dateStr;
                  const isToday = item.dateStr === '2026-05-27';
                  
                  const confirmadas = dayCits.filter(c => c.estado === 'confirmada' || c.estado === 'asistire').length;
                  const realizadas = dayCits.filter(c => c.estado === 'realizada').length;
                  const canceladas = dayCits.filter(c => c.estado === 'cancelada' || c.estado === 'no_asistire').length;

                  return (
                    <div
                      key={item.key}
                      onClick={() => {
                        setSelectedCalendarDateStr(item.dateStr);
                      }}
                      className={`min-h-[90px] p-2.5 rounded-lg border flex flex-col justify-between transition relative cursor-pointer ${
                        item.isCurrentMonth ? 'bg-slate-900/50' : 'bg-slate-950/20 opacity-35 border-transparent pointer-events-none'
                      } ${
                        isSelected 
                          ? 'border-blue-500 ring-1 ring-blue-500 bg-slate-900/85 shadow-lg' 
                          : isToday
                            ? 'border-amber-600 bg-slate-900'
                            : 'border-slate-850 hover:bg-slate-900 hover:border-slate-750'
                      }`}
                    >
                      {/* Day number & Today label */}
                      <div className="flex items-center justify-between">
                        <span className={`text-[12px] font-black font-mono ${
                          isSelected ? 'text-blue-400' : isToday ? 'text-amber-500' : 'text-slate-355'
                        }`}>
                          {item.dayNum}
                        </span>
                        {isToday && (
                          <span className="text-[7.5px] bg-amber-500/10 text-amber-500 border border-amber-500/25 font-black uppercase px-1 rounded">
                            Hoy
                          </span>
                        )}
                      </div>

                      {/* Day appointments summary count */}
                      <div className="space-y-1">
                        {dayCits.length > 0 ? (
                          <div className="flex flex-col gap-0.5">
                            {confirmadas > 0 && (
                              <span className="text-[8px] font-mono leading-none bg-blue-950/90 text-blue-400 font-extrabold px-1.5 py-0.5 rounded border border-blue-900/30 truncate">
                                ★ {confirmadas} Pend.
                              </span>
                            )}
                            {realizadas > 0 && (
                              <span className="text-[8px] font-mono leading-none bg-emerald-950/90 text-emerald-400 font-extrabold px-1.5 py-0.5 rounded border border-emerald-900/30 truncate">
                                ✓ {realizadas} Real.
                              </span>
                            )}
                            {canceladas > 0 && (
                              <span className="text-[8px] font-mono leading-none bg-red-955/85 text-red-400 font-extrabold px-1.5 py-0.5 rounded border border-red-900/25 truncate">
                                ✗ {canceladas} Canc.
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-[8px] text-slate-600 font-mono italic block text-center py-1">
                            Sin citas
                          </span>
                        )}
                      </div>

                      {/* Indicator dots */}
                      {dayCits.length > 0 && (
                        <div className="absolute top-1.5 right-1.5 flex gap-0.5">
                          <span className={`h-1 w-1 rounded-full ${confirmadas > 0 ? 'bg-blue-400' : 'bg-transparent'}`}></span>
                          <span className={`h-1 w-1 rounded-full ${realizadas > 0 ? 'bg-emerald-400' : 'bg-transparent'}`}></span>
                          <span className={`h-1 w-1 rounded-full ${canceladas > 0 ? 'bg-red-400' : 'bg-transparent'}`}></span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {calendarView === 'semana' && (
            <div className="bg-slate-950 p-5 rounded-xl border border-slate-850 shadow-xl space-y-4">
              <div className="border-b border-slate-900/60 pb-2.5">
                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">Cronograma de Citas de la Semana</h4>
                <span className="text-[10px] text-slate-500 block">Distribución de atenciones por días hábiles de la semana activa.</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                {weekDays.map(item => {
                  const dayCits = citationsByDate[item.dateStr] || [];
                  const isSelected = selectedCalendarDateStr === item.dateStr;
                  const isToday = item.dateStr === '2026-05-27';
                  const confirmadas = dayCits.filter(c => c.estado === 'confirmada' || c.estado === 'asistire').length;
                  const realizadas = dayCits.filter(c => c.estado === 'realizada').length;
                  const canceladas = dayCits.filter(c => c.estado === 'cancelada' || c.estado === 'no_asistire').length;

                  return (
                    <div
                      key={item.dateStr}
                      onClick={() => setSelectedCalendarDateStr(item.dateStr)}
                      className={`p-4 rounded-xl border transition cursor-pointer text-left space-y-3 flex flex-col justify-between ${
                        isSelected 
                          ? 'border-blue-500 bg-slate-900 ring-1 ring-blue-500 shadow-lg' 
                          : isToday
                            ? 'border-amber-600 bg-slate-900/60'
                            : 'border-slate-850 hover:bg-slate-900'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                            {item.label.split(' ')[0]}
                          </span>
                          {isToday && (
                            <span className="text-[7px] bg-amber-500/15 text-amber-500 border border-amber-500/25 font-black uppercase px-1 rounded">
                              Hoy
                            </span>
                          )}
                        </div>
                        <h5 className="text-lg font-black font-mono text-white mt-1">
                          {item.label.split(' ')[1]}
                        </h5>
                      </div>

                      <div className="space-y-1.5 bg-slate-950/65 p-2 rounded-lg border border-slate-900">
                        <div className="flex justify-between items-center text-[10px] text-slate-400">
                          <span>Total:</span>
                          <strong className="text-white font-mono font-black">{dayCits.length}</strong>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-500">
                          <span>Confirmadas:</span>
                          <strong className="text-blue-400 font-mono">{confirmadas}</strong>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-500">
                          <span>Completadas:</span>
                          <strong className="text-emerald-400 font-mono">{realizadas}</strong>
                        </div>
                        <div className="flex justify-between items-center text-[9px] text-slate-500">
                          <span>Canceladas:</span>
                          <strong className="text-red-400 font-mono">{canceladas}</strong>
                        </div>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setSelectedCalendarDateStr(item.dateStr)}
                        className="w-full text-center py-1.5 rounded bg-slate-950 hover:bg-slate-800 text-[9px] font-black uppercase tracking-widest text-slate-300 border border-slate-900 cursor-pointer transition"
                      >
                        Ver Ciudadanos
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* DETALLES DE CITAS DEL DÍA SELECCIONADO */}
          <div id="inspector-citas-dia" className="bg-slate-950 rounded-xl border border-slate-850 overflow-hidden shadow-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b border-slate-900/60 pb-3">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-200 flex items-center gap-2">
                  <Clock className="w-4.5 h-4.5 text-blue-500 animate-pulse" />
                  <span>Inspección de Turnos del Día: <span className="text-blue-400 font-mono font-black">{selectedCalendarDateStr}</span></span>
                </h4>
                <p className="text-[11.5px] text-slate-500 leading-relaxed mt-0.5">
                  Visualice y gestione individualmente cada una de las citas de pasados de edad reservadas para esta fecha.
                </p>
              </div>
              <div className="bg-blue-600/15 text-blue-400 border border-blue-900/40 text-[10px] font-black uppercase px-2.5 py-1 rounded shadow mt-2 sm:mt-0 font-mono">
                {dayAppointments.length} Registros Encontrados
              </div>
            </div>

            {dayAppointments.length === 0 ? (
              <div className="bg-slate-900/30 border border-dashed border-slate-850 p-16 text-center rounded-lg text-slate-500 text-[11px]">
                <Calendar className="w-10 h-10 text-slate-850/60 mx-auto mb-2" />
                <span>No hay ciudadanos agendados para el {selectedCalendarDateStr}. Seleccione otra fecha del planeador.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dayAppointments.map(cita => {
                  const citizen = cita.datosPersonales;
                  const isRealizada = cita.estado === 'realizada';
                  const isCancelada = cita.estado === 'cancelada' || cita.estado === 'no_asistire';
                  const isConfirmada = !isRealizada && !isCancelada;

                  return (
                    <div 
                      key={cita.id} 
                      className={`p-4 rounded-xl border transition-all flex flex-col justify-between space-y-3.5 relative overflow-hidden ${
                        isRealizada 
                          ? 'bg-emerald-950/15 border-emerald-900/45 shadow' 
                          : isCancelada 
                            ? 'bg-red-950/15 border-red-900/25 opacity-70' 
                            : 'bg-slate-900 border-slate-800 hover:border-slate-755 shadow'
                      }`}
                    >
                      <div className="flex items-center justify-between border-b border-slate-950 pb-2">
                        <span className="text-[10px] font-mono font-black text-slate-500">
                          REF: {cita.id}
                        </span>
                        <div>
                          {isRealizada ? (
                            <span className="bg-emerald-950 text-emerald-400 border border-emerald-100/40 text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono">
                              Realizada
                            </span>
                          ) : isCancelada ? (
                            <span className="bg-red-950 text-red-400 border border-red-100/40 text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono">
                              Cancelada
                            </span>
                          ) : (
                            <span className="bg-blue-950 text-blue-400 border border-blue-105/40 text-[8px] font-black uppercase px-2 py-0.5 rounded font-mono">
                              Confirmada
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Citizen metadata */}
                      <div className="space-y-1.5 text-xs text-slate-355">
                        <div className="text-xs font-black text-white uppercase leading-tight flex items-center justify-between gap-1.5 flex-wrap">
                          <span>{citizen.nombreCompleto || 'Sin nombre'}</span>
                          {cita.creadaPorSupervisor && (
                            <span className="bg-amber-500/10 text-amber-500 border border-amber-500/30 text-[8px] font-black uppercase px-2 py-0.5 rounded tracking-wider shadow-inner font-mono inline-block">
                              ★ Cita Especial
                            </span>
                          )}
                        </div>
                        <div className="font-mono text-[10.5px] text-slate-450 flex items-center gap-1.5">
                          <span className="text-slate-500 text-[8px] font-black uppercase tracking-wider block">ID/Cédula:</span>
                          <span className="text-slate-300 font-bold">{citizen.identificacion}</span>
                        </div>
                        <div className="font-mono text-[10.5px] text-slate-450 flex items-center gap-1.5">
                          <span className="text-slate-500 text-[8px] font-black uppercase tracking-wider block">Atención:</span>
                          <span className="text-emerald-400 font-black">{cita.hora}</span>
                        </div>
                        <div className="text-[10px] text-slate-450 space-y-0.5 pt-2 border-t border-slate-950/30 font-mono">
                          <p className="truncate"><span className="font-bold text-slate-500">Email:</span> {citizen.correo}</p>
                          <p><span className="font-bold text-slate-500">Móvil:</span> {citizen.telefono}</p>
                        </div>
                      </div>

                       {/* Actions panel */}
                      <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-950/40">
                        {!isRealizada && (
                          <button
                            type="button"
                            onClick={() => handleUpdateCitaStatus(cita.id, 'realizada')}
                            className="flex-1 bg-emerald-600/15 hover:bg-emerald-600 text-emerald-405 hover:text-white py-1.5 rounded text-[10px] font-bold border border-emerald-500/20 hover:border-transparent transition flex items-center justify-center gap-0.5 cursor-pointer shadow-sm text-center font-mono"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Realizada</span>
                          </button>
                        )}
                        {!isCancelada && (
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`¿Está seguro de cancelar la cita del ciudadano ${citizen.nombreCompleto}?`)) {
                                handleUpdateCitaStatus(cita.id, 'cancelada');
                              }
                            }}
                            className="flex-1 bg-red-655/15 hover:bg-red-655 text-red-400 hover:text-white py-1.5 rounded text-[10px] font-bold border border-red-555/20 hover:border-transparent transition flex items-center justify-center gap-0.5 cursor-pointer shadow-sm text-center font-mono"
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>Cancelar</span>
                          </button>
                        )}
                        {(isRealizada || isCancelada) && (
                          <button
                            type="button"
                            onClick={() => handleUpdateCitaStatus(cita.id, 'confirmada')}
                            className="flex-1 bg-slate-950 hover:bg-slate-800 text-slate-300 py-1.5 rounded text-[10px] font-bold border border-slate-850 transition flex items-center justify-center gap-0.5 cursor-pointer text-center font-mono"
                          >
                            <span>Reactivar</span>
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteCita(cita.id)}
                          className="bg-red-950/45 hover:bg-red-600 text-red-400 hover:text-white px-2 py-1.5 rounded text-[10px] font-bold border border-red-900/30 hover:border-transparent transition flex items-center justify-center gap-0.5 cursor-pointer shadow-sm font-mono flex-1 min-w-[70px]"
                          title="Eliminar Cita permanentemente"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>Eliminar</span>
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

      {/* SCHEDULE MANAGEMENT FORM */}
          <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4 shadow-xl text-left">
            <div className="border-b border-slate-900 pb-2 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-500" />
                <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider">
                  Control de Horarios y Cupos (Pasados de Edad)
                </h4>
              </div>
              <span className="text-[9px] bg-blue-950 text-blue-400 border border-blue-900/60 px-2 py-0.5 rounded font-bold uppercase">
                Planificación Activa: {tardiaCapacidadTotal} Citas por día
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed font-sans">
              Personalice los límites operativos, intervalos de reunión, hora de apertura, hora de cierre de la agenda para trámites de cédulas para ciudadanos Pasados de Edad. Standard: 4 citas por día de 8:00 AM a 11:30 AM con lapso de 30 min.
            </p>

            <form onSubmit={promptSaveTardiaConfig} className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-end pt-1">
              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Cupo Máximo Diario (Citas/Día)</label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={tardiaCapacidadTotal}
                  onChange={(e) => setTardiaCapacidadTotal(parseInt(e.target.value, 10) || 1)}
                  className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono font-bold"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Intervalo de Cita (Minutos)</label>
                <select
                  value={tardiaIntervalo}
                  onChange={(e) => setTardiaIntervalo(parseInt(e.target.value, 10))}
                  className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono font-semibold"
                >
                  <option value="10">10 minutos</option>
                  <option value="15">15 minutos</option>
                  <option value="20">20 minutos</option>
                  <option value="30">30 minutos</option>
                  <option value="45">45 minutos</option>
                  <option value="50">50 minutos</option>
                  <option value="60">60 minutos</option>
                  <option value="150">150 minutos (2:30 horas)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Hora Apertura (Inicio)</label>
                <select
                  value={tardiaHoraInicio}
                  onChange={(e) => setTardiaHoraInicio(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs cursor-pointer focus:outline-none font-medium text-slate-200 font-mono"
                >
                  {['07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM', '09:00 AM', '09:30 AM', '10:00 AM'].map(time => (
                    <option key={`tardia-start-${time}`} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-extrabold uppercase text-slate-455 block">Hora Cierre (Límite)</label>
                <select
                  value={tardiaHoraFin}
                  onChange={(e) => setTardiaHoraFin(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs cursor-pointer focus:outline-none font-medium text-slate-201 font-mono"
                >
                  {['11:00 AM', '11:15 AM', '11:30 AM', '12:00 PM', '12:30 PM', '01:00 PM', '01:30 PM', '02:00 PM', '02:30 PM', '03:00 PM', '03:30 PM', '04:00 PM'].map(time => (
                    <option key={`tardia-end-${time}`} value={time}>{time}</option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4 flex justify-end">
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 px-6 rounded transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5 text-white" />
                  <span>Guardar Planificación VID (Pasados de Edad)</span>
                </button>
              </div>
            </form>
          </div>

          {/* CONFIRMATION TIMING MODAL */}
          {showConfirmTardiaSave && (
            <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-[9999] p-4 animate-fade-in font-sans">
              <div className="bg-slate-900 border border-blue-500/40 rounded-xl p-6 max-w-md w-full shadow-2xl space-y-4 text-slate-100">
                <div className="flex items-center gap-3 border-b border-blue-500/20 pb-3 text-blue-400">
                  <AlertCircle className="w-6 h-6 shrink-0 text-blue-400" />
                  <h4 className="text-sm font-black uppercase tracking-wider text-slate-100">Confirmar Planificación VID (Pasados de Edad)</h4>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed font-semibold">
                  ¿Está seguro de que desea aplicar estos cambios a la planificación de Pasados de Edad (VID)? 
                  Los nuevos cupos diarios de **{tardiaCapacidadTotal} citas**, un intervalo de **{tardiaIntervalo} minutos** y el horario laborable regulado de **{tardiaHoraInicio} a {tardiaHoraFin}** se guardarán y entrarán en vigencia inmediatamente.
                </p>
                <div className="flex items-center justify-end gap-3 pt-2 font-black">
                  <button
                    type="button"
                    onClick={() => setShowConfirmTardiaSave(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-350 border border-slate-700 rounded text-xs uppercase tracking-wide cursor-pointer transition"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={executeSaveTardiaConfig}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded text-xs uppercase tracking-wider shadow-md cursor-pointer transition"
                  >
                    Sí, Confirmar Planificación
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Table history log of trackers */}
          <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-hidden shadow-xl text-left">
            <div className="bg-slate-900/50 p-4 border-b border-slate-800 flex items-center justify-between">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-350 flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-500" />
                Historial de Seguimientos Autorizados ({historicalExp.length})
              </h4>
              {historicalExp.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('¿Está seguro de limpiar todo el historial local de expedientes autorizados? Esto no borrará las citas registradas.')) {
                      setHistoricalExp([]);
                      localStorage.removeItem('te_panama_historical_expedientes');
                    }
                  }}
                  className="text-red-450 hover:text-red-350 text-[10px] font-black uppercase tracking-wider hover:underline cursor-pointer"
                >
                  Limpiar Historial
                </button>
              )}
            </div>

            {historicalExp.length > 0 && (
              <div className="p-3.5 bg-slate-900/40 border-b border-slate-800 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Búsqueda rápida (Nombre, Seguimiento, Cédula...)"
                    value={searchExpQuery}
                    onChange={(e) => setSearchExpQuery(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded py-1.5 pl-9 pr-8 text-[11px] text-white focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-blue-600 font-medium placeholder-slate-600"
                  />
                  {searchExpQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchExpQuery('')}
                      className="absolute right-2.5 top-1.5 text-slate-500 hover:text-white text-xs font-black px-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
                <div className="w-full sm:w-64">
                  <select
                    value={searchExpCategory}
                    onChange={(e) => setSearchExpCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 text-slate-300 p-1.5 rounded text-[11px] focus:outline-none focus:border-slate-700 focus:ring-1 focus:ring-blue-600 font-medium cursor-pointer"
                  >
                    <option value="Todas">Todas las categorías</option>
                    <option value="Primera vez nacional, sin biometría">Primera vez nacional, sin biometría</option>
                    <option value="Primera vez nacional, inscripción tardía (Hasta 6 meses)">Primera vez nacional, inscripción tardía (Hasta 6 meses)</option>
                    <option value="Renovación blanco y negro">Renovación blanco y negro</option>
                    <option value="Primera vez nacional con 20 años y 1 día cumplidos">Primera vez nacional con 20 años y 1 día cumplidos</option>
                  </select>
                </div>
              </div>
            )}

            {historicalExp.length === 0 ? (
              <div className="p-10 text-center text-[11px] text-slate-500 font-medium">
                No se han generado expedientes de pasados de edad (VID) en esta sesión local de oficialía.
              </div>
            ) : filteredHistoricalExp.length === 0 ? (
              <div className="p-10 text-center text-[11px] text-slate-500 font-medium">
                No se encontraron expedientes con la búsqueda "<strong className="text-slate-300">{searchExpQuery}</strong>".
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-slate-900 text-[9px] font-black uppercase tracking-widest text-slate-450 border-b border-slate-800">
                      <th className="p-3 w-16 border-b border-slate-800">Fecha</th>
                      <th className="p-3 w-40 border-b border-slate-800">N° Seguimiento</th>
                      <th className="p-3 w-44 border-b border-slate-800">Solicitante</th>
                      <th className="p-3 w-28 border-b border-slate-800">Documento / ID</th>
                      <th className="p-3 w-32 border-b border-slate-800">Contacto</th>
                      <th className="p-3 text-right border-b border-slate-800">Acciones de Remisión</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850 text-xs text-slate-330">
                    {filteredHistoricalExp.map((rec) => (
                      <tr key={rec.id} className="hover:bg-slate-900/40 border-b border-slate-850/50">
                        <td className="p-3 text-[10px] font-mono text-slate-450">
                          {rec.fechaCreacion ? rec.fechaCreacion.substring(0, 10) : '2026-05-27'}
                        </td>
                        <td className="p-3">
                          <span className="font-mono font-black text-blue-450 bg-blue-950/40 px-2 py-0.5 rounded border border-blue-900/30">
                            {rec.number}
                          </span>
                        </td>
                        <td className="p-3 font-semibold text-slate-200">
                          {rec.citizenName}
                        </td>
                        <td className="p-3 font-mono text-[11px]">
                          {rec.identificacion}
                        </td>
                        <td className="p-3 font-mono text-[10px] space-y-0.5">
                          <div className="text-slate-350">{rec.correo}</div>
                          <div className="text-slate-450">{rec.telefono}</div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleDownloadTrackingPDF(rec)}
                              className="bg-amber-955/40 hover:bg-amber-900/50 text-[10px] font-bold px-2 py-1 rounded transition text-amber-500 hover:text-amber-400 border border-amber-900/40 flex items-center gap-1 cursor-pointer"
                              title="Descargar Constancia Oficial en PDF"
                            >
                              <Download className="w-3 h-3 text-amber-500 shrink-0" />
                              <span>PDF</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(rec.directLink);
                                setCopiedId('link-' + rec.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                              className="bg-slate-900 hover:bg-slate-800 text-[10px] font-bold px-2 py-1 rounded transition text-slate-300 border border-slate-750 flex items-center gap-1 cursor-pointer"
                              title="Copiar solo el enlace de cita"
                            >
                              {copiedId === 'link-' + rec.id ? (
                                <span className="text-emerald-500 font-extrabold flex items-center gap-0.5"><CheckCircle className="w-3 h-3" /> Enlace!</span>
                              ) : (
                                <><Link className="w-3 h-3 text-slate-450" /> Enlace</>
                              )}
                            </button>
                            
                            <button
                              type="button"
                              onClick={() => {
                                navigator.clipboard.writeText(rec.textMessage);
                                setCopiedId('kit-' + rec.id);
                                setTimeout(() => setCopiedId(null), 2000);
                              }}
                              className="bg-blue-955/40 hover:bg-blue-900/50 text-[10px] font-bold px-2 py-1 rounded transition text-blue-300 border border-blue-900/40 flex items-center gap-1 cursor-pointer"
                              title="Copiar kit de mensaje completo para enviar"
                            >
                              {copiedId === 'kit-' + rec.id ? (
                                <span className="text-emerald-450 font-extrabold flex items-center gap-0.5"><CheckCircle className="w-3 h-3 text-emerald-500" /> Kit!</span>
                              ) : (
                                <><Share2 className="w-3 h-3 text-blue-400" /> Kit</>
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm('¿Está seguro de eliminar este registro del historial local de seguimientos?')) {
                                  const filtered = historicalExp.filter((e: any) => e.id !== rec.id);
                                  setHistoricalExp(filtered);
                                  localStorage.setItem('te_panama_historical_expedientes', JSON.stringify(filtered));
                                }
                              }}
                              className="bg-red-950/40 hover:bg-red-900/50 text-red-500 hover:text-red-400 border border-red-900/40 p-1 rounded transition cursor-pointer"
                              title="Eliminar del Historial"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* VISTA 2: OPERATOR (adminpedad) */}
      {activePersona === 'adminpedad' && (
        <div className="space-y-6 animate-fade-in text-slate-200">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Create Tracking form */}
            <form onSubmit={handleGenerateExpediente} className="lg:col-span-5 bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4 shadow-xl">
              <h4 className="text-xs font-black uppercase text-slate-300 tracking-wider border-b border-slate-900 pb-2 flex items-center gap-2">
                <Plus className="w-4 h-4 text-blue-500" />
                Nuevo Expediente VID (Pasados de Edad)
              </h4>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Nombre del Solicitante <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej: Aurelio Ismael Montenegro"
                    value={expName}
                    onChange={(e) => setExpName(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-650 font-medium"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Documento / ID <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: 8-223-4556"
                      value={expIdentificacion}
                      onChange={(e) => setExpIdentificacion(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-650 font-mono"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      F. Nacimiento <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={expFechaNacimiento}
                      onChange={(e) => setExpFechaNacimiento(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-1.5 rounded text-xs px-2 focus:outline-none focus:ring-1 focus:ring-blue-650 font-mono"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Correo Electrónico <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="correo@ejemplo.com"
                      value={expCorreo}
                      onChange={(e) => setExpCorreo(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-650"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                      Teléfono Móvil <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="Ej: 6605-4422"
                      value={expTelefono}
                      onChange={(e) => setExpTelefono(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-650"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Categoría de Observación / Trámite <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2.5 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-650 font-medium text-slate-300 cursor-pointer"
                  >
                    <option value="Primera vez nacional, sin biometría">Primera vez nacional, sin biometría</option>
                    <option value="Primera vez nacional, inscripción tardía (Hasta 6 meses)">Primera vez nacional, inscripción tardía (Hasta 6 meses)</option>
                    <option value="Renovación blanco y negro">Renovación blanco y negro</option>
                    <option value="Primera vez nacional con 20 años y 1 día cumplidos">Primera vez nacional con 20 años y 1 día cumplidos</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">
                    Notas Internas Adicionales
                  </label>
                  <textarea
                    placeholder="Notas opcionales adicionales para el expediente..."
                    value={expNotes}
                    rows={2}
                    onChange={(e) => setExpNotes(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-650 resize-none font-medium text-slate-300"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-extrabold text-xs uppercase tracking-wider py-2.5 rounded transition shadow-lg cursor-pointer flex items-center justify-center gap-2"
                >
                  <Shield className="w-4 h-4 shrink-0" />
                  Generar Expediente y Enlace
                </button>
              </div>
            </form>

            {/* Results feedback panel */}
            <div className="lg:col-span-7 space-y-4">
              {generatedExp ? (
                <div className="bg-slate-950 p-5 rounded-lg border border-blue-900/60 shadow-2xl relative overflow-hidden space-y-4 animate-fade-in">
                  <div className="absolute right-[-10px] top-[-10px] opacity-10 pointer-events-none">
                    <Shield className="w-40 h-40 text-blue-500" />
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-blue-900/30 pb-3 gap-2">
                    <span className="text-xs font-black uppercase text-slate-205 tracking-wider flex items-center gap-2">
                      <CheckCircle className="w-4.5 h-4.5 text-emerald-500 shrink-0" />
                      Expediente Creado Exitosamente
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleDownloadTrackingPDF(generatedExp)}
                        className="bg-amber-600 hover:bg-amber-700 text-white text-[10.5px] font-black uppercase tracking-wider px-3.5 py-1 py-1 rounded transition flex items-center gap-1.5 shadow-md cursor-pointer border border-amber-500"
                      >
                        <Download className="w-3.5 h-3.5 text-white" />
                        <span>Descargar PDF</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setGeneratedExp(null)}
                        className="text-slate-400 hover:text-white text-[10.5px] font-black uppercase px-2.5 py-1 rounded border border-slate-800 hover:border-slate-700 transition cursor-pointer"
                      >
                        Limpiar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3 relative z-10">
                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-450 block">Código de Seguimiento Generado</span>
                      <div className="flex items-center gap-3 mt-1 bg-slate-900 p-2.5 rounded border border-slate-800">
                        <span className="text-base font-black text-blue-450 font-mono tracking-widest leading-none">
                          {generatedExp.number}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedExp.number);
                            setCopiedId(generatedExp.number);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="ml-auto bg-slate-800 hover:bg-slate-750 text-slate-350 hover:text-white text-[10px] font-extrabold px-3 py-1 rounded transition flex items-center gap-1 border border-slate-700"
                        >
                          {copiedId === generatedExp.number ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-500" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>Copiar Código</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-450 block">Enlace Personalizado de Agendamiento</span>
                      <div className="flex items-center gap-3 mt-1 bg-slate-900 p-2.5 rounded border border-slate-800">
                        <span className="text-[11px] font-mono text-slate-300 truncate tracking-tight">
                          {generatedExp.link}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(generatedExp.link);
                            setCopiedId(generatedExp.link);
                            setTimeout(() => setCopiedId(null), 2000);
                          }}
                          className="ml-auto bg-slate-800 hover:bg-slate-755 text-slate-355 hover:text-white text-[10px] font-extrabold px-3 py-1 rounded transition flex items-center gap-1 border border-slate-700 max-w-[120px] shrink-0"
                        >
                          {copiedId === generatedExp.link ? (
                            <>
                              <CheckCircle className="w-3 h-3 text-emerald-500" />
                              <span>Copiado</span>
                            </>
                          ) : (
                            <>
                              <Link className="w-3 h-3" />
                              <span>Copiar Enlace</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-black uppercase text-slate-455 block mb-1">Kit de Mensajería para Remitir</span>
                      <div className="bg-slate-900 p-3 rounded-lg border border-slate-850 space-y-2 relative">
                        <pre className="text-[10.5px] font-sans text-slate-300 whitespace-pre-wrap leading-relaxed">
                          {generatedExp.textMessage}
                        </pre>
                        <div className="border-t border-slate-800 pt-2.5 flex justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(generatedExp.textMessage);
                              setCopiedId('kit-' + generatedExp.number);
                              setTimeout(() => setCopiedId(null), 2050);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-extrabold uppercase tracking-wider px-4 py-1.5 rounded transition flex items-center gap-1.5 shadow"
                          >
                            {copiedId === 'kit-' + generatedExp.number ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-white" />
                                <span>Kit Copiado</span>
                              </>
                            ) : (
                              <>
                                <Share2 className="w-3.5 h-3.5" />
                                <span>Copiar Kit Completo</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-850 shadow-inner flex flex-col items-center justify-center text-center py-16 h-full min-h-[300px] text-slate-500">
                  <Shield className="w-12 h-12 text-slate-700 mb-3 animate-pulse" />
                  <h4 className="text-xs font-black uppercase text-slate-400 tracking-wider">A la espera de generación</h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mt-1 leading-relaxed">
                    Complete el formulario de la izquierda con los de su ciudadano e inicie la asignación de su número de filiación.
                  </p>
                </div>
              )}
            </div>

          </div>

        </div>
      )}

    </div>
  );
}
