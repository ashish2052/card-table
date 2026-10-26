// SVG card faces generated in code (no external art). viewBox 250x350.
(function () {
  const R = window.Rules;
  const COL = { red: '#c4281c', ink: '#1d1c26' };
  const SYM = {
    S: '<path d="M50 6C22 38 8 52 14 68c5 14 26 12 32 0-1 14-6 22-14 26h36c-8-4-13-12-14-26 6 12 27 14 32 0 6-16-8-30-36-62z"/>',
    H: '<path d="M50 90C10 60 6 32 24 20c14-9 26 2 26 12 0-10 12-21 26-12 18 12 14 40-26 70z"/>',
    D: '<path d="M50 4 90 50 50 96 10 50z"/>',
    C: '<circle cx="50" cy="30" r="21"/><circle cx="27" cy="62" r="21"/><circle cx="73" cy="62" r="21"/><path d="M43 58 38 96h24l-5-38z"/>',
  };
  window.CARD_DEFS = '<svg width="0" height="0" style="position:absolute"><defs>' +
    Object.entries(SYM).map(([k, v]) => `<symbol id="s${k}" viewBox="0 0 100 100">${v}</symbol>`).join('') +
    '<pattern id="dhaka" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M13 0l13 13-13 13L0 13z" fill="none" stroke="#e9b44c" stroke-width="1.6"/><circle cx="13" cy="13" r="2.4" fill="#e9b44c"/></pattern>' +
    '</defs></svg>';

  const PIPX = [95, 155, 125];
  const LAY = {
    1: [[2, 175, 1.9]], 2: [[2, 88], [2, 262]], 3: [[2, 88], [2, 175], [2, 262]],
    4: [[0, 88], [1, 88], [0, 262], [1, 262]], 5: [[0, 88], [1, 88], [2, 175], [0, 262], [1, 262]],
    6: [[0, 88], [1, 88], [0, 175], [1, 175], [0, 262], [1, 262]],
    7: [[0, 88], [1, 88], [2, 131], [0, 175], [1, 175], [0, 262], [1, 262]],
    8: [[0, 88], [1, 88], [2, 131], [0, 175], [1, 175], [2, 219], [0, 262], [1, 262]],
    9: [[0, 88], [1, 88], [0, 146], [1, 146], [2, 175], [0, 204], [1, 204], [0, 262], [1, 262]],
    10: [[0, 88], [1, 88], [2, 117], [0, 146], [1, 146], [0, 204], [1, 204], [2, 233], [0, 262], [1, 262]],
  };
  const use = (s, x, y, w, flip, color) =>
    `<use href="#s${s}" x="${x - w / 2}" y="${y - w / 2}" width="${w}" height="${w}" fill="${color}"` +
    (flip ? ` transform="rotate(180 ${x} ${y})"` : '') + '/>';

  const BADGE = { tiplu: ['T', '#e9b44c'], poplu: ['P', '#f2d27a'], jhiplu: ['Jh', '#f2d27a'], alter: ['A', '#9bd3c3'], joker: ['J', '#b9a6e8'], man: ['M', '#e9b44c'] };

  function face(c, mk) {
    let body;
    if (c.s === 'J') {
      body = `<rect x="8" y="8" width="234" height="334" rx="20" fill="#fbf5e6" stroke="#cdbf9c" stroke-width="3"/>` +
        `<rect x="22" y="22" width="206" height="306" rx="12" fill="#2a1d4d"/>` +
        `<path d="M125 70l15 48 50 1-40 30 15 49-40-29-40 29 15-49-40-30 50-1z" fill="#e9b44c"/>` +
        `<circle cx="125" cy="130" r="9" fill="#2a1d4d"/>` +
        `<text x="125" y="250" text-anchor="middle" font-family="Fraunces,Georgia,serif" font-weight="800" font-size="52" fill="#fbf5e6" letter-spacing="3">MAN</text>` +
        `<text x="125" y="288" text-anchor="middle" font-family="Inter,sans-serif" font-weight="600" font-size="20" fill="#e9b44c" letter-spacing="6">JOKER</text>`;
    } else {
      const col = R.red(c.s) ? COL.red : COL.ink, lab = R.RANK_LABEL[c.r];
      body = `<rect x="8" y="8" width="234" height="334" rx="20" fill="#fbf5e6" stroke="#cdbf9c" stroke-width="3"/>`;
      const idx = (rot) => `<g ${rot ? 'transform="rotate(180 125 175)"' : ''}>` +
        `<text x="30" y="${lab.length > 1 ? 66 : 68}" text-anchor="middle" font-family="Fraunces,Georgia,serif" font-weight="800" font-size="${lab.length > 1 ? 50 : 60}" fill="${col}" letter-spacing="${lab.length > 1 ? -4 : 0}">${lab}</text>` +
        use(c.s, 30, 98, 34, false, col) + '</g>';
      if (c.r >= 11) {
        const ch = lab;
        body += `<rect x="58" y="44" width="134" height="262" rx="10" fill="${R.red(c.s) ? '#f6e0d6' : '#e3e2ea'}" stroke="${col}" stroke-width="3"/>` +
          `<path d="M58 175L192 175" stroke="${col}" stroke-width="2" opacity=".35"/>` +
          `<g opacity=".95"><path d="M85 118l14 20 26-30 26 30 14-20-8 46H93z" fill="${col}"/><circle cx="85" cy="114" r="6" fill="#e9b44c"/><circle cx="125" cy="100" r="7" fill="#e9b44c"/><circle cx="165" cy="114" r="6" fill="#e9b44c"/></g>` +
          `<text x="125" y="232" text-anchor="middle" font-family="Fraunces,Georgia,serif" font-weight="800" font-size="84" fill="${col}">${ch}</text>` +
          use(c.s, 125, 270, 36, false, col) + use(c.s, 125, 80, 0, false, col);
      } else {
        const sz = c.r === 1 ? 110 : 44;
        body += (LAY[c.r] || []).map(([cx, y, big]) => use(c.s, PIPX[cx], y, big ? 110 : sz, y > 175 && c.r > 1, col)).join('');
      }
      body += idx(false) + idx(true);
    }
    const bd = mk && BADGE[mk] && c.s !== 'J' ? BADGE[mk] : null;
    const man = mk === 'man';
    const badge = (bd || man) ? (() => { const [t, f] = man ? BADGE.man : bd; return `<circle cx="30" cy="140" r="21" fill="#1d1c26" stroke="${f}" stroke-width="4"/><text x="30" y="149" text-anchor="middle" font-family="Inter,sans-serif" font-weight="800" font-size="${t.length > 1 ? 22 : 26}" fill="${f}">${t}</text>`; })() : '';
    return `<svg viewBox="0 0 250 350" xmlns="http://www.w3.org/2000/svg">${body}${bd ? badge : ''}</svg>`;
  }
  const cache = {};
  window.cardFace = (c, mk) => cache[c.r + c.s + (mk || '')] || (cache[c.r + c.s + (mk || '')] = face(c, mk));
  window.cardBackUri = 'url("data:image/svg+xml,' + encodeURIComponent('<svg viewBox="0 0 250 350" xmlns="http://www.w3.org/2000/svg"><defs><pattern id="d" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M13 0l13 13-13 13L0 13z" fill="none" stroke="#e9b44c" stroke-width="1.6"/><circle cx="13" cy="13" r="2.4" fill="#e9b44c"/></pattern></defs><rect x="8" y="8" width="234" height="334" rx="20" fill="#fbf5e6"/><rect x="18" y="18" width="214" height="314" rx="12" fill="#8c1420"/><rect x="18" y="18" width="214" height="314" rx="12" fill="url(#d)" opacity=".85"/><rect x="28" y="28" width="194" height="294" rx="8" fill="none" stroke="#e9b44c" stroke-width="3"/><circle cx="125" cy="175" r="34" fill="#8c1420" stroke="#e9b44c" stroke-width="4"/><text x="125" y="192" text-anchor="middle" font-family="Georgia,serif" font-weight="800" font-size="46" fill="#e9b44c">M</text></svg>') + '")';
})();
