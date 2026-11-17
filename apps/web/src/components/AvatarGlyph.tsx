"use client";

import type { AvatarDef } from "@inkt/shared";

export function AvatarGlyph({
  glyph,
  accent,
  size = 22,
}: {
  glyph: AvatarDef["glyph"];
  accent: string;
  size?: number;
}) {
  const stroke = accent;
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: stroke };
  switch (glyph) {
    case "bolt":
      return (
        <svg {...common}>
          <path d="M13 2L4 14h7l-1 8 10-14h-7l0-6z" />
        </svg>
      );
    case "orb":
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="7" />
        </svg>
      );
    case "fox":
      return (
        <svg {...common}>
          <path d="M3 20l5-16 4 6 4-6 5 16-9-5z" />
        </svg>
      );
    case "bot":
      return (
        <svg {...common}>
          <rect x="5" y="7" width="14" height="11" rx="2" />
          <circle cx="9" cy="12" r="1.4" fill="#fff" />
          <circle cx="15" cy="12" r="1.4" fill="#fff" />
        </svg>
      );
    case "cat":
      return (
        <svg {...common}>
          <path d="M4 19c0-6 3.5-10 8-10s8 4 8 10H4zm2-10l3-5 3 4 3-4 3 5" fill="none" stroke={stroke} strokeWidth="2" />
        </svg>
      );
    case "bird":
      return (
        <svg {...common}>
          <path d="M3 14c6-2 8-8 10-8 0 0 1 4 8 6-5 1-7 5-8 8-2-3-6-5-10-6z" />
        </svg>
      );
    case "gem":
      return (
        <svg {...common}>
          <path d="M12 2l8 8-8 12L4 10z" />
        </svg>
      );
    case "shark":
      return (
        <svg {...common}>
          <path d="M2 13c6-6 14-6 20 0-6 2-9 2-12 0-1 3-3 4-5 4 1-2 1-3-3-4z" />
        </svg>
      );
    case "star":
      return (
        <svg {...common}>
          <path d="M12 2l2.4 7h7l-5.7 4.2 2.2 7L12 16.5 6.1 20.2l2.2-7L2.6 9h7z" />
        </svg>
      );
    case "leaf":
      return (
        <svg {...common}>
          <path d="M5 19c8-1 14-8 14-16-8 0-15 6-16 14 3-2 6-2 8-1-3 1-5 2-6 3z" />
        </svg>
      );
    default:
      return <span />;
  }
}
