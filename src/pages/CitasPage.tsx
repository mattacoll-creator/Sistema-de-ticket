import React from "react";
import CitasApp from "../components/CitasApp";
import { ServiceType, Ticket } from "../types";

interface CitasPageProps {
  onCreateTicket?: (name: string, serviceType: ServiceType, priority: boolean, isAppointment?: boolean, procedure?: string) => Ticket;
  onNavigateToTurnos?: () => void;
  initialTab?: 'agendar' | 'admin';
}

export default function CitasPage({
  onCreateTicket,
  onNavigateToTurnos,
  initialTab = 'agendar'
}: CitasPageProps) {
  return (
    <div className="w-full py-0">
      <CitasApp
        onCreateTicket={onCreateTicket}
        onNavigateToTurnos={onNavigateToTurnos}
        initialTab={initialTab}
      />
    </div>
  );
}
