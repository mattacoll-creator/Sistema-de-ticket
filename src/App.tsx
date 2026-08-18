/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useTicketSystem } from "./hooks/useTicketSystem";
import { ServiceType, SERVICES_CONFIG, OFFICES_CONFIG, UserRole, SystemUser } from "./types";
import { playCallingChime, speakCall } from "./utils/audio";


// Import custom components
import WelcomeKiosk from "./components/WelcomeKiosk";
import MainScreen from "./components/MainScreen";
import AgentConsole from "./components/AgentConsole";
import ControlDashboard from "./components/ControlDashboard";
import SuperAdminConsole from "./components/SuperAdminConsole";
import GatewayScreen from "./components/GatewayScreen";
import CitasApp from "./components/CitasApp";
import TicketTracker from "./components/TicketTracker";

import { 
  Tv, 
  Printer, 
  UserCheck, 
  Settings, 
  LayoutGrid, 
  Sparkles, 
  Volume2, 
  Activity,
  Heart,
  Trash2,
  UserPlus,
  Eye,
  EyeOff,
  Lock,
  Unlock,
  Laptop,
  Tablet,
  Maximize2,
  Minimize2,
  CalendarCheck2,
  Link as LinkIcon,
  Copy,
  Check,
  ExternalLink,
  Globe,
  Smartphone
} from "lucide-react";

