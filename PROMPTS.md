# PROMPTS.md — Fase 11 (restyling Asta, v7.0)

Prompt operativi per Claude Code, **in plan mode**. Le Fasi 7 (P1–P9), la fase
mobile (P10), la Fase 8 (P11–P15), la Fase 9 (P16–P19) e la Fase 10
(P20–P24) sono chiuse: la loro traccia vive nel `CHANGELOG.md` e nella git
history, non più in questo file (elenco dettagliato troppo lungo da tenere a
mano ad ogni fase — un riferimento a un commit verificabile vale più di un
testo copiato).

- **Fase 8 (chiusa)** — P11 palette ruolo, P12 import listone posizionale +
  nome completo + fix duplicati + fallback foto, P13 valutazioni a copertura
  totale + FVM ponderato al budget, P14 vista avversari in asta, P15
  giocatori trappola. Commit: `e79402d`, `30fdd0d`/`f559d13`, `2e40bdf`,
  `2711a58`, `c51e09e`.
- **Fase 9 (chiusa)** — P16 fix parsing CSV virgolette + import a lotti
  anti-timeout, P17 fix ritaglio foto, P18 Fantamedia reale al posto di "Fm
  regolata", P19 max bid da percentuale + budget target per ruolo. Commit:
  `1115865`, `316b115`, `f39957a`, `93c8c4f`, `f35d7a8`/`5655fa2`. Più,
  aggiunto nello stesso periodo ma fuori dai 6 punti originali: generazione
  offline del listino base, colonne ordinabili in Valutazioni, tolleranza
  decimali import, disattivazione svincolati al re-import listone, conferma
  di sovrascrittura override al re-import valutazioni, import probabili
  formazioni/rigoristi/punizioni via JSON al posto di screenshot
  (`v5.4.0`–`v6.0.0`).
- **Fase 10 (chiusa)** — P20 apertura rapida modifica manager da Overview,
  P21 secondo/terzo portiere alla chiamata, P23 "segna come obiettivo" in
  Valutazioni, P22 export PDF valutazioni, P24 nota di scouting evidenziata
  in asta. Commit: `3615943`, `e097cf9`, `95cf77d`, `f11b37d`, `6f143c1`.
  (`v6.1.0`–`v6.5.2`).

Dettagli di ognuna nel [CHANGELOG.md](./CHANGELOG.md); il riassunto verificato
di ogni fase resta in [PLAN.md](./PLAN.md).

Regole valide per tutti (da `CLAUDE.md`): Conventional Commits in inglese,
nessun riferimento ad AI/attribuzioni, commenti solo dove la logica non è
ovvia, **invariante**: lo stato d'asta e ogni valore effettivo sono derivati
(nessun campo di stato mutabile; override = layer sparso, `effettivo = override
?? base`), segreti solo lato backend, build+lint verdi prima di ogni commit.
Ogni prompt = un piano proposto prima di modifiche ampie, poi feature +
commit locale + `CHANGELOG.md` + bump SemVer + tag locale (mai push). Ogni
prompt include **test** (unit sui moduli puri condivisi, integrazione dove
tocca DB/route) a verifica dell'implementazione, non solo del codice che
compila.

