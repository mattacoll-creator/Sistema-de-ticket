import React, { useState, useMemo } from 'react';
import { jsPDF } from 'jspdf';
import { 
  Shield, 
  ShieldAlert, 
  Users, 
  CheckSquare, 
  Trash2, 
  Edit3, 
  Filter, 
  Search, 
  Download, 
  BarChart3, 
  Settings, 
  Key, 
  Briefcase, 
  Calendar, 
  Clock, 
  ClipboardList, 
  RefreshCw, 
  Sliders, 
  X,
  AlertCircle,
  CheckCircle,
  FileSpreadsheet,
  Building,
  Info,
  Plus,
  Copy,
  ExternalLink,
  Share2,
  Link,
  Check,
  Tv,
  Database
} from 'lucide-react';
import { Cita, DatosPersonales, ServicioCategoriaId, TipoIdentificacion, Sucursal, CategoriaServicio, SubServicio, ExtranjeriaRecord, AdminRole, AdminUser } from '../types';
import { SUCURSALES_TE, SERVICIOS_TRIBUNAL, saveTramiteMutation, saveSucursalMutation } from '../data';
import ExtranjeriaController from './ExtranjeriaController';
import DatabaseDiagnostic from './DatabaseDiagnostic';
import TardiaController from './TardiaController';
import AdminCmsEditor from './AdminCmsEditor';

interface AdminPanelProps {
  citas: Cita[];
  onUpdateCitas: (updatedList: Cita[]) => void;
  onClose: () => void;
}

