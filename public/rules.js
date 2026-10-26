// Marriage rules engine. Shared by the server (CommonJS) and the browser (window.Rules).
// Rules follow pagat.com/rummy/marriage.html; alter / man point values are house values (pagat has none).
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Rules = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  const SUITS = ['S', 'H', 'D', 'C'];
  const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];
  const red = (s) => s === 'H' || s === 'D';
  const nextR = (r) => (r === 13 ? 1 : r + 1);
  const prevR = (r) => (r === 1 ? 13 : r - 1);

  // 3 standard decks + 2 printed jokers ("man") per deck = 162 cards
  function makeDeck() {
    const d = [];
    let id = 0;
    for (let k = 0; k < 3; k++) for (const s of SUITS) for (let r = 1; r <= 13; r++) d.push({ id: id++, r, s });
    for (let k = 0; k < 6; k++) d.push({ id: id++, r: 0, s: 'J' });
    return d;
  }

  // What is this card worth as maal, given the tiplu (null = tiplu not seen yet; only man is known)
  function kind(c, t) {
    if (c.s === 'J') return 'man';
    if (!t) return null;
    if (c.r === t.r && c.s === t.s) return 'tiplu';
    if (c.s === t.s && c.r === nextR(t.r)) return 'poplu';
    if (c.s === t.s && c.r === prevR(t.r)) return 'jhiplu';
    if (c.r === t.r) return red(c.s) === red(t.s) ? 'alter' : 'joker';
    return null;
  }
  const isWild = (c, t) => kind(c, t) !== null;

  const isTunnela = (cs) => cs.length === 3 && cs.every((c) => c.r === cs[0].r && c.s === cs[0].s);
  function isRun(cs) {
    if (cs.length !== 3 || cs.some((c) => c.s === 'J') || !cs.every((c) => c.s === cs[0].s)) return false;
    const rs = cs.map((c) => c.r).sort((a, b) => a - b);
    if (new Set(rs).size < 3) return false;
    return rs[2] - rs[0] === 2 || (rs[0] === 1 && rs[1] === 12 && rs[2] === 13); // A-2-3 .. Q-K-A, never K-A-2
  }
  function isSet(cs) {
    return cs.length === 3 && cs.every((c) => c.s !== 'J' && c.r === cs[0].r) && new Set(cs.map((c) => c.s)).size === 3;
  }
  function runFits(a, b) { // two ranks of one suit can sit in the same 3-run
    const lo = Math.min(a, b), hi = Math.max(a, b), d = hi - lo;
    if (d === 0) return false;
    if (d <= 2) return true;
    return lo === 1 && hi >= 12; // ace high: Q-K-A
  }

  // classify exactly 3 cards -> {valid, kind, pure}. pure = tunnela or natural pure sequence (counts to see the tiplu)
  function classify(cs, t) {
    const no = { valid: false, kind: null, pure: false };
    if (!cs || cs.length !== 3) return no;
    if (isTunnela(cs)) return { valid: true, kind: 'tunnela', pure: true };
    if (isRun(cs)) {
      const m = cs.map((c) => kind(c, t));
      const marriage = t && ['jhiplu', 'tiplu', 'poplu'].every((k) => m.includes(k));
      return { valid: true, kind: marriage ? 'marriage' : 'run', pure: true };
    }
    if (isSet(cs)) return { valid: true, kind: 'set', pure: false };
    const wild = cs.filter((c) => isWild(c, t));
    const rest = cs.filter((c) => !isWild(c, t));
    if (wild.length >= 2) return { valid: true, kind: 'wild', pure: false };
    if (wild.length === 1) {
      const [a, b] = rest;
      if (a.s === b.s && runFits(a.r, b.r)) return { valid: true, kind: 'dirty run', pure: false };
      if (a.r === b.r && a.s !== b.s) return { valid: true, kind: 'dirty set', pure: false };
    }
    return no;
  }

  const key = (c) => c.r + c.s;
  function countDublees(cs) {
    const m = {};
    for (const c of cs) m[key(c)] = (m[key(c)] || 0) + 1;
    return Object.values(m).reduce((n, v) => n + Math.floor(v / 2), 0);
  }
  const isDublee = (cs) => cs.length === 2 && key(cs[0]) === key(cs[1]);

  // ---- maal points (pagat table) ----
  const TIPLU = [0, 3, 7, 12], POP = [0, 2, 5, 10], MARRIAGE = [0, 10, 30, 60];
  const ALTER = 5, MAN = 2; // house values
  const tab = (a, n) => (n < a.length ? a[n] : a[a.length - 1] + (n - a.length + 1) * 5);
  const TUNNELA = { plain: 5, joker: 10, pop: 20 };

  // shown: melds exposed on the table; held: every other card the player has. Returns {points, lines}
  function maalScore(shown, held, t) {
    const lines = [];
    let pts = 0;
    const rest = [];
    for (const m of shown) {
      if (isTunnela(m)) {
        const k = kind(m[0], t);
        const p = k === 'poplu' || k === 'jhiplu' || k === 'tiplu' ? TUNNELA.pop : k ? TUNNELA.joker : TUNNELA.plain;
        pts += p;
        lines.push({ label: 'Tunnela ' + label(m[0]), pts: p });
      } else rest.push(...m);
    }
    rest.push(...held);
    const n = { tiplu: 0, poplu: 0, jhiplu: 0, alter: 0, man: 0 };
    for (const c of rest) { const k = kind(c, t); if (k in n) n[k]++; }
    const mar = Math.min(n.tiplu, n.poplu, n.jhiplu);
    if (mar) { const p = tab(MARRIAGE, mar); pts += p; lines.push({ label: 'Marriage x' + mar, pts: p }); }
    for (const [k, tb] of [['tiplu', TIPLU], ['poplu', POP], ['jhiplu', POP]]) {
      const left = n[k] - mar;
      if (left > 0) { const p = tab(tb, left); pts += p; lines.push({ label: k + (left > 1 ? ' x' + left : ''), pts: p }); }
    }
    if (n.alter) { const p = n.alter * ALTER; pts += p; lines.push({ label: 'alter x' + n.alter, pts: p }); }
    if (n.man) { const p = n.man * MAN; pts += p; lines.push({ label: 'man x' + n.man, pts: p }); }
    return { points: pts, lines };
  }
  const label = (c) => (c.s === 'J' ? 'Man' : RANK_LABEL[c.r] + { S: '♠', H: '♥', D: '♦', C: '♣' }[c.s]);

  // scores[i] maal points, seen[i] bool. Winner is paid 3 (seen) / 10 (unseen) by each opponent (+5 each for a dublee win);
  // every player pays every other the difference of their points. Returns {transfers:[{from,to,amt}], net:[...]}
  function settle(scores, seen, winner, dublee) {
    const n = scores.length;
    const pay = Array.from({ length: n }, () => Array(n).fill(0)); // pay[a][b] = a pays b
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j && scores[i] > scores[j]) pay[j][i] += scores[i] - scores[j];
    for (let j = 0; j < n; j++) if (j !== winner) pay[j][winner] += (seen[j] ? 3 : 10) + (dublee ? 5 : 0);
    const transfers = [], net = Array(n).fill(0);
    for (let a = 0; a < n; a++) for (let b = a + 1; b < n; b++) {
      const d = pay[a][b] - pay[b][a];
      if (d > 0) transfers.push({ from: a, to: b, amt: d });
      else if (d < 0) transfers.push({ from: b, to: a, amt: -d });
      net[b] += d; net[a] -= d;
    }
    return { transfers, net };
  }

  // Greedy "Auto" grouping for the hand: tunnelas, runs, sets, then the rest by suit. Returns arrays of cards.
  function autoGroup(cards, t) {
    const left = [...cards].sort((a, b) => SUITS.indexOf(a.s) - SUITS.indexOf(b.s) || a.r - b.r);
    const take = (arr) => { for (const c of arr) left.splice(left.indexOf(c), 1); return arr; };
    const out = [];
    const byKey = {};
    for (const c of left) (byKey[key(c)] = byKey[key(c)] || []).push(c);
    for (const k in byKey) while (byKey[k].length >= 3 && byKey[k][0].s !== 'J') out.push(take(byKey[k].splice(0, 3)));
    for (const s of SUITS) {
      let again = true;
      while (again) {
        again = false;
        const have = {};
        left.filter((c) => c.s === s).forEach((c) => (have[c.r] = have[c.r] || c));
        const rs = [...Array(14).keys()].map((i) => i + 1); // 1..14 (14 = ace high)
        for (let r = 1; r <= 12; r++) {
          const g = [r, r + 1, r + 2].map((x) => have[x === 14 ? 1 : x]);
          if (g.every(Boolean)) { out.push(take(g)); again = true; break; }
        }
      }
    }
    for (let r = 1; r <= 13; r++) {
      const bySuit = {};
      left.filter((c) => c.r === r && c.s !== 'J').forEach((c) => (bySuit[c.s] = bySuit[c.s] || c));
      const g = Object.values(bySuit);
      if (g.length >= 3) out.push(take(g.slice(0, 3)));
    }
    const wilds = left.filter((c) => isWild(c, t));
    take([...wilds]);
    const rest = left.slice();
    // pair near cards with spare wilds
    const lone = [];
    for (const c of rest) lone.push(c);
    const used = new Set();
    for (const w of wilds.slice()) {
      if (wilds.length < 1) break;
      let done = false;
      for (let i = 0; i < lone.length && !done; i++) for (let j = i + 1; j < lone.length && !done; j++) {
        if (used.has(lone[i]) || used.has(lone[j])) continue;
        if (classify([lone[i], lone[j], w], t).valid) { out.push([lone[i], lone[j], w]); used.add(lone[i]); used.add(lone[j]); wilds.splice(wilds.indexOf(w), 1); done = true; }
      }
    }
    const tail = lone.filter((c) => !used.has(c)).concat(wilds);
    return { melds: out, rest: tail };
  }

  return { SUITS, RANK_LABEL, makeDeck, kind, isWild, classify, countDublees, isDublee, maalScore, settle, autoGroup, label, isTunnela, isRun, key, red };
});
