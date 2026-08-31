# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [4.8.0] - 2026-08-31

### Added

- **Import listone posizionale «Lista FantaAsta»**: il nuovo export CSV di
  Fantacalcio.it non ha riga di header ed è separato da virgola. L'importer
  rileva il formato (nessuna intestazione riconoscibile) e mappa le colonne per
  indice (`LISTONE_COLUMN_INDEX` in `server/src/import/fileRows.ts`, origine
  documentata). I file con header nominati (xlsx quotazioni e relativi CSV)
  continuano a funzionare invariati. Le righe con colonne mancanti non vengono
  più scartate in blocco: solo i campi assenti restano non aggiornati.
- **`player.nome_completo`**: colonna additiva nullable (migrazione
  `1788307200000_player-nome-completo.sql`). `name` resta il nome breve per
  matching/ricerca; il nome completo compare nelle schede giocatore in asta,
  nel dettaglio e nelle liste consigli.
- **Campo «Stagione»** nella schermata di import (ora «Listone Fantacalcio»,
  voce di menu «Listone · import»): il listone posizionale ci scrive anche
  `quotation` (Qt.I/Qt.A/FVM) per la stagione indicata, non ricavabile dal
  contenuto.
- Script `db:report:duplicate-players`: segnala (senza cancellare) i duplicati
  già in `player` da fondere a mano.

### Fixed

- **Duplicati al cambio squadra**: `upsertPlayer` usava `ON CONFLICT
  (name, team)` e creava una riga nuova quando un giocatore reimportato cambiava
  squadra. Ora usa `fanta_id` come chiave stabile quando presente e aggiorna la
  riga esistente (name/team/ruolo), con fallback a `name+team` per le righe
  senza `fanta_id`. `nome_completo`/`image_url` sono aggiornati dal listone
  quando forniti, senza mai azzerarli.
- **Foto giocatore non caricabile**: `PlayerAvatar` intercetta l'errore di
  caricamento dell'`<img>` e ricade sul placeholder stemma squadra + ruolo, come
  già faceva per `image_url` assente.

## [4.7.3] - 2026-08-31

### Fixed

- **Palette colori ruolo incoerente**: D usava il teal `--color-accent`, C il
  grigio neutro `--color-neutral-700` e A il magenta `--color-accent-2`,
  invece dei colori categorici attesi. Introdotti i token dedicati
  `--color-role-blue`/`--color-role-green`/`--color-role-red` (verificati AA
  su sfondo bianco e sui badge a sfondo pieno) e aggiornati `--role-d/-c/-a`
  di conseguenza: ora P giallo, D blu, C verde, A rosso in tutte le viste che
  usano `roleColor()`/le classi `.role-*`.

## [4.7.2] - 2026-08-30

### Fixed

- **Impossibile cancellare le leghe dalla UI**: la pagina Leghe non offriva
  un'azione di eliminazione benché l'endpoint `DELETE /leagues/:id`, l'API client
  e i FK `ON DELETE CASCADE` ci fossero già. Aggiunto il bottone «Elimina» con
  conferma; la selezione di lega attiva si azzera se si elimina quella corrente.
- **`TypeError: Failed to construct 'URL'` aprendo l'asta e scegliendo un
  giocatore**: con `VITE_API_URL` relativo (`/api`) gli helper stats costruivano
  l'URL con `new URL(baseUrl())` senza base. Ora usano `URLSearchParams` +
  stringa, come gli altri moduli API.

### Testing

- Introdotta la suite di test con `vitest` + coverage `v8` su tutti i workspace.
  Gate di coverage **≥ 90%** (righe/branch/funzioni/statement) su `shared`
  (99,5% righe, 91% branch). `web` e `server` hanno test mirati (regressione dei
  due bug sopra, comportamento mobile di `useMediaQuery`/`ChatPanel`, funzioni
  pure di `auctionDerivations`, middleware auth/ruolo, rotte `DELETE /leagues`,
  `GET /chat/inbox`, `/auth/*`, stress su `/health` e sui ranking). Nuovo
  workflow CI `test.yml` su push e pull request.

## [4.7.1] - 2026-08-30

### Fixed

- **Pages Function del proxy API non deployata**: spostata da `web/functions/` a
  `functions/` alla root del repo (Cloudflare la cerca nella root directory
  configurata per il progetto Pages, che qui è la root del repo). Prima le
  chiamate `/api/*` cadevano sul rewrite SPA e fallivano tutte in produzione.

## [4.7.0] - 2026-08-29

### Added

- **Account `guest` di sola consultazione**: nuovo ruolo `role` su `app_user`
  (`member` | `guest`, migrazione `1788220800000_app-user-role`). Un `guest` può
  navigare tutto il portale ma ogni richiesta non-safe è 403 (`requireWritableRole`
  globale + guardia su `PATCH /auth/me`). Serve a dare un accesso di navigazione
  a terzi (team SoFIFA). Seed via `SEED_PASSWORD_GUEST`.
- **Logo SoFIFA con link** nell'header della modalità asta (versione normale) e
  nel footer della sidebar sotto la versione dell'app (versione piccola), oltre a
  quello già presente accanto al link «SoFIFA» in asta. Tutti rimandano a
  `https://sofifa.com/`.

## [4.6.0] - 2026-08-29

### Added

- **Notifica messaggi chat in arrivo**: nuovo endpoint `GET /chat/inbox?since=`
  (messaggi ricevuti dopo un istante, da qualunque mittente). Il pannello chat lo
  interroga ogni 10 s anche da chiuso: un messaggio da un mittente diverso dalla
  conversazione aperta genera un toast cliccabile e incrementa un badge di non
  letti sul FAB. Lo stato «non letto» è derivato a lettura lato client
  (`localStorage`), nessun campo sul log append-only.

### Fixed

- **Sessione persa su mobile**: SPA (Cloudflare Pages) e API (Render) sono domini
  diversi, quindi il cookie di sessione era `SameSite=None; Secure` e i browser
  mobile lo scartavano come cookie di terze parti — selettore lega vuoto e chat
  «authentication required» solo da telefono. Le chiamate API ora passano da
  `/api` sullo stesso origin della SPA (proxy Vite in sviluppo, Cloudflare Pages
  Function `functions/api/[[path]].js` in produzione, env `API_ORIGIN`); il
  cookie è first-party e usa `SameSite=Lax`.
- **Chat non usabile su mobile**: sotto 768px il pannello si apre a schermo
  intero (overlay), senza drag/resize, con un solo bottone di chiusura; sopra
  resta flottante e ridimensionabile.

## [4.5.0] - 2026-08-29

### Added

- **Punteggio in scala 0–10 per ruolo** (solo presentazione): la colonna
  «Punteggio» in Consigli e lo Score nella tabella confronto asta mostrano il
  percentile dello score VORP entro il ruolo, riscalato su 0–10 (0 = ultimo del
  pool di ruolo, 10 = primo), arrotondato a un decimale. Formula:
  `round(percentileByGroup({player_id, score}) entro ruolo × 10, 1)`. Dominio
  per-ruolo perché gli score VORP non sono comparabili tra ruoli. Lo score grezzo
  resta la fonte di verità interna per ordinamento, fasce e VORP, ed è visibile
  nel modale di scomposizione. Nuova funzione pura `normalizeScoresByRole` in
  `shared`.
