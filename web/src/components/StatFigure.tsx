import type { ReactNode } from "react";

interface StatFigureProps {
  label: ReactNode;
  value: number | string;
}

// Tile numerico della Panoramica (design handoff § Panoramica): numero grande
// in Space Mono, etichetta maiuscoletto sotto.
export function StatFigure({ label, value }: StatFigureProps) {
  return (
    <div className="stat-figure">
      <span className="stat-num">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  );
}
