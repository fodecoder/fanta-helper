# Handoff: ristrutturazione portale FantaProfeta

## Overview

Ristrutturazione totale della SPA `fanta-helper` (FantaProfeta): gestione di aste
del Fantacalcio con stato interamente derivato dal log immutabile `purchase`.

Due cambi strutturali rispetto all'attuale:

1. **Shell lega-centrica.** Si sceglie la lega una volta, in una sidebar fissa;
   tutto il resto (Panoramica, Manager, Valutazioni, Quotazioni, Coppie
   portieri, Probabili formazioni, Leghe) vive dentro quella lega. Sparisce la
   navigazione a bottoni annidati Home → lega → sotto-vista.
2. **Modalità asta separata, a schermo pieno.** Setup e asta live sono due
   contesti distinti: durante la chiamata non esiste navigazione, solo la
   chiamata, il prezzo e ciò che serve per decidere. Si entra con un bottone
   dalla sidebar, si esce con `Esc`.

Problema specifico risolto in asta: *"devo scorrere la lista e il confronto con
le top choice non è immediato"*. La schermata mostra sempre, senza interazioni,
il giocatore in asta con la sua scala di prezzo (target → fair value → max bid →
panic), le alternative libere dello stesso ruolo ordinate per fair value con Δ
rispetto al giocatore in asta, e il proprio stato (max bid rettificato, residuo,
slot liberi per ruolo, ultime chiamate).

## About the Design Files

I file in `design/` sono **riferimenti di design scritti in HTML**: prototipi che
mostrano aspetto e comportamento voluti, **non codice da copiare in produzione**.
Sono "Design Components" (`.dc.html`, un runtime proprietario di prototipazione):
apri il file in un browser per vederli, ma non riusarne l'impalcatura.

Il lavoro è **ricreare queste schermate nel codebase esistente**: React 19 +
TypeScript, Vite, monorepo npm workspaces (`web` / `server` / `shared`), CSS
semplice in `web/src/index.css` con custom properties, nessuna libreria UI. Va
mantenuto tutto ciò che il repo già fa bene:

- lo stato dell'asta arriva dal backend (`GET /purchases`, `GET /purchases/state`);
  niente stato duplicato lato client;
- `computeAdjustedMaxBid` in `shared/src/maxBid.ts` resta l'unica fonte del max
  bid rettificato (nei prototipi è riprodotta: `residuo − (slotLiberi − 1)`);
- il confronto per ruolo resta derivato client-side dai dati già scaricati
  (players + valuations + log), come oggi in `RoleComparisonPanel.tsx`.

I dati nei prototipi sono **finti** (32 giocatori, 16 acquisti seed, 8 manager,
matrice portieri generata da hash, tre formazioni probabili). Servono solo a far
vedere le schermate popolate: vanno sostituiti dalle API reali.

## Fidelity

**High-fidelity.** Colori, tipografia, spaziature e stati sono definitivi e
provengono dal design system **Broadsheet** (`design/_ds/broadsheet-*/styles.css`,
che è la fonte di verità: token in `:root` + classi componente). L'obiettivo è
ricreare l'UI fedelmente, importando quel foglio di stile (o portandone i token
in `index.css`) invece di riscrivere valori a mano.

Il design system in breve: carta chiara `#f3f2f2`, inchiostro `#201e1d`, un solo
serif (Source Serif 4) anche per la chrome, accento ciano `#0088b0` per gli
elementi interattivi, magenta `#d6006c` come secondo colore raro (allarmi,
righe incerte). **Nessun box, nessun bordo, nessuna card per strutturare la
pagina**: la gerarchia è scala tipografica + spazio bianco. L'unica eccezione
sono le tabelle (`.table`) e il filetto grosso+fine sotto la testata.

## Screens / Views

### 1. Shell (tutte le pagine di setup)

`design/FantaProfeta - Portale.dc.html`, vista `dashboard`.

