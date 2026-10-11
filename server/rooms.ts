import { randomBytes, randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto';
import type { Server, Socket } from 'socket.io';
import { z } from 'zod';
import { chooseCard, legalCards, playCard, startGame } from '../lib/engine';
import type { Game, Message, Player, PublicRoom, RoomView } from '../lib/types';

type Session = {
  id: string;
  token: string;
  room?: string;
  socketId?: string;
  disconnectTimer?: ReturnType<typeof setTimeout>;
  lastSeen: number;
};
type Room = {
  code: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  isPrivate: boolean;
  passwordHash?: Buffer;
  salt: string;
  penalty: boolean;
  players: Player[];
  spectators: Map<string, string>;
  game?: Game;
  messages: Message[];
  round: number;
  lastLoser?: string;
  timer?: ReturnType<typeof setTimeout>;
  turnEndsAt: number;
  updatedAt: number;
};
const nameSchema = z.string().trim().min(1).max(24);
const identity = z.object({ name: nameSchema, avatar: z.number().int().min(0).max(7) });
const createSchema = identity.extend({
  nameRoom: z.string().trim().min(1).max(40),
  maxPlayers: z.number().int().min(3).max(8),
  isPrivate: z.boolean(),
  password: z.string().max(64).default(''),
  penalty: z.boolean(),
  practice: z.boolean().default(false),
});
const joinSchema = identity.extend({
  code: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z2-9]{6}$/),
  password: z.string().max(64).default(''),
  spectate: z.boolean().default(false),
});
const TURN_MS = 30_000;
const GRACE_MS = 60_000;

