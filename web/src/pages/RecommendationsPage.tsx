import { useEffect, useMemo, useState } from "react";
import type { League, PlayerRecommendationWithTags, TeamPref } from "@fanta-helper/shared";
import { ROLES, normalizeScoresByRole, type Role } from "@fanta-helper/shared";
import * as recommendationsApi from "../api/recommendations";
import * as teamPrefsApi from "../api/teamPrefs";
import { TeamPrefPanel } from "../components/TeamPrefPanel";
import { PageMasthead } from "../components/shell/PageMasthead";
import { StatusMessage } from "../components/StatusMessage";
import { ScoreBreakdownDialog } from "../components/ScoreBreakdownDialog";
import { InfoLabel } from "../components/ui/InfoLabel";
import { COLUMN_GLOSSARY } from "../lib/columnGlossary";
import { roleColor } from "../lib/auctionDerivations";

interface RecommendationsPageProps {
  league: League;
  calls: number | null;
}

type RoleFilter = "tutti" | Role;

function pct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function RecommendationsPage({ league, calls }: RecommendationsPageProps) {
  const [recommendations, setRecommendations] = useState<PlayerRecommendationWithTags[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("tutti");
  const [detailPlayerId, setDetailPlayerId] = useState<number | null>(null);
  const [teamPrefs, setTeamPrefs] = useState<TeamPref[]>([]);
  const [prefsToken, setPrefsToken] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    recommendationsApi
      .listRecommendations(league.id, controller.signal)
      .then((data) => {
        setRecommendations(data);
        setLoadError(null);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === "AbortError") return;
        setLoadError(err instanceof Error ? err.message : "caricamento consigli fallito");
      });
    return () => controller.abort();
  }, [league.id, prefsToken]);

  useEffect(() => {
    const controller = new AbortController();
    teamPrefsApi
      .listTeamPrefs(league.id, controller.signal)
      .then(setTeamPrefs)
      .catch(() => setTeamPrefs([]));
    return () => controller.abort();
  }, [league.id, prefsToken]);

  const knownTeams = useMemo(
    () => [...new Set((recommendations ?? []).map((r) => r.team))],
    [recommendations],
  );

  const normById = useMemo(
    () => normalizeScoresByRole(recommendations ?? []),
    [recommendations],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (recommendations ?? [])
      .filter((r) => roleFilter === "tutti" || r.ruolo === roleFilter)
      .filter(
        (r) => q === "" || r.name.toLowerCase().includes(q) || r.team.toLowerCase().includes(q),
      );
  }, [recommendations, query, roleFilter]);

  const detailPlayer =
    detailPlayerId === null
      ? null
      : (recommendations ?? []).find((r) => r.player_id === detailPlayerId) ?? null;

  return (
    <>
      <PageMasthead
        kicker="Asta · motore di consiglio"
        title="Consigli"
        subtitle="Giocatori disponibili ordinati per valore sopra il rimpiazzo (VORP), relativo alle regole della lega: fantamedia ricostruita su scoring/modificatori, affidabilità pesata sulle presenze, scarsità di reparto e bisogni residui di Io. Nessun dato inventato: chi non ha statistiche per l'ultima stagione resta segnalato come tale."
        calls={calls}
      />

      <TeamPrefPanel
        leagueId={league.id}
        teams={knownTeams}
        prefs={teamPrefs}
        onChanged={() => setPrefsToken((t) => t + 1)}
      />

      <div
        style={{
          display: "flex",
          alignItems: "flex-end",
          gap: 14,
          margin: "24px 0 12px",
          flexWrap: "wrap",
        }}
      >
        <h3 style={{ margin: 0 }}>Ranking disponibili</h3>
        <span className="text-muted" style={{ fontSize: 12 }}>
          {filtered.length} giocatori
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
          <input
            className="input"
            style={{ width: 220 }}
            placeholder="cerca nome o squadra"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="seg" role="group" aria-label="Filtro ruolo">
            {(["tutti", ...ROLES] as RoleFilter[]).map((r) => (
              <button
                key={r}
                type="button"
                className="seg-opt"
                aria-pressed={roleFilter === r}
                onClick={() => setRoleFilter(r)}
              >
                {r === "tutti" ? "Tutti" : r}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loadError ? (
        <StatusMessage kind="error">{loadError}</StatusMessage>
      ) : recommendations === null ? (
        <StatusMessage kind="loading">Caricamento…</StatusMessage>
      ) : recommendations.length === 0 ? (
        <StatusMessage kind="empty">Nessun giocatore disponibile o dati storici assenti.</StatusMessage>
      ) : (
        <div className="table-scroll">
          <table className="table" style={{ minWidth: 920 }}>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Squadra</th>
                <th>Ruolo</th>
                <th style={{ textAlign: "right" }}>
                  <InfoLabel {...COLUMN_GLOSSARY.score} />
                </th>
                <th>
                  <InfoLabel {...COLUMN_GLOSSARY.tier} />
                </th>
                <th style={{ textAlign: "right" }}>
                  <InfoLabel {...COLUMN_GLOSSARY.leagueAdjustedFm} />
                </th>
                <th style={{ textAlign: "right" }}>
                  <InfoLabel {...COLUMN_GLOSSARY.reliability} />
                </th>
                <th style={{ textAlign: "right" }}>
                  <InfoLabel {...COLUMN_GLOSSARY.qtA} />
                </th>
                <th style={{ textAlign: "right" }}>
                  <InfoLabel {...COLUMN_GLOSSARY.fvm} />
                </th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const muted = r.components.dataMissing || !r.components.ioNeedsRole;
                const occasione = r.price.gapSignal !== null && r.price.gapSignal > 0.25;
                const norm = normById.get(r.player_id);
                return (
                    <tr key={r.player_id} style={muted ? { opacity: 0.5 } : undefined}>
                      <td style={{ whiteSpace: "nowrap" }}>{r.nome_completo ?? r.name}</td>
                      <td>{r.team}</td>
                      <td style={{ color: roleColor(r.ruolo) }}>{r.ruolo}</td>
                      <td className="num" style={{ textAlign: "right", fontWeight: 600 }}>
                        {norm !== undefined ? norm.toFixed(1) : "—"}
                      </td>
                      <td>
                        <span className={r.tier === "Top" ? "tag tag-accent" : "tag tag-neutral"}>
                          {r.tier}
                        </span>
                        {occasione && (
                          <span className="tag tag-accent" style={{ marginLeft: 6 }}>
                            Occasione
                          </span>
                        )}
                        {r.teamPref === "avoid" && (
                          <span
                            className="tag tag-neutral"
                            style={{ marginLeft: 6, color: "var(--color-accent-2-700)" }}
                          >
                            squadra da evitare
                          </span>
                        )}
                        {r.teamPref === "prefer" && (
                          <span className="tag tag-accent" style={{ marginLeft: 6 }}>
                            squadra preferita
                          </span>
                        )}
                        {r.tags.map((t) => (
                          <span key={t.id} className="tag tag-neutral" style={{ marginLeft: 6 }}>
                            {t.label}
                          </span>
                        ))}
                      </td>
                      <td className="num" style={{ textAlign: "right" }}>
                        {r.components.leagueAdjustedFm !== null
                          ? r.components.leagueAdjustedFm.toFixed(2)
                          : "—"}
                      </td>
                      <td className="num" style={{ textAlign: "right" }}>
                        {pct(r.components.reliability)}
                      </td>
                      <td className="num" style={{ textAlign: "right" }}>
                        {r.price.qt_a ?? "—"}
                      </td>
                      <td className="num" style={{ textAlign: "right" }}>
                        {r.price.fvm ?? "—"}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="btn btn-ghost"
                          style={{ padding: "2px 10px", fontSize: 12 }}
                          onClick={() => setDetailPlayerId(r.player_id)}
                        >
                          Dettagli
                        </button>
                      </td>
                    </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {detailPlayer && (
        <ScoreBreakdownDialog
          player={detailPlayer}
          normalizedScore={normById.get(detailPlayer.player_id) ?? null}
          onClose={() => setDetailPlayerId(null)}
        />
      )}
    </>
  );
}