- **Tooltip sulle sigle di colonna e scomposizione delle colonne calcolate**:
  glossario unico riusato da Consigli e Panoramica; le colonne derivate da un
  calcolo (Punteggio, Max bid rettificato) hanno un modale «Dettagli» con lo
  scomposto passo-passo e i valori realmente usati dal motore. Il motore ora
  espone `components.breakdown` (mv, sufficienza, bonus per presenza/difesa/
  portiere, affidabilità, scarsità, rimpiazzo), `maxBid.ts` espone
  `explainAdjustedMaxBid`. Nuovi componenti condivisi `Dialog`, `InfoLabel`,
  `ScoreBreakdownDialog`.

### Fixed

- **Modale profilo troncato su viewport basse**: il dialog ora ha un'altezza
  massima legata al viewport e scrolla internamente nel body, con titolo e
  bottoni Annulla/Salva sempre visibili.
- **Preferenze di squadra invisibili in asta**: un giocatore di una squadra
  segnata come «da evitare» (o «preferita») mostra ora un banner/badge nel
  pannello asta — giocatore in chiamata, lista di chiamata e alternative — su
  desktop e mobile. Solo segnale visivo derivato a lettura, nessun impatto sullo
  score (coerente col vincolo P6).
- **Tag «Difensore da bonus» applicato ai portieri**: la condizione includeva
  `ruolo === "P"` accanto a `"D"`; ora è ristretta ai soli difensori.

## [4.4.0] - 2026-08-29

### Added

- **Logo e link SoFIFA in landing e asta**: la schermata di login mostra il logo
  SoFIFA (versione normale) e nell'asta il logo piccolo affianca il link «SoFIFA»
  già presente. Entrambi rimandano a `https://sofifa.com/`, prerequisito per
  l'accesso alle loro API.

## [4.3.0] - 2026-08-29

### Added

- **Chat 1-a-1**: pannello flottante spostabile e ridimensionabile per lo
  scambio di messaggi diretti tra utenti, disponibile sia nella shell di setup
  sia in modalità asta.
  - Tabella append-only `chat_message` (`id, from_user, to_user, body,
    created_at`): la conversazione è la proiezione ordinata del log, nessun
    campo di stato mutabile (niente "letto"/contatori).
  - Endpoint `GET /users` (elenco degli altri utenti) e `GET /chat?with=&since=`
    / `POST /chat`; il mittente è sempre derivato dal cookie di sessione.
  - Trasporto a polling ogni 2,5 s, nessun websocket. Posizione, dimensione e
    ultimo destinatario del pannello salvati in `localStorage` (comodità
    per-utente, non stato condiviso).

## [4.2.0] - 2026-08-29

### Added

- **Consigli personalizzati per utente**: nuovo layer per-utente che non tocca
  il dato di base condiviso.
  - **Override valutazioni** (`user_valuation_override`, tabella sparsa a chiavi
    `user_id, league_id, player_id`): ogni utente può correggere
    `target / fair_value / max_bid / panic_price / note` di un giocatore solo
    per sé. Il valore effettivo a lettura è `coalesce(override, base)`; la
    tabella `valuation` condivisa resta invariata. Editing inline nella pagina
    Valutazioni (celle numeriche e nota), con marcatura dei campi sovrascritti e
    pulsante «Ripristina base». Endpoint `PUT`/`DELETE
    /leagues/:leagueId/valuations/overrides/:playerId`; il `GET` delle
    valutazioni ora restituisce i valori coalesced per l'utente loggato.
  - **Preferenze squadra** (`user_team_pref`, chiavi `user_id, league_id,
    team`, `kind` in `prefer|avoid`): effetto flag + ordinamento secondario a
    parità di fascia, nessuna mutazione dello score. Squadra preferita → sale in
    lista nella propria fascia; squadra da evitare → badge «squadra da evitare»
    e demozione in coda di fascia. Riordino applicato lato server nella route
    `/recommendations`; gestione da un pannello in cima alla pagina Consigli.
    CRUD `GET`/`PUT`/`DELETE /leagues/:leagueId/team-prefs`.

## [4.1.0] - 2026-08-29

### Added

- **Avatar e colore per utente**: ogni utente sceglie un'emoji da un set
  predefinito e una tinta da una palette fissa; nessun upload di immagini. I
  valori persistono sulle colonne `app_user.avatar` / `app_user.avatar_color`
  già esistenti tramite il nuovo endpoint `PATCH /auth/me` (validazione a
  whitelist: emoji e colori fuori set vengono rifiutati). La scelta si fa da
  una modale aperta dal nome utente nella barra laterale. L'avatar compare
  nell'header (menu utente) e nella tabella "Stato dei manager" della
  panoramica per i manager collegati a un utente; in assenza di scelta si
  ripiega su iniziali e tinta deterministica dallo username.

## [4.0.1] - 2026-08-27

### Fixed

- Il server va ora in errore all'avvio se `COOKIE_SECRET` non è impostata,
  invece di crashare al primo login (`cookieParser` richiede un secret per
  poter firmare i cookie).

## [4.0.0] - 2026-08-27

### Added

- **Autenticazione minimale**: nuova tabella `app_user` (username, password
  hash bcrypt, avatar/colore avatar predisposti per la Fase 7 successiva),
  seed idempotente dei 4 utenti (Andre, Davide, Fra, Paul) da password in
  chiaro lette solo da un file locale non versionato. `POST /auth/login`
  verifica con bcryptjs e imposta un cookie di sessione firmato `httpOnly`
  (nessuna tabella sessioni: il cookie contiene solo l'id utente ed è
  stateless per design); `POST /auth/logout` lo cancella; `GET /auth/me`
  restituisce l'utente loggato (mai l'hash della password al client). Tutte
  le rotte API esistenti sono ora protette da un middleware `requireAuth`;
  restano pubbliche solo `/health` e `/auth/login`. La schermata di login è
  ora la landing dell'app: nessun dato di lega viene caricato prima
  dell'accesso.
- Aggiunto `manager.user_id` (FK opzionale a `app_user`, `ON DELETE SET
  NULL`): quando presente avrà priorità su `is_owner` per determinare il
  «tu» in una lega (il collegamento effettivo in UI e nel motore consigli
  resta fuori scope per questo cambiamento, solo lo schema e l'esposizione
  via API manager sono inclusi).
- CORS ora richiede `credentials: true` con origine sempre esplicita (mai
  `*`), coerente con l'uso di cookie cross-origin tra frontend (Cloudflare
  Pages) e backend (Render). Cookie di sessione `secure`/`sameSite`
  configurabili via `COOKIE_SECURE` (default `true`, valido sia in sviluppo
  su `localhost` sia in produzione su https).

### Changed

- **BREAKING**: tutte le rotte API (leghe, manager, valutazioni, consigli,
  acquisti, scambio rose, wishlist, giocatori, coppie portieri, probabili
  formazioni, calci piazzati, arricchimento statistiche, statistiche
  stagionali, quotazioni) richiedono ora una sessione autenticata.

## [3.6.0] - 2026-08-26

### Added

