// Headless proof of the one-card deal, a jumbled Kitty hand, drag, tap-swap, Ready, and Back.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const base = process.env.BASE || 'http://127.0.0.1:8850';
const out = path.join(__dirname, '..', 'shots');
fs.mkdirSync(out, { recursive: true });
const sizes = [{ w: 1440, h: 900, name: '1440x900' }, { w: 853, h: 330, name: '853x330' }, { w: 390, h: 844, name: '390x844' }];

async function clickCard(page, id) {
  const box = await page.locator(`#kCards .card.mine[data-id="${id}"]`).boundingBox();
  if (!box) throw new Error('no card ' + id);
  await page.mouse.click(box.x + box.width / 2, box.y + Math.min(box.height / 2, 30));
}

async function kitty(page, size) {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.click('button[data-game="kitty"]');
  await page.fill('#name', 'Ashish');
  if (size.name === '1440x900') {
    await page.click('#create');
    await page.waitForSelector('#room:not([hidden])');
    if (!(await page.locator('#leave').isVisible())) throw new Error('kitty lobby Back hidden');
    await page.click('#leave');
    await page.waitForSelector('#entry:not([hidden])');
    await page.click('button[data-game="jhyap"]');
    await page.fill('#name', 'Ashish');
    await page.click('#create');
    await page.waitForSelector('#room:not([hidden])');
    if (!(await page.locator('#leave').isVisible())) throw new Error('jhyap lobby Back hidden');
    await page.click('#leave');
    await page.waitForSelector('#entry:not([hidden])');
    await page.click('button[data-game="kitty"]');
    await page.fill('#name', 'Ashish');
  }
  await page.click('#vsbot');
  await page.waitForSelector('#kCards .card');
  await page.waitForTimeout(700);
  const spread = await page.evaluate(() => {
    const deck = document.querySelector('#kCards .card[data-key="deck"]');
    const cards = [...document.querySelectorAll('#kCards .card')].filter((el) => el.dataset.key !== 'deck');
    const dr = deck.getBoundingClientRect();
    const dx = dr.x + dr.width / 2, dy = dr.y + dr.height / 2;
    const ds = cards.map((el) => {
      const r = el.getBoundingClientRect();
      return Math.hypot(r.x + r.width / 2 - dx, r.y + r.height / 2 - dy);
    });
    return { near: ds.filter((d) => d < 36).length, far: ds.filter((d) => d > 90).length, n: cards.length, down: document.querySelectorAll('#kCards .card.mine.down').length };
  });
  if (spread.near < 1 || spread.far < 1) throw new Error(size.name + ' cards did not leave the deck one at a time ' + JSON.stringify(spread));
  await page.screenshot({ path: path.join(out, 'deal-' + size.name + '.png') });
  await page.waitForFunction(() => window.__kitty && window.__kitty.dealing === false, null, { timeout: 12000 });
  const order = await page.evaluate(() => {
    const flat = window.__kitty.rows.flat();
    const byId = new Map(window.__table.S.handFlat.map((c) => [c.id, c]));
    const cards = flat.map((id) => byId.get(id));
    const best = window.Kitty.autoArrange(cards, window.__table.S.opts).flat().map((c) => c.id);
    const groups = window.__kitty.rows.map((g) => g.map((id) => byId.get(id)));
    return { same: flat.join() === best.join(), ordered: window.Kitty.rowsInOrder(groups, window.__table.S.opts), flat };
  });
  const before = order.flat.join();
  const box = await page.locator('#kCards .card.mine').first().boundingBox();
  const dx = size.w < 500 ? 70 : 160;
  await page.mouse.move(box.x + box.width / 2, box.y + 20);
  await page.mouse.down();
  await page.mouse.move(box.x + box.width / 2 + dx, box.y + 20, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(200);
  const dragged = await page.evaluate(() => window.__kitty.rows.flat().join());
  if (dragged === before) throw new Error(size.name + ' drag did not reorder');
  const pair = await page.evaluate(() => window.__kitty.rows.flat().slice(0, 2));
  await clickCard(page, pair[0]);
  await clickCard(page, pair[1]);
  await page.waitForTimeout(200);
  const swapped = await page.evaluate(() => window.__kitty.rows.flat().slice(0, 2).join());
  if (swapped === pair.join()) throw new Error(size.name + ' tap-swap did not reorder');
  page.once('dialog', (d) => { if (!/Leave this game/.test(d.message())) throw new Error('bad confirm ' + d.message()); d.dismiss(); });
  await page.evaluate(() => history.back());
  await page.waitForTimeout(300);
  if (!(await page.locator('#kReady').isVisible())) throw new Error(size.name + ' Back confirm did not keep the table');
  const target = await page.evaluate(() => {
    const byId = new Map(window.__table.S.handFlat.map((c) => [c.id, c]));
    const cards = window.__kitty.rows.flat().map((id) => byId.get(id));
    return window.Kitty.autoArrange(cards, window.__table.S.opts).flat().map((c) => c.id);
  });
  for (let n = 0; n < 12; n++) {
    const flat = await page.evaluate(() => window.__kitty.rows.flat());
    const i = flat.findIndex((id, idx) => id !== target[idx]);
    if (i < 0) break;
    await clickCard(page, flat[i]);
    await clickCard(page, target[i]);
    await page.waitForTimeout(80);
  }
  const lined = await page.evaluate((ids) => window.__kitty.rows.flat().join() === ids.join(), target);
  if (!lined) throw new Error(size.name + ' could not line the hand up');
  await page.click('#kReady');
  await page.waitForFunction(() => {
    const t = document.querySelector('#toast');
    if (t && t.classList.contains('on') && /strongest|first|Use each/.test(t.textContent)) return false;
    return window.__kitty.sent.some((m) => m.t === 'ready') && !/waiting for you/.test(window.__kitty.line || '');
  }, null, { timeout: 8000 });
  page.once('dialog', (d) => d.accept());
  await page.evaluate(() => history.back());
  await page.waitForSelector('#entry:not([hidden])', { timeout: 8000 });
  return { size: size.name, spread, unsorted: !order.same, orderedGroups: order.ordered };
}

(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const report = [];
  const open = async (opts) => {
    const ctx = await browser.newContext({ viewport: { width: opts.w, height: opts.h }, reducedMotion: opts.reduce ? 'reduce' : 'no-preference' });
    await ctx.addInitScript(() => localStorage.setItem('marriage.mute', '1'));
    const page = await ctx.newPage();
    page._ctx = ctx;
    return page;
  };
  try {
    for (const size of sizes) {
      const page = await open(size);
      report.push(await kitty(page, size));
      await page._ctx.close();
    }
    const page = await open({ w: 1440, h: 900, reduce: true });
    await page.goto(base, { waitUntil: 'domcontentloaded' });
    await page.click('button[data-game="kitty"]');
    await page.fill('#name', 'Ashish');
    await page.click('#vsbot');
    await page.waitForSelector('#kCards .card.mine');
    await page.waitForTimeout(400);
    const reduced = await page.evaluate(() => ({ dealing: window.__kitty.dealing, down: document.querySelectorAll('#kCards .card.mine.down').length }));
    if (reduced.dealing || reduced.down) throw new Error('reduced motion still animating ' + JSON.stringify(reduced));
    report.push({ reduced: true });
    await page._ctx.close();
    const j = await open({ w: 1440, h: 900 });
    await j.goto(base, { waitUntil: 'domcontentloaded' });
    await j.click('button[data-game="jhyap"]');
    await j.fill('#name', 'Ashish');
    await j.click('#vsbot');
    await j.waitForSelector('#kCards .card');
    await j.waitForTimeout(500);
    const jspread = await j.evaluate(() => {
      const deck = document.querySelector('#kCards .card[data-key="deck"]');
      const cards = [...document.querySelectorAll('#kCards .card')].filter((el) => el.dataset.key !== 'deck');
      const dr = deck.getBoundingClientRect();
      const ds = cards.map((el) => { const r = el.getBoundingClientRect(); return Math.hypot(r.x + r.width / 2 - (dr.x + dr.width / 2), r.y + r.height / 2 - (dr.y + dr.height / 2)); });
      return { near: ds.filter((d) => d < 36).length, far: ds.filter((d) => d > 90).length };
    });
    if (jspread.near < 1 || jspread.far < 1) throw new Error('jhyap deal did not stagger ' + JSON.stringify(jspread));
    await j.screenshot({ path: path.join(out, 'deal-jhyap-1440x900.png') });
    report.push({ jhyap: jspread });
    await j._ctx.close();
    console.log(JSON.stringify(report, null, 2));
  } finally { await browser.close(); }
})().catch((e) => { console.error(e); process.exit(1); });
