import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { AVATARS, assignedCritterLine, avatarById, avatarTintIndex, resolveAvatarId } from "./avatars";

describe("avatars", () => {
  it("has 13 Direction A critters", () => {
    assert.equal(AVATARS.length, 13);
    assert.deepEqual(
      AVATARS.map((a) => a.id),
      [
        "otter",
        "cat",
        "frog",
        "bunny",
        "bear",
        "fox",
        "penguin",
        "axolotl",
        "ghosty",
        "duck",
        "dino",
        "octopus",
        "buddy",
      ],
    );
  });

  it("maps legacy doodle ids onto the new cast", () => {
    assert.equal(resolveAvatarId("bolt"), "otter");
    assert.equal(resolveAvatarId("orb"), "frog");
    assert.equal(avatarById("star").id, "bear");
    assert.equal(resolveAvatarId("not-a-critter"), "otter");
  });

  it("tints extra copies of the same critter", () => {
    const players = [
      { id: "a", avatar: "otter" },
      { id: "b", avatar: "frog" },
      { id: "c", avatar: "bolt" },
      { id: "d", avatar: "otter" },
    ];
    assert.equal(avatarTintIndex(players, "a", "otter"), 0);
    assert.equal(avatarTintIndex(players, "c", "bolt"), 1);
    assert.equal(avatarTintIndex(players, "d", "otter"), 2);
    assert.equal(avatarTintIndex(players, "b", "frog"), 0);
  });

  it("names the assigned critter", () => {
    assert.equal(assignedCritterLine("otter"), "You're the otter!");
    assert.equal(assignedCritterLine("bolt"), "You're the otter!");
  });
});
