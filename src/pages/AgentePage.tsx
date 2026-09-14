import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import AgentConsole from "../components/AgentConsole";
import AdminPanel from "../components/AdminPanel";
import { Ticket, Cubicle, SystemUser, CubicleStatus, TicketPhase, ServiceType, Cita, TicketStatus } from "../types";
import { UserCheck, CalendarCheck2, Shield, Users, RefreshCw } from "lucide-react";

interface AgentePageProps {
  tickets: Ticket[];
  cubicles: Cubicle[];
  isAutoAssignActive?: boolean;
  onToggleAutoAssign?: (active: boolean) => void;
  onCallNext: (cubicleId: string, specificTicketId?: string) => Promise<void>;
  onStartAttending: (cubicleId: string) => void;
  onComplete: (cubicleId: string, outcome?: "administrative" | "emission_physical", procedure?: string) => void;
  onTransferToCajaRC?: (cubicleId: string) => void;
  onMiss: (cubicleId: string) => void;
  onRecall: (cubicleId: string) => void;
  onChangeStatus: (cubicleId: string, status: CubicleStatus, agentName?: string) => void;
  onUpdateCubicleConfig: (cubicleId: string, phases: TicketPhase[], services: ServiceType[]) => void;
  onRefresh?: () => Promise<void> | void;
  onResetSystem?: () => Promise<void> | void;
  currentOfficeId?: string;
  users: SystemUser[];
  currentActiveUserId: string;
  setCurrentActiveUserId: React.Dispatch<React.SetStateAction<string>>;
  gatewaySelection?: "select" | "cedulacion" | "registro_civil";
}

