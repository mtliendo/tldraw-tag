"use client";

import { useEffect, useRef, useState } from "react";
import {
  PLAYER_RADIUS,
  AVATAR_TINT_STEP,
  avatarById,
  resolveAvatarId,
  type AvatarState,
} from "@inkt/shared";

const BODY_R = 21;
const VIEW = 80;
const CX_UNIT = 40;
const CY_UNIT = 46;
const SHADOW = "drop-shadow(0 2px 0 rgba(29,29,31,.10))";
const MOVE_EPS = 14;

export type CritterFlags = {
  isIt?: boolean;
  ghost?: boolean;
  frozen?: boolean;
  hasShield?: boolean;
  stunned?: boolean;
  vx?: number;
  vy?: number;
};

export function critterState(flags: CritterFlags, runFrame: 0 | 1): AvatarState {
  if (flags.frozen) return "frozen";
  if (flags.isIt) return "it";
  if (flags.ghost) return "ghost";
  if (flags.hasShield) return "shield";
  if (flags.stunned) return "stunned";
  const moving = Math.hypot(flags.vx ?? 0, flags.vy ?? 0) > MOVE_EPS;
  if (moving) return runFrame === 0 ? "run1" : "run2";
  return "idle";
}

export function critterSrc(avatar: string, state: AvatarState) {
  return `/avatars/A/${resolveAvatarId(avatar)}-${state}.svg`;
}

/** Place the SVG so body center sits on the R-radius hitbox center. */
export function critterPlacement(radius = PLAYER_RADIUS) {
  const size = (radius / BODY_R) * VIEW;
  return {
    size,
    left: radius - (CX_UNIT / VIEW) * size,
    top: radius - (CY_UNIT / VIEW) * size,
  };
}

export function Critter({
  avatar,
  radius = PLAYER_RADIUS,
  tint = 0,
  faceLeft = false,
  runFrame,
  className,
  style,
  ...flags
}: CritterFlags & {
  avatar: string;
  radius?: number;
  tint?: number;
  faceLeft?: boolean;
  runFrame?: 0 | 1;
  className?: string;
  style?: React.CSSProperties;
}) {
  const moving = Math.hypot(flags.vx ?? 0, flags.vy ?? 0) > MOVE_EPS;
  const [autoFrame, setAutoFrame] = useState<0 | 1>(0);
  useEffect(() => {
    if (runFrame !== undefined || !moving) return;
    const t = window.setInterval(() => setAutoFrame((f) => (f === 0 ? 1 : 0)), 120);
    return () => window.clearInterval(t);
  }, [moving, runFrame]);
  const frame = runFrame ?? autoFrame;
  const state = critterState(flags, frame);
  const { size, left, top } = critterPlacement(radius);
  const hue = tint > 0 ? `hue-rotate(${tint * AVATAR_TINT_STEP}deg) saturate(1.08)` : "none";
  const def = avatarById(avatar);
  const autoLeft = useFacing(flags.vx);
  const leftFacing = faceLeft || autoLeft;
  return (
    <span
      className={className}
      aria-hidden
      style={{
        position: "absolute",
        left,
        top,
        width: size,
        height: size,
        pointerEvents: "none",
        transform: leftFacing ? "scaleX(-1)" : undefined,
        transformOrigin: "center center",
        filter: SHADOW,
        opacity: flags.ghost && flags.isIt ? 0.42 : undefined,
        ...style,
      }}
    >
      <img
        src={critterSrc(avatar, state)}
        alt=""
        width={size}
        height={size}
        draggable={false}
        style={{
          display: "block",
          width: size,
          height: size,
          filter: hue === "none" ? undefined : hue,
        }}
      />
      <span style={{ display: "none" }}>{def.label}</span>
    </span>
  );
}

export function CritterThumb({
  avatar,
  size = 40,
  tint = 0,
  state = "idle",
  isIt = false,
}: {
  avatar: string;
  size?: number;
  tint?: number;
  state?: AvatarState;
  isIt?: boolean;
}) {
  const src = critterSrc(avatar, isIt && state === "idle" ? "it" : state);
  const hue = tint > 0 ? `hue-rotate(${tint * AVATAR_TINT_STEP}deg) saturate(1.08)` : undefined;
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
        filter: SHADOW,
      }}
    >
      <img
        src={src}
        alt=""
        width={size}
        height={size}
        draggable={false}
        style={{ display: "block", width: size, height: size, filter: hue }}
      />
    </span>
  );
}

export function useFacing(vx = 0) {
  const facing = useRef(false);
  if (vx < -MOVE_EPS) facing.current = true;
  else if (vx > MOVE_EPS) facing.current = false;
  return facing.current;
}
