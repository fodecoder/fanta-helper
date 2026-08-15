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
