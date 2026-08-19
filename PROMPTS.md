# PROMPTS.md — Backlog operativo

Storico svuotato: tutte le operazioni fino a `v2.2.0` (scaffolding → MVP →
Fase 2.1 → Fase 4 → matrice coppie portieri → valutazioni LLM in-app → redesign
UI Broadsheet) sono **eseguite**. Il riepilogo dello stato è in [PLAN.md](./PLAN.md);
i dettagli di modello in [SPEC.md](./SPEC.md).

Questo file contiene solo il **backlog attivo** (Fase 5), in ordine di priorità.

## Regole trasversali (valgono per ogni operazione)

- Rispetta `CLAUDE.md`: commit locale a fine feature, **MAI push**, Conventional
  Commits in inglese, SemVer + `CHANGELOG.md` + tag locale, `build` e `lint`
  verdi prima del commit, nessun riferimento ad AI/assistenti/proprietario.
- **Invariante di dominio**: lo stato dell'asta è funzione pura del log
  `purchase`. Nessun campo mutabile di stato (residuo, slot, max bid). I dati
  storici (quotazioni, statistiche, attributi) sono di **riferimento globale**,
  non stato d'asta.
- Nessun segreto nel client; le chiamate esterne passano dal backend, in cache e
  con rate-limit.
- Nessun dato inventato: gli unmatched restano vuoti/segnalati, non stimati.
- Prima di modifiche ampie **proponi il piano**, non riscrivere in massa.

---

## Fase 5 — Dati storici + Engine

### 1 — Ingest quotazioni e statistiche storiche (`docs/`)

**Contesto.** I file `docs/Quotazioni_*.xlsx` e `docs/Statistiche_*.xlsx`
contengono quotazioni e statistiche delle ultime stagioni. Sono la base dati
dell'engine e delle colonne extra in asta. Modello in `SPEC.md`
(`quotation`, `player_season_stats`, chiave di join `player.fanta_id`).

**Task.**

- Migrazione: aggiungi `player.fanta_id` (int, nullable, univoco). Nuove tabelle
  globali `quotation (player_id, season, qt_i, qt_a, fvm)` e
  `player_season_stats (player_id, season, presenze, mv, fm, gf, gs, assist, rp,
  rc, rig_plus, rig_minus, amm, esp, autogol)`, univoche per `(player_id, season)`.
- Parser xlsx (riusa `fileRows.ts`): individua l'header tollerando la riga-titolo.
  Quotazioni → colonne Classic `Qt.A`, `Qt.I`, `FVM` (ignora le varianti `* M`).
  Statistiche → variante **base** canonica (ignora `_Italia`/`_Statistico`);
  `Mv`/`Fm` come decimali. La stagione si ricava dal nome file.
- Join su `fanta_id` (`Id` del file); righe senza `Id` → fallback matching
  `name`+`team`; ambigue/assenti in report di scarto, non inventate.
- Import **a sostituzione per stagione** (snapshot in transazione).
- Data-access tipato + route di import sotto le rotte globali di riferimento.

**Done.** Quotazioni e statistiche multi-stagione a DB, interrogabili per
`player_id`+`season`. Commit `feat:` + bump MINOR + `CHANGELOG` + tag.

### 2 — Engine di consiglio giocatori

**Contesto.** Motore che ordina i disponibili per **valore relativo alla lega**.
Spec in `SPEC.md` → "Engine — consiglio giocatori". Deterministico e derivato.

**Task.**

- Modulo puro (in `shared` dove possibile) che, dati: pool giocatori,
  `quotation`+`player_season_stats`, regole della lega (`scoring`, `modificatori`,
  `roster_config`) e log `purchase` (per residuo/slot/bisogni di `Io`), calcola
  per ogni giocatore disponibile un **punteggio di valore** scomposto in
  componenti (affidabilità = presenze, bonus attesi per ruolo, aggiustamento
  regole lega, scarsità di reparto, divario prezzo via `FVM`/`Qt.A`).
- Valore **sopra il rimpiazzo**: margine rispetto al marginale acquistabile nel
  ruolo con budget/slot residui.
- Output **spiegabile**: componenti visibili, non solo il numero finale.
- Endpoint di lettura + vista "Consigli"; l'engine alimenta anche l'ordinamento
  delle alternative in asta (operazione 6).

**Vincoli.** Nessuna dipendenza esterna obbligatoria: l'engine gira sui dati
in-app. I pesi derivano dalle regole della lega, non hardcoded.

