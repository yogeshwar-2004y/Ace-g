import { createServer } from 'node:http';
import { Server } from 'socket.io';
import { io as createClient, type Socket } from 'socket.io-client';
import assert from 'node:assert/strict';
import { installRooms } from '../server/rooms';
import type { Reply, RoomView } from '../lib/types';
const server = createServer();
const io = new Server(server);
// Production uses 30 seconds / 60 seconds. Inject short clocks at the same boundaries.
const manager = installRooms(io, { turnMs: 55, botMs: 12, graceMs: 150, resolutionMs: 5 });
const sockets: Socket[] = [];
const states = new Map<Socket, RoomView>();
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
async function until(predicate: () => boolean, explanation: string, timeout = 20000) {
  const end = Date.now() + timeout;
  while (!predicate()) {
    if (Date.now() > end) throw new Error(explanation);
    await pause(10);
  }
}
async function send(socket: Socket, event: string, data: unknown) {
  const reply = (await socket.timeout(3000).emitWithAck(event, data)) as Reply;
  if (!reply.ok) throw new Error(reply.error);
}
async function main() {
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Missing test port');
  const url = `http://127.0.0.1:${address.port}`;
  async function client() {
    const socket = createClient(url, { forceNew: true });
    sockets.push(socket);
    socket.on('room:state', (state) => states.set(socket, state));
    await until(() => socket.connected, 'Client did not connect');
    return socket;
  }
  const host = await client();
  await send(host, 'room:create', {
    name: 'AFK human',
    avatar: 0,
    nameRoom: 'Timed test',
    maxPlayers: 4,
    isPrivate: false,
    penalty: true,
    practice: true,
  });
  await until(() => states.get(host)?.phase === 'finished', 'AFK / bot game failed to complete');
  const finished = states.get(host)!;
  assert.ok(
    finished.messages.some((m) => m.text.includes('timer ran out')),
    'AFK timer must play a legal card',
  );
  assert.ok(finished.escapeOrder.length >= 3);
  const previousLoser = finished.loserId;
  await send(host, 'game:rematch', {});
  await until(() => states.get(host)?.phase === 'lobby', 'Rematch did not return to lobby');
  assert.equal(states.get(host)!.players.length, 4);
  assert.ok(
    states
      .get(host)!
      .players.filter((p) => p.bot)
      .every((p) => p.ready),
  );
  await send(host, 'room:ready', true);
  await send(host, 'game:start', {});
  const nextRound = states.get(host)!;
  assert.equal(nextRound.round, 2);
  if (previousLoser)
    assert.equal(
      nextRound.players.find((p) => p.id === previousLoser)!.cardCount,
      14,
      'Penalty card should carry into rematch',
    );
  const viewer = await client();
  await send(viewer, 'room:join', {
    name: 'Audience',
    avatar: 1,
    code: nextRound.code,
    password: '',
    spectate: true,
  });
  host.disconnect();
  await until(
    () => states.get(viewer)!.players.some((p) => p.name === 'AFK human · bot'),
    'Disconnect grace did not convert human to bot',
    3000,
  );
  assert.equal(states.get(viewer)!.hostId, '', 'A disconnected bot must not retain host privilege');
  await send(viewer, 'room:leave', {});
  assert.equal(manager.rooms.size, 0, 'Room must close when all humans and spectators leave');
  console.log(
    'PASS: real AFK timer callbacks, complete network round, rematch, penalty redeal, grace expiry, bot takeover and cleanup (accelerated clocks).',
  );
}
main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    sockets.forEach((s) => s.disconnect());
    manager.close();
    io.close();
    server.close();
  });
