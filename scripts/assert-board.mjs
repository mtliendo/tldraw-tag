/** Render-side checks: blob boxes vs zone, walls, and labels. */
export async function assertBoard(page, label, { follow = false } = {}) {
  await page.waitForTimeout(250);
  const report = await page.evaluate(() => {
    const zoneEl = document.querySelector('[data-inkt="zone"]');
    if (!zoneEl) return { ok: false, reason: "missing zone" };
    const zone = zoneEl.getBoundingClientRect();
    if (zone.width < 8 || zone.height < 8) return { ok: false, reason: "zone too small" };
    const blobs = [...document.querySelectorAll('[data-inkt="player"]')]
      .map((el) => ({ id: el.getAttribute("data-player-id") || "?", r: el.getBoundingClientRect() }))
      .filter((b) => b.r.width > 6 && b.r.height > 6);
    const board = document.querySelector(".board-wrap") || document;
    const arts = [...board.querySelectorAll('[data-inkt="player"] [data-inkt="art"], [data-inkt="player"] .shield-ring')]
      .map((el) => ({
        id: el.closest("[data-inkt='player']")?.getAttribute("data-player-id") || el.getAttribute("data-inkt") || "art",
        r: el.getBoundingClientRect(),
      }))
      .filter((b) => b.r.width > 4 && b.r.height > 4);
    const walls = [...document.querySelectorAll('[data-inkt="wall"]')]
      .map((el) => el.getBoundingClientRect())
      .filter((r) => r.width > 2 && r.height > 2);
    const labels = [...document.querySelectorAll('[data-inkt="label"]')]
      .map((el) => ({ text: (el.textContent || "").trim(), r: el.getBoundingClientRect() }))
      .filter((l) => l.r.width > 2 && l.r.height > 2);
    const pad = 8;
    const leaks = blobs.filter(
      (b) =>
        b.r.left < zone.left - pad ||
        b.r.right > zone.right + pad ||
        b.r.top < zone.top - pad ||
        b.r.bottom > zone.bottom + pad,
    );
    const artPad = 4;
    const artLeaks = arts.filter(
      (b) =>
        b.r.left < zone.left - artPad ||
        b.r.right > zone.right + artPad ||
        b.r.top < zone.top - artPad ||
        b.r.bottom > zone.bottom + artPad,
    );
    const hits = (a, b, slack = 3) =>
      a.left < b.right - slack && a.right > b.left + slack && a.top < b.bottom - slack && a.bottom > b.top + slack;
    const wallHits = [];
    for (const b of blobs) {
      for (const w of walls) {
        if (hits(b.r, w)) wallHits.push(b.id);
      }
    }
    const labelHits = [];
    const labelLeaks = labels.filter(
      (l) =>
        l.r.left < zone.left - 2 ||
        l.r.right > zone.right + 2 ||
        l.r.top < zone.top - 2 ||
        l.r.bottom > zone.bottom + 2,
    );
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        if (hits(labels[i].r, labels[j].r, 2)) labelHits.push("label-label");
      }
      for (const b of blobs) {
        if (hits(labels[i].r, b.r, 2)) labelHits.push(`label-${b.id}`);
      }
    }
    const wrap = document.querySelector(".board-wrap")?.getBoundingClientRect();
    const blobW = blobs[0]?.r.width ?? 0;
    const coversWrap =
      !wrap ||
      (zone.left <= wrap.left + 12 &&
        zone.right >= wrap.right - 12 &&
        zone.top <= wrap.top + 12 &&
        zone.bottom >= wrap.bottom - 12);
    const letterboxed =
      wrap &&
      zone.height < wrap.height * 0.72 &&
      zone.top > wrap.top + 24 &&
      zone.bottom < wrap.bottom - 24;
    return {
      ok:
        leaks.length === 0 &&
        artLeaks.length === 0 &&
        wallHits.length === 0 &&
        labelHits.length === 0 &&
        labelLeaks.length === 0,
      leaks: leaks.map((b) => b.id),
      artLeaks: artLeaks.map((b) => b.id),
      wallHits,
      labelHits,
      labelLeaks: labelLeaks.map((l) => l.text),
      blobCount: blobs.length,
      labelCount: labels.length,
      blobW,
      coversWrap,
      letterboxed: Boolean(letterboxed),
      wrap: wrap ? { w: wrap.width, h: wrap.height } : null,
      zone: { w: zone.width, h: zone.height, top: zone.top, bottom: zone.bottom },
    };
  });
  if (!report.ok) {
    console.error(`board assert failed (${label})`, report);
    throw new Error(`${label}: blobs, art, or labels left the zone, overlapped a wall, or stacked labels`);
  }
  if (!follow && report.blobCount >= 2 && report.blobCount <= 22 && report.labelCount < report.blobCount) {
    console.error(`board labels missing (${label})`, report);
    throw new Error(`${label}: expected a name on every blob (${report.labelCount}/${report.blobCount})`);
  }
  if (follow) {
    if (report.letterboxed || !report.coversWrap) {
      console.error(`board camera failed (${label})`, report);
      throw new Error(`${label}: mobile camera is letterboxed; board must fill HUD-to-joystick`);
    }
    if (report.blobW < 32 || report.blobW > 96) {
      console.error(`board blob size failed (${label})`, report);
      throw new Error(`${label}: blobs should be ~44px on mobile, got ${report.blobW.toFixed(1)}`);
    }
  }
  console.log(`board ok ${label}`, report.blobCount, "blobs", follow ? "follow-cam" : "fit-zone");
  return report;
}
