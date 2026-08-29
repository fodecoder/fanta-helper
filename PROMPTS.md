# PROMPTS.md — Fase 7 (Multiutente v4.0)

Prompt operativi ordinati per Claude Code. **Uno alla volta, in sequenza.** Ogni
prompt = una feature = un commit locale con build+lint verdi, voce in
`CHANGELOG.md`, bump SemVer e tag locale `vX.Y.Z` (nessun push).

Regole valide per tutti (da `CLAUDE.md`): Conventional Commits in inglese, nessun
riferimento ad AI/attribuzioni, commenti solo dove la logica non è ovvia,
**invariante**: lo stato d'asta e ogni valore effettivo sono derivati (nessun
campo di stato mutabile; override = layer sparso, `effettivo = override ?? base`),
segreti solo lato backend. Prima di modifiche ampie proponi il piano. Contesto e
tradeoff completi in [docs/design-fase7.md](./docs/design-fase7.md).

---

## P1 — Fix engine: modificatore portiere + difesa team-aware

**Obiettivo.** Correggere due difetti dell'audit (A1, A2) in
`shared/src/recommendationEngine.ts`, mantenendo il motore puro e deterministico.

- **A1 — portiere.** Oggi `modificatori.portiere.enabled` non è mai letto. Quando
  attivo, aggiungi al valore del ruolo P un bonus atteso stimato dal tasso gol
  subiti di squadra: usa `gs/presenze` del portiere come proxy di clean-sheet
  propensity, mappato a un bonus atteso (meno gol subiti → bonus più alto).
  Documenta la formula e dichiara la confidenza (proxy, non media di reparto).
- **A2 — difesa team-aware.** Sostituisci il proxy `mv` individuale in
  `difesaBonus` con un `mv` fuso col tasso gol-subiti della squadra del giocatore
  (blend pesato, es. 0.7·mv_norm + 0.3·team_defense_norm), così il bonus riflette
  la solidità del reparto e non solo il voto isolato. Mantieni retrocompatibile
  la tabella `modificatori.difesa.tabella`.

**Vincoli.** Nessun dato inventato: se mancano gol-subiti di squadra, degrada al
comportamento attuale e marca `dataMissing`/confidenza bassa. Aggiorna
`recommendationEngine.test.ts` con casi per portiere ON/OFF e per il blend difesa.

**Accettazione.** Con `portiere.enabled=true`, due P con stesso mv ma gol-subiti
diversi ricevono score diversi. Con difesa attiva, un D di squadra solida supera
un D con pari mv di squadra fragile. Test verdi.

**Versioning.** `feat` → MINOR.

---

## P2 — Fix engine: reliability da titolarità + baseline mv

**Obiettivo.** Correggere A3 e A4.

- **A4 — reliability.** Integra `probable_lineup.stato` (titolare/panchina/
  ballottaggio) nel calcolo di `reliability`: un titolare oggi non deve essere
  penalizzato dalle sole presenze storiche (neopromossi/nuovi acquisti). Definisci
  una combinazione esplicita (es. `reliability = max(presenzeRatio, statoWeight)`
  con `titolare=0.9, ballottaggio=0.6, panchina=0.3`) e documentala. Matching
  giocatore↔lineup per nome/`fanta_id` come già fatto altrove.
- **A3 — baseline mv.** Introduci `MV_BASELINE` (costante documentata, es. 6.0) e
  calcola il contributo del voto come `mv − MV_BASELINE`, così lo score misura il
  margine sopra la sufficienza e i bonus (bomber/rigoristi) pesano di più. Non
  rendere negativo lo score in modo spurio: chiarisci il floor.

**Vincoli.** Puro e deterministico. Se il lineup non è disponibile per un
giocatore, ricadi sul solo `presenzeRatio`. Aggiorna i test.

**Accettazione.** Un titolare con poche presenze storiche ma `stato=titolare`
guadagna reliability. Con baseline attiva, il distacco tra bomber e difensore di
pari mv aumenta in modo verificabile nei test.

**Versioning.** `feat` → MINOR.

---

## P3 — Tag giocatore derivati

