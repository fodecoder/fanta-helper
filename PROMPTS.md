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