- Grid `236px | 1fr`, `min-height: 100vh`.
- **Sidebar**: `padding: 26px 20px 26px 30px`, `gap: 26px`, `border-right: 1px
  solid var(--color-divider)` (unico bordo strutturale della pagina, serve a
  separare due assi di lettura).
  - Marchio: `assets/logo.png` a `height: 26px` + "FantaProfeta" 19px/600.
  - Lega attiva: kicker "LEGA ATTIVA" 10px/600 maiuscoletto `letter-spacing:
    .12em` colore accento; `<select>` senza box (solo `border-bottom`), 17px/600;
    riga meta 12px `--color-neutral-700` con `8 squadre · budget 1000 · rosa 3·8·8·6`.
  - Nav: 7 voci 14px, quella attiva `--color-accent` e 600. Nessun fondo, nessun
    pill: solo colore e peso.
  - In fondo: `.btn .btn-primary .btn-block` "Entra in modalità asta" + nota 11px
    "Schermo pieno, tastiera, nessuna navigazione. Esci con Esc." + versione.
- **Main**: `padding: 34px 40px 60px`, `max-width: 1080px`.
  - Testata: kicker 10px maiuscoletto a sinistra (cambia per pagina), contatore
    chiamate a destra, poi filetto `3px` + `1px` inchiostro pieno con `8px` e
    `2px` di stacco. È l'unico posto dove il sistema disegna righe.
  - `h1` 46px, sottotitolo esplicativo max `58ch` in `--color-neutral-800`.

Kicker per pagina: `Panoramica lega · asta in corso`, `Configurazione ·
partecipanti`, `Configurazione · listino della lega`, `Riferimento globale ·
listino Fantacalcio`, `Riferimento globale · matrice coppie`, `Riferimento
globale · undici probabili`, `Configurazione · regolamenti`.

### 2. Panoramica

- Quattro figure grandi in riga (`gap: 52px`): **Il mio residuo**, **Max bid
  rettificato**, **Slot liberi**, **Speso in lega**. Numerali in `.cmyk-num`
  (numero stampato come tre lastre di processo disallineate: markup = uno span
  `.paper` con il testo reale + tre span `.plate .plate-c/-m/-y` `aria-hidden`
  con lo stesso testo), `font: 600 54px/0.9`. In un codebase senza quel
  trattamento: numerale 54px/600 con l'etichetta 10px maiuscoletto sopra.
  Attenzione: `.cmyk-num` sborda sotto la propria box (line-height .9 +
  padding/margin `±0.12em`), quindi serve `margin-top: 16px` all'etichetta se
  sta sotto il numero.
- **Stato dei manager**: `.table` con Manager (quadratino 6×6 accento per "Io",
  neutro per gli altri), Speso, Residuo, barra "Budget consumato" (traccia
  `--color-neutral-300` 6px, riempimento accento per Io / `--color-neutral-600`
  per gli altri, larghezza = speso/budget), slot P/D/C/A come `usati/totali`,
  Max bid rettificato in 600.
- Due colonne (`gap: 52px`, entrambe `min-width: 0`, tabelle `table-layout:
  fixed` e nomi troncati con ellipsis): **Obiettivi ancora liberi** (wishlist non
  ancora assegnata: nome, ruolo, fair value, max bid) e **Ultime chiamate**
  (giocatore, manager, prezzo, Δ vs fair value: `+` magenta `--color-accent-2-700`,
  `−` ciano `--color-accent-700`).

### 3. Manager

- Campo "Nuovo manager" (`.field` + `.input`, 250px) + `.btn .btn-primary`
  "Aggiungi".
- `.table` max 820px: nome **editabile inline** (`.input` `min-height: 30px`),
  giocatori acquistati, speso, residuo, colonna Stato (`"n acquisti a log"` /
  `"eliminabile"`), bottone Elimina disabilitato (opacity .45, `cursor:
  not-allowed`) se ci sono acquisti — il log è immutabile.
- Rinominare un manager deve aggiornare anche i riferimenti nel log (nel repo
  il log punta a `manager_id`, quindi lato server è un semplice UPDATE del nome).

### 4. Valutazioni

- Azioni: `.btn-primary` "Genera valutazioni", `.btn-secondary` "Importa JSON",
  nota 12px sulla durata della chiamata a Claude (chunk per ruolo).
- **Revisione bozza** (solo dopo la generazione): tabella con Tier, Target, Fair
  value, Max bid, Panic price editabili (`.input` `min-height: 28px`, colonne
  70–82px), `select` confidence low/medium/high, "Scarta" per riga, "Salva tutto"
  in alto a destra. Wrapper `overflow-x: auto`, tabella `min-width: 1020px`.
