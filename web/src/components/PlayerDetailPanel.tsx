import type { ReactNode } from "react";
import type {
  Player,
  PlayerAttributes,
  PlayerLatestSeasonStats,
  PlayerTag,
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
  tags: PlayerTag[];
  // Optional EA FC attribute enrichment (SoFIFA). Absent when the provider is
  // off or the player is unmatched — the panel then simply omits the block.
  attributes?: PlayerAttributes | undefined;
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
  tags,
  attributes,
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
      {tags.length > 0 && (
        <div style={{ flexBasis: "100%", display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tags.map((t) => (
            <span key={t.id} className="tag tag-neutral">
              {t.label}
            </span>
          ))}
        </div>
      )}
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
      {attributes && (
        <>
          <Stat label="Overall" value={statValue(attributes.overall)} />
          <Stat label="Potential" value={statValue(attributes.potential)} />
          <Stat label="Età (EA FC)" value={statValue(attributes.age)} />
          <Stat label="Valore FIFA" value={statValue(attributes.value)} />
          <div style={{ flexBasis: "100%", fontSize: 10, color: "var(--color-neutral-700)" }}>
            Attributi EA FC —{" "}
            <a
              href="https://sofifa.com/"
              target="_blank"
              rel="noreferrer"
              style={{ color: "inherit" }}
            >
              SoFIFA
            </a>
          </div>
        </>
      )}
    </div>
  );
}
