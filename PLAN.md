# PLAN.md — Sequenza di feature

Fasi ordinate. Le fasi 1–2 sono l'obiettivo entro deadline; la fase 3 è successiva.

> Stato al 2026-08-18 — `v1.8.0`. Fasi 0–2.1 complete. **Fase 4 completa**:
> wishlist per-lega, confronto in asta stesso-ruolo, probabili formazioni con
> estrazione da screenshot (Claude vision, chiave solo server-side), rigoristi e
> tiratori di punizioni. **Hosting in produzione**: Neon + Render + Cloudflare
> Pages attivi, app funzionante end-to-end. Prossimo lavoro in
> [Fase 3](#fase-3--v2) (v2: valutazioni generate via LLM in-app) — prompt in
> [PROMPTS.md](./PROMPTS.md).

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

## Correzioni — Griglia portieri  *(pianificata)*

- [ ] **Rimodella la griglia portieri come matrice di accoppiamenti.** Il modello
      attuale (`goalkeeper_grid`: gerarchia titolare→riserve per squadra) non
      rappresenta la sorgente reale, che è una **matrice simmetrica squadra×squadra**
      con un punteggio di favorevolezza della *coppia* (più basso = calendari-casa
      più complementari; le coppie stesso-stadio valgono 0). La gerarchia viene
      **sostituita** da `gk_pairing (team_a, team_b, score)`, import a sostituzione,
      con vista "Coppie portieri" (display invertibile: alto = più favorevole).

## Fase 3 — v2  *(backlog attivo)*

- [ ] LLM in-app via API Anthropic: genera/aggiorna valutazioni (riusa il modulo
      `claudeExtraction` con un path text-only; chunk per ruolo per i limiti token)
- [ ] Ricerca news qualitative a supporto delle valutazioni *(opzionale — dipende
      da fonte news esterna, fragile)*
- [ ] Foto giocatori reali (backfill `image_url`) *(opzionale — vincolo diritti
      immagine, non tecnico)*

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

Rilascio in produzione: app funzionante end-to-end (attuale `v1.8.0`). La Fase 4
è completa; il prossimo lavoro è la correzione della griglia portieri e la Fase 3.
