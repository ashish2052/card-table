// Plays Jhyap against 2 computers until a call, then screenshots the reveal (cards live on the table, strip on the edge).
const { chromium } = require('playwright');
const path = require('path');
const base = process.env.BASE || 'http://127.0.0.1:8850';
const out = path.join(__dirname, '..', 'shots');
const sizes = [{ w: 853, h: 330, n: '853' }, { w: 1440, h: 900, n: '1440' }];
(async () => {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const rep = {};
  for (const s of sizes) {
    const ctx = await browser.newContext({ viewport: { width: s.w, height: s.h } });
    await ctx.addInitScript(() => localStorage.setItem('marriage.mute', '1'));
    const p = await ctx.newPage(); const errs = [];
    p.on('pageerror', (e) => errs.push(String(e)));
    await p.goto(base, { waitUntil: 'domcontentloaded' });
    await p.click('button[data-game="jhyap"]'); await p.fill('#name', 'Ashish'); await p.click('#vsbot');
    await p.waitForFunction(() => window.__kitty && window.__kitty.dealing === false && window.__table && window.__table.S.round >= 1, null, { timeout: 30000 });
    const t0 = Date.now(); let called = false;
    while (Date.now() - t0 < 200000) {
      const st = await p.evaluate(() => { const S = window.__table.S; return { phase: S.phase, turn: S.turn, you: S.you, step: S.step, hand: S.handFlat, round: S.round, over: S.phase === 'over' }; });
      if (st.over) break;
      if (st.turn === st.you && !(await p.evaluate(() => window.__kitty.dealing))) {
        const val = (c) => Math.min(c.r, 10), pts = st.hand.reduce((t, c) => t + val(c), 0);
        if (st.step === 'throw') {
          if (pts <= 5) { await p.click('#jCall'); called = true; }
          else { const hi = st.hand.slice().sort((a, b) => val(b) - val(a))[0]; await p.click(`#kCards .card.mine[data-id="${hi.id}"]`); await p.click('#jThrow'); }
        } else { await p.click('#kCards .card[data-key="deck"]'); }
      }
      await p.waitForTimeout(600);
    }
    const over = await p.evaluate(() => window.__table.S.phase);
    await p.waitForTimeout(1500);
    await p.screenshot({ path: path.join(out, `jhyap-reveal-${s.n}-mid.png`) });
    await p.waitForFunction(() => window.__kitty.revealDone && !document.querySelector('#kStrip').hidden, null, { timeout: 15000 }).catch(() => {});
    await p.waitForTimeout(900);
    await p.screenshot({ path: path.join(out, `jhyap-reveal-${s.n}-final.png`) });
    rep[s.n] = await p.evaluate(() => ({ phase: window.__table.S.phase, kind: window.__table.S.result?.kind, totals: window.__table.S.result?.totals, strip: document.querySelector('#kStrip').innerText, upFaces: document.querySelectorAll('#kCards .card:not(.down)').length, backs: document.querySelectorAll('#kCards .card.down').length, modal: !document.querySelector('#otSheet').hidden }));
    rep[s.n].errs = errs; rep[s.n].called = called; rep[s.n].over = over;
    await ctx.close();
  }
  console.log(JSON.stringify(rep, null, 1));
  await browser.close();
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
