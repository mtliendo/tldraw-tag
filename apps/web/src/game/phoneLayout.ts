import { LANDSCAPE_BLOB_PX } from "@inkt/shared";

export { LANDSCAPE_BLOB_PX };

export const PHONE_LANDSCAPE_MAX_HEIGHT = 520;

export type PhoneLayout = {
  mobile: boolean;
  landscape: boolean;
  width: number;
  height: number;
};

export function isPhoneLandscape(width: number, height: number) {
  return width > height && height > 0 && height < PHONE_LANDSCAPE_MAX_HEIGHT;
}

export function isMobilePlay(width: number, height: number, coarse = false) {
  return coarse || Math.min(width, height) < 800 || (width < 1000 && height < 1000);
}

export function readPhoneLayout(
  width = typeof window === "undefined" ? 390 : window.innerWidth,
  height = typeof window === "undefined" ? 844 : window.innerHeight,
  coarse = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches,
): PhoneLayout {
  const mobile = isMobilePlay(width, height, coarse);
  return {
    mobile,
    landscape: mobile && isPhoneLandscape(width, height),
    width,
    height,
  };
}

/** Overlay power button is 100px plus dock safe-area padding. */
export const POWER_OVERLAY_PX = 100;
export const POWER_DOCK_PAD_PX = 12;
/** Half an on-screen token so the blob, not just its center, clears the button. */
export const POWER_BLOB_CLEAR_PX = 28;
export const POWER_CLEAR_PX = POWER_OVERLAY_PX + POWER_DOCK_PAD_PX + POWER_BLOB_CLEAR_PX;

/** Keep the follow camera focused in the gap between overlay HUD and the power button. */
export function landscapeFollowPad(width: number, height: number) {
  const hud = Math.min(56, Math.max(44, height * 0.14));
  const bottom = Math.min(28, Math.max(12, height * 0.05));
  return { left: 16, right: POWER_CLEAR_PX, top: hud, bottom };
}

export function portraitFollowPad(_width: number, _height: number) {
  return { left: 0, right: POWER_CLEAR_PX, top: 0, bottom: POWER_CLEAR_PX };
}
