import { ArraySchema, MapSchema, Schema, type } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("string") id = "";
  @type("string") sessionId = "";
  @type("string") name = "";
  @type("string") avatar = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") vx = 0;
  @type("number") vy = 0;
  @type("boolean") isIt = false;
  @type("boolean") isBot = false;
  @type("number") score = 0;
  @type("string") powerId = "";
  @type("number") charges = 0;
  @type("boolean") ghost = false;
  @type("boolean") frozen = false;
  @type("boolean") boosting = false;
  @type("boolean") hasShield = false;
}

export class PowerUpState extends Schema {
  @type("string") id = "";
  @type("string") kind = "";
  @type("number") x = 0;
  @type("number") y = 0;
}

export class PulseState extends Schema {
  @type("string") id = "";
  @type("string") kind = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") progress = 0;
}

export class WallState extends Schema {
  @type("string") id = "";
  @type("number") x = 0;
  @type("number") y = 0;
  @type("number") w = 0;
  @type("number") h = 0;
}

export class DecoyState extends Schema {
  @type("string") id = "";
  @type("string") ownerId = "";
  @type("string") name = "";
  @type("string") avatar = "";
  @type("number") x = 0;
  @type("number") y = 0;
}

export class ScoreRow extends Schema {
  @type("string") id = "";
  @type("string") name = "";
  @type("string") avatar = "";
  @type("number") score = 0;
  @type("boolean") isIt = false;
  @type("boolean") isBot = false;
}

export class GameState extends Schema {
  @type("string") code = "";
  @type("string") phase = "lobby";
  @type("number") now = 0;
  @type("number") timeLeft = 75;
  @type("number") roundLength = 75;
  @type("number") zoneX = 0;
  @type("number") zoneY = 0;
  @type("number") zoneW = 1600;
  @type("number") zoneH = 900;
  @type("string") itId = "";
  @type("string") itName = "";
  @type("string") lastAnnounce = "";
  @type(["string"]) enabledPowers = new ArraySchema<string>();
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
  @type({ map: PowerUpState }) powerUps = new MapSchema<PowerUpState>();
  @type({ map: PulseState }) pulses = new MapSchema<PulseState>();
  @type({ map: WallState }) walls = new MapSchema<WallState>();
  @type({ map: DecoyState }) decoys = new MapSchema<DecoyState>();
  @type([ScoreRow]) leaderboard = new ArraySchema<ScoreRow>();
}
