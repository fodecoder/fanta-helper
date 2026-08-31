import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type {
  GkPairingEntry,
  ManagerAuctionStatus,
  Player,
  ValuationWithPlayer,
} from "@fanta-helper/shared";
import {
  deltaColor,
  formatDelta,
  gkPairingSuggestionFor,
  impact,
  ladderModel,
  lineupStatusFor,
  rankSameRole,
  roleColor,
  setPieceRanksFor,
  verdict,
} from "./auctionDerivations";

function player(id: number, name: string, ruolo: Player["ruolo"], team = "Team"): Player {
  return { id, fanta_id: id, sofifa_id: null, name, team, ruolo, image_url: null };
}

function val(overrides: Partial<ValuationWithPlayer> = {}): ValuationWithPlayer {
  return {
    league_id: 1,
    player_id: 1,
    name: "X",
    team: "T",
    ruolo: "A",
    image_url: null,
    target: 10,
    fair_value: 20,
    max_bid: 30,
    panic_price: 40,
    confidence: "media",
    tier: "Solido",
    override: null,
    ...overrides,
  } as ValuationWithPlayer;
}

function status(overrides: Partial<ManagerAuctionStatus> = {}): ManagerAuctionStatus {
  return {
    managerId: 1,
    managerName: "Io",
    isOwner: true,
    budget: 500,
    spent: 0,
    residuo: 500,
    adjustedMaxBid: 100,
    slots: [
      { ruolo: "P", total: 3, used: 0, free: 3 },
      { ruolo: "A", total: 6, used: 0, free: 6 },
    ],
    ...overrides,
  };
}

describe("roleColor", () => {
  it("maps a role to its CSS custom property", () => {
    expect(roleColor("P")).toBe("var(--role-p)");
    expect(roleColor("A")).toBe("var(--role-a)");
  });

  it("ties each --role-* var to the expected color in index.css (P giallo, D blu, C verde, A rosso)", () => {
    // Guards against a silent palette rename/edit in index.css: this asserts
    // the actual hex values, not just the var names above.
    const css = readFileSync(join(import.meta.dirname, "../index.css"), "utf-8");

    expect(css).toContain("--color-process-yellow: #edbb00;");
    expect(css).toContain("--color-role-blue: #144f89;");
    expect(css).toContain("--color-role-green: #077449;");
    expect(css).toContain("--color-role-red: #c0392b;");

    expect(css).toContain("--role-p: var(--color-process-yellow);");
    expect(css).toContain("--role-d: var(--color-role-blue);");
    expect(css).toContain("--role-c: var(--color-role-green);");
    expect(css).toContain("--role-a: var(--color-role-red);");
  });
});

describe("deltaColor / formatDelta", () => {
  it("colors and signs a positive delta as a premium and a non-positive as good", () => {
    expect(deltaColor(3)).toBe("var(--color-accent-2-700)");
    expect(deltaColor(-1)).toBe("var(--color-accent-700)");
    expect(deltaColor(0)).toBe("var(--color-accent-700)");
    expect(formatDelta(3)).toBe("+3");
    expect(formatDelta(0)).toBe("0");
    expect(formatDelta(-2)).toBe("-2");
  });
});

describe("verdict", () => {
  it("waits without a price or a valuation", () => {
    expect(verdict(null, val()).text).toBe("In attesa del prezzo");
    expect(verdict(10, undefined).text).toBe("In attesa del prezzo");
  });
  it("climbs the threshold ladder", () => {
    const v = val({ target: 10, fair_value: 20, max_bid: 30, panic_price: 40 });
    expect(verdict(8, v).text).toBe("Affare");
    expect(verdict(15, v).text).toBe("Prezzo giusto");
    expect(verdict(25, v).text).toBe("Sopra il fair value");
    expect(verdict(35, v).text).toBe("Zona panic");
    expect(verdict(45, v).text).toBe("Fuori mercato");
  });
});

describe("ladderModel", () => {
  it("returns null without a valuation", () => {
    expect(ladderModel(undefined, 10)).toBeNull();
  });
  it("places ticks in 0..100 and a marker only when a price is given", () => {
    const m = ladderModel(val({ target: 10, fair_value: 20, max_bid: 30, panic_price: 40 }), 25)!;
    for (const t of m.ticks) {
      expect(t.pct).toBeGreaterThanOrEqual(0);
      expect(t.pct).toBeLessThanOrEqual(100);
    }
    expect(m.ticks.map((t) => t.label)).toEqual(["Target", "Fair value", "Max bid", "Panic"]);
    expect(m.markerPct).not.toBeNull();
    expect(ladderModel(val(), null)!.markerPct).toBeNull();
    expect(m.fvZone.width).toBeGreaterThan(0);
  });
});

