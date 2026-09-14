import React from "react";
import TicketTracker from "../components/TicketTracker";
import { Ticket, Cubicle } from "../types";

interface SeguimientoPageProps {
  tickets: Ticket[];
  cubicles: Cubicle[];
  currentOfficeId: string;
  officeTickets?: Record<string, Ticket[]>;
  officeCubicles?: Record<string, Cubicle[]>;
  onNavigateToKiosk?: () => void;
  onSelectOffice?: (officeId: string) => void;
}

export default function SeguimientoPage({
  tickets,
  cubicles,
  currentOfficeId,
  officeTickets,
  officeCubicles,
  onNavigateToKiosk,
  onSelectOffice
}: SeguimientoPageProps) {
  return (
    <div className="w-full py-4">
      <TicketTracker
        tickets={tickets}
        cubicles={cubicles}
        currentOfficeId={currentOfficeId}
        officeTickets={officeTickets}
        officeCubicles={officeCubicles}
        onNavigateToKiosk={onNavigateToKiosk}
        onSelectOffice={onSelectOffice}
      />
    </div>
  );
}
