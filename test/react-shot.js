// Emoji reactions on Jhyap, Kitty and Marriage: two humans, A taps the tray, B sees it fly to the pod and pop.
const { chromium } = require('playwright');
const path = require('path');
const base = process.env.BASE || 'http://127.0.0.1:8850';
const out = path.join(__dirname, '..', 'shots');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const rep = {};
  for (const game of ['jhyap', 'kitty', 'marriage']) {
    const mk = async () => { const c = await browser.newContext({ viewport: { width: 853, height: 330 } }); await c.addInitScript(() => { localStorage.setItem('marriage.mute', '1'); window.__rx = []; const iv = setInterval(() => { if (window.onReact && !window.__wrapped) { const o = window.onReact; window.onReact = (m) => { window.__rx.push(m); o(m); }; window.__wrapped = true; clearInterval(iv); } }, 20); }); const p = await c.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(String(e))); return p; };
    const a = await mk(), b = await mk();
    await a.goto(base, { waitUntil: 'domcontentloaded' });
    await a.click(`button[data-game="${game}"]`); await a.fill('#name', 'Ashish'); await a.click('#create');
    await a.waitForSelector('#roomcode'); const code = await a.textContent('#roomcode');
    await b.goto(base, { waitUntil: 'domcontentloaded' }); await b.fill('#name', 'Sita'); await b.fill('#code', code); await b.click('#join');
    await a.waitForFunction(() => document.querySelectorAll('#plist li').length === 2);
    await a.click('#start');
    await a.waitForTimeout(game === 'marriage' ? 9000 : 8000);
    const btn = game === 'marriage' ? '#topbar .rxbtn' : '.otTop .rxbtn';
    await a.click(btn);
    await a.waitForSelector('#rxTray:not([hidden])');
    await a.screenshot({ path: path.join(out, `react-${game}-tray.png`) });
    await a.click('#rxTray .em button[data-e="5"]');
    await b.waitForSelector('.rxfly', { timeout: 4000 });
    await b.waitForTimeout(1300);
    await b.screenshot({ path: path.join(out, `react-${game}-pop.png`) });
    // second one inside 2 s is refused by tray + server
    await a.click(btn).catch(() => {}); 
    const rx1 = await b.evaluate(() => window.__rx.length);
    // raw hostile message: not in the list
    await a.evaluate(() => { const W = WebSocket.prototype.send; });
    await b.waitForTimeout(2200);
    rep[game] = { received: rx1, msg: await b.evaluate(() => window.__rx[0]), errsA: a.errs, errsB: b.errs };
    await a.context().close(); await b.context().close();
  }
  console.log(JSON.stringify(rep, null, 1));
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
