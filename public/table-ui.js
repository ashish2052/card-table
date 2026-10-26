(()=>{
const $=s=>document.querySelector(s);
let S,send,rows=[],selection=new Set(),round=-1,sprites=new Map();
window.tableOptions=()=>({a23:$('#a23')?.checked?'low':'second',k235:!!$('#k235')?.checked,quads:!$('#noquads')?.checked,variant:$('#international')?.checked?'international':'nepal'});
$('#gamepicker').onclick=e=>{let b=e.target.closest('button');if(!b)return;window.selectedGame=b.dataset.game;$('#gamepicker').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));$('#gameoptions').innerHTML=window.selectedGame==='kitty'?'<p class="hint">9 cards  /  three shows  /  strongest hand first</p><label><input type="checkbox" id="a23"> A-2-3 lowest</label> <label><input type="checkbox" id="k235"> Special 2-3-5</label> <label><input type="checkbox" id="noquads"> Disable instant four of a kind</label>':window.selectedGame==='jhyap'?'<p class="hint">5 cards  /  throw then draw  /  call at 5 or less</p><label><input id="international" type="checkbox"> International (jokers, J=10, +30 penalty)</label>':''};
let el=document.createElement('section');el.id='otherTable';el.hidden=true;
el.innerHTML='<div id="felt"></div><div id="kLayer"><div class="mark">किट्टी</div><div id="kPods"></div><div id="kBanner"></div><div id="kCards"></div><div id="kLabels"></div><div id="kActions"><span id="kHint"></span><button class="btn" id="kSort" type="button">Sort by rank</button><button class="btn gold" id="kReady" type="button">Ready</button></div><div id="kStrip" hidden></div></div><div class="otTop"><b id="otTitle"></b><span id="otRoom"></span><button class="btn" id="otScores" type="button">Scores</button><button class="btn" id="otRules" type="button">Rules</button><button class="btn" id="otFull" type="button" title="Full screen">⛶</button><button class="btn" id="otExit" type="button">Exit</button></div><div id="otPlayers"></div><div id="otStatus"></div><div id="otRows"></div><div id="otCards"></div><div id="otPile"></div><div id="otActions"></div><div id="otResult" hidden></div>';
document.body.append(el);
let style=document.createElement('style');
style.textContent=`#otherTable{position:fixed;inset:0;color:#f9edce;background:#0b3029;overflow:hidden}#otherTable[hidden]{display:none}
.otTop{position:absolute;top:8px;left:16px;right:16px;display:flex;gap:10px;align-items:center;z-index:80}.otTop b{font:700 22px Fraunces,Georgia,serif}.otTop span{flex:1;font-size:13px}
#otPlayers{position:absolute;top:58px;left:10%;right:10%;display:flex;justify-content:space-around;text-align:center;font-size:13px}
#otStatus{position:absolute;top:100px;left:0;right:0;text-align:center;color:#f6c453}
#otRows{position:absolute;inset:130px 0 55px;display:flex;flex-direction:column;justify-content:space-around;align-items:center}
.otRow{width:310px;height:28%;border:1px dashed #e8c47070;border-radius:14px;position:relative}
.otRow span{position:absolute;right:100%;width:190px;top:30%;padding-right:16px;text-align:right;font-size:13px}
#otCards .oc{position:absolute;left:0;top:0;width:var(--ocw);height:calc(var(--ocw)*1.4);transition:transform .55s var(--sp,ease);touch-action:none;cursor:grab;filter:drop-shadow(0 4px 4px #0008)}
#otCards .oc.selected{filter:drop-shadow(0 0 5px #ffd45c)}
#otCards svg,#otPile svg{width:100%;height:100%}
#otActions{position:absolute;bottom:8px;left:0;right:0;display:flex;justify-content:center;gap:10px;z-index:5}
#otPile{position:absolute;top:36%;left:25%;display:flex;gap:12px}
#otPile button{width:65px;height:91px;background:#133f35;border:1px dashed #cfb779;border-radius:7px;color:#fff;padding:0}
#otResult{position:absolute;inset:100px 14% 55px;background:#142d28f5;border:1px solid #bfa263;border-radius:16px;padding:18px;overflow:auto;z-index:90}
#otResult[hidden]{display:none}#otResult table{width:100%}
#kLayer{position:absolute;inset:0;pointer-events:none;display:none}
#otherTable[data-game=kitty] #kLayer{display:block}
#otherTable[data-game=kitty] #otPlayers,#otherTable[data-game=kitty] #otStatus,#otherTable[data-game=kitty] #otRows,#otherTable[data-game=kitty] #otPile,#otherTable[data-game=kitty] #otActions,#otherTable[data-game=kitty] #otCards{display:none}
#kPods{position:absolute;inset:0;z-index:20;pointer-events:none}
#kBanner{position:absolute;left:50%;top:7px;translate:-50% 0;z-index:70;padding:3px 12px;border-radius:99px;background:#000c;border:1px solid #e9b44c88;font-weight:700;font-size:13px;white-space:nowrap;max-width:46vw;overflow:hidden;text-overflow:ellipsis;text-align:center;pointer-events:none}
#kHint{align-self:center;font-size:12px;font-weight:700;color:#f6d58a}
#kCards{position:absolute;inset:0;z-index:10;pointer-events:none}
#kLabels{position:absolute;inset:0;z-index:12;pointer-events:none}
#kLabels .gl{text-transform:none;letter-spacing:0}
#kActions{position:absolute;left:0;right:0;z-index:30;display:flex;justify-content:center;gap:8px}
#kActions[hidden]{display:none}
#kActions button{pointer-events:auto}
#kStrip{position:absolute;left:50%;bottom:8px;translate:-50% 0;z-index:40;display:flex;gap:10px;align-items:center;background:#061c18ee;border:1px solid #e9b44c;border-radius:999px;padding:4px 6px 4px 14px;font-size:13px;max-width:96vw;pointer-events:auto;white-space:nowrap}
#kStrip[hidden]{display:none}
#kStrip em{color:#f6d58a;font-style:normal;font-weight:700}
.card.win .f{filter:drop-shadow(0 0 10px #f6d58a) drop-shadow(0 10px 12px #000c)}
@media(max-height:500px){.otTop b{font-size:16px}#otPlayers{top:46px}#otStatus{top:78px}#otRows{top:105px}.otRow{width:220px}.otRow span{width:160px;font-size:11px}#otResult{inset:82px 10% 52px}#kBanner{top:6px;font-size:12px;max-width:42vw}}`;
document.head.append(style);
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const PAL=['#f6c453','#7fd1b9','#f08a7c','#a99cf0','#8ec3f2'];
function action(id,label,fn,disabled=false){let b=document.createElement('button');b.id=id;b.className='btn gold';b.type='button';b.textContent=label;b.disabled=disabled;b.onclick=fn;$('#otActions').append(b)}

