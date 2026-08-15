# PROMPTS.md — Prompt per le prime 5 operazioni

Prompt operativi da dare all'agente di coding, uno per operazione, in ordine di
dipendenza. Ogni prompt è autosufficiente ma assume che l'agente rispetti
`CLAUDE.md` e `SPEC.md`. Regole trasversali valide per tutte le operazioni:

- Rispetta `CLAUDE.md`: commit locale a fine feature, MAI push, Conventional
  Commits in inglese, SemVer + `CHANGELOG.md` + tag locale, build e lint verdi
  prima del commit, nessun riferimento ad AI/assistenti/proprietario.
- Rispetta l'invariante di dominio: lo stato dell'asta è derivato dal log
  `purchase`. Nessun campo mutabile di stato.
- Nessun segreto nel client; le chiamate esterne passano dal backend.
- Prima di modifiche ampie, proponi il piano; non riscrivere in massa.

---

## 1 — Scaffolding repo + tooling

**Contesto.** Repo vuota (solo docs e LICENSE). Serve la struttura base su cui
costruire tutto il resto.

**Task.** Inizializza un monorepo con due package: `web` (SPA React + TypeScript
via Vite) e `server` (backend sottile Node + TypeScript). Aggiungi una cartella
`shared` per i tipi condivisi (ruoli P/D/C/A, forma dei JSONB di config, schema
`Valuation` di import). Configura:

- Gestione monorepo con workspace del package manager scelto (dichiara quale).
- TypeScript in modalità stretta (`strict: true`) su entrambi i package.
- Lint e formattazione; script `build`, `lint`, `dev` a livello root e per package.
- `package.json` root con `version` a `0.1.0`; crea `CHANGELOG.md` con la voce iniziale.
- `web`: pagina placeholder che rende il nome dell'app.
- `server`: HTTP server minimo con endpoint `GET /health` che risponde `200`.

**Vincoli.** Poche dipendenze, tipi stretti. Nessun secret nel repo; predisponi
`.env.example` per entrambi i package. Non introdurre database qui.

**Done.** `build` e `lint` verdi su tutto il monorepo; `web` parte in dev e mostra
la pagina; `server` risponde su `/health`. Commit `feat:` + tag `v0.1.0` (locale).

---

## 2 — Schema DB + migrazioni (Neon)

**Contesto.** Modello dati definito in `SPEC.md`. Target PostgreSQL su Neon.

**Task.** Introduci uno strumento di migrazioni (dichiara quale) e crea lo schema:
tabelle `league`, `player`, `valuation`, `manager`, `purchase` esattamente come
in `SPEC.md`, inclusi tipi JSONB per `roster_config`, `scoring`, `modificatori`,
l'enum di `ruolo` (P/D/C/A) e di `confidence` (low/medium/high). Aggiungi:

- Foreign key coerenti; `league.name` univoco.
- Indici utili per le query dell'asta (es. `purchase(league_id)`,
  `valuation(league_id, player_id)`).
- Uno strato di accesso dati tipizzato lato `server`.
- Uno script `db:migrate` e uno `db:seed` opzionale con dati di esempio.

**Vincoli (invariante).** `purchase` è log immutabile: nessuna colonna di stato
mutabile (residuo, slot liberi, max bid) in nessuna tabella. Lo stato si deriva
sempre da `purchase`. Rifiuta qualsiasi schema che memorizzi lo stato come campo
aggiornabile. La connessione al DB usa `DATABASE_URL` dal backend, mai dal client.

**Done.** Migrazioni applicabili su un DB Neon pulito e reversibili; query di
lettura tipizzate funzionanti. Commit `feat:` + bump MINOR + tag.

---

## 3 — Deploy pipeline (skeleton online)

**Contesto.** Esistono `web` e `server` scheletro e lo schema DB. Voglio la
pipeline di hosting funzionante PRIMA di costruire le feature, per de-rischiare
CORS, env e routing SPA quando c'è poco da debuggare.

**Task.** Porta online lo scheletro:

- **Neon**: database di produzione; fornisci le istruzioni per ottenere la
  connection string (pooled e diretta) e applicare le migrazioni.
- **Render**: web service dal package `server`; definisci build command, start
  command e le env var (`DATABASE_URL` pooled, `PORT`, origine CORS del frontend).
- **Cloudflare Pages**: deploy del package `web`; preset Vite, output `dist`,
  env `VITE_API_URL` = URL del backend Render. Aggiungi `_redirects`
  (`/* /index.html 200`) per il routing SPA.
- Configura CORS lato `server` per accettare il dominio Pages.
- Il frontend chiama `GET /health` del backend e mostra lo stato della connessione.

**Vincoli.** Nessun secret nel client né nel repo. Documenta ogni step nel
`README.md` (sezione hosting).

**Done.** SPA raggiungibile via URL Pages che legge con successo `/health` dal
backend Render collegato a Neon. Commit `chore:`/`docs:` come appropriato.

---

## 4 — CRUD lega + configurazione regole (JSONB)

**Contesto.** Prima feature reale. Una "lega" è una sessione d'asta isolata.

**Task.** Implementa CRUD completo su `league`:

- **Backend**: endpoint create/read/update/delete su `league`, con validazione di
  `roster_config` (`{P,D,C,A}`), `scoring` e `modificatori` come JSONB tipizzati.
  `name` univoco e obbligatorio.
- **Frontend**: form di creazione/modifica lega con i campi di config regole;
  lista delle leghe esistenti.
- Validazione condivisa dei JSONB via i tipi in `shared`.

**Vincoli.** Nessuna logica d'asta qui. Le regole vivono nei JSONB, non in colonne
dedicate. Errori di validazione chiari e tipizzati.

**Done.** Posso creare, elencare, modificare ed eliminare una lega dalla SPA; i
JSONB sono validati. Commit `feat:` + bump MINOR + tag.

---

## 5 — Import giocatori da CSV quotazioni

**Contesto.** Il pool `player` è condiviso tra tutte le leghe e va popolato dalle
quotazioni ufficiali in formato CSV.

**Task.** Implementa l'import del CSV quotazioni nel pool `player`:

- **Backend**: endpoint di import che accetta il CSV, ne fa il parsing tipizzato,
  normalizza `name`/`team`/`ruolo` (enum P/D/C/A) e fa upsert idempotente su
  `player` (nessun duplicato su reimport).
- Report di esito: righe importate, aggiornate, scartate (con motivo).
- **Frontend**: schermata di upload del CSV con anteprima del report.
- `image_url` resta nullable (backfill in fase successiva).

**Vincoli.** Non inventare dati: righe con ruolo non valido o campi obbligatori
mancanti vengono scartate e segnalate, non corrette d'ufficio. Il pool è unico e
condiviso, non per-lega.

**Done.** Un CSV quotazioni popola/aggiorna `player` in modo idempotente con report
leggibile. Commit `feat:` + bump MINOR + tag.