- **Tag giocatore derivati**: nuovo modulo puro `playerTags` in `shared` che
  deriva, a lettura, un elenco di tag per ciascun giocatore disponibile —
  Rigorista (rank ≤2 su calci di rigore), Titolare da 6 (titolare, alta
  affidabilità, fascia di score mediana), Porta bonus (tasso gol+assist a
  partita nel top del ruolo), Difensore da bonus (D/P con alto tasso bonus
  proprio o squadra a difesa solida), Scommessa (FVM basso con segnale di
  upside) e Da prendere a 1 (FVM minimo, valore al livello del rimpiazzo, "Io"
  ha ancora lo slot). Nessun campo persistito: ricalcolato ad ogni chiamata a
  partire da pool, statistiche, quotazioni, rigoristi/tiratori e formazioni
  probabili, riusando l'output già calcolato del motore raccomandazioni.
- L'endpoint consigli ora espone i tag insieme al resto della raccomandazione;
  i badge compaiono sia nella pagina Consigli sia nel pannello asta (giocatore
  in asta e alternative dello stesso ruolo).
- L'ultima fascia del motore raccomandazioni è stata rinominata da
  "Scommessa" a "Basso" per non collidere con il nuovo tag omonimo — le due
  nozioni restano su assi distinti (fascia di valore vs. tag di scenario).

## [3.5.0] - 2026-08-26

### Added

- **Reliability da formazione probabile**: `probable_lineup.stato` viene ora
  letto dal motore raccomandazioni e combinato con lo storico presenze
  (`reliability = max(presenzeRatio, statoWeight)`, pesi
  `titolare=0.9, ballottaggio=0.6, panchina=0.3`). Un titolare odierno senza
  storico in Serie A (neopromosso, nuovo acquisto) non è più penalizzato
  dalle sole presenze passate. Matching giocatore↔lineup per nome+squadra
  normalizzati, stesso criterio già usato altrove. Senza un match, la
  reliability resta il solo `presenzeRatio`.
- **Baseline mv nello score**: introdotta la costante `MV_BASELINE` (6.0);
  il contributo di `mv` allo score è ora il margine sopra la sufficienza
  (`mv - MV_BASELINE`) invece del voto assoluto, così i bonus (bomber,
  rigoristi) pesano a pieno invece di essere appiattiti dalla componente mv
  che prima dominava in valore assoluto. Il valore grezzo può restare
  negativo sotto la sufficienza (informativo), ma il contributo allo score
  finale è floorato a zero per evitare che una bassa affidabilità renda un
  giocatore scarso artificialmente meno penalizzato.

## [3.4.0] - 2026-08-26

### Added

- **Modificatore portiere attivo**: `modificatori.portiere.enabled` era
  definito nelle regole lega ma non veniva mai letto dal motore
  raccomandazioni. Ora, se attivo, aggiunge al valore del ruolo P un bonus
  atteso di clean-sheet stimato dal tasso di gol subiti a partita del
  portiere stesso (proxy individuale, additivo, mai negativo).
- **Bonus difesa team-aware**: il bonus di reparto per P/D non usa più il
  solo `mv` individuale come proxy della solidità difensiva, ma lo fonde
  (70/30) con il tasso di gol subiti a partita della squadra del giocatore,
  aggregato sui portieri della rosa. La tabella
  `modificatori.difesa.tabella` resta invariata; senza dati di squadra
  disponibili il calcolo degrada al comportamento precedente basato sul solo
  `mv`.

## [3.3.0] - 2026-08-21

### Added

- **Valutazioni di base per lega da 8 o da 10 squadre**: alla creazione di
  una nuova lega, se `n_squadre` è 8 o 10, vengono importate in automatico le
  valutazioni predefinite (`docs/sample/asta_1000_lega8.json` /
  `asta_1000_lega10.json`, su base 1000 crediti) invece di lasciare la lega
  vuota. Per altre dimensioni di lega non si applica nessun default.
  L'utente può comunque sovrascrivere i valori importando un proprio file
  JSON dalla pagina Valutazioni, che aggiorna riga per riga sopra ai
  default.

## [3.2.0] - 2026-08-20

### Added

- **Valutazioni JSON su base 1000 crediti**: `target`, `fair_value`,
  `max_bid` e `panic_price` importati (o generati) sono sempre su base 1000
  crediti, ora dichiarato esplicitamente nel form di import e in `SPEC.md`.
  Il dato salvato resta quello importato, invariato; le viste che lo
  mostrano (Asta, Panoramica, Valutazioni) lo ricalcolano a lettura per il
  budget reale della lega (`shared/src/valuationScale.ts`), così una lega da
  500 o 1500 crediti vede valori coerenti senza dover reimportare se il
  budget cambia.

## [3.1.0] - 2026-08-20

### Added

- **Suggerimento coppia portieri in asta**: dopo l'acquisto di un portiere,
  la colonna "Io" (desktop) e la testata (telefono) mostrano la squadra più
  favorevole per accoppiarlo, in base alla matrice `gk_pairing` già presente
  in "Coppie portieri". Sceglie la squadra col punteggio migliore tra quelle
  che hanno ancora un portiere libero nel pool, scartando quelle già mie e
  passando alla successiva se il portiere suggerito è già stato acquistato
  da un altro manager. Puro derivato dal log `purchase` e dalla matrice
  coppie, nessuno stato salvato.

## [3.0.1] - 2026-08-20

### Fixed

- **Ordine ruoli in Probabili formazioni**: undici probabile, ballottaggio e
  panchina ora sono ordinati per ruolo (P, D, C, A) invece di seguire
  l'ordine di arrivo dei dati importati.

## [3.0.0] - 2026-08-20

### Added

- **Export/import rose in formato lega Fantacalcio**: nuova pagina "Rose ·
  export/import". L'export genera un CSV a blocchi (`$,$,$` prima di ogni
  manager, righe `nome_manager,fanta_id,prezzo`) come proiezione pura del log
  `purchase`; gli acquisti senza `fanta_id` mappato sono esclusi dal CSV e
  segnalati esplicitamente, mai emessi con un id vuoto. L'import risolve i
  giocatori tramite `fanta_id` e i manager per nome: le righe con `fanta_id`
  non risolvibile o manager sconosciuto finiscono in un report di scarto,
  mai inventate. L'import sostituisce interamente la rosa della lega
  (svuota e ricostruisce il log `purchase` in transazione); se nessuna riga
  del file è valida, l'import viene rifiutato senza toccare il database.
  Chiude la Fase 6.

## [2.15.0] - 2026-08-20

### Added

- **Avviso modificatori lega**: se il modificatore portiere e/o difesa sono
  attivi per la lega, un banner lo segnala in Panoramica e nella modalità
  asta (desktop e telefono), dato che incidono su valutazioni e prezzi.

### Fixed

- **Alternative libere includevano il giocatore in asta**: la lista
  "Alternative nello stesso ruolo — ancora libere" poteva mostrare, tra le
  alternative, lo stesso giocatore correntemente sotto battuta (non ancora
  "acquistato", quindi non escluso dal filtro esistente). Ora viene escluso
  esplicitamente prima di selezionare le alternative da mostrare, cosicché
  il conteggio e l'elenco riflettano solo giocatori realmente liberi.

## [2.14.0] - 2026-08-20

