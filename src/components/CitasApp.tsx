import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CalendarCheck2, 
  LayoutDashboard, 
  HelpCircle, 
  Award, 
  Scale, 
  Building2, 
  PhoneCall, 
  MapPin, 
  ShieldAlert, 
  CheckCircle2, 
  Languages,
  Zap,
  ArrowRight,
  Shield,
  Globe,
  MessageCircle,
  Calendar,
  Clock,
  User,
  ArrowLeft,
  Settings
} from 'lucide-react';
import { DatosPersonales, ServicioCategoriaId, Cita, ServiceType, Ticket } from '../types';
import { SERVICIOS_TRIBUNAL } from '../data';
import FormularioDatos from './FormularioDatos';
import SeleccionServicio from './SeleccionServicio';
import AgendamientoCita from './AgendamientoCita';
import CitaComprobante from './CitaComprobante';
import AdminPanel from './AdminPanel';

interface CitasAppProps {
  initialTab?: 'agendar' | 'admin';
  onNavigateToTurnos?: () => void;
  onCreateTicket?: (name: string, serviceType: ServiceType, priority: boolean, isAppointment?: boolean, procedure?: string) => Ticket;
}

const standardizeDateString = (rawDate: string): string => {
  if (!rawDate) return '';
  let clean = rawDate.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(clean)) return clean;
  if (/^\d{4}\/\d{2}\/\d{2}$/.test(clean)) return clean.replace(/\//g, '-');
  
  const parts = clean.split(/[/\-.]/);
  if (parts.length === 3) {
    const p0 = parts[0].trim();
    const p1 = parts[1].trim();
    const p2 = parts[2].trim();
    if (p2.length === 4) {
      const year = p2;
      const val0 = parseInt(p0, 10);
      const val1 = parseInt(p1, 10);
      if (val0 > 12) {
        return `${year}-${p1.padStart(2, '0')}-${p0.padStart(2, '0')}`;
      } else if (val1 > 12) {
        return `${year}-${p0.padStart(2, '0')}-${p1.padStart(2, '0')}`;
      }
      return `${year}-${p1.padStart(2, '0')}-${p0.padStart(2, '0')}`;
    }
    if (p0.length === 4) {
      return `${p0}-${p1.padStart(2, '0')}-${p2.padStart(2, '0')}`;
    }
  }
  return clean;
};

