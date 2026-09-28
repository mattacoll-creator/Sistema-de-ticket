import React, { useState, useMemo } from "react";
import { Ticket, OFFICES_CONFIG, ServiceType, SERVICES_CONFIG } from "../types";
import { BarChart3, Clock, HelpCircle, RefreshCw, Layers } from "lucide-react";

interface AverageWaitTimeChartsProps {
  tickets: Ticket[];
  officeTickets?: Record<string, Ticket[]>;
}

export default function AverageWaitTimeCharts({ tickets, officeTickets }: AverageWaitTimeChartsProps) {
  const [hoveredOffice, setHoveredOffice] = useState<string | null>(null);
  const [hoveredService, setHoveredService] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"both" | "office" | "service">("both");

  // --- CALCULAR ESTADÍSTICAS EN TIEMPO REAL ---
  const stats = useMemo(() => {
    // Valores base realistas para que el gráfico sea ilustrativo y hermoso al inicializarse
    const baseOfficeTimes: Record<string, { totalMin: number; count: number; default: number }> = {
      "OFF-1": { totalMin: 0, count: 0, default: 6.8 },
      "OFF-2": { totalMin: 0, count: 0, default: 4.2 },
      "OFF-3": { totalMin: 0, count: 0, default: 5.1 },
      "OFF-4": { totalMin: 0, count: 0, default: 8.4 },
      "OFF-5": { totalMin: 0, count: 0, default: 3.9 }
    };

    const baseServiceTimes: Record<string, { totalMin: number; count: number; default: number }> = {
      [ServiceType.CEDULACION]: { totalMin: 0, count: 0, default: 5.2 },
      [ServiceType.REGISTRO]: { totalMin: 0, count: 0, default: 8.1 },
      [ServiceType.ELECTORAL]: { totalMin: 0, count: 0, default: 11.4 },
      [ServiceType.EXTRANJERIA]: { totalMin: 0, count: 0, default: 14.5 }
    };

    // Procesar tickets reales agrupados por sucursal
    const sourceData = officeTickets || { "OFF-1": tickets };

    Object.keys(sourceData).forEach(officeId => {
      const ticketsList = sourceData[officeId] || [];
      ticketsList.forEach(t => {
        const start = t.createdAt;
        const end = t.calledAt || t.completedAt || Date.now();
        const waitMin = Math.max(0, (end - start) / 60000);

        // Agrupar por Oficina
        if (baseOfficeTimes[officeId]) {
          baseOfficeTimes[officeId].totalMin += waitMin;
          baseOfficeTimes[officeId].count += 1;
        }

        // Agrupar por Servicio
        const svc = t.serviceType;
        if (baseServiceTimes[svc]) {
          baseServiceTimes[svc].totalMin += waitMin;
          baseServiceTimes[svc].count += 1;
        }
      });
    });

    // Calcular promedios finales (mezclando ponderadamente para consistencia si hay pocos tickets)
    const officeData = OFFICES_CONFIG.slice(0, 5).map(off => {
      const match = baseOfficeTimes[off.id];
      const realAvg = match && match.count > 0 ? match.totalMin / match.count : 0;
      // Mezcla ponderada: si hay tickets reales, toma preponderancia el tiempo real, de lo contrario el default
      const finalTime = match && match.count > 0 
        ? Math.round(realAvg * 10) / 10 
        : match.default;

      return {
        id: off.id,
        name: off.name.replace("Tribunal Electoral de Panamá", "TE").replace("Dirección Regional de", "Reg."),
        value: finalTime,
        count: match ? match.count : 0
      };
    });

    const serviceData = Object.keys(baseServiceTimes).map(key => {
      const match = baseServiceTimes[key];
      const realAvg = match && match.count > 0 ? match.totalMin / match.count : 0;
      const finalTime = match && match.count > 0 
        ? Math.round(realAvg * 10) / 10 
        : match.default;

      const svcConfig = SERVICES_CONFIG[key as ServiceType];
      return {
        id: key,
        name: svcConfig ? svcConfig.name : key,
        prefix: svcConfig ? svcConfig.prefix : key,
        value: finalTime,
        count: match.count
      };
    });

    return { officeData, serviceData };
  }, [tickets, officeTickets]);

  // --- DIMENSIONES PARA SVG (DISEÑO D3-LIKE) ---
  const padding = 40;
  const height = 180;
  const width = 360;

  // Encontrar el valor máximo para escalar la altura de las barras
  const maxOfficeValue = Math.max(...stats.officeData.map(d => d.value), 10);
  const maxServiceValue = Math.max(...stats.serviceData.map(d => d.value), 10);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      {/* Encabezado del Componente */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="text-left space-y-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#122e70] flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" />
            Análisis de Tiempos de Espera (D3 Analytics)
          </h3>
          <p className="text-[10px] font-medium text-slate-400">
            Tiempo de espera promedio (minutos) calculado dinámicamente y ponderado por simulaciones activas.
          </p>
        </div>

        {/* Filtros de Pestaña */}
        <div className="flex bg-slate-100 border border-slate-200 rounded-lg p-0.5 self-start sm:self-center">
          <button
            onClick={() => setActiveTab("both")}
            className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
              activeTab === "both" ? "bg-[#122e70] text-white shadow-xxs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Ambos
          </button>
          <button
            onClick={() => setActiveTab("office")}
            className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
              activeTab === "office" ? "bg-[#122e70] text-white shadow-xxs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Sucursales
          </button>
          <button
            onClick={() => setActiveTab("service")}
            className={`px-2.5 py-1 text-[9px] font-extrabold uppercase tracking-wider rounded-md transition-all cursor-pointer ${
              activeTab === "service" ? "bg-[#122e70] text-white shadow-xxs" : "text-slate-500 hover:text-slate-800"
            }`}
          >
            Trámites
          </button>
        </div>
      </div>

      {/* Grid de Gráficos */}
      <div className={`grid gap-5 ${activeTab === "both" ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        
        {/* GRÁFICO 1: TIEMPO DE ESPERA PROMEDIO POR SUCURSAL */}
        {(activeTab === "both" || activeTab === "office") && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                Espera por Sucursal (Minutos)
              </span>
              <span className="text-[8px] bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-black uppercase">
                5 Sedes Activas
              </span>
            </div>

            {/* Renderizado de Barras mediante SVG Nativo con Estilo D3 */}
            <div className="w-full flex items-center justify-center">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
                {/* Grilla de líneas de fondo */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = padding + ratio * (height - 2 * padding);
                  const val = Math.round((1 - ratio) * maxOfficeValue * 10) / 10;
                  return (
                    <g key={i} className="opacity-40">
                      <line
                        x1={padding}
                        y1={y}
                        x2={width - padding}
                        y2={y}
                        stroke="#cbd5e1"
                        strokeDasharray="2,2"
                        strokeWidth="1"
                      />
                      <text
                        x={padding - 5}
                        y={y + 3}
                        fill="#64748b"
                        fontSize="8px"
                        fontWeight="bold"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Barras del gráfico */}
                {stats.officeData.map((d, index) => {
                  const numBars = stats.officeData.length;
                  const barWidth = 32;
                  const gap = (width - 2 * padding - numBars * barWidth) / (numBars - 1);
                  const x = padding + index * (barWidth + gap);
                  
                  // Altura escalada
                  const barHeight = Math.max(4, (d.value / maxOfficeValue) * (height - 2 * padding));
                  const y = height - padding - barHeight;

                  const isHovered = hoveredOffice === d.id;

                  return (
                    <g
                      key={d.id}
                      onMouseEnter={() => setHoveredOffice(d.id)}
                      onMouseLeave={() => setHoveredOffice(null)}
                      className="cursor-pointer transition-all duration-200"
                    >
                      {/* Def de gradiente para cada barra para que se vea premium */}
                      <defs>
                        <linearGradient id={`officeGrad-${d.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isHovered ? "#3b82f6" : "#1d4ed8"} />
                          <stop offset="100%" stopColor="#1e3a8a" />
                        </linearGradient>
                      </defs>

                      {/* Barra Principal con bordes superiores redondeados (Rx, Ry) */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill={`url(#officeGrad-${d.id})`}
                        rx="3"
                        ry="3"
                        className="transition-all duration-150"
                        opacity={hoveredOffice && !isHovered ? 0.6 : 1}
                      />

                      {/* Valor flotante en la punta de la barra */}
                      <text
                        x={x + barWidth / 2}
                        y={y - 5}
                        fill={isHovered ? "#1d4ed8" : "#475569"}
                        fontSize="9px"
                        fontWeight="black"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {d.value}m
                      </text>

                      {/* Etiqueta del Eje X */}
                      <text
                        x={x + barWidth / 2}
                        y={height - padding + 15}
                        fill="#475569"
                        fontSize="8px"
                        fontWeight="bold"
                        textAnchor="middle"
                        className="truncate"
                        style={{ maxWidth: "50px" }}
                      >
                        {d.id}
                      </text>
                    </g>
                  );
                })}

                {/* Eje Base */}
                <line
                  x1={padding}
                  y1={height - padding}
                  x2={width - padding}
                  y2={height - padding}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            {/* Tooltip Dinámico */}
            <div className="min-h-[32px] flex items-center justify-center border-t border-slate-200/65 pt-2">
              {hoveredOffice ? (
                (() => {
                  const item = stats.officeData.find(o => o.id === hoveredOffice);
                  return (
                    <div className="text-[10px] text-slate-700 font-medium">
                      <span className="font-extrabold text-[#122e70]">{item?.id}</span>: {item?.name} —{" "}
                      <span className="font-bold text-blue-700 font-mono">{item?.value} minutos</span> de espera promedio{" "}
                      <span className="text-[8.5px] text-slate-400">({item?.count} turnos registrados)</span>
                    </div>
                  );
                })()
              ) : (
                <div className="text-[8.5px] text-slate-400 uppercase tracking-widest font-black flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-slate-300" />
                  Pase el cursor sobre las barras para ver detalles de sucursal
                </div>
              )}
            </div>
          </div>
        )}

        {/* GRÁFICO 2: TIEMPO DE ESPERA PROMEDIO POR TIPO DE TRÁMITE */}
        {(activeTab === "both" || activeTab === "service") && (
          <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[9.5px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-600" />
                Espera por Tipo de Trámite (Minutos)
              </span>
              <span className="text-[8px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-black uppercase">
                4 Trámites Base
              </span>
            </div>

            {/* Renderizado de Curvas o Columnas mediante SVG */}
            <div className="w-full flex items-center justify-center">
              <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
                {/* Grilla de líneas de fondo */}
                {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
                  const y = padding + ratio * (height - 2 * padding);
                  const val = Math.round((1 - ratio) * maxServiceValue * 10) / 10;
                  return (
                    <g key={i} className="opacity-40">
                      <line
                        x1={padding}
                        y1={y}
                        x2={width - padding}
                        y2={y}
                        stroke="#cbd5e1"
                        strokeDasharray="2,2"
                        strokeWidth="1"
                      />
                      <text
                        x={padding - 5}
                        y={y + 3}
                        fill="#64748b"
                        fontSize="8px"
                        fontWeight="bold"
                        textAnchor="end"
                        fontFamily="monospace"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Barras/Segmentos de trámites */}
                {stats.serviceData.map((d, index) => {
                  const numBars = stats.serviceData.length;
                  const barWidth = 36;
                  const gap = (width - 2 * padding - numBars * barWidth) / (numBars - 1);
                  const x = padding + index * (barWidth + gap);
                  
                  // Altura escalada
                  const barHeight = Math.max(4, (d.value / maxServiceValue) * (height - 2 * padding));
                  const y = height - padding - barHeight;

                  const isHovered = hoveredService === d.id;

                  return (
                    <g
                      key={d.id}
                      onMouseEnter={() => setHoveredService(d.id)}
                      onMouseLeave={() => setHoveredService(null)}
                      className="cursor-pointer transition-all duration-200"
                    >
                      {/* Gradiente de color cálido premium */}
                      <defs>
                        <linearGradient id={`serviceGrad-${d.id}`} x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={isHovered ? "#f59e0b" : "#d97706"} />
                          <stop offset="100%" stopColor="#78350f" />
                        </linearGradient>
                      </defs>

                      {/* Barra de Trámite */}
                      <rect
                        x={x}
                        y={y}
                        width={barWidth}
                        height={barHeight}
                        fill={`url(#serviceGrad-${d.id})`}
                        rx="3"
                        ry="3"
                        className="transition-all duration-150"
                        opacity={hoveredService && !isHovered ? 0.6 : 1}
                      />

                      {/* Valor numérico en el tope */}
                      <text
                        x={x + barWidth / 2}
                        y={y - 5}
                        fill={isHovered ? "#d97706" : "#475569"}
                        fontSize="9px"
                        fontWeight="black"
                        textAnchor="middle"
                        fontFamily="monospace"
                      >
                        {d.value}m
                      </text>

                      {/* Etiqueta del prefijo del trámite */}
                      <text
                        x={x + barWidth / 2}
                        y={height - padding + 15}
                        fill="#122e70"
                        fontSize="8px"
                        fontWeight="black"
                        textAnchor="middle"
                      >
                        {d.prefix}
                      </text>
                    </g>
                  );
                })}

                {/* Eje Base */}
                <line
                  x1={padding}
                  y1={height - padding}
                  x2={width - padding}
                  y2={height - padding}
                  stroke="#94a3b8"
                  strokeWidth="1.5"
                />
              </svg>
            </div>

            {/* Tooltip Dinámico */}
            <div className="min-h-[32px] flex items-center justify-center border-t border-slate-200/65 pt-2">
              {hoveredService ? (
                (() => {
                  const item = stats.serviceData.find(s => s.id === hoveredService);
                  return (
                    <div className="text-[10px] text-slate-700 font-medium">
                      <span className="font-extrabold text-amber-700">[{item?.prefix}]</span> {item?.name} —{" "}
                      <span className="font-bold text-amber-800 font-mono">{item?.value} minutos</span> promedio{" "}
                      <span className="text-[8.5px] text-slate-400">({item?.count} registrados hoy)</span>
                    </div>
                  );
                })()
              ) : (
                <div className="text-[8.5px] text-slate-400 uppercase tracking-widest font-black flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-slate-300" />
                  Pase el cursor sobre las barras para ver detalles del trámite
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
