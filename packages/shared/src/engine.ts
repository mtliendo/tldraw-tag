import {
  ARENA_H,
  ARENA_W,
  BOT_THINK_INTERVAL,
  DECOY_DURATION,
  DEFAULT_ROUND_LENGTH,
  DEFAULT_SHRINK_INTERVAL,
  FREEZE_DURATION,
  FREEZE_RANGE,
  GHOST_DURATION,
  MAX_PLAYERS,
  MAX_ROUND_LENGTH,
  MIN_ROUND_LENGTH,
  PICKUP_DISTANCE,
  PLAYER_RADIUS,
  PLAYER_SEPARATION,
  PLAYER_SPEED,
  POWER_MAX_ON_BOARD,
  POWER_PULSE_WARN,
  POWER_RADIUS,
  POWER_SPAWN_MAX,
  POWER_SPAWN_MIN,
  SPEED_DURATION,
  SPEEDSTER_MULTIPLIER,
  TAG_COOLDOWN,
  TAG_DISTANCE,
  TICK_DT,
  WALL_LIFETIME,
  WALL_PLACE_OFFSET,
  WALL_THICKNESS,
  WALL_WIDTH,
  ART_INSET,
  clampToZoneArt,
  MAX_DISPLACE_PER_SEC,
  SEPARATION_ITERS,
  SEPARATION_STIFFNESS,
  ZONE_SHRINK_DURATION,
  minZoneSize,
} from "./constants";
import { AVATARS, resolveAvatarId } from "./avatars";
import { pickWeightedPower, POWER_UPS, type PowerId } from "./powerups";
import {
  clamp,
  dist,
  lerpRect,
  makeRoomCode,
  normalize,
  separateAabbFromAabb,
  uid,
} from "./ids";
import type {
  AdminConfig,
  EngineDecoy,
  EngineEvent,
  EnginePlayer,
  EnginePulse,
  EngineState,
  EngineWall,
  InputState,
  LeaderboardRow,
  PublicState,
  Rect,
} from "./types";

const FULL_ARENA: Rect = { x: 0, y: 0, w: ARENA_W, h: ARENA_H };

const BOT_NAMES = [
  "Pixel",
  "Nib",
  "Marker",
  "Sketch",
  "Ink",
  "Doodle",
  "Stamp",
  "Brush",
  "Nibbly",
  "Scribble",
  "Graphite",
  "Lino",
  "Toner",
  "Paste",
  "Stencil",
  "Vector",
  "Raster",
  "Nibster",
  "Blob",
  "Dot",
  "Dash",
  "Swipe",
  "Flick",
  "Smudge",
];

export class TagEngine {
  state: EngineState;
  inputs = new Map<string, InputState>();
  private rand: () => number;
  private seq = 0;
  private dt = TICK_DT;
  private avatarBag: string[] = [];
  private lastDealtAvatar = "";

  constructor(opts?: {
    code?: string;
    roundLength?: number;
    shrinkInterval?: number;
    enabledPowers?: PowerId[];
    rand?: () => number;
  }) {
    this.rand = opts?.rand ?? Math.random;
    const roundLength = clamp(
      opts?.roundLength ?? DEFAULT_ROUND_LENGTH,
      MIN_ROUND_LENGTH,
      MAX_ROUND_LENGTH,
    );
    const shrinkInterval = clamp(opts?.shrinkInterval ?? DEFAULT_SHRINK_INTERVAL, 4, 30);
    this.state = {
      code: opts?.code ?? makeRoomCode(this.rand),
      phase: "lobby",
      now: 0,
      timeLeft: roundLength,
      roundLength,
      shrinkInterval,
      nextShrinkAt: shrinkInterval,
      shrinkEndsAt: 0,
      nextPowerAt: 2.5,
      showcaseUntil: 0,
      zone: { ...FULL_ARENA },
      fromZone: { ...FULL_ARENA },
      targetZone: { ...FULL_ARENA },
      enabledPowers: opts?.enabledPowers ?? (Object.keys(POWER_UPS) as PowerId[]),
      itId: "",
      players: {},
      powerUps: {},
      pulses: {},
      walls: {},
      decoys: {},
      leaderboard: [],
      events: [],
    };
  }

  configure(cfg: Partial<AdminConfig>) {
    if (this.state.phase === "playing") return;
    if (cfg.roundLength != null) {
      this.state.roundLength = clamp(cfg.roundLength, MIN_ROUND_LENGTH, MAX_ROUND_LENGTH);
      this.state.timeLeft = this.state.roundLength;
    }
    if (cfg.shrinkInterval != null) {
      this.state.shrinkInterval = clamp(cfg.shrinkInterval, 4, 30);
    }
    if (cfg.enabledPowers) {
      this.state.enabledPowers = cfg.enabledPowers.filter((id) => id in POWER_UPS);
    }
  }

