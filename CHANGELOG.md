# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.10.0] - 2026-08-17

### Added

- Design tokens for the brand palette as CSS custom properties in
  `web/src/index.css` (`--color-brand-green`, `--color-header-blue`,
  `--color-accent-orange`, plus a small derived neutral scale for
  text/border/background and a spacing/radius scale), replacing the one
  hardcoded hex value in the codebase. Header blue fixed to `#11246F`
  (higher contrast, ~13.9:1 on white, versus ~8.4:1 for the alternative
  `#144F89`).
- Shared presentational components (`PageHeader`, `StatusMessage`) and
  component classes (`.app-header`, `.nav-button`, `.card`, `.table-wrap`,
  `.btn-primary`/`.btn-secondary`, `.status-message`) replacing duplicated
  "Indietro" headers and loading/error/empty ternaries across Home, Leghe,
  Manager, Valutazioni and Asta.
- Consolidated table and form styling across all screens: zebra rows,
  sticky headers, right-aligned tabular numeric columns. Applied with
  priority to the Asta screen (purchase log and per-manager derived
  status), where budget, residuo and max bid rettificato need to be
  readable at a glance during a live auction.
- Presentation only: no change to the auction domain invariant, no
  mutable state field introduced, no new dependency.

## [0.9.0] - 2026-08-17

### Added

- Adjusted (opportunity-cost) max bid: `computeAdjustedMaxBid` in `shared`,
  a pure function of a manager's residual budget and free roster slots per
  role. Reserves 1 credit (`MIN_SLOT_RESERVE`, the minimum bid for any
  player) for every free slot left after the current pick, so bidding it all
  away never blocks completing the roster. Deterministic and explainable —
  no market estimate, no LLM. Recomputed on every request from the
  `purchase` log, same as `residuo` and slot counts; not a stored column.
  Known limits: the floor is uniform across roles (doesn't reflect that
  forwards/midfielders typically cost more than goalkeepers) and it doesn't
  account for remaining market inflation or other managers' behavior.
- `adjustedMaxBid` added to `ManagerAuctionStatus` and surfaced in the Asta
  screen: a new column in the per-manager status table, and a prominent
  value next to the price field in the purchase form for whichever manager
  is currently selected there.
- First unit tests in the repo (`vitest`, scoped to the `shared` workspace)
  covering `computeAdjustedMaxBid`'s edge cases: full roster, last free
  slot, mixed-role reserves, and clamping to zero.

## [0.8.0] - 2026-08-17

### Added

- League selector on a new Home screen (`HomePage`, `LeagueSelector`), setting
  an active league that Manager, Valutazioni, and Asta all read from — reusing
  the existing `ManagersPage`/`ValuationsPage`/`AuctionPage` components
  unchanged. Selection is UI-side state only, never a persisted domain field.
- Deep-link support via a `?league=<id>` query parameter, read on load to
  preselect the active league and kept in sync with `history.replaceState` as
  the selection changes, with no new routing dependency.
- `Leghe` is now purely CRUD (create/edit/delete): the per-row
  Manager/Valutazioni/Asta shortcuts are removed now that Home is the single
  operational entry point for those screens.

## [0.7.0] - 2026-08-17

### Added

- League-scoped purchase log endpoints under `/leagues/:leagueId/purchases`:
  `GET /` lists the immutable log enriched with player and manager names,
  `POST /` appends a purchase (league, player, manager, price), `GET /state`
  returns the derived auction status per manager, and `DELETE /last` removes
  the single most recently appended row as an explicit, traceable correction.
  There is no update endpoint: the log is append-only, and mistakes are
  corrected by removing the last entry, never by mutating a field.
- `db/derived.ts` extended (`getManagerAuctionStatuses`, replacing
  `getManagerBudgetStatuses`) to also compute free roster slots per role
  (`P`/`D`/`C`/`A`) alongside residual budget, both recomputed from the
  `purchase` log and the league's `roster_config` on every call — no
  additional mutable state.
- Asta live screen in the web app, reachable from each league row: player
  search with the current valuation shown when available, assignment to a
  manager with a price, a purchase event log with an "undo last" action, and
  a live-updating derived-status panel (residuo and slots per manager).
- Adjusted (opportunity-cost) max bid is intentionally out of scope here; the
  form only surfaces the static `max_bid` from `valuation`, if present.

## [0.6.0] - 2026-08-17

### Added

- League-scoped valuation JSON import (`POST
  /leagues/:leagueId/valuations/import`): validates the whole document
  against a strict Zod schema (required fields, `ruolo`/`confidence`
  enums, non-negative integers) and rejects non-conforming input
  wholesale rather than discarding individual rows. Also rejects the
  import if the document's `league_name` doesn't match the target
  league, guarding against importing a JSON generated for a different
  league.
- Deterministic `name`+`team` → `player_id` matching against the shared
  player pool (case-insensitive, trimmed), with an idempotent upsert
  into `valuation (league_id, player_id)`. Matches that are absent or
  ambiguous are never guessed: they are reported as `unmatched` with a
  reason instead.
- Manual reconciliation endpoint (`PUT
  /leagues/:leagueId/valuations/:playerId`) and a `GET /players`
  listing endpoint, used by the web app to let the user resolve each
  unmatched row by hand-picking an existing player or discarding it.
- Valuations screen in the web app, reachable from each league row:
  JSON upload with an import report, an unmatched-row reconciliation
  table (filterable player picker, assign/discard), and a read-only
  table of the league's current valuations.

## [0.5.0] - 2026-08-16

### Added

- Full CRUD REST API for the `manager` entity scoped to a league
  (`GET/POST /leagues/:leagueId/managers`, `PUT/DELETE
  /leagues/:leagueId/managers/:id`), with request validation via shared Zod
  schemas and a `409 CONFLICT` mapping for duplicate manager names within a
  league (`manager_league_name_uk`), extending the existing
  constraint-based unique-violation mapping in the error handler.
- Explicit guard against deleting a manager with recorded purchases
  (`409 CONFLICT`): the `purchase` log stays immutable rather than relying
  on the database's `ON DELETE CASCADE`, which remains only as a
  safety net for whole-league deletion.
- Manager management screen in the web app, reachable from each league row:
  a list view and a create/edit form, mirroring the league management UI.

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
