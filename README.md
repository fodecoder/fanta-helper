# fanta-helper — FantaProfeta

SPA per la gestione di aste del Fantacalcio italiano (nome applicazione:
**FantaProfeta**), riusabile su più leghe con regole diverse. Stato dell'asta
sempre derivato dal log immutabile degli acquisti.

Documenti di riferimento: [SPEC.md](./SPEC.md) (modello dati e decisioni),
[PLAN.md](./PLAN.md) (roadmap), [PROMPTS.md](./PROMPTS.md) (prompt operativi),
[CLAUDE.md](./CLAUDE.md) (regole di sviluppo).

## Stack

- **Frontend**: React + TypeScript (SPA, Vite) → Cloudflare Pages
- **Backend**: Node + TypeScript (sottile) → Render
- **Database**: PostgreSQL → Neon

App condivisa dai partecipanti della lega. Ogni lega è una riga `league` con nome
univoco; ogni asta è il log immutabile degli acquisti di quella lega.

Funzionalità principali:

- **Autenticazione multiutente**: 4 utenti (Andre, Davide, Fra, Paul), login con
  cookie di sessione firmato; l'identità del «tu» dei consigli è
  `manager.user_id` (fallback su `is_owner`).
- **Avatar e colore avatar** per utente (set predefinito, niente upload).
- **Engine di consiglio**: valore relativo alla lega (VORP, affidabilità da
  presenze + titolarità, modificatori portiere/difesa, scarsità di reparto);
  **tag giocatore** derivati (Rigorista, Titolare da 6, Porta bonus, Difensore da
  bonus, Scommessa, Da prendere a 1); **score in scala 0–10 per ruolo** (sola
  presentazione).
- **Preferenze per-utente**: override di valutazioni (`user_valuation_override`,
  `coalesce` sul valore di base — non tocca gli altri utenti) e squadre
  preferite / da evitare (`user_team_pref`, solo flag + ordinamento, nessuna
  mutazione dello score).
- **Chat 1-a-1** append-only tra utenti, con notifica in-app dei messaggi in
  arrivo (toast + badge non letti).
- **Assistenza all'asta**: wishlist, confronto alternative stesso ruolo,
  probabili formazioni, rigoristi, matrice coppie portieri.

Note d'uso: alla creazione, una lega parte da default modificabili (rosa
`3/8/8/6`, 8 squadre, budget 1000, punteggio e modificatori standard) e viene
popolata con i manager (`Io` + avversari generati). L'import quotazioni accetta
**CSV o xlsx**. Modello dati e formati in [SPEC.md](./SPEC.md).

I file storici in `docs/` (quotazioni e statistiche Fantacalcio delle ultime
stagioni) sono la sorgente per l'ingest a database di quotazioni
(`quotation`) e statistiche (`player_season_stats`), usate dall'engine di
consiglio — vedi Fase 5 in [PLAN.md](./PLAN.md).

### Attribuzioni fonti dati

- Quotazioni e statistiche: listoni ufficiali Fantacalcio®.
- Attributi giocatore (EA FC): [SoFIFA](https://sofifa.com/) — attribuzione ai
  creatori richiesta dai loro termini d'uso.

---

## Esecuzione in locale

### Prerequisiti

- Node.js LTS (≥ 20) e il package manager del repo (npm/pnpm — vedi `package.json`)
- Un database PostgreSQL: un branch di sviluppo su Neon, **oppure** un Postgres
  locale via Docker (vedi sotto)

#### Opzione: PostgreSQL locale con Docker

Il repo include un `docker-compose.yml` con un Postgres pronto all'uso (utente,
password e db `fanta`, dati persistiti su un volume):

```bash
docker compose up -d          # avvia Postgres su localhost:5432
docker compose down           # ferma (i dati restano nel volume)
docker compose down -v        # ferma ed elimina anche i dati
```

Il client non forza SSL, quindi in locale la connessione **non** usa
`sslmode=require` (che serve solo a Neon). Imposta in `server/.env`:

```
DATABASE_URL=postgres://fanta:fanta@localhost:5432/fanta
```

Poi applica le migrazioni ed eventualmente il seed (passo 3).

> Senza `docker compose`, l'equivalente con `docker run`:
> `docker run --name fanta-pg -e POSTGRES_USER=fanta -e POSTGRES_PASSWORD=fanta -e POSTGRES_DB=fanta -p 5432:5432 -v fanta-pg-data:/var/lib/postgresql/data -d postgres:16`

### 1. Clona e installa

```bash
git clone <url-repo>
cd fanta-helper
npm install        # installa tutti i workspace (web, server, shared)
```

### 2. Configura le variabili d'ambiente

Copia i template e compila i valori. I segreti stanno solo lato `server`.

```bash
cp server/.env.example server/.env
cp web/.env.example    web/.env
```

