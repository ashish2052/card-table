(()=>{
const $=s=>document.querySelector(s);
let S,send,rows=[],selection=new Set(),round=-1;
window.tableOptions=()=>({a23:$('#a23')?.checked?'low':'second',k235:!!$('#k235')?.checked,quads:!$('#noquads')?.checked,variant:$('#international')?.checked?'international':'nepal'});
$('#gamepicker').onclick=e=>{let b=e.target.closest('button');if(!b)return;window.selectedGame=b.dataset.game;$('#gamepicker').querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));$('#gameoptions').innerHTML=window.selectedGame==='kitty'?'<p class="hint">9 cards  /  three shows  /  strongest hand first</p><label><input type="checkbox" id="a23"> A-2-3 lowest</label> <label><input type="checkbox" id="k235"> Special 2-3-5</label> <label><input type="checkbox" id="noquads"> Disable instant four of a kind</label>':window.selectedGame==='jhyap'?'<p class="hint">5 cards  /  throw then draw  /  call at 5 or less  /  J, Q, K count 10</p><label><input id="international" type="checkbox"> International (jokers, +30 penalty)</label>':''};
let el=document.createElement('section');el.id='otherTable';el.hidden=true;
el.innerHTML='<div id="felt"></div><div id="kLayer"><div class="mark">किट्टी</div><div id="kPods"></div><div id="turnBanner" hidden></div><div id="kBanner"></div><div id="kCards"></div><div id="kLabels"></div><div id="kActions"><span id="kHint"></span><button class="btn kit" id="kSort" type="button">Sort by rank</button><button class="btn gold kit" id="kReady" type="button">Ready</button><button class="btn gold jh" id="jThrow" type="button">Throw</button><button class="btn red jh" id="jCall" type="button">JHYAP</button></div><div id="kStrip" hidden></div></div><div class="otTop"><b id="otTitle"></b><span id="otRoom"></span><button class="btn" id="otScores" type="button">Scores</button><button class="btn" id="otRules" type="button">Rules</button><button class="btn" id="otFull" type="button" title="Full screen">⛶</button><button class="btn" id="otExit" type="button">Exit</button></div><div id="otSheet" hidden><div class="sheetp" id="otSheetBody"></div></div>';
document.body.append(el);
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
const PAL=['#f6c453','#7fd1b9','#f08a7c','#a99cf0','#8ec3f2'];
const val=c=>c.r===0?0:Math.min(c.r,10); // A=1, J/Q/K=10, printed joker 0 (same as the server)
const handPts=()=>S.handFlat.reduce((t,c)=>t+val(c),0);
function legalC(cs){if(!cs.length)return false;const plain=cs.filter(c=>c.r);if(cs.length===1||plain.every(c=>c.r===plain[0].r))return true;if(cs.length<3||!plain.every(c=>c.s===plain[0].s))return false;const rs=plain.map(c=>c.r).sort((a,b)=>a-b);return new Set(rs).size===rs.length&&rs.at(-1)-rs[0]+1<=cs.length&&rs.at(-1)<=13}
const nm=q=>q===S.you?'You':esc(S.players[q].name);
const wait=ms=>new Promise(r=>setTimeout(r,ms));