- **Righe non abbinate**: nome/squadra/ruolo/tier + motivo in magenta +
  "Assegna a…" (riconciliazione manuale, come `UnmatchedValuationRow.tsx`).
- **Valutazioni correnti**: ricerca (220px) + segmented ruolo (Tutti/P/D/C/A,
  attivo = fondo accento, testo carta), tabella con tier in accento 600, fair
  value in 600, panic in neutro; righe di giocatori già assegnati a `opacity: .5`.

### 5. Quotazioni · import

- `.field` con `input[type=file]` (`.csv,.xlsx,.xls`) + `.btn-primary "Importa"`.
- Report: tre figure 34px/600 (Importate, Aggiornate, Scartate — quest'ultima in
  magenta) + tabella righe scartate: Riga, Nome, Squadra, Ruolo, Motivo (magenta).
  Le righe non interpretabili si mostrano, non si indovinano.

### 6. Coppie portieri

- `select` squadra (14 squadre) + campo file per sostituire la matrice.
- Tabella max 640px: squadra compagna, barra favorevolezza (7px; accento se
  `display > 72%` del massimo, altrimenti `--color-neutral-500`) con il valore in
  600 a destra, punteggio grezzo in neutro. `display = maxScore − score`, come in
  `GkPairingPanel.tsx`.

### 7. Probabili formazioni

- Riga di ingest: squadra + screenshot PNG/JPEG + `.btn-primary "Estrai"`.
- **Revisione bozza**: nome/ruolo editabili, `select` stato
  (titolare/panchina/ballottaggio), checkbox Escludi, `.btn-primary "Conferma"`.
  Righe incerte con fondo `color-mix(in srgb, var(--color-accent-2) 9%,
  transparent)` e riga di motivo 11px/600 magenta `"incerto: …"`.
- **Formazioni confermate**: chip squadra, `h2` squadra + `modulo 3-5-2` in
  neutro (calcolato, mai persistito, omesso se i titolari non sono 11 con ruoli
  noti), poi tre colonne: Undici probabile (11 righe con sigla ruolo colorata),
  Ballottaggio + Panchina, Calci piazzati (Rigoristi/Punizioni/Corner numerati).

### 8. Leghe

- Tabella leghe: nome (attiva in 600), squadre, budget, rosa, chiamate, Modifica.
- Form nuova lega: Nome/Squadre/Budget; Rosa P·D·C·A; Punteggio in grid 3 colonne
  (9 campi, step .5); Fasce gol come testo `66, 72, 77, 81, 85, 89`; Modificatori
  come sei toggle (quadratino 14px, `border-radius: var(--radius-md)`, pieno
  accento quando attivo) + tabella difesa media→bonus a 3 bande; "Crea lega" /
  "Annulla". Default dal repo: `3/8/8/6`, 8 squadre, budget 1000, punteggio e
  modificatori standard (`shared/src/league.ts`).

### 9. Asta live — desktop

`design/FantaProfeta - Portale.dc.html`, vista `auction` (min-width utile 1300px;
sotto quella soglia la griglia scorre in orizzontale).

- Testata: marchio, "ASTA LIVE" in magenta, lega + chiamate, promemoria tastiera
  `↑↓ scegli · Invio assegna · 1-9 prezzo · Esc esci`, bottone "Esci"; filetto
  3px+1px.
