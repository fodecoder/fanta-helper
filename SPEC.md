# SPEC.md — Specifiche

## Stack e hosting

- Frontend: React + TypeScript (SPA), deploy su Cloudflare Pages.
- Backend: Node/TypeScript sottile, deploy su Render.
- Database: PostgreSQL su Neon.
- Uso personale, nessun login. L'isolamento tra aste avviene per riga `league`.

## Modello dati

Le tabelle. I tipi sono indicativi; i vincoli esatti vivono nelle migrazioni.

### `league`

| campo           | tipo   | note                                              |
|-----------------|--------|---------------------------------------------------|
| `id`            | PK     |                                                   |
| `name`          | text   | univoco, nome parlante della lega/asta            |
| `n_squadre`     | int    | numero di partecipanti                            |
| `budget`        | int    | budget per manager                                |
| `roster_config` | JSONB  | `{ "P": n, "D": n, "C": n, "A": n }`              |
| `scoring`       | JSONB  | sistema di punteggio (bonus/malus, fasce gol)     |
| `modificatori`  | JSONB  | modificatore difesa/centrocampo e simili          |

**Default alla creazione.** Il form nuova lega parte da valori precompilati,
tutti modificabili: `n_squadre = 8`, `budget = 1000`, rosa `{ P: 3, D: 8, C: 8,
A: 6 }`, più il punteggio e i modificatori standard descritti sotto.

### Punteggio e modificatori standard

`scoring` e `modificatori` sono JSONB ma con forma tipizzata (validata in
`shared/src/league.ts`). I valori di default seguono il regolamento standard del
Fantacalcio (Fantagazzetta):

- **Bonus/malus** (`scoring`): gol `+3`, assist `+1`, rigore segnato `+2,5`,
  rigore parato `+2,5`, rigore sbagliato `−2,5`, ammonizione `−0,5`, espulsione
  `−1`, autorete `−2`, gol subito (portiere) `−1`.
- **Fasce gol** (`scoring.fasce_gol`): soglie di punteggio-squadra che valgono
  una rete, default `[66, 72, 77, 81, 85, 89]` (la prima rete a 66).
- **Modificatori** (`modificatori`): `difesa` attivo con tabella media→bonus
  `6 → +1`, `6,5 → +3`, `7 → +6`; `centrocampo`, `attacco`, `portiere`,
  `capitano`, `modulo` come toggle (default disattivi).

I valori restano configurabili per lega: il valore dei calciatori è RELATIVO
alle regole scelte.

### Manager automatici

Alla creazione della lega vengono generati i partecipanti: il manager
proprietario **`Io`** più `n_squadre − 1` avversari con nomi generati
divertenti. Restano gestibili (rinomina/elimina) dalla schermata Manager: è solo
un default per non partire da una lega vuota. Non sono stato mutabile — gli
acquisti continuano a referenziare `manager.id`.

### `player`

| campo       | tipo | note                                          |
|-------------|------|-----------------------------------------------|
| `id`        | PK   | chiave interna                                |
| `fanta_id`  | int  | id ufficiale Fantacalcio (`Id` dei listoni), nullable, univoco — chiave di join stabile per quotazioni e statistiche storiche |
| `name`      | text |                                               |
| `team`      | text | squadra di appartenenza                       |
| `ruolo`     | enum | `P` / `D` / `C` / `A`                         |
| `image_url` | text | nullable; pronta per backfill foto reali      |

Il pool `player` è condiviso tra tutte le leghe.

> **`fanta_id` — perché.** I file `docs/` (quotazioni e statistiche) condividono
> tutti la colonna `Id` ufficiale di Fantacalcio. È l'unica chiave stabile per
> unire quotazioni e statistiche allo stesso giocatore senza affidarsi al
> matching fragile per `name`+`team` (che cambia con trasferimenti e grafie). Il
> matching testuale resta il fallback per le righe prive di `Id`.

**Import quotazioni.** Il pool si popola dal listone ufficiale in formato **CSV
(`;`) o xlsx**. Il parser individua la riga di intestazione (tollerando una
riga-titolo iniziale) e richiede le colonne `R`, `Nome`, `Squadra`. Le righe con
ruolo non valido o campi mancanti finiscono in un report di scarto, non vengono
inventate. Un reimport non azzera `image_url`.

