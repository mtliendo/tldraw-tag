import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const out = path.resolve("docs/screenshots");
await mkdir(out, { recursive: true });
const shot = (page, name) => page.screenshot({ path: path.join(out, name), fullPage: true });

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "light",
});

const home = await context.newPage();
await home.goto("http://localhost:3000/", { waitUntil: "networkidle" });
await home.waitForTimeout(400);
await shot(home, "00-home.png");
await home.close();

const admin = await context.newPage();
await admin.goto("http://localhost:3000/admin?bots=12&round=28&shrink=6", { waitUntil: "networkidle" });
await admin.waitForSelector("text=Create game", { timeout: 20000 });
await admin.waitForTimeout(400);
await shot(admin, "01-admin-create.png");

await admin.getByRole("button", { name: /create game/i }).click();
await admin.waitForSelector("text=Room live", { timeout: 15000 });
await admin.waitForTimeout(1200);
await shot(admin, "01b-admin-room.png");

const code = (await admin.locator(".code-xl").first().innerText()).trim();
console.log("room", code);

const join = await context.newPage();
await join.goto(`http://localhost:3000/join/${code}`, { waitUntil: "networkidle" });
await join.waitForTimeout(400);
await join.locator("input").fill("Ada");
await join.waitForFunction(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /join/i.test(x.textContent || ""));
  return Boolean(b && !b.disabled);
});
await shot(join, "02-join.png");
await join.getByRole("button", { name: /join/i }).click();
await join.waitForURL(`**/play/${code}`);
await join.waitForTimeout(1500);
await shot(join, "03-lobby.png");

const phone = await browser.newContext({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
  colorScheme: "light",
});
const joinPhone = await phone.newPage();
await joinPhone.goto(`http://localhost:3000/join/${code}`, { waitUntil: "networkidle" });
await joinPhone.locator("input").fill("Mia");
await joinPhone.waitForTimeout(200);
await shot(joinPhone, "02b-join-mobile.png");
await joinPhone.getByRole("button", { name: /join/i }).click();
await joinPhone.waitForURL(`**/play/${code}`);
await joinPhone.waitForTimeout(800);

const screen = await context.newPage();
await screen.goto(`http://localhost:3000/screen/${code}`, { waitUntil: "networkidle" });
await screen.waitForTimeout(1500);
await shot(screen, "07-projector-lobby.png");

await admin.getByRole("button", { name: /^start$/i }).click();
await admin.waitForTimeout(900);
await admin.getByRole("button", { name: /showcase/i }).click();
await admin.waitForFunction(() => /boost/i.test(document.body.innerText), null, { timeout: 8000 });
await admin.waitForTimeout(2200);
await shot(admin, "04-ingame-powers.png");
await shot(join, "04b-player.png");
await shot(screen, "07-projector.png");
await shot(joinPhone, "04c-player-mobile.png");

await admin.waitForTimeout(7000);
await shot(admin, "05-shrinking-zone.png");
await shot(screen, "05b-projector-zone.png");

await admin.waitForSelector("text=was IT", { timeout: 30000 });
await admin.waitForTimeout(800);
await shot(admin, "06-leaderboard.png");
await shot(screen, "06b-projector-end.png");

await phone.close();
await browser.close();
console.log("screenshots written to", out);