### Added

- **Shell responsive su mobile**: sotto i 768px la sidebar sparisce e la
  navigazione (voci principali, selettore lega, "Entra in asta") si
  trasferisce in una barra sticky in fondo allo schermo (`BottomNav`).
  Panoramica lega usabile in verticale: statistiche e le due colonne
  obiettivi/chiamate collassano a colonna singola, le tabelle diventano
  scrollabili in orizzontale invece di traboccare dalla pagina. Tipografia
  (h1-h6, corpo, titolo di pagina) scalata sotto il breakpoint tramite
  custom property dedicate. Aggiunto un bottone "Esci" sempre visibile
  nell'header della modalità asta su telefono, che prima non esponeva alcun
  modo per uscire dall'asta se non da tastiera fisica.

## [2.13.1] - 2026-08-20

### Fixed

- **Sidebar spinta fuori dalla viewport**: su pagine lunghe (Consigli,
  Quotazioni) la sidebar cresceva con l'altezza del contenuto, spingendo il
  bottone "Entra in modalità asta" fuori dallo schermo. La sidebar è ora ad
  altezza viewport fissa (`position: sticky`), con brand/selettore
  lega/navigazione in un'area scrollabile interna e il blocco azioni sempre
  ancorato in fondo, visibile senza scroll.

## [2.13.0] - 2026-08-20

### Fixed

- **Identità stabile del proprietario**: il manager proprietario era
  identificato per **nome letterale** (`"Io"`), quindi rinominarlo rompeva
  Consigli (`manager "Io" not found`) e faceva perdere il riferimento
  all'utente in Asta/Panoramica. Introdotta la colonna `manager.is_owner`
  (esattamente un proprietario per lega, vincolo di unicità parziale a
  livello DB) come identità anagrafica stabile, disaccoppiata dal nome —
  che resta liberamente editabile. Tutti i lookup per nome sono stati
  sostituiti da lookup su `is_owner`/`isOwner`.

## [2.12.1] - 2026-08-20

### Fixed

- **Modello di accesso SoFIFA corretto**: `api.sofifa.net` **non** è un'API
  pubblica come indicato in 2.12.0 — è **whitelist-only**, quindi ogni chiamata
  risponde 403 (→ nessun dato, nessuna regressione: il provider degrada come da
  design) finché SoFIFA non autorizza il caller. Il provider resta OFF di
  default; documentazione (`.env.example`, `render.yaml`, commenti) allineata.
  `SOFIFA_API_TOKEN` è conservato per un eventuale schema token di whitelist ma
  non è ancora inviato (SoFIFA non ne ha specificato il passaggio).

### Added

- **Sorgente squadre offline per `db:seed:sofifa`**: nuova env `SOFIFA_SQUADS_FILE`
  che fa leggere al seed le rose da un JSON locale
  (`[{ sofifaId, name, team }, ...]`) invece di interrogare l'API, utile quando
  l'API non è raggiungibile/whitelisted. La logica di match resta identica.

## [2.12.0] - 2026-08-20

### Added

- **SoFIFA cablato sull'API reale + mapping `sofifa_id`**: il provider SoFIFA
  ora usa l'endpoint pubblico documentato `GET https://api.sofifa.net/player/{id}`
  (overall ← `overallRating`, potential, età ← `age`, valore FIFA ← `price`).
  Poiché l'API non offre ricerca per nome, si aggiunge la colonna nullable
  `player.sofifa_id` (migrazione + vincolo unico) come chiave verso quell'id, e
  uno script di seed `db:seed:sofifa` che percorre le rose Serie A
  (`/league/{id}/{roster}` + `/team/{id}/{roster}`) e associa per nome
  (disambiguato per squadra), senza mai indovinare: un match ambiguo lascia il
  giocatore non mappato. Gli attributi si mostrano solo per i giocatori mappati;
  gli altri restano senza dato, nessuna regressione.
- **Variabili SoFIFA su `render.yaml`**: `SOFIFA_ENABLED` (false di default),
  `SOFIFA_BASE_URL`, `SOFIFA_API_TOKEN` (`sync:false`).

### Changed

- Il provider SoFIFA non richiede più un token per funzionare: l'endpoint
  `/player/{id}` è pubblico, quindi `enabled` dipende solo da `SOFIFA_ENABLED`.
  `SOFIFA_API_TOKEN` resta opzionale e riservato ai soli endpoint
  `customizedPlayers` (non usati). `SOFIFA_BASE_URL` di default punta ora a
  `https://api.sofifa.net`.

## [2.11.0] - 2026-08-20

### Added

- **SoFIFA come secondo provider stats opzionale (attributi EA FC)**: il layer
  backend degli arricchimenti esterni è ora dietro un'unica interfaccia
  `StatsProvider` (`server/src/stats/`). API-Football (rendimento reale:
  minuti/gol/assist) resta invariato come provider `stats/apiFootball/`; si
  aggiunge `stats/sofifa/` come secondo provider che espone gli attributi del
  videogioco EA FC (overall, potential, età, valore FIFA) — un asse di dato
  diverso, non un rimpiazzo. Entrambi i provider sono opzionali, indipendenti e
  a costo nullo da spenti; token SoFIFA solo lato backend, chiamate proxied,
  cache e rate-limit dedicati. Nuove env `SOFIFA_ENABLED`, `SOFIFA_API_TOKEN`,
  `SOFIFA_BASE_URL` (off di default). Gli attributi compaiono come arricchimento
  nel pannello info giocatore e come colonne extra (Ovr/Pot/Età/Val) nella
  tabella alternative d'asta, con attribuzione a SoFIFA dove mostrati. L'assenza
  del provider non degrada la comparazione base e nessun dato viene inventato.
  La risposta di `GET /players/stats-enrichment` evolve nella forma combinata
  `{ performance, attributes }`, ciascuna sezione con flag `enabled` proprio.

## [2.10.0] - 2026-08-20

### Added