// ----- sheets (scores / rules): glass panel, never a browser alert -----
function sheet(html){$('#otSheetBody').innerHTML=html+'<button class="btn gold" id="otSheetX" type="button">Close</button>';$('#otSheet').hidden=false;$('#otSheetX').onclick=()=>$('#otSheet').hidden=true}
$('#otSheet').onclick=e=>{if(e.target.id==='otSheet')$('#otSheet').hidden=true};
function scores(){
  if(!S)return;
  const hist=(S.history||[]).map(h=>'<p><b>Round '+h.round+'</b>  '+h.rows.map(r=>nm(r.seat)+' '+(r.net>0?'+':'')+r.net).join('  /  ')+'</p>').join('');
  sheet('<h2>Scores</h2>'+S.players.map(p=>'<div class="srow"><span>'+nm(p.seat)+'</span><b>'+p.total+' pts</b></div>').join('')+(hist?'<h2 style="margin-top:12px;font-size:16px">Rounds</h2>'+hist:''));
}
$('#otScores').onclick=scores;
$('#otRules').onclick=()=>sheet(S&&S.gameType==='kitty'
 ?'<h2>Kitty</h2><p>Arrange nine cards into three sets, strongest first. Cards 1-3 are shown first, then 4-6, then 7-9.</p><p>Trial beats a pure run, then a run, colour, pair, high card. Drag a card to a new slot, or tap two cards to swap.</p><p>Win two shows in a row for the pot; all three is Salaami. A tied show carries to the player who would reveal next.</p>'
 :'<h2>Jhyap</h2><p>Throw a single card, a same-rank group, or a suited run of 3 or more. Then draw from the stock or from the previous throw.</p><p>Points: Ace 1, 2-10 face value, <b>J, Q and K are 10</b>. A printed joker is 0.</p><p>Call JHYAP at the start of your turn <b>only with 5 points or less</b>. If an opponent has equal or lower, your call is beaten: +25 (Nepal) and the others score zero. International: jokers, end cards only, +30. Lowest score wins.</p>');
$('#otFull').onclick=()=>{if(document.fullscreenElement)return document.exitFullscreen();document.documentElement.requestFullscreen?.().then(()=>screen.orientation?.lock?.('landscape')).catch(()=>{})};
$('#otExit').onclick=()=>{if(window.leaveGame)window.leaveGame(!!S&&S.phase!=='lobby')};

