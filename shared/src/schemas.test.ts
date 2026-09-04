import { describe, expect, it } from "vitest";
import { updateProfileSchema, AVATAR_EMOJIS, AVATAR_COLORS } from "./avatar";
import { sendMessageSchema, inboxQuerySchema } from "./chat";
import {
  gkPairingEntrySchema,
  discardedGkPairingRowSchema,
  gkPairingImportReportSchema,
} from "./gkPairing";
import { createManagerSchema, managerSchema, OWNER_MANAGER_NAME } from "./manager";
import { playerSchema, playerImportReportSchema, discardedPlayerRowSchema } from "./player";
import {
  playerSeasonStatsRowSchema,
  playerSeasonStatsImportReportSchema,
  playerLatestSeasonStatsSchema,
  playerLatestSeasonStatsResponseSchema,
} from "./playerSeasonStats";
import {
  probableLineupEntrySchema,
  probableLineupConfirmEntrySchema,
  probableLineupConfirmRequestSchema,
  probableLineupImportReportSchema,
  PROBABLE_LINEUP_STATI,
} from "./probableLineup";
import {
  createPurchaseSchema,
  purchaseSchema,
  purchaseWithDetailsSchema,
  roleSlotStatusSchema,
  roleBudgetStatusSchema,
  managerAuctionStatusSchema,
} from "./purchase";
import { quotationRowSchema, quotationImportReportSchema } from "./quotation";
import { discardedReferenceRowSchema } from "./referenceImport";
import {
  rosterExportUnresolvedSchema,
  rosterExportResultSchema,
  discardedRosterRowSchema,
  rosterImportReportSchema,
} from "./rosterExchange";
import {
  setPieceTakerEntrySchema,
  setPieceTakerConfirmEntrySchema,
  setPieceTakerConfirmRequestSchema,
  setPieceTakerImportReportSchema,
  SET_PIECE_TAKER_TIPI,
} from "./setPieceTaker";
import { teamPrefSchema, teamPrefRecordSchema, TEAM_PREF_KINDS } from "./teamPref";
import { loginSchema, userSchema, USER_ROLES } from "./user";
import {
  addWishlistEntrySchema,
  updateWishlistEntrySchema,
  reorderWishlistSchema,
  wishlistEntrySchema,
  wishlistEntryWithPlayerSchema,
} from "./wishlist";
import { discardedExtractionRowSchema } from "./extraction";
import {
  providerEnrichmentSchema,
  playerStatsSchema,
  playerAttributesSchema,
  statsEnrichmentResponseSchema,
} from "./statsEnrichment";
import { z } from "zod";

describe("avatar", () => {
  it("accepts a whitelisted emoji + color and null", () => {
    expect(updateProfileSchema.parse({ avatar: AVATAR_EMOJIS[0], avatar_color: AVATAR_COLORS[0] })).toEqual({
      avatar: AVATAR_EMOJIS[0],
      avatar_color: AVATAR_COLORS[0],
    });
    expect(updateProfileSchema.parse({ avatar: null, avatar_color: null })).toEqual({
      avatar: null,
      avatar_color: null,
    });
  });
  it("rejects a value outside the whitelist", () => {
    expect(() => updateProfileSchema.parse({ avatar: "x", avatar_color: null })).toThrow();
  });
});

describe("chat", () => {
  it("sendMessageSchema trims and bounds the body", () => {
    expect(sendMessageSchema.parse({ to: 2, body: "  hi  " })).toEqual({ to: 2, body: "hi" });
    expect(() => sendMessageSchema.parse({ to: 2, body: "" })).toThrow();
    expect(() => sendMessageSchema.parse({ to: 0, body: "hi" })).toThrow();
    expect(() => sendMessageSchema.parse({ to: 2, body: "x".repeat(2001) })).toThrow();
  });
  it("inboxQuerySchema requires an ISO datetime", () => {
    expect(inboxQuerySchema.parse({ since: "2026-08-30T10:00:00.000Z" }).since).toContain("2026");
    expect(() => inboxQuerySchema.parse({ since: "2026-08-30" })).toThrow();
    expect(() => inboxQuerySchema.parse({ since: "" })).toThrow();
  });
});

describe("gkPairing", () => {
  it("parses entries, discarded rows and the report", () => {
    expect(gkPairingEntrySchema.parse({ teamA: "A", teamB: "B", score: 0 }).score).toBe(0);
    expect(() => gkPairingEntrySchema.parse({ teamA: "A", teamB: "B", score: -1 })).toThrow();
    discardedGkPairingRowSchema.parse({ row: 1, label: "x", reason: "y" });
    gkPairingImportReportSchema.parse({ teams: 2, pairs: 1, discarded: [] });
  });
});