// ----- Jhyap (unchanged card rows). Kitty never uses this path. -----
function position(){
  if(!S||S.phase==='lobby'||S.gameType==='kitty')return;
  let w=Math.min(100,innerHeight*.23);
  el.style.setProperty('--ocw',w+'px');
  let ids=new Set(S.handFlat.map(c=>c.id));
  for(let [id,d] of sprites)if(!ids.has(id)){d.style.transform=`translate(${innerWidth*.35}px,${innerHeight*.4}px) scale(.5)`;setTimeout(()=>d.remove(),550);sprites.delete(id)}
  let lookup=new Map(S.handFlat.map(c=>[c.id,c]));
  rows.forEach((r,ri)=>r.forEach((id,i)=>{
    let d=sprites.get(id);
    if(!d){
      d=document.createElement('div');d.className='oc';d.dataset.id=id;d.innerHTML=cardFace(lookup.get(id));$('#otCards').append(d);
      d.style.transform=`translate(${innerWidth/2}px,70px) scale(.35)`;sprites.set(id,d);
      d.onpointerdown=e=>{
        let x=e.clientX,y=e.clientY;d.setPointerCapture(e.pointerId);
        d.onpointermove=e=>{if(Math.hypot(e.clientX-x,e.clientY-y)>8){d.dataset.moved='1';d.style.transition='none';d.style.transform=`translate(${e.clientX-w/2}px,${e.clientY-w*.7}px)`}};
        d.onpointerup=e=>{
          d.onpointermove=null;d.style.transition='';
          if(d.dataset.moved) delete d.dataset.moved;
          else selection.has(id)?selection.delete(id):selection.add(id);
          Sfx.pick();paint();
        };
        requestAnimationFrame(()=>position());
      };
    }
    let x=innerWidth/2+(i-(r.length-1)/2)*w*.8-w/2, y=innerHeight-w*1.4-60;
    d.classList.toggle('selected',selection.has(id));
    d.style.transform=`translate(${x}px,${y-(selection.has(id)?10:0)}px)`;
    d.style.zIndex=20+i;
  }));
}
function scores(){
  let r=S.result;
  $('#otResult').hidden=false;
  $('#otResult').innerHTML='<h2>'+esc(r?r.kind:'Running scores')+'</h2><table>'+S.players.map(p=>'<tr><td>'+esc(p.name)+'</td><td>'+p.total+' pts</td></tr>').join('')+'</table><p>'+(r?.hands?r.hands.map((h,i)=>'Show '+(i+1)+': '+esc(S.players[h.winner].name)).join('  /  '):'')+'</p>'+S.history.map(h=>'<p>Round '+h.round+': '+h.rows.map(row=>esc(S.players[row.seat].name)+' '+(row.net>0?'+':'')+row.net).join('  /  ')+'</p>').join('')+(r?.revealed?r.revealed.map((hand,i)=>'<p>'+esc(S.players[i].name)+'</p>'+hand.map((row,j)=>'<div style="display:inline-block;margin:6px">Show '+(j+1)+'<br>'+row.map(c=>'<span style="display:inline-block;width:35px;height:49px">'+cardFace(c)+'</span>').join('')+'</div>').join('')).join(''):'')+'<button class="btn" id="otClose" type="button">Close</button>';
  $('#otClose').onclick=()=>$('#otResult').hidden=true;
}
$('#otScores').onclick=scores;
$('#otRules').onclick=()=>{alert(S&&S.gameType==='kitty'?'Arrange nine cards into three sets, strongest first. Cards 1-3 are shown first, then 4-6, then 7-9. Trial beats a pure run, then a run, colour, pair, high card. Drag a card to a new slot, or tap two cards to swap. Win two shows in a row for the pot; all three is Salaami. A tied show carries to the player who would reveal next.':'Throw a single, same-rank group or suited run of 3+. Then draw stock or a card from the PREVIOUS throw. A=1, J=0 in Nepal, Q/K=10. Call JHYAP at start with 5 or less. Equal/lower opponent beats call: +25 (Nepal), others score zero. International: J=10, jokers=0, end cards only, +30. Lowest score wins.');};
$('#otFull').onclick=()=>{if(document.fullscreenElement)return document.exitFullscreen();document.documentElement.requestFullscreen?.().then(()=>screen.orientation?.lock?.('landscape')).catch(()=>{});};