export default function AdminPanel({ citas, onUpdateCitas, onClose }: AdminPanelProps) {
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(() => {
    return typeof window !== 'undefined' && !!sessionStorage.getItem('admin_token');
  });
  const [username, setUsername] = useState(() => {
    return typeof window !== 'undefined' ? (sessionStorage.getItem('admin_username') || '') : '';
  });
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  
  const [currentRole, setCurrentRole] = useState<AdminRole>(() => {
    return typeof window !== 'undefined' ? (sessionStorage.getItem('admin_role') as AdminRole || 'sencillo') : 'sencillo';
  });
  const [activeSubTab, setActiveSubTab] = useState<'tabla' | 'stats' | 'config' | 'horarios' | 'tramites' | 'extranjeria' | 'pantalla' | 'usuarios' | 'database'>('tabla');
  const [eyeTheme, setEyeTheme] = useState<'slate' | 'warm' | 'sepia' | 'forest' | 'light'>(() => {
    try {
      return (localStorage.getItem('admin_eye_theme') as any) || 'slate';
    } catch {
      return 'slate';
    }
  });

  // Search and Filtering states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategoria, setFilterCategoria] = useState<string>('Todos');
  const [filterSucursal, setFilterSucursal] = useState<string>('Todos');
  const [filterEstado, setFilterEstado] = useState<string>('Todos');
  const [showStatsInManagement, setShowStatsInManagement] = useState<boolean>(true);

  // Selected item to edit details
  const [editingCita, setEditingCita] = useState<Cita | null>(null);
  
  // Custom states for editing
  const [editFecha, setEditFecha] = useState('');
  const [editHora, setEditHora] = useState('');
  const [editEstado, setEditEstado] = useState<'confirmada' | 'cancelada' | 'asistire' | 'no_asistire' | 'realizada'>('confirmada');
  const [editTipoIdentificacion, setEditTipoIdentificacion] = useState<TipoIdentificacion>('Cedula');
  const [editIdentificacion, setEditIdentificacion] = useState('');
  const [editTelefono, setEditTelefono] = useState('');
  const [editCorreo, setEditCorreo] = useState('');
  const [editNombreCompleto, setEditNombreCompleto] = useState('');

  // Bulk operation checks
  const [selectedCitaIds, setSelectedCitaIds] = useState<string[]>([]);

  // User Management state for Super Admin
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [userFormUsername, setUserFormUsername] = useState('');
  const [userFormPassword, setUserFormPassword] = useState('');
  const [userFormRole, setUserFormRole] = useState<AdminRole>('extranjeria');
  const [userFormNombre, setUserFormNombre] = useState('');
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [userError, setUserError] = useState('');
  const [userSuccess, setUserSuccess] = useState('');

  // Fetch users from server-side DB
  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const token = sessionStorage.getItem('admin_token') || '';
      const res = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.users) {
          setUsers(data.users);
        }
      }
    } catch (err) {
      console.error('Error loading users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Load users on mount and trigger every time admin panel renders or logs in
  React.useEffect(() => {
    if (isAdminLoggedIn) {
      fetchUsers();
    }
  }, [isAdminLoggedIn]);

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserError('');
    setUserSuccess('');

    if (!userFormUsername.trim() || !userFormPassword.trim() || !userFormNombre.trim() || !userFormRole) {
      setUserError('Todos los campos son obligatorios para registrar o modificar un usuario.');
      return;
    }

    try {
      const payload = {
        username: userFormUsername.trim().toLowerCase(),
        password: userFormPassword.trim(),
        role: userFormRole,
        nombre: userFormNombre.trim()
      };

      const token = sessionStorage.getItem('admin_token') || '';
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();
      if (response.ok && result.success) {
        setUserSuccess(editingUser ? 'Usuario actualizado exitosamente.' : 'Usuario creado exitosamente con la gestión asignada.');
        fetchUsers();
        // Reset form
        setUserFormUsername('');
        setUserFormPassword('');
        setUserFormNombre('');
        setUserFormRole('extranjeria');
        setEditingUser(null);
      } else {
        setUserError(result.error || 'Surgió un error al guardar el usuario en el servidor.');
      }
    } catch (err: any) {
      setUserError('No se pudo conectar con el servidor para guardar el usuario.');
    }
  };

  const handleDeleteUser = async (usernameToDelete: string) => {
    if (!window.confirm(`¿Está seguro que desea eliminar al usuario '${usernameToDelete}'? Esta acción es irreversible.`)) {
      return;
    }
    setUserError('');
    setUserSuccess('');

    try {
      const token = sessionStorage.getItem('admin_token') || '';
      const response = await fetch(`/api/users/${usernameToDelete}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await response.json();
      if (response.ok && result.success) {
        setUserSuccess(result.message || 'Usuario eliminado de la base de datos.');
        fetchUsers();
      } else {
        setUserError(result.error || 'No se pudo eliminar el usuario.');
      }
    } catch (err) {
      setUserError('Error al comunicarse con el servidor.');
    }
  };

  const handleEditUserClick = (u: AdminUser) => {
    setEditingUser(u);
    setUserFormUsername(u.username);
    setUserFormPassword(u.password || '');
    setUserFormNombre(u.nombre);
    setUserFormRole(u.role);
    setUserError('');
    setUserSuccess('');
  };

  const handleCancelUserEdit = () => {
    setEditingUser(null);
    setUserFormUsername('');
    setUserFormPassword('');
    setUserFormNombre('');
    setUserFormRole('extranjeria');
    setUserError('');
    setUserSuccess('');
  };

  // Simulated config capacity state
  const [maxSlotsPerHour, setMaxSlotsPerHour] = useState(15);
  const [enableEmailAlerts, setEnableEmailAlerts] = useState(true);
  const [maintenanceMessage, setMaintenanceMessage] = useState('');
  const [isAlertActive, setIsAlertActive] = useState(false);

  // Reactive list states for offices and procedures (available to both Admin Sencillo and Super Admin)
  const [mutableSucursales, setMutableSucursales] = useState<Sucursal[]>([...SUCURSALES_TE]);
  const [mutableServicios, setMutableServicios] = useState<CategoriaServicio[]>([...SERVICIOS_TRIBUNAL]);

  // Editing states for branches/offices
  const [editingSucursal, setEditingSucursal] = useState<Sucursal | null>(null);
  const [editSucHorario, setEditSucHorario] = useState('');
  const [editSucNombre, setEditSucNombre] = useState('');
  const [editSucDireccion, setEditSucDireccion] = useState('');
  const [editSucTelefono, setEditSucTelefono] = useState('');

  // Editing and creation states for Categories and Procedures (Trámites)
  const [editingCategoria, setEditingCategoria] = useState<CategoriaServicio | null>(null);
  const [isCreatingCategoria, setIsCreatingCategoria] = useState(false);
  const [catFormId, setCatFormId] = useState<ServicioCategoriaId>('cedulacion');
  const [catFormNombre, setCatFormNombre] = useState('');
  const [catFormDescripcion, setCatFormDescripcion] = useState('');
  const [catFormIcono, setCatFormIcono] = useState('IdCard');

  const [editingSubServicio, setEditingSubServicio] = useState<SubServicio | null>(null);
  const [editingSubServicioCatId, setEditingSubServicioCatId] = useState<ServicioCategoriaId | null>(null);
  const [isCreatingSubServicio, setIsCreatingSubServicio] = useState(false);
  const [subFormId, setSubFormId] = useState('');
  const [subFormNombre, setSubFormNombre] = useState('');
  const [subFormDescripcion, setSubFormDescripcion] = useState('');
  const [subFormRequisitos, setSubFormRequisitos] = useState<string[]>([]);
  const [newRequisitoText, setNewRequisitoText] = useState('');

  const [pasadoEdadLinkBase, setPasadoEdadLinkBase] = useState(() => {
    try {
      const stored = localStorage.getItem('te_panama_pasado_edad_link_base');
      if (stored) return stored;
    } catch {}
    return typeof window !== 'undefined' ? window.location.origin : 'https://citas.tribunal-electoral.gob.pa';
  });


  const [metricPeriod, setMetricPeriod] = useState<'dia' | 'semana' | 'mes' | 'año' | 'todo'>('mes');
  const [adminStartDate, setAdminStartDate] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-01`;
  });
  const [adminEndDate, setAdminEndDate] = useState<string>(() => {
    const d = new Date();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mm}-${dd}`;
  });

  const handleDownloadMetricsPDFReport = (
    type: 'extranjeria' | 'tardia' | 'organizacion_electoral' | 'cedulacion' | 'registro_civil' | 'all',
    overridePeriod?: 'dia' | 'semana' | 'mes' | 'año' | 'todo'
  ) => {
    const selectedPeriod = overridePeriod || metricPeriod;
    const filtered = citas.filter(cita => {
      const isExtranjeria = cita.servicioCategoria === 'extranjeria' || 
                            cita.subServicioId?.includes('extranj') || 
                            cita.subServicioId?.startsWith('ext_');
      
      const isTardia = cita.subServicioId === 'ced_pasados_edad';
      const isOE = cita.servicioCategoria === 'organizacion_electoral';
      const isRC = cita.servicioCategoria === 'registro_civil';
      const isCed = cita.servicioCategoria === 'cedulacion' && cita.subServicioId !== 'ced_pasados_edad';
      
      if (type === 'extranjeria' && !isExtranjeria) return false;
      if (type === 'tardia' && !isTardia) return false;
      if (type === 'organizacion_electoral' && !isOE) return false;
      if (type === 'cedulacion' && !isCed) return false;
      if (type === 'registro_civil' && !isRC) return false;
      // 'all' includes any of the above categories, which means everything
      
      if (selectedPeriod === 'todo') return true;
      
      try {
        const now = new Date();
        const refDate = new Date(cita.fecha + 'T00:00:00');
        
        if (selectedPeriod === 'dia') {
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const todayStr = `${year}-${month}-${day}`;
          return cita.fecha === todayStr;
        }
        
        if (selectedPeriod === 'semana') {
          const currentDay = now.getDay();
          const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
          const monday = new Date(now);
          monday.setDate(now.getDate() - distanceToMonday);
          monday.setHours(0, 0, 0, 0);
          
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);
          
          return refDate >= monday && refDate <= sunday;
        }
        
        if (selectedPeriod === 'mes') {
          return refDate.getMonth() === now.getMonth() && refDate.getFullYear() === now.getFullYear();
        }
        
        if (selectedPeriod === 'año') {
          return refDate.getFullYear() === now.getFullYear();
        }
      } catch (e) {
        return false;
      }
      return false;
    });

    if (filtered.length === 0) {
      alert(`No hay citas registradas en el período (${selectedPeriod === 'dia' ? 'diario' : selectedPeriod === 'semana' ? 'semanal' : selectedPeriod === 'mes' ? 'mensual' : selectedPeriod === 'año' ? 'anual' : 'histórico'}) seleccionado para descargar en PDF.`);
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageW = doc.internal.pageSize.getWidth();

    const primaryColor = [15, 23, 42]; // Slate 900
    
    // Choose accent color based on category
    const accentColor = 
      type === 'tardia' ? [37, 99, 235] : // Blue (VID)
      type === 'cedulacion' ? [29, 78, 216] : // Deep Blue (Cedulación)
      type === 'extranjeria' ? [217, 119, 6] : // Amber (Extranjería)
      type === 'organizacion_electoral' ? [147, 51, 234] : // Purple (OE)
      type === 'registro_civil' ? [16, 185, 129] : // Emerald (Registro Civil)
      [79, 70, 229]; // Indigo (Consolidado)

    let currentY = 15;

    const drawHeader = () => {
      // Top bar
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(10, currentY, pageW - 20, 10, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('TRIBUNAL ELECTORAL DE PANAMÁ', 15, currentY + 6.5);

      // Section title
      currentY += 16;
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(13);
      doc.text('REPORTE OFICIAL DE PLANIFICACIÓN Y CARGA DE CITAS', 10, currentY);
      
      currentY += 6;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      
      const categoryLabel = 
        type === 'all' ? 'Consolidado General (Todos los Trámites y Servicios)' :
        type === 'extranjeria' ? 'Trámites de Extranjería (Resolución Migratoria)' :
        type === 'tardia' ? 'Verificación de Identidad - VID (Ciudadanos Pasados de Edad)' :
        type === 'organizacion_electoral' ? 'Trámites de Organización Electoral' :
        type === 'cedulacion' ? 'Trámites de Cedulación (Excluye Pasados de Edad)' :
        type === 'registro_civil' ? 'Trámites de Registro Civil' : 'Otros Trámites';
          
      doc.text(`Servicio regulado: ${categoryLabel}`, 10, currentY);

      currentY += 5;
      const periodLabel = selectedPeriod === 'dia' ? 'Hoy' : selectedPeriod === 'semana' ? 'Esta Semana' : selectedPeriod === 'mes' ? 'Este Mes' : selectedPeriod === 'año' ? 'Este Año' : 'Histórico Completo';
      doc.text(`Período analizado: ${periodLabel.toUpperCase()}  |  Fecha de emisión: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, 10, currentY);

      // Accent divider line
      currentY += 4;
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(0.8);
      doc.line(10, currentY, pageW - 10, currentY);
      currentY += 8;
    };

    drawHeader();

    // Summary Box
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.25);
    doc.rect(10, currentY, pageW - 20, 28, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('RESUMEN DE CARGA OPERATIVA', 15, currentY + 6);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    
    const countConfirmadas = filtered.filter(c => c.estado === 'confirmada' || c.estado === 'asistire').length;
    const countOtras = filtered.length - countConfirmadas;

    doc.text(`• Total Citas Registradas: ${filtered.length}`, 15, currentY + 11);
    doc.text(`• Citas Confirmadas: ${countConfirmadas}`, 75, currentY + 11);
    doc.text(`• Otras / Canceladas: ${countOtras}`, 135, currentY + 11);
    
    doc.text('Este reporte contiene información confidencial sensitiva regulada conforme a las directivas de Registro Civil.', 15, currentY + 16.5);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('• GUÍA DE NOMENCLATURAS: ', 15, currentY + 22.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('CONFIRMADA/ASISTIRE (Cupo reservado activo) | NO ASISTIRÁ (Ausente) | CANCELADA (Anulado)', 58, currentY + 22.5);
    
    currentY += 34;

    // Table Headers
    const drawTableHead = (y: number) => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(10, y, pageW - 20, 7, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      
      doc.text('CÓDIGO/TX', 12, y + 4.8);
      doc.text('FECHA/HORA', 41, y + 4.8);
      doc.text('RECIPIENTE/SOLICITANTE', 68, y + 4.8);
      doc.text('CÉDULA/PASAPORTE', 118, y + 4.8);
      doc.text('CORREO ELECTRÓNICO', 145, y + 4.8);
      doc.text('ESTATUS', pageW - 30, y + 4.8);
    };

    drawTableHead(currentY);
    currentY += 7;

    // Render Rows
    filtered.forEach((c, index) => {
      if (currentY > 245) {
        doc.addPage();
        currentY = 15;
        drawHeader();
        drawTableHead(currentY);
        currentY += 7;
      }

      // Alternate row background
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(10, currentY, pageW - 20, 8, 'F');
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7.5);

      const isExtrans = c.servicioCategoria === 'extranjeria';
      const name = isExtrans 
        ? `${c.datosPersonales.primerNombre || ''} ${c.datosPersonales.primerApellido || ''}`.trim()
        : (c.datosPersonales.nombreCompleto || '');
      
      const labelTx = c.codigoTransaccion.length > 13 ? c.codigoTransaccion.slice(0, 13) + '...' : c.codigoTransaccion;
      const labelName = name.length > 25 ? name.slice(0, 24) + '...' : name;
      const labelId = c.datosPersonales.identificacion || c.datosPersonales.pasaporte || 'N/D';
      const labelCorreo = c.datosPersonales.correo.length > 20 ? c.datosPersonales.correo.slice(0, 19) + '..' : c.datosPersonales.correo;
      
      doc.text(labelTx, 12, currentY + 5);
      doc.text(`${c.fecha} - ${c.hora}`, 41, currentY + 5);
      doc.text(labelName, 68, currentY + 5);
      doc.text(labelId, 118, currentY + 5);
      doc.text(labelCorreo, 145, currentY + 5);
      
      const statusText = c.estado === 'confirmada' || c.estado === 'asistire' ? 'CONFIRMADA' : c.estado === 'no_asistire' ? 'NO ASISTIRÁ' : 'CANCELADA';
      if (statusText === 'CONFIRMADA') {
        doc.setTextColor(16, 124, 65);
        doc.setFont('Helvetica', 'bold');
      } else if (statusText === 'NO ASISTIRÁ') {
        doc.setTextColor(180, 83, 9);
        doc.setFont('Helvetica', 'bold');
      } else {
        doc.setTextColor(185, 28, 28);
        doc.setFont('Helvetica', 'bold');
      }
      doc.text(statusText, pageW - 30, currentY + 5);

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.1);
      doc.line(10, currentY + 8, pageW - 10, currentY + 8);

      currentY += 8;
    });

    const pdfLabel = type === 'all' ? 'general' : type;
    doc.save(`reporte_carga_${pdfLabel}_${metricPeriod}.pdf`);
  };

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
    doc.setTextColor(255, 255, 255);
    doc.text('CONSTANCIA DE EXPEDIENTE Y SEGUIMIENTO ACTIVO', 20, 31);

    let currentY = 55;

    // Body text
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
    doc.setFont('Helvetica', 'normal'); doc.text(exp.citizenName || exp.nombreCompleto || exp.citizenName, 65, currentY + 17);

    doc.setFont('Helvetica', 'bold'); doc.text('Identificación / Cédula:', 26, currentY + 24);
    doc.setFont('Helvetica', 'normal'); doc.text(exp.identificacion, 65, currentY + 24);

    doc.setFont('Helvetica', 'bold'); doc.text('F. de Nacimiento:', 26, currentY + 31);
    doc.setFont('Helvetica', 'normal'); doc.text(exp.fechaNacimiento || 'N/A', 65, currentY + 31);

    doc.setFont('Helvetica', 'bold'); doc.text('Correo Electrónico:', 26, currentY + 38);
    doc.setFont('Helvetica', 'normal'); doc.text(exp.correo, 65, currentY + 38);

    doc.setFont('Helvetica', 'bold'); doc.text('Teléfono Móvil:', 26, currentY + 45);
    doc.setFont('Helvetica', 'normal'); doc.text(exp.telefono, 65, currentY + 45);

    currentY += 62;

    // Tracking Panel box (amber themed)
    doc.setFillColor(254, 243, amberIndexColor(exp)); // Amber background
    doc.setDrawColor(251, 191, 36);  // Amber 400
    doc.setLineWidth(0.4);
    doc.rect(20, currentY, pageW - 40, 36, 'FD');

    doc.setTextColor(180, 83, 9); // Amber 700
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('CÓDIGO DE SEGUIMIENTO OBLIGATORIO', 26, currentY + 8);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42);
    doc.text(exp.number || exp.id, 26, currentY + 19);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(120, 113, 108);
    doc.text('Presente este código impreso o en su dispositivo al momento de presentarse a la sucursal seleccionada para su cita.', 26, currentY + 26, { maxWidth: pageW - 52 });

    currentY += 46;

    // Booking link block
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('ENLACE EXCLUSIVO DE AGENDAMIENTO DIRECTO:', 20, currentY);

    currentY += 5;
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.1);
    doc.rect(20, currentY, pageW - 40, 12, 'FD');

    doc.setTextColor(37, 99, 235); // Blue 600
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    const linkText = exp.link || exp.directLink || `${pasadoEdadLinkBase.trim().endsWith('/') ? pasadoEdadLinkBase.trim().slice(0, -1) : pasadoEdadLinkBase.trim()}/?tramite=ced_pasados_edad&seguimiento=${exp.number || exp.id}`;
    doc.text(linkText, 24, currentY + 7.5, { maxWidth: pageW - 48 });

    currentY += 22;

    // Legal & Security instructions
    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('INSTRUCCIONES DEL PROCESO:', 20, currentY);

    currentY += 6;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139);
    doc.text('1. Ingrese al enlace anterior o acceda a la plataforma e ingrese su Código de Seguimiento.\n2. Seleccione la fecha, hora e instalaciones de la sucursal donde desea realizar su proceso de filiación.\n3. Acuda a la hora programada. Se requiere puntualidad (llegar 15 minutos antes con sus documentos originales).', 20, currentY, { maxWidth: pageW - 40 });

    currentY += 26;

    // Stamp / Footer area
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(20, currentY, pageW - 20, currentY);

    currentY += 8;
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(`Constancia generada electrónicamente por el sistema de citas el ${new Date().toLocaleDateString('es-ES')}.`, 20, currentY);
    doc.text('Este documento digital cumple con los requisitos de verificación en línea del Tribunal Electoral de Panamá.', 20, currentY + 4);

    doc.save(`constancia_seguimiento_${exp.number || exp.id}.pdf`);
  };

  const amberIndexColor = (exp: any) => {
    return 199;
  };

  const handleDownloadMetricsReport = (type: 'extranjeria' | 'tardia' | 'all') => {
    const filtered = citas.filter(cita => {
      const isExtranjeria = cita.servicioCategoria === 'extranjeria' || 
                            cita.subServicioId?.includes('extranj') || 
                            cita.subServicioId?.startsWith('ext_');
      
      const isTardia = cita.subServicioId === 'ced_pasados_edad';
      
      if (type === 'extranjeria' && !isExtranjeria) return false;
      if (type === 'tardia' && !isTardia) return false;
      if (type === 'all' && !isExtranjeria && !isTardia) return false;
      
      if (metricPeriod === 'todo') return true;
      
      try {
        const now = new Date();
        const refDate = new Date(cita.fecha + 'T00:00:00');
        
        if (metricPeriod === 'dia') {
          const year = now.getFullYear();
          const month = String(now.getMonth() + 1).padStart(2, '0');
          const day = String(now.getDate()).padStart(2, '0');
          const todayStr = `${year}-${month}-${day}`;
          return cita.fecha === todayStr;
        }
        
        if (metricPeriod === 'semana') {
          const currentDay = now.getDay();
          const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
          const monday = new Date(now);
          monday.setDate(now.getDate() - distanceToMonday);
          monday.setHours(0, 0, 0, 0);
          
          const sunday = new Date(monday);
          sunday.setDate(monday.getDate() + 6);
          sunday.setHours(23, 59, 59, 999);
          
          return refDate >= monday && refDate <= sunday;
        }
        
        if (metricPeriod === 'mes') {
          return refDate.getMonth() === now.getMonth() && refDate.getFullYear() === now.getFullYear();
        }
        
        if (metricPeriod === 'año') {
          return refDate.getFullYear() === now.getFullYear();
        }
      } catch (e) {
        return false;
      }
      return false;
    });

    if (filtered.length === 0) {
      alert('No hay citas registradas en el período seleccionado para descargar.');
      return;
    }

    const headers = [
      'Codigo de Cita',
      'Categoria',
      'Sub Tramite',
      'Fecha',
      'Hora',
      'Solicitante',
      'Tipo Identificacion',
      'Identificacion',
      'Correo Electronico',
      'Telefono',
      'Sucursal ID',
      'Estado'
    ];

    const rows = filtered.map(c => {
      const isExtrans = c.servicioCategoria === 'extranjeria';
      const name = isExtrans 
        ? `${c.datosPersonales.primerNombre || ''} ${c.datosPersonales.primerApellido || ''}`.trim()
        : (c.datosPersonales.nombreCompleto || '');
      
      const subservice = c.subServicioId === 'ced_pasados_edad' ? 'Pasados de Edad (VID)' : c.subServicioId;
      
      return [
        c.codigoTransaccion,
        c.servicioCategoria === 'extranjeria' ? 'Extranjeria' : 'Pasados de Edad (VID)',
        subservice,
        c.fecha,
        c.hora,
        `"${name.replace(/"/g, '""')}"`,
        c.datosPersonales.tipoIdentificacion,
        c.datosPersonales.identificacion,
        c.datosPersonales.correo,
        c.datosPersonales.telefono,
        c.sucursalId,
        c.estado
      ];
    });

    const csvContent = "\uFEFF" + [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    const labelType = type === 'all' ? 'general' : type;
    link.setAttribute('download', `reporte_carga_${labelType}_${metricPeriod}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        sessionStorage.setItem('admin_token', data.token);
        sessionStorage.setItem('admin_role', data.user.role);
        sessionStorage.setItem('admin_username', data.user.username);
        
        setCurrentRole(data.user.role);
        setIsAdminLoggedIn(true);
        setLoginError('');
        
        if (data.user.role.startsWith('extranjeria')) {
          setActiveSubTab('extranjeria');
        } else if (data.user.role.startsWith('pasado_edad')) {
          setActiveSubTab('pasado_edad' as any);
        } else {
          setActiveSubTab('tabla');
        }
      } else {
        setLoginError(data.error || 'Credenciales incorrectas. Verifique sus datos o ingrese con las credenciales asignadas.');
      }
    } catch (err) {
      console.error('Error logging in:', err);
      setLoginError('No se pudo establecer comunicación segura con el servidor de autenticación.');
    }
  };

  // Human Readable helpers
  const getSucursalName = (id: string) => {
    return mutableSucursales.find(s => s.id === id)?.nombre || id;
  };

  const getCategoriaName = (id: string) => {
    return mutableServicios.find(k => k.id === id)?.nombre || id;
  };

  const getSubServicioName = (id: string) => {
    for (const cat of mutableServicios) {
      const sub = cat.subServicios.find(s => s.id === id);
      if (sub) return sub.nombre;
    }
    return id;
  };

  // Filter appointments according to user role:
  // - Super Admin ('super'): sees everything
  // - Simple Admin ('sencillo'): sees only Organización Electoral, Cedulación (all except Pasados de Edad), and Registro Civil
  // - Extranjería ('extranjeria'): sees extranjeria records
  // - Pasado de Edad ('pasado_edad'): sees Pasado de Edad records
  const roleFilteredCitas = useMemo(() => {
    if (currentRole === 'super') return citas;
    if (currentRole === 'sencillo') {
      return citas.filter(cita => 
        cita.servicioCategoria === 'organizacion_electoral' ||
        cita.servicioCategoria === 'registro_civil' ||
        (cita.servicioCategoria === 'cedulacion' && cita.subServicioId !== 'ced_pasados_edad')
      );
    }
    if (currentRole.startsWith('extranjeria')) {
      return citas.filter(cita => 
        cita.servicioCategoria === 'extranjeria' || 
        cita.subServicioId?.includes('extranj') || 
        cita.subServicioId?.startsWith('ext_')
      );
    }
    if (currentRole.startsWith('pasado_edad')) {
      return citas.filter(cita => cita.subServicioId === 'ced_pasados_edad');
    }
    return citas;
  }, [citas, currentRole]);

  // Reactive subset for simple admin on selected date range
  const roleFilteredCitasForPeriod = useMemo(() => {
    return roleFilteredCitas.filter(cita => {
      if (!cita.fecha) return false;
      return cita.fecha >= adminStartDate && cita.fecha <= adminEndDate;
    });
  }, [roleFilteredCitas, adminStartDate, adminEndDate]);

  // PDF report downloader specifically for Simple Admin
  const handleDownloadSencilloPDF = () => {
    const listForPeriod = roleFilteredCitasForPeriod;

    if (listForPeriod.length === 0) {
      alert('No hay citas registradas en el intervalo seleccionado para descargar en PDF.');
      return;
    }

    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pageW = doc.internal.pageSize.getWidth();

    const primaryColor = [15, 23, 42]; // Slate 900
    const accentColor = [37, 99, 235]; // Blue 600

    let currentY = 15;

    const drawHeader = () => {
      // Top bar
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(10, currentY, pageW - 20, 10, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(10);
      doc.text('TRIBUNAL ELECTORAL DE PANAMÁ', 15, currentY + 6.5);

      // Section title
      currentY += 16;
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('REPORTE DE ATENCIÓN E INFORMES DE GESTIÓN (REPORTE DE CITAS)', 10, currentY);
      
      currentY += 6;
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      
      doc.text('Servicios: Organización Electoral, Cedulación y Registro Civil (Excluye Pasados de Edad)', 10, currentY);

      currentY += 5;
      doc.text(`Intervalo analizado: Desde ${adminStartDate} Hasta ${adminEndDate}  |  Fecha de emisión: ${new Date().toLocaleDateString('es-ES')} ${new Date().toLocaleTimeString('es-ES')}`, 10, currentY);

      // Accent divider line
      currentY += 4;
      doc.setDrawColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.setLineWidth(0.8);
      doc.line(10, currentY, pageW - 10, currentY);
      currentY += 8;
    };

    drawHeader();

    // Summary Box
    doc.setFillColor(248, 250, 252); // Slate 50
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.setLineWidth(0.25);
    doc.rect(10, currentY, pageW - 20, 28, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text('RESUMEN DE DESEMPEÑO Y CARGA OPERATIVA', 15, currentY + 6);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    
    const countConfirmadas = listForPeriod.filter(c => c.estado === 'confirmada' || c.estado === 'asistire').length;
    const countRealizadas = listForPeriod.filter(c => c.estado === 'realizada' || c.estado === 'completada').length;
    const countCanceladas = listForPeriod.filter(c => c.estado === 'cancelada' || c.estado === 'no_asistire').length;
    const countOtras = listForPeriod.length - (countConfirmadas + countRealizadas + countCanceladas);

    doc.text(`• Total Citas Registradas: ${listForPeriod.length}`, 15, currentY + 11);
    doc.text(`• Confirmadas: ${countConfirmadas}`, 55, currentY + 11);
    doc.text(`• Completadas: ${countRealizadas}`, 95, currentY + 11);
    doc.text(`• Canceladas/Otras: ${countCanceladas + countOtras}`, 140, currentY + 11);
    
    doc.text('Este reporte contiene métricas operativas confidenciales del flujo continuo de ciudadanos, conforme a directivas institucionales.', 15, currentY + 16.5);

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text('• GUÍA DE NOMENCLATURAS: ', 15, currentY + 22.5);
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('COMPLETADA (Atención realizada) | CONFIRMADA/ASISTIRE (Cupo reservado activo) | CANCELADA/NO ASISTIRÁ (Anulado)', 58, currentY + 22.5);

    currentY += 34;

    // Table Headers
    const drawTableHead = (y: number) => {
      doc.setFillColor(primaryColor[0], primaryColor[1], primaryColor[2]);
      doc.rect(10, y, pageW - 20, 7, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(8);
      
      doc.text('CÓDIGO/TX', 12, y + 4.8);
      doc.text('TRÁMITE / CATEGORÍA', 40, y + 4.8);
      doc.text('RECIPIENTE / SOLICITANTE', 85, y + 4.8);
      doc.text('CÉDULA / ID', 130, y + 4.8);
      doc.text('FECHA/HORA', 154, y + 4.8);
      doc.text('ESTATUS', pageW - 28, y + 4.8);
    };

    drawTableHead(currentY);
    currentY += 7;

    // Render Rows
    listForPeriod.forEach((c, index) => {
      if (currentY > 245) {
        doc.addPage();
        currentY = 15;
        drawHeader();
        drawTableHead(currentY);
        currentY += 7;
      }

      // Alternate row background
      if (index % 2 === 1) {
        doc.setFillColor(248, 250, 252);
        doc.rect(10, currentY, pageW - 20, 8, 'F');
      }

      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(7);

      const name = c.datosPersonales.nombreCompleto || 'N/D';
      
      const labelTx = c.codigoTransaccion.length > 13 ? c.codigoTransaccion.slice(0, 13) + '...' : c.codigoTransaccion;
      const labelCategory = getSubServicioName(c.subServicioId);
      const labelCategoryDisplay = labelCategory.length > 25 ? labelCategory.slice(0, 23) + '...' : labelCategory;
      const labelName = name.length > 24 ? name.slice(0, 22) + '...' : name;
      const labelId = c.datosPersonales.identificacion || 'N/D';
      
      doc.text(labelTx, 12, currentY + 5);
      doc.text(labelCategoryDisplay, 40, currentY + 5);
      doc.text(labelName, 85, currentY + 5);
      doc.text(labelId, 130, currentY + 5);
      doc.text(`${c.fecha} ${c.hora}`, 154, currentY + 5);
      
      let statusText = (c.estado || 'CONFIRMADA').toUpperCase();
      if (statusText === 'ASISTIRE') statusText = 'CONFIRMADA';
      if (statusText === 'NO_ASISTIRE') statusText = 'NO ASISTIRÁ';
      if (statusText === 'REALIZADA' || statusText === 'COMPLETADA' || statusText === 'ATENDIDO') statusText = 'COMPLETADA';

      if (statusText === 'CONFIRMADA' || statusText === 'COMPLETADA') {
        doc.setTextColor(16, 124, 65);
        doc.setFont('Helvetica', 'bold');
      } else if (statusText === 'NO ASISTIRÁ' || statusText === 'PENDIENTE' || statusText === 'EN ESPERA') {
        doc.setTextColor(180, 83, 9);
        doc.setFont('Helvetica', 'bold');
      } else {
        doc.setTextColor(185, 28, 28);
        doc.setFont('Helvetica', 'bold');
      }
      doc.text(statusText, pageW - 28, currentY + 5);

      doc.setDrawColor(241, 245, 249);
      doc.setLineWidth(0.1);
      doc.line(10, currentY + 8, pageW - 10, currentY + 8);

      currentY += 8;
    });

    doc.save(`reporte_gestion_sencillo_${adminStartDate}_a_${adminEndDate}.pdf`);
  };

  // Dynamic calculations for Stats dashboard
  const stats = useMemo(() => {
    const list = roleFilteredCitas;
    const total = list.length;
    const confirmadas = list.filter(c => c.estado === 'confirmada' || c.estado === 'asistire').length;
    const canceladas = list.filter(c => c.estado === 'cancelada' || c.estado === 'no_asistire').length;

    // By Category
    const porCategoria: Record<string, number> = {};
    // By Branch
    const porSucursal: Record<string, number> = {};

    list.forEach(c => {
      porCategoria[c.servicioCategoria] = (porCategoria[c.servicioCategoria] || 0) + 1;
      porSucursal[c.sucursalId] = (porSucursal[c.sucursalId] || 0) + 1;
    });

    return {
      total,
      confirmadas,
      canceladas,
      porCategoria,
      porSucursal
    };
  }, [roleFilteredCitas]);

  // Filtering filter logic
  const filteredCitas = useMemo(() => {
    return roleFilteredCitas.filter(cita => {
      // Search
      let extraText = '';
      if (cita.servicioCategoria === 'extranjeria') {
        extraText = ` ${cita.datosPersonales.primerNombre || ''} ${cita.datosPersonales.segundoNombre || ''} ${cita.datosPersonales.primerApellido || ''} ${cita.datosPersonales.segundoApellido || ''} ${cita.datosPersonales.pasaporte || ''} ${cita.datosPersonales.numeroResolucion || ''} ${cita.datosPersonales.nacionalidad || ''}`;
      } else {
        extraText = ` ${cita.datosPersonales.nombreCompleto || ''}`;
      }
      const text = `${cita.codigoTransaccion} ${cita.datosPersonales.identificacion} ${cita.datosPersonales.correo} ${cita.datosPersonales.telefono}${extraText}`.toLowerCase();
      const matchesSearch = text.includes(searchQuery.toLowerCase());

      // Category filter
      const matchesCategory = filterCategoria === 'Todos' || cita.servicioCategoria === filterCategoria;

      // Sucursal filter
      const matchesSucursal = filterSucursal === 'Todos' || cita.sucursalId === filterSucursal;

      // Status filter
      const matchesEstado = filterEstado === 'Todos' || cita.estado === filterEstado;

      return matchesSearch && matchesCategory && matchesSucursal && matchesEstado;
    });
  }, [roleFilteredCitas, searchQuery, filterCategoria, filterSucursal, filterEstado, mutableSucursales, mutableServicios]);

  // Select all checkboxes toggle
  const toggleSelectAll = () => {
    if (selectedCitaIds.length === filteredCitas.length) {
      setSelectedCitaIds([]);
    } else {
      setSelectedCitaIds(filteredCitas.map(c => c.id));
    }
  };

  const toggleSelectCita = (id: string) => {
    if (selectedCitaIds.includes(id)) {
      setSelectedCitaIds(selectedCitaIds.filter(selectedId => selectedId !== id));
    } else {
      setSelectedCitaIds([...selectedCitaIds, id]);
    }
  };

  // Save edits of standard or super admin
  const handleSaveEdit = () => {
    if (!editingCita) return;

    const isExtranjeria = editingCita.servicioCategoria === 'extranjeria' || 
                          editingCita.categoriaNombre?.toLowerCase().includes('extranj') || 
                          editingCita.subServicioId?.includes('extranj') || 
                          editingCita.subServicioId?.startsWith('ext_');

    const isTardia = editingCita.subServicioId === 'ced_pasados_edad' || 
                     editingCita.subServicioNombre?.toLowerCase().includes('pasado') || 
                     editingCita.subServicioNombre?.toLowerCase().includes('tardía');

    if (isExtranjeria || isTardia) {
      const typeStr = isExtranjeria ? 'Extranjería' : 'Pasados de Edad (VID)';
      if (!window.confirm(`¿Está seguro de los cambios para esta cita de ${typeStr}?`)) {
        return;
      }
    }

    const updated = citas.map((c) => {
      if (c.id === editingCita.id) {
        return {
          ...c,
          fecha: editFecha,
          hora: editHora,
          estado: editEstado,
          // Only if super admin allows editing personal data
          datosPersonales: currentRole === 'super' ? {
            ...c.datosPersonales,
            tipoIdentificacion: editTipoIdentificacion,
            identificacion: editIdentificacion,
            telefono: editTelefono,
            correo: editCorreo,
            nombreCompleto: editNombreCompleto.trim() || undefined
          } : c.datosPersonales
        };
      }
      return c;
    });

    onUpdateCitas(updated);
    setEditingCita(null);
  };

  // Action: Single Delete (Super Admin only)
  const handleDeleteCita = (id: string) => {
    if (window.confirm('¿Está completamente seguro de eliminar este registro permanentemente de la base de datos?')) {
      const updated = citas.filter(c => c.id !== id);
      onUpdateCitas(updated);
      setSelectedCitaIds(selectedCitaIds.filter(selectedId => selectedId !== id));
      if (editingCita?.id === id) {
        setEditingCita(null);
      }
    }
  };

  // Action: Bulk state cancel
  const handleBulkCancel = () => {
    if (selectedCitaIds.length === 0) return;
    const updated = citas.map(c => {
      if (selectedCitaIds.includes(c.id)) {
        return { ...c, estado: 'cancelada' as const };
      }
      return c;
    });
    onUpdateCitas(updated);
    setSelectedCitaIds([]);
  };

  // Action: Bulk state confirm
  const handleBulkConfirm = () => {
    if (selectedCitaIds.length === 0) return;
    const updated = citas.map(c => {
      if (selectedCitaIds.includes(c.id)) {
        return { ...c, estado: 'confirmada' as const };
      }
      return c;
    });
    onUpdateCitas(updated);
    setSelectedCitaIds([]);
  };

  // Action: Export Simulated CSV
  const handleExportCSV = () => {
    const headers = ['Código', 'Identificación', 'Tipo ID', 'Correo', 'Teléfono', 'Categoría', 'Trámite', 'Sede', 'Fecha', 'Hora', 'Estado'];
    const rows = filteredCitas.map(c => [
      c.codigoTransaccion,
      c.datosPersonales.identificacion,
      c.datosPersonales.tipoIdentificacion,
      c.datosPersonales.correo,
      c.datosPersonales.telefono,
      getCategoriaName(c.servicioCategoria),
      getSubServicioName(c.subServicioId),
      getSucursalName(c.sucursalId),
      c.fecha,
      c.hora,
      c.estado === 'confirmada' ? 'CONFIRMADA' : 'CANCELADA'
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.map(val => `"${val.replace(/"/g, '""')}"`).join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Citas_TE_Export_${new Date().toISOString().substring(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Open Edit Dialog
  const openEditDialog = (cita: Cita) => {
    setEditingCita(cita);
    setEditFecha(cita.fecha);
    setEditHora(cita.hora);
    setEditEstado(cita.estado);
    setEditTipoIdentificacion(cita.datosPersonales.tipoIdentificacion);
    setEditIdentificacion(cita.datosPersonales.identificacion);
    setEditTelefono(cita.datosPersonales.telefono);
    setEditCorreo(cita.datosPersonales.correo);
    setEditNombreCompleto(cita.datosPersonales.nombreCompleto || '');
  };

  // --- OPERATIONS FOR REGIONAL BRANCHES (AVAILABLE FOR ALL ADMINS) ---
  const handleOpenEditSucursal = (suc: Sucursal) => {
    setEditingSucursal(suc);
    setEditSucHorario(suc.horario);
    setEditSucNombre(suc.nombre);
    setEditSucDireccion(suc.direccion);
    setEditSucTelefono(suc.telefono);
  };

  const handleSaveSucursal = () => {
    if (!editingSucursal) return;
    const updated = mutableSucursales.map(s => {
      if (s.id === editingSucursal.id) {
        return {
          ...s,
          nombre: editSucNombre,
          direccion: editSucDireccion,
          telefono: editSucTelefono,
          horario: editSucHorario
        };
      }
      return s;
    });
    setMutableSucursales(updated);
    saveSucursalMutation(updated);
    setEditingSucursal(null);
  };

  const handleResetBranches = () => {
    if (window.confirm("¿Desea restablecer todas las sedes y horarios a los valores iniciales de fábrica?")) {
      localStorage.removeItem('TE_SUCURSALES');
      window.location.reload();
    }
  };

  // --- OPERATIONS FOR PROCEDURES/TRÁMITES (AVAILABLE FOR ALL ADMINS) ---
  const handleOpenCreateCategoria = () => {
    setIsCreatingCategoria(true);
    setEditingCategoria(null);
    setCatFormId('cedulacion');
    setCatFormNombre('');
    setCatFormDescripcion('');
    setCatFormIcono('IdCard');
  };

  const handleOpenEditCategoria = (cat: CategoriaServicio) => {
    setIsCreatingCategoria(false);
    setEditingCategoria(cat);
    setCatFormId(cat.id);
    setCatFormNombre(cat.nombre);
    setCatFormDescripcion(cat.descripcion);
    setCatFormIcono(cat.icono);
  };

  const handleSaveCategoria = () => {
    if (isCreatingCategoria) {
      const newCat: CategoriaServicio = {
        id: catFormId,
        nombre: catFormNombre,
        descripcion: catFormDescripcion,
        icono: catFormIcono,
        subServicios: []
      };
      
      if (mutableServicios.some(c => c.id === catFormId)) {
        alert("El ID único de la categoría ya existe.");
        return;
      }

      const updated = [...mutableServicios, newCat];
      setMutableServicios(updated);
      saveTramiteMutation(updated);
      setIsCreatingCategoria(false);
    } else if (editingCategoria) {
      const updated = mutableServicios.map(c => {
        if (c.id === editingCategoria.id) {
          return {
            ...c,
            nombre: catFormNombre,
            descripcion: catFormDescripcion,
            icono: catFormIcono
          };
        }
        return c;
      });
      setMutableServicios(updated);
      saveTramiteMutation(updated);
      setEditingCategoria(null);
    }
    setCatFormNombre('');
    setCatFormDescripcion('');
  };

  const handleDeleteCategoria = (id: ServicioCategoriaId) => {
    if (window.confirm("¿Está completamente seguro de eliminar esta categoría y todos sus trámites?")) {
      const updated = mutableServicios.filter(c => c.id !== id);
      setMutableServicios(updated);
      saveTramiteMutation(updated);
    }
  };

  const handleOpenCreateSubServicio = (catId: ServicioCategoriaId) => {
    setEditingSubServicioCatId(catId);
    setIsCreatingSubServicio(true);
    setEditingSubServicio(null);
    setSubFormId(`sub_${Date.now()}`);
    setSubFormNombre('');
    setSubFormDescripcion('');
    setSubFormRequisitos([]);
    setNewRequisitoText('');
  };

  const handleOpenEditSubServicio = (catId: ServicioCategoriaId, sub: SubServicio) => {
    setEditingSubServicioCatId(catId);
    setIsCreatingSubServicio(false);
    setEditingSubServicio(sub);
    setSubFormId(sub.id);
    setSubFormNombre(sub.nombre);
    setSubFormDescripcion(sub.descripcion);
    setSubFormRequisitos([...sub.requisitos]);
    setNewRequisitoText('');
  };

  const handleAddRequisito = () => {
    if (newRequisitoText.trim()) {
      setSubFormRequisitos([...subFormRequisitos, newRequisitoText.trim()]);
      setNewRequisitoText('');
    }
  };

  const handleRemoveRequisito = (index: number) => {
    setSubFormRequisitos(subFormRequisitos.filter((_, i) => i !== index));
  };

  const handleSaveSubServicio = () => {
    if (!editingSubServicioCatId) return;

    if (isCreatingSubServicio) {
      const newSub: SubServicio = {
        id: subFormId || `sub_${Date.now()}`,
        nombre: subFormNombre,
        descripcion: subFormDescripcion,
        requisitos: subFormRequisitos
      };

      const updated = mutableServicios.map(c => {
        if (c.id === editingSubServicioCatId) {
          if (c.subServicios.some(s => s.id === newSub.id)) {
            alert("El ID del trámite ya existe en esta categoría.");
            return c;
          }
          return {
            ...c,
            subServicios: [...c.subServicios, newSub]
          };
        }
        return c;
      });

      setMutableServicios(updated);
      saveTramiteMutation(updated);
      setIsCreatingSubServicio(false);
    } else if (editingSubServicio) {
      const updated = mutableServicios.map(c => {
        if (c.id === editingSubServicioCatId) {
          const updatedSubs = c.subServicios.map(s => {
            if (s.id === editingSubServicio.id) {
              return {
                ...s,
                nombre: subFormNombre,
                descripcion: subFormDescripcion,
                requisitos: subFormRequisitos
              };
            }
            return s;
          });
          return {
            ...c,
            subServicios: updatedSubs
          };
        }
        return c;
      });

      setMutableServicios(updated);
      saveTramiteMutation(updated);
      setEditingSubServicio(null);
    }

    setSubFormId('');
    setSubFormNombre('');
    setSubFormDescripcion('');
    setSubFormRequisitos([]);
    setNewRequisitoText('');
    setEditingSubServicioCatId(null);
  };

  const handleDeleteSubServicio = (catId: ServicioCategoriaId, subId: string) => {
    if (window.confirm("¿Está completamente seguro de eliminar este trámite del catálogo oficial? En adelante no se podrán agendar citas para el mismo.")) {
      const updated = mutableServicios.map(c => {
        if (c.id === catId) {
          return {
            ...c,
            subServicios: c.subServicios.filter(s => s.id !== subId)
          };
        }
        return c;
      });
      setMutableServicios(updated);
      saveTramiteMutation(updated);
    }
  };

  const handleResetTramites = () => {
    if (window.confirm("¿Desea restablecer todos los trámites y requisitos del sistema a los valores institucionales iniciales?")) {
      localStorage.removeItem('TE_SERVICIOS');
      window.location.reload();
    }
  };

  return (
    <div 
      id="admin-panel-container" 
      className={`text-slate-100 min-h-[600px] rounded-lg border shadow-2xl flex flex-col overflow-hidden theme-${eyeTheme} ${
        eyeTheme === 'slate' ? 'bg-slate-900 border-slate-700' : ''
      }`}
    >
      <style dangerouslySetInnerHTML={{ __html: `
        /* Warm Dark Theme Override (Carbón Cálido) */
        #admin-panel-container.theme-warm {
          background-color: #1a1615 !important;
          color: #f7ebe6 !important;
          border-color: #3b312f !important;
        }
        #admin-panel-container.theme-warm .bg-slate-950 {
          background-color: #120e0e !important;
        }
        #admin-panel-container.theme-warm .bg-slate-900 {
          background-color: #1a1615 !important;
        }
        #admin-panel-container.theme-warm .bg-slate-900\\/60 {
          background-color: rgba(26, 22, 21, 0.6) !important;
        }
        #admin-panel-container.theme-warm .bg-slate-850 {
          background-color: #241e1d !important;
        }
        #admin-panel-container.theme-warm .bg-slate-800 {
          background-color: #2d2624 !important;
        }
        #admin-panel-container.theme-warm .border-slate-800,
        #admin-panel-container.theme-warm .border-slate-700,
        #admin-panel-container.theme-warm .border-slate-850,
        #admin-panel-container.theme-warm .border-slate-900 {
          border-color: #3b312f !important;
        }
        #admin-panel-container.theme-warm .text-slate-400 {
          color: #b09f9a !important;
        }
        #admin-panel-container.theme-warm .text-slate-450 {
          color: #a08e89 !important;
        }
        #admin-panel-container.theme-warm .text-slate-300 {
          color: #dfcfca !important;
        }
        #admin-panel-container.theme-warm .text-slate-100 {
          color: #f7ebe6 !important;
        }
        #admin-panel-container.theme-warm .text-blue-400,
        #admin-panel-container.theme-warm .text-blue-300,
        #admin-panel-container.theme-warm .text-blue-500 {
          color: #f59e0b !important;
        }
        #admin-panel-container.theme-warm .bg-blue-600 {
          background-color: #d97706 !important;
        }
        #admin-panel-container.theme-warm .hover\\:bg-blue-700:hover,
        #admin-panel-container.theme-warm .bg-blue-700 {
          background-color: #b45309 !important;
        }

        /* Forest Green Dark Override (Descanso Visual) */
        #admin-panel-container.theme-forest {
          background-color: #0b150f !important;
          color: #e6f3eb !important;
          border-color: #223f2d !important;
        }
        #admin-panel-container.theme-forest .bg-slate-950 {
          background-color: #060d09 !important;
        }
        #admin-panel-container.theme-forest .bg-slate-900 {
          background-color: #0b150f !important;
        }
        #admin-panel-container.theme-forest .bg-slate-900\\/60 {
          background-color: rgba(11, 21, 15, 0.6) !important;
        }
        #admin-panel-container.theme-forest .bg-slate-850 {
          background-color: #112217 !important;
        }
        #admin-panel-container.theme-forest .bg-slate-800 {
          background-color: #172d1f !important;
        }
        #admin-panel-container.theme-forest .border-slate-800,
        #admin-panel-container.theme-forest .border-slate-700,
        #admin-panel-container.theme-forest .border-slate-850,
        #admin-panel-container.theme-forest .border-slate-900 {
          border-color: #223f2d !important;
        }
        #admin-panel-container.theme-forest .text-slate-400 {
          color: #98bfa7 !important;
        }
        #admin-panel-container.theme-forest .text-slate-450 {
          color: #83b194 !important;
        }
        #admin-panel-container.theme-forest .text-slate-300 {
          color: #c0decb !important;
        }
        #admin-panel-container.theme-forest .text-slate-100 {
          color: #e6f3eb !important;
        }
        #admin-panel-container.theme-forest .text-blue-400,
        #admin-panel-container.theme-forest .text-blue-300,
        #admin-panel-container.theme-forest .text-blue-500 {
          color: #10b981 !important;
        }
        #admin-panel-container.theme-forest .bg-blue-600 {
          background-color: #059669 !important;
        }
        #admin-panel-container.theme-forest .hover\\:bg-blue-700:hover,
        #admin-panel-container.theme-forest .bg-blue-700 {
          background-color: #047857 !important;
        }

        /* Sepia Soothing Warm (Filtro de Lectura Electrónica) */
        #admin-panel-container.theme-sepia {
          background-color: #f7ecd5 !important;
          color: #3b2f1e !important;
          border-color: #caa778 !important;
        }
        #admin-panel-container.theme-sepia .bg-slate-950 {
          background-color: #eadbb9 !important;
        }
        #admin-panel-container.theme-sepia .bg-slate-900 {
          background-color: #f7ecd5 !important;
        }
        #admin-panel-container.theme-sepia .bg-slate-900\\/60 {
          background-color: rgba(247, 236, 213, 0.6) !important;
        }
        #admin-panel-container.theme-sepia .bg-slate-850 {
          background-color: #e3d2ac !important;
        }
        #admin-panel-container.theme-sepia .bg-slate-800 {
          background-color: #dbc99f !important;
        }
        #admin-panel-container.theme-sepia .border-slate-800,
        #admin-panel-container.theme-sepia .border-slate-700,
        #admin-panel-container.theme-sepia .border-slate-850,
        #admin-panel-container.theme-sepia .border-slate-900 {
          border-color: #cda77d !important;
        }
        #admin-panel-container.theme-sepia .text-slate-400 {
          color: #7a634a !important;
        }
        #admin-panel-container.theme-sepia .text-slate-450 {
          color: #6a533a !important;
        }
        #admin-panel-container.theme-sepia .text-slate-305,
        #admin-panel-container.theme-sepia .text-slate-300 {
          color: #4b3a26 !important;
        }
        #admin-panel-container.theme-sepia .text-slate-100,
        #admin-panel-container.theme-sepia .text-slate-200,
        #admin-panel-container.theme-sepia .text-white {
          color: #2d2112 !important;
        }
        #admin-panel-container.theme-sepia .text-blue-400,
        #admin-panel-container.theme-sepia .text-blue-300,
        #admin-panel-container.theme-sepia .text-blue-500 {
          color: #8c5210 !important;
        }
        #admin-panel-container.theme-sepia .bg-blue-600 {
          background-color: #b75e14 !important;
          color: #ffffff !important;
        }
        #admin-panel-container.theme-sepia .hover\\:bg-blue-700:hover,
        #admin-panel-container.theme-sepia .bg-blue-700 {
          background-color: #924300 !important;
          color: #ffffff !important;
        }
        #admin-panel-container.theme-sepia select,
        #admin-panel-container.theme-sepia input,
        #admin-panel-container.theme-sepia textarea {
          background-color: #fcf6eb !important;
          color: #2d2112 !important;
          border-color: #caa778 !important;
        }

        /* Light Theme Override (Tema Claro de Alta Claridad) */
        #admin-panel-container.theme-light {
          background-color: #f8fafc !important; /* slate-50 */
          color: #0f172a !important; /* slate-900 */
          border-color: #cbd5e1 !important; /* slate-300 */
        }
        #admin-panel-container.theme-light .bg-slate-950 {
          background-color: #e2e8f0 !important; /* slate-200 */
        }
        #admin-panel-container.theme-light .bg-slate-900 {
          background-color: #f1f5f9 !important; /* slate-100 */
        }
        #admin-panel-container.theme-light .bg-slate-900\\/60 {
          background-color: rgba(241, 245, 249, 0.6) !important;
        }
        #admin-panel-container.theme-light .bg-slate-850 {
          background-color: #e2e8f0 !important;
        }
        #admin-panel-container.theme-light .bg-slate-800 {
          background-color: #cbd5e1 !important;
        }
        #admin-panel-container.theme-light .border-slate-800,
        #admin-panel-container.theme-light .border-slate-700,
        #admin-panel-container.theme-light .border-slate-850,
        #admin-panel-container.theme-light .border-slate-900 {
          border-color: #cbd5e1 !important;
        }
        #admin-panel-container.theme-light .text-slate-400 {
          color: #475569 !important; /* slate-600 */
        }
        #admin-panel-container.theme-light .text-slate-450 {
          color: #64748b !important; /* slate-500 */
        }
        #admin-panel-container.theme-light .text-slate-305,
        #admin-panel-container.theme-light .text-slate-300 {
          color: #334155 !important; /* slate-700 */
        }
        #admin-panel-container.theme-light .text-slate-100,
        #admin-panel-container.theme-light .text-slate-200,
        #admin-panel-container.theme-light .text-white {
          color: #0f172a !important; /* slate-900 */
        }
        #admin-panel-container.theme-light .text-blue-400,
        #admin-panel-container.theme-light .text-blue-300,
        #admin-panel-container.theme-light .text-blue-500 {
          color: #1d4ed8 !important; /* blue-700 */
        }
        #admin-panel-container.theme-light .bg-blue-600 {
          background-color: #2563eb !important;
          color: #ffffff !important;
        }
        #admin-panel-container.theme-light .hover\\:bg-blue-700:hover,
        #admin-panel-container.theme-light .bg-blue-700 {
          background-color: #1d4ed8 !important;
          color: #ffffff !important;
        }
        #admin-panel-container.theme-light select,
        #admin-panel-container.theme-light input,
        #admin-panel-container.theme-light textarea {
          background-color: #ffffff !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
        }
        #admin-panel-container.theme-light .bg-slate-950 select,
        #admin-panel-container.theme-light .bg-slate-950 input,
        #admin-panel-container.theme-light .bg-slate-950 textarea {
          background-color: #ffffff !important;
          color: #0f172a !important;
          border-color: #cbd5e1 !important;
        }
      ` }} />
      
      {/* HEADER BAR */}
      <div className="bg-slate-950 p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="bg-blue-900/50 p-2 rounded-lg border border-blue-500/30">
            <Shield className="w-6 h-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-base font-black uppercase tracking-wider text-white">Panel de Administración de Citas</h1>
            <p className="text-[10px] text-slate-400 font-medium">Control de agendas, validaciones y reportería del Tribunal Electoral</p>
          </div>
        </div>

        {isAdminLoggedIn && (
          <div className="flex flex-wrap items-center gap-2">
             {/* Role indicator label */}
             <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded border shadow-sm ${
               currentRole === 'super' 
                 ? 'bg-red-950 text-red-100 border-red-800' 
                 : currentRole.startsWith('extranjeria')
                   ? 'bg-amber-950 text-amber-100 border-amber-800'
                   : currentRole.startsWith('pasado_edad')
                     ? 'bg-blue-950 text-blue-100 border-blue-800'
                     : 'bg-emerald-950 text-emerald-100 border-emerald-800'
             }`}>
               Perfil: {
                 currentRole === 'super' ? '⚡ SUPER ADMIN' : 
                 currentRole === 'extranjeria_supervisor' ? '👑 SUPERVISOR EXTRANJERÍA' : 
                 currentRole === 'extranjeria_atencion' ? '📋 ATENCIÓN (ENTRADA) EXTRANJERÍA' : 
                 currentRole === 'extranjeria_cubiculo' ? '🖥️ CUBÍCULO (TICKET) EXTRANJERÍA' : 
                 currentRole === 'extranjeria' ? '🛂 ADMIN EXTRANJERÍA' : 
                 currentRole === 'pasado_edad_supervisor' ? '👑 SUPERVISOR SEGUIMIENTO IT' : 
                 currentRole === 'pasado_edad_admin' ? '📋 OPERADOR SEGUIMIENTO IT' : 
                 currentRole === 'pasado_edad' ? '🛡️ ADMINISTRADOR IT' : '👤 ADMIN SENCILLO'
               }
             </span>
 
             {/* Quick switcher during simulation */}
             <button
               onClick={() => {
                 const roles: AdminRole[] = ['sencillo', 'super', 'extranjeria_supervisor', 'extranjeria_atencion', 'extranjeria_cubiculo', 'extranjeria', 'pasado_edad_supervisor', 'pasado_edad_admin', 'pasado_edad'];
                 const nextRole = roles[(roles.indexOf(currentRole) + 1) % roles.length];
                 setCurrentRole(nextRole);
                 setEditingCita(null); // Clear editing to prevent profile mismatch
                 if (nextRole.startsWith('extranjeria')) {
                   setActiveSubTab('extranjeria');
                 } else if (nextRole.startsWith('pasado_edad')) {
                   setActiveSubTab('pasado_edad' as any);
                 } else {
                   setActiveSubTab('tabla');
                 }
               }}
               className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-[10px] font-bold px-2 py-1 rounded tracking-wide transition"
               title="Alternar perfiles para validar restricciones fácilmente"
             >
               Cambiar Perfil (Switch)
             </button>

            <button
              type="button"
              onClick={() => {
                sessionStorage.removeItem('admin_token');
                sessionStorage.removeItem('admin_role');
                sessionStorage.removeItem('admin_username');
                setIsAdminLoggedIn(false);
              }}
              className="bg-red-600 hover:bg-red-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-3 py-1 rounded transition"
            >
              Cerrar Sesión
            </button>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white p-1.5 rounded transition absolute right-4 top-4 md:static"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {!isAdminLoggedIn ? (
        /* LOGIN OR PROFILE SELECT PANEL */
        <div className="flex-1 flex flex-col items-center justify-center p-6 md:p-12 max-w-lg mx-auto w-full space-y-8">
          <div className="text-center space-y-2">
            <ShieldAlert className="w-14 h-14 text-blue-500 mx-auto" />
            <h2 className="text-lg font-black uppercase tracking-wider text-slate-100">Acceso Restringido y Seguro</h2>
            <p className="text-xs text-slate-450 leading-relaxed max-w-xs mx-auto">
              Ingrese sus credenciales autorizadas de administración para acceder a la plataforma de gestión.
            </p>
          </div>

          <form onSubmit={handleLoginSubmit} className="w-full bg-slate-950 p-6 rounded-lg border border-slate-800 space-y-4 shadow-xl">
            {loginError && (
              <div className="bg-red-950/80 border border-red-900 text-red-200 p-2.5 rounded text-[11px] font-semibold">
                ⚠ {loginError}
              </div>
            )}
            
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Usuario</label>
              <input
                type="text"
                placeholder="Ejemplo: AdminTE / AdminMini / adminPEdad / Migra26"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Contraseña</label>
              <input
                type="password"
                placeholder="Contraseña institucional segura"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs uppercase tracking-wider py-2 rounded transition shadow-md cursor-pointer"
            >
              Iniciar sesión institucional
            </button>
          </form>


        </div>
      ) : (
        /* MAIN ADMIN INTERFACE */
        <div className="flex-1 flex flex-col md:flex-row h-full">
          
          {/* SIDEBAR TABS */}
          <div className="w-full md:w-52 bg-slate-950 border-r border-slate-800 p-3 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-x-visible">
            {!currentRole.startsWith('extranjeria') && !currentRole.startsWith('pasado_edad') && (
              <>
                <button
                  onClick={() => setActiveSubTab('tabla')}
                  className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                    activeSubTab === 'tabla'
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <ClipboardList className="w-4 h-4 shrink-0" />
                  <span>Gestión de Citas</span>
                </button>

                {currentRole !== 'sencillo' && (
                  <>
                    <button
                      onClick={() => setActiveSubTab('horarios')}
                      className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                        activeSubTab === 'horarios'
                          ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                          : 'text-slate-400 hover:text-white border border-transparent'
                      }`}
                    >
                      <Clock className="w-4 h-4 shrink-0" />
                      <span>Horarios Regionales</span>
                    </button>

                    <button
                      onClick={() => setActiveSubTab('tramites')}
                      className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                        activeSubTab === 'tramites'
                          ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                          : 'text-slate-400 hover:text-white border border-transparent'
                      }`}
                    >
                      <Briefcase className="w-4 h-4 shrink-0" />
                      <span>Gestión de Trámites</span>
                    </button>
                  </>
                )}
              </>
            )}

            {!currentRole.startsWith('pasado_edad') && currentRole !== 'sencillo' && (
              <button
                onClick={() => setActiveSubTab('extranjeria')}
                className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                  activeSubTab === 'extranjeria'
                    ? 'bg-amber-600/15 text-amber-400 border border-amber-500/30 shadow-inner'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0 text-amber-500" />
                <span className="flex items-center gap-1">
                  <span>Carga Extranjería</span>
                  <span className="bg-amber-500/20 text-amber-300 px-1 rounded text-[9px] font-black border border-amber-500/30">CSV</span>
                </span>
              </button>
            )}

            {(currentRole.startsWith('pasado_edad') || currentRole === 'super') && (
              <button
                onClick={() => setActiveSubTab('pasado_edad' as any)}
                className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                  activeSubTab === 'pasado_edad'
                    ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                    : 'text-slate-400 hover:text-white border border-transparent'
                }`}
              >
                <Shield className="w-4 h-4 shrink-0" />
                <span>Generar Seguimiento</span>
              </button>
            )}

            {!currentRole.startsWith('extranjeria') && !currentRole.startsWith('pasado_edad') && (
              <>
                <button
                  onClick={() => setActiveSubTab('config')}
                  className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                    activeSubTab === 'config'
                      ? 'bg-blue-600/10 text-blue-400 border border-blue-500/30'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Settings className="w-4 h-4 shrink-0" />
                  <span>Configuración</span>
                </button>
              </>
            )}

            {currentRole === 'super' && (
              <>
                <button
                  type="button"
                  onClick={() => setActiveSubTab('usuarios')}
                  className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                    activeSubTab === 'usuarios'
                      ? 'bg-purple-600/15 text-purple-400 border border-purple-500/30'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Users className="w-4 h-4 shrink-0 text-purple-400" />
                  <span>Gestión Usuarios</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('pantalla')}
                  className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                    activeSubTab === 'pantalla'
                      ? 'bg-amber-600/15 text-amber-500 border border-amber-500/30 shadow-inner'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Tv className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>Pantalla de Turnos</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('cms' as any)}
                  className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                    activeSubTab === ('cms' as any)
                      ? 'bg-emerald-600/15 text-emerald-500 border border-emerald-500/30'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Edit3 className="w-4 h-4 shrink-0 text-emerald-500" />
                  <span>Editor de Contenidos (CMS)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setActiveSubTab('database')}
                  className={`flex-1 md:flex-initial flex items-center gap-2 px-3 py-2.5 rounded text-xs font-bold leading-none uppercase tracking-wide transition cursor-pointer text-left whitespace-nowrap ${
                    activeSubTab === 'database'
                      ? 'bg-emerald-600/15 text-emerald-500 border border-emerald-500/30 shadow-inner'
                      : 'text-slate-400 hover:text-white border border-transparent'
                  }`}
                >
                  <Database className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>Conector Supabase</span>
                </button>
              </>
            )}
            
            {!currentRole.startsWith('extranjeria') && !currentRole.startsWith('pasado_edad') && (
              <div className="hidden md:block mt-auto border-t border-slate-800 pt-3">
                <div className="bg-slate-900 border border-slate-800 p-2.5 rounded text-[10px] text-slate-400 font-mono leading-relaxed space-y-1">
                  <div role="presentation" className="text-slate-350 font-bold border-b border-slate-850 pb-1 flex items-center gap-1.5 uppercase">
                    <Sliders className="w-3 h-3 text-blue-500" />
                    <span>Configuración TE</span>
                  </div>
                  <div>Línea de Servicio: 311</div>
                  <div>Cupo Hora: {maxSlotsPerHour}</div>
                  <div>Regulación: PE 2026</div>
                </div>
              </div>
            )}
          </div>

          {/* MAIN PAGE AREA */}
          <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-6">

            {/* TAB CONTENT: TABLA (Gestión de Citas) */}
            {activeSubTab === 'tabla' && (
              <div className="space-y-4">
                
                {/* UNIFIED METRICS DASHBOARD & LOAD CONTROLLER */}
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 space-y-4 shadow-lg">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-900 pb-3">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                        <BarChart3 className="w-4.5 h-4.5 text-blue-400" />
                        <span>Centro de Monitoreo de Carga y Reportes Operativos</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">Análisis en tiempo real del flujo de ciudadanos por trámites, sucursales y generación de informes de carga en PDF</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowStatsInManagement(!showStatsInManagement)}
                      className="bg-slate-900 hover:bg-slate-850 text-slate-350 border border-slate-800 px-3 py-1.5 rounded text-[10.5px] font-extrabold uppercase tracking-wide flex items-center gap-1.5 cursor-pointer transition shadow"
                    >
                      {showStatsInManagement ? (
                        <>
                          <span className="inline-block w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
                          <span>Ocultar Métricas</span>
                        </>
                      ) : (
                        <>
                          <span className="inline-block w-2 h-2 rounded-full bg-slate-500"></span>
                          <span>Mostrar Métricas</span>
                        </>
                      )}
                    </button>
                  </div>

                  {showStatsInManagement && (
                    <div className="space-y-5">
                      {/* BENTO STATS CARDS */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 animate-fade-in">
                        <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-lg flex items-center justify-between shadow">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block">Citas Totales</span>
                            <span className="text-2xl font-black font-mono tracking-tight text-white">{stats.total}</span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded border border-slate-850">
                            <ClipboardList className="w-4 h-4 text-blue-400" />
                          </div>
                        </div>

                        <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-lg flex items-center justify-between shadow">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block">Activas Confirmadas</span>
                            <span className="text-2xl font-black font-mono tracking-tight text-emerald-400">{stats.confirmadas}</span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded border border-slate-850">
                            <CheckCircle className="w-4 h-4 text-emerald-400" />
                          </div>
                        </div>

                        <div className="bg-slate-900/60 border border-slate-850 p-3.5 rounded-lg flex items-center justify-between shadow">
                          <div className="space-y-0.5">
                            <span className="text-[9px] font-black text-slate-450 uppercase tracking-widest block">No Atendidas / Canceladas</span>
                            <span className="text-2xl font-black font-mono tracking-tight text-amber-500">{stats.canceladas}</span>
                          </div>
                          <div className="bg-slate-950 p-2 rounded border border-slate-850">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                          </div>
                        </div>
                      </div>

                      {/* PDF REPORTS DOWNLOAD CENTER */}
                      <div className="space-y-3 pt-1 border-t border-slate-900">
                        <div className="flex items-center gap-1.5 text-[10px] font-black uppercase text-slate-350 tracking-wider">
                          <Download className="w-3.5 h-3.5 text-blue-400" />
                          <span>Descarga de Informes de Gestión y Carga por Trámite (Formato PDF)</span>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          {/* 1. MIGRACIÓN / EXTRANJERÍA CARD */}
                          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-850 flex flex-col justify-between space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase text-amber-400 font-mono">Trámites Extranjería</span>
                                <span className="text-[8px] font-extrabold uppercase bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded border border-amber-500/20">MIGRACIÓN</span>
                              </div>
                              <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">Citas biométricas, toma de fotografía dactilar y validación de resoluciones de migración del SNM.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('extranjeria', 'dia')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-amber-400 border border-slate-800 hover:border-amber-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>📄 Diario</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('extranjeria', 'semana')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-amber-400 border border-slate-800 hover:border-amber-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>📅 Semanal</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('extranjeria', 'mes')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-amber-400 border border-slate-800 hover:border-amber-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>📊 Mensual</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('extranjeria', 'año')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-amber-400 border border-slate-800 hover:border-amber-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-amber-500 shrink-0" />
                                <span>🏛️ Anual</span>
                              </button>
                            </div>
                          </div>

                          {/* 2. REGISTRO CIVIL - PASADOS DE EDAD / VID */}
                          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-855 flex flex-col justify-between space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase text-blue-400 font-mono">Verificación VID / Pasados</span>
                                <span className="text-[8px] font-extrabold uppercase bg-blue-500/10 text-blue-400 px-2 py-0.5 rounded border border-blue-500/20">REGISTRO CIVIL</span>
                              </div>
                              <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">Citas para verificación de identidad biométrica presencial de ciudadanos panameños mayores de edad.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('tardia', 'dia')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-blue-400 border border-slate-800 hover:border-blue-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                                <span>📄 Diario</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('tardia', 'semana')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-blue-400 border border-slate-800 hover:border-blue-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                                <span>📅 Semanal</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('tardia', 'mes')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-blue-400 border border-slate-800 hover:border-blue-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                                <span>📊 Mensual</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('tardia', 'año')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-blue-400 border border-slate-800 hover:border-blue-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-blue-500 shrink-0" />
                                <span>🏛️ Anual</span>
                              </button>
                            </div>
                          </div>

                          {/* 3. ORGANIZACIÓN ELECTORAL */}
                          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-850 flex flex-col justify-between space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase text-purple-400 font-mono">Org. Electoral</span>
                                <span className="text-[8px] font-extrabold uppercase bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded border border-purple-500/20">ELEGIBLE</span>
                              </div>
                              <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">Cédulas de identidad, cambio de residencia electoral, registro de partidos, postulación y padrón electoral.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('organizacion_electoral', 'dia')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-purple-400 border border-slate-800 hover:border-purple-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-purple-500 shrink-0" />
                                <span>📄 Diario</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('organizacion_electoral', 'semana')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-purple-400 border border-slate-800 hover:border-purple-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-purple-500 shrink-0" />
                                <span>📅 Semanal</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('organizacion_electoral', 'mes')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-purple-400 border border-slate-800 hover:border-purple-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-purple-500 shrink-0" />
                                <span>📊 Mensual</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('organizacion_electoral', 'año')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-purple-400 border border-slate-800 hover:border-purple-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-purple-500 shrink-0" />
                                <span>🏛️ Anual</span>
                              </button>
                            </div>
                          </div>

                          {/* 4. CEDULACIÓN CARD */}
                          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-850 flex flex-col justify-between space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase text-sky-400 font-mono">Cedulación ordinaria</span>
                                <span className="text-[8px] font-extrabold uppercase bg-sky-500/10 text-sky-400 px-2 py-0.5 rounded border border-sky-500/20">CEDULACIÓN</span>
                              </div>
                              <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">Duplicados ordinarios presenciales, renovaciones por caducidad de vigencia ordinaria y cedulación juvenil.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('cedulacion', 'dia')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-sky-400 border border-slate-800 hover:border-sky-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-sky-550 shrink-0" />
                                <span>📄 Diario</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('cedulacion', 'semana')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-sky-400 border border-slate-800 hover:border-sky-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-sky-550 shrink-0" />
                                <span>📅 Semanal</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('cedulacion', 'mes')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-sky-400 border border-slate-800 hover:border-sky-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-sky-550 shrink-0" />
                                <span>📊 Mensual</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('cedulacion', 'año')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-sky-400 border border-slate-800 hover:border-sky-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-sky-550 shrink-0" />
                                <span>🏛️ Anual</span>
                              </button>
                            </div>
                          </div>

                          {/* 5. REGISTRO CIVIL CIVIL REGISTRY */}
                          <div className="bg-slate-900/50 p-4 rounded-lg border border-slate-850 flex flex-col justify-between space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase text-emerald-400 font-mono">Registro Civil Ordinario</span>
                                <span className="text-[8px] font-extrabold uppercase bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/20">REGISTRO CIVIL</span>
                              </div>
                              <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">Inscripciones y certificaciones de nacimientos, matrimonios ordinarios, defunciones, y cartas de soltería.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('registro_civil', 'dia')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span>📄 Diario</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('registro_civil', 'semana')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span>📅 Semanal</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('registro_civil', 'mes')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span>📊 Mensual</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('registro_civil', 'año')}
                                className="bg-slate-950 hover:bg-slate-850 hover:text-emerald-400 border border-slate-800 hover:border-emerald-500/20 text-slate-300 py-1.5 px-2 rounded text-[9.5px] font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Calendar className="w-3 h-3 text-emerald-500 shrink-0" />
                                <span>🏛️ Anual</span>
                              </button>
                            </div>
                          </div>

                          {/* 6. CONSOLIDADO UNIFICADO */}
                          <div className="bg-gradient-to-br from-slate-900/85 to-indigo-950/20 p-4 rounded-lg border border-slate-850 flex flex-col justify-between space-y-3">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between">
                                <span className="text-[11px] font-black uppercase text-indigo-400 font-mono">Consolidado general</span>
                                <span className="text-[8px] font-extrabold uppercase bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">UNIFICADO</span>
                              </div>
                              <p className="text-[10px] text-slate-450 leading-relaxed font-semibold">Integración general compilada con la totalidad de flujos, demanda y carga de todos los servicios del TE.</p>
                            </div>

                            <div className="grid grid-cols-2 gap-1.5 pt-1.5">
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('all', 'dia')}
                                className="bg-slate-950 hover:bg-slate-800 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/50 py-1.5 px-2 rounded text-[9.5px] font-black transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span>📄 Diario</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('all', 'semana')}
                                className="bg-slate-950 hover:bg-slate-800 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/50 py-1.5 px-2 rounded text-[9.5px] font-black transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span>📅 Semanal</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('all', 'mes')}
                                className="bg-slate-950 hover:bg-slate-800 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/50 py-1.5 px-2 rounded text-[9.5px] font-black transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span>📊 Mensual</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('all', 'año')}
                                className="bg-slate-950 hover:bg-slate-800 text-indigo-400 border border-indigo-500/20 hover:border-indigo-500/50 py-1.5 px-2 rounded text-[9.5px] font-black transition flex items-center justify-center gap-1 cursor-pointer"
                              >
                                <Download className="w-3 h-3 text-indigo-400 shrink-0" />
                                <span>🏛️ Anual</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* DISTRIBUTION CHARTS */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 border-t border-slate-900">
                        {/* Categories */}
                        <div className="bg-slate-900/35 border border-slate-850 p-4 rounded-lg space-y-3">
                          <span className="text-[10px] font-black text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                            <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                            Demanda por Categoría del Servicio
                          </span>
                          <div className="space-y-2 max-h-[160px] overflow-y-auto pr-1">
                            {mutableServicios.map(cat => {
                              const count = stats.porCategoria[cat.id] || 0;
                              const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                              return (
                                <div key={cat.id} className="space-y-0.5">
                                  <div className="flex justify-between text-[10px] text-slate-300 font-bold uppercase">
                                    <span>{cat.nombre}</span>
                                    <span className="font-mono text-slate-400">{percentage}% ({count})</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-950 rounded-full overflow-hidden border border-slate-900/60">
                                    <div 
                                      className="h-full bg-blue-500 transition-all duration-500" 
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        {/* Branches */}
                        <div className="bg-slate-900/35 border border-slate-850 p-4 rounded-lg space-y-3">
                          <span className="text-[10px] font-black text-slate-350 uppercase tracking-wider flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-blue-400" />
                            Carga de Atención por Sede Regional
                          </span>
                          <div className="space-y-2.5 max-h-[160px] overflow-y-auto pr-1">
                            {mutableSucursales.map(suc => {
                              const count = stats.porSucursal[suc.id] || 0;
                              const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                              if (count === 0) return null;
                              return (
                                <div key={suc.id} className="space-y-0.5 border-b border-slate-900 pb-1.5 last:border-b-0">
                                  <div className="flex justify-between text-[10px] text-slate-200">
                                    <span className="font-bold">{suc.nombre} ({suc.provincia})</span>
                                    <span className="font-mono text-emerald-400 font-extrabold">{percentage}% ({count})</span>
                                  </div>
                                  <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-emerald-500 transition-all duration-500" 
                                      style={{ width: `${percentage}%` }}
                                    />
                                  </div>
                                </div>
                              );
                            })}
                            {Object.keys(stats.porSucursal).length === 0 && (
                              <p className="text-[10px] italic text-slate-500 text-center py-4">Sin datos geográficos agendados por el momento.</p>
                            )}
                          </div>
                        </div>
                      </div>

                    </div>
                  )}
                </div>

                {/* ADVANCED FILTERING SECTION */}
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 space-y-3 shadow">
                  <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                    <span className="text-xs font-extrabold uppercase text-slate-350 tracking-wider flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5 text-blue-400" />
                      Filtros de Búsqueda
                    </span>
                    <span className="text-[10px] bg-slate-900 text-slate-400 px-2 py-0.5 rounded font-mono font-bold">
                      {filteredCitas.length} Registros Encontrados
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                    
                    {/* Live search input */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-slate-450 tracking-wider block">Búsqueda rápida</label>
                      <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-500" />
                        <input
                          type="text"
                          placeholder="Buscar cédula, código, correo..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="w-full bg-slate-900 border border-slate-755 text-slate-200 pl-8 pr-3 py-1.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 placeholder-slate-500 font-medium"
                        />
                      </div>
                    </div>

                    {/* Category Selector */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-slate-450 tracking-wider block">Categoría de trámite</label>
                      <select
                        value={filterCategoria}
                        onChange={(e) => setFilterCategoria(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-755 text-slate-200 py-1.5 px-2 rounded text-xs focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="Todos">Todos los Trámites</option>
                        {mutableServicios.map(col => (
                          <option key={col.id} value={col.id}>{col.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Sucursal Selector */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-slate-450 tracking-wider block">Sede Regional / Local</label>
                      <select
                        value={filterSucursal}
                        onChange={(e) => setFilterSucursal(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-755 text-slate-200 py-1.5 px-2 rounded text-xs focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="Todos">Todas las Sedes</option>
                        {mutableSucursales.map(s => (
                          <option key={s.id} value={s.id}>{s.nombre}</option>
                        ))}
                      </select>
                    </div>

                    {/* Status Selector */}
                    <div className="space-y-1">
                      <label className="text-[9px] font-extrabold uppercase text-slate-450 tracking-wider block">Estado de la Cita</label>
                      <select
                        value={filterEstado}
                        onChange={(e) => setFilterEstado(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-755 text-slate-200 py-1.5 px-2 rounded text-xs focus:outline-none cursor-pointer font-medium"
                      >
                        <option value="Todos">Todos los Estados</option>
                        <option value="confirmada">Confirmada</option>
                        <option value="cancelada">Cancelada</option>
                      </select>
                    </div>

                  </div>
                </div>

                {/* MASS ACTIONS & EXPORTS (Bulk operations) */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] uppercase font-extrabold text-slate-400">Acciones en Lote:</span>
                    {selectedCitaIds.length === 0 ? (
                      <span className="text-[10px] text-slate-550 italic">Seleccione casillas abajo para aplicar</span>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] bg-blue-900/40 text-blue-350 border border-blue-800/60 px-2 py-0.5 rounded font-black">
                          {selectedCitaIds.length} seleccionados
                        </span>
                        
                        <button
                          onClick={handleBulkConfirm}
                          className="bg-emerald-800/80 hover:bg-emerald-700 text-emerald-200 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded transition border border-emerald-700/45 shrink-0"
                          title="Confirmar citas seleccionadas"
                        >
                          Confirmar
                        </button>

                        <button
                          onClick={handleBulkCancel}
                          className="bg-amber-800/80 hover:bg-amber-700 text-amber-200 text-[9px] font-black uppercase tracking-wider px-2 py-1 rounded transition border border-amber-700/45 shrink-0"
                          title="Cancelar citas seleccionadas"
                        >
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={handleExportCSV}
                    disabled={filteredCitas.length === 0}
                    className="w-full sm:w-auto bg-slate-800 hover:bg-slate-750 text-slate-200 font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded transition flex items-center justify-center gap-1.5 border border-slate-700 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Exportar Registros a CSV</span>
                  </button>
                </div>

                {/* MASTER EXCEL TABLE GRID */}
                <div className="bg-slate-950 rounded-lg border border-slate-800 overflow-x-auto shadow-md">
                  <table className="w-full text-left" role="grid">
                    <thead>
                      <tr className="bg-slate-900 border-b border-slate-800 text-[10px] font-black uppercase tracking-widest text-slate-400">
                        <th className="p-3 w-10 text-center">
                          <input
                            type="checkbox"
                            checked={filteredCitas.length > 0 && selectedCitaIds.length === filteredCitas.length}
                            onChange={toggleSelectAll}
                            className="rounded cursor-pointer accent-blue-600 focus:ring-0"
                            aria-label="Seleccionar todos los registros de la página"
                          />
                        </th>
                        <th className="p-3">Código</th>
                        <th className="p-3">Identificación</th>
                        <th className="p-3">Trámite Técnico</th>
                        <th className="p-3">Sede Registrada</th>
                        <th className="p-3">Programación</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-850 text-xs font-semibold leading-relaxed">
                      {filteredCitas.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="p-8 text-center text-slate-450 italic font-medium">
                            No se encontraron citas bajo los parámetros especificados. Puede programar una nueva cita en el portal público.
                          </td>
                        </tr>
                      ) : (
                        filteredCitas.map((cit) => (
                          <tr key={cit.id} className="hover:bg-slate-900/60 transition-colors">
                            <td className="p-3 text-center">
                              <input
                                type="checkbox"
                                checked={selectedCitaIds.includes(cit.id)}
                                onChange={() => toggleSelectCita(cit.id)}
                                className="rounded cursor-pointer accent-blue-600"
                                aria-label={`Seleccionar cita ${cit.codigoTransaccion}`}
                              />
                            </td>
                            {/* CODE */}
                            <td className="p-3">
                              <span className="font-mono text-xs font-extrabold text-blue-400 bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-900/30">
                                {cit.codigoTransaccion}
                              </span>
                            </td>
                            
                            {/* CITIZEN INFO */}
                            <td className="p-3">
                              <div className="flex flex-col">
                                {cit.servicioCategoria === 'extranjeria' ? (
                                  <>
                                    <span className="text-[11px] font-extrabold text-blue-300 leading-tight">
                                      {[cit.datosPersonales.primerNombre, cit.datosPersonales.segundoNombre, cit.datosPersonales.primerApellido, cit.datosPersonales.segundoApellido].filter(Boolean).join(' ')}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-mono tracking-tight leading-tight mt-0.5">
                                      Pasaporte: <strong className="text-amber-200">{cit.datosPersonales.pasaporte}</strong> • {cit.datosPersonales.nacionalidad}
                                    </span>
                                    <span className="text-[9px] text-amber-500 font-bold leading-normal mt-1 bg-amber-950/30 border border-amber-900/30 px-1.5 py-0.5 rounded w-max">
                                      Res: {cit.datosPersonales.numeroResolucion} ({cit.datosPersonales.fechaResolucion})
                                    </span>
                                  </>
                                ) : (
                                  <>
                                    {cit.datosPersonales.nombreCompleto && (
                                      <span className="text-[11px] font-extrabold text-slate-200 leading-tight">
                                        {cit.datosPersonales.nombreCompleto.toUpperCase()}
                                      </span>
                                    )}
                                    <span className="font-mono text-[10px] font-bold text-slate-400 mt-0.5">
                                      {cit.datosPersonales.tipoIdentificacion === 'Cedula' ? 'Cédula' : cit.datosPersonales.tipoIdentificacion === 'CedulaJuvenil' ? 'Céd. Juvenil' : cit.datosPersonales.tipoIdentificacion === 'Extranjero' ? 'Céd. Ext' : 'Pasaporte'}: <span className="text-blue-300">{cit.datosPersonales.identificacion}</span>
                                    </span>
                                    <span className="text-[10px] text-slate-450 leading-tight">
                                      Tel: {cit.datosPersonales.telefono}
                                    </span>
                                    {cit.datosPersonales.numeroSeguimiento && (
                                      <span className="text-[10px] text-amber-400 font-mono font-bold leading-tight mt-0.5">
                                        Seg: {cit.datosPersonales.numeroSeguimiento}
                                      </span>
                                    )}
                                  </>
                                )}
                              </div>
                            </td>

                            {/* SERVICES info */}
                            <td className="p-3 max-w-[150px] truncate" title={getSubServicioName(cit.subServicioId)}>
                              <div className="flex flex-col">
                                <span className="text-[11px] font-bold text-slate-300">
                                  {getSubServicioName(cit.subServicioId)}
                                </span>
                                <span className="text-[9px] uppercase font-black text-slate-500 tracking-wider">
                                  {getCategoriaName(cit.servicioCategoria)}
                                </span>
                              </div>
                            </td>

                            {/* LOCATION / SUCURSAL */}
                            <td className="p-3">
                              <span className="text-slate-350 text-[11px] font-medium block max-w-[120px] truncate" title={getSucursalName(cit.sucursalId)}>
                                {getSucursalName(cit.sucursalId)}
                              </span>
                            </td>

                            {/* DATE TIME STAMP */}
                            <td className="p-3">
                              <div className="flex flex-col text-[11px]">
                                <span className="font-mono text-slate-300 flex items-center gap-1">
                                  <Calendar className="w-3 h-3 text-slate-450" />
                                  {cit.fecha}
                                </span>
                                <span className="font-mono text-slate-400 font-medium flex items-center gap-1">
                                  <Clock className="w-3 h-3 text-slate-450" />
                                  {cit.hora}
                                </span>
                              </div>
                            </td>

                            {/* STATUS BADGE */}
                            <td className="p-3 text-center">
                              <span className={`text-[10px] font-black uppercase inline-block px-2 py-0.5 rounded tracking-wider shadow-sm border ${
                                cit.estado === 'confirmada'
                                  ? 'bg-emerald-950/70 text-emerald-400 border-emerald-900/60'
                                  : cit.estado === 'asistire'
                                    ? 'bg-blue-950/80 text-blue-400 border-blue-900/60'
                                    : cit.estado === 'no_asistire'
                                      ? 'bg-orange-950/70 text-orange-400 border-orange-900/60'
                                      : 'bg-red-950/70 text-red-400 border-red-900/60'
                              }`}>
                                {cit.estado === 'confirmada' 
                                  ? 'Reservada' 
                                  : cit.estado === 'asistire' 
                                    ? '✓ Asistirá' 
                                    : cit.estado === 'no_asistire' 
                                      ? '✗ No Asistirá' 
                                      : 'Cancelada'}
                              </span>
                            </td>

                            {/* INDIVIDUAL ACTIONS BLOCK */}
                            <td className="p-3 text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => openEditDialog(cit)}
                                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 p-1 rounded transition"
                                  title="Editar parámetros de la cita"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>

                                {currentRole === 'super' ? (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCita(cit.id)}
                                    className="bg-red-950 hover:bg-red-900 text-red-400 border border-red-900/60 p-1 rounded transition"
                                    title="Eliminar permanentemente del registro"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    disabled
                                    className="bg-slate-850 text-slate-600 border border-slate-800 p-1 rounded cursor-not-allowed opacity-40"
                                    title="Requiere perfil SUPER ADMIN para borrar del historial"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

              </div>
            )}

            {/* TAB CONTENT: STATS (REDUNDANTE - Unificado en pestaña Gestión de Citas) */}
            {false && (
              <div className="space-y-6">
                
                {/* METRICS ROW BENTO BOX - HIGHLY STYLISH */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  
                  {/* METRIC 1: TOTAL */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex items-center justify-between shadow-md">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Citas Totales</span>
                      <span className="text-3xl font-black font-mono tracking-tight text-white">{stats.total}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                      <ClipboardList className="w-5 h-5 text-blue-400" />
                    </div>
                  </div>

                  {/* METRIC 2: CONFIRMADAS */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex items-center justify-between shadow-md">
                    <div className="space-y-1 block">
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Activas Confirmadas</span>
                      <span className="text-3xl font-black font-mono tracking-tight text-emerald-400">{stats.confirmadas}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                      <CheckCircle className="w-5 h-5 text-emerald-400" />
                    </div>
                  </div>

                  {/* METRIC 3: CANCELADAS */}
                  <div className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex items-center justify-between shadow-md">
                    <div className="space-y-1">
                      <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">No Atendidas / Canceladas</span>
                      <span className="text-3xl font-black font-mono tracking-tight text-amber-500">{stats.canceladas}</span>
                    </div>
                    <div className="bg-slate-900 p-2.5 rounded border border-slate-800">
                      <AlertCircle className="w-5 h-5 text-amber-500" />
                    </div>
                  </div>

                </div>

                {/* DISTRIBUTION CHARTS OR BARS */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* CATEGORIES DEMAND PROGRESS BARS */}
                  <div className="bg-slate-950 rounded-lg border border-slate-800 p-5 shadow space-y-4">
                    <div className="border-b border-slate-900 pb-2.5">
                      <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                        <Briefcase className="w-4 h-4 text-blue-400" />
                        <span>Demanda de Trámites Públicos</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">Distribución porcentual por categorías del Registro del Estado Civil</p>
                    </div>

                    <div className="space-y-4">
                      {mutableServicios.map(cat => {
                        const count = stats.porCategoria[cat.id] || 0;
                        const percentage = stats.total > 0 ? Math.round((count / stats.total) * 105) / 1.05 : 0;
                        return (
                          <div key={cat.id} className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-300 font-extrabold uppercase tracking-wide">
                              <span>{cat.nombre}</span>
                              <span className="font-mono text-slate-400">{percentage}% ({count})</span>
                            </div>
                            <div className="w-full h-2 bg-slate-900 rounded-full border border-slate-800 overflow-hidden">
                              <div 
                                className="h-full bg-blue-500 transition-all duration-500" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {stats.total === 0 && (
                        <p className="text-xs italic text-slate-450 p-4 text-center">Sin datos de transacciones agendadas aún en el sistema.</p>
                      )}
                    </div>
                  </div>

                  {/* BRANCH OFFICES ACTIVITY PROGRESS BARS */}
                  <div className="bg-slate-950 rounded-lg border border-slate-800 p-5 shadow space-y-4">
                    <div className="border-b border-slate-900 pb-2.5">
                      <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                        <Building className="w-4 h-4 text-blue-400" />
                        <span>Capacidad por Oficina y Provincia</span>
                      </h3>
                      <p className="text-[10px] text-slate-400 font-medium">Actividad registrada en las Direcciones Regionales activas</p>
                    </div>

                    <div className="space-y-2.5 max-h-[290px] overflow-y-auto pr-1">
                      {mutableSucursales.map(suc => {
                        const count = stats.porSucursal[suc.id] || 0;
                        const percentage = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                        if (count === 0) return null; // Only show active branches with data for layout hygiene
                        return (
                          <div key={suc.id} className="space-y-1 border-b border-slate-900 pb-2">
                            <div className="flex justify-between text-[11px] text-slate-200">
                              <span className="font-bold">{suc.nombre} ({suc.provincia})</span>
                              <span className="font-mono text-blue-400 font-extrabold">{percentage}% ({count} citas)</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden">
                              <div 
                                className="h-full bg-emerald-500 transition-all duration-500" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                      {Object.keys(stats.porSucursal).length === 0 && (
                        <p className="text-xs italic text-slate-450 p-4 text-center">Sin citas activas en ninguna dirección regional por el momento.</p>
                      )}
                    </div>
                  </div>

                </div>

                {/* PANEL DE ANÁLISIS DE CARGA DE EXTRANJERÍA E VID - PASADOS DE EDAD (Solo para Super, Extranjería y Pasado de Edad) */}
                {currentRole !== 'sencillo' && (
                  <div id="analisis_carga_especial" className="bg-slate-950 rounded-lg border border-slate-800 p-5 mt-6 shadow-xl space-y-5">
                    <div className="border-b border-slate-900 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-0.5">
                        <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                          <Clock className="w-4 h-4 text-amber-500" />
                          <span>Métricas de Carga: Extranjería y Verificación de Identidad (VID)</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">Análisis detallado de demanda operativa regulada con descarga de reportes oficiales</p>
                      </div>
                      
                      {/* Period selectors */}
                      <div className="flex flex-wrap items-center gap-1">
                        {(['dia', 'semana', 'mes', 'año', 'todo'] as const).map((period) => (
                          <button
                            key={`period-${period}`}
                            type="button"
                            onClick={() => setMetricPeriod(period)}
                            className={`px-3 py-1 rounded text-[9px] font-black uppercase tracking-wider border transition cursor-pointer ${
                              metricPeriod === period
                                ? 'bg-amber-600 border-amber-600 text-white shadow-md'
                                : 'bg-slate-900/50 border-slate-800 text-slate-400 hover:text-slate-300'
                            }`}
                          >
                            {period === 'dia' && 'Día'}
                            {period === 'semana' && 'Semana'}
                            {period === 'mes' && 'Mes'}
                            {period === 'año' && 'Año'}
                            {period === 'todo' && 'Histórico'}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Calculations */}
                    {(() => {
                      const filteredCitasForCard = (type: 'extranjeria' | 'tardia') => {
                        return citas.filter(c => {
                          const isExt = c.servicioCategoria === 'extranjeria' || c.subServicioId?.includes('extranj') || c.subServicioId?.startsWith('ext_');
                          const isTd = c.subServicioId === 'ced_pasados_edad';
                          
                          if (type === 'extranjeria' && !isExt) return false;
                          if (type === 'tardia' && !isTd) return false;
                          
                          if (metricPeriod === 'todo') return true;
                          try {
                            const now = new Date();
                            const refDate = new Date(c.fecha + 'T00:00:00');
                            if (metricPeriod === 'dia') {
                              const year = now.getFullYear();
                              const month = String(now.getMonth() + 1).padStart(2, '0');
                              const day = String(now.getDate()).padStart(2, '0');
                              return c.fecha === `${year}-${month}-${day}`;
                            }
                            if (metricPeriod === 'semana') {
                              const currentDay = now.getDay();
                              const distanceToMonday = currentDay === 0 ? 6 : currentDay - 1;
                              const monday = new Date(now);
                              monday.setDate(now.getDate() - distanceToMonday);
                              monday.setHours(0,0,0,0);
                              const sunday = new Date(monday);
                              sunday.setDate(monday.getDate() + 6);
                              sunday.setHours(23,59,59,999);
                              return refDate >= monday && refDate <= sunday;
                            }
                            if (metricPeriod === 'mes') {
                              return refDate.getMonth() === now.getMonth() && refDate.getFullYear() === now.getFullYear();
                            }
                            if (metricPeriod === 'año') {
                              return refDate.getFullYear() === now.getFullYear();
                            }
                          } catch (e) { return false; }
                          return false;
                        });
                      };

                      const extCitas = filteredCitasForCard('extranjeria');
                      const tardiaCitas = filteredCitasForCard('tardia');
                      const totalCitasCarga = extCitas.length + tardiaCitas.length;

                      return (
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            
                            {/* CARD 1: EXTRANJERÍA */}
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-3 shadow flex flex-col justify-between">
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Trámites Migratorios</span>
                                  <span className="text-[9px] font-bold bg-amber-950/60 border border-amber-900 text-amber-400 px-2.5 py-0.5 rounded-full uppercase">
                                    Extranjería
                                  </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-4xl font-mono font-black text-slate-100">{extCitas.length}</span>
                                  <span className="text-[11px] text-slate-455 font-medium">citas agendadas</span>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                                  Carga de atención para toma de fotografía, biometría dactilar y validación de resoluciones de migración aprobadas por el SNM.
                                </p>
                                
                                {/* Visual Mini Progress Bar */}
                                <div className="space-y-1 pt-1">
                                  <div className="flex justify-between text-[9px] text-slate-505 font-extrabold uppercase">
                                    <span>Proporción de carga</span>
                                    <span>{totalCitasCarga > 0 ? Math.round((extCitas.length / totalCitasCarga) * 100) : 0}%</span>
                                  </div>
                                  <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-amber-500 transition-all duration-500" 
                                      style={{ width: `${totalCitasCarga > 0 ? (extCitas.length / totalCitasCarga) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 mt-3">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadMetricsReport('extranjeria')}
                                  className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-2 rounded text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition text-center"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                  <span>CSV ({extCitas.length})</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadMetricsPDFReport('extranjeria')}
                                  className="bg-slate-950 hover:bg-slate-850 text-amber-500 border border-amber-500/20 px-3 py-2 rounded text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition text-center"
                                >
                                  <Download className="w-3.5 h-3.5 shrink-0" />
                                  <span>PDF ({extCitas.length})</span>
                                </button>
                              </div>
                            </div>

                            {/* CARD 2: VID - PASADOS DE EDAD */}
                            <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg space-y-3 shadow flex flex-col justify-between">
                              <div className="space-y-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-[10px] font-black text-slate-450 uppercase tracking-widest block">Registro Civil Especial</span>
                                  <span className="text-[9px] font-bold bg-blue-950/50 border border-blue-900/60 text-blue-400 px-2.5 py-0.5 rounded-full uppercase">
                                    Pasados de Edad (VID)
                                  </span>
                                </div>
                                <div className="flex items-baseline gap-2">
                                  <span className="text-4xl font-mono font-black text-slate-100">{tardiaCitas.length}</span>
                                  <span className="text-[11px] text-slate-455 font-medium">citas agendadas</span>
                                </div>
                                <p className="text-[10px] text-slate-400 leading-relaxed font-semibold">
                                  Verificación de identidad presencial para ciudadanos panameños mayores de edad (Pasados de Edad) con cupos limitados por resoluciones biométricas.
                                </p>
                                
                                {/* Visual Mini Progress Bar */}
                                <div className="space-y-1 pt-1">
                                  <div className="flex justify-between text-[9px] text-slate-505 font-extrabold uppercase">
                                    <span>Proporción de carga</span>
                                    <span>{totalCitasCarga > 0 ? Math.round((tardiaCitas.length / totalCitasCarga) * 100) : 0}%</span>
                                  </div>
                                  <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                                    <div 
                                      className="h-full bg-blue-500 transition-all duration-500" 
                                      style={{ width: `${totalCitasCarga > 0 ? (tardiaCitas.length / totalCitasCarga) * 100 : 0}%` }}
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2 mt-3">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadMetricsReport('tardia')}
                                  className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 px-3 py-2 rounded text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition text-center"
                                >
                                  <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                                  <span>CSV ({tardiaCitas.length})</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDownloadMetricsPDFReport('tardia')}
                                  className="bg-slate-950 hover:bg-slate-855 text-blue-400 border border-blue-500/20 px-3 py-2 rounded text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 cursor-pointer transition text-center"
                                >
                                  <Download className="w-3.5 h-3.5 shrink-0" />
                                  <span>PDF ({tardiaCitas.length})</span>
                                </button>
                              </div>
                            </div>

                          </div>

                          {/* General Consolidate downloads */}
                          <div className="bg-slate-900/40 p-3 rounded-lg border border-slate-900 flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-slate-300">
                            <div className="text-[11px] font-medium">
                              Se encontraron <strong className="text-white">{totalCitasCarga} citas activas</strong> de tipo Extranjería y Verificación de Identidad (VID) para el período <strong className="text-amber-500 uppercase font-mono">{metricPeriod}</strong>.
                            </div>
                            
                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsReport('all')}
                                className="bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 font-extrabold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition shadow flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <FileSpreadsheet className="w-3.5 h-3.5 text-amber-500" />
                                <span>Descargar CSV Consolidado</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDownloadMetricsPDFReport('all')}
                                className="bg-gradient-to-r from-amber-600 to-blue-600 hover:from-amber-700 hover:to-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-2 rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                              >
                                <Download className="w-3.5 h-3.5" />
                                <span>Descargar PDF Consolidado</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* NUEVO: PANEL DE REPORTE DE ATENCIÓN E INFORMES DE GESTIÓN (Exclusivo para Administrador Sencillo) */}
                {currentRole === 'sencillo' && (
                  <div id="atencion_informes_sencillo" className="bg-slate-950 rounded-lg border border-slate-800 p-5 mt-6 shadow-xl space-y-5 animate-fade-in text-left">
                    <div className="border-b border-slate-900 pb-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                      <div className="space-y-0.5">
                        <h3 className="text-xs font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                          <BarChart3 className="w-4 h-4 text-blue-500" />
                          <span>REPORTE DE ATENCIÓN E INFORMES DE GESTIÓN</span>
                        </h3>
                        <p className="text-[10px] text-slate-400 font-medium">Genere y descargue reportes oficiales de atencion en formato PDF con métricas del flujo continuo de ciudadanos, tiempos en sala de espera y eficiencias de los agentes.</p>
                      </div>
                    </div>

                    <div className="bg-slate-900/40 p-4 rounded-lg border border-slate-850 space-y-4">
                      {/* Date Range Selectors */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                            Intervalo de Fecha Desde
                          </label>
                          <input
                            type="date"
                            value={adminStartDate}
                            onChange={(e) => setAdminStartDate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500 transition"
                          />
                        </div>
                        
                        <div className="space-y-1">
                          <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block font-mono">
                            Intervalo de Fecha Hasta
                          </label>
                          <input
                            type="date"
                            value={adminEndDate}
                            onChange={(e) => setAdminEndDate(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-blue-500 transition"
                          />
                        </div>
                      </div>

                      {/* Summary & Download Button row */}
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-4 border-t border-slate-850/60 text-slate-300">
                        <div className="space-y-0.5 text-left">
                          <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block">Resumen de Métricas de Trámites Generales</span>
                          <p className="text-[11px] font-semibold text-slate-200">
                            Citas encontradas en el intervalo seleccionado: <span className="text-white font-mono font-bold bg-slate-900 px-2 py-0.5 rounded border border-slate-800 ml-1">{roleFilteredCitasForPeriod.length} citas</span>
                          </p>
                        </div>
                        
                        <button
                          type="button"
                          onClick={handleDownloadSencilloPDF}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider px-5 py-2.5 rounded-lg transition shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <Download className="w-4 h-4" />
                          <span>DESCARGAR REPORTE PDF</span>
                        </button>
                      </div>
                    </div>
                  </div>
                )}

              </div>
            )}

            {/* TAB CONTENT: CONFIG (Configuración del Sistema) */}
            {activeSubTab === 'config' && (
              <div className="space-y-6">
                
                {/* CORE SETTINGS BLOCK */}
                <div className="bg-slate-950 rounded-lg border border-slate-800 p-5 space-y-4 shadow-md max-w-2xl">
                  
                  <div className="border-b border-slate-900 pb-2.5 flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-blue-400" />
                    <div>
                      <h3 className="text-xs font-black uppercase text-white tracking-wider">Parámetros Operativos del Sistema</h3>
                      <p className="text-[10px] text-slate-400">Control de alertas, cupos temporales y flujos biométricos</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    
                    {/* SLOTS CAPACITY CONTROL */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-900 p-3 rounded border border-slate-800">
                      <div>
                        <span className="text-[11px] font-extrabold uppercase text-slate-250 block">Capacidad de Atención Regular</span>
                        <span className="text-[10px] text-slate-450">Slots o turnos electrónicos disponibles por cada hora</span>
                      </div>
                      
                      {currentRole === 'super' ? (
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setMaxSlotsPerHour(Math.max(1, maxSlotsPerHour - 1))}
                            className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded border border-slate-700 hover:bg-slate-700 transition font-black"
                          >
                            -
                          </button>
                          <span className="font-mono text-xs font-black w-10 text-center text-white">{maxSlotsPerHour}</span>
                          <button 
                            onClick={() => setMaxSlotsPerHour(maxSlotsPerHour + 1)}
                            className="bg-slate-800 text-slate-200 text-xs px-2.5 py-1 rounded border border-slate-700 hover:bg-slate-700 transition font-black"
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs font-mono font-bold text-slate-400 bg-slate-950 px-3 py-1.5 rounded border border-slate-800" title="Requiere SUPER ADMIN para editar">
                          {maxSlotsPerHour} turnos (Bloqueado)
                        </div>
                      )}
                    </div>

                    {/* EMAIL OUTBOUND TOGGLE */}
                    <div className="flex items-center justify-between gap-3 bg-slate-900 p-3 rounded border border-slate-800">
                      <div>
                        <span className="text-[11px] font-extrabold uppercase text-slate-250 block">Correos de Confirmación Automatizados</span>
                        <span className="text-[10px] text-slate-450">Envío masivo con el código de barra QR para verificación</span>
                      </div>
                      <input
                        type="checkbox"
                        disabled={currentRole !== 'super'}
                        checked={enableEmailAlerts}
                        onChange={(e) => setEnableEmailAlerts(e.target.checked)}
                        className="rounded cursor-pointer accent-blue-600 w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {/* PASADO DE EDAD LINK BASE CUSTOMIZATION */}
                    <div className="flex flex-col gap-2.5 bg-slate-900 p-3 rounded border border-slate-800">
                      <div>
                        <span className="text-[11px] font-extrabold uppercase text-slate-250 block">Enlace Base de Agendamiento (Pasados de Edad)</span>
                        <span className="text-[10px] text-slate-450">URL base donde se redirigirá a los ciudadanos con su número de seguimiento pre-cargado</span>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          disabled={currentRole !== 'super'}
                          value={pasadoEdadLinkBase}
                          onChange={(e) => setPasadoEdadLinkBase(e.target.value)}
                          placeholder="Ej: https://citas.tribunal.gob.pa"
                          className="flex-1 bg-slate-950 border border-slate-800 text-slate-200 p-2 rounded text-xs px-3 focus:outline-none focus:border-blue-650 font-mono disabled:opacity-50"
                        />
                        {currentRole === 'super' && (
                          <button
                            type="button"
                            onClick={() => {
                              try {
                                localStorage.setItem('te_panama_pasado_edad_link_base', pasadoEdadLinkBase.trim());
                                alert('El enlace base para el trámite de Pasado de Edad ha sido guardado exitosamente.');
                              } catch (err) {
                                alert('Error al guardar el enlace base.');
                              }
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2 rounded transition shrink-0 cursor-pointer"
                          >
                            Guardar
                          </button>
                        )}
                      </div>
                      <div className="text-[9.5px] text-blue-400 bg-blue-950/20 p-2 rounded border border-blue-900/10 font-mono leading-relaxed">
                        <span className="font-extrabold text-blue-300 block uppercase mb-0.5">Enlace Resultante de Ejemplo:</span>
                        {pasadoEdadLinkBase.trim().endsWith('/') ? pasadoEdadLinkBase.trim().slice(0, -1) : pasadoEdadLinkBase.trim()}/?tramite=ced_pasados_edad&seguimiento=Nº26-123-456
                      </div>
                    </div>


                    {/* COLOR THEME PERSONALIZATION FOR EYE PROTECTION */}
                    <div className="flex flex-col gap-3 bg-slate-900/60 p-4 rounded-lg border border-slate-800">
                      <div>
                        <span className="text-[11px] font-extrabold uppercase text-slate-250 block">Personalización de Tema (Protección de Vista)</span>
                        <span className="text-[10.5px] text-slate-450">Seleccione un espectro de color optimizado para reducir la fatiga ocular y proteger su vista durante largas jornadas de trabajo</span>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 pt-1">
                        <button
                          type="button"
                          onClick={() => {
                            setEyeTheme('slate');
                            try { localStorage.setItem('admin_eye_theme', 'slate'); } catch(e){}
                          }}
                          className={`p-3 rounded border text-left cursor-pointer transition flex flex-col justify-between ${
                            eyeTheme === 'slate'
                              ? 'bg-blue-950/40 border-blue-500 text-blue-400'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-750 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-[10px] font-black block uppercase tracking-wide">Azul Slate</span>
                          <span className="text-[9px] text-slate-500 block pt-1.5 leading-relaxed">Predeterminado Institucional</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEyeTheme('warm');
                            try { localStorage.setItem('admin_eye_theme', 'warm'); } catch(e){}
                          }}
                          className={`p-3 rounded border text-left cursor-pointer transition flex flex-col justify-between ${
                            eyeTheme === 'warm'
                              ? 'bg-amber-950/20 border-amber-500 text-amber-500'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-750 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-[10px] font-black block uppercase tracking-wide">Filtro Cálido</span>
                          <span className="text-[9px] text-slate-500 block pt-1.5 leading-relaxed">Carbón Cálido sin Luz Azul</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEyeTheme('forest');
                            try { localStorage.setItem('admin_eye_theme', 'forest'); } catch(e){}
                          }}
                          className={`p-3 rounded border text-left cursor-pointer transition flex flex-col justify-between ${
                            eyeTheme === 'forest'
                              ? 'bg-emerald-950/30 border-emerald-500 text-emerald-400'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-750 text-slate-400 hover:text-slate-200'
                          }`}
                        >
                          <span className="text-[10px] font-black block uppercase tracking-wide">Bosque Eco</span>
                          <span className="text-[9px] text-slate-500 block pt-1.5 leading-relaxed">Verdes Médicos Descanso Visual</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEyeTheme('sepia');
                            try { localStorage.setItem('admin_eye_theme', 'sepia'); } catch(e){}
                          }}
                          className={`p-3 rounded border text-left cursor-pointer transition flex flex-col justify-between ${
                            eyeTheme === 'sepia'
                              ? 'border-yellow-600/60 text-yellow-800'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-750 text-slate-400 hover:text-slate-200'
                          }`}
                          style={eyeTheme === 'sepia' ? { backgroundColor: '#fdf3dd' } : {}}
                        >
                          <span className="text-[10px] font-black block uppercase tracking-wide">Sepia Confort</span>
                          <span className="text-[9px] text-slate-600 block pt-1.5 leading-relaxed">Lectura de Papel Reciclado</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setEyeTheme('light');
                            try { localStorage.setItem('admin_eye_theme', 'light'); } catch(e){}
                          }}
                          className={`p-3 rounded border text-left cursor-pointer transition flex flex-col justify-between ${
                            eyeTheme === 'light'
                              ? 'border-slate-400 text-slate-900 font-extrabold'
                              : 'bg-slate-950 border-slate-800 hover:border-slate-750 text-slate-400 hover:text-slate-200'
                          }`}
                          style={eyeTheme === 'light' ? { backgroundColor: '#f1f5f9' } : {}}
                        >
                          <span className="text-[10px] font-black block uppercase tracking-wide">Tema Claro</span>
                          <span className="text-[9px] text-slate-605 block pt-1.5 leading-relaxed">Alta Claridad y Contraste Clásico</span>
                        </button>
                      </div>
                    </div>

                    {/* SECURITY SYSTEM LOGO WARNING */}
                    <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 text-xs space-y-2.5">
                      <span className="font-extrabold text-blue-400 uppercase tracking-widest text-[9px] block">Integración Proxy Institucional</span>
                      <p className="text-slate-400 text-[11px] leading-relaxed">
                        Este portal está conectado a la infraestructura proxy de desvío oficial del Tribunal Electoral, que sirve el escudo heráldico nacional de Panamá de forma segura mediante HTTPS con compresión PNG inteligente.
                      </p>
                    </div>

                  </div>
                </div>

                {/* BANNER SYSTEM ALERTS SIMULATOR (Super Admin special) */}
                <div className="bg-slate-950 rounded-lg border border-slate-800 p-5 space-y-4 shadow-md max-w-2xl">
                  <div className="border-b border-slate-900 pb-2.5 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 text-blue-400" />
                    <div>
                      <h3 className="text-xs font-black uppercase text-white tracking-wider">Alertas y Mensajes del Sistema</h3>
                      <p className="text-[10px] text-slate-400">Publicación en la portada principal del portal de citas</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 tracking-wider block">Mensaje de Aviso Temporal</label>
                      <textarea
                        disabled={currentRole !== 'super'}
                        placeholder="Ejemplo: Por motivos de fiestas patrias, las oficinas del Tribunal Electoral laborarán hasta las 12:00 PM este viernes."
                        value={maintenanceMessage}
                        onChange={(e) => setMaintenanceMessage(e.target.value)}
                        className="w-full h-20 bg-slate-900 border border-slate-800 text-white p-2.5 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50 placeholder-slate-600 leading-normal"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-3 bg-slate-900 p-3 rounded border border-slate-800">
                      <div>
                        <span className="text-[11px] font-extrabold uppercase text-slate-250 block">Activar Alerta en Portada</span>
                        <span className="text-[10px] text-slate-450">Fuerza la visualización del aviso preventivo institucional</span>
                      </div>
                      <input
                        type="checkbox"
                        disabled={currentRole !== 'super'}
                        checked={isAlertActive}
                        onChange={(e) => setIsAlertActive(e.target.checked)}
                        className="rounded cursor-pointer accent-blue-600 w-4 h-4 disabled:slate-800"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}
            {/* TAB CONTENT: HORARIOS (Cambiar Horarios de Regionales) */}
            {activeSubTab === 'horarios' && (
              <div className="space-y-6">
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-blue-400" />
                      <span>Sedes Regionales y Horarios Operativos</span>
                    </h3>
                    <p className="text-[11px] text-slate-400">Actualice la jornada y horas de atención de las Direcciones y Comarcas Oficiales.</p>
                  </div>
                  <button
                    onClick={handleResetBranches}
                    className="bg-slate-900 hover:bg-slate-850 text-slate-350 hover:text-white text-[10px] font-bold uppercase tracking-wider py-2 px-3.5 rounded border border-slate-750 transition flex items-center gap-1.5"
                    title="Restaurar de fábrica"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Resetear Sedes
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {mutableSucursales.map((suc) => (
                    <div key={suc.id} className="bg-slate-950 border border-slate-800 p-4 rounded-lg flex flex-col justify-between hover:border-slate-700 transition space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="text-[10px] bg-blue-950 text-blue-300 font-black px-2 py-0.5 rounded tracking-wider uppercase border border-blue-900/35">
                            {suc.provincia}
                          </span>
                          <span className="text-[10px] text-slate-550 font-mono font-bold">ID: {suc.id}</span>
                        </div>
                        <h4 className="text-xs font-black text-white hover:text-blue-400 transition">{suc.nombre}</h4>
                        <div className="text-[11px] text-slate-400 space-y-1 font-medium select-none">
                          <p className="leading-relaxed">📍 <span className="text-slate-300">{suc.direccion}</span></p>
                          <p>📞 <span className="text-slate-300">{suc.telefono}</span></p>
                        </div>
                      </div>

                      <div className="border-t border-slate-900 pt-3 flex flex-col gap-2.5">
                        <div className="bg-slate-900 p-2 rounded border border-slate-850/80">
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-500 block">Horario de Atención</span>
                          <span className="text-xs font-mono font-bold text-emerald-400 block mt-0.5">🕒 {suc.horario}</span>
                        </div>
                        <button
                          onClick={() => handleOpenEditSucursal(suc)}
                          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-[10px] font-black uppercase tracking-wider py-1.5 rounded transition border border-slate-700"
                        >
                          Editar Horario de Atención
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* EDIT SUCURSAL MODAL OVERLAY */}
                {editingSucursal && (
                  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 w-full max-w-md space-y-4 shadow-2xl relative text-slate-100">
                      <button
                        onClick={() => setEditingSucursal(null)}
                        className="absolute right-4 top-4 text-slate-450 hover:text-white p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <div className="border-b border-slate-800 pb-2">
                        <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                          <Edit3 className="w-4 h-4 text-blue-400" />
                          <span>Modificar Horario de Sede</span>
                        </h3>
                        <p className="text-[10px] text-slate-400">Configure las jornada operativa de {editingSucursal.nombre}</p>
                      </div>

                      <div className="space-y-3 py-1 text-xs">
                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Nombre de Sede</label>
                          <input
                            type="text"
                            value={editSucNombre}
                            onChange={(e) => setEditSucNombre(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Dirección Física</label>
                          <textarea
                            value={editSucDireccion}
                            onChange={(e) => setEditSucDireccion(e.target.value)}
                            className="w-full h-14 bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium leading-relaxed"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold uppercase text-slate-400 block">Teléfono de Enlace</label>
                            <input
                              type="text"
                              value={editSucTelefono}
                              onChange={(e) => setEditSucTelefono(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold uppercase text-amber-400 block">Horario de Servicio</label>
                            <input
                              type="text"
                              placeholder="Ej: Lunes a Viernes 8:00 AM - 4:00 PM"
                              value={editSucHorario}
                              onChange={(e) => setEditSucHorario(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                        <button
                          type="button"
                          onClick={() => setEditingSucursal(null)}
                          className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveSucursal}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-1.5 rounded transition shadow-md"
                        >
                          Guardar Horario
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: TRAMITES (Editar, Crear, Eliminar Trámites) */}
            {activeSubTab === 'tramites' && (
              <div className="space-y-6">
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-blue-400" />
                      <span>Catálogo de Trámites, Requisitos y Servicios</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 font-medium">Cree, edite, o elimine las categorías del Registro Civil y sus trámites relacionados.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleOpenCreateCategoria}
                      className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-wider py-2 px-3.5 rounded transition flex items-center gap-1"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Nueva Categoría
                    </button>
                    <button
                      onClick={handleResetTramites}
                      className="bg-slate-900 hover:bg-slate-850 text-slate-300 hover:text-white text-[10px] font-bold uppercase tracking-wider py-2 px-3 rounded border border-slate-755 transition flex items-center gap-1"
                    >
                      <RefreshCw className="w-3" />
                      Resetear Catálogo
                    </button>
                  </div>
                </div>

                <div className="space-y-6">
                  {mutableServicios.map((cat) => (
                    <div key={cat.id} className="bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4 shadow-lg">
                      {/* CATEGORY BLOCK HEADER */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-900 pb-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] bg-indigo-950 text-indigo-300 border border-indigo-900 font-black px-2 py-0.5 rounded uppercase font-mono">
                              Cód: {cat.id}
                            </span>
                            <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                              {cat.nombre}
                            </h4>
                          </div>
                          <p className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-2xl">{cat.descripcion}</p>
                        </div>

                        <div className="flex items-center gap-1.5 self-end sm:self-center">
                          <button
                            onClick={() => handleOpenCreateSubServicio(cat.id)}
                            className="bg-indigo-900/40 hover:bg-indigo-900/60 text-indigo-350 hover:text-white border border-indigo-850 text-[9px] font-black uppercase px-2.5 py-1 rounded transition"
                            title="Agregar trámite bajo esta área"
                          >
                            + Agregar Trámite
                          </button>
                          <button
                            onClick={() => handleOpenEditCategoria(cat)}
                            className="bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 p-1 rounded transition"
                            title="Editar metadata de área"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleDeleteCategoria(cat.id)}
                            className="bg-red-955 hover:bg-red-900 text-red-400 hover:text-white border border-red-950 p-1 rounded transition"
                            title="Eliminar esta área y trámites"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>

                      {/* SUB-SERVICES (TRAMITES) INSIDE THE CATEGORY */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {cat.subServicios.length === 0 ? (
                          <div className="col-span-full bg-slate-900/30 border border-dashed border-slate-850 p-6 text-center text-slate-500 text-xs italic">
                            No hay trámites definidos en esta área. Agregue uno e intente agendar de nuevo.
                          </div>
                        ) : (
                          cat.subServicios.map((sub) => (
                            <div key={sub.id} className="bg-slate-900/65 border border-slate-850/70 p-4 rounded-lg flex flex-col justify-between space-y-3">
                              <div className="space-y-2">
                                <div className="flex items-start justify-between">
                                  <h5 className="text-[11px] font-black text-white pr-2 leading-tight">{sub.nombre}</h5>
                                  <div className="flex items-center gap-1 shrink-0">
                                    <button
                                      onClick={() => handleOpenEditSubServicio(cat.id, sub)}
                                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 p-1 rounded transition"
                                      title="Editar trámite"
                                    >
                                      <Edit3 className="w-2.5 h-2.5" />
                                    </button>
                                    <button
                                      onClick={() => handleDeleteSubServicio(cat.id, sub.id)}
                                      className="bg-red-950/60 hover:bg-red-900 text-red-400 border border-red-900/40 p-1 rounded transition"
                                      title="Eliminar trámite"
                                    >
                                      <Trash2 className="w-2.5 h-2.5" />
                                    </button>
                                  </div>
                                </div>
                                <p className="text-[10px] text-slate-400 line-clamp-3 leading-normal">{sub.descripcion}</p>
                              </div>

                              {/* REQUISITOS LIST HIGHLIGHT */}
                              <div className="space-y-1 bg-slate-950/40 p-2 rounded border border-slate-850">
                                <span className="text-[8px] font-black uppercase text-indigo-400 tracking-wider block">Requisitos Obligatorios Civiles ({sub.requisitos.length})</span>
                                {sub.requisitos.length === 0 ? (
                                  <span className="text-[9px] text-slate-500 italic block">Sin requisitos especiales requeridos.</span>
                                ) : (
                                  <div className="max-h-20 overflow-y-auto space-y-1.5 pr-1 mt-1 scrollbar-thin">
                                    {sub.requisitos.map((req, rIdx) => (
                                      <div key={rIdx} className="flex items-start gap-1">
                                        <span className="text-emerald-400 text-[10px] shrink-0">✓</span>
                                        <span className="text-[9px] text-slate-350 leading-tight font-medium">{req}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* CREATE/EDIT CATEGORY MODAL */}
                {(isCreatingCategoria || editingCategoria) && (
                  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 w-full max-w-md space-y-4 shadow-2xl relative text-slate-100">
                      <button
                        onClick={() => {
                          setIsCreatingCategoria(false);
                          setEditingCategoria(null);
                        }}
                        className="absolute right-4 top-4 text-slate-450 hover:text-white p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <div className="border-b border-slate-800 pb-2">
                        <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-blue-400" />
                          <span>{isCreatingCategoria ? 'Crear Nueva Categoría' : 'Editar Categoría de Trámites'}</span>
                        </h3>
                        <p className="text-[10px] text-slate-400">Administre el catálogo gubernamental de servicios del Tribunal Electoral.</p>
                      </div>

                      <div className="space-y-3 py-1 text-xs">
                        {isCreatingCategoria && (
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">ID del Servicio (ID Único)</label>
                            <select
                              value={catFormId}
                              onChange={(e) => setCatFormId(e.target.value as ServicioCategoriaId)}
                              className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600"
                            >
                              <option value="cedulacion">Cedulación</option>
                              <option value="registro_civil">Registro Civil</option>
                              <option value="extranjeria">Trámites de Extranjería</option>
                              <option value="organizacion_electoral">Organización Electoral</option>
                              <option value="panamenos_extranjero">Trámite de Panameños en el Extranjero</option>
                            </select>
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Nombre Público de Área</label>
                          <input
                            type="text"
                            placeholder="Ej: Registro Civil de Citas"
                            value={catFormNombre}
                            onChange={(e) => setCatFormNombre(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 block">Descripción Oficial</label>
                          <textarea
                            placeholder="Breve reseña del alcance de este tipo de trámites públicos."
                            value={catFormDescripcion}
                            onChange={(e) => setCatFormDescripcion(e.target.value)}
                            className="w-full h-18 bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 block">Icono de Identificación</label>
                          <select
                            value={catFormIcono}
                            onChange={(e) => setCatFormIcono(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                          >
                            <option value="IdCard">IdCard (Cédula de Identidad)</option>
                            <option value="FileText">FileText (Certificaciones)</option>
                            <option value="Globe">Globe (Extranjería)</option>
                            <option value="Vote">Vote (Organización Electoral)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingCategoria(false);
                            setEditingCategoria(null);
                          }}
                          className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveCategoria}
                          className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-1.5 rounded transition shadow-md"
                        >
                          Guardar Categoría
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* CREATE/EDIT SUB-SERVICE (TRÁMITE SPECIFIC) MODAL */}
                {(isCreatingSubServicio || editingSubServicio) && (
                  <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
                    <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 w-full max-w-lg space-y-4 shadow-2xl relative text-slate-100">
                      <button
                        onClick={() => {
                          setIsCreatingSubServicio(false);
                          setEditingSubServicio(null);
                          setEditingSubServicioCatId(null);
                        }}
                        className="absolute right-4 top-4 text-slate-450 hover:text-white p-1"
                      >
                        <X className="w-5 h-5" />
                      </button>

                      <div className="border-b border-slate-800 pb-2">
                        <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                          <Plus className="w-4 h-4 text-indigo-400" />
                          <span>{isCreatingSubServicio ? 'Agregar Nuevo Trámite Público' : 'Editar Parámetros de Trámite'}</span>
                        </h3>
                        <p className="text-[10px] text-slate-400">
                          Área seleccionada: <span className="font-bold text-slate-300 font-mono text-[10px] uppercase">{editingSubServicioCatId}</span>
                        </p>
                      </div>

                      <div className="space-y-3.5 py-1 text-xs">
                        {isCreatingSubServicio && (
                          <div className="space-y-1">
                            <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">ID Técnico (ID de Base de Datos)</label>
                            <input
                              type="text"
                              placeholder="Ej: ced_duplicado_urgente"
                              value={subFormId}
                              onChange={(e) => setSubFormId(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                            />
                          </div>
                        )}

                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Nombre Comercial / Público</label>
                          <input
                            type="text"
                            placeholder="Ej: Duplicado Express de Cédula por Deterioro"
                            value={subFormNombre}
                            onChange={(e) => setSubFormNombre(e.target.value)}
                            className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[9px] font-extrabold uppercase text-slate-400 block">Descripción y Alcance</label>
                          <textarea
                            placeholder="Detalle de en qué consiste este trámite y quién debe realizarlo."
                            value={subFormDescripcion}
                            onChange={(e) => setSubFormDescripcion(e.target.value)}
                            className="w-full h-16 bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                          />
                        </div>

                        {/* REQUISITOS LIST BUILDER PANEL */}
                        <div className="space-y-2 border-t border-slate-800 pt-3">
                          <span className="text-[10px] font-black uppercase text-indigo-400 block tracking-wider">Creador Dinámico de Requisitos Forzosos</span>
                          
                          {/* Current list */}
                          <div className="bg-slate-950 p-2 rounded border border-slate-800 space-y-1 max-h-24 overflow-y-auto">
                            {subFormRequisitos.length === 0 ? (
                              <span className="text-[9px] text-slate-550 italic block p-1">No hay requisitos. Todos los ciudadanos califican sin papelería previa.</span>
                            ) : (
                              subFormRequisitos.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-slate-900 px-2 py-1 rounded border border-slate-850 text-[9px] font-medium leading-none">
                                  <span className="text-slate-200 truncate pr-4">{idx + 1}. {item}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveRequisito(idx)}
                                    className="text-red-400 hover:text-white font-extrabold shrink-0 px-1 cursor-pointer"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ))
                            )}
                          </div>

                          {/* Add input */}
                          <div className="flex gap-1.5">
                            <input
                              type="text"
                              placeholder="Ej: Presentar Cédula Vencida o Pasaporte"
                              value={newRequisitoText}
                              onChange={(e) => setNewRequisitoText(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleAddRequisito();
                                }
                              }}
                              className="flex-1 bg-slate-950 border border-slate-750 text-white p-2 text-xs rounded focus:outline-none focus:ring-1 focus:ring-blue-600 font-medium"
                            />
                            <button
                              type="button"
                              onClick={handleAddRequisito}
                              className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-3 rounded transition"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
                        <button
                          type="button"
                          onClick={() => {
                            setIsCreatingSubServicio(false);
                            setEditingSubServicio(null);
                            setEditingSubServicioCatId(null);
                          }}
                          className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-[10px] uppercase tracking-wider px-3.5 py-1.5 rounded transition"
                        >
                          Cancelar
                        </button>
                        <button
                          type="button"
                          onClick={handleSaveSubServicio}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-[10px] uppercase tracking-wider px-4 py-1.5 rounded transition shadow-md"
                        >
                          Guardar Trámite
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB CONTENT: EXTRANJERIA (Carga CSV y Control Estatus Migratorio) */}
            {activeSubTab === 'extranjeria' && (
              <div className="space-y-6 animate-fade-in font-sans">
                <ExtranjeriaController currentRole={currentRole} />
              </div>
            )}

            {/* TAB CONTENT: PASADO DE EDAD (Generar Seguimiento y Enlace) */}
            {activeSubTab === 'pasado_edad' && (
              <TardiaController 
                citas={citas} 
                onUpdateCitas={onUpdateCitas} 
                currentRole={currentRole}
                activeUsername={username}
              />
            )}

            {/* TAB CONTENT: GESTIÓN DE USUARIOS (CREAR Y ASIGNAR GESTONES) */}
            {activeSubTab === 'usuarios' && currentRole === 'super' && (
              <div className="space-y-6 animate-fade-in font-sans text-slate-200">
                {/* Intro details */}
                <div className="bg-slate-950 p-5 rounded-lg border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-xl">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-2">
                      <Users className="w-5 h-5 text-purple-400" />
                      <span>Gestión y Asignación de Usuarios de Administración</span>
                    </h3>
                    <p className="text-[11.5px] text-slate-400 font-medium leading-relaxed">
                      Control de accesos y delegación de responsabilidades. Registre nuevos usuarios de administración y asigne sus gestiones específicas como Extranjería y control de ciudadanos Pasados de Edad.
                    </p>
                  </div>
                  <div>
                    <span className="bg-purple-950 text-purple-300 border border-purple-800 text-[10px] font-black uppercase px-2.5 py-1 rounded shadow-sm">
                      Módulo Super Admin
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* FORM TO REGISTER OR EDIT USER */}
                  <div className="lg:col-span-4 bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4 shadow-lg self-start">
                    <h4 className="text-xs font-black uppercase text-white tracking-wider border-b border-slate-850 pb-2 flex items-center gap-1.5">
                      <Plus className="w-4 h-4 text-purple-400" />
                      <span>{editingUser ? 'Modificar Gestión' : 'Registrar Nuevo Usuario'}</span>
                    </h4>

                    {userError && (
                      <div className="bg-red-950/60 border border-red-900/50 text-red-200 p-3 rounded text-xs leading-relaxed flex items-start gap-2 animate-shake">
                        <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                        <span>{userError}</span>
                      </div>
                    )}

                    {userSuccess && (
                      <div className="bg-emerald-950/60 border border-emerald-900/50 text-emerald-200 p-3 rounded text-xs leading-relaxed flex items-start gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <span>{userSuccess}</span>
                      </div>
                    )}

                    <form onSubmit={handleSaveUser} className="space-y-4">
                      {/* Nombre Completo */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Nombre Completo</label>
                        <input
                          type="text"
                          required
                          value={userFormNombre}
                          onChange={(e) => setUserFormNombre(e.target.value)}
                          placeholder="Ej: Lic. Carlos Meléndez Prado"
                          className="w-full bg-slate-900 border border-slate-750 text-sm text-white p-2.5 rounded focus:outline-none focus:ring-1 focus:ring-purple-600 transition"
                        />
                      </div>

                      {/* Usuario (Username) */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Nombre de Usuario Login</label>
                        <input
                          type="text"
                          required
                          disabled={!!editingUser}
                          value={userFormUsername}
                          onChange={(e) => setUserFormUsername(e.target.value)}
                          placeholder="Ej: carmel26 (Mín. 3 letras)"
                          className="w-full bg-slate-900 border border-slate-750 text-sm text-white p-2.5 rounded focus:outline-none focus:ring-1 focus:ring-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                        />
                      </div>

                      {/* Contraseña (Password) */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Contraseña de Acceso</label>
                        <input
                          type="text"
                          required
                          value={userFormPassword}
                          onChange={(e) => setUserFormPassword(e.target.value)}
                          placeholder="Mínimo 4 caracteres"
                          className="w-full bg-slate-900 border border-slate-750 text-sm text-white p-2.5 rounded focus:outline-none focus:ring-1 focus:ring-purple-600 transition font-mono"
                        />
                      </div>

                      {/* Asignar Gestión / Rol */}
                      <div className="space-y-1.5">
                        <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Asignar Gestión (Rol)</label>
                        <select
                          value={userFormRole}
                          onChange={(e) => setUserFormRole(e.target.value as AdminRole)}
                          className="w-full bg-slate-900 border border-slate-750 text-sm text-slate-300 p-2.5 rounded focus:outline-none focus:ring-1 focus:ring-purple-600 cursor-pointer font-bold"
                        >
                          {/* 1. Super admin */}
                          <option value="super">⚡ Super Administrador (Control Total del Tribunal)</option>
                          
                          {/* 2. Admin sencillo */}
                          <option value="sencillo">👤 Administrador Sencillo (Solo Citas Generales)</option>
                          
                          {/* 3. Extranjerías */}
                          <option value="extranjeria_supervisor">👑 Supervisor de Extranjería / Inmigración</option>
                          <option value="extranjeria_atencion">📋 Usuario Extranjería Atención (Entrada)</option>
                          <option value="extranjeria_cubiculo">🖥️ Usuario Extranjería Cubículo (Ticket)</option>
                          <option value="extranjeria">🛂 Gestión de Extranjería General</option>
                          
                          {/* 4. Verificación de Identidad (VID) */}
                          <option value="pasado_edad_supervisor">👑 Supervisor VID (Pasados de Edad)</option>
                          <option value="pasado_edad_admin">📋 Operador Seguimiento VID</option>
                          <option value="pasado_edad">🛡️ Administrador VID</option>
                        </select>
                        <p className="text-[10px] text-slate-500 font-medium leading-normal pt-1">
                          El usuario ingresará con estas credenciales y tendrá restringidas o asignadas las pestañas correspondientes en base a su rol de gestión.
                        </p>
                      </div>

                      <div className="flex flex-col sm:flex-row gap-2 pt-2">
                        {editingUser && (
                          <button
                            type="button"
                            onClick={handleCancelUserEdit}
                            className="bg-slate-800 hover:bg-slate-750 text-slate-300 font-extrabold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded transition flex-1 text-center cursor-pointer"
                          >
                            Cancelar
                          </button>
                        )}
                        <button
                          type="submit"
                          className="bg-purple-600 hover:bg-purple-700 text-white font-extrabold text-[10px] uppercase tracking-wider py-2.5 px-4 rounded transition flex-1 text-center shadow-lg cursor-pointer"
                        >
                          {editingUser ? 'Guardar Cambios' : 'Registrar y Sincronizar'}
                        </button>
                      </div>
                    </form>
                  </div>

                  {/* ACTIVE USERS TABLE */}
                  <div className="lg:col-span-8 bg-slate-950 border border-slate-800 rounded-lg p-5 space-y-4 shadow-lg flex flex-col">
                    <h4 className="text-xs font-black uppercase text-white tracking-wider border-b border-slate-850 pb-2 flex items-center justify-between animate-fade-in">
                      <span className="flex items-center gap-1.5">
                        <Shield className="w-4 h-4 text-purple-400" />
                        <span>Usuarios y Responsabilidades Registradas</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-semibold font-mono bg-slate-900 border border-slate-800 px-2.5 py-1 rounded">
                        Total: {users.length} Cuentas
                      </span>
                    </h4>

                    {loadingUsers ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 gap-2">
                        <RefreshCw className="w-8 h-8 text-purple-400 animate-spin" />
                        <span className="text-xs font-bold uppercase tracking-wider">Cargando base de usuarios...</span>
                      </div>
                    ) : users.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center p-12 text-slate-400 text-center space-y-2 border border-dashed border-slate-800 rounded">
                        <Users className="w-10 h-10 text-slate-600" />
                        <p className="text-xs font-bold uppercase text-slate-400">Sin cuentas de gestión registradas</p>
                        <p className="text-[11px] text-slate-500 max-w-sm">No se pudieron recuperar usuarios del servidor o la base de datos está vacía. Registre un usuario con el formulario de la izquierda.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded border border-slate-850">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-slate-900 border-b border-slate-850 text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">
                              <th className="p-3.5">Nombre Completo</th>
                              <th className="p-3.5">Credenciales Acceso</th>
                              <th className="p-3.5">Gestión Asignada</th>
                              <th className="p-3.5 text-right">Acciones</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-900 text-xs text-slate-300">
                            {users.map((u) => (
                              <tr key={u.username} className="hover:bg-slate-900/40 transition">
                                <td className="p-3.5">
                                  <div className="font-bold text-white capitalize">{u.nombre}</div>
                                  <div className="text-[10px] text-slate-500 mt-0.5">Creación: {u.fechaCreacion ? new Date(u.fechaCreacion).toLocaleDateString() : 'Original'}</div>
                                </td>
                                <td className="p-3.5 font-mono">
                                  <div className="text-slate-200">Usuario: <strong className="text-slate-100 font-extrabold bg-slate-900 px-1 py-0.5 rounded border border-slate-800">{u.username}</strong></div>
                                  <div className="text-slate-400 mt-1">Clave: <strong className="text-slate-200 font-normal bg-slate-900 px-1 py-0.5 rounded border border-slate-800 select-all font-mono">••••••••</strong></div>
                                </td>
                                <td className="p-3.5">
                                  <span className={`text-[9px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded border ${
                                    u.role === 'super'
                                      ? 'bg-red-950/80 text-red-400 border-red-900/50'
                                      : u.role === 'extranjeria' || u.role === 'extranjeria_supervisor' || u.role === 'extranjeria_atencion' || u.role === 'extranjeria_cubiculo'
                                        ? 'bg-amber-950/80 text-amber-400 border-amber-900/50'
                                        : u.role === 'pasado_edad' || u.role === 'pasado_edad_supervisor' || u.role === 'pasado_edad_admin'
                                          ? 'bg-blue-950/80 text-blue-400 border-blue-900/50'
                                          : 'bg-emerald-950/80 text-emerald-400 border-emerald-900/50'
                                  }`}>
                                    {u.role === 'super' 
                                      ? '⚡ Super Admin' 
                                      : u.role === 'extranjeria_supervisor'
                                        ? '👑 Supervisor Extranjería'
                                        : u.role === 'extranjeria_atencion'
                                          ? '📋 Atención Extranjería (Entrada)'
                                          : u.role === 'extranjeria_cubiculo'
                                            ? '🖥️ Cubículo Extranjería (Ticket)'
                                            : u.role === 'extranjeria' 
                                              ? 'Inmigración / Extranjería' 
                                              : u.role === 'pasado_edad_supervisor'
                                                ? '👑 Supervisor VID (Pasados de Edad)'
                                                : u.role === 'pasado_edad_admin'
                                                  ? '📋 Operador Seguimiento VID'
                                                  : u.role === 'pasado_edad' 
                                                    ? '🛡️ Administrador VID' 
                                                    : '👤 Administrador Sencillo'}
                                  </span>
                                </td>
                                <td className="p-3.5">
                                  <div className="flex items-center justify-end gap-1.5 w-full">
                                    <button
                                      type="button"
                                      onClick={() => handleEditUserClick(u)}
                                      className="p-1.5 hover:bg-slate-850 text-slate-400 hover:text-white rounded border border-transparent hover:border-slate-800 transition cursor-pointer"
                                      title="Editar usuario"
                                    >
                                      <Edit3 className="w-3.5 h-3.5" />
                                    </button>
                                    <button
                                      type="button"
                                      disabled={u.username === 'adminte'}
                                      onClick={() => handleDeleteUser(u.username)}
                                      className="p-1.5 hover:bg-slate-850 text-red-400 hover:text-red-350 rounded border border-transparent hover:border-red-950/40 transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                                      title={u.username === 'adminte' ? 'No se puede borrar el Super Admin principal' : 'Eliminar usuario'}
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}

                    <div className="bg-slate-900/50 p-4 rounded border border-slate-850 mt-auto flex items-start gap-2.5 text-slate-400 text-[11px] leading-relaxed">
                      <Info className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                      <div>
                        <strong>Acerca de la Seguridad de Acceso:</strong> Las credenciales creadas aquí se guardan de forma permanente y se aplican en tiempo real. Al iniciar sesión, los gestores solo podrán interactuar con el módulo correspondiente a su gestión (Extranjería o Ciudadanos Pasado de Edad).
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB CONTENT: PANTALLA DE TURNOS COMPLETA */}
            {activeSubTab === 'pantalla' && (
              <div className="space-y-6 animate-fade-in font-sans">
                <ExtranjeriaController currentRole="super" forceSubRole="pantalla" />
              </div>
            )}

            {/* TAB CONTENT: CMS EDITOR CONTROLS */}
            {activeSubTab === ('cms' as any) && currentRole === 'super' && (
              <div className="space-y-6 animate-fade-in">
                <AdminCmsEditor onConfigSaved={() => {
                  window.dispatchEvent(new CustomEvent('cms_config_changed'));
                }} />
              </div>
            )}

            {/* TAB CONTENT: DATABASE CONNECTION DIAGNOSTIC */}
            {activeSubTab === 'database' && currentRole === 'super' && (
              <div className="space-y-6 animate-fade-in">
                <DatabaseDiagnostic />
              </div>
            )}

          </div>

        </div>
      )}


      {/* FOOTER BAR FOR CREDIT/SPECS */}
      <div className="bg-slate-950 p-2.5 border-t border-slate-850 text-center text-[10px] text-slate-500 font-mono tracking-wide leading-none flex flex-wrap gap-2 justify-center">
        <span>Agendate 1.1.0</span>
      </div>

      {/* EDIT MODAL OVERLAY */}
      {editingCita && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-lg p-5 w-full max-w-lg space-y-4 shadow-2xl relative text-slate-100">
            
            <button
              onClick={() => setEditingCita(null)}
              className="absolute right-4 top-4 text-slate-400 hover:text-white transition"
              aria-label="Cerrar modal"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="border-b border-slate-800 pb-2">
              <h3 className="text-sm font-black uppercase text-white tracking-wider flex items-center gap-1.5">
                <Edit3 className="w-4 h-4 text-blue-400" />
                <span>Modificar Registros: {editingCita.codigoTransaccion}</span>
              </h3>
              <p className="text-[10px] text-slate-400 font-medium">Actualice la fecha, hora, estado o información filiativa correspondiente.</p>
            </div>

            <div className="space-y-4 py-2">
              
              {/* SCHEDULE DETAIL FIELDS (Both simple and super admin can edit) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Fecha del Trámite</label>
                  <input
                    type="date"
                    value={editFecha}
                    onChange={(e) => setEditFecha(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-400 tracking-wider block">Hora Asignada</label>
                  <input
                    type="text"
                    value={editHora}
                    onChange={(e) => setEditHora(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono"
                  />
                </div>
              </div>

              {/* SERVICE READONLY METADATA */}
              <div className="bg-slate-950 p-2.5 rounded border border-slate-850 text-[11px] leading-relaxed space-y-1">
                <div>
                  <span className="text-slate-450 uppercase font-black tracking-wider text-[9px] block">Trámite Técnico Solicitado</span>
                  <span className="font-bold text-slate-200">{getSubServicioName(editingCita.subServicioId)}</span>
                </div>
                <div>
                  <span className="text-slate-450 uppercase font-black tracking-wider text-[9px] block">Sede Asignada</span>
                  <span className="font-bold text-slate-200">{getSucursalName(editingCita.sucursalId)}</span>
                </div>
              </div>

              {/* CITIZEN PROFILE DETAILS CARD (Editable only by Super Admin) */}
              <div className="border-t border-slate-800 pt-3.5 space-y-3">
                <span className="text-[10px] font-black uppercase text-slate-350 tracking-wider flex items-center justify-between">
                  <span>Datos de Identificación Personal</span>
                  {currentRole !== 'super' && (
                    <span className="text-[8px] tracking-normal bg-amber-950/80 text-amber-500 border border-amber-900/40 px-1.5 py-0.5 rounded font-black uppercase">
                      Edición Bloqueada (Solo Super Admin)
                    </span>
                  )}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Tipo Ciudadano</label>
                    <select
                      disabled={currentRole !== 'super'}
                      value={editTipoIdentificacion}
                      onChange={(e) => setEditTipoIdentificacion(e.target.value as TipoIdentificacion)}
                      className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs cursor-pointer focus:outline-none disabled:opacity-50"
                    >
                      <option value="Cedula">Cédula Nacional</option>
                      <option value="CedulaJuvenil">Cédula Juvenil</option>
                      <option value="Extranjero">Carné PE (Extranjería)</option>
                      <option value="Pasaporte">Pasaporte Internacional</option>
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Número de Cédula/id</label>
                    <input
                      type="text"
                      disabled={currentRole !== 'super'}
                      value={editIdentificacion}
                      onChange={(e) => setEditIdentificacion(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 font-mono disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Nombre Completo del Comitente</label>
                  <input
                    type="text"
                    disabled={currentRole !== 'super'}
                    value={editNombreCompleto}
                    onChange={(e) => setEditNombreCompleto(e.target.value)}
                    placeholder="Ej: Juan Antonio Pérez Rodríguez"
                    className="w-full bg-slate-950 border border-slate-755 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Teléfono Móvil</label>
                    <input
                      type="text"
                      disabled={currentRole !== 'super'}
                      value={editTelefono}
                      onChange={(e) => setEditTelefono(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-[9px] font-extrabold uppercase text-slate-450 block">Correo Electrónico</label>
                    <input
                      type="email"
                      disabled={currentRole !== 'super'}
                      value={editCorreo}
                      onChange={(e) => setEditCorreo(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-750 text-white p-2 rounded text-xs px-3 focus:outline-none focus:ring-1 focus:ring-blue-600 disabled:opacity-50"
                    />
                  </div>
                </div>
              </div>

              {/* STATE STATUS CONTROL (Both can edit) */}
              <div className="flex items-center justify-between gap-3 bg-slate-950 p-2.5 rounded border border-slate-850">
                <div>
                  <span className="text-[10px] font-extrabold uppercase text-slate-300 block">Estado de la Cita Presencial</span>
                  <span className="text-[9px] text-slate-500">¿Desea cambiar la confirmación al estado cancelado?</span>
                </div>
                <select
                  value={editEstado}
                  onChange={(e) => setEditEstado(e.target.value as 'confirmada' | 'cancelada' | 'asistire' | 'no_asistire' | 'realizada')}
                  className="bg-slate-900 border border-slate-700 text-white p-1 text-xs px-2 rounded cursor-pointer focus:outline-none"
                >
                  <option value="confirmada">Confirmada (Reservada)</option>
                  <option value="asistire">✓ Asistencia Confirmada</option>
                  <option value="no_asistire">✗ No Asistirá</option>
                  <option value="realizada">✓ Realizada (Completada)</option>
                  <option value="cancelada">Cancelada / Liberada</option>
                </select>
              </div>

            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-800 pt-3">
              <button
                type="button"
                onClick={() => setEditingCita(null)}
                className="bg-slate-850 hover:bg-slate-800 text-slate-300 font-extrabold text-[11px] uppercase tracking-wider px-4 py-2 rounded transition"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveEdit}
                className="bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[11px] uppercase tracking-wider px-4 py-2 rounded transition shadow-md"
              >
                Guardar Cambios
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
