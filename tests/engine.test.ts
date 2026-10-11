import test from 'node:test';
import assert from 'node:assert/strict';
import { chooseCard, deck, legalCards, playCard, startGame } from '../lib/engine';
import type { Card, Game, Player, Suit } from '../lib/types';
const roster = (n: number): Player[] =>
  Array.from({ length: n }, (_, i) => ({
    id: `p${i}`,
    name: `Player ${i}`,
    avatar: i,
    ready: true,
    connected: true,
    bot: false,
    escaped: false,
    hand: [],
  }));
const c = (suit: Suit, rank: number): Card => ({ id: `${suit}-${rank}`, suit, rank });
const scenario = (hands: Card[][], turnId = 'p0'): Game => ({
  players: roster(hands.length).map((p, i) => ({ ...p, hand: hands[i] })),
  turnId,
  trick: [],
  participants: hands.map((_, i) => `p${i}`),
  waste: [],
  firstMove: false,
  phase: 'playing',
  loserId: null,
  escapeOrder: [],
  turnNumber: 0,
  lastResolution: null,
});

test('deals all 52 unique cards as evenly as possible for 3–8 players', () => {
  for (let n = 3; n <= 8; n++) {
    const game = startGame(roster(n));
    const cards = game.players.flatMap((p) => p.hand);
    assert.equal(cards.length, 52);
    assert.equal(new Set(cards.map((c) => c.id)).size, 52);
    const lengths = game.players.map((p) => p.hand.length);
    assert.ok(Math.max(...lengths) - Math.min(...lengths) <= 1);
    assert.deepEqual(
      legalCards(game, game.turnId).map((c) => c.id),
      ['spades-14'],
    );
  }
});
test('invalid move cannot mutate game, and only the Ace of Spades may open', () => {
  const g = startGame(roster(4), undefined, deck());
  const before = structuredClone(g);
  const other = g.players.find((p) => p.id !== g.turnId)!;
  assert.throws(() => playCard(g, other.id, other.hand[0].id));
  assert.throws(() =>
    playCard(
      g,
      g.turnId,
      g.players.find((p) => p.id === g.turnId)!.hand.find((c) => c.id !== 'spades-14')!.id,
    ),
  );
  assert.deepEqual(g, before);
  playCard(g, g.turnId, 'spades-14');
  assert.equal(g.firstMove, false);
});
test('following suit is mandatory even when holding a higher off-suit card', () => {
  const g = scenario([
    [c('spades', 5), c('hearts', 2)],
    [c('spades', 3), c('hearts', 14)],
    [c('spades', 8)],
  ]);
  playCard(g, 'p0', 'spades-5');
  assert.deepEqual(
    legalCards(g, 'p1').map((c) => c.id),
    ['spades-3'],
  );
  assert.throws(() => playCard(g, 'p1', 'hearts-14'));
});
test('off-suit ends immediately; highest ORIGINAL-suit player picks up all cards and leads', () => {
  const g = scenario([
    [c('spades', 7), c('hearts', 2)],
    [c('spades', 10), c('clubs', 2)],
    [c('hearts', 14)],
    [c('spades', 14)],
  ]);
  playCard(g, 'p0', 'spades-7');
  playCard(g, 'p1', 'spades-10');
  playCard(g, 'p2', 'hearts-14');
  assert.equal(g.turnId, 'p1');
  assert.equal(g.players[1].hand.length, 4);
  assert.equal(g.players[3].hand.length, 1);
  assert.equal(g.trick.length, 0);
  assert.equal(g.waste.length, 0);
  assert.deepEqual(g.escapeOrder, ['p2']);
});
test('highest last card is not allowed to escape before a pickup resolves', () => {
  const g = scenario([
    [c('spades', 14)],
    [c('spades', 2), c('hearts', 2)],
    [c('clubs', 3), c('clubs', 5)],
  ]);
  playCard(g, 'p0', 'spades-14');
  assert.equal(g.players[0].escaped, false);
  playCard(g, 'p1', 'spades-2');
  playCard(g, 'p2', 'clubs-3');
  assert.equal(g.players[0].hand.length, 3);
  assert.equal(g.players[0].escaped, false);
  assert.equal(g.turnId, 'p0');
});
test('clean trick goes to waste; next remaining clockwise player leads if highest gets away', () => {
  const g = scenario([
    [c('spades', 14)],
    [c('spades', 2), c('hearts', 2)],
    [c('spades', 3), c('clubs', 5)],
  ]);
  playCard(g, 'p0', 'spades-14');
  playCard(g, 'p1', 'spades-2');
  playCard(g, 'p2', 'spades-3');
  assert.equal(g.waste.length, 3);
  assert.equal(g.turnId, 'p1');
  assert.equal(g.players[0].escaped, true);
  assert.deepEqual(g.participants, ['p1', 'p2']);
});
test('last player with cards loses and a complete simultaneous escape is a draw', () => {
  const g = scenario([[c('spades', 14)], [c('spades', 2)], [c('spades', 3), c('clubs', 5)]]);
  playCard(g, 'p0', 'spades-14');
  playCard(g, 'p1', 'spades-2');
  playCard(g, 'p2', 'spades-3');
  assert.equal(g.phase, 'finished');
  assert.equal(g.loserId, 'p2');
  const draw = scenario([[c('spades', 14)], [c('spades', 2)], [c('spades', 3)]]);
  playCard(draw, 'p0', 'spades-14');
  playCard(draw, 'p1', 'spades-2');
  playCard(draw, 'p2', 'spades-3');
  assert.equal(draw.phase, 'finished');
  assert.equal(draw.loserId, null);
});
test('house rule redistributes a single extra card without creating a 53rd card', () => {
  const normal = startGame(roster(4), undefined, deck());
  const penalty = startGame(roster(4), 'p1', deck());
  assert.equal(penalty.players[1].hand.length, normal.players[1].hand.length + 1);
  assert.equal(penalty.players.flatMap((p) => p.hand).length, 52);
});
test('300 complete randomized games preserve all cards, legal turns, and escaped-hand invariants', () => {
  let completed = 0;
  for (let run = 0; run < 300; run++) {
    const g = startGame(roster(3 + (run % 6)));
    let moves = 0;
    while (g.phase === 'playing' && moves++ < 10000) {
      assert.ok(legalCards(g, g.turnId).length);
      const options = legalCards(g, g.turnId);
      const selected =
        run % 2 ? chooseCard(g) : options[Math.floor(Math.random() * options.length)];
      playCard(g, g.turnId, selected.id);
      const cards = [
        ...g.players.flatMap((p) => p.hand),
        ...g.trick.map((p) => p.card),
        ...g.waste,
      ];
      assert.equal(cards.length, 52);
      assert.equal(new Set(cards.map((c) => c.id)).size, 52);
      for (const player of g.players) if (player.escaped) assert.equal(player.hand.length, 0);
      if (g.phase === 'playing')
        assert.ok(g.players.find((p) => p.id === g.turnId)!.hand.length > 0);
    }
    assert.equal(g.phase, 'finished', `Game ${run} must finish within safety bound`);
    completed++;
    assert.equal(g.players.filter((p) => p.hand.length > 0).length, g.loserId ? 1 : 0);
  }
  assert.equal(completed, 300);
});
