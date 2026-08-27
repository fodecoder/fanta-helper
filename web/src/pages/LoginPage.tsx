import { useState } from "react";
import type { User } from "@fanta-helper/shared";
import * as authApi from "../api/auth";
import { AuthApiError } from "../api/auth";
import { StatusMessage } from "../components/StatusMessage";

interface LoginPageProps {
  onLoggedIn: (user: User) => void;
}

export function LoginPage({ onLoggedIn }: LoginPageProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    authApi
      .login({ username, password })
      .then(onLoggedIn)
      .catch((err: unknown) => {
        setError(err instanceof AuthApiError ? err.payload.error.message : "errore di rete");
      })
      .finally(() => setSubmitting(false));
  }

  return (
    <div className="login-page">
      <form className="card login-card" onSubmit={handleSubmit}>
        <div className="sidebar-brand">
          <img src="/logo.png" alt="" />
          <span>FantaProfeta</span>
        </div>

        {error && <StatusMessage kind="error">{error}</StatusMessage>}

        <div className="field">
          <label htmlFor="login-username">Utente</label>
          <input
            id="login-username"
            className="input"
            autoFocus
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>

        <div className="field">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
          Accedi
        </button>
      </form>
    </div>
  );
}
