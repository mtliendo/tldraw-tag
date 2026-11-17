import { AVATAR_TINT_STEP, IT_ORANGE, type AvatarState } from "@inkt/shared";

export { IT_ORANGE };
export const IT_FLAME_SRC = "/avatars/A/it-flame.svg";
export const IT_CROWN_SRC = "/avatars/A/it-crown.svg";

export type CritterFlags = {
  isIt?: boolean;
  ghost?: boolean;
  frozen?: boolean;
  hasShield?: boolean;
  stunned?: boolean;
  vx?: number;
  vy?: number;
};

const MOVE_EPS = 14;

/** CSS filter for repeat copies. Never apply this to IT flame/crown. */
export function avatarTintFilter(tint: number): string | undefined {
  if (!(tint > 0)) return undefined;
  return `hue-rotate(${Math.floor(tint) * AVATAR_TINT_STEP}deg) saturate(1.08)`;
}

export function showsItChrome(flags: { isIt?: boolean; frozen?: boolean }): boolean {
  return Boolean(flags.isIt) && !flags.frozen;
}

/** Body pose for the tintable sprite. IT uses idle/run plus an untinted overlay. */
export function critterBodyState(flags: CritterFlags, runFrame: 0 | 1 = 0): AvatarState {
  if (flags.frozen) return "frozen";
  if (flags.ghost) return "ghost";
  if (flags.hasShield) return "shield";
  if (flags.stunned) return "stunned";
  const moving = Math.hypot(flags.vx ?? 0, flags.vy ?? 0) > MOVE_EPS;
  if (moving) return runFrame === 0 ? "run1" : "run2";
  return "idle";
}

export function critterState(flags: CritterFlags, runFrame: 0 | 1 = 0): AvatarState {
  if (flags.frozen) return "frozen";
  if (flags.isIt) return "it";
  return critterBodyState(flags, runFrame);
}
