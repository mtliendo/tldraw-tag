"use client";

import {
  Circle2d,
  HTMLContainer,
  Rectangle2d,
  ShapeUtil,
  T,
  type RecordProps,
  type TLShape,
} from "tldraw";
import { POWER_UPS, avatarById, type PowerId } from "@inkt/shared";
import { AvatarGlyph } from "@/components/AvatarGlyph";
import { PowerGlyph } from "@/components/PowerGlyph";
import { blobPath, wobbleRectPath } from "./wobble";

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    "inkt-arena": { w: number; h: number };
    "inkt-dim": { w: number; h: number; hx: number; hy: number; hw: number; hh: number };
    "inkt-zone": { w: number; h: number; warn: number; shrinking: boolean };
    "inkt-next-zone": { w: number; h: number; warn: number };
    "inkt-player": {
      w: number;
      h: number;
      name: string;
      avatar: string;
      isIt: boolean;
      ghost: boolean;
      frozen: boolean;
      boosting: boolean;
      hasShield: boolean;
      powerId: string;
      charges: number;
      self: boolean;
      labelX: number;
      labelAbove: boolean;
      squash: boolean;
    };
    "inkt-power": { w: number; h: number; kind: string };
    "inkt-pulse": { w: number; h: number; kind: string; progress: number };
    "inkt-wall": { w: number; h: number };
    "inkt-decoy": { w: number; h: number; name: string; avatar: string };
  }
}

type ArenaShape = TLShape<"inkt-arena">;
type DimShape = TLShape<"inkt-dim">;
type ZoneShape = TLShape<"inkt-zone">;
type NextZoneShape = TLShape<"inkt-next-zone">;
type PlayerShape = TLShape<"inkt-player">;
type PowerShape = TLShape<"inkt-power">;
type PulseShape = TLShape<"inkt-pulse">;
type WallShape = TLShape<"inkt-wall">;
type DecoyShape = TLShape<"inkt-decoy">;

function rectPath(w: number, h: number) {
  const path = new Path2D();
  path.rect(0, 0, w, h);
  return path;
}

function RectIndicator({ w, h }: { w: number; h: number }) {
  return <rect width={w} height={h} />;
}

function DrawRect({
  w,
  h,
  color,
  seed,
  dash,
  width = 5,
}: {
  w: number;
  h: number;
  color: string;
  seed?: number;
  dash?: string;
  width?: number;
}) {
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ overflow: "visible" }}>
      <path
        d={wobbleRectPath(w, h, seed ?? 1, 7)}
        stroke={color}
        strokeWidth={width + 4}
        opacity={0.18}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={wobbleRectPath(w, h, (seed ?? 1) + 0.4, 6)}
        stroke={color}
        strokeWidth={width}
        strokeDasharray={dash}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={dash ? "warn-dash" : undefined}
      />
    </svg>
  );
}

export class ArenaShapeUtil extends ShapeUtil<ArenaShape> {
  static override type = "inkt-arena" as const;
  static override props: RecordProps<ArenaShape> = { w: T.number, h: T.number };
  getDefaultProps() {
    return { w: 1600, h: 900 };
  }
  getGeometry(shape: ArenaShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }
  component(shape: ArenaShape) {
    const { w, h } = shape.props;
    return (
      <HTMLContainer>
        <svg width={w} height={h} style={{ position: "absolute", inset: 0 }}>
          <defs>
            <pattern id="inkt-dots" width="28" height="28" patternUnits="userSpaceOnUse">
              <circle cx="2" cy="2" r="1.05" fill="rgba(29,29,29,0.1)" />
            </pattern>
          </defs>
          <rect width={w} height={h} fill="#f7f9fb" />
          <rect width={w} height={h} fill="url(#inkt-dots)" />
          <path
            d="M60 80c50-16 110 8 140 18M1380 90c40 10 90-4 120 8M80 830c70 18 140 4 190-10"
            stroke="#1d1d1d"
            strokeOpacity="0.12"
            strokeWidth="3"
            fill="none"
            strokeLinecap="round"
          />
          <text x="48" y="860" fill="#1d1d1d" fillOpacity="0.22" fontSize="32" fontFamily="var(--font-draw), Shantell Sans, cursive">
            tldraw
          </text>
        </svg>
      </HTMLContainer>
    );
  }
  indicator(shape: ArenaShape) {
    return <RectIndicator w={shape.props.w} h={shape.props.h} />;
  }
  getIndicatorPath(shape: ArenaShape) {
    return rectPath(shape.props.w, shape.props.h);
  }
  override hideSelectionBoundsFg() {
    return true;
  }
  override canResize() {
    return false;
  }
}

