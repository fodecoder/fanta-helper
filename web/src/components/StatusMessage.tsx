import type { ReactNode } from "react";

interface StatusMessageProps {
  kind: "loading" | "error" | "empty";
  children: ReactNode;
}

export function StatusMessage({ kind, children }: StatusMessageProps) {
  return (
    <p
      className={`status-message status-message--${kind}`}
      role={kind === "error" ? "alert" : undefined}
    >
      {children}
    </p>
  );
}
