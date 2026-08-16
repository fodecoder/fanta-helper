import { useState, type FormEvent } from "react";
import {
  createManagerSchema,
  updateManagerSchema,
  type Manager,
  type CreateManagerInput,
} from "@fanta-helper/shared";
import * as managersApi from "../api/managers";
import { ManagersApiError } from "../api/managers";

interface ManagerFormProps {
  leagueId: number;
  initial?: Manager;
  onSaved: () => void;
  onCancel: () => void;
}

export function ManagerForm({ leagueId, initial, onSaved, onCancel }: ManagerFormProps) {
  const [name, setName] = useState(initial?.name ?? "");

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setGeneralError(null);

    const candidate: CreateManagerInput = { name };

    const schema = initial ? updateManagerSchema : createManagerSchema;
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
        await managersApi.updateManager(leagueId, initial.id, result.data);
      } else {
        await managersApi.createManager(leagueId, result.data);
      }
      onSaved();
    } catch (err) {
      if (err instanceof ManagersApiError) {
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
    <form onSubmit={handleSubmit}>
      <h2>{initial ? "Modifica manager" : "Nuovo manager"}</h2>

      {generalError && <p role="alert">{generalError}</p>}

      <label>
        Nome
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      {fieldErrors.name && <p className="field-error">{fieldErrors.name}</p>}

      <div>
        <button type="submit" disabled={submitting}>
          {submitting ? "Salvataggio…" : "Salva"}
        </button>
        <button type="button" onClick={onCancel} disabled={submitting}>
          Annulla
        </button>
      </div>
    </form>
  );
}
