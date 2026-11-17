import { Client, Room } from "colyseus";
import {
  MAX_PLAYERS,
  POWER_IDS,
  TagEngine,
  isPowerId,
  type PowerId,
  type PublicState,
} from "@inkt/shared";
import { verifyAdminToken } from "../auth/verifyAuth0.js";
import {
  DecoyState,
  GameState,
  PlayerState,
  PowerUpState,
  PulseState,
  ScoreRow,
  WallState,
} from "../schema/state.js";

type JoinOptions = {
  role?: "admin" | "player" | "spectator";
  accessToken?: string;
  name?: string;
  avatar?: string;
  roundLength?: number;
  shrinkInterval?: number;
  enabledPowers?: string[];
  bots?: number;
};

type ClientAuth = {
  role: "admin" | "player" | "spectator";
  sub?: string;
};

export class TagRoom extends Room<{ state: GameState }> {
  maxClients = 80;
  patchRate = 50;
  autoDispose = true;
  state = new GameState();
  engine!: TagEngine;
  adminSub = "";

  async onCreate(options: JoinOptions) {
    const admin = await verifyAdminToken(options.accessToken);
    this.adminSub = admin.sub;

    const enabled = normalizePowers(options.enabledPowers);
    this.engine = new TagEngine({
      roundLength: options.roundLength,
      shrinkInterval: options.shrinkInterval,
      enabledPowers: enabled,
    });
    this.roomId = this.engine.state.code;
    this.maxClients = MAX_PLAYERS + 16;
    this.setMetadata({ code: this.engine.state.code, adminSub: admin.sub });
    this.sync();

    if (options.bots && options.bots > 0) {
      this.engine.spawnBots(Math.floor(options.bots));
      this.sync();
    }

    this.setFixedTimestep((ctx) => this.simulate(ctx.dtMs), 20);

    this.onMessage("input", (client, message: { x?: number; y?: number }) => {
      const player = this.playerFor(client);
      if (!player) return;
      this.engine.setInput(player.id, {
        x: Number(message?.x) || 0,
        y: Number(message?.y) || 0,
      });
    });

    this.onMessage("usePower", (client) => {
      const player = this.playerFor(client);
      if (!player) return;
      const cur = this.engine.inputs.get(player.id) ?? { x: 0, y: 0, usePower: false };
      this.engine.setInput(player.id, { ...cur, usePower: true });
    });

    this.onMessage("admin", (client, message: { action?: string; [k: string]: unknown }) => {
      if (client.auth?.role !== "admin") return;
      this.handleAdmin(message).catch((err) => {
        client.send("error", { message: err instanceof Error ? err.message : "Admin action failed" });
      });
    });
  }

  async onAuth(_client: Client, options: JoinOptions): Promise<ClientAuth> {
    const role = options.role ?? "player";
    if (role === "admin") {
      const admin = await verifyAdminToken(options.accessToken);
      if (this.adminSub && admin.sub !== this.adminSub && admin.mode !== "dev") {
        throw new Error("This room belongs to another admin");
      }
      return { role: "admin", sub: admin.sub };
    }
    if (role === "spectator") {
      return { role: "spectator" };
    }
    const name = String(options.name ?? "").trim();
    if (!name) throw new Error("Name is required");
    return { role: "player" };
  }

  onJoin(client: Client, options: JoinOptions, auth: ClientAuth) {
    client.userData = { role: auth.role };
    if (auth.role !== "player") return;
    const existing = Object.values(this.engine.state.players).find((p) => p.sessionId === client.sessionId);
    if (existing) return;
    this.engine.addPlayer({
      sessionId: client.sessionId,
      name: String(options.name ?? "Player"),
      avatar: String(options.avatar ?? "bolt"),
    });
    this.sync();
  }

  onLeave(client: Client) {
    const player = this.playerFor(client);
    if (player && this.engine.state.phase === "lobby") {
      this.engine.removePlayer(player.id);
      this.sync();
    } else if (player) {
      player.sessionId = "";
    }
  }

  private async handleAdmin(message: { action?: string; [k: string]: unknown }) {
    const action = message.action;
    switch (action) {
      case "start":
        this.engine.start();
        break;
      case "pause":
        this.engine.pause();
        break;
      case "resume":
        this.engine.resume();
        break;
      case "reset":
        this.engine.reset();
        break;
      case "config":
        this.engine.configure({
          roundLength: num(message.roundLength),
          shrinkInterval: num(message.shrinkInterval),
          enabledPowers: normalizePowers(message.enabledPowers as string[] | undefined),
        });
        break;
      case "spawnBots":
        this.engine.spawnBots(Math.floor(num(message.count) ?? 8));
        break;
      default:
        throw new Error(`Unknown admin action: ${action}`);
    }
    this.sync();
  }