**Obiettivo.** Aggiungere un modulo puro `shared/src/playerTags.ts` che, da pool +
stats + quotazioni + `set_piece_taker` + `probable_lineup` + regole lega, ritorna
per ogni giocatore l'elenco di tag applicabili. Nessun campo salvato: derivazione
a lettura, esposta dall'endpoint consigli e usata in asta.

**Tag e regole (bozza, affinabile con soglie documentate):**

- **Rigorista** — rigorista rank ≤ 2 della propria squadra (`tipo=rigore`).
- **Titolare da 6** — `stato=titolare` + reliability alta + bassa attesa di bonus
  (FVM/score medio nel ruolo): affidabile, poco esplosivo.
- **Porta bonus** — tasso (gol+assist)/partita nel top del ruolo.
- **Difensore da bonus** — D/P con alto tasso bonus **oppure** squadra a difesa
  solida (basso `gs`/partita).
- **Scommessa** — FVM basso + segnale di upside (campione piccolo ad alto
  rendimento, o titolare oggi con poche presenze storiche).
- **Da prendere a 1** — FVM minimo + score ≈ replacement + «Io» ha ancora lo slot.

**Disambiguazione.** Rinomina la fascia bassa in `TIER_THRESHOLDS` (oggi
«Scommessa») per non collidere col tag omonimo: fasce = asse valore, tag = asse
separato. Un giocatore può avere più tag.

**UI.** Badge compatti in Consigli e nel pannello asta (giocatore in asta +
alternative). Nessun ricalcolo di stato mutabile.

**Accettazione.** Test in `playerTags.test.ts` con casi mirati per ciascun tag.
Badge visibili in entrambe le viste.

**Versioning.** `feat` → MINOR.

---

## P4 — Login 4 utenti + identità

**Obiettivo.** Introdurre autenticazione minimale e legarla all'identità esistente.

- **Schema.** `app_user(id, username unique, password_hash, avatar, avatar_color)`.
  Seed idempotente dei 4 utenti (Andre, Davide, Fra, Paul) con le password
  fornite **hashate con bcrypt al seed** (mai in chiaro nel repo/config: le
  password in chiaro restano solo nell'input del seed locale, non versionate).
- **Auth.** `POST /auth/login` (verifica bcrypt) → cookie di sessione `httpOnly`
  firmato; `POST /auth/logout`; `GET /auth/me`. Nessun segreto o hash nel client.
- **Mapping identità.** Aggiungi `manager.user_id` (FK opzionale a `app_user`): in
  una lega il manager collegato all'utente loggato è il «tu» dei consigli.
  Mantieni `is_owner` per i dati esistenti; se `user_id` è presente ha priorità.
- **Gate UI.** Schermata di login come **landing** dell'app (vedi P8 per il logo
  SoFIFA su questa schermata).

**Vincoli.** Migrazione schema con `db:migrate`. Nessuna password/hash mai
inviata al client. Proponi il piano di migrazione prima di applicarlo.

**Accettazione.** I 4 utenti accedono con le rispettive password; sessione
separata per utente; `GET /auth/me` riflette l'utente loggato.

**Versioning.** `feat` con migrazione → MAJOR (apre la strada a `v4.0.0`).

---

## P5 — Avatar e colore avatar

**Obiettivo.** Ogni utente sceglie avatar e colore.

- **Dati.** Usa `avatar` e `avatar_color` già su `app_user`. Avatar da set
  predefinito (emoji o iniziali su tinta), niente upload immagini.
- **UI.** Pagina profilo per modificarli; avatar mostrato in header, lista
  manager/panoramica e (poi) chat.

**Accettazione.** La scelta persiste per utente e compare in header e panoramica.

**Versioning.** `feat` → MINOR.

---

## P6 — Preferenze per-utente + preferenze di squadra

**Obiettivo.** Personalizzare i consigli lasciando invariato il valore di base per
gli altri utenti.

- **Override valutazioni.** Tabella sparsa `user_valuation_override(user_id,
  league_id, player_id, target?, fair_value?, max_bid?, panic_price?, note?)`,
  campi nullable. Valore effettivo a lettura: `coalesce(override, base)`. Base
  immutabile; l'override vale solo per l'utente che lo scrive. CRUD dedicato +
  editing inline nella vista valutazioni/consigli dell'utente loggato.
