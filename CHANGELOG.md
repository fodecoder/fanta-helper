# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.5.0] - 2026-08-20

### Changed

- **Seed rigoristi indipendente dall'estrazione AI**: lo script
  `db:seed:historical:rigoristi` ora legge un dataset statico
  (`server/src/scripts/data/setPieceTakersSeed.ts`), trascritto dal PDF
  "Rigoristi e tiratori da fermo Serie A", invece di inviare il testo del PDF
  all'API Claude. Il seed non richiede più `ANTHROPIC_API_KEY`; il flusso
  in-app di upload screenshot + estrazione resta invariato come fonte di
  correzione. Copre tutte e 20 le squadre (sezione "Rigori" → `rigore`,
  "Calci piazzati" → `punizione`), con il `rank` dato dall'ordine di lista.

## [2.4.0] - 2026-08-19

### Added

- **Motore di consiglio giocatori**: nuovo modulo puro (`shared`) che
  ordina i disponibili per valore relativo alla lega, non assoluto. La
  fantamedia viene ricostruita dai bonus/malus grezzi (`gf`, `assist`,
  `rig_plus/minus`, `rp`, `amm`, `esp`, `autogol`, `gs` per i portieri) pesati
  con lo `scoring` della lega, invece di fidarsi della `fm` importata (che
  riflette il sistema di punteggio della fonte, non quello scelto in lega);
  il modificatore `difesa` (unico con una tabella media→bonus) si applica a
  portieri e difensori usando il `mv` del giocatore come proxy della difesa
  di reparto.
- **Affidabilità pesata sulle presenze**: la fantamedia regolata è scalata
  per la quota di presenze sulle giornate finora disputate (dedotte dal
  massimo osservato nella stagione, non un `38` fisso), così un rendimento
  alto su poche partite pesa meno di uno stabile su tutta la stagione.
- **Punteggio come valore sopra il rimpiazzo (VORP)**: per ogni ruolo il
  punteggio finale è il margine rispetto al giocatore marginale ancora
  disponibile al rank corrispondente agli slot liberi residui di "Io",
  aggiustato per la scarsità di reparto (domanda residua di lega contro
  offerta ancora disponibile). Segnala anche il divario tra valore stimato e
  prezzo di mercato (`FVM`) come possibile occasione.
- **Endpoint di lettura e vista "Consigli"**: `GET
  /leagues/:leagueId/recommendations` e nuova pagina in navigazione con
  filtro per ruolo e pannello "Dettagli" per componente (affidabilità, bonus
  attesi, aggiustamento regole, scarsità), così il suggerimento resta
  spiegabile e non una scatola nera.

### Fixed

- Le colonne `NUMERIC` (`mv`, `fm` di `player_season_stats`) tornavano dal
  driver Postgres come stringhe: un'addizione diventava una concatenazione
  di testo. Aggiunto un parser di tipo globale che le converte in numeri,
  corretto per qualunque futura colonna `NUMERIC`.

### Notes

- Nessun cambiamento all'invariante di dominio: il motore è puro e
  deterministico, non introduce stato — ricalcola sempre da pool,
  quotazioni/statistiche dell'ultima stagione disponibile, log `purchase` e
  regole lega. I modificatori senza una tabella di bonus definita
  (`centrocampo`, `attacco`, `portiere`, `capitano`, `modulo`) restano flag
  di configurazione visibili ma non contribuiscono al punteggio: nessun dato
  inventato.

## [2.3.1] - 2026-08-19

### Fixed

- `db:seed:historical*` erano definiti solo in `server/package.json`: non
  lanciabili da `npm run` alla radice del repo. Aggiunti i proxy mancanti
  nello `package.json` root, come già per `db:migrate`/`db:seed`.

## [2.3.0] - 2026-08-19

### Added

- **Quotazioni e statistiche storiche a DB**: nuove tabelle globali
  `quotation` (`qt_i`, `qt_a`, `fvm` per stagione) e `player_season_stats`
  (presenze, media voto, fantamedia e bonus/malus per stagione), entrambe
  univoche per `(player_id, season)`; nuova colonna `player.fanta_id`
  (nullable, univoca) come chiave di join stabile con i listoni ufficiali,
  con fallback a matching per `name`+`team` quando l'`Id` manca o non è
  ancora noto — righe ambigue o senza corrispondenza finiscono in un report
  di scarto, mai stimate.