**Ordine Fase 11 — nota onesta sulla parallelizzabilità.** A differenza della
Fase 10, qui **non ci sono gruppi di file disgiunti**: tutti e 6 i prompt
toccano `AuctionDesktop.tsx` e/o `AuctionPhone.tsx` (spesso entrambi), e tre
di loro toccano anche `AuctionMode.tsx` per derivare nuovi dati di view. Due
agenti che lavorano in parallelo sullo stesso file finiscono quasi certamente
in conflitto al merge, anche se le regioni di JSX che toccano sono diverse
(entrambi rigenerano l'intero file, gli indici di riga si spostano). La
raccomandazione è **eseguire in sequenza, un prompt alla volta, con commit fra
uno e l'altro** — non per regola di processo ma perché è l'opzione più veloce
al netto dei conflitti da risolvere a mano.

Se si vuole comunque parallelizzare (es. due sessioni umane che rivedono in
parallelo, o due branch da rebasare a mano), l'unico prompt realmente isolato
è **P25** (`call-col`, nessuna modifica a `bid-col`/`io-col`/`AuctionMode.tsx`
oltre a uno stato locale di collasso). Tutto il resto ha una dipendenza reale
o quasi-reale:

- **P26** (verdetto + barra fair value) e **P27** (riquadro alternative
  compatto) toccano entrambi l'header/il corpo di `bid-col` nello stesso
  file — farli in sequenza (ordine indifferente fra loro) evita che il
  secondo prompt lavori su un file che l'altro ha già ristrutturato altrove.
- **P28** (pannello avversari sotto il giocatore) è prerequisito reale di
  **P29** (drag&drop/cancellazione, serve la griglia manager visibile su cui
  agire) e di **P30** (rimozione dialog avversari + bottone "Log acquisti",
  ha senso solo dopo che il pannello sostituisce il dialog). Ordine
  obbligato: **P28 → P29 → P30**.

Ordine consigliato complessivo: **P25 → P26 → P27 → P28 → P29 → P30** (P25 in
testa proprio perché è l'unico scorporabile, se si preferisce comunque
assegnarlo a un secondo agente in parallelo agli altri cinque).

---

## P25 — Listone collassabile *(chiusa, `9b9c13c`, `v6.6.0`)*

Bottone nella testata di `call-col` che la collassa a una fascia stretta
(48px, nascondendo ricerca/filtro ruolo/ordinamento/lista) per allargare
`bid-col` durante l'asta. Variabile CSS `--call-col-w` su classe
modificatore `.auction-grid--call-collapsed` per non duplicare i due
breakpoint esistenti in `index.css`. `AuctionPhone.tsx` non toccato: le tab
`lista`/`alternative`/`log` già nascondono il listone quando non attivo,
nessuna aggiunta ridondante necessaria. Test in
`AuctionMode.callCol.test.tsx`.

---

## P26 — Verdetto compatto e barra fair value/target/panic accanto al nome *(chiuso)*

Badge "Verdetto live" rimpicciolito (font/padding, toni e glow invariati) e
ladder fair value/target/max bid/panic spostata da fascia sotto-header a
blocco compatto (`.ladder--compact`) subito sotto il nome del giocatore in
chiamata, desktop e telefono. Solo UI, nessun cambio di dati o di verdetto
derivato. Dettaglio in [CHANGELOG.md](./CHANGELOG.md) `[6.7.0]`; commit sul
branch `claude/verdict-badge-ladder-layout-828b59`.

---

## P27 — Riquadro compatto per le alternative, limitato a 5 e paginato *(chiuso)*

Scelta l'opzione 1: il nuovo componente `AlternativesPanel` **sostituisce** la
tabella "Alternative nello stesso ruolo" a piena larghezza ed è reso accanto al
giocatore in chiamata, dopo `PlayerDetailPanel` / `SameTeamGoalkeepers`. 5 righe
per pagina con paginazione avanti/indietro sulle stesse 15 `compareRows`;
ordinamento come `<select>`; reset paginazione al cambio giocatore/ordinamento
via `key={`${selectedPlayer.id}:${compareSortKey}`}` sul componente (nessun
`useEffect`). Dettaglio per riga ("Dettagli" → `PlayerDetailPanel`, score →
`ScoreBreakdownDialog`) invariato; stesso riquadro nel tab "Alternative" della
vista telefono. `COMPARE_SORT_KEYS`/`COMPARE_SORT_LABEL` e il tipo `CompareRow`
spostati/condivisi in `auctionDerivations.ts`. Test in
`web/src/components/AlternativesPanel.test.tsx`. Dettaglio in
[CHANGELOG.md](./CHANGELOG.md) `[6.8.0]`.

---

## P28 — Pannello avversari sotto il giocatore in chiamata *(chiuso, `v6.9.0`)*

Nuovo componente `OpponentsBoard` (`web/src/pages/auction/OpponentsBoard.tsx`):
estrae il corpo di `OpponentRosterDialog` (grid `.opp-card` — nome, residuo,
max bid sul corrente, slot `used/total` per ruolo, rosa scrollabile coi prezzi)
in un componente riusabile. Reso inline in fondo a `section.bid-col`
(`AuctionDesktop.tsx`), **fuori** dal ternario `sel` → sempre visibile anche
senza giocatore in chiamata (`maxOnCurrent` = `adjustedMaxBid`). Contenitore
`.bid-opponents` + titolo `.bid-opponents__title` in `index.css`, con
`.opp-grid` più stretta nella colonna centrale.

La sezione "Avversari" della `io-col` (lista `view.opponents` + bottone "Rose
avversari & crediti residui") è **rimossa del tutto**: unica fonte a schermo il
nuovo pannello. In `AuctionPhone.tsx` la sezione "Avversari (N)" resta
collassabile (default chiuso) ma il contenuto inline è sostituito da
`<OpponentsBoard>`; via il bottone "Vedi rose complete & crediti".

`OpponentRosterDialog` **non eliminato** (lo fa P30): ora è un wrapper sottile
che rende `<OpponentsBoard>` dentro `<Dialog>`, conservato come fallback anche
se non più aperto da alcun bottone. Test in `AuctionMode.opponents.test.tsx`
(pannello desktop coi dati del dialog, visibilità senza chiamata, assenza di
duplicazione in `io-col`, pannello condiviso su telefono). Dettaglio in
[CHANGELOG.md](./CHANGELOG.md) `[6.9.0]`.

---

## P29 — Drag&drop di un acquisto fra manager, o cancellazione diretta (dopo P28)

**Obiettivo.** Dal pannello avversari (P28), poter trascinare un giocatore
acquistato da un manager a un altro, oppure cancellarne l'acquisto
direttamente da lì.

**Contesto — la cancellazione diretta esiste già, il riassegnamento no.**
`web/src/api/purchases.ts` ha `deletePurchase(leagueId, playerId)` (già
usato dal bottone 🗑 in "Ultime chiamate", `AuctionDesktop.tsx` righe
1000–1008, `view.onDeleteCall`) — "cancellarne l'acquisto direttamente da
lì" nel pannello P28 è lo stesso bottone, solo riposizionato dentro le righe
rosa del nuovo pannello: **nessun nuovo endpoint per questa metà del
prompt**.

Il **riassegnamento** (drag&drop fra manager) non ha invece un endpoint
lato server, ed esiste una decisione di design esplicita contro
l'aggiungerne uno generico: il commento su `deletePurchaseByPlayer`
(`server/src/db/purchases.ts` righe 67–70) dice testualmente *"Come
`deleteLastPurchase`, ma per una chiamata qualsiasi: correzione esplicita e
tracciabile di un errore [...] Nessun update, nessuna modifica di stato
mutabile"* — e più sopra, sopra `deleteLastPurchase` (righe 53–56):
*"Correcting a mistake is [...] never an update — so it goes through this
dedicated deletion, not a general-purpose 'edit a purchase' endpoint."*
Un drag&drop che sposta un acquisto da un manager all'altro **è** un edit di
riga. Prima di scrivere codice, il piano deve scegliere esplicitamente fra:
1. **Delete + insert lato client** (due chiamate esistenti,
   `deletePurchase` poi `createPurchase` con lo stesso `player_id`/`prezzo`
   e nuovo `manager_id`): nessun nuovo endpoint, coerente con la decisione
   già presa nel codice, ma perde `ts` originale (il giocatore riassegnato
   scivola in fondo al log per timestamp) e non è atomico (se la seconda
   chiamata fallisce dopo che la prima è andata a buon fine, il giocatore
   resta senza proprietario finché non si ricarica manualmente — da gestire
   con un tentativo di rollback/retry visibile in UI, non silenzioso).
2. **Nuovo endpoint `PATCH /purchases/:playerId`** che aggiorna solo
   `manager_id`: atomico, preserva `ts`, ma contraddice esplicitamente la
   decisione di design already in codice — va giustificato nel piano perché
   il caso d'uso (correggere un'assegnazione sbagliata durante un'asta live)
   è diverso da quello per cui la nota è stata scritta, e va aggiornato il
   commento in `purchases.ts` per riflettere la nuova scelta, non lasciarlo
   in contraddizione col codice.

**Raccomandazione**: partire dall'opzione 1 (nessun cambio di schema/API,
più veloce da verificare in un'asta reale) a meno che la perdita di `ts`
originale si dimostri un problema concreto nell'uso.

**Lavoro.**
- Implementa il riassegnamento secondo l'opzione scelta nel piano.
- Drag&drop nativo (HTML5 Drag and Drop API) sulle righe rosa dentro
  `OpponentsBoard` (P28): giocatore trascinabile, manager target come drop
  zone, feedback visivo di drag-over. Se il progetto non ha già un pattern
  di drag&drop altrove, verifica compatibilità con la tastiera/mobile prima
  di considerarlo l'unica via — la cancellazione diretta resta comunque
  disponibile come alternativa più accessibile.
- Vincoli da rispettare al drop: manager target non deve avere lo slot di
  quel ruolo pieno (stesso controllo già usato per `managerCanBuy` nella
  selezione "A chi" durante la chiamata, `AuctionDesktop.tsx` riga 339) —
  riusalo, non duplicare la logica.

**Test.** Test dell'operazione di riassegnamento (fixture: sposta un
acquisto da manager A a manager B, verifica che risulti sotto B e non più
sotto A; tentativo di spostamento verso un manager a slot pieno per quel
ruolo → rifiutato con messaggio, nessuna chiamata di rete eseguita). Se
opzione 2: test dell'endpoint `PATCH` (manager inesistente, giocatore senza
acquisto → 404, come già fanno gli altri endpoint purchases).

