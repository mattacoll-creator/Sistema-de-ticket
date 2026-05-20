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
  Heart
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
      ServiceType.CAJA,
      ServiceType.ASESORIA,
      ServiceType.SOPORTE,
      ServiceType.RECLAMOS
    ];

    const randomName = randomNames[Math.floor(Math.random() * randomNames.length)];
    const randomService = randomServices[Math.floor(Math.random() * randomServices.length)];
    const randomPriority = Math.random() < 0.25; // 25% priority

    createTicket(randomName, randomService, randomPriority);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100 py-6 px-4 md:px-8 space-y-6 flex flex-col justify-between">
      {/* STICKY HEADER BRANDING & VIEWPORT CONTROLLER */}
      <header className="max-w-7xl mx-auto w-full space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 relative">
          {/* Indigo Geometric Pillar Left Accent */}
          <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-indigo-600" />
          
          <div className="flex items-center gap-4 pl-1">
            <div className="w-12 h-12 bg-indigo-600 flex items-center justify-center shrink-0 text-white">
              <div className="w-6 h-6 border-2 border-white"></div>
            </div>
            
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100 uppercase">
                  SISTEMA DE TURNOS
                </h1>
                <span className="px-1.5 py-0.5 text-[8px] font-mono tracking-widest bg-slate-900 text-white dark:bg-slate-800 font-bold uppercase">
                  V2.4
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                Centro de Atención Municipal
              </p>
            </div>
          </div>

          {/* Test Chime and Alerts quick bar */}
          <div className="flex items-center gap-2">
            <button
              id="btn-quick-sound-test"
              onClick={handleTestSpeaker}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-850 dark:hover:bg-slate-800 text-xs font-bold transition-all flex items-center gap-2 border-none ring-offset-2 cursor-pointer uppercase tracking-wider"
            >
              <Volume2 className="w-4 h-4" />
              <span>Timbre de Prueba</span>
            </button>
            
            <div className="w-[1px] h-6 bg-slate-200 dark:bg-slate-800 hidden sm:block" />

            <div className="hidden sm:flex items-center gap-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-3 py-1.5 font-mono text-[9px] text-slate-800 dark:text-slate-350 font-bold uppercase tracking-widest">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
              <span>Servidor Activo</span>
            </div>
          </div>
        </div>

        {/* VIEWPORT CONTROLLER TABS */}
        <div className="flex items-center justify-start overflow-x-auto gap-0 border-b border-slate-200 dark:border-slate-800 pb-0 scrollbar-none">
          <button
            id="tab-view-combined"
            onClick={() => setActiveTab("combined")}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "combined"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border-l border-r border-t border-slate-200 dark:border-slate-800 -mb-[2px] pt-3.5"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            <span>Multipantalla (Todo en Uno)</span>
          </button>

          <button
            id="tab-view-kiosk"
            onClick={() => setActiveTab("kiosk")}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "kiosk"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border-l border-r border-t border-slate-200 dark:border-slate-800 -mb-[2px] pt-3.5"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Printer className="w-4 h-4" />
            <span>Kiosko de Turnos (Clientes)</span>
          </button>

          <button
            id="tab-view-tv"
            onClick={() => setActiveTab("tv")}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "tv"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border-l border-r border-t border-slate-200 dark:border-slate-800 -mb-[2px] pt-3.5"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Tv className="w-4 h-4" />
            <span>TV de Sala (Público)</span>
          </button>

          <button
            id="tab-view-agent"
            onClick={() => setActiveTab("agent")}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "agent"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border-l border-r border-t border-slate-200 dark:border-slate-800 -mb-[2px] pt-3.5"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <UserCheck className="w-4 h-4" />
            <span>Consola del Agente</span>
          </button>

          <button
            id="tab-view-admin"
            onClick={() => setActiveTab("admin")}
            className={`px-5 py-3 text-xs font-bold uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all whitespace-nowrap cursor-pointer ${
              activeTab === "admin"
                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400 bg-white dark:bg-slate-900 border-l border-r border-t border-slate-200 dark:border-slate-800 -mb-[2px] pt-3.5"
                : "border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Administración</span>
          </button>
        </div>
      </header>

      {/* MAIN RENDER AREA */}
      <main className="max-w-7xl mx-auto w-full flex-grow">
        {activeTab === "combined" && (
          /* Multi-screen side-by-side dashboard */
          <div className="space-y-6">
            
            {/* Quick Demo Assist Banner */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-slate-800 dark:text-slate-200 leading-normal relative overflow-hidden">
              {/* Geometric Small Anchor Indicator */}
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-500" />
              <div className="space-y-1 pl-2">
                <p className="font-bold flex items-center gap-1.5 uppercase tracking-wide text-slate-900 dark:text-slate-100">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  Guía de Simulación del Sistema
                </p>
                <p className="text-slate-650 dark:text-slate-400">
                  Ingrese un nombre y genere un turno en el <b>Kiosko</b> (Izquierda) • Vaya a la <b>Consola del Agente</b> (Derecha) para presionar "Llamar Siguiente" • Observe el llamado inmediato en la <b>TV Pública</b> (Centro) con audio de voz.
                </p>
              </div>
              <button
                id="btn-fast-simulation-start"
                onClick={() => setIsSimulationActive(!isSimulationActive)}
                className={`py-2 px-4 shadow-none font-bold tracking-wider text-[11px] uppercase border cursor-pointer transition-all ${
                  isSimulationActive 
                    ? "bg-amber-500 border-amber-600 text-white hover:bg-amber-600" 
                    : "bg-slate-900 border-slate-900 text-white hover:bg-slate-800"
                }`}
              >
                {isSimulationActive ? "Pausar Simulación" : "Auto-Generar Tráfico"}
              </button>
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
          <div className="max-w-lg mx-auto py-4">
            <WelcomeKiosk onCreateTicket={createTicket} />
          </div>
        )}

        {activeTab === "tv" && (
          <div className="max-w-4xl mx-auto py-4">
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
          <div className="max-w-2xl mx-auto py-4">
            <AgentConsole
              tickets={tickets}
              cubicles={cubicles}
              onCallNext={callNextTicket}
              onStartAttending={startAttendingTicket}
              onComplete={completeTicket}
              onMiss={markTicketAsMissed}
              onRecall={recallCurrentTicket}
              onChangeStatus={changeCubicleStatus}
            />
          </div>
        )}

        {activeTab === "admin" && (
          <div className="max-w-2xl mx-auto py-4">
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
      <footer className="max-w-7xl mx-auto w-full py-6 border-t border-slate-200 dark:border-slate-800 text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="uppercase tracking-widest font-bold text-[10px]">
          SISTEMA CENTRALIZADO DE GESTIÓN DE TURNOS V2.4
        </div>
        <div className="flex gap-6 font-mono text-[10px] items-center">
          <span className="flex items-center gap-1.5 font-bold">
            <span className="w-2.5 h-2.5 bg-emerald-500"></span>
            SERVIDOR ACTIVO
          </span>
          <span className="opacity-60 font-semibold uppercase">TERMINAL 0014-B</span>
        </div>
      </footer>
    </div>
  );
}