  addPlayer(opts: {
    id?: string;
    sessionId?: string;
    name: string;
    avatar?: string;
    isBot?: boolean;
  }): EnginePlayer {
    const players = Object.values(this.state.players);
    if (players.length >= MAX_PLAYERS) {
      throw new Error("Room is full");
    }
    const id = opts.id ?? uid("p");
    const guess = this.randomInZone(PLAYER_RADIUS + 8);
    const spawn = this.clearOfPlayers(guess.x, guess.y, PLAYER_SEPARATION);
    const avatar = this.nextAvatar();
    const player: EnginePlayer = {
      id,
      sessionId: opts.sessionId ?? "",
      name: sanitizeName(opts.name),
      avatar,
      tint: this.tintFor(avatar),
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      facingX: 1,
      facingY: 0,
      isIt: false,
      isBot: Boolean(opts.isBot),
      score: 0,
      tags: 0,
      powerId: "",
      charges: 0,
      speedUntil: 0,
      ghostUntil: 0,
      frozenUntil: 0,
      hasShield: false,
      lastTaggedAt: -10,
      thinkAt: 0,
      wanderX: spawn.x,
      wanderY: spawn.y,
      botOrbit: 0.28 + this.rand() * 0.62,
      botPhase: this.rand() * Math.PI * 2,
      botSpeed: 0.56 + this.rand() * 0.5,
      botSpin: (this.rand() - 0.5) * 1.1,
    };
    this.state.players[id] = player;
    this.inputs.set(id, { x: 0, y: 0, usePower: false });
    this.constrainBodies();
    return player;
  }

  removePlayer(id: string) {
    const leaving = this.state.players[id];
    if (!leaving) return;
    const wasIt = this.state.itId === id;
    const lx = leaving.x;
    const ly = leaving.y;
    delete this.state.players[id];
    this.inputs.delete(id);
    if (wasIt) this.passItToNearest(lx, ly);
  }

  spawnBots(count: number) {
    const existingBots = Object.values(this.state.players).filter((p) => p.isBot).length;
    const roomLeft = MAX_PLAYERS - Object.keys(this.state.players).length;
    const n = Math.max(0, Math.min(count, roomLeft, 24 - existingBots));
    for (let i = 0; i < n; i++) {
      const name = BOT_NAMES[(existingBots + i) % BOT_NAMES.length];
      this.addPlayer({
        name: `${name}`,
        isBot: true,
        id: uid("bot"),
      });
    }
  }

  /** Shuffle all 13 critters, deal each once, then reshuffle. Shared by humans and bots. */
  private nextAvatar(): string {
    if (this.avatarBag.length === 0) {
      const ids = AVATARS.map((a) => a.id);
      for (let i = ids.length - 1; i > 0; i--) {
        const j = Math.floor(this.rand() * (i + 1));
        [ids[i], ids[j]] = [ids[j], ids[i]];
      }
      if (this.lastDealtAvatar && ids.length > 1 && ids[ids.length - 1] === this.lastDealtAvatar) {
        const swap = ids.findIndex((id) => id !== this.lastDealtAvatar);
        if (swap >= 0) [ids[ids.length - 1], ids[swap]] = [ids[swap], ids[ids.length - 1]];
      }
      this.avatarBag = ids;
    }
    const id = this.avatarBag.pop()!;
    this.lastDealtAvatar = id;
    return id;
  }

  /** Index among already-seated copies of this critter. Stays put if others leave. */
  private tintFor(avatar: string): number {
    const key = resolveAvatarId(avatar);
    return Object.values(this.state.players).filter((p) => resolveAvatarId(p.avatar) === key).length;
  }

  setInput(id: string, input: Partial<InputState>) {
    const cur = this.inputs.get(id) ?? { x: 0, y: 0, usePower: false };
    const x = clamp(input.x ?? cur.x, -1, 1);
    const y = clamp(input.y ?? cur.y, -1, 1);
    this.inputs.set(id, {
      x,
      y,
      usePower: Boolean(input.usePower) || cur.usePower,
    });
  }

  start() {
    const players = Object.values(this.state.players);
    if (players.length < 2) {
      throw new Error("Need at least 2 players to start");
    }
    this.resetRoundKeepPlayers();
    this.pickIt();
    this.state.phase = "playing";
    this.state.timeLeft = this.state.roundLength;
    this.state.nextShrinkAt = this.state.now + this.state.shrinkInterval;
    this.state.nextPowerAt = this.state.now + 2;
    this.push({ type: "start" });
    this.push({ type: "announce", text: `${this.itName()} is IT` });
  }

  pause() {
    if (this.state.phase === "playing") this.state.phase = "paused";
  }

  resume() {
    if (this.state.phase === "paused") this.state.phase = "playing";
  }

  reset() {
    this.resetRoundKeepPlayers();
    this.state.phase = "lobby";
    this.state.itId = "";
    this.state.showcaseUntil = 0;
    for (const p of Object.values(this.state.players)) p.isIt = false;
  }