`server/.env`:

```
DATABASE_URL=postgres://<user>:<pass>@<host>/<db>?sslmode=require
PORT=8787
CORS_ORIGIN=http://localhost:5173
COOKIE_SECRET=<stringa casuale lunga>   # firma il cookie di sessione
# COOKIE_SECURE=false                    # solo per test su IP LAN non-localhost
```

Le password dei 4 utenti stanno in un file separato non versionato
`server/.env.seed-users`, letto solo dallo script di seed utenti:

```
SEED_PASSWORD_ANDRE=...
SEED_PASSWORD_DAVIDE=...
SEED_PASSWORD_FRA=...
SEED_PASSWORD_PAUL=...
```

`web/.env`:

```
VITE_API_URL=/api
```

Le chiamate API passano da `/api` sullo stesso origin della SPA: in sviluppo le
inoltra il proxy di Vite (`web/vite.config.ts` → `http://localhost:8787`), in
produzione una Cloudflare Pages Function (vedi Hosting). Così il cookie di
sessione è first-party e i browser mobile non lo scartano.

### 3. Applica le migrazioni (e opzionalmente il seed)

```bash
npm run db:migrate
npm run db:seed         # opzionale: dati di esempio
npm run db:seed:users   # crea i 4 utenti (richiede server/.env.seed-users)
```

### 4. Avvia in sviluppo

Due processi (due terminali, oppure lo script combinato se presente):

```bash
npm run dev --workspace server   # backend su http://localhost:8787
npm run dev --workspace web      # frontend su http://localhost:5173
```

Apri `http://localhost:5173`. La SPA deve leggere con successo `GET /health` dal
backend.

### Comandi utili

```bash
npm run build      # build di tutti i workspace
npm run lint       # lint + typecheck di tutti i workspace
npm test           # test (vitest) dei moduli puri in shared
```

---

## Hosting online

Tre servizi indipendenti: database (Neon), backend (Render), frontend
(Cloudflare Pages). Ordine consigliato: **Neon → Render → Cloudflare Pages**,
perché ognuno fornisce un valore di configurazione al successivo.

**Stato (2026-08-29, `v4.6.0`).** **In produzione**: Neon + Render + Cloudflare
Pages attivi, app funzionante end-to-end. Fasi 0–7 complete (multiutente, chat,
tag, preferenze per-utente); in corso le rifiniture mobile. La procedura sotto
resta come riferimento per un nuovo ambiente. I passi eseguiti:

- [x] Progetto e database Neon creati
- [x] Secret GitHub per le migrazioni impostato (`NEON_DIRECT_DATABASE_URL`,
      connessione **diretta** senza `-pooler`)
- [x] Migrazioni applicate al database di produzione
- [x] Web service Render creato e configurato (Blueprint `render.yaml`)
- [x] Progetto Cloudflare Pages creato e configurato (build da root, `web/dist`)
- [x] `CORS_ORIGIN` su Render = URL di Pages, con redeploy (chiusura del cerchio)
- [x] Push su `main`: build/lint/migrazioni del workflow eseguiti

Le migrazioni automatiche e i redeploy dei servizi si attivano al **push su
`main`**, che resta un'operazione umana (vedi `CLAUDE.md`).

### A. Database — Neon

1. Crea un progetto su [neon.tech](https://neon.tech) e un database.
2. Dalla dashboard copia **due** connection string:
   - **pooled** (host con `-pooler`): per il runtime del backend.
   - **diretta** (senza `-pooler`): per applicare le migrazioni.
3. Applica lo schema usando la connessione **diretta**:

   ```bash
   DATABASE_URL="<diretta>" npm run db:migrate
   ```

4. Conserva la connection string **pooled** per Render (passo B).
5. Configura il secret per l'automazione delle migrazioni (vedi sezione
   "Migrazioni automatiche" sotto).

> **Monorepo — importante.** Sia `server` sia `web` dipendono dal package di
> workspace `@fanta-helper/shared`, che **non è pubblicato su npm**. Le build di
> Render e Cloudflare vanno quindi lanciate dalla **root del repo** (dove gli
> npm workspaces risolvono `@fanta-helper/shared`), non isolando la sottocartella.
> A runtime il backend è autosufficiente: `tsup` inlina `@fanta-helper/shared`
> nel bundle (`noExternal`), quindi `server/dist/index.js` non richiede il package
> a runtime.

### B. Backend — Render

Il repo include [`render.yaml`](./render.yaml): su Render si può usare **New →
Blueprint** e collegare il repo per configurare il web service automaticamente
(build dalla root, start `node server/dist/index.js`, health check `/health`).
`DATABASE_URL` e `CORS_ORIGIN` restano da compilare nel dashboard (`sync: false`).
In alternativa, la configurazione manuale:

1. Su [render.com](https://render.com): **New → Web Service**, collega il repo.
2. Impostazioni del servizio:
   - **Root Directory**: *(vuoto — la root del repo)*
   - **Build Command**: `npm ci && npm run build --workspace server`
   - **Start Command**: `node server/dist/index.js`
   - **Runtime/Node version**: allineata al progetto (via `.node-version`)
3. **Environment variables**:

   ```
   DATABASE_URL   = <connection string pooled di Neon>
   PORT           = 10000      # Render assegna la porta via $PORT: leggila dal codice
   CORS_ORIGIN    = <URL del sito Cloudflare Pages>   # compila dopo il passo C
   COOKIE_SECRET  = <stringa casuale lunga>           # firma il cookie di sessione
   COOKIE_SECURE  = true
   ```

   Gli utenti si creano una tantum in locale con `npm run db:seed:users` puntando
   `DATABASE_URL` al database di produzione (connessione diretta) e con
   `server/.env.seed-users` compilato.

4. Deploy. Verifica l'endpoint di salute: `https://<servizio>.onrender.com/health`.
5. Annota l'URL pubblico del backend: serve al frontend (passo C).

> Il backend deve leggere la porta da `process.env.PORT` (Render la impone) e
> abilitare CORS per il dominio di Cloudflare Pages. Sul piano free il servizio
> va in sleep e la prima richiesta dopo l'inattività è lenta (cold start).

### C. Frontend — Cloudflare Pages

1. Su Cloudflare **Pages → Create → Connect to Git**, seleziona il repo.
2. Impostazioni di build (build dalla root del monorepo, output in `web/dist`):
   - **Framework preset**: Vite
   - **Root directory**: *(vuoto — la root del repo)*
   - **Build command**: `npm ci && npm run build --workspace web`
   - **Build output directory**: `web/dist`
3. **Environment variables**:

   ```
   VITE_API_URL = /api
   API_ORIGIN   = https://<servizio>.onrender.com   # usato dalla Pages Function
   ```

4. **Proxy API same-origin**: il repo include
   `web/functions/api/[[path]].js`, una Cloudflare Pages Function che inoltra
   ogni `/api/*` al backend Render (`API_ORIGIN`). Le Functions sono rilevate
   automaticamente dalla cartella `functions/` alla root del progetto Pages
   (`web/`). Serve a tenere le chiamate sullo stesso origin della SPA: il cookie
   di sessione resta first-party (`SameSite=Lax`) e i browser mobile non lo
   scartano come cookie di terze parti.
5. Routing SPA: assicurati che `web/public/_redirects` contenga:

   ```
   /*  /index.html  200
   ```

   Senza questa regola i refresh su rotte interne danno 404. Le Functions
   (`/api/*`) hanno precedenza su questa regola.
6. Deploy. Ottieni l'URL pubblico (es. `https://fanta-helper.pages.dev`).

### D. CORS

Con il proxy same-origin le chiamate del browser partono tutte dal dominio Pages,
quindi non c'è più una richiesta cross-origin da autorizzare. `CORS_ORIGIN` su
Render resta impostato all'URL di Pages come difesa in profondità (e per
eventuali chiamate diagnostiche dirette al backend). Verifica end-to-end: apri
l'URL Pages, fai login, controlla che il selettore lega e la chat funzionino
anche con "Block third-party cookies" attivo nel browser.

### Migrazioni automatiche

Il workflow [`.github/workflows/db-migrate.yml`](.github/workflows/db-migrate.yml)
esegue `npm run db:migrate --workspace server` (dopo lint e build) a ogni push
sul branch `main`, applicando le migrazioni non ancora eseguite sul database
Neon di produzione. `node-pg-migrate` applica solo le migrazioni mancanti, quindi
è sicuro che il workflow giri anche quando non ci sono nuove migrazioni.

Per abilitarlo, imposta un **secret** (non una variable: contiene credenziali)
nel repository GitHub:

```
Settings → Secrets and variables → Actions → Secrets → New repository secret

Nome:  NEON_DIRECT_DATABASE_URL
Valore: la connection string DIRETTA di Neon (senza "-pooler"), es.
        postgres://<user>:<pass>@<host>/<db>?sslmode=require
```

Usa deliberatamente la connessione **diretta**, non quella pooled di Render:
Neon instrada la connessione pooled attraverso PgBouncer in modalità
transaction-pooling, che non supporta il lock di sessione (`pg_advisory_lock`)
usato da `node-pg-migrate` per evitare run concorrenti.

### Deploy successivi

Ogni servizio ridistribuisce automaticamente al push del branch collegato
(il push è un'operazione manuale e umana — vedi CLAUDE.md). Le migrazioni
verso Neon sono applicate automaticamente dal workflow sopra a ogni push su
`main`; non serve più applicarle manualmente in un deploy normale.
