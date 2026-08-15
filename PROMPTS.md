# PROMPTS.md — Prompt per le prossime operazioni

Backlog operativo. Le prime 5 operazioni (scaffolding → schema DB → deploy
pipeline → CRUD lega → import giocatori CSV) sono completate fino a `v0.4.0`; i
relativi prompt sono stati rimossi. Sotto ci sono le prossime 5 in ordine di
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

## 6 — CRUD manager per lega

**Contesto.** L'asta assegna giocatori a manager: ogni riga `purchase` referenzia
un `manager` della stessa lega (FK `(manager_id, league_id)`). I manager oggi
esistono solo a schema/seed; mancano API e UI. È prerequisito dell'asta live.

**Task.** Implementa CRUD dei manager nell'ambito di una lega:

- **Backend**: endpoint `GET/POST /leagues/:leagueId/managers` e
  `PUT/DELETE /leagues/:leagueId/managers/:id`, con validazione via schema
  condivisi. `name` univoco per lega (vincolo `manager_league_name_uk`): mappa la
  violazione a `409 CONFLICT` come già fatto per `league`.
- **Frontend**: gestione manager dentro la schermata lega (lista + add/edit/delete).

**Vincoli.** La delete di un manager con acquisti va gestita in modo esplicito
(blocco con `409`, oppure cascade dichiarato): decidi e motiva, non lasciare il
comportamento implicito del DB non documentato. Nessuno stato d'asta qui.

**Done.** Posso gestire i manager di una lega dalla SPA; nomi duplicati → `409`.
Commit `feat:` + bump MINOR + tag.

---

## 7 — Import valutazioni (JSON) con matching e revisione unmatched

**Contesto.** Schema JSON delle valutazioni definito in `SPEC.md`. L'LLM produce
il JSON una volta; qui lo si importa in `valuation`, che è **per-lega**.

**Task.** Implementa l'import del JSON valutazioni per una lega:

- **Backend**: endpoint di import (scoped alla lega) che valida il documento
  contro lo schema stretto di `SPEC.md` (campi, tipi, enum `ruolo`/`confidence`,
  interi ≥ 0). Esegue il matching `name`+`team` → `player_id` sul pool condiviso
  e fa upsert in `valuation (league_id, player_id)`.
- I match ambigui o assenti finiscono in una lista **unmatched**, non vengono
  inventati. Restituisci un report: importate, aggiornate, unmatched (con motivo).
- **Frontend**: upload del JSON + revisione manuale degli unmatched (associazione
  a un `player` scelto dall'utente, oppure scarto).

**Vincoli.** Nessun dato inventato: nomi non risolti restano unmatched finché
l'utente non decide. La validazione è deterministica e rifiuta l'input non conforme.

**Done.** Un JSON valutazioni popola `valuation` per la lega scelta con revisione
degli unmatched. Commit `feat:` + bump MINOR + tag.

---

## 8 — Schermata asta live

**Contesto.** È il cuore dell'app e il punto in cui l'invariante conta di più.

**Task.** Implementa la schermata dell'asta live per una lega:

- **Backend**: endpoint per registrare un acquisto (append su `purchase`:
  league, player, manager, prezzo) e per leggere lo stato derivato (residuo per
  manager, slot liberi per reparto) calcolato dal log — riusa/estendi
  `db/derived.ts`. Nessun endpoint che "aggiorni" lo stato: si appende soltanto.
- Correzione di un errore = operazione esplicita e tracciabile sul log (es.
  rimozione dell'ultima riga), non una mutazione di un campo di stato.
- **Frontend**: ricerca giocatore (con valutazione se presente), assegnazione a
  manager con prezzo, event-log degli acquisti, pannello stato derivato in tempo
  reale (residuo, slot, e — se disponibile — max bid).

**Vincoli (invariante, critico).** Residuo, slot liberi e max bid sono SEMPRE
funzione pura di `purchase`, ricalcolati a ogni render. Vietato introdurre
qualunque campo/colonna di stato mutabile. L'LLM non entra in questo loop.

**Done.** Posso condurre un'asta: assegnare giocatori, vedere lo stato derivato
aggiornarsi, correggere un errore via log. Commit `feat:` + bump MINOR + tag.

---

## 9 — Selettore lega in home

**Contesto.** Più aste convivono come righe `league`; serve scegliere quale usare.

**Task.** In home, selettore delle leghe esistenti che imposta la lega attiva per
tutte le schermate (manager, valutazioni, asta). Deep-link per lega se utile.

**Vincoli.** Nessun login: l'identità di sessione è la lega selezionata. Lo stato
di selezione è UI-side, non un campo persistente sul dominio.

**Done.** Dalla home scelgo una lega e tutte le schermate operano nel suo contesto.
Commit `feat:` + bump MINOR + tag.

---

## 10 — Max bid rettificato deterministico (Fase 2)

**Contesto.** Rifinitura: suggerire il rilancio massimo sostenibile in tempo reale,
in modo deterministico e derivato dal log.

**Task.** Calcola il max bid rettificato per il manager attivo come funzione pura
di `purchase` + config lega: opportunity cost = residuo distribuito sui bisogni
residui (slot liberi per reparto) con un floor minimo per reparto, così da non
azzerare la capacità di completare la rosa. Esponilo nella schermata asta.

**Vincoli.** Deterministico e spiegabile (nessuna stima opaca, nessun LLM).
Ricalcolato a ogni acquisto dal log. Documenta la formula scelta e i suoi limiti.

**Done.** Durante l'asta vedo un max bid rettificato coerente coi bisogni residui,
che reagisce a ogni acquisto. Commit `feat:` + bump MINOR + tag.