export class DimShapeUtil extends ShapeUtil<DimShape> {
  static override type = "inkt-dim" as const;
  static override props: RecordProps<DimShape> = {
    w: T.number,
    h: T.number,
    hx: T.number,
    hy: T.number,
    hw: T.number,
    hh: T.number,
  };
  getDefaultProps() {
    return { w: 1600, h: 900, hx: 0, hy: 0, hw: 1600, hh: 900 };
  }
  getGeometry(shape: DimShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }
  component(shape: DimShape) {
    const { w, h, hx, hy, hw, hh } = shape.props;
    return (
      <HTMLContainer>
        <svg width={w} height={h} style={{ pointerEvents: "none" }}>
          <path fill="rgba(29,29,29,0.08)" fillRule="evenodd" d={`M0 0H${w}V${h}H0Z M${hx} ${hy}h${hw}v${hh}h${-hw}Z`} />
        </svg>
      </HTMLContainer>
    );
  }
  indicator(shape: DimShape) {
    return <RectIndicator w={shape.props.w} h={shape.props.h} />;
  }
  getIndicatorPath(shape: DimShape) {
    return rectPath(shape.props.w, shape.props.h);
  }
  override canResize() {
    return false;
  }
}

export class ZoneShapeUtil extends ShapeUtil<ZoneShape> {
  static override type = "inkt-zone" as const;
  static override props: RecordProps<ZoneShape> = {
    w: T.number,
    h: T.number,
    warn: T.number,
    shrinking: T.boolean,
  };
  getDefaultProps() {
    return { w: 1600, h: 900, warn: 0, shrinking: false };
  }
  getGeometry(shape: ZoneShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: false });
  }
  component(shape: ZoneShape) {
    const warn = shape.props.warn > 0.05;
    const color = warn || shape.props.shrinking ? "#e16919" : "#1d1d1d";
    return (
      <HTMLContainer>
        <div style={{ width: shape.props.w, height: shape.props.h, pointerEvents: "none" }}>
          <DrawRect
            w={shape.props.w}
            h={shape.props.h}
            color={color}
            seed={2}
            dash={warn ? "14 10" : undefined}
            width={warn ? 7 : 5}
          />
        </div>
      </HTMLContainer>
    );
  }
  indicator(shape: ZoneShape) {
    return <RectIndicator w={shape.props.w} h={shape.props.h} />;
  }
  getIndicatorPath(shape: ZoneShape) {
    return rectPath(shape.props.w, shape.props.h);
  }
  override canResize() {
    return false;
  }
}

export class NextZoneShapeUtil extends ShapeUtil<NextZoneShape> {
  static override type = "inkt-next-zone" as const;
  static override props: RecordProps<NextZoneShape> = {
    w: T.number,
    h: T.number,
    warn: T.number,
  };
  getDefaultProps() {
    return { w: 800, h: 450, warn: 0 };
  }
  getGeometry(shape: NextZoneShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: false });
  }
  component(shape: NextZoneShape) {
    if (shape.props.warn < 0.05) return <HTMLContainer />;
    return (
      <HTMLContainer>
        <div style={{ width: shape.props.w, height: shape.props.h, pointerEvents: "none" }}>
          <DrawRect w={shape.props.w} h={shape.props.h} color="#e16919" seed={5} dash="8 12" width={4} />
          <div className="kicker" style={{ position: "absolute", top: 12, left: 18, color: "#e16919", fontSize: 16 }}>
            next zone
          </div>
        </div>
      </HTMLContainer>
    );
  }
  indicator(shape: NextZoneShape) {
    return <RectIndicator w={shape.props.w} h={shape.props.h} />;
  }
  getIndicatorPath(shape: NextZoneShape) {
    return rectPath(shape.props.w, shape.props.h);
  }
  override canResize() {
    return false;
  }
}

