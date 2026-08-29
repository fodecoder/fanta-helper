import type { ReactNode } from "react";
import { CmykNum } from "./CmykNum";

interface StatFigureProps {
  label: ReactNode;
  value: number | string;
}

// Grande figura numerica della Panoramica: etichetta maiuscoletto sotto il
// numerale CMYK. La classe --below distanzia l'etichetta perché il numerale
// (line-height .9) sborda sotto la propria box.
export function StatFigure({ label, value }: StatFigureProps) {
  return (
    <div className="stat-figure stat-figure--below">
      <CmykNum value={value} className="stat-num" />
      <span className="stat-label">{label}</span>
    </div>
  );
}
