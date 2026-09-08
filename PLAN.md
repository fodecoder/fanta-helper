# PLAN.md — Sequenza di feature

Fasi ordinate, dalla più vecchia alla più recente. Storico compatto in fondo.

> Stato al 2026-09-08 — `v6.5.2`. Fasi 0–10 sono **complete**: scaffolding, MVP,
> engine di consiglio su valore relativo alla lega, dati storici Serie A,
> redesign Broadsheet poi "sportsbook", multiutente (login, personalizzazione,
> chat), sessione mobile, le 9 correzioni della Fase 8 (palette ruolo, import
> listone posizionale con `fanta_id`/nome completo/fallback foto, valutazioni a
> copertura totale, FVM ponderato al budget, vista avversari in asta,
> giocatori trappola) e le 6 correzioni della Fase 9 (import CSV robusto,
> budget in percentuale e per reparto, foto non tagliate, Fantamedia reale in
> Valutazioni) più le aggiunte fatte nello stesso periodo ma fuori dai 6 punti
> originali: generazione offline del listino base, colonne ordinabili in
> Valutazioni, tolleranza ai decimali in import, disattivazione automatica
> svincolati al re-import listone, conferma di sovrascrittura override al
> re-import valutazioni, import probabili formazioni/rigoristi/punizioni via
> JSON al posto di screenshot (`v5.2.0`→`v6.0.0`, dettagli nel
> [CHANGELOG.md](./CHANGELOG.md)). L'audit di verifica P1–P9 resta più sotto
> per riferimento, le Fasi 8, 9 e 10 (P11–P24) sono tracciate come chiuse
> subito sotto.
>
> **Fase 10 (chiusa, `v6.1.0`→`v6.5.2`)**: 5 feature richieste dall'uso reale
> in preparazione d'asta — edit manager più diretto (P20), secondo/terzo
> portiere alla chiamata (P21), "segna come obiettivo" wishlist in
> Valutazioni (P23), export PDF della lista valutazioni (P22), nota di
> scouting evidenziata in asta (P24). Commit: `3615943`, `e097cf9`,
> `95cf77d`, `f11b37d`, `6f143c1`. Prompt originali in
> [PROMPTS.md](./PROMPTS.md). In parallelo, ricalibrazione dei due listini
> valutazioni (lega da 8 e da 10, budget 1000) sui prezzi medi realmente
> pagati in asta — lavoro sui dati, non sul codice, descritto sotto in
> "Ricalibrazione valutazioni 07/09/2026".
>
> **In corso — Fase 11 (v7.0, restyling Asta)**: 8 richieste di restyling
> della schermata Asta raccolte dall'uso reale (listone collassabile,
> alternative compatte e paginate, verdetto/barra fair-value vicino al nome,
> stato avversari sotto il giocatore in chiamata con drag&drop/cancellazione
> diretta, storico ridotto a un bottone). Prompt operativi P25–P31 in
> [PROMPTS.md](./PROMPTS.md). A differenza delle fasi precedenti i prompt non
> sono quasi mai file-disjoint (convergono quasi tutti su
> `AuctionDesktop.tsx`/`AuctionPhone.tsx`): la nota di parallelizzabilità è
> nella sezione dedicata di `PROMPTS.md`, non qui.

## Fase 8 — Correzioni post-asta reale  *(chiusa)*

Tutti i 9 punti sono implementati (P11–P15 in `PROMPTS.md`, storia completa nel
`CHANGELOG.md` e nella git history: `e79402d` palette ruolo, `30fdd0d`/`f559d13`
import posizionale + fix duplicati, `2e40bdf` valutazioni a copertura totale +
FVM ponderato, `2711a58` vista avversari, `c51e09e` giocatori trappola).
Elenco originale dei problemi mantenuto sotto per riferimento.

Trovati usando l'app in un'asta vera a 10. Ognuno verificato sul codice (non
solo riportato) prima di essere messo in prompt.

1. **Palette ruoli sbagliata.** Solo P (giallo) è corretto. `web/src/index.css`
   righe 51–54: D usa `--color-accent` (arancione), C usa `--color-neutral-700`
   (grigio), A usa `--color-accent-2` (magenta) — invece di blu/verde/rosso.
