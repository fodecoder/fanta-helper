# PROMPTS.md — Prompt per le prossime operazioni

Backlog operativo. Le operazioni 1–12 (scaffolding → schema DB → deploy pipeline
→ CRUD lega → import giocatori CSV → CRUD manager → import valutazioni JSON →
asta live → selettore lega → max bid rettificato → rifinitura UI → miniature
giocatori) sono completate fino a `v1.0.0`; i relativi prompt sono stati rimossi.

Le correzioni pre-release 13–18 (Fase 2.1) e la **Fase 4** (prompt 19–22:
wishlist, confronto in asta, probabili formazioni, rigoristi) sono state eseguite
e portano a `v1.8.0`; sono elencate sotto come storico. L'**hosting è in
produzione** (Neon + Render + Cloudflare Pages). Il backlog attivo è la
**correzione della griglia portieri** (prompt 23) e la **Fase 3 — v2** (prompt
24: valutazioni generate via LLM in-app).

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

## Storico — Fase 4 (eseguite)

Le quattro operazioni sotto sono state completate (`v1.5.0`→`v1.8.0`): wishlist
per-lega (19), confronto in asta stesso-ruolo con arricchimento stats opzionale
(20), probabili formazioni via screenshot con estrazione Claude vision (21),
rigoristi e tiratori (22). Restano come riferimento.

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

---

## Backlog attivo

### 23 — Griglia portieri come matrice di accoppiamenti

**Contesto.** Il modello attuale (`goalkeeper_grid`: gerarchia titolare→riserve
per squadra) non rappresenta la sorgente reale. La "griglia portieri" è una
**matrice simmetrica squadra×squadra** con un punteggio di favorevolezza della
*coppia* di portieri: più basso = i due portieri giocano meno spesso in casa
nella stessa giornata (calendari-casa più complementari). Le coppie che
condividono lo stadio (Roma-Lazio, Inter-Milan, Juve-Torino) valgono `0` e sono
l'accoppiamento ideale. La gerarchia va **sostituita** da questo modello.

**Task.**

- Nuova tabella globale `gk_pairing (team_a text, team_b text, score int)`,
  simmetrica (una riga per coppia non ordinata o entrambe le direzioni),
  import **a sostituzione** (snapshot in transazione) come `goalkeeper_grid`.
- Import da xlsx/CSV in **formato matrice**: prima riga/colonna = sigle squadre,
  celle = punteggio; diagonale vuota; ignora le righe di legenda finali. Righe
  non riconosciute in report di scarto, mai inventate.
- Rimuovi il modello e la UI della gerarchia titolare→riserve (sostituzione, non
  affiancamento — decisione confermata).
- UI "Coppie portieri": scelta una squadra, mostra i migliori compagni di coppia
  ordinati per favorevolezza. **Display invertibile** (`display = max − score`)
  così alto = più favorevole; il fattore campo è già nella metrica, non
  aggiungerlo due volte.

**Vincoli.** Dato di riferimento globale, non stato d'asta: nessun impatto su
residuo/slot/max bid. Import idempotente a sostituzione. Nessun segreto nel client.

**Done.** Matrice coppie importabile e consultabile, gerarchia rimossa. Commit
`feat:` (breaking sul modello → valuta bump) + `CHANGELOG` + tag.

### 24 — Valutazioni generate via LLM in-app (Fase 3)

**Contesto.** Generare/aggiornare le `valuation` per-lega con Claude, invece
dell'import JSON manuale. Lo schema stretto delle valutazioni esiste già in
`SPEC.md` e la validazione+matching nome→ID in `server/src/import/valuationJson.ts`.

**Task.**

- Riusa `server/src/claudeExtraction` aggiungendo un path **text-only** (nessuna
  immagine): input = pool giocatori + regole della lega (`scoring`,
  `modificatori`, `roster_config`); output = il JSON valutazioni già specificato.
- **Chunk per ruolo** (P/D/C/A): `max_tokens` attuale (4096) non basta per l'intero
  listone in un colpo. Ogni chunk validato e riconciliato prima del salvataggio.
- Endpoint backend `POST /leagues/:leagueId/valuations/generate` (chiave solo
  server-side). UI: trigger dalla schermata Valutazioni, con anteprima
  modificabile prima di persistere; gli unmatched restano per revisione, non
  stimati.
- Il `confidence` per riga arriva dal modello: la qualità non è verificabile a
  priori, il campo esiste apposta.

**Vincoli.** Chiave Anthropic **solo lato backend** (invariante). Le valutazioni
non entrano nel loop dell'asta live: si generano una volta / su refresh. Nessun
dato inventato nel matching.

**Done.** Valutazioni generabili da Claude per lega, con anteprima e revisione.
Commit `feat:` + bump MINOR + `CHANGELOG` + tag.

> **Fase 3 — opzionali** (dipendenze esterne/legali, da valutare a parte):
> ricerca news qualitative a supporto delle valutazioni; backfill foto reali
> in `player.image_url`.
