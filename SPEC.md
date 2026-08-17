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

| campo       | tipo | note                                        |
|-------------|------|---------------------------------------------|
| `id`        | PK   |                                             |
| `name`      | text |                                             |
| `team`      | text | squadra di appartenenza                     |
| `ruolo`     | enum | `P` / `D` / `C` / `A`                       |
| `image_url` | text | nullable; pronta per backfill foto reali    |

Il pool `player` è condiviso tra tutte le leghe.

**Import quotazioni.** Il pool si popola dal listone ufficiale in formato **CSV
(`;`) o xlsx**. Il parser individua la riga di intestazione (tollerando una
riga-titolo iniziale) e richiede le colonne `R`, `Nome`, `Squadra`. Le righe con
ruolo non valido o campi mancanti finiscono in un report di scarto, non vengono
inventate. Un reimport non azzera `image_url`.

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

## Estensioni pianificate (Fase 4)

Modello previsto, **non ancora implementato** (prompt 19–22 in `PROMPTS.md`).
Vale sempre l'invariante: nessuno di questi dati è stato mutabile dell'asta; il
residuo/slot restano funzione del log `purchase`.

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

### API stats esterna (opzionale, solo backend)

Per il confronto in asta tra il giocatore uscito e i disponibili dello stesso
ruolo, il ranking **base** usa solo dati in-app (valutazioni + bisogni rosa). Un
arricchimento opzionale (minuti, gol, assist) può arrivare da un'API stats
gratuita (es. API-Football, free ~100 req/giorno). Vincoli: chiave **solo lato
backend** (mai nel client), chiamate proxied, risposte in **cache** e con
**rate-limit**. L'assenza dell'API non deve degradare il confronto base.

## Palette

Valori forniti (derivati dal riferimento del proprietario):

- Verde principale (brand / azioni): `#2BA756`
- Blu / blu scuro (sfondi / header): `#11246F` o `#144F89`
- Arancione (accenti / richiami): `#FF8300`
- Verde scuro (secondario): `#077449`
- Bianco (sfondi / testi): `#FFFFFF`

> Nota: da consolidare come design token (es. variabili CSS) al momento della
> rifinitura UI (Fase 2). La scelta tra i due blu va fissata sul riferimento reale.
