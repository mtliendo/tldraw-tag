import { chromium } from "playwright";
import { mkdir } from "node:fs/promises";
import path from "node:path";
import { assertBoard } from "./assert-board.mjs";

const out = path.resolve("docs/screenshots");
await mkdir(out, { recursive: true });
const shot = (page, name) => page.screenshot({ path: path.join(out, name), fullPage: true });
const IPHONE_LANDSCAPE = { width: 844, height: 390 };
const ANDROID_LANDSCAPE = { width: 915, height: 412 };
const IPHONE_PORTRAIT = { width: 390, height: 844 };

async function setPhoneViewport(page, size) {
  await page.setViewportSize(size);
  await page.waitForTimeout(500);
}

async function assertLandscapeChrome(page, label) {
  const report = await page.evaluate(() => {
    const wrap = document.querySelector(".board-wrap")?.getBoundingClientRect();
    const hud = document.querySelector(".play-hud-landscape")?.getBoundingClientRect();
    const dock = document.querySelector(".play-dock-landscape")?.getBoundingClientRect();
    const joy = document.querySelector('[aria-label="Move"]')?.getBoundingClientRect();
    const panel = document.querySelector(".panel")?.getBoundingClientRect();
    const parent = document.querySelector(".panel")?.parentElement?.getBoundingClientRect();
    const you = [...document.querySelectorAll("div, span, strong, p, li")]
      .map((el) => (el.textContent || "").trim())
      .find((t) => /^You:\s*#\d+/i.test(t) || /You're the /i.test(t));
    return {
      wrap,
      hud: Boolean(hud),
      dock: Boolean(dock),
      joyH: joy?.height ?? 0,
      overlayed: Boolean(wrap && hud && dock && hud.top >= wrap.top - 2 && dock.bottom <= wrap.bottom + 4),
      overflow: Boolean(panel && parent && (panel.bottom > parent.bottom + 4 || panel.right > parent.right + 4)),
      you,
    };
  });
  if (!report.hud || !report.dock) throw new Error(`${label}: missing landscape HUD/dock`);
  if (!report.overlayed) throw new Error(`${label}: controls are not overlaying the board`);
  if (report.overflow) throw new Error(`${label}: card overflowed in landscape`);
  return report;
}

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

const artClamp = await context.newPage();
await artClamp.goto("http://localhost:3000/dev/art-clamp", { waitUntil: "networkidle" });
await artClamp.waitForSelector('[data-inkt="art"]', { timeout: 10000 });
await artClamp.waitForTimeout(400);
await shot(artClamp, "12-art-clamp.png");
{
  const leaks = await artClamp.evaluate(() => {
    const boards = [...document.querySelectorAll('[data-inkt="art-board"]')];
    const out = [];
    for (const board of boards) {
      const zone = board.querySelector('[data-inkt="zone"]')?.getBoundingClientRect();
      if (!zone) continue;
      for (const el of board.querySelectorAll('[data-inkt="art"], .shield-ring')) {
        const r = el.getBoundingClientRect();
        if (r.width < 4 || r.height < 4) continue;
        if (r.left < zone.left - 2 || r.right > zone.right + 2 || r.top < zone.top - 2 || r.bottom > zone.bottom + 2) {
          out.push({
            src: el.getAttribute("src") || el.className,
            l: +(r.left - zone.left).toFixed(1),
            t: +(r.top - zone.top).toFixed(1),
            r: +(zone.right - r.right).toFixed(1),
            b: +(zone.bottom - r.bottom).toFixed(1),
          });
        }
      }
    }
    return out;
  });
  if (leaks.length) throw new Error(`12 art clamp leaks ${JSON.stringify(leaks)}`);
}
const minBoard = artClamp.locator('[data-inkt="art-board"]').nth(1);
await minBoard.scrollIntoViewIfNeeded();
await artClamp.waitForTimeout(200);
await minBoard.screenshot({ path: path.join(out, "12b-art-clamp-min.png") });
await artClamp.close();

const admin = await context.newPage();
await admin.goto("http://localhost:3000/admin?bots=18&round=28&shrink=6", { waitUntil: "networkidle" });
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
{
  const dark = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    colorScheme: "dark",
  });
  const darkJoin = await dark.newPage();
  await darkJoin.goto(`http://localhost:3000/join/${code}`, { waitUntil: "networkidle" });
  await darkJoin.locator("input").fill("Ada");
  await darkJoin.waitForTimeout(300);
  await shot(darkJoin, "02c-join-dark.png");
  await dark.close();
}
await join.getByRole("button", { name: /join/i }).click();
await join.waitForURL(`**/play/${code}`);
await join.waitForSelector("text=You're the", { timeout: 10000 });
await join.waitForTimeout(400);
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
await joinPhone.waitForSelector("text=You're the", { timeout: 10000 });
await joinPhone.waitForTimeout(400);
await setPhoneViewport(joinPhone, IPHONE_LANDSCAPE);
await shot(joinPhone, "09-player-iphone-landscape-lobby.png");
await assertLandscapeChrome(joinPhone, "09-iphone-lobby");
await setPhoneViewport(joinPhone, ANDROID_LANDSCAPE);
await shot(joinPhone, "09b-player-android-landscape-lobby.png");
await assertLandscapeChrome(joinPhone, "09b-android-lobby");
await setPhoneViewport(joinPhone, IPHONE_PORTRAIT);
await joinPhone.waitForTimeout(400);

