import { useEffect, useState } from "react";

// Tenere in sync con i letterali `@media (max-width: 768px)` in index.css:
// le custom property CSS non sono leggibili dentro una condizione @media.
export const MOBILE_BREAKPOINT_PX = 768;
export const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT_PX}px)`;

// Segue una media query e ri-renderizza al cambio. Usata per scegliere il
// layout asta desktop vs telefono.
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() =>
    typeof window !== "undefined" ? window.matchMedia(query).matches : false,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setMatches(mql.matches);
    onChange();
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return matches;
}
