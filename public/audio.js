// All sounds are synthesised here with WebAudio (noise bursts + sine/triangle tones): no sample files, so no licences.
window.Sfx = (function () {
  let ctx = null, muted = localStorage.getItem('marriage.mute') === '1', master;
  function ensure() {
    if (muted) return null; // no AudioContext at all while muted (it also crashes headless test Chrome)
    if (!ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination); }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function noise(dur, f0, f1, gain, type, delay) {
    const c = ensure(); if (!c || muted) return;
    const t = c.currentTime + (delay || 0);
    const len = Math.max(1, Math.floor(c.sampleRate * dur)), buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const s = c.createBufferSource(); s.buffer = buf;
    const f = c.createBiquadFilter(); f.type = type || 'bandpass'; f.Q.value = 0.9;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t);
  }
  function tone(freq, dur, gain, type, delay, slide) {
    const c = ensure(); if (!c || muted) return;
    const t = c.currentTime + (delay || 0);
    const o = c.createOscillator(); o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(gain, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  return {
    unlock: ensure,
    get muted() { return muted; },
    toggle() { muted = !muted; if (!muted) ensure(); localStorage.setItem('marriage.mute', muted ? '1' : '0'); return muted; },
    deal(i) { noise(0.05, 5200 + (i % 5) * 300, 2400, 0.35, 'highpass'); },
    flick() { noise(0.14, 3200, 700, 0.5, 'bandpass'); },
    place() { noise(0.06, 1800, 600, 0.4, 'bandpass'); tone(150, 0.09, 0.35, 'sine', 0, 70); },
    tick() { tone(1250, 0.05, 0.12, 'triangle'); },
    pick() { tone(520, 0.07, 0.1, 'triangle'); },
    turn() { tone(660, 0.35, 0.16, 'sine'); tone(990, 0.4, 0.08, 'sine', 0.06); },
    show() { [523, 659, 784].forEach((f, i) => tone(f, 0.3, 0.14, 'triangle', i * 0.08)); },
    err() { tone(180, 0.18, 0.2, 'sawtooth', 0, 120); },
    win() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.55, 0.16, 'triangle', i * 0.11)); tone(262, 1.2, 0.12, 'sine', 0); },
  };
})();