**Accettazione.** Dal pannello avversari, un giocatore acquistato può essere
trascinato su un altro manager (con gli stessi vincoli di slot già validi in
asta) oppure cancellato direttamente, senza uscire dal pannello.

**Versioning.** `feat` → MINOR se opzione 1 (nessun cambio di contratto
API); `feat` → MINOR anche con opzione 2 (nuovo endpoint additivo, non
sostituisce quelli esistenti) — non è breaking in nessuno dei due casi.

---

## P30 — Storico ridotto a un bottone "Log acquisti", rimozione del dialog avversari (dopo P28 e P29)

**Obiettivo.** Conseguenza diretta di P28 e P29: con lo stato avversari
sempre visibile sotto il giocatore e il riassegnamento/cancellazione
possibili da lì, lo storico acquisti a piena vista e il dialog avversari
separato non servono più nella forma attuale.

**Contesto.** "Ultime chiamate" è oggi una sezione sempre visibile in
`io-col` (`AuctionDesktop.tsx` righe 945–1012, `view.logRows`, con bottone
"Annulla ultima" e cancellazione per riga). `OpponentRosterDialog.tsx` è
aperto dal bottone in `io-col` riga 909-941 — reso ridondante da P28.

**Lavoro.**
- Sostituisci la sezione "Ultime chiamate" sempre visibile con un bottone
  "Log acquisti" che apre un `Dialog` (riusa `components/ui/Dialog.tsx`,
  stesso pattern di `OpponentRosterDialog`/`ScoreBreakdownDialog`) col
  contenuto attuale (righe 964–1011: avatar, nome, manager, prezzo, Δ,
  cancellazione per riga) — nessun dato perso, solo dietro un click invece
  che sempre a schermo. "Annulla ultima" può restare come azione rapida
  fuori dal dialog (bottone singolo, non l'intero log) se lo spazio in
  `io-col` lo permette.
- Rimuovi il bottone "Rose avversari & crediti residui" e l'uso di
  `OpponentRosterDialog` da `AuctionDesktop.tsx` (righe 909–941, 1054–1061)
  **solo dopo aver verificato** che `OpponentsBoard` (P28) copre davvero
  tutti i dati che il dialog mostrava (rosa completa coi prezzi inclusa, non
  solo il riepilogo) — se manca qualcosa, va aggiunto a `OpponentsBoard`
  prima di eliminare il dialog, non lasciato scoperto.
- Se `OpponentRosterDialog.tsx` non ha più nessun uso dopo questa modifica
  (verifica con una ricerca nel repo, non a memoria), eliminalo insieme al
  suo file di test — non lasciare codice morto.
- Applica la stessa semplificazione in `AuctionPhone.tsx` se il tab
  "Avversari"/dialog equivalente esiste ancora lì dopo P28.

**Test.** Test di rendering: bottone "Log acquisti" apre il dialog col
contenuto atteso, cancellazione riga funziona dentro il dialog. Se
`OpponentRosterDialog` viene rimosso, verifica che la build/lint non abbiano
riferimenti orfani (import inutilizzati, test che referenziano un
componente eliminato).

**Accettazione.** Lo storico acquisti è dietro un bottone "Log acquisti"
invece che sempre a schermo; non esiste più un dialog avversari separato dal
pannello introdotto in P28.

**Versioning.** `fix`/`refactor` → PATCH se rimuove solo markup/dialog senza
cambiare contratti pubblici; `feat` → MINOR se il bottone "Log acquisti" è
considerato una funzionalità nuova più che una rifinitura — a discrezione di
chi implementa, motivalo nel commit.
