/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { Ticket, TicketStatus, TicketPhase, Cubicle, CubicleStatus, ServiceType, SERVICES_CONFIG } from "../types";
import { announceAndCall } from "../utils/audio";

const STORAGE_KEYS = {
  TICKETS: "ticket_system_tickets_v1",
  CUBICLES: "ticket_system_cubicles_v1",
  STATS: "ticket_system_stats_v1",
  AUTO_ASSIGN: "ticket_system_auto_assign_v1"
};

const INITIAL_CUBICLES: Cubicle[] = [
  {
    id: "CUB-1",
    name: "Caja 1",
    agentName: "Juan Pérez",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-2",
    name: "Caja 2",
    agentName: "Laura Martínez",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-3",
    name: "Caja 3",
    agentName: "Carlos Sánchez",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-4",
    name: "Caja 4",
    agentName: "Ana Rodríguez",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-5",
    name: "Caja 5",
    agentName: "Pedro Gómez",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-6",
    name: "Caja 6",
    agentName: "Sofía Díaz",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-7",
    name: "Caja 7",
    agentName: "Diego Torres",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-8",
    name: "Caja 8",
    agentName: "Camila Ríos",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-9",
    name: "Caja 9",
    agentName: "Mateo Vargas",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.CAJA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-10",
    name: "Tríada / Foto 1",
    agentName: "Lucas Silva",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-11",
    name: "Tríada / Foto 2",
    agentName: "Elena Rocha",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-12",
    name: "Tríada / Foto 3",
    agentName: "Facundo Ortiz",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-13",
    name: "Tríada / Foto 4",
    agentName: "Valentina Luna",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-14",
    name: "Tríada / Foto 5",
    agentName: "Thiago Medina",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-15",
    name: "Tríada / Foto 6",
    agentName: "Isabella Castro",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-16",
    name: "Tríada / Foto 7",
    agentName: "Nicolás Peña",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  },
  {
    id: "CUB-17",
    name: "Tríada / Foto 8",
    agentName: "Martina Paz",
    status: CubicleStatus.ONLINE_AVAILABLE,
    supportedPhases: [TicketPhase.TRIADA],
    supportedServices: [ServiceType.ELECTORAL, ServiceType.REGISTRO, ServiceType.CEDULACION, ServiceType.EXTRANJERIA],
    totalAttendedCount: 0
  }
];

