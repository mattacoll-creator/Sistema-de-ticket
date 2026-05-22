/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useMemo } from "react";
import { Ticket, Cubicle, TicketStatus, OFFICES_CONFIG, ServiceType, SERVICES_CONFIG } from "../types";
import { 
  Building2, 
  TrendingUp, 
  Award, 
  MapPin, 
  Calendar, 
  FileText, 
  RefreshCw, 
  Clock, 
  CheckCircle, 
  ArrowUpRight, 
  CircleDot, 
  ShieldCheck, 
  HelpCircle,
  FileSpreadsheet,
  Trash2,
  Sparkles
} from "lucide-react";
import { jsPDF } from "jspdf";

interface SuperAdminConsoleProps {
  officeTickets: Record<string, Ticket[]>;
  setOfficeTickets: React.Dispatch<React.SetStateAction<Record<string, Ticket[]>>>;
  officeCubicles: Record<string, Cubicle[]>;
  setOfficeCubicles: React.Dispatch<React.SetStateAction<Record<string, Cubicle[]>>>;
}

type Timeframe = "dia" | "semana" | "mes" | "ano";

export default function SuperAdminConsole({
  officeTickets,
  setOfficeTickets,
  officeCubicles,
  setOfficeCubicles
}: SuperAdminConsoleProps) {
  const [selectedTimeframe, setSelectedTimeframe] = useState<Timeframe>("mes");
  const [selectedOfficeDetailId, setSelectedOfficeDetailId] = useState<string>("OFF-1");
  const [isGeneratingMock, setIsGeneratingMock] = useState(false);

  // Timeframe limits helper
  const now = Date.now();
  const getFilterLimitMs = (tf: Timeframe) => {
    switch (tf) {
      case "dia":
        return now - 24 * 60 * 60 * 1000; // 1 day
      case "semana":
        return now - 7 * 24 * 60 * 60 * 1000; // 7 days
      case "mes":
        return now - 30 * 24 * 60 * 60 * 1000; // 30 days
      case "ano":
        return now - 365 * 24 * 60 * 60 * 1000; // 365 days
    }
  };

  // 1. Calculate and filter tickets per office based on timeframe
  const officeMetrics = useMemo(() => {
    const limitMs = getFilterLimitMs(selectedTimeframe);
    
    return OFFICES_CONFIG.map(office => {
      const allOfficeTickets = officeTickets[office.id] || [];
      
      // Filter by timeframe based on createdAt or completedAt
      const filteredTickets = allOfficeTickets.filter(t => t.createdAt >= limitMs);
      const completed = filteredTickets.filter(t => t.status === TicketStatus.COMPLETED);
      const missed = filteredTickets.filter(t => t.status === TicketStatus.MISSED);
      const waiting = filteredTickets.filter(t => t.status === TicketStatus.WAITING);
      
      // Compute Service Type Counts
      const serviceCounts = {
        [ServiceType.ELECTORAL]: 0,
        [ServiceType.REGISTRO]: 0,
        [ServiceType.CEDULACION]: 0,
        [ServiceType.EXTRANJERIA]: 0,
      };
      
      filteredTickets.forEach(t => {
        if (serviceCounts[t.serviceType] !== undefined) {
          serviceCounts[t.serviceType]++;
        }
      });

      // Compute Average Wait & Service Times (realistic simulated/actual values)
      let totalWaitMins = 0;
      let totalServiceMins = 0;
      let ratedTicketsCount = 0;

      completed.forEach(t => {
        // Average wait (CreatedAt -> CalledAt)
        const wait = t.calledAt ? (t.calledAt - t.createdAt) / 1000 / 60 : 7;
        // Average service (CalledAt -> CompletedAt)
        const serv = (t.completedAt && t.calledAt) ? (t.completedAt - t.calledAt) / 1000 / 60 : 10;
        
        totalWaitMins += Math.max(0.5, wait);
        totalServiceMins += Math.max(0.5, serv);
        ratedTicketsCount++;
      });

      const avgWait = ratedTicketsCount > 0 ? Math.round(totalWaitMins / ratedTicketsCount) : 8;
      const avgService = ratedTicketsCount > 0 ? Math.round(totalServiceMins / ratedTicketsCount) : 11;
      const resolutionRate = filteredTickets.length > 0 
        ? Math.round((completed.length / filteredTickets.length) * 100) 
        : 0;

      return {
        ...office,
        totalCount: filteredTickets.length,
        completedCount: completed.length,
        missedCount: missed.length,
        waitingCount: waiting.length,
        avgWaitTime: avgWait,
        avgServiceTime: avgService,
        resolutionRate,
        serviceCounts
      };
    });
  }, [officeTickets, selectedTimeframe]);

  // 2. Sort offices based on volume (totalCount) to yield rankings
  const rankedOffices = useMemo(() => {
    return [...officeMetrics].sort((a, b) => b.totalCount - a.totalCount);
  }, [officeMetrics]);

  // Global consolidated metrics
  const globalStats = useMemo(() => {
    let total = 0;
    let completed = 0;
    let missed = 0;
    let waiting = 0;
    let totalWait = 0;
    let totalService = 0;
    let completedOfficesCount = 0;

    officeMetrics.forEach(o => {
      total += o.totalCount;
      completed += o.completedCount;
      missed += o.missedCount;
      waiting += o.waitingCount;
      
      if (o.completedCount > 0) {
        totalWait += o.avgWaitTime;
        totalService += o.avgServiceTime;
        completedOfficesCount++;
      }
    });

    const avgWait = completedOfficesCount > 0 ? Math.round(totalWait / completedOfficesCount) : 8;
    const avgService = completedOfficesCount > 0 ? Math.round(totalService / completedOfficesCount) : 11;
    const globalResolutionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      completed,
      missed,
      waiting,
      avgWait,
      avgService,
      resolutionRate: globalResolutionRate
    };
  }, [officeMetrics]);

  // Selected Office drilldown detailed inspection
  const selectedOfficeDetails = useMemo(() => {
    return officeMetrics.find(o => o.id === selectedOfficeDetailId) || officeMetrics[0];
  }, [officeMetrics, selectedOfficeDetailId]);

  // 3. SEED HEAVY SIMULATED REVOLVING DATA ACROSS ALL 16 OFFICES FOR EXCELLENT DEMO STAGE
  const handleSeedSimulationData = () => {
    setIsGeneratingMock(true);
    
    // We will generate a structured seed of completed, waiting, and missed tickets for the past 365 days
    const newOfficeTickets: Record<string, Ticket[]> = {};
    const names = [
      "Juan Rafael Torres", "María Alejandra Mendoza", "Carlos Julio Alvarado", "Patricia Belén Smith",
      "Ernesto Vicente Guardia", "Aida Victoria Pinilla", "Luis Eduardo Gaitan_Pérez", "Diana Mabel Ortega",
      "Roberto Augusto Valdés", "Sofía Inés Castillo", "Esteban Manuel Araúz", "Yolanda Isabel Cárdenas",
      "Rodrigo Tomás Quintero", "Natalia Elena Barrios", "Francisco Javier Vergara", "Gabriela Isabel Córdoba",
      "Jaime Arturo Montenegro", "Lucía Fernanda Santamaría", "Alonso Miguel Samaniego", "Rosa Amalia González"
    ];

    const services = [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA];
    const seedPhaseObj = "CAJA" as any; // fallback CAJA phase

    OFFICES_CONFIG.forEach((office, index) => {
      const ticketsList: Ticket[] = [];
      
      // Let's seed different volumes so we have a realistic ranking!
      // Panm Centro has high, Bocas has lower, etc.
      let targetedTotal = 60 + Math.floor(Math.random() * 90);
      if (office.id === "OFF-1" || office.id === "OFF-9") {
        targetedTotal = 180 + Math.floor(Math.random() * 110); // Super high volume principal
      } else if (office.id === "OFF-15" || office.id === "OFF-6") {
        targetedTotal = 25 + Math.floor(Math.random() * 30); // Remote regional with low volume
      }

      for (let i = 1; i <= targetedTotal; i++) {
        const creatorName = names[Math.floor(Math.random() * names.length)];
        const servType = services[Math.floor(Math.random() * services.length)];
        
        // Random relative timing offset spread up to 365 days ago
        // More high density closer to today (Day/Week) and sparser long ago
        let dateOffsetMs = 0;
        const selector = Math.random();
        if (selector < 0.2) {
          // Today
          dateOffsetMs = Math.random() * 24 * 60 * 60 * 1000;
        } else if (selector < 0.45) {
          // Inside 7 Days
          dateOffsetMs = Math.random() * 7 * 24 * 60 * 60 * 1000;
        } else if (selector < 0.75) {
          // Inside 30 Days
          dateOffsetMs = Math.random() * 30 * 24 * 60 * 60 * 1000;
        } else {
          // Inside 365 Days
          dateOffsetMs = Math.random() * 365 * 24 * 60 * 60 * 1000;
        }

        const createdAt = now - dateOffsetMs;
        const prefix = SERVICES_CONFIG[servType].prefix;
        const padNum = String(i).padStart(3, "0");
        const numberCode = `${prefix}-${padNum}`;

        // Determine real-looking statuses: 85% completed, 8% waiting, 7% missed
        const statusRand = Math.random();
        let status = TicketStatus.COMPLETED;
        let calledAt: number | undefined = undefined;
        let completedAt: number | undefined = undefined;

        if (statusRand < 0.08) {
          status = TicketStatus.WAITING;
        } else if (statusRand < 0.15) {
          status = TicketStatus.MISSED;
          calledAt = createdAt + 12 * 60 * 1000;
          completedAt = calledAt + 3 * 60 * 1050;
        } else {
          // Completed
          calledAt = createdAt + (5 + Math.floor(Math.random() * 15)) * 60 * 1000;
          completedAt = calledAt + (6 + Math.floor(Math.random() * 14)) * 60 * 1000;
        }

        ticketsList.push({
          id: `seed_${office.id}_${i}_${createdAt}`,
          numberCode,
          number: i,
          name: creatorName,
          serviceType: servType,
          status,
          currentPhase: seedPhaseObj,
          phaseHistory: [
            {
              phase: seedPhaseObj,
              timestamp: createdAt,
              completedAt: status === TicketStatus.COMPLETED ? calledAt : undefined
            }
          ],
          createdAt,
          calledAt,
          completedAt,
          priority: Math.random() < 0.12
        });
      }

      newOfficeTickets[office.id] = ticketsList;
    });

    // Save
    setTimeout(() => {
      setOfficeTickets(newOfficeTickets);
      setIsGeneratingMock(false);
    }, 850);
  };

  // Clear data of all offices
  const handleClearAllOfficeTickets = () => {
    if (confirm("¿Está seguro que desea purgar todas las colas e historiales de las 16 oficinas de Panamá en limpio? Esta acción es irreversible.")) {
      const cleared: Record<string, Ticket[]> = {};
      OFFICES_CONFIG.forEach(o => {
        cleared[o.id] = [];
      });
      setOfficeTickets(cleared);
    }
  };

  // 4. GENERATE CRÉATIVE HIGHLY POLISHED EXECUTIVE JS-PDF REPORT
  const handleExportConsolidationPDF = () => {
    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const docWidth = 210;
    const docHeight = 297;
    const lMargin = 15;
    const rMargin = 15;
    const printW = docWidth - lMargin - rMargin; // 180mm

    const dateStr = new Date().toLocaleDateString("es-ES", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric"
    });

    const timeframeLabelMap = {
      dia: "Últimas 24 Horas",
      semana: "Últimos 7 Días (Semana)",
      mes: "Últimos 30 Días (Mes)",
      ano: "Último Año (Historial)"
    };

    // Header banner colors
    const deepBlue = [18, 46, 112];
    const borderGrey = [218, 223, 230];
    const textDark = [30, 41, 59];

    // Page 1 Layout Header decoration
    doc.setFillColor(deepBlue[0], deepBlue[1], deepBlue[2]);
    doc.rect(lMargin, 15, printW, 25, "F");

    doc.setFillColor(217, 119, 6); // Golden Accent
    doc.rect(lMargin, 15, 3.5, 25, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("INFORME CONSOLIDADO DE OFICINAS REGIONALES", lMargin + 8, 23);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`TRIBUNAL ELECTORAL DE PANAMÁ • RENDIMIENTO: ${timeframeLabelMap[selectedTimeframe].toUpperCase()}`, lMargin + 8, 29);

    // Metadata Right-aligned
    doc.setFontSize(8.5);
    doc.setFont("helvetica", "bold");
    doc.text("COCO TRÁMITES INC.", docWidth - rMargin - 8, 23, { align: "right" });
    doc.setFont("helvetica", "normal");
    doc.text(`Generado: ${dateStr}`, docWidth - rMargin - 8, 29, { align: "right" });

    let currentY = 50;

    // --- SUMMARY PANEL ---
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(lMargin, currentY, printW, 28, 3, 3, "F");
    
    // Draw columns
    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Métricas Consolidadas de la Red de Oficinas:", lMargin + 5, currentY + 6);

    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.text("Trámites Totales:", lMargin + 10, currentY + 14);
    doc.setFont("helvetica", "bold");
    doc.text(`${globalStats.total}`, lMargin + 48, currentY + 14);

    doc.setFont("helvetica", "normal");
    doc.text("Trámites Completados:", lMargin + 10, currentY + 21);
    doc.setFont("helvetica", "bold");
    doc.text(`${globalStats.completed} (${globalStats.resolutionRate}%)`, lMargin + 48, currentY + 21);

    // Column 2
    doc.setFont("helvetica", "normal");
    doc.text("Demora Promedio Espera:", lMargin + 95, currentY + 14);
    doc.setFont("helvetica", "bold");
    doc.text(`${globalStats.avgWait} mins`, lMargin + 155, currentY + 14);

    doc.setFont("helvetica", "normal");
    doc.text("Tiempo Atenc. Médula:", lMargin + 95, currentY + 21);
    doc.setFont("helvetica", "bold");
    doc.text(`${globalStats.avgService} mins`, lMargin + 155, currentY + 21);

    currentY += 38;

    // --- LEADERBOARD TITLE ---
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(deepBlue[0], deepBlue[1], deepBlue[2]);
    doc.text(`TABLA DE POSICIONES Y VOLUMEN DE ATENCIÓN (TOP 16 REGIONALES)`, lMargin, currentY);

    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.setLineWidth(0.4);
    doc.line(lMargin, currentY + 2, docWidth - rMargin, currentY + 2);

    currentY += 8;

    // Table Header
    doc.setFillColor(235, 240, 250);
    doc.rect(lMargin, currentY, printW, 8, "F");

    doc.setTextColor(textDark[0], textDark[1], textDark[2]);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.text("Pje.", lMargin + 2, currentY + 5.5);
    doc.text("Dirección / Oficina Sede", lMargin + 12, currentY + 5.5);
    doc.text("Trámites (Vol.)", lMargin + 95, currentY + 5.5);
    doc.text("Completados", lMargin + 122, currentY + 5.5);
    doc.text("T. Espera", lMargin + 148, currentY + 5.5);
    doc.text("Resol. %", lMargin + 168, currentY + 5.5);

    currentY += 8;

    // Table rows
    doc.setFont("helvetica", "normal");
    rankedOffices.forEach((office, index) => {
      // Row alternate background
      if (index % 2 === 0) {
        doc.setFillColor(249, 250, 252);
        doc.rect(lMargin, currentY, printW, 8.5, "F");
      }

      // Draw rank
      doc.setFont("helvetica", "bold");
      if (index < 3) {
        doc.setTextColor(217, 119, 6); // Golden Rank highlight for Top 3
      } else {
        doc.setTextColor(110, 120, 135);
      }
      doc.text(`#${index + 1}`, lMargin + 2, currentY + 5.5);

      // Reset text color
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.setFont("helvetica", index < 3 ? "bold" : "normal");
      
      const shortName = office.name.replace("Dirección Regional de ", "").replace("Tribunal Electoral de ", "");
      doc.text(shortName, lMargin + 12, currentY + 5.5);

      doc.setFont("helvetica", "bold");
      doc.text(`${office.totalCount}`, lMargin + 95, currentY + 5.5);
      doc.setFont("helvetica", "normal");
      doc.text(`${office.completedCount}`, lMargin + 122, currentY + 5.5);
      doc.text(`${office.avgWaitTime}m`, lMargin + 148, currentY + 5.5);
      
      doc.setFont("helvetica", "bold");
      if (office.resolutionRate > 80) doc.setTextColor(16, 185, 129); // Green
      else if (office.resolutionRate < 50) doc.setTextColor(225, 29, 72); // Red
      doc.text(`${office.resolutionRate}%`, lMargin + 168, currentY + 5.5);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);

      currentY += 8.5;
    });

    currentY += 10;
    
    // Check height overlap
    if (currentY > docHeight - 40) {
      doc.addPage();
      currentY = 25;
    }

    // --- FOOTER AND SEAL ---
    doc.setDrawColor(borderGrey[0], borderGrey[1], borderGrey[2]);
    doc.setLineWidth(0.3);
    doc.line(lMargin, currentY, docWidth - rMargin, currentY);

    currentY += 6;
    doc.setFontSize(7.5);
    doc.setFont("helvetica", "italic");
    doc.setTextColor(130, 140, 155);
    doc.text("Este informe consolida las estadísticas del sistema modular de turnos y atención del Tribunal Electoral de Panamá.", lMargin, currentY);
    doc.text("Generado automáticamente en el módulo de Super Administración Regional.", lMargin, currentY + 4);

    // Official Seal box placeholders on bottom
    currentY += 15;
    if (currentY < docHeight - 30) {
      doc.setDrawColor(180, 190, 205);
      doc.line(lMargin + 15, currentY + 12, lMargin + 65, currentY + 12);
      doc.line(docWidth - rMargin - 65, currentY + 12, docWidth - rMargin - 15, currentY + 12);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(textDark[0], textDark[1], textDark[2]);
      doc.text("Firma de Dirección Nacional", lMargin + 40, currentY + 16, { align: "center" });
      doc.text("Sello de Validacion Central", docWidth - rMargin - 40, currentY + 16, { align: "center" });
    }

    doc.save(`tribunal_electoral_consolidado_${selectedTimeframe}_${Date.now()}.pdf`);
  };

  return (
    <div id="super-admin-console" className="space-y-6 max-w-7xl mx-auto w-full px-4 md:px-0">
      
      {/* 1. BRAND COVER BANNERS */}
      <div className="bg-gradient-to-r from-[#122e70] to-blue-900 border border-transparent rounded-2xl p-6 text-white shadow-sm flex flex-col md:flex-row md:items-center md:justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 opacity-10 bg-[radial-gradient(circle_at_right,_var(--tw-gradient-stops))] from-yellow-400 to-transparent pointer-events-none" />
        
        <div className="space-y-2 relative z-10 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 text-[9px] font-black uppercase text-amber-400 bg-amber-500/15 rounded-full border border-amber-400/30 font-sans tracking-wide">
            <Sparkles className="w-3.5 h-3.5 animate-pulse text-amber-400" />
            CONSOLA DE CONTROL DE SUPER ADMINISTRADOR
          </div>
          <h2 className="text-xl md:text-2xl font-black uppercase tracking-tight">
            Red Nacional de Trámites y Rendimiento
          </h2>
          <p className="text-xs text-blue-150 leading-relaxed font-sans font-medium">
            Supervise las colas, volumetría y estadísticas en tiempo real de las 16 direcciones de la red del Tribunal Electoral en Panamá. Compare la eficiencia y despache reportes certificados.
          </p>
        </div>

        {/* Global Toolbar Action buttons */}
        <div className="flex flex-wrap items-center gap-2 relative z-10 self-start md:self-center">
          <button
            onClick={handleSeedSimulationData}
            disabled={isGeneratingMock}
            className="px-4 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2 border border-amber-400/25 disabled:opacity-50"
            title="Siembre un set completo de datos ficticios en las 16 oficinas con timbres de tiempo aleatorios para demostrar el ranking."
          >
            <RefreshCw className={`w-3.5 h-3.5 text-white ${isGeneratingMock ? "animate-spin" : ""}`} />
            <span>{isGeneratingMock ? "Generando Carga..." : "Simular Datos en Toda la Red"}</span>
          </button>

          <button
            onClick={handleClearAllOfficeTickets}
            className="px-4 py-2 bg-rose-700/80 hover:bg-rose-700 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm flex items-center gap-2 border border-rose-500/30"
            title="Limpia todos los historiales de tickets acumulados en todas las oficinas."
          >
            <Trash2 className="w-3.5 h-3.5 text-slate-100" />
            <span>Limpiar Red</span>
          </button>
        </div>
      </div>

      {/* 2. GLOBAL CONSOLIDATED GENERAL METRICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div id="stat-card-total-cases" className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">
              Volumen Red Consolidado
            </span>
            <Building2 className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-black text-slate-850 tracking-tight font-mono">{globalStats.total}</p>
          <span className="text-[9px] font-medium text-slate-450 block font-sans">
            Trámites registrados totales en toda la república
          </span>
        </div>

        <div id="stat-card-done-cases" className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">
              Trámites Completados
            </span>
            <CheckCircle className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-850 tracking-tight font-mono">{globalStats.completed}</p>
            <span className="text-xs font-extrabold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded uppercase font-mono">
              {globalStats.resolutionRate}%
            </span>
          </div>
          <span className="text-[9px] font-medium text-slate-450 block font-sans">
            Ciudadanos atendidos con cierre exitoso del trámite
          </span>
        </div>

        <div id="stat-card-wait-cases" className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">
              Espera Promedio Red
            </span>
            <Clock className="w-4 h-4 text-amber-600 animate-pulse" />
          </div>
          <p className="text-2xl font-black text-slate-850 tracking-tight font-mono">{globalStats.avgWait} <span className="text-xs">mins</span></p>
          <span className="text-[9px] font-medium text-slate-450 block font-sans">
            Tiempo de espera acumulado pre-llamado de agente
          </span>
        </div>

        <div id="stat-card-active-cases" className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-sans">
              Puntos de Atención Activos
            </span>
            <CircleDot className="w-4 h-4 text-[#122e70]" />
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-black text-slate-850 tracking-tight font-mono">16</p>
            <span className="text-[8.5px] font-extrabold text-pink-700 bg-pink-50 px-1.5 py-0.5 rounded uppercase font-mono">
              {globalStats.waiting} en Cola
            </span>
          </div>
          <span className="text-[9px] font-medium text-slate-450 block font-sans">
            Oficinas regionales reportando datos a nivel nacional
          </span>
        </div>
      </div>

      {/* 3. PODIUM (TOP 3) AND ALL OFFICE RANKING LISTING */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEADERBOARD VIEW PORTAL (8 COLS) */}
        <div className="lg:col-span-8 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
            <div className="space-y-0.5">
              <h3 className="text-xs font-black uppercase tracking-widest text-[#122e70] flex items-center gap-1.5">
                <TrendingUp className="w-4 h-4 text-indigo-650" />
                Tabla de Clasificación y Volumen
              </h3>
              <p className="text-[10px] font-medium text-slate-400 leading-normal font-sans">
                Rango dinámico de sedes del Tribunal de Panamá con mayor flujo en oficina.
              </p>
            </div>

            {/* Timeframe selector toolbar */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl shrink-0">
              <button
                onClick={() => setSelectedTimeframe("dia")}
                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  selectedTimeframe === "dia"
                    ? "bg-[#122e70] text-white shadow-xs"
                    : "text-slate-550 hover:bg-slate-200"
                }`}
              >
                Día
              </button>
              <button
                onClick={() => setSelectedTimeframe("semana")}
                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  selectedTimeframe === "semana"
                    ? "bg-[#122e70] text-white shadow-xs"
                    : "text-slate-550 hover:bg-slate-200"
                }`}
              >
                Semana
              </button>
              <button
                onClick={() => setSelectedTimeframe("mes")}
                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  selectedTimeframe === "mes"
                    ? "bg-[#122e70] text-white shadow-xs"
                    : "text-slate-550 hover:bg-slate-200"
                }`}
              >
                Mes
              </button>
              <button
                onClick={() => setSelectedTimeframe("ano")}
                className={`px-3 py-1.5 text-[9px] font-black uppercase rounded-lg transition-all cursor-pointer ${
                  selectedTimeframe === "ano"
                    ? "bg-[#122e70] text-white shadow-xs"
                    : "text-slate-550 hover:bg-slate-200"
                }`}
              >
                Año
              </button>
            </div>
          </div>

          {/* Graphical podium representing the top 3 high-performers */}
          {rankedOffices[0] && rankedOffices[0].totalCount > 0 && (
            <div className="bg-blue-50/40 border border-blue-100/50 rounded-xl p-5 flex flex-col sm:flex-row items-center justify-around gap-4 text-center">
              
              {/* Rank 2 (Silver) */}
              {rankedOffices[1] && (
                <div className="order-2 sm:order-1 flex flex-col items-center p-3 rounded-xl bg-white border border-slate-150 shadow-xs max-w-[170px] flex-1">
                  <div className="w-9 h-9 bg-slate-100 text-slate-500 rounded-full flex items-center justify-center font-black border border-slate-200 text-sm shadow-inner mb-2">
                    2
                  </div>
                  <span className="text-[10px] font-black text-slate-700 uppercase line-clamp-1">
                    {rankedOffices[1].name.replace("Dirección Regional de ", "").replace("Tribunal Electoral de ", "")}
                  </span>
                  <span className="text-[11px] font-extrabold text-slate-500 font-mono mt-1">
                    {rankedOffices[1].totalCount} trámites
                  </span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-black mt-0.5">
                    Resol: {rankedOffices[1].resolutionRate}%
                  </span>
                </div>
              )}

              {/* Rank 1 (Gold - Central Highlighted Podium) */}
              <div className="order-1 sm:order-2 flex flex-col items-center p-4.5 rounded-xl bg-amber-500/10 border-2 border-amber-400/40 shadow-xs max-w-[190px] flex-1 relative scale-105">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-white border border-amber-400 text-[8px] font-black tracking-widest uppercase px-2 py-0.5 rounded-full shadow flex items-center gap-0.5 animate-pulse">
                  <Award className="w-2.5 h-2.5 text-white" /> LÍDER NACIONAL
                </div>
                <div className="w-11 h-11 bg-amber-400 text-amber-950 rounded-full flex items-center justify-center font-black border border-amber-300 text-base shadow-inner mb-2">
                  1
                </div>
                <span className="text-[10px] font-black text-amber-950 uppercase line-clamp-1">
                  {rankedOffices[0].name.replace("Dirección Regional de ", "").replace("Tribunal Electoral de ", "")}
                </span>
                <span className="text-[12px] font-black text-[#122e70] font-mono mt-1">
                  {rankedOffices[0].totalCount} trámites
                </span>
                <span className="text-[8px] uppercase tracking-wider text-amber-700 font-black mt-0.5">
                  Esperado: {rankedOffices[0].avgWaitTime} mins • {rankedOffices[0].resolutionRate}%
                </span>
              </div>

              {/* Rank 3 (Bronze) */}
              {rankedOffices[2] && (
                <div className="order-3 flex flex-col items-center p-3 rounded-xl bg-white border border-slate-150 shadow-xs max-w-[170px] flex-1 font-sans">
                  <div className="w-9 h-9 bg-amber-100 text-amber-800 rounded-full flex items-center justify-center font-black border border-amber-200 text-sm shadow-inner mb-2">
                    3
                  </div>
                  <span className="text-[10px] font-black text-slate-705 uppercase line-clamp-1">
                    {rankedOffices[2].name.replace("Dirección Regional de ", "").replace("Tribunal Electoral de ", "")}
                  </span>
                  <span className="text-[11px] font-extrabold text-slate-500 font-mono mt-1">
                    {rankedOffices[2].totalCount} trámites
                  </span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-400 font-black mt-0.5">
                    Resol: {rankedOffices[2].resolutionRate}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Ranking list of the 16 regional offices */}
          <div id="office-leaderboard-scoring-list" className="space-y-2 max-h-[480px] overflow-y-auto pr-1 scrollbar-thin">
            {rankedOffices.map((office, idx) => {
              const isSelected = office.id === selectedOfficeDetailId;
              const shortRegionName = office.name.replace("Dirección Regional de ", "").replace("Tribunal Electoral de ", "");
              
              const isTop3 = idx < 3;
              const medColor = idx === 0 ? "bg-amber-400 font-black text-amber-950" : idx === 1 ? "bg-slate-300 text-slate-800" : idx === 2 ? "bg-amber-600/20 text-amber-800" : "bg-slate-100 text-slate-500";

              return (
                <div
                  key={office.id}
                  onClick={() => setSelectedOfficeDetailId(office.id)}
                  className={`p-3.5 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-all ${
                    isSelected
                      ? "bg-blue-50/50 border-blue-400 shadow-xs"
                      : "bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-350"
                  }`}
                >
                  {/* Left elements */}
                  <div className="flex items-center gap-3">
                    <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10.5px] font-black ${medColor}`}>
                      {idx + 1}
                    </span>
                    <div className="space-y-0.5">
                      <span className="text-[11px] font-black uppercase text-slate-800 flex items-center gap-1">
                        {shortRegionName}
                        {isSelected && (
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                        )}
                      </span>
                      <span className="text-[9px] text-slate-400 flex items-center gap-1 uppercase font-bold">
                        <MapPin className="w-3 h-3 text-slate-400" />
                        {office.address}
                      </span>
                    </div>
                  </div>

                  {/* Middle representation volume bar */}
                  <div className="hidden md:block flex-1 max-w-[120px] mx-4">
                    <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-[#122e70] rounded-full transition-all duration-500"
                        style={{ width: `${globalStats.total > 0 ? (office.totalCount / rankedOffices[0].totalCount) * 100 : 0}%` }}
                      />
                    </div>
                  </div>

                  {/* Metrics and counts */}
                  <div className="flex items-center gap-4 text-right justify-between sm:justify-end">
                    <div className="space-y-0.5 text-left sm:text-right">
                      <span className="block text-[10.5px] font-black text-slate-800 font-mono">
                        {office.totalCount} Trámites
                      </span>
                      <span className="block text-[8px] font-semibold uppercase text-slate-400 tracking-wider">
                        Resolvs: {office.completedCount} ({office.resolutionRate}%)
                      </span>
                    </div>

                    <div className="border-l border-slate-150 pl-3.5 space-y-0.5 text-right font-mono">
                      <span className="block text-[10px] font-black text-amber-650">
                        {office.avgWaitTime}m <span className="text-[8px] font-medium text-slate-400">esp.</span>
                      </span>
                      <span className="block text-[8.5px] font-bold text-slate-500">
                        {office.avgServiceTime}m <span className="text-[8.5px] font-medium text-slate-400">aten.</span>
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick PDF report action inside scoreboard panel */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[9.5px] text-slate-400 font-semibold uppercase tracking-wider">
              ¿Desea archivar el estado actual de posiciones oficiales?
            </span>
            <button
              onClick={handleExportConsolidationPDF}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 text-[10px] font-bold uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-xs"
              title="Descarga del ranking consolidado nacional en PDF para el Tribunal"
            >
              <FileText className="w-3.5 h-3.5 text-slate-650" />
              Exportar PDF Clasificatorio
            </button>
          </div>
        </div>

        {/* REGIONAL INDIVIDUAL DRILLDOWN (4 COLS) */}
        <div className="lg:col-span-4 bg-white border border-slate-200 rounded-2xl p-5 shadow-sm flex flex-col h-fit space-y-4">
          
          <div className="border-b border-slate-100 pb-3.5 space-y-1">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#122e70] flex items-center gap-1">
              <Building2 className="w-4 h-4 text-rose-650 shrink-0" />
              Inspector de Sede Regional
            </h3>
            <p className="text-[9.5px] font-medium text-slate-400 leading-normal font-sans">
              Inspeccione la volumetría por servicio en la sede seleccionada.
            </p>
          </div>

          {/* Sede Select card details */}
          <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2">
            <span className="text-[7.5px] tracking-[0.2em] font-black text-rose-500 bg-rose-50 border border-rose-100 rounded px-1.5 py-0.5 uppercase block w-fit">
              ID SECTOR: {selectedOfficeDetails.id}
            </span>
            <h4 className="text-[11px] font-black uppercase text-slate-800 leading-tight">
              {selectedOfficeDetails.name}
            </h4>
            <span className="text-[9px] text-slate-450 uppercase font-black flex items-center gap-1">
              <MapPin className="w-3 h-3 text-rose-600 shrink-0" />
              {selectedOfficeDetails.address}
            </span>
          </div>

          {/* Service Volume Breakdown inside chosen office */}
          <div className="space-y-3">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest block font-sans">
              Distribución por Trámite ({selectedTimeframe.toUpperCase()})
            </span>

            <div className="space-y-2.5">
              {Object.keys(SERVICES_CONFIG).map((serviceKey) => {
                const sKey = serviceKey as ServiceType;
                const conf = SERVICES_CONFIG[sKey];
                const count = selectedOfficeDetails.serviceCounts[sKey] || 0;
                const pct = selectedOfficeDetails.totalCount > 0 
                  ? Math.round((count / selectedOfficeDetails.totalCount) * 100) 
                  : 0;

                return (
                  <div key={sKey} className="space-y-1 bg-white border border-slate-100 p-2 rounded-lg shadow-xxs">
                    <div className="flex items-center justify-between text-[9.5px]">
                      <span className="font-extrabold uppercase text-slate-650 tracking-wide flex items-center gap-1">
                        <span className={`w-2 h-2 rounded-full ${conf.color.split(" ")[0]}`} />
                        {conf.name}
                      </span>
                      <span className="font-mono font-black text-slate-800">
                        {count} <span className="text-[8px] font-semibold text-slate-400">({pct}%)</span>
                      </span>
                    </div>

                    {/* Progress relative bar */}
                    <div className="h-1.5 w-full bg-slate-50 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full ${conf.color.split(" ")[0]} transition-all duration-500`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Specific local stats of the regional office */}
          <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-3 text-center">
            
            <div className="bg-indigo-50/40 p-2.5 border border-indigo-100 rounded-lg">
              <span className="block text-[8px] font-black text-indigo-500 uppercase tracking-wider font-sans">
                T. Medio Espera
              </span>
              <p className="text-sm font-black text-indigo-950 font-mono mt-0.5">
                {selectedOfficeDetails.avgWaitTime} <span className="text-[9px] font-semibold">mins</span>
              </p>
            </div>

            <div className="bg-emerald-50/40 p-2.5 border border-emerald-100 rounded-lg">
              <span className="block text-[8px] font-black text-emerald-500 uppercase tracking-wider font-sans">
                T. de Atención
              </span>
              <p className="text-sm font-black text-slate-900 font-mono mt-0.5">
                {selectedOfficeDetails.avgServiceTime} <span className="text-[9px] font-semibold">mins</span>
              </p>
            </div>
          </div>

          {/* Interactive info warning */}
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-start gap-2">
            <ShieldCheck className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="block text-[8.5px] font-black text-amber-850 uppercase tracking-wide">
                Auditoría en Línea Autorizada
              </span>
              <p className="text-[8px] leading-normal font-medium text-amber-700 font-sans">
                Los datos visualizados en este inspector se recalculan en tiempo de ejecución de acuerdo a los tickets cargados en la memoria local de la regional.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
