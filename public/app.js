// Marriage client: lobby, table, drag/spring card handling. The server is authoritative; this only draws and asks.
(function () {
  const R = window.Rules, $ = (s) => document.querySelector(s), $$ = (s) => [...document.querySelectorAll(s)];
  const PAL = ['#f6c453', '#7fd1b9', '#f08a7c', '#a99cf0', '#8ec3f2'];
  const SUIT_CH = { S: '♠', H: '♥', D: '♦', C: '♣' };
  const SORT_SUITS = ['S', 'H', 'C', 'D'];
  document.getElementById('defs').innerHTML = window.CARD_DEFS;
  document.documentElement.style.setProperty('--back', window.cardBackUri);
  if (window.CSS && CSS.supports('transition-timing-function', 'linear(0,1)')) { // true damped spring as an easing curve
    const pts = []; for (let i = 0; i <= 40; i++) { const t = i / 40; pts.push((1 - Math.exp(-6.2 * t) * Math.cos(9.5 * t)).toFixed(3)); }
    document.documentElement.style.setProperty('--sp', 'linear(' + pts.join(',') + ')');
  }

  let ws, S = null, session = JSON.parse(localStorage.getItem('marriage.session') || 'null');
  let groups = [], sel = new Set(), lastEv = -1, firstRender = true, curRound = -1, sheetRound = -1, pass = 0, pendingSend = 0, dealUntil = 0, playedDeal = -1;
  const DEAL_GAP = 110, FLIGHT = 550;
  const reduceMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const seatDelay = (seat, k, n) => ((k * n + ((seat - S.dealer - 1 + n) % n)) * DEAL_GAP);
  const sprites = new Map();
  let vw = 0, vh = 0, cw = 66, ch = 92, geo = {}, drag = null;
  const me = () => S.you;
  const cardsEl = $('#cards');
  const byId = () => { const m = new Map(); if (S) { S.handFlat.forEach((c) => m.set(c.id, c)); } return m; };

  // ------------------------------------------------------------ network
  function connect() {
    ws = new WebSocket((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host);
    ws.onopen = () => { if (session) send({ t: 'resume', code: session.code, key: session.key }); };
    ws.onmessage = (e) => {
      const m = JSON.parse(e.data);
      if (m.t === 'hello') { session = { code: m.code, key: m.key }; localStorage.setItem('marriage.session', JSON.stringify(session)); }
      else if (m.t === 'gone') { session = null; localStorage.removeItem('marriage.session'); S = null; show('lobby'); }
      else if (m.t === 'state') onState(m);
      else if (m.t === 'react') { if (window.onReact) window.onReact(m); }
      else if (m.t === 'err') { discardSent = false; toast(m.m); $('#lobbyerr').textContent = m.m; Sfx.err(); if (S) { reconcile(true); layout(); } }
    };
    ws.onclose = () => { setTimeout(connect, 1000); };
  }
  const send = (m) => { if (ws && ws.readyState === 1) ws.send(JSON.stringify(m)); };
  window.__send = send;
  let toastT; function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => el.classList.remove('on'), 2600); }

  // ------------------------------------------------------------ lobby
  const saved = localStorage.getItem('marriage.name'); if (saved) $('#name').value = saved;
  const qp = new URLSearchParams(location.search).get('r'); if (qp) { $('#code').value = qp.toUpperCase().slice(0, 4); }
  const nameVal = () => { const n = $('#name').value.trim(); localStorage.setItem('marriage.name', n); return n; };
  $('#create').onclick = () => { Sfx.unlock(); send({ t: 'create', gameType:window.selectedGame||'marriage',opts:window.tableOptions(), name: nameVal() }); };
  $('#join').onclick = () => { Sfx.unlock(); send({ t: 'join', code: $('#code').value, name: nameVal() }); };
  $('#code').oninput = (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, ''); };
  $('#start').onclick = () => send({ t: 'start' });
  let nBots = 2;
  $$('#botseg button').forEach((b) => (b.onclick = () => { nBots = +b.dataset.v; $$('#botseg button').forEach((x) => x.classList.toggle('on', x === b)); }));
  $('#vsbot').onclick = () => { Sfx.unlock(); send({ t: 'create', gameType:window.selectedGame||'marriage',opts:window.tableOptions(), name: nameVal(), bots: nBots }); };
  $('#addbot').onclick = () => send({ t: 'addbot' });
  $$('#dubseg button').forEach((b) => (b.onclick = () => send({ t: 'opts', dubleeWin: +b.dataset.v })));
  let shareBase = location.origin;
  if (/^(localhost|127\.)/.test(location.hostname)) fetch('/api/info').then((r) => r.json()).then((i) => { if (i.ips[0]) shareBase = 'http://' + i.ips[0] + ':' + i.port; });
  $('#share').onclick = () => {
    const url = shareBase + '/?r=' + S.code;
    const done = () => { $('#linkhint').textContent = 'Copied: ' + url; };
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(url).then(done, () => prompt('Copy this link', url));
    else { const t = document.createElement('textarea'); t.value = url; document.body.appendChild(t); t.select(); try { document.execCommand('copy'); done(); } catch { prompt('Copy this link', url); } t.remove(); }
  };
  $('#howto').onclick = $('#bHow').onclick = () => ($('#rules').hidden = false);
  $$('[data-close]').forEach((b) => (b.onclick = () => (b.closest('.overlay').hidden = true)));
  $('#bSound').onclick = () => { Sfx.unlock(); $('#bSound').style.opacity = Sfx.toggle() ? 0.45 : 1; };
  $('#bSound').style.opacity = Sfx.muted ? 0.45 : 1;
  function leave(ask) {
    if (ask && !confirm('Leave this game?')) { history.pushState({ room: 1 }, ''); return; }
    localStorage.removeItem('marriage.session'); session = null; S = null;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    location.href = '/';
  }
  window.leaveGame = leave;
  $('#bExit').onclick = () => leave(true);
  $('#leave').onclick = () => leave(false);
  // browser Back leaves the room instead of doing nothing (the app is one page, so there is no history otherwise)
  window.addEventListener('popstate', () => { if (S) leave(S.phase !== 'lobby'); });
  $('#bFull').onclick = () => {
    if (document.fullscreenElement) return document.exitFullscreen();
    document.documentElement.requestFullscreen?.().then(() => screen.orientation?.lock?.('landscape')).catch(() => {});
  };
  $('#bScores').onclick = () => { if (S && S.result) renderSheet(); else renderTotals(); };

  function show(which) { $('#lobby').hidden = which !== 'lobby'; $('#game').hidden = which !== 'game'; }
  function renderLobby() {
    $('#entry').hidden = true; $('#room').hidden = false;
    $('#roomcode').textContent = S.code;
    $('#plist').innerHTML = S.players.map((p) => `<li><span class="av" style="background:${PAL[p.seat]}">${esc(p.name[0] || '?').toUpperCase()}</span><b>${esc(p.name)}</b>${p.seat === S.host ? ' <span class="hint">host</span>' : ''}${p.seat === S.you ? ' <span class="hint">you</span>' : ''}</li>`).join('');
    const host = S.you === S.host;
    $('#start').hidden = !host; $('#addbot').hidden = !host || S.players.length >= 5; $('#waiting').hidden = host; $('#optrow').style.display = '';
    $('#start').disabled = S.players.length < 2; $('#start').textContent = S.players.length < 2 ? 'Waiting for players (need 2+)' : 'Deal the cards';
    $$('#dubseg button').forEach((b) => b.classList.toggle('on', +b.dataset.v === S.opts.dubleeWin));
    $$('#dubseg button').forEach((b) => (b.disabled = !host));
  }
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // ------------------------------------------------------------ state in
  function onState(m) {
    const prev = S; S = m; window.__S = m;
    if (!prev && !(history.state && history.state.room)) history.pushState({ room: 1 }, '');
    if(S.gameType!=='marriage'){window.drawTableGame(S,send);return;}
    if (!prev || prev.turn !== S.turn || prev.step !== S.step) discardSent = false;
    if (S.phase === 'lobby') { show('lobby'); renderLobby(); return; }
    show('game');
    if (S.round !== curRound) { // new round: wipe the table, deal animation follows from the event
      curRound = S.round; dealUntil = 0; sprites.forEach((s) => s.el.remove()); sprites.clear(); groups = []; sel.clear(); $('#sheet').hidden = true; firstRender = firstRender && !prev;
    }
    const ev = S.ev || { n: 0 };
    const fresh = !firstRender && ev.n > lastEv;
    const openingDeal = S.phase === 'play' && ev.k === 'deal' && playedDeal !== S.round && !reduceMotion();
    if (openingDeal) playedDeal = S.round;
    const showEv = openingDeal ? ev : (fresh ? ev : null);
    reconcile(false);
    layout(showEv);
    soundFor(showEv, prev);
    lastEv = ev.n; firstRender = false;
    renderChrome();
    if (S.phase === 'over' && sheetRound !== S.round) { sheetRound = S.round; setTimeout(() => { if (S.phase === 'over') { renderSheet(); confetti(); } }, firstRender ? 0 : 1300); }
  }
  function soundFor(ev, prev) {
    if (!ev) return;
    const n = S.players.length;
    if (ev.k === 'deal') {
      if (reduceMotion()) Sfx.deal(0);
      else { const cards = 21 * n; for (let i = 0; i < cards; i++) setTimeout(() => Sfx.deal(i), i * DEAL_GAP); }
    }
    else if (ev.k === 'drawStock' || ev.k === 'drawDiscard') Sfx.flick();
    else if (ev.k === 'discard') { Sfx.place(); if (S.turn === me()) setTimeout(Sfx.turn, 250); }
    else if (ev.k === 'show') Sfx.show();
    else if (ev.k === 'win') Sfx.win();
  }

  // keep local group layout in step with the server's hand
  function reconcile(force) {
    if (!S.handFlat) return;
    const have = new Set(S.handFlat.map((c) => c.id));
    groups = groups.map((g) => g.filter((i) => have.has(i))).filter((g) => g.length);
    const placed = new Set(groups.flat());
    const missing = S.handFlat.filter((c) => !placed.has(c.id));
    if (!groups.length && S.hand && S.hand.flat().length === S.handFlat.length) groups = S.hand.map((g) => g.map((c) => c.id));
    else if (!groups.length) groups = sortGroups('suit', S.handFlat);
    else missing.forEach((c) => groups.push([c.id]));
    const same = S.hand && JSON.stringify(S.hand.map((g) => g.map((c) => c.id))) === JSON.stringify(groups);
    if (!same) pushArrange();
  }
  function pushArrange() { clearTimeout(pendingSend); pendingSend = setTimeout(() => send({ t: 'arrange', groups }), 150); }

  function sortGroups(mode, cards) {
    const rk = (c) => (c.s === 'J' ? 99 : c.r === 1 ? 1 : c.r);
    const cs = [...cards];
    if (mode === 'rank') {
      cs.sort((a, b) => rk(a) - rk(b) || SORT_SUITS.indexOf(a.s) - SORT_SUITS.indexOf(b.s));
      const out = []; cs.forEach((c) => { const g = out[out.length - 1]; if (g && rk(S.handFlat.find((x) => x.id === g[0]) || c) === rk(c)) g.push(c.id); else out.push([c.id]); });
      return out;
    }
    cs.sort((a, b) => SORT_SUITS.indexOf(a.s) - SORT_SUITS.indexOf(b.s) || rk(a) - rk(b));
    const out = []; let cur = null;
    cs.forEach((c) => { if (!cur || cur.s !== c.s) { cur = { s: c.s, ids: [] }; out.push(cur); } cur.ids.push(c.id); });
    return out.map((g) => g.ids);
  }
  $$('.sort button').forEach((b) => (b.onclick = () => {
    if (!S || !S.handFlat) return; Sfx.pick();
    const drawn = S.last && S.step === 'discard' ? S.last.id : null;
    let cards = S.handFlat.filter((c) => c.id !== drawn);
    if (b.dataset.sort === 'auto') {
      const r = R.autoGroup(cards, S.tiplu || null);
      groups = r.melds.map((g) => g.map((c) => c.id));
      if (r.rest.length) groups.push(sortGroups('suit', r.rest).flat());
    } else groups = sortGroups(b.dataset.sort, cards);
    if (drawn) groups.push([drawn]);
    sel.clear(); pushArrange(); layout(null, true);
  }));

  // ------------------------------------------------------------ geometry + sprites
  function sizes() {
    vw = innerWidth; vh = innerHeight;
    cw = Math.max(46, Math.min(vh * 0.17, vw * 0.1, 150)); ch = cw * 1.4;
    document.documentElement.style.setProperty('--cw', cw + 'px'); document.documentElement.style.setProperty('--ch', ch + 'px');
  }
  function setT(el, t) { el.style.transform = `translate(${(t.x - cw / 2).toFixed(1)}px,${(t.y - ch / 2).toFixed(1)}px) rotate(${(t.r || 0).toFixed(2)}deg) scale(${t.s || 1})`; el.style.zIndex = t.z || 0; }
  function sprite(key, card, t, o) {
    o = o || {};
    let sp = sprites.get(key);
    if (!sp) {
      const el = document.createElement('div');
      el.className = 'card nt' + (o.down ? ' down' : ''); el.dataset.key = key;
      el.innerHTML = '<div class="in"><div class="f"></div><div class="b"></div></div>';
      if (card) { el.dataset.id = card.id; }
      cardsEl.appendChild(el);
      setT(el, o.from || t); void el.offsetWidth; el.classList.remove('nt');
      sp = { el, key, card, mk: undefined, down: !!o.down, f: el.querySelector('.f') };
      sprites.set(key, sp);
      if (o.delay) el.style.transitionDelay = o.delay + 'ms';
      if (o.down && o.reveal && !o.instant) setTimeout(() => { if (el.isConnected) el.classList.remove('down'); }, (o.delay || 0) + (o.revealAfter == null ? 40 : o.revealAfter));
      if (o.instant) { el.classList.add('nt'); setT(el, t); void el.offsetWidth; el.classList.remove('nt'); }
    }
    sp.mark = pass; sp.t = t;
    if (card && sp.mk !== (o.mk || null)) { sp.mk = o.mk || null; sp.f.innerHTML = window.cardFace(card, sp.mk); }
    if (o.down !== undefined && !o.reveal && sp.down !== !!o.down) { sp.down = !!o.down; sp.el.classList.toggle('down', sp.down); }
    sp.el.classList.toggle('mine', !!o.mine); sp.el.classList.toggle('sel', !!o.sel); sp.el.classList.toggle('wild', !!o.wild); sp.el.classList.toggle('fresh', !!o.fresh);
    if (!(drag && drag.moved && drag.id === card?.id)) setT(sp.el, t);
    return sp;
  }

  function mark(c) { return S && S.tiplu && S.seenMe ? R.kind(c, S.tiplu) : c.s === 'J' ? 'man' : null; }

  // positions of every card in a hand layout (groups = arrays of ids)
  function handPos(gs, cardsById) {
    const flat = gs.flat(), n = flat.length, g = gs.length, pos = new Map(), gap = cw * 0.32, avail = vw - 28;
    let step = n > 1 ? (avail - cw - (g - 1) * gap) / (n - 1) : 0;
    step = Math.max(cw * 0.2, Math.min(cw * 0.68, step));
    const total = cw + (n - 1) * step + (g - 1) * gap, x0 = (vw - total) / 2 + cw / 2, mid = (n - 1) / 2, curve = Math.min(0.06, 2.4 / Math.max(n, 8)) * (cw / 66), baseY = vh - ch / 2 - 8 - mid * mid * curve;
    let k = 0;
    gs.forEach((grp, gi) => grp.forEach((id, ci) => {
      const d = k - mid;
      pos.set(id, { x: x0 + k * step + gi * gap, y: baseY + d * d * curve, r: d * Math.min(0.9, 14 / Math.max(n, 8)), z: 20 + k, gi, ci, k });
      k++;
    }));
    return { pos, step };
  }

  function layout(ev, quick) {
    if (!S || !S.handFlat) return;
    pass++; sizes();
    const n = S.players.length, mySeat = me(), hand = byId();
    S.seenMe = S.players[mySeat].seen;
    const dealing = !!(ev && ev.k === 'deal' && !reduceMotion()), instant = (firstRender && !dealing) || reduceMotion();
    if (dealing && !dealUntil) dealUntil = Date.now() + ((20 * n + (n - 1)) * DEAL_GAP + FLIGHT + 200);
    // ---- table geometry
    const opps = []; for (let k = 1; k < n; k++) opps.push((mySeat + k) % n);
    const backsY = 40 + ch * 0.55 + 10, rowH = ch * 0.34;
    const anyShown = opps.some((s) => S.players[s].shown.length);
    const podsBottom = backsY + rowH / 2 + (anyShown ? rowH + 4 : 0);
    const handTop = vh - ch - 12;
    const cy = Math.max(podsBottom + ch / 2 + 12, Math.min((podsBottom + handTop - 30) / 2, handTop - ch / 2 - 30));
    const g3 = cw * 0.35, x0 = vw / 2 - (cw * 3.2 + g3 * 2) / 2;
    geo = { cy, stock: { x: x0 + cw / 2, y: cy }, disc: { x: x0 + cw + g3 + cw / 2, y: cy }, maal: { x: x0 + 2 * cw + 2 * g3 + cw * 0.6, y: cy }, handTop };
    place($('#stockSlot'), geo.stock, cw, ch); place($('#discSlot'), geo.disc, cw, ch); place($('#maalSlot'), geo.maal, cw * 1.2, ch);
    const colX = (idx) => (vw * (idx + 1)) / (opps.length + 1);
    const oppX = {}; opps.forEach((s, i) => (oppX[s] = colX(i)));
    // ---- opponents' pods
    $('#pods').innerHTML = opps.map((s, i) => {
      const p = S.players[s];
      return `<div class="pod${S.turn === s && S.phase === 'play' ? ' turn' : ''}${p.online ? '' : ' off'}" data-seat="${s}" style="left:${oppX[s]}px"><span class="av" style="background:${PAL[s]}">${esc(p.name[0] || '?').toUpperCase()}</span><div><span class="n">${esc(p.name)}</span><small>${p.seen ? '<span class="seen">saw maal</span> · ' : ''}${p.total} pts${p.online ? '' : ' · offline'}</small></div></div>`;
    }).join('');
    // ---- opponents' hands (backs) + shown melds
    opps.forEach((s) => {
      const p = S.players[s], nb = Math.min(p.count, 10), fromStock = geo.stock;
      for (let k = 0; k < nb; k++) {
        const t = { x: oppX[s] + (k - (nb - 1) / 2) * cw * 0.1, y: backsY, r: (k - (nb - 1) / 2) * 2.2, s: 0.34, z: 30 + k };
        sprite('o' + s + '_' + k, null, t, { down: true, from: { ...fromStock, s: 0.34, r: 0 }, delay: dealing ? seatDelay(s, k, n) : 0, instant });
      }
      layoutMelds(p.shown, oppX[s], backsY + rowH + 6, 0.3, 'center', s, instant, geo.stock);
    });
    // ---- discard pile
    S.discard.forEach((c, i) => {
      const jx = ((c.id * 37) % 9 - 4) * 1.6, jr = ((c.id * 53) % 11 - 5) * 2.1;
      const fromSeat = ev && ev.k === 'discard' && ev.seat !== mySeat && i === S.discard.length - 1 ? ev.seat : null;
      const from = fromSeat !== null ? { x: oppX[fromSeat], y: backsY, s: 0.34, r: 0 } : undefined;
      const flipFrom = from ? { ...from } : undefined;
      sprite('c' + c.id, c, { x: geo.disc.x + jx, y: geo.disc.y + (i - S.discard.length) * 0, r: jr, s: 1, z: 5 + i }, { from: flipFrom, mk: mark(c), wild: !!mark(c) && S.seenMe, instant, down: false });
    });
    // ---- maal slot
    if (S.tiplu && S.seenMe || (S.tiplu && S.phase === 'over')) {
      sprite('c' + S.tiplu.id, S.tiplu, { x: geo.maal.x, y: geo.maal.y, r: 0, s: 1.0, z: 6 }, { from: { x: geo.maal.x, y: geo.maal.y, s: 1, r: 0 }, down: true, reveal: true, mk: 'tiplu', wild: true, instant });
    } else sprite('maalBack', null, { x: geo.maal.x, y: geo.maal.y, r: 0, s: 1, z: 6 }, { down: true, from: { ...geo.stock, s: 1 }, instant });
    $('#maalTxt').innerHTML = S.tiplu && (S.seenMe || S.phase === 'over') ? maalLegend(S.tiplu) : S.players[me()].pending ? 'Throw a card to see the maal' : 'Show 3 pure runs or tunnelas to see the maal';
    $('#maalLabel').textContent = S.tiplu && (S.seenMe || S.phase === 'over') ? 'Tiplu' : 'Maal ?';
    // ---- my shown melds
    layoutMelds(S.players[mySeat].shown, 16, geo.cy - ch * 0.12, 0.5, 'left', mySeat, instant, geo.stock, true);
    // ---- my hand
    const gs = drag && drag.moved && drag.tmp ? drag.tmp : groups;
    const { pos, step } = handPos(gs);
    geo.step = step;
    const lastId = S.last ? S.last.id : null;
    const dealtAt = new Map(S.handFlat.map((c, i) => [c.id, i]));
    pos.forEach((p, id) => {
      const c = hand.get(id); if (!c) return;
      const selected = sel.has(id), isNew = id === lastId && S.step === 'discard';
      const lift = selected ? ch * 0.3 : isNew ? ch * 0.12 : 0;
      const sp0 = sprites.get('c' + id);
      const spawn = dealing ? { ...geo.stock, s: 0.9, r: 0 } : ev && ev.k === 'drawStock' && ev.seat === mySeat && id === lastId ? { ...geo.stock, s: 1, r: 0 } : undefined;
      const delay = dealing ? seatDelay(mySeat, dealtAt.has(id) ? dealtAt.get(id) : p.k, n) : 0;
      const m = mark(c);
      sprite('c' + id, c, { x: p.x, y: p.y - lift, r: p.r, s: 1, z: p.z + (selected ? 300 : 0) }, { mine: true, sel: selected, fresh: isNew, mk: m, wild: !!m && (S.seenMe || c.s === 'J'), from: spawn, down: !!spawn && !sp0, reveal: !!spawn && !sp0, revealAfter: dealing ? FLIGHT : undefined, delay, instant });
    });
    drawLabels(gs, pos);
    // ---- retire sprites that left
    sprites.forEach((sp, key) => {
      if (sp.mark === pass) { sp.keep = false; return; }
      if (sp.keep) return;
      if (ev && ev.k === 'drawDiscard' && ev.seat !== mySeat && key[0] === 'c' && oppX[ev.seat] !== undefined) {
        sp.mark = pass; const t = { x: oppX[ev.seat], y: backsY, r: 0, s: 0.34, z: 40 }; setT(sp.el, t); sp.el.classList.add('down');
        setTimeout(() => { sp.el.remove(); sprites.delete(key); }, 650);
      } else if (drag && drag.id === sp.card?.id) { /* in hand of finger */ }
      else { sp.el.remove(); sprites.delete(key); }
    });
    if (dealing) setTimeout(() => sprites.forEach((s) => { s.el.style.transitionDelay = ''; if (s.el.firstChild) s.el.firstChild.style.transitionDelay = ''; }), (20 * n + (n - 1)) * DEAL_GAP + FLIGHT + 700);
    positionChrome();
  }
  function place(el, c, w, h) { el.style.left = c.x - w / 2 + 'px'; el.style.top = c.y - h / 2 + 'px'; el.style.width = w + 'px'; }

  function layoutMelds(melds, ax, y, scale, align, seat, instant, from, mine) {
    if (!melds.length) return;
    const k = melds.length > 3 ? scale * 0.62 : scale, w = cw * k, st = w * 0.42, gap = w * 0.35;
    const gw = (g) => w + (g.length - 1) * st;
    const total = melds.reduce((a, g) => a + gw(g), 0) + (melds.length - 1) * gap;
    let x = align === 'center' ? ax - total / 2 : ax;
    melds.forEach((g, gi) => {
      g.forEach((c, ci) => {
        const spawnFrom = mine ? undefined : { x: ax, y: y - cw * 0.5, s: 0.34, r: 0 };
        sprite('c' + c.id, c, { x: x + w / 2 + ci * st, y: y + ch * k / 2, r: 0, s: k, z: 15 + ci }, { from: spawnFrom, mk: mark(c), wild: !!mark(c) && S.seenMe, instant });
      });
      x += gw(g) + gap;
    });
  }
  function maalLegend(t) {
    const nx = t.r === 13 ? 1 : t.r + 1, pv = t.r === 1 ? 13 : t.r - 1, l = (r, s) => `<b style="color:${R.red(s) ? '#ff8f80' : '#fff'}">${R.RANK_LABEL[r]}${SUIT_CH[s]}</b>`;
    const same = SORT_SUITS.filter((s) => s !== t.s);
    return `poplu ${l(nx, t.s)} · jhiplu ${l(pv, t.s)}<br>alter ${l(t.r, same.find((s) => R.red(s) === R.red(t.s)))} · jokers ${same.filter((s) => R.red(s) !== R.red(t.s)).map((s) => l(t.r, s)).join(' ')}`;
  }

  function classifyGroup(ids) {
    const h = byId(); const cs = ids.map((i) => h.get(i));
    if (cs.length === 3) return R.classify(cs, S.seenMe ? S.tiplu : null);
    if (cs.length === 2 && R.isDublee(cs)) return { valid: true, kind: 'dublee', pure: false };
    return { valid: false };
  }
  function drawLabels(gs, pos) {
    let html = '';
    gs.forEach((g) => {
      const c = classifyGroup(g);
      if (!c.valid) return;
      const p = pos.get(g[0]); const lift = sel.has(g[0]) ? ch * 0.3 : 0;
      html += `<div class="gl${c.pure ? ' pure' : ''}" style="left:${p.x - cw / 2 + 2}px;top:${p.y - lift - ch / 2 - 3}px">${c.kind}</div>`;
    });
    $('#labels').innerHTML = html;
  }

  // ------------------------------------------------------------ chrome: banner, buttons, slots
  function myTurn() { return S.phase === 'play' && S.turn === me(); }
  let autoDecl = null;
  function shape() { // can the player declare?
    const k = S.players[me()].shown.length, h = byId();
    const all = [...S.handFlat, ...S.players[me()].shown.flat()];
    const dub = R.countDublees(all) >= S.opts.dubleeWin;
    const threes = groups.filter((g) => g.length === 3), singles = groups.filter((g) => g.length === 1);
    let melds = groups.length === threes.length + singles.length && threes.length === 7 - k && singles.length === 1;
    autoDecl = null;
    if (!melds) { // the hand wins even if it isn't laid out in groups: find the melds for him
      const ag = R.autoGroup(S.handFlat, S.tiplu || null);
      if (ag.melds.length === 7 - k && ag.rest.length === 1) { autoDecl = { groups: ag.melds.map((g) => g.map((c) => c.id)), discard: ag.rest[0].id }; melds = true; }
    }
    if (k && !S.seenMe) melds = false; // shown this turn: the maal (and the win) opens after the throw
    return { dub, melds };
  }
  function renderChrome() {
    if (!S || !S.handFlat) return;
    const turnName = S.players[S.turn].name;
    let b = '';
    const locked = Date.now() < dealUntil;
    if (S.phase === 'over') b = S.result && S.result.void ? 'Round void: stock ran out' : `${S.players[S.result.winner].name} won the round`;
    else if (locked) b = 'Dealing';
    else if (myTurn()) b = S.step === 'draw' ? 'Your turn: draw from the stock or the pile' : 'Now throw one card away';
    else b = `${turnName} is ${S.step === 'draw' ? 'drawing' : 'choosing a discard'}...`;
    const bn = $('#banner'); bn.textContent = b; bn.classList.toggle('me', myTurn());
    $('#gcode').textContent = S.code; $('#ground').textContent = 'Round ' + S.round + ' · you ' + S.players[me()].total + ' pts' + (S.seenMe ? ' · maal seen' : '');
    $('#stockCount').textContent = S.stock;
    $('#stockSlot').classList.toggle('can', !locked && myTurn() && S.step === 'draw');
    $('#discSlot').classList.toggle('can', !locked && myTurn() && S.step === 'draw' && S.discardCount > 0);
    // buttons
    const canDisc = !locked && myTurn() && S.step === 'discard';
    const selIds = [...sel].filter((i) => S.handFlat.some((c) => c.id === i));
    $('#aGroup').hidden = selIds.length < 2;
    $('#aSplit').hidden = !selIds.length || !groups.some((g) => g.length > 1 && g.some((i) => sel.has(i)));
    $('#aDiscard').hidden = !(canDisc && selIds.length === 1);
    const pureGroups = groups.filter((g) => g.length === 3 && classifyGroup(g).pure);
    const pairGroups = groups.filter((g) => g.length === 2 && classifyGroup(g).kind === 'dublee');
    const shownMe = (S.players[me()].shown || []).length > 0;
    const canShow = canDisc && !S.seenMe && !shownMe && pureGroups.length >= 3;
    const canShowDub = canDisc && !S.seenMe && !shownMe && S.opts.dubleeWin === 8 && pairGroups.length >= 7;
    $('#aShow').hidden = !(canShow || canShowDub); $('#aShow').textContent = canShow ? 'Show 3 melds' : 'Show 7 dublees';
    const sh = canDisc ? shape() : { dub: false, melds: false };
    $('#aDeclare').hidden = !(sh.dub || sh.melds);
    $('#aDeclare').textContent = sh.dub ? 'Declare dublee win' : 'Declare: I win';
    const valid = groups.filter((g) => classifyGroup(g).valid).length;
    $('#melds').textContent = (S.players[me()].shown.length + groups.filter((g) => g.length === 3 && classifyGroup(g).valid).length) + '/7 melds · ' + R.countDublees([...S.handFlat, ...S.players[me()].shown.flat()]) + ' dublee pairs';
    if (!S.seenMe && myTurn() && S.step === 'discard' && S.last && false) toast('');
  }
  function positionChrome() {
    $('#handbar').style.top = geo.cy - ch / 2 + 'px'; $('#handbar').style.bottom = 'auto'; $('#actions').style.top = geo.cy - ch / 2 + 'px';
    const mlt = $('#shownMe'); mlt.style.left = '0';
  }

  // buttons
  $('#stockSlot').onclick = () => { if ($('#stockSlot').classList.contains('can')) { send({ t: 'draw', from: 'stock' }); } };
  $('#discSlot').onclick = () => { if ($('#discSlot').classList.contains('can')) { send({ t: 'draw', from: 'discard' }); } };
  $('#aGroup').onclick = () => {
    const ids = groups.flat().filter((i) => sel.has(i)); if (ids.length < 2) return;
    const at = groups.findIndex((g) => g.some((i) => sel.has(i)));
    const rest = groups.map((g) => g.filter((i) => !sel.has(i)));
    const before = rest.slice(0, at).filter((g) => g.length).length;
    const out = rest.filter((g) => g.length); out.splice(before, 0, ids);
    groups = out; sel.clear(); Sfx.place(); pushArrange(); layout(null, true); renderChrome();
  };
  $('#aSplit').onclick = () => {
    groups = groups.flatMap((g) => (g.some((i) => sel.has(i)) ? g.map((i) => [i]) : [g])); sel.clear(); Sfx.pick(); pushArrange(); layout(null, true); renderChrome();
  };
  $('#aDiscard').onclick = () => { const id = [...sel][0]; doDiscard(id); };
  $('#aShow').onclick = () => {
    const pure = groups.filter((g) => g.length === 3 && classifyGroup(g).pure);
    if (pure.length >= 3) send({ t: 'show', groups: pure.sort((a, b) => (classifyGroup(b).kind === 'tunnela') - (classifyGroup(a).kind === 'tunnela')).slice(0, 3) });
    else send({ t: 'show', groups: groups.filter((g) => g.length === 2 && classifyGroup(g).kind === 'dublee').slice(0, 7) });
  };
  $('#aDeclare').onclick = () => {
    const sh = shape(); const h = byId();
    if (sh.melds && !sh.dub && autoDecl) { send({ t: 'declare', ...autoDecl }); }
    else if (sh.melds && !sh.dub) { const disc = groups.find((g) => g.length === 1)[0]; send({ t: 'declare', groups: groups.filter((g) => g.length === 3), discard: disc }); }
    else {
      const cnt = {}; S.handFlat.forEach((c) => (cnt[R.key(c)] = (cnt[R.key(c)] || 0) + 1));
      const spare = (S.handFlat.find((c) => cnt[R.key(c)] === 1) || S.handFlat[S.handFlat.length - 1]);
      send({ t: 'declare', groups: [], discard: sel.size === 1 ? [...sel][0] : spare.id });
    }
  };
  let discardSent = false; // one throw per turn, even on a fast double drag
  function doDiscard(id) {
    if (!canDiscard() || discardSent || id == null) return;
    discardSent = true;
    sel.delete(id); groups = groups.map((g) => g.filter((i) => i !== id)).filter((g) => g.length);
    Sfx.flick(); send({ t: 'discard', id });
    const sp = sprites.get('c' + id); if (sp) { sp.mark = -1; sp.keep = true; setT(sp.el, { x: geo.disc.x, y: geo.disc.y, r: 0, s: 1, z: 60 }); sp.el.classList.remove('mine'); }
    layout(null, true);
  }

  // ------------------------------------------------------------ pointer: tap to select, drag to reorder / discard
  cardsEl.addEventListener('pointerdown', (e) => {
    if (Date.now() < dealUntil) return;
    const el = e.target.closest('.card.mine'); if (!el || drag) return;
    Sfx.unlock();
    const id = +el.dataset.id, sp = sprites.get('c' + id);
    drag = { id, el, sx: e.clientX, sy: e.clientY, moved: false, lx: e.clientX, lt: performance.now(), vx: 0, base: sp.t, pid: e.pointerId };
    try { el.setPointerCapture(e.pointerId); } catch {}
  });
  window.addEventListener('pointermove', (e) => {
    if (!drag || e.pointerId !== drag.pid) return;
    const dx = e.clientX - drag.sx, dy = e.clientY - drag.sy;
    if (!drag.moved && Math.hypot(dx, dy) > 8) {
      drag.moved = true; drag.el.classList.add('drag'); Sfx.pick(); if (navigator.vibrate) navigator.vibrate(8);
      drag.without = groups.map((g) => g.filter((i) => i !== drag.id)).filter((g) => g.length);
      drag.pos = handPos(drag.without).pos;
    }
    if (!drag.moved) return;
    const now = performance.now(), dt = Math.max(1, now - drag.lt); drag.vx = drag.vx * 0.7 + ((e.clientX - drag.lx) / dt) * 0.3 * 16; drag.lx = e.clientX; drag.lt = now;
    const t = { x: drag.base.x + dx, y: drag.base.y + dy, r: Math.max(-18, Math.min(18, drag.vx * 2.2)), s: 1.12, z: 999 };
    setT(drag.el, t); drag.cur = t;
    const tmp = insertAt(drag.without, drag.id, t.x);
    const key = JSON.stringify(tmp);
    if (key !== drag.key) { drag.key = key; drag.tmp = tmp; layout(null, true); Sfx.tick(); }
    $('#discSlot').classList.toggle('can', canDiscard() && nearDisc(t));
  });
  const canDiscard = () => S && myTurn() && S.step === 'discard';
  const nearDisc = (t) => Math.hypot(t.x - geo.disc.x, t.y - geo.disc.y) < ch * 0.85;
  function endDrag(e) {
    if (!drag || (e && e.pointerId !== drag.pid)) return;
    const d = drag; drag = null; d.el.classList.remove('drag');
    if (!d.moved) { // tap
      if (sel.has(d.id)) sel.delete(d.id); else sel.add(d.id);
      Sfx.pick(); if (navigator.vibrate) navigator.vibrate(5); layout(null, true); renderChrome(); return;
    }
    if (canDiscard() && d.cur && nearDisc(d.cur)) { doDiscard(d.id); renderChrome(); return; }
    if (d.tmp) { groups = d.tmp; pushArrange(); }
    Sfx.place(); layout(null, true); renderChrome();
    $('#discSlot').classList.toggle('can', myTurn() && S.step === 'draw' && S.discardCount > 0);
  }
  window.addEventListener('pointerup', endDrag); window.addEventListener('pointercancel', endDrag);
  function insertAt(gs, id, px) {
    const pos = drag.pos, flat = []; const out = gs.map((g) => g.slice());
    gs.forEach((g, gi) => g.forEach((c, ci) => flat.push({ gi, ci, x: pos.get(c).x })));
    if (!flat.length) return [[id]];
    const stepW = Math.max(geo.step || 20, 14);
    if (px < flat[0].x - stepW * 0.9 && gs.length < 12) return [[id], ...out];
    if (px > flat[flat.length - 1].x + stepW * 0.9 && gs.length < 12) return [...out, [id]];
    const j = flat.findIndex((f) => f.x > px);
    if (j === -1) { out[out.length - 1].push(id); return out; }
    const nx = flat[j];
    if (j === 0) { out[0].unshift(id); return out; }
    const pv = flat[j - 1];
    if (pv.gi === nx.gi) out[nx.gi].splice(nx.ci, 0, id);
    else if (px - pv.x < nx.x - px) out[pv.gi].push(id); else out[nx.gi].unshift(id);
    return out;
  }

  // ------------------------------------------------------------ score sheet
  function renderTotals() {
    $('#sheetBody').innerHTML = `<div class="sheet"><h2>Scores</h2><table><tr><th>Player</th><th class="num">Total</th></tr>${S.players.map((p) => `<tr><td>${esc(p.name)}</td><td class="num">${p.total}</td></tr>`).join('')}</table><p><button class="btn" data-close2>Close</button></p></div>`;
    $('#sheet').hidden = false; $('[data-close2]').onclick = () => ($('#sheet').hidden = true);
  }
  function faces(cs) { return cs.map((c) => `<span style="display:inline-block;width:26px;height:36px;margin-right:-8px;filter:drop-shadow(0 1px 2px #000a)">${window.cardFace(c, null)}</span>`).join(''); }
  function renderSheet() {
    const r = S.result, w = r.winner, nm = (s) => esc(S.players[s].name);
    const rows = r.rows.map((x) => {
      const why = !x.seen ? '<span class="why">never saw the maal' + (x.seat !== w ? ': pays winner 10' : '') + '</span>' : x.lines.length ? x.lines.map((l) => `${l.label} <b>+${l.pts}</b>`).join(' · ') : '<span class="why">no maal</span>';
      const tot = x.total !== undefined ? x.total : S.players[x.seat].total;
      return `<tr class="${x.seat === w ? 'win' : ''}"><td><b>${x.seat === w ? '👑 ' : ''}${nm(x.seat)}</b>${x.seat === me() ? ' <span class="why">(you)</span>' : ''}<br><span class="why">${x.seen ? 'saw maal' : 'unseen'}${x.seat !== w && x.seen ? ' · pays winner 3' : ''}</span></td><td>${why}</td><td class="num">${x.score}</td><td class="num ${x.net > 0 ? 'pos' : x.net < 0 ? 'neg' : ''}">${x.net > 0 ? '+' : ''}${x.net}</td><td class="num">${tot}</td></tr>`;
    }).join('');
    const pays = r.transfers.length ? r.transfers.map((t) => `<span>${nm(t.from)} pays ${nm(t.to)} <b>${t.amt}</b></span>`).join('') : '<span>No payments</span>';
    const tip = r.tiplu ? `${R.RANK_LABEL[r.tiplu.r]}${SUIT_CH[r.tiplu.s]}` : '';
    const win = w >= 0 ? r.rows[w] : null;
    $('#sheetBody').innerHTML = `<div class="sheet"><p style="float:right;margin:0"><button class="btn gold" id="nextRound">Deal next round</button> <button class="btn" data-close2>Close</button></p><h2>${w >= 0 ? nm(w) + ' wins' + (r.dublee ? ' with dublees (+5 each)' : '') : 'Round void'}</h2><p class="hint">Tiplu was <b>${tip}</b> · scoring: tiplu 3/7, poplu & jhiplu 2/5/10, marriage 10/30, tunnela 5/10/20, alter 5, man 2; each pair of players pays the difference</p>` +
      (win ? `<div style="margin:4px 0 10px;white-space:nowrap;overflow:auto">${faces(win.shown.flat())}<span style="display:inline-block;width:16px"></span>${faces(win.hand.flat())}</div>` : '') +
      `<table><tr><th>Player</th><th>Maal points</th><th class="num">Pts</th><th class="num">Round</th><th class="num">Total</th></tr>${rows}</table><div class="pay">${pays}</div></div>`;
    $('#sheet').hidden = false; $('#nextRound').onclick = () => { send({ t: 'next' }); };
    $('[data-close2]').onclick = () => ($('#sheet').hidden = true);
  }

  // ------------------------------------------------------------ confetti (marigold petals)
  function confetti() {
    const cv = $('#confetti'), ctx = cv.getContext('2d'); cv.width = vw * devicePixelRatio; cv.height = vh * devicePixelRatio;
    const cols = ['#e9b44c', '#f6d58a', '#c8102e', '#ff8f3a', '#fbf5e6'], ps = Array.from({ length: 140 }, () => ({ x: Math.random() * vw, y: -20 - Math.random() * vh * 0.6, vx: (Math.random() - 0.5) * 3, vy: 2 + Math.random() * 4, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.3, w: 5 + Math.random() * 7, c: cols[(Math.random() * cols.length) | 0] }));
    let t0 = performance.now();
    (function f(now) {
      ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); ctx.clearRect(0, 0, vw, vh);
      ps.forEach((p) => { p.x += p.vx; p.y += p.vy; p.r += p.vr; ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r); ctx.fillStyle = p.c; ctx.beginPath(); ctx.ellipse(0, 0, p.w, p.w * 0.5, 0, 0, 7); ctx.fill(); ctx.restore(); });
      if (now - t0 < 3800 && !matchMedia('(prefers-reduced-motion: reduce)').matches) requestAnimationFrame(f); else ctx.clearRect(0, 0, vw, vh);
    })(t0);
  }

  addEventListener('resize', () => { if (S && S.gameType==='marriage' && S.phase !== 'lobby') { layout(null, true); renderChrome(); } });
  window.__mg = { get S() { return S; }, get groups() { return groups; }, sprites };
  show('lobby'); connect();
})();