### `quotation` — quotazioni per stagione (storico + corrente)

Dati dei file `docs/Quotazioni_Fantacalcio_Stagione_*.xlsx`. Riferimento globale,
non per-lega. Una riga per `(player_id, season)`.

| campo       | tipo | note                                                    |
|-------------|------|---------------------------------------------------------|
| `player_id` | FK   | → `player.id` (join via `fanta_id`)                     |
| `season`    | text | es. `2025-26`                                           |
| `qt_i`      | int  | `Qt.I` — quotazione iniziale (Classic)                  |
| `qt_a`      | int  | `Qt.A` — quotazione attuale (Classic)                   |
| `fvm`       | int  | `FVM` — FantaValore di Mercato (Classic)                |

Colonne del listone: `Id, R, RM, Nome, Squadra, Qt.A, Qt.I, Diff., Qt.A M,
Qt.I M, Diff.M, FVM, FVM M`. Si importano le colonne **Classic** (`Qt.A`, `Qt.I`,
`FVM`); le varianti Mantra (`* M`) non servono in questa lega e si ignorano.
Import a sostituzione per stagione (snapshot in transazione). La stagione si
ricava dal nome file, non si indovina.

> **Nota — "quanto pagato di media nelle altre aste".** Questo dato **non è
> presente** nei listoni ufficiali. La colonna più vicina è `FVM` (FantaValore di
> Mercato), un indice del trend dei prezzi ad asta, che usiamo come **proxy**
> dichiarato del prezzo di mercato — non è una media di aggiudicazioni reali. Un
> vero "prezzo medio pagato" richiederebbe una fonte esterna (aggregatori di
> leghe) qui assente; se servisse, va aggiunto come campo separato e non spacciato
> per `FVM`.

### `player_season_stats` — statistiche per stagione (storico)

Dati dei file `docs/Statistiche_Fantacalcio_Stagione_*.xlsx`. Riferimento
globale. Una riga per `(player_id, season)`.

| campo       | tipo    | note                                              |
|-------------|---------|---------------------------------------------------|
| `player_id` | FK      | → `player.id` (join via `fanta_id`)               |
| `season`    | text    | es. `2024-25`                                      |
| `presenze`  | int     | `Pv` — partite a voto                             |
| `mv`        | numeric | `Mv` — media voto                                 |
| `fm`        | numeric | `Fm` — fantamedia (media fantavoto)              |
| `gf`        | int     | `Gf` — gol fatti                                  |
| `gs`        | int     | `Gs` — gol subiti (portieri)                      |
| `assist`    | int     | `Ass`                                             |
| `rp`        | int     | `Rp` — rigori parati                             |
| `rc`        | int     | `Rc` — rigori calciati                           |
| `rig_plus`  | int     | `R+` — rigori segnati                            |
| `rig_minus` | int     | `R-` — rigori sbagliati                          |
| `amm`       | int     | `Amm` — ammonizioni                              |
| `esp`       | int     | `Esp` — espulsioni                               |
| `autogol`   | int     | `Au`                                             |

Colonne complete del file: `Id, R, Rm, Nome, Squadra, Pv, Mv, Fm, Gf, Gs, Rp,
Rc, R+, R-, Ass, Amm, Esp, Au`. Per ogni stagione esistono **tre varianti** di
file (base, `_Italia`, `_Statistico`): differiscono solo per la fonte dei voti.
Si adotta come canonica la variante **base** (fonte Fantacalcio); le altre due si
ignorano salvo decisione esplicita. `Mv`/`Fm` sono decimali, si conservano come
`numeric`, non arrotondati all'import.

> **Nota — API esterna in gran parte ridondante per lo storico.** Le statistiche
> reali di rendimento (minuti/presenze, gol, assist) delle stagioni passate sono
> **già** in questi file. Per lo storico l'API stats esterna non aggiunge nulla:
> serve al più per la stagione **in corso** aggiornata giornata per giornata.

### `goalkeeper_grid`

