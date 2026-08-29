import { afterEach, describe, expect, it, vi } from "vitest";
import { getStatsEnrichment } from "./statsEnrichment";
import { getLatestPlayerSeasonStats } from "./playerSeasonStats";

function mockOkJson(body: unknown) {
  return vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  } as Response);
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

// Regressione: con VITE_API_URL relativo ("/api") `new URL(baseUrl())` lanciava
// "Invalid URL". Gli helper devono costruire la query a stringa.
describe("stats API URL building with a relative VITE_API_URL", () => {
  it("getStatsEnrichment builds /api/players/stats-enrichment?ids=... without throwing", async () => {
    vi.stubEnv("VITE_API_URL", "/api");
    const fetchMock = mockOkJson({ performance: { enabled: false, source: null, stats: [] }, attributes: { enabled: false, source: null, stats: [] } });
    vi.stubGlobal("fetch", fetchMock);

    await expect(getStatsEnrichment([1, 2])).resolves.toBeDefined();

    const calledWith = String(fetchMock.mock.calls[0]![0]);
    expect(calledWith).toBe("/api/players/stats-enrichment?ids=1%2C2");
    expect(fetchMock.mock.calls[0]![1]).toMatchObject({ credentials: "include" });
  });

  it("getLatestPlayerSeasonStats builds /api/players/season-stats?ids=... without throwing", async () => {
    vi.stubEnv("VITE_API_URL", "/api");
    const fetchMock = mockOkJson([]);
    vi.stubGlobal("fetch", fetchMock);

    await expect(getLatestPlayerSeasonStats([3])).resolves.toEqual([]);
    expect(String(fetchMock.mock.calls[0]![0])).toBe("/api/players/season-stats?ids=3");
  });

  it("still works with an absolute base", async () => {
    vi.stubEnv("VITE_API_URL", "http://api.example.test");
    const fetchMock = mockOkJson([]);
    vi.stubGlobal("fetch", fetchMock);

    await getLatestPlayerSeasonStats([5, 6]);
    expect(String(fetchMock.mock.calls[0]![0])).toBe(
      "http://api.example.test/players/season-stats?ids=5%2C6",
    );
  });
});
