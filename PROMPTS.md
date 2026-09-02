# PROMPTS.md — Fase 9 (nuovo listone 2026/27 e Valutazioni)

Prompt operativi per Claude Code, **in plan mode**. La Fase 7 (P1–P9), la fase
mobile (P10) e la Fase 8 (P11–P15, sotto in questo file) sono chiuse: la loro
traccia vive nel `CHANGELOG.md` e nella git history.

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

**Ordine storico Fase 8 (chiusa):** P11 → P12 → P13 (due agenti paralleli) →
P14 → P15. P12 tocca schema/import del pool giocatori: va chiuso prima di
P13, che genera valutazioni sull'intero pool. P15 dipende dal `fair_value`
prodotto da P13.

**Ordine Fase 9 (corrente):** P16 (due agenti paralleli) → **P17 e P18 in un
solo prompt, due agenti paralleli** (file disgiunti: P17 tocca solo
`index.css`, P18 tocca `recommendationEngine.ts`/`MergedValuationRow.tsx`/
`columnGlossary.ts`) → **P19 (due agenti paralleli)**, dopo P18 perché P19a
tocca di nuovo `MergedValuationRow.tsx`. Nessuna dipendenza di dati fra P16 e
il resto: può partire per prima o in parallelo a P17/P18.

---

## Fase 8 — correzioni post-asta reale *(chiusa, riferimento storico)*

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

**Metodologia — due fonti, ruoli diversi, non mescolarle.**

Per il **budget totale allocato a ogni reparto** (quanti crediti tarare in
totale su P/D/C/A prima di distribuirli tra i singoli giocatori), usa la
convenzione consolidata **confermata da tre fonti indipendenti** (dettaglio e
link in `PLAN.md` § Fase 8):
- Regola tradizionale (Fantacalcio.it, Fantacalcio Online): P 6-8%, D 12-20%,
  C 24-30%, A 42-60% secondo modulo/modificatore.
- Dati reali (Fantacalcio Online, 50.175 acquisti stagione 2026/27): P 6,6%,
  D 21,3%, C 34,0%, A 38,1%.
- Usa questi due intervalli come riferimento per tarare il totale per reparto
  (media pesata dei due, non un terzo numero inventato), con lo spostamento
  verso la difesa (+5-6 punti) quando `modificatori.difesa.enabled` è attivo
  nella lega.
- **Non usare** la ripartizione "corretta per il rischio" di fantacalcio.dev
  (C 40-43%, A 25%): è il modello di un solo sito, isolato rispetto alle
  altre fonti — una versione precedente di questo piano lo aveva preso come
  riferimento principale per errore.

Per la **fiducia (`confidence`) sul singolo giocatore**, invece, resta valido
e utile il backtest di [fantacalcio.dev — Fasce oneste 2026-27](https://fantacalcio.dev/report/fasce-oneste-2026-27)
(dati su 3 stagioni, testati su 2 aste, non solo dichiarati):
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
  ruolo), **con il totale di reparto vincolato al budget per reparto sopra**
  — coerente col replacement level già in `recommendationEngine.ts`, non una
  formula nuova scollegata.
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

---

## Fase 9 — nuovo listone 2026/27 e Valutazioni *(in corso)*

## P16 — Import Listone: virgolette non escapate + timeout su import di massa

**Due bug distinti sullo stesso percorso (import listone), su file diversi,
riprodotti separatamente: due agenti paralleli.** L'utente li ha incontrati in
sequenza (aggirando il primo con un find&replace manuale ha scoperto il
secondo), ma non sono la stessa causa — non risolverli insieme rischia di
lasciarne uno a metà.

### P16a — Fix parsing CSV con virgolette non escapate (agente 1)

**Obiettivo.** Il file allegato più recente
(`Lista-FantaAsta-Fantacalcio (1).csv`, 586 righe dati) non si importa:
`parseCsvRows` lancia un errore e abortisce prima di leggere una sola riga.

