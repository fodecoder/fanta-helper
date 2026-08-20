# PROMPTS.md — Backlog operativo

Storico svuotato: tutte le operazioni fino a `v2.12.1` (scaffolding → MVP →
Fase 2.1 → Fase 4 → coppie portieri → valutazioni LLM in-app → redesign UI
Broadsheet → **Fase 5: dati storici, engine, UX asta, provider SoFIFA**) sono
**eseguite**. Il riepilogo dello stato è in [PLAN.md](./PLAN.md); i dettagli di
modello in [SPEC.md](./SPEC.md).

Questo file contiene solo il **backlog attivo** (Fase 6 — Rifiniture v3.0).

## Regole trasversali (valgono per ogni operazione)

- Rispetta `CLAUDE.md`: commit locale a fine feature, **MAI push**, Conventional
  Commits in inglese, SemVer + `CHANGELOG.md` + tag locale, `build` e `lint`
  verdi prima del commit, nessun riferimento ad AI/assistenti/proprietario.
- **Invariante di dominio**: lo stato dell'asta è funzione pura del log
  `purchase`. Nessun campo mutabile di stato (residuo, slot, max bid). I dati
  storici (quotazioni, statistiche, attributi) sono di **riferimento globale**,
  non stato d'asta.
- Nessun segreto nel client; le chiamate esterne passano dal backend, in cache e
  con rate-limit.
- Nessun dato inventato: gli unmatched restano vuoti/segnalati, non stimati.
- Prima di modifiche ampie **proponi il piano**, non riscrivere in massa.

---

## Fase 6 — Rifiniture v3.0

Sei operazioni: 1 fix fondativo (schema), 4 correzioni UI/UX raggruppate, 1 feature
indipendente. **Ordine e parallelismo** in fondo al file. Le operazioni 2–5
insistono sugli stessi file (`AuctionMode.tsx`, `OverviewPage.tsx`, `Sidebar.tsx`,
`index.css`): sono **un singolo prompt** eseguito da un solo agente, non da agenti
paralleli. Traguardo: taglio finale `v3.0.0`.

### 1 — Fix: identità stabile del proprietario (rinomina di "Io")

**Sintomo.** Rinominando il manager "Io", la pagina Consigli mostra una banda
rossa `manager "Io" not found for league <id>` e l'asta/panoramica perdono il
riferimento all'utente.

**Causa.** Il proprietario è identificato per **nome letterale**
(`OWNER_MANAGER_NAME = "Io"` in `shared/src/manager.ts`) in 5 punti:
`server/src/db/recommendations.ts` (lancia l'errore), `server/src/routes/leagues.ts`
(crea il manager al setup lega), `web/src/pages/auction/AuctionMode.tsx` (2
occorrenze), `web/src/pages/OverviewPage.tsx` (2 occorrenze). Il nome è editabile →
il lookup è fragile per design.

**Task.**

- Migrazione: colonna `manager.is_owner boolean not null default false`;
  **esattamente un** proprietario per lega. Vincolo di unicità parziale
  (`unique (league_id) where is_owner`) per garantire l'invariante a livello DB.
- Backfill: per ogni lega esistente, marca `is_owner = true` il manager con
  `name = 'Io'`; se assente (già rinominato) marca il primo creato (min `id`).
- Setup lega (`routes/leagues.ts`): il manager auto-creato dell'utente nasce con
  `is_owner = true`. Il nome "Io" resta solo come **default modificabile**.
- Sostituisci tutti i lookup per nome con lookup per `is_owner`. Aggiorna
  `ManagerAuctionStatus`/gli status derivati per esporre `isOwner` invece di
  affidarsi a `managerName === "Io"`. `OWNER_MANAGER_NAME` resta solo come stringa
  di default in creazione, non come chiave di identità.
- La rinomina del proprietario **non** deve toccare `is_owner`. Test: creo lega,
  rinomino "Io" → "Andrea", i Consigli continuano a caricarsi.

**Vincoli.** Invariante di dominio intatto: `is_owner` è identità anagrafica del
manager, **non** stato d'asta (il residuo/slot restano derivati dal log
`purchase`). Nessun campo mutabile di stato d'asta introdotto.

**Done.** Il proprietario è identificato da `is_owner`, indipendente dal nome.
Commit `fix:` + bump **MINOR** (migrazione schema + `isOwner` in shared) +
`CHANGELOG` + tag.

### 2–5 — Pacchetto correzioni UI/UX (singolo prompt, un agente)

Quattro correzioni che condividono gli stessi file: falle **insieme**, in
quest'ordine, con un commit per punto (o un unico commit se preferisci atomicità;
in tal caso un solo `CHANGELOG`/bump). Dipende da op.1 solo per l'op.5 (usa
`isOwner`); se op.1 non è ancora landata, l'op.5 può temporaneamente leggere il
proprietario come già fa oggi e va riallineata dopo.