- Griglia `320px | minmax(560px,1fr) | 288px`, `gap: 30px`, `padding: 22px 30px 30px`.
- **Colonna 1 — Chiamata**: `h6` "Chiamata · N liberi", ricerca 16px (autofocus
  all'ingresso), segmented ruolo, lista scrollabile (`max-height: calc(100vh -
  260px)`): barra 3px del ruolo a sinistra (accento se selezionato), tier in
  accento 600, nome, squadra in neutro, fair value in 600 a destra, stella
  wishlist 30px. Riga selezionata: fondo `color-mix(accent 12%)` + 600.
  Ordinamento per fair value discendente.
- **Colonna 2 — In asta**: kicker "IN ASTA · ATTACCANTE", nome 52px, riga meta
  (squadra, tier, fair value, target, panic), **verdetto** 26px/600 a destra
  (Affare / Prezzo giusto / Sopra il fair value / Zona panic / Fuori mercato;
  gli ultimi due in magenta).
  - **Price ladder**: traccia 2px con zona target→max in ciano al 22% e zona
    max→panic in magenta al 20%; quattro tick con etichetta + valore, sfalsati su
    due file (`+34px` per i dispari) perché le quattro soglie sono vicine; dominio
    `0.55·target → 1.06·panic`; marcatore verticale 2px del prezzo digitato, con
    il numero 20px/600 nel colore del verdetto.
  - Riga prezzo: `.input` 22px/600 (132px), bottoni `−5 −1 +1 +5`, chip manager
    (8, "Io" primo), `.btn-primary "Assegna"` (`min-height: 46px`).
  - Riga impatto: "Cippa resterebbe con 219 crediti per 6 slot — 36 di media",
    oppure in magenta "Oltre il max bid rettificato di Io (500)" / "Slot A già
    pieni (6/6)".
- **Colonna 3 — Io**: max bid rettificato come numerale a lastre 46px, poi
  residuo / speso / slot liberi 22px; slot per ruolo come pip (`height: 10px`,
  pieni nel colore del ruolo); Ultime chiamate (7) con pallino ruolo, manager,
  prezzo, Δ vs fair value e "Annulla ultima"; Obiettivi (wishlist libera)
  cliccabili per portare il giocatore in asta.

### 10. Asta live — telefono

`design/FantaProfeta - Asta telefono.dc.html`, disegnata a 402×874 (la cornice
iPhone è solo scenografia del prototipo).

- Fascia fissa: "ASTA LIVE", lega, chiamate; filetto 2px+1px; poi max bid
  rettificato 34px in `--color-accent-700`, residuo e slot liberi 22px, e a
  destra i quattro ruoli come pip 7×7.
- Blocco "in asta" su fondo `color-mix(accent 7%)`: nome 30px, meta 13px,
  verdetto 13px/600, price ladder compatto (etichette `TGT / FV / MAX / PANIC`
  sfalsate), prezzo `.input` 116px 22px/600 + `−5 −1 +1 +5` (tutti ≥48px), chip
  manager a scorrimento orizzontale, `"Assegna a Io"` a piena larghezza
  (`min-height: 50px`), riga impatto 12px.
- **Un solo pannello a tab** (46px, tab attiva con fondo accento 12% e bordo
  inferiore 2px accento): **Lista** (ricerca + filtro ruolo + righe 48px con
  stella 48px), **Alternative** (righe con tier, nome, squadra, fair value, Δ e
  barra fair value + `max … · panic …`), **Log** (chiamate + "Annulla ultima").
  Su 402px le tre viste non stanno affiancate e alla chiamata se ne guarda una
  per volta.
- Tutti i target di tocco ≥44px.

### 11. Riferimento: stato attuale

`design/Stato attuale.dc.html` — ricostruzione fedele delle schermate odierne
(Home e Asta) con i valori esatti di `web/src/index.css`. Serve come base di
confronto per il diff visivo, non va implementato.

## Interactions & Behavior

- **Navigazione**: sidebar cambia pagina senza ricaricare; la lega attiva resta
  in querystring (`?league=<id>`, già implementato in `HomePage.tsx`).
- **Entrata/uscita asta**: bottone in sidebar → vista a schermo pieno, focus
  automatico sulla ricerca dopo ~30ms; `Esc` torna al setup.
- **Tastiera in asta**: `↑`/`↓` spostano la selezione nella lista filtrata
  (`preventDefault`), `Invio` assegna se il prezzo è valido, `Esc` esce.
- **Selezione giocatore**: azzera il prezzo digitato; il confronto per ruolo e la
  ladder si ricalcolano.
- **Assegnazione**: `POST /purchases`; dopo il successo si seleziona il primo
  giocatore libero rimasto, si azzera il prezzo e si ricaricano log e stato.
  Errori del server mostrati sopra il form.
- **Annulla ultima**: `DELETE` dell'ultimo acquisto, con conferma (oggi
  `window.confirm`; in produzione meglio un `.dialog`).
- **Wishlist**: stella ottimistica; un errore non deve interrompere la chiamata.
- **Verdetto e impatto**: puramente derivati, aggiornati a ogni tasto.
- **Import/estrazioni**: nulla viene salvato prima della conferma; le righe
  incerte o scartate sono sempre mostrate con il motivo.
- **Stati**: caricamento (testo neutro), errore (magenta 600), vuoto (corsivo o
  frase esplicativa). Nessuno spinner.
- **Focus visibile**: `:focus-visible { outline: 2px solid var(--color-accent);
  outline-offset: 2px }` — mai il ring blu di default.

## State Management

Client (per vista asta):

- `purchases: PurchaseWithDetails[]` — dal server, unica verità;
- `statuses: ManagerAuctionStatus[]` — da `GET /purchases/state`;
- `players`, `valuations`, `wishlist`;
- UI locale: `selectedPlayerId`, `price` (stringa), `manager`, `query`,
  `roleFilter`, `tab` (solo telefono), `refreshToken` per il refetch.

Derivati, non memorizzati: insieme dei giocatori acquistati, lista filtrata e
ordinata, verdetto, impatto sul budget, ranking dello stesso ruolo, modulo delle
formazioni. `spent`, `residuo`, `slots`, `adjustedMaxBid` restano derivati dal log
lato server (`computeAdjustedMaxBid`).

## Design Tokens

Da `design/_ds/broadsheet-*/styles.css` (usare le variabili, non i letterali):

- Colori: `--color-bg #f3f2f2`, `--color-surface #eae9e9`, `--color-text #201e1d`,
  `--color-accent #0088b0`, `--color-accent-2 #d6006c`,
  `--color-process-yellow #edbb00` (solo trattamenti di stampa),
  `--color-divider = color-mix(#201e1d 16%, transparent)`.