**Contesto — riprodotto.** `server/src/import/fileRows.ts`, `parseCsvRows`
usa `csv-parse/sync` senza `relax_quotes`. Riga 585 del file:
`7625,Goncalves P.,Goncalves "Pote" Pedro,C,W;T,...` — il campo `Nome
completo` contiene un soprannome tra virgolette **dentro un campo non
quotato**, che RFC4180 non prevede: `csv-parse` lancia `Invalid Opening
Quote: a quote is found on field 2 at line 585`. Verificato in locale che
aggiungendo `relax_quotes: true` alle opzioni di `parse(...)` il file si
legge correttamente (587 righe, incluso quel record con `Nome completo`
=`Goncalves "Pote" Pedro` preservato intatto). Non è un problema del file:
Fantacalcio.it usa correntemente virgolette per i soprannomi nei nomi
completi, quindi il caso si ripresenterà a ogni aggiornamento stagionale del
listone.

**Lavoro.**
- Aggiungi `relax_quotes: true` alle opzioni di `parse(...)` in
  `parseCsvRows` (`fileRows.ts`), con un commento che spiega il motivo
  (soprannomi tra virgolette nei campi non quotati del listone ufficiale) per
  non farlo sembrare un'opzione a caso.
- Verifica che `sniffDelimiter` non sia influenzato (la funzione conta le
  virgolette per tracciare `inQuotes` sulla prima riga: la riga 585 non è la
  prima riga, quindi il sniffing non cambia comportamento — conferma con un
  test, non solo a occhio).

**Test.** Aggiungi il file allegato come fixture reale sotto
`server/src/test/fixtures/` (nome esplicito, es.
`listone-2026-27-virgolette.csv`, o riusa la fixture di P12 se già presente
e integra la riga problematica se mancante) e un test che verifica: (a) il
parsing non lancia, (b) il numero di righe è quello atteso, (c) il record con
virgolette nel nome completo produce il valore corretto (`Goncalves "Pote"
Pedro`, non troncato). Aggiungi anche un test dedicato con un CSV minimo
sintetico (2-3 righe) che isola il caso, per non dipendere solo dalla
fixture grande.

**Accettazione.** Il file allegato si importa senza errori di parsing.

**Versioning.** `fix` → PATCH.

### P16b — Import listone in batch invece che riga per riga (agente 2)

**Obiettivo.** Anche con P16a risolto, un import di ~587 righe rischia il
timeout (524 Cloudflare Gateway Timeout) quando passa dal proxy same-origin.

**Contesto — causa isolata, non solo ipotizzata.**
`importPlayersFromRecords` (`server/src/import/playerImport.ts`) fa `await
upsertPlayer(...)` **una riga alla volta, in sequenza**, dentro l'unica
transazione aperta da `importListoneFromCsv`
(`server/src/import/listoneImport.ts`). Per 587 righe sono 587 round-trip di
rete sequenziali verso Neon. In produzione la richiesta passa dal browser
alla Cloudflare Pages Function `functions/api/[[path]].js`, che fa da proxy
verso Render (vedi README § Hosting, "Proxy API same-origin"): Cloudflare
applica un timeout edge sulla risposta di quella Function (l'errore 524 è
specificamente "gateway timeout", non un errore applicativo), e il piano free
di Render aggiunge un cold start se il servizio era in sleep. Il fix non è
lato Cloudflare/Render (fuori dal controllo del codice): è ridurre i
round-trip.

**Lavoro.**
- Sostituisci il ciclo di `upsertPlayer` per riga con un **upsert in batch**:
  una singola query `INSERT ... VALUES (...), (...), ... ON CONFLICT (...) DO
  UPDATE` (o batch da N righe, es. 100, se il driver/Postgres ha limiti
  pratici sul numero di parametri per query) invece di N query separate.
  `upsertPlayer` in `server/src/db/players.ts` ha già la logica di
  conflitto (`fanta_id` come chiave primaria, fallback `name+team`): non
  duplicarla, estrarre la stessa logica di conflitto in una funzione batch
  che la applica a un array di righe in una query sola. Se `fanta_id` è
  assente su alcune righe e presente su altre nello stesso batch, valuta se
  serve più di una query batch (una per chiave di conflitto) — non forzare
  tutto in un'unica istruzione SQL se la semantica di conflitto differisce
  per riga.
