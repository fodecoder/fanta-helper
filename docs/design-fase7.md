# Fase 7 — Multiutente v4.0 · Audit engine + design

Documento di decisione. Da approvare prima di implementare. Le sezioni con
**Scelta** propongono una direzione; le alternative sono argomentate perché la
decisione resti tracciabile.

**Vincolo trasversale (non negoziabile).** Ogni feature qui sotto rispetta
l'invariante: nessun campo di stato mutabile. Le personalizzazioni per-utente e
lo stato chat sono **layer di override/append**, non mutazioni del dato di base.
`effettivo = override ?? base`, calcolato a lettura — stessa forma di
`residuo = budget − Σ(acquisti)`.

---

## 1. Audit dell'engine (`shared/src/recommendationEngine.ts`)

Formula attuale, per giocatore disponibile con dati:

```
reliability      = presenze / max(presenze osservate)          ∈ [0,1]
bonusPerMatch    = Σ(bonus/malus stagione · scoring) / presenze
dBonus           = difesaBonus(mv, ruolo, modificatori.difesa)
leagueAdjustedFm = mv + bonusPerMatch + dBonus
rawValue         = leagueAdjustedFm · reliability
scarcity         = clamp(domandaResidua/offerta, 0.85, 1.35)
score            = rawValue·scarcity − replacement(rank = slotLiberiIo+1)
```

### Difetti trovati, in ordine di impatto

**A1 — Il modificatore `portiere` è ignorato del tutto.** `difesaBonus` copre
solo `modificatori.difesa` (P e D). `modificatori.portiere` è uno `enabled`
toggle mai letto dall'engine. Un portiere di squadra con pochi gol subiti oggi
non riceve alcun credito. **Da correggere** (è anche una richiesta esplicita).

**A2 — Il modificatore difesa usa l'`mv` individuale come proxy della media-voto
del reparto.** Il commento nel codice lo ammette. Il modificatore difesa reale è
una proprietà del *blocco difensivo schierato* (Por + 3 migliori D) su una
giornata, non della media stagionale del singolo. Conseguenza: sopravaluta il
difensore con `mv` alto in isolamento e non cattura che il bonus è di squadra.
Heuristica accettabile ma va marcata a bassa confidenza e migliorata (vedi §6).

**A3 — L'`mv` base (~6) domina lo score, appiattendo il valore dei bonus.** Su
base per-partita, un bomber aggiunge ~0.5–0.8 di fantavoto; l'`mv` varia
5.5–6.5. Poiché `leagueAdjustedFm = mv + bonusPerMatch`, l'ordinamento è
guidato più dall'`mv`·affidabilità che dalla produzione di bonus. Effetto: gli
attaccanti si differenziano poco tra loro; rigoristi e bomber sono
sotto-premiati. Fix possibile: pesare di più la parte-bonus (es. separare
`baseVote` da `bonusExpectancy` con un peso di ruolo), o normalizzare l'`mv`
sottraendo un livello di riferimento (6.0) così che lo score misuri il
*margine* sopra la sufficienza, non il voto assoluto. Raccomandato: sottrarre
un `MV_BASELINE` e lasciare i bonus a valore pieno — più discriminante, ancora
spiegabile.

**A4 — `reliability` guarda solo le presenze della stagione scorsa.** Neopromossi,
nuovi acquisti e chi era infortunato l'anno prima sono penalizzati anche se oggi
sono titolari fissi. Il dato `probable_lineup.stato` (titolare/panchina/
ballottaggio) esiste già e non è usato. **Opportunità**: usare lo stato di
titolarità corrente come segnale di affidabilità (o come override quando
diverge molto dalle presenze storiche). È anche la base del tag «Titolare da 6».

**A5 — La scarsità gonfia l'offerta con giocatori non schierabili.** `supplyByRole`
conta tutti i disponibili, inclusi i fondi-scala. Per P e D l'offerta risulta
sovrastimata → scarsità sottostimata. Minore; si può pesare l'offerta sui soli
giocatori sopra replacement.

