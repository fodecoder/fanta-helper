import { describe, expect, it } from "vitest";
import { mergeManualTrapTags, type PlayerTag } from "./playerTags";

function row(player_id: number, tags: PlayerTag[]) {
  return { player_id, name: `P${player_id}`, tags };
}

const trappola: PlayerTag = { id: "trappola", label: "Trappola" };
const rigorista: PlayerTag = { id: "rigorista", label: "Rigorista" };

function ids(tags: PlayerTag[]): string[] {
  return tags.map((t) => t.id);
}

describe("mergeManualTrapTags", () => {
  it("adds the trappola tag to a manually flagged player without it", () => {
    const out = mergeManualTrapTags([row(1, [])], [1]);

    expect(ids(out[0]!.tags)).toEqual(["trappola"]);
  });

  it("does not duplicate the tag when the model already derived it", () => {
    const out = mergeManualTrapTags([row(1, [rigorista, trappola])], [1]);

    expect(ids(out[0]!.tags)).toEqual(["rigorista", "trappola"]);
  });

  it("keeps the other tags when adding trappola to a flagged player (additive, not substitutive)", () => {
    const out = mergeManualTrapTags([row(1, [rigorista])], [1]);

    expect(ids(out[0]!.tags)).toEqual(["rigorista", "trappola"]);
  });

  it("leaves unflagged players untouched", () => {
    const input = [row(1, [rigorista]), row(2, [])];
    const out = mergeManualTrapTags(input, [1]);

    expect(out[1]).toBe(input[1]);
    expect(ids(out[1]!.tags)).toEqual([]);
  });
});