describe("impact", () => {
  it("is empty without a price or status", () => {
    expect(impact(null, status(), "A").text).toBe("");
    expect(impact(10, undefined, "A").text).toBe("");
  });
  it("warns above the adjusted max bid", () => {
    expect(impact(150, status({ adjustedMaxBid: 100 }), "A").color).toBe("var(--color-accent-2-700)");
  });
  it("warns when the role slots are full", () => {
    const s = status({ slots: [{ ruolo: "A", total: 2, used: 2, free: 0 }], adjustedMaxBid: 100 });
    expect(impact(10, s, "A").text).toContain("già pieni");
  });
  it("otherwise reports the leftover budget per remaining slot", () => {
    const s = status({ residuo: 100, adjustedMaxBid: 100, slots: [{ ruolo: "A", total: 3, used: 0, free: 3 }] });
    expect(impact(10, s, "A").text).toContain("90 crediti per 2 slot");
  });
});

describe("lineupStatusFor / setPieceRanksFor", () => {
  it("matches by normalized name+team, else null / empty", () => {
    const rows = [{ team: "Inter", player_name: "Lautaro Martinez", ruolo: null, stato: "titolare" as const }];
    expect(lineupStatusFor({ name: "Lautaro Martínez", team: "Inter" }, rows)).toBe("titolare");
    expect(lineupStatusFor({ name: "Altro", team: "Inter" }, rows)).toBeNull();
    expect(lineupStatusFor({ name: "x", team: "y" }, null)).toBeNull();
    const takers = [
      { team: "Inter", tipo: "rigore" as const, player_name: "Calhanoglu", rank: 1 },
      { team: "Milan", tipo: "rigore" as const, player_name: "Pulisic", rank: 1 },
    ];
    expect(setPieceRanksFor({ name: "Calhanoglu", team: "Inter" }, takers)).toHaveLength(1);
    expect(setPieceRanksFor({ name: "x", team: "y" }, null)).toEqual([]);
  });
});

describe("gkPairingSuggestionFor", () => {
  const pairing: GkPairingEntry[] = [
    { teamA: "Inter", teamB: "Como", score: 1 },
    { teamA: "Inter", teamB: "Lecce", score: 5 },
    { teamA: "Roma", teamB: "Inter", score: 3 },
  ];
  it("returns null without an owned goalkeeper", () => {
    expect(gkPairingSuggestionFor([], pairing, () => true)).toBeNull();
  });
  it("picks the lowest-score partner that still has a free goalkeeper", () => {
    const s = gkPairingSuggestionFor(["Inter"], pairing, (t) => t !== "Como");
    expect(s).toEqual({ referenceTeam: "Inter", team: "Roma", score: 3 });
  });
  it("uses the last owned team as reference and skips owned partners", () => {
    // reference = "Inter" (ultimo); "Como" è posseduto → si passa a "Roma"
    const s = gkPairingSuggestionFor(["Como", "Inter"], pairing, () => true);
    expect(s?.team).toBe("Roma");
  });
  it("returns null when no partner has a free goalkeeper", () => {
    expect(gkPairingSuggestionFor(["Inter"], pairing, () => false)).toBeNull();
  });
});

describe("rankSameRole", () => {
  it("filters to the role, drops purchased, sorts by value desc then name, nulls last", () => {
    const players = [
      player(1, "Bravo", "A"),
      player(2, "Alpha", "A"),
      player(3, "Preso", "A"),
      player(4, "Difensore", "D"),
      player(5, "SenzaValore", "A"),
    ];
    const values: Record<number, number | null> = { 1: 10, 2: 10, 3: 99, 5: null };
    const rows = rankSameRole(players, [], new Set([3]), "A", (id) => values[id] ?? null);
    expect(rows.map((r) => r.player.id)).toEqual([2, 1, 5]);
  });
  it("handles a large pool quickly (stress)", () => {
    const players = Array.from({ length: 500 }, (_, i) => player(i + 1, `P${i + 1}`, "C"));
    const t0 = performance.now();
    const rows = rankSameRole(players, [], new Set(), "C", (id) => id % 7);
    expect(rows).toHaveLength(500);
    expect(performance.now() - t0).toBeLessThan(200);
  });
});
