// Self-check: meld validation, maal points, dublee win, settlement, and a rigged full round through Game.
const assert = require('assert');
const R = require('../public/rules.js');
const { Game } = require('../game.js');
const c = (t) => { // "10H" "AS" "J" (man)
  if (t === 'J') return { id: -1, r: 0, s: 'J' };
  const s = t.slice(-1), x = t.slice(0, -1);
  return { id: Math.random(), r: { A: 1, J: 11, Q: 12, K: 13 }[x] || +x, s };
};
const cl = (str, tip) => R.classify(str.split(' ').map(c), tip ? c(tip) : null);
let n = 0; const ok = (name, cond) => { assert.ok(cond, name); n++; };

// --- meld validation ---
ok('tunnela', cl('9D 9D 9D').kind === 'tunnela' && cl('9D 9D 9D').pure);
ok('pure run', cl('4C 5C 6C').kind === 'run');
ok('ace low run', cl('AS 2S 3S').valid);
ok('ace high run', cl('QS KS AS').valid);
ok('no wrap K-A-2', !cl('KS AS 2S').valid);
ok('set of 3 suits', cl('KS KH KD').kind === 'set' && !cl('KS KH KD').pure);
ok('same-suit pair set invalid', !cl('9S 9S 9C').valid);
ok('identical pair + joker invalid', !cl('5D 5D J').valid);
ok('dirty run with man', cl('10C JC J').kind === 'dirty run');
ok('dirty run gap', cl('4H 6H J').valid && !cl('4H 9H J').valid);
ok('dirty set', cl('QS QC J').kind === 'dirty set');
ok('two wilds any card', cl('2S J J').valid);
ok('random junk invalid', !cl('2S 7H 9D').valid);
// with tiplu 7H: poplu 8H, jhiplu 6H, alter 7D, joker 7S/7C
ok('kinds', ['7H', '8H', '6H', '7D', '7S', 'KC'].map((t) => R.kind(c(t), c('7H'))).join() === 'tiplu,poplu,jhiplu,alter,joker,');
ok('poplu is wild', cl('QS QC 8H', '7H').valid);
ok('marriage', cl('6H 7H 8H', '7H').kind === 'marriage');
ok('king tiplu: ace is poplu', R.kind(c('AS'), c('KS')) === 'poplu' && R.kind(c('QS'), c('KS')) === 'jhiplu');
ok('ace tiplu: 2 poplu, K jhiplu', R.kind(c('2H'), c('AH')) === 'poplu' && R.kind(c('KH'), c('AH')) === 'jhiplu');

// --- maal points (pagat table) ---
const hand = (s) => s.split(' ').map(c);
const pts = (shown, held, t) => R.maalScore(shown.map(hand), hand(held), c(t)).points;
ok('single poplu 2', pts([], '8H 2C 3C', '7H') === 2);
ok('double poplu 5', pts([], '8H 8H', '7H') === 5);
ok('triple jhiplu 10', pts([], '6H 6H 6H', '7H') === 10);
ok('tiplu 3 / 7', pts([], '7H', '7H') === 3 && pts([], '7H 7H', '7H') === 7);
ok('marriage 10 beats 2+2+3', pts([], '6H 7H 8H', '7H') === 10);
ok('double marriage 30', pts([], '6H 7H 8H 6H 7H 8H', '7H') === 30);
ok('plain tunnela 5', pts(['4C 4C 4C'], '', '7H') === 5);
ok('poplu tunnela 20', pts(['8H 8H 8H'], '', '7H') === 20);
ok('joker tunnela 10', pts(['7S 7S 7S'], '', '7H') === 10);
ok('unexposed tunnela is not tunnela points', pts([], '4C 4C 4C', '7H') === 0);

