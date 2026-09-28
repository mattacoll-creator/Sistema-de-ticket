import React, { useState, useMemo } from "react";
import { Ticket, OFFICES_CONFIG } from "../types";
import { FileText, Search, Filter, ClipboardList, RefreshCw, Eye, Download } from "lucide-react";

interface TicketTransactionLogsProps {
  officeTickets: Record<string, Ticket[]>;
}

interface AuditLogEntry {
  id: string;
  timestamp: number;
  ticketCode: string;
  ticketName: string;
  officeId: string;
  officeName: string;
  action: "CREACION" | "LLAMADA" | "ATENCION" | "COMPLETADO";
  message: string;
  rawTicket: Ticket;
  waitTimeMin: number;
  exceededSLA: boolean;
}

export default function TicketTransactionLogs({ officeTickets }: TicketTransactionLogsProps) {
  const [filterAction, setFilterAction] = useState<string>("TODAS");
  const [filterOffice, setFilterOffice] = useState<string>("TODAS");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<AuditLogEntry | null>(null);

  // --- RECONSTRUIR LOG HISTÓRICO DE TRANSACCIONES DESDE LA DATA ---
  const auditLogs = useMemo((): AuditLogEntry[] => {
    const logs: AuditLogEntry[] = [];

    Object.keys(officeTickets).forEach(officeId => {
      const ticketsList = officeTickets[officeId] || [];
      const officeObj = OFFICES_CONFIG.find(o => o.id === officeId);
      const officeName = officeObj ? officeObj.name.replace("Tribunal Electoral de Panamá", "TE") : officeId;

      ticketsList.forEach(t => {
        const start = t.createdAt;
        const end = t.calledAt || t.completedAt || Date.now();
        const waitTimeMin = Math.max(0, (end - start) / 60000);
        const exceededSLA = waitTimeMin > 45;

        // 1. Log de Creación
        logs.push({
          id: `${t.id}-create`,
          timestamp: t.createdAt,
          ticketCode: t.numberCode,
          ticketName: t.name,
          officeId,
          officeName,
          action: "CREACION",
          message: `Ticket ${t.numberCode} creado para el ciudadano "${t.name}" en trámite prioritario [${t.priority ? "SÍ" : "NO"}]`,
          rawTicket: t,
          waitTimeMin,
          exceededSLA
        });

        // 2. Log de Llamado
        if (t.calledAt) {
          logs.push({
            id: `${t.id}-call`,
            timestamp: t.calledAt,
            ticketCode: t.numberCode,
            ticketName: t.name,
            officeId,
            officeName,
            action: "LLAMADA",
            message: `Ticket ${t.numberCode} llamado a ventanilla activa [Módulo: ${t.assignedCubicleId || "N/A"}]`,
            rawTicket: t,
            waitTimeMin,
            exceededSLA
          });
        }

        // 3. Log de Atención
        if (t.attendedAt) {
          logs.push({
            id: `${t.id}-attend`,
            timestamp: t.attendedAt,
            ticketCode: t.numberCode,
            ticketName: t.name,
            officeId,
            officeName,
            action: "ATENCION",
            message: `Inició atención presencial de ticket ${t.numberCode} en módulo asignado`,
            rawTicket: t,
            waitTimeMin,
            exceededSLA
          });
        }

        // 4. Log de Completado
        if (t.completedAt) {
          logs.push({
            id: `${t.id}-complete`,
            timestamp: t.completedAt,
            ticketCode: t.numberCode,
            ticketName: t.name,
            officeId,
            officeName,
            action: "COMPLETADO",
            message: `Trámite completado satisfactoriamente para ${t.numberCode}. Duración total de ciclo registrada con éxito.`,
            rawTicket: t,
            waitTimeMin,
            exceededSLA
          });
        }
      });
    });

    // Ordenar cronológicamente descendente (más recientes primero)
    return logs.sort((a, b) => b.timestamp - a.timestamp);
  }, [officeTickets]);

  const totalSlaViolations = useMemo(() => {
    return auditLogs.filter(log => log.exceededSLA).length;
  }, [auditLogs]);

  // --- APLICAR FILTROS Y BÚSQUEDA ---
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      const matchAction = filterAction === "TODAS" || log.action === filterAction;
      const matchOffice = filterOffice === "TODAS" || log.officeId === filterOffice;
      
      const query = searchQuery.trim().toLowerCase();
      const matchSearch = !query || 
        log.ticketCode.toLowerCase().includes(query) ||
        log.ticketName.toLowerCase().includes(query) ||
        log.message.toLowerCase().includes(query);

      return matchAction && matchOffice && matchSearch;
    });
  }, [auditLogs, filterAction, filterOffice, searchQuery]);

  // --- EXPORTAR LOGS A JSON ---
  const handleExportJSON = () => {
    try {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(filteredLogs, null, 2));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", `trazabilidad_logs_${Date.now()}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (e) {
      console.error("Error exporting logs:", e);
    }
  };

  const formatLogTime = (ms: number) => {
    const d = new Date(ms);
    return d.toLocaleTimeString("es-PA", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) + 
           "." + String(ms % 1000).padStart(3, "0");
  };

  const getActionBadgeStyle = (action: string) => {
    switch (action) {
      case "CREACION":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "LLAMADA":
        return "bg-amber-100 text-amber-800 border-amber-250";
      case "ATENCION":
        return "bg-cyan-100 text-cyan-800 border-cyan-200";
      case "COMPLETADO":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      default:
        return "bg-slate-100 text-slate-800 border-slate-200";
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm text-left overflow-hidden">
      
      {/* Encabezado */}
      <div className="bg-slate-50/75 border-b border-slate-200 px-6 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#122e70] flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-blue-700 shrink-0" />
            Trazabilidad e Historial Auditado de Transacciones de Tickets
          </h3>
          <p className="text-[10.5px] font-medium text-slate-400">
            Registro secuencial con precisión de milisegundos de todos los eventos de estado del sistema nacional.
          </p>
        </div>

        {/* Notificaciones de Alertas de Tiempo de Espera Crítico */}
        <div className="flex flex-wrap items-center gap-2.5">
          {totalSlaViolations > 0 && (
            <div className="px-3 py-1.5 bg-red-50 border border-red-200 text-red-700 text-[9.5px] font-black uppercase tracking-widest rounded-lg flex items-center gap-1.5 animate-pulse shadow-xxs">
              <span className="w-2 h-2 bg-red-650 rounded-full inline-block shrink-0 animate-ping"></span>
              <span>⚠️ {totalSlaViolations} Alertas SLA Excedidas (&gt;45 min)</span>
            </div>
          )}

          {/* Botón Exportar */}
          <button
            onClick={handleExportJSON}
            className="px-3 py-1.5 bg-[#122e70] hover:bg-blue-800 text-white text-[9.5px] font-black uppercase tracking-widest rounded-lg transition-all cursor-pointer shadow-xs flex items-center gap-1.5 shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Exportar Audit Trail</span>
          </button>
        </div>
      </div>

      {/* Controles de Filtros */}
      <div className="p-5 border-b border-slate-100 grid grid-cols-1 md:grid-cols-12 gap-3 bg-slate-50/20">
        
        {/* Búsqueda */}
        <div className="md:col-span-5 relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Buscar por código, ciudadano o evento..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-blue-500 bg-white"
          />
        </div>

        {/* Filtrar Acción */}
        <div className="md:col-span-3 flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full py-1.5 px-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 font-bold text-slate-750"
          >
            <option value="TODAS">TODAS LAS ACCIONES</option>
            <option value="CREACION">CREACIÓN (TICKET CREADO)</option>
            <option value="LLAMADA">LLAMADO (LLAMANDO A MODULO)</option>
            <option value="ATENCION">ATENCIÓN (EN PROCESO)</option>
            <option value="COMPLETADO">COMPLETADO (CIERRE EXITOSO)</option>
          </select>
        </div>

        {/* Filtrar Oficina */}
        <div className="md:col-span-4 flex items-center gap-2">
          <LandmarkDropdown officeId={filterOffice} onChange={setFilterOffice} />
        </div>

      </div>

      {/* Grid del Listado y Detalle lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-12">
        
        {/* LISTADO DE LOGS */}
        <div className="lg:col-span-7 border-r border-slate-100 max-h-[460px] overflow-y-auto">
          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium uppercase tracking-wider flex flex-col items-center justify-center space-y-2">
              <FileText className="w-8 h-8 text-slate-200" />
              <span>No se encontraron transacciones en el log con los filtros actuales</span>
            </div>
          ) : (
            <table className="w-full text-left text-[11px] font-sans">
              <thead className="bg-slate-50 border-b border-slate-100 sticky top-0 z-10 text-slate-450 uppercase text-[9px] font-black tracking-widest">
                <tr>
                  <th className="px-4 py-2.5">Hora (Mil.)</th>
                  <th className="px-3 py-2.5">Sede</th>
                  <th className="px-3 py-2.5">Acción</th>
                  <th className="px-3 py-2.5">Código</th>
                  <th className="px-3 py-2.5">Detalle</th>
                  <th className="px-2 py-2.5 text-center">Ver</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => {
                  const isExceeded = log.exceededSLA;
                  const isSelected = selectedLog && selectedLog.id === log.id;
                  
                  return (
                    <tr
                      key={log.id}
                      onClick={() => setSelectedLog(log)}
                      className={`cursor-pointer transition-all border-l-4 ${
                        isExceeded 
                          ? isSelected
                            ? "bg-red-100/90 border-l-red-600 font-bold text-red-950"
                            : "bg-red-50/90 hover:bg-red-100/70 border-l-red-650 text-red-900"
                          : isSelected
                            ? "bg-blue-50/50 border-l-blue-600 font-medium"
                            : "hover:bg-slate-50 border-l-transparent"
                      }`}
                    >
                      <td className="px-4 py-2.5 font-mono text-slate-500 whitespace-nowrap">
                        {formatLogTime(log.timestamp)}
                      </td>
                      <td className="px-3 py-2.5 font-extrabold text-[#122e70] whitespace-nowrap">
                        {log.officeId}
                      </td>
                      <td className="px-3 py-2.5 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[8.5px] font-black tracking-wider border ${getActionBadgeStyle(log.action)}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 font-black whitespace-nowrap">
                        <span className={isExceeded ? "text-red-750 font-black" : "text-slate-800"}>
                          {log.ticketCode}
                        </span>
                      </td>
                      <td className="px-3 py-2.5 truncate max-w-[200px]" title={log.message}>
                        <div className="flex items-center gap-1.5">
                          {isExceeded && (
                            <span className="bg-red-600 text-white text-[7.5px] font-black uppercase px-1 py-0.5 rounded shrink-0 animate-pulse tracking-wide font-mono">
                              CRÍTICO {log.waitTimeMin.toFixed(0)}m
                            </span>
                          )}
                          <span className={isExceeded ? "text-red-950 font-medium" : "text-slate-600"}>
                            {log.message}
                          </span>
                        </div>
                      </td>
                      <td className="px-2 py-2.5 text-center whitespace-nowrap">
                        <button className={`p-1 ${isExceeded ? "text-red-700 hover:text-red-900" : "text-blue-600 hover:text-blue-800"}`}>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* PANEL DETALLADO DE TRAZABILIDAD (DEBUGER) */}
        <div className="lg:col-span-5 bg-slate-50/50 p-5 flex flex-col justify-between max-h-[460px] overflow-y-auto">
          {selectedLog ? (
            <div className="space-y-4">
              <div className="border-b border-slate-200 pb-3 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase text-[#122e70] tracking-wider">
                  Inspección de Estado y Trazabilidad
                </span>
                <span className="text-[8px] bg-slate-900 text-white px-2 py-0.5 rounded font-mono uppercase font-black">
                  Audit ID: {selectedLog.id.split("-")[1]}
                </span>
              </div>

              {/* Ficha técnica resumida */}
              <div className="bg-white border border-slate-200 rounded-xl p-3.5 space-y-2.5 text-[10.5px]">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Código Ticket</span>
                    <span className="font-black text-slate-800 text-xs">{selectedLog.ticketCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Ciudadano</span>
                    <span className="font-extrabold text-slate-850 truncate block">{selectedLog.ticketName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Oficina de Registro</span>
                    <span className="font-extrabold text-[#122e70]">{selectedLog.officeId}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[9px] uppercase font-bold">Timestamp Exacto</span>
                    <span className="font-mono text-slate-600 font-bold">{selectedLog.timestamp}</span>
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-2">
                  <span className="text-slate-400 block text-[9px] uppercase font-bold">Mensaje Descriptivo</span>
                  <span className="font-medium text-slate-700 leading-normal block italic">{selectedLog.message}</span>
                </div>
              </div>

              {/* Historial de fases del ticket */}
              <div className="space-y-2">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-450 block">Historial de Fases Asociadas</span>
                <div className="bg-slate-900 text-amber-400 font-mono text-[9.5px] p-3.5 rounded-xl border border-slate-800 max-h-[160px] overflow-auto leading-relaxed">
                  <pre>{JSON.stringify({
                    id: selectedLog.rawTicket.id,
                    numberCode: selectedLog.rawTicket.numberCode,
                    currentPhase: selectedLog.rawTicket.currentPhase,
                    status: selectedLog.rawTicket.status,
                    createdAt: new Date(selectedLog.rawTicket.createdAt).toISOString(),
                    calledAt: selectedLog.rawTicket.calledAt ? new Date(selectedLog.rawTicket.calledAt).toISOString() : null,
                    attendedAt: selectedLog.rawTicket.attendedAt ? new Date(selectedLog.rawTicket.attendedAt).toISOString() : null,
                    completedAt: selectedLog.rawTicket.completedAt ? new Date(selectedLog.rawTicket.completedAt).toISOString() : null,
                    phaseHistory: selectedLog.rawTicket.phaseHistory || []
                  }, null, 2)}</pre>
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 space-y-3 text-slate-400 my-auto">
              <Eye className="w-10 h-10 text-slate-200" />
              <div className="space-y-1">
                <span className="text-xs uppercase font-black tracking-wider text-slate-700">Depurador y Visor de Estado</span>
                <p className="text-[10px] text-slate-400 leading-normal max-w-[250px]">
                  Haga clic sobre cualquier fila del log para abrir el analizador e inspeccionar su historial JSON interno de transacciones de fase.
                </p>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}

// Subcomponente Dropdown para oficinas
function LandmarkDropdown({ officeId, onChange }: { officeId: string; onChange: (id: string) => void }) {
  return (
    <div className="flex items-center gap-2 w-full">
      <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">Oficina:</span>
      <select
        value={officeId}
        onChange={(e) => onChange(e.target.value)}
        className="w-full py-1.5 px-2 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:border-blue-500 font-bold text-slate-750"
      >
        <option value="TODAS">TODAS LAS SUCURSALES</option>
        {OFFICES_CONFIG.slice(0, 16).map(o => (
          <option key={o.id} value={o.id}>
            [{o.id}] {o.name.replace("Tribunal Electoral de Panamá", "TE")}
          </option>
        ))}
      </select>
    </div>
  );
}
