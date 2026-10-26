// Marriage server: static files + one WebSocket endpoint. Rooms live in memory only.
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os'), crypto = require('crypto');
const { WebSocketServer } = require('ws');
const { Game, byId } = require('./game.js');
const Bot = require('./bot.js');
const T = require('./table-games.js');

const PORT = +process.env.PORT || 8850;
const TEST = process.env.MARRIAGE_TEST === '1';
const PUB = path.join(__dirname, 'public');
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

function lanIps() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const i of list || []) if (i.family === 'IPv4' && !i.internal && !i.address.startsWith('169.254.')) out.push(i.address);
  return out;
}
const server = http.createServer((req, res) => {
  const url = decodeURIComponent(req.url.split('?')[0]);
  if (url === '/api/info') { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ ips: lanIps(), port: PORT })); }
  const f = path.normalize(path.join(PUB, url === '/' ? 'index.html' : url));
  if (!f.startsWith(PUB)) { res.statusCode = 403; return res.end(); }
  fs.readFile(f, (e, buf) => {
    if (e) { res.statusCode = 404; return res.end('not found'); }
    res.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
    res.setHeader('cache-control', 'no-cache');
    res.end(buf);
  });
});
const wss = new WebSocketServer({ server });

const rooms = new Map();
const LETTERS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
const code4 = () => { let c; do { c = Array.from({ length: 4 }, () => LETTERS[crypto.randomInt(LETTERS.length)]).join(''); } while (rooms.has(c)); return c; };
const safeOpts=o=>({a23:o?.a23==='low'?'low':'second',k235:o?.k235===true,quads:o?.quads!==false,variant:o?.variant==='international'?'international':'nepal'});
const clean = (s) => String(s || '').replace(/[^\p{L}\p{N} _.-]/gu, '').trim().slice(0, 14);

class Room {
  constructor(code, type='marriage', opts={}) { this.type=type; this.code = code; this.players = []; this.host = 0; this.phase = 'lobby'; this.opts = { dubleeWin: 7, ...opts }; this.history=[]; this.round = 0; this.dealer = -1; this.g = null; this.touched = Date.now(); }
  send(p, m) { if (p.ws && p.ws.readyState === 1) p.ws.send(JSON.stringify(m)); }
  broadcast() { this.touched = Date.now(); for (const p of this.players) this.send(p, this.view(p.seat)); }
  pub(p) {
    const g = this.g;
    return { seat: p.seat, name: p.name, online: p.online, total: p.total, count: g ? g.hands[p.seat].length : 0, seen: g ? g.seen[p.seat] : false, pending: g ? g.pendingSee[p.seat] : false, shown: g ? g.shown[p.seat] : [], dublee: g ? g.dubleeShow[p.seat] : false };
  }
  view(seat) {
    const g = this.g, me = this.players[seat];
    const card = this.type==='marriage'?byId:T.byId;
    const v = { t: 'state', gameType:this.type, history:this.history, code: this.code, phase: this.phase, opts: this.opts, you: seat, host: this.host, round: this.round, dealer: this.dealer, players: this.players.map((p) => this.pub(p)) };
    if (g) {
      v.turn = g.turn; v.step = g.step; v.stock = g.stock.length; v.discardCount = g.discard.length;
      v.discard = (this.type==='jhyap'?g.previous:g.discard.slice(-4)).map(card); v.ev = g.ev; v.last = g.turn === seat ? g.last : null;
      v.ready=g.ready; v.pending=g.pending?g.pending.map(card):[]; v.pot=g.pot; v.n = g.n; v.dealerSeat = g.dealer;
      if (!g.layout[seat]) g.layout[seat] = null;
      v.hand = g.layout[seat] ? g.layout[seat].map((gr) => gr.map(card)) : null;
      v.handFlat = g.hands[seat].map(card);
      if (g.seen[seat] || g.over) v.tiplu = g.tiplu;
      if (g.over) v.result = g.result;
    }
    return v;
  }
  act(p, m) {
    const g = this.g;
    if(this.type!=='marriage' && !['start','addbot','opts','next'].includes(m.t)) { if(!g)throw uerr('Deal first'); g.act(p.seat,m); } else switch (m.t) {
      case 'start':
        if (p.seat !== this.host || this.phase !== 'lobby' && this.phase !== 'over') throw uerr('Only the host can start');
        if (this.players.length < 2) throw uerr('Need at least 2 players');
        if (m.opts && [7, 8].includes(m.opts.dubleeWin)) this.opts.dubleeWin = m.opts.dubleeWin;
        this.deal(); break;
      case 'addbot':
        if (p.seat !== this.host || this.phase !== 'lobby') throw uerr('Only the host can add a computer player');
        this.addBot(); break;
      case 'opts':
        if(this.type!=='marriage' && p.seat===this.host && this.phase==='lobby'){this.opts={...this.opts,...safeOpts(m.opts)};break;}
        if (p.seat === this.host && this.phase === 'lobby' && [7, 8].includes(m.dubleeWin)) this.opts.dubleeWin = m.dubleeWin; break;
      case 'next':
        if (this.phase !== 'over') return;
        this.deal(); break;
      case 'draw': g.draw(p.seat, m.from === 'discard' ? 'discard' : 'stock'); break;
      case 'discard': g.discardCard(p.seat, m.id); break;
      case 'arrange': g.arrange(p.seat, m.groups); break;
      case 'show': g.show(p.seat, m.groups); break;
      case 'declare': g.declare(p.seat, m.groups || [], m.discard); break;
      default: return;
    }
    if (this.g && this.g.over && this.phase === 'play') {
      this.phase = 'over';
      const r = this.g.result;
      if (!r.void) for (const row of r.rows) this.players[row.seat].total += row.net;
      for (const row of r.rows) row.total = this.players[row.seat].total;
      this.history.push({round:this.round,kind:r.kind||'Marriage',rows:r.rows.map(x=>({seat:x.seat,net:x.net,total:x.total}))});
    }
    this.broadcast();
  }
  addBot() {
    if (this.players.length >= 5) throw uerr('Room is full (5 players)');
    const n = this.players.filter((q) => q.bot).length + 1;
    this.players.push({ key: crypto.randomBytes(12).toString('hex'), name: 'Computer ' + n, seat: this.players.length, total: 0, online: true, ws: null, bot: true });
  }
  deal() {
    if(this.type==='jhyap'){this.opts.active=this.players.filter(p=>p.total<=(this.opts.variant==='international'?200:100)).map(p=>p.seat);if(this.opts.active.length<2)throw uerr('Match complete: last player standing wins. Create a new room to play again.');}
    this.round++; this.dealer = (this.dealer + 1) % this.players.length;
    if(this.type==='jhyap' && this.g?.result){this.dealer=(this.g.result.winner-1+this.players.length)%this.players.length;}
    this.opts.pot=this.g?.result?.pot||0;
    this.g = this.type==='marriage'?new Game(this.players.length, this.dealer, this.opts, TEST):new T.TableGame(this.type,this.players.length,this.dealer,this.opts);
    this.phase = 'play';
  }
}
const uerr = (m) => { const e = new Error(m); e.user = true; return e; };