export default function App() {
  // Track selected gateway option: "select" | "cedulacion" | "registro_civil"
  const [gatewaySelection, setGatewaySelection] = useState<"select" | "cedulacion" | "registro_civil">("select");

  const {
    currentOfficeId,
    setCurrentOfficeId,
    tickets,
    cubicles,
    activeCall,
    setActiveCall,
    isSimulationActive,
    setIsSimulationActive,
    simulationSpeed,
    setSimulationSpeed,
    isAutoAssignActive,
    setIsAutoAssignActive,
    createTicket,
    callNextTicket,
    startAttendingTicket,
    completeTicket,
    transferTicketToCajaRC,
    markTicketAsMissed,
    recallCurrentTicket,
    changeCubicleStatus,
    updateCubicleConfig,
    resetSystem,
    purgeOldTickets,
    officeTickets,
    setOfficeTickets,
    officeCubicles,
    setOfficeCubicles,
    supabaseSyncStatus,
    pullOfficeFromSupabase,
    pushOfficeToSupabase
  } = useTicketSystem(gatewaySelection);

  // --- INTEGRACIÓN GESTIÓN DE ROLES Y USUARIOS ---
  const DEFAULT_USERS: SystemUser[] = [
    {
      id: "user-login-generic",
      username: "login",
      fullName: "Usuario de Prueba Inicial",
      role: UserRole.SUPERADMIN,
      officeId: "OFF-1",
      password: "login",
      mustChangePassword: true
    },
    {
      id: "user-super",
      username: "superadmin",
      fullName: "Administrador Central",
      role: UserRole.SUPERADMIN,
      officeId: "OFF-1" // Sede Ancón
    },
    {
      id: "user-sup-ancon",
      username: "rsanchez",
      fullName: "Ricardo Sánchez (Supervisor Sede Ancón)",
      role: UserRole.SUPERVISOR,
      officeId: "OFF-1" // Sede Ancón
    },
    {
      id: "user-sup-bocas",
      username: "amora",
      fullName: "Ana María Mora (Supervisor Regional Bocas)",
      role: UserRole.SUPERVISOR,
      officeId: "OFF-2" // Bocas del Toro
    },
    {
      id: "user-caja-ancon",
      username: "mcruz",
      fullName: "Mateo Cruz (Cajero Sede Ancón)",
      role: UserRole.AGENT_CAJA,
      officeId: "OFF-1" // Sede Ancón
    },
    {
      id: "user-triada-ancon",
      username: "jgutierrez",
      fullName: "Julia Gutiérrez (Tríada Sede Ancón)",
      role: UserRole.AGENT_TRIADA,
      officeId: "OFF-1" // Sede Ancón
    },
    {
      id: "user-caja-bocas",
      username: "frios",
      fullName: "Felipe Ríos (Cajero Bocas del Toro)",
      role: UserRole.AGENT_CAJA,
      officeId: "OFF-2" // Bocas del Toro
    },
    {
      id: "user-triada-bocas",
      username: "spadilla",
      fullName: "Silvia Padilla (Tríada Bocas del Toro)",
      role: UserRole.AGENT_TRIADA,
      officeId: "OFF-2" // Bocas del Toro
    }
  ];

  const [users, setUsers] = useState<SystemUser[]>(() => {
    const saved = localStorage.getItem("system_users");
    try {
      return saved ? JSON.parse(saved) : DEFAULT_USERS;
    } catch {
      return DEFAULT_USERS;
    }
  });

  const [currentActiveUserId, setCurrentActiveUserId] = useState<string>(() => {
    return localStorage.getItem("current_active_user_id") || "user-caja-ancon";
  });

  React.useEffect(() => {
    localStorage.setItem("system_users", JSON.stringify(users));
  }, [users]);

  React.useEffect(() => {
    localStorage.setItem("current_active_user_id", currentActiveUserId);
    const targetUser = users.find(u => u.id === currentActiveUserId);
    if (targetUser && targetUser.officeId) {
      setCurrentOfficeId(targetUser.officeId);
    }
  }, [currentActiveUserId, users, setCurrentOfficeId]);

  // Selected viewport tab: "kiosk" | "tv" | "agent" | "admin" | "super-admin" | "tracker"
  const [activeTab, setActiveTab ] = useState<string>("kiosk");
  const [trackingTicketCode, setTrackingTicketCode] = useState<string>("");

  // Direct Links Modal state
  const [isDirectLinksModalOpen, setIsDirectLinksModalOpen] = useState<boolean>(false);
  const [copiedDirectKey, setCopiedDirectKey] = useState<string | null>(null);

  // Listen to URL search parameters for direct linking (?view=citas, ?view=ticket, ?view=unificado, etc.)
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get("view") || params.get("tab") || params.get("modo") || params.get("screen");
    const ticketParam = params.get("ticket");
    if (ticketParam) {
      setTrackingTicketCode(ticketParam.trim().toUpperCase());
      setGatewaySelection("cedulacion");
      setActiveTab("tracker");
      return;
    }
    if (viewParam) {
      const v = viewParam.toLowerCase();
      if (v === "citas" || v === "cita" || v === "agendamiento") {
        setGatewaySelection("cedulacion");
        setActiveTab("citas");
      } else if (v === "kiosk" || v === "ticket" || v === "tickets" || v === "turnos" || v === "kiosco") {
        setGatewaySelection("cedulacion");
        setActiveTab("kiosk");
      } else if (v === "seguimiento" || v === "tracker" || v === "tracking" || v === "consultar" || v === "movil") {
        setGatewaySelection("cedulacion");
        setActiveTab("tracker");
      } else if (v === "unificado" || v === "gateway" || v === "select" || v === "inicio" || v === "portal") {
        setGatewaySelection("select");
      } else if (v === "tv" || v === "monitor" || v === "sala") {
        setGatewaySelection("cedulacion");
        setActiveTab("tv");
      } else if (v === "agent" || v === "agente" || v === "ventanilla") {
        setGatewaySelection("cedulacion");
        setActiveTab("agent");
      } else if (v === "admin") {
        setGatewaySelection("cedulacion");
        setActiveTab("admin");
      } else if (v === "super-admin" || v === "superadmin") {
        setGatewaySelection("cedulacion");
        setActiveTab("super-admin");
      }
    }
  }, []);

  // Update browser URL search query parameters dynamically
  React.useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const url = new URL(window.location.href);
      let viewVal = "unificado";
      if (gatewaySelection === "select") {
        viewVal = "unificado";
      } else {
        viewVal = activeTab === "kiosk" ? "ticket" : activeTab;
      }
      url.searchParams.set("view", viewVal);
      window.history.replaceState({}, "", url.toString());
    } catch (e) {
      // ignore
    }
  }, [gatewaySelection, activeTab]);

  const handleCopyDirectLink = (key: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window === "undefined") return;
    const origin = window.location.origin + window.location.pathname;
    const fullUrl = `${origin}?view=${key}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedDirectKey(key);
    setTimeout(() => {
      setCopiedDirectKey(null);
    }, 2000);
  };

  // Track the tab requested during login redirection
  const [pendingAuthTab, setPendingAuthTab] = useState<string>("admin");


  // Viewport adaptive display mode: "desktop" (laptops) | "tablet" (tablets)
  const [viewType, setViewType] = useState<"desktop" | "tablet">("desktop");

  // Track browser native fullscreen state
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  React.useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    if (!document.fullscreenElement) {
      try {
        await document.documentElement.requestFullscreen();
      } catch (err) {
        console.warn("Fullscreen request failed", err);
        alert(
          "El navegador ha bloqueado la pantalla completa automática debido a las políticas de seguridad o a que usted se encuentra visualizando el sistema dentro del visor de AI Studio (iframe).\n\n💡 CÓMO SOLUCIONARLO PARA OCULTAR LA BARRA DE DIRECCIÓN:\n1. Presione el botón 'Abrir en Pestaña Nueva' (enlace destacado en color naranja dentro de la sección de impresión del kiosko)\n2. Una vez que el sistema se abra en su propia pestaña, haga clic en el botón de 'Pantalla Completa' y se activará al instante sin restricciones de iframe."
        );
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.warn("Error saliendo de pantalla completa", err);
      }
    }
  };

  // Keep navigation menu hidden for dedicated device screen focus (Kiosk / TV screen lock)
  const [isHeaderHidden, setIsHeaderHidden] = useState<boolean>(false);

  // Floating PIN modal to show menu
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);

  const handleVerifyPin = () => {
    if (pinInput === "12345678") {
      setIsHeaderHidden(false);
      setIsPinModalOpen(false);
      setPinInput("");
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  // Administration Authentication states (password: Admin12345)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>("");
  const [adminPasswordError, setAdminPasswordError] = useState<boolean>(false);

  const handleVerifyAdminPassword = () => {
    if (adminPasswordInput === "Admin12345") {
      setIsAdminAuthenticated(true);
      setIsAdminLoginModalOpen(false);
      setAdminPasswordInput("");
      setAdminPasswordError(false);
      setActiveTab(pendingAuthTab);
    } else {
      setAdminPasswordError(true);
    }
  };

  const handleTriggerAdminLogin = (callbackTab: string) => {
    setPendingAuthTab(callbackTab);
    setAdminPasswordInput("");
    setAdminPasswordError(false);
    setIsAdminLoginModalOpen(true);
  };

  // Speaker Test trigger
  const handleTestSpeaker = async () => {
    try {
      await playCallingChime();
      await new Promise(r => setTimeout(r, 450));
      await speakCall("P-01", "María Delgado", "Módulo de Pruebas");
    } catch (e) {
      console.warn("Dispositivo bloqueó la síntesis de voz automática.", e);
    }
  };

  // Helper to generate a random client ticket with 1-click
  const handleCreateRandomTicket = () => {
    const randomNames = [
      "Sofía Castro", "Mateo Gómez", "Valentina Ruíz", "Santiago Lopera", "Mariana Ochoa", 
      "Emmanuel Torres", "Isabella Díaz", "Sebastián Muñoz", "Camila Restrepo", "Luis Hernández",
      "Gabriela Ortiz", "Alejandro Bedoya", "Lucía Mejía", "Andrés Cardona", "Daniela Vargas",
      "Felipe Rojas", "Camila Montes", "Juan Diego", "Adriana Rincón", "Héctor Soler"
    ];

    const randomServices = (gatewaySelection === "registro_civil" ? [
      ServiceType.REGISTRO
    ] : [
      ServiceType.ELECTORAL,
      ServiceType.CEDULACION,
      ServiceType.EXTRANJERIA,
      ServiceType.REG_CERTIFICATION
    ]).filter(s => s !== ServiceType.EXTRANJERIA || currentOfficeId === "OFF-1");

    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const randomService = randomServices[Math.floor(Math.random() * randomServices.length)];
    const randomPriority = Math.random() < 0.25; // 25% priority

    createTicket(randomName, randomService, randomPriority);
  };

  if (gatewaySelection === "select") {
    return (
      <GatewayScreen 
        onSelectOption={(option) => {
          setGatewaySelection(option);
          setActiveTab("kiosk");
        }} 
        onSelectCitas={() => {
          setGatewaySelection("cedulacion");
          setActiveTab("citas");
        }} 
        onSelectView={(viewKey) => {
          setGatewaySelection("cedulacion");
          setActiveTab(viewKey);
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans text-slate-900 pb-12 flex flex-col justify-between relative">
      {/* Floating button to restore navigation when hidden */}
      {isHeaderHidden && (
        <button
          onClick={() => {
            setIsPinModalOpen(true);
            setPinInput("");
            setPinError(false);
          }}
          className="fixed bottom-6 right-6 z-50 bg-[#122e70]/95 text-white hover:bg-[#122e70] transition-all px-4.5 py-3 rounded-full flex items-center justify-center gap-2 text-xs font-black uppercase tracking-wider shadow-2xl border-none hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md"
          title="Haga clic aquí para volver a mostrar el menú superior y cambiar de pantalla"
        >
          <Eye className="w-4 h-4 text-amber-400" />
          <span>Mostrar Menú</span>
        </button>
      )}

      {/* PIN Verification Modal */}
      {isPinModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[9999] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#122e70] p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4 animate-fade-in text-slate-950 font-sans">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-blue-50 text-[#122e70] rounded-full flex items-center justify-center mx-auto mb-2 border border-blue-200">
                <Eye className="w-5 h-5 text-[#122e70]" />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest font-sans">Desbloquear Menú</h3>
              <p className="text-[10px] text-slate-500 font-medium font-sans">Por favor ingrese la clave de administración de 8 dígitos para ver las demás pantallas.</p>
            </div>

            <div className="space-y-3">
              <div className="relative">
                <input
                  type="password"
                  maxLength={8}
                  placeholder="••••••••"
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value.replace(/\D/g, ""));
                    setPinError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleVerifyPin();
                    }
                  }}
                  className={`w-full text-center tracking-[0.5em] text-lg font-mono font-bold py-3 bg-slate-50 border rounded-xl placeholder:tracking-normal focus:outline-none focus:ring-2 ${
                    pinError ? "border-red-500 focus:ring-red-200 focus:bg-red-50/20" : "border-slate-250 focus:ring-blue-100 focus:border-[#122e70]"
                  }`}
                  autoFocus
                />
              </div>

              {pinError && (
                <p className="text-[10px] text-red-600 font-extrabold text-center uppercase tracking-wider">
                  ❌ Clave de administración incorrecta
                </p>
              )}

              {/* Touch Numpad for kiosk / tablet screens */}
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((num) => (
                  <button
                    key={num}
                    onClick={() => {
                      if (pinInput.length < 8) {
                        setPinInput(prev => prev + num);
                        setPinError(false);
                      }
                    }}
                    className="py-2.5 text-xs font-mono font-black text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer active:scale-95"
                  >
                    {num}
                  </button>
                ))}
                <button
                  onClick={() => setPinInput("")}
                  className="py-2.5 text-[9px] uppercase font-black text-red-600 bg-red-50 hover:bg-red-100 border border-red-200 rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  Borrar
                </button>
                <button
                  onClick={() => {
                    if (pinInput.length < 8) {
                      setPinInput(prev => prev + "0");
                      setPinError(false);
                    }
                  }}
                  className="py-2.5 text-xs font-mono font-black text-slate-800 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  0
                </button>
                <button
                  onClick={() => {
                    if (pinInput.length > 0) {
                      setPinInput(prev => prev.slice(0, -1));
                    }
                  }}
                  className="py-2.5 text-[9px] uppercase font-black text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-all cursor-pointer active:scale-95"
                >
                  ←
                </button>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setIsPinModalOpen(false);
                    setPinInput("");
                    setPinError(false);
                  }}
                  className="flex-1 py-2.5 border border-slate-250 text-slate-650 hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleVerifyPin}
                  className="flex-1 py-2.5 bg-[#122e70] hover:bg-blue-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Entrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Admin Password Verification Modal */}
      {isAdminLoginModalOpen && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#122e70] p-6 rounded-2xl w-full max-w-sm shadow-2xl space-y-4 animate-fade-in text-slate-950 font-sans">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-blue-50 text-[#122e70] rounded-full flex items-center justify-center mx-auto mb-2 border border-blue-200">
                <Lock className="w-5 h-5 text-[#122e70]" />
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest font-sans">Acceso Restringido</h3>
              <p className="text-[10px] text-slate-500 font-medium font-sans">Sector de control reservado únicamente para personal autorizado del Tribunal Electoral.</p>
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400">Contraseña de Administración</label>
                <input
                  type="password"
                  placeholder="Ingrese clave de administración"
                  value={adminPasswordInput}
                  onChange={(e) => {
                    setAdminPasswordInput(e.target.value);
                    setAdminPasswordError(false);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      handleVerifyAdminPassword();
                    }
                  }}
                  className={`w-full text-center text-sm font-mono tracking-widest py-3 bg-slate-50 border rounded-xl focus:outline-none focus:ring-2 ${
                    adminPasswordError ? "border-red-500 focus:ring-red-200 focus:bg-red-50/20" : "border-slate-250 focus:ring-blue-100 focus:border-[#122e70]"
                  }`}
                  autoFocus
                />
              </div>

              {adminPasswordError && (
                <p className="text-[10px] text-red-600 font-extrabold text-center uppercase tracking-wider">
                  ❌ Clave Incorrecta
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => {
                    setIsAdminLoginModalOpen(false);
                    setAdminPasswordInput("");
                    setAdminPasswordError(false);
                  }}
                  className="flex-1 py-2.5 border border-slate-250 text-slate-650 hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleVerifyAdminPassword}
                  className="flex-1 py-2.5 bg-[#122e70] hover:bg-blue-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Ingresar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DIRECT LINKS MODAL */}
      {isDirectLinksModalOpen && (
        <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-[10000] flex items-center justify-center p-4">
          <div className="bg-white border-2 border-[#122e70] p-6 rounded-3xl w-full max-w-xl shadow-2xl space-y-5 animate-fade-in text-slate-950 font-sans">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-amber-100 text-amber-900 rounded-2xl border border-amber-200">
                  <LinkIcon className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider font-sans">
                    Enlaces Directos del Sistema
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Copie los enlaces o navegue directamente a cualquier módulo sin pasos intermedios.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsDirectLinksModalOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center font-bold text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 max-h-[60vh] overflow-y-auto pr-1">
              {[
                {
                  key: "citas",
                  name: "📅 Agendamiento de Citas (CitasTE)",
                  desc: "Acceso directo al portal web de reservas de citas",
                  action: () => {
                    setGatewaySelection("cedulacion");
                    setActiveTab("citas");
                    setIsDirectLinksModalOpen(false);
                  }
                },
                {
                  key: "ticket",
                  name: "🎟️ Kiosco de Tickets Presenciales",
                  desc: "Emisión directa de turnos de cédula para clientes",
                  action: () => {
                    setGatewaySelection("cedulacion");
                    setActiveTab("kiosk");
                    setIsDirectLinksModalOpen(false);
                  }
                },
                {
                  key: "unificado",
                  name: "🌐 Sistema Unificado (Portal Inicial)",
                  desc: "Pantalla principal de bienvenida y selección",
                  action: () => {
                    setGatewaySelection("select");
                    setIsDirectLinksModalOpen(false);
                  }
                },
                {
                  key: "tv",
                  name: "📺 Monitor TV de Sala",
                  desc: "Pantalla completa para llamado de turnos a clientes",
                  action: () => {
                    setGatewaySelection("cedulacion");
                    setActiveTab("tv");
                    setIsDirectLinksModalOpen(false);
                  }
                },
                {
                  key: "agent",
                  name: "👨‍💻 Consola del Agente",
                  desc: "Panel de atención de ventanillas y llamadas",
                  action: () => {
                    setGatewaySelection("cedulacion");
                    setActiveTab("agent");
                    setIsDirectLinksModalOpen(false);
                  }
                },
                {
                  key: "seguimiento",
                  name: "📱 Seguimiento Móvil de Turno",
                  desc: "Consulta tu turno en vivo con vibración y sonido en celular",
                  action: () => {
                    setGatewaySelection("cedulacion");
                    setActiveTab("tracker");
                    setIsDirectLinksModalOpen(false);
                  }
                }
              ].map((item) => {
                const origin = typeof window !== "undefined" ? window.location.origin + window.location.pathname : "";
                const fullUrl = `${origin}?view=${item.key}`;
                const isCopied = copiedDirectKey === item.key;

                return (
                  <div 
                    key={item.key}
                    className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-blue-300 transition-all"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900">{item.name}</span>
                        <span className="text-[8.5px] font-mono text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                          ?view={item.key}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">{item.desc}</p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={item.action}
                        className="py-1.5 px-3 bg-[#122e70] hover:bg-blue-800 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <ExternalLink className="w-3 h-3 text-amber-400" />
                        <span>Ir Ahora</span>
                      </button>

                      <button
                        onClick={(e) => handleCopyDirectLink(item.key, e)}
                        className={`py-1.5 px-3 text-[10px] font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                          isCopied 
                            ? "bg-emerald-600 text-white border-emerald-600" 
                            : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                        }`}
                      >
                        {isCopied ? (
                          <>
                            <Check className="w-3 h-3 text-white" />
                            <span>¡Copiado!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3 text-slate-500" />
                            <span>Copiar URL</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="pt-2 text-center">
              <button
                onClick={() => setIsDirectLinksModalOpen(false)}
                className="w-full py-2.5 border border-slate-250 text-slate-650 hover:bg-slate-50 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* UPPER NATIONAL FLAG BAR */}
      {!isHeaderHidden && activeTab !== "citas" && (
        <div className="w-full h-1 flex select-none shrink-0 relative z-35 shadow-sm">
          <div className="bg-[#da121a] flex-1"></div>
          <div className="bg-[#003087] flex-1"></div>
        </div>
      )}

      {/* MASTER SIMULATOR & COMPATIBILITY BAR */}
      {activeTab !== "citas" && (
        <div className="w-full bg-[#0a1931] text-white py-2.5 px-4 md:px-8 border-b border-[#15305b] flex flex-wrap items-center justify-between gap-3 shadow-lg shrink-0 relative z-30 font-sans premium-glow-blue">
          <div className="flex items-center gap-3.5 flex-wrap">
            <div className="flex items-center gap-1.5 bg-blue-950/80 px-3 py-1 rounded-full border border-blue-800/60 text-[9px] font-black tracking-widest uppercase shrink-0">
              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
              <span>Controles</span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-semibold text-blue-100">
              <span>Departamento:</span>
              <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                gatewaySelection === "registro_civil" ? "bg-blue-600 text-white" : "bg-amber-500 text-slate-950"
              }`}>
                {gatewaySelection === "registro_civil" ? "Registro Civil" : "Cedulación"}
              </span>
              <button
                onClick={() => setGatewaySelection("select")}
                className="ml-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/20 hover:text-white border border-white/25 hover:border-white/50 text-blue-100 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer active:scale-95"
                title="Volver a la selección inicial"
              >
                Cambiar Sede/Trámite
              </button>
              <button
                onClick={() => setIsDirectLinksModalOpen(true)}
                className="ml-1 px-2.5 py-1 bg-amber-400 hover:bg-amber-500 text-slate-950 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer active:scale-95 flex items-center gap-1 shadow-sm"
                title="Ver y copiar enlaces directos para Citas, Tickets y Sistema Unificado"
              >
                <LinkIcon className="w-3 h-3 text-slate-950" />
                <span>Enlaces Directos</span>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Version Escritorio (Laptop) */}
            <button
              onClick={() => setViewType("desktop")}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                viewType === "desktop"
                  ? "bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-md font-sans border-none"
                  : "bg-[#122e70] text-blue-200 border border-blue-800 hover:bg-blue-800/50"
              }`}
              title="Versión Escritorio: Ajusta la pantalla completa optimizada para ordenadores portátiles y Laptops"
            >
              <Laptop className="w-3.5 h-3.5" />
              <span>Versión Escritorio (Laptop)</span>
            </button>

            {/* Version Tablet */}
            <button
              onClick={() => setViewType("tablet")}
              className={`px-3.5 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                viewType === "tablet"
                  ? "bg-amber-400 hover:bg-amber-500 text-slate-950 shadow-md font-sans border-none"
                  : "bg-[#122e70] text-blue-200 border border-blue-800 hover:bg-blue-800/50"
              }`}
              title="Versión Tablet: Optimiza y encuadra la pantalla simulando una tableta de atención"
            >
              <Tablet className="w-3.5 h-3.5" />
              <span>Versión Tablet</span>
            </button>

            <div className="h-5 w-[1.5px] bg-blue-800/80 mx-1 hidden sm:block" />

            {/* Toggle Fullscreen Action */}
            <button
              onClick={toggleFullscreen}
              className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-2 transition-all cursor-pointer ${
                isFullscreen
                  ? "bg-red-600 hover:bg-red-700 text-white border-none shadow-md"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white border-none shadow-md"
              }`}
              title="Pantalla Completa: Pone la aplicación en pantalla completa para ocultar las barras y menús del navegador"
            >
              {isFullscreen ? <Minimize2 className="w-3.5 h-3.5 animate-pulse" /> : <Maximize2 className="w-3.5 h-3.5" />}
              <span>{isFullscreen ? "Salir Pantalla Completa" : "Pantalla Completa"}</span>
            </button>
          </div>
        </div>
      )}

      {/* HEADER SECTION */}
      {!isHeaderHidden && activeTab !== "citas" && (
        <header className="max-w-7xl mx-auto w-full px-4 md:px-8 pt-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          
          <div className="flex flex-col md:flex-row md:items-center gap-4 pl-1">
            <img 
              src="https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/05/AGENDATE-01.png" 
              referrerPolicy="no-referrer" 
              alt="Tribunal Electoral de Panamá" 
              className="h-14 md:h-16 w-auto object-contain self-start md:self-center" 
            />
            <div className="h-6 w-[1px] bg-slate-250 hidden md:block" />
            <div className="flex flex-col">
              <label htmlFor="office-select" className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-0.5">
                Sede / Oficina Regional Activa
              </label>
              <select
                id="office-select"
                value={currentOfficeId}
                onChange={(e) => setCurrentOfficeId(e.target.value)}
                className="bg-slate-50 border border-slate-250 hover:bg-slate-100 focus:ring-2 focus:ring-blue-150 text-slate-800 text-[11px] font-black uppercase tracking-wider rounded-xl px-3 py-1.5 cursor-pointer shadow-sm outline-none transition-all"
              >
                {OFFICES_CONFIG.map(office => (
                  <option key={office.id} value={office.id}>
                    {office.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Test Chime and Alerts quick bar */}
          <div className="flex items-center gap-2.5">
            <button
              id="btn-quick-sound-test"
              onClick={handleTestSpeaker}
              className="px-4 py-2.5 bg-[#122e70] hover:bg-blue-800 text-white text-xs font-bold transition-all flex items-center gap-2 rounded-xl border-none shadow-sm cursor-pointer uppercase tracking-wider font-sans"
            >
              <Volume2 className="w-4 h-4 text-amber-400" />
              <span>Timbre de Prueba</span>
            </button>
            
            <div className="w-[1px] h-6 bg-slate-200 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl font-mono text-[9px] text-slate-705 font-bold uppercase tracking-widest shadow-inner">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span className="text-emerald-700">Estado: En Línea</span>
            </div>
          </div>
        </div>

        {/* VIEWPORT CONTROLLER TABS */}
        <div className="flex flex-wrap items-center justify-start gap-2.5 border-b border-slate-200/60 pb-3">
          <button
            id="tab-view-citas"
            onClick={() => setActiveTab("citas")}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-2xl transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "citas"
                ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white border-transparent shadow-md shadow-amber-900/10"
                : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 shadow-sm"
            }`}
          >
            <CalendarCheck2 className="w-4 h-4 text-amber-600 group-hover:text-amber-800" />
            <span>Agendamiento Citas (CitasTE)</span>
          </button>

          <button
            id="tab-view-kiosk"
            onClick={() => setActiveTab("kiosk")}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-2xl transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "kiosk"
                ? "bg-gradient-to-r from-[#003087] to-[#122e70] text-white border-transparent shadow-md shadow-blue-900/10 premium-glow-blue"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
            }`}
          >
            <Printer className="w-4 h-4 text-amber-500" />
            <span>Kiosko de Turnos (Clientes)</span>
          </button>

          <button
            id="tab-view-tv"
            onClick={() => setActiveTab("tv")}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-2xl transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "tv"
                ? "bg-gradient-to-r from-[#003087] to-[#122e70] text-white border-transparent shadow-md shadow-blue-900/10 premium-glow-blue"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
            }`}
          >
            <Tv className="w-4 h-4 text-sky-500" />
            <span>TV de Sala (Público)</span>
          </button>

          <button
            id="tab-view-agent"
            onClick={() => setActiveTab("agent")}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-2xl transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "agent"
                ? "bg-gradient-to-r from-[#003087] to-[#122e70] text-white border-transparent shadow-md shadow-blue-900/10 premium-glow-blue"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-500" />
            <span>Consola del Agente</span>
          </button>

          <button
            id="tab-view-tracker"
            onClick={() => setActiveTab("tracker")}
            className={`px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-2xl transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "tracker"
                ? "bg-gradient-to-r from-cyan-700 to-[#122e70] text-white border-transparent shadow-md shadow-cyan-900/10"
                : "bg-cyan-50 text-cyan-900 border-cyan-200 hover:bg-cyan-100 shadow-sm"
            }`}
          >
            <Smartphone className="w-4 h-4 text-cyan-600" />
            <span>Seguimiento Móvil</span>
          </button>

          <button
            id="tab-view-admin"
            onClick={() => {
              if (isAdminAuthenticated) {
                setActiveTab("admin");
              } else {
                setPendingAuthTab("admin");
                setAdminPasswordInput("");
                setAdminPasswordError(false);
                setIsAdminLoginModalOpen(true);
              }
            }}
            className={`px-4.5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-xl transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "admin"
                ? "bg-[#122e70] text-white border-transparent shadow shadow-blue-150"
                : "bg-white text-slate-650 border-slate-205 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Administración</span>
            {isAdminAuthenticated ? (
              <Unlock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-slate-450 shrink-0 animate-pulse" />
            )}
          </button>

          <button
            id="tab-view-super-admin"
            onClick={() => {
              if (isAdminAuthenticated) {
                setActiveTab("super-admin");
              } else {
                setPendingAuthTab("super-admin");
                setAdminPasswordInput("");
                setAdminPasswordError(false);
                setIsAdminLoginModalOpen(true);
              }
            }}
            className={`px-4.5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-xl transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "super-admin"
                ? "bg-rose-700 text-white border-transparent shadow shadow-red-100"
                : "bg-white text-rose-750 border-rose-200 hover:bg-rose-50 hover:text-rose-900"
            }`}
          >
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>Super Administrador</span>
            {isAdminAuthenticated ? (
              <Unlock className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
            ) : (
              <Lock className="w-3.5 h-3.5 text-rose-400 shrink-0 animate-pulse" />
            )}
          </button>

          {/* Quick link to Hide Menu/Option Tabs */}
          <button
            id="btn-hide-navigation-menu"
            onClick={() => setIsHeaderHidden(true)}
            className="md:ml-auto px-4.5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-xl transition-all whitespace-nowrap cursor-pointer border bg-slate-200 hover:bg-amber-500 hover:text-white text-slate-705 border-transparent shadow-sm"
            title="Oculta esta barra de navegación superior. Ideal para dedicar este dispositivo exclusivamente como Kiosko o Pantalla TV."
          >
            <EyeOff className="w-4 h-4" />
            <span>Ocultar Menú (Modo Dedicado)</span>
          </button>
        </div>
      </header>
      )}

      {/* MAIN RENDER AREA WITH ADAPTIVE SIMULATED FRAMES */}
      <div className={viewType === "tablet" ? "max-w-[1024px] mx-auto w-full border-[14px] border-slate-950 rounded-[40px] shadow-2xl bg-white p-4 md:p-6 transition-all duration-300 relative my-6 shrink-0" : "w-full flex-grow flex flex-col"}>
        {viewType === "tablet" && (
          <>
            {/* Tablet Camera cutout */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-slate-950 opacity-90 z-20" />
            {/* Volume buttons simulator */}
            <div className="absolute -left-[14px] top-20 w-1 h-8 bg-slate-950 rounded-l-md" />
            <div className="absolute -left-[14px] top-32 w-1 h-8 bg-slate-950 rounded-l-md" />
          </>
        )}
        
        <main className={
          viewType === "tablet" 
            ? "w-full flex-grow transition-all duration-300" 
            : activeTab === "citas"
              ? "w-full max-w-none px-0 sm:px-2 flex-grow transition-all duration-300 pt-0"
              : `max-w-[1650px] 2xl:max-w-[95%] mx-auto w-full px-4 md:px-8 flex-grow transition-all duration-300 ${isHeaderHidden ? "pt-8" : ""}`
        }>
        {/* INDIVIDUAL MAXIMIZED VIEWPORTS */}
        {activeTab === "citas" && (
          <div className="w-full py-0">
            <CitasApp onCreateTicket={createTicket} onNavigateToTurnos={() => setActiveTab("kiosk")} />
          </div>
        )}

        {activeTab === "kiosk" && (
          <div className="w-full py-4">
            <WelcomeKiosk 
              onCreateTicket={createTicket} 
              currentOfficeId={currentOfficeId} 
              gatewaySelection={gatewaySelection} 
              onNavigateToCitas={() => setActiveTab("citas")}
              onNavigateToTracker={(code) => {
                if (code) setTrackingTicketCode(code);
                setActiveTab("tracker");
              }}
            />
          </div>
        )}

        {activeTab === "tracker" && (
          <div className="w-full py-4">
            <TicketTracker
              tickets={tickets}
              cubicles={cubicles}
              initialTicketCode={trackingTicketCode}
              currentOfficeId={currentOfficeId}
              onNavigateToKiosk={() => setActiveTab("kiosk")}
            />
          </div>
        )}

        {activeTab === "tv" && (
          <div className="w-full py-4">
            <MainScreen
              tickets={tickets}
              cubicles={cubicles}
              activeCall={activeCall}
              onClearActiveCall={() => setActiveCall(null)}
              onTestSpeaker={handleTestSpeaker}
              currentOfficeId={currentOfficeId}
              gatewaySelection={gatewaySelection}
              supabaseSyncStatus={supabaseSyncStatus}
            />
          </div>
        )}

        {activeTab === "agent" && (
          <div className="w-full py-4">
            <AgentConsole
              tickets={tickets}
              cubicles={cubicles}
              onCallNext={callNextTicket}
              onStartAttending={startAttendingTicket}
              onComplete={completeTicket}
              onTransferToCajaRC={transferTicketToCajaRC}
              onMiss={markTicketAsMissed}
              onRecall={recallCurrentTicket}
              onChangeStatus={changeCubicleStatus}
              onUpdateCubicleConfig={updateCubicleConfig}
              currentOfficeId={currentOfficeId}
              users={users}
              currentActiveUserId={currentActiveUserId}
              setCurrentActiveUserId={setCurrentActiveUserId}
              gatewaySelection={gatewaySelection}
            />
          </div>
        )}

        {activeTab === "admin" && (
          <div className="w-full py-4">
            {isAdminAuthenticated ? (
              <ControlDashboard
                tickets={tickets}
                cubicles={cubicles}
                isSimulationActive={isSimulationActive}
                onToggleSimulation={setIsSimulationActive}
                simulationSpeed={simulationSpeed}
                onSetSimulationSpeed={setSimulationSpeed}
                onCreateRandomTicket={handleCreateRandomTicket}
                onResetSystem={resetSystem}
                isAutoAssignActive={isAutoAssignActive}
                onToggleAutoAssign={setIsAutoAssignActive}
                onPurgeOldTickets={purgeOldTickets}
                currentOfficeId={currentOfficeId}
                gatewaySelection={gatewaySelection}
              />
            ) : (
              <div className="bg-white border-2 border-dashed border-slate-200 p-12 rounded-2xl flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto shadow-sm my-8">
                <div className="w-16 h-16 bg-red-50 text-red-650 rounded-full flex items-center justify-center border border-red-100">
                  <Lock className="w-8 h-8 text-red-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Acceso a Administración Bloqueado</h3>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    Usted no ha iniciado sesión de administración. Por favor introduzca la clave autorizada para abrir las herramientas de simulación, configuración y reinicio.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setAdminPasswordInput("");
                    setAdminPasswordError(false);
                    setIsAdminLoginModalOpen(true);
                  }}
                  className="px-6 py-3 bg-[#122e70] hover:bg-blue-800 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4 text-amber-400" />
                  <span>Desbloquear Administración</span>
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === "super-admin" && (
          <div className="w-full py-4">
            {isAdminAuthenticated ? (
              <SuperAdminConsole
                officeTickets={officeTickets}
                setOfficeTickets={setOfficeTickets}
                officeCubicles={officeCubicles}
                setOfficeCubicles={setOfficeCubicles}
                users={users}
                setUsers={setUsers}
                supabaseSyncStatus={supabaseSyncStatus}
                pullOfficeFromSupabase={pullOfficeFromSupabase}
                pushOfficeToSupabase={pushOfficeToSupabase}
                currentOfficeId={currentOfficeId}
                gatewaySelection={gatewaySelection}
              />
            ) : (
              <div className="bg-white border-2 border-dashed border-slate-200 p-12 rounded-2xl flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto shadow-sm my-8">
                <div className="w-16 h-16 bg-red-50 text-red-650 rounded-full flex items-center justify-center border border-red-100">
                  <Lock className="w-8 h-8 text-red-600" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">Acceso a Super Administrador Bloqueado</h3>
                  <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
                    Usted no ha iniciado sesión de super administración. Por favor introduzca la clave autorizada para abrir el panel de control unificado y clasificador de las 16 oficinas.
                  </p>
                </div>
                <button
                  onClick={() => {
                    setAdminPasswordInput("");
                    setAdminPasswordError(false);
                    setIsAdminLoginModalOpen(true);
                  }}
                  className="px-6 py-3 bg-[#122e70] hover:bg-blue-800 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
                >
                  <Unlock className="w-4 h-4 text-amber-400" />
                  <span>Desbloquear Super Administrador</span>
                </button>
              </div>
            )}
          </div>
        )}
       </main>
        
        {viewType === "tablet" && (
          /* Tablet Home Bar indicator */
          <div className="w-36 h-1 bg-slate-950 rounded-full mx-auto mt-5 opacity-35 shrink-0" />
        )}
      </div>

      {/* FOOTER BAR REMOVED */}
    </div>
  );
}