const screen = await context.newPage();
await screen.goto(`http://localhost:3000/screen/${code}`, { waitUntil: "networkidle" });
await screen.waitForTimeout(1500);
await admin.waitForSelector("text=Players (20)", { timeout: 10000 });
await shot(screen, "07-projector-lobby.png");

await admin.getByRole("button", { name: /^start$/i }).click();
await admin.waitForTimeout(900);
await admin.getByRole("button", { name: /showcase/i }).click();
await screen.waitForSelector('[data-inkt="wall"]', { timeout: 8000 });
await admin.waitForTimeout(2400);
await shot(admin, "04-ingame-powers.png");
await shot(join, "04b-player.png");
await shot(screen, "07-projector.png");
await shot(screen, "08-projector-20.png");
await assertBoard(screen, "07-projector");
await assertBoard(screen, "08-projector-20");
{
  const truncated = await screen.evaluate(() =>
    [...document.querySelectorAll('[data-inkt="label"]')]
      .map((el) => (el.textContent || "").trim())
      .filter((t) => t.includes("…") || /\.\.\.$/.test(t) || /\bA\.\.\./.test(t) || /\bSta\.\.\./.test(t)),
  );
  if (truncated.length) throw new Error(`08 truncated labels: ${truncated.join(", ")}`);
}
await joinPhone.waitForTimeout(400);
await shot(joinPhone, "04c-player-mobile.png");
await assertBoard(joinPhone, "04c-player-mobile", { follow: true });
await setPhoneViewport(joinPhone, IPHONE_LANDSCAPE);
await shot(joinPhone, "10c-player-rotate-landscape.png");
await shot(joinPhone, "10-player-iphone-landscape.png");
await assertBoard(joinPhone, "10-iphone-landscape", { follow: true });
await assertLandscapeChrome(joinPhone, "10-iphone-mid");
await setPhoneViewport(joinPhone, ANDROID_LANDSCAPE);
await shot(joinPhone, "10b-player-android-landscape.png");
await assertBoard(joinPhone, "10b-android-landscape", { follow: true });
await assertLandscapeChrome(joinPhone, "10b-android-mid");
await setPhoneViewport(joinPhone, IPHONE_PORTRAIT);

await admin.waitForTimeout(7000);
await shot(admin, "05-shrinking-zone.png");
await shot(screen, "05b-projector-zone.png");
await assertBoard(screen, "05b-projector-zone");
{
  const itSprites = await screen.evaluate(() =>
    [...document.querySelectorAll('[data-inkt="player"] img')]
      .map((img) => img.getAttribute("src") || "")
      .filter((src) => /-it\.svg/.test(src)).length,
  );
  if (itSprites !== 1) throw new Error(`05b expected one IT sprite, got ${itSprites}`);
  const iceLeak = await screen.evaluate(() => {
    const zone = document.querySelector('[data-inkt="zone"]')?.getBoundingClientRect();
    if (!zone) return -1;
    return [...document.querySelectorAll('[data-inkt="player"] img')]
      .filter((img) => /frozen/.test(img.getAttribute("src") || ""))
      .map((img) => img.getBoundingClientRect())
      .filter((r) => r.top < zone.top - 1 || r.bottom > zone.bottom + 1 || r.left < zone.left - 1 || r.right > zone.right + 1).length;
  });
  if (iceLeak > 0) throw new Error(`05b frozen overlay left the zone (${iceLeak})`);
}
await admin.getByRole("button", { name: /pin min zone/i }).click();
await admin.waitForTimeout(900);
await shot(screen, "13-projector-final-zone.png");
await assertBoard(screen, "13-projector-final-zone");
await admin.getByRole("button", { name: /^pin art$/i }).click();
await admin.waitForTimeout(700);
await shot(screen, "12c-projector-pin.png");
await assertBoard(screen, "12c-projector-pin");

