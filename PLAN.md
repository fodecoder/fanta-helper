# PLAN.md — Sequenza di feature

Fasi ordinate. Le fasi 1–2 sono l'obiettivo entro deadline; la fase 3 è successiva.

## Fase 0 — Scaffolding

- [ ] Inizializzazione repo e struttura progetto (frontend SPA + backend sottile)
- [ ] Schema DB su PostgreSQL (Neon): tabelle base e migrazioni
- [ ] Pipeline di deploy: frontend su Cloudflare Pages, backend su Render, DB su Neon
- [ ] Configurazione ambienti e variabili (segreti solo lato backend)

## Fase 1 — MVP  *(obiettivo entro deadline)*

- [ ] CRUD lega con configurazione regole in JSONB (roster, scoring, modificatori)
- [ ] Import giocatori da CSV quotazioni ufficiali nel pool `player`
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
