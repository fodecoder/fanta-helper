# PROMPTS.md — Prompt per le prossime operazioni

Backlog operativo. Le operazioni 1–12 (scaffolding → schema DB → deploy pipeline
→ CRUD lega → import giocatori CSV → CRUD manager → import valutazioni JSON →
asta live → selettore lega → max bid rettificato → rifinitura UI → miniature
giocatori) sono completate fino a `v1.0.0`; i relativi prompt sono stati rimossi.

Le correzioni pre-release 13–18 (Fase 2.1) sono state eseguite e portano a
`v1.4.0`; sono elencate sotto come storico. L'**hosting è in produzione** (Neon +
Render + Cloudflare Pages). Il backlog attivo è la **Fase 4** (assistenza
all'asta e dati Serie A): prompt 19–22 in coda.

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

- **Provisioning (manuale)** — eseguito: Neon → Render → Cloudflare Pages, CORS
  chiuso, push su `main`. App in produzione.

---

## Fase 4 — Assistenza all'asta e dati Serie A

Quattro operazioni in ordine di dipendenza. Le prime due non richiedono fonti
esterne obbligatorie; le ultime due portano dati Serie A editoriali (probabili
formazioni, rigoristi) per i quali **non esiste un'API gratuita affidabile**: la
via principale è l'upload di screenshot con estrazione, con eventuale
integrazione esterna come complemento.

### 19 — Giocatori desiderati (wishlist per-lega)

**Contesto.** Serve marcare gli obiettivi d'asta per non perderli di vista. È una
lista di supporto, non stato dell'asta: non tocca residuo/slot/max bid.

**Task.**

- Tabella `wishlist (league_id FK, player_id FK, priority int null, note text
  null)`, univoca `(league_id, player_id)`, `ON DELETE CASCADE` su `league`.
  Migrazione + data-access tipato + route CRUD sotto `/leagues/:leagueId/wishlist`.
- UI: aggiungi/rimuovi un giocatore alla wishlist (dalla ricerca giocatori) e
  riordina per `priority`. In **Asta** evidenzia i giocatori in wishlist ancora
  disponibili (non ancora nel log `purchase`).

**Vincoli.** Nessun campo mutabile di stato d'asta; la wishlist è ortogonale al
log acquisti. Nessun segreto nel client.

**Done.** Wishlist per-lega gestibile e visibile in asta. Commit `feat:` + bump
MINOR + `CHANGELOG` + tag.

### 20 — Confronto in asta (stesso ruolo)

**Contesto.** Quando un giocatore esce all'asta, serve capire in fretta come si
colloca rispetto ai disponibili dello **stesso ruolo**. Il valore è RELATIVO alla
lega: la base del confronto sono le **valutazioni già in-app**.

**Task.**

- Dato il giocatore selezionato, calcola e mostra il ranking dei giocatori dello
  stesso ruolo **ancora disponibili** (esclusi quelli nel log `purchase` della
  lega), ordinati per valutazione (`fair_value`/`target`/`tier`) con indicazione
  di `max_bid` e dei bisogni di reparto/residuo del manager `Io`.
- Il confronto **base è puramente derivato** (valutazioni + log + roster): nessuna
  dipendenza esterna, deterministico, coerente con l'invariante.
- **Arricchimento opzionale** (dietro feature-flag): minuti/gol/assist da un'API
  stats gratuita (es. API-Football, free ~100 req/giorno). Regole: chiave **solo
  lato backend**, chiamate proxied dal server, risposte in **cache** (per
  stagione/giornata) e con **rate-limit**; se l'API manca o è esaurita, il
  confronto base non degrada. Mappatura nome→giocatore esplicita, niente dati
  inventati: gli unmatched restano vuoti, non stimati.

**Vincoli.** Nessun segreto nel client (invariante). L'API è un extra, non un
prerequisito. Nessuna scrittura di stato d'asta.

**Done.** In asta, selezionando un giocatore, compare il confronto per ruolo dai
dati in-app; l'arricchimento esterno è attivabile e isolato nel backend. Commit
`feat:` + bump MINOR + `CHANGELOG` + tag.

### 21 — Probabili formazioni Serie A (20 squadre)

**Contesto.** Riferimento **globale** (non per-lega), come la griglia portieri.
Non esiste un'API gratuita affidabile per le probabili: la fonte è editoriale
(Gazzetta/SosFanta/FantaCalcioPedia). Ingest primario via **upload screenshot**.

**Task.**

- Tabella globale `probable_lineup (team, player_name, ruolo null, stato)` con
  `stato ∈ {titolare, panchina, ballottaggio}`; import **a sostituzione**
  (snapshot in transazione), come `goalkeeper_grid`.
- Ingest via **upload di screenshot**: il backend estrae i dati (OCR/LLM →
  struttura tipizzata) e/o conserva l'immagine per squadra; passaggio di
  revisione manuale per le righe non riconosciute (niente dati inventati).
- **Complemento opzionale**: integrazione esterna (fonte editoriale) isolata nel
  backend, da trattare come fragile (parsing difensivo, nessun segreto nel
  client, disattivabile).
- UI: **tab Probabili formazioni** con le 20 squadre (modulo + undici probabile).

**Vincoli.** Rispetta i ToS delle fonti; lo scraping è complemento, non
requisito. Estrazione lato backend, mai chiavi/scraper nel client. Import
idempotente a sostituzione.

**Done.** Tab formazioni popolabile da screenshot (ed eventualmente da fonte
esterna), con revisione degli unmatched. Commit `feat:` + bump MINOR +
`CHANGELOG` + tag.

### 22 — Rigoristi e tiratori di punizioni (nella vista formazioni)

**Contesto.** Gerarchie dei calci piazzati per squadra, dato editoriale come le
formazioni. Vive nella stessa vista della 21.

**Task.**

- Tabella globale `set_piece_taker (team, tipo, player_name, rank)` con
  `tipo ∈ {rigore, punizione, corner}` e `rank` = gerarchia (1 = primo tiratore);
  import a sostituzione. Stessa pipeline di ingest della 21 (screenshot +
  eventuale esterno).
- UI: nella **tab Probabili formazioni**, per ogni squadra mostra rigoristi e
  tiratori di punizioni in gerarchia.

**Vincoli.** Come la 21: fonti nel backend, nessun dato inventato, import
idempotente.

**Done.** Rigoristi/tiratori visibili per squadra nella vista formazioni. Commit
`feat:` + bump MINOR + `CHANGELOG` + tag.
