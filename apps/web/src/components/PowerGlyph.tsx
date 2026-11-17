"use client";

import type { PowerIcon } from "@inkt/shared";

export function PowerGlyph({
  icon,
  color,
  size = 36,
}: {
  icon: PowerIcon;
  color: string;
  size?: number;
}) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: color };
  switch (icon) {
    case "bolt":
      return (
        <svg {...common}>
          <path d="M13 2L4 14h7l-1 8 10-14h-7z" />
        </svg>
      );
    case "brick":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="2.2">
          <rect x="3" y="4" width="18" height="16" rx="1.5" />
          <path d="M3 12h18M12 4v8M8 12v8M16 12v8" />
        </svg>
      );
    case "ghost":
      return (
        <svg {...common}>
          <path d="M12 3c-4.4 0-7 3.2-7 8v8l2.2-1.6L9.5 20 12 17.8 14.5 20l2.3-2.6L19 19v-8c0-4.8-2.6-8-7-8z" />
          <circle cx="9.2" cy="11" r="1.2" fill="#1d1d1d" />
          <circle cx="14.8" cy="11" r="1.2" fill="#1d1d1d" />
        </svg>
      );
    case "clone":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="2">
          <rect x="3" y="6" width="10" height="12" rx="2" />
          <rect x="11" y="3" width="10" height="12" rx="2" />
        </svg>
      );
    case "snow":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="2">
          <path d="M12 3v18M4.5 7.5l15 9M4.5 16.5l15-9" />
          <circle cx="12" cy="12" r="2.2" fill={color} />
        </svg>
      );
    case "swap":
      return (
        <svg {...common} fill="none" stroke={color} strokeWidth="2.2">
          <path d="M7 7h11l-3-3M17 17H6l3 3" />
        </svg>
      );
    case "shield":
      return (
        <svg {...common}>
          <path d="M12 2l8 3v7c0 5-3.4 8.6-8 10-4.6-1.4-8-5-8-10V5z" />
        </svg>
      );
    default:
      return null;
  }
}