- **Alternative in asta ordinabili, almeno 15 sempre visibili**: la tabella
  "Alternative nello stesso ruolo" mostra ora fino a 15 giocatori ancora
  liberi (prima 7), ordinabili per fair value, target, max bid, `Fm`,
  `FVM`, `Qt.A` o punteggio del motore di raccomandazione (nuove colonne
  Fm/Score, nuovo endpoint già esistente `GET
  /leagues/:leagueId/recommendations` riusato dalla vista asta). Il
  bottone "Dettagli" per riga resta invariato e mostra le stesse info
  estese del giocatore in asta. Per ordinare per `Fm` su tutto il pool del
  ruolo (non solo le righe mostrate) il cap dell'endpoint `GET
  /players/season-stats?ids=` sale da 50 a 300 id — endpoint interno,
  nessuna chiamata esterna.

## [2.9.0] - 2026-08-20

### Added

- **Info estese per il giocatore in asta e per le alternative**: la vista
  asta mostra ora, oltre a Tier/Fair value/Target/Max/Panic/Δ, la media
  fantavoto `Fm` e la media voto `Mv` dell'ultima stagione con presenze
  (`player_season_stats`, nuovo endpoint `GET /players/season-stats`),
  quotazione attuale `Qt.A` e `FVM` (`quotation`), un "prezzo medio pagato"
  esplicitamente etichettato come proxy su `FVM` (non una media di
  aggiudicazioni reali), oltre a squadra, ruolo, presenze, gol/assist,
  eventuale ruolo nei calci piazzati e stato nelle probabili formazioni
  (match esplicito nome+squadra, nuovo `shared/src/matchPlayer.ts`, mai una
  stima). Le stesse info sono disponibili per ogni alternativa dello stesso
  ruolo dietro un bottone "Dettagli" espandibile, senza affollare la
  tabella comparativa esistente.

## [2.8.0] - 2026-08-20

### Added

- **Ordinamento della lista "da chiamare" in modalità asta**: la colonna
  dei giocatori non ancora presenti nel log `purchase` è ora ordinabile
  tramite un selettore (`Valore`, `FVM`, `Qt.A`, `Qt.I`), con `FVM`/`Qt.A`/
  `Qt.I` letti dalla tabella `quotation` per la stagione corrente (nuovo
  endpoint `GET /players/quotations/current`). Il numero mostrato accanto
  a ogni giocatore riflette il criterio attivo. Ordinamento e derivazione
  sono puramente client-side: nessuna scrittura sullo stato d'asta.

## [2.7.0] - 2026-08-20

### Added

- **Schema visibile e template scaricabile nell'import JSON valutazioni**: la
  schermata di import (`ValuationImportForm`) mostra ora un riepilogo dei
  campi attesi (nomi, tipi, enum `ruolo`/`confidence` letti direttamente da
  `shared/src/valuation.ts`) e offre un template JSON di esempio scaricabile,
  già valido per la lega corrente. L'import lato server
  (`server/src/import/valuationJson.ts`) è diventato tollerante riga per
  riga: un singolo elemento di `players[]` che non rispetta lo schema non fa
  più fallire l'intero import, ma finisce in un nuovo elenco "scartate" con
  motivo leggibile, accanto all'elenco "unmatched" già esistente.

### Changed

- `ValuationImportReport` (`shared/src/valuation.ts`) include ora anche
  `discarded`, l'elenco delle righe scartate per errore di schema.

## [2.6.0] - 2026-08-20

### Added

- **Seed probabili formazioni (titolari)**: nuovo script
  `db:seed:historical:formazioni`
  (`server/src/scripts/seedHistoricalProbableLineups.ts`) che popola
  `probable_lineup` da un dataset statico
  (`server/src/scripts/data/probableLineupsSeed.ts`) trascritto dal riepilogo
  probabili formazioni di fantacalcio.it. Gli XI titolari di tutte e 20 le
  squadre vengono scritti con `stato = 'titolare'`; il `ruolo` P/D/C/A è
  ricavato dal listone (tabella `player`, match nome+squadra) e i nomi non
  trovati restano con ruolo `null` e vengono elencati a console per la
  revisione. Nessuna dipendenza dall'API Claude; il nuovo step è incluso
  nella catena `db:seed:historical`.

## [2.5.0] - 2026-08-20

### Changed

- **Seed rigoristi indipendente dall'estrazione AI**: lo script
  `db:seed:historical:rigoristi` ora legge un dataset statico
  (`server/src/scripts/data/setPieceTakersSeed.ts`), trascritto dal PDF
  "Rigoristi e tiratori da fermo Serie A", invece di inviare il testo del PDF
  all'API Claude. Il seed non richiede più `ANTHROPIC_API_KEY`; il flusso
  in-app di upload screenshot + estrazione resta invariato come fonte di
  correzione. Copre tutte e 20 le squadre (sezione "Rigori" → `rigore`,
  "Calci piazzati" → `punizione`), con il `rank` dato dall'ordine di lista.

## [2.4.0] - 2026-08-19

### Added

- **Motore di consiglio giocatori**: nuovo modulo puro (`shared`) che
  ordina i disponibili per valore relativo alla lega, non assoluto. La
  fantamedia viene ricostruita dai bonus/malus grezzi (`gf`, `assist`,
  `rig_plus/minus`, `rp`, `amm`, `esp`, `autogol`, `gs` per i portieri) pesati
  con lo `scoring` della lega, invece di fidarsi della `fm` importata (che
  riflette il sistema di punteggio della fonte, non quello scelto in lega);
  il modificatore `difesa` (unico con una tabella media→bonus) si applica a
  portieri e difensori usando il `mv` del giocatore come proxy della difesa
  di reparto.
- **Affidabilità pesata sulle presenze**: la fantamedia regolata è scalata
  per la quota di presenze sulle giornate finora disputate (dedotte dal
  massimo osservato nella stagione, non un `38` fisso), così un rendimento
  alto su poche partite pesa meno di uno stabile su tutta la stagione.
- **Punteggio come valore sopra il rimpiazzo (VORP)**: per ogni ruolo il
  punteggio finale è il margine rispetto al giocatore marginale ancora
  disponibile al rank corrispondente agli slot liberi residui di "Io",
  aggiustato per la scarsità di reparto (domanda residua di lega contro
  offerta ancora disponibile). Segnala anche il divario tra valore stimato e
  prezzo di mercato (`FVM`) come possibile occasione.
- **Endpoint di lettura e vista "Consigli"**: `GET
  /leagues/:leagueId/recommendations` e nuova pagina in navigazione con
  filtro per ruolo e pannello "Dettagli" per componente (affidabilità, bonus
  attesi, aggiustamento regole, scarsità), così il suggerimento resta
  spiegabile e non una scatola nera.

### Fixed

- Le colonne `NUMERIC` (`mv`, `fm` di `player_season_stats`) tornavano dal
  driver Postgres come stringhe: un'addizione diventava una concatenazione
  di testo. Aggiunto un parser di tipo globale che le converte in numeri,
  corretto per qualunque futura colonna `NUMERIC`.

### Notes

- Nessun cambiamento all'invariante di dominio: il motore è puro e
  deterministico, non introduce stato — ricalcola sempre da pool,
  quotazioni/statistiche dell'ultima stagione disponibile, log `purchase` e
  regole lega. I modificatori senza una tabella di bonus definita
  (`centrocampo`, `attacco`, `portiere`, `capitano`, `modulo`) restano flag
  di configurazione visibili ma non contribuiscono al punteggio: nessun dato
  inventato.

## [2.3.1] - 2026-08-19

### Fixed

- `db:seed:historical*` erano definiti solo in `server/package.json`: non
  lanciabili da `npm run` alla radice del repo. Aggiunti i proxy mancanti
  nello `package.json` root, come già per `db:migrate`/`db:seed`.

## [2.3.0] - 2026-08-19

### Added

- **Quotazioni e statistiche storiche a DB**: nuove tabelle globali
  `quotation` (`qt_i`, `qt_a`, `fvm` per stagione) e `player_season_stats`
  (presenze, media voto, fantamedia e bonus/malus per stagione), entrambe
  univoche per `(player_id, season)`; nuova colonna `player.fanta_id`
  (nullable, univoca) come chiave di join stabile con i listoni ufficiali,
  con fallback a matching per `name`+`team` quando l'`Id` manca o non è
  ancora noto — righe ambigue o senza corrispondenza finiscono in un report
  di scarto, mai stimate.
- **Import a sostituzione per stagione**, in transazione: un reimport
  riflette esattamente l'ultimo file per quella stagione.
- **Comando di seed storico locale** (`db:seed:historical:*`, mai una route
  pubblica) che legge i listoni xlsx già presenti in `docs/` e popola
  `quotation`/`player_season_stats` per tutte le stagioni disponibili.
- **Upload portale esteso**: l'import xlsx già usato per il pool `player`
  scrive ora anche `quotation` per la stagione corrente, ricavata dal nome
  del file.
- **Rigoristi/calci piazzati da PDF**: seed one-off che alimenta il
  `set_piece_taker` esistente a partire dal PDF ufficiale, con estrazione
  testuale via Claude (il PDF si è rivelato un vero export testuale, non una
  scansione) — le righe incerte non vengono scritte, restano solo un report
  a console; la pagina "Rigoristi e calci piazzati" resta la fonte di
  correzione.

### Notes

- Nessun cambiamento all'invariante di dominio: le nuove tabelle sono puro
  riferimento globale, `purchase` resta l'unico log da cui deriva lo stato
  d'asta.

## [2.2.0] - 2026-08-18

### Changed

- **Ristrutturazione del portale nel design system Broadsheet**: interfaccia
  ricostruita fedelmente (carta chiara, serif Source Serif 4, accento ciano,
  magenta raro, nessuna card) con token e classi portati in
  `web/src/index.css`, inclusi i numerali a lastre CMYK (`.cmyk-num`, puro CSS).
- **Shell lega-centrica**: sidebar fissa `236px` con selettore lega e sette voci
  (Panoramica, Manager, Valutazioni, Quotazioni, Coppie portieri, Probabili
  formazioni, Leghe); la lega attiva resta in querystring (`?league=`). Rimossa
  la navigazione a bottoni annidati (Home → lega → sotto-vista).
- **Modalità asta a schermo pieno**: contesto separato con layout desktop
  (tre colonne: chiamata, in asta con price ladder e verdetto, pannello "Io") e
  layout telefono dedicato (fascia fissa + pannello a tab Lista/Alternative/Log).
  Si entra dalla sidebar, si esce con `Esc`; `↑/↓` scelgono, `Invio` assegna.
- **Panoramica lega**: quattro figure a lastre CMYK (residuo, max bid rettificato,
  slot liberi, speso), tabella stato manager e colonne obiettivi/ultime chiamate.

### Notes

- Nessun cambiamento ai contratti API/DB né alle invarianti di dominio: lo stato
  dell'asta resta derivato dal log `purchase` e `computeAdjustedMaxBid`
  (`shared/src/maxBid.ts`) è l'unica fonte del max bid rettificato.

## [2.1.0] - 2026-08-18

### Added

- **Valutazioni generate via LLM in-app**: nuovo endpoint
  `POST /leagues/:leagueId/valuations/generate` (chiave Anthropic solo
  lato backend) che genera le valutazioni per-lega chiamando Claude con il
  pool giocatori e le regole della lega (`scoring`, `modificatori`,
  `roster_config`), suddividendo il listone in chunk per ruolo (P/D/C/A) e
  ulteriormente in batch per restare entro il limite di output del
  modello. Ogni chunk è validato indipendentemente contro lo schema delle
  valutazioni; le righe non interpretabili vengono scartate (mai
  inventate) e il matching nome+squadra → giocatore riusa la stessa
  logica esatta dell'import JSON. UI "Genera valutazioni" nella schermata
  Valutazioni con anteprima modificabile riga per riga prima del
  salvataggio; gli unmatched restano in revisione, non stimati.

## [2.0.0] - 2026-08-18

### Changed

- **Matrice coppie portieri**: la gerarchia titolare/riserva (`goalkeeper_grid`)
  è sostituita da una matrice simmetrica squadra×squadra (`gk_pairing`) con un
  punteggio di favorevolezza della coppia di portieri — più basso = i due
  portieri giocano meno spesso in casa nella stessa giornata; le coppie che
  condividono lo stadio (Roma-Lazio, Inter-Milan, Juve-Torino) valgono `0`.
  Import da xlsx/CSV in formato matrice (intestazione riga/colonna = sigle
  squadra, diagonale vuota, righe di legenda finali scartate e mai
  inventate), a sostituzione integrale in transazione. Nuova UI "Coppie
  portieri": scelta una squadra, mostra i compagni ordinati per
  favorevolezza con display invertibile (alto = più favorevole). Endpoint
  `/goalkeeper-grid` rimosso in favore di `/gk-pairing`.

## [1.10.0] - 2026-08-18

### Added

- **Logo FantaProfeta**: icona mostrata nell'header accanto al titolo e come
  favicon (`favicon.ico` multi-size 16/32/48 + `logo.png`).

## [1.9.0] - 2026-08-18

### Added

- **Nome applicazione FantaProfeta**: intestazione e titolo pagina aggiornati al
  nome utente-facing. Il nome tecnico del pacchetto/workspace resta `fanta-helper`.
- **Versione in footer**: la versione dell'applicazione (da `package.json` di root,
  iniettata a build via `__APP_VERSION__`) è mostrata in fondo a ogni schermata.

## [1.8.0] - 2026-08-18

### Added

- **Rigoristi e tiratori di punizioni**: nuova tabella globale
  `set_piece_taker` (`team, tipo, player_name, rank`, `tipo` ∈
  rigore/punizione/corner), stessa pipeline di ingest delle probabili
  formazioni — screenshot per squadra, estrazione con Claude (vision), bozza
  modificabile prima del salvataggio, righe incerte evidenziate e mai
  inventate, conferma che sostituisce in transazione solo la squadra
  confermata. Mostrati nella stessa tab "Probabili formazioni", per squadra,
  in gerarchia. Riusa il modulo `claudeExtraction` già introdotto per le
  formazioni.

## [1.7.0] - 2026-08-18

### Added

- **Probabili formazioni**: nuova tabella globale `probable_lineup`
  (indipendente da league/purchase, come `goalkeeper_grid`) popolata caricando
  uno screenshot editoriale per squadra. Il backend estrae le righe con
  Claude (vision, chiave solo server-side) e le restituisce come bozza
  modificabile — nessuna riga viene salvata finché l'utente non la rivede in
  UI e conferma; le righe che il modello segnala come incerte sono
  evidenziate con il motivo, mai inventate. La conferma sostituisce in
  transazione solo le righe della squadra confermata, lasciando intatte le
  altre. Lo screenshot originale resta salvato per squadra (sovrascritto al
  nuovo upload). Nuova tab "Probabili formazioni" con undici probabile,
  ballottaggi, panchina e modulo calcolato quando i dati lo consentono.
  L'integrazione con una fonte editoriale esterna resta backlog opzionale.

## [1.6.0] - 2026-08-17

### Added

- **Confronto in asta per ruolo**: selezionando un giocatore in `PurchaseForm`
  compare un pannello "Confronto per ruolo" con il ranking dei giocatori dello
  stesso ruolo ancora disponibili (esclusi quelli nel log `purchase`), ordinati
  per `fair_value`/`target`, con tier/max bid/panic price e i bisogni di
  reparto/residuo/max bid rettificato del manager "Io". Il confronto base è
  puramente derivato client-side dai dati già in-app (valutazioni, pool
  giocatori, stato manager), nessun nuovo endpoint aggregato o stato
  persistito.
- **Arricchimento opzionale minuti/gol/assist**: nuovo modulo backend
  `statsApi` (dietro `STATS_API_ENABLED`/`STATS_API_KEY`, chiave solo
  server-side, cache in-memory e rate-limit giornaliero) che proxya un
  provider di statistiche esterno e alimenta colonne extra nel confronto
  quando attivo; disattivato di default, il confronto base non ne dipende e
  non degrada se l'arricchimento manca o è esaurito.

## [1.5.0] - 2026-08-17

### Added

- **Wishlist per-lega**: obiettivi d'asta marcabili dalla ricerca giocatori
  (stella nella lista di `PurchaseForm`), con riordino per priorità e
  rimozione dal nuovo pannello "Obiettivi d'asta" nella schermata Asta. Nuova
  tabella `wishlist` (univoca su `league_id, player_id`, cascade sulla lega),
  data-access tipato e route CRUD sotto `/leagues/:leagueId/wishlist`
  (incluso un endpoint di riordino bulk). Lista di supporto, ortogonale al log
  `purchase`: i giocatori in wishlist ancora disponibili vengono evidenziati
  nella ricerca durante l'asta, quelli già assegnati mostrano il badge
  "assegnato".

## [1.4.0] - 2026-08-17

### Added

- **Goalkeeper grid**: a global reference (per-team goalkeeper hierarchy,
  `rank 1 = starter`), imported from CSV/xlsx in wide format (`Squadra`,
  `Titolare`, `Riserva`, `Terzo`, …). New `goalkeeper_grid` table and migration,
  DB layer, import parser, and `/goalkeeper-grid` routes. Each import replaces
  the whole grid in a transaction. Not tied to leagues or purchases.
- Dedicated "Griglia portieri" screen (import + table) and a read-only
  consultation panel inside the auction screen.

### Note

- `render.yaml` (Render backend Blueprint) added at the repo root, matching the
  hosting instructions in the README.

## [1.3.0] - 2026-08-17

### Added

- Quotazioni import now accepts **xlsx** in addition to CSV (SheetJS). The parser
  detects the header row, tolerating a leading title row, and requires columns
  `R`, `Nome`, `Squadra`.

### Changed

- Extracted a shared `fileRows` helper (CSV/xlsx row extraction + header
  detection) and refactored the player import around it. The `/players/import`
  route accepts both text (CSV) and binary (xlsx) bodies.

### Note

- SheetJS `xlsx@0.18.5` (the npm build) carries known advisories (prototype
  pollution / ReDoS). Acceptable here: import runs on locally chosen, trusted
  files. Revisit if the app ever ingests untrusted spreadsheets.

## [1.2.0] - 2026-08-17

### Added

- Creating a league now seeds its participants: the owner manager `Io` plus
  `n_squadre − 1` opponents with generated funny names. They remain editable
  from the manager screen; managers are not derived state (purchases still
  reference `manager.id`).

## [1.1.0] - 2026-08-17

### Added

- New-league form now ships prefilled, editable defaults: roster `3/8/8/6`,
  `n_squadre = 8`, `budget = 1000`.
- Structured form for scoring (bonus/malus + goal thresholds) and modifiers,
  replacing the raw JSON textareas. Defaults follow the standard Fantacalcio
  (Fantagazzetta) ruleset: gol `+3`, assist `+1`, penalty scored/saved `+2.5`,
  penalty missed `−2.5`, booking `−0.5`, red card `−1`, own goal `−2`, goal
  conceded `−1`; goal thresholds `[66, 72, 77, 81, 85, 89]`; defense modifier
  table `6 → +1`, `6.5 → +3`, `7 → +6`, plus midfield/attack/goalkeeper/captain/
  formation toggles.

### Changed

- Typed `scoring` and `modificatori` schemas in `shared/src/league.ts` (still
  stored as JSONB); seed uses the shared defaults.

## [1.0.0] - 2026-08-17

Chiude la Fase 2 lato codice (rifinitura UI + miniature giocatori, dopo il max
bid rettificato di `v0.9.0`): MVP funzionale completo secondo `PLAN.md`.
Provisioning dei servizi (Render, Cloudflare Pages, CORS) resta da completare
prima che il rilascio sia pienamente in produzione.

## [0.11.0] - 2026-08-17

### Added

- Player thumbnails wherever a player is shown (Asta search, purchase log,
  valuations table, unmatched-import rows): a new `PlayerAvatar` component
  renders the real photo when `player.image_url` is set, otherwise a
  deterministic placeholder — initials on a role-colored background (P/D/C/A),
  with a ring colored from a stable hash of the team name standing in for a
  crest. No external fetch: everything is derived locally from
  name/team/ruolo.
- `image_url` threaded through the enriched valuation and purchase-log rows
  (`ValuationWithPlayer`, `PurchaseWithDetails`) so those screens can show the
  real photo, not just the player list endpoint.
- Replaced the native player `<select>` in the Asta assignment form with a
  filterable custom listbox, since thumbnails can't be rendered inside native
  `<option>` elements.

## [0.10.0] - 2026-08-17

### Added

- Design tokens for the brand palette as CSS custom properties in
  `web/src/index.css` (`--color-brand-green`, `--color-header-blue`,
  `--color-accent-orange`, plus a small derived neutral scale for
  text/border/background and a spacing/radius scale), replacing the one
  hardcoded hex value in the codebase. Header blue fixed to `#11246F`
  (higher contrast, ~13.9:1 on white, versus ~8.4:1 for the alternative
  `#144F89`).
