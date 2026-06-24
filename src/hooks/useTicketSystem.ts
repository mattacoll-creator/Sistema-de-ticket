/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Ticket, TicketStatus, TicketPhase, Cubicle, CubicleStatus, ServiceType, SERVICES_CONFIG } from "../types";
import { announceAndCall } from "../utils/audio";
import { getSupabaseClient } from "../utils/supabaseClient";

const STORAGE_KEYS = {
  TICKETS: "ticket_system_tickets_v1",
  CUBICLES: "ticket_system_cubicles_v1",
  STATS: "ticket_system_stats_v1",
  AUTO_ASSIGN: "ticket_system_auto_assign_v1",
  CURRENT_OFFICE: "ticket_system_current_office_v1",
  OFFICE_TICKETS: "ticket_system_office_tickets_v1",
  OFFICE_CUBICLES: "ticket_system_office_cubicles_v1",
  OFFICE_AUTO_ASSIGN: "ticket_system_office_auto_assign_v1"
};

export function canCubicleServeProcedure(cubicleId: string, procedure?: string): boolean {
  if (!procedure) return true; // Non-procedure tickets (like Cedulación) can be served normally
  
  const num = parseInt(cubicleId.replace("CUB-", ""), 10);
  if (isNaN(num)) return true;

  // Routing rules requested:
  // - OR: Cubículos 2 a 8
  if (procedure === "OR") {
    return num >= 2 && num <= 8;
  }
  // - SI y OI: Cubículo 9
  if (procedure === "SI" || procedure === "OI") {
    return num === 9;
  }
  // - ED: Cubículo 10
  if (procedure === "ED") {
    return num === 10;
  }
  // - RS: Cubículo 11
  if (procedure === "RS") {
    return num === 11;
  }
  // - RTMA / RMAT: Cubículos 12 a 14
  if (procedure === "RMAT" || procedure === "RTMA") {
    return num >= 12 && num <= 14;
  }
  // - SAU: Cubículo 15
  if (procedure === "SAU") {
    return num === 15;
  }
  // - OHV: Cubículos 16 a 20
  if (procedure === "OHV") {
    return num >= 16 && num <= 20;
  }
  // - STR: Cubículo 23
  if (procedure === "STR") {
    return num === 23;
  }
  // - OTR: Cubículo 1
  if (procedure === "OTR") {
    return num === 1;
  }

  return true;
}

const INITIAL_CUBICLES: Cubicle[] = [
  {
    id: "CUB-1",
    name: "Cubículo 1 (OTR)",
    agentName: "Juan Pérez",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-2",
    name: "Cubículo 2 (OR)",
    agentName: "Laura Martínez",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-3",
    name: "Cubículo 3 (OR)",
    agentName: "Carlos Sánchez",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-4",
    name: "Cubículo 4 (OR)",
    agentName: "Ana Rodríguez",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-5",
    name: "Cubículo 5 (OR)",
    agentName: "Pedro Gómez",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-6",
    name: "Cubículo 6 (OR)",
    agentName: "Sofía Díaz",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-7",
    name: "Cubículo 7 (OR)",
    agentName: "Diego Torres",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-8",
    name: "Cubículo 8 (OR)",
    agentName: "Camila Ríos",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-9",
    name: "Cubículo 9 (SI / OI)",
    agentName: "Mateo Vargas",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-10",
    name: "Cubículo 10 (ED)",
    agentName: "Lucas Silva",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-11",
    name: "Cubículo 11 (RS)",
    agentName: "Elena Rocha",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-12",
    name: "Cubículo 12 (RMAT)",
    agentName: "Facundo Ortiz",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-13",
    name: "Cubículo 13 (RMAT)",
    agentName: "Valentina Luna",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-14",
    name: "Cubículo 14 (RMAT)",
    agentName: "Thiago Medina",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-15",
    name: "Cubículo 15 (SAU)",
    agentName: "Isabella Castro",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-16",
    name: "Cubículo 16 (OHV)",
    agentName: "Nicolás Peña",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-17",
    name: "Cubículo 17 (OHV)",
    agentName: "Martina Paz",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-18",
    name: "Cubículo 18 (OHV)",
    agentName: "Andrés Méndez",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-19",
    name: "Cubículo 19 (OHV)",
    agentName: "Sofía Rojas",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-20",
    name: "Cubículo 20 (OHV)",
    agentName: "Gabriela Ramos",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-21",
    name: "Cubículo 21",
    agentName: "Felipe Ruiz",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-22",
    name: "Cubículo 22",
    agentName: "Daniela Sosa",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-23",
    name: "Cubículo 23 (STR)",
    agentName: "Ricardo Espino",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA, TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  }
];

const EMPTY_TICKETS: Ticket[] = [];
const DEFAULT_CUBICLES_CACHE: Record<string, Cubicle[]> = {};