- Mantieni identico il comportamento riga-per-riga verso il chiamante:
  stesso `PlayerImportReport` (inserted/updated/discarded), stessi
  `upsertResults` allineati per indice (servono a `listoneImport.ts` per le
  quotazioni) — il refactor è solo nell'esecuzione delle query, non
  nell'interfaccia.
- Non toccare il path a header esistente (`importPlayersFromCsv`) se non
  serve: applica il batching dove il volume è alto (listone posizionale,
  centinaia di righe), verifica se ha senso condividerlo anche lì una volta
  scritto.

**Test.** Test di integrazione con un pool giocatori esistente e ~500+ righe
di fixture sintetiche: verifica che il numero di query verso il DB sia
dell'ordine di poche decine (batch), non centinaia (con un mock/spy sul
client se il test attuale lo permette), a parità di risultato
(inserted/updated/discarded identici alla versione riga-per-riga). Se non è
misurabile il conteggio query nell'ambiente di test, verifica almeno il
tempo di esecuzione su una fixture da 500+ righe e documenta la soglia
scelta come regressione futura.

**Accettazione.** L'import del file allegato (dopo P16a) completa entro
tempi compatibili con il timeout edge di Cloudflare anche a freddo (Render
sveglio da un cold start), senza errore 524.

**Versioning (per entrambi P16a/P16b, un solo commit/tag a fine prompt).**
`fix` → PATCH (nessun cambio di schema o di interfaccia pubblica).

---

## P17 — Fix ritaglio foto calciatori in Valutazioni (e ovunque non sia "hero")

**Da eseguire nello stesso prompt di P18, come agente indipendente: nessun
file in comune (questo tocca solo `index.css`).**

**Obiettivo.** Le foto dei calciatori nella tabella Valutazioni appaiono
tagliate in basso — lo stesso sintomo già corretto per lo slot "hero" in
asta (`CHANGELOG.md` `v5.0.0`), non esteso alle altre taglie.

**Contesto.** `web/src/index.css`, regola `.photo-box` (circa riga 1024):
`background-size: cover; background-position: center top`, ereditata da
tutte le taglie (`sm` 30px, `md` 44px, `lg` 64px, `hero` 168×232). Solo
`.photo-box--hero` (riga ~1069) sovrascrive con `background-size: contain`.
Un campioncino Fantacalcio è un'immagine verticale (più alta che larga): in
un riquadro quasi quadrato (`sm`/`md`/`lg`), `cover` + `center top` inquadra
la testa e ritaglia tutto ciò che sta sotto (stemma, numero, parte del
busto) — esattamente il difetto segnalato, e la Vista Valutazioni
(`ValuationsPage.tsx`/`MergedValuationRow.tsx`) usa `PlayerAvatar` in taglia
`sm`/`md` per la colonna nome.

**Lavoro.**
- Decidi ed applica una soluzione coerente per `sm`/`md`/`lg`: l'opzione più
  semplice e coerente con il fix già fatto per `hero` è portare anche queste
  taglie a `background-size: contain` (l'immagine intera entra nel
  riquadro, con margini laterali sul fondo tinta-ruolo già esistente,
  nessun ritaglio) — verifica visivamente che a 30px/44px il risultato
  resti leggibile (il fondo tinta-ruolo diventa più visibile ai lati).
  Se `contain` a taglia `sm` risulta troppo piccolo/illeggibile, valuta in
  alternativa un `background-position` diverso (es. spostare il punto di
  focus più in alto senza arrivare al bordo) che riduca il ritaglio senza
  cambiare `background-size` — ma preferisci `contain` per coerenza con
  `hero`, a meno che il test visivo dica il contrario.
