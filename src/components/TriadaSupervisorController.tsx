import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  TrendingUp, 
  Camera, 
  Upload, 
  Search, 
  Building2, 
  Grid, 
  List, 
  RotateCcw, 
  UserPlus, 
  Play, 
  Pause, 
  X, 
  Award, 
  AlertCircle, 
  Fingerprint, 
  ArrowRight,
  RefreshCw,
  Sliders,
  Check,
  ChevronRight,
  ShieldAlert,
  UserCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { SUCURSALES_TE } from '../data';
import { Ticket, TicketStatus } from '../types';

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
  avatarUrl: string;
  status: 'ONLINE' | 'ATTENDING' | 'BREAK' | 'OFFLINE';
  activeTicketCode?: string;
  completedCount: number;
  photoCompleted: number;
  fingerprintCompleted: number;
  signatureCompleted: number;
}

// Initial mockup Triada and Photography agents
const INITIAL_TRIADA_AGENTS: TriadaAgent[] = [
  {
    id: "tag-1",
    nombre: "Yesselin Samudio",
    username: "yesselin.triada",
    sucursalId: "OFF-1", // Ancón
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
    status: "ATTENDING",
    activeTicketCode: "REG-004",
    completedCount: 28,
    photoCompleted: 28,
    fingerprintCompleted: 25,
    signatureCompleted: 28
  },
  {
    id: "tag-2",
    nombre: "Lerquia Acosta",
    username: "lerquia.triada",
    sucursalId: "OFF-1", // Ancón
    avatarUrl: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=150",
    status: "ONLINE",
    completedCount: 22,
    photoCompleted: 22,
    fingerprintCompleted: 20,
    signatureCompleted: 22
  },
  {
    id: "tag-3",
    nombre: "Ashtrid Mendieta",
    username: "ashtrid.triada",
    sucursalId: "OFF-2", // Arraiján
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
    status: "BREAK",
    completedCount: 19,
    photoCompleted: 19,
    fingerprintCompleted: 18,
    signatureCompleted: 19
  },
  {
    id: "tag-4",
    nombre: "Juan Rivera",
    username: "juan.triada",
    sucursalId: "OFF-1", // Ancón
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
    status: "ATTENDING",
    activeTicketCode: "RBM-002",
    completedCount: 31,
    photoCompleted: 31,
    fingerprintCompleted: 29,
    signatureCompleted: 31
  },
  {
    id: "tag-5",
    nombre: "Kayna Asprilla",
    username: "kayna.triada",
    sucursalId: "OFF-3", // David
    avatarUrl: "https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=150",
    status: "ONLINE",
    completedCount: 15,
    photoCompleted: 15,
    fingerprintCompleted: 14,
    signatureCompleted: 15
  },
  {
    id: "tag-6",
    nombre: "Jesus Tuñon",
    username: "jesus.triada",
    sucursalId: "OFF-4", // Chitre
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=150",
    status: "OFFLINE",
    completedCount: 0,
    photoCompleted: 0,
    fingerprintCompleted: 0,
    signatureCompleted: 0
  }
];

// Mock database of biometric photos taken live
interface LiveBiometricPhoto {
  id: string;
  ticketCode: string;
  citizenName: string;
  agentName: string;
  timestamp: number;
  imageUrl: string;
  qualityScore: number;
  checks: {
    sharpness: boolean;
    lighting: boolean;
    background: boolean;
    eyesOpen: boolean;
  };
}

const INITIAL_LIVE_PHOTOS: LiveBiometricPhoto[] = [
  {
    id: "photo-1",
    ticketCode: "REG-001",
    citizenName: "Milagros Vergara",
    agentName: "Yesselin Samudio",
    timestamp: Date.now() - 5 * 60 * 1000,
    imageUrl: "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
    qualityScore: 98,
    checks: { sharpness: true, lighting: true, background: true, eyesOpen: true }
  },
  {
    id: "photo-2",
    ticketCode: "REG-002",
    citizenName: "Abdiel Ortega",
    agentName: "Lerquia Acosta",
    timestamp: Date.now() - 15 * 60 * 1000,
    imageUrl: "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150",
    qualityScore: 96,
    checks: { sharpness: true, lighting: true, background: true, eyesOpen: true }
  },
  {
    id: "photo-3",
    ticketCode: "RBM-001",
    citizenName: "Xiomara Castrellon",
    agentName: "Juan Rivera",
    timestamp: Date.now() - 25 * 60 * 1000,
    imageUrl: "https://images.unsplash.com/photo-1554151228-14d9def656e4?auto=format&fit=crop&q=80&w=150",
    qualityScore: 94,
    checks: { sharpness: true, lighting: true, background: true, eyesOpen: true }
  }
];