- **Import a sostituzione per stagione**, in transazione: un reimport
  riflette esattamente l'ultimo file per quella stagione.
- **Comando di seed storico locale** (`db:seed:historical:*`, mai una route
  pubblica) che legge i listoni xlsx già presenti in `docs/` e popola
  `quotation`/`player_season_stats` per tutte le stagioni disponibili.
- **Upload portale esteso**: l'import xlsx già usato per il pool `player`
  scrive ora anche `quotation` per la stagione corrente, ricavata dal nome
  del file.
- **Rigoristi/calci piazzati da PDF**: seed one-off che alimenta il
  `set_piece_taker` esistente a partire dal PDF ufficiale, con estrazione
  testuale via Claude (il PDF si è rivelato un vero export testuale, non una
  scansione) — le righe incerte non vengono scritte, restano solo un report
  a console; la pagina "Rigoristi e calci piazzati" resta la fonte di
  correzione.

### Notes

- Nessun cambiamento all'invariante di dominio: le nuove tabelle sono puro
  riferimento globale, `purchase` resta l'unico log da cui deriva lo stato
  d'asta.

## [2.2.0] - 2026-08-18

### Changed

- **Ristrutturazione del portale nel design system Broadsheet**: interfaccia
  ricostruita fedelmente (carta chiara, serif Source Serif 4, accento ciano,
  magenta raro, nessuna card) con token e classi portati in
  `web/src/index.css`, inclusi i numerali a lastre CMYK (`.cmyk-num`, puro CSS).
- **Shell lega-centrica**: sidebar fissa `236px` con selettore lega e sette voci
  (Panoramica, Manager, Valutazioni, Quotazioni, Coppie portieri, Probabili
  formazioni, Leghe); la lega attiva resta in querystring (`?league=`). Rimossa
  la navigazione a bottoni annidati (Home → lega → sotto-vista).
- **Modalità asta a schermo pieno**: contesto separato con layout desktop
  (tre colonne: chiamata, in asta con price ladder e verdetto, pannello "Io") e
  layout telefono dedicato (fascia fissa + pannello a tab Lista/Alternative/Log).
  Si entra dalla sidebar, si esce con `Esc`; `↑/↓` scelgono, `Invio` assegna.
- **Panoramica lega**: quattro figure a lastre CMYK (residuo, max bid rettificato,
  slot liberi, speso), tabella stato manager e colonne obiettivi/ultime chiamate.

### Notes

- Nessun cambiamento ai contratti API/DB né alle invarianti di dominio: lo stato
  dell'asta resta derivato dal log `purchase` e `computeAdjustedMaxBid`
  (`shared/src/maxBid.ts`) è l'unica fonte del max bid rettificato.

## [2.1.0] - 2026-08-18

### Added

- **Valutazioni generate via LLM in-app**: nuovo endpoint
  `POST /leagues/:leagueId/valuations/generate` (chiave Anthropic solo
  lato backend) che genera le valutazioni per-lega chiamando Claude con il
  pool giocatori e le regole della lega (`scoring`, `modificatori`,
  `roster_config`), suddividendo il listone in chunk per ruolo (P/D/C/A) e
  ulteriormente in batch per restare entro il limite di output del
  modello. Ogni chunk è validato indipendentemente contro lo schema delle
  valutazioni; le righe non interpretabili vengono scartate (mai
  inventate) e il matching nome+squadra → giocatore riusa la stessa
  logica esatta dell'import JSON. UI "Genera valutazioni" nella schermata
  Valutazioni con anteprima modificabile riga per riga prima del
  salvataggio; gli unmatched restano in revisione, non stimati.

## [2.0.0] - 2026-08-18

### Changed

