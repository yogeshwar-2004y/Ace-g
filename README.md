# Getaway — The Card Club

A complete, self-hostable real-time card game for 3–8 players. Next.js App Router + TypeScript, Socket.io, Zustand, Framer Motion, and Tailwind CSS. One Node HTTP server serves both the web app and game connections.

The interface uses English, with Tamil footer copy and optional Tamil end-of-round teasing. No Hindi game names or terminology are used. All card art is local CSS/SVG; avatars are emoji and audio is synthesized locally with Web Audio. There are no external image, font, music, or account dependencies.

## Run locally

Requires Node 22 or newer.

```sh
npm ci
npm run dev
```

Open http://localhost:3000. Choose **Play a practice round** for a private four-seat game against three bots. To test friends on the same machine, use separate browser tabs with independent sessions. Session credentials are kept in `sessionStorage`, so a reload restores your seat. Some browsers copy sessionStorage when duplicating a tab; open a fresh tab or use another browser/private window for a different player.

For another device on your network, bind to `0.0.0.0` (the default) and set `APP_ORIGIN` to the exact URL everyone uses, such as `http://192.168.1.10:3000`. All players must reach the same server. Localhost itself is not a shareable Internet address.

## Features

- Cryptographically shuffled deck; six-character cryptographically random room codes.
- Public and private rooms, optional salted/hashed passwords, selectable capacity, avatars and ready states.
- Live public table directory, room chat, spectators, rematches and bot practice.
- Only the server may shuffle, deal, advance turns, resolve tricks or declare a loser.
- Each player gets a personalized state: only their own cards plus public hand counts. Spectators never receive hands or legal-move information.
- Automatic legal move after a 30-second turn timer, plus a brief resolution animation allowance.
- 60-second reconnection grace using a server-issued random bearer token. The hand and seat survive reconnects during this window.
- An explicitly departing player, or one whose grace expires, is replaced by a bot during a live round. In the lobby they are removed. Hosting transfers to another human player.
- Card dealing, play/pickup motion, escape particles, glowing turn ring, fanned hand, touch selection and upward drag.
- Synthesized sound effects and optional ambient music after the first user gesture.
- Forest/midnight themes, three card backs, persistent sound/music preferences, English/Tamil teasing.
- Keyboard-friendly controls, labeled cards, focus-trapped settings/forms, reduced-motion support, responsive phone/tablet/desktop layouts.

## Rules and explicit edge cases

1. Deal all 52 cards as evenly as possible. Aces are high. The Ace of Spades must be the first lead. Turns proceed clockwise through the seated order.
2. Follow the led suit whenever possible. If unable, play any card. This immediately ends the trick; the player with the highest card **of the original suit** collects every card played in that trick and leads next.
3. If everyone follows suit, discard the trick. Its highest card wins the lead.
4. Empty hands are confirmed **after trick resolution**. A player who just played their last card must still collect a pickup if their card is the highest of the led suit. Confirming escape sooner would contradict the pickup rule.
5. If a clean-trick winner has escaped, the next remaining player clockwise leads.
6. Last player holding cards loses. If all remaining players empty their hands on the same clean trick, the round is a draw with no loser.
7. Optional extra-card rule: next round, deal normally, then transfer one card from another player's largest hand to the previous loser. There are still exactly 52 cards. The rule has no effect if the previous loser left the room.
8. All seated players must be ready and connected to start, with at least three players. Spectators do not count. Rematch returns to the lobby to let everyone ready up again.

Keyboard: Tab through cards, Enter/Space to select, use the **Play card** button, or press Arrow Up on a playable card. Pointer: select then play, double-click, or drag a legal card upward. Muted cards cannot be played; the server also rejects illegal actions.

## Project layout

```text
app/                    App Router entry, metadata, global responsive styles
components/
  Getaway.tsx           Shell, connection lifecycle, navigation, dialogs
  Home.tsx              Landing, public tables, practice, rules
  RoomForms.tsx         Create/join forms, profile choices, room-code copy
  Lobby.tsx             Ready states, seat grid, host controls
  GameTable.tsx         Table, trick animation, hand, timer, round result
  Card.tsx              Code-native card faces, patterned backs, touch drag
  Chat.tsx              Live chat
  Settings.tsx          Audio, theme, language, card-back preferences
  Dialog.tsx            Focus trapping, Escape handling, focus restoration
lib/
  types.ts              Shared card, game, player and wire-view types
  engine.ts             Rules, shuffling, dealing, legal actions, bot selection
  store.ts              Zustand preferences and Socket.io client
  audio.ts              Original Web Audio cues and ambient chords
server/
  index.ts              Unified Next.js / Socket.io HTTP server
  rooms.ts              Sessions, authorization, rooms, timers, chat, cleanup
tests/
  engine.test.ts        Rule cases and 300 full-game invariant simulations
  integration.ts        Real socket clients against a running server
Dockerfile              Single-service deployment
```

## Socket protocol

Commands accept a payload and an acknowledgement: `{ ok: true, data? }` or `{ ok: false, error }`. Clients use an 8-second acknowledgement timeout. The server validates payloads with Zod and derives identity from the authenticated socket session; commands never accept an arbitrary acting-player ID.

