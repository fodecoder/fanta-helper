import { useState, type FormEvent } from "react";
import {
  createLeagueSchema,
  updateLeagueSchema,
  type League,
  type CreateLeagueInput,
} from "@fanta-helper/shared";
import * as leaguesApi from "../api/leagues";
import { LeaguesApiError } from "../api/leagues";
import { StatusMessage } from "./StatusMessage";

interface LeagueFormProps {
  initial?: League;
  onSaved: () => void;
  onCancel: () => void;
}

export function LeagueForm({ initial, onSaved, onCancel }: LeagueFormProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [nSquadre, setNSquadre] = useState(initial ? String(initial.n_squadre) : "");
  const [budget, setBudget] = useState(initial ? String(initial.budget) : "");
  const [rosterP, setRosterP] = useState(initial ? String(initial.roster_config.P) : "");
  const [rosterD, setRosterD] = useState(initial ? String(initial.roster_config.D) : "");
  const [rosterC, setRosterC] = useState(initial ? String(initial.roster_config.C) : "");
  const [rosterA, setRosterA] = useState(initial ? String(initial.roster_config.A) : "");
  const [scoringText, setScoringText] = useState(JSON.stringify(initial?.scoring ?? {}, null, 2));
  const [modificatoriText, setModificatoriText] = useState(
    JSON.stringify(initial?.modificatori ?? {}, null, 2),
  );

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function parseJsonField(text: string, field: string, errors: Record<string, string>): unknown {
    try {
      return JSON.parse(text);
    } catch {
      errors[field] = "JSON non valido";
      return undefined;
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setGeneralError(null);

    const errors: Record<string, string> = {};
    const scoring = parseJsonField(scoringText, "scoring", errors);
    const modificatori = parseJsonField(modificatoriText, "modificatori", errors);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

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
      scoring: scoring as Record<string, unknown>,
      modificatori: modificatori as Record<string, unknown>,
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

      <label>
        Scoring (JSON)
        <textarea value={scoringText} onChange={(e) => setScoringText(e.target.value)} rows={6} />
      </label>
      {fieldErrors.scoring && <p className="field-error">{fieldErrors.scoring}</p>}

      <label>
        Modificatori (JSON)
        <textarea
          value={modificatoriText}
          onChange={(e) => setModificatoriText(e.target.value)}
          rows={6}
        />
      </label>
      {fieldErrors.modificatori && <p className="field-error">{fieldErrors.modificatori}</p>}

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