- **Preferenze squadra.** `user_team_pref(user_id, league_id, team, kind:
  'prefer'|'avoid')`. **Effetto (deciso): flag + ordinamento secondario, nessuna
  mutazione dello score.** Squadra preferita → a parità di fascia sale in lista;
  squadra da evitare → badge «squadra da evitare» + demozione in coda. Lo score
  di base resta comparabile e non corrotto.

**Vincoli.** Puro/derivato: gli override e le preferenze sono un layer, non
sovrascrivono il dato di base condiviso. Migrazione schema.

**Accettazione.** Un override di Andre non cambia i valori visti da Davide.
Impostando una squadra preferita, i suoi giocatori salgono a parità di fascia;
una squadra da evitare è flaggata e demossa.

**Versioning.** `feat` con migrazione → MINOR (o MAJOR se accorpato al taglio v4).

---

## P7 — Chat 1-a-1 ancorabile

**Obiettivo.** Chat minimale, solo 1-a-1, pannello piccolo ancorabile/
ridimensionabile.

- **Schema.** `chat_message(id, from_user, to_user, body, created_at)`,
  append-only (coerente con la filosofia log immutabile).
- **Trasporto (deciso): polling.** `GET /chat?with=<userId>&since=<ts>` ogni 2–3 s;
  `POST /chat` per inviare. Niente websocket.
- **UI.** Pannello flottante piccolo, `draggable` + `resizable`; posizione e
  dimensione salvate in `localStorage` (comodità per-utente, non stato condiviso).
  Selettore del destinatario dalla lista utenti. Solo conversazioni 1-a-1.

**Vincoli.** Nessun segreto nel client; i messaggi passano dal backend. Non
introdurre stato mutabile: la conversazione è la proiezione ordinata del log.

**Accettazione.** Due utenti si scambiano messaggi visibili entro pochi secondi;
il pannello si sposta/ridimensiona e ricorda la posizione al reload.

**Versioning.** `feat` → MINOR.

---

## P8 — SoFIFA in landing e asta

**Obiettivo.** Inserire logo e link SoFIFA (prerequisito per l'accesso alle loro
API).

- **Landing (schermata di login, P4):** logo `public/sofifa-logo.png` (versione
  normale) con link a `https://sofifa.com/`.
- **Asta:** logo `public/sofifa-logo-small.png` (versione piccola) accanto al link
  «SoFIFA» già presente in `AuctionDesktop.tsx`, con link a `https://sofifa.com/`.

**Accettazione.** Logo normale visibile in landing, logo piccolo in asta, entrambi
cliccabili verso il sito.

**Versioning.** `feat` → MINOR. Ultimo taglio verso `v4.0.0`.

---

## P9 — Bugfix UI + tag + normalizzazione score (da review manuale)

**Obiettivo.** Correggere 4 difetti emersi da un giro di test manuale su modale
profilo, preferenze squadra, tag giocatore e leggibilità dello score. Nessuna
modifica architetturale: sono fix mirati, ognuno isolabile.

- **B1 — modale profilo tronca il contenuto.** Il dialog «Profilo» (avatar +
  colore, P5) non copre l'intera viewport quando il contenuto supera l'altezza
  disponibile: righe di avatar/colore restano tagliate fuori dal riquadro visibile
  invece di scrollare dentro il modale. Fissa il layout del dialog perché scrolli
  internamente (`max-height` legata al viewport + `overflow-y: auto` nel body del
  modale), overlay e bottoni azione (Annulla/Salva) sempre visibili.
- **B2 — preferenze squadra (P6) invisibili in asta.** Oggi «squadra preferita» /
  «squadra da evitare» sono impostate in Consigli ma non hanno segnale nel
  pannello asta: chi asta non vede che sta per prendere un giocatore di una
  squadra segnata come «da evitare». Aggiungi un warning visibile nel pannello
  asta (badge o banner accanto al giocatore in chiamata, e nella lista
  alternative) quando la squadra del giocatore è in `user_team_pref` con
  `kind='avoid'` per l'utente loggato. Nessun cambio allo score: solo segnale
  visivo, coerente col vincolo di P6 (flag, non mutazione del valore).