  /** Pin visible power-ups, a Paver wall, a freeze, and a held power for projector demos. */
  showcase() {
    const s = this.state;
    if (s.phase !== "playing") return;
    const z = s.zone;
    s.powerUps = {};
    s.pulses = {};
    const gems: Array<{ kind: PowerId; fx: number; fy: number }> = [
      { kind: "speedster", fx: 0.16, fy: 0.26 },
      { kind: "shield", fx: 0.16, fy: 0.58 },
      { kind: "freezer", fx: 0.34, fy: 0.4 },
    ];
    for (const gem of gems) {
      const id = uid("pow");
      const clear = this.clearOfPlayers(z.x + z.w * gem.fx, z.y + z.h * gem.fy, PLAYER_RADIUS + POWER_RADIUS + 8);
      s.powerUps[id] = {
        id,
        kind: gem.kind,
        x: clear.x,
        y: clear.y,
      };
    }
    const pulseId = uid("pow");
    const pulseAt = this.clearOfPlayers(z.x + z.w * 0.18, z.y + z.h * 0.72, PLAYER_RADIUS + POWER_RADIUS + 8);
    s.pulses[pulseId] = {
      id: pulseId,
      kind: "decoy",
      x: pulseAt.x,
      y: pulseAt.y,
      spawnAt: s.now + 0.9,
    };

    const wallCandidates = [
      { fx: 0.72, fy: 0.18 },
      { fx: 0.58, fy: 0.16 },
      { fx: 0.8, fy: 0.28 },
      { fx: 0.5, fy: 0.2 },
    ];
    let placedWall = false;
    for (const spot of wallCandidates) {
      const wall = {
        id: uid("wall"),
        x: z.x + z.w * spot.fx - WALL_WIDTH / 2,
        y: z.y + z.h * spot.fy - WALL_THICKNESS / 2,
        w: WALL_WIDTH,
        h: WALL_THICKNESS,
        expiresAt: s.now + 18,
      };
      this.clampWallToZone(wall);
      if (!this.wallHitsAnyPlayer(wall)) {
        s.walls[wall.id] = wall;
        placedWall = true;
        break;
      }
    }
    if (!placedWall) {
      for (let i = 0; i < 16; i++) {
        const pos = this.randomInZone(40);
        const wall = {
          id: uid("wall"),
          x: pos.x - WALL_WIDTH / 2,
          y: pos.y - WALL_THICKNESS / 2,
          w: WALL_WIDTH,
          h: WALL_THICKNESS,
          expiresAt: s.now + 18,
        };
        this.clampWallToZone(wall);
        if (this.wallHitsAnyPlayer(wall)) continue;
        s.walls[wall.id] = wall;
        break;
      }
    }

    const players = Object.values(s.players);
    const freezeTarget = players.find((p) => !p.isIt && p.isBot) ?? players.find((p) => !p.isIt);
    if (freezeTarget) {
      freezeTarget.frozenUntil = s.now + 14;
      this.clampPlayer(freezeTarget);
    }

    const humans = players.filter((p) => !p.isBot);
    const holders = humans.length ? humans : players.filter((p) => p !== freezeTarget).slice(0, 1);
    for (const holder of holders) {
      holder.powerId = "paver";
      holder.charges = 3;
    }

    s.showcaseUntil = s.now + 7;
    s.nextPowerAt = s.now + 8;
    s.nextShrinkAt = s.now + 1.5;
    s.shrinkEndsAt = 0;
    this.push({ type: "announce", text: "Power-ups in the zone" });
  }

  /** Pin players to all four walls in idle / IT / shield / frozen so art cannot leave the zone. */
  pinArt(opts: { minZone?: boolean } = {}) {
    const s = this.state;
    if (s.phase !== "playing") return;
    const players = Object.values(s.players);
    if (opts.minZone) {
      const min = minZoneSize(players.length);
      s.zone = {
        x: (ARENA_W - min.w) / 2,
        y: (ARENA_H - min.h) / 2,
        w: min.w,
        h: min.h,
      };
      s.fromZone = { ...s.zone };
      s.targetZone = { ...s.zone };
      s.shrinkEndsAt = 0;
    }
    const z = s.zone;
    const sides: Array<"n" | "e" | "s" | "w"> = ["n", "e", "s", "w"];
    const kinds: Array<"idle" | "it" | "shield" | "frozen"> = ["idle", "it", "shield", "frozen"];
    const perWall = Math.max(1, Math.ceil(players.length / 4));
    let itId = "";
    players.forEach((p, i) => {
      const side = sides[i % 4];
      const slot = Math.floor(i / 4);
      const kind = kinds[players.length <= 4 ? i % 4 : slot % 4];
      const along = (slot + 1) / (perWall + 1);
      p.vx = 0;
      p.vy = 0;
      p.ghostUntil = 0;
      p.hasShield = false;
      p.frozenUntil = 0;
      p.isIt = false;
      this.inputs.set(p.id, { x: 0, y: 0, usePower: false });
      if (kind === "frozen") p.frozenUntil = s.now + 30;
      else if (kind === "shield") p.hasShield = true;
      else if (kind === "it" && !itId) {
        p.isIt = true;
        itId = p.id;
      }
      if (side === "n") {
        p.x = z.x + z.w * along;
        p.y = z.y;
      } else if (side === "s") {
        p.x = z.x + z.w * along;
        p.y = z.y + z.h;
      } else if (side === "w") {
        p.x = z.x;
        p.y = z.y + z.h * along;
      } else {
        p.x = z.x + z.w;
        p.y = z.y + z.h * along;
      }
      this.clampPlayer(p);
    });
    if (itId) s.itId = itId;
    else if (players[0]) {
      players[0].isIt = true;
      s.itId = players[0].id;
    }
    s.walls = {};
    s.showcaseUntil = s.now + 8;
    this.constrainBodies();
  }