| campo   | tipo | note                                        |
|---------|------|---------------------------------------------|
| `id`    | PK   |                                             |
| `team`  | text | squadra di Serie A                          |
| `rank`  | int  | gerarchia del portiere (`1` = titolare)     |
| `name`  | text | nome del portiere                           |

Dato di **riferimento globale** (non per-lega, non legato agli acquisti): la
gerarchia dei portieri per squadra, usata solo in consultazione durante l'asta.
Import da CSV/xlsx in **formato largo** — una riga per squadra con colonne
`Squadra`, `Titolare`, `Riserva`, `Terzo` (e simili `Portiere 2`, `P3`). Ogni
import **sostituisce** l'intera griglia (snapshot in transazione).

### `valuation`

| campo         | tipo | note                                         |
|---------------|------|----------------------------------------------|
| `league_id`   | FK   | → `league.id`                                |
| `player_id`   | FK   | → `player.id`                                |
| `tier`        | text | fascia                                       |
| `target`      | int  | prezzo obiettivo                             |
| `fair_value`  | int  | valore equo                                  |
| `max_bid`     | int  | rilancio massimo suggerito                   |
| `panic_price` | int  | soglia oltre cui non inseguire               |
| `confidence`  | enum | affidabilità della valutazione               |
| `note`        | text | nullable                                     |

`valuation` è **per-lega**: lo stesso giocatore ha valori diversi a seconda
delle regole della lega, perché il valore è RELATIVO alla lega, non assoluto.

### `manager`

| campo       | tipo | note          |
|-------------|------|---------------|
| `league_id` | FK   | → `league.id` |
| `name`      | text |               |

### `purchase`

| campo        | tipo      | note                         |
|--------------|-----------|------------------------------|
| `league_id`  | FK        | → `league.id`                |
| `player_id`  | FK        | → `player.id`                |
| `manager_id` | FK        | → `manager.id`               |
| `prezzo`     | int       | prezzo di aggiudicazione     |
| `ts`         | timestamp | istante dell'acquisto        |

`purchase` è il **log immutabile** dell'asta. Non si aggiorna e non si cancella
in condizioni normali: è la sorgente di verità. Tutto lo stato dell'asta
(residuo budget, slot liberi, max bid rettificato) è funzione pura di questo log:
`residuo = budget − Σ(prezzo acquisti del manager)`.

## Riusabilità

- Una nuova asta = una nuova riga `league` con nome parlante e univoco.
- Il pool `player` è condiviso; non si duplica per lega.
- Nessun login: l'identità della sessione è la lega selezionata.

## Miniature

- MVP: stemma della squadra + iniziali del giocatore su placeholder colorato per ruolo.
- La colonna `player.image_url` è pronta per il backfill delle foto reali (fase 3).

## Schema JSON delle valutazioni (import LLM)

Formato stretto per rendere l'import deterministico. L'LLM produce questo JSON
una volta (o su refresh); non entra nel loop dell'asta live. I dati vengono
salvati in `valuation`.

Documento radice:

```json
{
  "league_name": "string (obbligatorio)",
  "generated_at": "string ISO 8601 (obbligatorio)",
  "players": [ /* array di oggetti Valuation, obbligatorio, ≥1 */ ]
}
```

Oggetto `Valuation`:

| campo         | tipo               | obbligatorio | note                                   |
|---------------|--------------------|--------------|----------------------------------------|
| `name`        | string             | sì           | usato per il matching nome→ID          |
| `team`        | string             | sì           | disambigua il matching                 |
| `ruolo`       | `"P"\|"D"\|"C"\|"A"` | sì         | enum stretto                           |
| `tier`        | string             | sì           |                                        |
| `target`      | integer ≥ 0        | sì           |                                        |
| `fair_value`  | integer ≥ 0        | sì           |                                        |
| `max_bid`     | integer ≥ 0        | sì           |                                        |
| `panic_price` | integer ≥ 0        | sì           |                                        |
| `confidence`  | `"low"\|"medium"\|"high"` | sì     | enum stretto                           |
| `note`        | string             | no           | può essere assente o `null`            |

Regole di validazione all'import:

- Ogni campo obbligatorio presente e del tipo dichiarato, altrimenti la riga è scartata e segnalata.
- `ruolo` e `confidence` devono rispettare l'enum; nessun altro valore ammesso.
- I valori numerici sono interi non negativi.
- Il matching `name`+`team` → `player_id`: i match ambigui o assenti finiscono
  in una lista unmatched per revisione manuale, non vengono inventati.

> **UI — la struttura va mostrata a chi carica.** Oggi lo schema è solo qui in
> `SPEC.md`: chi usa l'import JSON non sa cosa caricare. La schermata di import
> deve **esporre lo schema** (campi, tipi, enum) e offrire un **template
> scaricabile** (JSON di esempio valido) e/o un riepilogo inline degli errori di
> validazione riga per riga. La verità dello schema resta `shared/src/valuation.ts`
> (Zod): la UI ne è il riflesso, non una seconda definizione.

## Dati Serie A — wishlist, formazioni, calci piazzati (Fase 4, implementata)

Modello **implementato** (`v1.5.0`→`v1.8.0`). Vale sempre l'invariante: nessuno
di questi dati è stato mutabile dell'asta; il residuo/slot restano funzione del
log `purchase`.

### `wishlist` — giocatori desiderati (per-lega)

| campo       | tipo | note                                          |
|-------------|------|-----------------------------------------------|
| `league_id` | FK   | → `league.id`                                 |
| `player_id` | FK   | → `player.id`                                 |
| `priority`  | int  | ordinamento desiderato (nullable)             |
| `note`      | text | nullable                                      |