**Done.** Ranking di valore per lega, spiegabile. Commit `feat:` + bump MINOR +
`CHANGELOG` + tag.

### 3 — Import JSON valutazioni: schema visibile e template

**Contesto.** Chi carica il JSON non conosce la struttura attesa (è solo in
`SPEC.md`/`shared/src/valuation.ts`).

**Task.**

- Nella schermata di import valutazioni, mostra lo **schema** (campi, tipi, enum
  `ruolo`/`confidence`) e offri un **template JSON scaricabile** valido.
- Riepilogo errori di validazione riga per riga (già c'è la lista unmatched:
  estendila agli errori di schema). La verità resta lo schema Zod in `shared`.

**Done.** L'utente vede cosa caricare e scarica un esempio. Commit `feat:` + bump
MINOR + `CHANGELOG` + tag.

### 4 — Asta: lista "da chiamare" ordinabile

**Task.**

- Nella modalità asta, la lista a sinistra dei giocatori **ancora da chiamare**
  (non nel log `purchase`) diventa **ordinabile** per `FVM`, `Qt.A` (quotazione
  attuale) o `Qt.I` (quotazione iniziale), da `quotation` stagione corrente.

**Vincoli.** Solo presentazione/derivazione; nessuna scrittura di stato d'asta.

**Done.** Ordinamento selezionabile sulla lista. Commit `feat:` + bump MINOR +
`CHANGELOG` + tag.

### 5 — Asta: colonne extra sul giocatore in asta

**Contesto.** Requisiti in `SPEC.md` → "Vista Asta — dati mostrati".

**Task.**

- Oltre a `Tier`, `Fair value`, `Target`, `Max`, `Panic`, `Δ vs prezzo in asta`,
  mostra per il giocatore in asta: **media fantavoto** (`Fm`) e media voto (`Mv`)
  da `player_season_stats`; **quotazione attuale** (`Qt.A`) e **FVM** da
  `quotation`. Il "prezzo medio pagato" usa `FVM` come **proxy dichiarato** (non
  è una media di aggiudicazioni reali — vedi nota in `SPEC.md`).
- Aggiungi altre info del giocatore battuto (squadra, ruolo, presenze,
  gol/assist, calci piazzati, stato probabili formazioni).

**Done.** Colonne extra visibili in asta. Commit `feat:` + bump MINOR +
`CHANGELOG` + tag.

### 6 — Asta: alternative disponibili (≥10, ordinabili, dettagli)

**Task.**

- Per il ruolo del giocatore in asta, mostra almeno **10** alternative ancora
  disponibili (escluse quelle nel log `purchase`), **ordinabili** per i vari
  valori: fair value, target, max bid, `Fm`, `FVM`, `Qt.A`, punteggio engine.
- Info estese di ogni alternativa dietro un **bottone "Dettagli"**
  (pannello/espansione) per non affollare la vista: stesse info del giocatore in
  asta.

**Done.** Alternative ordinabili con dettagli a richiesta. Commit `feat:` + bump
MINOR + `CHANGELOG` + tag.

### 7 — Provider stats SoFIFA (attributi EA FC)

**Contesto.** SoFIFA fornisce **attributi di gioco** (overall, potential, età,
valore FIFA), non rendimento reale. **Non** sostituisce API-Football (minuti/gol/
assist reali): è un asse di dato diverso. Vedi nota in `SPEC.md`. Attribuzione ai
creatori richiesta.

**Task.**

- Astrai il provider stats dietro un'unica interfaccia backend; mantieni
  API-Football (rendimento reale, stagione viva) e aggiungi **SoFIFA** come
  secondo provider (attributi/potential), separato, opzionale e disattivabile via
  flag. Token SoFIFA solo lato backend, chiamate proxied, cache + rate-limit.
- Mostra gli attributi come arricchimento nelle info giocatore/alternative;
  l'assenza del provider non degrada la base. Nessun dato inventato.
- Cita l'attribuzione a SoFIFA dove i dati sono mostrati.

**Nota decisionale.** Se l'obiettivo è ridurre i costi, la leva non è "SoFIFA al
posto di API-Football" ma tenere **entrambi** opzionali e a costo nullo da spenti;
per lo storico l'API esterna è già ridondante (dati in `player_season_stats`).

**Done.** SoFIFA affiancato come provider opzionale, con attribuzione. Commit
`feat:` + bump MINOR + `CHANGELOG` + tag.
