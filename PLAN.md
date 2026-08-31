# PLAN.md — Sequenza di feature

Fasi ordinate, dalla più vecchia alla più recente. Storico compatto in fondo.

> Stato al 2026-08-31 — `v4.6.0`. Fasi 0–7 e la fase mobile (P10) sono
> **complete**: scaffolding, MVP, engine di consiglio su valore relativo alla
> lega, dati storici Serie A, redesign Broadsheet, multiutente (login,
> personalizzazione, chat), sessione mobile. Dettagli di ognuna nel
> [CHANGELOG.md](./CHANGELOG.md) e nella git history; l'audit di verifica P1–P9
> resta più sotto per riferimento.
>
> **In corso — Fase 8**: 9 problemi emersi dal primo uso reale dell'app in asta
> (10 manager, 2026-08-30), verificati sul codice e con ricerca esterna
> (Fantacalcio.it, fantacalcio.dev, Goal.com). Prompt operativi P11–P15 in
> [PROMPTS.md](./PROMPTS.md).

## Fase 8 — Correzioni post-asta reale  *(in corso)*

Trovati usando l'app in un'asta vera a 10. Ognuno verificato sul codice (non
solo riportato) prima di essere messo in prompt.

1. **Palette ruoli sbagliata.** Solo P (giallo) è corretto. `web/src/index.css`
   righe 51–54: D usa `--color-accent` (arancione), C usa `--color-neutral-700`
   (grigio), A usa `--color-accent-2` (magenta) — invece di blu/verde/rosso.
2. **Valutazioni incomplete.** `docs/sample/asta_1000_lega8.json` e
   `lega10.json` coprono **79 giocatori ciascuno** su un pool di ~550+. Il
   meccanismo di seed (`POST /leagues` → `seedDefaultValuationsForLeague`)
   funziona: è la copertura dati a mancare, non il collegamento. Durante
   l'asta, giocatori chiamati fuori da quei 79 risultano senza valutazione.
3. **Nessuna vista avversari in asta.** `ManagersPage.tsx` mostra già le rose
   per manager, ma solo come pagina separata — non è agganciata alla schermata
   Asta mentre un giocatore viene chiamato. Manca un pannello "cosa hanno già
   preso gli avversari" (big presi, slot liberi, crediti residui e crediti
   spendibili sul giocatore in asta).
4. **FVM non ponderato ai crediti.** Risposta: no. `recommendationEngine.ts`
   usa FVM come percentile relativo per ruolo (corretto per l'ordinamento), ma
   la Vista Asta lo mostra anche come proxy di prezzo assoluto senza
   riscalarlo al budget di lega — a differenza di `valuation`, che ha un
   riscalaggio esplicito su base 1000 (`valuationScale.ts`). FVM ufficiale è
   su base standard 500 crediti: con budget di lega diverso il numero mostrato
   non è comparabile a quanto si spenderà davvero.
5. **Nuovo formato listone, import incompatibile.** Il file allegato
   (`Lista-FantaAsta-Fantacalcio.csv`) non ha riga di intestazione: 19 colonne
   posizionali (Id, Nome, Nome completo, Ruolo, Ruolo Mantra, 4 colonne
   quotazione — uguali a inizio stagione, Squadra, FVM×2, Piede, Nazionalità,
   Data di nascita, URL foto, flag, Mv, Fm — **mappatura da confermare
   leggendo il file, non assunta a scatola chiusa**). L'importer attuale
   (`playerImport.ts`, `PLAYER_REQUIRED_COLUMNS`) richiede header con nomi
   esatti (`R`, `Nome`, `Squadra`) e scarta il resto. La UI di import ha anche
   un nome non parlante, da rinominare "Import Listone".
6. **Duplicati quando un giocatore cambia squadra.** Bug confermato in
   `server/src/db/players.ts`, `upsertPlayer`: il vincolo `ON CONFLICT (name,
   team)` non scatta se il `team` cambia tra un import e l'altro (stesso nome,
   squadra diversa → nuova riga anziché update della squadra sulla riga
   esistente).
7. **Giocatori trappola, concetto assente.** Non esiste oggi. Editorialmente
   (Fantacalcio.it) sono nomi ad hype che deludono in campo; per l'uso
   dichiarato ("farli chiamare per far spendere gli avversari") la
   definizione operativa più solida e già calcolabile con i dati in-app è
   l'inverso delle "occasioni" già segnalate dall'engine: FVM/prezzo di
   mercato alto ma `fair_value` del motore basso. Da esporre come lista
   dedicata, con tag manuale opzionale per i casi editoriali puri.
8. **Nome completo assente.** `player` non ha un campo `nome_completo`; oggi
   si mostra solo il nome abbreviato del listone. Il nuovo listone lo fornisce
   in colonna propria.
9. **Foto campioncini senza fallback.** `PlayerAvatar.tsx` usa `image_url`
   senza gestione d'errore: un link scaduto o vietato rompe l'immagine invece
   di ricadere sul placeholder squadra+ruolo già esistente nel componente.

### Ricerca esterna a supporto (per i prompt su valutazioni ed engine)

