import { useState, type FormEvent } from "react";
import {
  createLeagueSchema,
  updateLeagueSchema,
  defaultRosterConfig,
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
  onSaved: () => void;
  onCancel: () => void;
}

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

const MODIFIER_TOGGLES: { key: keyof Omit<ModifiersConfig, "difesa">; label: string }[] = [
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
  const [rosterP, setRosterP] = useState(String(initial?.roster_config.P ?? defaultRosterConfig.P));
  const [rosterD, setRosterD] = useState(String(initial?.roster_config.D ?? defaultRosterConfig.D));
  const [rosterC, setRosterC] = useState(String(initial?.roster_config.C ?? defaultRosterConfig.C));
  const [rosterA, setRosterA] = useState(String(initial?.roster_config.A ?? defaultRosterConfig.A));
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
        P: Number(rosterP),
        D: Number(rosterD),
        C: Number(rosterC),
        A: Number(rosterA),
      },
      scoring: { ...scoring, fasce_gol },
      modificatori,
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
      if (initial) {
        await leaguesApi.updateLeague(initial.id, result.data);
      } else {
        await leaguesApi.createLeague(result.data);
      }
      onSaved();
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

  return (
    <form className="card" onSubmit={handleSubmit}>
      <h2>{initial ? "Modifica lega" : "Nuova lega"}</h2>

      {generalError && <StatusMessage kind="error">{generalError}</StatusMessage>}

      <label>
        Nome
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}

      <label>
        Numero squadre
        <input type="number" value={nSquadre} onChange={(e) => setNSquadre(e.target.value)} />
      </label>
      {fieldErrors.n_squadre && <p className="field-error">{fieldErrors.n_squadre}</p>}

      <label>
        Budget
        <input type="number" value={budget} onChange={(e) => setBudget(e.target.value)} />
      </label>
      {fieldErrors.budget && <p className="field-error">{fieldErrors.budget}</p>}

      <fieldset>
        <legend>Composizione rosa</legend>
        <label>
          P
          <input type="number" value={rosterP} onChange={(e) => setRosterP(e.target.value)} />
        </label>
        <label>
          D
          <input type="number" value={rosterD} onChange={(e) => setRosterD(e.target.value)} />
        </label>
        <label>
          C
          <input type="number" value={rosterC} onChange={(e) => setRosterC(e.target.value)} />
        </label>
        <label>
          A
          <input type="number" value={rosterA} onChange={(e) => setRosterA(e.target.value)} />
        </label>
        {Object.entries(fieldErrors)
          .filter(([key]) => key.startsWith("roster_config"))
          .map(([key, message]) => (
            <p className="field-error" key={key}>
              {key}: {message}
            </p>
          ))}
      </fieldset>

      <fieldset>
        <legend>Punti (bonus / malus)</legend>
        {SCORING_FIELDS.map(({ key, label }) => (
          <label key={key}>
            {label}
            <input
              type="number"
              step="0.5"
              value={String(scoring[key])}
              onChange={(e) => setScoringField(key, e.target.value)}
            />
          </label>
        ))}
        <label>
          Fasce gol (soglie, separate da virgola)
          <input value={fasceText} onChange={(e) => setFasceText(e.target.value)} />
        </label>
        {Object.entries(fieldErrors)
          .filter(([key]) => key.startsWith("scoring"))
          .map(([key, message]) => (
            <p className="field-error" key={key}>
              {key}: {message}
            </p>
          ))}
      </fieldset>

      <fieldset>
        <legend>Modificatori</legend>
        <label className="checkbox">
          <input
            type="checkbox"
            checked={modificatori.difesa.enabled}
            onChange={(e) =>
              setModificatori((prev) => ({
                ...prev,
                difesa: { ...prev.difesa, enabled: e.target.checked },
              }))
            }
          />
          Modificatore difesa
        </label>
        <div className="difesa-bands">
          {modificatori.difesa.tabella.map((band, index) => (
            <span className="difesa-band" key={index}>
              <label>
                Media
                <input
                  type="number"
                  step="0.5"
                  value={String(band.media)}
                  onChange={(e) => setDifesaBand(index, "media", e.target.value)}
                />
              </label>
              <label>
                Bonus
                <input
                  type="number"
                  step="0.5"
                  value={String(band.bonus)}
                  onChange={(e) => setDifesaBand(index, "bonus", e.target.value)}
                />
              </label>
            </span>
          ))}
        </div>
        {MODIFIER_TOGGLES.map(({ key, label }) => (
          <label className="checkbox" key={key}>
            <input
              type="checkbox"
              checked={modificatori[key].enabled}
              onChange={(e) =>
                setModificatori((prev) => ({ ...prev, [key]: { enabled: e.target.checked } }))
              }
            />
            {label}
          </label>
        ))}
        {Object.entries(fieldErrors)
          .filter(([key]) => key.startsWith("modificatori"))
          .map(([key, message]) => (
            <p className="field-error" key={key}>
              {key}: {message}
            </p>
          ))}
      </fieldset>

      <div className="form-actions">
        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? "Salvataggio…" : "Salva"}
        </button>
        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={submitting}>
          Annulla
        </button>
      </div>
    </form>
  );
}
