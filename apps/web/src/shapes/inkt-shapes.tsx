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
import { POWER_UPS, STROKE, avatarById, type PowerId } from "@inkt/shared";
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
      labelY: number;
      labelAbove: boolean;
      labelSide: string;
      labelLeader: boolean;
      labelW: number;
      labelStack: number;
      squash: boolean;
      showLabel: boolean;
      joinFlash: boolean;
      playerId: string;
      labelScale: number;
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
}: {
  w: number;
  h: number;
  color: string;
  seed?: number;
  dash?: string;
}) {
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ overflow: "visible" }}>
      <path
        d={wobbleRectPath(w, h, seed ?? 1, dash ? 1.6 : 2.2)}
        stroke={color}
        strokeWidth={STROKE}
        strokeDasharray={dash}
        opacity={dash ? 0.55 : 1}
        strokeLinecap="round"
        strokeLinejoin="round"
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
            <pattern id="inkt-dots" width="24" height="24" patternUnits="userSpaceOnUse">
              <circle cx="1.2" cy="1.2" r="0.9" fill="rgba(29,29,29,0.08)" />
            </pattern>
          </defs>
          <rect width={w} height={h} fill="#f7f9fb" />
          <rect width={w} height={h} fill="url(#inkt-dots)" />
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
          <path fill="rgba(29,29,29,0.05)" fillRule="evenodd" d={`M0 0H${w}V${h}H0Z M${hx} ${hy}h${hw}v${hh}h${-hw}Z`} />
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
    const color = shape.props.shrinking || shape.props.warn > 0.05 ? "#e16919" : "#1d1d1d";
    return (
      <HTMLContainer>
        <div data-inkt="zone" style={{ width: shape.props.w, height: shape.props.h, pointerEvents: "none" }}>
          <DrawRect w={shape.props.w} h={shape.props.h} color={color} seed={2} />
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
          <DrawRect w={shape.props.w} h={shape.props.h} color="#e16919" seed={5} dash="10 12" />
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
    labelY: T.number,
    labelAbove: T.boolean,
    labelSide: T.string,
    labelLeader: T.boolean,
    labelW: T.number,
    labelStack: T.number,
    squash: T.boolean,
    showLabel: T.boolean,
    joinFlash: T.boolean,
    playerId: T.string,
    labelScale: T.number,
  };
  getDefaultProps() {
    return {
      w: 140,
      h: 120,
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
      labelY: 48,
      labelAbove: false,
      labelSide: "below",
      labelLeader: false,
      labelW: 72,
      labelStack: 0,
      squash: false,
      showLabel: true,
      joinFlash: false,
      playerId: "",
      labelScale: 1,
    };
  }
  getGeometry(shape: PlayerShape) {
    return new Rectangle2d({ width: 72, height: 72, isFilled: true });
  }
  component(shape: PlayerShape) {
    const avatar = avatarById(shape.props.avatar);
    const held = POWER_UPS[shape.props.powerId as PowerId];
    const token = 72;
    const stroke = shape.props.isIt ? "#e03131" : shape.props.self ? "#4ba1f1" : "#1d1d1d";
    const scale = shape.props.labelScale;
    const labelH = 20 * scale + 2;
    const labelW = shape.props.labelW || 72 * scale;
    const cx = token / 2;
    const cy = token / 2;
    const lx = cx + shape.props.labelX;
    const ly = cy + shape.props.labelY;
    const side = shape.props.labelSide || (shape.props.labelAbove ? "above" : "below");
    const ax =
      side === "left" ? lx + labelW / 2 : side === "right" ? lx - labelW / 2 : lx;
    const ay =
      side === "above" ? ly + labelH / 2 : side === "below" ? ly - labelH / 2 : ly;
    const ang = Math.atan2(ay - cy, ax - cx);
    const rim = 36;
    const sx = cx + Math.cos(ang) * rim;
    const sy = cy + Math.sin(ang) * rim;
    return (
      <HTMLContainer>
        <div
          data-player-id={shape.props.playerId}
          data-inkt="player"
          style={{
            width: token,
            height: token,
            opacity: shape.props.ghost ? 0.42 : 1,
            position: "relative",
            overflow: "visible",
          }}
        >
          <div
            className={
              shape.props.squash ? "blob-squash" : shape.props.frozen ? "ice-shimmer" : "blob-idle"
            }
            style={{
              width: token,
              height: token,
              position: "absolute",
              left: 0,
              top: 0,
            }}
          >
            {shape.props.frozen && (
              <svg
                width={84}
                height={84}
                viewBox="0 0 84 84"
                style={{ position: "absolute", left: -6, top: -6, pointerEvents: "none" }}
              >
                <circle cx="42" cy="42" r="36" fill="rgba(68,101,233,0.16)" stroke="#4465e9" strokeWidth={STROKE} />
              </svg>
            )}
            {shape.props.self && (
              <svg
                width={84}
                height={84}
                viewBox="0 0 84 84"
                style={{ position: "absolute", left: -6, top: -6, pointerEvents: "none" }}
              >
                <circle cx="42" cy="42" r="38" fill="none" stroke="#4ba1f1" strokeWidth={2.5} />
              </svg>
            )}
            <svg width={token} height={token} viewBox="0 0 72 72">
              <path d={blobPath(72, shape.props.name.length)} fill={avatar.color} stroke={stroke} strokeWidth={STROKE} />
            </svg>
            <div style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center" }}>
              <AvatarGlyph glyph={avatar.glyph} accent={avatar.accent} size={28} />
            </div>
            {held && (
              <div
                style={{
                  position: "absolute",
                  right: -4,
                  bottom: -4,
                  width: 22,
                  height: 22,
                  background: held.color,
                  border: `${STROKE}px solid #1d1d1d`,
                  display: "grid",
                  placeItems: "center",
                }}
              >
                <PowerGlyph icon={held.icon} color={held.ink} size={12} />
              </div>
            )}
          </div>
          {shape.props.showLabel && shape.props.labelLeader && (
            <svg
              width={200}
              height={200}
              viewBox="0 0 200 200"
              style={{
                position: "absolute",
                left: cx - 100,
                top: cy - 100,
                pointerEvents: "none",
                overflow: "visible",
              }}
            >
              <line
                x1={sx - cx + 100}
                y1={sy - cy + 100}
                x2={ax - cx + 100}
                y2={ay - cy + 100}
                stroke="#1d1d1d"
                strokeWidth={STROKE}
                strokeLinecap="round"
                opacity={0.55}
              />
            </svg>
          )}
          {shape.props.showLabel && (
            <div
              className={`player-label${shape.props.joinFlash ? " join-flash" : ""}${shape.props.self ? " you-label" : ""}`}
              data-inkt="label"
              style={{
                position: "absolute",
                left: lx,
                top: ly,
                width: labelW,
                height: labelH,
                lineHeight: `${labelH - 2}px`,
                transform: "translate(-50%, -50%)",
                fontWeight: 600,
                color: shape.props.isIt ? "#e03131" : shape.props.self ? "#1a5f9e" : "#1d1d1d",
                textAlign: "center",
              }}
            >
              {shape.props.self
                ? `you · ${shape.props.name}`
                : shape.props.isIt
                  ? `it · ${shape.props.name}`
                  : shape.props.name}
            </div>
          )}
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
    return { w: 64, h: 78, kind: "speedster" };
  }
  getGeometry(shape: PowerShape) {
    return new Circle2d({ radius: 28, isFilled: true });
  }
  component(shape: PowerShape) {
    const def = POWER_UPS[shape.props.kind as PowerId];
    return (
      <HTMLContainer>
        <div className="gem-bob" style={{ width: shape.props.w, height: shape.props.h, display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div
            style={{
              width: 52,
              height: 52,
              background: def?.color ?? "#f1ac4b",
              color: def?.ink ?? "#1d1d1d",
              display: "grid",
              placeItems: "center",
              border: `${STROKE}px solid #1d1d1d`,
              borderRadius: 8,
            }}
          >
            {def ? <PowerGlyph icon={def.icon} color={def.ink} size={24} /> : null}
          </div>
          <div style={{ marginTop: 4, fontSize: 11, fontWeight: 600 }}>{def?.verb ?? "loot"}</div>
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
    return { w: 64, h: 64, kind: "speedster", progress: 0 };
  }
  getGeometry(shape: PulseShape) {
    return new Circle2d({ radius: shape.props.w / 2, isFilled: false });
  }
  component(shape: PulseShape) {
    const def = POWER_UPS[shape.props.kind as PowerId];
    return (
      <HTMLContainer>
        <div
          className="pulse-ring"
          style={{
            width: shape.props.w,
            height: shape.props.h,
            borderRadius: "50%",
            border: `${STROKE}px dashed #1d1d1d`,
            display: "grid",
            placeItems: "center",
            opacity: 0.45 + shape.props.progress * 0.4,
          }}
        >
          {def ? <PowerGlyph icon={def.icon} color="#1d1d1d" size={18} /> : null}
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
        <svg width={w} height={h} data-inkt="wall">
          <path d={wobbleRectPath(w, h, 3, 1.4)} fill="#e16919" stroke="#1d1d1d" strokeWidth={STROKE} />
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
          <svg width={56} height={56} viewBox="0 0 72 72">
            <path d={blobPath(72, 4)} fill={avatar.color} stroke="#4465e9" strokeWidth={STROKE} strokeDasharray="5 5" />
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