- **B3 — tooltip mancanti + colonne calcolate senza dettaglio.** Aggiungi tooltip
  su tutte le colonne con sigle non ovvie (es. VORP, FVM, QT.A) in Consigli e
  panoramica. Per le colonne che derivano da un calcolo (score, reliability,
  max bid rettificato, ecc.) il tooltip mostra una sintesi leggibile della
  formula applicata (valori usati, non solo il nome della formula) e un bottone
  «Dettagli» che apre un pannello/modale con lo scomposto passo-passo. Riusa,
  dove possibile, i dati già calcolati dal motore (`recommendationEngine`) invece
  di ricalcolare lato client.
- **B4 — tag «Difensore da bonus» applicato ai portieri.** In
  `shared/src/playerTags.ts` la condizione include `recommendation.ruolo === "P"`
  insieme a `"D"` (riga ~148), quindi i portieri prendono il tag pensato per i
  difensori. Restringi la condizione al solo `ruolo === "D"`. Se un segnale
  equivalente ha senso per i portieri (es. «Portiere di squadra solida»), va
  proposto come tag distinto in un prompt successivo, non riusando questo.
  Aggiorna `playerTags.test.ts` con un caso che verifica l'assenza del tag sui
  portieri.

**Non-bug, ma richiesto insieme (B5) — normalizzazione score 0–10.** Lo score
mostrato in Consigli/asta non ha oggi una scala fissa e leggibile. Introduci una
normalizzazione **di sola presentazione** (0 = da evitare, 10 = da prendere),
calcolata per ruolo sulla distribuzione degli score del pool corrente (es.
min-max o percentile clampato). Il valore normalizzato è derivato a lettura, non
sostituisce lo score grezzo usato dal motore per ordinamento/fasce/VORP: quello
resta la fonte di verità interna. Documenta la formula di normalizzazione e il
suo dominio (per-ruolo vs. globale — per-ruolo è la scelta di default, dato che
gli score non sono comparabili tra ruoli).

**Vincoli.** Nessun campo di stato mutabile introdotto (B2 e B5 sono derivazioni
a lettura). B4 è un fix di una riga più test, va isolato dal resto in un commit
separato se comodo. Per B1/B3 nessuna modifica al backend.

**Accettazione.** Il modale profilo è interamente utilizzabile su viewport
piccole (scroll interno, bottoni sempre raggiungibili). Un giocatore di una
squadra «da evitare» mostra un warning nel pannello asta. Le colonne con sigle
hanno tooltip; le colonne calcolate hanno sintesi + bottone Dettagli funzionante.
Nessun portiere ha il tag «Difensore da bonus» (verificato da test). Lo score
mostrato è in scala 0–10 per ruolo, coerente con l'ordinamento esistente.

