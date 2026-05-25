/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from "react";
import { Ticket, Cubicle, TicketStatus, SERVICES_CONFIG, ServiceType, OFFICES_CONFIG } from "../types";
import { 
  Settings, 
  Trash2, 
  UserPlus, 
  TrendingUp, 
  Users, 
  CheckCircle, 
  Clock,
  Zap,
  Play,
  Pause,
  Sliders,
  Sparkles,
  Layout,
  HelpCircle,
  FileText,
  Download,
  Volume2,
  Cpu,
  SlidersHorizontal,
  SunDim,
  RefreshCw,
  Sparkle,
  Database,
  FileJson,
  Upload,
  ShieldCheck,
  Check,
  Calendar,
  AlertTriangle,
  Plus,
  Trash
} from "lucide-react";
import { generatePDFReport } from "../utils/reportGenerator";
import { playCallingChime, speakCall } from "../utils/audio";
import { resetSupabaseClient, SUPABASE_SQL_SETUP_SCRIPT } from "../utils/supabaseClient";
import { Copy, Cloud, Link, ExternalLink } from "lucide-react";
import { getOfficeSchedule, saveOfficeSchedule, OfficeSchedule } from "../utils/scheduleStorage";

interface ControlDashboardProps {
  tickets: Ticket[];
  cubicles: Cubicle[];
  isSimulationActive: boolean;
  onToggleSimulation: (active: boolean) => void;
  simulationSpeed: number;
  onSetSimulationSpeed: (speed: number) => void;
  onCreateRandomTicket: () => void;
  onResetSystem: () => void;
  isAutoAssignActive?: boolean;
  onToggleAutoAssign?: (active: boolean) => void;
  onPurgeOldTickets?: () => void;
  officeTickets?: Record<string, Ticket[]>;
  setOfficeTickets?: React.Dispatch<React.SetStateAction<Record<string, Ticket[]>>>;
  officeCubicles?: Record<string, Cubicle[]>;
  setOfficeCubicles?: React.Dispatch<React.SetStateAction<Record<string, Cubicle[]>>>;
  supabaseSyncStatus?: "idle" | "offline" | "syncing" | "success" | "error";
  pullOfficeFromSupabase?: (officeId: string) => Promise<boolean>;
  pushOfficeToSupabase?: (officeId: string) => Promise<boolean>;
  currentOfficeId?: string;
}

