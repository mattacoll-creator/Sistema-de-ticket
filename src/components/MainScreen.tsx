/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from "react";
import { Ticket, Cubicle, TicketStatus, CubicleStatus, SERVICES_CONFIG, TicketPhase, PHASES_CONFIG, OFFICES_CONFIG, ServiceType } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Volume2, VolumeX, Tv, UserCheck, Users, HelpCircle, ArrowRight, UserMinus, ShieldAlert, Clock } from "lucide-react";
import { getOfficeSchedule } from "../utils/scheduleStorage";
import { announceAndCall } from "../utils/audio";
import { getServerTime } from "../utils/serverTime";

interface MainScreenProps {
  tickets: Ticket[];
  cubicles: Cubicle[];
  activeCall: { ticket: Ticket; cubicle: Cubicle } | null;
  onClearActiveCall: () => void;
  onTestSpeaker: () => void;
  onRefresh?: () => void;
  currentOfficeId?: string;
  gatewaySelection?: "select" | "cedulacion" | "registro_civil";
}

export default function MainScreen({ tickets, cubicles, activeCall, onClearActiveCall, onTestSpeaker, onRefresh, currentOfficeId = "OFF-1", gatewaySelection = "cedulacion" }: MainScreenProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState<"general" | TicketPhase | "OR" | "OHV" | "RC_OTROS">(() => {
    if (typeof window !== "undefined") {
      try {
        const params = new URLSearchParams(window.location.search);
        const ch = (params.get("channel") || params.get("fase") || params.get("pantalla") || params.get("canal") || "").toLowerCase();
        const v = (params.get("view") || "").toLowerCase();
        if (ch === "caja" || v === "tv-caja" || v === "caja-tv") return TicketPhase.CAJA;
        if (ch === "triada" || ch === "fotografia" || ch === "foto" || v === "tv-triada" || v === "triada-tv") return TicketPhase.TRIADA;
        if (ch === "or") return "OR";
        if (ch === "ohv") return "OHV";
        if (ch === "rc_otros") return "RC_OTROS";
      } catch (e) {}
    }
    return "general";
  });
  const [layoutFocus, setLayoutFocus] = useState<"both" | "cubicles" | "queue" >("both");
  const [isImmersiveFullscreen, setIsImmersiveFullscreen] = useState(false);

  // Auto-refresh interval specifically for the TV screen (polling live tickets & calls safely)
  useEffect(() => {
    if (!onRefresh) return;
    
    // Poll initially
    onRefresh();

    const interval = setInterval(() => {
      // Avoid spamming requests if tab is minimized/hidden
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }
      onRefresh();
    }, 2500);

    return () => clearInterval(interval);
  }, [onRefresh]);

  useEffect(() => {
    // Only reset to general if switching between major gateways (e.g. from cedulación to registro civil)
    if (gatewaySelection === "registro_civil" && (selectedChannel === TicketPhase.CAJA || selectedChannel === TicketPhase.TRIADA)) {
      setSelectedChannel("general");
    } else if (gatewaySelection === "cedulacion" && (selectedChannel === "OR" || selectedChannel === "OHV" || selectedChannel === "RC_OTROS")) {
      setSelectedChannel("general");
    }
  }, [gatewaySelection]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = !!document.fullscreenElement;
      if (!isFs) {
        setIsImmersiveFullscreen(false);
      }
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleImmersiveFullscreen = () => {
    if (!isImmersiveFullscreen) {
      setIsImmersiveFullscreen(true);
      const element = document.getElementById("main-public-screen") || document.documentElement;
      if (element && element.requestFullscreen) {
        element.requestFullscreen().catch((err) => {
          console.log("Error launching browser fullscreen, running in-window immersive mode instead:", err);
        });
      }
    } else {
      setIsImmersiveFullscreen(false);
      if (document.fullscreenElement) {
        document.exitFullscreen().catch((err) => {
          console.log("Error exiting browser fullscreen:", err);
        });
      }
    }
  };

  const launchFullscreenForChannel = (channel: TicketPhase | "OR" | "OHV" | "RC_OTROS" | "general") => {
    setSelectedChannel(channel);
    setIsImmersiveFullscreen(true);

    setTimeout(() => {
      const element = document.getElementById("main-public-screen");
      if (element && element.requestFullscreen) {
        element.requestFullscreen().catch((err) => {
          console.log("Error launching browser fullscreen, running in-window immersive mode instead:", err);
        });
      }
    }, 50);
  };

  const [ecoModeActive, setEcoModeActive] = useState<boolean>(() => {
    return localStorage.getItem("eco_mode_active") === "true";
  });
  const [limitHistory, setLimitHistory] = useState<boolean>(() => {
    return localStorage.getItem("limitar_historial_tv") !== "false";
  });

  const officeConfig = OFFICES_CONFIG.find(o => o.id === currentOfficeId) || OFFICES_CONFIG[0];
  const isTriadaChannel = selectedChannel === TicketPhase.TRIADA;

  const [schedule, setSchedule] = useState(() => getOfficeSchedule(currentOfficeId));

  useEffect(() => {
    const checkSchedule = () => {
      setSchedule(getOfficeSchedule(currentOfficeId));
    };
    checkSchedule();
    window.addEventListener("storage", checkSchedule);
    return () => {
      window.removeEventListener("storage", checkSchedule);
    };
  }, [currentOfficeId]);

  useEffect(() => {
    const checkSettings = () => {
      setEcoModeActive(localStorage.getItem("eco_mode_active") === "true");
      setLimitHistory(localStorage.getItem("limitar_historial_tv") !== "false");
    };
    window.addEventListener("storage", checkSettings);
    const interval = setInterval(checkSettings, 1000);
    return () => {
      window.removeEventListener("storage", checkSettings);
      clearInterval(interval);
    };
  }, []);

  // Maintain synchronized server clock
  useEffect(() => {
    setCurrentTime(getServerTime());
    const timer = setInterval(() => setCurrentTime(getServerTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Isolate tickets strictly by system ecosystem (Cedulación vs Registro Civil)
  const ecosystemTickets = React.useMemo(() => {
    return tickets.filter(t => {
      if (gatewaySelection === "registro_civil") {
        return t.serviceType === ServiceType.REGISTRO;
      } else if (gatewaySelection === "cedulacion") {
        return t.serviceType !== ServiceType.REGISTRO;
      }
      return true;
    });
  }, [tickets, gatewaySelection]);

  // Fetch tickets currently waiting
  const waitingTickets = React.useMemo(() => {
    return ecosystemTickets.filter(t => t.status === TicketStatus.WAITING);
  }, [ecosystemTickets]);
  
  // Sorted waiting queue (Priority and Appointments get moved to front)
  const sortedWaiting = React.useMemo(() => {
    return [...waitingTickets].sort((a, b) => {
      const isAppA = a.isAppointment && gatewaySelection !== "registro_civil";
      const isAppB = b.isAppointment && gatewaySelection !== "registro_civil";
      const valA = (a.priority ? 4 : 0) + (isAppA ? 2 : 0);
      const valB = (b.priority ? 4 : 0) + (isAppB ? 2 : 0);
      if (valA !== valB) {
        return valB - valA;
      }
      return a.createdAt - b.createdAt;
    });
  }, [waitingTickets, gatewaySelection]);

  // Filter based on active channel selection
  const filteredWaiting = React.useMemo(() => {
    return selectedChannel === "general"
      ? sortedWaiting
      : selectedChannel === "OR"
        ? sortedWaiting.filter(t => t.procedure === "OR")
        : selectedChannel === "OHV"
          ? sortedWaiting.filter(t => t.procedure === "OHV")
          : selectedChannel === "RC_OTROS"
            ? sortedWaiting.filter(t => t.procedure !== "OR" && t.procedure !== "OHV")
            : sortedWaiting.filter(t => t.currentPhase === selectedChannel);
  }, [selectedChannel, sortedWaiting]);

  // Helper to determine if a given call belongs strictly to the currently selected channel & ecosystem
  const isCallMatchingChannel = React.useCallback((
    call: { ticket: Ticket; cubicle: Cubicle } | null,
    channel: "general" | TicketPhase | "OR" | "OHV" | "RC_OTROS",
    gateway: "select" | "cedulacion" | "registro_civil"
  ): boolean => {
    if (!call || !call.ticket || !call.cubicle) return false;

    // 1. Ecosystem match
    if (gateway === "registro_civil") {
      if (call.ticket.serviceType !== ServiceType.REGISTRO) return false;
    } else {
      if (call.ticket.serviceType === ServiceType.REGISTRO) return false;
    }

    // 2. Channel match
    if (channel === "general") return true;
    if (channel === "OR") return call.ticket.procedure === "OR";
    if (channel === "OHV") return call.ticket.procedure === "OHV";
    if (channel === "RC_OTROS") return call.ticket.procedure !== "OR" && call.ticket.procedure !== "OHV";
    
    // For Cedulación phases: CAJA vs TRIADA
    if (channel === TicketPhase.CAJA) {
      const isCajaPhase = call.ticket.currentPhase === TicketPhase.CAJA;
      const isCajaCubicle = call.cubicle.supportedPhases?.includes(TicketPhase.CAJA) || call.cubicle.name.toLowerCase().startsWith("caja");
      return isCajaPhase || isCajaCubicle;
    }
    if (channel === TicketPhase.TRIADA) {
      const isTriadaPhase = call.ticket.currentPhase === TicketPhase.TRIADA;
      const isTriadaCubicle = call.cubicle.supportedPhases?.includes(TicketPhase.TRIADA) || 
        call.cubicle.name.toLowerCase().startsWith("módulo") || 
        call.cubicle.name.toLowerCase().startsWith("modulo");
      return isTriadaPhase || isTriadaCubicle;
    }

    return call.ticket.currentPhase === channel;
  }, []);

  // Filter active call based on channel selection and strictly match ecosystem
  const displayedActiveCall = React.useMemo(() => {
    return isCallMatchingChannel(activeCall, selectedChannel, gatewaySelection)
      ? activeCall
      : null;
  }, [activeCall, selectedChannel, gatewaySelection, isCallMatchingChannel]);

  // Persistent tracking of the latest called ticket so the giant call view stays active on the TV screen
  const [latestCall, setLatestCall] = useState<{ ticket: Ticket; cubicle: Cubicle } | null>(() => {
    if (activeCall && isCallMatchingChannel(activeCall, selectedChannel, gatewaySelection)) {
      return activeCall;
    }
    return null;
  });

  // Recent call history for display in TV lower section
  const [callHistory, setCallHistory] = useState<Array<{ ticket: Ticket; cubicle: Cubicle; timestamp: number }>>([]);

  // Whenever a new active call comes in that matches our channel, update latestCall and callHistory
  useEffect(() => {
    if (displayedActiveCall) {
      setLatestCall(displayedActiveCall);
      setCallHistory(prev => {
        const filtered = prev.filter(item => item.ticket.id !== displayedActiveCall.ticket.id);
        return [{ ...displayedActiveCall, timestamp: Date.now() }, ...filtered].slice(0, 8);
      });
    }
  }, [displayedActiveCall]);

  // Validated latestCall against current live ecosystem tickets
  const validatedLatestCall = React.useMemo(() => {
    if (!latestCall) return null;
    const liveTicket = ecosystemTickets.find(t => t.id === latestCall.ticket.id);
    if (liveTicket) {
      if (liveTicket.status === TicketStatus.COMPLETED || liveTicket.status === TicketStatus.MISSED) {
        return null;
      }
      if (isCallMatchingChannel({ ticket: liveTicket, cubicle: latestCall.cubicle }, selectedChannel, gatewaySelection)) {
        return { ticket: liveTicket, cubicle: latestCall.cubicle };
      }
      return null;
    }
    return isCallMatchingChannel(latestCall, selectedChannel, gatewaySelection) ? latestCall : null;
  }, [latestCall, ecosystemTickets, selectedChannel, gatewaySelection, isCallMatchingChannel]);

  // Fallback: If no displayed active call or validated latestCall, check for any ticket currently in explicit CALLING or ATTENDING state
  const fallbackActiveCall = React.useMemo(() => {
    if (displayedActiveCall || validatedLatestCall) return null;
    const activeTickets = ecosystemTickets
      .filter(t => {
        const isCallingOrAttending = (t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING) && !!t.assignedCubicleId;
        if (!isCallingOrAttending) return false;
        
        if (selectedChannel === "general") return true;
        if (selectedChannel === "OR") return t.procedure === "OR";
        if (selectedChannel === "OHV") return t.procedure === "OHV";
        if (selectedChannel === "RC_OTROS") return t.procedure !== "OR" && t.procedure !== "OHV";
        return t.currentPhase === selectedChannel;
      })
      .sort((a, b) => (b.calledAt || 0) - (a.calledAt || 0));
    
    if (activeTickets.length > 0) {
      const topTicket = activeTickets[0];
      const topCubicle = cubicles.find(c => c.id === topTicket.assignedCubicleId);
      if (topCubicle && isCallMatchingChannel({ ticket: topTicket, cubicle: topCubicle }, selectedChannel, gatewaySelection)) {
        return { ticket: topTicket, cubicle: topCubicle };
      }
    }
    return null;
  }, [displayedActiveCall, validatedLatestCall, ecosystemTickets, cubicles, selectedChannel, gatewaySelection, isCallMatchingChannel]);

  // Effective call to show prominently in large format on the screen (strictly validated for current channel)
  const primaryCallToDisplay = displayedActiveCall || validatedLatestCall || fallbackActiveCall;

  // Audio announcement ref to keep track of the last announced ticket and calledAt
  const lastAnnouncedRef = useRef<{ id: string; calledAt: number } | null>(null);

  useEffect(() => {
    if (!displayedActiveCall || !soundEnabled) return;

    // Strict safety check: only announce if displayed call matches our channel & ecosystem
    if (!isCallMatchingChannel(displayedActiveCall, selectedChannel, gatewaySelection)) return;

    const { ticket, cubicle } = displayedActiveCall;
    const ticketId = ticket.id;
    const calledAt = ticket.calledAt || 0;

    // Only announce if it's a new call or a recall (represented by a newer calledAt timestamp)
    if (lastAnnouncedRef.current?.id === ticketId && lastAnnouncedRef.current?.calledAt === calledAt) {
      return;
    }

    // Update last announced ref
    lastAnnouncedRef.current = { id: ticketId, calledAt };

    if (ticket.serviceType === ServiceType.REGISTRO && ticket.currentPhase === TicketPhase.CAJA) {
      return; // Sin llamado en TV para la Caja de Registro Civil
    }

    const isCaja = ticket.currentPhase === TicketPhase.CAJA || cubicle.name.toLowerCase().startsWith("caja");
    const isTriada = ticket.currentPhase === TicketPhase.TRIADA || 
      cubicle.name.toLowerCase().includes("tríada") || 
      cubicle.name.toLowerCase().includes("triada") || 
      cubicle.name.toLowerCase().includes("fotograf") || 
      cubicle.name.toLowerCase().startsWith("módulo") || 
      cubicle.name.toLowerCase().startsWith("modulo") ||
      selectedChannel === TicketPhase.TRIADA;

    const destName = isCaja
      ? `Caja ${cubicle.name.replace(/\D/g, '') || cubicle.name}`
      : cubicle.name;

    // Play 2 consecutive calls (Primer llamado + Segundo llamado) with chime and voice
    announceAndCall(ticket.numberCode, ticket.name, destName, 2, { 
      isCaja, 
      isTriada, 
      phase: ticket.currentPhase 
    }).catch(err => {
      console.warn("Speech synthesis error on TV screen:", err);
    });
  }, [displayedActiveCall, soundEnabled, selectedChannel, gatewaySelection]);

  // Filter cubicles strictly based on active ecosystem
  const ecosystemCubicles = cubicles.filter(c => {
    if (gatewaySelection === "registro_civil") {
      // Cubicles assigned to Registro Civil procedures or CUB 1..23
      return (c.supportedServices || []).includes(ServiceType.REGISTRO) || 
        c.name.includes("(OR)") || c.name.includes("(OHV)") || c.name.includes("(OTR)") || 
        c.name.includes("(ED)") || c.name.includes("(SAU)") || c.name.includes("(SI") ||
        c.name.includes("(OI)") || c.name.includes("(RS)") || c.name.includes("(RMAT)") || 
        c.name.includes("(STR)");
    } else {
      // Cubicles for Cedulación / Caja / Tríada (strictly exclude all Registro Civil specialized modules and OTR)
      const isRcName = c.name.includes("(OR)") || c.name.includes("(OHV)") || c.name.includes("(OTR)") || 
        c.name.includes("(ED)") || c.name.includes("(SAU)") || c.name.includes("(SI") || 
        c.name.includes("(OI)") || c.name.includes("(RS)") || c.name.includes("(RMAT)") || 
        c.name.includes("(STR)");
      if (isRcName) return false;

      const hasCaja = c.supportedPhases?.includes(TicketPhase.CAJA) || c.name.toLowerCase().startsWith("caja");
      const hasTriada = c.supportedPhases?.includes(TicketPhase.TRIADA) || c.name.toLowerCase().startsWith("módulo") || c.name.toLowerCase().startsWith("modulo");
      return hasCaja || hasTriada;
    }
  });

  // Filter cubicles based on channel selection
  const filteredCubicles = selectedChannel === "general"
    ? ecosystemCubicles
    : selectedChannel === "OR"
      ? ecosystemCubicles.filter(c => {
          const num = parseInt(c.id.replace("CUB-", ""), 10);
          return (num >= 2 && num <= 8) || c.name.includes("(OR)");
        })
      : selectedChannel === "OHV"
        ? ecosystemCubicles.filter(c => {
            const num = parseInt(c.id.replace("CUB-", ""), 10);
            return (num >= 16 && num <= 20) || c.name.includes("(OHV)");
          })
        : selectedChannel === "RC_OTROS"
          ? ecosystemCubicles.filter(c => {
              const num = parseInt(c.id.replace("CUB-", ""), 10);
              const isOr = (num >= 2 && num <= 8) || c.name.includes("(OR)");
              const isOhv = (num >= 16 && num <= 20) || c.name.includes("(OHV)");
              return !isOr && !isOhv;
            })
          : ecosystemCubicles.filter(c => c.supportedPhases?.includes(selectedChannel as TicketPhase));

  // Recent completed or missed tickets strictly for active ecosystem
  const recentHistory = ecosystemTickets
    .filter(t => t.status === TicketStatus.COMPLETED || t.status === TicketStatus.MISSED)
    .sort((a, b) => (b.completedAt || 0) - (a.completedAt || 0))
    .slice(0, limitHistory ? 5 : 12);

  const getFullscreenBadge = () => {
    if (selectedChannel === "OR") return "📺 PANTALLA EXCLUSIVA: CUBÍCULOS DE OR";
    if (selectedChannel === "OHV") return "📺 PANTALLA EXCLUSIVA: CUBÍCULOS DE OHV";
    if (selectedChannel === "RC_OTROS") return "📺 PANTALLA EXCLUSIVA: OTROS TRÁMITES Y ENTREGA";
    if (selectedChannel === TicketPhase.TRIADA) return "📺 PANTALLA EXCLUSIVA: FASE DE TRÍADA Y FOTOGRAFÍA";
    return `📺 PANTALLA EXCLUSIVA: FASE DE ${PHASES_CONFIG[selectedChannel as TicketPhase]?.name?.toUpperCase() || "MONITOR"}`;
  };

  const getFullscreenDescription = () => {
    if (selectedChannel === "OR") return "Los números en esta pantalla están esperando ser atendidos en los cubículos de Oficial de Recepción (OR) - Cubículos 2 al 8.";
    if (selectedChannel === "OHV") return "Los números en esta pantalla están esperando ser atendidos en los cubículos de Oficial de Hechos Vitales (OHV) - Cubículos 16 al 20.";
    if (selectedChannel === "RC_OTROS") return "Los números en esta pantalla corresponden a otros trámites y entrega de documentos de Registro Civil.";
    if (selectedChannel === TicketPhase.TRIADA) return "Los números que figuran en esta pantalla están en espera o listos para ser atendidos específicamente en la fase de Tríada y Fotografía.";
    return `Los números que figuran en esta pantalla están en espera o listos para ser atendidos específicamente en la fase de ${PHASES_CONFIG[selectedChannel as TicketPhase]?.name || "atención"}.`;
  };

  if (isImmersiveFullscreen) {
    const primaryCall = primaryCallToDisplay;

    if (primaryCall) {
      const isCaja = primaryCall.ticket.currentPhase === TicketPhase.CAJA || primaryCall.cubicle.name.toLowerCase().startsWith("caja");
      const cleanCubicleNum = primaryCall.cubicle.name.replace(/\D/g, '') || primaryCall.cubicle.name;
      
      let destinationText = "";
      if (isCaja) {
        destinationText = `DIRÍJASE A LA CAJA ${cleanCubicleNum}`;
      } else if (primaryCall.cubicle.name.toLowerCase().startsWith("módulo") || primaryCall.cubicle.name.toLowerCase().startsWith("modulo")) {
        destinationText = `DIRÍJASE AL ${primaryCall.cubicle.name.replace(/\s*\(.*?\)\s*/g, '').trim().toUpperCase()}`;
      } else if (primaryCall.cubicle.name.toLowerCase().startsWith("cubículo") || primaryCall.cubicle.name.toLowerCase().startsWith("cubiculo")) {
        destinationText = `DIRÍJASE AL ${primaryCall.cubicle.name.replace(/\s*\(.*?\)\s*/g, '').trim().toUpperCase()}`;
      } else {
        destinationText = `DIRÍJASE A ${primaryCall.cubicle.name.replace(/\s*\(.*?\)\s*/g, '').trim().toUpperCase()}`;
      }

      const procedureBadge = primaryCall.ticket.serviceType === ServiceType.REGISTRO ? "REGISTRO CIVIL" : "CEDULACIÓN";
      const phaseName = PHASES_CONFIG[primaryCall.ticket.currentPhase]?.name?.toUpperCase() || (isCaja ? "CAJA" : "TRÍADA");

      const isTriada = primaryCall.ticket.currentPhase === TicketPhase.TRIADA || isTriadaChannel;

      return (
        <div 
          id="main-public-screen" 
          className={`fixed inset-0 z-[99999] flex flex-col justify-between items-center p-6 md:p-10 select-none overflow-hidden font-sans border-[8px] rounded-3xl m-2 md:m-3 transition-colors duration-300 ${
            isTriada
              ? "bg-white text-slate-900 border-[#003087]"
              : "bg-[#071a36] text-white border-[#eab308]"
          }`}
        >
          {/* Deep ambient background: White/light-gray for Triada, deep blue for Caja */}
          {isTriada ? (
            <div 
              className="absolute inset-0 bg-no-repeat bg-cover pointer-events-none z-0" 
              style={{
                backgroundImage: "linear-gradient(135deg, #ffffff 0%, #f1f5f9 60%, #e2e8f0 100%)"
              }} 
            />
          ) : (
            <div 
              className="absolute inset-0 bg-no-repeat bg-cover pointer-events-none z-0" 
              style={{
                backgroundImage: "radial-gradient(circle at 50% 40%, #0d2c63 0%, #071a36 68%, #030d1c 100%)"
              }} 
            />
          )}

          {/* Exit Fullscreen discreet button in top right */}
          <button
            onClick={toggleImmersiveFullscreen}
            className={`absolute top-4 right-4 z-50 px-4 py-1.5 rounded-full text-xs font-mono font-bold uppercase tracking-wider backdrop-blur-md transition-all cursor-pointer flex items-center gap-1.5 border shadow-sm ${
              isTriada
                ? "bg-slate-200/80 hover:bg-slate-300 text-slate-700 hover:text-slate-900 border-slate-300"
                : "bg-white/10 hover:bg-white/20 text-white/80 hover:text-white border-white/15"
            }`}
            title="Presione ESC o haga clic aquí para salir de pantalla completa"
          >
            <span>✕ Salir de Pantalla Completa</span>
          </button>

          {/* Top Announcement Badges */}
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-3 pt-2">
            <div className="bg-[#e51a24] text-white font-black text-xs sm:text-sm md:text-base px-6 py-2 rounded-full uppercase tracking-wider shadow-lg flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-white animate-ping" />
              <span>🔔 LLAMADO ACTIVO DE TURNO</span>
            </div>
            <div className={`font-mono text-xs sm:text-sm font-bold px-6 py-2 rounded-full uppercase tracking-wider shadow-sm border ${
              isTriada
                ? "bg-blue-50 border-blue-200 text-[#003087]"
                : "bg-[#102550] border-blue-400/40 text-blue-200"
            }`}>
              SISTEMA DE VOZ: 2 LLAMADOS
            </div>
          </div>

          {/* Citizen Name Section */}
          <div className="relative z-10 text-center w-full max-w-6xl px-4 my-auto flex flex-col items-center">
            <span className={`text-xs sm:text-sm md:text-base font-black tracking-[0.25em] uppercase font-mono mb-2 ${
              isTriada ? "text-[#003087]" : "text-[#00d0ff]"
            }`}>
              CIUDADANO(A)
            </span>
            <h1 className={`text-5xl sm:text-7xl md:text-8xl lg:text-9xl font-black font-sans tracking-tight uppercase leading-none max-w-5xl ${
              isTriada
                ? "text-[#002244] drop-shadow-[0_4px_12px_rgba(0,0,0,0.15)]"
                : "text-[#ffdc2b] drop-shadow-[0_10px_35px_rgba(0,0,0,0.9)]"
            }`}>
              {primaryCall.ticket.name || "CIUDADANO SIN NOMBRE"}
            </h1>
          </div>

          {/* Big Destination Box with Red Border */}
          <div className={`relative z-10 rounded-[28px] sm:rounded-[36px] px-8 sm:px-16 py-8 sm:py-12 text-center w-full max-w-4xl my-auto flex flex-col items-center justify-center border-[10px] sm:border-[14px] ${
            isTriada
              ? "bg-white border-[#e51a24] shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
              : "bg-white border-[#e51a24] shadow-[0_25px_60px_rgba(0,0,0,0.8)]"
          }`}>
            <h2 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-[#1b3d75] uppercase font-mono tracking-tight leading-none">
              {destinationText}
            </h2>
            
            <div className="mt-4">
              <span className="bg-red-50 text-[#e51a24] border border-red-200/80 font-mono font-black text-xs sm:text-sm md:text-base px-6 py-1.5 rounded-full uppercase tracking-wider inline-block">
                {procedureBadge}
              </span>
            </div>

            <div className="h-1.5 w-28 bg-[#e51a24] my-5 rounded-full" />

            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4 text-slate-700 font-mono text-xs sm:text-sm md:text-base font-black uppercase">
              <span>TICKET: <strong className="text-[#e51a24] font-black text-xl sm:text-2xl">{primaryCall.ticket.numberCode}</strong></span>
              <span className="text-slate-400">•</span>
              <span>AGENTE: <strong className="text-slate-900 font-extrabold">{primaryCall.cubicle.agentName.toUpperCase()}</strong></span>
            </div>
          </div>

          {/* Bottom Stat Badges */}
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-4 sm:gap-6 pb-2">
            <div className={`px-8 py-3 rounded-2xl shadow-xl text-center min-w-[210px] border ${
              isTriada
                ? "bg-white border-blue-200"
                : "bg-[#061838]/90 border-cyan-500/40"
            }`}>
              <span className={`text-[10px] sm:text-xs font-mono font-bold block uppercase tracking-wider ${
                isTriada ? "text-slate-500" : "text-cyan-300"
              }`}>
                CÓDIGO DE TURNO
              </span>
              <span className={`text-3xl sm:text-4xl md:text-5xl font-black font-mono tracking-widest block mt-0.5 ${
                isTriada ? "text-[#003087]" : "text-white"
              }`}>
                {primaryCall.ticket.numberCode}
              </span>
            </div>

            <div className={`px-8 py-3 rounded-2xl shadow-xl text-center min-w-[210px] border ${
              isTriada
                ? "bg-white border-blue-200"
                : "bg-[#061838]/90 border-blue-500/40"
            }`}>
              <span className={`text-[10px] sm:text-xs font-mono font-bold block uppercase tracking-wider ${
                isTriada ? "text-slate-500" : "text-blue-300"
              }`}>
                FASE DEL TRÁMITE
              </span>
              <span className={`text-xl sm:text-2xl md:text-3xl font-black font-mono uppercase tracking-wider block mt-1 ${
                isTriada ? "text-slate-900" : "text-white"
              }`}>
                {phaseName}
              </span>
            </div>
          </div>
        </div>
      );
    }
  }

  return (
    <div id="main-public-screen" className={`rounded-2xl p-6.5 shadow-2xl border flex flex-col justify-between h-full min-h-[720px] overflow-hidden relative transition-all duration-700 ${
      ecoModeActive 
        ? "bg-slate-950 border-slate-900 text-slate-400 grayscale-[20%]" 
        : isTriadaChannel
          ? "bg-[#fafbfc] border-slate-300 text-slate-900"
          : "border-[#082252] text-white"
    }`}>
      {/* Immersive glowing radial gradient background, matching the photo exactly! */}
      {!ecoModeActive && !isTriadaChannel && (
        <div className="absolute inset-0 bg-[#04122d] bg-no-repeat bg-cover z-0 pointer-events-none" style={{
          backgroundImage: "radial-gradient(circle at 50% 30%, #0d295f 0%, #03122c 70%, #020918 105%)"
        }} />
      )}
      {!ecoModeActive && isTriadaChannel && (
        <div className="absolute inset-0 bg-[#f4f6f9] bg-no-repeat bg-cover z-0 pointer-events-none" style={{
          backgroundImage: "linear-gradient(to bottom, #ffffff 0%, #f1f3f6 100%)"
        }} />
      )}

      {/* Dynamic Screen Saver / Burn-In Protection active banner */}
      {ecoModeActive && (
        <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-emerald-600/90 hover:bg-emerald-600 text-white font-mono text-[9px] uppercase tracking-widest font-black px-4 py-1.5 rounded-full shadow-lg flex items-center gap-1.5 animate-pulse select-none">
          <span className="w-2 h-2 rounded-full bg-white animate-ping" />
          <span>Protector ECO Activo • Evitando Desgaste de Panel LED (Anti-Burn-In)</span>
        </div>
      )}
      <div className="relative space-y-5.5 z-10 w-full">
        {/* Header Bar precisely styled like the Photo */}
        {isTriadaChannel ? (
          <div className="flex flex-col md:flex-row items-center justify-between border-b border-slate-300 pb-4.5 gap-4 bg-white/95 px-6 py-4.5 rounded-2xl shadow-sm">
            {/* Left side: Pure Photo Replica */}
            <div className="flex flex-wrap items-center gap-6">
              <h1 className="text-2xl md:text-3xl font-sans font-black text-slate-900 tracking-tight leading-none uppercase select-none">
                TRIADA / FOTOGRAFÍA.
              </h1>
              <div className="h-8 w-[1.5px] bg-slate-350 hidden md:block" />
              
              {/* TE Logo styled precisely for Light Theme */}
              <div className="flex items-center gap-3 select-none">
                <img 
                  src="/images/agendate-logo-1.png" 
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/images/agendate-logo-1.png";
                  }}
                  referrerPolicy="no-referrer"
                  alt="AgéndaTE" 
                  className="h-12 w-auto object-contain pr-1" 
                />
                <div className="flex flex-col text-left border-l border-slate-300 pl-3">
                  <span className="text-sm font-black tracking-widest text-[#003087] leading-none uppercase font-sans">
                    TRIBUNAL ELECTORAL
                  </span>
                  <span className="text-[7.5px] font-mono tracking-[0.15em] text-slate-500 leading-none mt-1 uppercase font-bold">
                    LA PATRIA LA HACEMOS CONTIGO
                  </span>
                  <span className="text-[9.5px] font-sans font-bold tracking-tight text-sky-600 mt-1 uppercase leading-none">
                    Dirección Nacional de Cedulación
                  </span>
                </div>
              </div>
            </div>

            {/* Right side: Clock, Probar Voz, Sound in Light Mode */}
            <div className="flex flex-wrap items-center justify-between md:justify-end gap-5">
              {/* Selected Office indicator */}
              <span className="text-[9.5px] bg-slate-100 border border-slate-200 text-slate-700 font-mono px-3 py-1 rounded-lg font-black uppercase tracking-wider">
                {officeConfig.name}
              </span>

              {/* Sync Status Badge */}
              <span className="text-[9.5px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-mono px-3 py-1 rounded-lg font-black uppercase tracking-wider flex items-center gap-1.5" title="Conexión en tiempo real activa">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-ping"></span>
                <span>Despacho Automático Activo</span>
              </span>

              {/* Speaker Control & Test (styled as glassy settings badge) */}
              <div className="flex items-center gap-2.5 bg-slate-100 border border-slate-205 px-3.5 py-1.5 rounded-xl font-mono text-[10px] tracking-wider text-slate-805 select-none shadow-sm">
                <button
                  id="btn-test-voice"
                  onClick={onTestSpeaker}
                  className="text-[#003087] hover:text-[#0047ab] font-extrabold uppercase cursor-pointer transition-colors"
                >
                  PROBAR VOZ
                </button>
                <div className="h-3 w-[1px] bg-slate-250" />
                <button
                  id="btn-toggle-sound"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer ${soundEnabled ? 'text-[#003087] font-bold' : 'text-slate-400'}`}
                  title={soundEnabled ? "Silenciar" : "Activar sonido"}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 animate-pulse text-[#003087]" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Botones de Pantalla Completa solicitados al lado de Probar Voz */}
              <div className="flex items-center gap-2">
                <button
                  id="btn-pantalla-completa-light"
                  onClick={toggleImmersiveFullscreen}
                  className="px-3.5 py-1.5 bg-[#2a45c7] hover:bg-[#1e38b3] text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-blue-400/30 active:scale-95 shrink-0"
                  title="🖥️ PANTALLA COMPLETA: Vista gigante para monitores y TV de sala"
                >
                  <Tv className="w-3.5 h-3.5 text-white/90" />
                  <span>🖥️ PANTALLA COMPLETA</span>
                </button>
                {gatewaySelection === "cedulacion" ? (
                  <>
                    <button
                      onClick={() => launchFullscreenForChannel(TicketPhase.CAJA)}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-md cursor-pointer border border-blue-500/20 active:scale-95"
                      title="📺 PANTALLA COMPLETA: CAJA (Cedulación)"
                    >
                      <Tv className="w-3 h-3 text-white" />
                      <span>CAJA</span>
                    </button>
                    <button
                      onClick={() => launchFullscreenForChannel(TicketPhase.TRIADA)}
                      className="px-2.5 py-1.5 bg-[#00aaff] hover:bg-sky-500 text-slate-950 rounded-lg font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-md cursor-pointer border border-sky-400/20 active:scale-95"
                      title="📺 PANTALLA COMPLETA: TRÍADA / FOTOGRAFÍA"
                    >
                      <Tv className="w-3 h-3 text-slate-950" />
                      <span>TRÍADA</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => launchFullscreenForChannel("OR")}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-md cursor-pointer border border-blue-500/20 active:scale-95"
                      title="📺 PANTALLA CUBÍCULOS OR (Oficial de Recepción)"
                    >
                      <Tv className="w-3 h-3 text-white" />
                      <span>OR</span>
                    </button>
                    <button
                      onClick={() => launchFullscreenForChannel("OHV")}
                      className="px-2.5 py-1.5 bg-[#00aaff] hover:bg-sky-500 text-slate-950 rounded-lg font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-md cursor-pointer border border-sky-400/20 active:scale-95"
                      title="📺 PANTALLA CUBÍCULOS OHV (Oficial de Hechos Vitales)"
                    >
                      <Tv className="w-3 h-3 text-slate-950" />
                      <span>OHV</span>
                    </button>
                  </>
                )}
              </div>

              {/* Digital Clock Badge in Light Mode */}
              <div className="text-right pr-1 select-none text-slate-900">
                <p className="text-3.5xl font-sans font-semibold tracking-normal leading-none">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-[8px] text-sky-650 font-mono tracking-widest uppercase font-black mt-1.5">
                  {currentTime.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between border-b border-white/5 pb-4.5 gap-4">
            <div className="flex flex-wrap items-center justify-between md:justify-start gap-4">
              {/* Authentically replica of the official "TRIBUNAL ELECTORAL" logo */}
              <div className="flex items-center gap-3 select-none">
                <img 
                  src={selectedChannel === TicketPhase.CAJA
                    ? "/images/logo-te-aniversario-1.png"
                    : "/images/agendate-logo-1.png"
                  }
                  referrerPolicy="no-referrer"
                  alt="Tribunal Electoral" 
                  className={selectedChannel === TicketPhase.CAJA
                    ? "h-20 md:h-24 w-auto object-contain pr-1 transition-all"
                    : "h-12 w-auto object-contain pr-1 bg-white/10 p-1 rounded-lg transition-all"
                  }
                />
                <div className="h-9 w-[1.5px] bg-sky-505/20 shrink-0" />
                <div className="flex flex-col text-left">
                  <span className="text-sm font-black tracking-widest text-[#ffffff] leading-none uppercase font-sans">
                    TRIBUNAL ELECTORAL
                  </span>
                  <span className="text-[7px] font-mono tracking-[0.2em] text-sky-200/50 leading-none mt-1 uppercase font-semibold">
                    LA PATRIA LA HACEMOS CONTIGO
                  </span>
                  <span className="text-[10px] font-sans font-extrabold tracking-wider text-sky-400 mt-1 uppercase leading-none">
                    Dirección Nacional de Cedulación
                  </span>
                </div>
              </div>

              {/* Selected Office indicator */}
              <span className="text-[9px] bg-sky-955/50 border border-sky-500/20 text-sky-305 font-mono px-2.5 py-1 rounded-lg font-black uppercase tracking-wider md:ml-3 shrink-0">
                {officeConfig.name}
              </span>

              {/* Sync Status Badge */}
              <span className="text-[9px] bg-emerald-500/15 border border-emerald-500/20 text-emerald-400 font-mono px-2.5 py-1 rounded-lg font-black uppercase tracking-wider flex items-center gap-1.5" title="Conexión en tiempo real activa">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                <span>Sistema en Línea (TE)</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between md:justify-end gap-3">
              {/* Speaker Control & Test (styled as glassy settings badge) */}
              <div className="flex items-center gap-2.5 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl font-mono text-[10px] tracking-wider shadow-sm select-none">
                <button
                  id="btn-test-voice"
                  onClick={onTestSpeaker}
                  className="text-[#00aaff] hover:text-sky-305 font-extrabold uppercase cursor-pointer transition-colors"
                >
                  PROBAR VOZ
                </button>
                <div className="h-3 w-[1px] bg-white/15" />
                <button
                  id="btn-toggle-sound"
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`p-1 hover:bg-white/5 rounded-lg transition-colors cursor-pointer ${soundEnabled ? 'text-[#00aaff] font-bold' : 'text-slate-400'}`}
                  title={soundEnabled ? "Silenciar" : "Activar sonido"}
                >
                  {soundEnabled ? <Volume2 className="w-3.5 h-3.5 animate-pulse text-[#00aaff]" /> : <VolumeX className="w-3.5 h-3.5" />}
                </button>
              </div>

              {/* Botones de Pantalla Completa solicitados al lado de Probar Voz */}
              <div className="flex items-center gap-2">
                <button
                  id="btn-pantalla-completa-dark"
                  onClick={toggleImmersiveFullscreen}
                  className="px-3.5 py-1.5 bg-[#2a45c7] hover:bg-[#1e38b3] text-white rounded-xl font-black text-[10px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-blue-400/30 active:scale-95 shrink-0"
                  title="🖥️ PANTALLA COMPLETA: Vista gigante para monitores y TV de sala"
                >
                  <Tv className="w-3.5 h-3.5 text-white/90" />
                  <span>🖥️ PANTALLA COMPLETA</span>
                </button>
                {gatewaySelection === "cedulacion" ? (
                  <>
                    <button
                      onClick={() => launchFullscreenForChannel(TicketPhase.CAJA)}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-md cursor-pointer border border-blue-500/20 active:scale-95"
                      title="📺 PANTALLA COMPLETA: CAJA (Cedulación)"
                    >
                      <Tv className="w-3 h-3 text-white" />
                      <span>CAJA</span>
                    </button>
                    <button
                      onClick={() => launchFullscreenForChannel(TicketPhase.TRIADA)}
                      className="px-2.5 py-1.5 bg-[#00aaff] hover:bg-sky-500 text-slate-950 rounded-lg font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-md cursor-pointer border border-sky-400/20 active:scale-95"
                      title="📺 PANTALLA COMPLETA: TRÍADA / FOTOGRAFÍA"
                    >
                      <Tv className="w-3 h-3 text-slate-950" />
                      <span>TRÍADA</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => launchFullscreenForChannel("OR")}
                      className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-md cursor-pointer border border-blue-500/20 active:scale-95"
                      title="📺 PANTALLA CUBÍCULOS OR (Oficial de Recepción)"
                    >
                      <Tv className="w-3 h-3 text-white" />
                      <span>OR</span>
                    </button>
                    <button
                      onClick={() => launchFullscreenForChannel("OHV")}
                      className="px-2.5 py-1.5 bg-[#00aaff] hover:bg-sky-500 text-slate-950 rounded-lg font-black text-[9px] uppercase tracking-wider flex items-center gap-1 transition-all shadow-md cursor-pointer border border-sky-400/20 active:scale-95"
                      title="📺 PANTALLA CUBÍCULOS OHV (Oficial de Hechos Vitales)"
                    >
                      <Tv className="w-3 h-3 text-slate-950" />
                      <span>OHV</span>
                    </button>
                  </>
                )}
              </div>

              {/* Smart Digital Clock Badge styled matching the Photo */}
              <div className="text-right pr-1 select-none">
                <p className="text-3xl font-sans font-semibold tracking-normal text-white/95 leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.35)]">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
                <p className="text-[8px] text-sky-400 font-mono tracking-widest uppercase font-black mt-1.5">
                  {currentTime.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* --- INTERACTIVE TV CHANNEL SELECTORBAR --- */}
        <div className={`flex flex-wrap items-center gap-2 p-2 rounded-xl text-xs shadow-sm ${
          isTriadaChannel 
            ? "bg-slate-200/50 border border-slate-350"
            : "bg-slate-900/40 border border-white/5"
        }`}>
          <span className={`text-[10px] font-mono uppercase tracking-wider pl-2 pr-2 font-black ${
            isTriadaChannel ? "text-slate-700" : "text-sky-300/70"
          }`}>
            PANEL DEL MONITOR ({gatewaySelection === "registro_civil" ? "REGISTRO CIVIL" : "CEDULACIÓN"}):
          </span>
          
          <button
            onClick={() => setSelectedChannel("general")}
            className={`px-4 py-2 text-xs font-black uppercase transition-all rounded-lg cursor-pointer ${
              selectedChannel === "general"
                ? "bg-[#0081f9] text-white font-bold shadow-md shadow-blue-900/45 border-transparent"
                : isTriadaChannel
                  ? "bg-white text-slate-705 hover:text-slate-900 border border-slate-300 hover:bg-slate-50"
                  : "bg-white/5 text-slate-300 hover:text-white hover:bg-white/10 border border-white/5"
            }`}
          >
            📺 MULTICANAL (TODOS)
          </button>

          {gatewaySelection === "registro_civil" ? (
            <>
              <button
                onClick={() => setSelectedChannel("OR")}
                className={`px-4 py-2 text-xs font-black uppercase transition-all rounded-lg cursor-pointer flex items-center gap-2 border ${
                  selectedChannel === "OR"
                    ? "bg-blue-600 text-white border-transparent font-extrabold shadow-sm"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 border-white/5"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                <span>📺 PANTALLA TV 3: CUBÍCULOS OR</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 font-bold rounded ${
                  sortedWaiting.filter(t => t.procedure === "OR").length > 0
                    ? "bg-rose-900/50 text-rose-200 border border-rose-800/40"
                    : "bg-white/5 text-slate-400"
                }`}>
                  {sortedWaiting.filter(t => t.procedure === "OR").length}
                </span>
              </button>

              <button
                onClick={() => setSelectedChannel("OHV")}
                className={`px-4 py-2 text-xs font-black uppercase transition-all rounded-lg cursor-pointer flex items-center gap-2 border ${
                  selectedChannel === "OHV"
                    ? "bg-blue-600 text-white border-transparent font-extrabold shadow-sm"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 border-white/5"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
                <span>📺 PANTALLA TV 4: CUBÍCULOS HV</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 font-bold rounded ${
                  sortedWaiting.filter(t => t.procedure === "OHV").length > 0
                    ? "bg-rose-900/50 text-rose-200 border border-rose-800/40"
                    : "bg-white/5 text-slate-400"
                }`}>
                  {sortedWaiting.filter(t => t.procedure === "OHV").length}
                </span>
              </button>

              <button
                onClick={() => setSelectedChannel("RC_OTROS")}
                className={`px-4 py-2 text-xs font-black uppercase transition-all rounded-lg cursor-pointer flex items-center gap-2 border ${
                  selectedChannel === "RC_OTROS"
                    ? "bg-purple-600 text-white border-transparent font-extrabold shadow-sm"
                    : "bg-white/5 text-slate-300 hover:bg-white/10 border-white/5"
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-purple-400 animate-ping" />
                <span>📺 PANTALLA TV 5: OTROS TRÁMITES</span>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 font-bold rounded ${
                  sortedWaiting.filter(t => t.procedure !== "OR" && t.procedure !== "OHV").length > 0
                    ? "bg-rose-900/50 text-rose-200 border border-rose-800/40"
                    : "bg-white/5 text-slate-400"
                }`}>
                  {sortedWaiting.filter(t => t.procedure !== "OR" && t.procedure !== "OHV").length}
                </span>
              </button>
            </>
          ) : (
            Object.entries(PHASES_CONFIG).map(([key, phase]) => {
              const isActive = selectedChannel === key;
              const waitingCount = sortedWaiting.filter(t => t.currentPhase === key).length;
              const screenLabel = key === TicketPhase.CAJA ? "📺 PANTALLA TV 1: CAJA" : "📺 PANTALLA TV 2: TRIAJE FOTOGRAFÍA";
              return (
                <button
                  key={key}
                  onClick={() => setSelectedChannel(key as TicketPhase)}
                  className={`px-4 py-2 text-xs font-black uppercase transition-all rounded-lg cursor-pointer flex items-center gap-2 border ${
                    isActive
                      ? isTriadaChannel
                        ? "bg-[#003087] text-white border-transparent font-extrabold shadow-sm"
                        : "bg-[#00aaff] text-[#03122c] border-transparent font-extrabold shadow-sm"
                      : isTriadaChannel
                        ? "bg-white text-slate-700 hover:bg-slate-105 border-slate-300 shadow-xs"
                        : "bg-white/5 text-slate-300 hover:bg-white/10 border-white/5"
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${phase.color.split(" ")[0]} animate-ping`} />
                  <span>{screenLabel}</span>
                  <span className={`text-[10px] font-mono px-1.5 py-0.5 font-bold rounded ${
                    waitingCount > 0 
                      ? isTriadaChannel 
                        ? "bg-rose-100 text-rose-700 border border-rose-200" 
                        : "bg-rose-900/50 text-rose-200 border border-rose-800/40" 
                      : isTriadaChannel 
                        ? "bg-slate-100 text-slate-500 border border-slate-205" 
                        : "bg-white/5 text-slate-400"
                  }`}>
                    {waitingCount}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* --- DEDICATED VIEW MODE SELECTOR (ESTRUCTURA DE PANTALLA) --- */}
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 rounded-xl text-xs shadow-inner animate-fade-in ${
          isTriadaChannel 
            ? "bg-slate-200/35 border border-slate-350"
            : "bg-slate-950/30 border border-white/5"
        }`}>
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-bold uppercase tracking-wider font-mono ${
              isTriadaChannel ? "text-slate-600" : "text-sky-200/50"
            }`}>
              DISTRIBUCIÓN DEL MONITOR:
            </span>
            <span className={`text-[10px] border px-2 py-0.5 rounded font-black uppercase font-mono shadow-sm ${
              isTriadaChannel
                ? "bg-slate-100 text-slate-705 border-slate-300"
                : "bg-sky-955/70 text-sky-205 border border-sky-800/40"
            }`}>
              {layoutFocus === "both" ? "Vista Dividida (Módulos + Turnos)" : layoutFocus === "cubicles" ? "Enfoque Principal: Solo Módulos" : "Enfoque Principal: Solo Fila de Turnos"}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setLayoutFocus("both")}
              className={`px-3.5 py-2 text-[10px] font-black uppercase transition-all rounded-lg cursor-pointer flex items-center gap-1.5 ${
                layoutFocus === "both"
                  ? isTriadaChannel
                    ? "bg-[#003087] text-white border-transparent font-bold shadow-sm"
                    : "bg-white/10 text-white border border-white/15 font-bold shadow-sm"
                  : isTriadaChannel
                    ? "text-slate-650 hover:text-slate-900 hover:bg-slate-100 border border-transparent"
                    : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
              title="Muestra los Módulos de atención en el lado izquierdo y las colas de turnos en el derecho"
            >
              <span>📊 Vista Dividida</span>
            </button>
            <button
              onClick={() => setLayoutFocus("cubicles")}
              className={`px-3.5 py-2 text-[10px] font-black uppercase transition-all rounded-lg cursor-pointer flex items-center gap-1.5 ${
                layoutFocus === "cubicles"
                  ? isTriadaChannel
                    ? "bg-[#003087] text-white border-transparent font-bold shadow-sm"
                    : "bg-white/10 text-white border border-white/15 font-bold shadow-sm"
                  : isTriadaChannel
                    ? "text-slate-650 hover:text-slate-900 hover:bg-slate-100 border border-transparent"
                    : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
              title="Oculta las colas de turnos y expande los Módulos de atención a pantalla completa"
            >
              <span>🚪 Solo Módulos</span>
            </button>
            <button
              onClick={() => setLayoutFocus("queue")}
              className={`px-3.5 py-2 text-[10px] font-black uppercase transition-all rounded-lg cursor-pointer flex items-center gap-1.5 ${
                layoutFocus === "queue"
                  ? isTriadaChannel
                    ? "bg-[#003087] text-white border-transparent font-bold shadow-sm"
                    : "bg-white/10 text-white border border-white/15 font-bold shadow-sm"
                  : isTriadaChannel
                    ? "text-slate-650 hover:text-slate-900 hover:bg-slate-105 border border-transparent"
                    : "text-slate-300 hover:text-white hover:bg-white/5 border border-transparent"
              }`}
              title="Oculta los Módulos de atención y expande la fila de turnos esperando a pantalla completa"
            >
              <span>🎟️ Solo Fila de Turnos</span>
            </button>
          </div>
        </div>

        {/* Dynamic office schedules & business rules banners (educating users in real time) */}
        <div className={`grid grid-cols-1 ${gatewaySelection === "registro_civil" ? "" : "md:grid-cols-2"} gap-3.5 p-3.5 rounded-xl border font-sans text-xs ${
          isTriadaChannel
            ? "bg-slate-50 border-slate-200 text-slate-805"
            : "bg-slate-950/20 border-white/5 text-slate-200"
        }`}>
          {/* Sede Schedules Column */}
          <div className="flex items-start gap-2.5">
            <span className={`p-1.5 rounded-lg shrink-0 text-sm ${
              isTriadaChannel ? "bg-slate-200 text-slate-800" : "bg-white/5 text-sky-400"
            }`}>
              🕒
            </span>
            <div>
              <span className="block font-black text-[9px] uppercase tracking-wider opacity-60">
                Horario de Sede Seleccionada {schedule.tempClosed && "— (CERRADO EVENTUAL)"}
              </span>
              <p className="font-extrabold text-sky-400 mt-0.5">
                {officeConfig.name.replace("Dirección Regional de ", "").replace("Tribunal Electoral de ", "")}: {schedule.openTime} a {schedule.closeTime}
              </p>
              <p className="text-[10.5px] mt-1 leading-normal opacity-80">
                {schedule.tempClosed 
                  ? `AVISO DE CIERRE: ${schedule.tempClosedReason}` 
                  : "Días hábiles de lunes a viernes. Las colas automáticas del servidor se rigen por la zona horaria de Panamá."}
              </p>
            </div>
          </div>

          {/* Booking / Appointment Rules Column */}
          {gatewaySelection !== "registro_civil" && (
            <div className="flex items-start gap-2.5 border-t md:border-t-0 md:border-l pt-3 md:pt-0 md:pl-4 border-slate-200/10">
              <span className={`p-1.5 rounded-lg shrink-0 text-sm ${
                isTriadaChannel ? "bg-[#003087]/10 text-[#003087]" : "bg-emerald-500/10 text-emerald-350"
              }`}>
                📅
              </span>
              <div>
                <span className="block font-black text-[9px] uppercase tracking-wider opacity-60">
                  Reserva de Turnos (Cedulación)
                </span>
                <p className={`font-extrabold mt-0.5 ${
                  isTriadaChannel ? "text-[#003087]" : "text-emerald-400"
                }`}>
                  Los primeros 15 turnos de cada día se reservan para Citas Previas
                </p>
                <p className="text-[10.5px] mt-1 leading-normal opacity-80">
                  Los turnos de cita previa gozan de preferencia total y se posicionan por delante en la fila con respecto a turnos presenciales espontáneos.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* --- HERO: FLASHING CALL OUT SECTION --- */}
        <div id="hero-callout-screen" className="min-h-[220px] relative">
          <AnimatePresence mode="wait">
            {primaryCallToDisplay ? (
              <motion.div
                key={primaryCallToDisplay.ticket.id + "-" + (primaryCallToDisplay.ticket.calledAt || 0)}
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ duration: 0.3 }}
                className="bg-gradient-to-b from-[#081836] via-[#0d2757] to-[#081836] border-4 border-amber-400/80 rounded-3xl p-6 sm:p-10 lg:p-12 flex flex-col items-center justify-center gap-8 shadow-2xl relative overflow-hidden ring-8 ring-blue-600/20"
              >
                {/* Visual flashy background indicator borders */}
                <div className="absolute top-0 bottom-0 left-0 w-3.5 bg-amber-400 animate-pulse" />
                <div className="absolute top-0 bottom-0 right-0 w-3.5 bg-amber-400 animate-pulse" />
                <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-red-600 via-white to-blue-600" />

                {/* Top Announcement Badges */}
                <div className="flex flex-wrap items-center justify-center gap-3 z-10">
                  <span className="px-5 py-2 text-sm sm:text-base md:text-lg font-mono tracking-widest font-black uppercase bg-red-600 text-white rounded-xl shadow-lg animate-bounce flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-white animate-ping" />
                    🛎️ LLAMADO ACTIVO DE TURNO
                  </span>
                  {primaryCallToDisplay.ticket.priority && (
                    <span className="px-4 py-2 text-sm sm:text-base md:text-lg font-black bg-amber-500 text-white rounded-xl uppercase flex items-center gap-1.5 shadow-lg animate-pulse">
                      <ShieldAlert className="w-5 h-5" /> ATENCIÓN PREFERENCIAL
                    </span>
                  )}
                  <span className="px-4 py-2 text-xs sm:text-sm font-mono font-bold uppercase bg-blue-900/80 border border-blue-400/40 text-blue-200 rounded-xl">
                    SISTEMA DE VOZ: 2 LLAMADOS
                  </span>
                </div>

                {/* CITIZEN NAME IN GIGANTIC LETTERS */}
                <div className="text-center z-10 w-full px-2 max-w-5xl">
                  <p className="text-xs sm:text-sm md:text-base font-black tracking-widest text-cyan-300 uppercase font-mono mb-2">
                    CIUDADANO(A)
                  </p>
                  <h1 className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight text-amber-300 uppercase font-sans leading-none drop-shadow-[0_6px_24px_rgba(0,0,0,0.8)] line-clamp-2">
                    {primaryCallToDisplay.ticket.name || "CIUDADANO SIN NOMBRE"}
                  </h1>
                </div>

                {/* GIGANTIC DESTINATION BOX: "DIRÍJASE A LA CAJA 1 / CAJA 2 / MÓDULO..." */}
                {(() => {
                  const isCaja = primaryCallToDisplay.ticket.currentPhase === TicketPhase.CAJA;
                  const fullName = primaryCallToDisplay.cubicle.name;
                  const cleanCubicleNum = fullName.replace(/\D/g, '') || fullName;
                  
                  let destinationText = "";
                  if (isCaja || fullName.toLowerCase().startsWith("caja")) {
                    destinationText = `DIRÍJASE A LA CAJA ${cleanCubicleNum}`;
                  } else if (fullName.toLowerCase().startsWith("módulo") || fullName.toLowerCase().startsWith("modulo")) {
                    destinationText = `DIRÍJASE AL ${fullName.replace(/\s*\(.*?\)\s*/g, '').trim().toUpperCase()}`;
                  } else if (fullName.toLowerCase().startsWith("cubículo") || fullName.toLowerCase().startsWith("cubiculo")) {
                    destinationText = `DIRÍJASE AL ${fullName.replace(/\s*\(.*?\)\s*/g, '').trim().toUpperCase()}`;
                  } else {
                    destinationText = `DIRÍJASE A ${fullName.replace(/\s*\(.*?\)\s*/g, '').trim().toUpperCase()}`;
                  }

                  const subtitle = fullName.includes("(")
                    ? fullName.match(/\((.*?)\)/)?.[1].trim()
                    : null;

                  return (
                    <div className="flex flex-col items-center justify-center bg-white border-[8px] sm:border-[12px] border-red-600 px-8 sm:px-14 py-8 sm:py-10 rounded-3xl text-center w-full max-w-4xl z-10 shadow-2xl text-slate-900 transition-all transform">
                      <p className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-black text-[#003087] uppercase font-mono tracking-tight leading-none animate-pulse">
                        {destinationText}
                      </p>
                      
                      {subtitle && (
                        <p className="text-xs sm:text-sm md:text-base lg:text-lg font-black text-red-700 mt-3 tracking-wider uppercase font-mono bg-red-50 border border-red-200 px-4 py-1.5 rounded-full">
                          {subtitle.toUpperCase()}
                        </p>
                      )}

                      <div className="h-1.5 w-32 bg-red-600 my-4 rounded-full" />

                      <div className="flex flex-wrap items-center justify-center gap-4 text-slate-700 font-mono text-xs sm:text-sm md:text-base font-black uppercase">
                        <span>TICKET: <strong className="text-red-700 font-extrabold text-lg sm:text-xl md:text-2xl">{primaryCallToDisplay.ticket.numberCode}</strong></span>
                        <span>•</span>
                        <span>AGENTE: <strong className="text-slate-900">{primaryCallToDisplay.cubicle.agentName.toUpperCase()}</strong></span>
                      </div>
                    </div>
                  );
                })()}

                {/* TICKET CODE AND STAGE BANNER */}
                <div className="flex flex-wrap items-center justify-center gap-4 z-10 text-center">
                  <div className="bg-slate-900/90 border border-cyan-400/40 px-6 py-2.5 rounded-2xl shadow-md">
                    <span className="text-xs font-mono font-bold text-cyan-300 block uppercase">CÓDIGO DE TURNO</span>
                    <span className="text-3xl sm:text-4xl md:text-5xl font-black font-mono text-white tracking-widest">
                      {primaryCallToDisplay.ticket.numberCode}
                    </span>
                  </div>

                  <div className="bg-slate-900/90 border border-blue-400/40 px-6 py-2.5 rounded-2xl shadow-md">
                    <span className="text-xs font-mono font-bold text-blue-300 block uppercase">FASE DEL TRÁMITE</span>
                    <span className={`text-base sm:text-lg md:text-xl font-black font-mono uppercase text-white`}>
                      {PHASES_CONFIG[primaryCallToDisplay.ticket.currentPhase]?.name?.toUpperCase() || "ATENCIÓN"}
                    </span>
                  </div>
                </div>

                {/* Dismiss / Clear Call indicator (for manual dismiss) */}
                {displayedActiveCall && (
                  <button
                    id="btn-dismiss-active-call"
                    onClick={() => {
                      onClearActiveCall();
                      setLatestCall(null);
                    }}
                    className="absolute top-4 right-4 text-sky-200 hover:text-white p-2 text-xs rounded-full transition-colors cursor-pointer bg-white/10 border border-white/10 hover:bg-white/20"
                    title="Ocultar llamado"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </motion.div>
            ) : (
              <div className={`border rounded-2xl p-8 flex flex-col lg:flex-row items-center justify-between gap-6 text-center lg:text-left h-full shadow-sm relative overflow-hidden transition-all duration-300 ${
                isTriadaChannel
                  ? "bg-white border-slate-300 text-slate-800"
                  : "bg-slate-900/35 border border-white/5 text-white"
              }`}>
                <div className="space-y-2 relative z-10">
                  <span className={`px-3 py-1 text-xs font-mono tracking-widest border rounded-md font-black uppercase ${
                    isTriadaChannel 
                      ? "bg-slate-100 text-[#003087] border-slate-205"
                      : "bg-sky-955/70 text-sky-400 border border-sky-850/50"
                  }`}>
                    {selectedChannel === "general" 
                      ? "🔍 SALA DE ESPERA - TRIBUNAL ELECTORAL" 
                      : selectedChannel === "OR"
                        ? "📺 PANTALLA EXCLUSIVA: CUBÍCULOS DE OR"
                        : selectedChannel === "OHV"
                          ? "📺 PANTALLA EXCLUSIVA: CUBÍCULOS DE OHV"
                          : selectedChannel === "RC_OTROS"
                            ? "📺 PANTALLA EXCLUSIVA: OTROS TRÁMITES Y ENTREGA"
                            : `📺 DETALLE DE PANTALLA: FASE DE ${PHASES_CONFIG[selectedChannel as TicketPhase].name.toUpperCase()}`}
                  </span>
                  <h2 className={`text-2xl font-black uppercase tracking-widest leading-tight ${isTriadaChannel ? "text-slate-900" : "text-white"}`}>
                    Esperando próximo llamado de turno
                  </h2>
                  <p className={`text-sm max-w-2xl leading-relaxed font-semibold ${isTriadaChannel ? "text-slate-500" : "text-sky-200/70"}`}>
                    {selectedChannel === "general" 
                      ? "Por favor tome asiento y preste atención a la pantalla y al sistema de audio. Su turno será anunciado por su nombre y código con 2 llamados de voz consecutivos."
                      : selectedChannel === "OR"
                        ? "Los números en esta pantalla están esperando ser atendidos en los cubículos de Oficial de Recepción (OR) - Cubículos 2 al 8."
                        : selectedChannel === "OHV"
                          ? "Los números en esta pantalla están esperando ser atendidos en los cubículos de Oficial de Hechos Vitales (OHV) - Cubículos 16 al 20."
                          : selectedChannel === "RC_OTROS"
                            ? "Los números en esta pantalla corresponden a Trámites Especiales, Investigación, Recepción de Sentencia, Matrimonio, Atención al Usuario y Entrega de Documentos."
                            : `Los números que figuran en esta pantalla están en espera para la fase de ${PHASES_CONFIG[selectedChannel as TicketPhase].name}.`}
                  </p>
                </div>
                
                <div className={`px-6 py-4 border rounded-xl flex items-center gap-4 shadow-sm relative z-10 select-none ${
                  isTriadaChannel
                    ? "bg-slate-100/70 border-slate-205 text-slate-850"
                    : "bg-sky-955/50 border border-sky-850/50 text-white"
                }`}>
                  <Users className={`w-8 h-8 animate-pulse ${isTriadaChannel ? "text-[#0056b3]" : "text-sky-400"}`} />
                  <div className="text-left font-mono">
                    <span className="block text-3xl font-black leading-none">{filteredWaiting.length}</span>
                    <span className={`text-[10px] font-mono tracking-widest font-black block mt-1.5 ${isTriadaChannel ? "text-slate-500" : "text-sky-305"}`}>EN ESPERA</span>
                  </div>
                </div>
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* --- BODY: DUAL GRID --- */}
         <div className={`grid grid-cols-1 ${layoutFocus === "both" ? "lg:grid-cols-12" : "grid-cols-1"} gap-6 pt-2`}>
           
           {/* COLUMN LEFT: Últimos Turnos Llamados & Cubicle Monitors */}
           {layoutFocus !== "queue" && (
             <div className={`space-y-4 animate-fade-in ${layoutFocus === "both" ? "lg:col-span-7" : ""}`}>
               
               {/* Sección Destacada: Últimos Turnos Llamados */}
               {callHistory.length > 0 && (
                 <div className={`p-3.5 rounded-2xl shadow-md border ${
                   isTriadaChannel
                     ? "bg-white border-slate-200"
                     : "bg-slate-900/60 border-blue-500/20"
                 }`}>
                   <div className={`flex items-center justify-between pb-2 border-b mb-2.5 ${
                     isTriadaChannel ? "border-slate-200" : "border-white/5"
                   }`}>
                     <span className={`text-xs font-black font-mono tracking-widest uppercase flex items-center gap-2 ${
                       isTriadaChannel ? "text-[#003087]" : "text-[#00d0ff]"
                     }`}>
                       <Clock className={`w-4 h-4 ${isTriadaChannel ? "text-[#003087]" : "text-cyan-400"}`} />
                       ÚLTIMOS TURNOS LLAMADOS
                     </span>
                     <span className={`text-[10px] font-mono font-bold uppercase ${
                       isTriadaChannel ? "text-slate-500" : "text-sky-300/70"
                     }`}>
                       {callHistory.length} EN HISTORIAL RECIENTE
                     </span>
                   </div>

                   <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5">
                     {callHistory.slice(0, 3).map((item, idx) => (
                       <div
                         key={idx}
                         className={`p-3 rounded-xl flex flex-col justify-between shadow-sm border ${
                           isTriadaChannel
                             ? "bg-slate-50 border-slate-200"
                             : "bg-gradient-to-br from-[#072458] to-[#041638] border-cyan-500/30"
                         }`}
                       >
                         <div className="flex items-center justify-between">
                           <span className={`text-xs font-black font-mono px-2 py-0.5 rounded border ${
                             isTriadaChannel
                               ? "text-amber-800 bg-amber-100 border-amber-300"
                               : "text-amber-300 bg-amber-950/60 border-amber-500/40"
                           }`}>
                             {item.ticket.numberCode}
                           </span>
                           <span className={`text-[10px] font-mono font-black ${
                             isTriadaChannel ? "text-[#003087]" : "text-cyan-300"
                           }`}>
                             {item.cubicle.name}
                           </span>
                         </div>
                         <p className={`text-sm font-black uppercase truncate mt-1.5 ${
                           isTriadaChannel ? "text-slate-900" : "text-white"
                         }`}>
                           {item.ticket.name}
                         </p>
                         <span className={`text-[9px] font-mono mt-1 ${
                           isTriadaChannel ? "text-slate-500" : "text-sky-300/60"
                         }`}>
                           {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                         </span>
                       </div>
                     ))}
                   </div>
                 </div>
               )}

               <div className={`flex items-center justify-between border-b pb-2 mb-2 ${
                 isTriadaChannel ? "border-slate-300" : "border-white/5"
               }`}>
                 <span className={`text-xs font-black font-mono tracking-widest uppercase flex items-center gap-2 ${
                   isTriadaChannel ? "text-slate-800" : "text-sky-400"
                 }`}>
                   <UserCheck className={`w-5 h-5 ${isTriadaChannel ? "text-[#003087]" : "text-sky-455"}`} />
                   MÓDULOS DE ATENCIÓN {selectedChannel !== "general" 
                     ? selectedChannel === "OR"
                       ? "(FILTRADOS: OFICIAL DE RECEPCIÓN OR)"
                       : selectedChannel === "OHV"
                         ? "(FILTRADOS: HECHOS VITALES OHV)"
                         : selectedChannel === "RC_OTROS"
                           ? "(FILTRADOS: OTROS TRÁMITES Y ENTREGA)"
                           : `(FILTRADOS POR ${PHASES_CONFIG[selectedChannel as TicketPhase].shortName.toUpperCase()})` 
                     : ""}
                  </span>
                 <span className={`text-xs font-mono tracking-wider font-bold uppercase ${
                  isTriadaChannel ? "text-slate-500" : "text-sky-300/60"
                }`}>{filteredCubicles.length} EN SERVICIO</span>
              </div>

              {/* Responsive grid matching the 2-column layout from Photo when view is maximized */}
              <div className={`grid grid-cols-1 ${layoutFocus === "cubicles" ? "md:grid-cols-2" : "grid-cols-2"} gap-4.5 max-h-[490px] overflow-y-auto pr-1.5 scrollbar-thin scrollbar-thumb-blue-900/50`}>
                {filteredCubicles.map((cubicle) => {
                  const currentTicket = ecosystemTickets.find(t => t.id === cubicle.currentTicketId);
                  const isFree = cubicle.status === "ONLINE_AVAILABLE";
                  const isBreak = cubicle.status === "BREAK";
                  const isAttending = cubicle.status === "ATTENDING";

                  // Extract desk digit (e.g. "Módulo 24" -> "24") precisely matching numbers in Photo
                  const cajaNumber = cubicle.name.replace(/\D/g, '') || cubicle.name;

                  // Text to display for Line 1: prioritized name, or code, or fallback
                  let mainText = "DISPONIBLE";
                  let textStyle = isTriadaChannel ? "text-slate-500 font-semibold" : "text-[#00d0ff]/70 font-semibold";

                  if (isAttending && currentTicket) {
                    mainText = currentTicket.name && currentTicket.name.trim() !== ""
                      ? currentTicket.name
                      : currentTicket.numberCode;
                    textStyle = isTriadaChannel ? "text-slate-900 font-black" : "text-white font-black";
                  } else if (isBreak) {
                    mainText = "EN RECESO";
                    textStyle = "text-amber-500 font-bold";
                  } else if (cubicle.status === "OFFLINE") {
                    mainText = "MÓDULO INACTIVO";
                    textStyle = "text-slate-400 font-semibold opacity-60";
                  }

                  return (
                    <div
                      key={cubicle.id}
                      className={`relative p-5 rounded-[22px] flex flex-col justify-center min-h-[92px] transition-all duration-300 ${
                        isTriadaChannel
                          ? `bg-white border-2 border-slate-200 border-b-[5px] border-r-[4px] border-b-[#003087] border-r-[#0047ab] shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${
                              isAttending
                                ? "scale-[1.01] ring-2 ring-[#003087]/30 bg-blue-50/40"
                                : "opacity-95 hover:border-slate-300"
                            }`
                          : `bg-gradient-to-r from-[#031d4c] to-[#0c316e] border border-blue-950/20 border-b-[5px] border-r-[4px] border-b-[#00b0ff] border-r-[#0081f9] shadow-[0_5px_15px_rgba(0,0,0,0.25)] ${
                              isAttending 
                                ? "scale-[1.01] brightness-110 shadow-[0_8px_25px_rgba(0,176,255,0.15)] bg-gradient-to-r from-[#04245d] to-[#0f3c83]" 
                                : "opacity-95"
                            }`
                      }`}
                    >
                      {/* Bouncing call highlight backdrop */}
                      {isAttending && (
                        <div className={`absolute inset-0 animate-pulse rounded-[22px] ${
                          isTriadaChannel ? "bg-blue-600/5" : "bg-blue-400/5"
                        }`} />
                      )}

                      {/* Line 1: Accent chevron and Main Text */}
                      <div className="flex items-center w-full truncate">
                        <span className={`text-base md:text-lg mr-2 leading-none select-none font-sans ${
                          isTriadaChannel ? "text-[#003087]" : "text-[#00d0ff]"
                        }`}>
                          ▶
                        </span>
                        <span className={`uppercase font-sans tracking-wide text-sm md:text-base leading-tight truncate ${textStyle}`}>
                          {mainText}
                        </span>
                      </div>

                      {/* Line 2: Indented bright blue pill containing designation */}
                      <div className="mt-2.5 flex items-center">
                        <div className={`inline-flex items-center gap-1.5 px-5 py-0.5 rounded-full text-white font-black text-xs md:text-sm tracking-wider shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] ml-5 select-none transition-colors ${
                          isTriadaChannel ? "bg-[#003087] hover:bg-[#002266]" : "bg-[#0081f9] hover:bg-blue-500"
                        }`}>
                          <span className={`${isTriadaChannel ? "text-blue-200" : "text-[#aae3ff]"} text-[10px] leading-none select-none`}>▶</span>
                          <span>{cajaNumber}</span>
                        </div>

                        {/* Semantic indicators */}
                        {isFree && (
                          <span className={`ml-2.5 text-[8.5px] uppercase font-mono tracking-widest font-bold animate-pulse ${
                            isTriadaChannel ? "text-emerald-700" : "text-[#00d0ff]/65"
                          }`}>
                            ★ LIBRE
                          </span>
                        )}
                        {isBreak && (
                          <span className={`ml-2.5 text-[8.5px] uppercase font-mono tracking-widest font-bold ${
                            isTriadaChannel ? "text-amber-700" : "text-amber-400/65"
                          }`}>
                            ★ REC
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* COLUMN RIGHT: Waiting List & Queue (OR SELECTIVE CHANNELS) */}
          {layoutFocus !== "cubicles" && (
            <div className={`space-y-3 animate-fade-in ${layoutFocus === "both" ? "lg:col-span-5" : ""}`}>
              {selectedChannel === "general" ? (
                /* GENERAL MULTICHANNEL SCREEN SHOWING EXPLICIT INDEPENDENT PANELS */
                <div className="space-y-3">
                  <div className={`flex items-center justify-between border-b pb-2 mb-2 ${
                    isTriadaChannel ? "border-slate-300" : "border-white/5"
                  }`}>
                    <span className={`text-xs font-black font-mono tracking-widest uppercase flex items-center gap-2 ${
                      isTriadaChannel ? "text-slate-800" : "text-sky-400"
                    }`}>
                      <Users className={`w-5 h-5 ${isTriadaChannel ? "text-[#003087]" : "text-sky-455"}`} />
                      COLA DE ESPERA EN VIVO POR SECCIONES (FASES)
                    </span>
                    <span className={`text-xs font-mono font-bold uppercase ${
                      isTriadaChannel ? "text-slate-500" : "text-sky-305/70"
                    }`}>TOTAL: {sortedWaiting.length} ESPERANDO</span>
                  </div>

                  {(() => {
                    const subQueues = gatewaySelection === "registro_civil"
                      ? [
                          {
                            key: "OR",
                            name: "Oficial de Recepción OR",
                            colorClass: "bg-blue-500",
                            tickets: sortedWaiting.filter(t => t.procedure === "OR")
                          },
                          {
                            key: "OHV",
                            name: "Hechos Vitales OHV",
                            colorClass: "bg-cyan-500",
                            tickets: sortedWaiting.filter(t => t.procedure === "OHV")
                          }
                        ]
                      : Object.entries(PHASES_CONFIG).map(([key, phase]) => ({
                          key,
                          name: phase.name,
                          colorClass: phase.color.split(" ")[0],
                          tickets: sortedWaiting.filter(t => t.currentPhase === key)
                        }));

                    return (
                      <>
                        <div className={`grid ${layoutFocus === "queue" ? "grid-cols-2 md:grid-cols-4" : "grid-cols-2"} gap-4`}>
                          {subQueues.map(({ key, name, colorClass, tickets: phaseTickets }) => {
                            return (
                              <div key={key} className={`border p-4 flex flex-col justify-between ${layoutFocus === "queue" ? "h-[225px]" : "h-[155px]"} relative overflow-hidden rounded-2xl shadow-sm transition-all ${
                                isTriadaChannel
                                  ? "bg-white border-slate-250 hover:border-slate-350"
                                  : "bg-[#051c44]/80 border-blue-900/50 hover:border-blue-700/60"
                              }`}>
                                {/* Top accent line */}
                                <div className={`absolute top-0 left-0 right-0 h-[3.5px] ${colorClass}`} />
                                
                                <div className="space-y-2 flex-1 flex flex-col justify-between overflow-hidden">
                                  <div className={`flex items-center justify-between border-b pb-2 ${
                                    isTriadaChannel ? "border-slate-150" : "border-white/5"
                                  }`}>
                                    <span className={`text-sm font-black tracking-widest uppercase leading-none truncate ${
                                      isTriadaChannel ? "text-slate-800" : "text-white"
                                    }`}>
                                      {name}
                                    </span>
                                    <span className={`text-[10px] font-mono font-black px-2 py-0.5 border rounded ${
                                      isTriadaChannel 
                                        ? "bg-slate-100 text-[#003087] border-slate-200" 
                                        : "text-sky-300 bg-sky-955/70 border-sky-800/40"
                                    }`}>
                                      {phaseTickets.length} cola
                                    </span>
                                  </div>

                                  {phaseTickets.length > 0 ? (
                                    <div className={`flex flex-wrap gap-1.5 ${layoutFocus === "queue" ? "max-h-[145px]" : "max-h-[85px]"} overflow-y-auto pt-1 content-start scrollbar-none`}>
                                      {phaseTickets.map(t => {
                                        const secondsWaiting = Math.round((Date.now() - t.createdAt) / 1000);
                                        const isOverdue = secondsWaiting > 60;
                                        return (
                                          <span
                                            key={t.id}
                                            className={`text-[12px] font-mono px-3 py-1.5 font-black border flex items-center gap-1 rounded transition-colors duration-300 ${
                                              isOverdue 
                                                ? "bg-rose-600 text-white border-rose-650 animate-pulse font-extrabold" 
                                                : t.priority 
                                                  ? isTriadaChannel
                                                    ? "bg-amber-100/75 text-amber-900 border-amber-300 shadow-xs"
                                                    : "bg-amber-500/10 text-amber-250 border-amber-505/30 shadow-sm" 
                                                  : (t.isAppointment && gatewaySelection !== "registro_civil")
                                                    ? isTriadaChannel
                                                      ? "bg-sky-50 text-sky-900 border-sky-305 shadow-xs animate-pulse"
                                                      : "bg-emerald-500/15 text-emerald-200 border-emerald-500/30 shadow-sm animate-pulse"
                                                    : isTriadaChannel
                                                      ? "bg-slate-100 text-slate-805 border-slate-250 shadow-xs"
                                                      : "bg-[#0b244d] text-sky-200 border-sky-850/40"
                                            }`}
                                            title={`${t.name} - ${SERVICES_CONFIG[t.serviceType].name} (Espera: ${secondsWaiting}s)`}
                                          >
                                            {t.priority && !isOverdue && <span className="text-amber-500 font-bold">★</span>}
                                            {t.isAppointment && gatewaySelection !== "registro_civil" && !isOverdue && <span className="text-sky-455 font-bold">📅</span>}
                                            {isOverdue && <span className="text-white">⚠️</span>}
                                            {t.numberCode}</span>
                                        );
                                      })}
                                    </div>
                                  ) : (
                                    <div className={`flex-1 flex items-center justify-center text-xs uppercase font-bold text-center tracking-widest py-4 select-none ${
                                      isTriadaChannel ? "text-slate-400" : "text-[#00d0ff]/40"
                                    }`}>
                                      🚫 SIN ESPERAS
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {/* Explanatory banner confirming continuous same ticket */}
                        {gatewaySelection !== "registro_civil" && (
                          <div className={`p-3.5 border border-dashed text-center space-y-1 mt-2 shadow-inner rounded-xl ${
                            isTriadaChannel 
                              ? "border-slate-300 bg-slate-100/50"
                              : "border-sky-805/30 bg-sky-955/50"
                          }`}>
                            <p className={`text-xs uppercase font-black tracking-widest leading-none ${
                              isTriadaChannel ? "text-[#003087]" : "text-[#00aaff]"
                            }`}>
                              ★ UN SOLO TÍQUET: PROCESO AUTOMÁTICO CONTINUO ★
                            </p>
                            <p className={`text-[10px] uppercase font-bold leading-relaxed mt-1 ${
                              isTriadaChannel ? "text-slate-500" : "text-sky-200/60"
                            }`}>
                              Usted NO requiere un nuevo papel. Al terminar su turno en Caja el tiquet avanzará automáticamente a Tríada/Foto.
                            </p>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              ) : (
                /* FOCUSED SCREEN FOR A SPECIFIC SEPARATE PHASE MONITOR (TV BOXES) */
                <div className="space-y-3">
                  <div className={`flex items-center justify-between border-b pb-2 mb-2 ${
                    isTriadaChannel ? "border-slate-300" : "border-white/5"
                  }`}>
                    <span className={`text-xs font-black font-mono tracking-widest uppercase flex items-center gap-2 ${
                      isTriadaChannel ? "text-slate-805" : "text-sky-400"
                    }`}>
                      <Users className={`w-5 h-5 ${isTriadaChannel ? "text-[#003087]" : "text-sky-450"}`} />
                      COLA DE ESPERA EN EXCLUSIVA ({
                        selectedChannel === "OR"
                          ? "OFICIAL DE RECEPCIÓN OR"
                          : selectedChannel === "OHV"
                            ? "OFICIAL DE HECHOS VITALES OHV"
                            : selectedChannel === "RC_OTROS"
                              ? "OTROS TRÁMITES Y ENTREGA"
                              : PHASES_CONFIG[selectedChannel as TicketPhase]?.name?.toUpperCase() || "MONITOR"
                      })
                    </span>
                    <div className="flex items-center gap-3 shrink-0">
                      {selectedChannel !== "general" && (
                        <button
                          id="btn-trigger-fullscreen"
                          onClick={toggleImmersiveFullscreen}
                          className="px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg font-black text-[9.5px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md cursor-pointer border border-blue-500/30 animate-pulse active:scale-95"
                          title="Iniciar Pantalla Completa de Turnos"
                        >
                          <Tv className="w-3.5 h-3.5 text-white" />
                          <span>🖥️ Pantalla Completa</span>
                        </button>
                      )}
                      <span className={`text-xs font-mono font-extrabold ${
                        isTriadaChannel ? "text-slate-500" : "text-sky-305/70"
                      }`}>TOTAL: {filteredWaiting.length} TURNOS EN FILA</span>
                    </div>
                  </div>

                  {filteredWaiting.length > 0 ? (
                    <div className={`grid ${layoutFocus === "queue" ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4" : "grid-cols-2"} gap-3.5 max-h-[460px] overflow-y-auto pr-2 scrollbar-thin ${
                      isTriadaChannel ? "scrollbar-thumb-slate-305" : "scrollbar-thumb-slate-250"
                    }`}>
                      {filteredWaiting.map((ticket, index) => {
                        const styleConfig = SERVICES_CONFIG[ticket.serviceType];
                        return (
                          <div
                            key={ticket.id}
                            className={`p-4 rounded-2xl flex items-center justify-between border transition-all ${
                              ticket.priority
                                ? isTriadaChannel
                                  ? "bg-amber-50 border-amber-300 text-amber-950 shadow-sm"
                                  : "bg-amber-500/10 border-amber-500/40 text-amber-250 shadow-md"
                                : (ticket.isAppointment && gatewaySelection !== "registro_civil")
                                  ? isTriadaChannel
                                    ? "bg-sky-50 border-sky-350 text-sky-950 shadow-sm animate-pulse"
                                    : "bg-emerald-500/10 border-emerald-500/40 text-emerald-200 shadow-md animate-pulse"
                                  : isTriadaChannel
                                    ? "bg-white border-slate-250 text-slate-805 hover:border-slate-300 shadow-sm"
                                    : "bg-[#051c44]/80 border-blue-900/50 text-white hover:border-blue-700/60 shadow-md"
                            } ${layoutFocus === "queue" ? "p-6" : "p-3.5"}`}
                          >
                            <div className="space-y-1 truncate max-w-[200px]">
                              <span className={`text-[9px] font-mono font-black block leading-none ${
                                isTriadaChannel ? "text-slate-400" : "text-[#00d0ff]/50"
                              }`}>
                                ORDEN #{index+1}{(ticket.isAppointment && gatewaySelection !== "registro_civil") && " • 📅 CITA PREVIA"}
                              </span>
                              <h5 className={`font-black tracking-wider uppercase truncate ${
                                isTriadaChannel ? "text-slate-805" : "text-white"
                              } ${layoutFocus === "queue" ? "text-sm" : "text-xs"}`}>
                                {ticket.name}
                              </h5>
                            </div>
                            
                            <div className="flex flex-col items-end gap-1.5 font-mono select-all">
                              <span className={`font-black leading-none ${
                                isTriadaChannel ? "text-[#003087]" : "text-[#00aaff]"
                              } ${layoutFocus === "queue" ? "text-2xl" : "text-lg"}`}>
                                {ticket.numberCode}
                              </span>
                              <span className={`text-[9px] px-2 py-0.5 font-black uppercase text-center rounded ${styleConfig.color}`}>
                                {styleConfig.prefix}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className={`h-[250px] border border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center backdrop-blur shadow-sm ${
                      isTriadaChannel 
                        ? "bg-slate-100 border-slate-300 text-slate-705"
                        : "bg-slate-950/20 border-white/5 text-white"
                    }`}>
                      <p className={`text-sm uppercase tracking-widest font-black ${isTriadaChannel ? "text-slate-600" : "text-sky-450"}`}>No hay Turnos en Fila</p>
                      <p className="text-xs text-slate-400 mt-2 uppercase tracking-wide max-w-sm leading-relaxed font-bold">
                        Los turnos pasarán automáticamente a esta pantalla tan pronto se completen de Caja
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </div>

        {/* --- FOOTER: TICKERS AND RECENT LOGS --- */}
        <div id="logs-panel" className={`pt-4 border-t flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 text-xs ${
          isTriadaChannel ? "border-slate-300" : "border-white/5"
        }`}>
          <div className="flex items-center gap-3 w-full">
            <span className={`text-[10px] font-black min-w-max uppercase font-mono tracking-widest block font-bold ${
              isTriadaChannel ? "text-slate-500" : "text-sky-305/45"
            }`}>
              📢 ÚLTIMAS ATENCIONES REALIZADAS:
            </span>
            {recentHistory.length > 0 ? (
              <div className="flex items-center gap-3 overflow-x-auto py-1.5 scrollbar-none w-full">
                {recentHistory.map((h) => (
                  <span
                    key={h.id}
                    className={`px-3 py-1 text-xs font-mono rounded-lg font-bold flex items-center gap-1.5 shrink-0 border ${
                      h.status === TicketStatus.COMPLETED 
                        ? isTriadaChannel
                          ? "bg-emerald-100/70 text-emerald-900 border-emerald-300 shadow-sm"
                          : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-sm"
                        : isTriadaChannel
                          ? "bg-slate-100 text-slate-605 border-slate-205"
                          : "bg-slate-900/50 text-slate-400 border-white/5"
                    }`}
                  >
                    <span>{h.numberCode}</span>
                    <span className={`text-[10px] font-sans truncate max-w-[80px] uppercase font-bold ${
                      isTriadaChannel ? "text-slate-500" : "text-slate-400"
                    }`}>{h.name}</span>
                  </span>
                ))}
              </div>
            ) : (
              <span className={`text-[10px] font-sans tracking-widest font-black uppercase ${
                isTriadaChannel ? "text-slate-400" : "text-slate-500"
              }`}>SIN HISTORIAL RECIENTE</span>
            )}
          </div>
        </div>

      </div>

      {/* IMMERSIVE FULL SCREEN OVERLAY FOR PUBLIC TV (OR / OHV DETAILED VIEW) */}
      {isImmersiveFullscreen && (
        <div 
          className={`absolute inset-0 z-50 flex flex-col justify-between p-8 select-none overflow-hidden ${
            isTriadaChannel ? "bg-[#fafbfc] text-slate-900 border-slate-300" : "bg-[#03122c] text-white"
          }`} 
          style={
            isTriadaChannel 
              ? { backgroundImage: "linear-gradient(to bottom, #ffffff 0%, #f1f3f6 100%)" }
              : { backgroundImage: "radial-gradient(circle at 50% 30%, #0d295f 0%, #03122c 70%, #020918 105%)" }
          }
        >
          <AnimatePresence mode="wait">
            {displayedActiveCall ? (
              /* FLASHING IMMERSIVE CALL OUT WITH ACTIVE CUBICLES SIDEBAR */
              <motion.div
                key={displayedActiveCall.ticket.id}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className={`border-4 rounded-3xl p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 h-full shadow-2xl relative overflow-hidden ring-8 ${
                  isTriadaChannel
                    ? "bg-white border-rose-500 text-slate-900 ring-rose-500/5"
                    : "bg-[#0b244c]/95 border-rose-500 text-white ring-rose-500/10"
                }`}
              >
                {/* COLUMN LEFT (Col Span 8): Flashing Active Called Ticket */}
                <div className="lg:col-span-8 flex flex-col items-center justify-center gap-8 h-full relative p-6 bg-black/15 rounded-2xl border border-white/5 overflow-hidden">
                  {/* Flashing sides */}
                  <div className="absolute top-0 bottom-0 left-0 w-3 bg-rose-600 animate-pulse" />
                  <div className="absolute top-0 bottom-0 right-0 w-3 bg-amber-400 animate-pulse" />

                  {/* Destination */}
                  <div className={`flex flex-col items-center justify-center border-[10px] px-10 py-10 rounded-2xl text-center min-w-[340px] lg:min-w-[480px] shadow-2xl ${
                    isTriadaChannel
                      ? "bg-slate-50 border-rose-500 text-slate-900"
                      : "bg-white border-rose-600 text-slate-900"
                  }`}>
                    <span className={`text-sm md:text-base lg:text-lg tracking-widest uppercase font-mono font-black ${
                      isTriadaChannel ? "text-[#003087]" : "text-[#122e70]"
                    }`}>
                      {displayedActiveCall.ticket.currentPhase === TicketPhase.CAJA ? "POR FAVOR DIRÍJASE A LA" : "POR FAVOR DIRÍJASE AL"}
                    </span>
                    {(() => {
                      const isCaja = displayedActiveCall.ticket.currentPhase === TicketPhase.CAJA;
                      const fullName = displayedActiveCall.cubicle.name;
                      const cleanName = isCaja 
                        ? `CAJA ${fullName.replace(/\D/g, '') || fullName}`
                        : fullName.replace(/\s*\(.*?\)\s*/g, '').trim();
                      const subtitle = !isCaja && fullName.includes("(")
                        ? fullName.match(/\((.*?)\)/)?.[1].trim()
                        : null;

                      return (
                        <div className="flex flex-col items-center justify-center w-full">
                          <p className={`text-5xl md:text-7xl lg:text-[6.5rem] xl:text-[7.5rem] font-black mt-3 uppercase font-mono tracking-wide leading-none animate-pulse ${
                            isTriadaChannel ? "text-[#003087]" : "text-[#122e70]"
                          }`}>
                            {cleanName.toUpperCase()}
                          </p>
                          {subtitle && (
                            <p className={`text-xs md:text-sm lg:text-base xl:text-lg font-black mt-3.5 tracking-widest uppercase font-mono px-4 py-1.5 rounded-full border shadow-sm ${
                              isTriadaChannel 
                                ? "bg-slate-100 border-slate-200 text-[#003087]" 
                                : "bg-rose-50 border-rose-100 text-[#122e70]"
                            }`}>
                              {subtitle.toUpperCase()}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                    <div className="h-1.5 w-36 bg-rose-600 my-4 rounded-full animate-pulse" />
                    <p className="text-xs md:text-sm lg:text-base text-slate-500 font-mono uppercase tracking-widest font-black">
                      📢 ATENDIDO POR AGENTE: <span className="text-slate-800">{displayedActiveCall.cubicle.agentName.toUpperCase()}</span>
                    </p>
                  </div>

                  <div className="space-y-4 text-center w-full flex flex-col items-center justify-center">
                    <div>
                      <span className="px-4 py-1.5 text-xs md:text-sm lg:text-base font-mono tracking-widest font-black uppercase bg-rose-600 text-white rounded-md animate-bounce shadow-md inline-block">
                        🛎️ TURNO LLAMADO
                      </span>
                      {displayedActiveCall.ticket.priority && (
                        <span className="ml-2 px-3.5 py-1.5 text-xs md:text-sm lg:text-base font-black bg-amber-500 text-white rounded-md uppercase inline-flex items-center gap-1 shadow-md animate-pulse">
                          <ShieldAlert className="w-4 h-4" /> PRIORITARIO
                        </span>
                      )}
                    </div>
                    
                    <h1 className={`text-8xl md:text-[10rem] lg:text-[12rem] xl:text-[14rem] font-black tracking-widest leading-none drop-shadow-md animate-pulse font-mono ${
                      isTriadaChannel ? "text-[#003087]" : "text-white"
                    }`}>
                      {displayedActiveCall.ticket.numberCode}
                    </h1>
                    
                    <p className={`text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-black uppercase tracking-widest italic truncate max-w-[650px] ${
                      isTriadaChannel ? "text-slate-800" : "text-blue-200"
                    }`}>
                      {displayedActiveCall.ticket.name}
                    </p>
                  </div>
                </div>

                {/* COLUMN RIGHT (Col Span 4): Real-Time Cubicles List (Cajas disponibles) */}
                <div className="lg:col-span-4 flex flex-col min-h-0 text-left h-full overflow-hidden">
                  <div className={`flex items-center justify-between border-b pb-2 mb-3 ${
                    isTriadaChannel ? "border-slate-300" : "border-white/10"
                  }`}>
                    <span className={`text-xs font-black font-mono tracking-widest uppercase flex items-center gap-2 ${
                      isTriadaChannel ? "text-slate-805" : "text-[#00aaff]"
                    }`}>
                      <UserCheck className={`w-5 h-5 ${isTriadaChannel ? "text-[#003087]" : "text-[#00aaff]"}`} />
                      CAJAS DISPONIBLES
                    </span>
                    <span className={`text-xs font-mono tracking-wider font-bold uppercase ${
                      isTriadaChannel ? "text-slate-500" : "text-sky-300/60"
                    }`}>
                      {filteredCubicles.length} ACTIVO
                    </span>
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-3 overflow-y-auto pr-1 flex-grow max-h-[75vh] scrollbar-thin scrollbar-thumb-blue-900/50">
                    {filteredCubicles.map((cubicle) => {
                      const currentTicket = ecosystemTickets.find(t => t.id === cubicle.currentTicketId);
                      const isFree = cubicle.status === "ONLINE_AVAILABLE";
                      const isBreak = cubicle.status === "BREAK";
                      const isAttending = cubicle.status === "ATTENDING";
                      const cajaNumber = cubicle.name.replace(/\D/g, '') || cubicle.name;

                      let mainText = "DISPONIBLE";
                      let textStyle = "text-[#00d0ff]/70 font-semibold";

                      if (isAttending && currentTicket) {
                        mainText = currentTicket.name && currentTicket.name.trim() !== ""
                          ? currentTicket.name
                          : currentTicket.numberCode;
                        textStyle = "text-white font-black";
                      } else if (isBreak) {
                        mainText = "EN RECESO";
                        textStyle = "text-amber-400 font-bold";
                      } else if (cubicle.status === "OFFLINE") {
                        mainText = "MÓDULO INACTIVO";
                        textStyle = "text-slate-450 font-semibold opacity-40";
                      }

                      return (
                        <div
                          key={cubicle.id}
                          className={`relative p-4 rounded-xl bg-gradient-to-r from-[#031d4c] to-[#0c316e] border border-blue-950/20 border-b-[4px] border-r-[3px] border-b-[#00b0ff] border-r-[#0081f9] flex flex-col justify-center min-h-[78px] shadow-[0_4px_10px_rgba(0,0,0,0.2)] ${
                            isAttending ? "scale-[1.01] brightness-110 shadow-[0_6px_20px_rgba(0,176,255,0.15)] bg-gradient-to-r from-[#04245d] to-[#0f3c83]" : ""
                          }`}
                        >
                          {isAttending && (
                            <div className="absolute inset-0 bg-blue-400/5 animate-pulse rounded-xl" />
                          )}
                          <div className="flex items-center w-full truncate">
                            <span className="text-[#00d0ff] text-xs mr-1.5 select-none">▶</span>
                            <span className={`uppercase font-sans tracking-wide text-xs leading-tight truncate ${textStyle}`}>
                              {mainText}
                            </span>
                          </div>

                          <div className="mt-2 flex items-center">
                            <div className="inline-flex items-center gap-1 px-4 py-0.5 bg-[#0081f9] rounded-full text-white font-black text-xs tracking-wider shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] ml-3">
                              <span className="text-[#aae3ff] text-[9px] leading-none select-none font-sans">▶</span>
                              <span>{cajaNumber}</span>
                            </div>
                            {isFree && (
                              <span className="ml-2 text-[8px] uppercase font-mono tracking-widest text-[#00d0ff]/65 font-bold animate-pulse">
                                ★ LIBRE
                              </span>
                            )}
                            {isBreak && (
                              <span className="ml-2 text-[8px] uppercase font-mono tracking-widest text-amber-400/65 font-bold">
                                ★ REC
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            ) : (
              /* FULL LAYOUT matching exactly user request (only the filtered modules + filtered waiting) */
              <motion.div
                key="grid-turns"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-full flex flex-col justify-between"
              >
                {/* Header Banner - exactly matching the screenshot style */}
                <div className={`border rounded-2xl p-6 flex flex-col lg:flex-row items-center justify-between gap-6 text-left relative overflow-hidden transition-all duration-300 ${
                  isTriadaChannel
                    ? "bg-white border-slate-300 shadow-sm"
                    : "border-white/5 bg-[#041a3e]/85"
                }`}>
                  <div className="space-y-1.5 relative z-10 flex-grow">
                    <span className={`px-3 py-1 text-[11px] font-mono tracking-widest rounded-md font-black uppercase inline-block border ${
                      isTriadaChannel
                        ? "bg-[#003087]/10 text-[#003087] border-[#003087]/20"
                        : "bg-sky-955/70 text-[#00aaff] border-sky-800/40"
                    }`}>
                      {getFullscreenBadge()}
                    </span>
                    <h2 className={`text-3xl font-black uppercase tracking-widest leading-tight mt-1 ${
                      isTriadaChannel ? "text-slate-900" : "text-white"
                    }`}>
                      Turnos Pendientes de Atención
                    </h2>
                    <p className={`text-xs max-w-3xl leading-relaxed font-semibold ${
                      isTriadaChannel ? "text-slate-500" : "text-sky-200/70"
                    }`}>
                      {getFullscreenDescription()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-4 shrink-0 z-10">
                    {/* Clock */}
                    <div className="text-right mr-2">
                      <p className={`text-2xl font-sans font-black leading-none ${
                        isTriadaChannel ? "text-slate-900" : "text-white/95"
                      }`}>
                        {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                      <p className={`text-[9px] font-mono tracking-widest uppercase font-black mt-1 ${
                        isTriadaChannel ? "text-slate-500" : "text-sky-405"
                      }`}>
                        {currentTime.toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' }).toUpperCase()}
                      </p>
                    </div>

                    {/* Speaker Controls */}
                    <div className={`flex items-center gap-2 border px-3 py-1.5 rounded-xl font-mono text-[10px] shadow-sm ${
                      isTriadaChannel
                        ? "bg-slate-50 border-slate-250 text-[#003087]"
                        : "bg-white/5 border border-white/10 text-[#00aaff]"
                    }`}>
                      <button
                        id="btn-fs-test-voice"
                        onClick={onTestSpeaker}
                        className={`font-extrabold uppercase cursor-pointer transition-colors ${
                          isTriadaChannel ? "text-[#003087] hover:text-[#002060]" : "text-[#00aaff] hover:text-sky-305"
                        }`}
                      >
                        VOZ
                      </button>
                      <div className={`h-3 w-[1px] ${isTriadaChannel ? "bg-slate-200" : "bg-white/15"}`} />
                      <button
                        id="btn-fs-toggle-sound"
                        onClick={() => setSoundEnabled(!soundEnabled)}
                        className={`p-0.5 rounded transition-colors cursor-pointer ${
                          isTriadaChannel 
                            ? soundEnabled ? 'text-[#003087] hover:bg-slate-100' : 'text-slate-400 hover:bg-slate-100'
                            : soundEnabled ? 'text-[#00aaff] hover:bg-white/5' : 'text-slate-400 hover:bg-white/5'
                        }`}
                      >
                        {soundEnabled ? (
                          <Volume2 className={`w-3.5 h-3.5 animate-pulse ${isTriadaChannel ? "text-[#003087]" : "text-[#00aaff]"}`} />
                        ) : (
                          <VolumeX className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>

                    {/* Total Waiting Card */}
                    <div className={`px-5 py-3 border rounded-xl flex items-center gap-3 shadow-sm select-none ${
                      isTriadaChannel
                        ? "border-slate-250 bg-slate-50 text-slate-800"
                        : "border-sky-850/50 bg-[#061e47] text-white"
                    }`}>
                      <Users className={`w-6 h-6 animate-pulse ${isTriadaChannel ? "text-[#003087]" : "text-[#00aaff]"}`} />
                      <div className="text-left font-mono">
                        <span className={`block text-2xl font-black leading-none ${isTriadaChannel ? "text-[#003087]" : "text-white"}`}>{filteredWaiting.length}</span>
                        <span className={`text-[8px] font-mono tracking-widest font-black block mt-1 ${isTriadaChannel ? "text-slate-500" : "text-sky-305"}`}>EN ESPERA</span>
                      </div>
                    </div>

                    {/* Exit Button */}
                    <button
                      onClick={toggleImmersiveFullscreen}
                      className="px-4 py-3 bg-rose-600 hover:bg-rose-700 text-white font-mono text-xs font-black uppercase rounded-xl transition-all shadow-lg hover:scale-105 active:scale-95 cursor-pointer flex items-center gap-1"
                      title="Salir de pantalla completa"
                    >
                      <span>✕ Salir</span>
                    </button>
                  </div>
                </div>

                {/* Body: Dual Grid matching exactly layout from screenshot */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 flex-grow overflow-hidden">
                  {/* COLUMN LEFT: Filtered Cubicles List */}
                  <div className="lg:col-span-7 flex flex-col min-h-0 text-left">
                    <div className={`flex items-center justify-between border-b pb-2 mb-3 ${
                      isTriadaChannel ? "border-slate-300" : "border-white/10"
                    }`}>
                      <span className={`text-xs font-black font-mono tracking-widest uppercase flex items-center gap-2 ${
                        isTriadaChannel ? "text-slate-805" : "text-sky-400"
                      }`}>
                        <UserCheck className={`w-5 h-5 ${isTriadaChannel ? "text-[#003087]" : "text-[#00aaff]"}`} />
                        MÓDULOS DE ATENCIÓN {
                          selectedChannel === "OR"
                            ? "(FILTRADOS: OFICIAL DE RECEPCIÓN OR)"
                            : selectedChannel === "OHV"
                              ? "(FILTRADOS: HECHOS VITALES OHV)"
                              : selectedChannel === "RC_OTROS"
                                ? "(FILTRADOS: OTROS TRÁMITES)"
                                : selectedChannel === TicketPhase.TRIADA
                                  ? "(FILTRADOS: TRÍADA Y FOTOGRAFÍA)"
                                  : `(FILTRADOS: ${PHASES_CONFIG[selectedChannel as TicketPhase]?.name?.toUpperCase() || "MONITOR"})`
                        }
                      </span>
                      <span className={`text-xs font-mono tracking-wider font-bold uppercase ${
                        isTriadaChannel ? "text-slate-500" : "text-sky-300/60"
                      }`}>
                        {filteredCubicles.length} EN SERVICIO
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 overflow-y-auto pr-1 flex-grow max-h-[50vh] scrollbar-thin scrollbar-thumb-blue-900/50">
                      {filteredCubicles.map((cubicle) => {
                        const currentTicket = ecosystemTickets.find(t => t.id === cubicle.currentTicketId);
                        const isFree = cubicle.status === "ONLINE_AVAILABLE";
                        const isBreak = cubicle.status === "BREAK";
                        const isAttending = cubicle.status === "ATTENDING";
                        const cajaNumber = cubicle.name.replace(/\D/g, '') || cubicle.name;

                        let mainText = "DISPONIBLE";
                        let textStyle = isTriadaChannel ? "text-slate-500 font-semibold" : "text-[#00d0ff]/70 font-semibold";

                        if (isAttending && currentTicket) {
                          mainText = currentTicket.name && currentTicket.name.trim() !== ""
                            ? currentTicket.name
                            : currentTicket.numberCode;
                          textStyle = isTriadaChannel ? "text-slate-900 font-black" : "text-white font-black";
                        } else if (isBreak) {
                          mainText = "EN RECESO";
                          textStyle = "text-amber-500 font-bold";
                        } else if (cubicle.status === "OFFLINE") {
                          mainText = "MÓDULO INACTIVO";
                          textStyle = "text-slate-400 font-semibold opacity-60";
                        }

                        return (
                          <div
                            key={cubicle.id}
                            className={`relative p-5 rounded-[22px] flex flex-col justify-center min-h-[92px] transition-all duration-300 ${
                              isTriadaChannel
                                ? `bg-white border-2 border-slate-200 border-b-[5px] border-r-[4px] border-b-[#003087] border-r-[#0047ab] shadow-[0_4px_12px_rgba(0,0,0,0.06)] ${
                                    isAttending
                                      ? "scale-[1.01] ring-2 ring-[#003087]/30 bg-blue-50/40"
                                      : "opacity-95"
                                  }`
                                : `bg-gradient-to-r from-[#031d4c] to-[#0c316e] border border-blue-950/20 border-b-[5px] border-r-[4px] border-b-[#00b0ff] border-r-[#0081f9] shadow-[0_5px_15px_rgba(0,0,0,0.25)] ${
                                    isAttending ? "scale-[1.01] brightness-110 shadow-[0_8px_25px_rgba(0,176,255,0.15)] bg-gradient-to-r from-[#04245d] to-[#0f3c83]" : ""
                                  }`
                            }`}
                          >
                            {isAttending && (
                              <div className={`absolute inset-0 animate-pulse rounded-[22px] ${
                                isTriadaChannel ? "bg-blue-600/5" : "bg-blue-400/5"
                              }`} />
                            )}
                            <div className="flex items-center w-full truncate">
                              <span className={`text-base mr-2 font-sans select-none ${
                                isTriadaChannel ? "text-[#003087]" : "text-[#00d0ff]"
                              }`}>▶</span>
                              <span className={`uppercase font-sans tracking-wide text-sm md:text-base leading-tight truncate ${textStyle}`}>
                                {mainText}
                              </span>
                            </div>

                            <div className="mt-2.5 flex items-center">
                              <div className={`inline-flex items-center gap-1.5 px-5 py-0.5 rounded-full text-white font-black text-xs md:text-sm tracking-wider shadow-[inset_0_2px_4px_rgba(0,0,0,0.15)] ml-5 ${
                                isTriadaChannel ? "bg-[#003087]" : "bg-[#0081f9]"
                              }`}>
                                <span className={`${isTriadaChannel ? "text-blue-200" : "text-[#aae3ff]"} text-[10px] leading-none select-none font-sans`}>▶</span>
                                <span>{cajaNumber}</span>
                              </div>
                              {isFree && (
                                <span className={`ml-2.5 text-[8.5px] uppercase font-mono tracking-widest font-bold animate-pulse ${
                                  isTriadaChannel ? "text-emerald-700" : "text-[#00d0ff]/65"
                                }`}>
                                  ★ LIBRE
                                </span>
                              )}
                              {isBreak && (
                                <span className={`ml-2.5 text-[8.5px] uppercase font-mono tracking-widest font-bold ${
                                  isTriadaChannel ? "text-amber-700" : "text-amber-400/65"
                                }`}>
                                  ★ REC
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* COLUMN RIGHT: Filtered Waiting List */}
                  <div className="lg:col-span-5 flex flex-col min-h-0 text-left">
                    <div className={`flex items-center justify-between border-b pb-2 mb-3 ${
                      isTriadaChannel ? "border-slate-300" : "border-white/10"
                    }`}>
                      <span className={`text-xs font-black font-mono tracking-widest uppercase flex items-center gap-2 ${
                        isTriadaChannel ? "text-slate-805" : "text-sky-400"
                      }`}>
                        <Users className={`w-5 h-5 ${isTriadaChannel ? "text-[#003087]" : "text-[#00aaff]"}`} />
                        COLA DE ESPERA EN EXCLUSIVA ({
                          selectedChannel === "OR"
                            ? "OFICIAL DE RECEPCIÓN OR"
                            : selectedChannel === "OHV"
                              ? "OFICIAL DE HECHOS VITALES OHV"
                              : selectedChannel === "RC_OTROS"
                                ? "OTROS TRÁMITES Y ENTREGA"
                                : selectedChannel === TicketPhase.TRIADA
                                  ? "VENTANILLA / TRÍADA"
                                  : PHASES_CONFIG[selectedChannel as TicketPhase]?.name?.toUpperCase() || "MONITOR"
                        })
                      </span>
                      <span className={`text-xs font-mono font-extrabold ${
                        isTriadaChannel ? "text-slate-500" : "text-sky-305/70"
                      }`}>
                        TOTAL: {filteredWaiting.length} TURNOS EN FILA
                      </span>
                    </div>

                    <div className="flex-grow overflow-y-auto max-h-[50vh] pr-1">
                      {filteredWaiting.length > 0 ? (
                        <div className="grid grid-cols-2 gap-3.5">
                          {filteredWaiting.map((ticket, index) => {
                            const styleConfig = SERVICES_CONFIG[ticket.serviceType];
                            return (
                              <div
                                key={ticket.id}
                                className={`p-4 rounded-2xl flex items-center justify-between border transition-all ${
                                  ticket.priority
                                    ? isTriadaChannel
                                      ? "bg-amber-50 border-amber-300 text-amber-950 shadow-sm"
                                      : "bg-amber-500/10 border-amber-500/40 text-amber-250 shadow-md"
                                    : (ticket.isAppointment && gatewaySelection !== "registro_civil")
                                      ? isTriadaChannel
                                        ? "bg-sky-50 border-sky-350 text-sky-950 shadow-sm animate-pulse"
                                        : "bg-emerald-500/10 border-emerald-500/40 text-emerald-200 shadow-md animate-pulse"
                                      : isTriadaChannel
                                        ? "bg-white border-slate-250 text-slate-805 hover:border-slate-300 shadow-sm"
                                        : "bg-[#051c44]/80 border-blue-900/50 text-white hover:border-blue-700/60 shadow-md"
                                }`}
                              >
                                <div className="space-y-1 truncate max-w-[150px] text-left">
                                  <span className={`text-[9px] font-mono font-black block leading-none ${
                                    isTriadaChannel ? "text-slate-400" : "text-[#00d0ff]/50"
                                  }`}>
                                    ORDEN #{index+1}{(ticket.isAppointment && gatewaySelection !== "registro_civil") && " • 📅 CITA PREVIA"}
                                  </span>
                                  <h5 className={`font-black tracking-wider uppercase truncate text-xs ${
                                    isTriadaChannel ? "text-slate-805" : "text-white"
                                  }`}>
                                    {ticket.name}
                                  </h5>
                                </div>
                                
                                <div className="flex flex-col items-end gap-1 font-mono">
                                  <span className={`font-black leading-none text-lg ${
                                    isTriadaChannel ? "text-[#003087]" : "text-[#00aaff]"
                                  }`}>
                                    {ticket.numberCode}
                                  </span>
                                  <span className={`text-[9px] px-2 py-0.5 font-black uppercase text-center rounded ${styleConfig.color}`}>
                                    {styleConfig.prefix}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ) : (
                        <div className={`h-[250px] border border-dashed rounded-xl flex flex-col items-center justify-center p-6 text-center backdrop-blur shadow-sm ${
                          isTriadaChannel
                            ? "border-slate-300 bg-white"
                            : "border-white/10 bg-slate-950/20"
                        }`}>
                          <p className={`text-sm uppercase tracking-widest font-black ${
                            isTriadaChannel ? "text-slate-600" : "text-sky-455"
                          }`}>No hay Turnos en Fila</p>
                          <p className={`text-xs mt-2 uppercase tracking-wide max-w-sm leading-relaxed font-bold ${
                            isTriadaChannel ? "text-slate-500" : "text-slate-400"
                          }`}>
                            Los turnos pasarán automáticamente a esta pantalla tan pronto se completen de Caja
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Recent Attention History */}
                <div className={`pt-4 border-t flex items-center justify-between text-xs font-bold font-mono ${
                  isTriadaChannel ? "border-slate-300 text-slate-650" : "border-white/10 text-sky-400/50"
                }`}>
                  <div className="flex items-center gap-3 w-full">
                    <span className={`text-[10px] font-black min-w-max uppercase font-mono tracking-widest font-bold ${
                      isTriadaChannel ? "text-slate-500" : "text-sky-305/45"
                    }`}>
                      📢 ÚLTIMAS ATENCIONES REALIZADAS:
                    </span>
                    {recentHistory.length > 0 ? (
                      <div className="flex items-center gap-3 overflow-x-auto py-1.5 scrollbar-none w-full">
                        {recentHistory.map((h) => (
                          <span
                            key={h.id}
                            className={`px-3 py-1 text-xs font-mono rounded-lg font-bold flex items-center gap-1.5 shrink-0 border ${
                              h.status === TicketStatus.COMPLETED 
                                ? isTriadaChannel
                                  ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm"
                                  : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30 shadow-sm"
                                : isTriadaChannel
                                  ? "bg-slate-100 text-slate-500 border-slate-200"
                                  : "bg-[#051c44]/80 text-slate-400 border-white/5"
                            }`}
                          >
                            <span>{h.numberCode}</span>
                            <span className={`text-[10px] font-sans truncate max-w-[80px] uppercase font-bold ${
                              isTriadaChannel ? "text-slate-600" : "text-slate-400"
                            }`}>{h.name}</span>
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className={`text-[10px] font-sans tracking-widest font-black uppercase ${
                        isTriadaChannel ? "text-slate-400" : "text-[#051c44]/80"
                      }`}>SIN HISTORIAL RECIENTE</span>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
