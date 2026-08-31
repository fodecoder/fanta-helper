# PROMPTS.md — Fase 8 (correzioni post-asta reale)

Prompt operativi per Claude Code, **in plan mode**. La Fase 7 (P1–P9) e la fase
mobile (P10) sono chiuse: la loro traccia vive nel `CHANGELOG.md` e nella git
history, non più qui.

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

**Ordine consigliato:** P11 → P12 → P13 (due agenti paralleli) → P14 → P15.
P12 tocca schema/import del pool giocatori: va chiuso prima di P13, che genera
valutazioni sull'intero pool. P15 dipende dal `fair_value` prodotto da P13.

---

## P11 — Fix palette colori ruolo

**Obiettivo.** Allineare i colori ruolo nell'app alla palette richiesta: **P
giallo, D blu, C verde, A rosso**.

**Contesto.** `web/src/index.css` righe 50–55 definisce oggi `--role-p:
var(--color-process-yellow)` (corretto), `--role-d: var(--color-accent)`
(arancione), `--role-c: var(--color-neutral-700)` (grigio), `--role-a:
var(--color-accent-2)` (magenta). Sono usati via `roleColor()` in
`web/src/lib/auctionDerivations.ts` e consumati in una decina di componenti
(`AuctionDesktop.tsx`, `AuctionPhone.tsx`, `OverviewPage.tsx`,
`RecommendationsPage.tsx`, `ValuationOverrideRow.tsx`, `ProbableLineupBoard.tsx`,
`PlayerDetailPanel.tsx`) — non serve toccarli, solo i token.

**Lavoro.**
- Aggiungi/aggiorna i design token in `web/src/index.css` per D (blu), C
  (verde), A (rosso), scegliendo valori coerenti con la palette di brand già
  in `SPEC.md` (verde `#2BA756`/`#077449`, blu `#11246F`/`#144F89`) e con
  sufficiente contrasto testo/sfondo (verifica AA su sfondo bianco e sui badge
  a sfondo pieno in `.player-avatar--role-*`).
  Il rosso non è nella palette di brand attuale: sceglilo per contrasto e
  distinguibilità dagli altri tre (non riusare arancione/magenta esistenti),
  e documentalo in `SPEC.md` insieme agli altri.
- Aggiorna `SPEC.md` § Palette con i 4 colori ruolo definitivi.

**Test.** Aggiorna `web/src/lib/auctionDerivations.test.ts` (il test
`roleColor` esiste già e verifica il nome della variabile CSS, non il colore:
aggiungi un'asserzione o un commento che leghi il nome var al colore atteso in
`index.css`, per non regredire in silenzio se qualcuno rinomina la palette).
Screenshot prima/dopo della vista Asta (desktop e mobile) per verifica visiva.

**Accettazione.** I quattro ruoli sono visivamente distinti per colore
categorico (non tonalità dello stesso colore), P giallo/D blu/C verde/A rosso,
in tutte le viste che usano `roleColor`/le classi `.role-*`.

**Versioning.** `fix` → PATCH.

---

## P12 — Import Listone v2: nuovo formato, nome completo, fix duplicati, foto

**Obiettivo.** Sostituire l'import quotazioni/giocatori per reggere il nuovo
formato del listone (colonne posizionali, senza header), aggiungere il nome
completo, correggere il duplicato-su-cambio-squadra, e far ricadere le foto
rotte sullo stemma squadra. Quattro problemi diversi ma sullo stesso file/area
di codice (`playerImport.ts`, `players.ts`, `player.ts`, migrazioni): un solo
prompt sequenziale, non parallelizzabile senza rischio di conflitto.

