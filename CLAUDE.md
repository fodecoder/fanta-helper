# CLAUDE.md — Regole operative

Regole vincolanti per lo sviluppo di questa repo. Non sono linee guida: sono requisiti.

## Git

- Al termine di OGNI feature implementata, esegui un commit locale.
- MAI `git push`. Il push è un'operazione manuale e umana.
- Non modificare la history già pubblicata (no rebase/force su `main`).

## Commit

- Formato: Conventional Commits in inglese.
- Tipi ammessi: `feat`, `fix`, `chore`, `refactor`, `docs`.
- Nessun riferimento ad AI, assistenti, strumenti di generazione o attribuzioni di autore.
- Nessuna emoji di attribuzione.
- Il messaggio descrive il cambiamento, non chi o cosa lo ha prodotto.

## Versioning

- Schema: SemVer (`MAJOR.MINOR.PATCH`).
- A ogni feature aggiorna `version` nel `package.json` di **root** del monorepo
  in modo coerente (è quello letto da `web/vite.config.ts` per `__APP_VERSION__`,
  cioè la versione mostrata in app; `web/package.json` NON è usato):
  - `feat` → incremento `MINOR`
  - `fix` → incremento `PATCH`
  - breaking change → incremento `MAJOR`
- Aggiungi la voce corrispondente in `CHANGELOG.md`.
- Crea un git tag locale `vX.Y.Z`. Il tag NON viene pushato.

## Pre-commit

- `build` e `lint` devono passare prima di ogni commit.
- Se build o lint sono rotti, NON committare. Prima si sistema, poi si committa.
- Prima di ogni commit, verifica se la feature disallinea `PROMPTS.md`,
  `PLAN.md`, `README.md` o `CHANGELOG.md` rispetto allo stato reale del
  codice, e aggiornali nello stesso commit (o in un commit `docs` immediatamente
  precedente). In particolare:
  - `PROMPTS.md`: il prompt appena implementato passa da voce descritta per
    intero a riferimento chiuso (fase chiusa + hash commit), come già fatto
    per le fasi precedenti — non lasciarlo descritto come "da fare" a
    lavoro fatto.
  - `PLAN.md`: la fase in corso aggiorna il proprio stato (*in corso* →
    *chiusa*) quando l'ultimo prompt del gruppo è implementato, e la sezione
    "Traguardi di rilascio" guadagna la voce di versione corrispondente.
  - `README.md`: la riga "Stato" in "Hosting online" riporta versione e data
    correnti, non quelle dell'ultimo aggiornamento manuale.
  - Se una feature introduce un'eccezione o una decisione che contraddice un
    commento/invariante già scritto altrove nel codice (es. una nota che
    dice esplicitamente "niente update, solo insert/delete"), il commento va
    aggiornato o il piano deve giustificare esplicitamente perché resta
    valido — non lasciare codice e commento in contraddizione.
  - Non è richiesto un aggiornamento se la feature non cambia lo stato
    descritto in questi file (es. un fix isolato non menzionato altrove).

## Commenti nel codice

- Ammessi solo dove la logica non è ovvia: invarianti, workaround, decisioni non banali.
- Vietati i commenti ridondanti che riformulano il codice a parole.

## Invariante di dominio

- Lo stato dell'asta è SEMPRE derivato dal log immutabile `purchase`.
- `residuo = budget − Σ(acquisti)`, ricalcolato a ogni render.
- Vietato introdurre campi mutabili di stato (residuo, slot liberi, max bid non
  possono essere colonne aggiornabili). Se una modifica richiede un campo di
  stato mutabile, va rifiutata e riprogettata come derivazione dal log.

## Segreti

- Nessuna API key o segreto nel client.
- Le chiamate a servizi esterni passano dal backend.

## Modifiche ampie

- Prima di modifiche ampie proponi il piano.
- Non riscrivere in massa file o moduli senza approvazione del piano.
- Esponi i tradeoff delle decisioni tecniche non banali.
