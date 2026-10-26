// Plays rounds where the "human" seat is also driven by the bot; asserts each round ends cleanly.
const WebSocket = require('ws'), Bot = require('../bot.js');
const ws = new WebSocket('ws://localhost:' + (process.env.PORT || 8851));
let rounds = 0, moves = 0, errs = 0; const want = +process.argv[2] || 3;
ws.on('open', () => ws.send(JSON.stringify({ t: 'create', name: 'Tester', bots: 2 })));
ws.on('message', (d) => {
  const m = JSON.parse(d);
  if (m.t === 'err') { errs++; console.log('err:', m.m); }
  if (m.t !== 'state') return;
  if (m.phase === 'over' && m.result && m.round > rounds) {
    rounds = m.round; const r = m.result;
    if (!r.void) { const sum = r.rows.reduce((a, x) => a + x.net, 0); if (sum !== 0) bad('nets do not sum to 0: ' + sum); }
    console.log(`round ${m.round}: ${r.void ? 'void (stock ran out)' : 'winner ' + m.players[r.winner].name + (r.dublee ? ' (dublee)' : '')}, moves ${moves}`);
    moves = 0; seenTotal = null; if (rounds >= want) { console.log('errors', errs); process.exit(errs ? 1 : 0); }
    return setTimeout(() => ws.send(JSON.stringify({ t: 'next' })), 200);
  }
  if (m.phase === 'play') check(m);
  if (m.phase === 'play' && m.turn === m.you) { moves++; const a = Bot.decide(m); if (a) setTimeout(() => ws.send(JSON.stringify(a)), 20); }
});
setTimeout(() => { console.log('TIMEOUT after', rounds, 'rounds'); process.exit(2); }, 600000);

function bad(msg) { errs++; console.log('ISSUE:', msg); }
function check(m) {
  for (const p of m.players) {
    const shown = (p.shown || []).flat().length;
    const base = 21 - shown;
    const ok = p.seat === m.turn && m.step === 'discard' ? base + 1 : base;
    if (p.count !== ok && !(p.seat === m.turn && m.step === 'discard' && p.count === base)) bad(`round ${m.round} ${p.name} holds ${p.count}, expected ${ok} (step ${m.step}, turn ${m.turn})`);
  }
  const all = m.players.reduce((a, p) => a + p.count + (p.shown || []).flat().length, 0) + m.stock + m.discardCount + (m.tipluOut ? 1 : 0);
  if (seenTotal == null) seenTotal = all; else if (Math.abs(all - seenTotal) > 1) bad('card total changed ' + seenTotal + ' -> ' + all);
}
let seenTotal = null;
