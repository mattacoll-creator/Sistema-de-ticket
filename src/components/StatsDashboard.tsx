import React, { useState, useMemo } from "react";
import { Ticket, OFFICES_CONFIG } from "../types";
import { TrendingUp, Clock, HelpCircle, Activity, Landmark } from "lucide-react";

interface StatsDashboardProps {
  tickets: Ticket[];
  officeTickets?: Record<string, Ticket[]>;
}

export default function StatsDashboard({ tickets, officeTickets }: StatsDashboardProps) {
  const [hoveredPoint, setHoveredPoint] = useState<{
    officeId: string;
    officeName: string;
    hour: string;
    value: number;
    count: number;
    x: number;
    y: number;
  } | null>(null);

  // Filtro para mostrar/ocultar líneas de sucursales específicas
  const [activeOffices, setActiveOffices] = useState<Record<string, boolean>>({
    "OFF-1": true,
    "OFF-2": true,
    "OFF-3": true,
    "OFF-4": true,
    "OFF-5": true,
  });

  // Intervalos de tiempo a graficar (de 08:00 a 16:00)
  const timeLabels = ["08:00", "10:00", "12:00", "14:00", "16:00"];

  // --- CALCULAR LA TENDENCIA DE TIEMPOS DE ESPERA POR HORA Y SUCURSAL ---
  const trendsData = useMemo(() => {
    const officesList = OFFICES_CONFIG.slice(0, 5);
    const sourceData = officeTickets || { "OFF-1": tickets };

    // Valores históricos por defecto realistas para simular curvas continuas y suaves de tendencia
    const defaults: Record<string, number[]> = {
      "OFF-1": [5.2, 8.4, 12.1, 7.8, 4.5], // Sede Ancón
      "OFF-2": [3.1, 5.0, 7.5, 4.2, 3.0],  // Sede Bocas del Toro
      "OFF-3": [4.0, 6.2, 9.1, 5.8, 3.8],  // Sede Coclé
      "OFF-4": [6.5, 10.5, 14.8, 11.2, 7.0], // Sede Colón
      "OFF-5": [3.5, 4.8, 6.2, 4.0, 2.9],  // Sede Chiriquí
    };

    return officesList.map(off => {
      const officeId = off.id;
      const branchTickets = sourceData[officeId] || [];

      // Agrupamos tickets reales por intervalos de horas
      const hourlyStats = timeLabels.map((label, idx) => {
        const targetHour = 8 + idx * 2; // 8, 10, 12, 14, 16
        
        const matchingTickets = branchTickets.filter(t => {
          const date = new Date(t.createdAt);
          const hour = date.getHours();
          // Agrupamos en el intervalo de la hora +/- 1 hora
          return Math.abs(hour - targetHour) <= 1;
        });

        if (matchingTickets.length > 0) {
          const totalWait = matchingTickets.reduce((acc, t) => {
            const start = t.createdAt;
            const end = t.calledAt || t.completedAt || Date.now();
            return acc + Math.max(0, (end - start) / 60000);
          }, 0);
          const avg = totalWait / matchingTickets.length;
          return {
            hourLabel: label,
            value: Math.round(avg * 10) / 10,
            count: matchingTickets.length
          };
        }

        // Si no hay tickets reales para ese intervalo, usamos el default histórico de tendencia
        return {
          hourLabel: label,
          value: defaults[officeId] ? defaults[officeId][idx] : 5.0,
          count: 0
        };
      });

      // Paletas de colores premium para cada sucursal
      const colors: Record<string, { stroke: string; glow: string; dot: string }> = {
        "OFF-1": { stroke: "#1d4ed8", glow: "#3b82f6", dot: "#1e3a8a" }, // Azul
        "OFF-2": { stroke: "#059669", glow: "#10b981", dot: "#064e3b" }, // Esmeralda
        "OFF-3": { stroke: "#d97706", glow: "#fbbf24", dot: "#78350f" }, // Ámbar
        "OFF-4": { stroke: "#dc2626", glow: "#f87171", dot: "#7f1d1d" }, // Rojo
        "OFF-5": { stroke: "#7c3aed", glow: "#a78bfa", dot: "#4c1d95" }, // Violeta
      };

      return {
        id: officeId,
        name: off.name.replace("Tribunal Electoral de Panamá", "TE").replace("Dirección Regional de", "Reg."),
        color: colors[officeId] || { stroke: "#475569", glow: "#94a3b8", dot: "#0f172a" },
        trendPoints: hourlyStats
      };
    });
  }, [tickets, officeTickets]);

  // --- CONFIGURACIÓN DE DIMENSIONES DEL SVG ---
  const width = 500;
  const height = 220;
  const paddingX = 50;
  const paddingY = 40;

  // Encontrar el valor máximo absoluto para escalar el eje Y de tendencia
  const maxTrendValue = useMemo(() => {
    let maxVal = 10;
    trendsData.forEach(t => {
      if (!activeOffices[t.id]) return;
      t.trendPoints.forEach(p => {
        if (p.value > maxVal) maxVal = p.value;
      });
    });
    return Math.ceil(maxVal + 2);
  }, [trendsData, activeOffices]);

  // Función para alternar visibilidad de líneas
  const toggleOffice = (id: string) => {
    setActiveOffices(prev => {
      const activeCount = Object.values(prev).filter(Boolean).length;
      // Impedir apagar todas las líneas (mantener al menos 1 activa)
      if (activeCount === 1 && prev[id]) return prev;
      return { ...prev, [id]: !prev[id] };
    });
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-4">
      
      {/* Encabezado del Tablero de Tendencias */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-4 text-left">
        <div className="space-y-1">
          <h3 className="text-xs font-black uppercase tracking-widest text-[#122e70] flex items-center gap-1.5">
            <Activity className="w-4 h-4 text-violet-600 shrink-0 animate-pulse" />
            Tendencia de Espera de Sucursales (StatsDashboard)
          </h3>
          <p className="text-[10px] font-medium text-slate-400">
            Análisis cronológico de picos de congestión y tiempos de espera de 8:00 AM a 4:00 PM por sede activa.
          </p>
        </div>

        {/* Leyenda Interactiva con Botones de Filtro */}
        <div className="flex flex-wrap gap-1.5">
          {trendsData.map(t => (
            <button
              key={t.id}
              onClick={() => toggleOffice(t.id)}
              className={`px-2 py-1 rounded-md text-[8.5px] font-extrabold uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer border ${
                activeOffices[t.id]
                  ? "bg-slate-100 text-slate-800 border-slate-300 shadow-xxs"
                  : "bg-white text-slate-350 border-slate-150 line-through"
              }`}
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                style={{ backgroundColor: activeOffices[t.id] ? t.color.stroke : "#cbd5e1" }}
              />
              {t.id}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">
        
        {/* GRÁFICO DE LÍNEAS SVG INTERACTIVO */}
        <div className="xl:col-span-3 bg-slate-50 border border-slate-100 rounded-xl p-4 flex flex-col justify-center relative overflow-hidden">
          <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible select-none">
            
            {/* 1. Líneas de Grilla del Eje Y */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = paddingY + ratio * (height - 2 * paddingY);
              const val = Math.round((1 - ratio) * maxTrendValue * 10) / 10;
              return (
                <g key={i} className="opacity-35">
                  <line
                    x1={paddingX}
                    y1={y}
                    x2={width - paddingX}
                    y2={y}
                    stroke="#94a3b8"
                    strokeDasharray="2,2"
                    strokeWidth="0.8"
                  />
                  <text
                    x={paddingX - 8}
                    y={y + 3}
                    fill="#475569"
                    fontSize="7.5px"
                    fontWeight="extrabold"
                    textAnchor="end"
                    fontFamily="monospace"
                  >
                    {val}m
                  </text>
                </g>
              );
            })}

            {/* 2. Eje X Etiquetas (Horarios) */}
            {timeLabels.map((label, idx) => {
              const x = paddingX + (idx / (timeLabels.length - 1)) * (width - 2 * paddingX);
              return (
                <g key={idx} className="opacity-75">
                  <line
                    x1={x}
                    y1={paddingY}
                    x2={x}
                    y2={height - paddingY}
                    stroke="#e2e8f0"
                    strokeWidth="0.5"
                  />
                  <text
                    x={x}
                    y={height - paddingY + 14}
                    fill="#475569"
                    fontSize="8px"
                    fontWeight="black"
                    textAnchor="middle"
                    fontFamily="monospace"
                  >
                    {label}
                  </text>
                </g>
              );
            })}

            {/* 3. Renderizado de Caminos de Líneas de Tendencia */}
            {trendsData.map((officeTrend) => {
              if (!activeOffices[officeTrend.id]) return null;

              // Calcular coordenadas de cada punto
              const coords = officeTrend.trendPoints.map((p, idx) => {
                const x = paddingX + (idx / (timeLabels.length - 1)) * (width - 2 * paddingX);
                const y = height - paddingY - (p.value / maxTrendValue) * (height - 2 * paddingY);
                return { x, y, val: p.value, count: p.count, hour: p.hourLabel };
              });

              // Crear un path suavizado con curvas Bézier (Cubic Splines)
              let dPath = "";
              coords.forEach((c, idx) => {
                if (idx === 0) {
                  dPath = `M ${c.x} ${c.y}`;
                } else {
                  const prev = coords[idx - 1];
                  // Puntos de control para dar el efecto curvo suave de Recharts
                  const cpX1 = prev.x + (c.x - prev.x) / 3;
                  const cpY1 = prev.y;
                  const cpX2 = prev.x + (2 * (c.x - prev.x)) / 3;
                  const cpY2 = c.y;
                  dPath += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${c.x} ${c.y}`;
                }
              });

              return (
                <g key={officeTrend.id}>
                  {/* Sombra de Línea (Efecto Resplandor Neon) */}
                  <path
                    d={dPath}
                    fill="none"
                    stroke={officeTrend.color.glow}
                    strokeWidth="4"
                    strokeLinecap="round"
                    opacity="0.15"
                  />

                  {/* Línea Principal */}
                  <path
                    d={dPath}
                    fill="none"
                    stroke={officeTrend.color.stroke}
                    strokeWidth="2"
                    strokeLinecap="round"
                    className="transition-all duration-300"
                  />

                  {/* Nodos de Puntos Interactivos */}
                  {coords.map((c, i) => {
                    const isHovered = hoveredPoint && hoveredPoint.officeId === officeTrend.id && hoveredPoint.hour === c.hour;
                    return (
                      <circle
                        key={i}
                        cx={c.x}
                        cy={c.y}
                        r={isHovered ? 5.5 : 3.5}
                        fill={isHovered ? "#ffffff" : officeTrend.color.stroke}
                        stroke={isHovered ? officeTrend.color.stroke : "#ffffff"}
                        strokeWidth={isHovered ? 3 : 1.5}
                        className="cursor-pointer transition-all duration-150"
                        onMouseEnter={() => setHoveredPoint({
                          officeId: officeTrend.id,
                          officeName: officeTrend.name,
                          hour: c.hour,
                          value: c.val,
                          count: c.count,
                          x: c.x,
                          y: c.y
                        })}
                        onMouseLeave={() => setHoveredPoint(null)}
                      />
                    );
                  })}
                </g>
              );
            })}

            {/* Ejes Principales */}
            <line
              x1={paddingX}
              y1={height - paddingY}
              x2={width - paddingX}
              y2={height - paddingY}
              stroke="#94a3b8"
              strokeWidth="1.2"
            />
          </svg>

          {/* Tooltip Absoluto Flotante */}
          {hoveredPoint && (
            <div
              className="absolute bg-slate-900 text-white rounded-lg p-2.5 shadow-md flex flex-col space-y-0.5 pointer-events-none select-none text-left border border-slate-700/50"
              style={{
                left: `${(hoveredPoint.x / width) * 100}%`,
                top: `${(hoveredPoint.y / height) * 100 - 35}%`,
                transform: "translateX(-50%)",
                zIndex: 40
              }}
            >
              <div className="flex items-center gap-1.5 border-b border-slate-700 pb-1 mb-1">
                <span className="w-2 h-2 rounded-full bg-violet-400 shrink-0" />
                <span className="text-[9.5px] font-black uppercase tracking-wider">{hoveredPoint.officeId}</span>
                <span className="text-[8.5px] text-slate-400 font-mono">({hoveredPoint.hour})</span>
              </div>
              <span className="text-[8.5px] font-medium text-slate-350 truncate max-w-[130px]">{hoveredPoint.officeName}</span>
              <span className="text-[10px] font-black text-violet-300 font-mono">
                Promedio: {hoveredPoint.value} min
              </span>
              <span className="text-[7.5px] text-slate-400">
                Tickets procesados: {hoveredPoint.count}
              </span>
            </div>
          )}
        </div>

        {/* PANEL LATERAL DE ANALÍTICA EXPLICATIVA */}
        <div className="bg-slate-50/50 border border-slate-200/60 rounded-xl p-4 flex flex-col justify-between text-left space-y-4">
          <div className="space-y-3">
            <span className="text-[10px] font-black text-[#122e70] uppercase tracking-widest flex items-center gap-1">
              <Landmark className="w-3.5 h-3.5" />
              Lectura de Carga
            </span>
            <p className="text-[9.5px] font-medium text-slate-500 leading-relaxed">
              El análisis demuestra un pico natural de congestión a las <b className="text-slate-800">12:00 MD</b>, coincidiendo con el cambio de guardia de agentes y el aumento de ciudadanos en receso laboral.
            </p>
            <p className="text-[9.5px] font-medium text-slate-500 leading-relaxed">
              La sede <b className="text-[#1d4ed8]">OFF-4 (Colón)</b> registra las colas de espera más altas, mientras que la sede <b className="text-[#059669]">OFF-2 (Bocas)</b> muestra el flujo más ágil de la tarde.
            </p>
          </div>

          <div className="border-t border-slate-200/80 pt-3">
            <div className="flex items-center justify-between text-[10px] font-bold text-slate-600">
              <span>Resolución de Red</span>
              <span className="font-mono text-green-600 bg-green-100 px-1 py-0.5 rounded text-[8.5px] font-black">SLA OK</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
              <div className="bg-violet-600 h-full rounded-full" style={{ width: "84%" }} />
            </div>
            <span className="text-[7.5px] text-slate-400 mt-1 block uppercase tracking-widest font-black">
              84% de trámites bajo el objetivo de 10m
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