  tick(dt: number) {
    this.dt = dt;
    this.state.events = [];
    if (this.state.phase !== "playing") {
      this.constrainBodies();
      this.refreshLeaderboard();
      return;
    }
    this.state.now += dt;
    this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
    this.tickZone();
    this.tickPulses();
    this.tickWalls();
    this.tickDecoys(dt);
    this.pruneLootOutsideZone();
    this.keepWallsInZone();
    this.maybeSpawnPower();
    this.thinkBots();
    this.tickPlayers(dt);
    this.resolveTags();
    this.resolvePickups();
    this.constrainBodies();
    this.refreshLeaderboard();
    if (this.state.timeLeft <= 0) this.endRound();
  }

  toPublic(): PublicState {
    const s = this.state;
    const it = s.players[s.itId];
    return {
      code: s.code,
      phase: s.phase,
      now: s.now,
      timeLeft: s.timeLeft,
      roundLength: s.roundLength,
      zone: s.zone,
      targetZone: s.shrinkEndsAt > s.now ? s.targetZone : nextZone(s.zone, Object.keys(s.players).length),
      shrinkIn:
        s.phase === "playing" && s.shrinkEndsAt <= s.now ? Math.max(0, s.nextShrinkAt - s.now) : 0,
      shrinking: s.phase === "playing" && s.shrinkEndsAt > s.now,
      itId: s.itId,
      itName: it?.name ?? "",
      enabledPowers: s.enabledPowers,
      players: Object.values(s.players).map((p) => ({
        id: p.id,
        sessionId: p.sessionId,
        name: p.name,
        avatar: p.avatar,
        tint: p.tint ?? 0,
        x: p.x,
        y: p.y,
        vx: p.vx,
        vy: p.vy,
        isIt: p.id === s.itId,
        isBot: p.isBot,
        score: p.score,
        powerId: p.powerId,
        charges: p.charges,
        ghost: p.ghostUntil > s.now,
        frozen: p.frozenUntil > s.now,
        boosting: p.speedUntil > s.now,
        hasShield: p.hasShield,
      })),
      powerUps: Object.values(s.powerUps),
      pulses: Object.values(s.pulses).map((pulse) => ({
        ...pulse,
        progress: clamp(1 - (pulse.spawnAt - s.now) / POWER_PULSE_WARN, 0, 1),
      })),
      walls: Object.values(s.walls),
      decoys: Object.values(s.decoys),
      leaderboard: s.leaderboard,
    };
  }

  drainEvents(): EngineEvent[] {
    const events = this.state.events;
    this.state.events = [];
    return events;
  }

  private resetRoundKeepPlayers() {
    this.state.now = 0;
    this.state.timeLeft = this.state.roundLength;
    this.state.zone = { ...FULL_ARENA };
    this.state.fromZone = { ...FULL_ARENA };
    this.state.targetZone = { ...FULL_ARENA };
    this.state.shrinkEndsAt = 0;
    this.state.nextShrinkAt = this.state.shrinkInterval;
    this.state.nextPowerAt = 2.5;
    this.state.showcaseUntil = 0;
    this.state.powerUps = {};
    this.state.pulses = {};
    this.state.walls = {};
    this.state.decoys = {};
    this.state.leaderboard = [];
    for (const p of Object.values(this.state.players)) {
      const spawn = this.randomInZone(PLAYER_RADIUS + 8);
      p.x = spawn.x;
      p.y = spawn.y;
      p.vx = 0;
      p.vy = 0;
      p.score = 0;
      p.tags = 0;
      p.powerId = "";
      p.charges = 0;
      p.speedUntil = 0;
      p.ghostUntil = 0;
      p.frozenUntil = 0;
      p.hasShield = false;
      p.lastTaggedAt = -10;
      p.isIt = false;
      this.inputs.set(p.id, { x: 0, y: 0, usePower: false });
    }
    this.constrainBodies();
  }

  private endRound() {
    this.state.phase = "ended";
    this.refreshLeaderboard();
    this.push({ type: "end", itId: this.state.itId });
    const it = this.itName() || "Nobody";
    this.push({ type: "announce", text: `${it} was IT — round over` });
  }

  private itName() {
    return this.state.players[this.state.itId]?.name ?? "";
  }

  private pickIt() {
    const players = Object.values(this.state.players);
    for (const p of players) p.isIt = false;
    if (players.length === 0) {
      this.state.itId = "";
      return;
    }
    const choice = players[Math.floor(this.rand() * players.length)];
    choice.isIt = true;
    this.state.itId = choice.id;
  }

  private passItToNearest(x: number, y: number) {
    const players = Object.values(this.state.players);
    for (const p of players) p.isIt = false;
    if (players.length === 0) {
      this.state.itId = "";
      return;
    }
    let best = players[0];
    let bestD = dist(best.x, best.y, x, y);
    for (const p of players) {
      const d = dist(p.x, p.y, x, y);
      if (d < bestD) {
        best = p;
        bestD = d;
      }
    }
    best.isIt = true;
    this.state.itId = best.id;
    if (this.state.phase === "playing") {
      this.push({ type: "announce", text: `${best.name} is IT` });
    }
  }

  private tickZone() {
    const s = this.state;
    if (s.shrinkEndsAt > s.now) {
      const dur = ZONE_SHRINK_DURATION;
      const t = clamp(1 - (s.shrinkEndsAt - s.now) / dur, 0, 1);
      const eased = t * t * (3 - 2 * t);
      s.zone = lerpRect(s.fromZone, s.targetZone, eased);
    } else if (s.now >= s.nextShrinkAt) {
      s.fromZone = { ...s.zone };
      s.targetZone = nextZone(s.zone, Object.keys(s.players).length);
      s.shrinkEndsAt = s.now + ZONE_SHRINK_DURATION;
      s.nextShrinkAt = s.now + s.shrinkInterval;
      this.push({ type: "shrink" });
    }
    this.constrainBodies();
  }

