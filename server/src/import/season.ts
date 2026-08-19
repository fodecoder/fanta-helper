// Matches "..._2025_26.xlsx" -> "2025-26". Anchored to end-of-string so it
// also filters out the stats files' _Italia/_Statistico variants, whose
// filenames don't end in "_AAAA_AA.xlsx" — the season is derived from the
// filename, never guessed from file content.
const SEASON_FILENAME_PATTERN = /_(\d{4})_(\d{2})\.xlsx$/i;

export function parseSeasonFromFilename(filename: string): string | null {
  const match = SEASON_FILENAME_PATTERN.exec(filename);
  return match ? `${match[1]}-${match[2]}` : null;
}