| Direction        | Event          | Payload / purpose                                                                 |
| ---------------- | -------------- | --------------------------------------------------------------------------------- |
| Client handshake | `auth.token`   | Previously issued session token, if reconnecting                                  |
| Server → client  | `session`      | `{ token, id }` issued/restored session                                           |
| Server → all     | `rooms:list`   | Public room metadata only                                                         |
| Server → member  | `room:state`   | Personalized `RoomView`; no opponent hands                                        |
| Server → member  | `room:left`    | Clear local room state                                                            |
| Server → member  | `room:closed`  | Closure explanation for inactive table                                            |
| Client → server  | `room:create`  | `{ name, avatar, nameRoom, maxPlayers, isPrivate, password, penalty, practice? }` |
| Client → server  | `room:join`    | `{ name, avatar, code, password, spectate? }`                                     |
| Client → server  | `room:ready`   | Boolean                                                                           |
| Client → server  | `room:leave`   | `{}`                                                                              |
| Client → server  | `game:start`   | `{}`; host only                                                                   |
| Client → server  | `game:play`    | `{ cardId }`; current player, legal card only                                     |
| Client → server  | `game:rematch` | `{}`; host only, finished round only                                              |
| Client → server  | `chat:send`    | Trimmed text, 1–280 characters                                                    |

`lastResolution` includes a monotonic turn ID, played cards, pickup/discard outcome, next-lead winner and newly escaped players. Every client animates the same server result. `turnEndsAt` is server epoch time, so countdowns are synchronized. Socket.io preserves command order, but network latency may shift when animations begin on individual devices.

## Validation

```sh
npm run typecheck
npm test
npm run build
# In another terminal, while dev or production server is running:
npm run test:integration
# Isolated accelerated timer/rematch integration:
npm run test:timers
```

Engine tests cover uneven deals, Ace opening, illegal-action immutability, following suit, immediate pickups, last-card pickup, escape lead handoff, final loser/draw, extra-card rematch and card conservation across 300 complete games. Integration tests cover passwords, private-room discovery, capacity, readiness/host permissions, spectator privacy, legal play, chat, reconnection, host transfer, bot takeover and room cleanup. An isolated socket test uses accelerated timer parameters to run the production timer callbacks through a complete AFK round, rematch, penalty redeal and reconnection grace expiry.

## Production deployment

```sh
npm ci
npm run build
APP_ORIGIN=https://cards.example.com PORT=3000 npm start
```

Or deploy the included Dockerfile on a persistent Node/container host:

```sh
docker build -t getaway .
docker run --init -p 3000:3000 \
  -e APP_ORIGIN=https://cards.example.com \
  --restart unless-stopped getaway
```

Use TLS at the reverse proxy, forward WebSocket upgrades, and configure an idle timeout of at least 90 seconds. `/health` returns `{"status":"ok"}`. Set `APP_ORIGIN` to the exact public origin, without a trailing slash. `PORT` defaults to 3000, `HOSTNAME` to 0.0.0.0, and `MAX_ROOMS` to 500. Example environment settings are in `.env.example`; pass them through your process/container environment.

This custom persistent server follows the [Next.js custom-server model](https://nextjs.org/docs/app/guides/custom-server) and [Socket.io server configuration](https://socket.io/docs/v4/server-options/). Do not deploy it to a static-only host or a request-only serverless function.

### Operational scope

This release runs on **one server instance with in-memory rooms**. Restarting the server ends active games. It does not claim durable recovery, multi-instance room coordination, or verified Internet-scale load capacity. For multiple replicas, implement shared room/session persistence and distributed timer ownership plus a Socket.io adapter and sticky routing; an adapter alone does not share this application’s game state.

The server enforces bounded payloads, event/chat rate limits, password hashing, origin checks, spectator limits and room limits; text is rendered through React without HTML injection. Disconnected unseated sessions expire, empty rooms are deleted and stale rooms close. Put a production service behind proxy-level connection/IP rate limits. If a reverse proxy fronts the app, the built-in connection limit groups by the direct peer address; configure upstream limits appropriately instead of trusting arbitrary forwarded IP headers. Chat and room names are user-generated: add moderation/reporting and operational monitoring for a public deployment.

The Dockerfile is supplied for deployment but must be built and exercised in your target environment. No hosting account was provisioned and no public deployment was made.

## Deploy this repository to Render

This repository includes `render.yaml` for a single Docker web service on the free plan, in Singapore. Import it with **New → Blueprint** in the Render dashboard, connect `yogeshwar-2004y/Ace-g`, and deploy the `main` branch. The included Dockerfile performs the build and runs the persistent game server; `/health` is the health check.

Render supplies `PORT` and `RENDER_EXTERNAL_URL`. The server uses that generated HTTPS URL for Socket.io origin validation automatically. If you add a custom domain, set `APP_ORIGIN` to its exact HTTPS origin. The service binds to `0.0.0.0`.

Free services can sleep when idle; in-memory games are lost whenever the service sleeps, restarts or redeploys. Use a paid always-on service for regular play, and shared persistence before scaling beyond one instance. Choose the paid plan yourself in Render if needed; the supplied Blueprint creates no paid resources.

Deploy button: [Create the Render service](https://render.com/deploy?repo=https://github.com/yogeshwar-2004y/Ace-g).
