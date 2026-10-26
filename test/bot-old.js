// Computer player: given a seat's state view, return the next action message (or null).
// Greedy heuristics, no learning; runs inside the server, costs nothing per move.
const R = require('../public/rules.js');

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

function decide(m) {
  const hand = m.handFlat, t = m.tiplu, seen = !!t;
  if (m.step === 'draw') {
    const top = m.discard[m.discard.length - 1];
    let take = false;
    if (top && !(seen && R.isWild(top, t))) {
      const locked = new Set(bestPure(hand).flat().map((c) => c.id));
      const free = hand.filter((c) => !locked.has(c.id));
      for (let i = 0; i < free.length && !take; i++) for (let j = i + 1; j < free.length && !take; j++)
        if (pureMeld([free[i], free[j], top])) take = true;
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
  const keep = new Set((seen ? R.autoGroup(hand, t).melds : bestPure(hand)).flat().map((c) => c.id));
  const took = m.last && m.last.from === 'discard' ? m.last.id : null;
  let pool = hand.filter((c) => !keep.has(c.id) && c.id !== took);
  if (!pool.length) pool = hand.filter((c) => c.id !== took);
  const c = pool.sort((a, b) => useful(a, hand, t) - useful(b, hand, t))[0];
  return { t: 'discard', id: c.id };
}

module.exports = { decide };