**A6 — Engine e valutazioni importate non si parlano.** Lo score è calcolato da
statistiche; `target/fair_value/max_bid` importati vivono a parte. L'unico ponte
è `gapSignal = valuePercentile − pricePercentile`. Non è un bug, ma è la
superficie giusta su cui appoggiare i tag «occasione/Scommessa».

**Cosa NON è rotto:** VORP con `replacementRank = slotLiberiIo+1` è corretto e
azzera i ruoli che «Io» non deve più riempire; `maxBid` con floor uniforme è
volutamente semplice e va bene per il tag «da prendere a 1».

### Priorità di correzione
1. A1 (portiere) + A2 (difesa team-aware) — richiesti e prerequisito dei tag P/D.
2. A4 (titolarità nella reliability) — prerequisito del tag «Titolare da 6».
3. A3 (baseline mv) — migliora la discriminazione, base dei tag «Porta bonus».
4. A5, A6 — rifinitura.

---

## 2. Tag giocatore (derivati, subito visibili)

Tutti i tag sono **funzioni pure** di pool + statistiche + quotazioni +
`set_piece_taker` + `probable_lineup` + regole lega. Nessun campo salvato. Un
giocatore può avere più tag. Calcolati in `shared/` accanto all'engine e
mostrati come badge in Consigli e Asta.

| Tag | Regola (bozza) | Fonte dati |
|---|---|---|
| **Rigorista** | rigorista rank 1 (o ≤2) della sua squadra | `set_piece_taker tipo=rigore` |
| **Titolare da 6** | `stato=titolare` + reliability alta + pochi bonus attesi (FVM medio) | probable_lineup + stats |
| **Porta bonus** | tasso gol+assist per partita nel top del ruolo | stats |
| **Difensore da bonus** | D/P con alto tasso bonus **o** squadra con difesa solida (pochi gol subiti) | stats + team GA |
| **Scommessa** | prezzo (FVM) basso + segnale di upside (campione piccolo ad alto rendimento, o titolare oggi ma poche presenze storiche) | quotation + stats + lineup |
| **Da prendere a 1** | FVM minimo + score ≈ replacement + «Io» ha ancora lo slot | quotation + engine |
| **Porta bonus difensivo** ecc. | derivabili in seguito | — |

Nota naming: oggi `TIER_THRESHOLDS` usa già l'etichetta «Scommessa» come fascia
di valore. Va disambiguata: le **fasce** (Top/Solido/Utile) restano sul valore;
i **tag** sono un asse separato. Rinominare la fascia bassa (es. «Low») per non
sovrapporsi.

---

## 3. Login (4 utenti)

Rompe l'assunzione storica «app a uso personale, nessun login». Motivato dal
passaggio a multiutente: gli override, l'avatar e la chat hanno bisogno di
un'identità.

- **Scelta:** tabella `app_user(id, username, password_hash, avatar, avatar_color)`.
  Password **hashate con bcrypt lato server** (mai in chiaro, mai nel client —
  rispetta la regola segreti). `POST /auth/login` verifica e restituisce un
  token di sessione firmato in cookie `httpOnly`. Seed iniziale: Andre, Davide,
  Fra, Paul con le password fornite (hashate al seed).
- **Alt. A (scartata):** solo selettore-nome senza password. Più semplice, ma hai
  fornito password esplicite → vuoi un gate.
- **Alt. B (scartata):** auth completo (OAuth/refresh token). Sovradimensionato
  per 4 amici.
- **Legame con l'identità esistente:** oggi il proprietario è un `manager`
  per-lega con `is_owner`. Introduciamo un mapping `manager.user_id → app_user`:
  in una lega, il manager «collegato all'utente loggato» diventa il «tu» su cui
  si personalizzano i consigli. `is_owner` resta per retrocompatibilità dei dati
  esistenti.

---

## 4. Avatar e colore

Campi su `app_user` (`avatar`, `avatar_color`). Avatar da set predefinito
(emoji o iniziali su tinta) per non gestire upload/immagini. Editabili dalla
pagina profilo. Usati in header, chat e panoramica manager.

