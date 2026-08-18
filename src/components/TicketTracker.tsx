import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search,
  Smartphone,
  Bell,
  Volume2,
  VolumeX,
  Vibrate,
  Navigation,
  MapPin,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  QrCode,
  Share2,
  RefreshCw,
  Info,
  ShieldCheck,
  Check,
  Building2,
  Layers,
  DollarSign,
  Camera,
  ExternalLink
} from "lucide-react";
import { Ticket, Cubicle, TicketStatus, TicketPhase, ServiceType, SERVICES_CONFIG } from "../types";
import { triggerHapticVibration, isVibrationSupported, playCallingChime } from "../utils/audio";
import { getProcedureName } from "./WelcomeKiosk";

interface TicketTrackerProps {
  tickets: Ticket[];
  cubicles: Cubicle[];
  initialTicketCode?: string;
  onNavigateToKiosk?: () => void;
  currentOfficeId?: string;
}

export default function TicketTracker({
  tickets,
  cubicles,
  initialTicketCode = "",
  onNavigateToKiosk,
  currentOfficeId = "OFF-1"
}: TicketTrackerProps) {
  const [searchInput, setSearchInput] = useState(initialTicketCode);
  const [selectedTicketCode, setSelectedTicketCode] = useState<string>(() => {
    if (initialTicketCode) return initialTicketCode.trim().toUpperCase();
    const saved = localStorage.getItem("last_tracked_ticket_code");
    return saved ? saved.trim().toUpperCase() : "";
  });

  const [soundEnabled, setSoundEnabled] = useState(true);
  const [vibrationEnabled, setVibrationEnabled] = useState(true);
  const [hasTestedAlerts, setHasTestedAlerts] = useState(false);
  const [isVibratingNow, setIsVibratingNow] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const prevTicketStatusRef = useRef<TicketStatus | null>(null);
  const prevAssignedCubicleRef = useRef<string | null>(null);

  // Check URL query parameters for ?ticket=C-01
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ticketParam = urlParams.get("ticket");
      if (ticketParam) {
        setSelectedTicketCode(ticketParam.trim().toUpperCase());
        setSearchInput(ticketParam.trim().toUpperCase());
      }
    } catch (e) {
      console.warn("No se pudo leer query param ticket:", e);
    }
  }, []);

  // Save selected ticket code in localStorage
  useEffect(() => {
    if (selectedTicketCode) {
      localStorage.setItem("last_tracked_ticket_code", selectedTicketCode);
    }
  }, [selectedTicketCode]);

  // Find the tracked ticket matching either numberCode or ID
  const trackedTicket = useMemo(() => {
    if (!selectedTicketCode) return null;
    const cleanCode = selectedTicketCode.trim().toUpperCase();
    return tickets.find(
      (t) =>
        t.numberCode.toUpperCase() === cleanCode ||
        t.id.toUpperCase() === cleanCode ||
        t.id.toUpperCase().includes(cleanCode) ||
        t.numberCode.toUpperCase().replace("-", "") === cleanCode.replace("-", "")
    );
  }, [tickets, selectedTicketCode]);

  // Find the assigned cubicle if ticket is currently called or attended
  const assignedCubicle = useMemo(() => {
    if (!trackedTicket || !trackedTicket.assignedCubicleId) return null;
    return cubicles.find((c) => c.id === trackedTicket.assignedCubicleId) || null;
  }, [trackedTicket, cubicles]);

  // Calculate position in queue and estimated wait time
  const queueStats = useMemo(() => {
    if (!trackedTicket || trackedTicket.status !== TicketStatus.WAITING) {
      return { position: 0, waitTimeMin: 0, peopleAhead: 0 };
    }

    // Tickets in the same phase and service waiting ahead
    const aheadTickets = tickets.filter(
      (t) =>
        t.status === TicketStatus.WAITING &&
        t.currentPhase === trackedTicket.currentPhase &&
        t.createdAt < trackedTicket.createdAt
    );

    const peopleAhead = aheadTickets.length;
    const avgMinutesPerPerson = trackedTicket.currentPhase === TicketPhase.CAJA ? 3 : 5;
    const waitTimeMin = Math.max(2, (peopleAhead + 1) * avgMinutesPerPerson);

    return {
      position: peopleAhead + 1,
      peopleAhead,
      waitTimeMin
    };
  }, [trackedTicket, tickets]);

  // Trigger vibration & audio alert when ticket enters CALLING status
  useEffect(() => {
    if (!trackedTicket) return;

    const currentStatus = trackedTicket.status;
    const isNowCalling = currentStatus === TicketStatus.CALLING;
    const wasNotCalling = prevTicketStatusRef.current !== TicketStatus.CALLING;
    const cubicleChanged = prevAssignedCubicleRef.current !== trackedTicket.assignedCubicleId;

    if (isNowCalling && (wasNotCalling || cubicleChanged)) {
      // Trigger mobile vibration!
      if (vibrationEnabled) {
        setIsVibratingNow(true);
        triggerHapticVibration([500, 200, 500, 200, 800, 300, 800]);
        setTimeout(() => setIsVibratingNow(false), 3000);
      }

      // Play chime sound
      if (soundEnabled) {
        playCallingChime();
      }
    }

    prevTicketStatusRef.current = currentStatus;
    prevAssignedCubicleRef.current = trackedTicket.assignedCubicleId || null;
  }, [trackedTicket, vibrationEnabled, soundEnabled]);

  // Test alerts function
  const handleTestAlerts = async () => {
    setHasTestedAlerts(true);
    setIsVibratingNow(true);

    if (vibrationEnabled) {
      triggerHapticVibration([400, 150, 400, 150, 600]);
    }

    if (soundEnabled) {
      await playCallingChime();
    }

    setTimeout(() => {
      setIsVibratingNow(false);
    }, 2000);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSelectedTicketCode(searchInput.trim().toUpperCase());
    }
  };

  const handleShareTicket = () => {
    if (!trackedTicket) return;
    const shareUrl = `${window.location.origin}${window.location.pathname}?ticket=${trackedTicket.numberCode}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Recent active tickets in queue for quick selection
  const recentQueueTickets = useMemo(() => {
    return tickets
      .filter((t) => t.status === TicketStatus.WAITING || t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING)
      .slice(0, 8);
  }, [tickets]);

  return (
    <div id="ticket-tracker-screen" className="max-w-4xl mx-auto space-y-6 animate-fadeIn pb-12 font-sans">
      {/* Top Banner / Mobile Optimization Notice */}
      <div className="bg-gradient-to-r from-[#003087] via-[#122e70] to-[#0a194e] text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden border border-blue-900/40">
        <div className="absolute -right-10 -bottom-10 w-48 h-48 bg-amber-400/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute top-0 right-0 p-6 opacity-15 pointer-events-none hidden sm:block">
          <Smartphone className="w-32 h-32 text-white" />
        </div>

        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-400 text-slate-950 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm">
            <Smartphone className="w-3.5 h-3.5" />
            <span>Sistema Móvil con Vibración Háptica</span>
          </div>

          <div className="space-y-1.5">
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-wide text-white leading-tight">
              Seguimiento de Turno en Vivo
            </h2>
            <p className="text-xs sm:text-sm text-blue-100/90 font-medium leading-relaxed">
              Consulte su turno en tiempo real. Le indicamos exactamente a qué módulo o caja dirigirse y <strong>hacemos vibrar su celular</strong> al momento del llamado.
            </p>
          </div>

          {/* Quick Audio & Vibration permission testing bar */}
          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              id="btn-test-mobile-vibration"
              type="button"
              onClick={handleTestAlerts}
              className={`px-4 py-2.5 rounded-2xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer transition-all shadow-md active:scale-95 ${
                isVibratingNow
                  ? "bg-amber-400 text-slate-950 animate-bounce"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/20"
              }`}
            >
              <Vibrate className={`w-4 h-4 ${isVibratingNow ? "text-slate-950 animate-spin" : "text-amber-300"}`} />
              <span>{isVibratingNow ? "¡Vibrando y Sonando!" : "🔔 Probar Vibración y Timbre"}</span>
            </button>

            <button
              type="button"
              onClick={() => setVibrationEnabled(!vibrationEnabled)}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all border ${
                vibrationEnabled
                  ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                  : "bg-red-500/20 border-red-400/40 text-red-200"
              }`}
            >
              <Vibrate className="w-3.5 h-3.5" />
              <span>Vibración: {vibrationEnabled ? "Activada" : "Desactivada"}</span>
            </button>

            <button
              type="button"
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`px-3 py-2 rounded-xl text-[11px] font-bold uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-all border ${
                soundEnabled
                  ? "bg-emerald-500/20 border-emerald-400/40 text-emerald-200"
                  : "bg-red-500/20 border-red-400/40 text-red-200"
              }`}
            >
              {soundEnabled ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
              <span>Timbre: {soundEnabled ? "Activado" : "Silenciado"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* SEARCH / INPUT CARD */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200/80 shadow-sm space-y-4">
        <form onSubmit={handleSearchSubmit} className="space-y-3">
          <label htmlFor="ticket-search-input" className="block text-xs font-black uppercase tracking-wider text-slate-800">
            🔍 Ingrese el Número de su Ticket o Cédula:
          </label>
          <div className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <input
                id="ticket-search-input"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Ejemplo: C-01, C-14, O-02, RC-05 o su Cédula"
                className="w-full pl-4 pr-10 py-3.5 text-base font-black text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-[#003087] focus:bg-white focus:outline-none uppercase tracking-wider transition-all placeholder:normal-case placeholder:font-medium placeholder:text-slate-400"
              />
              {searchInput && (
                <button
                  type="button"
                  onClick={() => setSearchInput("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 font-bold p-1"
                >
                  ✕
                </button>
              )}
            </div>
            <button
              id="btn-search-ticket"
              type="submit"
              className="px-6 py-3.5 bg-[#003087] hover:bg-[#122e70] text-white font-black text-xs uppercase tracking-wider rounded-2xl transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Search className="w-4 h-4 text-amber-400" />
              <span>Consultar Turno</span>
            </button>
          </div>
        </form>

        {/* Quick select chips for active tickets */}
        {recentQueueTickets.length > 0 && (
          <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Turnos Activos en Sala:
            </span>
            {recentQueueTickets.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => {
                  setSearchInput(t.numberCode);
                  setSelectedTicketCode(t.numberCode);
                }}
                className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer border ${
                  selectedTicketCode === t.numberCode
                    ? "bg-[#003087] text-white border-[#003087] shadow-sm"
                    : t.status === TicketStatus.CALLING
                    ? "bg-amber-100 text-amber-900 border-amber-300 animate-pulse"
                    : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                }`}
              >
                {t.numberCode} {t.status === TicketStatus.CALLING && "🚨"}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* TRACKED TICKET DISPLAY */}
      {trackedTicket ? (
        <div className="space-y-6">
          {/* Main Status & Destination Guidance Card */}
          <div
            className={`rounded-3xl p-6 sm:p-8 border-2 transition-all duration-300 shadow-lg relative overflow-hidden ${
              trackedTicket.status === TicketStatus.CALLING
                ? "bg-gradient-to-br from-amber-500 via-amber-400 to-yellow-300 border-amber-500 text-slate-950 animate-pulse"
                : trackedTicket.status === TicketStatus.ATTENDING
                ? "bg-gradient-to-br from-blue-900 via-[#122e70] to-[#003087] border-blue-900 text-white"
                : trackedTicket.status === TicketStatus.COMPLETED
                ? "bg-gradient-to-br from-emerald-800 to-teal-900 border-emerald-700 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Pulsing indicator top badge */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-black/10">
              <div className="flex items-center gap-2">
                <span
                  className={`w-3 h-3 rounded-full ${
                    trackedTicket.status === TicketStatus.CALLING
                      ? "bg-red-600 animate-ping"
                      : trackedTicket.status === TicketStatus.ATTENDING
                      ? "bg-emerald-400 animate-pulse"
                      : "bg-blue-600"
                  }`}
                />
                <span className="text-xs font-black uppercase tracking-widest">
                  {trackedTicket.status === TicketStatus.CALLING && "🚨 ¡SU TURNO ESTÁ SIENDO LLAMADO!"}
                  {trackedTicket.status === TicketStatus.ATTENDING && "🟢 USTED ESTÁ EN ATENCIÓN"}
                  {trackedTicket.status === TicketStatus.WAITING && "⏳ TURNO EN ESPERA • ATENTO A LA PANTALLA"}
                  {trackedTicket.status === TicketStatus.COMPLETED && "✅ TRÁMITE COMPLETADO"}
                  {trackedTicket.status === TicketStatus.MISSED && "⚠️ TURNO NO PRESENTADO"}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareTicket}
                  className="px-3 py-1 bg-black/10 hover:bg-black/20 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
                  title="Copiar enlace para seguir este ticket"
                >
                  <Share2 className="w-3 h-3" />
                  <span>{copiedLink ? "¡Enlace Copiado!" : "Compartir Turno"}</span>
                </button>
              </div>
            </div>

            {/* Huge Number & Citizen Name */}
            <div className="py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-black uppercase tracking-widest opacity-75">
                  Número de Turno Asignado:
                </span>
                <h1 className="text-6xl sm:text-7xl font-black tracking-tight leading-none font-sans">
                  {trackedTicket.numberCode}
                </h1>
                <p className="text-base font-extrabold uppercase pt-1">
                  Ciudadano: {trackedTicket.name}
                </p>
                <p className="text-xs font-bold opacity-85 uppercase">
                  Trámite:{" "}
                  {trackedTicket.procedure
                    ? getProcedureName(trackedTicket.procedure)
                    : SERVICES_CONFIG[trackedTicket.serviceType]?.name || "Cedulación"}
                </p>
              </div>

              {/* Status Pill & Priority Badge */}
              <div className="flex flex-col items-start sm:items-end gap-2">
                {trackedTicket.priority && (
                  <span className="px-3.5 py-1.5 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                    ♿ Atención Prioritaria
                  </span>
                )}
                {trackedTicket.isAppointment && (
                  <span className="px-3.5 py-1.5 bg-blue-700 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-sm flex items-center gap-1.5">
                    📅 Con Cita Previa
                  </span>
                )}
                <div className="text-[11px] font-mono font-bold opacity-75 pt-1">
                  Registrado: {new Date(trackedTicket.createdAt).toLocaleTimeString()}
                </div>
              </div>
            </div>

            {/* 📍 DESTINATION BOX: EXACTLY WHERE TO GO */}
            <div className="mt-4 p-5 sm:p-6 bg-white/95 text-slate-950 rounded-2xl shadow-md border border-black/10 space-y-4">
              <div className="flex items-start gap-3">
                <div
                  className={`p-3 rounded-2xl shrink-0 ${
                    trackedTicket.status === TicketStatus.CALLING
                      ? "bg-red-600 text-white animate-bounce"
                      : "bg-[#003087] text-amber-400"
                  }`}
                >
                  <MapPin className="w-7 h-7" />
                </div>

                <div className="space-y-1 flex-1">
                  <span className="text-[11px] font-black uppercase tracking-widest text-slate-500">
                    {trackedTicket.status === TicketStatus.CALLING
                      ? "👉 DIRÍJASE INMEDIATAMENTE A:"
                      : trackedTicket.status === TicketStatus.ATTENDING
                      ? "📍 LUGAR DE ATENCIÓN ACTUAL:"
                      : "📍 PRÓXIMO DESTINO ESTIMADO:"}
                  </span>

                  {assignedCubicle ? (
                    <div>
                      <h3 className="text-2xl sm:text-3xl font-black text-[#003087] uppercase leading-tight">
                        {assignedCubicle.name}
                      </h3>
                      <p className="text-xs font-bold text-slate-600 mt-0.5">
                        Operador Responsable: <strong>{assignedCubicle.agentName}</strong>
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase leading-tight">
                        {trackedTicket.currentPhase === TicketPhase.CAJA
                          ? "Área de Cajas (Cajas 0 a 8)"
                          : "Área de Tríada y Fotografía (Módulos 10 a 17)"}
                      </h3>
                      <p className="text-xs font-medium text-slate-600 mt-1">
                        {trackedTicket.currentPhase === TicketPhase.CAJA
                          ? "Al ser llamado pasará a la ventanilla de Caja asignada para cobro y revisión inicial."
                          : "Al ser llamado pasará al módulo correspondiente para captura biométrica, toma de foto y firma."}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Instructions on where to walk */}
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl text-xs space-y-2 font-medium text-slate-700">
                <div className="flex items-center gap-2 font-bold text-[#003087] uppercase text-[11px]">
                  <Navigation className="w-4 h-4 text-amber-500" />
                  <span>Instrucciones de Orientación en Sala:</span>
                </div>
                {trackedTicket.currentPhase === TicketPhase.CAJA ? (
                  <p className="leading-relaxed">
                    💵 <strong>Cajas 0 a 8:</strong> Ubicadas a la derecha de la entrada principal. Si tiene atención preferencial, será atendido en las <strong>Cajas 0 u 8</strong>. Tenga a mano su documentación y método de pago (tarjeta o efectivo).
                  </p>
                ) : (
                  <p className="leading-relaxed">
                    📷 <strong>Módulos 10 a 17 (Tríada y Fotografía):</strong> Ubicados en el salón central. Los <strong>Módulos 16 y 17</strong> están reservados para atención preferencial. Los <strong>Módulos 10 al 15</strong> atienden la fila general.
                  </p>
                )}
              </div>
            </div>

            {/* Queue position & wait time if still waiting */}
            {trackedTicket.status === TicketStatus.WAITING && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-2xl flex items-center gap-3 text-blue-950">
                  <Users className="w-6 h-6 text-[#003087] shrink-0" />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 block">
                      Turnos por Delante
                    </span>
                    <span className="text-xl font-black text-[#003087]">
                      {queueStats.peopleAhead === 0 ? "¡Usted es el siguiente!" : `${queueStats.peopleAhead} personas`}
                    </span>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-center gap-3 text-amber-950">
                  <Clock className="w-6 h-6 text-amber-600 shrink-0" />
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 block">
                      Tiempo Estimado
                    </span>
                    <span className="text-xl font-black text-amber-900">
                      ~{queueStats.waitTimeMin} min aprox.
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Stepper Progress Bar */}
          <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-4">
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#003087]" />
              <span>Progreso del Flujo de Atención</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Step 1: Kiosk / Entry */}
              <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                  ✓
                </div>
                <div>
                  <h5 className="text-xs font-black uppercase text-emerald-950">1. Emisión de Turno</h5>
                  <p className="text-[11px] text-emerald-800 font-medium">Turno emitido en Kiosco</p>
                </div>
              </div>

              {/* Step 2: Caja */}
              <div
                className={`p-4 rounded-2xl border-2 flex items-start gap-3 ${
                  trackedTicket.currentPhase === TicketPhase.CAJA && trackedTicket.status !== TicketStatus.COMPLETED
                    ? "border-[#003087] bg-blue-50/60 shadow-sm"
                    : trackedTicket.currentPhase === TicketPhase.TRIADA || trackedTicket.status === TicketStatus.COMPLETED
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-slate-200 bg-slate-50 opacity-60"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                    trackedTicket.currentPhase === TicketPhase.TRIADA || trackedTicket.status === TicketStatus.COMPLETED
                      ? "bg-emerald-500 text-white"
                      : trackedTicket.currentPhase === TicketPhase.CAJA
                      ? "bg-[#003087] text-white animate-pulse"
                      : "bg-slate-300 text-slate-700"
                  }`}
                >
                  {trackedTicket.currentPhase === TicketPhase.TRIADA || trackedTicket.status === TicketStatus.COMPLETED ? "✓" : "2"}
                </div>
                <div>
                  <h5 className="text-xs font-black uppercase text-slate-900">2. Caja y Revisión</h5>
                  <p className="text-[11px] text-slate-600 font-medium">Cajas 0 a 8 (Pago/Validación)</p>
                </div>
              </div>

              {/* Step 3: Tríada / Fotografía */}
              <div
                className={`p-4 rounded-2xl border-2 flex items-start gap-3 ${
                  trackedTicket.currentPhase === TicketPhase.TRIADA && trackedTicket.status !== TicketStatus.COMPLETED
                    ? "border-[#003087] bg-blue-50/60 shadow-sm"
                    : trackedTicket.status === TicketStatus.COMPLETED
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-slate-200 bg-slate-50 opacity-60"
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center font-black text-xs shrink-0 ${
                    trackedTicket.status === TicketStatus.COMPLETED
                      ? "bg-emerald-500 text-white"
                      : trackedTicket.currentPhase === TicketPhase.TRIADA
                      ? "bg-[#003087] text-white animate-pulse"
                      : "bg-slate-300 text-slate-700"
                  }`}
                >
                  {trackedTicket.status === TicketStatus.COMPLETED ? "✓" : "3"}
                </div>
                <div>
                  <h5 className="text-xs font-black uppercase text-slate-900">3. Tríada y Foto</h5>
                  <p className="text-[11px] text-slate-600 font-medium">Módulos 10 al 17 (Foto y Firma)</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : selectedTicketCode ? (
        /* Ticket not found warning */
        <div className="bg-white rounded-3xl p-8 border border-slate-200 text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto border border-amber-200">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <div className="space-y-1">
            <h3 className="text-lg font-black uppercase text-slate-900">
              No se encontró el turno "{selectedTicketCode}"
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto leading-relaxed">
              Verifique que el código esté escrito tal como aparece en su ticket impreso (ejemplo: <strong>C-01</strong>, <strong>C-12</strong>) o seleccione uno de los turnos activos en sala.
            </p>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => setSelectedTicketCode("")}
              className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl cursor-pointer"
            >
              Borrar y Buscar de Nuevo
            </button>
          </div>
        </div>
      ) : null}

      {/* DIRECTORY & CUBICLE REFERENCE MAP */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-slate-200 shadow-sm space-y-5">
        <div className="space-y-1 border-b border-slate-100 pb-3">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#003087]" />
            <span>Guía de Ventanillas y Módulos de Atención (Sede)</span>
          </h3>
          <p className="text-xs text-slate-500 font-medium">
            Conozca la distribución de módulos de la Dirección Nacional de Cedulación y Registro Civil.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Box 1: Cajas */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 font-black text-[#003087] uppercase text-xs">
              <DollarSign className="w-4 h-4 text-emerald-600" />
              <span>Área de Cajas (Cajas 0 a 8)</span>
            </div>
            <ul className="space-y-1 text-slate-600 font-medium pl-1">
              <li>• <strong>Cajas 0 y 8:</strong> Módulos Preferenciales de Cobro.</li>
              <li>• <strong>Cajas 1 a 7:</strong> Módulos de Cobro General.</li>
              <li>• Pago de cédulas por primera vez, duplicados y certificaciones.</li>
            </ul>
          </div>

          {/* Box 2: Tríada y Fotografía */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 font-black text-[#003087] uppercase text-xs">
              <Camera className="w-4 h-4 text-cyan-600" />
              <span>Tríada y Fotografía (Módulos 10 a 17)</span>
            </div>
            <ul className="space-y-1 text-slate-600 font-medium pl-1">
              <li>• <strong>Módulos 10 al 15:</strong> Atención y Captura General.</li>
              <li>• <strong>Módulos 16 y 17:</strong> Módulos Preferenciales de Tríada y Foto.</li>
              <li>• Toma de fotografía oficial, huellas dactilares y firma digital.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
