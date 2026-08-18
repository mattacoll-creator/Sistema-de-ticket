import React, { useState, useEffect } from 'react';
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

export default function CitasApp({ initialTab = 'agendar', onNavigateToTurnos, onCreateTicket }: CitasAppProps) {
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
      const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token') || '';
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/appointments', { headers });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.appointments || []);
        if (Array.isArray(list) && list.length > 0) {
          setCitasList(list);
          localStorage.setItem('citas_tribunal_electoral_v2', JSON.stringify(list));
          return;
        }
      }
    } catch (e) {
      console.warn('Could not fetch appointments from server, loading local backup:', e);
    }

    const saved = localStorage.getItem('citas_tribunal_electoral_v2');
    if (saved) {
      try {
        setCitasList(JSON.parse(saved));
      } catch (err) {
        console.error('Error parsing local appointments:', err);
      }
    }
  };

  useEffect(() => {
    fetchAppointments();
  }, []);

  const saveCitas = async (newList: Cita[]) => {
    setCitasList(newList);
    localStorage.setItem('citas_tribunal_electoral_v2', JSON.stringify(newList));
    try {
      await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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

    const alpha = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += alpha.charAt(Math.floor(Math.random() * alpha.length));
    }
    const finalTxCode = `${fecha.replace(/-/g, '').substring(2)}-${code}`;

    let ticketTurnoCode: string | undefined = undefined;

    if (onCreateTicket) {
      let serviceType = ServiceType.CEDULACION;
      if (selectedCategoria === 'registro_civil') serviceType = ServiceType.REGISTRO;
      else if (selectedCategoria === 'extranjeria') serviceType = ServiceType.EXTRANJERIA;
      else if (selectedCategoria === 'organizacion_electoral') serviceType = ServiceType.ELECTORAL;

      let procedureCode: string | undefined = undefined;
      const sub = (selectedSubServicioId || '').toLowerCase();
      if (selectedCategoria === 'organizacion_electoral' || sub.includes('oe_') || sub.includes('afiliacion') || sub.includes('residencia')) {
        procedureCode = 'OE';
      } else if (sub.includes('renovacion')) procedureCode = 'REN';
      else if (sub.includes('primera_vez') || sub.includes('primera')) procedureCode = 'CPV';
      else if (sub.includes('duplicado')) procedureCode = 'DUP';
      else if (sub.includes('juvenil')) procedureCode = 'CJ';

      const citizenName = datosPersonales.nombreCompleto || 
        `${datosPersonales.primerNombre || ''} ${datosPersonales.primerApellido || ''}`.trim() || 'Ciudadano Cita';

      // Automatically issue ticket directly to TV Queue (skipping manual arrival/confirmation)
      const ticket = onCreateTicket(
        `${citizenName} (${datosPersonales.identificacion || 'Cédula'})`,
        serviceType,
        datosPersonales.tieneDiscapacidad || false,
        true, // isAppointment = true -> Displays 📅 CITA PREVIA on TV!
        procedureCode
      );
      ticketTurnoCode = ticket.numberCode;
    }

    const nuevaCita: Cita = {
      id: `TE-${Date.now()}`,
      datosPersonales,
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

  const handleDeleteCita = (citaId: string) => {
    const updated = citasList.filter(c => c.id !== citaId);
    saveCitas(updated);
    if (activeCita && activeCita.id === citaId) {
      setActiveCita(null);
      setCurrentStep(1);
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
          src={cmsConfig?.logoUrl || "https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/06/Logo-TE-aniversario-256x256px-blanco-02.png"}
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
          <div className="flex flex-wrap gap-4 text-[11px] justify-center items-center">
            <button 
              type="button" 
              onClick={() => setActiveTab(activeTab === 'admin' ? 'agendar' : 'admin')}
              className="hover:text-white font-semibold cursor-pointer transition flex items-center gap-1 text-slate-300"
            >
              <span>{activeTab === 'admin' ? 'Regresar a Agendamiento' : 'Acceso Administrativo de Citas'}</span>
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