**2 — Fix: sidebar desktop non deve allungarsi con la pagina.**
La `.sidebar` cresce con l'altezza del contenuto, spingendo giù il bottone "entra
in asta" fuori dalla viewport. Rendi la sidebar ad **altezza viewport fissa**
(`position: sticky; top: 0; height: 100vh` con contenuto interno scrollabile e il
blocco azioni — bottone asta — **ancorato in basso** via `margin-top: auto`).
Verifica su pagine lunghe (Consigli, Quotazioni): il bottone resta sempre visibile.
File: `web/src/components/shell/Sidebar.tsx`, `web/src/index.css`.

**3 — Feat: responsive mobile (cellulare in verticale).**
Esistono già `AuctionPhone.tsx` e `useMediaQuery`. Estendi il responsive alla shell
setup, non solo all'asta:

- Sotto il breakpoint mobile la **sidebar sparisce**; la navigazione diventa una
  **barra sticky in fondo** (`position: fixed; bottom: 0`) con le voci principali;
  il selettore lega e il bottone "entra in asta" restano raggiungibili (bottone
  azione nella barra o in cima alla home).
- **Home (`OverviewPage`) usabile in verticale**: griglia che collassa a colonna
  singola, tabelle scrollabili in orizzontale o ridotte a card.
- **Font ridimensionato** su mobile (i token tipografici sono in `index.css`;
  scala le dimensioni sotto il breakpoint, non hardcodare px sparsi).
- **Bottone di uscita dall'asta** visibile su mobile: `AuctionPhone.tsx` oggi non
  espone `onExit` (l'header con "Esci" manca). Aggiungi un controllo di uscita
  sempre visibile nell'header mobile dell'asta.

File: `web/src/index.css`, `web/src/components/shell/Sidebar.tsx` (o nuovo
`BottomNav`), `web/src/pages/OverviewPage.tsx`, `web/src/pages/auction/AuctionPhone.tsx`,
`web/src/App.tsx` (montaggio nav mobile). *Riferimento: screenshot iPhone 12 Pro
(703px). La causa è la shell a due colonne sempre attiva: sotto il breakpoint la
sidebar resta affiancata e comprime il contenuto a una colonna strettissima (il
titolo "Iren luce e gas" va a capo lettera per lettera, font enorme). Fix = shell a
colonna singola su mobile, sidebar rimossa dal flusso, tipografia scalata.*

**4 — Feat: warning modificatori portiere/difesa.**
Quando la lega attiva ha `modificatori.portiere.enabled` o
`modificatori.difesa.enabled` (già nel modello, `shared/src/league.ts`), mostra un
**banner di avviso** (derivazione pura dalle regole lega) che ricorda che il
modificatore è attivo e incide su valutazioni/prezzi. Posizionalo dove la decisione
conta: header asta e/o `OverviewPage`. Un piccolo componente riusabile
(`ModifierWarning`) alimentato da `league.modificatori`.

**5 — Fix: escludere il giocatore in asta dalle alternative libere.**
Nella vista asta, tra le "alternative disponibili" dello stesso ruolo compare anche
il giocatore attualmente battuto. La `CompareRow` ha già il flag `isCurrent`
(`web/src/pages/auction/AuctionMode.tsx`): escludi le righe `isCurrent` dalla
sottolista delle **alternative libere** (mantieni comunque ≥10 alternative reali).
Verifica anche `web/src/lib/auctionDerivations.ts` (`rankSameRole`). Solo
presentazione/derivazione, nessuna scrittura di stato.

**Done.** Sidebar sticky, mobile usabile con nav in fondo e uscita asta, warning
modificatori, alternative senza il giocatore in asta. Commit `feat:`/`fix:` + bump
**MINOR** + `CHANGELOG` + tag.

### 6 — Feat: export/import rose d'asta (formato leghe Fantacalcio)

**Contesto.** Poter **esportare** le rose di un'asta e **reimportarle** in un
formato compatibile con le leghe Fantacalcio ufficiali (interscambio con il
gestionale della lega).

**Formato confermato** (campione utente `fanta-asta-live-rosters-*.csv`). CSV
**senza intestazione**, tre colonne: `<squadra fantacalcio>,<fanta_id>,<prezzo>`.
Una riga separatore `$,$,$` precede ogni blocco-squadra (manager). Esempio:

```
$,$,$
Squadra #1,2379,12
Squadra #1,2764,0
$,$,$
Squadra #2,6434,123
```

Colonna 1 = nome del manager (squadra fantacalcio), colonna 2 = **`fanta_id`** del
giocatore (l'`Id` del listone, la stessa chiave della Fase 5), colonna 3 = prezzo
pagato. Un manager può avere più righe; blocchi separati da `$,$,$`.

**Task (export).**

- Genera il CSV delle rose correnti **derivato dal log `purchase`**: per ogni
  manager, riga separatore `$,$,$` seguita da una riga
  `nome_manager,fanta_id,prezzo` per acquisto. Ordina i manager in modo stabile
  (es. `is_owner` prima, poi per `id`). È una proiezione pura del log, nessun
  campo di stato mutabile. Se un giocatore acquistato non ha `fanta_id` mappato,
  segnalalo (non emettere una riga con id vuoto silenziosamente).

**Task (import).**

- Parser tollerante riusando `shared/src/referenceImport.ts`/`fileRows.ts`:
  **salta** le righe `$,$,$`; ogni riga dati → un acquisto. Manager per nome
  (match sui manager della lega; policy di creazione se assente da esporre e
  documentare). Giocatore via **`fanta_id`** (colonna 2) con fallback
  `name`+`team` non applicabile qui — se `fanta_id` non risolve un `player`, riga
  in **report di scarto**, non inventata. Prezzo = intero colonna 3.
- Import **a sostituzione della sessione d'asta** (svuota e ricostruisci il log
  `purchase` in transazione) oppure append esplicito — esponi la scelta e
  documenta il tradeoff. L'invariante regge: lo stato resta derivato dal log
  ricostruito.
- UI: nuova voce/azione (in `OverviewPage` o pagina dedicata) con export e upload;
  la registrazione nav va in `App.tsx`/`Sidebar.tsx`. Riepilogo import (righe
  importate, scartate per `fanta_id` non risolto, manager sconosciuti) coerente
  con gli altri import dell'app.

**Vincoli.** Repo pubblico: **nessun file rosa reale committato** (dati di lega);
committa solo importer/exporter e un eventuale template vuoto.

**Done.** Rose esportabili in formato lega e reimportabili con report di scarto,
stato d'asta ricostruito dal log. Commit `feat:` + bump **MINOR** (o **MAJOR** se
è la feature che motiva il salto v3.0 — vedi ordine sotto) + `CHANGELOG` + tag.

