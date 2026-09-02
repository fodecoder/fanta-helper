// Seed statico dei rigoristi e tiratori da fermo, aggiornato da fonte esterna
// il 2026-09-02 (dati fermi al 28/08–01/09/2026, dopo le prime due giornate).
// Sostituisce la versione precedente trascritta a mano dal PDF
// `docs/Rigoristi e tiratori da fermo Serie A.pdf` (fonte più vecchia, pre-
// mercato estivo): quel PDF andava aggiornato dopo le cessioni/gli arrivi di
// fine agosto (es. Gaetano Atalanta→Cagliari→Atalanta di nuovo nei ruoli di
// rigorista, cambi di allenatore che hanno riaperto gerarchie).
//
// Fonti — due, ruoli diversi, non mescolate:
//  - `rigore`: Goal.com, "Fantacalcio: rigoristi Serie A 2026/2027, tiratori e
//    gerarchie dal dischetto delle 20 squadre" (pubblicato 29/08/2026,
//    aggiornato 01/09/2026) — unica fonte trovata con la gerarchia numerata
//    (1°/2°/3° rigorista) per tutte e venti le squadre.
//  - `punizione`: SOS Fanta / Gazzetta dello Sport, "Tutti i tiratori di
//    corner e punizioni in Serie A per il fantacalcio 2026/27" (pubblicato
//    28/08/2026, aggiornato 31/08/2026) — lista punizioni per squadra; dove
//    la fonte separa anche i corner, quella lista non è stata copiata qui
//    (il campo `punizione` di questo file storicamente conflate le due
//    specialità, vedi nota sotto).
//
// Verificato contro una seconda fonte (Fantacalcio Online, rigoristi
// aggiornato 01/09/2026, un nome solo per squadra) per capire dove le fonti
// concordano. Sei squadre su venti hanno il 1° rigorista discordante tra le
// due fonti rigori consultate — segnalato squadra per squadra sotto: sono
// gerarchie realmente aperte a inizio stagione (nuovo allenatore, mercato
// ancora fresco), non un errore di trascrizione. Tienile d'occhio nelle
// prime giornate e correggi in-app se un giocatore diverso batte il rigore
// in campo.
//
// Mappatura sezioni sui `tipo` ammessi (rigore | punizione | corner):
//   "Rigoristi"           -> rigore
//   "Punizioni" (calci piazzati diretti) -> punizione (i corner, quando la
//     fonte li elenca separatamente, non sono inclusi in questo array)
// Il `rank` è dato dalla posizione nell'array (1-based). I nomi seguono, dove
// possibile, la grafia abbreviata del listone Fantacalcio; `team` combacia
// con le squadre in `player`.

export interface SeedTeamSetPieces {
  team: string;
  rigore: string[];
  punizione: string[];
}