- Non toccare `PlayerAvatar.tsx` (il componente non ha logica di
  crop, è tutto nel CSS) né il fallback iniziali/placeholder (invariato).

**Test.** Screenshot prima/dopo della tabella Valutazioni (righe con foto
presente) e della vista Asta per le taglie toccate, per verifica visiva —
non c'è logica pura da testare in unit test, il cambio è puramente CSS.

**Accettazione.** Le foto dei calciatori nella tabella Valutazioni (e in
ogni altro punto che usa `photo-box` in taglia `sm`/`md`/`lg`) mostrano il
soggetto senza tagli visibili nella parte bassa dell'immagine.

**Versioning.** `fix` → PATCH.

---

## P18 — Fantamedia della scorsa stagione al posto di "Fm regolata"

**Da eseguire nello stesso prompt di P17, come agente indipendente: file
diversi (`shared/src/recommendationEngine.ts`,
`web/src/components/MergedValuationRow.tsx`, `web/src/lib/columnGlossary.ts`,
`web/src/pages/ValuationsPage.tsx`), nessuna sovrapposizione con P17
(`index.css`).**

**Obiettivo.** Nella tabella Valutazioni, la colonna oggi etichettata "Fm
regolata" deve mostrare la Fantamedia **reale** dell'ultima stagione, non
quella ricostruita dalle regole di lega.

