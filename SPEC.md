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
| `scoring`       | JSONB  | sistema di punteggio (bonus/malus, voti)          |
| `modificatori`  | JSONB  | modificatore difesa/centrocampo e simili          |

### `player`

| campo       | tipo | note                                        |
|-------------|------|---------------------------------------------|
| `id`        | PK   |                                             |
| `name`      | text |                                             |
| `team`      | text | squadra di appartenenza                     |
| `ruolo`     | enum | `P` / `D` / `C` / `A`                       |
| `image_url` | text | nullable; pronta per backfill foto reali    |

Il pool `player` è condiviso tra tutte le leghe.

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

## Palette

Valori forniti (derivati dal riferimento del proprietario):

- Verde principale (brand / azioni): `#2BA756`
- Blu / blu scuro (sfondi / header): `#11246F` o `#144F89`
- Arancione (accenti / richiami): `#FF8300`
- Verde scuro (secondario): `#077449`
- Bianco (sfondi / testi): `#FFFFFF`

> Nota: da consolidare come design token (es. variabili CSS) al momento della
> rifinitura UI (Fase 2). La scelta tra i due blu va fissata sul riferimento reale.
