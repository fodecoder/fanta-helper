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
