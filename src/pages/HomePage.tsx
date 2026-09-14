import React from "react";
import GatewayScreen from "../components/GatewayScreen";

interface HomePageProps {
  onSelectOption: (option: "cedulacion" | "registro_civil") => void;
  onSelectCitas: () => void;
  onSelectView: (viewKey: string) => void;
}

export default function HomePage({
  onSelectOption,
  onSelectCitas,
  onSelectView
}: HomePageProps) {
  return (
    <GatewayScreen
      onSelectOption={onSelectOption}
      onSelectCitas={onSelectCitas}
      onSelectView={onSelectView}
    />
  );
}
