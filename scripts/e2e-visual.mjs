import { chromium } from "playwright";
import { assertBoard } from "./assert-board.mjs";

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  viewport: { width: 1440, height: 900 },
  deviceScaleFactor: 1,
  colorScheme: "light",
});
const admin = await context.newPage();
await admin.goto("http://localhost:3000/admin?bots=19&round=22&shrink=6", { waitUntil: "networkidle" });
await admin.waitForSelector("text=Create game", { timeout: 20000 });
await admin.getByRole("button", { name: /create game/i }).click();
await admin.waitForSelector("text=Room live", { timeout: 15000 });
const code = (await admin.locator(".code-xl").first().innerText()).trim();

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
await joinPhone.waitForFunction(() => {
  const b = [...document.querySelectorAll("button")].find((x) => /join/i.test(x.textContent || ""));
  return Boolean(b && !b.disabled);
});
await joinPhone.getByRole("button", { name: /join/i }).click();
await joinPhone.waitForURL(`**/play/${code}`);

const screen = await context.newPage();
await screen.goto(`http://localhost:3000/screen/${code}`, { waitUntil: "networkidle" });
await admin.getByRole("button", { name: /^start$/i }).click();
await admin.waitForTimeout(600);
await admin.getByRole("button", { name: /showcase/i }).click();
await admin.waitForTimeout(2200);
await assertBoard(screen, "e2e-projector");
await assertBoard(joinPhone, "e2e-mobile", { follow: true });
await admin.waitForTimeout(6500);
await assertBoard(screen, "e2e-projector-shrink");
await admin.getByRole("button", { name: /pin art/i }).click();
await admin.waitForTimeout(700);
await assertBoard(screen, "e2e-projector-pin");

await admin.waitForSelector("text=wins!", { timeout: 30000 });
await screen.getByRole("button", { name: /play again/i }).click();
await admin.waitForFunction(() => !/wins!/i.test(document.body.innerText), { timeout: 10000 });
await joinPhone.waitForTimeout(900);
await assertBoard(joinPhone, "e2e-mobile-r2", { follow: true });
await assertBoard(screen, "e2e-projector-r2");

await phone.close();
await browser.close();
console.log("visual e2e ok");
