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

/** Keep the follow camera focused in the gap between overlay HUD and the power button. */
export function landscapeFollowPad(width: number, height: number) {
  const hud = Math.min(56, Math.max(44, height * 0.14));
  const power = Math.min(120, Math.max(88, Math.min(width, height) * 0.24));
  const bottom = Math.min(28, Math.max(12, height * 0.05));
  return { left: 16, right: power, top: hud, bottom };
}

export function portraitFollowPad(width: number, height: number) {
  const power = Math.min(112, Math.max(80, width * 0.26));
  return { left: 0, right: Math.round(power * 0.4), top: 0, bottom: Math.round(power * 0.45) };
}