export default function CitasApp({ initialTab = 'agendar', onNavigateToTurnos, onCreateTicket }: CitasAppProps) {
  const navigate = useNavigate();
  const { category, subService } = useParams<{ category?: string; subService?: string }>();
  const [activeTab, setActiveTab] = useState<'agendar' | 'admin'>(initialTab);

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);

  // Core Booking wizard state
  const [datosPersonales, setDatosPersonales] = useState<DatosPersonales | null>(null);
  const [selectedCategoria, setSelectedCategoria] = useState<ServicioCategoriaId | null>(null);
  const [selectedSubServicioId, setSelectedSubServicioId] = useState<string | null>(null);
  const [selectedSucursalId, setSelectedSucursalId] = useState<string | null>(null);
  const [selectedFecha, setSelectedFecha] = useState<string | null>(null);
  const [selectedHora, setSelectedHora] = useState<string | null>(null);

  // Stored receipt state for current booking
  const [activeCita, setActiveCita] = useState<Cita | null>(null);

  // Full appointments history list
  const [citasList, setCitasList] = useState<Cita[]>([]);
  const [cmsConfig, setCmsConfig] = useState<any>(null);

  const fetchCmsConfig = async () => {
    try {
      const res = await fetch('/api/cms/config');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.config) {
          setCmsConfig(data.config);
          if (data.config.primaryColor) {
            document.documentElement.style.setProperty('--primary-theme-color', data.config.primaryColor);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching CMS config:', err);
    }
  };

  useEffect(() => {
    fetchCmsConfig();
    const handleCmsChanged = () => {
      fetchCmsConfig();
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('cms_config_changed', handleCmsChanged);
      return () => {
        window.removeEventListener('cms_config_changed', handleCmsChanged);
      };
    }
  }, []);

  // Fetch appointments from API or fallback
  const fetchAppointments = async () => {
    try {
      const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token') || 'superadmin_token';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/appointments', { headers });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.appointments || []);
        
        let mergedList = [...list];

        // Heal and normalize all appointments with full citizen names and Extranjería CSV nomenclature
        mergedList = mergedList.map((app: any) => {
          if (!app) return app;
          let updated = { ...app };
          
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
            if (!updated.requisitos || updated.requisitos.length === 0 || !updated.requisitos.some((r: string) => r.includes('Migración'))) {
              updated.requisitos = [
                "Precio (efectivo) B/. 100.00",
                "Requiere contar con cita programada",
                "Nota del Servicio Nacional de Migración",
                "Fotocopia del carné expedido por el Servicio Nacional de Migración",
                "Fotocopia de la página de las generales del pasaporte"
              ];
            }
          }

          const dp = updated.datosPersonales ? { ...updated.datosPersonales } : {};
          if (isCsv) {
            dp.tipoIdentificacion = 'Pasaporte';
            if (!dp.pasaporte) {
              dp.pasaporte = dp.identificacion || updated.identificacion || 'PA-EXT';
            }
          }
          const parts = [
            dp.primerNombre || '',
            dp.segundoNombre || '',
            dp.primerApellido || '',
            dp.segundoApellido || ''
          ].map((s: any) => String(s || '').trim()).filter(Boolean);
          const partsName = parts.length > 0 ? parts.join(' ') : '';
          const resolvedName = dp.nombreCompleto || partsName || updated.nombre || (dp.pasaporte ? `Ciudadano (${dp.pasaporte})` : '');
          if (resolvedName && !dp.nombreCompleto) {
            dp.nombreCompleto = resolvedName;
          }
          return {
            ...updated,
            nombre: updated.nombre || resolvedName || 'Ciudadano',
            datosPersonales: dp
          };
        });

        setCitasList(mergedList);
        localStorage.setItem('citas_tribunal_electoral_v2', JSON.stringify(mergedList));
        return;
      }
    } catch (e) {
      console.warn('Could not fetch appointments from server, loading local backup:', e);
    }

    const saved = localStorage.getItem('citas_tribunal_electoral_v2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          const standardized = parsed.map(app => {
            if (app && app.fecha) {
              app.fecha = standardizeDateString(app.fecha);
            }
            return app;
          });
          setCitasList(standardized);
        }
      } catch (err) {
        console.error('Error parsing local appointments:', err);
      }
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const tramiteParam = params.get('tramite');
      const seguimientoParam = params.get('seguimiento');

      if (tramiteParam === 'ced_pasados_edad') {
        setSelectedCategoria('cedulacion');
        setSelectedSubServicioId('ced_pasados_edad');
        if (seguimientoParam) {
          setDatosPersonales({
            numeroSeguimiento: seguimientoParam,
            tieneDiscapacidad: false,
            tipoIdentificacion: 'Cedula',
            identificacion: '',
            fechaNacimiento: '',
            telefono: '',
            correo: '',
            nombreCompleto: ''
          });
        }
        setCurrentStep(2);
      }
    }
  }, []);

  // Sync route path parameters /citas/:category/:subService
  useEffect(() => {
    if (category && subService) {
      const normalizeForRouting = (str: string): string => {
        return str
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]/g, " ")
          .replace(/\s+/g, " ")
          .trim();
      };

      const normCategory = normalizeForRouting(decodeURIComponent(category));
      const normSubService = normalizeForRouting(decodeURIComponent(subService));

      const matchedCategory = SERVICIOS_TRIBUNAL.find(c => 
        normalizeForRouting(c.id) === normCategory ||
        normalizeForRouting(c.nombre) === normCategory
      );

      if (matchedCategory) {
        const matchedSubService = matchedCategory.subServicios.find(s => 
          normalizeForRouting(s.id) === normSubService ||
          normalizeForRouting(s.nombre) === normSubService
        );

        if (matchedSubService) {
          setSelectedCategoria(matchedCategory.id);
          setSelectedSubServicioId(matchedSubService.id);
          setCurrentStep(2); // Go directly to FormularioDatos
        }
      }
    }
  }, [category, subService]);

  const saveCitas = async (newList: Cita[]) => {
    setCitasList(newList);
    localStorage.setItem('citas_tribunal_electoral_v2', JSON.stringify(newList));
    try {
      const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token') || 'superadmin_token';
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newList)
      });
    } catch (err) {
      console.error('Error persisting appointments to server:', err);
    }
  };

  const handleStep1Success = (datos: DatosPersonales) => {
    setDatosPersonales(datos);
    setCurrentStep(3);
  };

  const handleStep2Success = (categoriaId: ServicioCategoriaId, subServicioId: string) => {
    setSelectedCategoria(categoriaId);
    setSelectedSubServicioId(subServicioId);
    setCurrentStep(2);
  };

  const handleStep3Success = (sucursalId: string, fecha: string, hora: string) => {
    setSelectedSucursalId(sucursalId);
    setSelectedFecha(fecha);
    setSelectedHora(hora);

    if (!datosPersonales || !selectedCategoria || !selectedSubServicioId) {
      alert("Faltan datos obligatorios para registrar la cita.");
      return;
    }

    const sub = (selectedSubServicioId || '').toLowerCase();
    const isPasadosDeEdad = selectedSubServicioId === 'ced_pasados_edad' || sub.includes('pasado') || sub.includes('edad');
    const isExtranjeria = selectedCategoria === 'extranjeria' || sub.includes('extranjero') || sub.startsWith('ext_');

    const hasCsvBlock = citasList.some(c => {
      const isExt = c.servicioCategoria === 'extranjeria' || c.subServicioId?.includes('extranjero') || c.subServicioId?.startsWith('ext_');
      const isCsv = Boolean((c as any).isCsv) || String(c.id || '').includes('CSV') || String(c.codigoTransaccion || '').includes('CSV') || String(c.creadoPor || '').toLowerCase().includes('csv') || String(c.creadoPor || '').toLowerCase().includes('importaci');
      return isExt && isCsv && c.fecha >= '2026-09-01' && c.fecha <= '2026-12-30';
    });

    if (isExtranjeria && (hasCsvBlock && fecha >= '2026-09-01' && fecha <= '2026-12-30')) {
      alert("No es posible programar esta cita: Los cupos de atención presencial para trámites de Extranjería para el periodo actual han sido asignados en su totalidad. El agendamiento en línea se encuentra disponible únicamente a partir del 4 de enero de 2027.");
      return;
    }

    const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    const codeLen = isPasadosDeEdad ? 7 : 5;
    for (let i = 0; i < codeLen; i++) {
      code += alpha.charAt(Math.floor(Math.random() * alpha.length));
    }
    const prefix = isPasadosDeEdad ? 'PA' : (isExtranjeria ? 'EXT' : 'TE');
    const finalTxCode = `${prefix}-${code}`;
    const newId = `${prefix}-${Date.now()}`;

    let ticketTurnoCode: string | undefined = undefined;
    const isTardia20Anos = sub.includes('ced_pasados_edad') || sub.includes('20') || sub.includes('pasado');
    const isExtranjeriaPrimeraVez = sub.includes('ext_primera_vez') || (selectedCategoria === 'extranjeria' && (sub.includes('primera') || sub.includes('residente permanente por primera vez')));

    // Las únicas citas que NO deben tener ticket de turno general son Cédula por primera vez 20 años y 1 día y Carné de residente primera vez
    const shouldGenerateTicket = !isTardia20Anos && !isExtranjeriaPrimeraVez;

    if (onCreateTicket && shouldGenerateTicket) {
      let serviceType = ServiceType.CEDULACION;
      if (selectedCategoria === 'registro_civil') serviceType = ServiceType.REGISTRO;
      else if (selectedCategoria === 'extranjeria') serviceType = ServiceType.EXTRANJERIA;
      else if (selectedCategoria === 'organizacion_electoral') serviceType = ServiceType.ELECTORAL;

      let procedureCode: string | undefined = undefined;
      if (selectedCategoria === 'organizacion_electoral' || sub.includes('oe_') || sub.includes('afiliacion') || sub.includes('residencia')) {
        procedureCode = 'OE';
      } else if (sub.includes('renovacion')) procedureCode = 'REN';
      else if (sub.includes('primera_vez') || sub.includes('primera')) procedureCode = 'CPV';
      else if (sub.includes('duplicado')) procedureCode = 'DUP';
      else if (sub.includes('juvenil')) procedureCode = 'CJ';

      const citizenName = datosPersonales.nombreCompleto || 
        `${datosPersonales.primerNombre || ''} ${datosPersonales.primerApellido || ''}`.trim() || 'Ciudadano Cita';

      // Only mark as preferential if citizen specifically indicated disability or priority
      const isPriorityCitizen = Boolean(datosPersonales.tieneDiscapacidad);
      const ticket = onCreateTicket(
        `${citizenName} (${datosPersonales.identificacion || 'Cédula'})`,
        serviceType,
        isPriorityCitizen,
        true, // isAppointment = true -> Displays 📅 CITA PREVIA
        procedureCode
      );
      ticketTurnoCode = ticket.numberCode;
    }

    let numeroCitaDia: number | undefined = undefined;
    if (selectedCategoria === 'extranjeria') {
      const dayCount = citasList.filter(c => 
        c.fecha === fecha && 
        (c.servicioCategoria === 'extranjeria' || c.subServicioId?.includes('extranjero') || c.subServicioId?.startsWith('ext_')) && 
        c.estado !== 'cancelada'
      ).length;
      numeroCitaDia = dayCount + 1;
    }

    const citizenFullName = datosPersonales.nombreCompleto || [
      datosPersonales.primerNombre,
      datosPersonales.segundoNombre,
      datosPersonales.primerApellido,
      datosPersonales.segundoApellido
    ].map(s => String(s || '').trim()).filter(Boolean).join(' ') || (datosPersonales.pasaporte ? `Ciudadano (${datosPersonales.pasaporte})` : 'Ciudadano');

    const sanitizedDatosPersonales: DatosPersonales = {
      ...datosPersonales,
      nombreCompleto: datosPersonales.nombreCompleto || citizenFullName
    };

    const nuevaCita: Cita = {
      id: newId,
      datosPersonales: sanitizedDatosPersonales,
      nombre: citizenFullName,
      servicioCategoria: selectedCategoria,
      subServicioId: selectedSubServicioId,
      sucursalId,
      fecha,
      hora,
      codigoTransaccion: finalTxCode,
      fechaCreacion: new Date().toISOString(),
      estado: 'confirmada',
      ticketTurnoCode,
      llegadaConfirmadaAuto: true,
      numeroCitaDia,
    };

    const updated = [nuevaCita, ...citasList];
    saveCitas(updated);
    setActiveCita(nuevaCita);
    setCurrentStep(4);
  };

  const handleCancelCita = (citaId: string) => {
    const updated = citasList.map(c => c.id === citaId ? { ...c, estado: 'cancelada' as const } : c);
    saveCitas(updated);
    if (activeCita && activeCita.id === citaId) {
      setActiveCita({ ...activeCita, estado: 'cancelada' });
    }
  };

  const handleDeleteCita = async (citaId: string) => {
    const updated = citasList.filter(c => c.id !== citaId);
    saveCitas(updated);
    if (activeCita && activeCita.id === citaId) {
      setActiveCita(null);
      setCurrentStep(1);
    }
    try {
      const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token') || 'superadmin_token';
      await fetch(`/api/appointments/${citaId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
    } catch (e) {
      console.error('Error deleting appointment from server:', e);
    }
  };

  const resetFlow = () => {
    setDatosPersonales(null);
    setSelectedCategoria(null);
    setSelectedSubServicioId(null);
    setSelectedSucursalId(null);
    setSelectedFecha(null);
    setSelectedHora(null);
    setActiveCita(null);
    setCurrentStep(1);
  };

  return (
    <div id="citas-app-root" className="w-full min-h-screen bg-slate-50 flex flex-col font-sans antialiased rounded-2xl overflow-hidden shadow-lg border border-slate-200">
      {/* Decorative Superior Flags of Panama strip */}
      <div className="w-full h-1.5 flex" aria-hidden="true">
        <div className="flex-1 bg-white"></div>
        <div className="flex-1 bg-red-600"></div>
        <div className="flex-1 bg-blue-900"></div>
        <div className="flex-1 bg-white"></div>
      </div>

      {/* Hero Header Banner */}
      <section className="bg-gradient-to-r from-blue-950 via-blue-900 to-slate-900 text-white py-8 px-4 text-center space-y-3 print:hidden flex flex-col items-center justify-center transition-all duration-300 border-b border-blue-800/50">
        <img
          src={cmsConfig?.logoUrl || "/images/logo-te-aniversario-1.png"}
          alt={cmsConfig?.siteTitle || "Tribunal Electoral de Panamá"}
          className="h-20 sm:h-24 md:h-28 w-auto object-contain mx-auto"
          referrerPolicy="no-referrer"
        />
        <h2 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight max-w-4xl mx-auto leading-tight uppercase text-white">
          {cmsConfig?.customTexts?.welcomeTitle || "Bienvenido al portal de citas del Tribunal Electoral"}
        </h2>
        {(cmsConfig?.customTexts?.welcomeSubtitle || cmsConfig?.siteSubtitle) && (
          <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl mx-auto font-medium">
            {cmsConfig?.customTexts?.welcomeSubtitle || cmsConfig?.siteSubtitle || "Solicitud y agendamiento de citas en línea rápidos y seguros"}
          </p>
        )}
      </section>

      {/* Main content body */}
      <main className="flex-1 w-full max-w-none px-3 sm:px-6 md:px-8 py-4 block">
        {activeTab === 'admin' ? (
          <div className="w-full">
            <AdminPanel 
              citas={citasList} 
              onUpdateCitas={saveCitas}
              onClose={() => setActiveTab('agendar')}
            />
          </div>
        ) : (
          <div className="w-full space-y-6">
            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 sm:p-6 md:p-8 space-y-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeTab}-${currentStep}`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {currentStep === 1 && (
                    <SeleccionServicio
                      selectedCategoria={selectedCategoria}
                      selectedSubServicioId={selectedSubServicioId}
                      onSelect={handleStep2Success}
                      cmsConfig={cmsConfig}
                    />
                  )}
                  {currentStep === 2 && (
                    <FormularioDatos 
                      initialData={datosPersonales || undefined}
                      onSuccess={handleStep1Success} 
                      onBack={() => setCurrentStep(1)}
                      selectedSubServicioId={selectedSubServicioId}
                      selectedCategoria={selectedCategoria}
                      cmsConfig={cmsConfig}
                    />
                  )}
                  {currentStep === 3 && (
                    <AgendamientoCita
                      selectedSucursalId={selectedSucursalId}
                      selectedFecha={selectedFecha}
                      selectedHora={selectedHora}
                      onBack={() => setCurrentStep(2)}
                      onSubmit={handleStep3Success}
                      selectedCategoria={selectedCategoria}
                      selectedSubServicioId={selectedSubServicioId}
                    />
                  )}
                  {currentStep === 4 && activeCita && (
                    <CitaComprobante
                      cita={activeCita}
                      onDone={() => {
                        resetFlow();
                        setActiveTab('agendar');
                      }}
                      onCancelCita={handleCancelCita}
                      onDeleteCita={handleDeleteCita}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        )}
      </main>

      {/* Corporate Footer */}
      <footer className="bg-slate-800 text-slate-400 text-xs py-6 border-t border-slate-900 print:hidden mt-auto">
        <div className="w-full max-w-none px-4 sm:px-6 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="text-center md:text-left space-y-1">
            <span className="font-bold text-white block">{cmsConfig?.siteTitle || "Tribunal Electoral de Panamá"}</span>
            <p className="text-[11px]">
              {cmsConfig?.customTexts?.footerText || `© ${new Date().getFullYear()} – Portal oficial institucional de Citas Tecnológicas y Gestión de Turnos.`}
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
