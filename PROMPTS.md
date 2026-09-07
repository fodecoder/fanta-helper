# PROMPTS.md — Fase 10 (rifiniture da uso reale in preparazione d'asta)

Prompt operativi per Claude Code, **in plan mode**. Le Fasi 7 (P1–P9), la fase
mobile (P10), la Fase 8 (P11–P15) e la Fase 9 (P16–P19) sono chiuse: la loro
traccia vive nel `CHANGELOG.md` e nella git history, non più in questo file
(elenco dettagliato troppo lungo da tenere a mano ad ogni fase — un
riferimento a un commit verificabile vale più di un testo copiato).

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

**Ordine Fase 10.** Due gruppi di file completamente disgiunti fra loro,
eseguibili in parallelo l'uno rispetto all'altro (due agenti, ognuno con la
propria sequenza interna, lanciati nello stesso giro):

- **Gruppo A — Manager**, indipendente da tutto il resto: **P20** (un solo
  agente).
- **Gruppo B — Valutazioni**, sequenziale al proprio interno: **P23 → P22**
  (P22 dopo P23 perché tocca di nuovo `ValuationsPage.tsx`).
- **Gruppo C — Asta**, sequenziale al proprio interno: **P21 → P24** (P24
  dopo P21 perché tocca di nuovo `AuctionDesktop.tsx`/`AuctionPhone.tsx`/
  `AuctionMode.tsx`).

Gruppo A, B e C non condividono file: possono partire come tre agenti
paralleli (o tre sessioni separate), ciascuno rispettando l'ordine interno
indicato.

---

## P20 — Click su un manager apre la modifica del nome (Gruppo A)

**Obiettivo.** Dalla tabella "Stato dei manager" in Overview, cliccare sul
nome di un manager porta alla pagina di modifica di quel manager, invece di
non fare nulla.

**Contesto.** `ManagersPage.tsx` (`web/src/pages/ManagersPage.tsx`) ha già il
rename inline: un `input` per riga con `onBlur` → `commitRename` (righe
143–160). Manca solo il collegamento per arrivarci da altrove già mirato su
un manager specifico. `OverviewPage.tsx` (`web/src/pages/OverviewPage.tsx`)
mostra la tabella "Stato dei manager" (a partire da riga 130), con
`s.managerName` come testo statico (riga 170) — nessun `onClick`, nessuna
prop di navigazione ricevuta dal componente (oggi solo `league`/`calls`,
righe 29–34). La navigazione fra pagine non usa React Router: `App.tsx` tiene
`page`/`setPage` di tipo `SetupPage` (righe 48, 107) e passa `league`/`calls`
a ogni pagina, incluso `<OverviewPage league={activeLeague}
calls={purchaseCount} />` (riga 201) — nessuna callback di cambio pagina
oggi arriva a `OverviewPage`.

**Lavoro.**
- Aggiungi a `OverviewPageProps` una prop di navigazione (es. `onOpenManager:
  (managerId: number) => void`), passata da `App.tsx` come `() => { setPage("manager");
  ...}` — decidi se serve solo cambiare pagina o anche portare il focus su
  quella riga specifica (vedi punto sotto), e nomina la prop di conseguenza.
- Rendi cliccabile `s.managerName` nella riga 170 di `OverviewPage.tsx` (un
  `button`/link in stile testo, non un intero `<tr>` cliccabile per non
  rompere altri click nella riga), che chiama la prop di navigazione con
  `s.managerId`.
- In `ManagersPage.tsx`, aggiungi una prop opzionale (es. `focusManagerId?:
  number`) che, se presente al mount, porta il focus (e se serve lo scroll)
  sull'`input` di rename di quel manager — così il click da Overview non
  porta solo "alla pagina Manager" ma dritto a modificare quel nome. Se
  l'App tiene lo stato di navigazione in un unico posto (`App.tsx`), valuta
  se propagare l'id selezionato come nuovo stato accanto a `page`, invece di
  duplicarlo in più componenti.

