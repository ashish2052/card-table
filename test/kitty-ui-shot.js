// Kitty vs 2 computers: play state, mid-show, result strip (banner must not cover cards or hand).
const { chromium } = require('playwright');
const path = require('path');
const base = process.env.BASE || 'http://127.0.0.1:8850';
const out = path.join(__dirname, '..', 'shots');
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const rep = {};
  for (const s of [{ w: 853, h: 330, n: '853' }, { w: 1440, h: 900, n: '1440' }]) {
    const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h } });
    await ctx.addInitScript(() => localStorage.setItem('marriage.mute', '1'));
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(base, { waitUntil: 'domcontentloaded' });
    await p.click('button[data-game="kitty"]'); await p.fill('#name', 'Ashish'); await p.click('#vsbot');
    await p.waitForFunction(() => window.__kitty && window.__kitty.dealing === false && window.__table.S.round >= 1, null, { timeout: 30000 });
    await p.waitForTimeout(800);
    await p.screenshot({ path: path.join(out, `kitty-ui-${s.n}-play.png`) });
    await p.evaluate(() => window.__send({ t: 'ready', groups: Kitty.autoArrange(__table.S.handFlat, __table.S.opts).map((r) => r.map((c) => c.id)) }));
    await p.waitForFunction(() => window.__kitty.stage === 'hold', null, { timeout: 40000 }).catch(() => {});
    await p.waitForTimeout(300);
    await p.screenshot({ path: path.join(out, `kitty-ui-${s.n}-show.png`) });
    await p.waitForFunction(() => !document.querySelector('#kStrip').hidden, null, { timeout: 40000 });
    await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(out, `kitty-ui-${s.n}-result.png`) });
    rep[s.n] = await p.evaluate(() => ({ strip: document.querySelector('#kStrip').innerText, banner: document.querySelector('#kBanner').textContent, pods: [...document.querySelectorAll('.pod')].map((e) => e.innerText.replace(/\n/g, ' ')) }));
    rep[s.n].errs = errs;
    await ctx.close();
  }
  console.log(JSON.stringify(rep, null, 1));
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