  private tickPulses() {
    const s = this.state;
    for (const pulse of Object.values(s.pulses)) {
      if (s.now >= pulse.spawnAt) {
        s.powerUps[pulse.id] = { id: pulse.id, kind: pulse.kind, x: pulse.x, y: pulse.y };
        delete s.pulses[pulse.id];
      }
    }
  }

  private tickWalls() {
    const s = this.state;
    for (const wall of Object.values(s.walls)) {
      if (s.now >= wall.expiresAt) delete s.walls[wall.id];
    }
  }

  private tickDecoys(dt: number) {
    const s = this.state;
    for (const decoy of Object.values(s.decoys)) {
      if (s.now >= decoy.expiresAt) {
        delete s.decoys[decoy.id];
        continue;
      }
      decoy.x += decoy.vx * dt;
      decoy.y += decoy.vy * dt;
      decoy.vx *= 0.985;
      decoy.vy *= 0.985;
      const z = s.zone;
      const next = clampToZoneArt(decoy.x, decoy.y, z);
      decoy.x = next.x;
      decoy.y = next.y;
    }
  }

  private pruneLootOutsideZone() {
    const z = this.state.zone;
    const inside = (x: number, y: number, rad: number) =>
      x - rad >= z.x && x + rad <= z.x + z.w && y - rad >= z.y && y + rad <= z.y + z.h;
    for (const [id, item] of Object.entries(this.state.powerUps)) {
      if (!inside(item.x, item.y, POWER_RADIUS)) delete this.state.powerUps[id];
    }
    for (const [id, pulse] of Object.entries(this.state.pulses)) {
      if (!inside(pulse.x, pulse.y, POWER_RADIUS)) delete this.state.pulses[id];
    }
  }

  private maybeSpawnPower() {
    const s = this.state;
    if (s.now < s.nextPowerAt) return;
    s.nextPowerAt = s.now + POWER_SPAWN_MIN + this.rand() * (POWER_SPAWN_MAX - POWER_SPAWN_MIN);
    const kind = pickWeightedPower(s.enabledPowers, this.rand);
    if (!kind) return;
    if (Object.keys(s.powerUps).length + Object.keys(s.pulses).length >= POWER_MAX_ON_BOARD) return;
    const guess = this.randomInZone(PLAYER_RADIUS + POWER_RADIUS);
    const pos = this.clearOfPlayers(guess.x, guess.y, PLAYER_RADIUS + POWER_RADIUS + 8);
    const id = uid("pow");
    s.pulses[id] = { id, kind, x: pos.x, y: pos.y, spawnAt: s.now + POWER_PULSE_WARN };
  }

  private tickPlayers(dt: number) {
    const s = this.state;
    for (const p of Object.values(s.players)) {
      const input = this.inputs.get(p.id) ?? { x: 0, y: 0, usePower: false };
      if (input.usePower) {
        this.usePower(p);
        this.inputs.set(p.id, { ...input, usePower: false });
      }
      const frozen = p.frozenUntil > s.now;
      let ix = frozen ? 0 : input.x;
      let iy = frozen ? 0 : input.y;
      const mag = Math.hypot(ix, iy);
      if (mag > 1) {
        ix /= mag;
        iy /= mag;
      }
      let speed = PLAYER_SPEED;
      if (p.speedUntil > s.now) speed *= SPEEDSTER_MULTIPLIER;
      p.vx = ix * speed;
      p.vy = iy * speed;
      if (mag > 0.15) {
        p.facingX = ix / (mag || 1);
        p.facingY = iy / (mag || 1);
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.isIt) p.score += dt;
      if (p.ghostUntil <= s.now) this.collideWalls(p);
      this.clampPlayer(p);
    }
  }

