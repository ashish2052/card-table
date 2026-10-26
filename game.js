// One round of Marriage, server-authoritative. Pure logic, no sockets (so tests can drive it).
const R = require('./public/rules.js');
const crypto = require('crypto');

const DECK = R.makeDeck();
const byId = (id) => DECK[id];
const rnd = (n) => crypto.randomInt(n);
function shuffle(a) { for (let i = a.length - 1; i > 0; i--) { const j = rnd(i + 1); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const fail = (m) => { const e = new Error(m); e.user = true; throw e; };

// Test rig (only when MARRIAGE_TEST=1): dealer gets a 7-meld hand and a known tiplu (7 of hearts)
const RIG = ['1S 2S 3S', '9D 9D 9D', '4C 5C 6C', 'KS KH KD', '10C JC J', 'QS QC J', '6H 7H 8H'];
function parseRig() {
  const need = {}; const groups = [];
  for (const g of RIG) groups.push(g.split(' ').map((tok) => {
    if (tok === 'J') return { r: 0, s: 'J' };
    const s = tok.slice(-1), r = tok.slice(0, -1) === 'A' ? 1 : +r2n(tok.slice(0, -1));
    return { r, s };
  }));
  return groups;
}
const r2n = (x) => ({ A: 1, J: 11, Q: 12, K: 13 }[x] || x);

class Game {
  constructor(n, dealer, opts, rig) {
    this.n = n; this.dealer = dealer; this.opts = opts;
    this.over = false; this.result = null; this.ev = { n: 0 };
    this.shown = Array.from({ length: n }, () => []);
    this.seen = Array(n).fill(false); this.dubleeShow = Array(n).fill(false); this.pendingSee = Array(n).fill(false);
    this.hands = Array.from({ length: n }, () => []);
    this.layout = Array(n).fill(null);
    let ids = shuffle(DECK.map((c) => c.id));
    if (rig) { // pull the rigged cards out of the deck
      const want = parseRig().flat();
      const mine = [];
      for (const w of want) { const i = ids.findIndex((id) => byId(id).r === w.r && byId(id).s === w.s); mine.push(ids.splice(i, 1)[0]); }
      this.hands[dealer] = mine;
      const t = ids.findIndex((id) => byId(id).r === 7 && byId(id).s === 'H');
      this.tiplu = byId(ids.splice(t, 1)[0]);
    }
    for (let k = 0; k < 21; k++) for (let s = 0; s < n; s++) if (!(rig && s === dealer)) this.hands[s].push(ids.pop());
    this.discard = [ids.pop()];
    if (!this.tiplu) { // tiplu: a non-joker from the middle of the stock, kept aside
      let i;
      do { i = Math.floor(ids.length * (0.3 + Math.random() * 0.4)); } while (byId(ids[i]).s === 'J');
      this.tiplu = byId(ids.splice(i, 1)[0]);
    }
    this.stock = ids;
    this.turn = (dealer + 1) % n; this.step = 'draw'; this.last = null;
    this.turnSince = Date.now();
    this.event('deal', dealer);
  }
  event(k, seat) { this.ev = { n: this.ev.n + 1, k, seat }; }
  cards(seat) { return this.hands[seat].map(byId); }

  need(seat, step) {
    if (this.over) fail('The round is over');
    if (this.turn !== seat) fail('Not your turn');
    if (step && this.step !== step) fail(step === 'draw' ? 'Discard first' : 'Draw a card first');
  }
  refill() {
    if (this.stock.length) return true;
    if (this.discard.length < 2) return false;
    const top = this.discard.pop();
    this.stock = shuffle(this.discard); this.discard = [top];
    return true;
  }
  draw(seat, from) {
    this.need(seat, 'draw');
    let id;
    if (from === 'discard') {
      if (!this.discard.length) fail('Discard pile is empty');
      id = this.discard[this.discard.length - 1];
      if (this.seen[seat] && !this.dubleeShow[seat] && R.isWild(byId(id), this.tiplu)) fail('After seeing the maal you cannot pick up a joker');
      if (this.dubleeShow[seat] && R.countDublees([...this.cards(seat), byId(id), ...this.shown[seat].flat()]) < 8) fail('On the dublee route you may only take a discard that completes dublee 8');
      this.discard.pop();
    } else {
      if (!this.refill()) { this.finishVoid(); return; }
      id = this.stock.pop();
    }
    this.hands[seat].push(id);
    if (this.layout[seat]) this.layout[seat].push([id]);
    this.last = { id, from }; this.step = 'discard'; this.event(from === 'discard' ? 'drawDiscard' : 'drawStock', seat);
  }
  removeFromHand(seat, ids) {
    const s = new Set(ids);
    this.hands[seat] = this.hands[seat].filter((i) => !s.has(i));
    if (this.layout[seat]) this.layout[seat] = this.layout[seat].map((g) => g.filter((i) => !s.has(i))).filter((g) => g.length);
  }
  discardCard(seat, id) {
    this.need(seat, 'discard');
    if (!this.hands[seat].includes(id)) fail('Card not in your hand');
    if (this.last && this.last.id === id && this.last.from === 'discard') fail('You cannot throw back the card you just took');
    this.removeFromHand(seat, [id]);
    this.discard.push(id);
    if (this.pendingSee[seat]) { this.pendingSee[seat] = false; this.seen[seat] = true; }
    this.turn = (seat + 1) % this.n; this.step = 'draw'; this.last = null; this.turnSince = Date.now();
    this.event('discard', seat);
  }
  arrange(seat, groups) {
    if (!Array.isArray(groups)) fail('Bad layout');
    const flat = groups.flat();
    const a = [...flat].sort((x, y) => x - y), b = [...this.hands[seat]].sort((x, y) => x - y);
    if (a.length !== b.length || a.some((v, i) => v !== b[i])) fail('Layout does not match your hand');
    this.layout[seat] = groups.filter((g) => g.length).map((g) => g.map(Number));
  }
  // lay down 3 tunnelas / pure sequences (or 7 dublees on the 8-dublee rule) to see the tiplu
  show(seat, groups) {
    this.need(seat, 'discard');
    if (this.seen[seat]) fail('You have already seen the maal');
    if (this.pendingSee[seat]) fail('You have already shown; throw a card to see the maal');
    const hand = new Set(this.hands[seat]);
    const flat = groups.flat();
    if (new Set(flat).size !== flat.length || !flat.every((i) => hand.has(i))) fail('Those cards are not in your hand');
    if (this.opts.dubleeWin === 8 && groups.length === 7 && groups.every((g) => g.length === 2 && R.isDublee(g.map(byId)))) {
      this.dubleeShow[seat] = true;
    } else {
      if (groups.length !== 3 || !groups.every((g) => R.classify(g.map(byId), null).pure)) fail('Show exactly 3 tunnelas or pure sequences');
    }
    this.removeFromHand(seat, flat);
    this.shown[seat] = groups.map((g) => g.map(byId));
    this.pendingSee[seat] = true; // the maal opens once this turn's discard is down
    this.event('show', seat);
  }
  declare(seat, groups, discardId) {
    this.need(seat, 'discard');
    if (!this.hands[seat].includes(discardId)) fail('Pick the card you throw away');
    if (this.last && this.last.id === discardId && this.last.from === 'discard') fail('You cannot throw back the card you just took');
    const held = this.hands[seat].filter((i) => i !== discardId).map(byId);
    const all = [...held, ...this.shown[seat].flat()];
    let dublee = false, shownNow = this.shown[seat];
    if (R.countDublees(all) >= this.opts.dubleeWin) dublee = true;
    else {
      const k = this.shown[seat].length;
      const flat = (groups || []).flat();
      const hs = [...held.map((c) => c.id)].sort((a, b) => a - b), fs = [...flat].sort((a, b) => a - b);
      if (!this.seen[seat] && k) fail('Bad state');
      if (groups.length !== 7 - k || hs.length !== fs.length || hs.some((v, i) => v !== fs[i])) fail('Arrange 7 melds of 3 plus one card to throw');
      const cl = groups.map((g) => R.classify(g.map(byId), this.tiplu));
      if (cl.some((c) => !c.valid)) fail('One of your groups is not a valid meld');
      if (k === 0) {
        const pure = groups.map((g, i) => i).filter((i) => cl[i].pure);
        if (pure.length < 3) fail('You must first show 3 tunnelas / pure sequences');
        pure.sort((a, b) => (cl[b].kind === 'tunnela') - (cl[a].kind === 'tunnela'));
        shownNow = pure.slice(0, 3).map((i) => groups[i].map(byId));
      }
    }
    this.seen[seat] = true;
    this.shown[seat] = shownNow;
    this.hands[seat] = held.map((c) => c.id);
    this.layout[seat] = null;
    this.discard.push(discardId);
    this.finish(seat, dublee);
  }
  maalFor(seat) {
    if (!this.seen[seat]) return { points: 0, lines: [] };
    const shownIds = new Set(this.shown[seat].flat().map((c) => c.id));
    const held = this.hands[seat].filter((i) => !shownIds.has(i)).map(byId);
    return R.maalScore(this.shown[seat], held, this.tiplu);
  }
  finish(winner, dublee) {
    const sc = [], rows = [];
    for (let s = 0; s < this.n; s++) { const m = this.maalFor(s); sc.push(m.points); rows.push({ seat: s, seen: this.seen[s], score: m.points, lines: m.lines }); }
    const st = R.settle(sc, this.seen, winner, dublee);
    rows.forEach((r) => { r.net = st.net[r.seat]; r.shown = this.shown[r.seat]; const sh = new Set(r.shown.flat().map((c) => c.id)); r.hand = [this.hands[r.seat].filter((i) => !sh.has(i)).map(byId)]; });
    this.over = true; this.result = { winner, dublee, tiplu: this.tiplu, rows, transfers: st.transfers };
    this.event('win', winner);
  }
  finishVoid() {
    this.over = true;
    this.result = { winner: -1, dublee: false, tiplu: this.tiplu, void: true, transfers: [], rows: Array.from({ length: this.n }, (_, s) => ({ seat: s, seen: this.seen[s], score: 0, lines: [], net: 0, shown: this.shown[s], hand: [this.hands[s].map(byId)] })) };
    this.event('void', -1);
  }
  // an absent player's turn: draw from the stock, throw that card back
  autoPlay(seat) {
    if (this.over || this.turn !== seat) return;
    if (this.step === 'draw') this.draw(seat, 'stock');
    if (!this.over && this.step === 'discard') this.discardCard(seat, this.last ? this.last.id : this.hands[seat][this.hands[seat].length - 1]);
  }
}

module.exports = { Game, DECK, byId, fail };
