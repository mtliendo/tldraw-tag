export type AvatarDef = {
  id: string;
  label: string;
  color: string;
  accent: string;
  glyph: "bolt" | "orb" | "fox" | "bot" | "cat" | "bird" | "gem" | "shark" | "star" | "leaf";
};

export const AVATARS: AvatarDef[] = [
  { id: "bolt", label: "Bolt", color: "#FFD166", accent: "#7C4A00", glyph: "bolt" },
  { id: "orb", label: "Orb", color: "#7AE7FF", accent: "#084C61", glyph: "orb" },
  { id: "fox", label: "Fox", color: "#FF7A45", accent: "#4A1500", glyph: "fox" },
  { id: "bot", label: "Bot", color: "#C8D4E8", accent: "#1B2430", glyph: "bot" },
  { id: "cat", label: "Cat", color: "#F4C6D7", accent: "#5A2240", glyph: "cat" },
  { id: "bird", label: "Bird", color: "#9CFFCE", accent: "#0A3D2C", glyph: "bird" },
  { id: "gem", label: "Gem", color: "#C084FC", accent: "#3B0764", glyph: "gem" },
  { id: "shark", label: "Shark", color: "#6B8CFF", accent: "#0B1B4A", glyph: "shark" },
  { id: "star", label: "Star", color: "#FFE566", accent: "#5C4300", glyph: "star" },
  { id: "leaf", label: "Leaf", color: "#7CFF6B", accent: "#143C0C", glyph: "leaf" },
];

export function avatarById(id: string | undefined | null): AvatarDef {
  return AVATARS.find((a) => a.id === id) ?? AVATARS[0];
}
