import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AVATARS,
  assignedCritterLine,
  avatarById,
  avatarTintColor,
  avatarTintIndex,
  playerTint,
  resolveAvatarId,
} from "./avatars";

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

  it("keeps join-order tint when the leaderboard is score-sorted", () => {
    const seated = [
      { id: "pixel", avatar: "buddy" },
      { id: "otto", avatar: "buddy" },
    ];
    const rows = [
      { id: "otto", avatar: "buddy", tint: 1 },
      { id: "pixel", avatar: "buddy", tint: 0 },
    ];
    assert.equal(avatarTintIndex(seated, "otto", "buddy"), 1);
    assert.equal(avatarTintIndex(rows, "otto", "buddy"), 0);
    assert.equal(playerTint(rows[0], seated), 1);
    assert.equal(playerTint({ id: "otto", avatar: "buddy" }, seated), 1);
    assert.notEqual(avatarTintColor("buddy", 1).toLowerCase(), avatarById("buddy").color.toLowerCase());
  });

  it("names the assigned critter", () => {
    assert.equal(assignedCritterLine("otter"), "You're the otter!");
    assert.equal(assignedCritterLine("bolt"), "You're the otter!");
  });
});
