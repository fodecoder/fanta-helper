# PROMPTS.md — Prompt per le prossime operazioni

Backlog operativo. Le operazioni 1–12 (scaffolding → schema DB → deploy pipeline
→ CRUD lega → import giocatori CSV → CRUD manager → import valutazioni JSON →
asta live → selettore lega → max bid rettificato → rifinitura UI → miniature
giocatori) sono completate fino a `v1.0.0`; i relativi prompt sono stati rimossi.

Le correzioni pre-release 13–18 (Fase 2.1) sono state eseguite e portano a
`v1.4.0`; sono elencate sotto come storico. **Il backlog di codice è vuoto**:
resta solo il provisioning manuale dei servizi (vedi [README.md](./README.md) e
[PLAN.md](./PLAN.md)), che è un'operazione umana.

Regole trasversali valide per tutte le operazioni:

- Rispetta `CLAUDE.md`: commit locale a fine feature, MAI push, Conventional
  Commits in inglese, SemVer + `CHANGELOG.md` + tag locale, build e lint verdi
  prima del commit, nessun riferimento ad AI/assistenti/proprietario.
- Rispetta l'invariante di dominio: lo stato dell'asta è derivato dal log
  `purchase`. Nessun campo mutabile di stato.
- Nessun segreto nel client; le chiamate esterne passano dal backend.
- Prima di modifiche ampie, proponi il piano; non riscrivere in massa.

---

## Storico — Fase 2.1 (eseguite)

- **13 — Default di lega.** Rosa `3/8/8/6`, `n_squadre = 8`, `budget = 1000`
  precompilati nel form nuova lega. `v1.1.0`.
- **14 — Form punti/modificatori.** Sostituite le textarea JSON grezze con un
  form strutturato; default standard Fantagazzetta (bonus/malus, fasce gol,
  modificatore difesa e toggle). `v1.1.0`.
- **15 — Manager automatici.** Alla creazione lega: `Io` + `n−1` manager con
  nomi generati divertenti. `v1.2.0`.
- **16 — Import xlsx.** L'import quotazioni accetta CSV o xlsx con header
  tollerante (riga-titolo iniziale gestita). `v1.3.0`.
- **17 — Griglia portieri.** Import CSV/xlsx di un riferimento globale
  titolare→riserve, consultabile in asta. `v1.4.0`.
- **18 — render.yaml.** Blueprint del backend Render alla root. Incluso in
  `v1.4.0` (chore).

## Prossimo (manuale, nessun codice)

- Provisioning Neon → Render → Cloudflare Pages e chiusura CORS, poi push umano
  su `main`. Dettaglio operativo in `README.md`.
