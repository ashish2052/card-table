import time,sys
from playwright.sync_api import sync_playwright
URL='http://localhost:8850'
INIT="localStorage.setItem('marriage.mute','1');(()=>{const O=WebSocket;window.WebSocket=function(...a){const w=new O(...a);window.__ws=w;return w};window.WebSocket.prototype=O.prototype;Object.assign(window.WebSocket,{OPEN:1,CONNECTING:0,CLOSING:2,CLOSED:3})})()"
def ready(page):
    page.wait_for_function('window.__kitty && __kitty.sent!==undefined && document.querySelector("#kReady") && !document.querySelector("#kActions").hidden',timeout=30000)
    page.wait_for_timeout(6500);page.evaluate("__ws.send(JSON.stringify({t:'ready',groups:Kitty.autoArrange(__table.S.handFlat,__table.S.opts).map(r=>r.map(c=>c.id))}))")
def watch(page,tag,size):
    t0=time.time();rounds=[];last=None;shown=None
    page.wait_for_function('document.querySelector("#kStrip") && !document.querySelector("#kStrip").hidden',timeout=60000)
    t_res=time.time()
    page.wait_for_timeout(900)
    page.screenshot(path=f'shots/kitty-pace-{tag}-{size[0]}.png')
    txt=page.locator('#kStrip').inner_text()
    r0=page.evaluate('__kitty.S?__kitty.S.round:null') if False else page.evaluate('document.querySelector("#otRoom").textContent')
    page.wait_for_timeout(12000)
    r1=page.evaluate('document.querySelector("#otRoom").textContent')
    print(tag,size,'banner:',txt.replace('\n',' | '),'| room before/after 12s:',r0,'->',r1,'strip still shown:',page.evaluate('!document.querySelector("#kStrip").hidden'))
    return t_res
with sync_playwright() as p:
    b=p.chromium.launch(channel='msedge',headless=True)
    for size in [(853,330),(1440,900)]:
        ctx=b.new_context(viewport={'width':size[0],'height':size[1]});ctx.add_init_script(INIT)
        page=ctx.new_page();errs=[];page.on('pageerror',lambda e:errs.append(str(e)))
        page.goto(URL,wait_until='domcontentloaded');page.locator('[data-game=kitty]').click();page.locator('#vsbot').click()
        ready(page);
        ts=time.time();
        # time the shows: from first strip-less result to strip
        t=watch(page,'bots',size);print('errors',errs)
        ctx.close()
        # 2 humans
        c1=b.new_context(viewport={'width':size[0],'height':size[1]});c1.add_init_script(INIT)
        c2=b.new_context(viewport={'width':size[0],'height':size[1]});c2.add_init_script(INIT)
        a=c1.new_page();a.goto(URL,wait_until='domcontentloaded');a.locator('[data-game=kitty]').click();a.locator('#name').fill('Alice');a.locator('#create').click()
        a.wait_for_selector('#roomcode');code=a.locator('#roomcode').inner_text().strip()
        bp=c2.new_page();bp.goto(URL,wait_until='domcontentloaded');bp.locator('[data-game=kitty]').click();bp.locator('#name').fill('Bob');bp.locator('#code').fill(code);bp.locator('#join').click()
        bp.wait_for_timeout(800);a.locator('#start').click()
        ready(a);ready(bp)
        watch(a,'2h',size)
        bp.screenshot(path=f'shots/kitty-pace-2h-bob-{size[0]}.png')
        c1.close();c2.close()
    b.close()