export default function TriadaSupervisorController({ citas, onUpdateCitas, officeFilter = 'Todos' }: TriadaSupervisorProps) {
  const [agents, setAgents] = useState<TriadaAgent[]>(() => {
    const saved = localStorage.getItem('triada_supervisor_agents');
    return saved ? JSON.parse(saved) : INITIAL_TRIADA_AGENTS;
  });

  const [livePhotos, setLivePhotos] = useState<LiveBiometricPhoto[]>(() => {
    const saved = localStorage.getItem('triada_supervisor_photos');
    return saved ? JSON.parse(saved) : INITIAL_LIVE_PHOTOS;
  });

  const [selectedBranch, setSelectedBranch] = useState<string>(officeFilter);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<TriadaAgent | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Photo upload simulation state
  const [uploadingAgentId, setUploadingAgentId] = useState<string | null>(null);
  const [simulatingTicket, setSimulatingTicket] = useState(false);

  // Auto-save state
  useEffect(() => {
    localStorage.setItem('triada_supervisor_agents', JSON.stringify(agents));
  }, [agents]);

  useEffect(() => {
    localStorage.setItem('triada_supervisor_photos', JSON.stringify(livePhotos));
  }, [livePhotos]);

  // Synchronize branch filter when prop changes
  useEffect(() => {
    if (officeFilter && officeFilter !== 'Todos') {
      setSelectedBranch(officeFilter);
    }
  }, [officeFilter]);

  // Filter agents based on branch and search
  const filteredAgents = useMemo(() => {
    return agents.filter(agent => {
      const matchesBranch = selectedBranch === 'Todos' || agent.sucursalId === selectedBranch;
      const matchesSearch = agent.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            agent.username.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesBranch && matchesSearch;
    });
  }, [agents, selectedBranch, searchQuery]);

  // Calculate office names helper
  const getBranchName = (id: string) => {
    if (id === "OFF-1") return "Ancón (Sede Principal)";
    const found = SUCURSALES_TE.find(s => s.id === id);
    return found ? found.nombre : id;
  };

  // Metrics calculations
  const metrics = useMemo(() => {
    const totalCompleted = agents.reduce((sum, a) => sum + a.completedCount, 0);
    const activeAgentsCount = agents.filter(a => a.status === 'ONLINE' || a.status === 'ATTENDING').length;
    const avgScore = livePhotos.length > 0 
      ? Math.round(livePhotos.reduce((sum, p) => sum + p.qualityScore, 0) / livePhotos.length) 
      : 96;
    
    return {
      totalCompleted,
      activeAgentsCount,
      avgQualityScore: avgScore,
      waitingCitizens: Math.floor(Math.random() * 5) + 2 // Dynamic simulated waiting room citizens
    };
  }, [agents, livePhotos]);

  // Handle agent status change
  const handleStatusChange = (agentId: string, newStatus: 'ONLINE' | 'ATTENDING' | 'BREAK' | 'OFFLINE') => {
    setAgents(prev => prev.map(agent => {
      if (agent.id === agentId) {
        return { 
          ...agent, 
          status: newStatus,
          activeTicketCode: newStatus === 'ATTENDING' ? `REG-00${Math.floor(Math.random() * 9) + 1}` : undefined 
        };
      }
      return agent;
    }));
  };

  // Simulate citizen photo capture
  const handleSimulateCapture = async (agent: TriadaAgent) => {
    if (simulatingTicket) return;
    setSimulatingTicket(true);

    // List of gorgeous random portraits to represent new biometric captures
    const citizenPortraits = [
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=150",
      "https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=150",
      "https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=150",
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=150",
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150"
    ];

    const citizenNames = [
      "Gabriela Castillero",
      "Ricardo Martinelli Jr",
      "Sofia Varela",
      "Mateo Cortizo",
      "Valeria Lombana"
    ];

    const procedures = [
      "Cédula por Primera Vez",
      "Renovación de Cédula",
      "Duplicado de Cédula",
      "Enrolamiento de Extranjero",
      "Cédula Juvenil"
    ];

    const randomIndex = Math.floor(Math.random() * citizenPortraits.length);
    const selectedPortrait = citizenPortraits[randomIndex];
    const selectedName = citizenNames[randomIndex];
    const selectedProc = procedures[randomIndex];
    const ticketCode = `REG-0${Math.floor(Math.random() * 80) + 10}`;

    // 1. Create live photo entry
    const newPhoto: LiveBiometricPhoto = {
      id: `photo-${Date.now()}`,
      ticketCode,
      citizenName: selectedName,
      agentName: agent.nombre,
      timestamp: Date.now(),
      imageUrl: selectedPortrait,
      qualityScore: Math.floor(Math.random() * 10) + 90, // 90 to 100%
      checks: {
        sharpness: true,
        lighting: Math.random() > 0.05,
        background: true,
        eyesOpen: true
      }
    };

    // 2. Add delay to simulate camera capturing & biometrics
    setTimeout(() => {
      setLivePhotos(prev => [newPhoto, ...prev.slice(0, 5)]); // Keep last 6 photos

      // Update agent counters
      setAgents(prev => prev.map(a => {
        if (a.id === agent.id) {
          return {
            ...a,
            completedCount: a.completedCount + 1,
            photoCompleted: a.photoCompleted + 1,
            fingerprintCompleted: a.fingerprintCompleted + (Math.random() > 0.2 ? 1 : 0),
            signatureCompleted: a.signatureCompleted + 1,
            status: "ONLINE",
            activeTicketCode: undefined
          };
        }
        return a;
      }));

      setSimulatingTicket(false);
    }, 1500);
  };

  // Upload Photo for Agent Simulation
  const handleAgentPhotoUpload = (agentId: string) => {
    setUploadingAgentId(agentId);
    
    // Select a beautiful random avatar URL as the "uploaded" camera picture
    const sampleAvatars = [
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=150",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=150",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=150",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=150",
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=150",
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=150"
    ];

    setTimeout(() => {
      const randomAvatar = sampleAvatars[Math.floor(Math.random() * sampleAvatars.length)];
      setAgents(prev => prev.map(a => {
        if (a.id === agentId) {
          return { ...a, avatarUrl: randomAvatar };
        }
        return a;
      }));
      setUploadingAgentId(null);
    }, 1000);
  };

  return (
    <div className="space-y-6 animate-fade-in font-sans pb-12">
      
      {/* 1. HEADER SECTION (Elegant Banner) */}
      <div className="bg-gradient-to-r from-purple-900 to-indigo-950 p-6 rounded-lg border border-purple-850 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="space-y-2 relative z-10">
          <div className="flex items-center gap-2.5">
            <div className="bg-purple-600/30 p-2 rounded-lg border border-purple-500/30">
              <Camera className="w-5 h-5 text-purple-300" />
            </div>
            <span className="bg-purple-500/20 text-purple-200 border border-purple-500/30 text-[9px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full">
              Consola de Supervisión
            </span>
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Gestión Tríada y Fotografía Biométrica
          </h2>
          <p className="text-xs md:text-sm text-purple-200/80 max-w-2xl font-medium leading-relaxed">
            Monitoreo en tiempo real de rendimiento para ventanillas de biometría, toma de fotografía, firma oficial y enrolamiento de huellas dactilares.
          </p>
        </div>

        <div className="flex gap-2 shrink-0 z-10">
          <button 
            onClick={() => {
              setAgents(INITIAL_TRIADA_AGENTS);
              setLivePhotos(INITIAL_LIVE_PHOTOS);
            }}
            className="flex items-center gap-2 bg-purple-950/40 hover:bg-purple-900/40 text-purple-300 border border-purple-800 text-[11.5px] font-bold px-3.5 py-2 rounded transition cursor-pointer active:scale-95"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reiniciar Valores</span>
          </button>
        </div>
      </div>

      {/* 2. METRICS CARDS GRID (Sleek Display Stats) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        
        <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Trámites Completados</span>
            <span className="text-2xl font-black text-white mt-1 block">
              {metrics.totalCompleted}
            </span>
            <span className="text-[9px] text-emerald-400 font-bold flex items-center gap-1 mt-1">
              <TrendingUp className="w-3 h-3" /> +12% hoy
            </span>
          </div>
          <div className="bg-purple-950/60 p-3 rounded-full border border-purple-900">
            <CheckCircle className="w-5 h-5 text-purple-400" />
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Agentes Activos</span>
            <span className="text-2xl font-black text-white mt-1 block">
              {metrics.activeAgentsCount} <span className="text-xs text-slate-500 font-medium">/ {agents.length}</span>
            </span>
            <span className="text-[9px] text-slate-400 font-semibold block mt-1">
              En servicio o disponibles
            </span>
          </div>
          <div className="bg-indigo-950/60 p-3 rounded-full border border-indigo-900">
            <Users className="w-5 h-5 text-indigo-400" />
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Calidad de Fotografía</span>
            <span className="text-2xl font-black text-emerald-400 mt-1 block">
              {metrics.avgQualityScore}%
            </span>
            <span className="text-[9px] text-emerald-400/90 font-bold flex items-center gap-0.5 mt-1">
              Excede estándar ISO
            </span>
          </div>
          <div className="bg-emerald-950/60 p-3 rounded-full border border-emerald-900">
            <Camera className="w-5 h-5 text-emerald-400" />
          </div>
        </div>

        <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 shadow-md flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block">Ciudadanos en Espera</span>
            <span className="text-2xl font-black text-amber-500 mt-1 block">
              {metrics.waitingCitizens}
            </span>
            <span className="text-[9px] text-amber-400 font-bold flex items-center gap-1 mt-1">
              <Clock className="w-3 h-3" /> Tiempo medio: 8 min
            </span>
          </div>
          <div className="bg-amber-950/60 p-3 rounded-full border border-amber-900">
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
        </div>

      </div>

      {/* 3. FILTER BAR */}
      <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 flex flex-col sm:flex-row items-center gap-4 justify-between">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-4 w-4 text-slate-400" />
          </span>
          <input
            type="text"
            placeholder="Buscar agente de tríada..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-900 border border-slate-750 rounded pl-9 pr-4 py-2 text-xs font-bold text-slate-300 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-purple-600 transition"
          />
        </div>

        {/* Branch (Sucursal) Filter */}
        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto justify-end">
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-750 rounded px-2.5 py-1.5 shrink-0">
            <Building2 className="w-3.5 h-3.5 text-purple-400" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Sucursal:</span>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="bg-transparent border-none text-xs font-black text-slate-200 outline-none cursor-pointer p-0 pr-1.5"
            >
              <option value="Todos">Todos los centros</option>
              <option value="OFF-1">Ancón (Principal)</option>
              {SUCURSALES_TE.filter(s => s.id !== 'OFF-1').map(s => (
                <option key={s.id} value={s.id}>{s.nombre}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center border border-slate-750 rounded bg-slate-900 overflow-hidden shrink-0">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 transition cursor-pointer ${viewMode === 'grid' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Vista de cuadrícula"
            >
              <Grid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 transition cursor-pointer ${viewMode === 'list' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'}`}
              title="Vista de lista"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>

      {/* 4. MAIN BENTO SECTION (Agents list vs Live photos feed) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: AGENTS PRODUCTIVITY MONITOR (Sizing 8/12 on desktop) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Agentes de Tríada / Fotografía en Servicio ({filteredAgents.length})</span>
            </h3>
            <span className="text-[10px] font-bold text-slate-400">
              Mostrando {filteredAgents.length} de {agents.length} agentes
            </span>
          </div>

          {filteredAgents.length === 0 ? (
            <div className="bg-slate-900 p-8 text-center rounded-lg border border-slate-800 text-slate-400">
              <AlertCircle className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <p className="text-xs font-bold uppercase tracking-wider">No se encontraron agentes</p>
              <p className="text-[11px] text-slate-500 mt-1">Verifique la búsqueda o el filtro de sucursal.</p>
            </div>
          ) : viewMode === 'grid' ? (
            
            /* GRID VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <AnimatePresence mode="popLayout">
                {filteredAgents.map((agent) => (
                  <motion.div
                    layout
                    key={agent.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-900 p-4 rounded-lg border border-slate-800 flex flex-col justify-between hover:border-purple-900/60 transition shadow-lg relative group"
                  >
                    
                    {/* Upper segment of agent card */}
                    <div className="flex items-start gap-3">
                      
                      {/* Avatar picture with upload hover overlay */}
                      <div className="relative shrink-0">
                        <img 
                          src={agent.avatarUrl} 
                          alt={agent.nombre}
                          className="w-12 h-12 rounded-full object-cover border border-slate-750 shadow-inner group-hover:border-purple-500/50 transition-all duration-300"
                          referrerPolicy="no-referrer"
                        />
                        <button
                          onClick={() => handleAgentPhotoUpload(agent.id)}
                          disabled={uploadingAgentId === agent.id}
                          className="absolute inset-0 bg-black/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer duration-250 text-[9px] text-white font-black"
                          title="Actualizar fotografía del agente"
                        >
                          {uploadingAgentId === agent.id ? (
                            <RefreshCw className="w-3.5 h-3.5 animate-spin text-purple-400" />
                          ) : (
                            <Upload className="w-3.5 h-3.5 text-purple-300" />
                          )}
                        </button>

                        {/* Status indicator badge */}
                        <span className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-slate-900 flex items-center justify-center ${
                          agent.status === 'ATTENDING' ? 'bg-amber-500' :
                          agent.status === 'ONLINE' ? 'bg-emerald-500' :
                          agent.status === 'BREAK' ? 'bg-blue-500' : 'bg-slate-600'
                        }`} />
                      </div>

                      {/* Agent details */}
                      <div className="space-y-1 min-w-0">
                        <h4 className="text-xs font-black text-white truncate">{agent.nombre}</h4>
                        <p className="text-[10px] text-slate-400 font-medium">@{agent.username}</p>
                        
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                          <span className="bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded text-[8.5px] font-bold border border-slate-800">
                            📍 {getBranchName(agent.sucursalId)}
                          </span>
                          
                          {/* Status Badge */}
                          <span className={`text-[8.5px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded border ${
                            agent.status === 'ATTENDING' ? 'bg-amber-950/60 text-amber-400 border-amber-900/50' :
                            agent.status === 'ONLINE' ? 'bg-emerald-950/60 text-emerald-400 border-emerald-900/50' :
                            agent.status === 'BREAK' ? 'bg-blue-950/60 text-blue-400 border-blue-900/50' :
                            'bg-slate-950 text-slate-500 border-slate-800/80'
                          }`}>
                            {agent.status === 'ATTENDING' ? `Atendiendo (${agent.activeTicketCode})` :
                             agent.status === 'ONLINE' ? 'Disponible' :
                             agent.status === 'BREAK' ? 'En Receso' : 'Desconectado'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Productivity numbers and progress bar */}
                    <div className="mt-4 pt-3.5 border-t border-slate-800/60 space-y-2">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Trámites Completados</span>
                        <span className="text-slate-200 font-black bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                          {agent.completedCount} realizados
                        </span>
                      </div>
                      
                      {/* Interactive Simulated Progress indicators for Photography vs Biometrics */}
                      <div className="grid grid-cols-3 gap-1.5 text-center pt-0.5">
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                          <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Foto</span>
                          <span className="text-xs font-black text-white block mt-0.5">{agent.photoCompleted}</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                          <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Huellas</span>
                          <span className="text-xs font-black text-white block mt-0.5">{agent.fingerprintCompleted}</span>
                        </div>
                        <div className="bg-slate-950 p-1.5 rounded border border-slate-800">
                          <span className="text-[8px] font-extrabold text-slate-400 uppercase tracking-wider block">Firma</span>
                          <span className="text-xs font-black text-white block mt-0.5">{agent.signatureCompleted}</span>
                        </div>
                      </div>
                    </div>

                    {/* Agent card controls */}
                    <div className="mt-4 pt-3.5 border-t border-slate-800/60 flex items-center justify-between gap-2">
                      
                      {/* State changer dropdown for Supervisor */}
                      <select
                        value={agent.status}
                        onChange={(e) => handleStatusChange(agent.id, e.target.value as any)}
                        className="bg-slate-950 border border-slate-800 hover:border-slate-750 text-[9px] font-extrabold text-slate-300 px-2 py-1 rounded outline-none cursor-pointer"
                      >
                        <option value="ONLINE">Disponible</option>
                        <option value="ATTENDING">Llamar Ticket</option>
                        <option value="BREAK">Receso</option>
                        <option value="OFFLINE">Desconectar</option>
                      </select>

                      {/* Simulation & Detail Actions */}
                      <div className="flex gap-1">
                        <button
                          onClick={() => setSelectedAgent(agent)}
                          className="text-[10px] bg-slate-950 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 font-bold px-2 py-1 rounded transition cursor-pointer"
                        >
                          Historial
                        </button>
                        
                        <button
                          onClick={() => handleSimulateCapture(agent)}
                          disabled={simulatingTicket || agent.status === 'OFFLINE'}
                          className="flex items-center gap-1 text-[10px] bg-purple-950 text-purple-300 border border-purple-800 hover:bg-purple-900 transition font-black px-2.5 py-1 rounded disabled:opacity-40 disabled:cursor-not-allowed"
                          title="Simular la finalización de un trámite biométrico"
                        >
                          <Camera className="w-3 h-3" />
                          <span>Captura Live</span>
                        </button>
                      </div>

                    </div>

                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            
            /* LIST VIEW (Table styled) */
            <div className="bg-slate-900 rounded-lg border border-slate-800 overflow-hidden shadow-lg">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-950 border-b border-slate-800 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                    <th className="p-3.5">Agente</th>
                    <th className="p-3.5">Sucursal</th>
                    <th className="p-3.5">Estado</th>
                    <th className="p-3.5 text-center">Toma de Foto</th>
                    <th className="p-3.5 text-center">Huellas / Firma</th>
                    <th className="p-3.5 text-right">Total Trámites</th>
                    <th className="p-3.5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredAgents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-850/40 text-xs text-slate-300 transition">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2.5">
                          <img 
                            src={agent.avatarUrl} 
                            alt={agent.nombre} 
                            className="w-8 h-8 rounded-full object-cover border border-slate-700"
                            referrerPolicy="no-referrer"
                          />
                          <div>
                            <span className="font-black text-white block">{agent.nombre}</span>
                            <span className="text-[10px] text-slate-500 font-medium block">@{agent.username}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span className="bg-slate-950 text-slate-400 px-1.5 py-0.5 rounded text-[9px] font-bold border border-slate-800">
                          {getBranchName(agent.sucursalId)}
                        </span>
                      </td>
                      <td className="p-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-2.5 h-2.5 rounded-full ${
                            agent.status === 'ATTENDING' ? 'bg-amber-500' :
                            agent.status === 'ONLINE' ? 'bg-emerald-500' :
                            agent.status === 'BREAK' ? 'bg-blue-500' : 'bg-slate-600'
                          }`} />
                          <span className="font-extrabold uppercase text-[10px] tracking-wider text-slate-400">
                            {agent.status === 'ATTENDING' ? 'Atendiendo' :
                             agent.status === 'ONLINE' ? 'Disponible' :
                             agent.status === 'BREAK' ? 'Receso' : 'Desconectado'}
                          </span>
                        </div>
                      </td>
                      <td className="p-3.5 text-center font-bold font-mono text-purple-400">
                        {agent.photoCompleted}
                      </td>
                      <td className="p-3.5 text-center font-bold font-mono text-slate-400">
                        {agent.fingerprintCompleted} / {agent.signatureCompleted}
                      </td>
                      <td className="p-3.5 text-right font-black font-mono text-white">
                        {agent.completedCount}
                      </td>
                      <td className="p-3.5 text-right">
                        <div className="flex justify-end gap-1.5">
                          <button
                            onClick={() => setSelectedAgent(agent)}
                            className="text-[10px] bg-slate-950 hover:bg-slate-850 text-slate-300 font-bold px-2 py-1 rounded transition border border-slate-800 cursor-pointer"
                          >
                            Detalles
                          </button>
                          <button
                            onClick={() => handleSimulateCapture(agent)}
                            className="text-[10px] bg-purple-950 hover:bg-purple-900 text-purple-300 font-black px-2 py-1 rounded transition border border-purple-800 cursor-pointer"
                          >
                            Simular Captura
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>

        {/* RIGHT COLUMN: LIVE BIOMETRIC PORTRAITS FEED (Sizing 4/12 on desktop) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-400" />
              <span>Fotos Biométricas en Vivo</span>
            </h3>
            <span className="animate-pulse bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[8px] font-black uppercase px-2 py-0.5 rounded-full">
              LIVE FEED
            </span>
          </div>

          <div className="bg-slate-900 p-4 rounded-lg border border-slate-800 shadow-md space-y-4">
            
            <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
              Fotografías e identidades capturadas recientemente por los agentes de Tríada para validación y control de calidad ISO.
            </p>

            <div className="space-y-3.5">
              <AnimatePresence mode="popLayout">
                {livePhotos.map((photo) => (
                  <motion.div
                    key={photo.id}
                    initial={{ opacity: 0, scale: 0.95, y: -10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    className="bg-slate-950 p-2.5 rounded border border-slate-850 flex items-center gap-3 relative hover:border-purple-900/40 transition"
                  >
                    {/* Capture Portrait Frame */}
                    <div className="relative shrink-0 border border-slate-700 p-0.5 rounded bg-slate-900">
                      <img 
                        src={photo.imageUrl} 
                        alt="Citizen Biometric Capture" 
                        className="w-14 h-18 object-cover rounded-sm border border-slate-800"
                        referrerPolicy="no-referrer"
                      />
                      <span className="absolute bottom-1 right-1 bg-slate-950/80 text-white font-mono text-[7px] px-1 py-0.5 rounded font-black border border-slate-800">
                        90°
                      </span>
                    </div>

                    {/* Quality checklist details */}
                    <div className="flex-1 min-w-0 space-y-1 text-slate-300">
                      <div className="flex items-center justify-between">
                        <span className="bg-purple-950 text-purple-300 px-1 rounded text-[8px] font-black border border-purple-900">
                          {photo.ticketCode}
                        </span>
                        <span className={`text-[9px] font-black font-mono ${photo.qualityScore >= 95 ? 'text-emerald-400' : 'text-amber-400'}`}>
                          Score: {photo.qualityScore}%
                        </span>
                      </div>
                      
                      <h5 className="text-[11px] font-black text-white truncate">{photo.citizenName}</h5>
                      <p className="text-[9px] text-slate-500 font-bold truncate">Capturado por: {photo.agentName}</p>
                      
                      {/* Checkboxes indicators */}
                      <div className="flex gap-1.5 pt-1">
                        <span className="text-[7.5px] font-bold bg-slate-900 text-emerald-400 border border-emerald-950 px-1 py-0.5 rounded flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Foco
                        </span>
                        <span className="text-[7.5px] font-bold bg-slate-900 text-emerald-400 border border-emerald-950 px-1 py-0.5 rounded flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Luz
                        </span>
                        <span className="text-[7.5px] font-bold bg-slate-900 text-emerald-400 border border-emerald-950 px-1 py-0.5 rounded flex items-center gap-0.5">
                          <Check className="w-2.5 h-2.5" /> Fondo
                        </span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

          </div>

          {/* COMPLIANCE GUIDE CARD */}
          <div className="bg-slate-900/80 p-4 rounded-lg border border-slate-800 shadow-md space-y-3">
            <h4 className="text-xs font-extrabold text-white uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-purple-400" />
              <span>Estándar Fotográfico ICAO Doc 9303</span>
            </h4>
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              Asegúrese de que todos los agentes cumplan rigurosamente con los criterios de aceptación para evitar devoluciones de cédulas y pasaportes en las fases centrales:
            </p>
            <ul className="text-[9.5px] text-slate-400 space-y-1.5 pl-1.5 list-disc list-inside">
              <li>Hombros cubiertos sin escotes pronunciados</li>
              <li>Sin anteojos de sol, gorras ni accesorios grandes</li>
              <li>Fondo gris neutro plano sin sombras</li>
              <li>Expresión facial neutra y boca cerrada</li>
              <li>Ojos abiertos y alineación horizontal a 90 grados</li>
            </ul>
          </div>

        </div>

      </div>

      {/* 5. AGENT PROFILE DETAILS MODAL (History / Productivity Analysis) */}
      <AnimatePresence>
        {selectedAgent && (
          <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 w-full max-w-2xl rounded-lg border border-slate-800 overflow-hidden shadow-2xl"
            >
              
              {/* Modal Header */}
              <div className="bg-slate-950 px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img 
                    src={selectedAgent.avatarUrl} 
                    alt={selectedAgent.nombre} 
                    className="w-10 h-10 rounded-full object-cover border border-slate-700"
                    referrerPolicy="no-referrer"
                  />
                  <div>
                    <h3 className="text-sm font-black text-white">{selectedAgent.nombre}</h3>
                    <p className="text-[10.5px] text-purple-400 font-bold">Resumen de Desempeño • Tríada y Fotografía</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="p-1.5 rounded-full hover:bg-slate-850 text-slate-400 hover:text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                
                {/* Agent Productivity breakdown statistics */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="bg-slate-950 p-3.5 rounded border border-slate-850 text-center">
                    <Camera className="w-5 h-5 text-purple-400 mx-auto mb-1" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Fotografías Tomadas</span>
                    <span className="text-xl font-black text-white mt-1 block">{selectedAgent.photoCompleted}</span>
                  </div>
                  
                  <div className="bg-slate-950 p-3.5 rounded border border-slate-850 text-center">
                    <Fingerprint className="w-5 h-5 text-indigo-400 mx-auto mb-1" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Huellas Dactilares</span>
                    <span className="text-xl font-black text-white mt-1 block">{selectedAgent.fingerprintCompleted}</span>
                  </div>

                  <div className="bg-slate-950 p-3.5 rounded border border-slate-850 text-center">
                    <Award className="w-5 h-5 text-emerald-400 mx-auto mb-1" />
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block">Eficiencia General</span>
                    <span className="text-xl font-black text-emerald-400 mt-1 block">
                      {selectedAgent.completedCount > 0 ? Math.round((selectedAgent.photoCompleted / selectedAgent.completedCount) * 100) : 100}%
                    </span>
                  </div>
                </div>

                {/* Simulated Recent Transactions list of this agent */}
                <div className="space-y-2.5">
                  <h4 className="text-[10.5px] font-extrabold text-slate-400 uppercase tracking-wider block">
                    Últimos Ciudadanos Atendidos por el Agente
                  </h4>
                  
                  <div className="bg-slate-950 rounded border border-slate-850 divide-y divide-slate-850 overflow-hidden">
                    {selectedAgent.completedCount > 0 ? (
                      Array.from({ length: Math.min(selectedAgent.completedCount, 4) }).map((_, idx) => {
                        const citizenNames = ["Aurelio Gonzalez", "Margarita Pinilla", "Joaquín Endara", "Catarina Torrijos"];
                        const targetName = citizenNames[idx % citizenNames.length];
                        const fakeTime = new Date(Date.now() - (idx * 22 + 5) * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                        
                        return (
                          <div key={idx} className="p-3 flex items-center justify-between text-xs hover:bg-slate-900/60 transition">
                            <div className="flex items-center gap-2.5">
                              <span className="bg-slate-900 border border-slate-800 text-[10px] font-black text-purple-400 px-2 py-0.5 rounded">
                                REG-0{70 - idx * 2}
                              </span>
                              <div>
                                <span className="font-extrabold text-white block">{targetName}</span>
                                <span className="text-[10px] text-slate-500 block">Trámite: Renovación Cédula</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-400 block font-bold">{fakeTime}</span>
                              <span className="text-[9px] text-emerald-400 font-extrabold uppercase">Completado ✔</span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="p-4 text-center text-slate-500 text-xs">
                        Este agente no ha procesado ningún trámite el día de hoy.
                      </div>
                    )}
                  </div>
                </div>

              </div>

              {/* Modal Footer */}
              <div className="bg-slate-950 px-5 py-4 border-t border-slate-800 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedAgent(null)}
                  className="text-xs font-bold bg-slate-900 hover:bg-slate-850 text-slate-300 border border-slate-800 px-4 py-2 rounded transition cursor-pointer"
                >
                  Cerrar Ventana
                </button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
