from pathlib import Path
for name in ['public/table-ui.js','table-games.js']:
 p=Path(name);s=p.read_bytes().decode('cp1252');s=s.replace('·',' / ').replace('?','to').replace('—','-');p.write_text(s,encoding='utf-8')
p=Path('public/table-ui.js');s=p.read_text();s=s.replace('#otCards .oc{position:absolute;','#otCards .oc{position:absolute;left:0;top:0;');s=s.replace('strongest ? weakest','strongest to weakest').replace('Ready ? show hands','Ready - show hands');p.write_text(s)
p=Path('test/table-play.py');s=p.read_text();s=s.replace("localStorage.setItem('marriage.muted','1')","localStorage.setItem('marriage.mute','1')");s=s.replace("page.screenshot(path=f'shots/{game}-{size[0]}-play.png');page.locator", "page.wait_for_timeout(800);page.screenshot(path=f'shots/{game}-{size[0]}-play.png');page.locator");p.write_text(s)