Lista di supporto (obiettivi d'asta), evidenziata nella schermata Asta. Non
influenza lo stato derivato. Univoca per `(league_id, player_id)`.

### Dati Serie A — probabili formazioni e calci piazzati (globali)

Riferimento globale come `goalkeeper_grid` (non per-lega). Ingest via **upload
screenshot** con estrazione (OCR/LLM → dati strutturati e/o immagine conservata)
e/o **integrazione esterna** (fragile; da isolare dietro il backend). Import a
sostituzione (snapshot).

- `probable_lineup`: `(team, player_name, ruolo?, stato)` — `stato` es.
  titolare/panchina/ballottaggio.
- `set_piece_taker`: `(team, tipo, player_name, rank)` — `tipo` ∈
  `rigore | punizione | corner`, `rank` = gerarchia (1 = primo tiratore).

I rigoristi/tiratori si mostrano nella stessa vista delle formazioni.

### API stats/attributi esterna (opzionale, solo backend, provider pluggable)

Per il confronto in asta il ranking **base** usa solo dati in-app (valutazioni +
statistiche storiche dei file `docs/` + bisogni rosa). L'arricchimento esterno è
**opzionale** e non deve mai degradare la base. Il provider è **pluggable** dietro
un'interfaccia unica lato backend; chiave **solo lato backend**, chiamate proxied,
risposte in **cache** e con **rate-limit**.

**Provider previsti e cosa forniscono (assi di dato diversi — non intercambiabili):**

| provider           | tipo di dato                                   | uso                                    |
|--------------------|------------------------------------------------|----------------------------------------|
| API-Football (attuale) | statistiche **reali** di partita: minuti, gol, assist | rendimento stagione in corso           |
| SoFIFA             | **attributi di gioco EA FC**: overall, potential, età, ruolo, valore FIFA | profilo/potenziale, non rendimento reale |

> **Attenzione — SoFIFA non sostituisce API-Football alla pari.** Sono due assi
> diversi: API-Football dà il **rendimento reale** (minuti/gol/assist), SoFIFA dà
> i **rating del videogioco** (overall, potential, attributi). Sostituire l'una
> con l'altra **cambia la natura dell'arricchimento**, non è un drop-in. Inoltre
> il rendimento reale storico è già nei file `docs/` (vedi `player_season_stats`),
> quindi API-Football serve solo per la stagione viva. Decisione consigliata:
> **non rimuovere** l'interfaccia stats reali; aggiungere SoFIFA come **secondo
> provider** (attributi/potential), separato e disattivabile. Note su SoFIFA:
> l'accesso richiede un **API token** dalle impostazioni account (solo da PC) ed è
> soggetto ai loro termini; va citata l'attribuzione ai creatori come richiesto.
> Se l'obiettivo è solo ridurre i costi, il punto non è SoFIFA vs API-Football ma
> che **entrambe** restino opzionali e a costo nullo quando spente.

### Engine — consiglio giocatori

Motore di raccomandazione che, dato lo stato della rosa `Io` e il pool
disponibile (derivato dal log `purchase`), ordina i giocatori per **valore
RELATIVO alla lega**. Deterministico e derivato: nessun campo di stato mutabile.

**Principi (allineati alle pratiche note del dominio):**

- **Valore sopra il rimpiazzo (replacement level).** Non conta il valore assoluto
  ma il margine rispetto al giocatore marginale acquistabile in quel ruolo con il
  budget/slot residui. È la trasposizione fantacalcistica del VORP.
- **Affidabilità = presenze.** A pari `Fm`, chi gioca di più vale di più: si pesa
  la fantamedia per la quota di presenze (`presenze / partite_stagione`). Una `Fm`
  alta su poche presenze è un segnale debole, va scontata.
- **Potenziale di bonus per ruolo.** Gol/assist/rigori (da `player_season_stats`)
  contano diversamente per ruolo; il peso dipende dallo `scoring` della lega.
- **Regole della lega.** `scoring` e `modificatori` cambiano il valore: es. col
  modificatore difesa attivo i difensori/portieri affidabili valgono di più. Il
  motore legge le regole della lega, non usa pesi fissi.
- **Scarsità di reparto e bisogni residui.** Il valore sale se il reparto è
  scarso e `Io` ha ancora slot da riempire lì; scende sui reparti già coperti.
- **Trend/proxy prezzo.** `FVM` e `Qt.A` correnti calibrano il prezzo atteso; il
  motore segnala il divario tra valore stimato e prezzo di mercato (occasioni).

**Output.** Per ogni giocatore disponibile: punteggio di valore, fascia, e i
componenti (affidabilità, bonus attesi, aggiustamento regole, scarsità) così che
il suggerimento sia **spiegabile**, non una scatola nera. L'engine alimenta sia
una vista "consigli" sia l'ordinamento delle alternative in asta.

## Vista Asta — dati mostrati (requisiti)

Tutti derivati; nessuno è stato mutabile. Fonti tra parentesi.

**Giocatore in asta** (quello che si sta battendo): oltre a `Tier`, `Fair value`,
`Target`, `Max`, `Panic`, `Δ vs prezzo in asta` (da `valuation` + log), mostra:

- **Media fantavoto** `Fm` e **media voto** `Mv` (`player_season_stats`, ultima
  stagione con presenze; opzionale media pesata multi-stagione).
- **Quotazione attuale** `Qt.A` e **FVM** (`quotation`, stagione corrente).
- **Prezzo medio pagato**: usa `FVM` come proxy dichiarato (vedi nota su
  `quotation`); non è un dato reale di aggiudicazioni.
- Info giocatore: squadra, ruolo, presenze stagione, gol/assist, eventuale ruolo
  nei calci piazzati e stato nelle probabili formazioni (dati già in-app).

**Lista a sinistra — giocatori ancora da chiamare** (non nel log `purchase`):
**ordinabile** per `FVM`, `Qt.A` (quotazione attuale) o `Qt.I` (quotazione
iniziale).

**Alternative disponibili stesso ruolo**: almeno **10** ancora disponibili,
**ordinabili** per i vari valori (fair value, target, max bid, `Fm`, `FVM`,
`Qt.A`, punteggio engine). Per non affollare la vista, i dettagli estesi di ogni
alternativa stanno dietro un **bottone "Dettagli"** (pannello/espansione), con le
stesse info del giocatore in asta.

## Palette

Valori forniti (derivati dal riferimento del proprietario):

- Verde principale (brand / azioni): `#2BA756`
- Blu / blu scuro (sfondi / header): `#11246F` o `#144F89`
- Arancione (accenti / richiami): `#FF8300`
- Verde scuro (secondario): `#077449`
- Bianco (sfondi / testi): `#FFFFFF`

> Nota: da consolidare come design token (es. variabili CSS) al momento della
> rifinitura UI (Fase 2). La scelta tra i due blu va fissata sul riferimento reale.