export class PlayerShapeUtil extends ShapeUtil<PlayerShape> {
  static override type = "inkt-player" as const;
  static override props: RecordProps<PlayerShape> = {
    w: T.number,
    h: T.number,
    name: T.string,
    avatar: T.string,
    isIt: T.boolean,
    ghost: T.boolean,
    frozen: T.boolean,
    boosting: T.boolean,
    hasShield: T.boolean,
    powerId: T.string,
    charges: T.number,
    self: T.boolean,
    labelX: T.number,
    labelAbove: T.boolean,
    squash: T.boolean,
  };
  getDefaultProps() {
    return {
      w: 200,
      h: 140,
      name: "Player",
      avatar: "bolt",
      isIt: false,
      ghost: false,
      frozen: false,
      boosting: false,
      hasShield: false,
      powerId: "",
      charges: 0,
      self: false,
      labelX: 0,
      labelAbove: false,
      squash: false,
    };
  }
  getGeometry(shape: PlayerShape) {
    return new Circle2d({ radius: 40, isFilled: true });
  }
  component(shape: PlayerShape) {
    const avatar = avatarById(shape.props.avatar);
    const held = POWER_UPS[shape.props.powerId as PowerId];
    const token = 80;
    const stroke = shape.props.isIt ? "#e03131" : "#1d1d1d";
    return (
      <HTMLContainer>
        <div style={{ width: shape.props.w, height: shape.props.h, opacity: shape.props.ghost ? 0.4 : 1, position: "relative" }}>
          <div
            className={
              shape.props.squash ? "blob-squash" : shape.props.frozen ? "ice-shimmer" : "blob-idle"
            }
            style={{
              width: token,
              height: token,
              position: "absolute",
              left: 60,
              top: shape.props.labelAbove ? 36 : 0,
            }}
          >
            <svg width={token} height={token} viewBox="0 0 80 80">
              <path d={blobPath(80, shape.props.name.length)} fill={avatar.color} stroke={stroke} strokeWidth={shape.props.isIt ? 6 : 4} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <AvatarGlyph glyph={avatar.glyph} accent={avatar.accent} size={36} />
            </div>
            <svg width={token} height={token} viewBox="0 0 80 80" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
              <circle cx="32" cy="34" r="3.2" fill="#fff" stroke="#1d1d1d" strokeWidth="1.2" />
              <circle cx="48" cy="34" r="3.2" fill="#fff" stroke="#1d1d1d" strokeWidth="1.2" />
              <circle cx="32.6" cy="34.4" r="1.4" fill="#1d1d1d" />
              <circle cx="48.6" cy="34.4" r="1.4" fill="#1d1d1d" />
            </svg>
            {shape.props.isIt && (
              <div style={{ position: "absolute", top: -18, left: 0, right: 0, textAlign: "center", fontWeight: 800, color: "#e03131", fontSize: 16 }}>
                it!
              </div>
            )}
            {held && (
              <div
                style={{
                  position: "absolute",
                  right: -8,
                  bottom: -6,
                  width: 32,
                  height: 32,
                  background: held.color,
                  transform: "rotate(8deg)",
                  border: "2px solid #1d1d1d",
                  display: "grid",
                  placeItems: "center",
                  boxShadow: "2px 2px 0 #1d1d1d",
                }}
              >
                <PowerGlyph icon={held.icon} color={held.ink} size={18} />
              </div>
            )}
          </div>
          <div
            className="player-label"
            style={{
              position: "absolute",
              left: 100 + shape.props.labelX,
              top: shape.props.labelAbove ? 0 : 86,
              transform: "translateX(-50%) rotate(-2deg)",
              fontSize: 16,
              fontWeight: 700,
              color: "#1d1d1d",
              background: shape.props.frozen ? "#8AA3FF" : "#FCE19C",
              padding: "3px 10px",
              border: "2px solid #1d1d1d",
              boxShadow: "2px 2px 0 #1d1d1d",
              maxWidth: 124,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {shape.props.frozen ? `brr ${shape.props.name}` : shape.props.name}
          </div>
        </div>
      </HTMLContainer>
    );
  }
  indicator(shape: PlayerShape) {
    return <RectIndicator w={shape.props.w} h={shape.props.h} />;
  }
  getIndicatorPath(shape: PlayerShape) {
    return rectPath(shape.props.w, shape.props.h);
  }
  override canResize() {
    return false;
  }
}

export class PowerShapeUtil extends ShapeUtil<PowerShape> {
  static override type = "inkt-power" as const;
  static override props: RecordProps<PowerShape> = { w: T.number, h: T.number, kind: T.string };
  getDefaultProps() {
    return { w: 88, h: 100, kind: "speedster" };
  }
  getGeometry(shape: PowerShape) {
    return new Circle2d({ radius: 36, isFilled: true });
  }
  component(shape: PowerShape) {
    const def = POWER_UPS[shape.props.kind as PowerId];
    return (
      <HTMLContainer>
        <div className="gem-bob" style={{ width: shape.props.w, height: shape.props.h, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: 72,
              height: 72,
              background: def?.color ?? "#FCE19C",
              color: def?.ink ?? "#1d1d1d",
              display: "grid",
              placeItems: "center",
              border: "3px solid #1d1d1d",
              boxShadow: "3px 3px 0 #1d1d1d",
              transform: "rotate(-5deg)",
            }}
          >
            {def ? <PowerGlyph icon={def.icon} color={def.ink} size={36} /> : null}
          </div>
          <div style={{ marginTop: 6, fontSize: 14, fontWeight: 700 }}>{def?.verb ?? "loot"}</div>
        </div>
      </HTMLContainer>
    );
  }
  indicator(shape: PowerShape) {
    return <RectIndicator w={shape.props.w} h={shape.props.h} />;
  }
  getIndicatorPath(shape: PowerShape) {
    return rectPath(shape.props.w, shape.props.h);
  }
}

export class PulseShapeUtil extends ShapeUtil<PulseShape> {
  static override type = "inkt-pulse" as const;
  static override props: RecordProps<PulseShape> = {
    w: T.number,
    h: T.number,
    kind: T.string,
    progress: T.number,
  };
  getDefaultProps() {
    return { w: 110, h: 110, kind: "speedster", progress: 0 };
  }
  getGeometry(shape: PulseShape) {
    return new Circle2d({ radius: shape.props.w / 2, isFilled: false });
  }
  component(shape: PulseShape) {
    const def = POWER_UPS[shape.props.kind as PowerId];
    const color = def?.color ?? "#4465e9";
    return (
      <HTMLContainer>
        <div
          className="pulse-ring"
          style={{
            width: shape.props.w,
            height: shape.props.h,
            borderRadius: "46% 54% 48% 52%",
            border: `4px dashed ${color}`,
            display: "grid",
            placeItems: "center",
            opacity: 0.5 + shape.props.progress * 0.5,
          }}
        >
          {def ? <PowerGlyph icon={def.icon} color="#1d1d1d" size={28} /> : null}
        </div>
      </HTMLContainer>
    );
  }
  indicator(shape: PulseShape) {
    return <RectIndicator w={shape.props.w} h={shape.props.h} />;
  }
  getIndicatorPath(shape: PulseShape) {
    return rectPath(shape.props.w, shape.props.h);
  }
}

export class WallShapeUtil extends ShapeUtil<WallShape> {
  static override type = "inkt-wall" as const;
  static override props: RecordProps<WallShape> = { w: T.number, h: T.number };
  getDefaultProps() {
    return { w: 140, h: 26 };
  }
  getGeometry(shape: WallShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }
  component(shape: WallShape) {
    const { w, h } = shape.props;
    return (
      <HTMLContainer>
        <svg width={w} height={h}>
          <path d={wobbleRectPath(w, h, 3, 2)} fill="#FAA475" stroke="#1d1d1d" strokeWidth="3" />
        </svg>
      </HTMLContainer>
    );
  }
  indicator(shape: WallShape) {
    return <RectIndicator w={shape.props.w} h={shape.props.h} />;
  }
  getIndicatorPath(shape: WallShape) {
    return rectPath(shape.props.w, shape.props.h);
  }
}

export class DecoyShapeUtil extends ShapeUtil<DecoyShape> {
  static override type = "inkt-decoy" as const;
  static override props: RecordProps<DecoyShape> = {
    w: T.number,
    h: T.number,
    name: T.string,
    avatar: T.string,
  };
  getDefaultProps() {
    return { w: 80, h: 80, name: "Decoy", avatar: "bolt" };
  }
  getGeometry(shape: DecoyShape) {
    return new Circle2d({ radius: 36, isFilled: true });
  }
  component(shape: DecoyShape) {
    const avatar = avatarById(shape.props.avatar);
    return (
      <HTMLContainer>
        <div style={{ width: shape.props.w, opacity: 0.5, display: "grid", placeItems: "center" }}>
          <svg width={68} height={68} viewBox="0 0 80 80">
            <path d={blobPath(80, 4)} fill={avatar.color} stroke="#4ba1f1" strokeWidth="4" strokeDasharray="6 5" />
          </svg>
        </div>
      </HTMLContainer>
    );
  }
  indicator(shape: DecoyShape) {
    return <RectIndicator w={shape.props.w} h={shape.props.h} />;
  }
  getIndicatorPath(shape: DecoyShape) {
    return rectPath(shape.props.w, shape.props.h);
  }
}

export const INKT_SHAPES = [
  ArenaShapeUtil,
  DimShapeUtil,
  ZoneShapeUtil,
  NextZoneShapeUtil,
  WallShapeUtil,
  PulseShapeUtil,
  PowerShapeUtil,
  DecoyShapeUtil,
  PlayerShapeUtil,
];