**Versioning.** `fix` per B1/B2/B4, `feat` per B3/B5 → bump coerente (MINOR se
accorpato in un'unica release, altrimenti PATCH+MINOR separati per commit).

---

## P10 — Bugfix mobile (leghe/chat) + chat fullscreen + notifiche + audit fasi 1-9

**Obiettivo.** Correggere un bug riprodotto solo su mobile (non riproducibile da
desktop), adattare la chat (P7) al mobile, aggiungere notifica di messaggio in
arrivo, e chiudere la fase con un audit di tutti i prompt P1–P9.

- **B6 — dropdown lega vuoto e chat che non si apre, solo su mobile.** Da
  telefono, con l'utente Fra loggato, il selettore «— seleziona lega —» non
  mostra le leghe dell'utente (in desktop, stesso utente, funziona) e il
  pannello Chat mostra «authentication required» invece di aprirsi. Il fatto che
  desktop funzioni e mobile no, con lo stesso utente, indica un problema di
  sessione/cookie legato a viewport o user-agent piuttosto che ai dati: sospetti
  primari da verificare — cookie di sessione (P4) con `SameSite`/`Secure` che si
  comportano diversamente su Safari/Chrome mobile (in particolare in PWA/standalone
  o dietro redirect http→https), eventuale mismatch tra dominio del sito e
  dominio delle chiamate API su mobile, race condition al primo load per cui il
  fetch di leghe/chat parte prima che il cookie di sessione sia disponibile.
  Riproduci con device emulation *e* su device reale prima di assumere la causa;
  non introdurre workaround lato client (es. retry silenzioso) senza aver capito
  la causa — se è un problema di cookie, il fix va nella configurazione del
  cookie/sessione lato backend, non in un patch UI.
- **B7 — chat non può essere flottante su mobile.** Il pannello chat
  `draggable`/`resizable` di P7 ha senso solo su viewport desktop. Sotto una
  soglia (stesso breakpoint già in uso nel resto della SPA, se esiste, altrimenti
  documenta la soglia scelta) la chat deve aprirsi a schermo intero (fullscreen
  overlay, niente drag/resize, un solo bottone di chiusura chiaro), non come
  riquadro piccolo in un angolo. Il selettore destinatario e la history restano
  identici nella logica, cambia solo il contenitore.
- **B8 — notifica di messaggio in arrivo.** Oggi un utente loggato non ha alcun
  segnale se gli arriva un messaggio mentre non ha la chat aperta (o è su un'altra
  pagina della SPA). Aggiungi una notifica in-app (toast o banner, non
  notifica di sistema/push — nessuna nuova dipendenza per push notification in
  questo prompt) quando arriva un nuovo messaggio per l'utente loggato e il
  pannello chat non è aperto sulla conversazione con quel mittente. Riusa il
  polling già esistente di P7 (`GET /chat?with=...&since=...`): se serve un
  polling "globale" per sapere di nuovi messaggi da mittenti diversi da quello
  attualmente aperto, valuta un endpoint leggero (es. `GET /chat/unread` o
  riuso di `since` su tutti i mittenti) e proponilo nel piano prima di
  implementarlo.

**Audit (obbligatorio, va fatto per ultimo in questo prompt).** Verifica lo stato
reale di P1–P9 rispetto al codice attuale: quali sono stati implementati
correttamente, quali parzialmente, quali per nulla. Non fidarti del solo
`CHANGELOG.md` — controlla il codice. Sulla base dell'audit:

- Aggiorna `PLAN.md` riflettendo lo stato reale (fatto / parziale / mancante),
  rimuovendo sezioni ormai obsolete o superate dai prompt successivi.
- Aggiorna `README.md` perché descriva l'app com'è oggi (auth multiutente, chat,
  tag, preferenze, ecc. se presenti), togliendo riferimenti a feature non ancora
  esistenti o a versioni precedenti dell'architettura.
- Non toccare `CLAUDE.md` né `SPEC.md` in questo prompt: sono fuori perimetro,
  se contengono discrepanze segnalale in coda al prompt invece di modificarle.
- Riporta l'audit come lista puntuale (prompt → stato → evidenza nel codice) nel
  messaggio di commit o in una sezione dedicata di `PLAN.md`, non solo a voce.

**Vincoli.** B6 va diagnosticato prima di essere corretto: se la causa non è
chiara, il commit di questo prompt può limitarsi a documentare l'ipotesi più
probabile con evidenza (log, comportamento cookie) e proporre il fix in un
prompt successivo, invece di introdurre una modifica non verificata su un
percorso di autenticazione. Nessun segreto/hash nel client. L'audit non fa
refactor: solo lettura + aggiornamento documentazione.

**Accettazione.** Da mobile, l'utente Fra vede le sue leghe nel selettore e la
chat si apre senza errore «authentication required» (o, se il fix è rimandato,
l'ipotesi di causa è documentata con evidenza). Su viewport mobile la chat è
fullscreen, non flottante. Un utente riceve un segnale visibile per un messaggio
in arrivo mentre non ha la chat aperta su quel mittente. `PLAN.md` e `README.md`
riflettono lo stato reale del codice per P1–P9, senza contenuti obsoleti.

**Versioning.** `fix` per B6/B7/B8, `docs` per l'aggiornamento di `PLAN.md`/
`README.md` → PATCH (o MINOR se B8 introduce un nuovo endpoint).
