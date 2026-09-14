import React from "react";
import SuperAdminConsole from "../components/SuperAdminConsole";
import { Ticket, Cubicle, SystemUser } from "../types";
import { Lock, Unlock } from "lucide-react";

interface SuperAdminPageProps {
  isAuthenticated: boolean;
  onOpenLoginModal: () => void;
  officeTickets: Record<string, Ticket[]>;
  setOfficeTickets: React.Dispatch<React.SetStateAction<Record<string, Ticket[]>>>;
  officeCubicles: Record<string, Cubicle[]>;
  setOfficeCubicles: React.Dispatch<React.SetStateAction<Record<string, Cubicle[]>>>;
  users: SystemUser[];
  setUsers: React.Dispatch<React.SetStateAction<SystemUser[]>>;
  currentOfficeId: string;
  gatewaySelection: "cedulacion" | "registro_civil";
}

export default function SuperAdminPage({
  isAuthenticated,
  onOpenLoginModal,
  officeTickets,
  setOfficeTickets,
  officeCubicles,
  setOfficeCubicles,
  users,
  setUsers,
  currentOfficeId,
  gatewaySelection
}: SuperAdminPageProps) {
  return (
    <div className="w-full py-4">
      {isAuthenticated ? (
        <SuperAdminConsole
          officeTickets={officeTickets}
          setOfficeTickets={setOfficeTickets}
          officeCubicles={officeCubicles}
          setOfficeCubicles={setOfficeCubicles}
          users={users}
          setUsers={setUsers}
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
              Acceso a Super Administrador Bloqueado
            </h3>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              Usted no ha iniciado sesión de super administración. Por favor introduzca la clave autorizada para abrir el panel de control unificado y clasificador de las 16 oficinas.
            </p>
          </div>
          <button
            onClick={onOpenLoginModal}
            className="px-6 py-3 bg-[#122e70] hover:bg-blue-800 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer shadow-md flex items-center justify-center gap-2"
          >
            <Unlock className="w-4 h-4 text-amber-400" />
            <span>Desbloquear Super Administrador</span>
          </button>
        </div>
      )}
    </div>
  );
}
