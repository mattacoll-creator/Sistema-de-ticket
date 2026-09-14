import React from "react";
import WelcomeKiosk from "../components/WelcomeKiosk";
import { ServiceType, Ticket } from "../types";

interface KioscoPageProps {
  onCreateTicket: (name: string, serviceType: ServiceType, isPriority?: boolean, isAppointment?: boolean, customCode?: string) => Ticket | null;
  currentOfficeId: string;
  gatewaySelection: "cedulacion" | "registro_civil";
  onNavigateToCitas?: () => void;
  onNavigateToTracker?: (code?: string) => void;
}

export default function KioscoPage({
  onCreateTicket,
  currentOfficeId,
  gatewaySelection,
  onNavigateToCitas,
  onNavigateToTracker
}: KioscoPageProps) {
  return (
    <div className="w-full py-4">
      <WelcomeKiosk
        onCreateTicket={onCreateTicket}
        currentOfficeId={currentOfficeId}
        gatewaySelection={gatewaySelection}
        onNavigateToCitas={onNavigateToCitas}
        onNavigateToTracker={onNavigateToTracker}
      />
    </div>
  );
}