describe("manager", () => {
  it("parses create + full manager", () => {
    expect(OWNER_MANAGER_NAME).toBe("Io");
    expect(createManagerSchema.parse({ name: "  Io  " }).name).toBe("Io");
    expect(() => createManagerSchema.parse({ name: "" })).toThrow();
    managerSchema.parse({ id: 1, league_id: 1, name: "Io", is_owner: true, user_id: null });
  });
});

describe("player", () => {
  it("parses player + import report", () => {
    playerSchema.parse({
      id: 1,
      fanta_id: null,
      sofifa_id: null,
      name: "X",
      nome_completo: null,
      team: "T",
      ruolo: "A",
      image_url: null,
    });
    playerSchema.parse({
      id: 1,
      fanta_id: 1,
      sofifa_id: null,
      name: "X",
      nome_completo: "Xavier Full",
      team: "T",
      ruolo: "A",
      image_url: null,
    });
    discardedPlayerRowSchema.parse({ row: 1, name: "X", team: "T", ruolo: "A", reason: "r" });
    playerImportReportSchema.parse({ inserted: 1, updated: 0, discarded: [], quotation: null });
    expect(() => playerSchema.parse({ id: 1, name: "X" })).toThrow();
  });
});

describe("playerSeasonStats", () => {
  it("parses the row, latest row, response array and report", () => {
    const row = {
      player_id: 1,
      season: "2024-25",
      presenze: 30,
      mv: 6,
      fm: 6.5,
      gf: 3,
      gs: null,
      assist: 2,
      rp: null,
      rc: null,
      rig_plus: null,
      rig_minus: null,
      amm: 1,
      esp: 0,
      autogol: 0,
    };
    playerSeasonStatsRowSchema.parse(row);
    playerSeasonStatsImportReportSchema.parse({ season: "2024-25", written: 1, discarded: [] });
    const latest = { player_id: 1, season: "2024-25", presenze: 30, mv: 6, fm: 6.5, gf: 3, assist: 2 };
    playerLatestSeasonStatsSchema.parse(latest);
    expect(playerLatestSeasonStatsResponseSchema.parse([latest])).toHaveLength(1);
  });
});

describe("probableLineup", () => {
  it("parses stati, entries and confirm shapes", () => {
    expect(PROBABLE_LINEUP_STATI).toContain("titolare");
    probableLineupEntrySchema.parse({ team: "T", player_name: "X", ruolo: null, stato: "titolare" });
    probableLineupConfirmEntrySchema.parse({ player_name: "X", ruolo: "A", stato: "panchina" });
    probableLineupConfirmRequestSchema.parse([{ player_name: "X", ruolo: null, stato: "ballottaggio" }]);
    probableLineupImportReportSchema.parse({ team: "T", entries: 0 });
    expect(() => probableLineupEntrySchema.parse({ team: "T", player_name: "X", ruolo: null, stato: "boh" })).toThrow();
  });
});

describe("purchase", () => {
  it("parses create, full, enriched, slot and manager status", () => {
    createPurchaseSchema.parse({ player_id: 1, manager_id: 1, prezzo: 0 });
    purchaseSchema.parse({ player_id: 1, manager_id: 1, prezzo: 10, league_id: 1, ts: "2026-01-01" });
    purchaseWithDetailsSchema.parse({
      player_id: 1,
      manager_id: 1,
      prezzo: 10,
      league_id: 1,
      ts: "2026-01-01",
      player_name: "X",
      player_team: "T",
      player_ruolo: "A",
      player_image_url: null,
      manager_name: "Io",
    });
    roleSlotStatusSchema.parse({ ruolo: "P", total: 3, used: 1, free: 2 });
    roleBudgetStatusSchema.parse({
      ruolo: "A",
      spent: 0,
      targetPercent: 48,
      targetCredits: 240,
      residuo: 240,
      state: "ok",
    });
    managerAuctionStatusSchema.parse({
      managerId: 1,
      managerName: "Io",
      isOwner: true,
      budget: 500,
      spent: 0,
      residuo: 500,
      slots: [{ ruolo: "P", total: 3, used: 0, free: 3 }],
      spentByRole: [
        { ruolo: "P", spent: 0, targetPercent: 8, targetCredits: 40, residuo: 40, state: "ok" },
      ],
      adjustedMaxBid: 498,
    });
    expect(() => createPurchaseSchema.parse({ player_id: 1, manager_id: 1, prezzo: -1 })).toThrow();
  });
});

describe("quotation", () => {
  it("parses row + report", () => {
    quotationRowSchema.parse({ player_id: 1, season: "2024-25", qt_i: 10, qt_a: 12, fvm: 20 });
    quotationRowSchema.parse({ player_id: 1, season: "2024-25", qt_i: null, qt_a: null, fvm: null });
    quotationImportReportSchema.parse({ season: "2024-25", written: 1, discarded: [] });
  });
});