function paintJhyap(){
  el.dataset.game='jhyap';
  $('#otTitle').textContent='Jhyap';
  $('#otRoom').textContent=S.code+'  /  Round '+S.round;
  $('#otPlayers').innerHTML=S.players.map(p=>'<div>'+esc(p.name)+(p.seat===S.you?' (you)':'')+'<br>'+p.total+' pts  /  '+p.count+' cards'+(p.online?'':'  /  offline')+'</div>').join('');
  $('#otStatus').textContent=S.phase==='over'?S.result.kind:S.players[S.turn].name+' - '+(S.step==='throw'?'throw cards or call JHYAP':'draw from stock or previous throw');
  $('#otActions').innerHTML='';$('#otPile').innerHTML='';
  if(S.phase==='over'){action('otNext','Deal next round',()=>send({t:'next'}));action('otShowScores','Round results',scores)}
  else{
    let turn=S.turn===S.you;
    action('otThrow','Throw selected',()=>{send({t:'throw',ids:[...selection]});selection.clear()},!turn||S.step!=='throw'||!selection.size);
    action('otCall','JHYAP ('+S.handFlat.reduce((v,c)=>v+(c.r===11&&S.opts.variant!=='international'?0:Math.min(c.r,10)),0)+' pts)',()=>send({t:'call'}),!turn||S.step!=='throw');
    let stock=document.createElement('button');stock.id='otStock';stock.textContent='Stock\n'+S.stock;stock.onclick=()=>send({t:'draw',from:'stock'});stock.disabled=!turn||S.step!=='draw';$('#otPile').append(stock);
    S.discard.forEach((c,i)=>{let b=document.createElement('button');b.innerHTML=cardFace(c);b.title='Previous throw';b.disabled=!turn||S.step!=='draw'||S.opts.variant==='international'&&i!==0&&i!==S.discard.length-1;b.onclick=()=>send({t:'draw',from:'discard',id:c.id});$('#otPile').append(b)});
  }
  position();
}

