import type { ReactNode } from "react";
import type {
  Player,
  PlayerLatestSeasonStats,
  ProbableLineupStato,
  QuotationRow,
  SetPieceTakerEntry,
} from "@fanta-helper/shared";
import { ROLE_LABEL, roleColor } from "../lib/auctionDerivations";

interface PlayerDetailPanelProps {
  player: Player;
  quotation: QuotationRow | undefined;
  seasonStats: PlayerLatestSeasonStats | undefined;
  lineupStatus: ProbableLineupStato | null;
  setPieceRanks: SetPieceTakerEntry[];
}

const LINEUP_LABEL: Record<ProbableLineupStato, string> = {
  titolare: "Titolare",
  panchina: "Panchina",
  ballottaggio: "Ballottaggio",
};

const SET_PIECE_LABEL: Record<string, string> = {
  rigore: "Rigori",
  punizione: "Punizioni",
  corner: "Corner",
};

function StatLabel({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        font: "600 10px/1 var(--font-heading)",
        letterSpacing: ".08em",
        textTransform: "uppercase",
        color: "var(--color-neutral-700)",
        marginBottom: 3,
      }}
    >
      {children}
    </div>
  );
}

function Stat({ label, value }: { label: ReactNode; value: ReactNode }) {
  return (
    <div style={{ minWidth: 64 }}>
      <StatLabel>{label}</StatLabel>
      <div style={{ fontSize: 15, fontWeight: 600 }}>{value}</div>
    </div>
  );
}

// Nessun campo mostra mai 0/stimato al posto di "nessun dato": i valori
// mancanti (stagione senza presenze, nessun match in probable_lineup/
// set_piece_taker) restano "—".
export function PlayerDetailPanel({
  player,
  quotation,
  seasonStats,
  lineupStatus,
  setPieceRanks,
}: PlayerDetailPanelProps) {
  const statValue = (v: number | null | undefined) => v ?? "—";

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 20,
        padding: "12px 4px",
        borderTop: "1px solid color-mix(in srgb, var(--color-text) 10%, transparent)",
      }}
    >
      <Stat label="Squadra" value={player.team} />
      <Stat
        label="Ruolo"
        value={<span style={{ color: roleColor(player.ruolo) }}>{ROLE_LABEL[player.ruolo]}</span>}
      />
      <Stat
        label={seasonStats ? `Fm (${seasonStats.season})` : "Fm"}
        value={statValue(seasonStats?.fm)}
      />
      <Stat label="Mv" value={statValue(seasonStats?.mv)} />
      <Stat label="Presenze" value={statValue(seasonStats?.presenze)} />
      <Stat label="Gol" value={statValue(seasonStats?.gf)} />
      <Stat label="Assist" value={statValue(seasonStats?.assist)} />
      <Stat label="Qt.A" value={quotation?.qt_a ?? "—"} />
      <Stat label="FVM" value={quotation?.fvm ?? "—"} />
      <div style={{ minWidth: 160 }}>
        <StatLabel>Prezzo medio pagato (proxy FVM)</StatLabel>
        <div style={{ fontSize: 15, fontWeight: 600 }}>{quotation?.fvm ?? "—"}</div>
        <div style={{ fontSize: 11, color: "var(--color-neutral-700)", marginTop: 2 }}>
          Indice del trend dei prezzi ad asta — non è una media di aggiudicazioni reali.
        </div>
      </div>
      {setPieceRanks.length > 0 && (
        <Stat
          label="Calci piazzati"
          value={setPieceRanks
            .map((r) => `${SET_PIECE_LABEL[r.tipo] ?? r.tipo}: ${r.rank}°`)
            .join(" · ")}
        />
      )}
      <Stat label="Probabili formazioni" value={lineupStatus ? LINEUP_LABEL[lineupStatus] : "—"} />
    </div>
  );
}