---

## 5. Chat 1-a-1, ancorabile

- **Trasporto — Scelta: polling.** `chat_message(id, from_user, to_user, body,
  created_at)`, append-only (coerente con la filosofia log immutabile).
  `GET /chat?with=<userId>&since=<ts>` ogni 2–3 s; `POST /chat` per inviare.
  Latenza di pochi secondi, accettabile per un'asta tra amici, **zero infra**
  aggiuntiva (il free tier di Render non regge bene websocket persistenti).
- **Alt. A:** SSE (stream uni-direzionale + POST). Real-time, più codice,
  fragile su free tier.
- **Alt. B:** WebSocket. Real-time pieno, ma infra e connessioni persistenti
  fuori scala per l'uso.
- **UI:** pannello flottante piccolo, `draggable` + `resizable`, posizione e
  dimensione salvate in `localStorage` (conveniente per-utente, non è stato
  condiviso — ammesso). Selezione del destinatario da lista utenti. Solo 1-a-1.

---

## 6. Preferenze per-utente (override dei consigli)

Il valore di base resta invariato per gli altri.

- **Scelta: tabella di override sparsa.** `user_valuation_override(user_id,
  league_id, player_id, target?, fair_value?, max_bid?, panic_price?, note?)` con
  campi nullable. Valore effettivo a lettura: `coalesce(override, base)`. Base
  immutabile, override per-utente, derivazione a render — identico allo spirito
  dell'invariante d'asta.
- **Alt. A (scartata):** copy-on-write dell'intero set valutazioni per utente.
  Spreco e rischio di drift dal base.
- **Alt. B (scartata):** patch JSON per-utente. Compatta ma poco interrogabile e
  scomoda per l'ordinamento.

## 7. Preferenze di squadra (volute / da evitare)

`user_team_pref(user_id, league_id, team, kind: 'prefer'|'avoid')`.

- **Effetto — Scelta di default: flag + ordinamento secondario, niente mutazione
  dello score.** «Preferita» → a parità di fascia i suoi giocatori salgono in
  lista; «da evitare» → badge visibile «squadra da evitare» e demozione in coda.
  Lo score di base resta comparabile e non corrotto.
- **Alt. (opzionale, come impostazione):** moltiplicatore limitato (es. ±10 %)
  che sposta davvero il ranking. Più incisivo ma inquina il valore; da attivare
  solo se lo vuoi esplicito.

## 8. Modificatori portiere/difesa nell'engine (dettaglio A1/A2)

- **Portiere (A1):** con `modificatori.portiere.enabled`, stimare per il P un
  bonus atteso dai gol subiti di squadra (`gs`/presenze → proxy di clean sheet).
  Alternativa: usare la matrice `gk_pairing` già esistente per premiare i P di
  squadre a calendario favorevole. Raccomandato: partire dal tasso gol-subiti,
  la matrice resta per il suggerimento coppia già presente.
- **Difesa (A2):** tre opzioni —
  (i) proxy `mv` individuale attuale (semplice, impreciso);
  (ii) **`mv` fuso col tasso gol-subiti di squadra** (pragmatico, team-aware) —
  raccomandato;
  (iii) simulazione del blocco difensivo sulla rosa reale (accurato, ma sensato
  solo in asta a rosa parziale). Ogni bonus difesa va esposto a confidenza
  dichiarata.

---

## Ordine di lavoro proposto

1. **Audit fix engine** (A1, A2, A4) — fondamenta corrette prima dei tag.
2. **Tag giocatore** — sopra l'engine corretto, badge in Consigli/Asta.
3. **Login + avatar** — introduce `app_user` e il mapping manager↔utente.
4. **Preferenze per-utente + preferenze squadra** — override sparsi + re-rank.
5. **Chat** — indipendente, polling.
6. **SoFIFA landing/asta** — logo (normale in landing/login, piccolo in asta) +
   link `https://sofifa.com/`.

Ogni punto = una feature = un commit (build+lint verdi), versioning SemVer verso
`v4.0.0`.