- Shared presentational components (`PageHeader`, `StatusMessage`) and
  component classes (`.app-header`, `.nav-button`, `.card`, `.table-wrap`,
  `.btn-primary`/`.btn-secondary`, `.status-message`) replacing duplicated
  "Indietro" headers and loading/error/empty ternaries across Home, Leghe,
  Manager, Valutazioni and Asta.
- Consolidated table and form styling across all screens: zebra rows,
  sticky headers, right-aligned tabular numeric columns. Applied with
  priority to the Asta screen (purchase log and per-manager derived
  status), where budget, residuo and max bid rettificato need to be
  readable at a glance during a live auction.
- Presentation only: no change to the auction domain invariant, no
  mutable state field introduced, no new dependency.

## [0.9.0] - 2026-08-17

### Added

- Adjusted (opportunity-cost) max bid: `computeAdjustedMaxBid` in `shared`,
  a pure function of a manager's residual budget and free roster slots per
  role. Reserves 1 credit (`MIN_SLOT_RESERVE`, the minimum bid for any
  player) for every free slot left after the current pick, so bidding it all
  away never blocks completing the roster. Deterministic and explainable —
  no market estimate, no LLM. Recomputed on every request from the
  `purchase` log, same as `residuo` and slot counts; not a stored column.
  Known limits: the floor is uniform across roles (doesn't reflect that
  forwards/midfielders typically cost more than goalkeepers) and it doesn't
  account for remaining market inflation or other managers' behavior.