**Test.** Test di `OverviewPage` (interazione: click sul nome manager chiama
la callback con l'id corretto). Test di `ManagersPage` con `focusManagerId`
valorizzato (l'input corrispondente riceve il focus al mount) e senza (nessun
focus automatico, comportamento invariato).

**Accettazione.** Dalla tabella "Stato dei manager" in Overview, cliccando su
un nome si arriva alla pagina Manager con il campo nome di quel manager
pronto per essere modificato.

**Versioning.** `feat` → MINOR (nuova prop pubblica su due componenti, nessun
cambio di schema).

---

## P21 — Secondo/terzo portiere e consigliati alla chiamata di un portiere (Gruppo C, 1/2)

**Obiettivo.** Quando il giocatore chiamato in asta è un portiere, mostrare
gli altri portieri della stessa squadra (secondo/terzo) e i portieri
consigliati secondo la griglia/accoppiate già calcolata, senza dover uscire
dalla schermata di chiamata.

**Contesto — non è la stessa cosa di `GkPairingHint`.** `GkPairingHint`
(`web/src/components/GkPairingHint.tsx`, uso in `AuctionDesktop.tsx` riga 748
e `AuctionPhone.tsx` riga 95) è un consiglio di *accoppiata fra squadre
diverse* per calendario (`gkPairingSuggestion`, calcolato in
`AuctionMode.tsx` righe 420–422 da `gkPairingSuggestionFor`), mostrato sempre
nella colonna "Io", **non** filtrato sul giocatore in chiamata: non va
toccato, resta come consiglio separato. Quello richiesto qui è diverso: i
portieri della **stessa squadra** del giocatore attualmente chiamato (per
sapere se conviene puntare sul titolare sapendo chi fa da riserva, o evitare
di duplicare spesa sullo stesso reparto della stessa squadra).

Il pool giocatori completo è già in scope in `AuctionMode.tsx`: stato
`players: Player[] | null` (riga 190), `selectedPlayer` (riga 376, il
giocatore attualmente "in chiamata"). C'è già un pattern di confronto
alternative-stesso-ruolo attivo per il giocatore selezionato (righe 488–498,
`RankRow`/`compareSortValueFor`) — verifica se è generalizzabile (stesso
ruolo E stessa squadra invece di stesso ruolo E ordinamento per valore) prima
di scrivere un secondo filtro da zero.

**Lavoro.**
- Deriva (in `AuctionMode.tsx`, vicino a dove già si calcola
  `gkPairingSuggestion`/le alternative stesso ruolo) l'elenco dei portieri
  della stessa squadra di `selectedPlayer` quando `selectedPlayer.ruolo ===
  "P"`, esclusi acquistati o meno di 2 opzioni — con la valutazione
  (`fair_value`/tier) di ciascuno per capire a colpo d'occhio se il secondo
  portiere è "da tenere d'occhio" o ininfluente.
- Nuovo componente (o sezione dentro un componente esistente vicino al
  dettaglio del giocatore chiamato — `PlayerDetailPanel.tsx` è il posto
  naturale se già mostra dati sul giocatore in chiamata, verifica prima di
  crearne uno nuovo) che mostra: portieri stessa squadra (titolare/riserva
  desumibile da tier/valutazione, non un campo "ruolo di squadra" che non
  esiste nei dati), e sotto o accanto il consiglio esistente
  `GkPairingHint` — due blocchi distinti, non fonderli in un unico messaggio
  perché rispondono a domande diverse (stessa squadra vs. squadra
  complementare).
- Renderizza solo quando `selectedPlayer.ruolo === "P"`, sia in
  `AuctionDesktop.tsx` sia in `AuctionPhone.tsx` (verifica come già
  differenziano contenuti per ruolo, se lo fanno, per riusare il pattern).

**Test.** Test del derivato "portieri stessa squadra" (fixture con più
portieri per squadra, esclusione degli acquistati, caso squadra con un solo
portiere nel pool → nessun secondo/terzo da mostrare). Test di rendering:
compare solo quando il giocatore chiamato è un portiere, non per altri ruoli.

**Accettazione.** Chiamando un portiere, senza cambiare schermata si vedono
gli altri portieri della sua squadra (con la loro valutazione) e il
consiglio di accoppiata già esistente, entrambi distinti e leggibili.

**Versioning.** `feat` → MINOR.

---

## P22 — Export PDF della lista valutazioni (Gruppo B, 2/2 — dopo P23)

**Obiettivo.** Esportare la tabella Valutazioni in PDF, replicando il layout
del template fornito dall'utente.

**Contesto — template allegato (`guida-asta-lega10-redesign.pdf`, 14
pagine).** Struttura verificata pagina per pagina:
- Intestazione: titolo "Guida Asta Fantacalcio {stagione}", sottotitolo
  "{nome lega} · Budget {N} crediti · Valutazioni aggiornate al {data}", poi
  4 indicatori (uno per ruolo P/D/C/A) con percentuale di riparto budget e
  crediti indicativi (es. "46% ATTACCANTI · 460 crediti indicativi").
- Legenda tag: badge colorati per situazione giocatore — Infortunio (rosa),
  In forma (azzurro), Sottotono (grigio), Da verificare (grigio chiaro), più
  un tag a parte "Verifica ruolo" (bordo, per ruolo listino diverso da
  questa lista) — e la spiegazione di Target/Max/Tier.
- Una sezione per ruolo (Portieri, Difensori, Centrocampisti, Attaccanti),
  ognuna con titolo + conteggio (es. "Difensori (80)"), una riga "Scelte
  top: {5 nomi}", poi una tabella con colonne # (numerazione che riparte da
  1 a ogni sezione) / Giocatore / Squadra / Tier / Target / Max / Situazione
  (badge) / Acquistato · Note (colonna vuota per scrivere a mano durante
  l'asta).
- Nessun logo/branding oltre al testo; impaginazione A4, una tabella per
  pagina quando non ci sta tutta la sezione (la numerazione della sezione
  continua sulla pagina successiva, l'intestazione di colonna si ripete).

Nessun export esiste oggi nel codice (verificato: nessun riferimento a `pdf`
in `web/src`/`server/src` fuori da `docs/`). Scegli una libreria di
generazione PDF lato client (evita una dipendenza server-side pesante se non
già presente — verifica `package.json` prima di aggiungerne una nuova) o
lato server se la formattazione a più pagine con ripetizione header è più
semplice da controllare lì; documenta la scelta nel piano prima di
implementare, con il tradeoff (bundle size lato client vs. round-trip e
carico lato server).

**Lavoro.**
- Nuovo modulo di generazione (mappa dati Valutazioni → struttura del
  template: intestazione, indicatori di riparto per ruolo dal budget di
  lega reale — non i numeri di esempio del template, che erano per una lega
  specifica —, sezioni per ruolo con numerazione che riparte, badge
  situazione derivati dai tag/note già presenti in app — infortunio da dove
  già lo sa l'app, es. `ProbableLineupBoard`/injury status se esiste un
  campo equivalente, altrimenti dal campo `note` della valutazione —
  **non inventare un campo nuovo se un segnale equivalente esiste già**,
  verifica prima).
- Bottone "Esporta PDF" in `ValuationsPage.tsx`, vicino agli altri controlli
  di export/import esistenti (verifica pattern UI già in uso per import, per
  coerenza di posizione/stile).
- Il campo note (merge di scouting + ricerca incrociata, vedi
  `PLAN.md` § Fase 10) va nella colonna "Acquistato · Note" **solo come testo
  di riferimento stampato**, non deve occupare tutto lo spazio pensato per
  scrivere a mano — tronca/abbrevia se necessario, o usa un carattere più
  piccolo, verifica leggibilità a stampa.

**Test.** Test del mapping dati → struttura documento (fixture con
valutazioni miste, verifica sezioni per ruolo corrette, numerazione che
riparte, indicatori di riparto calcolati sul budget reale della lega, non
hardcoded). Se la libreria scelta lo permette in test automatico, verifica
che il PDF generato abbia il numero di pagine/sezioni atteso; altrimenti
verifica manuale con screenshot del PDF generato allegata al prompt di
verifica.

**Accettazione.** Dalla pagina Valutazioni si scarica un PDF con lo stesso
layout del template (intestazione, indicatori di riparto, legenda, tabelle
per ruolo con numerazione propria), popolato con i dati reali della lega
corrente.

**Versioning.** `feat` → MINOR.

---

## P23 — Bottone "Segna come obiettivo" in Valutazioni (Gruppo B, 1/2)

**Obiettivo.** Nella tabella Valutazioni, poter segnare un giocatore come
obiettivo (stellina o bottone dedicato), riusando la wishlist già esistente.

**Contesto.** Il modello wishlist esiste già per intero lato API
(`web/src/api/wishlist.ts`: `listWishlist`/`addToWishlist`/
`removeFromWishlist`/`reorderWishlist`) ed è usato in asta
(`AuctionMode.tsx`/`AuctionDesktop.tsx`/`AuctionPhone.tsx`), ma non è
collegato a `ValuationsPage.tsx`/`MergedValuationRow.tsx` — nessun `import`
di `wishlistApi` in nessuno dei due file. Il pattern da replicare è
identico a quello già in uso per i giocatori trappola nello stesso file:
stato `trapTagIds: Set<number>` + funzione `toggleTrap` in
`ValuationsPage.tsx` (righe 53, 105–108), passati come prop
`isTrap`/`onToggleTrap` a `MergedValuationRow` (righe 22–23 dell'interfaccia,
bottone renderizzato righe 305–312).

**Lavoro.**
- In `ValuationsPage.tsx`: nuovo stato `wishlistIds: Set<number>`, caricato
  con `wishlistApi.listWishlist` nello stesso `useEffect` che già carica
  `trapTagIds` (o uno analogo, segui il pattern), e funzione `toggleWishlist
  (playerId)` che chiama `addToWishlist`/`removeFromWishlist` a seconda
  dello stato corrente — stesso schema di `toggleTrap`.
- In `MergedValuationRowProps`: aggiungi `isTargeted: boolean` e
  `onToggleTarget: () => void` (stesso schema di `isTrap`/`onToggleTrap`),
  passati da `ValuationsPage.tsx` riga ~350 dove già passa `isTrap`.
- Nel rendering della riga, aggiungi il bottone/stellina vicino al bottone
  "Segna trappola" esistente (righe 305–312) ma visivamente distinto (icona
  stella, non testo "Segna trappola" — sono due concetti diversi: trappola è
  per gli avversari, obiettivo è per sé), con `aria-pressed={isTargeted}`
  come già fa il bottone trappola.

**Test.** Test di `ValuationsPage` (interazione: click sulla stellina
aggiunge/rimuove dalla wishlist, stato riflesso subito senza attendere un
refresh completo — stesso comportamento ottimistico/di refresh già usato per
`toggleTrap`, verifica quale sia e riusalo). Test di `MergedValuationRow`
(rendering del bottone in stato attivo/inattivo).

**Accettazione.** In Valutazioni, ogni riga ha un bottone per segnare il
giocatore come obiettivo; lo stato è coerente con la wishlist già usata in
asta (un giocatore segnato da Valutazioni compare in wishlist durante
l'asta, e viceversa).

**Versioning.** `feat` → MINOR.

---

## P24 — Nota di scouting visibile in asta, evidenziata se il giocatore è battuto (Gruppo C, 2/2 — dopo P21)

**Obiettivo.** Durante la chiamata di un giocatore, mostrare la sua nota di
scouting (oggi solo in Valutazioni) e metterla in evidenza quando il prezzo
in asta lo porta fuori mercato.

**Contesto — la soglia di "battuto" esiste già, non va inventata.** Il campo
`note` della valutazione è modificabile in `MergedValuationRow.tsx` (righe
277–284) ma non compare in nessun punto della Vista Asta
(`AuctionDesktop.tsx`/`AuctionPhone.tsx`). La soglia "il giocatore sta
venendo battuto" corrisponde già a un segnale esistente:
`verdict()`/`verdictTone()` in `web/src/lib/auctionDerivations.ts` (righe
74–90) restituisce `"Fuori mercato"` (tono di warning) quando `price >
val.panic_price` — è il segnale su cui agganciare l'evidenza, non una soglia
nuova. `priceNum` (il prezzo digitato durante la chiamata corrente) è già
calcolato in `AuctionMode.tsx` riga 379 e già passato al calcolo del
verdetto (riga 438).

**Lavoro.**
- Esponi la nota del giocatore chiamato (`selectedValuation.note` — verifica
  il nome esatto del campo sulla valutazione già in scope in `AuctionMode.tsx`
  vicino a `computeVerdict`) nella view passata a `AuctionDesktop.tsx`/
  `AuctionPhone.tsx`, se non già presente.
- Mostra la nota vicino al riquadro del giocatore in chiamata (non in un
  dialog separato: deve essere leggibile senza click aggiuntivi durante
  un'asta dal vivo). Se `note` è vuota/assente, non mostrare il blocco
  (niente placeholder tipo "nessuna nota").
- Quando `verdictTone(priceNum, selectedValuation) === "over"` (o
  l'equivalente già usato per "Fuori mercato" — verifica il nome esatto
  del tono restituito), applica uno stile di evidenza al blocco nota
  (bordo/sfondo di warning, stesso linguaggio visivo già usato altrove per
  "Fuori mercato" — non inventare un nuovo colore di warning).

**Test.** Test di rendering: nota assente → nessun blocco; nota presente,
prezzo sotto panic price → nota visibile senza evidenza; prezzo sopra panic
price → nota visibile con stile di evidenza. Verifica che il blocco compaia
in entrambe `AuctionDesktop.tsx` e `AuctionPhone.tsx`.

**Accettazione.** Durante la chiamata di un giocatore con una nota di
scouting, la nota è visibile senza azioni aggiuntive; se il prezzo inserito
supera il `panic_price`, la nota è evidenziata con lo stesso linguaggio
visivo già usato per "Fuori mercato".

**Versioning.** `feat` → MINOR.
