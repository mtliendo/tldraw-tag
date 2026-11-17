"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { PLAYER_RADIUS, avatarById, resolveAvatarId, type AvatarState } from "@inkt/shared";
import {
  IT_CROWN_SRC,
  IT_FLAME_SRC,
  avatarTintFilter,
  critterBodyState,
  critterState,
  showsItChrome,
  type CritterFlags,
} from "@/components/critterArt";

export { critterState, critterBodyState, showsItChrome, avatarTintFilter, type CritterFlags };

const BODY_R = 21;
const VIEW = 80;
const CX_UNIT = 40;
const CY_UNIT = 46;
const SHADOW = "drop-shadow(0 2px 0 rgba(29,29,31,.10))";
const MOVE_EPS = 14;

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

function ItOverlay({ size }: { size: number }) {
  const layer: CSSProperties = {
    position: "absolute",
    left: 0,
    top: 0,
    width: size,
    height: size,
    display: "block",
    pointerEvents: "none",
    filter: "none",
  };
  return (
    <>
      <img data-inkt="it-flame" src={IT_FLAME_SRC} alt="" width={size} height={size} draggable={false} style={{ ...layer, zIndex: 0 }} />
      <img data-inkt="it-crown" src={IT_CROWN_SRC} alt="" width={size} height={size} draggable={false} style={{ ...layer, zIndex: 2 }} />
    </>
  );
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
  const state = critterBodyState(flags, frame);
  const { size, left, top } = critterPlacement(radius);
  const hue = avatarTintFilter(tint);
  const overlay = showsItChrome(flags);
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
      {overlay ? <ItOverlay size={size} /> : null}
      <img
        data-inkt="art"
        src={critterSrc(avatar, state)}
        alt=""
        width={size}
        height={size}
        draggable={false}
        style={{
          display: "block",
          position: "relative",
          zIndex: 1,
          width: size,
          height: size,
          filter: hue,
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
  const overlay = showsItChrome({ isIt, frozen: state === "frozen" });
  const bodyState: AvatarState = overlay ? (state === "it" || state === "idle" ? "idle" : state) : state;
  const hue = avatarTintFilter(tint);
  return (
    <span
      aria-hidden
      style={{
        width: size,
        height: size,
        display: "inline-grid",
        placeItems: "center",
        flexShrink: 0,
        position: "relative",
        filter: SHADOW,
      }}
    >
      {overlay ? <ItOverlay size={size} /> : null}
      <img
        data-inkt="art"
        src={critterSrc(avatar, bodyState)}
        alt=""
        width={size}
        height={size}
        draggable={false}
        style={{ display: "block", position: "relative", zIndex: 1, width: size, height: size, filter: hue }}
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
