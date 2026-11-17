/**
 * Headless Colyseus loop: create room as admin, spawn bots, start, wait for end.
 */
import { Client } from "@colyseus/sdk";

const url = process.env.COLYSEUS_URL || "ws://localhost:2567";
const token = process.env.DEV_ADMIN_SECRET || "inkt-dev";

const client = new Client(url);
const room = await client.create("tag", {
  role: "admin",
  accessToken: token,
  bots: 10,
  roundLength: 16,
  shrinkInterval: 4,
});

console.log("created", room.roomId);
const player = await client.joinById(room.roomId, {
  role: "player",
  name: "Ada",
  avatar: "bolt",
});
console.log("joined as", player.sessionId);

room.onMessage("fx", (event) => {
  if (event?.type === "start" || event?.type === "end" || event?.type === "shrink") {
    console.log("fx", event.type, "phase", room.state.phase, "t", room.state.timeLeft);
  }
});

room.send("admin", { action: "start" });
console.log("start sent; phase", room.state.phase, "timeLeft", room.state.timeLeft, "players", room.state.players.size);

await new Promise((resolve, reject) => {
  const t = setTimeout(() => {
    console.log("timeout dump", {
      phase: room.state.phase,
      timeLeft: room.state.timeLeft,
      zoneW: room.state.zoneW,
      players: room.state.players.size,
    });
    reject(new Error("round did not end in time"));
  }, 25000);
  const check = () => {
    if (room.state.phase === "ended") {
      clearTimeout(t);
      resolve(room.state);
    }
  };
  room.onStateChange(check);
  const poll = setInterval(() => {
    console.log("tick", room.state.phase, room.state.timeLeft);
    check();
    if (room.state.phase === "ended") clearInterval(poll);
  }, 1000);
});

const state = room.state;
console.log("phase", state.phase);
console.log("zone", state.zoneW, "x", state.zoneH);
console.log("players", state.players.size);
console.log(
  "leaderboard",
  [...state.leaderboard.values()].map((r) => `${r.name}:${r.score.toFixed(1)}${r.isIt ? " IT" : ""}`),
);
if (state.phase !== "ended") throw new Error("expected ended");
if (state.zoneW >= 1600) throw new Error("zone did not shrink");
await room.leave();
await player.leave();
console.log("ok");
process.exit(0);
