from pathlib import Path
import re
for name in ['public/table-ui.js','table-games.js']:
 p=Path(name);s=p.read_text();s=re.sub(r"(?<=[\]\)'0-9])to",'?',s);s=s.replace('rtor.kind','r?r.kind').replace('rto.hands','r?.hands').replace('handstor.hands','hands?r.hands').replace('S.youto','S.you?').replace('S.readyto.','S.ready?.').replace('p.onlineto','p.online?').replace('S.handto.','S.hand?.').replace('beatentototals','beaten?totals').replace('beatento','beaten?').replace('i===sto','i===s?').replace('intlto','intl?').replace('!intlto','!intl?').replace('r.winnerto','r.winner?');p.write_text(s)