// --- dublee ---
ok('7 dublees', R.countDublees(hand('2S 2S 5H 5H 9D 9D KC KC 3C 3C 4C 4C 10H 10H JS')) === 7);
ok('3 of a kind is one dublee', R.countDublees(hand('2S 2S 2S')) === 1);
ok('identical needs same suit', R.countDublees(hand('2S 2H')) === 0);

// --- settlement ---
{
  // 3 players, winner 0 (seen), p1 seen with 4, p2 unseen 0. scores [10,4,0]
  const s = R.settle([10, 4, 0], [true, true, false], 0, false);
  // pagat: pays winner T + w - n*S -> p1: 14+3-12 = 5 ; p2: 14+10-0 = 24 ; p1<->p2: p2 pays p1 4
  const pay = (f, t) => (s.transfers.find((x) => x.from === f && x.to === t) || {}).amt || 0;
  ok('pairwise transfers', pay(1, 0) === 9 && pay(2, 0) === 20 && pay(2, 1) === 4);
  ok('matches pagat T+w-nS: p1 pays 5, p2 pays 24', s.net[1] === -5 && s.net[2] === -24 && s.net[0] === 29);
  ok('nets sum to zero', s.net.reduce((x, y) => x + y, 0) === 0);
}
{
  const s = R.settle([0, 0, 0], [true, false, false], 0, true); // dublee win: +5 each, 3/10 base
  ok('dublee bonus', s.net[1] === -(10 + 5) && s.net[2] === -(10 + 5) && s.net[0] === 30);
}

// --- full rigged round via Game: dealer holds 7 melds, tiplu 7H ---
{
  const g = new Game(3, 0, { dubleeWin: 7 }, true);
  ok('21 cards each', g.hands.every((h) => h.length === 21));
  ok('tiplu is 7H', g.tiplu.r === 7 && g.tiplu.s === 'H');
  g.draw(1, 'stock'); g.discardCard(1, g.last.id);
  g.draw(2, 'stock'); g.discardCard(2, g.last.id);
  g.draw(0, 'stock');
  const mine = g.hands[0];
  const draw = g.last.id;
  const cs = mine.filter((i) => i !== draw).map((i) => require('../game.js').byId(i));
  // cut the 21 rigged cards into the 7 groups
  const pick = (tokens) => tokens.split(' ').map((t) => { const x = c(t); const k = cs.findIndex((q) => q.r === x.r && q.s === x.s && !q.used); cs[k].used = true; return cs[k].id; });
  const groups = ['AS 2S 3S', '9D 9D 9D', '4C 5C 6C', 'KS KH KD', '10C JC J', 'QS QC J', '6H 7H 8H'].map(pick);
  let threw = false; try { g.declare(0, groups.slice(0, 6), draw); } catch (e) { threw = e.user; }
  ok('short declaration rejected', threw);
  g.declare(0, groups, draw);
  ok('round over, dealer wins', g.over && g.result.winner === 0);
  const r0 = g.result.rows[0];
  ok('winner maal: tunnela 5 + marriage 10 + 2 man x2 = 19', r0.score === 19);
  ok('others unseen pay 10 + 19 diff', g.result.rows[1].net === -29 && g.result.rows[2].net === -29 && r0.net === 58);
}
// --- dublee route through Game: 7 identical pairs win immediately ---
{
  const g = new Game(2, 0, { dubleeWin: 7 }, false);
  const D = require('../game.js').DECK;
  const pairs = [];
  for (let r = 1; r <= 7; r++) { const a = D.filter((x) => x.r === r && x.s === 'S'); pairs.push(a[0].id, a[1].id); }
  g.hands[1] = [...pairs, ...D.filter((x) => x.s === 'C' && x.r >= 8).map((x) => x.id).slice(0, 7)];
  g.turn = 1; g.step = 'discard'; g.last = null;
  g.declare(1, [], g.hands[1][14]);
  ok('dublee win declared', g.over && g.result.winner === 1 && g.result.dublee);
}
console.log('rules self-check: ' + n + ' checks passed');