- Rampe 100→900 per neutral / accent / accent-2 (es. `--color-neutral-300
  #d7d3d3`, `--color-neutral-700 #605d5d`, `--color-accent-700 #006786`,
  `--color-accent-2-700 #aa0b56`). Testo piccolo in accento: usare il passo 700.
- Spaziature: `--space-1 5px`, `2 10px`, `3 15px`, `4 20px`, `6 30px`, `8 40px`.
- Raggi: `--radius-sm 1px`, `--radius-md 2px`, `--radius-lg 4px`.
- Ombre: `--shadow-sm/md/lg` (praticamente inutilizzate: il sistema è piatto).
- Tipografia: Source Serif 4 (400 / 600 / 400 italic) per titoli **e** corpo;
  `h1 42px`, `h2 32px`, `h3 25px`, `h4 20px`, `h6 13px` maiuscoletto
  `letter-spacing .08em`; corpo 15px/1.55; tabelle 14px, header tabella 11px
  maiuscoletto. Numeri sempre `font-variant-numeric: tabular-nums`.
- Colori ruolo usati nel prototipo: P giallo di processo, D accento, C
  `--color-neutral-700`, A accento-2.

Classi da riusare: `.btn` + `.btn-primary/-secondary/-ghost/-block`, `.field` +
`.input`, `.table`, `.tag`, `.cmyk-num`, `.hr` (da evitare).

## Assets

- `design/assets/logo.png` — logo esistente del repo (`web/public/logo.png`).
- Nessun'altra immagine. Icone: nessuna nel design attuale; se servissero, il
  sistema prescrive Phosphor icons in peso duotone.
- Font: Source Serif 4 via Google Fonts (importato da `styles.css`).

## Files

- `design/FantaProfeta - Portale.dc.html` — shell lega-centrica, 7 pagine di
  setup + modalità asta desktop.
- `design/FantaProfeta - Asta telefono.dc.html` — asta live su telefono.
- `design/Stato attuale.dc.html` — ricostruzione dell'UI odierna (riferimento).
- `design/_ds/broadsheet-*/styles.css` — design system: token + classi (fonte di
  verità per ogni valore).
- `design/_ds/broadsheet-*/_ds_bundle.js`, `design/support.js`,
  `design/ios-frame.jsx` — runtime dei prototipi, **non** da portare in produzione.

File del repo da leggere prima di iniziare: `web/src/App.tsx`,
`web/src/pages/*`, `web/src/components/*`, `web/src/index.css`,
`shared/src/{purchase,league,valuation,maxBid,probableLineup,setPieceTaker}.ts`,
`SPEC.md`, `CLAUDE.md`.
