import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  CheckCircle, 
  Calendar,
  RefreshCw,
  Building2,
  Printer,
  Download
} from 'lucide-react';
import { SUCURSALES_TE } from '../data';
import { jsPDF } from 'jspdf';

interface TriadaSupervisorProps {
  citas: any[];
  onUpdateCitas: (updated: any[]) => void;
  officeFilter?: string;
}

interface TriadaAgent {
  id: string;
  nombre: string;
  username: string;
  sucursalId: string;
  status: 'ONLINE' | 'ATTENDING' | 'BREAK' | 'OFFLINE';
  completedCount: number;
  moduloAsignado: string | null;
}

export default function TriadaSupervisorController({ officeFilter = 'Todos' }: TriadaSupervisorProps) {
  const [selectedBranch, setSelectedBranch] = useState<string>(officeFilter);
  const [loading, setLoading] = useState<boolean>(false);
  const [systemUsers, setSystemUsers] = useState<any[]>([]);
  const [liveModulos, setLiveModulos] = useState<any[]>([]);
  const [liveTickets, setLiveTickets] = useState<any[]>([]);

  // Synchronize branch filter when prop changes
  useEffect(() => {
    if (officeFilter) {
      setSelectedBranch(officeFilter);
    }
  }, [officeFilter]);

  // Load real-time system data
  const fetchData = async () => {
    setLoading(true);
    try {
      const token = sessionStorage.getItem('admin_token') || localStorage.getItem('te_session_token');
      const authHeaders: Record<string, string> = {};
      if (token) authHeaders['Authorization'] = `Bearer ${token}`;
      
      // 1. Fetch real system users
      const usersRes = await fetch('/api/users', {
        headers: authHeaders
      });
      const usersData = await usersRes.json();
      if (usersData && usersData.success && Array.isArray(usersData.users)) {
        setSystemUsers(usersData.users);
      }

      // 2. Fetch active modules
      const modulosRes = await fetch('/api/modulos?office=ALL');
      const modulosData = await modulosRes.json();
      if (modulosData) {
        const modulosList = Array.isArray(modulosData) 
          ? modulosData 
          : (Array.isArray(modulosData.modulos) ? modulosData.modulos : []);
        setLiveModulos(modulosList);
      }

      // 3. Fetch today's tickets
      const ticketsRes = await fetch('/api/tickets?office=ALL&all_days=false');
      const ticketsData = await ticketsRes.json();
      if (ticketsData) {
        const ticketsList = Array.isArray(ticketsData)
          ? ticketsData
          : (Array.isArray(ticketsData.tickets) ? ticketsData.tickets : []);
        setLiveTickets(ticketsList);
      }
    } catch (err) {
      console.error("Error fetching live Triada supervisor data:", err);
    } finally {
      setLoading(false);
    }
  };

  // Sincronización periódica de datos para el supervisor de Tríada
  useEffect(() => {
    fetchData();
    const interval = setInterval(() => {
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      fetchData();
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  // Compute live agents of Triada and their completed metrics from database
  const agents: TriadaAgent[] = useMemo(() => {
    // 1. Get all system users whose role is related to Triada
    const triadaUsers = systemUsers.filter(u => {
      const r = String(u.role || '').toLowerCase();
      const uName = String(u.username || '').toLowerCase();
      return r === 'agent_triada' || r === 'triada_supervisor' || r.includes('triada') || uName.includes('triada');
    });

    // 2. Map their live state and compute completed transaction count from actual tickets database
    return triadaUsers.map(user => {
      // Find active module occupied by this agent
      const occupiedModulo = liveModulos.find(m => {
        const ag = String(m.agenteActual || m.agente_actual || '').toLowerCase();
        const uName = String(user.username || '').toLowerCase();
        const uRealName = String(user.nombre || '').toLowerCase();
        return ag === uName || ag === uRealName;
      });

      // Map module state to supervisor status
      let status: 'ONLINE' | 'ATTENDING' | 'BREAK' | 'OFFLINE' = 'OFFLINE';
      let moduloAsignado: string | null = null;

      if (occupiedModulo) {
        moduloAsignado = occupiedModulo.name || occupiedModulo.nombre || null;
        const est = String(occupiedModulo.estado || '').toUpperCase();
        if (est === 'ATENDIENDO' || est === 'ATENCION' || est === 'LLAMANDO' || est === 'ATTENDING' || est === 'ATENDIENDO_CUBICULO') {
          status = 'ATTENDING';
        } else if (est === 'DISPONIBLE' || est === 'ONLINE') {
          status = 'ONLINE';
        } else if (est === 'RECESO' || est === 'BREAK') {
          status = 'BREAK';
        }
      }

      // Count completed tickets by this agent today from liveTickets database
      const completedCount = liveTickets.filter(t => {
        const ag = String(t.assignedAgent || '').toLowerCase();
        const uName = String(user.username || '').toLowerCase();
        const uRealName = String(user.nombre || '').toLowerCase();
        
        // Count if ticket is assigned to this agent and completed
        const isAgent = ag === uName || ag === uRealName;
        const isCompleted = t.status === 'completado' || t.status === 'COMPLETADO' || t.completedAt;
        
        return isAgent && isCompleted;
      }).length;

      return {
        id: user.username,
        nombre: user.nombre || user.username,
        username: user.username,
        sucursalId: user.sucursalId || user.sucursal_id || 'OFF-1',
        status,
        completedCount,
        moduloAsignado
      };
    });
  }, [systemUsers, liveModulos, liveTickets]);

  // Filter agents based on branch
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      return selectedBranch === 'Todos' || selectedBranch === 'TODAS' || agent.sucursalId === selectedBranch;
    });
  }, [agents, selectedBranch]);

  // Calculate active booths (booths where status is ONLINE or ATTENDING)
  const activeBoothsCount = useMemo(() => {
    return filteredAgents.filter(a => a.status === 'ONLINE' || a.status === 'ATTENDING').length;
  }, [filteredAgents]);

  // Calculate total transactions for the selected branch / global
  const totalTransactionsCount = useMemo(() => {
    return filteredAgents.reduce((sum, a) => sum + a.completedCount, 0);
  }, [filteredAgents]);

  const getBranchName = (id: string) => {
    if (id === "OFF-1") return "Ancón (Sede Principal)";
    const found = SUCURSALES_TE.find(s => s.id === id);
    return found ? found.nombre : id;
  };

  const todayFormatted = useMemo(() => {
    return new Date().toLocaleDateString('es-PA', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }, []);

  // PDF report generation function using jsPDF
  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      
      // Header Banner (Navy bg)
      doc.setFillColor(15, 23, 42); // bg-slate-900 color
      doc.rect(0, 0, 210, 40, 'F');
      
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(14);
      doc.text('TRIBUNAL ELECTORAL DE PANAMÁ', 15, 18);
      
      doc.setFontSize(10);
      doc.setFont('Helvetica', 'normal');
      doc.text('Dirección de Cedulación - Control de Tríada y Biometría', 15, 25);
      doc.text(`Fecha del Reporte: ${todayFormatted}`, 15, 31);
      
      // Title
      doc.setTextColor(15, 23, 42);
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(12);
      doc.text('INFORME DIARIO DE DESEMPEÑO DE CABINAS Y OPERADORES', 15, 52);
      
      // Divider line
      doc.setDrawColor(226, 232, 240);
      doc.line(15, 56, 195, 56);
      
      // Summary Box
      doc.setFillColor(248, 250, 252); // bg-slate-50
      doc.rect(15, 62, 180, 24, 'F');
      doc.setDrawColor(203, 213, 225);
      doc.rect(15, 62, 180, 24, 'S');
      
      doc.setFontSize(9);
      doc.setFont('Helvetica', 'bold');
      doc.text('Resumen Estadístico de Control:', 20, 68);
      doc.setFont('Helvetica', 'normal');
      doc.text(`Sucursal de Control: ${selectedBranch === 'Todos' || selectedBranch === 'TODAS' ? 'Todas las Sucursales' : getBranchName(selectedBranch)}`, 20, 74);
      doc.text(`Cabinas Activas hoy: ${activeBoothsCount} de ${filteredAgents.length}`, 20, 80);
      doc.text(`Trámites Procesados (Global): ${totalTransactionsCount}`, 115, 80);
      
      // Table header
      let currentY = 96;
      doc.setFillColor(15, 23, 42);
      doc.rect(15, currentY, 180, 8, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFont('Helvetica', 'bold');
      doc.text('Operador de Tríada', 18, currentY + 5.5);
      doc.text('Sucursal', 65, currentY + 5.5);
      doc.text('Módulo Asignado', 115, currentY + 5.5);
      doc.text('Estado Actual', 150, currentY + 5.5);
      doc.text('Trámites', 178, currentY + 5.5);
      
      // Table content rows
      currentY += 8;
      doc.setTextColor(51, 65, 85);
      doc.setFont('Helvetica', 'normal');
      
      if (filteredAgents.length === 0) {
        doc.text('No se encontraron registros de operadores de Tríada para esta sucursal hoy.', 20, currentY + 10);
      } else {
        filteredAgents.forEach((agent, index) => {
          // Zebra striping
          if (index % 2 === 0) {
            doc.setFillColor(241, 245, 249);
            doc.rect(15, currentY, 180, 11, 'F');
          }
          
          doc.setFont('Helvetica', 'bold');
          doc.text(agent.nombre || '', 18, currentY + 4.5);
          doc.setFont('Helvetica', 'normal');
          doc.setFontSize(8);
          doc.text(`@${agent.username || ''}`, 18, currentY + 8);
          doc.setFontSize(9);
          
          doc.text(getBranchName(agent.sucursalId).substring(0, 24), 65, currentY + 6.5);
          doc.text(agent.moduloAsignado || 'Sin Módulo', 115, currentY + 6.5);
          
          const labelStatus = agent.status === 'ONLINE' ? 'Disponible' :
                             agent.status === 'ATTENDING' ? 'Atendiendo' :
                             agent.status === 'BREAK' ? 'En Receso' : 'Inactivo';
          doc.text(labelStatus, 150, currentY + 6.5);
          
          doc.setFont('Helvetica', 'bold');
          doc.text(String(agent.completedCount || 0), 182, currentY + 6.5);
          doc.setFont('Helvetica', 'normal');
          
          currentY += 12;
        });
      }
      
      // Supervisor sign-off block
      currentY += 25;
      if (currentY > 260) {
        doc.addPage();
        currentY = 40;
      }
      
      doc.setDrawColor(148, 163, 184);
      doc.line(70, currentY, 140, currentY);
      doc.setFont('Helvetica', 'bold');
      doc.text('Supervisor de Tríada y Biometría', 75, currentY + 6);
      doc.setFont('Helvetica', 'normal');
      doc.text('Dirección Nacional de Cedulación - TE', 73, currentY + 11);
      
      // Save and triggers download
      doc.save(`reporte_jornada_triada_${selectedBranch}_${Date.now()}.pdf`);
    } catch (e) {
      console.error("Error generating Tríada supervisor PDF report:", e);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans">
      
      {/* HEADER SIMPLE */}
      <div className="bg-slate-900 border border-slate-800 p-5 rounded-lg flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Users className="w-4 h-4" />
            </span>
            <h2 className="text-base font-black uppercase text-white tracking-wider flex items-center gap-2">
              <span>Control de Tríada y Biometría</span>
              {loading && <RefreshCw className="w-4 h-4 text-purple-400 animate-spin" />}
            </h2>
          </div>
          <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">
            Sincronización automática de base de datos en tiempo real
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* BOTON REPORTE PDF */}
          <button
            type="button"
            onClick={handleExportPDF}
            className="bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-xs uppercase tracking-wider px-4 py-2.5 rounded-lg transition flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-950/20 shrink-0"
            title="Generar e imprimir informe del rendimiento de operadores"
          >
            <Printer className="w-4 h-4" />
            <span>Generar Reporte PDF</span>
          </button>

          <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 px-3 py-2 rounded-lg text-xs font-bold text-slate-300">
            <Calendar className="w-4 h-4 text-purple-400 shrink-0" />
            <span className="capitalize">{todayFormatted}</span>
          </div>
        </div>
      </div>

      {/* METRICAS AUTOMATICAS DESDE BASE DE DATOS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* CUBICULOS ACTIVOS */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-between shadow-sm">
          <div className="text-left">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Cubículos Tríada Activos
            </span>
            <span className="text-3xl font-black text-white mt-1 block">
              {activeBoothsCount}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Ventanillas en servicio hoy (Vistas en vivo)
            </span>
          </div>
          <div className="bg-purple-950/40 p-2.5 rounded-full border border-purple-900/60">
            <Users className="w-5 h-5 text-purple-400" />
          </div>
        </div>

        {/* TRAMITES TOTALES DEL DIA */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-between shadow-sm">
          <div className="text-left">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Trámites de Hoy (Global)
            </span>
            <span className="text-3xl font-black text-emerald-400 mt-1 block">
              {totalTransactionsCount}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              Consultados automáticamente de base de datos
            </span>
          </div>
          <div className="bg-emerald-950/40 p-2.5 rounded-full border border-emerald-900/60">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        {/* DETALLE SUCURSAL */}
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-lg flex items-center justify-between shadow-sm">
          <div className="text-left">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">
              Sucursal de Control
            </span>
            <span className="text-sm font-black text-slate-200 mt-2 block truncate">
              {selectedBranch === 'Todos' || selectedBranch === 'TODAS' ? 'Todas las Sucursales' : getBranchName(selectedBranch)}
            </span>
            <span className="text-[10px] text-slate-400 font-medium block mt-1">
              Filtro de visualización activo
            </span>
          </div>
          <div className="bg-slate-950 p-2.5 rounded-full border border-slate-800">
            <Building2 className="w-5 h-5 text-slate-400" />
          </div>
        </div>

      </div>

      {/* TABLA DE AGENTES (SIN FOTOS, AUTOMÁTICA) */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden shadow-sm">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <span className="text-xs font-black text-white uppercase tracking-wider">
            Monitoreo en Tiempo Real de Agentes de Tríada ({filteredAgents.length})
          </span>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-400">Filtrar Sucursal:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded px-2 py-1 text-[10px] font-bold text-slate-300 outline-none cursor-pointer"
            >
              <option value="Todos">Todas las Sucursales</option>
              <option value="OFF-1">Ancón (Principal)</option>
              {SUCURSALES_TE.filter(s => s.id !== 'OFF-1').map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-950/65 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <th className="p-3.5">Agente de Tríada</th>
                <th className="p-3.5">Sucursal</th>
                <th className="p-3.5">Módulo de Atención</th>
                <th className="p-3.5 text-center">Estado de Cabina</th>
                <th className="p-3.5 text-right pr-6">Trámites Completados Hoy</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredAgents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500 text-xs font-medium">
                    No se encontraron agentes de Tríada registrados en la base de datos para esta sucursal.
                  </td>
                </tr>
              ) : (
                filteredAgents.map((agent) => (
                  <tr key={agent.id} className="hover:bg-slate-850/20 text-xs text-slate-300 transition">
                    
                    {/* Nombre y Username */}
                    <td className="p-3.5">
                      <div>
                        <span className="font-extrabold text-white block">{agent.nombre}</span>
                        <span className="text-[10px] text-slate-500 font-bold block">@{agent.username}</span>
                      </div>
                    </td>

                    {/* Sucursal */}
                    <td className="p-3.5 font-semibold text-slate-400">
                      {getBranchName(agent.sucursalId)}
                    </td>

                    {/* Módulo */}
                    <td className="p-3.5 font-mono font-bold text-slate-300">
                      {agent.moduloAsignado || 'Sin Módulo'}
                    </td>

                    {/* Estado */}
                    <td className="p-3.5 text-center">
                      <span className={`inline-block text-[9.5px] font-black uppercase px-2 py-0.5 rounded border ${
                        agent.status === 'ATTENDING' ? 'text-amber-400 bg-amber-950/40 border-amber-900/50' :
                        agent.status === 'ONLINE' ? 'text-emerald-400 bg-emerald-950/40 border-emerald-900/50' :
                        agent.status === 'BREAK' ? 'text-blue-400 bg-blue-950/40 border-blue-900/50' :
                        'text-slate-500 bg-slate-950/40 border-slate-800'
                      }`}>
                        {agent.status === 'ATTENDING' ? 'Atendiendo' :
                         agent.status === 'ONLINE' ? 'Disponible' :
                         agent.status === 'BREAK' ? 'En Receso' :
                         'Inactivo'}
                      </span>
                    </td>

                    {/* Trámites de Hoy */}
                    <td className="p-3.5 text-right pr-12">
                      <span className="font-mono font-black text-sm text-white bg-slate-950 border border-slate-800 px-3.5 py-1 rounded">
                        {agent.completedCount}
                      </span>
                    </td>

                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
