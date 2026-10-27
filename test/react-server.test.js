// Server side of emoji reactions: only the fixed list, one per 2 s per player, broadcast to the room.
const WebSocket = require('ws'), assert = require('assert');
const { spawn } = require('child_process');
const srv = spawn(process.execPath, ['server.js'], { env: { ...process.env, PORT: '8853' }, stdio: 'ignore', windowsHide: true });
const open = () => new Promise((res) => { const w = new WebSocket('ws://127.0.0.1:8853'); w.msgs = []; w.on('message', (d) => w.msgs.push(JSON.parse(d))); w.on('open', () => res(w)); });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  await wait(800);
  const a = await open(), b = await open();
  a.send(JSON.stringify({ t: 'create', gameType: 'jhyap', name: 'A', opts: {} })); await wait(300);
  const code = a.msgs.find((m) => m.t === 'hello').code;
  b.send(JSON.stringify({ t: 'join', code, name: 'B' })); await wait(300);
  const rx = (w) => w.msgs.filter((m) => m.t === 'react');
  a.send(JSON.stringify({ t: 'react', e: 'x', to: 1 })); a.send(JSON.stringify({ t: 'react', e: '<script>', to: 1 })); await wait(200);
  assert.strictEqual(rx(b).length, 0, 'emoji outside the list must be dropped');
  a.send(JSON.stringify({ t: 'react', e: '\u{1F525}', to: 1 })); await wait(200);
  assert.strictEqual(rx(b).length, 1); assert.strictEqual(rx(a).length, 1, 'sender sees it too');
  assert.deepStrictEqual([rx(b)[0].from, rx(b)[0].to], [0, 1]);
  a.send(JSON.stringify({ t: 'react', e: '\u{1F525}', to: 1 })); await wait(200);
  assert.strictEqual(rx(b).length, 1, 'second within 2 s is rate limited');
  await wait(2000);
  a.send(JSON.stringify({ t: 'react', e: '\u{1F44F}', to: -1 })); await wait(200);
  assert.strictEqual(rx(b).length, 2, 'allowed again after 2 s'); assert.strictEqual(rx(b)[1].to, -1);
  a.send(JSON.stringify({ t: 'react', e: '\u{1F44F}', to: 99 })); b.send(JSON.stringify({ t: 'react', e: '\u{1F44F}', to: 99 })); await wait(200);
  assert.ok(rx(a).every((m) => m.to >= -1 && m.to < 2), 'bad target is folded to the table');
  console.log('react server checks passed'); srv.kill(); process.exit(0);
})().catch((e) => { console.error(e); srv.kill(); process.exit(1); });
