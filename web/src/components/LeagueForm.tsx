import { useState, type FormEvent } from "react";
import {
  createLeagueSchema,
  updateLeagueSchema,
  defaultRosterConfig,
  defaultBudgetTargetByRole,
  defaultScoring,
  defaultModificatori,
  DEFAULT_N_SQUADRE,
  DEFAULT_BUDGET,
  type League,
  type CreateLeagueInput,
  type ScoringConfig,
  type ModifiersConfig,
} from "@fanta-helper/shared";
import * as leaguesApi from "../api/leagues";
import { LeaguesApiError } from "../api/leagues";
import { StatusMessage } from "./StatusMessage";

interface LeagueFormProps {
  initial?: League;
  onSaved: (league: League) => void;
  onCancel: () => void;
}

const ROSTER_FIELDS: { key: "P" | "D" | "C" | "A"; label: string }[] = [
  { key: "P", label: "Portieri" },
  { key: "D", label: "Difensori" },
  { key: "C", label: "Centrocampisti" },
  { key: "A", label: "Attaccanti" },
];

const BUDGET_TARGET_FIELDS: { key: "P" | "D" | "C" | "A"; label: string }[] = [
  { key: "P", label: "Portieri %" },
  { key: "D", label: "Difensori %" },
  { key: "C", label: "Centrocampisti %" },
  { key: "A", label: "Attaccanti %" },
];

const SCORING_FIELDS: { key: keyof Omit<ScoringConfig, "fasce_gol">; label: string }[] = [
  { key: "gol", label: "Gol segnato" },
  { key: "assist", label: "Assist" },
  { key: "rigore_segnato", label: "Rigore segnato" },
  { key: "rigore_parato", label: "Rigore parato" },
  { key: "rigore_sbagliato", label: "Rigore sbagliato" },
  { key: "ammonizione", label: "Ammonizione" },
  { key: "espulsione", label: "Espulsione" },
  { key: "autorete", label: "Autorete" },
  { key: "gol_subito", label: "Gol subito (portiere)" },
];

const OTHER_MODIFIERS: { key: keyof Omit<ModifiersConfig, "difesa">; label: string }[] = [
  { key: "centrocampo", label: "Modificatore centrocampo" },
  { key: "attacco", label: "Modificatore attacco" },
  { key: "portiere", label: "Modificatore portiere" },
  { key: "capitano", label: "Regola del capitano" },
  { key: "modulo", label: "Modificatore di modulo" },
];