export function installRooms(
  io: Server,
  timing: { turnMs?: number; graceMs?: number; botMs?: number; resolutionMs?: number } = {},
) {
  const rooms = new Map<string, Room>();
  const sessions = new Map<string, Session>();
  const ipConnects = new Map<string, { count: number; reset: number }>();
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  const roomCode = () =>
    Array.from({ length: 6 }, () => alphabet[randomInt(alphabet.length)]).join('');
  const roster = (room: Room) => room.game?.players ?? room.players;
  const publicRooms = (): PublicRoom[] =>
    [...rooms.values()]
      .filter((r) => !r.isPrivate)
      .map((r) => ({
        code: r.code,
        name: r.name,
        count: roster(r).length,
        maxPlayers: r.maxPlayers,
        phase: r.game?.phase ?? 'lobby',
        hasPassword: !!r.passwordHash,
      }));
  const list = () => io.emit('rooms:list', publicRooms());
  const message = (r: Room, text: string) => {
    r.messages.push({ id: randomUUID(), name: 'Table', text, system: true });
    r.messages = r.messages.slice(-80);
  };
  function view(r: Room, id: string): RoomView {
    const g = r.game;
    const p = roster(r).find((p) => p.id === id);
    return {
      code: r.code,
      name: r.name,
      hostId: r.hostId,
      maxPlayers: r.maxPlayers,
      isPrivate: r.isPrivate,
      hasPassword: !!r.passwordHash,
      penalty: r.penalty,
      phase: g?.phase ?? 'lobby',
      round: r.round,
      players: roster(r).map(({ hand, ...p }) => ({ ...p, cardCount: hand.length })),
      spectatorCount: r.spectators.size,
      youId: id,
      spectating: !p,
      hand: p?.hand ?? [],
      legalCardIds: g ? legalCards(g, id).map((c) => c.id) : [],
      turnId: g?.turnId ?? null,
      turnEndsAt: r.turnEndsAt,
      trick: g?.trick ?? [],
      wasteCount: g?.waste.length ?? 0,
      firstMove: g?.firstMove ?? true,
      loserId: g?.loserId ?? null,
      escapeOrder: g?.escapeOrder ?? [],
      lastResolution: g?.lastResolution ?? null,
      messages: r.messages,
    };
  }
  function publish(r: Room) {
    r.updatedAt = Date.now();
    for (const s of sessions.values())
      if (s.room === r.code && s.socketId) io.to(s.socketId).emit('room:state', view(r, s.id));
  }
  function schedule(r: Room, delay = 0) {
    clearTimeout(r.timer);
    if (!r.game || r.game.phase !== 'playing') {
      r.turnEndsAt = 0;
      return;
    }
    const p = r.game.players.find((p) => p.id === r.game!.turnId)!;
    const duration = p.bot ? (timing.botMs ?? 1250) : (timing.turnMs ?? TURN_MS);
    r.turnEndsAt = Date.now() + duration + delay;
    r.timer = setTimeout(() => {
      if (!r.game || r.game.phase !== 'playing') return;
      if (!p.bot) message(r, `${p.name}'s timer ran out. A legal card was played automatically.`);
      move(r, p.id, chooseCard(r.game).id);
    }, duration + delay);
  }
  function move(r: Room, id: string, cardId: string) {
    if (!r.game) throw new Error('The round has not started.');
    const last = r.game.lastResolution?.id;
    playCard(r.game, id, cardId);
    const resolution = r.game.lastResolution;
    if (resolution && resolution.id !== last) {
      const winner = roster(r).find((p) => p.id === resolution.winnerId)!;
      if (resolution.type === 'pickup')
        message(r, `${winner.name} picks up ${resolution.plays.length} cards. Plot twist!`);
      resolution.escaped.forEach((id) =>
        message(r, `${roster(r).find((p) => p.id === id)!.name} got away!`),
      );
    }
    if (r.game.phase === 'finished') {
      r.lastLoser = r.game.loserId ?? undefined;
      message(
        r,
        r.lastLoser
          ? `${roster(r).find((p) => p.id === r.lastLoser)!.name} is the last one in. Time for a rematch?`
          : 'Everyone got away. A perfect escape!',
      );
      list();
    }
    schedule(r, resolution?.id !== last ? (timing.resolutionMs ?? 1000) : 0);
    publish(r);
  }
  function reassignHost(r: Room) {
    const humans = roster(r).filter((p) => !p.bot);
    if (!humans.some((p) => p.id === r.hostId))
      r.hostId = humans.find((p) => p.connected)?.id ?? humans[0]?.id ?? '';
  }
  function leave(s: Session, explicit: boolean) {
    const r = rooms.get(s.room ?? '');
    s.room = undefined;
    if (!r) return;
    r.spectators.delete(s.id);
    const player = roster(r).find((p) => p.id === s.id);
    if (player) {
      if (r.game?.phase === 'playing') {
        player.bot = true;
        player.connected = false;
        player.name = `${player.name.slice(0, 17)} · bot`;
      } else {
        r.players = roster(r).filter((p) => p.id !== s.id);
        if (r.game) r.game.players = r.players;
      }
      message(
        r,
        `${player.name.replace(' · bot', '')} ${explicit ? 'left the table' : 'did not reconnect'}.`,
      );
    }
    reassignHost(r);
    if (!roster(r).some((p) => !p.bot) && r.spectators.size === 0) {
      clearTimeout(r.timer);
      rooms.delete(r.code);
    } else {
      if (r.game?.turnId === s.id) schedule(r);
      publish(r);
    }
    list();
  }
  const cleanup = setInterval(() => {
    const now = Date.now();
    for (const [token, s] of sessions)
      if (!s.socketId && !s.room && now - s.lastSeen > 120_000) sessions.delete(token);
    for (const [ip, value] of ipConnects) if (value.reset < now) ipConnects.delete(ip);
    for (const r of rooms.values())
      if (now - r.updatedAt > 6 * 60 * 60_000) {
        clearTimeout(r.timer);
        rooms.delete(r.code);
        for (const s of sessions.values())
          if (s.room === r.code) {
            s.room = undefined;
            if (s.socketId)
              io.to(s.socketId).emit('room:closed', 'This inactive table has closed.');
          }
        list();
      }
  }, 60_000);
  cleanup.unref();
  io.use((socket, next) => {
    const key = socket.handshake.address;
    const entry = ipConnects.get(key);
    if (!entry || entry.reset < Date.now())
      ipConnects.set(key, { count: 1, reset: Date.now() + 60_000 });
    else if (++entry.count > 120)
      return next(new Error('Too many connections. Try again in a minute.'));
    next();
  });
  io.on('connection', (socket: Socket) => {
    const token =
      typeof socket.handshake.auth.token === 'string' ? socket.handshake.auth.token : '';
    let session = sessions.get(token);
    if (!session) {
      session = { token: randomBytes(32).toString('hex'), id: randomUUID(), lastSeen: Date.now() };
      sessions.set(session.token, session);
    }
    const s = session;
    clearTimeout(s.disconnectTimer);
    if (s.socketId && s.socketId !== socket.id)
      io.sockets.sockets.get(s.socketId)?.disconnect(true);
    clearTimeout(s.disconnectTimer);
    s.socketId = socket.id;
    s.lastSeen = Date.now();
    socket.emit('session', { token: s.token, id: s.id });
    socket.emit('rooms:list', publicRooms());
    const existing = rooms.get(s.room ?? '');
    if (existing) {
      const p = roster(existing).find((p) => p.id === s.id);
      if (p) p.connected = true;
      publish(existing);
    }
    let events = 0;
    let resetAt = Date.now() + 10_000;
    let lastChat = 0;
    function on<T>(event: string, schema: z.ZodType<T>, action: (data: T) => unknown) {
      socket.on(event, (payload: unknown, ack?: (result: unknown) => void) => {
        if (typeof ack !== 'function') return;
        try {
          if (s.socketId !== socket.id)
            throw new Error('This session moved to another connection.');
          if (Date.now() > resetAt) {
            events = 0;
            resetAt = Date.now() + 10_000;
          }
          if (++events > 45) throw new Error('A little slower! Try again in a moment.');
          const parsed = schema.safeParse(payload);
          if (!parsed.success) throw new Error('Please check the details and try again.');
          const data = action(parsed.data);
          ack({ ok: true, data });
        } catch (e) {
          ack({ ok: false, error: e instanceof Error ? e.message : 'Something went wrong.' });
        }
      });
    }
    const current = () => {
      const r = rooms.get(s.room ?? '');
      if (!r) throw new Error('Join a table first.');
      return r;
    };
    const requireHost = (r: Room) => {
      if (r.hostId !== s.id) throw new Error('Only the host can do that.');
    };
    on('room:create', createSchema, (d) => {
      if (s.room) throw new Error('Leave your current table first.');
      if (rooms.size >= Number(process.env.MAX_ROOMS ?? 500))
        throw new Error('The club is full. Try again soon.');
      let code = roomCode();
      while (rooms.has(code)) code = roomCode();
      const salt = randomBytes(16).toString('hex');
      const p: Player = {
        id: s.id,
        name: d.name,
        avatar: d.avatar,
        ready: false,
        connected: true,
        bot: false,
        hand: [],
        escaped: false,
      };
      const r: Room = {
        code,
        name: d.nameRoom,
        hostId: s.id,
        maxPlayers: d.maxPlayers,
        isPrivate: d.isPrivate || d.practice,
        passwordHash: d.password ? scryptSync(d.password, salt, 32) : undefined,
        salt,
        penalty: d.penalty,
        players: [p],
        spectators: new Map(),
        messages: [],
        round: 0,
        turnEndsAt: 0,
        updatedAt: Date.now(),
      };
      rooms.set(code, r);
      s.room = code;
      message(r, `${d.name} opened the table.`);
      if (d.practice) {
        ['Yazhi', 'Kavin', 'Nila']
          .slice(0, d.maxPlayers - 1)
          .forEach((name, i) =>
            r.players.push({ ...p, id: randomUUID(), name, avatar: i + 1, ready: true, bot: true }),
          );
        r.game = startGame(r.players);
        r.round = 1;
        schedule(r);
      }
      publish(r);
      list();
      return { code };
    });
    on('room:join', joinSchema, (d) => {
      if (s.room) throw new Error('Leave your current table first.');
      const r = rooms.get(d.code);
      if (!r) throw new Error('That table was not found. Check the six-character code.');
      if (r.passwordHash && !timingSafeEqual(r.passwordHash, scryptSync(d.password, r.salt, 32)))
        throw new Error('That password does not match.');
      if (d.spectate) {
        if (r.spectators.size >= 32) throw new Error('The spectator seats are full.');
        r.spectators.set(s.id, d.name);
      } else {
        if (r.game) throw new Error('This round has started. Join as a spectator.');
        if (r.players.length >= r.maxPlayers)
          throw new Error('This table is full. You can spectate.');
        r.players.push({
          id: s.id,
          name: d.name,
          avatar: d.avatar,
          ready: false,
          connected: true,
          bot: false,
          hand: [],
          escaped: false,
        });
      }
      s.room = r.code;
      message(r, `${d.name} joined${d.spectate ? ' to watch' : ' the table'}.`);
      publish(r);
      list();
      return { code: r.code };
    });
    on('room:ready', z.boolean(), (ready) => {
      const r = current();
      if (r.game) throw new Error('A round is already underway.');
      const p = r.players.find((p) => p.id === s.id);
      if (!p) throw new Error('Spectators cannot ready up.');
      p.ready = ready;
      publish(r);
    });
    on('game:start', z.object({}), () => {
      const r = current();
      requireHost(r);
      if (r.game) throw new Error('The round has already started.');
      if (r.players.length < 3 || !r.players.every((p) => p.ready && p.connected))
        throw new Error(
          'At least three players are needed, and everyone at the table must be ready.',
        );
      r.game = startGame(r.players, r.penalty ? r.lastLoser : undefined);
      r.round++;
      schedule(r);
      message(r, 'Cards dealt. The Ace of Spades opens the round.');
      publish(r);
      list();
    });
    on('game:play', z.object({ cardId: z.string().max(16) }), (d) => {
      const r = current();
      move(r, s.id, d.cardId);
    });
    on('game:rematch', z.object({}), () => {
      const r = current();
      requireHost(r);
      if (r.game?.phase !== 'finished') throw new Error('Finish this round first.');
      r.players = r.game.players
        .filter((p) => !p.bot || p.connected)
        .map((p) => ({ ...p, hand: [], escaped: false, ready: p.bot }));
      r.game = undefined;
      message(r, 'A fresh start. Ready up for the next round!');
      publish(r);
      list();
    });
    on('chat:send', z.string().trim().min(1).max(280), (text) => {
      const r = current();
      if (Date.now() - lastChat < 800) throw new Error('Give the chat a second.');
      lastChat = Date.now();
      const name = roster(r).find((p) => p.id === s.id)?.name ?? r.spectators.get(s.id)!;
      r.messages.push({ id: randomUUID(), name, text });
      r.messages = r.messages.slice(-80);
      publish(r);
    });
    on('room:leave', z.object({}), () => {
      leave(s, true);
      socket.emit('room:left');
    });
    socket.on('disconnect', () => {
      if (s.socketId !== socket.id) return;
      s.socketId = undefined;
      s.lastSeen = Date.now();
      const r = rooms.get(s.room ?? '');
      if (r) {
        const p = roster(r).find((p) => p.id === s.id);
        if (p) {
          p.connected = false;
          if (!r.game) p.ready = false;
        }
        publish(r);
      }
      s.disconnectTimer = setTimeout(() => leave(s, false), timing.graceMs ?? GRACE_MS);
    });
  });
  return {
    rooms,
    close: () => {
      clearInterval(cleanup);
      for (const r of rooms.values()) clearTimeout(r.timer);
      for (const s of sessions.values()) clearTimeout(s.disconnectTimer);
    },
  };
}
