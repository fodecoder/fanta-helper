# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.4.0] - 2026-08-15

### Added

- CSV quotazioni import endpoint (`POST /players/import`) for the shared
  `player` pool: parses the Fantacalcio.it classic export (`;`-delimited,
  `R`/`Nome`/`Squadra` columns), normalizes name/team/ruolo, and performs an
  idempotent `name`+`team` upsert so reimporting the same file never creates
  duplicates. A new `UNIQUE (name, team)` constraint on `player` backs the
  upsert; `image_url` is left untouched on update so a later photo backfill
  is never overwritten by a requotation import.
- Row-level import report (`inserted`/`updated` counts, `discarded` rows with
  a reason each for missing fields or an invalid `ruolo`), typed and shared
  between `server` and `web` via `@fanta-helper/shared`.
- Import quotazioni screen in the web app: CSV file upload with a report
  preview, reachable via a simple in-app nav alongside the leagues screen.

## [0.3.0] - 2026-08-15

### Added

- Full CRUD REST API for the `league` entity (`GET/POST /leagues`,
  `GET/PUT/DELETE /leagues/:id`), with request validation via shared Zod
  schemas and a structured `{ error: { code, message, fields? } }` response
  contract for `400`/`404`/`409` errors, including a clean `409 CONFLICT`
  mapping for unique-name violations instead of a raw Postgres error.
- Zod schemas and inferred types for league payloads and JSONB columns
  (`roster_config`, `scoring`, `modificatori`) in `@fanta-helper/shared`,
  used as the single source of truth by both `server` (request validation)
  and `web` (client-side form validation).
- League management screen in the web app: a list view (name, n_squadre,
  budget, edit/delete) and a create/edit form (roster config counters,
  free-form `scoring`/`modificatori` JSON editors), switching views via
  local component state.

## [0.2.0] - 2026-08-15

### Added

- PostgreSQL schema (`league`, `player`, `valuation`, `manager`, `purchase`)
  via `node-pg-migrate` SQL migrations, with foreign keys, `CHECK`-based
  `ruolo`/`confidence` enums, and constraints enforcing the domain invariant
  that auction state is always derived from the immutable `purchase` log
  (composite primary keys and a league-consistent manager foreign key
  prevent duplicate or cross-league purchases from ever being stored).
- Typed data-access layer in `server/src/db` (`pg`-based) with read/insert
  query modules per table and a derived-state query computing each
  manager's remaining budget straight from the `purchase` log.
- `db:migrate`, `db:migrate:down`, and `db:seed` scripts (root and `server`
  workspace), plus `DATABASE_URL` in `server/.env.example`.

## [0.1.0] - 2026-08-15

### Added

- Monorepo scaffolding with npm workspaces: `web` (React + TypeScript SPA via
  Vite), `server` (thin Node + TypeScript backend), and `shared` (shared
  TypeScript types, source-only, no build step).
- Shared types for player roles (P/D/C/A), league rules configuration, and the
  `Valuation` import schema.
- Minimal Express server with a `GET /health` endpoint.
- Placeholder web page rendering the application name.
- Strict TypeScript configuration, ESLint (flat config) and Prettier across
  all packages.