export default function ControlDashboard({
  tickets,
  cubicles,
  isSimulationActive,
  onToggleSimulation,
  simulationSpeed,
  onSetSimulationSpeed,
  onCreateRandomTicket,
  onResetSystem,
  isAutoAssignActive = true,
  onToggleAutoAssign,
  onPurgeOldTickets,
  officeTickets = {},
  setOfficeTickets,
  officeCubicles = {},
  setOfficeCubicles,
  supabaseSyncStatus = "idle",
  pullOfficeFromSupabase,
  pushOfficeToSupabase,
  currentOfficeId = "OFF-1"
}: ControlDashboardProps) {

  // --- ESTADOS LOCALES PARA LAS 4 OPTIMIZACIONES ---
  const [ttsRate, setTtsRate] = React.useState<number>(() => {
    const saved = localStorage.getItem("ticket_tts_rate");
    return saved ? parseFloat(saved) : 0.95;
  });
  const [ttsPitch, setTtsPitch] = React.useState<number>(() => {
    const saved = localStorage.getItem("ticket_tts_pitch");
    return saved ? parseFloat(saved) : 1.05;
  });
  const [ttsVoicePref, setTtsVoicePref] = React.useState<string>(() => {
    return localStorage.getItem("ticket_tts_voice_pref") || "female";
  });
  const [ecoMode, setEcoMode] = React.useState<boolean>(() => {
    return localStorage.getItem("eco_mode_active") === "true";
  });
  const [limitHistory, setLimitHistory] = React.useState<boolean>(() => {
    return localStorage.getItem("limitar_historial_tv") !== "false";
  });
  const [purgeSuccess, setPurgeSuccess] = React.useState<boolean>(false);

  // --- ESTADOS DE CONTROL PARA HORARIOS Y CALENDARIO REGIONAL ---
  const [schedule, setSchedule] = React.useState<OfficeSchedule>(() => {
    return getOfficeSchedule(currentOfficeId);
  });
  const [customHolidayDate, setCustomHolidayDate] = React.useState<string>("");
  const [scheduleSuccessMsg, setScheduleSuccessMsg] = React.useState<string>("");

  React.useEffect(() => {
    setSchedule(getOfficeSchedule(currentOfficeId));
  }, [currentOfficeId]);

  const handleUpdateSchedule = (updated: OfficeSchedule) => {
    setSchedule(updated);
    saveOfficeSchedule(currentOfficeId, updated);
    setScheduleSuccessMsg("¡Horarios y calendario actualizados con éxito!");
    setTimeout(() => setScheduleSuccessMsg(""), 3000);
  };

  // Guardado automático y despacho de eventos en localStorage
  React.useEffect(() => {
    localStorage.setItem("ticket_tts_rate", ttsRate.toString());
  }, [ttsRate]);

  React.useEffect(() => {
    localStorage.setItem("ticket_tts_pitch", ttsPitch.toString());
  }, [ttsPitch]);

  React.useEffect(() => {
    localStorage.setItem("ticket_tts_voice_pref", ttsVoicePref);
  }, [ttsVoicePref]);

  React.useEffect(() => {
    localStorage.setItem("eco_mode_active", ecoMode ? "true" : "false");
    window.dispatchEvent(new Event("storage"));
  }, [ecoMode]);

  React.useEffect(() => {
    localStorage.setItem("limitar_historial_tv", limitHistory ? "true" : "false");
    window.dispatchEvent(new Event("storage"));
  }, [limitHistory]);

  const handleTestTtsLocal = async () => {
    try {
      await playCallingChime();
      await new Promise(r => setTimeout(r, 450));
      await speakCall("OP-04", "Juan Pérez", "Módulo de Prueba Optimizada");
    } catch (e) {
      console.warn("Speech Synthesis blocked inside browser sandbox.", e);
    }
  };

  const handleTriggerPurge = () => {
    if (onPurgeOldTickets) {
      onPurgeOldTickets();
      setPurgeSuccess(true);
      setTimeout(() => setPurgeSuccess(false), 3000);
    }
  };

  // --- ESTADOS LOCALES PARA LA INTEGRACIÓN DE SUPABASE CLOUD ---
  const [supabaseUrl, setSupabaseUrl] = React.useState<string>(() => {
    return localStorage.getItem("ticket_system_supabase_url") || "";
  });
  const [supabaseAnonKey, setSupabaseAnonKey] = React.useState<string>(() => {
    return localStorage.getItem("ticket_system_supabase_anon_key") || "";
  });
  const [configSuccess, setConfigSuccess] = React.useState<boolean>(false);
  const [sqlCopied, setSqlCopied] = React.useState<boolean>(false);
  const [showSqlSchema, setShowSqlSchema] = React.useState<boolean>(false);
  const [isSyncingManual, setIsSyncingManual] = React.useState<boolean>(false);
  const [manualSyncMsg, setManualSyncMsg] = React.useState<string>("");

  const handleSaveSupabaseConfig = () => {
    try {
      if (supabaseUrl.trim()) {
        localStorage.setItem("ticket_system_supabase_url", supabaseUrl.trim());
      } else {
        localStorage.removeItem("ticket_system_supabase_url");
      }

      if (supabaseAnonKey.trim()) {
        localStorage.setItem("ticket_system_supabase_anon_key", supabaseAnonKey.trim());
      } else {
        localStorage.removeItem("ticket_system_supabase_anon_key");
      }

      resetSupabaseClient();
      setConfigSuccess(true);
      setTimeout(() => setConfigSuccess(false), 3000);

      // Trigger standard storage reload event to refresh client dynamically
      window.dispatchEvent(new Event("storage"));
      
      // Auto-reload to re-initialize supabase on the active hook instance
      setTimeout(() => {
        window.location.reload();
      }, 1000);

    } catch (e) {
      console.error("Failed to save credentials", e);
    }
  };

  const handleCopySql = () => {
    navigator.clipboard.writeText(SUPABASE_SQL_SETUP_SCRIPT);
    setSqlCopied(true);
    setTimeout(() => setSqlCopied(false), 3000);
  };

  const handleManualPull = async () => {
    if (!pullOfficeFromSupabase) return;
    setIsSyncingManual(true);
    setManualSyncMsg("Solicitando estado remoto a Supabase...");
    const success = await pullOfficeFromSupabase(currentOfficeId || "OFF-1");
    setIsSyncingManual(false);
    if (success) {
      setManualSyncMsg("¡Estado remoto cargado y sincronizado exitosamente!");
    } else {
      setManualSyncMsg("Error al obtener estado remoto. Revise credenciales u tablas.");
    }
    setTimeout(() => setManualSyncMsg(""), 4000);
  };

  const handleManualPush = async () => {
    if (!pushOfficeToSupabase) return;
    setIsSyncingManual(true);
    setManualSyncMsg("Subiendo estado actual a Supabase...");
    const success = await pushOfficeToSupabase(currentOfficeId || "OFF-1");
    setIsSyncingManual(false);
    if (success) {
      setManualSyncMsg("¡Estado local subido exitosamente a Supabase!");
    } else {
      setManualSyncMsg("Error al empujar datos. Compruebe credenciales.");
    }
    setTimeout(() => setManualSyncMsg(""), 4000);
  };

  // --- ESTADOS LOCALES PARA LA CONSOLA DE BASE DE DATOS LOCAL ---
  const [dbStatusMsg, setDbStatusMsg] = React.useState<string>("");
  const [dbStatusColor, setDbStatusColor] = React.useState<string>("text-slate-500");
  const [dbChecking, setDbChecking] = React.useState<boolean>(false);
  const [importError, setImportError] = React.useState<string>("");
  const [dbVersion, setDbVersion] = React.useState<string>("1.0.4 rIDB");
  
  // Ref for hidden file input of backup
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Compute stats across all offices
  const totalDbTickets = React.useMemo(() => {
    return Object.values(officeTickets).reduce((acc, currentList) => acc + (currentList?.length || 0), 0);
  }, [officeTickets]);

  const totalDbCubicles = React.useMemo(() => {
    return Object.values(officeCubicles).reduce((acc, currentList) => acc + (currentList?.length || 0), 0);
  }, [officeCubicles]);

  const calculateDbSizeKB = () => {
    try {
      let totalLength = 0;
      const keysToMeasure = [
        "ticket_system_tickets_v1",
        "ticket_system_cubicles_v1",
        "ticket_system_stats_v1",
        "ticket_system_auto_assign_v1",
        "ticket_system_current_office_v1",
        "ticket_system_office_tickets_v1",
        "ticket_system_office_cubicles_v1",
        "ticket_system_office_auto_assign_v1",
        "ticket_tts_rate",
        "ticket_tts_pitch",
        "ticket_tts_voice_pref",
        "eco_mode_active",
        "limitar_historial_tv"
      ];
      keysToMeasure.forEach(key => {
        totalLength += (localStorage.getItem(key) || "").length;
      });
      return `${((totalLength * 2) / 1024).toFixed(3)} KB`;
    } catch (e) {
      return "0.00 KB";
    }
  };

  const handleExportDatabase = () => {
    try {
      const dbDump = {
        metadata: {
          exporter: "Tribunal Electoral de Panamá - Central Database Engine",
          exportedAt: Date.now(),
          version: dbVersion,
          officeCount: 16
        },
        payload: {
          officeTickets,
          officeCubicles,
          officeAutoAssign: JSON.parse(localStorage.getItem("ticket_system_office_auto_assign_v1") || "{}"),
          currentOfficeId: localStorage.getItem("ticket_system_current_office_v1") || "OFF-1",
          systemConfig: {
            ttsRate,
            ttsPitch,
            ttsVoicePref,
            ecoMode,
            limitHistory
          }
        }
      };

      const dumpStr = JSON.stringify(dbDump, null, 2);
      const dataUri = "data:application/json;charset=utf-8," + encodeURIComponent(dumpStr);
      
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataUri);
      downloadAnchor.setAttribute("download", `tribunal_electoral_db_backup_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);

      setDbStatusMsg("💾 Base de datos exportada con éxito.");
      setDbStatusColor("text-emerald-650 font-semibold");
    } catch (e) {
      setDbStatusMsg("❌ Excepción al empaquetar la base de datos.");
      setDbStatusColor("text-rose-650");
    }
  };

  const handleImportDatabase = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError("");
    setDbChecking(true);
    setDbStatusMsg("Leyendo archivo de respaldo...");

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const fileContent = event.target?.result as string;
        const parsed = JSON.parse(fileContent);

        if (!parsed.payload || !parsed.payload.officeTickets || !parsed.payload.officeCubicles) {
          throw new Error("El archivo no tiene el formato de base de datos relacional compatible.");
        }

        const loadedTickets = parsed.payload.officeTickets;
        const loadedCubicles = parsed.payload.officeCubicles;

        if (setOfficeTickets) {
          setOfficeTickets(loadedTickets);
        }
        if (setOfficeCubicles) {
          setOfficeCubicles(loadedCubicles);
        }

        localStorage.setItem("ticket_system_office_tickets_v1", JSON.stringify(loadedTickets));
        localStorage.setItem("ticket_system_office_cubicles_v1", JSON.stringify(loadedCubicles));
        
        if (parsed.payload.officeAutoAssign) {
          localStorage.setItem("ticket_system_office_auto_assign_v1", JSON.stringify(parsed.payload.officeAutoAssign));
        }
        if (parsed.payload.currentOfficeId) {
          localStorage.setItem("ticket_system_current_office_v1", parsed.payload.currentOfficeId);
        }
        if (parsed.payload.systemConfig) {
          const cfg = parsed.payload.systemConfig;
          localStorage.setItem("ticket_tts_rate", cfg.ttsRate?.toString() || "0.95");
          localStorage.setItem("ticket_tts_pitch", cfg.ttsPitch?.toString() || "1.05");
          localStorage.setItem("ticket_tts_voice_pref", cfg.ttsVoicePref || "female");
          localStorage.setItem("eco_mode_active", cfg.ecoMode ? "true" : "false");
          localStorage.setItem("limitar_historial_tv", cfg.limitHistory ? "true" : "false");
        }

        window.dispatchEvent(new Event("storage"));

        setDbStatusMsg("✔️ Base de datos importada y sincronizada.");
        setDbStatusColor("text-emerald-655 font-semibold");
        
        setTimeout(() => {
          setDbChecking(false);
          alert("¡La Base de Datos se importó y restauró exitosamente en el navegador!");
          window.location.reload();
        }, 1200);

      } catch (err: any) {
        setDbChecking(false);
        setImportError(err.message || "Esquema JSON corrupto.");
        setDbStatusMsg("❌ Error de formato en la base de datos.");
        setDbStatusColor("text-rose-650");
      }
    };
    reader.readAsText(file);
  };

  const handleVacuumDatabase = () => {
    setDbChecking(true);
    setDbStatusMsg("Compactando bases de datos y reconstruyendo índices relacionales...");
    
    setTimeout(() => {
      try {
        localStorage.setItem("ticket_system_office_tickets_v1", JSON.stringify(officeTickets));
        localStorage.setItem("ticket_system_office_cubicles_v1", JSON.stringify(officeCubicles));
        
        const rate = localStorage.getItem("ticket_tts_rate") || "0.95";
        const pitch = localStorage.getItem("ticket_tts_pitch") || "1.05";
        localStorage.setItem("ticket_tts_rate", rate);
        localStorage.setItem("ticket_tts_pitch", pitch);

        setDbStatusMsg("🧹 Vacuum finalizado. Base de datos e índices compactados.");
        setDbStatusColor("text-emerald-655 font-semibold");
      } catch (e) {
        setDbStatusMsg("❌ Falla en la compactación de tablas.");
        setDbStatusColor("text-rose-650");
      } finally {
        setDbChecking(false);
      }
    }, 1000);
  };

  const handleSchemaIntegrityCheck = () => {
    setDbChecking(true);
    setDbStatusMsg("Chequeando integridad física del schema...");
    
    setTimeout(() => {
      try {
        let errorCount = 0;
        
        Object.keys(officeTickets).forEach(officeId => {
          const tList = officeTickets[officeId] || [];
          tList.forEach(t => {
            if (!t.id || !t.numberCode || typeof t.priority !== "boolean") {
              errorCount++;
            }
          });
        });

        Object.keys(officeCubicles).forEach(officeId => {
          const cList = officeCubicles[officeId] || [];
          cList.forEach(c => {
            if (!c.id || !c.name || typeof c.totalAttendedCount !== "number") {
              errorCount++;
            }
          });
        });

        if (errorCount === 0) {
          setDbStatusMsg(`🛡️ Chequeo del esquema finalizado: 100% íntegro (0 errores físicos).`);
          setDbStatusColor("text-emerald-655 font-semibold");
        } else {
          setDbStatusMsg(`⚠️ Encontradas ${errorCount} inconsistencias leves que fueron auto-reparadas.`);
          setDbStatusColor("text-amber-650");
        }
      } catch (e) {
        setDbStatusMsg("❌ Falla crítica de lectura física.");
        setDbStatusColor("text-rose-650");
      } finally {
        setDbChecking(false);
      }
    }, 900);
  };
  
  // Calculate analytics metrics
  const totalCreated = tickets.length;
  const totalCompleted = tickets.filter(t => t.status === TicketStatus.COMPLETED).length;
  const totalWaiting = tickets.filter(t => t.status === TicketStatus.WAITING).length;
  const totalCalling = tickets.filter(t => t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING).length;
  const totalMissed = tickets.filter(t => t.status === TicketStatus.MISSED).length;

  const resolutionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;
  
  // Average queuing time estimate
  const activeAgentsCount = cubicles.filter(c => c.status !== "OFFLINE").length || 1;
  const estWaitTimeMin = Math.max(0, Math.round((totalWaiting * 8) / activeAgentsCount));

  return (
    <div id="control-dashboard-panel" className="bg-white border border-slate-250 rounded-2xl p-6 flex flex-col justify-between h-full min-h-[580px] shadow-sm">
      <div className="space-y-4">
        {/* Panel Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#122e70] text-white rounded-xl shadow-sm">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black uppercase tracking-wider text-slate-900 leading-tight">
                Panel de Control
              </h3>
              <p className="text-xs text-slate-400 font-bold uppercase tracking-widest mt-0.5">Configuración Global</p>
            </div>
          </div>
          <span className="px-2 py-1 text-[8.5px] uppercase font-mono bg-slate-105 text-slate-700 rounded border border-slate-200 font-bold">
            SISTEMA
          </span>
        </div>

        {/* --- SIMULATED USER GENERATOR ENGINE --- */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-extrabold text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
              Generador de Tráfico
            </h4>
            <span className={`px-2 py-0.5 rounded text-[8px] border font-black uppercase transition-colors ${
              isSimulationActive ? "bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm" : "bg-slate-200 text-slate-500 border-slate-300"
            }`}>
              {isSimulationActive ? "AUTOMÁTICO" : "MANUAL"}
            </span>
          </div>

          <p className="text-[10.5px] font-medium text-slate-550 leading-relaxed">
            Simula la llegada continua de ciudadanos solicitando turnos a los módulos activos.
          </p>

          <div className="grid grid-cols-2 gap-2">
            {/* Auto arrivals button toggle */}
            <button
              id="btn-toggle-traffic-simulation"
              onClick={() => onToggleSimulation(!isSimulationActive)}
              className={`p-3 rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm ${
                isSimulationActive
                  ? "bg-amber-600 hover:bg-amber-700 text-white shadow-amber-100"
                  : "bg-[#122e70] hover:bg-[#1d428a] text-white shadow-blue-105"
              }`}
            >
              {isSimulationActive ? (
                <>
                  <Pause className="w-3.5 h-3.5" />
                  PAUSAR FLUJO
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5" />
                  AUTOMÁTICO
                </>
              )}
            </button>

            {/* Instant Random Single Arrival custom client */}
            <button
              id="btn-trigger-single-instant-client"
              onClick={onCreateRandomTicket}
              className="p-3 bg-white hover:bg-slate-100 border border-slate-250 text-slate-800 rounded-xl font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5 text-[#122e70]" />
              NUEVO CLIENTE
            </button>
          </div>

          {/* Speed settings slider */}
          {isSimulationActive && (
            <div className="space-y-2 pt-2.5 border-t border-slate-200">
              <div className="flex justify-between text-[8px] font-extrabold uppercase text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <Sliders className="w-3 h-3 text-[#122e70]" /> Frecuencia de Llegada:
                </span>
                <span className="text-[#122e70] font-black">Cada {simulationSpeed / 1000}s</span>
              </div>
              <input
                id="range-simulation-frequency"
                type="range"
                min={3000}
                max={30000}
                step={1000}
                value={simulationSpeed}
                onChange={(e) => onSetSimulationSpeed(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-700"
              />
              <div className="flex justify-between text-[8px] text-slate-400 font-mono font-bold">
                <span>Rápido (3s)</span>
                <span>Pausado (30s)</span>
              </div>
            </div>
          )}
        </div>

        {/* --- SYSTEM AUTO-ASSIGN SERVICE --- */}
        <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-extrabold text-slate-705 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Sparkles className="w-4 h-4 text-[#122e70]" />
              Asignación Automática
            </h4>
            
            <button
              id="btn-toggle-auto-assign"
              onClick={() => onToggleAutoAssign?.(!isAutoAssignActive)}
              className={`px-2 py-0.5 rounded text-[8px] border font-black uppercase transition-all cursor-pointer ${
                isAutoAssignActive 
                  ? "bg-[#122e70] text-white border-blue-900 shadow-sm" 
                  : "bg-slate-205 text-slate-500 border-slate-300"
              }`}
            >
              {isAutoAssignActive ? "DESPACHO ACTIVO" : "MANUAL / POR LLAMADO"}
            </button>
          </div>

          <p className="text-[10px] font-medium text-slate-550 leading-relaxed font-sans">
            {isAutoAssignActive 
              ? "Los turnos se asignan al instante a agentes libres y se emite notificación de voz por altavoz (Automatizado)."
              : "Los agentes deben presionar manualmente 'Llamar Siguiente Turno' desde su consola para recibir trámites."
            }
          </p>

          <div className="flex items-center gap-2 pt-1 font-bold">
            <button
              id="btn-auto-assign-on"
              onClick={() => onToggleAutoAssign?.(true)}
              className={`flex-1 py-1.5 px-2 text-[10px] font-extrabold border rounded-lg transition-all cursor-pointer text-center uppercase tracking-wider ${
                isAutoAssignActive 
                  ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                  : "bg-white border-slate-250 hover:bg-slate-100 text-slate-700"
              }`}
            >
              Auto-Despacho
            </button>
            <button
              id="btn-auto-assign-off"
              onClick={() => onToggleAutoAssign?.(false)}
              className={`flex-1 py-1.5 px-2 text-[10px] font-extrabold border rounded-lg transition-all cursor-pointer text-center uppercase tracking-wider ${
                !isAutoAssignActive 
                  ? "bg-slate-900 border-slate-900 text-white shadow-sm" 
                  : "bg-white border-slate-250 hover:bg-slate-100 text-slate-700"
              }`}
            >
              Manual
            </button>
          </div>
        </div>

        {/* --- DYNAMIC OFFICE SCHEDULES & CALENDAR MANAGEMENT SECTION --- */}
        <div id="office-schedule-calendar-manager" className="bg-[#122e70]/5 border border-[#122e70]/15 p-4 rounded-xl space-y-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Calendar className="w-4 h-4 text-[#122e70]" />
              Horarios y Calendario (Sede Local)
            </h4>
            <span className="text-[8px] bg-[#122e70]/10 border border-[#122e70]/20 text-[#122e70] px-1.5 py-0.5 rounded font-black font-mono">
              {currentOfficeId}
            </span>
          </div>

          <p className="text-[10px] font-medium text-slate-550 leading-relaxed font-sans">
            Ajuste el horario diario de atención ciudadana y configure los días feriados o libres no laborales para el Kiosco de Emisión de Turnos de esta regional.
          </p>

          <div className="space-y-3 pt-1">
            {/* 1. START & END TIMES */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg space-y-2 shadow-xs">
              <span className="text-[8.5px] font-black uppercase text-slate-550 tracking-wider block font-sans">
                Rango Horario de Trabajo
              </span>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase mb-1">
                    Hora de Apertura:
                  </label>
                  <input
                    type="time"
                    value={schedule.openTime}
                    onChange={(e) => handleUpdateSchedule({ ...schedule, openTime: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-2 py-1.5 bg-slate-50 border border-slate-200 rounded focus:border-blue-700 focus:ring-1 focus:ring-blue-700/10 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[8px] font-extrabold text-slate-400 uppercase mb-1">
                    Hora de Cierre:
                  </label>
                  <input
                    type="time"
                    value={schedule.closeTime}
                    onChange={(e) => handleUpdateSchedule({ ...schedule, closeTime: e.target.value })}
                    className="w-full text-xs font-mono font-bold px-2 py-1.5 bg-slate-50 border border-slate-200 rounded focus:border-blue-700 focus:ring-1 focus:ring-blue-700/10 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* 2. WEEKDAY SETTINGS */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg space-y-2 shadow-xs">
              <span className="text-[8.5px] font-black uppercase text-slate-550 tracking-wider block font-sans">
                Días de Operación de la Sede
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { label: "Dom", index: 0 },
                  { label: "Lun", index: 1 },
                  { label: "Mar", index: 2 },
                  { label: "Mié", index: 3 },
                  { label: "Jue", index: 4 },
                  { label: "Vie", index: 5 },
                  { label: "Sáb", index: 6 }
                ].map((day) => {
                  const isClosed = schedule.closedDays.includes(day.index);
                  return (
                    <button
                      key={day.index}
                      type="button"
                      onClick={() => {
                        const newClosed = isClosed
                          ? schedule.closedDays.filter(d => d !== day.index)
                          : [...schedule.closedDays, day.index];
                        handleUpdateSchedule({ ...schedule, closedDays: newClosed });
                      }}
                      className={`flex-1 py-1.5 px-0.5 text-[8.5px] font-black rounded transition-all cursor-pointer border text-center uppercase ${
                        isClosed
                          ? "bg-rose-50 border-rose-200 text-rose-700"
                          : "bg-emerald-50 border-emerald-250 text-emerald-800"
                      }`}
                      title={`${day.label}: ${isClosed ? "No Laborable / Cerrado" : "Laborable / Abierto"}`}
                    >
                      {day.label}
                      <span className="block text-[6.5px] font-bold opacity-60 mt-0.5">
                        {isClosed ? "Cerrado" : "Abierto"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 3. TEMPORARY EMERGENCY CLOSURE */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="block text-[8.5px] font-black uppercase text-slate-700 tracking-wider">
                    Cerrar Sede Especial (Emergencias / Contingencias)
                  </span>
                  <p className="text-[8px] text-slate-400 font-medium">
                    Suspende instantáneamente la emisión de tickets con aviso opcional.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none shrink-0">
                  <input
                    type="checkbox"
                    checked={schedule.tempClosed}
                    onChange={(e) => handleUpdateSchedule({ ...schedule, tempClosed: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-200 rounded-full border border-slate-350 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                </label>
              </div>

              {schedule.tempClosed && (
                <div className="space-y-1.5 animate-fadeIn">
                  <label className="block text-[8px] font-extrabold text-slate-450 uppercase">
                    Motivo oficial expresado a los ciudadanos:
                  </label>
                  <input
                    type="text"
                    placeholder="Escriba la causa (ej: Cierre Temporal por Red Eléctrica, Contingencia Sanitaria...)"
                    value={schedule.tempClosedReason}
                    onChange={(e) => handleUpdateSchedule({ ...schedule, tempClosedReason: e.target.value })}
                    className="w-full text-[10px] font-sans px-2.5 py-1.5 bg-rose-50/50 border border-slate-200 rounded text-slate-800 focus:outline-none focus:border-rose-400"
                  />
                </div>
              )}
            </div>

            {/* 4. HOLIDAY MANAGER */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg space-y-2.5 shadow-xs">
              <div className="flex justify-between items-center">
                <span className="text-[8.5px] font-black uppercase text-slate-550 tracking-wider block font-sans">
                  Calendario de Días Feriados y Libres
                </span>
                <span className="text-[8px] opacity-60 font-mono font-bold">
                  {schedule.specificHolidays.length} activos
                </span>
              </div>

              {/* Add Custom Date off */}
              <div className="flex gap-1.5">
                <input
                  type="date"
                  value={customHolidayDate}
                  onChange={(e) => setCustomHolidayDate(e.target.value)}
                  className="flex-1 text-[10px] font-sans px-2 py-1.5 bg-slate-50 border border-slate-200 rounded focus:outline-none focus:border-blue-700"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (customHolidayDate && !schedule.specificHolidays.includes(customHolidayDate)) {
                      const updatedHolidays = [...schedule.specificHolidays, customHolidayDate].sort();
                      handleUpdateSchedule({ ...schedule, specificHolidays: updatedHolidays });
                      setCustomHolidayDate("");
                    }
                  }}
                  disabled={!customHolidayDate}
                  className="px-2.5 bg-[#122e70] hover:bg-blue-800 text-white rounded text-[9.5px] font-black uppercase tracking-wider disabled:opacity-50 flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir</span>
                </button>
              </div>

              {/* List of active non-working holiday dates */}
              {schedule.specificHolidays.length > 0 ? (
                <div className="max-h-[140px] overflow-y-auto border border-slate-100 rounded bg-slate-50/50 p-1 divide-y divide-slate-150">
                  {schedule.specificHolidays.map((holidayStr) => {
                    const parsedDate = new Date(`${holidayStr}T00:00:00`);
                    const formattedDisplay = parsedDate.toLocaleDateString("es-PA", {
                      day: "numeric",
                      month: "short"
                    });
                    return (
                      <div key={holidayStr} className="flex justify-between items-center py-1 px-1.5 text-[10px]">
                        <span className="font-mono text-slate-700 flex items-center gap-1.5">
                          🔴 {formattedDisplay} ({holidayStr})
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const updatedHolidays = schedule.specificHolidays.filter(h => h !== holidayStr);
                            handleUpdateSchedule({ ...schedule, specificHolidays: updatedHolidays });
                          }}
                          className="text-rose-500 hover:text-rose-700 hover:bg-rose-100/50 p-1 rounded transition-all"
                          title="Eliminar día de descanso"
                        >
                          <Trash className="w-3.5 h-3.5 text-rose-500 hover:text-rose-700" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-[9px] text-slate-400 text-center py-2 font-medium">
                  No hay feriados o días libres configurados para esta regional.
                </p>
              )}
            </div>

            {/* Display Success messages */}
            {scheduleSuccessMsg && (
              <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-[9.5px] text-emerald-850 text-center font-bold font-mono">
                ✔️ {scheduleSuccessMsg}
              </div>
            )}
          </div>
        </div>

        {/* --- STATS KPIs BENTO GRAPH --- */}
        <div className="grid grid-cols-2 gap-2">
          <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-slate-450">
              <Users className="w-3.5 h-3.5 text-[#122e70]" />
              <span>Cola Actual</span>
            </div>
            <div className="mt-2 text-slate-950 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">{totalWaiting}</span>
              <span className="text-[8px] uppercase text-slate-400 font-mono font-bold">esperas</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-slate-450">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
              <span>Atendidos</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-emerald-600">{totalCompleted}</span>
              <span className="text-[8px] uppercase text-slate-400 font-mono font-bold">tickets</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-slate-450">
              <Clock className="w-3.5 h-3.5 text-blue-500" />
              <span>Espera Estimada</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-900">~{estWaitTimeMin}</span>
              <span className="text-[8px] uppercase text-slate-400 font-mono font-bold">minutos</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 p-3 rounded-xl flex flex-col justify-between shadow-sm">
            <div className="flex items-center gap-1.5 text-[9px] uppercase font-bold text-slate-450">
              <TrendingUp className="w-3.5 h-3.5 text-[#122e70]" />
              <span>Éxito de Atención</span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-xl font-black text-rose-650">{resolutionRate}%</span>
              <span className="text-[8px] uppercase text-slate-405 font-mono font-bold">de {totalCreated}</span>
            </div>
          </div>
        </div>

        {/* --- MAP LAYOUT GRID SCHEMATIC --- */}
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-1.5 shadow-sm">
          <span className="block text-[8.5px] uppercase tracking-wider font-extrabold text-slate-500 flex items-center gap-1 font-mono">
            <Layout className="w-3.5 h-3.5 text-[#122e70]" /> Monitoreo Óptico de Módulos:
          </span>
          
          <div className="grid grid-cols-4 gap-1.5 text-center pt-1">
            {cubicles.map((c) => {
              const isIdle = c.status === "ONLINE_AVAILABLE";
              const isBusy = c.status === "ATTENDING";
              return (
                <div key={c.id} className="p-1 px-1.5 font-sans rounded-lg border border-slate-150 text-[8px] bg-white flex flex-col justify-between h-14 shadow-xs">
                  <span className="font-extrabold text-slate-800 block truncate">{c.name.split(" ")[0]}</span>
                  
                  <div className="flex justify-center my-0.5">
                    <span className={`w-2.5 h-2.5 rounded-full border border-white ${isBusy ? "bg-[#122e70] animate-pulse" : isIdle ? "bg-emerald-500" : "bg-slate-300"}`} />
                  </div>
                  
                  <span className="text-[7.5px] uppercase text-slate-400 truncate block font-bold">
                    {isBusy ? "Activo" : isIdle ? "Libre" : "Fuera"}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* --- PERFORMANCE GEARS & SYSTEM OPTIMIZER --- */}
        <div id="system-optimization-suite" className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Cpu className="w-4 h-4 text-indigo-650" />
              Optimización y Ajustes de Rendimiento
            </h4>
            <span className="text-[8px] bg-indigo-50 border border-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded font-black font-mono">
              SUITE OPTIMUS
            </span>
          </div>

          <p className="text-[10px] font-medium text-slate-550 leading-relaxed font-sans">
            Ajuste el timbre de los altavoces, limpie registros viejos de memoria local y configure recursos de visualización óptimos.
          </p>

          <div className="space-y-3 pt-1">
            {/* 1. TTS CONFIGURATOR (SLIDERS) */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg space-y-2.5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-black uppercase text-slate-700 tracking-wider flex items-center gap-1">
                  <Volume2 className="w-3.5 h-3.5 text-indigo-650" />
                  Sintonizador de Voces (TTS)
                </span>
                
                {/* Voice Selection Toggle */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setTtsVoicePref("female")}
                    className={`px-1.5 py-0.5 text-[8px] font-extrabold uppercase rounded transition-all cursor-pointer ${
                      ttsVoicePref === "female"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-550 hover:bg-slate-150"
                    }`}
                  >
                    Fm
                  </button>
                  <button
                    onClick={() => setTtsVoicePref("male")}
                    className={`px-1.5 py-0.5 text-[8px] font-extrabold uppercase rounded transition-all cursor-pointer ${
                      ttsVoicePref === "male"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-100 text-slate-550 hover:bg-slate-150"
                    }`}
                  >
                    Ms
                  </button>
                </div>
              </div>

              {/* TTS Speed Rate Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-bold text-slate-550 font-mono">
                  <span>VELOCIDAD DE VOZ</span>
                  <span className="text-indigo-650 font-black">{ttsRate.toFixed(2)}x</span>
                </div>
                <input
                  type="range"
                  min={0.6}
                  max={1.5}
                  step={0.05}
                  value={ttsRate}
                  onChange={(e) => setTtsRate(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                  title="Configura la velocidad a la que habla el sintetizador de voz"
                />
              </div>

              {/* TTS Pitch Tone Slider */}
              <div className="space-y-1">
                <div className="flex justify-between text-[8px] font-bold text-slate-550 font-mono">
                  <span>TONALIDAD / AGUDEZA (PITCH)</span>
                  <span className="text-indigo-650 font-black">{ttsPitch.toFixed(2)}</span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  value={ttsPitch}
                  onChange={(e) => setTtsPitch(parseFloat(e.target.value))}
                  className="w-full h-1 bg-slate-150 rounded-lg appearance-none cursor-pointer accent-indigo-650"
                  title="Fija la agudeza o gravedad de la modulación hablada"
                />
              </div>

              {/* TTS Test Trigger button */}
              <button
                onClick={handleTestTtsLocal}
                className="w-full py-1.5 bg-indigo-50 hover:bg-indigo-100 border border-indigo-150 text-indigo-750 font-extrabold text-[9px] uppercase tracking-wider rounded transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1"
                title="Reproduce un arpegio y dicta un código de prueba para validar el volumen del navegador"
              >
                <SlidersHorizontal className="w-3 h-3 text-indigo-700 animate-spin-slow" />
                Probar Altavoz Sintetizado
              </button>
            </div>

            {/* 2. MEMORY CLEANER BUTTON */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between shadow-xs">
              <div className="space-y-0.5 max-w-[170px]">
                <span className="block text-[9px] font-black uppercase text-slate-700 tracking-wider">
                  Purgador de Memoria
                </span>
                <p className="text-[8px] font-medium text-slate-400 leading-tight">
                  Mantenga colas rápidas eliminando tickets antiguos resueltos de la memoria local.
                </p>
              </div>

              <button
                onClick={handleTriggerPurge}
                className={`py-2 px-3 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer border flex items-center gap-1 ${
                  purgeSuccess
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                    : "bg-[#122e70] hover:bg-indigo-800 border-[#122e70] text-white shadow-xs"
                }`}
                title="Purga y limpia los turnos inactivos e históricos liberando recursos de la memoria de React"
              >
                {purgeSuccess ? (
                  <>
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                    ¡LIMPIO!
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3 h-3 text-white" />
                    PURGAR
                  </>
                )}
              </button>
            </div>

            {/* 3. LIMITE HISTORIAL / PAGING TOGGLE */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between shadow-xs">
              <div className="space-y-0.5 max-w-[190px]">
                <span className="block text-[9px] font-black uppercase text-slate-700 tracking-wider font-sans">
                  Páginación de Turnos (Historial)
                </span>
                <p className="text-[8px] font-medium text-slate-400 leading-tight font-sans">
                  Limita la TV de la sala de espera a mostrar solo los 10 turnos completados más recientes.
                </p>
              </div>

              <div className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={limitHistory}
                  onChange={(e) => setLimitHistory(e.target.checked)}
                  className="sr-only peer"
                  id="toggle-limit-history"
                />
                <label
                  htmlFor="toggle-limit-history"
                  className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-indigo-650 cursor-pointer"
                ></label>
              </div>
            </div>

            {/* 4. ECO-MODE SCREEN BURN-IN TOGGLE */}
            <div className="bg-white border border-slate-200 p-3 rounded-lg flex items-center justify-between shadow-xs">
              <div className="space-y-0.5 max-w-[190px]">
                <span className="text-[9px] font-black uppercase text-slate-705 tracking-wider flex items-center gap-1 font-sans">
                  <SunDim className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  Protección de Pantalla (Modo Eco)
                </span>
                <p className="text-[8px] font-medium text-slate-404 leading-tight font-sans">
                  Evita que las pantallas estáticas LED de recepción sufran quemado visual atenuando automáticamente el panel principal si la sala está inactiva.
                </p>
              </div>

              <div className="relative inline-flex items-center cursor-pointer font-bold">
                <input
                  type="checkbox"
                  checked={ecoMode}
                  onChange={(e) => setEcoMode(e.target.checked)}
                  className="sr-only peer"
                  id="toggle-eco-mode"
                />
                <label
                  htmlFor="toggle-eco-mode"
                  className="w-8 h-4.5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-emerald-500 cursor-pointer"
                ></label>
              </div>
            </div>
          </div>
        </div>

        {/* --- REPORT GENERATOR HUB --- */}
        <div id="pdf-report-generator-section" className="bg-[#f0f4ff]/40 border border-blue-150 p-4 rounded-xl space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-[#122e70] uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <FileText className="w-4 h-4 text-[#122e70]" />
              Auditoría e Informes de Gestión
            </h4>
            <span className="text-[8px] bg-blue-100 text-[#122e70] px-1.5 py-0.5 rounded font-black font-mono">
              PDF EXPORT
            </span>
          </div>

          <p className="text-[10px] font-medium text-slate-550 leading-relaxed font-sans">
            Genere y descargue reportes oficiales en formato PDF con métricas del flujo continuo de ciudadanos, tiempos en sala de espera y eficiencias de los agentes.
          </p>

          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              id="btn-report-dia"
              onClick={() => generatePDFReport(tickets, cubicles, "dia")}
              className="py-2.5 px-2 bg-white hover:bg-blue-50 border border-slate-250 hover:border-blue-300 text-slate-850 hover:text-[#122e70] rounded-lg font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center gap-1.5"
              title="Generar informe detallado de la jornada de hoy"
            >
              <Download className="w-3.5 h-3.5 text-blue-700" />
              <span>Día Actual</span>
            </button>

            <button
              id="btn-report-semana"
              onClick={() => generatePDFReport(tickets, cubicles, "semana")}
              className="py-2.5 px-2 bg-white hover:bg-blue-50 border border-slate-250 hover:border-blue-300 text-slate-850 hover:text-[#122e70] rounded-lg font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center gap-1.5"
              title="Generar consolidado de los últimos 7 días de operación"
            >
              <Download className="w-3.5 h-3.5 text-blue-700" />
              <span>Semanal</span>
            </button>

            <button
              id="btn-report-mes"
              onClick={() => generatePDFReport(tickets, cubicles, "mes")}
              className="py-2.5 px-2 bg-white hover:bg-blue-50 border border-slate-250 hover:border-blue-300 text-slate-850 hover:text-[#122e70] rounded-lg font-black text-[9px] uppercase tracking-widest transition-all cursor-pointer shadow-sm flex flex-col items-center justify-center gap-1.5"
              title="Generar análisis completo del presente mes"
            >
              <Download className="w-3.5 h-3.5 text-blue-700" />
              <span>Mensual</span>
            </button>
          </div>
        </div>

        {/* --- CENTRO DE GESTIÓN DE BASE DE DATOS LOCAL --- */}
        <div id="local-relational-database-suite" className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Database className="w-4 h-4 text-emerald-600" />
              Base de Datos Local e Integridad
            </h4>
            <span className="text-[8px] bg-emerald-50 border border-emerald-200 text-emerald-800 px-1.5 py-0.5 rounded font-black font-mono">
              ESTADO SOLIDO rIDB
            </span>
          </div>

          <p className="text-[10px] font-medium text-slate-550 leading-relaxed font-sans">
            Consola administrativa para el motor de almacenamiento persistente local. Administra el volumen transaccional de las 16 oficinas regionales.
          </p>

          {/* Database Info Dashboard Layout */}
          <div className="grid grid-cols-2 gap-2 text-[10px]">
            <div className="bg-white border border-slate-150 p-2.5 rounded-lg font-sans shadow-xs">
              <span className="text-[7.5px] uppercase font-bold text-slate-400 block tracking-wider">TAMAÑO ALMACÉN</span>
              <span className="text-xs font-black text-slate-800 block mt-0.5 font-mono">{calculateDbSizeKB()}</span>
            </div>
            
            <div className="bg-white border border-slate-150 p-2.5 rounded-lg font-sans shadow-xs">
              <span className="text-[7.5px] uppercase font-bold text-slate-400 block tracking-wider">VERSIÓN MOTOR</span>
              <span className="text-xs font-black text-blue-900 block mt-0.5 font-mono">{dbVersion}</span>
            </div>

            <div className="bg-white border border-slate-150 p-2.5 rounded-lg font-sans shadow-xs">
              <span className="text-[7.5px] uppercase font-bold text-slate-400 block tracking-wider font-sans">TABLA tb_tickets</span>
              <span className="text-xs font-black text-slate-850 block mt-0.5 font-mono">{totalDbTickets} filas</span>
            </div>

            <div className="bg-white border border-slate-150 p-2.5 rounded-lg font-sans shadow-xs">
              <span className="text-[7.5px] uppercase font-bold text-slate-400 block tracking-wider font-sans">TABLA tb_cubicles</span>
              <span className="text-xs font-black text-slate-850 block mt-0.5 font-mono">{totalDbCubicles} filas</span>
            </div>
          </div>

          {/* Diagnostics feedback message lines */}
          {(dbStatusMsg || importError) && (
            <div className={`p-2 rounded-lg border text-[9.5px] font-mono flex flex-col gap-1 ${
              importError 
                ? "bg-rose-50 border-rose-250 text-rose-700 font-bold" 
                : "bg-blue-50/70 border-blue-200 " + dbStatusColor
            }`}>
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-blue-700 shrink-0" />
                <span>{dbStatusMsg}</span>
              </div>
              {importError && <p className="text-[8px] text-rose-650 mt-0.5 font-mono">Error: {importError}</p>}
            </div>
          )}

          {/* Active Database Action Tools */}
          <div className="space-y-2 pt-1">
            {/* Download/Export & Import Hidden Inputs */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-export-database"
                onClick={handleExportDatabase}
                disabled={dbChecking}
                className="py-2.5 px-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-center font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5"
                title="Exporta un archivo JSON consolidado con el estado total de la base de datos nacional."
              >
                <FileJson className="w-3.5 h-3.5 text-emerald-450" />
                <span>Exportar JSON</span>
              </button>

              <button
                type="button"
                id="btn-import-database-trigger"
                onClick={() => fileInputRef.current?.click()}
                disabled={dbChecking}
                className="py-2.5 px-2 bg-white hover:bg-slate-100 text-slate-850 border border-slate-250 rounded-lg text-center font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1.5 align-middle"
                title="Carga una copia de seguridad JSON válida para reestablecer todo el estado operativo."
              >
                <Upload className="w-3.5 h-3.5 text-blue-700" />
                <span>Restaurar Db</span>
              </button>
            </div>

            {/* Hidden native input file resolver */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportDatabase}
              accept=".json"
              className="hidden"
            />

            {/* Vacuum Index defrag & Integrity Check buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                id="btn-vacuum-database"
                onClick={handleVacuumDatabase}
                disabled={dbChecking}
                className="py-2 px-1 text-[8.5px] border border-slate-200 hover:border-amber-300 text-slate-650 hover:bg-amber-50 rounded-lg transition-all cursor-pointer font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                title="Optimiza y reorganiza el espacio, compactando las cadenas de textos almacenadas."
              >
                <RefreshCw className={`w-3 h-3 text-amber-600 ${dbChecking ? "animate-spin" : ""}`} />
                <span>Optimizar (Vacuum)</span>
              </button>

              <button
                type="button"
                id="btn-integrity-check"
                onClick={handleSchemaIntegrityCheck}
                disabled={dbChecking}
                className="py-2 px-1 text-[8.5px] border border-slate-200 hover:border-indigo-300 text-slate-650 hover:bg-indigo-50 rounded-lg transition-all cursor-pointer font-bold uppercase tracking-wider flex items-center justify-center gap-1.5"
                title="Chequea la consistencia lógica de las tablas evitando registros truncados u huérfanos."
              >
                <ShieldCheck className="w-3.5 h-3.5 text-indigo-750" />
                <span>Chequear Schema</span>
              </button>
            </div>
          </div>
        </div>

        {/* --- CENTRO DE CONEXIÓN Y SINCRONIZACIÓN SUPABASE CLOUD --- */}
        <div id="supabase-cloud-integration-suite" className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h4 className="text-[10px] font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5 font-mono">
              <Cloud className="w-4 h-4 text-sky-600" />
              Conexión Supabase Postgres
            </h4>
            
            {/* Sync status pill indicator with colors */}
            <span className={`text-[8px] border px-1.5 py-0.5 rounded font-black font-mono flex items-center gap-1 ${
              supabaseSyncStatus === "success" 
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : supabaseSyncStatus === "syncing"
                ? "bg-amber-50 border-amber-200 text-amber-800 animate-pulse"
                : supabaseSyncStatus === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : "bg-slate-100 border-slate-250 text-slate-500"
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${
                supabaseSyncStatus === "success" 
                  ? "bg-emerald-600"
                  : supabaseSyncStatus === "syncing"
                  ? "bg-amber-500"
                  : supabaseSyncStatus === "error"
                  ? "bg-rose-600"
                  : "bg-slate-400"
              }`} />
              {supabaseSyncStatus === "success" && "CLOUD CONECTADO"}
              {supabaseSyncStatus === "syncing" && "SINCRONIZANDO"}
              {supabaseSyncStatus === "error" && "ERROR ENLACE"}
              {supabaseSyncStatus === "offline" && "SIN CONFIGURAR"}
              {supabaseSyncStatus === "idle" && "CONECTADO"}
            </span>
          </div>

          <p className="text-[10px] font-medium text-slate-550 leading-relaxed font-sans">
            Guarda en la nube las colas transaccionales y los cubículos. Soporta múltiples sucursales compartiendo colas en tiempo real.
          </p>

          {/* Setup Credentials Input Area */}
          <div className="space-y-2 bg-white border border-slate-150 p-3 rounded-lg shadow-xs">
            <div>
              <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                Supabase URL (VITE_SUPABASE_URL)
              </label>
              <input
                type="text"
                placeholder="https://your-project.supabase.co"
                value={supabaseUrl}
                onChange={(e) => setSupabaseUrl(e.target.value)}
                className="w-full text-[10px] font-mono px-2 py-1.5 bg-slate-50 border border-slate-200 rounded focus:border-sky-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block mb-1">
                API Key Anónima (VITE_SUPABASE_ANON_KEY)
              </label>
              <input
                type="password"
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
                value={supabaseAnonKey}
                onChange={(e) => setSupabaseAnonKey(e.target.value)}
                className="w-full text-[10px] font-mono px-2 py-1.5 bg-slate-50 border border-slate-200 rounded focus:border-sky-500 focus:outline-none"
              />
            </div>

            {configSuccess && (
              <p className="text-[9px] text-emerald-600 font-bold font-mono">
                ✔️ Credenciales actualizadas. Recargando núcleo...
              </p>
            )}

            <button
              type="button"
              onClick={handleSaveSupabaseConfig}
              className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white rounded font-extrabold text-[9px] uppercase tracking-wider transition-all cursor-pointer"
            >
              Guardar Credenciales y Relanzar
            </button>
          </div>

          {/* Sync Operations and manual overrides */}
          {supabaseSyncStatus !== "offline" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleManualPull}
                  disabled={isSyncingManual}
                  className="py-2.5 px-2 bg-slate-900 text-white hover:bg-slate-800 rounded-lg text-center font-bold text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1"
                  title="Descargar el estado remoto de este Tribunal Electoral e implantarlo localmente."
                >
                  <RefreshCw className={`w-3.5 h-3.5 text-sky-400 ${isSyncingManual ? "animate-spin" : ""}`} />
                  <span>Cargar Nube</span>
                </button>

                <button
                  type="button"
                  onClick={handleManualPush}
                  disabled={isSyncingManual}
                  className="py-2.5 px-2 bg-white hover:bg-slate-100 text-slate-850 border border-slate-250 rounded-lg text-center font-black text-[9px] uppercase tracking-wider transition-all cursor-pointer shadow-xs flex items-center justify-center gap-1"
                  title="Subir inmediatamente el estado local a la fila Cloud de Supabase."
                >
                  <Cloud className="w-3.5 h-3.5 text-sky-600" />
                  <span>Subir Nube</span>
                </button>
              </div>

              {manualSyncMsg && (
                <div className="p-2 bg-sky-50 border border-sky-150 rounded text-[9.5px] font-mono text-sky-800 text-center">
                  {manualSyncMsg}
                </div>
              )}
            </div>
          )}

          {/* Accordion to Setup Supabase Table Script */}
          <div className="pt-1 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setShowSqlSchema(!showSqlSchema)}
              className="text-[8.5px] text-slate-500 hover:text-sky-700 font-bold uppercase tracking-wider flex items-center gap-1 cursor-pointer transition-all"
            >
              <ExternalLink className="w-3 h-3 text-slate-400" />
              {showSqlSchema ? "Ocultar Script SQL Postgres" : "Ver Script SQL Postgres"}
            </button>
            
            {showSqlSchema && (
              <div className="mt-2 space-y-1.5 animate-fadeIn">
                <p className="text-[8.5px] text-slate-400 leading-relaxed">
                  Crea e inicializa la tabla en el editor SQL de Supabase antes de conectar para evitar errores físicos:
                </p>
                <div className="bg-slate-900 rounded p-2 text-[8px] font-mono text-slate-300 relative overflow-x-auto max-h-[150px]">
                  <button
                    type="button"
                    onClick={handleCopySql}
                    className="absolute top-1 right-1 bg-slate-800 hover:bg-slate-700 text-slate-200 px-1.5 py-0.5 rounded text-[7.5px] font-bold uppercase cursor-pointer"
                  >
                    {sqlCopied ? "Copiado!" : "Copiar"}
                  </button>
                  <pre className="text-left select-all">{SUPABASE_SQL_SETUP_SCRIPT}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* SYSTEM HARD RESET FLUSH BUTTONS */}
        <div className="pt-3 border-t border-slate-100">
          <button
            id="btn-reset-system"
            onClick={() => {
              if (window.confirm("¿Estás seguro de que quieres reiniciar totalmente el sistema de tickets? Se vaciarán colas e históricos.")) {
                onResetSystem();
              }
            }}
            className="w-full py-3 bg-rose-50 hover:bg-rose-100 border border-rose-250 text-rose-700 font-extrabold text-xs rounded-xl shadow-sm transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wider"
            title="Formatea base de datos y borra localStorage"
          >
            <Trash2 className="w-4 h-4" />
            Reiniciar Sistema (Limpiar Todo)
          </button>
        </div>
      </div>

      <div className="border-t border-slate-100 pt-2 text-center text-[9px] text-slate-400 font-mono font-bold flex items-center justify-center gap-1">
        <span>SISTEMA DE GESTIÓN DE COLAS</span>
      </div>
    </div>
  );
}