**Contesto — sono due grandezze diverse, già entrambe nel codice.**
- `leagueAdjustedFm` (`shared/src/recommendationEngine.ts`,
  `PlayerRecommendationComponents.leagueAdjustedFm`): fantamedia
  *ricostruita* — `mv − 6.0 + bonus/malus per presenza + bonus difesa +
  bonus portiere`, secondo le regole della lega corrente. È quella mostrata
  oggi in `MergedValuationRow.tsx` riga ~190 e usata internamente per lo
  score (non toccare quell'uso interno, resta necessario per il calcolo).
- `PlayerSeasonStatsRow.fm` (`shared/src/playerSeasonStats.ts`): fantamedia
  **reale** importata dall'ultima stagione (voto medio con bonus/malus
  realmente accaduti). Esiste già nei dati di input dell'engine (`stats:
  PlayerSeasonStatsRow[]` in `RecommendationEngineInput`) e ha già una voce
  nel glossario (`columnGlossary.ts`, chiave `fm`, label "Fm", tooltip
  "Fantamedia importata dell'ultima stagione: voto medio con bonus/malus
  reali.") — ma **non è propagata** in `PlayerRecommendationComponents` né
  arriva a `MergedValuationRow.tsx`: oggi nella colonna "Fm regolata" della
  vista Valutazioni non ha alcuno spazio.

**Lavoro.**
- In `computePlayerRecommendations` (`recommendationEngine.ts`), quando si
  recupera lo `stat` del giocatore per calcolare `leagueAdjustedFm`, leggi
  anche `stat.fm` (può essere `null` se il giocatore non ha statistiche
  stagione precedente, es. debuttante/neopromosso — non inventare un
  fallback numerico) e aggiungilo a `PlayerRecommendationComponents` come
  nuovo campo (es. `fmScorsaStagione: number | null`), senza rimuovere
  `leagueAdjustedFm` (resta usato per lo score).
- In `MergedValuationRow.tsx`, sostituisci il valore mostrato nella colonna
  "Fm regolata" (riga ~190) con `r.components.fmScorsaStagione` (fallback
  `"—"` se `null`, stesso pattern già usato per `leagueAdjustedFm`).
- In `columnGlossary.ts`: aggiorna la voce usata da quella colonna in
  `ValuationsPage.tsx` (oggi `leagueAdjustedFm`, label "Fm regolata") perché
  punti a un'etichetta/tooltip coerenti con il nuovo contenuto (es. "Fm
  scorsa stagione", tooltip ripreso/adattato da quello già scritto per la
  chiave `fm` esistente) — valuta se riusare la chiave `fm` già presente nel
  glossario invece di duplicarla, visto che descrive esattamente questo
  dato.
- Non toccare `ScoreBreakdownDialog.tsx`: il modale "Dettagli" continua a
  mostrare la scomposizione dello score, che si basa su
  `leagueAdjustedFm` — quello resta corretto e va lasciato invariato.

**Test.** Aggiorna `recommendationEngine.test.ts` con un caso che verifica
`fmScorsaStagione` propagato correttamente da `stat.fm` (incluso il caso
`stat.fm === null`, debuttante). Test di rendering di `MergedValuationRow`
(o il test esistente che copre quella riga) che verifichi la colonna mostri
il nuovo valore, non più `leagueAdjustedFm`.

**Accettazione.** La colonna nella tabella Valutazioni mostra la Fantamedia
reale dell'ultima stagione (coerente col dato del listone/statistiche
importate), non più il valore ricostruito dalle regole di lega; quest'ultimo
resta disponibile nei "Dettagli" per chi vuole vedere la scomposizione dello
score.

**Versioning (per P17+P18, un solo commit/tag a fine prompt).** `feat` →
MINOR (il dato mostrato cambia significato per l'utente, non è un puro
fix visivo come P17).

---

## P19 — Budgettizzazione in percentuale e budget target per ruolo

**Due lavori indipendenti sullo stesso obiettivo di fondo (spendere il
budget in modo consapevole per reparto), su file diversi: due agenti
paralleli nello stesso prompt. Va dopo P18, che tocca di nuovo
`MergedValuationRow.tsx`.**

### P19a — Inserire una percentuale di budget e ricavare il max bid (agente 1)

**Obiettivo.** In Valutazioni, poter inserire una percentuale del budget di
lega per un giocatore e ottenere il max bid in crediti calcolato
automaticamente, in alternativa a scriverlo direttamente in crediti.

**Contesto.** `MergedValuationRow.tsx` ha già un input libero per
`max_bid` (funzione `cellInput`, riga ~214), che scrive
sull'override esistente (`user_valuation_override`, layer sparso,
`effettivo = override ?? base` — invariante da rispettare, non introdurre
un secondo campo di stato). Il budget di lega è già disponibile lato client
(usato altrove per FVM ponderato, `valuationScale.ts`/`DEFAULT_BUDGET` o il
budget reale della lega corrente — verifica quale sia già in scope nel
componente prima di ripescarlo da un'altra route).

**Lavoro.**
- Aggiungi, accanto (non al posto) all'input `max_bid` in crediti, un modo
  di inserire una percentuale (es. un secondo input più piccolo con `%`, o
  un toggle che cambia l'unità dello stesso input — scegli l'opzione che
  minimizza il diff e resta leggibile in una riga di tabella già densa).
  Al blur/submit della percentuale, calcola `max_bid = round(percentuale /
  100 * budget)` e scrivilo nello stesso override `max_bid` già esistente
  (non un campo nuovo nello schema: la percentuale è solo un modo di
  inserimento, il dato persistito resta in crediti, coerente con
  l'invariante "nessun campo mutabile di stato" e con FVM/valuation che
  sono sempre derivati/riscalati, mai duplicati).
  Se serve mostrare la percentuale accanto al valore in crediti dopo il
  salvataggio (per rieditarla), ricavala a display come `max_bid / budget *
  100` — derivata, non salvata.
- Arrotonda in modo esplicito e documentato (es. `Math.round`, non
  troncamento silenzioso) e gestisci il caso budget non ancora caricato
  (disabilita l'input percentuale finché il budget non è noto, non
  calcolare con un default inventato).

**Test.** Test del calcolo puro (percentuale → crediti, arrotondamento,
casi limite 0%/100%) — se la funzione di conversione è pura, estraila in
`shared/src` o in un modulo web testabile isolatamente invece di inlinarla
nel componente. Test di interazione sulla riga (inserimento percentuale →
valore in crediti scritto nell'override corretto).

**Accettazione.** In Valutazioni si può impostare il max bid di un
giocatore inserendo una percentuale del budget di lega, con il valore in
crediti calcolato e salvato coerentemente con l'override esistente.

### P19b — Budget target per ruolo: percentuali obiettivo, avviso, residuo (agente 2)

**Obiettivo.** Configurare per lega percentuali obiettivo di budget per
ruolo (es. P 10% / D 20% / C 30% / A 40%), avvisare quando un manager si
avvicina o supera la soglia del proprio reparto, e mostrare sempre il
budget residuo di quel reparto.

**Contesto — non esiste ancora nulla di questo.** `LeagueRulesConfig`
(`shared/src/league.ts`) non ha un concetto di allocazione budget per
reparto. `ManagerAuctionStatus.slots` (`shared/src/purchase.ts`) conta solo
slot liberi/occupati per ruolo, non crediti spesi per ruolo — serve un
nuovo derivato dal log `purchase` (join con `player.ruolo`), coerente con
l'invariante: **nessun campo mutabile**, la spesa per ruolo si calcola a
ogni richiesta sommando `purchase.prezzo` per manager e ruolo del
giocatore acquistato, non si memorizza.

**Lavoro.**
- Estendi lo schema lega: nuovo campo (es. `budgetTargetByRole: { P: number;
  D: number; C: number; A: number }`, percentuali) in
  `createLeagueSchema`/`leagueSchema` (`shared/src/league.ts`), con
  validazione che la somma sia 100 (o vicino, decidi la tolleranza e
  documentala) — **non** forzare una somma esatta se complica UX di
  modifica progressiva, ma segnala in UI se non torna. Migrazione additiva
  sulla tabella `league` (colonna nullable o con default ragionevole
  desunto dalla convenzione di mercato in `PLAN.md` § Fase 8 ricerca
  esterna: P 6-8%, D 12-20%, C 24-30%, A 42-60% — **non inventare un default
  diverso**, riusa quei numeri già verificati su tre fonti).
- Nuovo derivato server-side: spesa per ruolo per manager, dal log
  `purchase` join `player.ruolo` (SQL o funzione pura sui dati già caricati,
  a seconda di dove oggi si costruisce `ManagerAuctionStatus` —
  `server/src/db/` o `shared/src/`, segui il pattern esistente per non
  introdurre una seconda fonte di verità). Aggiungi il risultato a
  `ManagerAuctionStatus` (nuovo campo, es. `spentByRole: { ruolo: Role;
  spent: number; target: number; residuo: number }[]`) o esponilo come
  endpoint/selettore dedicato se `ManagerAuctionStatus` è già usato in path
  dove il costo aggiuntivo non è giustificato — valuta tu, ma non duplicare
  la query di somma in più punti.
- UI: budget residuo per ruolo visibile in modo permanente (Overview o
  pannello lega esistente — non una pagina nuova se una esistente si presta)
  e avviso contestuale in asta quando il manager (almeno "Io"; valuta se
  estendere agli avversari visti in P14 una volta che il derivato esiste)
  sta per superare la soglia del reparto del giocatore in chiamata — soglia
  di "avvicinamento" esplicita e documentata (es. 90% della quota target),
  non un numero magico senza commento.

**Test.** Test del derivato spesa-per-ruolo (fixture di acquisti misti,
verifica somma corretta per manager e ruolo, incluso il caso zero acquisti).
Test di validazione dello schema lega (somma percentuali, valori negativi
rifiutati). Test dell'avviso di soglia (sotto/sopra il 90%, sopra il 100%).

**Accettazione.** Una lega può impostare percentuali obiettivo di budget per
ruolo; durante l'asta è sempre visibile quanto budget resta per il reparto
del giocatore in chiamata, e un manager riceve un avviso quando si avvicina
o supera la propria quota di reparto.

**Versioning (per P19a+P19b, un solo commit/tag a fine prompt).** `feat` →
MINOR (P19b include una migrazione additiva, ma senza breaking change sullo
schema esistente).
