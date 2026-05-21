/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { useTicketSystem } from "./hooks/useTicketSystem";
import { ServiceType, SERVICES_CONFIG } from "./types";
import { playCallingChime, speakCall } from "./utils/audio";

// Import custom components
import WelcomeKiosk from "./components/WelcomeKiosk";
import MainScreen from "./components/MainScreen";
import AgentConsole from "./components/AgentConsole";
import ControlDashboard from "./components/ControlDashboard";

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
  UserPlus
} from "lucide-react";

export default function App() {
  const {
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
    resetSystem
  } = useTicketSystem();

  // Selected viewport tab: "combined" | "kiosk" | "tv" | "agent" | "admin"
  const [activeTab, setActiveTab] = useState<string>("combined");

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
    ];

    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const randomService = randomServices[Math.floor(Math.random() * randomServices.length)];
    const randomPriority = Math.random() < 0.25; // 25% priority

    createTicket(randomName, randomService, randomPriority);
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] font-sans text-slate-900 pb-12 flex flex-col justify-between">
      {/* UPPER NATIONAL FLAG BAR */}
      <div className="w-full h-1.5 flex select-none shrink-0">
        <div className="bg-red-600 flex-1"></div>
        <div className="bg-[#122e70] flex-1"></div>
      </div>

      {/* HEADER SECTION */}
      <header className="max-w-7xl mx-auto w-full px-4 md:px-8 pt-6 space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-slate-200 p-5 rounded-2xl shadow-sm">
          
          <div className="flex items-center pl-1">
            <img 
              src="https://www.tribunal-electoral.gob.pa/wp-content/uploads/2026/04/WhatsApp-Image-2026-04-30-at-09.45.35.png" 
              referrerPolicy="no-referrer" 
              alt="Tribunal Electoral de Panamá" 
              className="h-16 md:h-20 w-auto object-contain" 
            />
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
        <div className="flex items-center justify-start overflow-x-auto gap-2 border-b border-slate-200/50 pb-2 scrollbar-none">
          <button
            id="tab-view-combined"
            onClick={() => setActiveTab("combined")}
            className={`px-4.5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-xl transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "combined"
                ? "bg-[#122e70] text-white border-transparent shadow shadow-blue-150"
                : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Multipantalla (Todo en Uno)</span>
          </button>

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
            onClick={() => setActiveTab("admin")}
            className={`px-4.5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 rounded-xl transition-all whitespace-nowrap cursor-pointer border ${
              activeTab === "admin"
                ? "bg-[#122e70] text-white border-transparent shadow shadow-blue-150"
                : "bg-white text-slate-600 border-slate-205 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Administración</span>
          </button>
        </div>
      </header>

      {/* MAIN RENDER AREA */}
      <main className="max-w-7xl mx-auto w-full px-4 md:px-8 flex-grow">
        {activeTab === "combined" && (
          /* Multi-screen side-by-side dashboard */
          <div className="space-y-6">
            
            {/* GIANT DEEP BLUE HERO BLOCK */}
            <div className="w-full bg-gradient-to-r from-[#122e70] to-[#1d428a] text-white rounded-2xl p-8 md:p-10 text-center relative overflow-hidden shadow-md flex flex-col justify-center items-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-blue-600/30 via-transparent to-transparent opacity-75"></div>
              
              <div className="relative z-10 max-w-4xl mx-auto space-y-4">
                <span className="px-3 py-1 text-[10px] font-mono tracking-widest bg-blue-500/20 text-blue-200 border border-blue-400/40 font-black rounded uppercase">
                  ✓ PORTAL OFICIAL DE ATENCIÓN CIUDADANA
                </span>
                <h2 className="text-3xl md:text-5xl font-black font-display uppercase tracking-wider text-white">
                  PORTAL DE CITAS TECNOLÓGICAS
                </h2>
                <p className="text-sm md:text-base text-blue-100 font-medium leading-relaxed max-w-2xl mx-auto">
                  Evite filas y programe su atención presencial obligatoria para servicios de Cédula, Registro Civil y Extranjería de manera transparente, rápida y garantizada.
                </p>
                
                {/* Embedded Simulation system controls */}
                <div className="pt-4 flex flex-wrap items-center justify-center gap-3.5">
                  <button
                    id="btn-fast-simulation-start"
                    onClick={() => setIsSimulationActive(!isSimulationActive)}
                    className={`py-3 px-5 rounded-xl font-black tracking-wider text-xs uppercase cursor-pointer transition-all flex items-center gap-2 shadow-md ${
                      isSimulationActive 
                        ? "bg-amber-500 text-white shadow-amber-900/20" 
                        : "bg-emerald-600 text-white shadow-emerald-900/20 hover:bg-emerald-700"
                    }`}
                  >
                    <span className="relative flex h-2.5 w-2.5">
                      <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isSimulationActive ? 'bg-amber-300' : 'bg-emerald-300'}`}></span>
                      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${isSimulationActive ? 'bg-white' : 'bg-emerald-250'}`}></span>
                    </span>
                    <span>{isSimulationActive ? "PAUSAR FLUJO AUTOMÁTICO" : "ACTIVAR TRÁFICO DE CIUDADANOS"}</span>
                  </button>

                  <button
                    id="btn-trigger-single-instant-client-hero"
                    onClick={handleCreateRandomTicket}
                    className="py-3 px-5 bg-white hover:bg-slate-50 text-[#122e70] font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2"
                  >
                    <UserPlus className="w-4 h-4 text-[#122e70]" />
                    <span>Generar Turno Al Instante</span>
                  </button>
                  
                  <button
                    id="btn-reset-system"
                    onClick={() => {
                      if (window.confirm("¿Estás seguro de que quieres reiniciar totalmente el sistema de tickets? Se vaciarán colas e históricos.")) {
                        resetSystem();
                      }
                    }}
                    className="py-3 px-5 bg-red-600 hover:bg-red-700 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-md flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>REINICIAR TODO</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Combined 4-panel Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              
              {/* KIOSK SCREEN */}
              <div className="space-y-2">
                <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-slate-400 block font-mono">
                  [PANTALLA 01] REGISTRO DE TRÁMITE
                </span>
                <WelcomeKiosk onCreateTicket={createTicket} />
              </div>

              {/* PUBLIC TV BOARD SCREEN */}
              <div className="space-y-2 xl:col-span-1">
                <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-slate-400 block font-mono">
                  [PANTALLA 02] MONITOR DE SALA
                </span>
                <MainScreen
                  tickets={tickets}
                  cubicles={cubicles}
                  activeCall={activeCall}
                  onClearActiveCall={() => setActiveCall(null)}
                  onTestSpeaker={handleTestSpeaker}
                />
              </div>

              {/* AGENT CONSOLE & CONTROLS */}
              <div className="space-y-2 lg:col-span-2 xl:col-span-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-1 gap-6 md:gap-4 xl:gap-0">
                <div className="space-y-2">
                  <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-slate-400 block font-mono">
                    [PANTALLA 03] CONSOLA OPERATIVA
                  </span>
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
                  />
                </div>

                <div className="space-y-2 xl:mt-6">
                  <span className="text-[10px] tracking-[0.25em] uppercase font-bold text-slate-400 block font-mono">
                    [PANTALLA 04] CENTRO DE CONTROL
                  </span>
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
                  />
                </div>
              </div>

            </div>
          </div>
        )}

        {/* INDIVIDUAL MAXIMIZED VIEWPORTS */}
        {activeTab === "kiosk" && (
          <div className="w-full py-4">
            <WelcomeKiosk onCreateTicket={createTicket} />
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
            />
          </div>
        )}

        {activeTab === "admin" && (
          <div className="w-full py-4">
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
            />
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
