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

declare module "tldraw" {
  export interface TLGlobalShapePropsMap {
    "inkt-arena": { w: number; h: number };
    "inkt-zone": { w: number; h: number };
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
      self: boolean;
    };
    "inkt-power": { w: number; h: number; kind: string };
    "inkt-pulse": { w: number; h: number; kind: string; progress: number };
    "inkt-wall": { w: number; h: number };
    "inkt-decoy": { w: number; h: number; name: string; avatar: string };
  }
}

type ArenaShape = TLShape<"inkt-arena">;
type ZoneShape = TLShape<"inkt-zone">;
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
    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            background:
              "radial-gradient(circle at 50% 45%, #15182a 0%, #0b0d16 58%, #05060b 100%)",
            border: "2px solid rgba(255,255,255,0.06)",
            boxShadow: "inset 0 0 180px rgba(0,0,0,0.55)",
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
            backgroundSize: "80px 80px",
          }}
        />
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

export class ZoneShapeUtil extends ShapeUtil<ZoneShape> {
  static override type = "inkt-zone" as const;
  static override props: RecordProps<ZoneShape> = { w: T.number, h: T.number };
  getDefaultProps() {
    return { w: 1600, h: 900 };
  }
  getGeometry(shape: ZoneShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: false });
  }
  component(shape: ZoneShape) {
    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            border: "6px solid #6cf0ff",
            borderRadius: 28,
            boxShadow: "0 0 0 9999px rgba(4,6,12,0.55), 0 0 40px rgba(108,240,255,0.45)",
            pointerEvents: "none",
          }}
        />
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
    self: T.boolean,
  };
  getDefaultProps() {
    return {
      w: 56,
      h: 72,
      name: "Player",
      avatar: "bolt",
      isIt: false,
      ghost: false,
      frozen: false,
      boosting: false,
      hasShield: false,
      powerId: "",
      self: false,
    };
  }
  getGeometry(shape: PlayerShape) {
    return new Circle2d({ radius: shape.props.w / 2, isFilled: true });
  }
  component(shape: PlayerShape) {
    const avatar = avatarById(shape.props.avatar);
    const ring = shape.props.isIt ? "#ff2d7b" : shape.props.self ? "#f4f7ff" : avatar.color;
    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            opacity: shape.props.ghost ? 0.45 : 1,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            filter: shape.props.frozen ? "saturate(0.3) brightness(1.3)" : undefined,
          }}
        >
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              background: avatar.color,
              border: `4px solid ${ring}`,
              boxShadow: shape.props.isIt
                ? "0 0 18px #ff2d7b"
                : shape.props.boosting
                  ? "0 0 16px #ffd166"
                  : shape.props.hasShield
                    ? "0 0 16px #3dffc8"
                    : "0 6px 0 rgba(0,0,0,0.35)",
              display: "grid",
              placeItems: "center",
              position: "relative",
            }}
          >
            <AvatarGlyph glyph={avatar.glyph} accent={avatar.accent} />
            {shape.props.isIt && (
              <div
                style={{
                  position: "absolute",
                  top: -16,
                  fontSize: 11,
                  fontWeight: 800,
                  letterSpacing: 1,
                  color: "#ff2d7b",
                  textShadow: "0 1px 0 #000",
                }}
              >
                IT
              </div>
            )}
          </div>
          <div
            style={{
              marginTop: 4,
              fontSize: 11,
              fontWeight: 800,
              color: "#f4f7ff",
              background: "rgba(7,8,15,0.72)",
              padding: "1px 6px",
              borderRadius: 999,
              maxWidth: 80,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {shape.props.name}
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
    return { w: 36, h: 36, kind: "speedster" };
  }
  getGeometry(shape: PowerShape) {
    return new Circle2d({ radius: shape.props.w / 2, isFilled: true });
  }
  component(shape: PowerShape) {
    const def = POWER_UPS[shape.props.kind as PowerId];
    const color = def?.color ?? "#fff";
    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            borderRadius: 10,
            background: color,
            color: def?.ink ?? "#111",
            display: "grid",
            placeItems: "center",
            fontWeight: 900,
            fontSize: 9,
            letterSpacing: 0.4,
            transform: "rotate(45deg)",
            boxShadow: `0 0 18px ${color}`,
          }}
        >
          <span style={{ transform: "rotate(-45deg)" }}>{def?.label.slice(0, 3).toUpperCase()}</span>
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
    return { w: 70, h: 70, kind: "speedster", progress: 0 };
  }
  getGeometry(shape: PulseShape) {
    return new Circle2d({ radius: shape.props.w / 2, isFilled: false });
  }
  component(shape: PulseShape) {
    const def = POWER_UPS[shape.props.kind as PowerId];
    const color = def?.color ?? "#6cf0ff";
    const scale = 0.55 + shape.props.progress * 0.7;
    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            borderRadius: "50%",
            border: `3px solid ${color}`,
            opacity: 0.35 + shape.props.progress * 0.5,
            transform: `scale(${scale})`,
            boxShadow: `0 0 24px ${color}`,
          }}
        />
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
    return { w: 96, h: 18 };
  }
  getGeometry(shape: WallShape) {
    return new Rectangle2d({ width: shape.props.w, height: shape.props.h, isFilled: true });
  }
  component(shape: WallShape) {
    return (
      <HTMLContainer>
        <div
          style={{
            width: shape.props.w,
            height: shape.props.h,
            background: "#ff9f1c",
            borderRadius: 6,
            boxShadow: "0 0 16px rgba(255,159,28,0.7)",
          }}
        />
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
    return { w: 56, h: 72, name: "Decoy", avatar: "bolt" };
  }
  getGeometry(shape: DecoyShape) {
    return new Circle2d({ radius: 20, isFilled: true });
  }
  component(shape: DecoyShape) {
    const avatar = avatarById(shape.props.avatar);
    return (
      <HTMLContainer>
        <div style={{ width: shape.props.w, opacity: 0.55, display: "grid", placeItems: "center" }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: avatar.color,
              border: "3px dashed #7ae7ff",
              display: "grid",
              placeItems: "center",
            }}
          >
            <AvatarGlyph glyph={avatar.glyph} accent={avatar.accent} />
          </div>
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
  ZoneShapeUtil,
  WallShapeUtil,
  PulseShapeUtil,
  PowerShapeUtil,
  DecoyShapeUtil,
  PlayerShapeUtil,
];
