const assert=require('assert'),T=require('../table-games');let checks=0;function ok(c,m){assert(c,m);checks++}
const id=(r,s='S')=>T.byId?Array.from({length:52},(_,i)=>i).find(i=>T.byId(i).r===r&&T.byId(i).s===s):0;
ok(T.legal([id(2),id(3),id(4)]));ok(!T.legal([id(12),id(13),id(1)]));ok(T.legal([id(7),id(7,'H')]));ok(!T.legal([id(7),id(7)]));ok(T.value({r:11})===0);ok(T.value({r:11},{variant:'international'})===10);
for(let variant of ['nepal','international']){let g=new T.TableGame('jhyap',2,1,{variant});g.hands=[[id(1)],[id(2)]];g.act(0,{t:'call'});ok(g.result.rows[0].net===0&&g.result.rows[1].net===2);g=new T.TableGame('jhyap',2,1,{variant});g.hands=[[id(2)],[id(2,'H')]];g.act(0,{t:'call'});ok(g.result.rows[0].net===(variant==='nepal'?27:32));ok(g.result.rows[1].net===(variant==='nepal'?0:2))}
let results={};for(let type of ['kitty','jhyap']){let moves=0,max=0,kinds={};for(let i=0;i<320;i++){let n=2+i%4,g=new T.TableGame(type,n,i%n,{variant:i%2?'nepal':'international'}),turns=0;while(!g.over&&turns<5000){let seat=type==='kitty'?g.ready.findIndex(x=>!x):g.turn;g.act(seat,T.decide(g,seat));turns++;moves++}if(!g.over)console.log(type,g.hands.map(h=>h.map(T.byId)),g.stock.length,g.previous);assert(g.over,'round did not finish');max=Math.max(max,turns);kinds[g.result.kind]=(kinds[g.result.kind]||0)+1;if(type==='kitty')ok(g.result.rows.reduce((a,r)=>a+r.net,0)===-g.result.pot)}results[type]={rounds:320,illegal:0,moves,max,kinds}}
const K=require('../public/kitty-rules');
let kittySame=0,kittyOrdered=0,jhyapSorted=0,N=80;
for(let i=0;i<N;i++){
  const g=new T.TableGame('kitty',3,i%3,{});
  if(i===0)ok(g.layout.every(x=>!x)&&g.hands[0].length===9,'fresh kitty hand is dealt, not laid out');
  const ids=g.hands[0];
  const best=K.autoArrange(ids.map(T.byId),{}).flat().map(c=>c.id);
  if(ids.join()===best.join())kittySame++;
  const chunks=[0,3,6].map(x=>ids.slice(x,x+3).map(T.byId));
  if(K.rowsInOrder(chunks,{}))kittyOrdered++;
  const j=new T.TableGame('jhyap',4,i%4,{});
  if(i===0)ok(j.hands[0].length===5&&j.layout.every(x=>!x),'fresh jhyap hand is dealt, not laid out');
  const h=j.hands[0].map(T.byId),rk=c=>c.r===1?14:c.r;
  const sorted=[...h].sort((a,b)=>rk(b)-rk(a)||String(a.s).localeCompare(String(b.s)));
  if(h.every((c,k)=>c.id===sorted[k].id))jhyapSorted++;
}
ok(kittySame<=1,'a fresh kitty hand is not the best arrangement ('+kittySame+'/'+N+' matched)');
ok(kittyOrdered<N/2,'kitty groups are not already strongest-first ('+kittyOrdered+'/'+N+')');
ok(jhyapSorted<=4,'a fresh jhyap hand is not rank-sorted ('+jhyapSorted+'/'+N+')');
console.log(JSON.stringify({checks,results,kittySame,kittyOrdered,jhyapSorted},null,2));

