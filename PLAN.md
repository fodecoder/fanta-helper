# PLAN.md — Sequenza di feature

Fasi ordinate. Le fasi 1–2 sono l'obiettivo entro deadline; la fase 3 è successiva.

> Stato al 2026-08-17 — `v1.0.0`. Fase 0 completa. **Fase 1 completa** (MVP
> funzionale: CRUD lega/manager, import giocatori CSV, import valutazioni JSON,
> asta live, selettore lega). **Fase 2 completa** (codice): max bid rettificato,
> rifinitura UI, miniature giocatori. Codice pronto per l'hosting (build/lint
> verdi); manca il provisioning di Render e Cloudflare Pages — vedi
> [README.md](./README.md) e la nota in coda. `v1.0.0` è taggato lato codice;
> il rilascio si considera pienamente chiuso solo a provisioning e push
> completati.

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

## Fase 3 — v2  *(successiva)*

- [ ] LLM in-app via API Anthropic: genera/aggiorna valutazioni
- [ ] Ricerca news qualitative a supporto delle valutazioni
- [ ] Foto giocatori reali (backfill `image_url`)

## Traguardo v1.0.0

Rilascio 1.0.0 = Fase 2 completa + servizi in produzione.

**Codice** (operazioni 11–12 in PROMPTS.md) — **completo**

- [x] Rifinitura UI
- [x] Miniature giocatori

**Provisioning** (manuale, nessun codice — dettaglio in README.md) — **in corso**

- [x] Neon: progetto e database creati
- [x] Secret GitHub per le migrazioni impostato *(verifica che il nome sia
      esattamente `NEON_DIRECT_DATABASE_URL` e che sia la connessione **diretta**,
      non pooled: il workflow usa `pg_advisory_lock`, incompatibile con PgBouncer)*
- [ ] Render: web service (build dalla root del repo)
- [ ] Cloudflare Pages: progetto (build dalla root, output `web/dist`)
- [ ] `CORS_ORIGIN` su Render = URL di Pages, con redeploy (chiusura del cerchio)
- [ ] Push umano su `main` per far girare workflow (lint/build/migrazioni) e i redeploy

Codice taggato `v1.0.0`; il rilascio si considera pienamente chiuso solo a
provisioning e push completati (operazione manuale e umana, vedi CLAUDE.md).