function getDefaultCubiclesForOffice(officeId: string): Cubicle[] {
  if (!DEFAULT_CUBICLES_CACHE[officeId]) {
    DEFAULT_CUBICLES_CACHE[officeId] = INITIAL_CUBICLES.map(c => {
      const cubicle = { ...c };
      if (officeId !== "OFF-1") {
        cubicle.supportedServices = (cubicle.supportedServices || []).filter(s => s !== ServiceType.EXTRANJERIA);
      }
      return cubicle;
    });
  }
  return DEFAULT_CUBICLES_CACHE[officeId];
}

export function useTicketSystem() {
  const [currentOfficeId, setCurrentOfficeId] = useState<string>("OFF-1");
  const [officeTickets, setOfficeTickets] = useState<Record<string, Ticket[]>>({});
  const [officeCubicles, setOfficeCubicles] = useState<Record<string, Cubicle[]>>({});
  const [officeAutoAssign, setOfficeAutoAssign] = useState<Record<string, boolean>>({});

  const [activeCall, setActiveCall] = useState<{ ticket: Ticket; cubicle: Cubicle } | null>(null);
  
  // Simulation states
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(10000); // ms per user arrival (10s default)
  const simulationTimer = useRef<NodeJS.Timeout | null>(null);

  // Derived state for the active office - memoized to prevent infinite re-renders or stale dependencies
  const tickets = useMemo(() => {
    return officeTickets[currentOfficeId] || EMPTY_TICKETS;
  }, [officeTickets, currentOfficeId]);

  const cubicles = useMemo(() => {
    return officeCubicles[currentOfficeId] || getDefaultCubiclesForOffice(currentOfficeId);
  }, [officeCubicles, currentOfficeId]);

  const ticketsRef = useRef<Ticket[]>(EMPTY_TICKETS);
  ticketsRef.current = tickets;

  const isAutoAssignActive = officeAutoAssign[currentOfficeId] !== false;

  // Evitar loops infinitos y colisiones de sincronización con Supabase
  const lastSupabaseStateRef = useRef<string>("");
  const currentStateRef = useRef<string>("");
  currentStateRef.current = JSON.stringify({
    tickets: officeTickets[currentOfficeId] || [],
    cubicles: officeCubicles[currentOfficeId] || getDefaultCubiclesForOffice(currentOfficeId),
    auto_assign: officeAutoAssign[currentOfficeId] !== false
  });

  const setTicketsForCurrentOffice = useCallback((updater: Ticket[] | ((prev: Ticket[]) => Ticket[])) => {
    setOfficeTickets(prev => {
      const currentVal = prev[currentOfficeId] || EMPTY_TICKETS;
      const newVal = typeof updater === "function" ? updater(currentVal) : updater;
      return {
        ...prev,
        [currentOfficeId]: newVal
      };
    });
  }, [currentOfficeId]);

  const setCubiclesForCurrentOffice = useCallback((updater: Cubicle[] | ((prev: Cubicle[]) => Cubicle[])) => {
    setOfficeCubicles(prev => {
      const currentVal = prev[currentOfficeId] || getDefaultCubiclesForOffice(currentOfficeId);
      let newVal = typeof updater === "function" ? updater(currentVal) : updater;
      if (currentOfficeId !== "OFF-1") {
        newVal = newVal.map(c => ({
          ...c,
          supportedServices: (c.supportedServices || []).filter(s => s !== ServiceType.EXTRANJERIA)
        }));
      }
      return {
        ...prev,
        [currentOfficeId]: newVal
      };
    });
  }, [currentOfficeId]);

  const setIsAutoAssignActive = useCallback((active: boolean) => {
    setOfficeAutoAssign(prev => ({
      ...prev,
      [currentOfficeId]: active
    }));
  }, [currentOfficeId]);

  // 1. Load from localStorage
  useEffect(() => {
    try {
      const storedOffice = localStorage.getItem(STORAGE_KEYS.CURRENT_OFFICE);
      if (storedOffice) {
        setCurrentOfficeId(storedOffice);
      }

      const storedOfficeTickets = localStorage.getItem(STORAGE_KEYS.OFFICE_TICKETS);
      let loadedTickets: Record<string, Ticket[]> = {};
      if (storedOfficeTickets) {
        loadedTickets = JSON.parse(storedOfficeTickets);
      } else {
        const oldTickets = localStorage.getItem("ticket_system_tickets_v1");
        if (oldTickets) {
          loadedTickets["OFF-1"] = JSON.parse(oldTickets);
        }
      }
      setOfficeTickets(loadedTickets);

      const storedOfficeCubicles = localStorage.getItem(STORAGE_KEYS.OFFICE_CUBICLES);
      let loadedCubicles: Record<string, Cubicle[]> = {};
      if (storedOfficeCubicles) {
        loadedCubicles = JSON.parse(storedOfficeCubicles);
        // Migrate or replace if cubicle list has changed
        Object.keys(loadedCubicles).forEach(officeId => {
          if (loadedCubicles[officeId].length < INITIAL_CUBICLES.length) {
            loadedCubicles[officeId] = INITIAL_CUBICLES.map(c => {
              const cubicle = { ...c };
              if (officeId !== "OFF-1") {
                cubicle.supportedServices = (cubicle.supportedServices || []).filter(s => s !== ServiceType.EXTRANJERIA);
              }
              return cubicle;
            });
          }
        });
      } else {
        const oldCubicles = localStorage.getItem("ticket_system_cubicles_v1");
        if (oldCubicles) {
          loadedCubicles["OFF-1"] = JSON.parse(oldCubicles);
        }
      }
      setOfficeCubicles(loadedCubicles);

      const storedOfficeAutoAssign = localStorage.getItem(STORAGE_KEYS.OFFICE_AUTO_ASSIGN);
      let loadedAutoAssign: Record<string, boolean> = {};
      if (storedOfficeAutoAssign) {
        loadedAutoAssign = JSON.parse(storedOfficeAutoAssign);
      } else {
        const oldAutoAssign = localStorage.getItem("ticket_system_auto_assign_v1");
        if (oldAutoAssign !== null) {
          loadedAutoAssign["OFF-1"] = JSON.parse(oldAutoAssign);
        }
      }
      setOfficeAutoAssign(loadedAutoAssign);
    } catch (e) {
      console.error("Error loading states from localStorage", e);
    }
  }, []);

  // 2. Persist to localStorage on changes
  useEffect(() => {
    try {
      if (Object.keys(officeTickets).length > 0) {
        localStorage.setItem(STORAGE_KEYS.OFFICE_TICKETS, JSON.stringify(officeTickets));
      }
    } catch (e) {
      console.error("Error saving office tickets", e);
    }
  }, [officeTickets]);

  useEffect(() => {
    try {
      if (Object.keys(officeCubicles).length > 0) {
        localStorage.setItem(STORAGE_KEYS.OFFICE_CUBICLES, JSON.stringify(officeCubicles));
      }
    } catch (e) {
      console.error("Error saving office cubicles", e);
    }
  }, [officeCubicles]);

  useEffect(() => {
    try {
      if (Object.keys(officeAutoAssign).length > 0) {
        localStorage.setItem(STORAGE_KEYS.OFFICE_AUTO_ASSIGN, JSON.stringify(officeAutoAssign));
      }
    } catch (e) {
      console.error("Error saving office auto assignment", e);
    }
  }, [officeAutoAssign]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CURRENT_OFFICE, currentOfficeId);
    } catch (e) {
      console.error("Error saving current office", e);
    }
  }, [currentOfficeId]);

  // --- INTEGRACIÓN REAL CON SUPABASE ---
  const [supabaseSyncStatus, setSupabaseSyncStatus] = useState<"idle" | "offline" | "syncing" | "success" | "error">("idle");

  // Sync to Supabase reactively with a 1.5s debounce to cluster fast UI sequential actions
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setSupabaseSyncStatus("offline");
      return;
    }

    const currentState = JSON.stringify({
      tickets: officeTickets[currentOfficeId] || [],
      cubicles: officeCubicles[currentOfficeId] || getDefaultCubiclesForOffice(currentOfficeId),
      auto_assign: officeAutoAssign[currentOfficeId] !== false
    });

    // Si el estado local ya coincide exactamente con lo último que se recibió/envió a Supabase, no hacemos nada
    if (currentState === lastSupabaseStateRef.current) {
      setSupabaseSyncStatus("success");
      return;
    }

    setSupabaseSyncStatus("syncing");
    const timeoutId = setTimeout(async () => {
      try {
        const { error } = await supabase
          .from("office_state")
          .upsert({
            office_id: currentOfficeId,
            tickets: officeTickets[currentOfficeId] || [],
            cubicles: officeCubicles[currentOfficeId] || INITIAL_CUBICLES.map(c => ({ ...c })),
            auto_assign: officeAutoAssign[currentOfficeId] !== false,
            updated_at: new Date().toISOString()
          }, { onConflict: "office_id" });

        if (error) {
          throw error;
        }
        
        lastSupabaseStateRef.current = currentState;
        setSupabaseSyncStatus("success");
      } catch (err) {
        console.error("Supabase sync issue:", err);
        setSupabaseSyncStatus("error");
      }
    }, 1500);

    return () => clearTimeout(timeoutId);
  }, [officeTickets, officeCubicles, officeAutoAssign, currentOfficeId]);

  // Load initial office data from Supabase
  const pullOfficeFromSupabase = useCallback(async (targetOfficeId: string = currentOfficeId) => {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    setSupabaseSyncStatus("syncing");
    try {
      const { data, error } = await supabase
        .from("office_state")
        .select("*")
        .eq("office_id", targetOfficeId)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const remoteTickets = (data.tickets || []) as Ticket[];
        let remoteCubicles = (data.cubicles || []) as Cubicle[];
        if (remoteCubicles.length < INITIAL_CUBICLES.length) {
          remoteCubicles = INITIAL_CUBICLES.map(c => {
            const cubicle = { ...c };
            if (targetOfficeId !== "OFF-1") {
              cubicle.supportedServices = (cubicle.supportedServices || []).filter(s => s !== ServiceType.EXTRANJERIA);
            }
            return cubicle;
          });
        }
        const remoteAutoAssign = data.auto_assign as boolean;

        const remoteStateStr = JSON.stringify({
          tickets: remoteTickets,
          cubicles: remoteCubicles,
          auto_assign: remoteAutoAssign
        });

        lastSupabaseStateRef.current = remoteStateStr;

        setOfficeTickets(prev => ({ ...prev, [targetOfficeId]: remoteTickets }));
        setOfficeCubicles(prev => ({ ...prev, [targetOfficeId]: remoteCubicles }));
        setOfficeAutoAssign(prev => ({ ...prev, [targetOfficeId]: remoteAutoAssign }));
        
        setSupabaseSyncStatus("success");
        return true;
      }
    } catch (err) {
      console.error("Error pulling from Supabase:", err);
      setSupabaseSyncStatus("error");
    }
    return false;
  }, [currentOfficeId]);

  // Push immediate manual trigger
  const pushOfficeToSupabase = useCallback(async (targetOfficeId: string = currentOfficeId) => {
    const supabase = getSupabaseClient();
    if (!supabase) return false;

    const currentTickets = officeTickets[targetOfficeId] || [];
    const currentCubicles = officeCubicles[targetOfficeId] || INITIAL_CUBICLES.map(c => ({ ...c }));
    const currentAutoAssign = officeAutoAssign[targetOfficeId] !== false;

    setSupabaseSyncStatus("syncing");
    try {
      const { error } = await supabase
        .from("office_state")
        .upsert({
          office_id: targetOfficeId,
          tickets: currentTickets,
          cubicles: currentCubicles,
          auto_assign: currentAutoAssign,
          updated_at: new Date().toISOString()
        }, { onConflict: "office_id" });

      if (error) throw error;

      lastSupabaseStateRef.current = JSON.stringify({
        tickets: currentTickets,
        cubicles: currentCubicles,
        auto_assign: currentAutoAssign
      });

      setSupabaseSyncStatus("success");
      return true;
    } catch (err) {
      console.error("Error pushing to Supabase:", err);
      setSupabaseSyncStatus("error");
      return false;
    }
  }, [officeTickets, officeCubicles, officeAutoAssign]);

  // Realtime subscription to keep other devices/browsers perfectly synchronized in real-time
  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) return;

    const channelName = `realtime-office-${currentOfficeId}`;
    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "office_state",
          filter: `office_id=eq.${currentOfficeId}`
        },
        (payload: any) => {
          if (payload.new) {
            const remoteTickets = (payload.new.tickets || []) as Ticket[];
            let remoteCubicles = (payload.new.cubicles || []) as Cubicle[];
            if (remoteCubicles.length < INITIAL_CUBICLES.length) {
              remoteCubicles = INITIAL_CUBICLES.map(c => {
                const cubicle = { ...c };
                if (currentOfficeId !== "OFF-1") {
                  cubicle.supportedServices = (cubicle.supportedServices || []).filter(s => s !== ServiceType.EXTRANJERIA);
                }
                return cubicle;
              });
            }
            const remoteAutoAssign = payload.new.auto_assign !== false;

            const incomingStateStr = JSON.stringify({
              tickets: remoteTickets,
              cubicles: remoteCubicles,
              auto_assign: remoteAutoAssign
            });

            // Solo aplicamos si el estado recibido difiere del estado local actual
            if (incomingStateStr !== currentStateRef.current) {
              lastSupabaseStateRef.current = incomingStateStr;
              
              setOfficeTickets(prev => ({ ...prev, [currentOfficeId]: remoteTickets }));
              setOfficeCubicles(prev => ({ ...prev, [currentOfficeId]: remoteCubicles }));
              setOfficeAutoAssign(prev => ({ ...prev, [currentOfficeId]: remoteAutoAssign }));
              setSupabaseSyncStatus("success");
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [currentOfficeId]);

  // Initial pull trigger for active office if Supabase keys exist
  useEffect(() => {
    const config = getSupabaseClient();
    if (config) {
      pullOfficeFromSupabase(currentOfficeId);
    }
  }, [currentOfficeId, pullOfficeFromSupabase]);

  // Clean / Reset the whole system
  const resetSystem = useCallback(() => {
    setTicketsForCurrentOffice([]);
    setCubiclesForCurrentOffice(INITIAL_CUBICLES.map(c => ({ ...c })));
    setActiveCall(null);
    setIsSimulationActive(false);
    setIsAutoAssignActive(true);
  }, [setTicketsForCurrentOffice, setCubiclesForCurrentOffice, setIsAutoAssignActive]);

  // Purga inteligente de memoria para optimizar rendimiento de colas
  const purgeOldTickets = useCallback(() => {
    setTicketsForCurrentOffice(prev => {
      const active = prev.filter(t => 
        t.status === TicketStatus.WAITING || 
        t.status === TicketStatus.CALLING || 
        t.status === TicketStatus.ATTENDING
      );
      const finished = prev.filter(t => 
        t.status === TicketStatus.COMPLETED || 
        t.status === TicketStatus.MISSED
      );
      
      // Conservamos solo los 15 terminados más recientes para estadísticas
      finished.sort((a, b) => b.createdAt - a.createdAt);
      const trimmedFinished = finished.slice(0, 15);
      
      // Unir y ordenar por fecha de creación original
      return [...active, ...trimmedFinished].sort((a, b) => a.createdAt - b.createdAt);
    });
  }, [setTicketsForCurrentOffice]);

  // 3. Create ticket
  const createTicket = useCallback((name: string, serviceType: ServiceType, priority: boolean = false, isAppointment: boolean = false, procedure?: string): Ticket => {
    const cleanName = name.trim() || "Anónimo";
    const config = SERVICES_CONFIG[serviceType];
    
    // Calculate ticket number based on how many tickets of this type/procedure have been created today
    const sameServiceTickets = ticketsRef.current.filter(t => 
      procedure 
        ? (t.serviceType === serviceType && t.procedure === procedure)
        : (t.serviceType === serviceType && !t.procedure)
    );
    const orderNumber = sameServiceTickets.length + 1;
    const prefix = procedure || config.prefix;
    const formattedNumber = `${prefix}-${orderNumber.toString().padStart(3, "0")}`;

    // Priority rule: The first 15 tickets of Cedulación each day are reserved and tagged for appointments
    let finalIsAppointment = isAppointment;
    if (serviceType === ServiceType.CEDULACION && orderNumber <= 15) {
      finalIsAppointment = true;
    }

    const newTicket: Ticket = {
      id: Math.random().toString(36).substring(2, 9),
      numberCode: formattedNumber,
      number: orderNumber,
      name: cleanName,
      serviceType,
      status: TicketStatus.WAITING,
      currentPhase: TicketPhase.CAJA,
      phaseHistory: [{ phase: TicketPhase.CAJA, timestamp: Date.now() }],
      createdAt: Date.now(),
      priority,
      isAppointment: finalIsAppointment,
      procedure
    };

    setTicketsForCurrentOffice(prev => [...prev, newTicket]);
    
    // Automatically flag available booths that can service this ticket!
    // But do NOT auto-assign, instead let it be in the general queue.
    // However, if we want to immediately tell them "Go to Cubicle X" if the agent is idle, we can trigger that:
    return newTicket;
  }, [setTicketsForCurrentOffice]);

  // 4. Assign / Call next ticket for a specific cubicle
  const callNextTicket = useCallback(async (cubicleId: string) => {
    const targetCubicle = cubicles.find(c => c.id === cubicleId);
    if (!targetCubicle) return;

    // Reject if cubicle is not online
    if (targetCubicle.status === CubicleStatus.BREAK || targetCubicle.status === CubicleStatus.OFFLINE) {
      return;
    }

    // Get all candidates that are in WAITING status and whose currentPhase is supported by this cubicle
    const candidates = tickets.filter(t => {
      if (t.status !== TicketStatus.WAITING) return false;
      if (!targetCubicle.supportedPhases.includes(t.currentPhase)) return false;
      return canCubicleServeProcedure(cubicleId, t.procedure);
    });

    if (candidates.length === 0) return;

    // Sorting: Priority High (score 4) gets absolute top, then prior appointments (score 2) get second, then walk-ins (score 0), then oldest first
    candidates.sort((a, b) => {
      const valA = (a.priority ? 4 : 0) + (a.isAppointment ? 2 : 0);
      const valB = (b.priority ? 4 : 0) + (b.isAppointment ? 2 : 0);
      if (valA !== valB) {
        return valB - valA;
      }
      return a.createdAt - b.createdAt;
    });

    const chosenTicket = candidates[0];

    // If there was an existing ticket being attended at this cubicle, transition/complete it first based on phase pipeline
    let updatedTickets = tickets.map(t => {
      if (t.assignedCubicleId === cubicleId && (t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING)) {
        let nextPhase: TicketPhase | null = null;
        let nextStatus = TicketStatus.WAITING;
        let finalCompletedAt: number | undefined = undefined;

        if (t.currentPhase === TicketPhase.CAJA) {
          const isShortFlow = t.serviceType === ServiceType.ELECTORAL || t.serviceType === ServiceType.REGISTRO;
          if (isShortFlow) {
            nextStatus = TicketStatus.COMPLETED;
            finalCompletedAt = Date.now();
          } else {
            nextPhase = TicketPhase.TRIADA;
          }
        } else {
          nextStatus = TicketStatus.COMPLETED;
          finalCompletedAt = Date.now();
        }

        const updatedHistory = t.phaseHistory.map(h => {
          if (h.phase === t.currentPhase && !h.completedAt) {
            return {
              ...h,
              completedAt: Date.now(),
              cubicleId: cubicleId,
              agentName: targetCubicle.agentName
            };
          }
          return h;
        });

        if (nextPhase) {
          updatedHistory.push({
            phase: nextPhase,
            timestamp: Date.now()
          });
          return {
            ...t,
            currentPhase: nextPhase,
            status: nextStatus,
            phaseHistory: updatedHistory,
            assignedCubicleId: undefined,
            calledAt: undefined
          };
        } else {
          return {
            ...t,
            status: nextStatus,
            completedAt: finalCompletedAt,
            phaseHistory: updatedHistory,
            assignedCubicleId: undefined
          };
        }
      }
      return t;
    });

    // Mark chosen ticket as CALLING
    updatedTickets = updatedTickets.map(t => {
      if (t.id === chosenTicket.id) {
        return {
          ...t,
          status: TicketStatus.CALLING,
          calledAt: Date.now(),
          assignedCubicleId: cubicleId
        };
      }
      return t;
    });

    // Update tickets state
    setTicketsForCurrentOffice(updatedTickets);

    // Update cubicle status
    setCubiclesForCurrentOffice(prev => prev.map(c => {
      if (c.id === cubicleId) {
        return {
          ...c,
          status: CubicleStatus.ATTENDING,
          currentTicketId: chosenTicket.id
        };
      }
      return c;
    }));

    // Trigger UI Voice Event
    const updatedTicketRef = { ...chosenTicket, status: TicketStatus.CALLING, assignedCubicleId: cubicleId };
    setActiveCall({ ticket: updatedTicketRef, cubicle: targetCubicle });

    // Speak audio calling sequence
    await announceAndCall(chosenTicket.numberCode, chosenTicket.name, targetCubicle.name);
  }, [cubicles, tickets]);

  // 5. Active ticket actions (start actual attending or finish)
  const startAttendingTicket = useCallback((cubicleId: string) => {
    setTicketsForCurrentOffice(prev => prev.map(t => {
      if (t.assignedCubicleId === cubicleId && t.status === TicketStatus.CALLING) {
        return { ...t, status: TicketStatus.ATTENDING };
      }
      return t;
    }));
  }, [setTicketsForCurrentOffice]);

  const completeTicket = useCallback((cubicleId: string) => {
    const targetCubicle = cubicles.find(c => c.id === cubicleId);
    if (!targetCubicle || !targetCubicle.currentTicketId) return;

    setTicketsForCurrentOffice(prev => prev.map(t => {
      if (t.id === targetCubicle.currentTicketId) {
        let nextPhase: TicketPhase | null = null;
        let nextStatus = TicketStatus.WAITING;
        let finalCompletedAt: number | undefined = undefined;

        if (t.currentPhase === TicketPhase.CAJA) {
          const isShortFlow = t.serviceType === ServiceType.ELECTORAL || t.serviceType === ServiceType.REGISTRO;
          if (isShortFlow) {
            nextStatus = TicketStatus.COMPLETED;
            finalCompletedAt = Date.now();
          } else {
            nextPhase = TicketPhase.TRIADA;
          }
        } else {
          // TRIADA is final step
          nextStatus = TicketStatus.COMPLETED;
          finalCompletedAt = Date.now();
        }

        // Close the current phase history object
        const updatedHistory = t.phaseHistory.map(h => {
          if (h.phase === t.currentPhase && !h.completedAt) {
            return {
              ...h,
              completedAt: Date.now(),
              cubicleId: cubicleId,
              agentName: targetCubicle.agentName
            };
          }
          return h;
        });

        if (nextPhase) {
          // Add the next phase to the history
          updatedHistory.push({
            phase: nextPhase,
            timestamp: Date.now()
          });
          
          return {
            ...t,
            currentPhase: nextPhase,
            status: nextStatus,
            phaseHistory: updatedHistory,
            assignedCubicleId: undefined, // Clear assignment so others can call it
            calledAt: undefined
          };
        } else {
          return {
            ...t,
            status: nextStatus,
            completedAt: finalCompletedAt,
            phaseHistory: updatedHistory,
            assignedCubicleId: undefined
          };
        }
      }
      return t;
    }));

    setCubiclesForCurrentOffice(prev => prev.map(c => {
      if (c.id === cubicleId) {
        return {
          ...c,
          status: CubicleStatus.ONLINE_AVAILABLE,
          currentTicketId: undefined,
          totalAttendedCount: c.totalAttendedCount + 1
        };
      }
      return c;
    }));
  }, [cubicles, setTicketsForCurrentOffice, setCubiclesForCurrentOffice]);

  const markTicketAsMissed = useCallback((cubicleId: string) => {
    const targetCubicle = cubicles.find(c => c.id === cubicleId);
    if (!targetCubicle || !targetCubicle.currentTicketId) return;

    setTicketsForCurrentOffice(prev => prev.map(t => {
      if (t.id === targetCubicle.currentTicketId) {
        return { ...t, status: TicketStatus.MISSED, completedAt: Date.now() };
      }
      return t;
    }));

    setCubiclesForCurrentOffice(prev => prev.map(c => {
      if (c.id === cubicleId) {
        return {
          ...c,
          status: CubicleStatus.ONLINE_AVAILABLE,
          currentTicketId: undefined
        };
      }
      return c;
    }));
  }, [cubicles, setTicketsForCurrentOffice, setCubiclesForCurrentOffice]);

  const recallCurrentTicket = useCallback((cubicleId: string) => {
    const targetCubicle = cubicles.find(c => c.id === cubicleId);
    if (!targetCubicle || !targetCubicle.currentTicketId) return;

    const currentTicket = tickets.find(t => t.id === targetCubicle.currentTicketId);
    if (!currentTicket) return;

    // Trigger vocal repeat
    setActiveCall({ ticket: currentTicket, cubicle: targetCubicle });
    announceAndCall(currentTicket.numberCode, currentTicket.name, targetCubicle.name);
  }, [cubicles, tickets]);

  // 6. Change cubicle status (e.g., transition to BREAK or OFFLINE)
  const changeCubicleStatus = useCallback((cubicleId: string, newStatus: CubicleStatus) => {
    // If transitioning to break/offline, complete modern work
    setCubiclesForCurrentOffice(prev => prev.map(c => {
      if (c.id === cubicleId) {
        return {
          ...c,
          status: newStatus,
          // Clear active ticket if going offline or into break
          currentTicketId: (newStatus === CubicleStatus.BREAK || newStatus === CubicleStatus.OFFLINE) ? undefined : c.currentTicketId
        };
      }
      return c;
    }));

    // If there was an active ticket being attended, set it to missed or completed
    if (newStatus === CubicleStatus.BREAK || newStatus === CubicleStatus.OFFLINE) {
      setTicketsForCurrentOffice(prev => prev.map(t => {
        if (t.assignedCubicleId === cubicleId && (t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING)) {
          return { ...t, status: TicketStatus.COMPLETED, completedAt: Date.now() };
        }
        return t;
      }));
    }
  }, [setCubiclesForCurrentOffice, setTicketsForCurrentOffice]);

  // Configures cubicle capabilities dynamically
  const updateCubicleConfig = useCallback((cubicleId: string, supportedPhases: TicketPhase[], supportedServices: ServiceType[]) => {
    setCubiclesForCurrentOffice(prev => prev.map(c => {
      if (c.id === cubicleId) {
        return {
          ...c,
          supportedPhases,
          supportedServices
        };
      }
      return c;
    }));
  }, [setCubiclesForCurrentOffice]);

  // Auto Assignment Engine Logic
  const triggerAutoAssignment = useCallback(async (
    currentTickets: Ticket[],
    currentCubicles: Cubicle[]
  ) => {
    let updatedTickets = [...currentTickets];
    let updatedCubicles = [...currentCubicles];
    let assignedCount = 0;
    const callsToTrigger: { ticket: Ticket; cubicle: Cubicle }[] = [];

    for (let cIndex = 0; cIndex < updatedCubicles.length; cIndex++) {
      const cubicle = updatedCubicles[cIndex];
      if (cubicle.status !== CubicleStatus.ONLINE_AVAILABLE) {
        continue;
      }

      // Find best candidate for this cubicle
      const candidates = updatedTickets.filter(t => {
        if (t.status !== TicketStatus.WAITING) return false;
        if (!cubicle.supportedPhases.includes(t.currentPhase)) return false;
        return canCubicleServeProcedure(cubicle.id, t.procedure);
      });

      if (candidates.length === 0) continue;

      // Sort candidates: priority (true first), then oldest (createdAt smaller first)
      candidates.sort((a, b) => {
        if (a.priority && !b.priority) return -1;
        if (!a.priority && b.priority) return 1;
        return a.createdAt - b.createdAt;
      });

      const chosenTicket = candidates[0];

      // Mark chosen ticket as CALLING in our local updatedTickets
      updatedTickets = updatedTickets.map(t => {
        if (t.id === chosenTicket.id) {
          return {
            ...t,
            status: TicketStatus.CALLING,
            calledAt: Date.now(),
            assignedCubicleId: cubicle.id
          };
        }
        return t;
      });

      // Update cubicle status in our local updatedCubicles
      updatedCubicles = updatedCubicles.map(c => {
        if (c.id === cubicle.id) {
          return {
            ...c,
            status: CubicleStatus.ATTENDING,
            currentTicketId: chosenTicket.id
          };
        }
        return c;
      });

      assignedCount++;
      const updatedTicketRef = { 
        ...chosenTicket, 
        status: TicketStatus.CALLING, 
        assignedCubicleId: cubicle.id 
      };
      callsToTrigger.push({ ticket: updatedTicketRef, cubicle });
    }

    if (assignedCount > 0) {
      setTicketsForCurrentOffice(updatedTickets);
      setCubiclesForCurrentOffice(updatedCubicles);

      if (callsToTrigger.length > 0) {
        const latestCall = callsToTrigger[callsToTrigger.length - 1];
        setActiveCall(latestCall);
        
        try {
          await announceAndCall(latestCall.ticket.numberCode, latestCall.ticket.name, latestCall.cubicle.name);
        } catch (err) {
          console.warn("Speech synthesis error", err);
        }
      }
    }
  }, [setTicketsForCurrentOffice, setCubiclesForCurrentOffice, setActiveCall]);

  // Monitor tickets and cubicles to trigger automatic assignment with guardrails
  useEffect(() => {
    if (!isAutoAssignActive) return;

    // Check if there's any ONLINE_AVAILABLE cubicle
    const firstFreeCubicle = cubicles.find(c => c.status === CubicleStatus.ONLINE_AVAILABLE);
    if (!firstFreeCubicle) return;

    // Check if there's any WAITING ticket supportable by that cubicle
    const hasCompatibleWaitingTicket = tickets.some(t => {
      if (t.status !== TicketStatus.WAITING) return false;
      return firstFreeCubicle.supportedPhases.includes(t.currentPhase);
    });

    if (!hasCompatibleWaitingTicket) return;

    // Trigger auto assignment
    triggerAutoAssignment(tickets, cubicles);
  }, [tickets, cubicles, isAutoAssignActive, triggerAutoAssignment]);

  // 7. Auto Simulation of arrivals
  useEffect(() => {
    if (isSimulationActive) {
      const names = [
        "Sofía Castro", "Mateo Gómez", "Valentina Ruíz", "Santiago Lopera", "Mariana Ochoa", 
        "Emmanuel Torres", "Isabella Díaz", "Sebastián Muñoz", "Camila Restrepo", "Luis Hernández",
        "Gabriela Ortiz", "Alejandro Bedoya", "Lucía Mejía", "Andrés Cardona", "Daniela Vargas"
      ];
      
      const services = [
        ServiceType.ELECTORAL,
        ServiceType.REGISTRO,
        ServiceType.CEDULACION,
        ServiceType.EXTRANJERIA
      ].filter(s => s !== ServiceType.EXTRANJERIA || currentOfficeId === "OFF-1");

      const generateArrival = () => {
        const randomName = names[Math.floor(Math.random() * names.length)];
        const randomService = services[Math.floor(Math.random() * services.length)];
        const randomPriority = Math.random() < 0.22; // 22% chance of priority client

        createTicket(randomName, randomService, randomPriority);
      };

      // Generate a client immediately when activating simulation
      generateArrival();

      simulationTimer.current = setInterval(generateArrival, simulationSpeed);
    } else {
      if (simulationTimer.current) {
        clearInterval(simulationTimer.current);
      }
    }

    return () => {
      if (simulationTimer.current) {
        clearInterval(simulationTimer.current);
      }
    };
  }, [isSimulationActive, simulationSpeed, createTicket, currentOfficeId]);

  return {
    currentOfficeId,
    setCurrentOfficeId,
    tickets,
    cubicles,
    activeCall,
    setActiveCall,
    isSimulationActive,
    setIsSimulationActive,
    simulationSpeed,
    setSimulationSpeed,
    isAutoAssignActive,
    setIsAutoAssignActive,
    createTicket,
    callNextTicket,
    startAttendingTicket,
    completeTicket,
    markTicketAsMissed,
    recallCurrentTicket,
    changeCubicleStatus,
    updateCubicleConfig,
    resetSystem,
    purgeOldTickets,
    officeTickets,
    setOfficeTickets,
    officeCubicles,
    setOfficeCubicles,
    supabaseSyncStatus,
    pullOfficeFromSupabase,
    pushOfficeToSupabase
  };
}
