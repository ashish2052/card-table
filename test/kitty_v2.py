# Kitty table v2: two full rounds vs 4 computers, phone and laptop.
# Playwright + msedge. Mute so headless Edge never opens an AudioContext.
import json, re, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SHOTS = ROOT / 'shots'
SHOTS.mkdir(exist_ok=True)
URL = 'http://127.0.0.1:8850'

def flat(page):
    return page.evaluate('__kitty.rows.flat()')

def shot(page, name):
    path = SHOTS / name
    page.screenshot(path=str(path))
    return str(path)

def on_screen(page):
    return page.evaluate('''() => {
      const cards = [...document.querySelectorAll('#kCards .card.mine')];
      return cards.map(el => {
        const r = el.getBoundingClientRect();
        return {id: +el.dataset.id, l: r.left, t: r.top, r: r.right, b: r.bottom, w: r.width, h: r.height};
      });
    }''')

def assert_hand(page, vw, vh, errors):
    boxes = on_screen(page)
    if len(boxes) != 9:
        errors.append(f'hand count {len(boxes)} at {vw}x{vh}')
        return
    for b in boxes:
        if b['w'] < 20 or b['h'] < 28:
            errors.append(f"card {b['id']} tiny {b}")
        if b['l'] < -1 or b['t'] < -1 or b['r'] > vw + 1 or b['b'] > vh + 1:
            errors.append(f"card {b['id']} off screen {b} in {vw}x{vh}")

def no_auto(page, errors):
    bad = page.evaluate('''() => [...document.querySelectorAll('button')].filter(b => /auto/i.test(b.textContent||'') && b.offsetParent).map(b => b.textContent)''')
    if bad:
        errors.append('visible auto button ' + str(bad))
    if page.locator('#otAuto').count():
        errors.append('otAuto still in the DOM')

def drag_reorder(page, errors):
    before = flat(page)
    box = page.locator('#kCards .card.mine').first.bounding_box()
    x, y = box['x'] + box['width'] / 2, box['y'] + box['height'] / 2
    page.mouse.move(x, y)
    page.mouse.down()
    page.mouse.move(x + 240, y, steps=14)
    page.mouse.up()
    page.wait_for_timeout(350)
    after = flat(page)
    sent = page.evaluate('''() => __kitty.sent.filter(m => m.t === "arrange").map(m => m.groups.flat())''')
    if after == before:
        errors.append('drag did not change order ' + str(before))
    if not sent or sent[-1] != after:
        errors.append('drag order not sent ' + str(sent[-1] if sent else None) + ' vs ' + str(after))
    return before != after

def tap_swap(page, errors):
    ids = flat(page)
    a, b = ids[0], ids[4]
    page.locator(f'#kCards .card.mine[data-id="{a}"]').click()
    page.locator(f'#kCards .card.mine[data-id="{b}"]').click()
    page.wait_for_timeout(200)
    after = flat(page)
    sent = page.evaluate('''() => __kitty.sent.filter(m => m.t === "arrange").map(m => m.groups.flat())''')
    if after[0] != b or after[4] != a:
        errors.append(f'tap-swap failed {ids} -> {after}')
    if not sent or sent[-1] != after:
        errors.append('tap-swap not sent')
    return after != ids

def legalize(page):
    want = page.evaluate('''() => {
      const S = __table.S, by = new Map(S.handFlat.map(c => [c.id, c]));
      const cards = __kitty.rows.flat().map(id => by.get(id));
      return Kitty.autoArrange(cards, S.opts).map(g => g.map(c => c.id)).flat();
    }''')
    for i in range(9):
        now = flat(page)
        if now[i] == want[i]:
            continue
        j = now.index(want[i])
        page.locator(f'#kCards .card.mine[data-id="{now[i]}"]').click()
        page.locator(f'#kCards .card.mine[data-id="{now[j]}"]').click()
        page.wait_for_timeout(80)
    ok = page.evaluate('''() => {
      const by = new Map(__table.S.handFlat.map(c => [c.id, c]));
      return Kitty.rowsInOrder(__kitty.rows.map(g => g.map(id => by.get(id))), __table.S.opts);
    }''')
    if not ok:
        raise AssertionError('hand still out of order ' + str(flat(page)))

def play_round(page, tag, vw, vh, errors, pictures):
    page.wait_for_function('window.__kitty && __kitty.dealing === true', timeout=15000)
    page.wait_for_selector('#kCards .card')
    page.wait_for_timeout(220)
    if pictures:
        shot(page, f'kitty-v2-{tag}-deal.png')
    page.wait_for_function('__kitty.stage === "hand" && !__kitty.dealing', timeout=8000)
    downs = page.evaluate('document.querySelectorAll("#kCards .card.mine.down").length')
    if downs:
        errors.append(f'{tag} {downs} of his cards still face down')
    span = page.evaluate('''() => {
      const t = __kitty.track;
      let m = 0;
      for (let i = 1; i < t.length; i++) m = Math.max(m, Math.hypot(t[i].x - t[0].x, t[i].y - t[0].y));
      return {m, n: t.length};
    }''')
    if span['m'] < 8:
        errors.append(f"{tag} deal did not move ({span['m']:.1f}px over {span['n']} samples)")
    assert_hand(page, vw, vh, errors)
    no_auto(page, errors)
    if pictures:
        shot(page, f'kitty-v2-{tag}-hand.png')
    drag_reorder(page, errors)
    tap_swap(page, errors)
    legalize(page)
    page.locator('#kReady').click()
    for show in (0, 1, 2):
        page.wait_for_function(f'__kitty.show === {show} && __kitty.stage === "flip"', timeout=20000)
        page.wait_for_timeout(260)
        if pictures:
            shot(page, f'kitty-v2-{tag}-show{show+1}.png')
    page.wait_for_function('__kitty.stage === "result" && __kitty.show === 3', timeout=15000)
    gaps = page.evaluate('__kitty.showAt')
    if len(gaps) < 3 or gaps[1] - gaps[0] < 900 or gaps[2] - gaps[1] < 900:
        errors.append(f'{tag} shows not spaced {gaps}')
    if pictures:
        shot(page, f'kitty-v2-{tag}-result.png')
    if page.locator('#kNext').count() != 1:
        errors.append(f'{tag} missing Deal next round')

