import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isPhoneLandscape,
  landscapeFollowPad,
  readPhoneLayout,
  LANDSCAPE_BLOB_PX,
} from "./phoneLayout";

describe("phone landscape", () => {
  it("treats iPhone and Android landscape as phone landscape", () => {
    assert.equal(isPhoneLandscape(844, 390), true);
    assert.equal(isPhoneLandscape(915, 412), true);
    assert.equal(readPhoneLayout(844, 390, true).landscape, true);
    assert.equal(readPhoneLayout(915, 412, true).landscape, true);
  });

  it("leaves portrait phones and tablets alone", () => {
    assert.equal(isPhoneLandscape(390, 844), false);
    assert.equal(readPhoneLayout(390, 844, true).landscape, false);
    assert.equal(readPhoneLayout(390, 844, true).mobile, true);
    assert.equal(isPhoneLandscape(1180, 820), false);
    assert.equal(readPhoneLayout(1180, 820, false).landscape, false);
  });

  it("keeps overlay pads inside a landscape frame", () => {
    const pad = landscapeFollowPad(844, 390);
    assert.ok(pad.left + pad.right < 844 * 0.4);
    assert.ok(pad.top + pad.bottom < 390 * 0.35);
    assert.ok(LANDSCAPE_BLOB_PX >= 32);
  });
});