2. **Valutazioni incomplete.** `docs/sample/asta_1000_lega8.json` e
   `lega10.json` coprono **79 giocatori ciascuno** su un pool di ~550+. Il
   meccanismo di seed (`POST /leagues` → `seedDefaultValuationsForLeague`)
   funziona: è la copertura dati a mancare, non il collegamento. Durante
   l'asta, giocatori chiamati fuori da quei 79 risultano senza valutazione.
3. **Nessuna vista avversari in asta.** `ManagersPage.tsx` mostra già le rose
   per manager, ma solo come pagina separata — non è agganciata alla schermata
   Asta mentre un giocatore viene chiamato. Manca un pannello "cosa hanno già
   preso gli avversari" (big presi, slot liberi, crediti residui e crediti
   spendibili sul giocatore in asta).
4. **FVM non ponderato ai crediti.** Risposta: no. `recommendationEngine.ts`
   usa FVM come percentile relativo per ruolo (corretto per l'ordinamento), ma
   la Vista Asta lo mostra anche come proxy di prezzo assoluto senza
   riscalarlo al budget di lega — a differenza di `valuation`, che ha un
   riscalaggio esplicito su base 1000 (`valuationScale.ts`). FVM ufficiale è
   su base standard 500 crediti: con budget di lega diverso il numero mostrato
   non è comparabile a quanto si spenderà davvero.
5. **Nuovo formato listone, import incompatibile.** Il file allegato
   (`Lista-FantaAsta-Fantacalcio.csv`) non ha riga di intestazione: 19 colonne
   posizionali (Id, Nome, Nome completo, Ruolo, Ruolo Mantra, 4 colonne
   quotazione — uguali a inizio stagione, Squadra, FVM×2, Piede, Nazionalità,
   Data di nascita, URL foto, flag, Mv, Fm — **mappatura da confermare
   leggendo il file, non assunta a scatola chiusa**). L'importer attuale
   (`playerImport.ts`, `PLAYER_REQUIRED_COLUMNS`) richiede header con nomi
   esatti (`R`, `Nome`, `Squadra`) e scarta il resto. La UI di import ha anche
   un nome non parlante, da rinominare "Import Listone".
6. **Duplicati quando un giocatore cambia squadra.** Bug confermato in
   `server/src/db/players.ts`, `upsertPlayer`: il vincolo `ON CONFLICT (name,
   team)` non scatta se il `team` cambia tra un import e l'altro (stesso nome,
   squadra diversa → nuova riga anziché update della squadra sulla riga
   esistente).
7. **Giocatori trappola, concetto assente.** Non esiste oggi. Editorialmente
   (Fantacalcio.it) sono nomi ad hype che deludono in campo; per l'uso
   dichiarato ("farli chiamare per far spendere gli avversari") la
   definizione operativa più solida e già calcolabile con i dati in-app è
   l'inverso delle "occasioni" già segnalate dall'engine: FVM/prezzo di
   mercato alto ma `fair_value` del motore basso. Da esporre come lista
   dedicata, con tag manuale opzionale per i casi editoriali puri.
8. **Nome completo assente.** `player` non ha un campo `nome_completo`; oggi
   si mostra solo il nome abbreviato del listone. Il nuovo listone lo fornisce
   in colonna propria.
9. **Foto campioncini senza fallback.** `PlayerAvatar.tsx` usa `image_url`
   senza gestione d'errore: un link scaduto o vietato rompe l'immagine invece
   di ricadere sul placeholder squadra+ruolo già esistente nel componente.

### Ricerca esterna a supporto (per i prompt su valutazioni ed engine)

**Budget per reparto — tre fonti, numeri diversi, verificate una contro
l'altra dopo una prima versione di questo piano che si appoggiava solo alla
più anomala delle tre.**

- **Regola tradizionale (20 anni, ripetuta identica da Fantacalcio.it e
  Fantacalcio Online):** portieri 6-8%, difensori 12-20%, centrocampisti
  24-30%, attaccanti 42-60% a seconda di modulo/modificatore. È quella che hai
  trovato tu ed è la convenzione dominante nel settore — **questa è la fonte
  primaria da usare**, non quella che avevo messo prima.
