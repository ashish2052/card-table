// How many turns until someone wins, per bot version: node test/pace.js <botfile> [rounds]
const { Game, byId } = require('../game.js'); const Bot = require(process.argv[2]); const N = +process.argv[3] || 300;
let turns = 0, wins = 0, early = 0, dub = 0;
for (let r = 0; r < N; r++) {
  const g = new Game(3, r % 3, { dubleeWin: 7 }, false); let t = 0;
  while (!g.over && t < 2000) { const s = g.turn;
    const v = { you: s, round: r, step: g.step, handFlat: g.hands[s].map(byId), discard: g.discard.slice(-4).map(byId), last: g.last, tiplu: g.seen[s] ? g.tiplu : undefined, players: g.shown.map((sh) => ({ shown: sh })) };
    try { const a = Bot.decide(v); if (a.t === 'draw') g.draw(s, a.from); else if (a.t === 'discard') g.discardCard(s, a.id); else if (a.t === 'show') g.show(s, a.groups); else if (a.t === 'declare') g.declare(s, a.groups, a.discard); } catch (e) { if (!global.E) { global.E = 1; console.log('bot error:', e.message); } g.autoPlay(s); }
    if (g.step === 'draw') t++; }
  if (g.result && !g.result.void) { wins++; if (g.result.dublee) dub++; turns += t / 3; if (t / 3 <= 8) early++; }
}
console.log(`${process.argv[2]}: rounds won ${wins}/${N}, avg turns each before the win ${(turns / wins).toFixed(1)}, won within 8 turns ${(early / wins * 100).toFixed(0)}%, dublee wins ${dub}`);
