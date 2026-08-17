import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  onBack?: () => void;
  actions?: ReactNode;
}

export function PageHeader({ title, onBack, actions }: PageHeaderProps) {
  return (
    <div className="page-header">
      {onBack && (
        <button type="button" className="back-button" onClick={onBack}>
          ← Indietro
        </button>
      )}
      <h1>{title}</h1>
      {actions}
    </div>
  );
}
