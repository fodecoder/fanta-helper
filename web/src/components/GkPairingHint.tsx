import type { GkPairingSuggestion } from "../lib/auctionDerivations";

interface GkPairingHintProps {
  suggestion: GkPairingSuggestion | null;
  onFilterTeam?: (team: string) => void;
  className?: string;
}

export function GkPairingHint({ suggestion, onFilterTeam, className }: GkPairingHintProps) {
  if (!suggestion) return null;

  return (
    <p className={`gk-pairing-hint${className ? ` ${className}` : ""}`} role="note">
      Coppia portieri: dopo {suggestion.referenceTeam}, punta su{" "}
      {onFilterTeam ? (
        <button
          type="button"
          className="gk-pairing-hint-team"
          onClick={() => onFilterTeam(suggestion.team)}
        >
          {suggestion.team}
        </button>
      ) : (
        <strong>{suggestion.team}</strong>
      )}{" "}
      — accoppiata più favorevole ancora libera.
    </p>
  );
}
