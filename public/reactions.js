// Emoji reactions for all three tables. Server: {t:'react',e,to} -> broadcast {t:'react',from,to,e}.
(()=>{
const EMO=['\u{1F602}','\u{1F60E}','\u{1F621}','\u{1F62D}','\u{1F44F}','\u{1F525}','\u{1F44D}','\u{1F914}','\u{1F609}','\u{1F631}','\u{1F389}','\u{1F64F}'];
const NAMES=['laugh','cool','angry','cry','clap','fire','thumbs up','thinking','wink','shocked','party','pray'];
const $=s=>document.querySelector(s);
const esc=s=>String(s).replace(/[&<>"']/g,c=>'&#'+c.charCodeAt(0)+';');
let target=null,lastSent=0,tray;
const mk=(parent,before)=>{const b=document.createElement('button');b.type='button';b.className='rxbtn';b.title='Send a reaction';b.setAttribute('aria-label','Send a reaction');b.textContent='\u{1F60A}';b.onclick=e=>{e.stopPropagation();toggle()};before?parent.insertBefore(b,before):parent.append(b);return b};
const bars=[];
const tools=$('#topbar .tools');if(tools)bars.push(mk(tools,$('#bExit')));
const otTop=$('.otTop');if(otTop)bars.push(mk(otTop,$('#otExit')));
tray=document.createElement('div');tray.id='rxTray';tray.hidden=true;document.body.append(tray);
const S=()=>window.__S;
const nextSeat=()=>{const s=S();return s?(s.you+1)%s.players.length:0};
const aimSeat=()=>target==null?nextSeat():target;
function build(){
  const s=S();if(!s)return;
  const nxt=nextSeat(),a=aimSeat();
  tray.innerHTML='<div class="tg"><button data-to="next" class="'+(target==null?'on':'')+'">Next: '+esc(s.players[nxt].name)+'</button>'+(target!=null&&target>=0&&target!==nxt?'<button data-to="'+target+'" class="on">'+esc(s.players[target].name)+'</button>':'')+'<button data-to="-1" class="'+(target===-1?'on':'')+'">Table</button></div><div class="em">'+EMO.map((e,i)=>'<button data-e="'+i+'" title="'+NAMES[i]+'">'+e+'</button>').join('')+'</div><p class="hint">tap a player to aim at them</p>';
  document.querySelectorAll('.pod.aim').forEach(p=>p.classList.remove('aim'));
  if(a>=0){const p=document.querySelector('.pod[data-seat="'+a+'"]');if(p)p.classList.add('aim')}
}
function open(){if(!S()||Date.now()-lastSent<2000&&false)return;build();tray.hidden=false;document.body.classList.add('reacting')}
function close(){tray.hidden=true;document.body.classList.remove('reacting');document.querySelectorAll('.pod.aim').forEach(p=>p.classList.remove('aim'))}
function toggle(){tray.hidden?open():close()}
tray.addEventListener('click',e=>{
  e.stopPropagation();
  const t=e.target.closest('button');if(!t)return;
  if(t.dataset.to!=null){target=t.dataset.to==='next'?null:+t.dataset.to;build();return}
  if(t.dataset.e!=null){
    const now=Date.now();
    if(now-lastSent<2000){t.animate([{transform:'translateX(-4px)'},{transform:'translateX(4px)'},{transform:'none'}],{duration:180});return}
    lastSent=now;
    if(window.__send)window.__send({t:'react',e:EMO[+t.dataset.e],to:aimSeat()});
    close();bars.forEach(b=>{b.disabled=true;setTimeout(()=>b.disabled=false,2000)});
  }
});
document.addEventListener('click',e=>{
  if(tray.hidden)return;
  const pod=e.target.closest('.pod[data-seat]');
  if(pod){const sd=+pod.dataset.seat;if(S()&&sd!==S().you){target=sd;build()}e.stopPropagation();return}
  if(!e.target.closest('#rxTray'))close();
},true);
addEventListener('keydown',e=>{if(e.key==='Escape')close()});
function where(seat){
  if(seat>=0){
    const p=document.querySelector('.pod[data-seat="'+seat+'"]');
    if(p&&p.offsetParent!==null){const r=p.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2}}
    if(S()&&seat===S().you)return {x:56,y:innerHeight-52};
    return {x:innerWidth/2,y:60};
  }
  return {x:innerWidth/2,y:innerHeight*0.45};
}
window.onReact=m=>{
  if(!EMO.includes(m.e))return;
  const cl=(p)=>({x:Math.max(60,Math.min(innerWidth-60,p.x)),y:Math.max(70,Math.min(innerHeight-70,p.y))});
  const A=where(m.from),B=cl(where(m.to));
  const d=document.createElement('div');d.className='rxfly';d.textContent=m.e;document.body.append(d);
  const still=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const T=(p,s)=>'translate('+(p.x-17)+'px,'+(p.y-20)+'px) scale('+s+')';
  const flight=still||(A.x===B.x&&A.y===B.y)?0:760;
  const go=()=>{
    d.animate([{transform:T(B,.8),opacity:1},{transform:T(B,3),opacity:1,offset:.12},{transform:T(B,2.4),opacity:1,offset:.2},{transform:T(B,2.5),opacity:1,offset:.82},{transform:T(B,2.9),opacity:0}],{duration:2000,easing:'cubic-bezier(.2,1.2,.4,1)',fill:'forwards'}).onfinish=()=>d.remove();
    const pod=m.to>=0&&document.querySelector('.pod[data-seat="'+m.to+'"]');
    if(pod&&!still)pod.animate([{scale:'1'},{scale:'1.12'},{scale:'1'}],{duration:360,easing:'cubic-bezier(.2,1.4,.4,1)'});
  };
  if(!flight){go();return}
  const mid={x:(A.x+B.x)/2,y:Math.min(A.y,B.y)-70};
  d.animate([{transform:T(A,.6),opacity:0},{transform:T(A,1.1),opacity:1,offset:.12},{transform:T(mid,1.4),opacity:1,offset:.55},{transform:T(B,1.3),opacity:1}],{duration:flight,easing:'cubic-bezier(.4,.1,.3,1)',fill:'forwards'}).onfinish=go;
};
})();