  private constrainBodies() {
    const list = Object.values(this.state.players);
    if (list.length === 0) return;
    const now = this.state.now;
    for (const p of list) {
      if (p.ghostUntil <= now) this.collideWalls(p);
      this.clampPlayer(p);
    }
    const origin = new Map(list.map((p) => [p.id, { x: p.x, y: p.y }]));
    const minDist = PLAYER_SEPARATION;
    for (let iter = 0; iter < SEPARATION_ITERS; iter++) {
      const corr = new Map(list.map((p) => [p.id, { x: 0, y: 0 }]));
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        if (a.ghostUntil > now) continue;
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          if (b.ghostUntil > now) continue;
          let dx = a.x - b.x;
          let dy = a.y - b.y;
          let d = Math.hypot(dx, dy);
          if (d < 1e-4) {
            dx = ((i + iter) % 2 === 0 ? 1 : -1) * 0.85;
            dy = ((j + iter) % 2 === 0 ? 1 : -1) * 0.15;
            d = Math.hypot(dx, dy);
          }
          if (d >= minDist) continue;
          const push = ((minDist - d) / 2) * SEPARATION_STIFFNESS;
          const ux = dx / d;
          const uy = dy / d;
          const ca = corr.get(a.id)!;
          const cb = corr.get(b.id)!;
          ca.x += ux * push;
          ca.y += uy * push;
          cb.x -= ux * push;
          cb.y -= uy * push;
        }
      }
      for (const p of list) {
        const c = corr.get(p.id)!;
        p.x += c.x;
        p.y += c.y;
        if (p.ghostUntil <= now) this.collideWalls(p);
        this.clampPlayer(p);
      }
    }
    const cap = MAX_DISPLACE_PER_SEC * this.dt;
    for (const p of list) {
      const o = origin.get(p.id)!;
      const dx = p.x - o.x;
      const dy = p.y - o.y;
      const d = Math.hypot(dx, dy);
      if (d > cap && d > 1e-6) {
        const s = cap / d;
        p.x = o.x + dx * s;
        p.y = o.y + dy * s;
      }
      if (p.ghostUntil <= now) this.collideWalls(p);
      this.clampPlayer(p);
    }
  }

  private collideWalls(p: EnginePlayer) {
    const z = this.state.zone;
    for (let pass = 0; pass < 3; pass++) {
      for (const wall of Object.values(this.state.walls)) {
        const next = separateAabbFromAabb(p.x, p.y, ART_INSET, wall);
        const c = clampToZoneArt(next.x, next.y, z);
        p.x = c.x;
        p.y = c.y;
      }
    }
  }

  private keepWallsInZone() {
    for (const [id, wall] of Object.entries(this.state.walls)) {
      if (!this.clampWallToZone(wall)) delete this.state.walls[id];
    }
  }

  private clampWallToZone(wall: { x: number; y: number; w: number; h: number }) {
    const z = this.state.zone;
    const maxX = z.x + z.w - ART_INSET.right - wall.w;
    const maxY = z.y + z.h - ART_INSET.bottom - wall.h;
    const minX = z.x + ART_INSET.left;
    const minY = z.y + ART_INSET.top;
    if (maxX < minX || maxY < minY) return false;
    wall.x = clamp(wall.x, minX, maxX);
    wall.y = clamp(wall.y, minY, maxY);
    return true;
  }

  private clampPlayer(p: EnginePlayer) {
    const next = clampToZoneArt(p.x, p.y, this.state.zone);
    p.x = next.x;
    p.y = next.y;
  }

  private resolveTags() {
    const s = this.state;
    const it = s.players[s.itId];
    if (!it || it.ghostUntil > s.now) return;
    if (s.now - it.lastTaggedAt < TAG_COOLDOWN) return;
    for (const p of Object.values(s.players)) {
      if (p.id === it.id) continue;
      if (p.ghostUntil > s.now) continue;
      if (dist(it.x, it.y, p.x, p.y) > TAG_DISTANCE) continue;
      if (p.hasShield) {
        p.hasShield = false;
        it.lastTaggedAt = s.now;
        p.lastTaggedAt = s.now;
        this.push({ type: "tag", fromId: it.id, toId: p.id, blocked: true });
        this.push({ type: "announce", text: `${p.name} blocked the tag` });
        return;
      }
      it.isIt = false;
      p.isIt = true;
      p.tags += 1;
      s.itId = p.id;
      p.lastTaggedAt = s.now;
      it.lastTaggedAt = s.now;
      this.push({ type: "tag", fromId: it.id, toId: p.id });
      this.push({ type: "announce", text: `${p.name} is IT` });
      return;
    }
  }

  private resolvePickups() {
    const s = this.state;
    if (s.now < s.showcaseUntil) return;
    for (const p of Object.values(s.players)) {
      for (const pow of Object.values(s.powerUps)) {
        if (dist(p.x, p.y, pow.x, pow.y) > PICKUP_DISTANCE) continue;
        const def = POWER_UPS[pow.kind];
        p.powerId = pow.kind;
        p.charges = def.charges;
        delete s.powerUps[pow.id];
        this.push({ type: "pickup", playerId: p.id, kind: pow.kind });
        break;
      }
    }
  }

  private usePower(p: EnginePlayer) {
    if (!p.powerId || p.charges <= 0) return;
    if (p.frozenUntil > this.state.now) return;
    const kind = p.powerId;
    const used = this.applyPower(p, kind);
    if (!used) return;
    p.charges -= 1;
    this.push({ type: "power", playerId: p.id, kind });
    if (p.charges <= 0) {
      p.powerId = "";
      p.charges = 0;
    }
  }

  private applyPower(p: EnginePlayer, kind: PowerId): boolean {
    const s = this.state;
    switch (kind) {
      case "speedster":
        p.speedUntil = s.now + SPEED_DURATION;
        return true;
      case "ghost":
        p.ghostUntil = s.now + GHOST_DURATION;
        return true;
      case "shield":
        p.hasShield = true;
        return true;
      case "paver":
        return this.placeWall(p);
      case "decoy": {
        const n = normalize(p.facingX, p.facingY);
        const id = uid("dcy");
        const decoy: EngineDecoy = {
          id,
          ownerId: p.id,
          name: p.name,
          avatar: p.avatar,
          x: p.x,
          y: p.y,
          vx: n.x * PLAYER_SPEED * 0.72,
          vy: n.y * PLAYER_SPEED * 0.72,
          expiresAt: s.now + DECOY_DURATION,
        };
        s.decoys[id] = decoy;
        return true;
      }
      case "freezer": {
        let best: EnginePlayer | null = null;
        let bestD = FREEZE_RANGE;
        for (const other of Object.values(s.players)) {
          if (other.id === p.id) continue;
          const d = dist(p.x, p.y, other.x, other.y);
          if (d < bestD) {
            bestD = d;
            best = other;
          }
        }
        if (!best) return true;
        best.frozenUntil = s.now + FREEZE_DURATION;
        return true;
      }
      case "swapper": {
        const others = Object.values(s.players).filter((o) => o.id !== p.id);
        if (others.length === 0) return true;
        const target = others[Math.floor(this.rand() * others.length)];
        const x = p.x;
        const y = p.y;
        p.x = target.x;
        p.y = target.y;
        target.x = x;
        target.y = y;
        this.clampPlayer(p);
        this.clampPlayer(target);
        if (p.ghostUntil <= s.now) this.collideWalls(p);
        if (target.ghostUntil <= s.now) this.collideWalls(target);
        return true;
      }
      default:
        return false;
    }
  }

  private placeWall(p: EnginePlayer): boolean {
    const n = normalize(p.facingX || 1, p.facingY);
    const dir = n.x === 0 && n.y === 0 ? { x: 1, y: 0 } : n;
    const horizontal = Math.abs(dir.x) < Math.abs(dir.y);
    const w = horizontal ? WALL_WIDTH : WALL_THICKNESS;
    const h = horizontal ? WALL_THICKNESS : WALL_WIDTH;
    const z = this.state.zone;
    for (const extra of [0, 28, 56, 84, -28, 112]) {
      const reach = WALL_PLACE_OFFSET + extra;
      const cx = p.x + dir.x * reach;
      const cy = p.y + dir.y * reach;
      const wall: EngineWall = {
        id: uid("wall"),
        x: cx - w / 2,
        y: cy - h / 2,
        w,
        h,
        expiresAt: this.state.now + WALL_LIFETIME,
      };
      if (!this.clampWallToZone(wall)) continue;
      if (this.wallHitsAnyPlayer(wall)) continue;
      this.state.walls[wall.id] = wall;
      return true;
    }
    return false;
  }

  private wallHitsAnyPlayer(wall: { x: number; y: number; w: number; h: number }) {
    for (const p of Object.values(this.state.players)) {
      if (p.ghostUntil > this.state.now) continue;
      const pushed = separateAabbFromAabb(p.x, p.y, ART_INSET, wall);
      if (pushed.x !== p.x || pushed.y !== p.y) return true;
    }
    return false;
  }

  private thinkBots() {
    const s = this.state;
    const it = s.players[s.itId];
    for (const bot of Object.values(s.players)) {
      if (!bot.isBot) continue;
      if (s.now < bot.thinkAt) continue;
      bot.thinkAt = s.now + BOT_THINK_INTERVAL * (0.7 + this.rand() * 0.6);
      const input = this.pickBotInput(bot, it);
      this.inputs.set(bot.id, input);
    }
  }

  private botHome(bot: EnginePlayer) {
    const z = this.state.zone;
    const orbit = bot.botOrbit || 0.55;
    const t = (bot.botPhase || 0) + this.state.now * (bot.botSpin || 0) * 0.15;
    const rx = Math.max(36, (z.w / 2 - (ART_INSET.left + ART_INSET.right) / 2) * orbit);
    const ry = Math.max(36, (z.h / 2 - (ART_INSET.top + ART_INSET.bottom) / 2) * orbit);
    const wobble = Math.sin(this.state.now * (0.7 + orbit) + (bot.botPhase || 0)) * 28;
    return {
      x: z.x + z.w / 2 + Math.cos(t) * rx + wobble * 0.4,
      y: z.y + z.h / 2 + Math.sin(t) * ry + wobble * 0.25,
    };
  }

  private pickBotInput(bot: EnginePlayer, it: EnginePlayer | undefined): InputState {
    const s = this.state;
    let tx = bot.x;
    let ty = bot.y;
    let usePower = false;
    const home = this.botHome(bot);
    const speed = bot.botSpeed || 0.85;
    const phase = bot.botPhase || 0;

    if (bot.isIt) {
      let nearest: EnginePlayer | null = null;
      let nearestD = Infinity;
      for (const p of Object.values(s.players)) {
        if (p.id === bot.id || p.ghostUntil > s.now) continue;
        const d = dist(bot.x, bot.y, p.x, p.y);
        if (d < nearestD) {
          nearestD = d;
          nearest = p;
        }
      }
      if (nearest) {
        const away = normalize(nearest.x - bot.x, nearest.y - bot.y);
        const standoff = Math.max(TAG_DISTANCE + 8, PLAYER_SEPARATION + 12);
        const side = phase * 1.7;
        if (nearestD < standoff) {
          tx = bot.x - away.x * 40 + -away.y * (40 + Math.cos(side) * 50);
          ty = bot.y - away.y * 40 + away.x * (40 + Math.sin(side) * 50);
        } else {
          tx = nearest.x - away.x * standoff + Math.cos(side) * 36;
          ty = nearest.y - away.y * standoff + Math.sin(side) * 36;
        }
      }
      if (bot.powerId === "speedster" && nearestD < 420) usePower = this.rand() < 0.45;
      if (bot.powerId === "ghost" && nearestD > 80) usePower = this.rand() < 0.2;
    } else if (it) {
      const dIt = dist(bot.x, bot.y, it.x, it.y);
      if (dIt < 280) {
        const away = normalize(bot.x - it.x, bot.y - it.y);
        const ang = phase + s.now * (bot.botSpin || 0);
        const rad = 70 + (bot.botOrbit || 0.5) * 260;
        const scatterX = it.x + Math.cos(ang) * rad;
        const scatterY = it.y + Math.sin(ang) * rad;
        tx = scatterX * 0.42 + home.x * 0.28 + (bot.x + away.x * 180) * 0.3;
        ty = scatterY * 0.42 + home.y * 0.28 + (bot.y + away.y * 180) * 0.3;
        if (bot.powerId === "ghost" && dIt < 140) usePower = true;
        if (bot.powerId === "speedster" && dIt < 200) usePower = this.rand() < 0.5;
        if (bot.powerId === "shield" && dIt < 90) usePower = true;
        if (bot.powerId === "swapper" && dIt < 120) usePower = this.rand() < 0.4;
        if (bot.powerId === "decoy" && dIt < 160) usePower = this.rand() < 0.35;
        if (bot.powerId === "paver" && dIt < 150) usePower = this.rand() < 0.4;
        if (bot.powerId === "freezer" && dIt < FREEZE_RANGE) usePower = true;
      } else {
        const loot = this.nearestLoot(bot);
        const myLoot = loot && loot.d < 380 && this.nearestLootOwner(loot) === bot.id;
        if (myLoot && loot) {
          tx = loot.x;
          ty = loot.y;
        } else {
          bot.wanderX = home.x;
          bot.wanderY = home.y;
          tx = home.x;
          ty = home.y;
        }
      }
    } else {
      tx = home.x;
      ty = home.y;
    }

    tx += Math.sin(s.now * (0.55 + speed) + phase) * 54;
    ty += Math.cos(s.now * (0.4 + (bot.botOrbit || 0.5)) + phase) * 48;

    const dir = normalize(tx - bot.x, ty - bot.y);
    const jitter = 0.26;
    return {
      x: clamp((dir.x + (this.rand() - 0.5) * jitter) * speed, -1, 1),
      y: clamp((dir.y + (this.rand() - 0.5) * jitter) * speed, -1, 1),
      usePower,
    };
  }

  private nearestLootOwner(loot: { x: number; y: number }) {
    let bestId = "";
    let bestD = Infinity;
    for (const p of Object.values(this.state.players)) {
      if (p.isIt) continue;
      const d = dist(p.x, p.y, loot.x, loot.y);
      if (d < bestD) {
        bestD = d;
        bestId = p.id;
      }
    }
    return bestId;
  }

  private nearestLoot(bot: EnginePlayer) {
    let best: { x: number; y: number; d: number } | null = null;
    for (const p of Object.values(this.state.powerUps)) {
      const d = dist(bot.x, bot.y, p.x, p.y);
      if (!best || d < best.d) best = { x: p.x, y: p.y, d };
    }
    return best;
  }

  private randomInZone(pad: number) {
    const z = this.state.zone;
    return {
      x: z.x + pad + this.rand() * Math.max(8, z.w - pad * 2),
      y: z.y + pad + this.rand() * Math.max(8, z.h - pad * 2),
    };
  }

  private clearOfPlayers(x: number, y: number, minDist: number) {
    const first = { x, y };
    for (let i = 0; i < 28; i++) {
      const pos = i === 0 ? first : this.randomInZone(PLAYER_RADIUS + POWER_RADIUS);
      let ok = true;
      for (const p of Object.values(this.state.players)) {
        if (dist(p.x, p.y, pos.x, pos.y) < minDist) {
          ok = false;
          break;
        }
      }
      if (ok) return pos;
    }
    return first;
  }

  private refreshLeaderboard() {
    this.state.leaderboard = Object.values(this.state.players)
      .sort((a, b) => a.score - b.score || a.tags - b.tags || a.name.localeCompare(b.name))
      .map(
        (p): LeaderboardRow => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          tint: p.tint ?? 0,
          score: p.score,
          isIt: p.id === this.state.itId,
          isBot: p.isBot,
        }),
      );
  }

  private push(event: EngineEvent) {
    this.state.events.push(event);
    this.seq += 1;
  }
}

function nextZone(zone: Rect, playerCount: number): Rect {
  const min = minZoneSize(playerCount);
  const w = Math.max(min.w, zone.w * 0.78);
  const h = Math.max(min.h, zone.h * 0.78);
  const cx = zone.x + zone.w / 2;
  const cy = zone.y + zone.h / 2;
  return {
    x: clamp(cx - w / 2, 0, ARENA_W - w),
    y: clamp(cy - h / 2, 0, ARENA_H - h),
    w,
    h,
  };
}

function sanitizeName(name: string): string {
  const trimmed = name.replace(/\s+/g, " ").trim().slice(0, 16);
  return trimmed || "Player";
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function phaseStatus(state: { phase: string; shrinking: boolean }): string {
  if (state.phase === "lobby") return "lobby";
  if (state.phase === "ended") return "ended";
  if (state.phase === "paused") return "paused";
  if (state.shrinking) return "zone shrinking";
  return "playing";
}