// Deep clone so editing a new league never mutates the shared default objects.
function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function LeagueForm({ initial, onSaved, onCancel }: LeagueFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [nSquadre, setNSquadre] = useState(String(initial?.n_squadre ?? DEFAULT_N_SQUADRE));
  const [budget, setBudget] = useState(String(initial?.budget ?? DEFAULT_BUDGET));
  const [roster, setRoster] = useState<Record<"P" | "D" | "C" | "A", string>>({
    P: String(initial?.roster_config.P ?? defaultRosterConfig.P),
    D: String(initial?.roster_config.D ?? defaultRosterConfig.D),
    C: String(initial?.roster_config.C ?? defaultRosterConfig.C),
    A: String(initial?.roster_config.A ?? defaultRosterConfig.A),
  });
  const [budgetTarget, setBudgetTarget] = useState<Record<"P" | "D" | "C" | "A", string>>({
    P: String(initial?.budget_target_by_role.P ?? defaultBudgetTargetByRole.P),
    D: String(initial?.budget_target_by_role.D ?? defaultBudgetTargetByRole.D),
    C: String(initial?.budget_target_by_role.C ?? defaultBudgetTargetByRole.C),
    A: String(initial?.budget_target_by_role.A ?? defaultBudgetTargetByRole.A),
  });
  const [scoring, setScoring] = useState<ScoringConfig>(clone(initial?.scoring ?? defaultScoring));
  const [fasceText, setFasceText] = useState(
    (initial?.scoring.fasce_gol ?? defaultScoring.fasce_gol).join(", "),
  );
  const [modificatori, setModificatori] = useState<ModifiersConfig>(
    clone(initial?.modificatori ?? defaultModificatori),
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function setScoringField(key: keyof Omit<ScoringConfig, "fasce_gol">, raw: string) {
    setScoring((prev) => ({ ...prev, [key]: Number(raw) }));
  }

  function setDifesaBand(index: number, field: "media" | "bonus", raw: string) {
    setModificatori((prev) => {
      const tabella = prev.difesa.tabella.map((band, i) =>
        i === index ? { ...band, [field]: Number(raw) } : band,
      );
      return { ...prev, difesa: { ...prev.difesa, tabella } };
    });
  }

  function toggleModifier(key: keyof ModifiersConfig) {
    setModificatori((prev) => {
      if (key === "difesa") {
        return { ...prev, difesa: { ...prev.difesa, enabled: !prev.difesa.enabled } };
      }
      return { ...prev, [key]: { enabled: !prev[key].enabled } };
    });
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setGeneralError(null);

    const fasce_gol = fasceText
      .split(",")
      .map((piece) => piece.trim())
      .filter((piece) => piece !== "")
      .map(Number);

    const candidate: CreateLeagueInput = {
      name,
      n_squadre: Number(nSquadre),
      budget: Number(budget),
      roster_config: {
        P: Number(roster.P),
        D: Number(roster.D),
        C: Number(roster.C),
        A: Number(roster.A),
      },
      scoring: { ...scoring, fasce_gol },
      modificatori,
      budget_target_by_role: {
        P: Number(budgetTarget.P),
        D: Number(budgetTarget.D),
        C: Number(budgetTarget.C),
        A: Number(budgetTarget.A),
      },
    };

    const schema = initial ? updateLeagueSchema : createLeagueSchema;
    const result = schema.safeParse(candidate);
    if (!result.success) {
      const nextErrors: Record<string, string> = {};
      for (const issue of result.error.issues) {
        const key = issue.path.join(".") || "form";
        nextErrors[key] = issue.message;
      }
      setFieldErrors(nextErrors);
      return;
    }
    setFieldErrors({});

    setSubmitting(true);
    try {
      const saved = initial
        ? await leaguesApi.updateLeague(initial.id, result.data)
        : await leaguesApi.createLeague(result.data);
      onSaved(saved);
    } catch (err) {
      if (err instanceof LeaguesApiError) {
        if (err.payload.error.fields) {
          const nextErrors: Record<string, string> = {};
          for (const [key, messages] of Object.entries(err.payload.error.fields)) {
            nextErrors[key] = messages.join(", ");
          }
          setFieldErrors(nextErrors);
        }
        setGeneralError(err.payload.error.message);
      } else {
        setGeneralError(err instanceof Error ? err.message : "salvataggio fallito");
      }
    } finally {
      setSubmitting(false);
    }
  }

  const errorsFor = (prefix: string) =>
    Object.entries(fieldErrors).filter(([key]) => key.startsWith(prefix));

  return (
    <form onSubmit={handleSubmit}>
      <h3 style={{ margin: "0 0 18px" }}>{initial ? `Modifica ${initial.name}` : "Nuova lega"}</h3>

      {generalError && <StatusMessage kind="error">{generalError}</StatusMessage>}

      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, maxWidth: 860, marginBottom: 30 }}>
        <div className="field" style={{ width: 260 }}>
          <label htmlFor="lf-name">Nome</label>
          <input
            id="lf-name"
            className="input"
            placeholder="es. Lega Bar Centrale"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>
        <div className="field" style={{ width: 130 }}>
          <label htmlFor="lf-squadre">Squadre</label>
          <input
            id="lf-squadre"
            className="input"
            type="number"
            value={nSquadre}
            onChange={(e) => setNSquadre(e.target.value)}
          />
        </div>
        <div className="field" style={{ width: 130 }}>
          <label htmlFor="lf-budget">Budget</label>
          <input
            id="lf-budget"
            className="input"
            type="number"
            value={budget}
            onChange={(e) => setBudget(e.target.value)}
          />
        </div>
      </div>
      {fieldErrors.name && (
        <p style={{ color: "var(--color-accent-2-700)", fontSize: 12 }}>{fieldErrors.name}</p>
      )}

      <h4 style={{ margin: "0 0 12px" }}>Rosa</h4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: 34 }}>
        {ROSTER_FIELDS.map(({ key, label }) => (
          <div className="field" style={{ width: 130 }} key={key}>
            <label htmlFor={`lf-roster-${key}`}>{label}</label>
            <input
              id={`lf-roster-${key}`}
              className="input"
              type="number"
              value={roster[key]}
              onChange={(e) => setRoster((r) => ({ ...r, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      {errorsFor("roster_config").map(([key, message]) => (
        <p key={key} style={{ color: "var(--color-accent-2-700)", fontSize: 12 }}>
          {key}: {message}
        </p>
      ))}

      <h4 style={{ margin: "0 0 12px" }}>Budget obiettivo per reparto</h4>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, marginBottom: 12 }}>
        {BUDGET_TARGET_FIELDS.map(({ key, label }) => (
          <div className="field" style={{ width: 130 }} key={key}>
            <label htmlFor={`lf-budget-target-${key}`}>{label}</label>
            <input
              id={`lf-budget-target-${key}`}
              className="input"
              type="number"
              value={budgetTarget[key]}
              onChange={(e) => setBudgetTarget((b) => ({ ...b, [key]: e.target.value }))}
            />
          </div>
        ))}
      </div>
      {(() => {
        const sum =
          Number(budgetTarget.P) +
          Number(budgetTarget.D) +
          Number(budgetTarget.C) +
          Number(budgetTarget.A);
        return sum !== 100 ? (
          <p style={{ color: "var(--color-accent-2-700)", fontSize: 12, marginBottom: 22 }}>
            La somma delle percentuali è {sum}, non 100.
          </p>
        ) : null;
      })()}
      {errorsFor("budget_target_by_role").map(([key, message]) => (
        <p key={key} style={{ color: "var(--color-accent-2-700)", fontSize: 12 }}>
          {key}: {message}
        </p>
      ))}

      <h4 style={{ margin: "0 0 12px" }}>Punteggio</h4>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, minmax(0, 190px))",
          gap: "16px 24px",
          marginBottom: 22,
        }}
      >
        {SCORING_FIELDS.map(({ key, label }) => (
          <div className="field" key={key}>
            <label htmlFor={`lf-scoring-${key}`}>{label}</label>
            <input
              id={`lf-scoring-${key}`}
              className="input"
              type="number"
              step="0.5"
              value={String(scoring[key])}
              onChange={(e) => setScoringField(key, e.target.value)}
            />
          </div>
        ))}
      </div>
      <div className="field" style={{ maxWidth: 400, marginBottom: 34 }}>
        <label htmlFor="lf-fasce">Fasce gol (punteggio squadra)</label>
        <input
          id="lf-fasce"
          className="input"
          value={fasceText}
          onChange={(e) => setFasceText(e.target.value)}
        />
      </div>
      {errorsFor("scoring").map(([key, message]) => (
        <p key={key} style={{ color: "var(--color-accent-2-700)", fontSize: 12 }}>
          {key}: {message}
        </p>
      ))}

      <h4 style={{ margin: "0 0 12px" }}>Modificatori</h4>
      <div style={{ display: "flex", flexDirection: "column", gap: 9, marginBottom: 22 }}>
        <button type="button" className="toggle-row" onClick={() => toggleModifier("difesa")}>
          <span
            className={modificatori.difesa.enabled ? "toggle-box toggle-box--on" : "toggle-box"}
          />
          Modificatore difesa
        </button>
        {OTHER_MODIFIERS.map(({ key, label }) => (
          <button
            type="button"
            className="toggle-row"
            key={key}
            onClick={() => toggleModifier(key)}
          >
            <span
              className={modificatori[key].enabled ? "toggle-box toggle-box--on" : "toggle-box"}
            />
            {label}
          </button>
        ))}
      </div>
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 10,
          maxWidth: 340,
          marginBottom: 34,
        }}
      >
        <span className="text-muted" style={{ fontSize: 12 }}>
          Tabella difesa: media voto → bonus
        </span>
        {modificatori.difesa.tabella.map((band, index) => (
          <div style={{ display: "flex", gap: 12 }} key={index}>
            <input
              className="input"
              type="number"
              step="0.5"
              aria-label={`Media banda ${index + 1}`}
              value={String(band.media)}
              onChange={(e) => setDifesaBand(index, "media", e.target.value)}
            />
            <input
              className="input"
              type="number"
              step="0.5"
              aria-label={`Bonus banda ${index + 1}`}
              value={String(band.bonus)}
              onChange={(e) => setDifesaBand(index, "bonus", e.target.value)}
            />
          </div>
        ))}
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Salvataggio…" : initial ? "Salva" : "Crea lega"}
        </button>
        <button
          type="button"
          className="btn btn-secondary"
          onClick={onCancel}
          disabled={submitting}
        >
          Annulla
        </button>
      </div>
    </form>
  );
}
