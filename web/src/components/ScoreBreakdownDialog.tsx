import type { PlayerRecommendation } from "@fanta-helper/shared";
import { Dialog } from "./ui/Dialog";

interface ScoreBreakdownDialogProps {
  player: Pick<PlayerRecommendation, "name" | "ruolo" | "score" | "tier" | "components" | "price">;
  normalizedScore?: number | null;
  isTrap?: boolean;
  onToggleTrap?: () => void;
  onClose: () => void;
}

function n(value: number, decimals = 2): string {
  return value.toFixed(decimals);
}

function pct(value: number | null): string {
  return value === null ? "—" : `${Math.round(value * 100)}%`;
}

function Step({ children }: { children: React.ReactNode }) {
  return <li style={{ marginBottom: 6 }}>{children}</li>;
}

// Scomposizione passo-passo del Punteggio, con i valori realmente usati dal
// motore (`components.breakdown`). Nessun ricalcolo lato client.
export function ScoreBreakdownDialog({
  player,
  normalizedScore,
  isTrap,
  onToggleTrap,
  onClose,
}: ScoreBreakdownDialogProps) {
  const b = player.components.breakdown;

  return (
    <Dialog
      title={`Scomposizione punteggio · ${player.name}`}
      onClose={onClose}
      actions={
        <>
          {onToggleTrap && (
            <button
              type="button"
              className="btn btn-ghost"
              aria-pressed={isTrap ?? false}
              onClick={onToggleTrap}
            >
              {isTrap ? "Rimuovi trappola" : "Segna trappola"}
            </button>
          )}
          <button type="button" className="btn btn-primary" onClick={onClose}>
            Chiudi
          </button>
        </>
      }
    >
      {b === null ? (
        <p>
          Dati stagione assenti per questo giocatore: il punteggio è forzato a 0 e non è
          scomponibile.
        </p>
      ) : (
        <div style={{ fontSize: 13, lineHeight: 1.5 }}>
          <p style={{ margin: "0 0 4px" }}>
            <strong>Punteggio grezzo (VORP): {n(b.score)}</strong>
            {typeof normalizedScore === "number" && (
              <> · scala 0–10 per ruolo: <strong>{normalizedScore.toFixed(1)}</strong></>
            )}{" "}
            · Fascia {player.tier}
          </p>

          <p className="profile-label" style={{ marginTop: 12 }}>
            1 · Fantamedia regolata
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <Step>
              mv {n(b.mv)} − sufficienza {n(b.mvBaseline)} + bonus/malus per presenza{" "}
              {n(b.perMatchBonus)} + bonus difesa {n(b.difesaBonus)} + bonus portiere{" "}
              {n(b.portiereBonus)} = <strong>{n(b.leagueAdjustedFm)}</strong>
            </Step>
            {b.difesaBonus !== 0 && (
              <Step>
                mv fuso con solidità difensiva di squadra per il bonus difesa: {n(b.blendedMv)}
              </Step>
            )}
          </ul>

          <p className="profile-label" style={{ marginTop: 12 }}>
            2 · Valore grezzo
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <Step>
              affidabilità = {pct(b.reliability)}{" "}
              {b.lineupStato ? `(stato formazione: ${b.lineupStato})` : `(presenze ${pct(b.presenzeRatio)} su ${b.seasonMatchdaysElapsed} giornate)`}
            </Step>
            <Step>
              max({n(b.leagueAdjustedFm)}, 0) × {pct(b.reliability)} ={" "}
              <strong>{n(b.rawValue)}</strong>
            </Step>
          </ul>

          <p className="profile-label" style={{ marginTop: 12 }}>
            3 · Scarsità di reparto
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <Step>
              domanda residua {b.scarcityRemainingDemand} / offerta {b.scarcitySupply}, limitata a
              [0.85, 1.35] → ×{n(b.scarcityMultiplier)}
            </Step>
            <Step>
              {n(b.rawValue)} × {n(b.scarcityMultiplier)} ={" "}
              <strong>{n(b.scarcityAdjustedValue)}</strong>
            </Step>
          </ul>

          <p className="profile-label" style={{ marginTop: 12 }}>
            4 · Sopra il rimpiazzo (VORP)
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <Step>
              rimpiazzo = {n(b.replacementValue)} (giocatore in posizione {b.replacementRank} del
              ruolo, il primo che Io perderebbe)
            </Step>
            <Step>
              {n(b.scarcityAdjustedValue)} − {n(b.replacementValue)} ={" "}
              <strong>{n(b.score)}</strong>
            </Step>
          </ul>

          <p className="profile-label" style={{ marginTop: 12 }}>
            Segnale prezzo
          </p>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            <Step>Percentile valore: {pct(player.price.valuePercentile)}</Step>
            <Step>Percentile prezzo (FVM): {pct(player.price.pricePercentile)}</Step>
            <Step>
              Gap (valore − prezzo):{" "}
              {player.price.gapSignal === null ? "—" : pct(player.price.gapSignal)}
            </Step>
          </ul>
        </div>
      )}
    </Dialog>
  );
}