**Contesto — leggi prima di scrivere codice.**
- File di riferimento allegato: `Lista-FantaAsta-Fantacalcio.csv` (559 righe
  dati, **nessuna riga di header**, 19 colonne separate da virgola). Prima
  riga di esempio: `4431,Carnesecchi,Marco Carnesecchi,P,Por,16,16,16,16,
  Atalanta,52,52,destro,Italia,01/07/2000 00:00:00,https://content.fantacalcio.it/
  web/campioncini/21/card/4431.png?v=765,0,6.5,6.5`. Ipotesi di mappatura da
  **verificare sul file reale, non assumere**: 1=Id, 2=Nome, 3=Nome completo,
  4=Ruolo (P/D/C/A), 5=Ruolo Mantra, 6-9=quotazioni (identiche a inizio
  stagione), 10=Squadra, 11-12=FVM (Classic/Mantra), 13=piede, 14=nazionalità,
  15=data di nascita, 16=URL foto, 17=flag (infortunato?), 18=Mv, 19=Fm.
  Conferma leggendo altre righe del file e, se serve, cercando online la
  struttura dell'export "Lista FantaAsta" di Fantacalcio.it (nessuna
  documentazione ufficiale pubblica trovata in questa sessione — solo
  ricostruzione dal file).
- Importer attuale: `server/src/import/playerImport.ts`
  (`PLAYER_REQUIRED_COLUMNS = ["R", "Nome", "Squadra"]`, via `rowsToRecords`
  che richiede una riga di header con questi nomi esatti) e
  `server/src/import/quotationImport.ts`/`currentSeasonImport.ts` per i file
  quotazioni/statistiche esistenti (che *hanno* header e vanno lasciati
  funzionanti: `docs/Quotazioni_*.xlsx` resta un formato valido di import).
- Bug duplicati: `server/src/db/players.ts`, `upsertPlayer` —
  `ON CONFLICT (name, team) DO UPDATE` non scatta se `team` cambia tra un
  import e l'altro (stesso nome, squadra diversa in due import successivi →
  riga nuova invece di update). `fanta_id` è già la chiave stabile prevista da
  `SPEC.md` per questo esatto motivo, ma l'upsert non lo usa come chiave di
  conflitto.
- Nome completo: `shared/src/player.ts` (`playerSchema`) non ha il campo.
  Nessuna migrazione lo prevede.
- Foto senza fallback: `web/src/components/PlayerAvatar.tsx` riga ~34, `<img
  src={image_url} />` senza `onError`. Il placeholder squadra+ruolo esiste già
  nello stesso componente per `image_url` assente: va riusato per l'errore di
  caricamento, non riscritto.

**Lavoro.**
1. **Import flessibile senza header.** Aggiungi rilevamento: se la prima riga
   non è interpretabile come header (es. la colonna attesa `Ruolo` contiene un
   valore numerico, o nessuna cella matcha i nomi colonna noti), tratta il file
   come posizionale e applica una mappatura per indice, configurabile e con
   commento che ne spiega l'origine (non hardcoded senza spiegazione). Se
   colonne sono mancanti/vuote su una riga, la riga non va scartata in blocco:
   solo i campi mancanti restano `null`/non aggiornati, coerente con la
   richiesta di flessibilità. Mantieni il path a header esistente (file con
   header nominati continuano a funzionare invariati).
2. **`nome_completo`.** Migrazione additiva su `player` (colonna nullable,
   nessun default inventato per le righe esistenti). Aggiorna `playerSchema`,
   l'upsert, e mostra il nome completo dove oggi si vede solo `name` (schede
   giocatore in asta, dettaglio, liste) — `name` resta il nome breve usato per
   il matching, `nome_completo` è solo presentazione.
3. **Fix duplicati.** Riscrivi `upsertPlayer` per usare `fanta_id` come chiave
   di conflitto primaria quando presente (aggiorna `name`/`team`/`ruolo` sulla
   riga esistente), con fallback a `name+team` solo per righe senza
   `fanta_id`. Aggiungi un vincolo unico su `fanta_id` (dove non null) via
   migrazione. Scrivi anche uno script una-tantum
   (`server/src/scripts/`) che rilevi e segnali (non cancelli in automatico
   senza conferma) i duplicati già presenti in DB da fondere, con lo stesso
   criterio.
4. **Fallback foto.** `PlayerAvatar` cattura l'errore di caricamento
   dell'`<img>` e ricade sul placeholder squadra+ruolo esistente, esattamente
   come già fa per `image_url` nullo.
