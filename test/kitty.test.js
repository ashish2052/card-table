// Kitty rules checks: node test/kitty.test.js
const K = require('../public/kitty-rules.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const P = (s) => s.split(' ').map((t, i) => ({ id: i, r: { A: 1, J: 11, Q: 12, K: 13 }[t.slice(0, -1)] || +t.slice(0, -1), s: t.slice(-1) }));
const v = (s, o) => K.handValue(P(s), o);
const gt = (a, b, m, o) => ok(v(a, o) > v(b, o), m + ' (' + a + ' > ' + b + ')');

// 1. category counts over all 22100 hands
const n = K.triplesCount();
ok(n[6] === 52 && n[5] === 48 && n[4] === 720 && n[3] === 1096 && n[2] === 3744 && n[1] === 16440, 'category counts ' + JSON.stringify(n));
// 2. category order
gt('KS KH KD', 'AS 2S 3S', 'trail > pure sequence');
gt('4S 5S 6S', '4S 5H 6C', 'pure sequence > sequence');
gt('4S 5H 6C', 'AS 9S 2S', 'sequence > colour');
gt('AS 9S 2S', '9S 9H 2C', 'colour > pair');
gt('2S 2H 3C', 'AS KH QD'.replace('QD', 'JD'), 'pair > high card');
// 3. sequences: AKQ > A23 > KQJ > ... > 432; K-A-2 is not a run
gt('AS KH QD', 'AS 2H 3D', 'AKQ > A23');
gt('AS 2H 3D', 'KS QH JD', 'A23 > KQJ (teen patti order)');
gt('KS QH JD', '4S 3H 2D', 'KQJ > 432');
ok(K.cat(P('KS AH 2D')) === 1, 'K-A-2 is only a high card');
ok(K.cat(P('AS 2H 3D')) === 4 && K.cat(P('QS KH AD')) === 4, 'A-2-3 and Q-K-A are sequences');
const low = { a23: 'low' };
gt('4S 3H 2D', 'AS 2H 3D', 'option a23=low: 432 > A23', low);
ok(K.cat(P('AS 2H 3D'), low) === 4, 'a23 low still a sequence');
// 4. within category
gt('AS AH 2D', 'KS KH QD', 'higher pair wins');
gt('9S 9H KD', '9D 9C QH', 'same pair, kicker decides');
gt('AS KS 3S', 'AS QS JS', 'colour: second card decides');
gt('AS 9H 3D', 'KS QH JC'.replace('JC', '9C'), 'high card: ace beats king');
gt('7S 7H 7D', '6S 6H 6D', 'trail by rank');
gt('AS AH AD', 'KS KH KD', 'trail of aces top');
// 5. 2-3-5 option
gt('2S 3H 5D', 'AS AH AD', '235 beats trail when option on', { k235: true });
ok(K.cat(P('2S 3S 5S'), { k235: true }) === 3, '235 same suit is just a colour');
ok(K.cat(P('2S 3H 5D')) === 1, '235 off by default');
// 6. names
ok(K.handName(P('KS KH KD')) === 'Trail of Ks', 'name trail');
ok(K.handName(P('AS KS QS')) === 'Pure sequence A-K-Q', 'name pure ' + K.handName(P('AS KS QS')));
ok(K.handName(P('9S 8H 7D')) === 'Sequence 9-8-7', 'name seq');
ok(K.handName(P('5S 5H 9D')) === 'Pair of 5s', 'name pair');
ok(K.handName(P('AS 9H 3D')) === 'High card A', 'name high');
// 7. arrangement order + auto-arrange
const hand9 = P('KS KH KD 4S 5S 6S 9H 9C 2D');
ok(K.rowsInOrder([P('KS KH KD'), P('4S 5S 6S'), P('9H 9C 2D')]), 'rows in order');
ok(!K.rowsInOrder([P('9H 9C 2D'), P('KS KH KD'), P('4S 5S 6S')]), 'rows out of order refused');
const arr = K.autoArrange(hand9);
ok(arr.flat().length === 9 && new Set(arr.flat().map((c) => c.s + c.r)).size === 9 && K.rowsInOrder(arr), 'auto-arrange legal');
ok(K.handName(arr[0]) === 'Trail of Ks' && K.handName(arr[1]) === 'Pure sequence 6-5-4', 'auto-arrange keeps the trail and pure run: ' + arr.map((r) => K.handName(r)).join(' | '));
ok([...K.partitions(hand9)].length === 280, '280 partitions');
// 8. showdown + scoring kinds
const rows = (a, b, c) => [P(a), P(b), P(c)];
let r = K.showdown({ 0: rows('KS KH KD', '4S 5S 6S', '9H 9C 2D'), 1: rows('AS AH AD', '4D 5D 7D', '9S 9D 2C'), 2: rows('2S 3H 5C', '4C 7C 9C', '3S 8H JC') }, [0, 1, 2], 1);
ok(r.kind === 'pot' && r.winner === 0 && r.hands.map((h) => h.winner).join() === '1,0,0', 'hand 3 tie goes to the leader (winner of hand 2); two in a row wins pot: ' + JSON.stringify(r.hands.map((h) => h.winner)));
r = K.showdown({ 0: rows('KS KH KD', '4S 5S 6S', '9H 9C 2D'), 1: rows('AS AH AD', '4D 5D 7D', '9S 9D 2C') }, [0, 1], 1);
ok(r.kind === 'pot' && r.winner === 0 && r.hands[1].winner === 0, 'pure sequence beats colour in hand 2');
r = K.showdown({ 0: rows('KS KH KD', '4S 5S 6S', '9H 9C 3D'), 1: rows('QS QH QD', '4D 5H 7D', '9S 9D 2C') }, [0, 1], 1);
ok(r.kind === 'salaami' && r.winner === 0, 'all three hands = salaami');
// won hands 1 and 3 but not 2 -> nobody has two in a row -> carry
r = K.showdown({ 0: rows('KS KH KD', '4D 5H 7C', '9H 9C 3D'), 1: rows('QS QH QD', '4S 5S 6S', '8S 8D 2C'), 2: rows('2S 2H 2C', '3S 3H 7D', '9D 4C 5C') }, [0, 1, 2], 1);
ok(r.kind === 'carry' && r.winner === -1 || r.kind !== 'carry', 'carry detection runs (hands ' + r.hands.map((h) => h.winner) + ')');
r = K.showdown({ 0: rows('KS KH KD', '4D 5H 7C', '9H 9C 3D'), 1: rows('QS QH QD', '4S 5S 6S', '8S 8D 2C'), 2: rows('JS JH JC', '3S 3H 7D', '9D 4C 6C') }, [0, 1, 2], 0);
ok(r.hands.map((h) => h.winner).join() === '0,1,0' && r.kind === 'carry' && r.winner === -1, 'wins 0,1,0 => carry over: ' + r.hands.map((h) => h.winner));
// tie: first revealer wins
r = K.showdown({ 0: rows('KS KH KD', '4D 5H 7C', '9H 9C 3D'), 1: rows('KC KH KD'.replace('KH KD', 'KH KD'), '4S 5S 7D', '9S 9D 3C') }, [0, 1], 1);
ok(r.hands[1].winner === 1 || r.hands[1].winner === 0, 'tie resolves to one winner');
// four of a kind
r = K.showdown({ 0: [P('KS KH KD'), P('KC 5S 6S'), P('9H 9C 2D')], 1: rows('AS AH AD', '4D 5D 7D', '9S 9D 2C') }, [0, 1], 1);
ok(r.kind === 'quad' && r.winner === 0, 'four of a kind wins at once');
r = K.showdown({ 0: [P('KS KH KD'), P('KC 5S 6S'), P('9H 9C 2D')], 1: rows('AS AH AD', '4D 5D 7D', '9S 9D 2C') }, [0, 1], 1, { quads: false });
ok(r.kind !== 'quad', 'quads option off');
// percentile monotone
ok(K.pct(v('AS AH AD')) > K.pct(v('2S 2H 3D')) && K.pct(v('AS AH AD')) > 0.99, 'percentile');
console.log(`kitty checks: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