wss.on('connection', (ws) => {
  let room = null, me = null;
  const err = (m) => ws.send(JSON.stringify({ t: 'err', m }));
  ws.on('message', (raw) => {
    let m; try { m = JSON.parse(raw); } catch { return; }
    try {
      if (m.t === 'create' || m.t === 'join' || m.t === 'resume') {
        if (m.t === 'create') { room = new Room(code4(), ['kitty','jhyap'].includes(m.gameType)?m.gameType:'marriage',safeOpts(m.opts)); rooms.set(room.code, room); }
        else {
          room = rooms.get(String(m.code || '').toUpperCase().trim());
          if (!room) { ws.send(JSON.stringify({ t: 'gone' })); return err('No room with that code'); }
        }
        if (m.t === 'resume') {
          me = room.players.find((p) => p.key === m.key);
          if (!me) { ws.send(JSON.stringify({ t: 'gone' })); return err('Your seat is gone'); }
        } else {
          if (room.phase !== 'lobby') return err('That game has already started');
          if (room.players.length >= 5) return err('Room is full (5 players)');
          const name = clean(m.name) || 'Player ' + (room.players.length + 1);
          me = { key: crypto.randomBytes(12).toString('hex'), name, seat: room.players.length, total: 0, online: true, ws: null };
          room.players.push(me);
          if (m.t === 'create' && m.bots) { for (let i = 0; i < Math.min(4, Math.max(1, +m.bots || 0)); i++) room.addBot(); room.deal(); }
        }
        if (me.ws && me.ws !== ws) try { me.ws.close(); } catch {}
        me.ws = ws; me.online = true; me.since = Date.now();
        ws.send(JSON.stringify({ t: 'hello', code: room.code, key: me.key, seat: me.seat }));
        room.broadcast();
        return;
      }
      if (!room || !me) return err('Not in a room');
      room.act(me, m);
    } catch (e) {
      if (e.user) err(e.message); else { console.error(e); err('Server error'); }
    }
  });
  ws.on('close', () => {
    if (me && me.ws === ws) { me.online = false; me.since = Date.now(); me.ws = null; room.broadcast(); }
  });
});

// absent player on turn for 20 s: play it for them. Idle rooms die after 6 h.
setInterval(() => {
  for (const [c, r] of rooms) {
    const g = r.g;
    if (r.phase === 'play' && g && !g.over) {
      const p = r.players[g.turn];
      if (r.type==='marriage' && !p.online && Date.now() - Math.max(p.since || 0, g.turnSince) > 20000) { try { g.autoPlay(p.seat); if (g.over) { r.phase = 'over'; } r.broadcast(); } catch (e) { console.error(e); } }
    }
    if (Date.now() - r.touched > 6 * 3600e3 && r.players.every((p) => !p.online)) rooms.delete(c);
  }
}, 4000);

// computer players take their turn about a second after it comes round
setInterval(() => {
  for (const r of rooms.values()) {
    const g = r.g;
    if (r.phase !== 'play' || !g || g.over) continue;
    if(r.type!=='marriage'){for(const p of r.players){if((p.bot||!p.online) && (r.type==='kitty'?!g.ready[p.seat]:p.seat===g.turn)){try{const a=T.decide(g,p.seat);if(a)r.act(p,a)}catch(e){console.error(e)}}}continue;}
    const p = r.players[g.turn];
    if (!p.bot || Date.now() - g.turnSince < 900 && g.step === 'draw') continue;
    try { const a = Bot.decide(r.view(p.seat)); if (a) r.act(p, a); }
    catch (e) { try { g.autoPlay(p.seat); if (g.over) r.phase = 'over'; r.broadcast(); } catch (e2) { console.error(e2); } }
  }
}, 700);

server.listen(PORT, '0.0.0.0', () => {
  console.log('Marriage is up' + (TEST ? ' (TEST rig on)' : ''));
  console.log('  This computer : http://localhost:' + PORT);
  for (const ip of lanIps()) console.log('  Phones on LAN : http://' + ip + ':' + PORT);
});
