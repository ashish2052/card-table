// Playwright: Jhyap turn banner / greyed JHYAP button / reveal, at 853x330 and 1440x900, vs 2 computers and in a 2-human room.
const { chromium } = require('playwright');
const path = require('path');
const base = process.env.BASE || 'http://127.0.0.1:8850';
const out = path.join(__dirname, '..', 'shots');
const sizes = [{ w: 853, h: 330, n: '853' }, { w: 1440, h: 900, n: '1440' }];
async function ctxPage(browser, s) {
  const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h } });
  await ctx.addInitScript(() => localStorage.setItem('marriage.mute', '1'));
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.g|favicon|ERR_/.test(m.text())) errs.push(m.text()); });
  page.errs = errs;
  return page;
}
async function jhyap(page, name, bots) {
  await page.goto(base, { waitUntil: 'domcontentloaded' });
  await page.click('button[data-game="jhyap"]');
  await page.fill('#name', name);
  await page.click(bots ? '#vsbot' : '#create');
}
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const report = {};
  for (const s of sizes) {
    // vs computers
    const p = await ctxPage(browser, s);
    await jhyap(p, 'Ashish', true);
    await p.waitForFunction(() => window.__kitty && window.__kitty.dealing === false && window.__table && window.__table.S && window.__table.S.round === 1, null, { timeout: 30000 });
    await p.waitForTimeout(500);
    // wait for a computer turn banner
    const seenOther = await p.waitForFunction(() => { const b = document.querySelector('#turnBanner'); return b && !b.hidden && !b.classList.contains('me') ? b.textContent : false; }, null, { timeout: 15000 }).then((h) => h.jsonValue()).catch(() => null);
    await p.waitForTimeout(700);
    await p.screenshot({ path: path.join(out, `jhyap-turn-${s.n}-bots-theirturn.png`) });
    await p.waitForSelector('#turnBanner.me', { timeout: 30000 });
    await p.waitForTimeout(900);
    const info = await p.evaluate(() => ({ banner: document.querySelector('#turnBanner').textContent, call: document.querySelector('#jCall').textContent, callDisabled: document.querySelector('#jCall').disabled, podTurn: !!document.querySelector('.pod.me.turn'), pts: window.__table.S.handFlat.map((c) => c.r) }));
    await p.screenshot({ path: path.join(out, `jhyap-turn-${s.n}-bots-yourturn.png`) });
    report[s.n + '-bots'] = { seenOther, ...info, errs: p.errs };
    await p.context().close();
    // two humans
    const a = await ctxPage(browser, s), b = await ctxPage(browser, s);
    await jhyap(a, 'Ashish', false);
    await a.waitForSelector('#roomcode');
    const code = await a.textContent('#roomcode');
    await b.goto(base, { waitUntil: 'domcontentloaded' });
    await b.fill('#name', 'Sita'); await b.fill('#code', code); await b.click('#join');
    await b.waitForSelector('#room:not([hidden])');
    await a.waitForFunction(() => document.querySelectorAll('#plist li').length === 2);
    await a.click('#start');
    for (const pg of [a, b]) await pg.waitForFunction(() => window.__kitty.dealing === false && window.__table.S.phase === 'play', null, { timeout: 30000 });
    await a.waitForTimeout(600);
    const turn = await a.evaluate(() => window.__table.S.turn);
    const mover = turn === 0 ? a : b, other = turn === 0 ? b : a;
    await mover.screenshot({ path: path.join(out, `jhyap-turn-${s.n}-2h-yourturn.png`) });
    await other.screenshot({ path: path.join(out, `jhyap-turn-${s.n}-2h-theirturn.png`) });
    report[s.n + '-2h'] = { mover: await mover.textContent('#turnBanner'), other: await other.textContent('#turnBanner'), errs: [...a.errs, ...b.errs] };
    await a.context().close(); await b.context().close();
  }
  console.log(JSON.stringify(report, null, 1));
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
