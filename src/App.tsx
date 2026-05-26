/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useTicketSystem } from "./hooks/useTicketSystem";
import { ServiceType, SERVICES_CONFIG, OFFICES_CONFIG } from "./types";
import { playCallingChime, speakCall } from "./utils/audio";

// Import custom components
import WelcomeKiosk from "./components/WelcomeKiosk";
import MainScreen from "./components/MainScreen";
import AgentConsole from "./components/AgentConsole";
import ControlDashboard from "./components/ControlDashboard";
import SuperAdminConsole from "./components/SuperAdminConsole";

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
  Unlock
} from "lucide-react";

export default function App() {
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
  } = useTicketSystem();

  // Selected viewport tab: "kiosk" | "tv" | "agent" | "admin"
  const [activeTab, setActiveTab] = useState<string>("kiosk");

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
    } else {
      setAdminPasswordError(true);
    }
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

    const randomServices = [
      ServiceType.ELECTORAL,
      ServiceType.REGISTRO,
      ServiceType.CEDULACION,
      ServiceType.EXTRANJERIA
    ].filter(s => s !== ServiceType.EXTRANJERIA || currentOfficeId === "OFF-1");

    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const randomService = randomServices[Math.floor(Math.random() * randomServices.length)];
    const randomPriority = Math.random() < 0.25; // 25% priority

    createTicket(randomName, randomService, randomPriority);
  };

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

      {/* UPPER NATIONAL FLAG BAR */}
      {!isHeaderHidden && (
        <div className="w-full h-1.5 flex select-none shrink-0">
          <div className="bg-red-600 flex-1"></div>
          <div className="bg-[#122e70] flex-1"></div>
        </div>
      )}

      {/* HEADER SECTION */}
      {!isHeaderHidden && (
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
        <div className="flex flex-wrap items-center justify-start gap-2 border-b border-slate-200/50 pb-2.5">
          <button
            id="tab-view-kiosk"
            onClick={() => setActiveTab("kiosk")}
            className={`px-4.5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-xl transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "kiosk"
                ? "bg-[#122e70] text-white border-transparent shadow shadow-blue-150"
                : "bg-white text-slate-600 border-slate-205 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Kiosko de Turnos (Clientes)</span>
          </button>

          <button
            id="tab-view-tv"
            onClick={() => setActiveTab("tv")}
            className={`px-4.5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-xl transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "tv"
                ? "bg-[#122e70] text-white border-transparent shadow shadow-blue-150"
                : "bg-white text-slate-600 border-slate-205 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>TV de Sala (Público)</span>
          </button>

          <button
            id="tab-view-agent"
            onClick={() => setActiveTab("agent")}
            className={`px-4.5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-xl transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "agent"
                ? "bg-[#122e70] text-white border-transparent shadow shadow-blue-150"
                : "bg-white text-slate-600 border-slate-205 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Consola del Agente</span>
          </button>

          <button
            id="tab-view-admin"
            onClick={() => {
              if (isAdminAuthenticated) {
                setActiveTab("admin");
              } else {
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

      {/* MAIN RENDER AREA */}
      <main className={`max-w-[1650px] 2xl:max-w-[95%] mx-auto w-full px-4 md:px-8 flex-grow ${isHeaderHidden ? "pt-8" : ""}`}>
        {/* INDIVIDUAL MAXIMIZED VIEWPORTS */}
        {activeTab === "kiosk" && (
          <div className="w-full py-4">
            <WelcomeKiosk onCreateTicket={createTicket} currentOfficeId={currentOfficeId} />
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
              onMiss={markTicketAsMissed}
              onRecall={recallCurrentTicket}
              onChangeStatus={changeCubicleStatus}
              onUpdateCubicleConfig={updateCubicleConfig}
              currentOfficeId={currentOfficeId}
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
                officeTickets={officeTickets}
                setOfficeTickets={setOfficeTickets}
                officeCubicles={officeCubicles}
                setOfficeCubicles={setOfficeCubicles}
                supabaseSyncStatus={supabaseSyncStatus}
                pullOfficeFromSupabase={pullOfficeFromSupabase}
                pushOfficeToSupabase={pushOfficeToSupabase}
                currentOfficeId={currentOfficeId}
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

      {/* FOOTER BAR */}
      <footer className="max-w-7xl mx-auto w-full py-6 border-t border-slate-200 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="uppercase tracking-widest font-extrabold text-[10px] text-slate-400">
          SISTEMA CENTRALIZADO DE GESTIÓN DE TURNOS V2.4
        </div>
        <div className="flex gap-6 font-mono text-[10px] items-center">
          <span className="flex items-center gap-1.5 font-bold text-slate-650">
            <span className="w-2.5 h-2.5 bg-emerald-500"></span>
            SERVIDOR ACTIVO
          </span>
          <span className="opacity-60 font-bold uppercase text-slate-400">TERMINAL 0014-B</span>
        </div>
      </footer>
    </div>
  );
}
