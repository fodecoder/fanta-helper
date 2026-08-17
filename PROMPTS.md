# PROMPTS.md — Prompt per le prossime operazioni

Backlog operativo. Le operazioni 1–10 (scaffolding → schema DB → deploy pipeline
→ CRUD lega → import giocatori CSV → CRUD manager → import valutazioni JSON →
asta live → selettore lega → max bid rettificato) sono completate fino a
`v0.9.0`; i relativi prompt sono stati rimossi. Restano le due operazioni di
Fase 2 che chiudono la `v1.0.0`, in ordine di dipendenza. Ogni prompt è
autosufficiente ma assume che l'agente rispetti `CLAUDE.md` e `SPEC.md`. Regole
trasversali valide per tutte le operazioni:

- Rispetta `CLAUDE.md`: commit locale a fine feature, MAI push, Conventional
  Commits in inglese, SemVer + `CHANGELOG.md` + tag locale, build e lint verdi
  prima del commit, nessun riferimento ad AI/assistenti/proprietario.
- Rispetta l'invariante di dominio: lo stato dell'asta è derivato dal log
  `purchase`. Nessun campo mutabile di stato.
- Nessun segreto nel client; le chiamate esterne passano dal backend.
- Prima di modifiche ampie, proponi il piano; non riscrivere in massa.

---

## 11 — Rifinitura UI (design token dalla palette)

**Contesto.** Le schermate sono funzionali ma grezze. La palette è in `SPEC.md`
("Palette") ma non è ancora consolidata come token; la scelta tra i due blu va
fissata sul riferimento reale. Nessuna nuova dipendenza di dominio: è solo
presentazione, lo stato d'asta resta derivato dal log.

**Task.** Consolida l'aspetto della SPA:

- Definisci i colori della palette come **design token** (variabili CSS in
  `web/src/index.css`): verde brand `#2BA756`, blu header (scegli tra `#11246F`
  e `#144F89` e motiva), arancione accenti `#FF8300`, verde scuro `#077449`,
  bianco. Sostituisci i colori hardcoded con i token.
- Uniforma layout e spaziature tra Home, Leghe, Manager, Valutazioni, Asta:
  header coerente, stati di caricamento/errore/empty espliciti, form e tabelle
  con stile condiviso. La schermata Asta ha priorità (densità informativa alta:
  log, stato derivato, max bid leggibili a colpo d'occhio).

**Vincoli.** Solo presentazione: nessun cambiamento all'invariante, nessun campo
di stato mutabile, nessun segreto nel client. Niente librerie UI pesanti senza
motivarne il tradeoff (preferenza: poche dipendenze).

**Done.** Le schermate condividono token e stile coerente; l'Asta è leggibile
sotto pressione. Commit `feat:` + bump MINOR + tag.

---

## 12 — Miniature giocatori (stemma squadra + placeholder per ruolo)

**Contesto.** `player.image_url` è nullable e pronta per il backfill delle foto
reali (Fase 3). Per l'MVP servono miniature generate, non foto reali.

**Task.** Rendi le miniature dei giocatori dove compaiono (ricerca in Asta,
liste, valutazioni):

- MVP come da `SPEC.md` ("Miniature"): stemma/colore della squadra + iniziali
  del giocatore su placeholder colorato per ruolo (P/D/C/A con colori distinti).
- Se `image_url` è valorizzata, usa la foto reale; altrimenti il placeholder
  generato. Componente riutilizzabile, deterministico dal nome/squadra/ruolo.

**Vincoli.** Nessuna chiamata esterna dal client per le immagini in MVP (niente
fetch di stemmi da terze parti senza passare dal backend). Placeholder generati
localmente. `image_url` resta il punto d'aggancio per la Fase 3.

**Done.** Ogni giocatore mostra una miniatura coerente (foto se presente, altrimenti
placeholder per ruolo). Chiude la Fase 2 → prepara il bump a `v1.0.0`. Commit
`feat:` + bump MINOR + tag; a Fase 2 chiusa valuta il bump `v1.0.0`.
