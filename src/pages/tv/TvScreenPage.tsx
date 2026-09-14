import React from "react";
import MainScreen from "../../components/MainScreen";
import { Ticket, Cubicle, TicketPhase } from "../../types";

interface TvScreenPageProps {
  tickets: Ticket[];
  cubicles: Cubicle[];
  activeCall: { ticket: Ticket; cubicle: Cubicle } | null;
  onClearActiveCall: () => void;
  onTestSpeaker: () => void;
  onRefresh?: () => void;
  currentOfficeId?: string;
  gatewaySelection?: "select" | "cedulacion" | "registro_civil";
  channel?: "general" | TicketPhase | "OR" | "OHV" | "RC_OTROS";
}

export default function TvScreenPage({
  tickets,
  cubicles,
  activeCall,
  onClearActiveCall,
  onTestSpeaker,
  onRefresh,
  currentOfficeId = "OFF-1",
  gatewaySelection = "cedulacion",
  channel = "general"
}: TvScreenPageProps) {
  return (
    <div className="w-full py-4">
      <MainScreen
        tickets={tickets}
        cubicles={cubicles}
        activeCall={activeCall}
        onClearActiveCall={onClearActiveCall}
        onTestSpeaker={onTestSpeaker}
        onRefresh={onRefresh}
        currentOfficeId={currentOfficeId}
        gatewaySelection={gatewaySelection}
        initialChannel={channel}
      />
    </div>
  );
}