- `adjustedMaxBid` added to `ManagerAuctionStatus` and surfaced in the Asta
  screen: a new column in the per-manager status table, and a prominent
  value next to the price field in the purchase form for whichever manager
  is currently selected there.
- First unit tests in the repo (`vitest`, scoped to the `shared` workspace)
  covering `computeAdjustedMaxBid`'s edge cases: full roster, last free
  slot, mixed-role reserves, and clamping to zero.

## [0.8.0] - 2026-08-17

### Added

- League selector on a new Home screen (`HomePage`, `LeagueSelector`), setting
  an active league that Manager, Valutazioni, and Asta all read from — reusing
  the existing `ManagersPage`/`ValuationsPage`/`AuctionPage` components
  unchanged. Selection is UI-side state only, never a persisted domain field.
- Deep-link support via a `?league=<id>` query parameter, read on load to
  preselect the active league and kept in sync with `history.replaceState` as
  the selection changes, with no new routing dependency.
- `Leghe` is now purely CRUD (create/edit/delete): the per-row
  Manager/Valutazioni/Asta shortcuts are removed now that Home is the single
  operational entry point for those screens.

## [0.7.0] - 2026-08-17

### Added

- League-scoped purchase log endpoints under `/leagues/:leagueId/purchases`:
  `GET /` lists the immutable log enriched with player and manager names,
  `POST /` appends a purchase (league, player, manager, price), `GET /state`
  returns the derived auction status per manager, and `DELETE /last` removes
  the single most recently appended row as an explicit, traceable correction.
  There is no update endpoint: the log is append-only, and mistakes are
  corrected by removing the last entry, never by mutating a field.
