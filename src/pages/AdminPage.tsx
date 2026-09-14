import React from "react";
import ControlDashboard from "../components/ControlDashboard";
import { Ticket, Cubicle } from "../types";
import { Lock, Unlock } from "lucide-react";

interface AdminPageProps {
  isAuthenticated: boolean;
  onOpenLoginModal: () => void;
  tickets: Ticket[];
  cubicles: Cubicle[];
  isSimulationActive: boolean;
  onToggleSimulation: (active: boolean) => void;
  simulationSpeed: number;
  onSetSimulationSpeed: (speed: number) => void;
  onCreateRandomTicket: () => void;
  onResetSystem: () => void;
  isAutoAssignActive: boolean;
  onToggleAutoAssign: (active: boolean) => void;
  onPurgeOldTickets: () => void;
  currentOfficeId: string;
  gatewaySelection: "cedulacion" | "registro_civil";
}

export default function AdminPage({
  isAuthenticated,
  onOpenLoginModal,
  tickets,
  cubicles,
  isSimulationActive,
  onToggleSimulation,
  simulationSpeed,
  onSetSimulationSpeed,
  onCreateRandomTicket,
  onResetSystem,
  isAutoAssignActive,
  onToggleAutoAssign,
  onPurgeOldTickets,
  currentOfficeId,
  gatewaySelection
}: AdminPageProps) {
  return (
    <div className="w-full py-4">
      {isAuthenticated ? (
        <ControlDashboard
          tickets={tickets}
          cubicles={cubicles}
          isSimulationActive={isSimulationActive}
          onToggleSimulation={onToggleSimulation}
          simulationSpeed={simulationSpeed}
          onSetSimulationSpeed={onSetSimulationSpeed}
          onCreateRandomTicket={onCreateRandomTicket}
          onResetSystem={onResetSystem}
          isAutoAssignActive={isAutoAssignActive}
          onToggleAutoAssign={onToggleAutoAssign}
          onPurgeOldTickets={onPurgeOldTickets}
          currentOfficeId={currentOfficeId}
          gatewaySelection={gatewaySelection}
        />
      ) : (
        <div className="bg-white border-2 border-dashed border-slate-200 p-12 rounded-2xl flex flex-col items-center justify-center text-center space-y-6 max-w-lg mx-auto shadow-sm my-8">
          <div className="w-16 h-16 bg-red-50 text-red-650 rounded-full flex items-center justify-center border border-red-100">
            <Lock className="w-8 h-8 text-red-600" />
          </div>
          <div className="space-y-2">
            <h3 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Acceso a Administración Bloqueado
            </h3>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Usted no ha iniciado sesión de administración. Por favor introduzca la clave autorizada para abrir las herramientas de simulación, configuración y reinicio.
            </p>
          </div>
          <button
            onClick={onOpenLoginModal}
            className="px-6 py-3 bg-[#122e70] hover:bg-blue-800 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4 text-amber-400" />
            <span>Desbloquear Administración</span>
          </button>
        </div>
      )}
    </div>
  );
}
