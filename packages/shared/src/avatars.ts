export type AvatarState = "idle" | "run1" | "run2" | "it" | "stunned" | "ghost" | "shield" | "frozen";

export type AvatarDef = {
  id: string;
  label: string;
  color: string;
  accent: string;
};

/** Direction A critter cast. Body fills are the minimap / tint keys. */
export const AVATARS: AvatarDef[] = [
  { id: "otter", label: "Otter", color: "#A9754F", accent: "#F3DCC2" },
  { id: "cat", label: "Cat", color: "#9EA7BA", accent: "#F6C3CF" },
  { id: "frog", label: "Frog", color: "#6CC46B", accent: "#D2F0A8" },
  { id: "bunny", label: "Bunny", color: "#F6F1EA", accent: "#F7B5C6" },
  { id: "bear", label: "Bear", color: "#C68A55", accent: "#EFD0A6" },
  { id: "fox", label: "Fox", color: "#F28A3C", accent: "#FFF4E6" },
  { id: "penguin", label: "Penguin", color: "#33405F", accent: "#FFFFFF" },
  { id: "axolotl", label: "Axolotl", color: "#F8AFCB", accent: "#FFD9E6" },
  { id: "ghosty", label: "Ghosty", color: "#EEF0FB", accent: "#D7DBF2" },
  { id: "duck", label: "Duck", color: "#FFD43B", accent: "#FF9F1C" },
  { id: "dino", label: "Dino", color: "#5CC59A", accent: "#D6F2C6" },
  { id: "octopus", label: "Octopus", color: "#A78BFA", accent: "#D4C6FF" },
  { id: "buddy", label: "Blob buddy", color: "#4FC3D9", accent: "#BDF0F7" },
];

const LEGACY: Record<string, string> = {
  bolt: "otter",
  orb: "frog",
  bot: "buddy",
  bird: "duck",
  gem: "dino",
  shark: "octopus",
  star: "bear",
  leaf: "penguin",
};

export const AVATAR_STATES: AvatarState[] = [
  "idle",
  "run1",
  "run2",
  "it",
  "stunned",
  "ghost",
  "shield",
  "frozen",
];

export function resolveAvatarId(id: string | undefined | null): string {
  if (!id) return AVATARS[0].id;
  if (LEGACY[id]) return LEGACY[id];
  if (AVATARS.some((a) => a.id === id)) return id;
  return AVATARS[0].id;
}

export function avatarById(id: string | undefined | null): AvatarDef {
  const resolved = resolveAvatarId(id);
  return AVATARS.find((a) => a.id === resolved) ?? AVATARS[0];
}

/** 0 for the first copy of a critter, 1+ for repeats (hue-rotate steps). */
export function avatarTintIndex(
  players: { id: string; avatar: string }[],
  playerId: string,
  avatar: string,
): number {
  const key = resolveAvatarId(avatar);
  const same = players.filter((p) => resolveAvatarId(p.avatar) === key);
  const idx = same.findIndex((p) => p.id === playerId);
  return Math.max(0, idx);
}

/**
 * Prefer the join-time `tint` on the player/row. Fall back to join-order
 * `roster` (never a score-sorted leaderboard) so repeats keep the same hue
 * on the joystick, IT chip, lobby card, minimap, and end list.
 */
export function playerTint(
  player: { id: string; avatar: string; tint?: number | null },
  roster: { id: string; avatar: string }[] = [],
): number {
  if (typeof player.tint === "number" && Number.isFinite(player.tint) && player.tint > 0) {
    return Math.floor(player.tint);
  }
  if (roster.length) return avatarTintIndex(roster, player.id, player.avatar);
  return Math.max(0, Math.floor(player.tint ?? 0));
}

/** Hue-rotate degrees per extra copy of the same critter. */
export const AVATAR_TINT_STEP = 52;

function clampByte(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

/** CSS `hue-rotate` + optional saturate, for minimap dots and other fills. */
export function hueRotateHex(hex: string, degrees: number, saturate = 1): string {
  const raw = hex.replace("#", "");
  if (raw.length < 6) return hex;
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const a = (degrees * Math.PI) / 180;
  const c = Math.cos(a);
  const s = Math.sin(a);
  let nr =
    (0.213 + c * 0.787 - s * 0.213) * r +
    (0.715 - c * 0.715 - s * 0.715) * g +
    (0.072 - c * 0.072 + s * 0.928) * b;
  let ng =
    (0.213 - c * 0.213 + s * 0.143) * r +
    (0.715 + c * 0.285 + s * 0.14) * g +
    (0.072 - c * 0.072 - s * 0.283) * b;
  let nb =
    (0.213 - c * 0.213 - s * 0.787) * r +
    (0.715 - c * 0.715 + s * 0.715) * g +
    (0.072 + c * 0.928 + s * 0.072) * b;
  if (saturate !== 1) {
    const l = 0.213 * nr + 0.715 * ng + 0.072 * nb;
    nr = l + (nr - l) * saturate;
    ng = l + (ng - l) * saturate;
    nb = l + (nb - l) * saturate;
  }
  return `#${[nr, ng, nb].map((v) => clampByte(v).toString(16).padStart(2, "0")).join("")}`;
}

export function avatarTintColor(avatar: string, tint = 0): string {
  const base = avatarById(avatar).color;
  if (tint <= 0) return base;
  return hueRotateHex(base, tint * AVATAR_TINT_STEP, 1.08);
}

export function assignedCritterLine(avatar: string | undefined | null): string {
  return `You're the ${avatarById(avatar).label.toLowerCase()}!`;
}