- **[Fantacalcio Online — dati reali](https://www.fantacalcio-online.com/it/consigli-fantacalcio/consigli-asta-fantacalcio-come-dividere-il-budget):**
  non un'opinione, la spesa **effettiva** misurata su 50.175 acquisti reali
  stagione 2026/27: portieri 6,6%, difensori 21,3%, centrocampisti 34,0%,
  attaccanti 38,1%. Si scosta dalla regola classica ma nella direzione
  opposta a quanto avevo scritto prima (più centrocampo, meno attacco, ma
  l'attacco resta comunque il reparto di spesa maggiore, non un terzo).
  Con modificatore difesa attivo la quota difesa sale di circa 5-6 punti
  (dato coerente anche in Fantacalcio.it: 40-80 crediti su 500, cioè 8-16%,
  contro 40 senza modificatore).
- **fantacalcio.dev — [Fasce oneste 2026-27](https://fantacalcio.dev/report/fasce-oneste-2026-27):**
  la fonte che avevo usato per la ripartizione budget nella prima versione di
  questo piano. Il suo backtest su tasso di conferma per ruolo (centrocampisti
  62%, difensori 54%, attaccanti/portieri 33%, soglia minima 15 fantavoti per
  fidarsi di una fantamedia) resta utile e **lo teniamo** per calibrare la
  `confidence` per riga in P13a. Ma la sua ripartizione budget "corretta per
  il rischio" (centrocampisti 40-43%, attaccanti 25%) è un modello di **un
  solo sito, non confermato da nessun'altra fonte** e in contrasto sia con la
  convenzione sia con i dati reali di spesa sopra — va scartata come
  riferimento per il budget, non solo corretta: non è "un'altra fascia", è
  un outlier isolato che avevo trattato come se fosse consenso.
- **Fantacalcio.it — [5 trappole](https://www.fantacalcio.it/consigli-fantacalcio/06_09_2022/consigli-asta-fantacalcio-trappole-429090):**
  conferma che "trappola" è un giudizio editoriale caso per caso (rischio
  minutaggio, infortuni, concorrenza interna alla squadra) — non un pattern
  statistico fisso, altro motivo per trattarlo come tag anche manuale, non
  solo derivato.
- Ricerca sul formato esatto del CSV allegato non ha trovato documentazione
  ufficiale pubblica della colonna-per-colonna: la mappatura in punto 5 resta
  un'ipotesi da validare sul file reale in fase di implementazione.

### Audit P1–P9 (verificato sul codice, 2026-08-29)

Tutti implementati, con test per i moduli puri. Nessun elemento parziale/mancante.

| P | Evidenza principale |
|---|---|
| P1 | `shared/src/recommendationEngine.ts` — `portiereBonus`, `blendDifesaMv`, `difesaBonus`, `pBonus`; `recommendationEngine.test.ts` |
| P2 | `recommendationEngine.ts` — `MV_BASELINE`, `LINEUP_STATO_RELIABILITY`, `reliability`/`rawValue` |
| P3 | `shared/src/playerTags.ts` + `playerTags.test.ts`; `server/src/db/recommendations.ts` (`computePlayerTags`); badge in `RecommendationsPage.tsx` / `auction/*` |
| P4 | migrazioni `1787811995007_app-user.sql`, `1787811996024_manager-user-id.sql`; `server/src/routes/auth.ts`, `server/src/auth/*`, `http/requireAuth.ts`, `db/seedUsers.ts`; `web/src/pages/LoginPage.tsx`, gate `App.tsx` |
| P5 | campi `avatar`/`avatar_color` su `app_user`; `shared/src/avatar.ts`; `web/src/components/UserAvatar.tsx`, `shell/ProfileModal.tsx`, `shell/UserMenu.tsx` |
| P6 | migrazione `1787961600000_user-personalization.sql`; `server/src/db/{valuationOverrides,teamPrefs}.ts`, `routes/{valuations,teamPrefs}.ts`; `shared/src/teamPreferences.ts` + `teamPreferences.test.ts`; `web/src/components/{TeamPrefPanel,ValuationOverrideRow}.tsx` |
| P7 | migrazione `1788048000000_chat-message.sql`; `server/src/routes/chat.ts`, `db/chat.ts`; `web/src/components/shell/ChatPanel.tsx`, `web/src/api/chat.ts` |
| P8 | `web/public/sofifa-logo*.png`; `web/src/pages/LoginPage.tsx`; `web/src/pages/auction/AuctionDesktop.tsx` |
| P9 | `web/src/components/ui/{Dialog,InfoLabel,TeamPrefBadge}.tsx`, `ScoreBreakdownDialog.tsx`, `lib/columnGlossary.ts`; `recommendationEngine.ts` `breakdown` + `normalizeScoresByRole` + test; `maxBid.ts` `explainAdjustedMaxBid`; `playerTags.ts` ristretto a `"D"` + test |

Aggravante nota (candidata a prompt successivo): dopo `POST /auth/login` il
client non riverifica `/auth/me` (`web/src/App.tsx`), quindi quando il cookie di
sessione non persiste si resta «loggati ma tutto 401» invece di tornare al login.

## Fase 9 — Nuovo listone 2026/27 e primo uso reale delle Valutazioni  *(chiusa)*

Tutti i 6 punti sono implementati (P16–P19 in `PROMPTS.md`, storia completa nel
`CHANGELOG.md` e nella git history: `1115865` parsing CSV con virgolette,
`316b115` import a lotti anti-timeout, `93c8c4f` max bid da percentuale,
`f35d7a8`+`5655fa2` budget per reparto, `f39957a` Fantamedia reale + foto non
tagliate). Elenco originale dei problemi mantenuto sotto per riferimento.

Trovati caricando il nuovo export "Lista FantaAsta" 2026/27 e usando la pagina
Valutazioni in preparazione d'asta. Ognuno riprodotto sul codice (non solo
riportato) prima di essere messo in prompt.

1. **Import listone: virgolette non escapate rompono il parsing.** Riprodotto:
   `parseCsvRows` (`server/src/import/fileRows.ts`, `csv-parse/sync`) lancia
   `Invalid Opening Quote` alla riga 585 del file allegato
   (`Goncalves "Pote" Pedro` — un `"` non escapato dentro un campo non
   quotato, es. soprannomi tra virgolette nel nome completo). Fix isolato:
   `csv-parse` supporta `relax_quotes: true` per questo caso esatto — verificato
   in locale che con l'opzione il file si parsa correttamente (587 righe,
   incluso il record con l'apostrofo).
2. **Timeout 524 sull'import di massa, dopo aver aggirato il punto 1.**
   Riprodotto a livello di causa: `importPlayersFromRecords`
   (`server/src/import/playerImport.ts`) fa un `await upsertPlayer(...)` per
   riga, in sequenza, dentro un'unica transazione — per 587 righe sono altrettanti
   round-trip di rete verso Neon, uno alla volta. In produzione la richiesta
   passa dal browser alla Cloudflare Pages Function
   (`functions/api/[[path]].js`) che la inoltra a Render: Cloudflare applica un
   timeout edge (~100s, l'errore 524 è specificamente suo) sulla risposta di
   quella Function, e Render free-tier aggiunge un cold start quando il
   servizio è in sleep. Centinaia di round-trip sequenziali superano
   facilmente la soglia. Il fix del punto 1 **non risolve** questo problema:
   sono due bug distinti sullo stesso percorso, il secondo emerge solo dopo
   aver aggirato il primo (motivo per cui l'utente li ha visti in sequenza).
3. **Budgettizzazione in percentuale nelle Valutazioni.** Oggi `max_bid` in
   `ValuationsPage`/`MergedValuationRow.tsx` si inserisce solo in crediti
   assoluti. Richiesta: poter inserire una percentuale del budget di lega e
   ricavarne il max bid in crediti automaticamente.
4. **Budget target per ruolo, con avviso di sforamento e residuo per ruolo.**
   Non esiste oggi alcun concetto di allocazione budget per reparto in
   `LeagueRulesConfig` (`shared/src/league.ts`) né una spesa-per-ruolo
   derivata dal log `purchase` (`ManagerAuctionStatus.slots` ha solo conteggi
   di slot, non crediti spesi per ruolo). Richiesta: percentuali obiettivo
   configurabili per lega (es. P 10% / D 20% / C 30% / A 40%), un avviso
   quando un manager si avvicina/supera la soglia del proprio reparto, e la
   quota residua di quel reparto sempre visibile.
5. **Foto calciatori tagliate in basso nelle Valutazioni.** Stesso bug già
   corretto per lo slot "hero" dell'asta (`CHANGELOG.md` `v5.0.0`), non esteso
   alle altre taglie: `.photo-box` in `web/src/index.css` usa
   `background-size: cover; background-position: center top` per le taglie
   `sm`/`md`/`lg`, e solo `.photo-box--hero` ha il fix (`contain`). Su un
   campioncino verticale (foto più alta che larga) dentro un riquadro quasi
   quadrato, `cover` + `center top` mantiene il volto in vista e ritaglia lo
   stemma/le gambe in fondo — esattamente il sintomo riportato.
6. **"Fm regolata" nelle Valutazioni, da sostituire con la Fantamedia reale
   dell'ultima stagione.** Sono due grandezze diverse già presenti nel
   codice, non la stessa cosa rinominata: `leagueAdjustedFm`
   (`shared/src/recommendationEngine.ts`, colonna "Fm regolata" secondo
   `columnGlossary.ts`) è una fantamedia *ricostruita* con le regole di lega
   (mv − 6 + bonus/malus + modificatori); `PlayerSeasonStatsRow.fm`
   (`shared/src/playerSeasonStats.ts`) è la fantamedia *reale* importata
   dall'ultima stagione, già definita nel glossario ("Fantamedia importata
   dell'ultima stagione: voto medio con bonus/malus reali") ma **non
   propagata** in `PlayerRecommendationComponents` né mostrata in
   `MergedValuationRow.tsx` — oggi in quella colonna della vista Valutazioni
   compare solo la versione ricostruita.

### Ricerca esterna a supporto (formazioni, rigoristi, punizioni)

Fatta il 2026-09-02, dopo le prime due giornate di campionato — i due seed
statici in `server/src/scripts/data/` (`probableLineupsSeed.ts`,
`setPieceTakersSeed.ts`) erano scritti prima dell'inizio stagione e non
riflettevano le prime due giornate né gli ultimi giorni di mercato.
Aggiornati con fonti datate, non a memoria:

- **Formazioni titolari e moduli**, tutte le 20 squadre: [Fantacalcio
  Online — Probabili formazioni Serie A
  2026/27](https://www.fantacalcio-online.com/it/consigli-fantacalcio/probabili-formazioni-serie-a)
  (pubblicato 12/08, aggiornato 01/09/2026, consenso di 11 guide all'asta).
  Include due ballottaggi in porta segnalati esplicitamente dalla fonte
  (Torino Paleari 54%/Mascardi 46%, Parma Daffara 51%/Corvi 49%): usato il
  favorito, ballottaggio annotato nel seed.
- **Rigoristi**, gerarchia numerata per tutte le 20 squadre: [Goal.com —
  Rigoristi Serie A
  2026/2027](https://www.goal.com/it/liste/fantacalcio-rigoristi-serie-a-2026-2027-tiratori-e-gerarchie-dal-dischetto-delle-20-squadre-del-campionato/bltdebca56c3bd91419)
  (pubblicato 29/08, aggiornato 01/09/2026) — unica fonte trovata con
  gerarchia esplicita 1°/2°/3° invece del solo nome designato.
  **Verificato contro** la tabella rigoristi di Fantacalcio Online (stesso
  articolo di cui sopra): il primo rigorista **non coincide su 6 squadre su
  20** (Atalanta, Cagliari, Fiorentina, Lecce, Milan) — gerarchie
  effettivamente aperte a inizio stagione (cambi di allenatore, mercato
  ancora fresco al momento della scrittura), non un errore di trascrizione;
  annotato squadra per squadra nei commenti del seed. Una riga (Lazio,
  Gudmundsson come 2° rigorista secondo Goal.com) non è confermata da
  nessun'altra fonte consultata ed è segnalata come possibile refuso della
  fonte stessa.
- **Punizioni** (calci piazzati diretti), tutte le 20 squadre: [SOS Fanta /
  Gazzetta dello Sport — Tutti i tiratori di corner e punizioni in Serie A
  2026/27](https://www.sosfanta.com/asta-fantacalcio/serie-a-2026-2027-tiratori-punizioni-corner-specialisti-fantacalcio-asta/)
  (pubblicato 28/08, aggiornato 31/08/2026). La fonte elenca anche i tiratori
  di corner separatamente: non copiati nel seed, che storicamente conflate le
  due specialità nel solo campo `punizione` (vedi commento nel file).
- **Composizione Serie A 2026/27 confermata invariata**: Venezia, Frosinone e
  Monza (promosse dalla B) restano le tre neopromosse rispetto alla stagione
  precedente — la lista squadre già presente nei due seed era corretta, non
  andava toccata.
- Questi due seed restano un **punto di partenza per l'inizio stagione**, non
  sostituiscono il refresh settimanale in-app via screenshot (formazioni) o
  la revisione manuale (rigoristi/punizioni): vanno tenuti d'occhio nelle
  prime giornate, specialmente sulle 6 gerarchie rigoristi discordanti sopra.

## Fase 10 — Rifiniture da uso reale in preparazione d'asta  *(chiusa)*

Tutti i 5 punti sono implementati (P20–P24 in `PROMPTS.md`, storia completa
nel `CHANGELOG.md` e nella git history: `3615943` apertura rapida modifica
manager, `e097cf9` portieri stessa squadra, `95cf77d` "segna come obiettivo",
`f11b37d` export PDF valutazioni, `6f143c1` nota di scouting in asta).
Elenco originale dei problemi mantenuto sotto per riferimento.

Richieste dopo aver usato l'app per preparare due liste valutazioni (lega da 8
e da 10) prima dell'asta vera. Ognuna verificata sul codice esistente prima di
essere messa in prompt — nessuna è partita da zero, tutte riusano
meccanismi/pattern già presenti.

1. **Click su un manager non porta alla pagina di modifica.** `ManagersPage`
   (`web/src/pages/ManagersPage.tsx`) ha già il rename inline (input diretto
   in tabella, `commitRename`), ma la tabella "Stato dei manager" di
   `OverviewPage` (`web/src/pages/OverviewPage.tsx`, righe 130–170, colonna
   `s.managerName`) mostra il nome come testo statico, non collegato. `App.tsx`
   non passa a `OverviewPage` alcuna callback di navigazione (oggi riceve solo
   `league`/`calls`) — va aggiunta, sul modello di come `Sidebar`/`setPage`
   già gestiscono `SetupPage`.
2. **Alla chiamata di un portiere, niente secondo/terzo portiere della stessa
   squadra né consiglio dalla griglia portieri.** Esiste già
   `GkPairingHint`/`gkPairingSuggestion` (`AuctionMode.tsx`, uso in
   `AuctionDesktop.tsx` riga 748) ma è un suggerimento di *accoppiata fra
   squadre diverse* per il calendario, sempre visibile in colonna "Io" — non
   la lista dei portieri della *stessa* squadra del giocatore chiamato. Il
   pool completo (`players`, stato in `AuctionMode.tsx` riga 190) e la logica
   di confronto alternative stesso ruolo (righe 488–498, usata altrove) sono
   il punto di partenza per filtrare per squadra+ruolo=P quando
   `selectedPlayer.ruolo === "P"`.
3. **Export PDF della lista valutazioni.** Nessun export esiste oggi.
   Template fornito dall'utente (`guida-asta-lega10-redesign.pdf`, 14
   pagine): intestazione con nome lega/budget/data, 4 indicatori di riparto
   budget per ruolo (%, crediti indicativi), legenda tag colorati (Infortunio,
   In forma, Sottotono, Da verificare, Verifica ruolo), poi una tabella per
   ruolo (numerazione che riparte da 1 a ogni ruolo, colonne # / Giocatore /
   Squadra / Tier / Target / Max / Situazione / Acquistato-Note vuota per
   scrivere a mano durante l'asta), con una riga "Scelte top" sotto ogni
   titolo di sezione.
4. **Nessun modo di segnare un giocatore come obiettivo nella pagina
   Valutazioni.** Il modello wishlist esiste già per intero lato API
   (`web/src/api/wishlist.ts`: list/add/remove/reorder) ed è usato in asta,
   ma non in `ValuationsPage`/`MergedValuationRow.tsx`. Il pattern da
   replicare è quello già in uso per i giocatori trappola: stato
   `trapTagIds: Set<number>` + `toggleTrap` in `ValuationsPage.tsx` (righe
   53, 105–108) passato come prop `isTrap`/`onToggleTrap` a
   `MergedValuationRow` (stesso file, righe 22–23, bottone riga 305–312).

5. **Nota di scouting non visibile durante la chiamata, né evidenziata quando
   il giocatore viene battuto.** Il campo `note` della valutazione esiste ed
   è modificabile (`MergedValuationRow.tsx` righe 277–284) ma non compare
   nella vista Asta. La soglia di "battuto" non va inventata: esiste già in
   `verdict()`/`verdictTone()` (`web/src/lib/auctionDerivations.ts` righe
   74–90), che segna "Fuori mercato" quando `price > val.panic_price` — è il
   segnale da riusare per evidenziare la nota, non un valore nuovo.

## Fase 11 — Restyling Asta (v7.0)  *(in corso)*

8 richieste di restyling della schermata Asta, raccolte durante l'asta vera
del 08/09/2026 (screenshot allegati in chat, non nel repo). A differenza delle
fasi precedenti, quasi tutte convergono sugli stessi due file
(`AuctionDesktop.tsx`, `AuctionPhone.tsx`): l'analisi di parallelizzabilità
per gruppo è in `PROMPTS.md`, qui solo il contenuto verificato sul codice.

1. **Listone collassabile.** *(chiusa, `9b9c13c`, `v6.6.0`)* Bottone nella
   testata di `call-col` che la collassa a 48px (nasconde ricerca/filtri/
   lista), variabile CSS `--call-col-w` sulla classe modificatore
   `.auction-grid--call-collapsed` per non duplicare i breakpoint esistenti.
2. **Alternative limitate a 5 e paginate** + **alternative in un riquadro
   compatto vicino al giocatore** (due richieste, stessa superficie: la
   tabella `compareRows` oggi mostra tutte le righe libere senza paginazione,
   `AuctionDesktop.tsx` righe 468–751). Da unificare in un unico componente
   compatto, posizionato vicino a `PlayerDetailPanel`/`SameTeamGoalkeepers`
   invece che come tabella a piena larghezza sotto.
3. **Barra fair value/target/panic vicino al nome del giocatore.** Oggi è
   `.ladder` (righe 239–298 desktop, 232–298 phone), renderizzata sotto
   l'intero blocco header invece che accanto al nome.
4. **Verdetto più piccolo.** `.verdict-badge__text` è `800 20px` (`index.css`
   riga 1164), va ridotto — nessun dato mancante, solo CSS + eventuale
   riduzione di padding.
5. **Stato avversari sotto il calciatore in asta.** Oggi è nella colonna "Io"
   (`AuctionDesktop.tsx` righe 864–943, dati da `view.opponents`/
   `view.opponentRosterCards`, derivati in `AuctionMode.tsx` righe 453–458) e
   in un dialog separato (`OpponentRosterDialog.tsx`). Da spostare come
   pannello sempre visibile sotto il riquadro del giocatore chiamato.
6. **Drag&drop dei giocatori fra manager, o cancellazione diretta
   dell'acquisto da lì.** Non esiste oggi un endpoint per riassegnare un
   acquisto: `web/src/api/purchases.ts` ha solo `createPurchase`,
   `deletePurchase(playerId)`, `deleteLastPurchase` — nessun `updatePurchase`.
   Dipende dal punto 5 (serve una griglia manager visibile su cui trascinare).
7. **Storico ridotto a un bottone "Log acquisti"** + **rimozione del dialog
   avversari** (conseguenza diretta dei punti 5 e 6: se lo stato avversari è
   sempre visibile sotto il giocatore, `OpponentRosterDialog.tsx` diventa
   ridondante, e "Ultime chiamate" — oggi sempre visibile, righe 945–1012 —
   può diventare un bottone che apre il log completo).

Prompt operativi: P25 (punto 1, chiusa), P26 (punti 3+4), P27 (punti 2), P28
(punto 5), P29 (punto 6, dopo P28), P30 (punto 7, dopo P28 e P29) — dettagli,
note di implementazione e gruppi paralleli in [PROMPTS.md](./PROMPTS.md).

### Ricalibrazione valutazioni 07/09/2026 (dati, non codice)

I due file valutazioni caricati dall'utente (`valutazioni-lega-10-aggiornato.json`,
250 giocatori; `valutazioni-lega-8-aggiornato.json`, 200 giocatori — entrambi
ora nella root del repo) avevano due problemi, corretti fuori dal codice
dell'app:

- **Campi `note`/`Note` duplicati** (nota tattica del modello + nota di
  ricerca incrociata aggiunta dall'utente): uniti in un unico campo `note`.
- **`target`/`fair_value`/`max_bid`/`panic_price` sistematicamente troppo
  bassi rispetto ai prezzi realmente pagati in asta.** Verificato incrociando
  due fonti indipendenti (Fantacalcio-Online "Tool Asta Fantacalcio: stima
  prezzo medio per lega/budget", Economia e Sport "prezzi medi asta 2026/27"),
  che convergono sullo stesso ordine di grandezza per i nomi controllati (es.
  Malen: ~320-325 crediti medi pagati su budget 1000, contro un `panic_price`
  di 122 nel file originale — coincidenza non casuale: il `panic_price`
  originale risultava pari a 2× la sola quotazione ufficiale, senza alcun
  ponderamento sul prezzo di mercato). Applicato un fattore correttivo per
  ruolo×tier (mediana dello scarto sulle ~336 righe con un riscontro diretto
  nelle fonti; nuovo campo per giocatore `price_calibration_factor`),
  **non** una ricerca puntuale su tutti i 450 giocatori — scelta esplicita
  per stare nei tempi di una sessione, con verifica mirata solo su ~20 nomi
  di richiamo. Fattori applicati: P tier A ×1.88, P tier B ×1.30, D tier A
  ×1.57, D tier B ×1.60, C tier A ×2.24, C tier B ×1.99, A tier A ×3.44, A
  tier B ×2.21, A tier C ×2.19 — gli attaccanti erano il ruolo più
  sottostimato. Limite noto, documentato nel campo `updated_note` di ogni
  file: la somma di `fair_value` su tutto il pool è al 116% (lega 10) e 132%
  (lega 8) del monte crediti di lega — sopra il 100%, atteso in un modello di
  questo tipo (i target top si pagano spesso sopra media, le riserve sotto),
  ma da tenere presente.

## Traguardi di rilascio (storico)

- `v1.0.0` — Fase 2 completa + servizi in produzione (Neon + Render + Cloudflare
  Pages).
- `v2.2.0` — redesign UI (design system Broadsheet).
- `v3.3.0` — Fase 6 (rifiniture v3.0).
- `v4.0.0` — Fase 7: modello multiutente (login, identità per-utente,
  personalizzazione consigli) + migrazioni schema associate.
- `v4.5.0` — Fase 7 chiusa (bugfix UI + score 0–10 per ruolo).
- `v4.6.0` — Fase mobile (P10): sessione, chat e notifiche su mobile.
- `v5.0.0` — redesign "sportsbook" della UI (asta e shell); traguardo di
  release, considerata stabile.
- `v5.1.0` — Fase 8 chiusa (P11–P15): palette ruolo, import listone
  posizionale, valutazioni a copertura totale, FVM ponderato, vista
  avversari, giocatori trappola; più rifiniture asta (undo chiamata, manager
  a rosa completa non selezionabile).
- `v5.2.0` — Fantamedia reale in Valutazioni al posto della sola versione
  ricostruita; fix foto ritagliate (P17+P18).
- `v5.3.0` — max bid da percentuale di budget; budget obiettivo per reparto,
  avviso di sforamento e residuo (P19a+P19b).
- `v5.4.0` — generazione offline del listino base valutazioni; colonne
  ordinabili in Valutazioni; import valutazioni tollerante ai decimali.
- `v5.5.0` — budget obiettivo per reparto sempre visibile in asta (colonna
  "Io" desktop e fascia compatta mobile).
- `v5.6.0` — disattivazione automatica dei giocatori svincolati al re-import
  del listone, con conferma esplicita oltre soglia.
- `v5.7.0` — Fase 9 chiusa: conferma di sovrascrittura degli override
  personali al re-import valutazioni.
- `v6.0.0` — **BREAKING**: import probabili formazioni/rigoristi/punizioni
  via JSON incollato dall'utente, al posto di screenshot + estrazione Claude;
  rimossi gli endpoint di estrazione automatica.
