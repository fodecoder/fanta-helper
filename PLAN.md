# PLAN.md — Sequenza di feature

Fasi ordinate. Le fasi 1–2 sono l'obiettivo entro deadline; la fase 3 è successiva.

> Stato al 2026-08-26 — `v3.3.0`. Fasi 0–6 complete. Completate anche la
> **correzione griglia portieri** (matrice coppie `gk_pairing`), le **valutazioni
> generate via LLM in-app** e il **redesign UI** (design system Broadsheet).
> **Hosting in produzione**: Neon + Render + Cloudflare Pages attivi, app
> funzionante end-to-end. La **Fase 5 — Dati storici + Engine** è chiusa (ingest
> storico + corrente, engine di consiglio, UX asta, provider SoFIFA opzionale).
> La **Fase 6 — Rifiniture v3.0** è chiusa (correzioni UX dall'uso reale,
> import/export rose, valutazioni di default per leghe da 8/10 squadre,
> riscalatura al budget di lega, suggerimento coppia portieri in asta).
> Il vecchio `PROMPTS.md` (Fasi ≤6) è stato eseguito per intero: la sua traccia
> vive nel `CHANGELOG.md` e nella git history. `PROMPTS.md` è ora ripopolato con i
> prompt operativi della **Fase 7 — Multiutente v4.0** (login, avatar, chat,
> preferenze per-utente, tag giocatore, audit engine), il lavoro attivo.

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

## Fase 7 — Multiutente v4.0  *(backlog attivo — in progettazione)*

Passaggio da app monoutente a app condivisa dai 4 partecipanti della lega, con
consigli personalizzabili per utente. Le decisioni architetturali e i tradeoff
sono in [docs/design-fase7.md](./docs/design-fase7.md); da approvare prima di
implementare. **Vincolo invariante**: lo stato dell'asta resta derivato dal log
`purchase`; le personalizzazioni sono un layer di override, non mutano il valore
di base.

- [ ] **Feat — audit engine**: verifica dell'algoritmo di valutazione
      (replacement level, scarsità, modificatore difesa via proxy `mv`,
      reliability). Correzioni prioritarie prima di costruirci sopra i tag.
- [ ] **Feat — tag giocatore derivati** (Scommessa, Da prendere a 1, Titolare da
      6, Porta bonus, Rigorista, Difensore da bonus, …), calcolati puri dal log +
      dati, subito visibili in consigli e asta.
- [ ] **Feat — login** dei 4 utenti (Andre, Davide, Fra, Paul), sessione separata
      per utente. NB: rompe l'assunzione storica "nessun login" — motivata dal
      passaggio a multiutente.
- [ ] **Feat — avatar e colore avatar** per utente.
- [ ] **Feat — chat 1-a-1** ancorabile e ridimensionabile, minimale.
- [ ] **Feat — preferenze per-utente**: override di valutazioni/consigli che
      lasciano invariato il valore di base per gli altri.
- [ ] **Feat — preferenze di squadra** (squadre preferite / da evitare): i
      consigli si adattano coerentemente.
- [ ] **Feat — modificatori portiere/difesa nell'engine**: i consigli si
      aggiornano tenendone conto (oggi solo `difesa` via proxy, `portiere` no).
- [ ] **Feat — SoFIFA in landing/asta**: logo (normale in landing, piccolo in
      asta) + link a `https://sofifa.com/`, prerequisito per l'accesso alle loro API.

## Traguardo v4.0.0

Rilascio `4.0.0` = Fase 7 completa. Il salto di MAJOR è motivato
dall'introduzione del modello multiutente (login, identità per-utente,
personalizzazione dei consigli) e dalle migrazioni schema associate.

## Traguardo v1.0.0

Rilascio 1.0.0 = Fase 2 completa + servizi in produzione.

**Codice** (operazioni 11–12 in PROMPTS.md) — **completo**

- [x] Rifinitura UI
- [x] Miniature giocatori

**Provisioning** (manuale, nessun codice — dettaglio in README.md) — **completo**

- [x] Neon: progetto e database creati
- [x] Secret GitHub per le migrazioni impostato (`NEON_DIRECT_DATABASE_URL`,
      connessione **diretta** non pooled)
- [x] Render: web service (build dalla root del repo, Blueprint [`render.yaml`](./render.yaml))
- [x] Cloudflare Pages: progetto (build dalla root, output `web/dist`)
- [x] `CORS_ORIGIN` su Render = URL di Pages, con redeploy (chiusura del cerchio)
- [x] Push umano su `main`: workflow (lint/build/migrazioni) e redeploy eseguiti

Rilascio in produzione: app funzionante end-to-end (attuale `v2.2.0`). Fasi 0–4,
griglia portieri, valutazioni LLM e redesign UI complete; il prossimo lavoro è la
**Fase 5 — Dati storici + Engine**.
