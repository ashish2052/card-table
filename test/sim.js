// Offline bot-vs-bot rounds: how often bots see the maal, win, and in how many turns.
const { Game, byId } = require('../game.js'); const NewBot = require('../bot.js'), OldBot = require('./bot-old.js'); const mix = process.argv[3] === 'mix';
const N = +process.argv[2] || 200, n = 3;
let seen = 0, wins = Array(n).fill(0), voids = 0, turns = 0, errs = 0;
for (let r = 0; r < N; r++) {
  const g = new Game(n, r % n, { dubleeWin: 7 }, false);
  let t = 0;
  while (!g.over && t < 2000) {
    const s = g.turn;
    const v = { you: s, step: g.step, handFlat: g.hands[s].map(byId), discard: g.discard.slice(-4).map(byId), last: g.last,
      tiplu: g.seen[s] ? g.tiplu : undefined, players: g.shown.map((sh) => ({ shown: sh })) };
    try { const a = (mix && s !== 0 ? OldBot : NewBot).decide(v);
      if (a.t === 'draw') g.draw(s, a.from); else if (a.t === 'discard') g.discardCard(s, a.id);
      else if (a.t === 'show') g.show(s, a.groups); else if (a.t === 'declare') g.declare(s, a.groups, a.discard);
    } catch (e) { errs++; g.autoPlay(s); }
    t++;
  }
  turns += t; seen += g.seen.filter(Boolean).length;
  if (g.result && !g.result.void) wins[g.result.winner]++; else voids++;
}
console.log(`rounds ${N}: avg actions ${(turns / N).toFixed(0)}, maal seen per player ${(seen / N / n * 100).toFixed(0)}%, wins by seat ${wins}, void ${voids}, bot errors ${errs}`);
