# PLAN.md — Sequenza di feature

Fasi ordinate, dalla più vecchia alla più recente. Storico compatto in fondo.

> Stato al 2026-08-29 — `v4.6.0`. Fasi 0–7 complete. La **Fase 7 — Multiutente
> v4** (login 4 utenti, avatar, chat 1-a-1, preferenze per-utente, override
> valutazioni, tag giocatore, modificatori portiere/difesa nell'engine, score
> 0–10 per ruolo, SoFIFA in landing/asta) è chiusa: audit di verifica sul codice
> nella sezione «Fase 7» sotto. In corso la **Fase mobile (P10)**: sessione su
> mobile (proxy same-origin), chat fullscreen sotto 768px, notifiche di messaggio
> in arrivo. `PROMPTS.md` contiene i prompt operativi P1–P10; la traccia storica
> (Fasi ≤6) vive nel `CHANGELOG.md` e nella git history.

## Fase 0 — Scaffolding  *(completa)*

- [x] Inizializzazione repo e struttura progetto (frontend SPA + backend sottile)
- [x] Schema DB su PostgreSQL (Neon): tabelle base e migrazioni
- [x] Pipeline di deploy: frontend su Cloudflare Pages, backend su Render, DB su Neon *(codice/config pronti; provisioning manuale da eseguire)*
- [x] Configurazione ambienti e variabili (segreti solo lato backend)

## Fase 1 — MVP  *(completa)*

