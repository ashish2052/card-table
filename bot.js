// Computer player: given a seat's state view, return the next action message (or null).
// Greedy heuristics, no learning; runs inside the server, costs nothing per move.
const R = require('./public/rules.js');

const pureMeld = (cs) => { const c = R.classify(cs); return c.valid && c.pure; };
const wild = (c, t) => c.s === 'J' || (t && R.isWild(c, t));

function useful(c, hand, t) {
  if (wild(c, t)) return 100;
  let s = 0;
  for (const o of hand) {
    if (o.id === c.id || o.s === 'J') continue;
    if (o.s === c.s && o.r === c.r) s += 3;
    else if (o.s === c.s && Math.abs(o.r - c.r) <= 2) s += 2 - Math.abs(o.r - c.r) * 0.5;
    else if (o.r === c.r) s += 0.5;
  }
  return s;
}

function bestPure(hand) { // disjoint pure melds, tunnelas first
  const used = new Set(), out = [], cands = [];
  for (let i = 0; i < hand.length; i++) for (let j = i + 1; j < hand.length; j++) for (let k = j + 1; k < hand.length; k++) {
    const g = [hand[i], hand[j], hand[k]];
    if (pureMeld(g)) cands.push({ g, tun: R.isTunnela(g) });
  }
  cands.sort((a, b) => b.tun - a.tun);
  for (const c of cands) if (c.g.every((x) => !used.has(x.id))) { c.g.forEach((x) => used.add(x.id)); out.push(c.g); }
  return out;
}

// how close a hand is to winning: full melds dominate, then near-melds
// near-melds valued by outs: how many unseen cards would finish them (3 decks = 3 copies of each card)
function partials(rest, seen) {
  const cnt = {}; for (const c of rest) cnt[c.r + c.s] = (cnt[c.r + c.s] || 0) + 1;
  const outs = (r, s) => Math.max(0, 3 - (cnt[(r === 14 ? 1 : r) + s] || 0));
  let p = 0; const used = new Set();
  const pairs = [];
  for (let i = 0; i < rest.length; i++) for (let j = i + 1; j < rest.length; j++) {
    const a = rest[i], b = rest[j];
    if (a.s === 'J' || b.s === 'J') continue;
    const lo = Math.min(a.r, b.r), hi = Math.max(a.r, b.r);
    let o = 0;
    if (a.s === b.s && a.r === b.r) o = outs(a.r, a.s);
    else if (a.s === b.s && hi - lo === 1) o = (lo > 1 ? outs(lo - 1, a.s) : 0) + outs(hi + 1, a.s) + (lo === 1 ? outs(13, a.s) : 0);
    else if (a.s === b.s && hi - lo === 2) o = outs(lo + 1, a.s);
    else if (a.s === b.s && lo === 1 && (hi === 13 || hi === 12)) o = outs(hi === 13 ? 12 : 13, a.s);
    else if (seen && a.r === b.r) o = 4; // set: two other suits
    if (o) pairs.push({ a, b, o });
  }
  pairs.sort((x, y) => y.o - x.o);
  for (const q of pairs) if (!used.has(q.a.id) && !used.has(q.b.id)) { p += q.o * 0.6; used.add(q.a.id); used.add(q.b.id); }
  return p;
}
function evalHand(hand, t, seen) {
  if (!seen) {
    const melds = bestPure(hand), inM = new Set(melds.flat().map((c) => c.id));
    const rest = hand.filter((c) => !inM.has(c.id));
    return Math.min(melds.length, 3) * 12 + Math.max(0, melds.length - 3) * 6 + partials(rest, false) + hand.filter((c) => c.s === 'J').length * 2;
  }
  const ag = R.autoGroup(hand, t);
  const maal = hand.filter((c) => R.isWild(c, t)).length;
  return ag.melds.length * 12 + partials(ag.rest.filter((c) => !R.isWild(c, t)), true) + maal * 3;
}
function bestThrow(hand, t, seen, took) {
  let best = null, bv = -1e9;
  for (const c of hand) {
    if (c.id === took) continue;
    const v = evalHand(hand.filter((x) => x.id !== c.id), t, seen);
    if (v > bv) { bv = v; best = c; }
  }
  return { card: best, value: bv };
}

function decide(m) {
  const hand = m.handFlat, t = m.tiplu, seen = !!t;
  if (m.step === 'draw') {
    const top = m.discard[m.discard.length - 1];
    let take = false;
    if (top && !(seen && R.isWild(top, t))) {
      const now = evalHand(hand, t, seen);
      const after = bestThrow([...hand, top], t, seen, top.id).value;
      take = after >= now + (seen ? 4 : 1.5); // a real gain, not a coin-flip; stock is a free lottery ticket
    }
    return { t: 'draw', from: take ? 'discard' : 'stock' };
  }
  if (!seen && !(m.players[m.you].shown || []).length) {
    const p = bestPure(hand);
    if (p.length >= 3) return { t: 'show', groups: p.slice(0, 3).map((g) => g.map((c) => c.id)) };
  } else if (seen) {
    const ag = R.autoGroup(hand, t);
    const k = (m.players[m.you].shown || []).length;
    if (ag.rest.length === 1 && ag.melds.length === 7 - k)
      return { t: 'declare', groups: ag.melds.map((g) => g.map((c) => c.id)), discard: ag.rest[0].id };
  }
  const took = m.last && m.last.from === 'discard' ? m.last.id : null;
  return { t: 'discard', id: bestThrow(hand, t, seen, took).card.id };
}

module.exports = { decide };
