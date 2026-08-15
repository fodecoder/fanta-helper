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
- A ogni feature aggiorna `version` in `package.json` in modo coerente:
  - `feat` → incremento `MINOR`
  - `fix` → incremento `PATCH`
  - breaking change → incremento `MAJOR`
- Aggiungi la voce corrispondente in `CHANGELOG.md`.
- Crea un git tag locale `vX.Y.Z`. Il tag NON viene pushato.

## Pre-commit

- `build` e `lint` devono passare prima di ogni commit.
- Se build o lint sono rotti, NON committare. Prima si sistema, poi si committa.

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
