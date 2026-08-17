# fanta-helper

SPA per la gestione di aste del Fantacalcio italiano, riusabile su più leghe con
regole diverse. Stato dell'asta sempre derivato dal log immutabile degli acquisti.

Documenti di riferimento: [SPEC.md](./SPEC.md) (modello dati e decisioni),
[PLAN.md](./PLAN.md) (roadmap), [PROMPTS.md](./PROMPTS.md) (prompt operativi),
[CLAUDE.md](./CLAUDE.md) (regole di sviluppo).

## Stack

- **Frontend**: React + TypeScript (SPA, Vite) → Cloudflare Pages
- **Backend**: Node + TypeScript (sottile) → Render
- **Database**: PostgreSQL → Neon

Uso personale, nessun login. Ogni asta è una riga `league` con nome univoco.

---

## Esecuzione in locale

### Prerequisiti

- Node.js LTS (≥ 20) e il package manager del repo (npm/pnpm — vedi `package.json`)
- Un database PostgreSQL: consigliato un branch di sviluppo su Neon; in
  alternativa un PostgreSQL locale

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
```

`web/.env`:

```
VITE_API_URL=http://localhost:8787
```

### 3. Applica le migrazioni (e opzionalmente il seed)

```bash
npm run db:migrate
npm run db:seed        # opzionale: dati di esempio
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
npm run lint       # lint di tutti i workspace
```

---

## Hosting online

Tre servizi indipendenti: database (Neon), backend (Render), frontend
(Cloudflare Pages). Ordine consigliato: **Neon → Render → Cloudflare Pages**,
perché ognuno fornisce un valore di configurazione al successivo.

**Stato (2026-08-17).** Il codice e la configurazione per l'hosting sono pronti:
health check, CORS parametrizzato, `_redirects` per il routing SPA, lettura di
`process.env.PORT`, workflow di migrazione automatica su push a `main`. Restano
solo passi manuali di provisioning (nessun codice):

- [x] Progetto e database Neon creati
- [x] Secret GitHub per le migrazioni impostato — **verifica** che il nome sia
      esattamente `NEON_DIRECT_DATABASE_URL` e che il valore sia la connessione
      **diretta** (host senza `-pooler`), non quella pooled: il workflow usa
      `pg_advisory_lock`, incompatibile con PgBouncer in transaction-pooling
- [ ] Migrazioni applicate al database di produzione (le applica il workflow al
      primo push su `main`, oppure manualmente con la connessione diretta)
- [ ] Web service Render creato e configurato (build da root del repo)
- [ ] Progetto Cloudflare Pages creato e configurato (build da root del repo)
- [ ] `CORS_ORIGIN` su Render = URL di Pages, con redeploy (chiusura del cerchio)
- [ ] Push umano su `main` per far girare build/lint/migrazioni del workflow

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

1. Su [render.com](https://render.com): **New → Web Service**, collega il repo.
2. Impostazioni del servizio:
   - **Root Directory**: *(vuoto — la root del repo)*
   - **Build Command**: `npm ci && npm run build --workspace server`
   - **Start Command**: `node server/dist/index.js`
   - **Runtime/Node version**: allineata al progetto (via `.node-version`)
3. **Environment variables**:

   ```
   DATABASE_URL = <connection string pooled di Neon>
   PORT         = 10000        # Render assegna la porta via $PORT: leggila dal codice
   CORS_ORIGIN  = <URL del sito Cloudflare Pages>   # compila dopo il passo C
   ```

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
   VITE_API_URL = https://<servizio>.onrender.com
   ```

4. Routing SPA: assicurati che `web/public/_redirects` contenga:

   ```
   /*  /index.html  200
   ```

   Senza questa regola i refresh su rotte interne danno 404.
5. Deploy. Ottieni l'URL pubblico (es. `https://fanta-helper.pages.dev`).

### D. Chiudi il cerchio (CORS)

1. Torna su Render → variabile `CORS_ORIGIN` = URL di Cloudflare Pages del passo C.
2. Redeploy del backend.
3. Verifica end-to-end: apri l'URL Pages; la SPA deve leggere `/health` dal
   backend Render collegato a Neon senza errori CORS.

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