// ----- sprites: same card size, fan, face and spring as Marriage (app.js) -----
const kspr=new Map(),track=[];
setInterval(()=>{
  if(!dealing)return;
  const node=$('#kCards .card.mine');if(!node)return;
  const r=node.getBoundingClientRect(),last=track[track.length-1];
  if(!last||Math.hypot(r.x-last.x,r.y-last.y)>2)track.push({t:Date.now(),x:r.x,y:r.y});
  if(track.length>50)track.shift();
},80);
let vw=0,vh=0,cw=66,ch=92,geo={},drag=null,armed=null,dealing=false,dealGen=0,dealTimer=0,showToken=0,showRunRound=-1,stage='idle',showN=-1,showAt=[],line='',placeNow=()=>{},winSeat=-1;
const RANKW={A:'Aces',K:'Kings',Q:'Queens',J:'Jacks',10:'Tens',9:'Nines',8:'Eights',7:'Sevens',6:'Sixes',5:'Fives',4:'Fours',3:'Threes',2:'Twos'};
function chunk(ids){return [ids.slice(0,3),ids.slice(3,6),ids.slice(6,9)]}
function handMap(){return new Map(S.handFlat.map(c=>[c.id,c]))}
function sizes(){
  vw=innerWidth;vh=innerHeight;PODH=vh>700?40:32;
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
  if(card&&!sp.el.dataset.id)sp.el.dataset.id=card.id;
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
function dropSprite(key,to){
  const sp=kspr.get(key);if(!sp)return;kspr.delete(key);
  if(to)setT(sp.el,to);
  sp.el.style.pointerEvents='none';
  setTimeout(()=>sp.el.remove(),to?560:0);
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
  return {pos,step,x0,total};
}
let PODH=32;
function layoutGeo(){
  sizes();
  const n=S.players.length,my=S.you,opps=[];
  for(let k=1;k<n;k++)opps.push((my+k)%n);
  const podY=vw<520?118:(vh<500?46:44);
  const backsY=podY+PODH+8+ch*0.17;
  const handTop=vh-ch-12;
  const podClear=podY+PODH+8+ch*0.34;
  const cy=Math.max(podClear+ch*0.45,Math.min((backsY+handTop)/2,handTop-ch*0.42));
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

// ----- glass name pods (reused, not rebuilt, so they animate in once) -----
const podEls=new Map();
function paintPods(win){
  const turnSeat=S.gameType==='jhyap'&&S.phase==='play'&&!dealing?S.turn:-1,keep=new Set();
  const list=geo.opps.map(s=>({s,x:geo.oppX[s]})).concat([{s:S.you,me:true}]);
  list.forEach(({s,x,me})=>{
    const p=S.players[s];if(!p)return;keep.add(s);
    let d=podEls.get(s);
    if(!d){
      d=document.createElement('div');d.className='pod enter';d.dataset.seat=s;
      d.innerHTML='<span class="av"></span><span class="n"></span><span class="chip"></span>';
      d.addEventListener('animationend',e=>{if(e.animationName==='springIn')d.classList.remove('enter')});
      $('#kPods').append(d);podEls.set(s,d);
    }
    const wait=S.gameType==='kitty'&&S.phase==='play'&&!S.ready[s]&&!me&&!dealing;
    d.className='pod'+(d.classList.contains('enter')?' enter':'')+(me?' me':'')+(s===turnSeat?' turn':'')+(s===win?' win':'')+(p.online||p.bot?'':' off');
    const av=d.firstChild;av.style.background=PAL[s%5];av.textContent=(p.name||'?')[0].toUpperCase();
    d.children[1].textContent=me?(p.name||'You')+' (you)':p.name;
    const chip=d.children[2];chip.textContent=wait?'arranging':p.total+' pts';chip.classList.toggle('neg',p.total<0);
    if(!me){d.style.left=x+'px';d.style.top=geo.podY+'px'}
  });
  podEls.forEach((d,s)=>{if(!keep.has(s)){d.remove();podEls.delete(s)}});
}
function setBanner(main,sub){
  line=sub?main+' — '+sub:main;
  $('#kBanner').textContent=line;
}

// ----- the turn banner: "Your turn" (bright) or "<Name>'s turn" (calm) + chime -----
let turnKey='';
function turnBanner(g){
  const b=$('#turnBanner');
  if(!S||S.gameType!=='jhyap'||S.phase!=='play'||dealing){b.hidden=true;if(dealing)turnKey='deal';return}
  const mine=S.turn===S.you,key=S.round+'/'+S.turn+'/'+S.step;
  const sub=mine?(S.step==='throw'?'throw cards or call JHYAP':'draw a card'):(S.step==='throw'?'throwing':'drawing');
  b.hidden=false;b.className=mine?'me':'';
  b.innerHTML=(mine?'Your turn':esc(S.players[S.turn].name)+"'s turn")+' <small>'+sub+'</small>';
  b.style.left=g.cx+'px';b.style.top=g.bannerTop+'px';
  if(key!==turnKey){
    b.classList.remove('in');void b.offsetWidth;b.classList.add('in');
    if(mine&&S.step==='throw'&&turnKey!=='')Sfx.turn();
    turnKey=key;
  }
}

// ----- Kitty paint (unchanged behaviour) -----
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
  const hm=handMap(),dealingNow=dealing,my=S.you;
  if(dealingNow)sprite('deck',null,geo.deck,{down:true,instant:true});
  else {const d=kspr.get('deck');if(d){d.el.remove();kspr.delete('deck')}}
  geo.opps.forEach(s=>{
    const nb=9;
    for(let k=0;k<nb;k++){
      const t=fanPos(s,k,nb);
      const delay=dealDelay(s,k);
      sprite('o'+s+'_'+k,null,t,{down:true,from:dealingNow?{x:geo.deck.x,y:geo.deck.y,s:0.34,r:0}:undefined,delay:dealingNow?delay:0});
    }
  });
  const gs=drag&&drag.moved&&drag.tmp?drag.tmp:rows;
  const {pos}=handPos(gs);
  pos.forEach((p,id)=>{
    const c=hm.get(id);if(!c)return;
    const delay=dealDelay(my,p.k);
    const fresh=!kspr.has('c'+id);
    const opt={mine:true,sel:armed===id};
    if(fresh&&dealingNow){opt.from={...geo.deck,s:0.9,r:0};opt.down=true;opt.reveal=true;opt.revealAfter=FLIGHT;opt.delay=delay}
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
const DEAL_GAP=145,FLIGHT=650;
const reduceMotion=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function dealSeats(){
  const n=S.players.length,seats=[];
  for(let k=1;k<=n;k++){const s=(S.dealer+k)%n;if((S.players[s].count||0)>0)seats.push(s)}
  return seats.length?seats:Array.from({length:n},(_,i)=>(S.dealer+1+i)%n);
}
function dealDelay(seat,k){
  if(!dealing||reduceMotion())return 0;
  const seats=dealSeats(),i=Math.max(0,seats.indexOf(seat));
  return (k*seats.length+i)*DEAL_GAP;
}
function endDeal(){
  kspr.forEach(s=>{
    s.el.style.transitionDelay='';
    if(s.el.firstChild)s.el.firstChild.style.transitionDelay='';
    if(s.el.classList.contains('mine')){s.el.classList.remove('down');s.down=false}
  });
  if(S&&S.gameType!=='jhyap'){const d=kspr.get('deck');if(d){d.el.remove();kspr.delete('deck')}}
  dealing=false;el.classList.remove('dealing');stage='hand';
  if(!S||S.round!==round)return;
  if(S.gameType==='jhyap')paintJhyap();
  else layoutPlay();
}
function beginDeal(){
  showToken++;showRunRound=-1;armed=null;stage='deal';showN=-1;showAt=[];winSeat=-1;line='';placeNow=()=>{};track.length=0;revealRound=-1;lastLabels='';
  dealGen++;
  kspr.forEach(s=>s.el.remove());kspr.clear();
  $('#kStrip').hidden=true;$('#kLabels').innerHTML='';
  clearTimeout(dealTimer);
  if(reduceMotion()){dealing=false;el.classList.remove('dealing');stage='hand';Sfx.deal(0);return}
  dealing=true;el.classList.add('dealing');
  const seats=dealSeats(),per=S.gameType==='jhyap'?(S.players[S.you].count||5):9;
  const last=((per-1)*seats.length+Math.max(0,seats.length-1))*DEAL_GAP;
  dealTimer=setTimeout(()=>{if(!S||S.round!==round||S.phase==='over'){dealing=false;el.classList.remove('dealing');return}endDeal()},last+FLIGHT+520);
  for(let i=0;i<per*seats.length;i++)setTimeout(()=>Sfx.deal(i),i*DEAL_GAP);
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
async function playShowdown(){
  const token=++showToken;
  layoutGeo();
  const res=S.result;
  if(!res||!res.hands||!res.hands.length){
    hideBacks();
    const name=res&&res.winner>=0?(res.winner===S.you?'You':S.players[res.winner].name):'Four of a kind';
    setBanner(name+(res&&res.winner===S.you?' win':' wins'),'four of a kind');
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
    const ws=res.hands[show].winner,wname=ws===S.you?'You':S.players[ws].name;
    const title=longName(rev[res.hands[show].winner][show]);
    setBanner(tie?'Carry':wname+(ws===S.you?' win':' wins')+' Show '+(show+1)+' - '+title, tie?'tie - the show carries over':'');
    paintPods(winSeat);
    for(let p=0;p<show;p++)putCards(p,'home',false,false);
    putCards(show,'center',true,false);
    placeNow=()=>{layoutGeo();for(let p=0;p<show;p++)putCards(p,'home',false,false);putCards(show,'center',true,false);paintPods(winSeat)};
    await wait(700);
    if(token!==showToken)return;
    stage='flip';
    putCards(show,'center',false,!tie);
    Sfx.show();
    if(!tie)showWinLabel(res.hands[show].winner,show);
    placeNow=()=>{layoutGeo();for(let p=0;p<show;p++)putCards(p,'home',false,false);putCards(show,'center',false,!tie);paintPods(winSeat)};
    await wait(700);
    if(token!==showToken)return;
    stage='hold';
    await wait(1100);
    if(token!==showToken)return;
    kspr.forEach(sp=>sp.el.classList.remove('win'));$('#kLabels').innerHTML='';
  }
  await wait(900);
  if(token!==showToken)return;
  winSeat=res.winner;paintPods(winSeat>=0?winSeat:-1);
  stage='result';showN=3;setBanner('Round over');showStrip();Sfx.win();
  placeNow=()=>{layoutGeo();for(let p=0;p<2;p++)putCards(p,'home',false,false);putCards(2,'center',false,false);paintPods(winSeat)};
}
function showWinLabel(seat,show){
  const t=centerPos(seat,1);
  $('#kLabels').innerHTML=`<div class="gl winl" style="left:${t.x}px;top:${t.y-ch*0.36-Math.min(26,ch*0.16)}px">Wins show ${show+1}</div>`;
}
// Round strip: a slim column on the right edge. It never covers a card.
function showStrip(){
  const r=S.result;if(!r)return;
  const jh=S.gameType==='jhyap';
  const rs=(r.rows||[]).filter(x=>!jh||S.players[x.seat].count>0||x.seat===r.winner).slice().sort((a,b)=>(b.seat===r.winner)-(a.seat===r.winner)||(jh?a.net-b.net:b.net-a.net));
  let head,why='';
  if(r.winner>=0)head=r.winner===S.you?'You win the round':esc(S.players[r.winner].name)+' wins the round';
  else{head='Round carried';why='Everyone pays 1 into the pot (pot now '+(r.pot||0)+')'}
  if(jh&&r.totals&&r.caller!=null){
    const ct=r.totals[r.caller];
    why=r.kind&&r.kind.startsWith('Asaf')?nm(r.caller)+(r.caller===S.you?' called':' called')+' with '+ct+' but was beaten: +'+(S.opts.variant==='international'?30:25)+' to the caller':nm(r.caller)+(r.caller===S.you?' called':' called')+' JHYAP with '+ct;
  }
  const bits=rs.map(row=>{
    const good=jh?row.net<=0:row.net>0,cls=jh?(row.net>0?'dn':''):(row.net>0?'up':row.net<0?'dn':'');
    return `<span class="rb${row.seat===r.winner?' w':''}"><b>${nm(row.seat)}</b><span><i class="${cls}">${(row.net>0?'+':'')+row.net}</i> <small>&rarr; ${S.players[row.seat].total}</small></span></span>`;
  }).join('');
  const k=$('#kStrip');
  k.hidden=false;
  k.innerHTML=`<strong>${head}</strong>${why?`<div class="why">${why}</div>`:''}<div class="rbs">${bits}</div><button class="btn gold" id="kNext" type="button">Deal next round</button>`;
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
  if(S?.gameType!=='kitty')return;
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

// ----- Jhyap on the same sprite table -----
let revealRound=-1,revealT0=0,revealOpen=new Map(),chipSeats=new Set(),revealDone=false,lastLabels='';
function jGeo(){
  layoutGeo();
  const over=S.phase==='over',fanH=ch*0.34,bannerH=vh<500?24:(vh>700?44:34);
  const colW=over?Math.min(176,vw*0.22):Math.min(222,vw*0.26);
  const cx=(vw-colW-16)/2;
  const revFanH=ch*0.62,topFree=over?geo.podY+PODH+22+revFanH+6:geo.podY+PODH+8+fanH+8;
  const top0=over?topFree:topFree+bannerH+8;
  const ps=Math.max(0.45,Math.min(vh>700?0.95:0.8,(geo.handTop-4-14-top0)/ch));
  const room=geo.handTop-10-topFree-((over?0:bannerH+8)+ch*ps+16),off=Math.max(0,room*0.45);
  const bannerTop=topFree+off,pilesTop=top0+off;
  const w=cw*ps,step=w*0.42,capW=w+4*step,g=Math.max(16,w*0.5);
  const y=pilesTop+ch*ps/2;
  Object.assign(geo,{cx,bannerTop,pilesTop,ps,w,step,capW,pilesY:y,
    xs:cx-capW/2-g-w/2,xp:cx,xq:cx+capW/2+g+capW/2,capY:pilesTop+ch*ps+3,colW});
  geo.deck={x:geo.xs,y};
  $('#kActions').style.top=Math.max(geo.podY+PODH+8,pilesTop-6)+'px';
  return geo;
}
function revFan(seat,k,nb){
  const w=cw*0.62;
  return {x:geo.oppX[seat]+(k-(nb-1)/2)*w*0.6,y:geo.podY+PODH+22+ch*0.31,r:(k-(nb-1)/2)*1.5,s:0.62,z:60+k};
}
function jCap(text,x,y){return `<div class="cap" style="left:${x}px;top:${y}px">${text}</div>`}
function paintJhyap(){
  el.dataset.game='jhyap';
  const g=jGeo(),over=S.phase==='over',dealingNow=dealing,my=S.you,hm=handMap(),res=over?S.result:null,rev=res&&res.hands;
  $('#otTitle').textContent='Jhyap';
  $('#otRoom').textContent=S.code+'  /  Round '+S.round;
  for(const id of [...selection])if(!hm.has(id))selection.delete(id);
  const myTurn=!over&&!dealingNow&&S.turn===my,canThrow=myTurn&&S.step==='throw',canDraw=myTurn&&S.step==='draw';
  const draw=S.opts.variant==='international'?(c,i,n)=>i===0||i===n-1:()=>true;
  const keepIds=new Set(S.handFlat.map(c=>c.id));
  // stock
  const stockPos={x:g.xs,y:g.pilesY,r:0,s:g.ps,z:4};
  if(S.stock>0||dealingNow){
    const d2=sprite('deck2',null,{...stockPos,x:stockPos.x-3,y:stockPos.y-3,z:3},{down:true,instant:true});
    const d=sprite('deck',null,stockPos,{down:true,instant:true});
    d.el.classList.toggle('tap',canDraw);d.el.classList.toggle('can',canDraw);
  }else{dropSprite('deck');dropSprite('deck2')}
  // opponents: fans (small), or flipped face up after a call
  geo.opps.forEach(s=>{
    const nb=S.players[s].count||0;
    const hand=rev&&rev[s];
    for(let k=0;k<nb;k++){
      const key='o'+s+'_'+k,fresh=!kspr.has(key);
      const t=hand?revFan(s,k,nb):fanPos(s,k,nb);
      const sp=sprite(key,hand?hand[k]:null,t,{down:fresh?true:undefined,from:fresh?(dealingNow?{x:g.deck.x,y:g.deck.y,s:0.34,r:0}:{...stockPos,s:0.34}):undefined,delay:dealingNow?dealDelay(s,k):0});
      if(hand&&hand[k]&&sp.f&&!sp.f.firstChild)sp.f.innerHTML=window.cardFace(hand[k]);
      sp.el.classList.toggle('win',!!(hand&&revealDone&&res.winner===s));
    }
    for(let k=nb;k<9;k++)if(kspr.has('o'+s+'_'+k))dropSprite('o'+s+'_'+k,{x:g.xq,y:g.pilesY,s:0.4,r:0});
  });
  // piles: the previous throw (take one) and the cards just thrown
  const prev=S.discard||[],pend=S.pending||[],pileIds=new Set();
  const slot=(list,X,tapAble)=>list.forEach((c,i)=>{
    pileIds.add(c.id);
    const t={x:X+(i-(list.length-1)/2)*g.step,y:g.pilesY,r:0,s:g.ps,z:10+i},fresh=!kspr.has('c'+c.id);
    const from=fresh&&!dealingNow?(S.ev&&S.ev.seat!=null&&S.ev.seat!==my&&geo.oppX[S.ev.seat]!=null?{...fanPos(S.ev.seat,2,5),s:0.34}:{x:g.cx,y:geo.handTop,s:0.9}):undefined;
    const sp=sprite('c'+c.id,c,t,{down:false,from});
    const ok=tapAble&&canDraw&&draw(c,i,list.length);
    sp.el.classList.toggle('tap',ok);sp.el.classList.toggle('can',ok);sp.el.classList.toggle('dim',tapAble&&canDraw&&!ok);
  });
  if(!dealingNow){slot(prev,g.xp,true);slot(pend,g.xq,false)}
  // my hand: tap to select, lift selected cards
  const ids=S.handFlat.map(c=>c.id),{pos,x0,total}=handPos([ids]),lift=Math.min(18,ch*0.14);
  ids.forEach((id,k)=>{
    const p=pos.get(id),c=hm.get(id),sel=selection.has(id),fresh=!kspr.has('c'+id);
    const opt={mine:true,sel};
    if(fresh&&dealingNow){opt.from={...g.deck,s:0.9,r:0};opt.down=true;opt.reveal=true;opt.revealAfter=FLIGHT;opt.delay=dealDelay(my,k)}
    else if(fresh){opt.from={...stockPos,s:g.ps};opt.down=true;opt.reveal=true;opt.revealAfter=380}
    const sp=sprite('c'+id,c,{x:p.x,y:p.y-(sel?lift:0),r:over?0:p.r,s:1,z:p.z+(sel?200:0)},opt);
    sp.el.classList.remove('tap','can','dim');
    sp.el.classList.toggle('win',!!(over&&res&&res.winner===my));
  });
  // cards that left the table fly to whoever took them
  [...kspr.keys()].forEach(key=>{
    if(key[0]!=='c')return;
    const id=+key.slice(1);if(keepIds.has(id)||pileIds.has(id))return;
    const sp=kspr.get(key);if(sp.el.classList.contains('nt'))return;
    const seat=S.ev&&S.ev.seat!=null&&S.ev.seat!==my?S.ev.seat:null;
    dropSprite(key,seat!=null&&geo.oppX[seat]!=null?{...fanPos(seat,2,5)}:{x:g.cx,y:vh+ch,s:0.5,r:0});
  });
  // buttons: only lit on my turn; JHYAP shows the live points
  const pts=handPts(),sel=[...selection].map(id=>hm.get(id)).filter(Boolean),throwOk=canThrow&&sel.length>0&&legalC(sel);
  $('#kActions').hidden=!!(over||dealingNow);
  const bt=$('#jThrow'),bc=$('#jCall');
  bt.disabled=!throwOk;bt.classList.toggle('lit',throwOk);bt.textContent='Throw'+(sel.length?' '+sel.length:'');
  const callOk=canThrow&&pts<=5;
  bc.disabled=!callOk;bc.classList.toggle('lit',callOk);
  bc.innerHTML='JHYAP <small>('+pts+' pts'+(pts>5?' - need 5 or less)':')')+'</small>';
  bc.title=pts>5?'You need 5 points or less to call':'';
  $('#kHint').textContent=!myTurn?'':canDraw?'Draw from the stock or the previous throw':sel.length&&!legalC(sel)?'Pick one card, a same-rank set, or a suited run':'Select cards to throw, or call';
  // labels: captions under the piles, points chips on a reveal
  let html='';
  if(!dealingNow){
    if(S.stock>0)html+=jCap('Stock '+S.stock,g.xs,g.capY);
    if(prev.length)html+=jCap(canDraw?'Take one':'Previous throw',g.xp,g.capY);
    if(pend.length)html+=jCap('Just thrown',g.xq,g.capY);
  }
  if(over&&rev&&revealRound===S.round){
    const showW=revealDone;
    geo.opps.forEach(s=>{if(chipSeats.has(s)&&(S.players[s].count||0)>0)html+=`<div class="pts${showW&&res.winner===s?' w':''}" style="left:${geo.oppX[s]}px;top:${geo.podY+PODH+20}px">${res.totals[s]} pts</div>`});
    if(chipSeats.has(my))html+=`<div class="pts${showW&&res.winner===my?' w':''}" style="left:${x0-cw/2-10}px;top:${vh-ch*0.55}px;translate:-100% -50%">${res.totals[my]} pts</div>`;
  }
  if(html!==lastLabels){$('#kLabels').innerHTML=html;lastLabels=html}
  // banner / pods
  if(over){
    const c=res&&res.caller!=null?res.caller:-1;
    setBanner(c>=0?nm(c)+(c===my?' call':' calls')+' JHYAP':'Round over',res&&res.totals?(c>=0?res.totals[c]+' pts':''):'');
    $('#turnBanner').hidden=true;
    if(revealRound!==S.round)startReveal();else applyReveal();
  }else{
    setBanner('');
    $('#kStrip').hidden=true;
  }
  paintPods(over&&revealDone&&res?res.winner:-1);
  turnBanner(g);
}
// reveal: every hand turns over where it sits, one card at a time
function startReveal(){
  revealRound=S.round;revealDone=false;chipSeats=new Set();revealOpen=new Map();revealT0=Date.now()+350;
  const res=S.result;let i=0,last=0;
  const order=[];for(let k=1;k<=S.players.length;k++)order.push((S.you+k)%S.players.length);
  order.forEach(s=>{
    const hand=res.hands[s];if(!hand||!hand.length||s===S.you&&false)return;
    hand.forEach((c,k)=>{
      const delay=350+(i*170);i++;last=delay;
      const key=s===S.you?'c'+c.id:'o'+s+'_'+k;
      revealOpen.set(key,revealT0+delay-350);
      setTimeout(()=>{
        if(revealRound!==S.round)return;
        const sp=kspr.get(key);if(sp){if(sp.f&&!sp.f.firstChild)sp.f.innerHTML=window.cardFace(c);setFace(sp,false);Sfx.deal(k)}
      },delay);
    });
    setTimeout(()=>{if(revealRound!==S.round)return;chipSeats.add(s);lastLabels='';paintJhyap();Sfx.show()},350+(i*170)+300);
  });
  setTimeout(()=>{
    if(revealRound!==S.round)return;
    revealDone=true;lastLabels='';paintJhyap();Sfx.win();
    setTimeout(()=>{if(revealRound===S.round&&S.phase==='over')showStrip()},350);
  },350+(i*170)+700);
}
function applyReveal(){
  const now=Date.now();
  revealOpen.forEach((at,key)=>{if(now>at+700){const sp=kspr.get(key);if(sp&&sp.down)setFace(sp,false,true)}});
  if(revealDone&&$('#kStrip').hidden)showStrip();
}
$('#kCards').addEventListener('click',e=>{
  if(S?.gameType!=='jhyap'||dealing||S.phase!=='play')return;
  const n=e.target.closest('.card');if(!n)return;
  Sfx.unlock();
  if(n.classList.contains('mine')){
    const id=+n.dataset.id;
    if(S.turn!==S.you||S.step!=='throw'){Sfx.err();return}
    selection.has(id)?selection.delete(id):selection.add(id);Sfx.pick();paintJhyap();return;
  }
  if(!n.classList.contains('tap'))return;
  Sfx.flick();
  if(n.dataset.key==='deck')send({t:'draw',from:'stock'});
  else send({t:'draw',from:'discard',id:+n.dataset.id});
});
$('#jThrow').onclick=()=>{if(!selection.size)return;Sfx.flick();send({t:'throw',ids:[...selection]});selection.clear()};
$('#jCall').onclick=()=>{if(!S||handPts()>5)return;send({t:'call'})};

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
  get revealDone(){return revealDone},
  sent:[]
};
window.drawTableGame=(state,fn)=>{
  S=state;window.__S=state;
  const raw=fn;
  send=m=>{try{window.__kitty.sent.push(JSON.parse(JSON.stringify(m)))}catch(e){}raw(m)};
  window.__table={get S(){return S},get rows(){return rows}};
  $('#game').hidden=true;
  if(S.phase==='lobby'){
    el.hidden=true;el.classList.remove('dealing');$('#lobby').hidden=false;$('#entry').hidden=true;$('#room').hidden=false;
    $('#roomcode').textContent=S.code;
    $('#plist').innerHTML=S.players.map(p=>'<li>'+esc(p.name)+'</li>').join('');
    $('#optrow').hidden=true;$('#optrow').style.display='none';
    $('#start').hidden=S.you!==S.host;$('#start').disabled=S.players.length<2;
    $('#addbot').hidden=S.you!==S.host||S.players.length>=5;
    const back=$('#leave');if(back)back.hidden=false;
    return;
  }
  $('#lobby').hidden=true;el.hidden=false;
  if(round!==S.round){
    round=S.round;
    const dealt=S.handFlat.map(c=>c.id);
    // Deal order only. Kitty.autoArrange is for computer players, never for this hand.
    rows=S.gameType==='kitty'
      ?(S.hand&&S.hand.flat().length===dealt.length?S.hand.map(r=>r.map(c=>c.id)):chunk(dealt))
      :[dealt];
    $('#otSheet').hidden=true;selection.clear();armed=null;turnKey='';
    if(S.gameType==='kitty'||S.gameType==='jhyap')beginDeal();
    else Sfx.deal(1);
  }else if(S.gameType==='jhyap')rows=[S.handFlat.map(c=>c.id)];
  paint();
};
addEventListener('resize',()=>{if(!el.hidden){if(S&&S.gameType==='kitty'&&S.phase==='over')placeNow();else{lastLabels='';paint()}}});
})();