  private simulate(ms: number) {
    this.engine.tick(ms / 1000);
    const events = this.engine.state.events;
    this.sync();
    for (const event of events) {
      this.broadcast("fx", event);
    }
  }

  private playerFor(client: Client) {
    return Object.values(this.engine.state.players).find((p) => p.sessionId === client.sessionId);
  }

  private sync() {
    applyPublic(this.state, this.engine.toPublic());
  }
}

function num(value: unknown): number | undefined {
  if (value == null || value === "") return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function normalizePowers(list: string[] | undefined): PowerId[] | undefined {
  if (!list) return undefined;
  const enabled = list.filter(isPowerId);
  return enabled.length ? enabled : [...POWER_IDS];
}

function applyPublic(state: GameState, pub: PublicState) {
  state.code = pub.code;
  state.phase = pub.phase;
  state.now = pub.now;
  state.timeLeft = pub.timeLeft;
  state.roundLength = pub.roundLength;
  state.zoneX = pub.zone.x;
  state.zoneY = pub.zone.y;
  state.zoneW = pub.zone.w;
  state.zoneH = pub.zone.h;
  state.itId = pub.itId;
  state.itName = pub.itName;

  const want = new Set(pub.enabledPowers);
  for (let i = state.enabledPowers.length - 1; i >= 0; i--) {
    if (!want.has(state.enabledPowers[i] as PowerId)) state.enabledPowers.splice(i, 1);
  }
  for (const id of pub.enabledPowers) {
    if (!state.enabledPowers.includes(id)) state.enabledPowers.push(id);
  }

  syncMap(state.players, pub.players, (row) => row.id, (row) => {
    const s = new PlayerState();
    s.id = row.id;
    return s;
  }, (s, row) => {
    s.sessionId = row.sessionId;
    s.name = row.name;
    s.avatar = row.avatar;
    s.x = row.x;
    s.y = row.y;
    s.vx = row.vx;
    s.vy = row.vy;
    s.isIt = row.isIt;
    s.isBot = row.isBot;
    s.score = row.score;
    s.powerId = row.powerId;
    s.charges = row.charges;
    s.ghost = row.ghost;
    s.frozen = row.frozen;
    s.boosting = row.boosting;
    s.hasShield = row.hasShield;
  });

  syncMap(state.powerUps, pub.powerUps, (row) => row.id, (row) => {
    const s = new PowerUpState();
    s.id = row.id;
    return s;
  }, (s, row) => {
    s.kind = row.kind;
    s.x = row.x;
    s.y = row.y;
  });

  syncMap(state.pulses, pub.pulses, (row) => row.id, (row) => {
    const s = new PulseState();
    s.id = row.id;
    return s;
  }, (s, row) => {
    s.kind = row.kind;
    s.x = row.x;
    s.y = row.y;
    s.progress = row.progress;
  });

  syncMap(state.walls, pub.walls, (row) => row.id, (row) => {
    const s = new WallState();
    s.id = row.id;
    return s;
  }, (s, row) => {
    s.x = row.x;
    s.y = row.y;
    s.w = row.w;
    s.h = row.h;
  });

  syncMap(state.decoys, pub.decoys, (row) => row.id, (row) => {
    const s = new DecoyState();
    s.id = row.id;
    return s;
  }, (s, row) => {
    s.ownerId = row.ownerId;
    s.name = row.name;
    s.avatar = row.avatar;
    s.x = row.x;
    s.y = row.y;
  });

  state.leaderboard.clear();
  for (const row of pub.leaderboard) {
    const s = new ScoreRow();
    s.id = row.id;
    s.name = row.name;
    s.avatar = row.avatar;
    s.score = row.score;
    s.isIt = row.isIt;
    s.isBot = row.isBot;
    state.leaderboard.push(s);
  }
}

function syncMap<S extends { id: string }, T extends { id: string }>(
  map: { keys(): IterableIterator<string>; get(key: string): S | undefined; set(key: string, value: S): void; delete(key: string): void },
  rows: T[],
  idOf: (row: T) => string,
  create: (row: T) => S,
  assign: (schema: S, row: T) => void,
) {
  const keep = new Set(rows.map(idOf));
  for (const key of [...map.keys()]) {
    if (!keep.has(key)) map.delete(key);
  }
  for (const row of rows) {
    const id = idOf(row);
    let schema = map.get(id);
    if (!schema) {
      schema = create(row);
      map.set(id, schema);
    }
    assign(schema, row);
  }
}