export default function AgentePage(props: AgentePageProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab selector: "turnos" (Ventanillas/Llamados) vs "citas" (Panel de Administración de Citas)
  const tabParam = searchParams.get("tab") || "";
  const [activeTab, setActiveTab] = useState<"turnos" | "citas">(() => {
    if (tabParam === "citas" || tabParam === "citas-admin" || tabParam === "citas_admin" || tabParam === "admin") {
      return "citas";
    }
    return "turnos";
  });

  // Keep state in sync if URL param changes
  useEffect(() => {
    if (tabParam === "citas" || tabParam === "citas-admin" || tabParam === "citas_admin" || tabParam === "admin") {
      setActiveTab("citas");
    } else if (tabParam === "turnos") {
      setActiveTab("turnos");
    }
  }, [tabParam]);

  const handleSwitchTab = (tab: "turnos" | "citas") => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set("tab", tab);
      return next;
    }, { replace: true });
  };

  // State and persistence for appointments (Citas)
  const [citasList, setCitasList] = useState<Cita[]>([]);
  const [isLoadingCitas, setIsLoadingCitas] = useState<boolean>(false);

  const fetchAppointments = useCallback(async () => {
    setIsLoadingCitas(true);
    try {
      const token = sessionStorage.getItem("admin_token") || localStorage.getItem("te_session_token") || "superadmin_token";
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch("/api/appointments", { headers });
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : (data?.appointments || []);
        
        let mergedList = [...list];

        // Heal and normalize all appointments with full citizen names and Extranjería CSV nomenclature
        mergedList = mergedList.map((app: any) => {
          if (!app) return app;
          let updated = { ...app };
          const isCsv = String(updated.id || '').includes('CSV') || 
                        String(updated.codigoTransaccion || '').includes('CSV') || 
                        String(updated.creadoPor || '').toLowerCase().includes('csv') || 
                        String(updated.creadoPor || '').toLowerCase().includes('importaci') ||
                        String(updated.id || '').startsWith('TE-CSV');

          if (isCsv) {
            if (String(updated.id || '').startsWith('TE-')) {
              updated.id = updated.id.replace(/^TE-/, 'EXT-');
            }
            if (String(updated.codigoTransaccion || '').startsWith('TE-')) {
              updated.codigoTransaccion = updated.codigoTransaccion.replace(/^TE-/, 'EXT-');
            }
            updated.servicioCategoria = 'extranjeria';
            updated.categoriaNombre = 'Trámites de Extranjería';
            updated.subServicioId = 'ext_primera_vez';
            updated.subServicioNombre = 'Carné de residente permanente por primera vez';
            updated.sucursalId = 'anc_main';
            updated.sucursalNombre = 'Sede Principal de Ancón (Extranjería)';
            updated.sucursalDireccion = 'Ciudad de Panamá, Ancón, Ave. Omar Torrijos Herrera';
            updated.tipoIdentificacion = 'Pasaporte';
            updated.creadoPor = 'Importación CSV Extranjería';
            if (!updated.requisitos || updated.requisitos.length === 0 || !updated.requisitos.some((r: string) => r.includes('Migración'))) {
              updated.requisitos = [
                "Precio (efectivo) B/. 100.00",
                "Requiere contar con cita programada",
                "Nota del Servicio Nacional de Migración",
                "Fotocopia del carné expedido por el Servicio Nacional de Migración",
                "Fotocopia de la página de las generales del pasaporte"
              ];
            }
          }

          const dp = updated.datosPersonales ? { ...updated.datosPersonales } : {};
          if (isCsv) {
            dp.tipoIdentificacion = 'Pasaporte';
            if (!dp.pasaporte) {
              dp.pasaporte = dp.identificacion || updated.identificacion || 'PA-EXT';
            }
          }
          const parts = [
            dp.primerNombre || '',
            dp.segundoNombre || '',
            dp.primerApellido || '',
            dp.segundoApellido || ''
          ].map((s: any) => String(s || '').trim()).filter(Boolean);
          const partsName = parts.length > 0 ? parts.join(' ') : '';
          const resolvedName = dp.nombreCompleto || partsName || updated.nombre || (dp.pasaporte ? `Ciudadano (${dp.pasaporte})` : '');
          if (resolvedName && !dp.nombreCompleto) {
            dp.nombreCompleto = resolvedName;
          }
          return {
            ...updated,
            nombre: updated.nombre || resolvedName || 'Ciudadano',
            datosPersonales: dp
          };
        });

        setCitasList(mergedList);
        try {
          localStorage.setItem("citas_tribunal_electoral_v2", JSON.stringify(mergedList));
        } catch {
          // ignore
        }
      } else {
        throw new Error("API returned non-ok");
      }
    } catch {
      try {
        const local = localStorage.getItem("citas_tribunal_electoral_v2") || localStorage.getItem("citas_locales_v1");
        if (local) {
          setCitasList(JSON.parse(local));
        }
      } catch (err) {
        console.error("Error parsing local appointments backup:", err);
      }
    } finally {
      setIsLoadingCitas(false);
    }
  }, []);

  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const handleSaveCitas = async (updatedList: Cita[]) => {
    setCitasList(updatedList);
    try {
      localStorage.setItem("citas_tribunal_electoral_v2", JSON.stringify(updatedList));
    } catch {
      // ignore
    }

    try {
      const token = sessionStorage.getItem("admin_token") || "";
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      await fetch("/api/appointments", {
        method: "POST",
        headers,
        body: JSON.stringify({ appointments: updatedList }),
      });
    } catch (err) {
      console.error("Error persisting appointments to server:", err);
    }
  };

  return (
    <div className="w-full py-2 space-y-4">
      {/* UNIFIED AGENT NAVIGATION TABS */}
      <div className="bg-white border border-slate-200 rounded-2xl p-2 sm:p-2.5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* BOTÓN 1: Consola de Turnos / Ventanillas */}
          <button
            id="tab-agent-turnos"
            type="button"
            onClick={() => handleSwitchTab("turnos")}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              activeTab === "turnos"
                ? "bg-gradient-to-r from-[#003087] to-[#122e70] text-white border-transparent shadow-md shadow-blue-900/15"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:text-slate-900"
            }`}
          >
            <UserCheck className="w-4 h-4 text-cyan-400" />
            <span>🖥️ Consola de Turnos (Ventanillas)</span>
            <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-950/40 text-blue-200 border border-blue-400/20 font-mono">
              {props.tickets.filter(t => t.status === TicketStatus.WAITING || t.status === TicketStatus.CALLING).length} en sala
            </span>
          </button>

          {/* BOTÓN 2: Panel de Administración de Citas */}
          <button
            id="tab-agent-citas"
            type="button"
            onClick={() => handleSwitchTab("citas")}
            className={`flex-1 sm:flex-initial px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border ${
              activeTab === "citas"
                ? "bg-gradient-to-r from-amber-700 to-amber-800 text-white border-transparent shadow-md shadow-amber-900/15"
                : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-amber-50 hover:text-amber-900 hover:border-amber-200"
            }`}
          >
            <CalendarCheck2 className="w-4 h-4 text-amber-400" />
            <span>📅 Panel de Administración de Citas</span>
            <span className="ml-1 text-[10px] px-2 py-0.5 rounded-full bg-amber-950/40 text-amber-200 border border-amber-400/20 font-mono">
              {citasList.length} citas
            </span>
          </button>
        </div>

        {/* Status / Quick Action Badge */}
        <div className="flex items-center gap-2 text-xs font-bold text-slate-600">
          {activeTab === "citas" && (
            <button
              onClick={fetchAppointments}
              disabled={isLoadingCitas}
              className="p-2 text-slate-500 hover:text-[#003087] hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-slate-200"
              title="Refrescar listado de citas"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingCitas ? "animate-spin text-blue-600" : ""}`} />
            </button>
          )}
          <span className="text-[10px] text-slate-400 font-extrabold uppercase tracking-widest hidden md:inline-block">
            Portal Unificado de Agentes
          </span>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black uppercase tracking-wider">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            En Línea
          </span>
        </div>
      </div>

      {/* RENDER CONTENT ACCORDING TO SELECTED TAB */}
      {activeTab === "turnos" ? (
        <AgentConsole {...props} />
      ) : (
        <div className="w-full animate-fadeIn">
          <AdminPanel
            citas={citasList}
            onUpdateCitas={handleSaveCitas}
            onClose={() => handleSwitchTab("turnos")}
          />
        </div>
      )}
    </div>
  );
}
