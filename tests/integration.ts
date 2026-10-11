/** Run against a running dev/production server: npm run test:integration */
import assert from 'node:assert/strict';
import { io, type Socket } from 'socket.io-client';
import type { Reply, RoomView, PublicRoom } from '../lib/types';
const origin = process.env.TEST_ORIGIN ?? 'http://localhost:3000';
const clients: Socket[] = [];
const states = new Map<Socket, RoomView>();
const tokens = new Map<Socket, string>();
const lists = new Map<Socket, PublicRoom[]>();
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate: () => boolean, message: string, timeout = 5000) {
  const end = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > end) throw new Error(message);
    await wait(30);
  }
}
async function client(token?: string) {
  const s = io(origin, {
    auth: { token },
    forceNew: true,
    autoConnect: false,
    reconnection: false,
  });
  clients.push(s);
  s.on('room:state', (state) => states.set(s, state));
  s.on('rooms:list', (rooms) => lists.set(s, rooms));
  s.on('session', (session) => tokens.set(s, session.token));
  s.connect();
  await until(() => s.connected && tokens.has(s), 'Client did not connect');
  return s;
}
async function send<T>(s: Socket, event: string, payload: unknown, expected = true) {
  const res = (await s.timeout(5000).emitWithAck(event, payload)) as Reply<T>;
  assert.equal(res.ok, expected, JSON.stringify(res));
  return res.ok ? res.data : undefined;
}
async function run() {
  const host = await client();
  const p2 = await client();
  const p3 = await client();
  const spectator = await client();
  const created = await send<{ code: string }>(host, 'room:create', {
    name: 'Host',
    avatar: 0,
    nameRoom: 'Integration test',
    maxPlayers: 3,
    isPrivate: true,
    password: 'table-pass',
    penalty: true,
  });
  const code = created!.code;
  assert.match(code, /^[A-Z2-9]{6}$/);
  assert.ok(!lists.get(p2)?.some((r) => r.code === code), 'Private table must not be listed');
  await send(p2, 'room:join', { name: 'Yazhi', avatar: 1, code, password: 'wrong' }, false);
  await send(p2, 'room:join', { name: 'Yazhi', avatar: 1, code, password: 'table-pass' });
  await send(p3, 'room:join', { name: 'Kavin', avatar: 2, code, password: 'table-pass' });
  await send(
    spectator,
    'room:join',
    { name: 'Watcher', avatar: 3, code, password: 'table-pass' },
    false,
  );
  await send(spectator, 'room:join', {
    name: 'Watcher',
    avatar: 3,
    code,
    password: 'table-pass',
    spectate: true,
  });
  await send(host, 'game:start', {}, false);
  await send(spectator, 'room:ready', true, false);
  for (const s of [host, p2, p3]) await send(s, 'room:ready', true);
  await send(p2, 'game:start', {}, false);
  await send(host, 'game:start', {});
  await until(
    () => [host, p2, p3, spectator].every((s) => states.get(s)?.phase === 'playing'),
    'Game start did not synchronize to every client',
  );
  for (const s of [host, p2, p3]) {
    const view = states.get(s)!;
    assert.ok(view.hand.length >= 17);
    assert.ok(view.players.every((p) => !('hand' in p)));
  }
  assert.equal(states.get(spectator)!.hand.length, 0);
  assert.equal(states.get(spectator)!.legalCardIds.length, 0);
  assert.equal([host, p2, p3].flatMap((s) => states.get(s)!.hand).length, 52);
  const opener = [host, p2, p3].find((s) => states.get(s)!.legalCardIds.includes('spades-14'))!;
  await send(spectator, 'game:play', { cardId: 'spades-14' }, false);
  const before = states.get(opener)!.hand.length;
  await send(opener, 'game:play', { cardId: 'spades-14' });
  await until(
    () => [host, p2, p3, spectator].every((s) => states.get(s)?.trick.length === 1),
    'Opening play did not synchronize to every client',
  );
  assert.equal(states.get(opener)!.hand.length, before - 1);
  await send(opener, 'game:play', { cardId: 'spades-14' }, false);
  await send(spectator, 'chat:send', 'Hello from the sidelines!');
  await until(
    () => !!states.get(host)?.messages.some((m) => m.text === 'Hello from the sidelines!'),
    'Chat did not synchronize',
  );
  const oldView = states.get(p2)!;
  const token = tokens.get(p2)!;
  p2.disconnect();
  await until(
    () => !states.get(host)?.players.find((p) => p.id === oldView.youId)?.connected,
    'Disconnection not broadcast',
  );
  const reconnected = await client(token);
  await until(() => states.get(reconnected)?.youId === oldView.youId, 'Identity was not restored');
  assert.deepEqual(states.get(reconnected)!.hand, oldView.hand);
  assert.equal(states.get(reconnected)!.code, code);
  await send(host, 'room:leave', {});
  await until(() => states.get(reconnected)?.hostId === oldView.youId, 'Host was not transferred');
  assert.ok(states.get(reconnected)!.players.find((p) => p.name === 'Host · bot')?.bot);
  for (const s of [reconnected, p3, spectator]) await send(s, 'room:leave', {});
  const outsider = await client();
  await send(
    outsider,
    'room:join',
    { name: 'Late', avatar: 0, code, password: 'table-pass', spectate: true },
    false,
  );
  console.log(
    'PASS: protected rooms, capacity, ready/host permissions, private hands, spectator restrictions, legal moves, chat, token reconnection, host transfer, bot takeover, and cleanup.',
  );
}
run()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => clients.forEach((s) => s.disconnect()));