await admin.waitForSelector("text=wins!", { timeout: 30000 });
await admin.waitForTimeout(2400);
await shot(admin, "06-leaderboard.png");
await screen.waitForSelector("text=Play again", { timeout: 8000 });
await shot(screen, "06b-projector-end.png");
{
  const clip = await screen.evaluate(() => {
    const zone = document.querySelector('[data-inkt="zone"]')?.getBoundingClientRect();
    if (!zone) return -1;
    const labels = [...document.querySelectorAll('[data-inkt="label"]')].map((el) =>
      el.getBoundingClientRect(),
    );
    return labels.filter(
      (r) => r.left < zone.left - 2 || r.right > zone.right + 2 || r.top < zone.top - 2 || r.bottom > zone.bottom + 2,
    ).length;
  });
  if (clip > 0) throw new Error(`06b labels clipped by zone: ${clip}`);
}
await shot(joinPhone, "06c-player-mobile-end.png");
{
  const end = await joinPhone.evaluate(() => {
    const you = [...document.querySelectorAll("div, span, strong, p, li")]
      .map((el) => (el.textContent || "").trim())
      .find((t) => /^You:\s*#\d+/i.test(t));
    const items = [...document.querySelectorAll("ol li")].map((li) => (li.textContent || "").trim());
    const panel = document.querySelector(".panel");
    const parent = panel?.parentElement;
    const pr = panel?.getBoundingClientRect();
    const or = parent?.getBoundingClientRect();
    const overflow = Boolean(pr && or && (pr.bottom > or.bottom + 4 || pr.right > or.right + 4));
    const graph = items.find((t) => /Graph/i.test(t)) || "";
    return { you, count: items.length, overflow, graph, scroll: (document.querySelector("ol")?.scrollHeight || 0) > (document.querySelector("ol")?.clientHeight || 0) };
  });
  if (!end.you) throw new Error("06c missing pinned You rank");
  if (end.count < 20) throw new Error(`06c list short (${end.count})`);
  if (end.overflow) throw new Error("06c leaderboard overflowed the card");
  if (/Graph\.\.\./i.test(end.graph)) throw new Error(`06c truncated Graphite: ${end.graph}`);
}
await setPhoneViewport(joinPhone, IPHONE_LANDSCAPE);
await shot(joinPhone, "11-player-iphone-landscape-end.png");
await assertLandscapeChrome(joinPhone, "11-iphone-end");
{
  const scrolled = await joinPhone.evaluate(() => {
    const ol = document.querySelector('[data-inkt="lb"]');
    if (!ol) return { ok: false, visible: [] };
    ol.scrollTop = ol.scrollHeight;
    const box = ol.getBoundingClientRect();
    const visible = [...ol.querySelectorAll("[data-inkt='lb-row']")]
      .map((li) => {
        const r = li.getBoundingClientRect();
        return {
          rank: Number(li.getAttribute("data-rank")),
          show: r.bottom > box.top + 2 && r.top < box.bottom - 2,
        };
      })
      .filter((row) => row.show)
      .map((row) => row.rank);
    return { ok: true, visible, canScroll: ol.scrollHeight > ol.clientHeight + 4 };
  });
  await shot(joinPhone, "11c-player-iphone-landscape-end-scrolled.png");
  if (!scrolled.ok) throw new Error("11c missing landscape leaderboard list");
  for (const n of [15, 16, 17, 18, 19, 20]) {
    if (!scrolled.visible.includes(n)) {
      throw new Error(`11c landscape end did not show row ${n} after scroll (${scrolled.visible.join(",")})`);
    }
  }
}
await setPhoneViewport(joinPhone, ANDROID_LANDSCAPE);
await shot(joinPhone, "11b-player-android-landscape-end.png");
await assertLandscapeChrome(joinPhone, "11b-android-end");
await setPhoneViewport(joinPhone, IPHONE_PORTRAIT);

await screen.getByRole("button", { name: /play again/i }).click();
await admin.waitForFunction(() => !/wins!/i.test(document.body.innerText), { timeout: 10000 });
await joinPhone.waitForTimeout(900);
await shot(joinPhone, "04d-player-mobile-r2.png");
await assertBoard(joinPhone, "04d-player-mobile-r2", { follow: true });

await phone.close();
await browser.close();
console.log("screenshots written to", out);
