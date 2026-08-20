// Seed statico dei rigoristi e tiratori da fermo, trascritto a mano dal PDF
// `docs/Rigoristi e tiratori da fermo Serie A.pdf` (screenshot della pagina
// "Rigoristi Serie A" di fantacalcio.it). Sostituisce l'estrazione via API
// Claude: la fonte è un'immagine, la lettura è stata fatta manualmente così il
// seed non dipende da un servizio esterno a pagamento.
//
// Mappatura sezioni del PDF sui `tipo` ammessi (rigore | punizione | corner):
//   "Rigori"        -> rigore
//   "Calci piazzati"-> punizione   (il PDF non distingue punizioni da corner)
// Il `rank` è dato dalla posizione nell'array (1-based). I nomi seguono la
// grafia del listone Fantacalcio; `team` combacia con le squadre in `player`.

export interface SeedTeamSetPieces {
  team: string;
  rigore: string[];
  punizione: string[];
}

export const SET_PIECE_TAKERS_SEED: SeedTeamSetPieces[] = [
  {
    team: "Atalanta",
    rigore: ["Scamacca", "Krstovic", "Samardzic"],
    punizione: ["De Ketelaere", "Samardzic", "Gaetano"],
  },
  {
    team: "Bologna",
    rigore: ["Orsolini", "Bernardeschi", "Dovbyk"],
    punizione: ["Orsolini", "Bernardeschi", "Miranda J."],
  },
  {
    team: "Cagliari",
    rigore: ["Kevin Carlos", "Maldini", "Mina"],
    punizione: ["Fazzini", "Maldini", "Winks"],
  },
  {
    team: "Como",
    rigore: ["Da Cunha", "Douvikas", "Paz N."],
    punizione: ["Paz N.", "Baturina", "Da Cunha"],
  },
  {
    team: "Fiorentina",
    rigore: ["Gudmundsson A.", "Kean", "Mandragora"],
    punizione: ["Gudmundsson A.", "Mastantuono", "Atta"],
  },
  {
    team: "Frosinone",
    rigore: ["Calò", "Schmid", "Grillitsch"],
    punizione: ["Calò", "Schmid", "Ghedjemis"],
  },
  {
    team: "Genoa",
    rigore: ["Colombo", "Ostigard", "Vitinha O."],
    punizione: ["Baldanzi", "Martin", "Vitinha O."],
  },
  {
    team: "Inter",
    rigore: ["Calhanoglu", "Zielinski", "Martinez L."],
    punizione: ["Calhanoglu", "Dimarco", "Zielinski"],
  },
  {
    team: "Juventus",
    rigore: ["Kolo Muani", "Yildiz", "Locatelli"],
    punizione: ["Yildiz", "Locatelli", "Cambiaso"],
  },
  {
    team: "Lazio",
    rigore: ["Zaccagni", "Taylor K.", "Cataldi"],
    punizione: ["Rovella", "Zaccagni", "Cataldi"],
  },
  {
    team: "Lecce",
    rigore: ["Geubbels", "Stulic", "Berisha M."],
    punizione: ["Pierotti", "Berisha M.", "Gandelman"],
  },
  {
    team: "Milan",
    rigore: ["Ramos G.", "Pulisic", "Modric"],
    punizione: ["Modric", "Pulisic", "Saelemaekers"],
  },
  {
    team: "Monza",
    rigore: ["Pessina", "Cutrone", "Petagna"],
    punizione: ["Pessina", "Colpani", "Mota"],
  },
  {
    team: "Napoli",
    rigore: ["De Bruyne", "Hojlund", "Politano"],
    punizione: ["De Bruyne", "Politano", "Neres"],
  },
  {
    team: "Parma",
    rigore: ["Pellegrino M.", "Tourè E.", "Valeri", "Bernabè"],
    punizione: ["Bernabè", "Nicolussi Caviglia", "Valeri"],
  },
  {
    team: "Roma",
    rigore: ["Malen", "Dybala", "Castro S."],
    punizione: ["Dybala", "Malen", "Soulè"],
  },
  {
    team: "Sassuolo",
    rigore: ["Berardi", "Pinamonti", "Laurientè"],
    punizione: ["Berardi", "Laurientè", "Adzic"],
  },
  {
    team: "Torino",
    rigore: ["Vlasic", "Kulenovic", "Simeone"],
    punizione: ["Vlasic", "Oristanio", "Gineitis"],
  },
  {
    team: "Udinese",
    rigore: ["Davis K.", "Solet", "Zaniolo"],
    punizione: ["Zaniolo", "Ekkelenkamp", "Unai Gomez"],
  },
  {
    team: "Venezia",
    rigore: ["Adams A.", "Rrahmani Al.", "Adorante"],
    punizione: ["Busio", "Yeboah J.", "Perez K."],
  },
];