// ----- Kitty: same card size, fan, sprite and spring as Marriage (app.js). -----
const kspr=new Map(),track=[];
setInterval(()=>{
  if(!dealing)return;
  const node=$('#kCards .card.mine');if(!node)return;
  const r=node.getBoundingClientRect();
  const last=track[track.length-1];
  if(!last||Math.hypot(r.x-last.x,r.y-last.y)>2)track.push({t:Date.now(),x:r.x,y:r.y});
  if(track.length>50)track.shift();
},80);
let vw=0,vh=0,cw=66,ch=92,geo={},drag=null,armed=null,dealing=false,dealGen=0,dealTimer=0,showToken=0,showRunRound=-1,stage='idle',showN=-1,showAt=[],line='',placeNow=()=>{},winSeat=-1;
const RANKW={A:'Aces',K:'Kings',Q:'Queens',J:'Jacks',10:'Tens',9:'Nines',8:'Eights',7:'Sevens',6:'Sixes',5:'Fives',4:'Fours',3:'Threes',2:'Twos'};
function chunk(ids){return [ids.slice(0,3),ids.slice(3,6),ids.slice(6,9)]}
function handMap(){return new Map(S.handFlat.map(c=>[c.id,c]))}
function sizes(){
  vw=innerWidth;vh=innerHeight;
  cw=Math.max(46,Math.min(vh*0.17,vw*0.1,150));ch=cw*1.4;
  document.documentElement.style.setProperty('--cw',cw+'px');
  document.documentElement.style.setProperty('--ch',ch+'px');
}
function setT(node,t){node.style.transform=`translate(${(t.x-cw/2).toFixed(1)}px,${(t.y-ch/2).toFixed(1)}px) rotate(${(t.r||0).toFixed(2)}deg) scale(${t.s||1})`;node.style.zIndex=t.z||0}
function sprite(key,card,t,o){
  o=o||{};
  let sp=kspr.get(key);
  if(!sp){
    const node=document.createElement('div');
    node.className='card nt'+(o.down?' down':'');node.dataset.key=key;
    node.innerHTML='<div class="in"><div class="f"></div><div class="b"></div></div>';
    if(card)node.dataset.id=card.id;
    $('#kCards').appendChild(node);
    setT(node,o.from||t);void node.offsetWidth;node.classList.remove('nt');
    sp={el:node,key,card,down:!!o.down,f:node.querySelector('.f')};
    kspr.set(key,sp);
    if(o.delay)node.style.transitionDelay=o.delay+'ms';
    if(o.down&&o.reveal){const flipAt=(o.delay||0)+(o.revealAfter||520);setTimeout(()=>{if(!node.isConnected)return;node.classList.remove('down');sp.down=false},flipAt)}
    if(o.instant){node.classList.add('nt');setT(node,t);void node.offsetWidth;node.classList.remove('nt')}
  }
  sp.t=t;if(card)sp.card=card;
  if(card&&sp.f&&!sp.f.firstChild)sp.f.innerHTML=window.cardFace(card);
  if(o.down!==undefined&&!o.reveal&&sp.down!==!!o.down){sp.down=!!o.down;sp.el.classList.toggle('down',sp.down)}
  sp.el.classList.toggle('mine',!!o.mine);
  sp.el.classList.toggle('sel',!!o.sel);
  if(!(drag&&drag.moved&&drag.id===card?.id))setT(sp.el,t);
  return sp;
}
function setFace(sp,down,instant){
  if(!sp)return;
  if(instant){sp.el.firstChild.style.transition='none';sp.el.classList.toggle('down',down);void sp.el.offsetWidth;sp.el.firstChild.style.transition=''}
  else sp.el.classList.toggle('down',down);
  sp.down=down;
}
function handPos(gs){
  const flat=gs.flat(),n=flat.length,g=gs.length,pos=new Map(),gap=cw*0.32,avail=vw-28;
  let step=n>1?(avail-cw-(g-1)*gap)/(n-1):0;
  step=Math.max(cw*0.2,Math.min(cw*0.68,step));
  const total=cw+(n-1)*step+(g-1)*gap,x0=(vw-total)/2+cw/2,mid=(n-1)/2,curve=Math.min(0.06,2.4/Math.max(n,8))*(cw/66),baseY=vh-ch/2-8-mid*mid*curve;
  let k=0;
  gs.forEach((grp,gi)=>grp.forEach((id)=>{
    const d=k-mid;
    pos.set(id,{x:x0+k*step+gi*gap,y:baseY+d*d*curve,r:d*Math.min(0.9,14/Math.max(n,8)),z:20+k,gi,k});
    k++;
  }));
  return {pos,step};
}
function layoutGeo(){
  sizes();
  const n=S.players.length,my=S.you,opps=[];
  for(let k=1;k<n;k++)opps.push((my+k)%n);
  const podY=vh<500?56:44;
  const backsY=podY+28+ch*0.16;
  const handTop=vh-ch-12;
  const podClear=podY+36+ch*0.18;
  const cy=Math.max(podClear+52,Math.min((backsY+handTop)/2,handTop-ch*0.42));
  const oppX={};opps.forEach((s,i)=>oppX[s]=vw*(i+1)/(opps.length+1));
  geo={opps,oppX,podY,backsY,handTop,cy,deck:{x:vw/2,y:cy}};
  const gapTop=backsY+ch*0.2, gapBot=handTop-36;
  $('#kActions').style.top=Math.max(gapTop,gapTop+(gapBot-gapTop-44)/2)+'px';
  return geo;
}
function fanPos(seat,k,nb){
  return {x:geo.oppX[seat]+(k-(nb-1)/2)*cw*0.1,y:geo.backsY,r:(k-(nb-1)/2)*2.2,s:0.34,z:30+k};
}
function shortName(cs){
  const raw=Kitty.handName(cs,S.opts);
  if(raw.startsWith('Trail'))return 'Trial';
  if(raw.startsWith('Pure'))return 'Pure run';
  if(raw.startsWith('Sequence'))return 'Run';
  if(raw.startsWith('Colour'))return 'Colour';
  if(raw.startsWith('Pair'))return 'Pair';
  if(raw.startsWith('High'))return 'High card';
  if(raw.startsWith('2-3-5'))return '2-3-5';
  return raw;
}
function longName(cs){
  const raw=Kitty.handName(cs,S.opts);
  if(raw.startsWith('Trail of ')){const lab=raw.slice(9).replace(/s$/,'');return 'Trial of '+(RANKW[lab]||lab+'s')}
  if(raw.startsWith('Pure sequence '))return 'Pure run '+raw.slice(14);
  if(raw.startsWith('Sequence '))return 'Run '+raw.slice(9);
  return raw;
}
function canTouch(){return S&&S.phase==='play'&&!S.ready[S.you]&&!dealing&&!drag}
function commit(next){
  rows=next;armed=null;
  send({t:'arrange',groups:rows.map(g=>g.slice())});
  layoutPlay();
}
function sortRank(){
  const hm=handMap(),rk=c=>c.r===1?14:c.r;
  const flat=rows.flat().map(id=>hm.get(id)).filter(Boolean).sort((a,b)=>rk(b)-rk(a)||a.s.charCodeAt(0)-b.s.charCodeAt(0));
  commit(chunk(flat.map(c=>c.id)));Sfx.pick();
}
$('#kSort').onclick=()=>{if(canTouch())sortRank()};
$('#kReady').onclick=()=>{if(!canTouch())return;send({t:'ready',groups:rows.map(g=>g.slice())});Sfx.place()};
function paintPods(pulse){
  $('#kPods').innerHTML=geo.opps.map(s=>{
    const p=S.players[s],wait=S.phase==='play'&&!S.ready[s];
    return `<div class="pod${pulse===s?' turn':''}${p.online?'':' off'}" data-seat="${s}" style="left:${geo.oppX[s]}px;top:${geo.podY}px"><span class="av" style="background:${PAL[s]}">${esc((p.name||'?')[0]).toUpperCase()}</span><div><span class="n">${esc(p.name)}</span><small>${p.total} pts${wait?' · waiting':''}</small></div></div>`;
  }).join('');
}
function setBanner(main,sub){
  line=sub?main+' — '+sub:main;
  $('#kBanner').textContent=line;
}
function paintChrome(){
  $('#otTitle').textContent='Kitty';
  $('#otRoom').textContent=S.code+'  /  Round '+S.round+'  /  pot '+(S.pot+S.players.length);
  const touch=S.phase==='play'&&!S.ready[S.you]&&!dealing;
  $('#kActions').hidden=!touch;
  if(S.phase!=='over'){
    const hint=$('#kHint');
    if(dealing){setBanner('Dealing');if(hint)hint.textContent=''}
    else if(!S.ready[S.you]){
      const hm=handMap(),ordered=rows.every(g=>g.length===3)&&Kitty.rowsInOrder(rows.map(g=>g.map(id=>hm.get(id))),S.opts);
      setBanner('waiting for you');
      if(hint)hint.textContent=ordered?'':'strongest set first';
    }else{setBanner('Waiting for the table');if(hint)hint.textContent=''}
  }
  paintPods(winSeat);
}
function layoutPlay(){
  layoutGeo();
  paintChrome();
  const hm=handMap(),dealingNow=dealing,n=S.players.length,my=S.you;
  const dealRel=s=>(s-S.dealer-1+n)%n;
  if(dealingNow)sprite('deck',null,geo.deck,{down:true,instant:true});
  else {const d=kspr.get('deck');if(d){d.el.remove();kspr.delete('deck')}}
  geo.opps.forEach(s=>{
    const nb=9;
    for(let k=0;k<nb;k++){
      const t=fanPos(s,k,nb);
      const delay=(k*n+dealRel(s))*26;
      sprite('o'+s+'_'+k,null,t,{down:true,from:dealingNow?{x:geo.deck.x,y:geo.deck.y,s:0.34,r:0}:undefined,delay:dealingNow?delay:0});
    }
  });
  const gs=drag&&drag.moved&&drag.tmp?drag.tmp:rows;
  const {pos}=handPos(gs);
  pos.forEach((p,id)=>{
    const c=hm.get(id);if(!c)return;
    const delay=(p.k*n+dealRel(my))*26;
    const fresh=!kspr.has('c'+id);
    const opt={mine:true,sel:armed===id};
    if(fresh&&dealingNow){opt.from={...geo.deck,s:0.9,r:0};opt.down=true;opt.reveal=true;opt.revealAfter=520;opt.delay=delay}
    sprite('c'+id,c,{x:p.x,y:p.y,r:p.r,s:1,z:p.z+(armed===id?300:0)},opt);
    const node=kspr.get('c'+id).el;node.dataset.slot=String(p.k);
  });
  const titles=['1st','2nd','3rd'];
  let html='';
  if(!dealingNow)rows.forEach((g,gi)=>{
    const cs=g.map(id=>hm.get(id)).filter(Boolean);if(cs.length<3)return;
    const mid=pos.get(g[1]);if(!mid)return;
    const pure=Kitty.cat(cs,S.opts)>=5;
    html+=`<div class="gl${pure?' pure':''}" style="left:${mid.x-cw/2}px;top:${mid.y-ch/2-2}px">${titles[gi]} · ${esc(shortName(cs))}</div>`;
  });
  $('#kLabels').innerHTML=html;
}
function beginDeal(){
  showToken++;showRunRound=-1;armed=null;dealing=true;stage='deal';showN=-1;showAt=[];winSeat=-1;line='';placeNow=()=>{};track.length=0;
  dealGen++;
  kspr.forEach(s=>s.el.remove());kspr.clear();
  $('#kStrip').hidden=true;$('#kLabels').innerHTML='';
  const n=S.players.length,last=(8*n+(n-1))*26;
  clearTimeout(dealTimer);
  dealTimer=setTimeout(()=>{
    if(!S||S.round!==round||S.phase==='over')return;
    kspr.forEach(s=>{
      s.el.style.transitionDelay='';
      if(s.el.firstChild)s.el.firstChild.style.transitionDelay='';
      if(s.el.classList.contains('mine')){s.el.classList.remove('down');s.down=false}
    });
    const d=kspr.get('deck');if(d){d.el.remove();kspr.delete('deck')}
    dealing=false;layoutPlay();stage='hand';
  },last+1200);
  for(let i=0;i<9*n;i++)setTimeout(()=>Sfx.deal(i),i*26);
}
function centerPos(seat,ci){
  const seats=S.players.map(p=>p.seat),n=seats.length,si=Math.max(0,seats.indexOf(seat));
  let scale=vh<520?0.62:0.72;
  const fit=sc=>{const w=cw*sc,st=w*0.5,gap=Math.max(8,w*0.18),gw=w+2*st;return {w,st,gap,gw,total:n*gw+(n-1)*gap}};
  let g=fit(scale);if(g.total>vw-16){scale*=(vw-16)/g.total;g=fit(scale)}
  const x0=(vw-g.total)/2;
  return {x:x0+si*(g.gw+g.gap)+ci*g.st+g.w/2,y:geo.cy,r:0,s:scale,z:100+ci};
}
function homeShow(seat,show,ci){
  const rev=S.result.revealed;
  if(seat===S.you){
    const ids=rev[seat].flat().map(c=>c.id);
    const p=handPos(chunk(ids)).pos.get(rev[seat][show][ci].id);
    return {x:p.x,y:p.y,r:p.r,s:1,z:p.z};
  }
  return fanPos(seat,show*3+ci,9);
}
function isTie(show){
  const rev=S.result.revealed,vals=rev.map(g=>Kitty.handValue(g[show],S.opts)),m=Math.max(...vals);
  return vals.filter(v=>v===m).length>1;
}
function putCards(show,where,faceDown,lift){
  const rev=S.result.revealed;
  rev.forEach((groups,seat)=>{
    (groups[show]||[]).forEach((c,ci)=>{
      let t=where==='center'?centerPos(seat,ci):homeShow(seat,show,ci);
      if(lift&&seat===winSeat)t={...t,y:t.y-Math.min(26,ch*0.16),z:220};
      let sp=kspr.get('c'+c.id);
      if(!sp)sp=sprite('c'+c.id,c,t,{down:true,instant:true});
      setFace(sp,faceDown,faceDown);
      sp.el.classList.toggle('win',!!(lift&&seat===winSeat&&!faceDown));
      sp.el.classList.toggle('mine',where!=='center'&&seat===S.you);
      sp.el.classList.remove('sel');
      setT(sp.el,t);sp.t=t;
    });
  });
}
function hideBacks(){
  kspr.forEach((sp,key)=>{if(String(key)[0]==='o'||key==='deck'){sp.el.remove();kspr.delete(key)}});
}
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function playShowdown(){
  const token=++showToken;
  layoutGeo();
  const res=S.result;
  if(!res||!res.hands||!res.hands.length){
    hideBacks();
    const name=res&&res.winner>=0?S.players[res.winner].name:'Four of a kind';
    setBanner(name+' wins','four of a kind');
    winSeat=res?res.winner:-1;paintPods(winSeat);
    stage='result';showN=3;showStrip();Sfx.win();return;
  }
  hideBacks();
  const rev=res.revealed;
  rev.forEach((groups,seat)=>{
    if(seat===S.you)return;
    groups.flat().forEach((c,k)=>{sprite('c'+c.id,c,fanPos(seat,k,9),{down:true,instant:true})});
  });
  $('#kLabels').innerHTML='';
  for(let show=0;show<3;show++){
    if(token!==showToken)return;
    const tie=isTie(show);
    winSeat=tie?-1:res.hands[show].winner;
    showN=show;stage='slide';if(!showAt[show])showAt[show]=Date.now();
    const wname=S.players[res.hands[show].winner].name;
    const title=longName(rev[res.hands[show].winner][show]);
    setBanner(tie?'Carry':wname+' wins Show '+(show+1)+' - '+title, tie?'tie - the show carries over':'');
    paintPods(winSeat);
    for(let p=0;p<show;p++)putCards(p,'home',false,false);
    putCards(show,'center',true,false);
    placeNow=()=>{layoutGeo();for(let p=0;p<show;p++)putCards(p,'home',false,false);putCards(show,'center',true,false);paintPods(winSeat)};
    await wait(580);
    if(token!==showToken)return;
    stage='flip';
    putCards(show,'center',false,!tie);
    Sfx.show();
    placeNow=()=>{layoutGeo();for(let p=0;p<show;p++)putCards(p,'home',false,false);putCards(show,'center',false,!tie);paintPods(winSeat)};
    await wait(480);
    if(token!==showToken)return;
    stage='hold';
    await wait(1200);
    if(token!==showToken)return;
    kspr.forEach(sp=>sp.el.classList.remove('win'));
  }
  if(token!==showToken)return;
  winSeat=res.winner;paintPods(winSeat>=0?winSeat:-1);
  stage='result';showN=3;showStrip();Sfx.win();
  placeNow=()=>{layoutGeo();for(let p=0;p<2;p++)putCards(p,'home',false,false);putCards(2,'center',false,false);paintPods(winSeat)};
}
function showStrip(){
  const r=S.result;if(!r)return;
  const bits=(r.rows||[]).map(row=>esc(S.players[row.seat].name)+' '+(row.net>0?'+':'')+row.net).join('   ·   ');
  $('#kStrip').hidden=false;
  $('#kStrip').style.bottom='auto';
  $('#kStrip').style.top=Math.min(geo.handTop-42, geo.cy+ch*0.4)+'px';
  $('#kStrip').innerHTML=`<span>${bits}</span><em>${esc(r.kind||'')}</em><button class="btn gold" id="kNext" type="button">Deal next round</button>`;
  $('#kNext').onclick=()=>send({t:'next'});
}
function paintKitty(){
  el.dataset.game='kitty';
  if(S.phase==='over'){
    layoutGeo();paintChrome();
    if(showRunRound!==S.round){showRunRound=S.round;playShowdown()}
    return;
  }
  layoutPlay();
}
function slotOf(px){
  const {pos}=handPos(rows);
  let best=0,bd=1e9,i=0;
  rows.flat().forEach(id=>{const x=pos.get(id).x;const d=Math.abs(px-x);if(d<bd){bd=d;best=i}i++});
  return best;
}
function preview(flat,id,to){
  const rest=flat.filter(x=>x!==id),slots=Array(9).fill(null);
  let r=0;for(let i=0;i<9;i++)if(i!==to)slots[i]=rest[r++];
  slots[to]=id;
  return chunk(slots);
}
$('#kCards').addEventListener('pointerdown',e=>{
  const node=e.target.closest('.card.mine');if(!node||drag||!canTouch())return;
  Sfx.unlock();
  const id=+node.dataset.id;
  drag={id,el:node,sx:e.clientX,sy:e.clientY,moved:false,base:kspr.get('c'+id)?.t,pid:e.pointerId};
  try{node.setPointerCapture(e.pointerId)}catch{}
});
window.addEventListener('pointermove',e=>{
  if(!drag||e.pointerId!==drag.pid||S?.gameType!=='kitty')return;
  const dx=e.clientX-drag.sx,dy=e.clientY-drag.sy;
  if(!drag.moved&&Math.hypot(dx,dy)>8){drag.moved=true;drag.el.classList.add('drag');Sfx.pick()}
  if(!drag.moved)return;
  const t={x:drag.base.x+dx,y:drag.base.y+dy,r:Math.max(-18,Math.min(18,dx*0.05)),s:1.12,z:999};
  setT(drag.el,t);
  const to=slotOf(t.x),flat=rows.flat();
  const tmp=preview(flat,drag.id,to),key=JSON.stringify(tmp);
  if(key!==drag.key){drag.key=key;drag.tmp=tmp;layoutPlay();Sfx.tick()}
});
function endDrag(e){
  if(!drag||(e&&e.pointerId!==drag.pid))return;
  const d=drag;drag=null;d.el.classList.remove('drag');
  if(S?.gameType!=='kitty')return;
  if(!d.moved){
    if(armed==null){armed=d.id;Sfx.pick();layoutPlay();return}
    if(armed===d.id){armed=null;Sfx.pick();layoutPlay();return}
    const flat=rows.flat(),i=flat.indexOf(armed),j=flat.indexOf(d.id);
    if(i>=0&&j>=0){[flat[i],flat[j]]=[flat[j],flat[i]];commit(chunk(flat));Sfx.place()}
    return;
  }
  if(d.tmp)commit(d.tmp);
  else layoutPlay();
  Sfx.place();
}
window.addEventListener('pointerup',endDrag);
window.addEventListener('pointercancel',endDrag);