- **fantacalcio.dev — [Fasce oneste 2026-27](https://fantacalcio.dev/report/fasce-oneste-2026-27):**
  fasce costruite su 3 stagioni di dati e **backtestate** (non solo
  pubblicate): confermano un tasso di conferma della fascia top molto diverso
  per ruolo — centrocampisti 62%, difensori 54%, attaccanti e portieri 33%.
  Ripartizione budget "corretta per il rischio": portieri 6%, difensori
  27–28%, centrocampisti 40–43%, attaccanti 25% (contro la ripartizione
  classica 7-8/12-14/22-25/55-60%). Soglia minima 15 fantavoti per considerare
  affidabile una fantamedia. Tabella indicativa per debuttanti dall'estero
  (Premier top → fascia alta diretta, altre grandi leghe → semi-top, Serie B →
  terza fascia). Prezzo massimo consigliato = (fantamedia giocatore −
  fantamedia primo sostituto gratuito del ruolo) × presenze convenzionali ×
  tasso di conferma del ruolo. Metodo compatibile con l'approccio già in
  `recommendationEngine.ts` (replacement level + affidabilità da presenze):
  il gap è che oggi l'engine non pesa la fiducia per ruolo né usa un tasso di
  conferma nella generazione delle valutazioni di default.
- **Fantacalcio.it — [5 trappole](https://www.fantacalcio.it/consigli-fantacalcio/06_09_2022/consigli-asta-fantacalcio-trappole-429090):**
  conferma che "trappola" è un giudizio editoriale caso per caso (rischio
  minutaggio, infortuni, concorrenza interna alla squadra) — non un pattern
  statistico fisso, altro motivo per trattarlo come tag anche manuale, non
  solo derivato.
- Ricerca sul formato esatto del CSV allegato non ha trovato documentazione
  ufficiale pubblica della colonna-per-colonna: la mappatura in punto 5 resta
  un'ipotesi da validare sul file reale in fase di implementazione.

### Audit P1–P9 (verificato sul codice, 2026-08-29)

Tutti implementati, con test per i moduli puri. Nessun elemento parziale/mancante.

| P | Evidenza principale |
|---|---|
| P1 | `shared/src/recommendationEngine.ts` — `portiereBonus`, `blendDifesaMv`, `difesaBonus`, `pBonus`; `recommendationEngine.test.ts` |
| P2 | `recommendationEngine.ts` — `MV_BASELINE`, `LINEUP_STATO_RELIABILITY`, `reliability`/`rawValue` |
| P3 | `shared/src/playerTags.ts` + `playerTags.test.ts`; `server/src/db/recommendations.ts` (`computePlayerTags`); badge in `RecommendationsPage.tsx` / `auction/*` |
| P4 | migrazioni `1787811995007_app-user.sql`, `1787811996024_manager-user-id.sql`; `server/src/routes/auth.ts`, `server/src/auth/*`, `http/requireAuth.ts`, `db/seedUsers.ts`; `web/src/pages/LoginPage.tsx`, gate `App.tsx` |
| P5 | campi `avatar`/`avatar_color` su `app_user`; `shared/src/avatar.ts`; `web/src/components/UserAvatar.tsx`, `shell/ProfileModal.tsx`, `shell/UserMenu.tsx` |
| P6 | migrazione `1787961600000_user-personalization.sql`; `server/src/db/{valuationOverrides,teamPrefs}.ts`, `routes/{valuations,teamPrefs}.ts`; `shared/src/teamPreferences.ts` + `teamPreferences.test.ts`; `web/src/components/{TeamPrefPanel,ValuationOverrideRow}.tsx` |
| P7 | migrazione `1788048000000_chat-message.sql`; `server/src/routes/chat.ts`, `db/chat.ts`; `web/src/components/shell/ChatPanel.tsx`, `web/src/api/chat.ts` |
| P8 | `web/public/sofifa-logo*.png`; `web/src/pages/LoginPage.tsx`; `web/src/pages/auction/AuctionDesktop.tsx` |
| P9 | `web/src/components/ui/{Dialog,InfoLabel,TeamPrefBadge}.tsx`, `ScoreBreakdownDialog.tsx`, `lib/columnGlossary.ts`; `recommendationEngine.ts` `breakdown` + `normalizeScoresByRole` + test; `maxBid.ts` `explainAdjustedMaxBid`; `playerTags.ts` ristretto a `"D"` + test |

Aggravante nota (candidata a prompt successivo): dopo `POST /auth/login` il
client non riverifica `/auth/me` (`web/src/App.tsx`), quindi quando il cookie di
sessione non persiste si resta «loggati ma tutto 401» invece di tornare al login.

## Traguardi di rilascio (storico)

- `v1.0.0` — Fase 2 completa + servizi in produzione (Neon + Render + Cloudflare
  Pages).
- `v2.2.0` — redesign UI (design system Broadsheet).
- `v3.3.0` — Fase 6 (rifiniture v3.0).
- `v4.0.0` — Fase 7: modello multiutente (login, identità per-utente,
  personalizzazione consigli) + migrazioni schema associate.
- `v4.5.0` — Fase 7 chiusa (bugfix UI + score 0–10 per ruolo).
- `v4.6.0` — Fase mobile (P10): sessione, chat e notifiche su mobile.
