import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { AVATAR_TINT_STEP, IT_ORANGE } from "@inkt/shared";
import {
  IT_CROWN_SRC,
  IT_FLAME_SRC,
  avatarTintFilter,
  critterBodyState,
  critterState,
  showsItChrome,
} from "./critterArt";

const publicDir = join(dirname(fileURLToPath(import.meta.url)), "../../public");

describe("IT chrome", () => {
  it("never hue-rotates the flame or crown overlay", () => {
    assert.equal(IT_ORANGE.toLowerCase(), "#e8542f");
    assert.equal(IT_FLAME_SRC, "/avatars/A/it-flame.svg");
    assert.equal(IT_CROWN_SRC, "/avatars/A/it-crown.svg");
    assert.equal(avatarTintFilter(0), undefined);
    assert.equal(avatarTintFilter(1), `hue-rotate(${AVATAR_TINT_STEP}deg) saturate(1.08)`);
    assert.equal(showsItChrome({ isIt: true }), true);
    assert.equal(showsItChrome({ isIt: true, frozen: true }), false);
    assert.equal(showsItChrome({ isIt: false }), false);
    assert.equal(critterState({ isIt: true }, 0), "it");
    assert.equal(critterBodyState({ isIt: true, vx: 0, vy: 0 }, 0), "idle");
    assert.equal(critterBodyState({ isIt: true, ghost: true }, 0), "ghost");
    assert.equal(critterBodyState({ isIt: true, hasShield: true }, 0), "shield");
    assert.notEqual(critterBodyState({ isIt: true }, 0), "it");
  });

  it("bakes Direction A orange into the shared flame and crown assets", () => {
    const flame = readFileSync(join(publicDir, IT_FLAME_SRC), "utf8");
    const crown = readFileSync(join(publicDir, IT_CROWN_SRC), "utf8");
    assert.match(flame, /#E8542F/i);
    assert.match(crown, /#E8542F/i);
    assert.doesNotMatch(flame, /hue-rotate|filter:/i);
    assert.doesNotMatch(crown, /hue-rotate|filter:/i);
    assert.doesNotMatch(crown, /#F4B63F/i);
  });
});
