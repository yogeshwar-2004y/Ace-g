export type Suit = 'spades' | 'hearts' | 'clubs' | 'diamonds';
export type Card = { id: string; suit: Suit; rank: number };
export type Player = {
  id: string;
  name: string;
  avatar: number;
  ready: boolean;
  connected: boolean;
  bot: boolean;
  hand: Card[];
  escaped: boolean;
};
export type Play = { playerId: string; card: Card };
export type Resolution = {
  id: number;
  type: 'pickup' | 'discard';
  plays: Play[];
  winnerId: string;
  escaped: string[];
};
export type Game = {
  players: Player[];
  turnId: string;
  trick: Play[];
  participants: string[];
  waste: Card[];
  firstMove: boolean;
  phase: 'playing' | 'finished';
  loserId: string | null;
  escapeOrder: string[];
  turnNumber: number;
  lastResolution: Resolution | null;
};
export type PublicPlayer = Omit<Player, 'hand'> & { cardCount: number };
export type Message = { id: string; name: string; text: string; system?: boolean };
export type RoomView = {
  code: string;
  name: string;
  hostId: string;
  maxPlayers: number;
  isPrivate: boolean;
  hasPassword: boolean;
  penalty: boolean;
  phase: 'lobby' | 'playing' | 'finished';
  round: number;
  players: PublicPlayer[];
  spectatorCount: number;
  youId: string;
  spectating: boolean;
  hand: Card[];
  legalCardIds: string[];
  turnId: string | null;
  turnEndsAt: number;
  trick: Play[];
  wasteCount: number;
  firstMove: boolean;
  loserId: string | null;
  escapeOrder: string[];
  lastResolution: Resolution | null;
  messages: Message[];
};
export type PublicRoom = {
  code: string;
  name: string;
  count: number;
  maxPlayers: number;
  phase: RoomView['phase'];
  hasPassword: boolean;
};
export type Reply<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
export const SUIT_SYMBOL: Record<Suit, string> = {
  spades: '♠',
  hearts: '♥',
  clubs: '♣',
  diamonds: '♦',
};
export const rankLabel = (rank: number) =>
  ({ 11: 'J', 12: 'Q', 13: 'K', 14: 'A' })[rank] ?? String(rank);
export const AVATARS = ['🦊', '🐼', '🐸', '🐯', '🐨', '🐻', '🐰', '🐙'];