describe("referenceImport / extraction", () => {
  it("parses discarded rows", () => {
    discardedReferenceRowSchema.parse({ row: 1, fanta_id: null, name: "X", team: "T", reason: "r" });
    discardedReferenceRowSchema.parse({ row: 1, fanta_id: "12", name: "X", team: "T", reason: "r" });
    discardedExtractionRowSchema.parse({ index: 0, reason: "unreadable" });
    expect(() => discardedExtractionRowSchema.parse({ index: -1, reason: "x" })).toThrow();
  });
});

describe("rosterExchange", () => {
  it("parses export + import shapes", () => {
    rosterExportUnresolvedSchema.parse({ managerName: "Io", playerId: 1, playerName: "X", reason: "r" });
    rosterExportResultSchema.parse({ csv: "a,b", rowCount: 1, unresolved: [] });
    discardedRosterRowSchema.parse({ row: 1, managerName: "Io", fantaId: "1", prezzo: "10", reason: "r" });
    rosterImportReportSchema.parse({ imported: 1, discarded: [], unknownManagers: [] });
  });
});

describe("setPieceTaker", () => {
  it("parses tipi, entries and confirm shapes", () => {
    expect(SET_PIECE_TAKER_TIPI).toContain("rigore");
    setPieceTakerEntrySchema.parse({ team: "T", tipo: "rigore", player_name: "X", rank: 1 });
    setPieceTakerConfirmEntrySchema.parse({ tipo: "punizione", player_name: "X", rank: 2 });
    setPieceTakerConfirmRequestSchema.parse([{ tipo: "corner", player_name: "X", rank: 1 }]);
    setPieceTakerImportReportSchema.parse({ team: "T", entries: 0 });
    expect(() => setPieceTakerEntrySchema.parse({ team: "T", tipo: "rigore", player_name: "X", rank: 0 })).toThrow();
  });
});

describe("teamPref", () => {
  it("parses input + record", () => {
    expect(TEAM_PREF_KINDS).toEqual(["prefer", "avoid"]);
    expect(teamPrefSchema.parse({ team: "  Inter ", kind: "avoid" }).team).toBe("Inter");
    teamPrefRecordSchema.parse({ team: "Inter", kind: "prefer", league_id: 1 });
    expect(() => teamPrefSchema.parse({ team: "", kind: "prefer" })).toThrow();
    expect(() => teamPrefSchema.parse({ team: "Inter", kind: "meh" })).toThrow();
  });
});

describe("user", () => {
  it("parses login + public user with/without role", () => {
    expect(USER_ROLES).toEqual(["member", "guest"]);
    expect(loginSchema.parse({ username: " a ", password: "p" }).username).toBe("a");
    userSchema.parse({ id: 1, username: "a", avatar: null, avatar_color: null });
    userSchema.parse({ id: 1, username: "a", avatar: null, avatar_color: null, role: "guest" });
    expect(() => loginSchema.parse({ username: "", password: "p" })).toThrow();
    expect(() => userSchema.parse({ id: 1, username: "a", avatar: null, avatar_color: null, role: "x" })).toThrow();
  });
});

describe("wishlist", () => {
  it("parses add, update, reorder and entry shapes", () => {
    addWishlistEntrySchema.parse({ player_id: 1 });
    updateWishlistEntrySchema.parse({ note: "  x  " });
    updateWishlistEntrySchema.parse({});
    reorderWishlistSchema.parse({ player_ids: [1, 2, 3] });
    wishlistEntrySchema.parse({ league_id: 1, player_id: 1, priority: null, note: null });
    wishlistEntryWithPlayerSchema.parse({
      league_id: 1,
      player_id: 1,
      priority: 1,
      note: null,
      name: "X",
      team: "T",
      ruolo: "C",
      image_url: null,
    });
    expect(() => reorderWishlistSchema.parse({ player_ids: [] })).toThrow();
  });
});

describe("statsEnrichment", () => {
  it("parses the item schemas and the full response envelope", () => {
    playerStatsSchema.parse({ player_id: 1, minutes: 900, goals: 5, assists: null });
    playerAttributesSchema.parse({ player_id: 1, overall: 80, potential: 85, age: 24, value: 1000 });
    const schema = providerEnrichmentSchema(z.object({ v: z.number() }));
    expect(schema.parse({ enabled: false, source: null, stats: [] }).stats).toEqual([]);
    statsEnrichmentResponseSchema.parse({
      performance: { enabled: true, source: "API-Football", stats: [] },
      attributes: { enabled: false, source: null, stats: [] },
    });
    expect(() => playerStatsSchema.parse({ player_id: 0, minutes: null, goals: null, assists: null })).toThrow();
  });
});