5. **Rinomina UI.** La schermata/voce di import del listone si chiama "Import
   Listone" (o equivalente parlante) invece del nome attuale — trova il testo
   nella UI (`web/src/pages`) e aggiornalo, senza toccare le route/URL se
   referenziate altrove.

**Test.**
- `shared`: test per `playerSchema` con `nome_completo` nullo e valorizzato.
- `server`: test di `playerImport`/`quotationImport` con (a) il file allegato
  come fixture reale (posizionale, senza header), (b) un file con header
  esistente (non regredire), (c) righe con colonne mancanti/vuote (non
  scartate in blocco), (d) reimport dello stesso `fanta_id` con `team` diverso
  → una sola riga in `player`, `team` aggiornato, non duplicata. Aggiungi la
  fixture del CSV allegato sotto `server/src/test/fixtures/` (nome
  esplicito tipo `listone-2026-27-fantaasta.csv`).
- `web`: test del fallback `onError` di `PlayerAvatar` (simulando l'evento
  error sull'`<img>`, verifica che renda il placeholder).

**Accettazione.** Il file allegato si importa senza scarti di massa (solo le
righe realmente non valide finiscono nel report), il nome completo compare
nelle schermate giocatore, un giocatore reimportato con squadra diversa
aggiorna la riga esistente invece di duplicarla, una foto non caricabile mostra
lo stemma squadra invece di un'icona rotta, e la voce di import ha un nome
parlante.

**Versioning.** `feat` → MINOR (include un `fix` per i duplicati, ma la
migrazione/campo nuovo qualifica il bump come feature).

---

## P13 — Valutazioni per tutti i giocatori (8/10) + FVM ponderato al budget

**Due lavori indipendenti sullo stesso obiettivo di fondo (coprire l'asta con
dati completi), che non si toccano a livello di file: eseguili con due agenti
paralleli nello stesso prompt.**

### P13a — Generazione valutazioni a copertura totale (agente 1)

**Obiettivo.** Sostituire `docs/sample/asta_1000_lega8.json` e `lega10.json`
(79 giocatori ciascuno) con dataset che coprono **tutto il pool giocatori**
importato (~550+), generati in modo deterministico e riproducibile, non a
mano.

**Contesto.** Il meccanismo di seed (`server/src/import/defaultValuations.ts`
→ `seedDefaultValuationsForLeague`, chiamato da `routes/leagues.ts` alla
creazione lega) funziona ed è per-`n_squadre` (8/10) per design (`SPEC.md`:
sono dataset dedicati, non un riscalaggio lineare) — non toccarlo. Manca solo
la generazione dei due file con copertura piena. `shared/src/valuation.ts`
definisce lo schema di destinazione (base 1000 crediti, vedi
`valuationScale.ts`). `recommendationEngine.ts` già calcola valore relativo
alla lega da quotazioni + statistiche storiche; `claudeExtraction/` è la
pipeline LLM esistente (Fase 3) usabile in alternativa/rifinitura ma non
obbligatoria — preferisci un generatore deterministico basato sull'engine
esistente se copre la qualità richiesta, per non introdurre dipendenza da
costo/token API su un dataset che va rigenerato ogni stagione.

**Metodologia (fonte: [fantacalcio.dev — Fasce oneste 2026-27](https://fantacalcio.dev/report/fasce-oneste-2026-27),
dati backtestati su 2 stagioni, non solo dichiarati).**
- Fasce (`tier`) per ruolo su percentili di valore motore, non quote fisse
  uguali per tutti i ruoli.
- `confidence` per riga derivata dal tasso di conferma per ruolo misurato nel
  backtest: centrocampisti 62% → `high` sulla fascia top più ampia; difensori
  54% → `medium`; attaccanti e portieri 33% → `medium`/`low` anche in fascia
  top. Non inventare una confidenza uniforme.
- Scarta o marca a `confidence: "low"` i giocatori sotto 15 fantavoti nella
  stagione di riferimento (soglia di affidabilità minima usata nel report).
- `max_bid`/`panic_price` calibrati sul concetto di prezzo massimo = (valore
  motore del giocatore − valore del primo sostituto gratuito dello stesso
  ruolo) — coerente col replacement level già in `recommendationEngine.ts`,
  non una formula nuova scollegata.
- Debuttanti/neo-arrivati senza storico Serie A: applica l'euristica per
  provenienza del report (Premier top/semi-top → fascia alta diretta, altre
  grandi leghe → semi-top, Serie B/neopromossa → terza fascia) solo se il dato
  di provenienza è disponibile; altrimenti `confidence: "low"` esplicita, mai
  una fascia inventata.

**Test.** Test del generatore (dato un pool giocatori + quotazioni +
statistiche di fixture, verifica che copra il 100% del pool, rispetti gli enum
di `shared/src/valuation.ts`, e produca `confidence` differenziata per ruolo
secondo le soglie sopra). Test di integrazione: creazione lega a 8 e a 10 →
tutti i giocatori del pool hanno una `valuation`.

**Accettazione.** Nessun giocatore chiamabile in asta risulta senza
valutazione per una lega da 8 o da 10 squadre.

### P13b — FVM ponderato al budget di lega (agente 2)

**Obiettivo.** Rispondere al gap: FVM oggi non è riscalato al budget di lega
quando mostrato come proxy di prezzo assoluto (lo è già, correttamente, per
l'ordinamento a percentile in `recommendationEngine.ts` — quello non si
tocca).

**Contesto.** FVM ufficiale Fantacalcio è su base standard 500 crediti.
`shared/src/valuationScale.ts` ha già il pattern corretto per `valuation`
(riscala in lettura, non all'import, dividendo per `DEFAULT_BUDGET`). FVM va
trattato allo stesso modo ma con la propria base (500, non 1000): serve una
funzione parallela, non un riuso diretto di `valuationScaleFactor` che assume
base 1000.

**Lavoro.** Aggiungi in `shared/src` (stesso file o uno nuovo accanto a
`valuationScale.ts`, valuta tu quale minimizza duplicazione) una funzione di
riscalaggio FVM analoga, con base 500 dichiarata e commentata (perché diversa
dalla base valutazioni). Applicala nei punti dove `quotation.fvm` è mostrato
come prezzo atteso assoluto nella Vista Asta (`AuctionDesktop.tsx`,
`AuctionPhone.tsx`, `PlayerDetailPanel.tsx` — cerca gli usi di `fvm` in
`web/src`), **non** nel calcolo a percentile di `recommendationEngine.ts` né
in `playerTags.ts` (quelli sono correttamente relativi, riscalarli sarebbe un
bug diverso: percentile è invariante al riscalaggio lineare, quindi cambiare
lì non farebbe nulla di dannoso ma nemmeno di utile — lascia stare per non
gonfiare il diff).

**Test.** Test unitario della funzione di riscalaggio (budget 500 → fattore 1,
budget 1000 → fattore 2, ecc., simmetrico a `valuationScaleFactor`). Test che
la Vista Asta mostri l'FVM riscalato per una lega con budget ≠ 500.

**Accettazione.** In una lega con budget diverso da 500, l'FVM mostrato in
asta come prezzo atteso è coerente con il budget reale, non il numero grezzo
del listone.

**Versioning (per entrambi, un solo commit/tag a fine prompt).** `feat` →
MINOR.

---

## P14 — Vista avversari in asta

**Obiettivo.** Rendere visibile durante l'asta cosa hanno già preso gli
avversari, contestualmente al giocatore chiamato, non solo come pagina
separata.

**Contesto.** `ManagersPage.tsx` ha già la logica di rosa-per-manager
(derivata dal log `purchase`, invariante rispettata). La Vista Asta
(`AuctionDesktop.tsx`/`AuctionPhone.tsx`) oggi non mostra un riepilogo
avversari mentre un giocatore è "in chiamata". Nessuna sovrapposizione di file
con P12/P13: puro consumo di dati derivati già esistenti via API esistenti
(o una nuova rotta di sola lettura se serve un aggregato ad hoc — verifica
prima se `routes/managers.ts` o simili bastano).

**Lavoro.**
- Pannello (desktop: sidebar/riquadro; mobile: sezione collassabile per non
  affollare lo schermo piccolo) con, per ogni avversario: slot liberi per
  ruolo, crediti residui, crediti massimi spendibili sul giocatore in asta
  (stesso calcolo di `maxBid.ts` già usato per "Io", applicato a ciascun
  manager).
  Il calcolo del max spendibile ha una fonte di verità unica in
  `maxBid.ts`; se oggi assume implicitamente "Io" come budget/rosa target,
  generalizzalo per accettare un manager qualsiasi invece di duplicare la
  logica.
- Avviso contestuale sotto il giocatore in chiamata: se uno o più avversari
  hanno già preso giocatori "forti" dello stesso ruolo (usa i tag/valore
  motore esistenti da `playerTags.ts`/`recommendationEngine.ts`, non una
  nuova euristica scollegata) o dello stesso reparto in generale, mostralo
  come nota breve ("Manager X ha già preso 2 top C"), non come blocco della
  UI.

**Test.** Test dei nuovi derivati (slot liberi/crediti/max-spendibile per
manager generico, non solo "Io") — se `maxBid.ts` viene generalizzato,
aggiorna `maxBid.test.ts` perché copra il caso multi-manager. Test del
pannello (rendering con fixture di più manager e acquisti, incluso il caso
zero-acquisti).

**Accettazione.** Durante l'asta, senza lasciare la schermata, si vede per
ogni avversario: slot liberi, crediti residui, quanto può spendere ancora sul
giocatore corrente, e un segnale se ha già preso giocatori forti nel ruolo/
reparto del giocatore in chiamata.

**Versioning.** `feat` → MINOR.

---

## P15 — Giocatori trappola

**Obiettivo.** Esporre una lista di giocatori utili da chiamare per far
spendere budget agli avversari senza comprarli.

**Dipendenza.** Usa il `fair_value` prodotto da **P13a** (deve essere già a
copertura totale, altrimenti la lista sarebbe parziale) — va dopo P13, non in
parallelo.

**Contesto.** Non esiste un pattern statistico affidabile per "trappola"
(vedi nota di ricerca in `PLAN.md` — è un giudizio editoriale caso per caso su
Fantacalcio.it). La definizione operativa più solida con i dati in-app è
l'inverso delle "occasioni" già calcolate: FVM/prezzo di mercato alto ma
`fair_value` del motore basso (il mercato lo sopravvaluta rispetto al modello
→ probabile che un avversario ci spenda sopra). Guarda come
`recommendationEngine.ts`/`playerTags.ts` calcolano già il percentile
costo/valore (righe intorno a 462–494 di `recommendationEngine.ts`) prima di
scrivere una seconda logica di percentile ridondante.

**Lavoro.**
- Modulo puro (`shared/src`, accanto a `playerTags.ts` o dentro se il tag
  entra naturalmente nell'enum esistente — valuta tu) che marca un giocatore
  "trappola" quando FVM è in fascia alta del ruolo e `fair_value` è in fascia
  bassa/media, con soglie esplicite e documentate (non magic number senza
  commento).
- Tag manuale opzionale per lega (stessa forma di
  `user_valuation_override`/`user_team_pref`: layer sparso, non sovrascrive il
  derivato) per i casi editoriali che il modello non cattura — coerente con
  l'invariante: il tag manuale è un flag di visualizzazione, non cambia
  `fair_value`.
- Lista "Giocatori trappola" (nuova vista o sezione di una esistente —
  `RecommendationsPage.tsx` è il posto naturale) con badge riusato in asta.

**Test.** Test del modulo puro (casi sopra/sotto soglia per ciascun lato,
ruoli diversi). Test del tag manuale (override additivo, non sostitutivo).

**Accettazione.** La lista mostra giocatori con mismatch prezzo/valore nella
direzione "costoso ma scarso", consultabile prima e durante l'asta, con
badge visibile nella schermata Asta come gli altri tag giocatore.

**Versioning.** `feat` → MINOR.
