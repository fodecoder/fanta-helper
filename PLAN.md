# PLAN.md — Sequenza di feature

Fasi ordinate. Le fasi 1–2 sono l'obiettivo entro deadline; la fase 3 è successiva.

> Stato al 2026-08-15 — `v0.4.0`. Fase 0 completa; Fase 1 al 40% (CRUD lega e
> import giocatori fatti). Prossima operazione: CRUD manager per lega
> (prerequisito dell'asta). Codice pronto per l'hosting; manca solo il
> provisioning dei servizi — vedi [README.md](./README.md) e la nota in coda.

## Fase 0 — Scaffolding  *(completa)*

- [x] Inizializzazione repo e struttura progetto (frontend SPA + backend sottile)
- [x] Schema DB su PostgreSQL (Neon): tabelle base e migrazioni
- [x] Pipeline di deploy: frontend su Cloudflare Pages, backend su Render, DB su Neon *(codice/config pronti; provisioning manuale da eseguire)*
- [x] Configurazione ambienti e variabili (segreti solo lato backend)

## Fase 1 — MVP  *(obiettivo entro deadline)*

- [x] CRUD lega con configurazione regole in JSONB (roster, scoring, modificatori)
- [x] Import giocatori da CSV quotazioni ufficiali nel pool `player`
- [ ] CRUD manager per lega (prerequisito dell'asta: gli acquisti referenziano un manager)
- [ ] Import valutazioni (JSON) con matching nome→ID e revisione manuale degli unmatched
- [ ] Schermata asta live: event-log degli acquisti + stato derivato (residuo, slot)
- [ ] Selettore lega in home

## Fase 2 — Rifinitura  *(obiettivo entro deadline)*

- [ ] Max bid rettificato deterministico (opportunity cost: residuo/bisogni con floor per reparto)
- [ ] Rifinitura UI
- [ ] Miniature giocatori: stemma squadra + placeholder per ruolo

## Fase 3 — v2  *(successiva)*

- [ ] LLM in-app via API Anthropic: genera/aggiorna valutazioni
- [ ] Ricerca news qualitative a supporto delle valutazioni
- [ ] Foto giocatori reali (backfill `image_url`)