export const SET_PIECE_TAKERS_SEED: SeedTeamSetPieces[] = [
  {
    team: "Atalanta",
    // Discordanza: Fantacalcio Online indica Scamacca come 1° rigorista,
    // Goal.com indica Kessié (36 rigori calciati in carriera, 8 sbagliati) —
    // usata qui la gerarchia numerata di Goal.com.
    rigore: ["Kessié", "Scamacca", "De Ketelaere"],
    punizione: ["Samardzic", "Gaetano", "De Ketelaere", "Raspadori", "Ederson"],
  },
  {
    team: "Bologna",
    rigore: ["Orsolini", "Dovbyk", "Bernardeschi"],
    punizione: ["Orsolini", "Bernardeschi", "Ferguson"],
  },
  {
    team: "Cagliari",
    // Discordanza: Fantacalcio Online indica Mina come 1° rigorista,
    // Goal.com indica Fazzini (subentrato dopo la partenza di Esposito) —
    // usata qui la gerarchia numerata di Goal.com.
    rigore: ["Fazzini", "Mina", "Deiola"],
    punizione: ["Maldini", "Fazzini", "Winks", "Obert"],
  },
  {
    team: "Como",
    rigore: ["Da Cunha", "Paz N.", "Douvikas"],
    punizione: ["Paz N.", "Milla", "Baturina", "Da Cunha", "Perrone"],
  },
  {
    team: "Fiorentina",
    // Discordanza: Fantacalcio Online indica Gudmundsson come 1° rigorista,
    // Goal.com indica Mastantuono (gerarchia esplicitamente "da definire" col
    // nuovo allenatore) — usata qui la gerarchia numerata di Goal.com;
    // Gudmundsson resta comunque il riferimento per le punizioni dirette.
    rigore: ["Mastantuono", "Pellegrino M."],
    punizione: ["Gudmundsson A.", "Mastantuono", "Mandragora", "Fagioli"],
  },
  {
    team: "Frosinone",
    rigore: ["Calò", "Raimondo"],
    punizione: ["Calò", "Ghedjemis", "Kvernadze"],
  },
  {
    team: "Genoa",
    rigore: ["Colombo", "Messias", "Vitinha O."],
    punizione: ["Baldanzi", "Messias", "Mitaj", "Frendrup"],
  },
  {
    team: "Inter",
    rigore: ["Calhanoglu", "Martinez L.", "Zielinski"],
    punizione: ["Calhanoglu", "Dimarco", "Zielinski", "Sucic"],
  },
  {
    team: "Juventus",
    rigore: ["Yildiz", "Locatelli", "Kolo Muani"],
    punizione: ["Yildiz", "Cambiaso", "Locatelli", "Koopmeiners"],
  },
  {
    team: "Lazio",
    // Nota: Goal.com elenca Gudmundsson come 2° rigorista della Lazio,
    // coerente con un possibile trasferimento non ancora riflesso nel
    // listone in uso — verificare la squadra attuale di Gudmundsson prima di
    // importare questa riga (rischio refuso della fonte, non confermato da
    // una seconda fonte).
    rigore: ["Zaccagni", "Gudmundsson A.", "Pinamonti"],
    punizione: ["Zaccagni", "Cataldi", "Taylor K.", "Rovella"],
  },
  {
    team: "Lecce",
    // Discordanza: Fantacalcio Online indica Stulic come 1° rigorista,
    // Goal.com indica Geubbels (nuovo arrivo, 7 rigori calciati e segnati in
    // carriera) — usata qui la gerarchia numerata di Goal.com.
    rigore: ["Geubbels", "Stulic"],
    punizione: ["Gallo", "Pierotti", "Berisha M."],
  },
  {
    team: "Milan",
    // Discordanza: Fantacalcio Online indica Pulisic come 1° rigorista,
    // Goal.com indica Ramos G. (score in carriera 11/13) — usata qui la
    // gerarchia numerata di Goal.com.
    rigore: ["Ramos G.", "Pulisic"],
    punizione: ["Modric", "Pulisic", "Jashari"],
  },
  {
    team: "Monza",
    rigore: ["Pessina", "Cutrone", "Petagna"],
    punizione: ["Colpani", "Pessina", "Ciurria"],
  },
  {
    team: "Napoli",
    rigore: ["De Bruyne", "Hojlund"],
    punizione: ["De Bruyne", "Politano", "Neres", "Lobotka"],
  },
  {
    team: "Parma",
    rigore: ["Tourè E.", "Bernabè"],
    punizione: ["Bernabè", "Nicolussi Caviglia", "Valeri", "Ordonez"],
  },
  {
    team: "Roma",
    rigore: ["Malen", "Dybala", "Soulè"],
    punizione: ["Dybala", "Soulè", "Pellegrini"],
  },
  {
    team: "Sassuolo",
    rigore: ["Berardi", "Esposito S."],
    punizione: ["Berardi", "Laurientè", "Volpato"],
  },
  {
    team: "Torino",
    rigore: ["Vlasic", "Zapata", "Simeone"],
    punizione: ["Vlasic", "Fitz-Jim", "Coco", "Oristanio"],
  },
  {
    team: "Udinese",
    rigore: ["Davis K.", "Solet", "Zaniolo"],
    punizione: ["Zaniolo", "Ekkelenkamp", "Vojvoda", "Miller"],
  },
  {
    team: "Venezia",
    rigore: ["Busio", "Adams A."],
    punizione: ["Busio", "Basic", "Perez K.", "Helgason", "Yeboah J."],
  },
];