- [x] CRUD lega con configurazione regole in JSONB (roster, scoring, modificatori)
- [x] Import giocatori da CSV quotazioni ufficiali nel pool `player`
- [x] CRUD manager per lega (prerequisito dell'asta: gli acquisti referenziano un manager)
- [x] Import valutazioni (JSON) con matching nome→ID e revisione manuale degli unmatched
- [x] Schermata asta live: event-log degli acquisti + stato derivato (residuo, slot)
- [x] Selettore lega in home

## Fase 2 — Rifinitura  *(completa lato codice)*

- [x] Max bid rettificato deterministico (opportunity cost: residuo/bisogni con floor per reparto)
- [x] Rifinitura UI (design token dalla palette SPEC, coerenza schermate)
- [x] Miniature giocatori: colore squadra + placeholder per ruolo

## Fase 2.1 — Correzioni pre-release  *(completa lato codice)*

Punti emersi prima del provisioning di Render/Cloudflare.

- [x] Default di lega precompilati: rosa `3/8/8/6`, `n_squadre = 8`, `budget = 1000`
- [x] Form strutturato per punti (bonus/malus + fasce gol) e modificatori, con
      set standard Fantagazzetta precaricato (niente più textarea JSON grezze)
- [x] Auto-creazione manager alla creazione lega: `Io` + `n−1` nomi generati
- [x] Import quotazioni anche in **xlsx** (oltre al CSV), header tollerante
- [x] Import **griglia portieri** (CSV/xlsx) come riferimento globale, mostrata
      in consultazione nell'asta
- [x] `render.yaml` (Blueprint del backend) alla root

## Fase 4 — Assistenza all'asta e dati Serie A  *(completa)*

Funzionalità che aiutano la decisione durante l'asta e portano dati Serie A nel
portale. Prompt operativi 19–22 in `PROMPTS.md` (storico).

- [x] **Giocatori desiderati (wishlist)** per-lega: aggiungi/rimuovi obiettivi,
      evidenziati in asta
- [x] **Confronto in asta**: al nome uscito, ranking dei disponibili dello stesso
      ruolo dalle valutazioni in-app; arricchimento opzionale da API stats
      esterna (API-Football free) via backend, con cache e rate-limit
- [x] **Probabili formazioni** delle 20 squadre: ingest via upload screenshot con
      estrazione (Claude vision) e revisione manuale; visualizzazione a tab
- [x] **Rigoristi e tiratori di punizioni** delle 20 squadre (nella vista
      formazioni): stessa pipeline di ingest

## Correzioni — Griglia portieri  *(completa)*

- [x] **Griglia portieri rimodellata come matrice di accoppiamenti.** La gerarchia
      titolare→riserve è stata **sostituita** da `gk_pairing (team_a, team_b,
      score)`, matrice simmetrica squadra×squadra con punteggio di favorevolezza
      della coppia (più basso = calendari-casa più complementari; coppie
      stesso-stadio = 0). Import a sostituzione, vista "Coppie portieri" con
      display invertibile (alto = più favorevole).

## Fase 3 — v2  *(valutazioni LLM: completa; opzionali: backlog)*

- [x] LLM in-app via API Anthropic: genera/aggiorna valutazioni (path text-only in
      `claudeExtraction`, chunk per ruolo per i limiti token)
- [ ] Ricerca news qualitative a supporto delle valutazioni *(opzionale — dipende
      da fonte news esterna, fragile)*
- [ ] Foto giocatori reali (backfill `image_url`) *(opzionale — vincolo diritti
      immagine, non tecnico)*

## Fase UI — Redesign Broadsheet  *(completa)*

- [x] Ristrutturazione del portale nel design system Broadsheet (token in
      `web/src/index.css`, shell lega-centrica, modalità asta a schermo pieno).
      Invariante intatta: stato asta derivato dal log `purchase`. `v2.2.0`.

## Fase 5 — Dati storici + Engine  *(completa)*

Eseguita end-to-end (commit `82100fd` → `9e7c747`, fino a `v2.12.1`).

- [x] **Ingest dati a DB**: un solo importer, storico via **seed locale** e corrente
      via **upload portale**; quotazioni (`quotation`), statistiche
      (`player_season_stats`, join `fanta_id`) e PDF calci piazzati nel
      `set_piece_taker` esistente. Repo pubblico: dati grezzi fuori da git.
- [x] **Engine di consiglio giocatori**: valore relativo alla lega (replacement
      level, affidabilità=presenze, bonus per ruolo, regole lega, scarsità).
- [x] **Import JSON valutazioni**: schema + template scaricabile + errori per riga.
- [x] **Asta — lista "da chiamare"** ordinabile per `FVM` / `Qt.A` / `Qt.I`.
- [x] **Asta — colonne extra**: media fantavoto, quotazione attuale, FVM (proxy
      prezzo), sul giocatore in asta e sulle alternative.
- [x] **Asta — alternative**: ≥10 disponibili stesso ruolo, ordinabili per più
      valori, con bottone "Dettagli" per le info estese.
- [x] **Provider SoFIFA** (attributi EA FC) come secondo provider stats opzionale,
      affiancato ad API-Football (rendimento reale). NB: `api.sofifa.net` è
      whitelist-only → provider OFF di default, degrada senza dati (`v2.12.1`).

## Fase 6 — Rifiniture v3.0  *(completa)*

Correzioni UX emerse dall'uso reale + import/export rose. Chiusa a `v3.3.0`
(commit `ea47843` → `d9670c7`). I prompt operativi (ex `PROMPTS.md`) sono tutti
eseguiti; la traccia vive nel `CHANGELOG.md`.

- [x] **Fix — identità stabile del proprietario**: `is_owner` disaccoppiato dal
      nome editabile (`v2.13.0`, commit `ea47843`).
- [x] **Fix — asta: escludere il giocatore in asta dalle alternative libere**
      (commit `95117af`).
- [x] **Fix — layout sidebar desktop** sticky, bottone "entra in asta" sempre
      raggiungibile (commit `6921efd`).
- [x] **Feat — responsive mobile**: sidebar → nav sticky in fondo, home usabile
      (commit `bbb6582`).
- [x] **Feat — warning modificatori** portiere/difesa attivi (commit `95117af`,
      `ModifierWarning.tsx`).
- [x] **Feat — export/import rose d'asta** in formato leghe Fantacalcio
      (commit `aaf06c1`).
- [x] **Feat — riscalatura valutazioni al budget di lega** (commit `fc82bd3`).
- [x] **Feat — valutazioni di default per leghe da 8/10 squadre** (commit
      `d9670c7`).
- [x] **Feat — suggerimento coppia portieri favorevole dopo un acquisto**
      (commit `a4bcd76`).

## Fase 7 — Multiutente v4  *(completa — `v4.0.0` → `v4.5.0`)*

Passaggio da app monoutente a app condivisa dai 4 partecipanti, con consigli
personalizzabili per utente. Decisioni e tradeoff in
[docs/design-fase7.md](./docs/design-fase7.md); prompt operativi P1–P9 in
[PROMPTS.md](./PROMPTS.md). **Vincolo invariante rispettato**: lo stato dell'asta
resta derivato dal log `purchase`; le personalizzazioni sono un layer di override
(`coalesce`) o di flag, non mutano il valore di base.

- [x] **P1 — modificatore portiere + difesa team-aware nell'engine**
- [x] **P2 — reliability da titolarità (probable_lineup) + baseline mv**
- [x] **P3 — tag giocatore derivati** (Rigorista, Titolare da 6, Porta bonus,
      Difensore da bonus, Scommessa, Da prendere a 1) — modulo puro, badge in
      consigli e asta
- [x] **P4 — login 4 utenti** (Andre/Davide/Fra/Paul), sessione cookie firmato,
      `manager.user_id` con priorità su `is_owner`
- [x] **P5 — avatar + colore avatar** per utente
- [x] **P6 — override valutazioni** (`user_valuation_override`, sparsa,
      `coalesce`) + **preferenze di squadra** (`user_team_pref`, flag +
      ordinamento secondario, nessuna mutazione score)
- [x] **P7 — chat 1-a-1** append-only, polling, pannello flottante
- [x] **P8 — logo + link SoFIFA** in landing e asta
- [x] **P9 — bugfix UI + score 0–10 per ruolo**: modale profilo con scroll
      interno, warning squadra da evitare in asta, tooltip sigle + scomposizione
      formule, tag «Difensore da bonus» ristretto ai difensori, score normalizzato
      0–10 per ruolo (sola presentazione)

### Audit P1–P9 (verificato sul codice, 2026-08-29)

Tutti implementati, con test per i moduli puri. Nessun elemento parziale/mancante.

| P | Evidenza principale |
|---|---|
| P1 | `shared/src/recommendationEngine.ts` — `portiereBonus`, `blendDifesaMv`, `difesaBonus`, `pBonus`; `recommendationEngine.test.ts` |
| P2 | `recommendationEngine.ts` — `MV_BASELINE`, `LINEUP_STATO_RELIABILITY`, `reliability`/`rawValue` |
| P3 | `shared/src/playerTags.ts` + `playerTags.test.ts`; `server/src/db/recommendations.ts` (`computePlayerTags`); badge in `RecommendationsPage.tsx` / `auction/*` |
| P4 | migrazioni `1787811995007_app-user.sql`, `1787811996024_manager-user-id.sql`; `server/src/routes/auth.ts`, `server/src/auth/*`, `http/requireAuth.ts`, `db/seedUsers.ts`; `web/src/pages/LoginPage.tsx`, gate `App.tsx` |
| P5 | campi `avatar`/`avatar_color` su `app_user`; `shared/src/avatar.ts`; `web/src/components/UserAvatar.tsx`, `shell/ProfileModal.tsx`, `shell/UserMenu.tsx` |
| P6 | migrazione `1787961600000_user-personalization.sql`; `server/src/db/{valuationOverrides,teamPrefs}.ts`, `routes/{valuations,teamPrefs}.ts`; `shared/src/teamPreferences.ts` + `teamPreferences.test.ts`; `web/src/components/{TeamPrefPanel,ValuationOverrideRow}.tsx` |
| P7 | migrazione `1788048000000_chat-message.sql`; `server/src/routes/chat.ts`, `db/chat.ts`; `web/src/components/shell/ChatPanel.tsx`, `web/src/api/chat.ts` |
| P8 | `web/public/sofifa-logo*.png`; `web/src/pages/LoginPage.tsx`; `web/src/pages/auction/AuctionDesktop.tsx` |
| P9 | `web/src/components/ui/{Dialog,InfoLabel,TeamPrefBadge}.tsx`, `ScoreBreakdownDialog.tsx`, `lib/columnGlossary.ts`; `recommendationEngine.ts` `breakdown` + `normalizeScoresByRole` + test; `maxBid.ts` `explainAdjustedMaxBid`; `playerTags.ts` ristretto a `"D"` + test |

Aggravante nota (candidata a prompt successivo): dopo `POST /auth/login` il
client non riverifica `/auth/me` (`web/src/App.tsx`), quindi quando il cookie di
sessione non persiste si resta «loggati ma tutto 401» invece di tornare al login.

## Fase mobile (P10)  *(in corso — `v4.6.0`)*

- [x] **B6 — sessione su mobile**: le chiamate API passano da `/api` same-origin
      (proxy Vite in dev, Cloudflare Pages Function `functions/api/[[path]].js`
      alla root del repo in prod, env `API_ORIGIN`), cookie di sessione
      first-party con `SameSite=Lax`. Causa: cookie cross-site `SameSite=None`
      scartato dai browser mobile come cookie di terze parti (SPA su Pages, API
      su Render = domini diversi).
- [x] **B7 — chat fullscreen su mobile**: sotto 768px overlay a tutto schermo,
      niente drag/resize.
- [x] **B8 — notifica messaggio in arrivo**: endpoint `GET /chat/inbox?since=`,
      poll globale ogni 10s, toast cliccabile + badge non-letti sul FAB (stato
      derivato a lettura lato client).

## Traguardi di rilascio (storico)

- `v1.0.0` — Fase 2 completa + servizi in produzione (Neon + Render + Cloudflare
  Pages).
- `v2.2.0` — redesign UI (design system Broadsheet).
- `v3.3.0` — Fase 6 (rifiniture v3.0).
- `v4.0.0` — Fase 7: modello multiutente (login, identità per-utente,
  personalizzazione consigli) + migrazioni schema associate.
- `v4.5.0` — Fase 7 chiusa (bugfix UI + score 0–10 per ruolo).
