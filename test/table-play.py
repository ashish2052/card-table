import json,time
from pathlib import Path
from playwright.sync_api import sync_playwright
errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(channel='msedge',headless=True)
 for size in [(844,390),(1920,1080)]:
  for game in ['kitty','jhyap']:
   ctx=b.new_context(viewport={'width':size[0],'height':size[1]})
   ctx.add_init_script("localStorage.setItem('marriage.mute','1');localStorage.setItem('marriage.sound','off')")
   page=ctx.new_page();page.on('pageerror',lambda e:errors.append(str(e)));page.on('console',lambda m:errors.append(m.text) if m.type=='error' else None)
   page.goto('http://localhost:8851');page.evaluate('Sfx.muted=true');page.locator('[data-game='+game+']').click();page.locator('#botseg [data-v="1"]').click();page.locator('#vsbot').click();page.wait_for_function('window.__table && __table.S.phase==="play"')
   if game=='kitty':
    page.locator('#otAuto').click();page.wait_for_timeout(800);page.screenshot(path=f'shots/{game}-{size[0]}-play.png');page.locator('#otReady').click()
   else:
    page.screenshot(path=f'shots/{game}-{size[0]}-play.png')
    for i in range(600):
     s=page.evaluate('__table.S')
     if s['phase']=='over':break
     if s['turn']==s['you']:
      if s['step']=='draw':page.locator('#otStock').click()
      else:
       h=s['handFlat'];v=lambda c:0 if c['r']==11 else min(c['r'],10)
       if sum(map(v,h))<=5:page.locator('#otCall').click()
       else:
        c=max(h,key=v);page.locator(f'.oc[data-id="{c["id"]}"]').click();page.locator('#otThrow').click()
     page.wait_for_timeout(150)
   page.wait_for_function('__table.S.phase==="over"',timeout=30000);page.screenshot(path=f'shots/{game}-{size[0]}-result.png')
   before=page.evaluate('({code:__table.S.code,you:__table.S.you,round:__table.S.round})');page.reload();page.wait_for_function('window.__table && __table.S.phase==="over"');after=page.evaluate('({code:__table.S.code,you:__table.S.you,round:__table.S.round})');assert before==after
   print(game,size,'round complete; reconnect same seat');ctx.close()
 b.close()
print('errors',errors)
assert not errors
