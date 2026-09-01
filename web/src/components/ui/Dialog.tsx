import { useEffect, type ReactNode } from "react";

interface DialogProps {
  title: string;
  onClose: () => void;
  children: ReactNode;
  actions?: ReactNode;
  // Modale largo (griglia di card), es. "Rose avversari & crediti residui".
  wide?: boolean;
}

// Shell generica del modale: struttura `.dialog-backdrop / .dialog / …` con
// chiusura su click backdrop e su Esc. Il body scrolla internamente (vedi CSS
// `— dialog —`), titolo e azioni restano ancorati.
export function Dialog({ title, onClose, children, actions, wide = false }: DialogProps) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="dialog-backdrop" onClick={onClose}>
      <div
        className={wide ? "dialog dialog--wide" : "dialog"}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="dialog-title">{title}</h2>
        <div className="dialog-body">{children}</div>
        {actions && <div className="dialog-actions">{actions}</div>}
      </div>
    </div>
  );
}