- **Matrice coppie portieri**: la gerarchia titolare/riserva (`goalkeeper_grid`)
  è sostituita da una matrice simmetrica squadra×squadra (`gk_pairing`) con un
  punteggio di favorevolezza della coppia di portieri — più basso = i due
  portieri giocano meno spesso in casa nella stessa giornata; le coppie che
  condividono lo stadio (Roma-Lazio, Inter-Milan, Juve-Torino) valgono `0`.
  Import da xlsx/CSV in formato matrice (intestazione riga/colonna = sigle
  squadra, diagonale vuota, righe di legenda finali scartate e mai
  inventate), a sostituzione integrale in transazione. Nuova UI "Coppie
  portieri": scelta una squadra, mostra i compagni ordinati per
  favorevolezza con display invertibile (alto = più favorevole). Endpoint
  `/goalkeeper-grid` rimosso in favore di `/gk-pairing`.

## [1.10.0] - 2026-08-18

### Added

- **Logo FantaProfeta**: icona mostrata nell'header accanto al titolo e come
  favicon (`favicon.ico` multi-size 16/32/48 + `logo.png`).

## [1.9.0] - 2026-08-18

### Added

- **Nome applicazione FantaProfeta**: intestazione e titolo pagina aggiornati al
  nome utente-facing. Il nome tecnico del pacchetto/workspace resta `fanta-helper`.
- **Versione in footer**: la versione dell'applicazione (da `package.json` di root,
  iniettata a build via `__APP_VERSION__`) è mostrata in fondo a ogni schermata.

## [1.8.0] - 2026-08-18

### Added

- **Rigoristi e tiratori di punizioni**: nuova tabella globale
  `set_piece_taker` (`team, tipo, player_name, rank`, `tipo` ∈
  rigore/punizione/corner), stessa pipeline di ingest delle probabili
  formazioni — screenshot per squadra, estrazione con Claude (vision), bozza
  modificabile prima del salvataggio, righe incerte evidenziate e mai
  inventate, conferma che sostituisce in transazione solo la squadra
  confermata. Mostrati nella stessa tab "Probabili formazioni", per squadra,
  in gerarchia. Riusa il modulo `claudeExtraction` già introdotto per le
  formazioni.

## [1.7.0] - 2026-08-18

### Added

- **Probabili formazioni**: nuova tabella globale `probable_lineup`
  (indipendente da league/purchase, come `goalkeeper_grid`) popolata caricando
  uno screenshot editoriale per squadra. Il backend estrae le righe con
  Claude (vision, chiave solo server-side) e le restituisce come bozza
  modificabile — nessuna riga viene salvata finché l'utente non la rivede in
  UI e conferma; le righe che il modello segnala come incerte sono
  evidenziate con il motivo, mai inventate. La conferma sostituisce in
  transazione solo le righe della squadra confermata, lasciando intatte le
  altre. Lo screenshot originale resta salvato per squadra (sovrascritto al
  nuovo upload). Nuova tab "Probabili formazioni" con undici probabile,
  ballottaggi, panchina e modulo calcolato quando i dati lo consentono.
  L'integrazione con una fonte editoriale esterna resta backlog opzionale.

## [1.6.0] - 2026-08-17

### Added

- **Confronto in asta per ruolo**: selezionando un giocatore in `PurchaseForm`
  compare un pannello "Confronto per ruolo" con il ranking dei giocatori dello
  stesso ruolo ancora disponibili (esclusi quelli nel log `purchase`), ordinati
  per `fair_value`/`target`, con tier/max bid/panic price e i bisogni di
  reparto/residuo/max bid rettificato del manager "Io". Il confronto base è
  puramente derivato client-side dai dati già in-app (valutazioni, pool
  giocatori, stato manager), nessun nuovo endpoint aggregato o stato
  persistito.
- **Arricchimento opzionale minuti/gol/assist**: nuovo modulo backend
  `statsApi` (dietro `STATS_API_ENABLED`/`STATS_API_KEY`, chiave solo
  server-side, cache in-memory e rate-limit giornaliero) che proxya un
  provider di statistiche esterno e alimenta colonne extra nel confronto
  quando attivo; disattivato di default, il confronto base non ne dipende e
  non degrada se l'arricchimento manca o è esaurito.

## [1.5.0] - 2026-08-17

### Added

