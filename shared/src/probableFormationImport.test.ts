import { describe, expect, it } from "vitest";
import {
  probableFormationImportInputSchema,
  probableFormationTeamInputSchema,
  normalizeProbableFormationInput,
  toProbableLineupEntries,
  toSetPieceTakerEntries,
} from "./probableFormationImport";

const atalanta = {
  team: "Atalanta",
  titolari: [
    { player_name: "Carnesecchi", ruolo: "P" },
    { player_name: "Toloi", ruolo: "D" },
  ],
  ballottaggi: [{ ruolo: "D", opzioni: ["Bernasconi", "Kolasinac"] }],
  rigoristi: ["Kessié", "Scamacca", "Krstovic"],
  punizioni: ["Gaetano", "Samardzic"],
};

describe("probableFormationImport", () => {
  it("accetta sia una singola squadra sia un array di squadre", () => {
    expect(probableFormationImportInputSchema.parse(atalanta)).toEqual(atalanta);
    expect(probableFormationImportInputSchema.parse([atalanta])).toEqual([atalanta]);
  });

  it("normalizza sempre a un array", () => {
    expect(normalizeProbableFormationInput(atalanta)).toEqual([atalanta]);
    expect(normalizeProbableFormationInput([atalanta])).toEqual([atalanta]);
  });

  it("richiede almeno due opzioni per ogni ballottaggio", () => {
    expect(() =>
      probableFormationImportInputSchema.parse({ ...atalanta, ballottaggi: [{ opzioni: ["Solo"] }] }),
    ).toThrow();
  });

  it("applica i default alle sezioni assenti", () => {
    const minimal = probableFormationImportInputSchema.parse({ team: "Como" });
    expect(minimal).toEqual({ team: "Como", titolari: [], ballottaggi: [], rigoristi: [], punizioni: [] });
  });

  it("trasforma titolari e ballottaggi in righe probable_lineup", () => {
    const entries = toProbableLineupEntries(atalanta);
    expect(entries).toEqual([
      { player_name: "Carnesecchi", ruolo: "P", stato: "titolare" },
      { player_name: "Toloi", ruolo: "D", stato: "titolare" },
      { player_name: "Bernasconi", ruolo: "D", stato: "ballottaggio" },
      { player_name: "Kolasinac", ruolo: "D", stato: "ballottaggio" },
    ]);
  });

  it("trasforma rigoristi e punizioni in righe set_piece_taker con rank in ordine", () => {
    const entries = toSetPieceTakerEntries(atalanta);
    expect(entries).toEqual([
      { tipo: "rigore", player_name: "Kessié", rank: 1 },
      { tipo: "rigore", player_name: "Scamacca", rank: 2 },
      { tipo: "rigore", player_name: "Krstovic", rank: 3 },
      { tipo: "punizione", player_name: "Gaetano", rank: 1 },
      { tipo: "punizione", player_name: "Samardzic", rank: 2 },
    ]);
  });

  it("ruolo null quando assente", () => {
    const input = probableFormationTeamInputSchema.parse({
      team: "Como",
      titolari: [{ player_name: "Butez" }],
    });
    expect(toProbableLineupEntries(input)).toEqual([
      { player_name: "Butez", ruolo: null, stato: "titolare" },
    ]);
  });
});