---

## Ordine di esecuzione e parallelismo

**Dipendenze reali** (per collisione sugli stessi file):

1. **Op.1 (identità proprietario) va per prima e da sola.** Tocca file condivisi
   con l'op.5 (`AuctionMode.tsx`, `OverviewPage.tsx`) e cambia lo shared. Landala,
   poi le altre si allineano su `isOwner`.
2. **Op.2–5 sono un unico prompt / un solo agente.** Insistono tutte su
   `AuctionMode.tsx` / `OverviewPage.tsx` / `Sidebar.tsx` / `index.css`:
   parallelizzarle causerebbe conflitti. Serial, un agente.
3. **Op.6 (export/import rose) è indipendente**: quasi solo file nuovi + una
   registrazione nav. Può girare **in parallelo** all'op.2–5.

**Prompt di orchestrazione parallela (dopo che l'op.1 è landata).**

> Esegui in parallelo le operazioni 2–5 e l'operazione 6 della Fase 6 creando **2
> subagenti**, ciascuno nel proprio git worktree isolato:
>
> - **Agente A — "correzioni-ui"**: implementa le operazioni 2, 3, 4, 5 in
>   quest'ordine. Limita le modifiche a: `web/src/index.css`,
>   `web/src/components/shell/Sidebar.tsx` (+ eventuale `BottomNav`),
>   `web/src/pages/OverviewPage.tsx`, `web/src/pages/auction/AuctionMode.tsx`,
>   `web/src/pages/auction/AuctionPhone.tsx`, `web/src/lib/auctionDerivations.ts`,
>   e il montaggio nav in `web/src/App.tsx`. **Non** toccare backend/shared/import.
> - **Agente B — "export-import-rose"**: implementa l'operazione 6. File nuovi per
>   export/import + `shared` per lo schema del formato + route backend + una pagina
>   UI dedicata. **Non** modificare `AuctionMode.tsx`, `OverviewPage.tsx`,
>   `Sidebar.tsx`, `index.css`; per la nav registra la voce in `App.tsx` (unico
>   punto di contatto con l'agente A — coordina o fai integrare questa riga alla
>   fine dall'orchestratore per evitare il conflitto).
>
> Ogni agente rispetta `CLAUDE.md`: `build` + `lint` verdi, commit locale a fine
> feature (Conventional Commits inglese, mai push), bump SemVer + `CHANGELOG` + tag
> locale, nessun riferimento ad AI. L'orchestratore fa il merge dei due worktree,
> risolve l'unico punto di contatto (`App.tsx` nav), riesegue `build`+`lint`, e
> taglia **`v3.0.0`** con la voce `CHANGELOG` riassuntiva della Fase 6.

**Se preferisci il seriale** (una collisione in meno da gestire): op.1 → op.2–5 →
op.6, un commit/tag per operazione, `v3.0.0` sull'ultima.
