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
  PLAYER_SPEED,
  POWER_PULSE_WARN,
  POWER_SPAWN_MAX,
  POWER_SPAWN_MIN,
  SPEED_DURATION,
  SPEEDSTER_MULTIPLIER,
  TAG_COOLDOWN,
  TAG_DISTANCE,
  WALL_LIFETIME,
  WALL_PLACE_OFFSET,
  WALL_THICKNESS,
  WALL_WIDTH,
  ZONE_INSET,
  ZONE_MIN_H,
  ZONE_MIN_W,
  ZONE_SHRINK_DURATION,
} from "./constants";
import { AVATARS } from "./avatars";
import { pickWeightedPower, POWER_UPS, type PowerId } from "./powerups";
import { clamp, dist, lerp, lerpRect, makeRoomCode, normalize, uid } from "./ids";
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
    avatar: string;
    isBot?: boolean;
  }): EnginePlayer {
    const players = Object.values(this.state.players);
    if (players.length >= MAX_PLAYERS) {
      throw new Error("Room is full");
    }
    const id = opts.id ?? uid("p");
    const spawn = this.randomInZone(PLAYER_RADIUS + 8);
    const player: EnginePlayer = {
      id,
      sessionId: opts.sessionId ?? "",
      name: sanitizeName(opts.name),
      avatar: opts.avatar,
      x: spawn.x,
      y: spawn.y,
      vx: 0,
      vy: 0,
      facingX: 1,
      facingY: 0,
      isIt: false,
      isBot: Boolean(opts.isBot),
      score: 0,
      powerId: "",
      charges: 0,
      speedUntil: 0,
      ghostUntil: 0,
      frozenUntil: 0,
      hasShield: false,
      lastTaggedAt: -10,
      thinkAt: 0,
    };
    this.state.players[id] = player;
    this.inputs.set(id, { x: 0, y: 0, usePower: false });
    return player;
  }

  removePlayer(id: string) {
    const wasIt = this.state.itId === id;
    delete this.state.players[id];
    this.inputs.delete(id);
    if (wasIt) this.pickIt();
  }

  spawnBots(count: number) {
    const existingBots = Object.values(this.state.players).filter((p) => p.isBot).length;
    const roomLeft = MAX_PLAYERS - Object.keys(this.state.players).length;
    const n = Math.max(0, Math.min(count, roomLeft, 24 - existingBots));
    for (let i = 0; i < n; i++) {
      const avatar = AVATARS[Math.floor(this.rand() * AVATARS.length)];
      const name = BOT_NAMES[(existingBots + i) % BOT_NAMES.length];
      this.addPlayer({
        name: `${name}`,
        avatar: avatar.id,
        isBot: true,
        id: uid("bot"),
      });
    }
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
    for (const p of Object.values(this.state.players)) p.isIt = false;
  }

  tick(dt: number) {
    this.state.events = [];
    if (this.state.phase !== "playing") {
      this.refreshLeaderboard();
      return;
    }
    this.state.now += dt;
    this.state.timeLeft = Math.max(0, this.state.timeLeft - dt);
    this.tickZone();
    this.tickPulses();
    this.tickWalls();
    this.tickDecoys(dt);
    this.maybeSpawnPower();
    this.thinkBots();
    this.tickPlayers(dt);
    this.resolveTags();
    this.resolvePickups();
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
      itId: s.itId,
      itName: it?.name ?? "",
      enabledPowers: s.enabledPowers,
      players: Object.values(s.players).map((p) => ({
        id: p.id,
        sessionId: p.sessionId,
        name: p.name,
        avatar: p.avatar,
        x: p.x,
        y: p.y,
        vx: p.vx,
        vy: p.vy,
        isIt: p.isIt,
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

  private tickZone() {
    const s = this.state;
    if (s.shrinkEndsAt > s.now) {
      const dur = ZONE_SHRINK_DURATION;
      const t = clamp(1 - (s.shrinkEndsAt - s.now) / dur, 0, 1);
      const eased = t * t * (3 - 2 * t);
      s.zone = lerpRect(s.fromZone, s.targetZone, eased);
    } else if (s.now >= s.nextShrinkAt) {
      s.fromZone = { ...s.zone };
      s.targetZone = nextZone(s.zone);
      s.shrinkEndsAt = s.now + ZONE_SHRINK_DURATION;
      s.nextShrinkAt = s.now + s.shrinkInterval;
      this.push({ type: "shrink" });
    }
    for (const p of Object.values(s.players)) this.clampPlayer(p);
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
      decoy.x = clamp(decoy.x, z.x + 16, z.x + z.w - 16);
      decoy.y = clamp(decoy.y, z.y + 16, z.y + z.h - 16);
    }
  }

  private maybeSpawnPower() {
    const s = this.state;
    if (s.now < s.nextPowerAt) return;
    s.nextPowerAt = s.now + POWER_SPAWN_MIN + this.rand() * (POWER_SPAWN_MAX - POWER_SPAWN_MIN);
    const kind = pickWeightedPower(s.enabledPowers, this.rand);
    if (!kind) return;
    if (Object.keys(s.powerUps).length + Object.keys(s.pulses).length >= 8) return;
    const pos = this.randomInZone(36);
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
      if (p.ghostUntil <= s.now) this.collideWalls(p);
      this.clampPlayer(p);
      if (!p.isIt) p.score += dt;
    }
  }

  private collideWalls(p: EnginePlayer) {
    for (const wall of Object.values(this.state.walls)) {
      const nearestX = clamp(p.x, wall.x, wall.x + wall.w);
      const nearestY = clamp(p.y, wall.y, wall.y + wall.h);
      const dx = p.x - nearestX;
      const dy = p.y - nearestY;
      const d2 = dx * dx + dy * dy;
      const r = PLAYER_RADIUS;
      if (d2 >= r * r) continue;
      const d = Math.sqrt(d2) || 0.001;
      p.x = nearestX + (dx / d) * r;
      p.y = nearestY + (dy / d) * r;
    }
  }

  private clampPlayer(p: EnginePlayer) {
    const z = this.state.zone;
    p.x = clamp(p.x, z.x + ZONE_INSET, z.x + z.w - ZONE_INSET);
    p.y = clamp(p.y, z.y + ZONE_INSET, z.y + z.h - ZONE_INSET);
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
        this.placeWall(p);
        return true;
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
        return true;
      }
      default:
        return false;
    }
  }

  private placeWall(p: EnginePlayer) {
    const n = normalize(p.facingX || 1, p.facingY);
    const cx = p.x + n.x * WALL_PLACE_OFFSET;
    const cy = p.y + n.y * WALL_PLACE_OFFSET;
    const horizontal = Math.abs(n.x) < Math.abs(n.y);
    const w = horizontal ? WALL_WIDTH : WALL_THICKNESS;
    const h = horizontal ? WALL_THICKNESS : WALL_WIDTH;
    const wall: EngineWall = {
      id: uid("wall"),
      x: cx - w / 2,
      y: cy - h / 2,
      w,
      h,
      expiresAt: this.state.now + WALL_LIFETIME,
    };
    const z = this.state.zone;
    wall.x = clamp(wall.x, z.x, z.x + z.w - wall.w);
    wall.y = clamp(wall.y, z.y, z.y + z.h - wall.h);
    this.state.walls[wall.id] = wall;
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

  private pickBotInput(bot: EnginePlayer, it: EnginePlayer | undefined): InputState {
    const s = this.state;
    let tx = bot.x;
    let ty = bot.y;
    let usePower = false;

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
        tx = nearest.x;
        ty = nearest.y;
      }
      if (bot.powerId === "speedster" && nearestD < 420) usePower = this.rand() < 0.45;
      if (bot.powerId === "ghost" && nearestD > 80) usePower = this.rand() < 0.2;
    } else if (it) {
      const dIt = dist(bot.x, bot.y, it.x, it.y);
      if (dIt < 260) {
        tx = bot.x + (bot.x - it.x);
        ty = bot.y + (bot.y - it.y);
        if (bot.powerId === "ghost" && dIt < 140) usePower = true;
        if (bot.powerId === "speedster" && dIt < 200) usePower = this.rand() < 0.5;
        if (bot.powerId === "shield" && dIt < 90) usePower = true;
        if (bot.powerId === "swapper" && dIt < 120) usePower = this.rand() < 0.4;
        if (bot.powerId === "decoy" && dIt < 160) usePower = this.rand() < 0.35;
        if (bot.powerId === "paver" && dIt < 150) usePower = this.rand() < 0.4;
        if (bot.powerId === "freezer" && dIt < FREEZE_RANGE) usePower = true;
      } else {
        const loot = this.nearestLoot(bot);
        if (loot) {
          tx = loot.x;
          ty = loot.y;
        } else {
          tx = bot.x + (this.rand() - 0.5) * 400;
          ty = bot.y + (this.rand() - 0.5) * 400;
        }
      }
    }

    const dir = normalize(tx - bot.x, ty - bot.y);
    const jitter = 0.18;
    return {
      x: clamp(dir.x + (this.rand() - 0.5) * jitter, -1, 1),
      y: clamp(dir.y + (this.rand() - 0.5) * jitter, -1, 1),
      usePower,
    };
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

  private refreshLeaderboard() {
    this.state.leaderboard = Object.values(this.state.players)
      .map(
        (p): LeaderboardRow => ({
          id: p.id,
          name: p.name,
          avatar: p.avatar,
          score: p.score,
          isIt: p.isIt,
          isBot: p.isBot,
        }),
      )
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  }

  private push(event: EngineEvent) {
    this.state.events.push(event);
    this.seq += 1;
  }
}

function nextZone(zone: Rect): Rect {
  const cx = zone.x + zone.w / 2;
  const cy = zone.y + zone.h / 2;
  const w = Math.max(ZONE_MIN_W, zone.w * 0.78);
  const h = Math.max(ZONE_MIN_H, zone.h * 0.78);
  return { x: cx - w / 2, y: cy - h / 2, w, h };
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
