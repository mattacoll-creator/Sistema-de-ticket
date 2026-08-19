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
  ExternalLink,
  ChevronDown,
  X,
  Trash2
} from "lucide-react";
import { Ticket, Cubicle, TicketStatus, TicketPhase, ServiceType, SERVICES_CONFIG, OFFICES_CONFIG, Office } from "../types";
import { triggerHapticVibration, isVibrationSupported, playCallingChime } from "../utils/audio";
import { getProcedureName } from "./WelcomeKiosk";

interface TicketTrackerProps {
  tickets: Ticket[];
  cubicles: Cubicle[];
  initialTicketCode?: string;
  onNavigateToKiosk?: () => void;
  currentOfficeId?: string;
  officeTickets?: Record<string, Ticket[]>;
  officeCubicles?: Record<string, Cubicle[]>;
  onSelectOffice?: (officeId: string) => void;
}

export default function TicketTracker({
  tickets,
  cubicles,
  initialTicketCode = "",
  onNavigateToKiosk,
  currentOfficeId = "OFF-1",
  officeTickets = {},
  officeCubicles = {},
  onSelectOffice
}: TicketTrackerProps) {
  // Active regional office state
  const [activeOfficeId, setActiveOfficeId] = useState<string>(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const officeParam = urlParams.get("office");
      if (officeParam && OFFICES_CONFIG.some((o) => o.id === officeParam)) {
        return officeParam;
      }
      const savedOffice = localStorage.getItem("tracker_selected_office");
      if (savedOffice && OFFICES_CONFIG.some((o) => o.id === savedOffice)) {
        return savedOffice;
      }
    } catch (e) {
      console.warn("Error reading office parameter:", e);
    }
    return currentOfficeId || "OFF-1";
  });

  const [isOfficeSelectorOpen, setIsOfficeSelectorOpen] = useState(false);
  const [crossOfficeFoundMsg, setCrossOfficeFoundMsg] = useState<string | null>(null);

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

  // Sync active office if parent prop changes and user hasn't explicitly overridden
  useEffect(() => {
    if (currentOfficeId && !localStorage.getItem("tracker_selected_office")) {
      setActiveOfficeId(currentOfficeId);
    }
  }, [currentOfficeId]);

  // Save selected office in localStorage
  const handleOfficeChange = (officeId: string) => {
    setActiveOfficeId(officeId);
    localStorage.setItem("tracker_selected_office", officeId);
    setIsOfficeSelectorOpen(false);
    if (onSelectOffice) {
      onSelectOffice(officeId);
    }
  };

  // Get active office configuration
  const activeOffice = useMemo(() => {
    return OFFICES_CONFIG.find((o) => o.id === activeOfficeId) || OFFICES_CONFIG[0];
  }, [activeOfficeId]);

  // Derived effective tickets and cubicles for the active regional office
  const effectiveTickets = useMemo(() => {
    if (officeTickets && officeTickets[activeOfficeId]) {
      return officeTickets[activeOfficeId];
    }
    return tickets;
  }, [officeTickets, activeOfficeId, tickets]);

  const effectiveCubicles = useMemo(() => {
    if (officeCubicles && officeCubicles[activeOfficeId]) {
      return officeCubicles[activeOfficeId];
    }
    return cubicles;
  }, [officeCubicles, activeOfficeId, cubicles]);

  // Check URL query parameters for ?ticket=C-01&office=OFF-5
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const ticketParam = urlParams.get("ticket");
      const officeParam = urlParams.get("office");

      if (officeParam && OFFICES_CONFIG.some((o) => o.id === officeParam)) {
        setActiveOfficeId(officeParam);
      }
      if (ticketParam) {
        setSelectedTicketCode(ticketParam.trim().toUpperCase());
        setSearchInput(ticketParam.trim().toUpperCase());
      }
    } catch (e) {
      console.warn("No se pudo leer query params:", e);
    }
  }, []);

  // Save selected ticket code in localStorage
  useEffect(() => {
    if (selectedTicketCode) {
      localStorage.setItem("last_tracked_ticket_code", selectedTicketCode);
    }
  }, [selectedTicketCode]);

  // Find the tracked ticket matching either numberCode or ID
  // If not found in current regional office, search across ALL regional offices!
  const trackedTicket = useMemo(() => {
    if (!selectedTicketCode) return null;
    const cleanCode = selectedTicketCode.trim().toUpperCase();
    const cleanNormalized = cleanCode.replace(/[-\s]/g, "");

    const matchFn = (t: Ticket) =>
      t.numberCode.toUpperCase() === cleanCode ||
      t.id.toUpperCase() === cleanCode ||
      t.id.toUpperCase().includes(cleanCode) ||
      t.numberCode.toUpperCase().replace(/[-\s]/g, "") === cleanNormalized ||
      ((t as any).citizenId && (t as any).citizenId.trim().toUpperCase() === cleanCode) ||
      ((t as any).cedula && (t as any).cedula.trim().toUpperCase() === cleanCode);

    // 1. Search in current regional office
    const foundInCurrent = effectiveTickets.find(matchFn);
    if (foundInCurrent) {
      return foundInCurrent;
    }

    // 2. Cross-office search across all other regional offices
    if (officeTickets) {
      for (const [officeKey, ticketList] of Object.entries(officeTickets)) {
        if (officeKey !== activeOfficeId && Array.isArray(ticketList)) {
          const crossMatch = ticketList.find(matchFn);
          if (crossMatch) {
            const targetOffice = OFFICES_CONFIG.find((o) => o.id === officeKey);
            if (targetOffice) {
              // Auto-switch to the found office
              setActiveOfficeId(officeKey);
              setCrossOfficeFoundMsg(`Turno localizado en: ${targetOffice.name}`);
              setTimeout(() => setCrossOfficeFoundMsg(null), 5000);
            }
            return crossMatch;
          }
        }
      }
    }

    return null;
  }, [effectiveTickets, selectedTicketCode, officeTickets, activeOfficeId]);

  // Find the assigned cubicle if ticket is currently called or attended
  const assignedCubicle = useMemo(() => {
    if (!trackedTicket || !trackedTicket.assignedCubicleId) return null;
    return effectiveCubicles.find((c) => c.id === trackedTicket.assignedCubicleId) || null;
  }, [trackedTicket, effectiveCubicles]);

  // Calculate position in queue and estimated wait time considering priority and appointment hierarchy
  const queueStats = useMemo(() => {
    if (!trackedTicket || trackedTicket.status !== TicketStatus.WAITING) {
      return { position: 0, waitTimeMin: 0, peopleAhead: 0 };
    }

    const myScore = (trackedTicket.priority ? 4 : 0) + (trackedTicket.isAppointment ? 2 : 0);

    // Tickets in the same phase and ecosystem waiting ahead
    const aheadTickets = effectiveTickets.filter((t) => {
      if (t.status !== TicketStatus.WAITING) return false;
      if (t.currentPhase !== trackedTicket.currentPhase) return false;
      if (t.id === trackedTicket.id) return false;

      // Filter by ecosystem (Registro Civil vs Cedulación/Electoral/Extranjería)
      const isMyReg = trackedTicket.serviceType === ServiceType.REGISTRO;
      const isOtherReg = t.serviceType === ServiceType.REGISTRO;
      if (isMyReg !== isOtherReg) return false;

      const otherScore = (t.priority ? 4 : 0) + (t.isAppointment ? 2 : 0);
      if (otherScore > myScore) return true;
      if (otherScore === myScore && t.createdAt < trackedTicket.createdAt) return true;
      return false;
    });

    const peopleAhead = aheadTickets.length;
    const avgMinutesPerPerson = trackedTicket.currentPhase === TicketPhase.CAJA ? 3 : 5;
    const waitTimeMin = Math.max(2, (peopleAhead + 1) * avgMinutesPerPerson);

    return {
      position: peopleAhead + 1,
      peopleAhead,
      waitTimeMin
    };
  }, [trackedTicket, effectiveTickets]);

  // Derived regional office module breakdown
  const regionalModuleBreakdown = useMemo(() => {
    // Exclude Registro Civil specialty backoffice desks (Cubículos 1 a 23 of Sede Principal) from Cedulación Tríada & Caja overview
    const validCubicles = effectiveCubicles.filter((c) => {
      if (activeOfficeId === "OFF-1") {
        const num = parseInt(c.id.replace("CUB-", ""), 10);
        // In OFF-1, CUB-1 to CUB-23 are RC desks, CUB-24 to CUB-31 are Tríada Foto (Módulos 10 a 17), CUB-34 to CUB-42 are Cajas (Cajas 0 a 8)
        if (!isNaN(num) && num >= 1 && num <= 23) {
          return false;
        }
      }
      return true;
    });

    const cajaCubicles = validCubicles.filter((c) => c.supportedPhases.includes(TicketPhase.CAJA));
    const cajaPref = cajaCubicles.filter((c) => c.isPreferential || c.name.toLowerCase().includes("preferencial"));
    const cajaReg = cajaCubicles.filter((c) => !c.isPreferential && !c.name.toLowerCase().includes("preferencial"));

    const triadaCubicles = validCubicles.filter((c) => c.supportedPhases.includes(TicketPhase.TRIADA));
    const triadaPref = triadaCubicles.filter((c) => c.isPreferential || c.name.toLowerCase().includes("preferencial"));
    const triadaReg = triadaCubicles.filter((c) => !c.isPreferential && !c.name.toLowerCase().includes("preferencial"));

    const formatNames = (list: Cubicle[]) => {
      if (list.length === 0) return "Ninguno";
      return list.map((c) => c.name).join(", ");
    };

    return {
      cajaCount: cajaCubicles.length,
      cajaPrefNames: formatNames(cajaPref),
      cajaRegNames: formatNames(cajaReg),
      cajaAllNames: formatNames(cajaCubicles),
      triadaCount: triadaCubicles.length,
      triadaPrefNames: formatNames(triadaPref),
      triadaRegNames: formatNames(triadaReg),
      triadaAllNames: formatNames(triadaCubicles)
    };
  }, [effectiveCubicles, activeOfficeId]);

  // Regional queue overview count
  const regionalQueueCounts = useMemo(() => {
    const waiting = effectiveTickets.filter((t) => t.status === TicketStatus.WAITING).length;
    const attending = effectiveTickets.filter((t) => t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING).length;
    return { waiting, attending };
  }, [effectiveTickets]);

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
      setIsVibratingNow(false), 2000;
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      setSelectedTicketCode(searchInput.trim().toUpperCase());
    }
  };

  const handleClearTrackedTicket = () => {
    setSelectedTicketCode("");
    setSearchInput("");
    localStorage.removeItem("last_tracked_ticket_code");
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete("ticket");
      const newQuery = url.searchParams.toString();
      window.history.replaceState({}, "", url.pathname + (newQuery ? `?${newQuery}` : ""));
    } catch (e) {
      console.warn("No se pudo limpiar URL:", e);
    }
  };

  const handleShareTicket = () => {
    if (!trackedTicket) return;
    const origin = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
    const shareUrl = `${origin}?ticket=${trackedTicket.numberCode}&office=${activeOfficeId}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2500);
    }
  };

  // Recent active tickets in queue for quick selection
  const recentQueueTickets = useMemo(() => {
    return effectiveTickets
      .filter((t) => t.status === TicketStatus.WAITING || t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING)
      .slice(0, 8);
  }, [effectiveTickets]);

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

      {/* Cross-office notification toast */}
      {crossOfficeFoundMsg && (
        <div className="bg-amber-50 border-2 border-amber-300 text-amber-950 p-4 rounded-2xl flex items-center gap-3 shadow-md animate-bounce">
          <Sparkles className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="text-xs font-black uppercase tracking-wider">
            {crossOfficeFoundMsg}
          </div>
        </div>
      )}

      {/* REGIONAL OFFICE SELECTOR BAR */}
      <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/80 shadow-sm relative z-20 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-[#003087] shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Sede / Dirección Regional Seleccionada
              </span>
              <div className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <span>{activeOffice.name}</span>
              </div>
            </div>
          </div>

          {/* Regional Office Switcher Dropdown Button */}
          <div className="relative">
            <button
              id="btn-toggle-office-selector"
              type="button"
              onClick={() => setIsOfficeSelectorOpen(!isOfficeSelectorOpen)}
              className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-between sm:justify-center gap-2 cursor-pointer border border-slate-200"
            >
              <MapPin className="w-3.5 h-3.5 text-[#003087]" />
              <span>Cambiar Sede Regional</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform ${isOfficeSelectorOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Dropdown list of all regional offices */}
            {isOfficeSelectorOpen && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-80 overflow-y-auto bg-white border border-slate-200 rounded-2xl shadow-2xl p-2 z-50 divide-y divide-slate-100">
                <div className="px-3 py-2 text-[10px] font-black uppercase tracking-wider text-slate-400 bg-slate-50 rounded-xl mb-1">
                  Seleccione su Dirección Regional:
                </div>
                {OFFICES_CONFIG.map((office) => {
                  const isCurrent = office.id === activeOfficeId;
                  const officeWaiting = officeTickets[office.id]?.filter((t) => t.status === TicketStatus.WAITING).length || 0;
                  return (
                    <button
                      key={office.id}
                      type="button"
                      onClick={() => handleOfficeChange(office.id)}
                      className={`w-full text-left px-3 py-2.5 rounded-xl text-xs font-bold transition-all flex items-start justify-between gap-2 cursor-pointer ${
                        isCurrent
                          ? "bg-[#003087] text-white font-black shadow-xs"
                          : "text-slate-800 hover:bg-slate-100"
                      }`}
                    >
                      <div>
                        <p className={`text-xs ${isCurrent ? "text-white font-black" : "text-slate-900 font-bold"}`}>
                          {office.name}
                        </p>
                        <p className={`text-[10px] ${isCurrent ? "text-blue-200" : "text-slate-500"}`}>
                          {office.address}
                        </p>
                      </div>
                      {officeWaiting > 0 && (
                        <span
                          className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 ${
                            isCurrent ? "bg-amber-400 text-slate-950" : "bg-blue-100 text-[#003087]"
                          }`}
                        >
                          {officeWaiting} en espera
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Live Regional Stats Badge */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 text-slate-600">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-[11px] font-medium text-slate-500 truncate max-w-xs">{activeOffice.address}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 rounded-xl text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-amber-500" />
              <span>{regionalQueueCounts.waiting} en espera</span>
            </span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-[11px] font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>{regionalQueueCounts.attending} en atención</span>
            </span>
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
                  className="px-3 py-1.5 bg-black/10 hover:bg-black/20 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer"
                  title="Copiar enlace para seguir este ticket"
                >
                  <Share2 className="w-3 h-3" />
                  <span>{copiedLink ? "¡Enlace Copiado!" : "Compartir"}</span>
                </button>

                <button
                  id="btn-clear-tracked-ticket"
                  type="button"
                  onClick={handleClearTrackedTicket}
                  className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/30 text-red-950 border border-red-400/40 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition cursor-pointer shadow-2xs"
                  title="Dejar de seguir este turno y limpiar pantalla"
                >
                  <X className="w-3.5 h-3.5 text-red-700" />
                  <span>Limpiar / Otro Turno</span>
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
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                          assignedCubicle.isPreferential || assignedCubicle.name.toLowerCase().includes("preferencial")
                            ? "bg-purple-100 text-purple-900 border border-purple-300"
                            : "bg-blue-100 text-blue-900 border border-blue-300"
                        }`}>
                          {assignedCubicle.isPreferential || assignedCubicle.name.toLowerCase().includes("preferencial")
                            ? "♿ Módulo Preferencial"
                            : "📋 Módulo Regular"}
                        </span>
                        <p className="text-xs font-bold text-slate-600">
                          Operador: <strong>{assignedCubicle.agentName}</strong>
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 uppercase leading-tight">
                        {trackedTicket.currentPhase === TicketPhase.CAJA
                          ? `Área de Cajas (${regionalModuleBreakdown.cajaAllNames})`
                          : `Área de Tríada y Fotografía (${regionalModuleBreakdown.triadaAllNames})`}
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
                  <span>Instrucciones de Orientación ({activeOffice.name}):</span>
                </div>
                {trackedTicket.currentPhase === TicketPhase.CAJA ? (
                  <div className="space-y-1.5 leading-relaxed">
                    <p>
                      💵 <strong>Ventanillas de Caja:</strong> {regionalModuleBreakdown.cajaAllNames}.
                    </p>
                    {regionalModuleBreakdown.cajaPrefNames !== "Ninguno" && (
                      <p className="text-purple-900 font-bold">
                        ♿ <strong>Módulos Preferenciales:</strong> {regionalModuleBreakdown.cajaPrefNames}.
                      </p>
                    )}
                    {regionalModuleBreakdown.cajaRegNames !== "Ninguno" && (
                      <p className="text-slate-600">
                        📋 <strong>Módulos Regulares:</strong> {regionalModuleBreakdown.cajaRegNames}.
                      </p>
                    )}
                    {trackedTicket.isAppointment && (
                      <p className="text-blue-800 font-bold">
                        📅 <strong>Atención de Citas:</strong> Su turno agendado es priorizado en sala.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5 leading-relaxed">
                    <p>
                      📷 <strong>Módulos de Tríada y Fotografía:</strong> {regionalModuleBreakdown.triadaAllNames}.
                    </p>
                    {regionalModuleBreakdown.triadaPrefNames !== "Ninguno" && (
                      <p className="text-purple-900 font-bold">
                        ♿ <strong>Módulos Preferenciales:</strong> {regionalModuleBreakdown.triadaPrefNames}.
                      </p>
                    )}
                    {regionalModuleBreakdown.triadaRegNames !== "Ninguno" && (
                      <p className="text-slate-600">
                        📋 <strong>Módulos Regulares:</strong> {regionalModuleBreakdown.triadaRegNames}.
                      </p>
                    )}
                  </div>
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
              <span>Progreso del Flujo de Atención — {activeOffice.name}</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {/* Step 1: Kiosk / Entry */}
              <div className="p-4 rounded-2xl border-2 border-emerald-500 bg-emerald-50/50 flex items-start gap-3">
                <div className="w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center font-black text-xs shrink-0">
                  ✓
                </div>
                <div>
                  <h5 className="text-xs font-black uppercase text-emerald-950">1. Emisión de Turno</h5>
                  <p className="text-[11px] text-emerald-800 font-medium">Turno emitido en Kiosco / Cita Web</p>
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
                  <h5 className="text-xs font-black uppercase text-slate-900">2. Caja y Cobro</h5>
                  <p className="text-[11px] text-slate-600 font-medium">{regionalModuleBreakdown.cajaAllNames}</p>
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
                  <p className="text-[11px] text-slate-600 font-medium">{regionalModuleBreakdown.triadaAllNames}</p>
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
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-[#003087]" />
              <span>Guía de Ventanillas y Módulos — {activeOffice.name}</span>
            </h3>
            <span className="px-2.5 py-1 bg-blue-50 text-[#003087] border border-blue-200 rounded-xl text-[10px] font-black uppercase tracking-wider">
              {regionalModuleBreakdown.cajaCount + regionalModuleBreakdown.triadaCount} Módulos Habilitados
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium">
            Distribución oficial de módulos y ventanillas activas de atención.
          </p>
        </div>

        {/* Priority & Appointment Banner */}
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2 text-xs text-amber-900">
          <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="font-medium">
            <strong>Política de Prioridad:</strong> Las citas agendadas desde el portal web y los turnos de atención preferencial (embarazadas, personas de la tercera edad y personas con discapacidad) tienen prioridad en la cola de atención.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Box 1: Cajas */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-[#003087] uppercase text-xs">
                <DollarSign className="w-4 h-4 text-emerald-600" />
                <span>Área de Cajas</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                {regionalModuleBreakdown.cajaCount} Módulos
              </span>
            </div>
            <ul className="space-y-1.5 text-slate-600 font-medium pl-1">
              {regionalModuleBreakdown.cajaPrefNames !== "Ninguno" && (
                <li>
                  • <strong className="text-purple-900">Preferenciales:</strong> {regionalModuleBreakdown.cajaPrefNames}.
                </li>
              )}
              {regionalModuleBreakdown.cajaRegNames !== "Ninguno" && (
                <li>
                  • <strong className="text-slate-800">Regulares:</strong> {regionalModuleBreakdown.cajaRegNames}.
                </li>
              )}
              <li className="text-[11px] text-slate-500 pt-1">
                Pago de cédulas por primera vez, duplicados, certificaciones y validación previa.
              </li>
            </ul>
          </div>

          {/* Box 2: Tríada y Fotografía */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-black text-[#003087] uppercase text-xs">
                <Camera className="w-4 h-4 text-cyan-600" />
                <span>Tríada y Fotografía</span>
              </div>
              <span className="text-[10px] font-bold text-slate-500">
                {regionalModuleBreakdown.triadaCount} Módulos
              </span>
            </div>
            <ul className="space-y-1.5 text-slate-600 font-medium pl-1">
              {regionalModuleBreakdown.triadaPrefNames !== "Ninguno" && (
                <li>
                  • <strong className="text-purple-900">Preferenciales:</strong> {regionalModuleBreakdown.triadaPrefNames}.
                </li>
              )}
              {regionalModuleBreakdown.triadaRegNames !== "Ninguno" && (
                <li>
                  • <strong className="text-slate-800">Regulares:</strong> {regionalModuleBreakdown.triadaRegNames}.
                </li>
              )}
              <li className="text-[11px] text-slate-500 pt-1">
                Toma de fotografía oficial, captura biométrica de huellas y firma digital.
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
