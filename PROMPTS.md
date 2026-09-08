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

## P29 — Drag&drop di un acquisto fra manager, o cancellazione diretta *(chiuso, `v6.10.0`)*

Scelta l'**opzione 1** (delete + insert lato client): nessun nuovo endpoint,
coerente con la decisione "mai un update, solo delete tracciata" già in
`server/src/db/purchases.ts` — quel commento resta valido. Costi accettati: il
`ts` originale si perde (il giocatore riassegnato scivola in fondo al log) e
l'operazione non è atomica.

`OpponentsBoard` (`web/src/pages/auction/OpponentsBoard.tsx`) guadagna tre prop
opzionali: `onDeletePurchase`, `onReassignPurchase`, `reassignError`. Le righe
rosa `.opp-roster-row` sono `draggable` (HTML5 Drag and Drop nativo, nessuna
dipendenza) quando `onReassignPurchase` è passata; ogni `.opp-card` avversario è
drop zone con feedback `.opp-card--dragover`. Al drop `onReassignPurchase`
(`AuctionMode.tsx`) verifica lo slot del ruolo sul manager di destinazione con il
nuovo helper condiviso `roleSlotFree` (`auctionDerivations.ts`, ora usato anche
da `managerCanBuy`), poi `deletePurchase` + `createPurchase`; se l'insert
fallisce tenta il ripristino sul manager originale e mostra sempre un errore
visibile, mai silenzioso. Il bottone 🗑 (`.opp-roster-del`, stile clonato da
`.log-del`) riusa `onDeleteCall` ed è l'alternativa accessibile su tastiera e
telefono (dove il drag&drop non è passato). Desktop riceve tutte e tre le prop,
telefono solo `onDeletePurchase`.

Test in `AuctionMode.reassign.test.tsx` (riassegnamento A→B con delete+insert,
drop su slot pieno rifiutato senza chiamate di rete, rollback sull'originale se
l'insert fallisce, 🗑 che cancella). Dettaglio in
[CHANGELOG.md](./CHANGELOG.md) `[6.10.0]`.

---

## P30 — Storico ridotto a un bottone "Log acquisti", rimozione del dialog avversari *(chiuso, `v6.11.0`)*

Nuovo componente `PurchaseLogDialog` (`web/src/pages/auction/PurchaseLogDialog.tsx`):
il contenuto di "Ultime chiamate" (righe `.log-row` — avatar, nome, manager,
prezzo, Δ, 🗑 per riga) più un "Annulla ultima" interno, dentro `<Dialog>`
(stesso pattern di `ScoreBreakdownDialog`). Nella `io-col` di `AuctionDesktop.tsx`
la sezione sempre visibile è sostituita da due bottoni compatti: "Log acquisti"
(apre il dialog, stato locale `logOpen`) e "Annulla ultima" (azione rapida su
`view.onUndo`). `deltaColor`/`formatDelta` non più importati in `AuctionDesktop`.

`OpponentRosterDialog.tsx` **eliminato**: era già codice morto dopo P28 (nessun
import, nessun uso JSX — verificato con `grep`), e `OpponentsBoard` inline ne
copre tutti i dati (rosa completa coi prezzi). Nessun file di test associato da
rimuovere. Commento in `OpponentsBoard.tsx` aggiornato (non cita più il dialog).

`AuctionPhone.tsx` invariato: il log è già un tab dedicato e "Avversari" una
sezione collassabile.

Test in `AuctionMode.log.test.tsx` (log non a schermo finché non si clicca "Log
acquisti", 🗑 dentro il dialog che cancella, "Annulla ultima" fuori dal dialog,
chiusura su Escape). Scelto `feat` → MINOR: "Log acquisti" è una nuova superficie
UI. Dettaglio in [CHANGELOG.md](./CHANGELOG.md) `[6.11.0]`.
