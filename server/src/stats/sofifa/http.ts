// api.sofifa.net is whitelist-only behind Cloudflare: non-whitelisted callers
// 403 regardless of headers. These browser-like headers won't grant access on
// their own — they're just a polite, consistent identity for the day the caller
// is whitelisted. Shared by the runtime client and the sofifa_id seed.
export const SOFIFA_REQUEST_HEADERS: Record<string, string> = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9,it;q=0.8",
  Referer: "https://sofifa.com/",
};
