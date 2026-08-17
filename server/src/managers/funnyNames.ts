const FUNNY_NAMES = [
  "Real Sconcerti",
  "Atletico Divano",
  "Panchina Rossi",
  "Borussia Sciacalli",
  "Zona Cesarini FC",
  "Gli Svincolati",
  "Autogol United",
  "Fanta o Fantòcci",
  "Malus Maximus",
  "Bomber di Riserva",
  "Rigore a Vuoto",
  "I Melina Boys",
  "Catenaccio & Bunker",
  "Tridente Spuntato",
  "Fuorigioco Attivo",
  "Ammoniti Anonimi",
  "Contropiede Lento",
  "Difesa Groviera",
  "Cucchiaio Totti",
  "VAR Che Vuoi",
  "Palo Interno",
  "Traversa Maledetta",
  "Modulo Impossibile",
  "Sarrismo Militante",
  "Il Biscotto FC",
  "Rimonta Impossibile",
  "Sciagura United",
  "Papera Reale",
  "Cartellino Facile",
  "Panenka Brothers",
  "Zeru Tituli",
  "Melma Calcistica",
  "Tackle Assassino",
  "Retropassaggio Fatale",
  "Assist della Domenica",
  "Fantallenatori Depressi",
  "Deep Football",
  "Squadra Materasso",
  "Gregari United",
  "Ultimo in Classifica",
];

// Ritorna `count` nomi divertenti unici. Se ne servono più della lista, i
// nomi in eccesso ricevono un suffisso numerico per restare unici.
export function pickFunnyNames(count: number): string[] {
  if (count <= 0) return [];
  const shuffled = [...FUNNY_NAMES].sort(() => Math.random() - 0.5);
  const names: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const base = shuffled[i % shuffled.length]!;
    names.push(i < shuffled.length ? base : `${base} ${Math.floor(i / shuffled.length) + 1}`);
  }
  return names;
}