function paint(){
  if(!S||S.phase==='lobby')return;
  if(S.gameType==='kitty'){paintKitty();return}
  paintJhyap();
}
window.__kitty={
  get rows(){return rows.map(r=>r.slice())},
  get show(){return showN},
  get stage(){return stage},
  get dealing(){return dealing},
  get dealGen(){return dealGen},
  get showAt(){return showAt.slice()},
  get track(){return track.slice()},
  get line(){return line},
  sent:[]
};
window.drawTableGame=(state,fn)=>{
  S=state;
  const raw=fn;
  send=m=>{try{window.__kitty.sent.push(JSON.parse(JSON.stringify(m)))}catch(e){}raw(m)};
  window.__table={get S(){return S},get rows(){return rows}};
  $('#game').hidden=true;
  if(S.phase==='lobby'){
    el.hidden=true;$('#lobby').hidden=false;$('#entry').hidden=true;$('#room').hidden=false;
    $('#roomcode').textContent=S.code;
    $('#plist').innerHTML=S.players.map(p=>'<li>'+esc(p.name)+'</li>').join('');
    $('#optrow').hidden=true;$('#optrow').style.display='none';
    $('#start').hidden=S.you!==S.host;$('#start').disabled=S.players.length<2;
    $('#addbot').hidden=S.you!==S.host||S.players.length>=5;
    return;
  }
  $('#lobby').hidden=true;el.hidden=false;
  if(round!==S.round){
    round=S.round;
    rows=S.gameType==='kitty'
      ?(S.hand?.map(r=>r.map(c=>c.id))||chunk(S.handFlat.map(c=>c.id)))
      :[S.handFlat.map(c=>c.id)];
    $('#otResult').hidden=true;selection.clear();armed=null;
    if(S.gameType==='kitty')beginDeal();
    else Sfx.deal(1);
  }else if(S.gameType==='jhyap')rows=[S.handFlat.map(c=>c.id)];
  paint();
  if(S.phase==='over'&&S.gameType!=='kitty')scores();
};
addEventListener('resize',()=>{if(!el.hidden){if(S&&S.gameType==='kitty'&&S.phase==='over')placeNow();else paint()}});
})();

document.addEventListener('click',e=>{if(e.target.id!=='otExit'||!confirm('Leave this game?'))return;localStorage.removeItem('marriage.session');if(document.fullscreenElement)document.exitFullscreen().catch(()=>{});location.href='/'});