- **Wishlist per-lega**: obiettivi d'asta marcabili dalla ricerca giocatori
  (stella nella lista di `PurchaseForm`), con riordino per priorità e
  rimozione dal nuovo pannello "Obiettivi d'asta" nella schermata Asta. Nuova
  tabella `wishlist` (univoca su `league_id, player_id`, cascade sulla lega),
  data-access tipato e route CRUD sotto `/leagues/:leagueId/wishlist`
  (incluso un endpoint di riordino bulk). Lista di supporto, ortogonale al log
  `purchase`: i giocatori in wishlist ancora disponibili vengono evidenziati
  nella ricerca durante l'asta, quelli già assegnati mostrano il badge
  "assegnato".

## [1.4.0] - 2026-08-17

### Added

- **Goalkeeper grid**: a global reference (per-team goalkeeper hierarchy,
  `rank 1 = starter`), imported from CSV/xlsx in wide format (`Squadra`,
  `Titolare`, `Riserva`, `Terzo`, …). New `goalkeeper_grid` table and migration,
  DB layer, import parser, and `/goalkeeper-grid` routes. Each import replaces
  the whole grid in a transaction. Not tied to leagues or purchases.
- Dedicated "Griglia portieri" screen (import + table) and a read-only
  consultation panel inside the auction screen.

### Note

- `render.yaml` (Render backend Blueprint) added at the repo root, matching the
  hosting instructions in the README.

## [1.3.0] - 2026-08-17

### Added

- Quotazioni import now accepts **xlsx** in addition to CSV (SheetJS). The parser
  detects the header row, tolerating a leading title row, and requires columns
  `R`, `Nome`, `Squadra`.

### Changed

- Extracted a shared `fileRows` helper (CSV/xlsx row extraction + header
  detection) and refactored the player import around it. The `/players/import`
  route accepts both text (CSV) and binary (xlsx) bodies.

### Note

- SheetJS `xlsx@0.18.5` (the npm build) carries known advisories (prototype
  pollution / ReDoS). Acceptable here: import runs on locally chosen, trusted
  files. Revisit if the app ever ingests untrusted spreadsheets.

## [1.2.0] - 2026-08-17

### Added

- Creating a league now seeds its participants: the owner manager `Io` plus
  `n_squadre − 1` opponents with generated funny names. They remain editable
  from the manager screen; managers are not derived state (purchases still
  reference `manager.id`).

## [1.1.0] - 2026-08-17

### Added

- New-league form now ships prefilled, editable defaults: roster `3/8/8/6`,
  `n_squadre = 8`, `budget = 1000`.
- Structured form for scoring (bonus/malus + goal thresholds) and modifiers,
  replacing the raw JSON textareas. Defaults follow the standard Fantacalcio
  (Fantagazzetta) ruleset: gol `+3`, assist `+1`, penalty scored/saved `+2.5`,
  penalty missed `−2.5`, booking `−0.5`, red card `−1`, own goal `−2`, goal
  conceded `−1`; goal thresholds `[66, 72, 77, 81, 85, 89]`; defense modifier
  table `6 → +1`, `6.5 → +3`, `7 → +6`, plus midfield/attack/goalkeeper/captain/
  formation toggles.

### Changed

- Typed `scoring` and `modificatori` schemas in `shared/src/league.ts` (still
  stored as JSONB); seed uses the shared defaults.

## [1.0.0] - 2026-08-17

Chiude la Fase 2 lato codice (rifinitura UI + miniature giocatori, dopo il max
bid rettificato di `v0.9.0`): MVP funzionale completo secondo `PLAN.md`.
Provisioning dei servizi (Render, Cloudflare Pages, CORS) resta da completare
prima che il rilascio sia pienamente in produzione.

## [0.11.0] - 2026-08-17

### Added

- Player thumbnails wherever a player is shown (Asta search, purchase log,
  valuations table, unmatched-import rows): a new `PlayerAvatar` component
  renders the real photo when `player.image_url` is set, otherwise a
  deterministic placeholder — initials on a role-colored background (P/D/C/A),
  with a ring colored from a stable hash of the team name standing in for a
  crest. No external fetch: everything is derived locally from
  name/team/ruolo.
- `image_url` threaded through the enriched valuation and purchase-log rows
  (`ValuationWithPlayer`, `PurchaseWithDetails`) so those screens can show the
  real photo, not just the player list endpoint.
- Replaced the native player `<select>` in the Asta assignment form with a
  filterable custom listbox, since thumbnails can't be rendered inside native
  `<option>` elements.

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