export function useTicketSystem() {
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [cubicles, setCubicles] = useState<Cubicle[]>(INITIAL_CUBICLES);
  const [activeCall, setActiveCall] = useState<{ ticket: Ticket; cubicle: Cubicle } | null>(null);
  const [isAutoAssignActive, setIsAutoAssignActive] = useState<boolean>(true);
  
  // Simulation states
  const [isSimulationActive, setIsSimulationActive] = useState<boolean>(false);
  const [simulationSpeed, setSimulationSpeed] = useState<number>(10000); // ms per user arrival (10s default)
  const simulationTimer = useRef<NodeJS.Timeout | null>(null);

  // 1. Load from localStorage
  useEffect(() => {
    try {
      const storedTickets = localStorage.getItem(STORAGE_KEYS.TICKETS);
      const storedCubicles = localStorage.getItem(STORAGE_KEYS.CUBICLES);
      const storedAutoAssign = localStorage.getItem(STORAGE_KEYS.AUTO_ASSIGN);

      if (storedTickets) {
        setTickets(JSON.parse(storedTickets));
      }
      if (storedCubicles) {
        const parsed = JSON.parse(storedCubicles);
        if (parsed.length !== INITIAL_CUBICLES.length) {
          setCubicles(INITIAL_CUBICLES);
        } else {
          setCubicles(parsed);
        }
      }
      if (storedAutoAssign !== null) {
        setIsAutoAssignActive(JSON.parse(storedAutoAssign));
      }
    } catch (e) {
      console.error("Error loading states from localStorage", e);
    }
  }, []);

  // 2. Persist to localStorage on changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.TICKETS, JSON.stringify(tickets));
    } catch (e) {
      console.error("Error saving tickets code to storage", e);
    }
  }, [tickets]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.CUBICLES, JSON.stringify(cubicles));
    } catch (e) {
      console.error("Error saving cubicles to storage", e);
    }
  }, [cubicles]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.AUTO_ASSIGN, JSON.stringify(isAutoAssignActive));
    } catch (e) {
      console.error("Error saving auto assignment state to storage", e);
    }
  }, [isAutoAssignActive]);

  // Clean / Reset the whole system
  const resetSystem = useCallback(() => {
    setTickets([]);
    setCubicles(INITIAL_CUBICLES);
    setActiveCall(null);
    setIsSimulationActive(false);
    setIsAutoAssignActive(true);
  }, []);

  // 3. Create ticket
  const createTicket = useCallback((name: string, serviceType: ServiceType, priority: boolean = false): Ticket => {
    const cleanName = name.trim() || "Anónimo";
    const config = SERVICES_CONFIG[serviceType];
    
    // Calculate ticket number based on how many tickets of this type have been created today
    const sameServiceTickets = tickets.filter(t => t.serviceType === serviceType);
    const orderNumber = sameServiceTickets.length + 1;
    const formattedNumber = `${config.prefix}-${orderNumber.toString().padStart(3, "0")}`;

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
      priority
    };

    setTickets(prev => [...prev, newTicket]);
    
    // Automatically flag available booths that can service this ticket!
    // But do NOT auto-assign, instead let it be in the general queue.
    // However, if we want to immediately tell them "Go to Cubicle X" if the agent is idle, we can trigger that:
    return newTicket;
  }, [tickets]);

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
      return targetCubicle.supportedPhases.includes(t.currentPhase);
    });

    if (candidates.length === 0) return;

    // Sorting: Priority (true first), then oldest (createdAt smaller first)
    candidates.sort((a, b) => {
      if (a.priority && !b.priority) return -1;
      if (!a.priority && b.priority) return 1;
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
          nextPhase = TicketPhase.TRIADA;
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
    setTickets(updatedTickets);

    // Update cubicle status
    setCubicles(prev => prev.map(c => {
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
    setTickets(prev => prev.map(t => {
      if (t.assignedCubicleId === cubicleId && t.status === TicketStatus.CALLING) {
        return { ...t, status: TicketStatus.ATTENDING };
      }
      return t;
    }));
  }, []);

  const completeTicket = useCallback((cubicleId: string) => {
    const targetCubicle = cubicles.find(c => c.id === cubicleId);
    if (!targetCubicle || !targetCubicle.currentTicketId) return;

    setTickets(prev => prev.map(t => {
      if (t.id === targetCubicle.currentTicketId) {
        let nextPhase: TicketPhase | null = null;
        let nextStatus = TicketStatus.WAITING;
        let finalCompletedAt: number | undefined = undefined;

        if (t.currentPhase === TicketPhase.CAJA) {
          nextPhase = TicketPhase.TRIADA;
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

    setCubicles(prev => prev.map(c => {
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
  }, [cubicles]);

  const markTicketAsMissed = useCallback((cubicleId: string) => {
    const targetCubicle = cubicles.find(c => c.id === cubicleId);
    if (!targetCubicle || !targetCubicle.currentTicketId) return;

    setTickets(prev => prev.map(t => {
      if (t.id === targetCubicle.currentTicketId) {
        return { ...t, status: TicketStatus.MISSED, completedAt: Date.now() };
      }
      return t;
    }));

    setCubicles(prev => prev.map(c => {
      if (c.id === cubicleId) {
        return {
          ...c,
          status: CubicleStatus.ONLINE_AVAILABLE,
          currentTicketId: undefined
        };
      }
      return c;
    }));
  }, [cubicles]);

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
    setCubicles(prev => prev.map(c => {
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
      setTickets(prev => prev.map(t => {
        if (t.assignedCubicleId === cubicleId && (t.status === TicketStatus.CALLING || t.status === TicketStatus.ATTENDING)) {
          return { ...t, status: TicketStatus.COMPLETED, completedAt: Date.now() };
        }
        return t;
      }));
    }
  }, []);

  // Configures cubicle capabilities dynamically
  const updateCubicleConfig = useCallback((cubicleId: string, supportedPhases: TicketPhase[], supportedServices: ServiceType[]) => {
    setCubicles(prev => prev.map(c => {
      if (c.id === cubicleId) {
        return {
          ...c,
          supportedPhases,
          supportedServices
        };
      }
      return c;
    }));
  }, []);

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
        return cubicle.supportedPhases.includes(t.currentPhase);
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
      setTickets(updatedTickets);
      setCubicles(updatedCubicles);

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
  }, []);

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
      ];

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
  }, [isSimulationActive, simulationSpeed, createTicket]);

  return {
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
    resetSystem
  };
}
