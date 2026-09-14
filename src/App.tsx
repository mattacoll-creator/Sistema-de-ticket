/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { 
  Routes, 
  Route, 
  Navigate, 
  useNavigate, 
  useLocation, 
  useSearchParams, 
  useParams 
} from "react-router-dom";
import { useTicketSystem } from "./hooks/useTicketSystem";
import { ServiceType, SERVICES_CONFIG, OFFICES_CONFIG, UserRole, SystemUser, TicketStatus, TicketPhase, Ticket } from "./types";
import { announceAndCall } from "./utils/audio";
import { APP_BUILD_VERSION, STORAGE_VERSION_KEY } from "./version";

// Import custom pages from src/pages
import {
  HomePage,
  CitasPage,
  KioscoPage,
  SeguimientoPage,
  AgentePage,
  AdminPage,
  SuperAdminPage,
  TvScreenPage
} from "./pages";

import ExtranjeriaController from "./components/ExtranjeriaController";

import { 
  Tv, 
  Printer, 
  UserCheck, 
  Settings, 
  Sparkles, 
  Volume2, 
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
  Smartphone,
  Home 
} from "lucide-react";

// Helper component for backwards-compatibility redirection of tracked tickets
function TrackerRedirect() {
  const { ticketId } = useParams<{ ticketId?: string }>();
  const [searchParams] = useSearchParams();
  const query = searchParams.toString();
  return <Navigate to={`/seguimiento/${ticketId ? encodeURIComponent(ticketId) : ""}${query ? `?${query}` : ""}`} replace />;
}

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();

  // Determine current gateway based on path or state
  const isRegistroCivilPath = location.pathname.startsWith("/tv/registro-civil");
  const [gatewaySelection, setGatewaySelection] = useState<"select" | "cedulacion" | "registro_civil">(() => {
    if (location.pathname === "/") return "select";
    if (location.pathname.startsWith("/tv/registro-civil")) return "registro_civil";
    return "cedulacion";
  });

  // Sync gateway selection with route
  useEffect(() => {
    if (location.pathname === "/") {
      setGatewaySelection("select");
    } else if (location.pathname.startsWith("/tv/registro-civil")) {
      setGatewaySelection("registro_civil");
    } else {
      setGatewaySelection("cedulacion");
    }
  }, [location.pathname]);

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
    refreshTickets
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

  useEffect(() => {
    localStorage.setItem("system_users", JSON.stringify(users));
  }, [users]);

  // Sincronizar directorio de usuarios desde el backend / PostgreSQL al iniciar
  useEffect(() => {
    const fetchDBUsers = async () => {
      try {
        const token = sessionStorage.getItem('admin_token') || 'superadmin_token';
        const res = await fetch('/api/users', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && Array.isArray(data.users)) {
            const mappedUsers: SystemUser[] = data.users.map((u: any) => {
              let r = UserRole.AGENT_CAJA;
              const roleStr = String(u.role || '').toUpperCase();
              if (roleStr === 'SUPERADMIN' || roleStr === 'SUPER') r = UserRole.SUPERADMIN;
              else if (roleStr.includes('SUPERVISOR')) r = UserRole.SUPERVISOR;
              else if (roleStr.includes('TRIADA')) r = UserRole.AGENT_TRIADA;
              else if (roleStr.includes('CAJA')) r = UserRole.AGENT_CAJA;
              else if (roleStr.includes('REGISTRO')) r = UserRole.AGENT_REGISTRO_CIVIL;
              else if (roleStr.includes('EXTRANJERIA')) r = UserRole.GESTOR_EXTRANJERIA;
              else if (roleStr.includes('CITAS')) r = UserRole.GESTOR_CITAS;

              return {
                id: `usr_${u.username}`,
                username: u.username,
                fullName: u.nombre || u.username,
                role: r,
                officeId: u.sucursalId || u.sucursal_id || 'OFF-1',
                password: u.password,
                mustChangePassword: !!u.mustChangePassword
              };
            });

            if (mappedUsers.length > 0) {
              setUsers(prev => {
                const map = new Map<string, SystemUser>();
                mappedUsers.forEach(mu => map.set(mu.username.toLowerCase(), mu));
                prev.forEach(pu => {
                  if (!map.has(pu.username.toLowerCase())) {
                    map.set(pu.username.toLowerCase(), pu);
                  }
                });
                return Array.from(map.values());
              });
            }
          }
        }
      } catch (err) {
        // Silencioso si no hay conexión
      }
    };
    fetchDBUsers();
  }, []);

  useEffect(() => {
    localStorage.setItem("current_active_user_id", currentActiveUserId);
    const targetUser = users.find(u => u.id === currentActiveUserId);
    if (targetUser && targetUser.officeId) {
      setCurrentOfficeId(prev => prev !== targetUser.officeId ? targetUser.officeId : prev);
    }
  }, [currentActiveUserId, users, setCurrentOfficeId]);

  // Synchronize ?office=OFF-X parameter with currentOfficeId
  useEffect(() => {
    const officeParam = searchParams.get("office") || searchParams.get("sede") || searchParams.get("oficina");
    if (officeParam) {
      const foundOffice = OFFICES_CONFIG.find(
        o => o.id.toLowerCase() === officeParam.toLowerCase() || o.name.toLowerCase().includes(officeParam.toLowerCase())
      );
      if (foundOffice && foundOffice.id !== currentOfficeId) {
        setCurrentOfficeId(foundOffice.id);
      }
    }
  }, [searchParams, currentOfficeId, setCurrentOfficeId]);

  // Backward compatibility: handle legacy query params when loading root "/"
  useEffect(() => {
    if (typeof window === "undefined") return;

    // 1. Verificación de Versión de Compilación y Limpieza de Caché Automática
    try {
      const installedVersion = localStorage.getItem(STORAGE_VERSION_KEY);
      if (installedVersion !== APP_BUILD_VERSION) {
        console.log(`[Version Sync] Nueva versión instalada (${installedVersion} -> ${APP_BUILD_VERSION}). Limpiando cachés...`);
        if ("caches" in window) {
          caches.keys().then((names) => {
            names.forEach((name) => caches.delete(name));
          }).catch(() => {});
        }
        sessionStorage.clear();
        localStorage.setItem(STORAGE_VERSION_KEY, APP_BUILD_VERSION);
      }
    } catch (e) {
      console.warn("Error en sincronización de versión:", e);
    }

    if (location.pathname === "/") {
      const params = new URLSearchParams(location.search);
      const viewParam = params.get("view") || params.get("tab") || params.get("screen");
      const channelParam = (params.get("channel") || params.get("fase") || params.get("pantalla") || "").toLowerCase();
      const gatewayParam = (params.get("gateway") || "").toLowerCase();
      const ticketParam = params.get("ticket");
      const officeParam = params.get("office");
      const officeQuery = officeParam ? `?office=${encodeURIComponent(officeParam)}` : "";

      if (ticketParam) {
        navigate(`/seguimiento/${encodeURIComponent(ticketParam.trim().toUpperCase())}${officeQuery}`, { replace: true });
        return;
      }

      if (viewParam) {
        const v = viewParam.toLowerCase();
        if (v === "citas" || v === "cita" || v === "agendamiento") {
          navigate(`/citas${officeQuery}`, { replace: true });
        } else if (v === "kiosk" || v === "ticket" || v === "tickets" || v === "turnos" || v === "kiosco") {
          navigate(`/kiosco${officeQuery}`, { replace: true });
        } else if (v === "seguimiento" || v === "tracker" || v === "tracking" || v === "consultar" || v === "movil") {
          navigate(`/seguimiento${officeQuery}`, { replace: true });
        } else if (v === "tv-caja" || v === "caja-tv" || (v === "tv" && (channelParam === "caja" || channelParam === "1"))) {
          navigate(`/tv/caja${officeQuery}`, { replace: true });
        } else if (v === "tv-triada" || v === "triada-tv" || (v === "tv" && (channelParam === "triada" || channelParam === "foto" || channelParam === "2"))) {
          navigate(`/tv/triada${officeQuery}`, { replace: true });
        } else if (v === "tv-extranjeria" || v === "extranjeria-tv" || (v === "tv" && (channelParam === "extranjeria" || channelParam === "extranjería" || channelParam === "e"))) {
          navigate(`/tv/extranjeria${officeQuery}`, { replace: true });
        } else if (v === "tv-rc" || (v === "tv" && (gatewayParam.includes("registro") || gatewayParam === "rc"))) {
          if (channelParam === "or") navigate(`/tv/registro-civil/or${officeQuery}`, { replace: true });
          else if (channelParam === "ohv") navigate(`/tv/registro-civil/ohv${officeQuery}`, { replace: true });
          else navigate(`/tv/registro-civil${officeQuery}`, { replace: true });
        } else if (v === "tv" || v === "monitor" || v === "sala") {
          if (channelParam === "or") navigate(`/tv/registro-civil/or${officeQuery}`, { replace: true });
          else if (channelParam === "ohv") navigate(`/tv/registro-civil/ohv${officeQuery}`, { replace: true });
          else if (channelParam === "caja") navigate(`/tv/caja${officeQuery}`, { replace: true });
          else if (channelParam === "triada") navigate(`/tv/triada${officeQuery}`, { replace: true });
          else if (channelParam === "extranjeria" || channelParam === "extranjería") navigate(`/tv/extranjeria${officeQuery}`, { replace: true });
          else navigate(`/tv/general${officeQuery}`, { replace: true });
        } else if (v === "agent" || v === "agente" || v === "ventanilla") {
          navigate(`/agente${officeQuery}`, { replace: true });
        } else if (v === "admin") {
          navigate(`/admin${officeQuery}`, { replace: true });
        } else if (v === "super-admin" || v === "superadmin") {
          navigate(`/super-admin${officeQuery}`, { replace: true });
        }
      }
    }
  }, [location.pathname, location.search, navigate]);

  // Direct Links Modal state
  const [isDirectLinksModalOpen, setIsDirectLinksModalOpen] = useState<boolean>(false);
  const [copiedDirectKey, setCopiedDirectKey] = useState<string | null>(null);

  const handleCopyDirectLink = (path: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (typeof window === "undefined") return;
    const origin = window.location.origin;
    const officeQuery = (currentOfficeId && currentOfficeId !== "OFF-1") ? `?office=${encodeURIComponent(currentOfficeId)}` : "";
    const fullUrl = `${origin}${path}${officeQuery}`;
    navigator.clipboard.writeText(fullUrl);
    setCopiedDirectKey(path);
    setTimeout(() => {
      setCopiedDirectKey(null);
    }, 2000);
  };

  const navigatePreservingOffice = (path: string) => {
    const officeQuery = (currentOfficeId && currentOfficeId !== "OFF-1") ? `?office=${encodeURIComponent(currentOfficeId)}` : "";
    navigate(`${path}${officeQuery}`);
  };

  // Administration Authentication states (password: Admin12345)
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState<boolean>(false);
  const [isAdminLoginModalOpen, setIsAdminLoginModalOpen] = useState<boolean>(false);
  const [adminPasswordInput, setAdminPasswordInput] = useState<string>("" );
  const [adminPasswordError, setAdminPasswordError] = useState<boolean>(false);
  const [pendingAuthPath, setPendingAuthPath] = useState<string>("/admin");

  const handleVerifyAdminPassword = () => {
    if (adminPasswordInput === "Admin12345") {
      setIsAdminAuthenticated(true);
      setIsAdminLoginModalOpen(false);
      setAdminPasswordInput("");
      setAdminPasswordError(false);
      navigatePreservingOffice(pendingAuthPath);
    } else {
      setAdminPasswordError(true);
    }
  };

  const handleTriggerAdminLogin = (targetPath: string) => {
    if (isAdminAuthenticated) {
      navigatePreservingOffice(targetPath);
    } else {
      setPendingAuthPath(targetPath);
      setAdminPasswordInput("");
      setAdminPasswordError(false);
      setIsAdminLoginModalOpen(true);
    }
  };

  // Viewport adaptive display mode: "desktop" | "tablet"
  const [viewType, setViewType] = useState<"desktop" | "tablet">("desktop");
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  useEffect(() => {
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
      }
    } else {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.warn("Error saliendo de pantalla completa", err);
      }
    }
  };

  // Navigation menu hidden mode for dedicated device screen focus (Kiosk / TV screen lock / Dedicated Agent Mode)
  const [isHeaderHidden, setIsHeaderHidden] = useState<boolean>(() => {
    return typeof window !== "undefined" && (window.location.pathname.startsWith("/agente") || window.location.pathname.startsWith("/tv/extranjeria"));
  });
  const [isPinModalOpen, setIsPinModalOpen] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>("");
  const [pinError, setPinError] = useState<boolean>(false);

  // Automatically activate dedicated mode when entering /agente or /tv/extranjeria route
  useEffect(() => {
    if (location.pathname.startsWith("/agente") || location.pathname.startsWith("/tv/extranjeria")) {
      setIsHeaderHidden(true);
    }
  }, [location.pathname]);

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

  // Speaker Test trigger
  const handleTestSpeaker = async () => {
    try {
      const firstWaiting = tickets.find(t => t.status === TicketStatus.WAITING);
      const testName = firstWaiting ? firstWaiting.name : "Emmanuel Lobo";
      const testCode = firstWaiting ? firstWaiting.numberCode : "C-001";
      const testDest = firstWaiting && firstWaiting.currentPhase === TicketPhase.TRIADA ? "Módulo 10" : "Caja 1";
      await announceAndCall(testCode, testName, testDest, 2);
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
    const randomPriority = Math.random() < 0.25;

    createTicket(randomName, randomService, randomPriority);
  };

  const handleOfficeChange = (newOfficeId: string) => {
    setCurrentOfficeId(newOfficeId);
    const search = new URLSearchParams(location.search);
    if (newOfficeId && newOfficeId !== "OFF-1") {
      search.set("office", newOfficeId);
    } else {
      search.delete("office");
    }
    const query = search.toString();
    navigate(`${location.pathname}${query ? `?${query}` : ""}`, { replace: true });
  };

  // Helper to determine active tab based on path
  const currentPath = location.pathname;
  const isCitasRoute = currentPath.startsWith("/citas");
  const isKioscoRoute = currentPath === "/kiosco" || currentPath === "/kiosco/";
  const isTrackerRoute = currentPath.startsWith("/seguimiento");
  const isTvRoute = currentPath.startsWith("/tv");
  const isAgentRoute = currentPath === "/agente" || currentPath === "/agente/";
  const isAdminRoute = currentPath === "/admin" || currentPath === "/admin/";
  const isSuperAdminRoute = currentPath === "/super-admin" || currentPath === "/super-admin/";
  const isGatewayRoot = currentPath === "/" || currentPath === "";

  // Dedicated full screen for Portal Unificado (Gateway)
  if (isGatewayRoot) {
    return (
      <HomePage 
        onSelectOption={(option) => {
          setGatewaySelection(option);
          navigatePreservingOffice("/kiosco");
        }} 
        onSelectCitas={() => {
          setGatewaySelection("cedulacion");
          navigatePreservingOffice("/citas");
        }} 
        onSelectView={(viewKey) => {
          setGatewaySelection("cedulacion");
          if (viewKey === "tracker" || viewKey === "seguimiento") {
            navigatePreservingOffice("/seguimiento");
          } else {
            navigatePreservingOffice(`/${viewKey}`);
          }
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
                    Enlaces Directos del Sistema (Rutas Limpias)
                  </h3>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Copie los enlaces o navegue directamente a cualquier módulo sin parámetros confusos.
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

            <div className="space-y-4 max-h-[65vh] overflow-y-auto pr-1">
              {/* SECCIÓN 1: PANTALLAS DE TELEVISIÓN / SMART TV */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 px-1 pt-1 pb-0.5">
                  <span className="text-[11px] font-black text-[#003087] uppercase tracking-wider flex items-center gap-1.5">
                    <Tv className="w-3.5 h-3.5 text-[#0081f9]" />
                    <span>1. URLs Directos para Pantallas de TV / Monitores de Sala</span>
                  </span>
                </div>

                {[
                  {
                    path: "/tv/general",
                    name: "📺 TV Multicanal General (Cedulación)",
                    desc: "Muestra y anuncia todos los turnos del flujo general sin restricción de fase",
                    badge: "MULTICANAL",
                    badgeColor: "bg-purple-100 text-purple-900 border-purple-300"
                  },
                  {
                    path: "/tv/caja",
                    name: "📺 TV Sala 1: Solo Cajas (Cobro y Pagos)",
                    desc: "Filtra y llama por voz únicamente a las ventanillas de Caja (ideal para el TV de cajas)",
                    badge: "TV CAJA",
                    badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300"
                  },
                  {
                    path: "/tv/triada",
                    name: "📺 TV Sala 2: Solo Tríada y Fotografía",
                    desc: "Filtra y llama por voz únicamente a los módulos de Tríada / Biometría (ideal para la sala de espera)",
                    badge: "TV TRÍADA",
                    badgeColor: "bg-blue-100 text-blue-900 border-blue-300"
                  },
                  {
                    path: "/tv/extranjeria",
                    name: "📺 TV Sala 3: Pantalla de Extranjería",
                    desc: "Muestra y anuncia por voz exclusivamente los turnos del flujo de Extranjería",
                    badge: "TV EXTRANJERÍA",
                    badgeColor: "bg-rose-100 text-rose-900 border-rose-300"
                  }
                ].map((item) => {
                  const isCopied = copiedDirectKey === item.path;

                  return (
                    <div 
                      key={item.path}
                      className="p-3 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 hover:border-[#0081f9]/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <span className="text-xs font-black text-slate-900">{item.name}</span>
                          <span className={`text-[8.5px] font-black uppercase px-2 py-0.5 rounded-full border ${item.badgeColor}`}>
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-[9.5px] text-slate-500 font-medium leading-tight">{item.desc}</p>
                        <p className="text-[9px] font-mono font-bold text-slate-600 truncate">{item.path}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => {
                            setIsDirectLinksModalOpen(false);
                            navigatePreservingOffice(item.path);
                          }}
                          className="py-1 px-2.5 bg-[#122e70] hover:bg-blue-800 text-white text-[9.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                          title="Abrir en esta misma pantalla"
                        >
                          <ExternalLink className="w-3 h-3 text-amber-400" />
                          <span>Abrir</span>
                        </button>

                        <button
                          onClick={(e) => handleCopyDirectLink(item.path, e)}
                          className={`py-1 px-2.5 text-[9.5px] font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
                            isCopied 
                              ? "bg-emerald-600 text-white border-emerald-600" 
                              : "bg-white hover:bg-slate-100 text-slate-700 border-slate-300"
                          }`}
                          title="Copiar URL completa al portapapeles"
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

              {/* SECCIÓN 2: ATENCIÓN CIUDADANA Y KIOSCOS */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2 px-1 pt-1 pb-0.5">
                  <span className="text-[11px] font-black text-[#003087] uppercase tracking-wider flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-[#0081f9]" />
                    <span>2. Módulos Ciudadanos y Kioscos</span>
                  </span>
                </div>

                {[
                  {
                    path: "/",
                    name: "🌐 Portal Unificado Inicial",
                    desc: "Página principal con selección entre Cédula, CitasTE y Registro Civil"
                  },
                  {
                    path: "/citas",
                    name: "📅 Agendamiento de Citas Web (CitasTE)",
                    desc: "Portal público para reserva y confirmación de citas en línea"
                  },
                  {
                    path: "/citas/extranjeria/ext_primera_vez",
                    name: "📝 Formulario de Extranjería: Primera Vez",
                    desc: "Enlace directo para solicitar carné de residente permanente por primera vez"
                  },
                  {
                    path: "/citas/extranjeria/ced_extranjero_renovacion",
                    name: "📝 Formulario de Extranjería: Renovación",
                    desc: "Enlace directo para renovar carné de residente permanente de extranjero"
                  },
                  {
                    path: "/citas/extranjeria/ced_extranjero_duplicado_perdida",
                    name: "📝 Formulario de Extranjería: Duplicado",
                    desc: "Enlace directo para solicitar duplicado de carné de residente permanente"
                  },
                  {
                    path: "/citas/cedulacion/ced_pasados_edad",
                    name: "📝 Formulario de Pasados de Edad (20 años+)",
                    desc: "Enlace directo para Cédula por primera vez con edad de 20 años y 1 día en adelante"
                  },
                  {
                    path: "/kiosco",
                    name: "🎟️ Kiosco Presencial de Turnos",
                    desc: "Pantalla táctil de autoservicio para emisión de tiquetes en sede"
                  },
                  {
                    path: "/seguimiento",
                    name: "📱 Seguimiento Móvil de Turnos",
                    desc: "Consulta en vivo para celulares con campanilla y alerta vibratoria"
                  },
                  {
                    path: "/seguimiento/C-01",
                    name: "📱 Seguimiento de Ticket Específico (Ej: C-01)",
                    desc: "Acceso directo parametrizado a un ticket específico"
                  }
                ].map((item) => {
                  const isCopied = copiedDirectKey === item.path;

                  return (
                    <div 
                      key={item.path}
                      className="p-3 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 hover:border-[#0081f9]/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">{item.name}</span>
                          <span className="text-[8.5px] font-mono text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                            {item.path}
                          </span>
                        </div>
                        <p className="text-[9.5px] text-slate-500 font-medium leading-tight">{item.desc}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => {
                            setIsDirectLinksModalOpen(false);
                            navigatePreservingOffice(item.path);
                          }}
                          className="py-1 px-2.5 bg-[#122e70] hover:bg-blue-800 text-white text-[9.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <ExternalLink className="w-3 h-3 text-amber-400" />
                          <span>Abrir</span>
                        </button>

                        <button
                          onClick={(e) => handleCopyDirectLink(item.path, e)}
                          className={`py-1 px-2.5 text-[9.5px] font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
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

              {/* SECCIÓN 3: CONSOLA Y ADMINISTRACIÓN */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <div className="flex items-center gap-2 px-1 pt-1 pb-0.5">
                  <span className="text-[11px] font-black text-[#003087] uppercase tracking-wider flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-[#0081f9]" />
                    <span>3. Operación y Gestión Interna</span>
                  </span>
                </div>

                {[
                  {
                    path: "/agente",
                    name: "👨‍💻 Portal del Agente (Turnos y Citas)",
                    desc: "Consola unificada para atención en ventanillas (Caja / Tríada) y administración de citas"
                  },
                  {
                    path: "/agente?tab=citas",
                    name: "📅 Panel de Administración de Citas",
                    desc: "Control de agendas, Extranjería, Cédula Tardía, validaciones y reportes"
                  },
                  {
                    path: "/admin",
                    name: "📊 Panel de Control y Métricas",
                    desc: "Dashboard supervisor en tiempo real para tiempos de espera y rendimiento"
                  },
                  {
                    path: "/super-admin",
                    name: "🛡️ Super Administrador",
                    desc: "Gestión global de usuarios, roles, sedes y configuración del sistema"
                  }
                ].map((item) => {
                  const isCopied = copiedDirectKey === item.path;

                  return (
                    <div 
                      key={item.path}
                      className="p-3 bg-slate-50 hover:bg-blue-50/40 border border-slate-200 hover:border-[#0081f9]/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 transition-all"
                    >
                      <div className="space-y-0.5 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black text-slate-900">{item.name}</span>
                          <span className="text-[8.5px] font-mono text-slate-500 font-bold bg-white px-2 py-0.5 rounded border border-slate-200">
                            {item.path}
                          </span>
                        </div>
                        <p className="text-[9.5px] text-slate-500 font-medium leading-tight">{item.desc}</p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          onClick={() => {
                            setIsDirectLinksModalOpen(false);
                            if (item.path === "/admin" || item.path === "/super-admin") {
                              handleTriggerAdminLogin(item.path);
                            } else {
                              navigatePreservingOffice(item.path);
                            }
                          }}
                          className="py-1 px-2.5 bg-[#122e70] hover:bg-blue-800 text-white text-[9.5px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                        >
                          <ExternalLink className="w-3 h-3 text-amber-400" />
                          <span>Abrir</span>
                        </button>

                        <button
                          onClick={(e) => handleCopyDirectLink(item.path, e)}
                          className={`py-1 px-2.5 text-[9.5px] font-black uppercase tracking-wider rounded-xl border transition-all cursor-pointer flex items-center gap-1 ${
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
      {!isHeaderHidden && !isCitasRoute && (
        <div className="w-full h-1 flex select-none shrink-0 relative z-35 shadow-sm">
          <div className="bg-[#da121a] flex-1"></div>
          <div className="bg-[#003087] flex-1"></div>
        </div>
      )}

      {/* MASTER SIMULATOR & COMPATIBILITY BAR */}
      {!isCitasRoute && !isHeaderHidden && (
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
                onClick={() => navigatePreservingOffice("/")}
                className="ml-1.5 px-2.5 py-1 bg-white/10 hover:bg-white/20 hover:text-white border border-white/25 hover:border-white/50 text-blue-100 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer active:scale-95"
                title="Volver a la selección inicial"
              >
                Portal Unificado
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
      {!isHeaderHidden && !isCitasRoute && (
        <header className="max-w-7xl mx-auto w-full px-4 md:px-8 pt-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          
          <div className="flex flex-col md:flex-row md:items-center gap-4 pl-1">
            <img 
              src="/images/agendate-logo-1.png" 
              referrerPolicy="no-referrer" 
              alt="Tribunal Electoral de Panamá" 
              className="h-14 md:h-16 w-auto object-contain self-start md:self-center cursor-pointer"
              onClick={() => navigatePreservingOffice("/")}
            />
            <div className="h-6 w-[1px] bg-slate-250 hidden md:block" />
            <div className="flex flex-col">
              <label htmlFor="office-select" className="text-[9px] uppercase tracking-wider font-extrabold text-slate-400 mb-0.5">
                Sede / Oficina Regional Activa
              </label>
              <select
                id="office-select"
                value={currentOfficeId}
                onChange={(e) => handleOfficeChange(e.target.value)}
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

        {/* VIEWPORT CONTROLLER TABS (ROUTED LINKS) - ROLE & VIEW ISOLATION */}
        <div className="flex flex-wrap items-center justify-start gap-2 border-b border-slate-200/60 pb-3">
          {/* BOTÓN 0: Menú Principal / Inicio */}
          <button
            id="tab-view-home"
            onClick={() => navigatePreservingOffice("/")}
            className="px-3.5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 rounded-2xl bg-white text-slate-700 border border-slate-200 hover:bg-slate-100 hover:text-slate-950 shadow-sm transition-all cursor-pointer shrink-0"
            title="Volver al Portal Principal / Menú de Módulos"
          >
            <Home className="w-4 h-4 text-[#003087]" />
            <span>Inicio</span>
          </button>

          {/* BOTÓN 1: Módulo Kiosko */}
          {(isKioscoRoute || isAdminRoute || isSuperAdminRoute) && (
            <button
              id="tab-view-kiosk"
              onClick={() => navigatePreservingOffice("/kiosco")}
              className={`px-4.5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-2xl transition-all whitespace-nowrap cursor-pointer border ${
                isKioscoRoute
                  ? "bg-gradient-to-r from-[#003087] to-[#122e70] text-white border-transparent shadow-md shadow-blue-900/10 premium-glow-blue"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
              }`}
            >
              <Printer className="w-4 h-4 text-amber-500" />
              <span>Kiosko de Turnos</span>
            </button>
          )}

          {/* BOTÓN 2: Agendamiento CitasTE */}
          {(isCitasRoute || isAdminRoute || isSuperAdminRoute) && (
            <button
              id="tab-view-citas"
              onClick={() => navigatePreservingOffice("/citas")}
              className={`px-4.5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-2xl transition-all whitespace-nowrap cursor-pointer border ${
                isCitasRoute
                  ? "bg-gradient-to-r from-amber-600 to-amber-700 text-white border-transparent shadow-md shadow-amber-900/10"
                  : "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 shadow-sm"
              }`}
            >
              <CalendarCheck2 className="w-4 h-4 text-amber-600 group-hover:text-amber-800" />
              <span>Agendamiento Citas (CitasTE)</span>
            </button>
          )}

          {/* BOTÓN 3: Seguimiento Móvil / Tracker */}
          {(isTrackerRoute || isAdminRoute || isSuperAdminRoute) && (
            <button
              id="tab-view-tracker"
              onClick={() => navigatePreservingOffice("/seguimiento")}
              className={`px-4.5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-2xl transition-all whitespace-nowrap cursor-pointer border ${
                isTrackerRoute
                  ? "bg-gradient-to-r from-[#003087] to-[#122e70] text-white border-transparent shadow-md shadow-blue-900/10 premium-glow-blue"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
              }`}
            >
              <Smartphone className="w-4 h-4 text-cyan-500" />
              <span>Seguimiento Móvil</span>
            </button>
          )}

          {/* BOTONES 4: Pantallas TV de Sala */}
          {(isTvRoute || isKioscoRoute || isAgentRoute || isTrackerRoute || isAdminRoute || isSuperAdminRoute) && (
            <>
              {isTvRoute ? (
                <>
                  <button
                    id="tab-view-tv-general"
                    onClick={() => navigatePreservingOffice("/tv/general")}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-2xl transition-all whitespace-nowrap cursor-pointer border ${
                      currentPath === "/tv/general" || currentPath === "/tv"
                        ? "bg-gradient-to-r from-purple-800 to-indigo-900 text-white border-transparent shadow-md shadow-purple-900/20"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                    }`}
                  >
                    <Tv className="w-4 h-4 text-purple-400" />
                    <span>📺 TV Multicanal</span>
                  </button>

                  <button
                    id="tab-view-tv-caja"
                    onClick={() => navigatePreservingOffice("/tv/caja")}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-2xl transition-all whitespace-nowrap cursor-pointer border ${
                      currentPath === "/tv/caja"
                        ? "bg-gradient-to-r from-[#003087] to-[#122e70] text-white border-transparent shadow-md shadow-blue-900/20"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                    }`}
                  >
                    <Tv className="w-4 h-4 text-amber-400" />
                    <span>📺 TV 1: Sala de Caja</span>
                  </button>

                  <button
                    id="tab-view-tv-triada"
                    onClick={() => navigatePreservingOffice("/tv/triada")}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-2xl transition-all whitespace-nowrap cursor-pointer border ${
                      currentPath === "/tv/triada"
                        ? "bg-gradient-to-r from-[#003087] to-[#0056b3] text-white border-transparent shadow-md shadow-blue-900/20"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                    }`}
                  >
                    <Tv className="w-4 h-4 text-cyan-400" />
                    <span>📺 TV 2: Sala de Tríada / Foto</span>
                  </button>

                  <button
                    id="tab-view-tv-extranjeria"
                    onClick={() => navigatePreservingOffice("/tv/extranjeria")}
                    className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-2xl transition-all whitespace-nowrap cursor-pointer border ${
                      currentPath === "/tv/extranjeria"
                        ? "bg-gradient-to-r from-rose-800 to-rose-950 text-white border-transparent shadow-md shadow-rose-900/20"
                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
                    }`}
                  >
                    <Tv className="w-4 h-4 text-rose-400" />
                    <span>📺 TV 3: Sala de Extranjería</span>
                  </button>
                </>
              ) : (
                <button
                  id="tab-view-tv-direct"
                  onClick={() => navigatePreservingOffice("/tv/general")}
                  className="px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 rounded-2xl bg-white text-slate-600 border border-slate-200 hover:bg-purple-50 hover:text-purple-900 hover:border-purple-200 shadow-sm transition-all whitespace-nowrap cursor-pointer"
                  title="Abrir Pantallas de TV / Monitores de Sala"
                >
                  <Tv className="w-4 h-4 text-purple-600" />
                  <span>Pantalla TV de Sala</span>
                </button>
              )}
            </>
          )}

          {/* BOTÓN 5: Consola del Agente */}
          {(isAgentRoute || isAdminRoute || isSuperAdminRoute) && (
            <button
              id="tab-view-agent"
              onClick={() => navigatePreservingOffice("/agente")}
              className={`px-4.5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-2xl transition-all whitespace-nowrap cursor-pointer border ${
                isAgentRoute
                  ? "bg-gradient-to-r from-[#003087] to-[#122e70] text-white border-transparent shadow-md shadow-blue-900/10 premium-glow-blue"
                  : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900 shadow-sm"
              }`}
            >
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>Consola del Agente</span>
            </button>
          )}

          {/* BOTÓN 6: Panel de Administración */}
          {(isAdminRoute || isSuperAdminRoute) && (
            <button
              id="tab-view-admin"
              onClick={() => handleTriggerAdminLogin("/admin")}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-xl transition-all whitespace-nowrap cursor-pointer border ${
                isAdminRoute
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
          )}

          {/* BOTÓN 7: Panel de Super Administrador */}
          {(isSuperAdminRoute || (isAdminRoute && isAdminAuthenticated)) && (
            <button
              id="tab-view-super-admin"
              onClick={() => handleTriggerAdminLogin("/super-admin")}
              className={`px-4 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-xl transition-all whitespace-nowrap cursor-pointer border ${
                isSuperAdminRoute
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
          )}
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
            : isCitasRoute
              ? "w-full max-w-none px-0 sm:px-2 flex-grow transition-all duration-300 pt-0"
              : `max-w-[1650px] 2xl:max-w-[95%] mx-auto w-full px-4 md:px-8 flex-grow transition-all duration-300 ${isHeaderHidden ? "pt-8" : ""}`
        }>
          <Routes>
            {/* 1. PORTAL UNIFICADO / CITASTE / KIOSCOS / SEGUIMIENTO */}
            <Route 
              path="/" 
              element={
                <HomePage 
                  onSelectOption={(option) => {
                    setGatewaySelection(option);
                    navigatePreservingOffice("/kiosco");
                  }} 
                  onSelectCitas={() => {
                    setGatewaySelection("cedulacion");
                    navigatePreservingOffice("/citas");
                  }} 
                  onSelectView={(viewKey) => {
                    setGatewaySelection("cedulacion");
                    if (viewKey === "tracker" || viewKey === "seguimiento") {
                      navigatePreservingOffice("/seguimiento");
                    } else {
                      navigatePreservingOffice(`/${viewKey}`);
                    }
                  }}
                />
              } 
            />

            <Route 
              path="/citas" 
              element={
                <CitasPage 
                  onCreateTicket={createTicket} 
                  onNavigateToTurnos={() => navigatePreservingOffice("/kiosco")} 
                />
              } 
            />

            <Route 
              path="/citas/:category/:subService" 
              element={
                <CitasPage 
                  onCreateTicket={createTicket} 
                  onNavigateToTurnos={() => navigatePreservingOffice("/kiosco")} 
                />
              } 
            />

            <Route 
              path="/kiosco" 
              element={
                <KioscoPage 
                  onCreateTicket={createTicket} 
                  currentOfficeId={currentOfficeId} 
                  gatewaySelection={gatewaySelection} 
                  onNavigateToCitas={() => navigatePreservingOffice("/citas")}
                  onNavigateToTracker={(code) => {
                    if (code) navigatePreservingOffice(`/seguimiento/${encodeURIComponent(code)}`);
                    else navigatePreservingOffice("/seguimiento");
                  }}
                />
              } 
            />

            {/* Backwards compatibility aliases for kiosk */}
            <Route path="/kiosk" element={<Navigate to="/kiosco" replace />} />
            <Route path="/ticket" element={<Navigate to="/kiosco" replace />} />

            <Route 
              path="/seguimiento" 
              element={
                <SeguimientoPage
                  tickets={tickets}
                  cubicles={cubicles}
                  onNavigateToKiosk={() => navigatePreservingOffice("/kiosco")}
                  currentOfficeId={currentOfficeId}
                  officeTickets={officeTickets}
                  officeCubicles={officeCubicles}
                  onSelectOffice={(officeId) => {
                    handleOfficeChange(officeId);
                  }}
                />
              } 
            />

            <Route 
              path="/seguimiento/:ticketId" 
              element={
                <SeguimientoPage
                  tickets={tickets}
                  cubicles={cubicles}
                  onNavigateToKiosk={() => navigatePreservingOffice("/kiosco")}
                  currentOfficeId={currentOfficeId}
                  officeTickets={officeTickets}
                  officeCubicles={officeCubicles}
                  onSelectOffice={(officeId) => {
                    handleOfficeChange(officeId);
                  }}
                />
              } 
            />

            {/* Backwards compatibility aliases for tracker */}
            <Route path="/tracker" element={<Navigate to="/seguimiento" replace />} />
            <Route path="/tracker/:ticketId" element={<TrackerRedirect />} />

            {/* 2. PANTALLAS DE TV Y MONITORES */}
            <Route 
              path="/tv" 
              element={
                <TvScreenPage
                  tickets={tickets}
                  cubicles={cubicles}
                  activeCall={activeCall}
                  onClearActiveCall={() => setActiveCall(null)}
                  onTestSpeaker={handleTestSpeaker}
                  onRefresh={refreshTickets}
                  currentOfficeId={currentOfficeId}
                  gatewaySelection="cedulacion"
                  channel="general"
                />
              } 
            />

            <Route 
              path="/tv/general" 
              element={
                <TvScreenPage
                  tickets={tickets}
                  cubicles={cubicles}
                  activeCall={activeCall}
                  onClearActiveCall={() => setActiveCall(null)}
                  onTestSpeaker={handleTestSpeaker}
                  onRefresh={refreshTickets}
                  currentOfficeId={currentOfficeId}
                  gatewaySelection="cedulacion"
                  channel="general"
                />
              } 
            />

            <Route 
              path="/tv/caja" 
              element={
                <TvScreenPage
                  tickets={tickets}
                  cubicles={cubicles}
                  activeCall={activeCall}
                  onClearActiveCall={() => setActiveCall(null)}
                  onTestSpeaker={handleTestSpeaker}
                  onRefresh={refreshTickets}
                  currentOfficeId={currentOfficeId}
                  gatewaySelection="cedulacion"
                  channel={TicketPhase.CAJA}
                />
              } 
            />

            <Route 
              path="/tv/triada" 
              element={
                <TvScreenPage
                  tickets={tickets}
                  cubicles={cubicles}
                  activeCall={activeCall}
                  onClearActiveCall={() => setActiveCall(null)}
                  onTestSpeaker={handleTestSpeaker}
                  onRefresh={refreshTickets}
                  currentOfficeId={currentOfficeId}
                  gatewaySelection="cedulacion"
                  channel={TicketPhase.TRIADA}
                />
              } 
            />

            <Route 
              path="/tv/registro-civil" 
              element={
                <TvScreenPage
                  tickets={tickets}
                  cubicles={cubicles}
                  activeCall={activeCall}
                  onClearActiveCall={() => setActiveCall(null)}
                  onTestSpeaker={handleTestSpeaker}
                  onRefresh={refreshTickets}
                  currentOfficeId={currentOfficeId}
                  gatewaySelection="registro_civil"
                  channel="general"
                />
              } 
            />

            <Route 
              path="/tv/registro-civil/or" 
              element={
                <TvScreenPage
                  tickets={tickets}
                  cubicles={cubicles}
                  activeCall={activeCall}
                  onClearActiveCall={() => setActiveCall(null)}
                  onTestSpeaker={handleTestSpeaker}
                  onRefresh={refreshTickets}
                  currentOfficeId={currentOfficeId}
                  gatewaySelection="registro_civil"
                  channel="OR"
                />
              } 
            />

            <Route 
              path="/tv/registro-civil/ohv" 
              element={
                <TvScreenPage
                  tickets={tickets}
                  cubicles={cubicles}
                  activeCall={activeCall}
                  onClearActiveCall={() => setActiveCall(null)}
                  onTestSpeaker={handleTestSpeaker}
                  onRefresh={refreshTickets}
                  currentOfficeId={currentOfficeId}
                  gatewaySelection="registro_civil"
                  channel="OHV"
                />
              } 
            />

            <Route path="/extranjeria/pantalla" element={<Navigate to="/tv/extranjeria" replace />} />
            <Route path="/pantalla-extranjeria" element={<Navigate to="/tv/extranjeria" replace />} />
            <Route 
              path="/tv/extranjeria" 
              element={
                <div className="w-full flex-grow flex flex-col">
                  <ExtranjeriaController currentRole="super" forceSubRole="pantalla" />
                </div>
              } 
            />

            {/* 3. OPERACIÓN Y ADMINISTRACIÓN */}
            <Route 
              path="/agente" 
              element={
                <AgentePage
                  tickets={tickets}
                  cubicles={cubicles}
                  isAutoAssignActive={isAutoAssignActive}
                  onToggleAutoAssign={setIsAutoAssignActive}
                  onCallNext={callNextTicket}
                  onStartAttending={startAttendingTicket}
                  onComplete={completeTicket}
                  onTransferToCajaRC={transferTicketToCajaRC}
                  onMiss={markTicketAsMissed}
                  onRecall={recallCurrentTicket}
                  onChangeStatus={changeCubicleStatus}
                  onUpdateCubicleConfig={updateCubicleConfig}
                  onRefresh={refreshTickets}
                  onResetSystem={resetSystem}
                  currentOfficeId={currentOfficeId}
                  users={users}
                  currentActiveUserId={currentActiveUserId}
                  setCurrentActiveUserId={setCurrentActiveUserId}
                  gatewaySelection={gatewaySelection}
                />
              } 
            />

            <Route path="/agent" element={<Navigate to="/agente" replace />} />

            <Route 
              path="/admin" 
              element={
                <AdminPage
                  isAuthenticated={isAdminAuthenticated}
                  onOpenLoginModal={() => {
                    setPendingAuthPath("/admin");
                    setAdminPasswordInput("");
                    setAdminPasswordError(false);
                    setIsAdminLoginModalOpen(true);
                  }}
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
              } 
            />

            <Route 
              path="/super-admin" 
              element={
                <SuperAdminPage
                  isAuthenticated={isAdminAuthenticated}
                  onOpenLoginModal={() => {
                    setPendingAuthPath("/super-admin");
                    setAdminPasswordInput("");
                    setAdminPasswordError(false);
                    setIsAdminLoginModalOpen(true);
                  }}
                  officeTickets={officeTickets}
                  setOfficeTickets={setOfficeTickets}
                  officeCubicles={officeCubicles}
                  setOfficeCubicles={setOfficeCubicles}
                  users={users}
                  setUsers={setUsers}
                  currentOfficeId={currentOfficeId}
                  gatewaySelection={gatewaySelection}
                />
              } 
            />

            <Route path="/superadmin" element={<Navigate to="/super-admin" replace />} />

            {/* Fallback to home */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </main>
        
        {viewType === "tablet" && (
          /* Tablet Home Bar indicator */
          <div className="w-36 h-1 bg-slate-950 rounded-full mx-auto mt-5 opacity-35 shrink-0" />
        )}
      </div>
    </div>
  );
}