def kitty(page, vw, vh, errors):
    page.goto(URL)
    page.evaluate('Sfx.muted = true')
    page.locator('[data-game=kitty]').click()
    page.locator('#noquads').check()
    page.locator('#name').fill('Ashish')
    page.locator('#botseg [data-v="4"]').click()
    page.locator('#vsbot').click()
    page.wait_for_function('window.__table && __table.S.phase === "play" && __table.S.gameType === "kitty"')
    quads = page.evaluate('__table.S.opts.quads')
    if quads is not False:
        errors.append(f'quads option {quads}')
    play_round(page, f'{vw}x{vh}', vw, vh, errors, True)
    gen = page.evaluate('__kitty.dealGen')
    page.locator('#kNext').click()
    page.wait_for_function(f'__kitty.dealGen === {gen + 1} && __table.S.round === 2', timeout=10000)
    play_round(page, f'{vw}x{vh}-r2', vw, vh, errors, False)

def smoke(browser, errors):
    ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
    ctx.add_init_script("localStorage.setItem('marriage.mute','1')")
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append('marriage ' + str(e)))
    page.goto(URL)
    page.evaluate('Sfx.muted = true')
    page.locator('#botseg [data-v="1"]').click()
    page.locator('#vsbot').click()
    page.wait_for_function('document.querySelectorAll("#cards .card").length > 8', timeout=15000)
    page.wait_for_function('''() => {
      const S = window.__S || null;
      return document.querySelector("#banner") && document.querySelector("#banner").textContent.length > 0;
    }''', timeout=10000)
    # Take a turn if it is ours, otherwise wait until the computer has drawn or thrown.
    acted = False
    for _ in range(40):
        state = page.evaluate('''() => {
          const b = document.querySelector("#banner");
          return {banner: b ? b.textContent : "", stock: document.querySelector("#stockSlot")?.classList.contains("can"), cards: document.querySelectorAll("#cards .card").length};
        }''')
        if state['stock']:
            page.locator('#stockSlot').click()
            acted = True
            break
        page.wait_for_timeout(200)
    if not acted:
        # Computer opened. Confirm the table advanced (banner or a discard face).
        page.wait_for_timeout(1200)
        faces = page.evaluate('document.querySelectorAll("#cards .card .f svg").length')
        if faces < 1:
            errors.append('marriage never played a turn')
    else:
        page.wait_for_timeout(400)
    ctx.close()

    ctx = browser.new_context(viewport={'width': 1280, 'height': 800})
    ctx.add_init_script("localStorage.setItem('marriage.mute','1')")
    page = ctx.new_page()
    page.on('pageerror', lambda e: errors.append('jhyap ' + str(e)))
    page.goto(URL)
    page.evaluate('Sfx.muted = true')
    page.locator('[data-game=jhyap]').click()
    page.locator('#botseg [data-v="1"]').click()
    page.locator('#vsbot').click()
    page.wait_for_function('window.__table && __table.S.phase === "play" && __table.S.gameType === "jhyap"', timeout=15000)
    acted = False
    for _ in range(50):
        s = page.evaluate('__table.S')
        if s['phase'] == 'over':
            acted = True
            break
        if s['turn'] == s['you']:
            if s['step'] == 'draw':
                page.locator('#otStock').click()
                acted = True
                break
            h = s['handFlat']
            v = lambda c: 0 if c['r'] == 11 else min(c['r'], 10)
            if sum(v(c) for c in h) <= 5:
                page.locator('#otCall').click()
            else:
                c = max(h, key=v)
                page.locator(f'.oc[data-id="{c["id"]}"]').click()
                page.locator('#otThrow').click()
            acted = True
            break
        page.wait_for_timeout(200)
    if not acted:
        errors.append('jhyap never played a turn')
    page.wait_for_timeout(400)
    ctx.close()

def main():
    errors = []
    shots = []
    with sync_playwright() as p:
        browser = p.chromium.launch(channel='msedge', headless=True)
        for vw, vh in ((853, 330), (1440, 900)):
            ctx = browser.new_context(viewport={'width': vw, 'height': vh})
            ctx.add_init_script("localStorage.setItem('marriage.mute','1')")
            page = ctx.new_page()
            page.emulate_media(reduced_motion='no-preference')
            page.on('pageerror', lambda e: errors.append(str(e)))
            try:
                kitty(page, vw, vh, errors)
            except Exception as e:
                errors.append(f'{vw}x{vh} {type(e).__name__}: {e}')
                try:
                    shot(page, f'kitty-v2-{vw}x{vh}-FAIL.png')
                except Exception:
                    pass
            ctx.close()
        try:
            smoke(browser, errors)
        except Exception as e:
            errors.append(f'smoke {type(e).__name__}: {e}')
        browser.close()
    shots = sorted(str(p) for p in SHOTS.glob('kitty-v2-*.png'))
    print(json.dumps({'errors': errors, 'shots': shots}, indent=2))
    if errors:
        raise SystemExit(1)

if __name__ == '__main__':
    main()