- `db/derived.ts` extended (`getManagerAuctionStatuses`, replacing
  `getManagerBudgetStatuses`) to also compute free roster slots per role
  (`P`/`D`/`C`/`A`) alongside residual budget, both recomputed from the
  `purchase` log and the league's `roster_config` on every call — no
  additional mutable state.
- Asta live screen in the web app, reachable from each league row: player
  search with the current valuation shown when available, assignment to a
  manager with a price, a purchase event log with an "undo last" action, and
  a live-updating derived-status panel (residuo and slots per manager).
- Adjusted (opportunity-cost) max bid is intentionally out of scope here; the
  form only surfaces the static `max_bid` from `valuation`, if present.

## [0.6.0] - 2026-08-17

### Added

- League-scoped valuation JSON import (`POST
  /leagues/:leagueId/valuations/import`): validates the whole document
  against a strict Zod schema (required fields, `ruolo`/`confidence`
  enums, non-negative integers) and rejects non-conforming input
  wholesale rather than discarding individual rows. Also rejects the
  import if the document's `league_name` doesn't match the target
  league, guarding against importing a JSON generated for a different
  league.
- Deterministic `name`+`team` → `player_id` matching against the shared
  player pool (case-insensitive, trimmed), with an idempotent upsert
  into `valuation (league_id, player_id)`. Matches that are absent or
  ambiguous are never guessed: they are reported as `unmatched` with a
  reason instead.
- Manual reconciliation endpoint (`PUT
  /leagues/:leagueId/valuations/:playerId`) and a `GET /players`
  listing endpoint, used by the web app to let the user resolve each
  unmatched row by hand-picking an existing player or discarding it.
- Valuations screen in the web app, reachable from each league row:
  JSON upload with an import report, an unmatched-row reconciliation
  table (filterable player picker, assign/discard), and a read-only
  table of the league's current valuations.

## [0.5.0] - 2026-08-16

### Added

- Full CRUD REST API for the `manager` entity scoped to a league
  (`GET/POST /leagues/:leagueId/managers`, `PUT/DELETE
  /leagues/:leagueId/managers/:id`), with request validation via shared Zod
  schemas and a `409 CONFLICT` mapping for duplicate manager names within a
  league (`manager_league_name_uk`), extending the existing
  constraint-based unique-violation mapping in the error handler.
- Explicit guard against deleting a manager with recorded purchases
  (`409 CONFLICT`): the `purchase` log stays immutable rather than relying
  on the database's `ON DELETE CASCADE`, which remains only as a
  safety net for whole-league deletion.
- Manager management screen in the web app, reachable from each league row:
  a list view and a create/edit form, mirroring the league management UI.

## [0.4.0] - 2026-08-15

### Added

- CSV quotazioni import endpoint (`POST /players/import`) for the shared
  `player` pool: parses the Fantacalcio.it classic export (`;`-delimited,
  `R`/`Nome`/`Squadra` columns), normalizes name/team/ruolo, and performs an
  idempotent `name`+`team` upsert so reimporting the same file never creates
  duplicates. A new `UNIQUE (name, team)` constraint on `player` backs the
  upsert; `image_url` is left untouched on update so a later photo backfill
  is never overwritten by a requotation import.
- Row-level import report (`inserted`/`updated` counts, `discarded` rows with
  a reason each for missing fields or an invalid `ruolo`), typed and shared
  between `server` and `web` via `@fanta-helper/shared`.
- Import quotazioni screen in the web app: CSV file upload with a report
  preview, reachable via a simple in-app nav alongside the leagues screen.

## [0.3.0] - 2026-08-15

### Added

- Full CRUD REST API for the `league` entity (`GET/POST /leagues`,
  `GET/PUT/DELETE /leagues/:id`), with request validation via shared Zod
  schemas and a structured `{ error: { code, message, fields? } }` response
  contract for `400`/`404`/`409` errors, including a clean `409 CONFLICT`
  mapping for unique-name violations instead of a raw Postgres error.
- Zod schemas and inferred types for league payloads and JSONB columns
  (`roster_config`, `scoring`, `modificatori`) in `@fanta-helper/shared`,
  used as the single source of truth by both `server` (request validation)
  and `web` (client-side form validation).
- League management screen in the web app: a list view (name, n_squadre,
  budget, edit/delete) and a create/edit form (roster config counters,
  free-form `scoring`/`modificatori` JSON editors), switching views via
  local component state.

## [0.2.0] - 2026-08-15

### Added

- PostgreSQL schema (`league`, `player`, `valuation`, `manager`, `purchase`)
  via `node-pg-migrate` SQL migrations, with foreign keys, `CHECK`-based
  `ruolo`/`confidence` enums, and constraints enforcing the domain invariant
  that auction state is always derived from the immutable `purchase` log
  (composite primary keys and a league-consistent manager foreign key
  prevent duplicate or cross-league purchases from ever being stored).
- Typed data-access layer in `server/src/db` (`pg`-based) with read/insert
  query modules per table and a derived-state query computing each
  manager's remaining budget straight from the `purchase` log.
- `db:migrate`, `db:migrate:down`, and `db:seed` scripts (root and `server`
  workspace), plus `DATABASE_URL` in `server/.env.example`.

## [0.1.0] - 2026-08-15

### Added

- Monorepo scaffolding with npm workspaces: `web` (React + TypeScript SPA via
  Vite), `server` (thin Node + TypeScript backend), and `shared` (shared
  TypeScript types, source-only, no build step).
- Shared types for player roles (P/D/C/A), league rules configuration, and the
  `Valuation` import schema.
- Minimal Express server with a `GET /health` endpoint.
- Placeholder web page rendering the application name.
- Strict TypeScript configuration, ESLint (flat config) and Prettier across
  all packages.
