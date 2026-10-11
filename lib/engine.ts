import { randomInt } from 'node:crypto';
import type { Card, Game, Player, Suit } from './types';

export function deck(): Card[] {
  return (['spades', 'hearts', 'clubs', 'diamonds'] as Suit[]).flatMap((suit) =>
    Array.from({ length: 13 }, (_, i) => ({ id: `${suit}-${i + 2}`, suit, rank: i + 2 })),
  );
}
export function shuffle(cards: Card[]): Card[] {
  const copy = [...cards];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = randomInt(i + 1);
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}
export function startGame(roster: Player[], previousLoser?: string, orderedDeck?: Card[]): Game {
  if (roster.length < 3 || roster.length > 8) throw new Error('A table needs 3–8 players.');
  const players = roster.map((p) => ({ ...p, hand: [] as Card[], escaped: false }));
  (orderedDeck ?? shuffle(deck())).forEach((c, i) => players[i % players.length].hand.push(c));
  if (previousLoser) {
    const loser = players.find((p) => p.id === previousLoser);
    const donor = players
      .filter((p) => p.id !== previousLoser)
      .sort((a, b) => b.hand.length - a.hand.length)[0];
    if (loser && donor && donor.hand.length > 1) loser.hand.push(donor.hand.pop()!);
  }
  return {
    players,
    turnId: players.find((p) => p.hand.some((c) => c.id === 'spades-14'))!.id,
    trick: [],
    participants: players.map((p) => p.id),
    waste: [],
    firstMove: true,
    phase: 'playing',
    loserId: null,
    escapeOrder: [],
    turnNumber: 0,
    lastResolution: null,
  };
}
export function legalCards(game: Game, id: string): Card[] {
  if (game.phase !== 'playing' || game.turnId !== id) return [];
  const hand = game.players.find((p) => p.id === id)?.hand ?? [];
  if (game.firstMove) return hand.filter((c) => c.id === 'spades-14');
  const suit = game.trick[0]?.card.suit;
  const matching = hand.filter((c) => c.suit === suit);
  return matching.length ? matching : hand;
}
function nextPlayer(game: Game, after: string, candidates: string[]): string {
  const index = game.players.findIndex((p) => p.id === after);
  for (let step = 1; step <= game.players.length; step++) {
    const p = game.players[(index + step) % game.players.length];
    if (candidates.includes(p.id)) return p.id;
  }
  throw new Error('No next player.');
}
/** Pure rules boundary: mutates game only after validating the entire action. */
export function playCard(game: Game, playerId: string, cardId: string): void {
  const card = legalCards(game, playerId).find((c) => c.id === cardId);
  if (!card)
    throw new Error(
      game.turnId !== playerId
        ? 'Wait for your turn.'
        : 'Follow the led suit. The opening card must be the Ace of Spades.',
    );
  const player = game.players.find((p) => p.id === playerId)!;
  player.hand.splice(
    player.hand.findIndex((c) => c.id === cardId),
    1,
  );
  game.trick.push({ playerId, card });
  game.firstMove = false;
  game.turnNumber++;
  const ledSuit = game.trick[0].card.suit;
  const pickup = card.suit !== ledSuit;
  const complete = game.trick.length === game.participants.length;
  if (!pickup && !complete) {
    game.turnId = nextPlayer(
      game,
      playerId,
      game.participants.filter((id) => !game.trick.some((p) => p.playerId === id)),
    );
    return;
  }
  const winner = game.trick
    .filter((p) => p.card.suit === ledSuit)
    .reduce((best, p) => (p.card.rank > best.card.rank ? p : best));
  const cards = game.trick.map((p) => p.card);
  if (pickup) game.players.find((p) => p.id === winner.playerId)!.hand.push(...cards);
  else game.waste.push(...cards);
  // Empty hands are finalized at resolution: a highest last card can still collect a pickup.
  const escaped = game.players.filter((p) => !p.escaped && p.hand.length === 0).map((p) => p.id);
  escaped.forEach((id) => {
    game.players.find((p) => p.id === id)!.escaped = true;
    game.escapeOrder.push(id);
  });
  game.lastResolution = {
    id: game.turnNumber,
    type: pickup ? 'pickup' : 'discard',
    plays: [...game.trick],
    winnerId: winner.playerId,
    escaped,
  };
  game.trick = [];
  const active = game.players.filter((p) => !p.escaped);
  if (active.length <= 1) {
    game.phase = 'finished';
    game.loserId = active[0]?.id ?? null;
    game.turnId = '';
    game.participants = [];
    return;
  }
  game.participants = active.map((p) => p.id);
  game.turnId = game.participants.includes(winner.playerId)
    ? winner.playerId
    : nextPlayer(game, winner.playerId, game.participants);
}
export function chooseCard(game: Game): Card {
  const options = legalCards(game, game.turnId);
  if (!options.length) throw new Error('No legal move.');
  const winningRank = Math.max(
    0,
    ...game.trick.filter((p) => p.card.suit === game.trick[0]?.card.suit).map((p) => p.card.rank),
  );
  const safe = options.filter((c) => c.rank < winningRank);
  return (safe.length ? safe : options).sort((a, b) => b.rank - a.rank)[0];
}
