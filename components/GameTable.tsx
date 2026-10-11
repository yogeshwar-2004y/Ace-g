'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  Check,
  Clock3,
  Crown,
  Eye,
  MessageCircle,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import { AVATARS, SUIT_SYMBOL, type RoomView } from '@/lib/types';
import { act, useSettings } from '@/lib/store';
import { sound } from '@/lib/audio';
import { CardBack, CardFace, PlayingCard } from './Card';
import { CopyCode } from './RoomForms';
import Chat from './Chat';
const EN_LINES = [
  'The cards really liked you. They all stayed.',
  'Everyone made an exit. You renewed the lease.',
  'You came. You saw. You collected the whole deck.',
  'A masterclass in making everyone else look good.',
  'The table called. It says you can go home now.',
];
const TA_LINES = [
  'எல்லாரும் தப்பிச்சாங்க. நீ மட்டும் இன்னும் சீட்டு எண்ணுற!',
  'சீட்டுகளுக்கு உன்னை ரொம்ப பிடிச்சிருக்கு. போகவே மாட்டேங்குது!',
  'எல்லாரும் கிளம்பிட்டாங்க. நீ இன்னும் நாற்காலியை விடல!',
  'சீட்டு விளையாட வந்தியா, சீட்டு சேகரிக்க வந்தியா?',
  'அடுத்த ஆட்டத்துல பார்த்துக்கலாம்… இதையும் நீ தான் சொன்ன!',
];
function Confetti() {
  return (
    <div className="confetti" aria-hidden="true">
      {Array.from({ length: 32 }, (_, i) => (
        <i
          key={i}
          style={
            {
              '--x': `${(i * 37) % 100}%`,
              '--delay': `${(i % 7) * 0.15}s`,
              '--color': ['#d7ef91', '#f2b87f', '#a9bac7', '#e6e0bb'][i % 4],
              '--angle': `${i * 57}deg`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}
export default function GameTable({ room }: { room: RoomView }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [chat, setChat] = useState(false);
  const [now, setNow] = useState(Date.now());
  const [resolving, setResolving] = useState(false);
  const resultRef = useRef<HTMLElement>(null);
  const settings = useSettings();
  const lastTurn = useRef('');
  const previousCount = useRef(0);
  const mine = room.players.find((p) => p.id === room.youId);
  const isTurn = room.turnId === room.youId && room.phase === 'playing';
  const turnPlayer = room.players.find((p) => p.id === room.turnId);
  const seconds = Math.max(0, Math.ceil((room.turnEndsAt - now) / 1000));
  const lastId = room.lastResolution?.id;
  useEffect(() => {
    if (room.phase !== 'finished') return;
    const previous = document.activeElement as HTMLElement;
    resultRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || document.querySelector('.modal-scrim')) return;
      const buttons = [...(resultRef.current?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
      if (event.shiftKey && document.activeElement === buttons[0]) {
        event.preventDefault();
        buttons.at(-1)?.focus();
      } else if (!event.shiftKey && document.activeElement === buttons.at(-1)) {
        event.preventDefault();
        buttons[0]?.focus();
      }
    };
    document.addEventListener('keydown', trap);
    return () => {
      document.removeEventListener('keydown', trap);
      previous?.focus();
    };
  }, [room.phase]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!lastId) return;
    setResolving(true);
    const timeout = setTimeout(() => setResolving(false), 1400);
    return () => clearTimeout(timeout);
  }, [lastId]);
  useEffect(() => {
    if (isTurn && lastTurn.current !== room.turnId && settings.sound) sound('turn');
    lastTurn.current = room.turnId ?? '';
  }, [isTurn, room.turnId, settings.sound]);
  useEffect(() => {
    if (room.trick.length !== previousCount.current && room.trick.length && settings.sound)
      sound('play');
    previousCount.current = room.trick.length;
  }, [room.trick.length, settings.sound]);
  useEffect(() => {
    if (room.lastResolution?.escaped.length && settings.sound) sound('escape');
  }, [lastId, settings.sound, room.lastResolution?.escaped.length]);
  useEffect(() => {
    if (room.phase === 'finished' && settings.sound)
      sound(room.loserId === room.youId ? 'lose' : 'escape');
  }, [room.phase, room.loserId, room.youId, settings.sound]);
  useEffect(() => {
    if (selected && !room.hand.some((c) => c.id === selected)) setSelected(null);
  }, [room.hand, selected]);
  const seats = [...room.players];
  const myIndex = seats.findIndex((p) => p.id === room.youId);
  if (myIndex > 0) seats.push(...seats.splice(0, myIndex));
  const position = (index: number) => {
    const angle = Math.PI / 2 + (index * Math.PI * 2) / seats.length;
    return { x: 50 + 47 * Math.cos(angle), y: 49 + 43 * Math.sin(angle) };
  };
  const displayPlays = room.trick.length
    ? room.trick
    : resolving
      ? (room.lastResolution?.plays ?? [])
      : [];
  const hand = [...room.hand].sort(
    (a, b) =>
      ['spades', 'hearts', 'clubs', 'diamonds'].indexOf(a.suit) -
        ['spades', 'hearts', 'clubs', 'diamonds'].indexOf(b.suit) || a.rank - b.rank,
  );
  const ledSuit = room.trick[0]?.card.suit;
  const winner = room.players.find((p) => p.id === room.lastResolution?.winnerId);
  const loser = room.players.find((p) => p.id === room.loserId);
  return (
    <main className="game-page">
      <div className="game-toolbar">
        <div>
          <div className="eyebrow">ROUND {room.round.toString().padStart(2, '0')}</div>
          <h1>{room.name}</h1>
        </div>
        <div className="game-tools">
          <CopyCode code={room.code} />
          <span className="spectator-count">
            <Eye size={16} />
            {room.spectatorCount}
          </span>
          <button
            className="button subtle small"
            aria-label="Table talk"
            onClick={() => setChat(!chat)}
          >
            <MessageCircle size={16} />
            <span>Table talk</span>
            <span className="count-badge">{room.messages.filter((m) => !m.system).length}</span>
          </button>
        </div>
      </div>
      <div className={`game-layout ${chat ? 'with-chat' : ''}`}>
        <div className="game-main">
          <div className="table-stage">
            <div className="felt-table">
              <div className="felt-inner">
                <div className="table-watermark">
                  getaway<span>.</span>
                  <small>GOOD CARDS. GREAT COMPANY.</small>
                </div>
                <div className="felt-lines" />
              </div>
            </div>
            {seats.map((p, index) => {
              const pos = position(index);
              return (
                <div
                  key={p.id}
                  className={`table-player seat-${index} ${p.id === room.turnId ? 'current' : ''} ${p.escaped ? 'escaped' : ''}`}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                >
                  <div className="player-mini-hand">
                    {!p.escaped &&
                      Array.from({ length: Math.min(p.cardCount, 5) }, (_, i) => (
                        <CardBack key={i} />
                      ))}
                  </div>
                  <div className={`avatar avatar-${p.avatar}`}>
                    <span>{AVATARS[p.avatar]}</span>
                    {p.id === room.hostId && (
                      <i className="host-crown">
                        <Crown size={11} />
                      </i>
                    )}
                    {p.escaped && (
                      <i className="escape-badge">
                        <Check size={13} />
                      </i>
                    )}
                  </div>
                  <div className="table-player-name">
                    {p.name}
                    {p.id === room.youId && <small>YOU</small>}
                  </div>
                  <span className="table-player-status">
                    {p.escaped
                      ? 'Got away! ✦'
                      : !p.connected && !p.bot
                        ? 'Reconnecting…'
                        : `${p.cardCount} cards${p.bot ? ' · bot' : ''}`}
                  </span>
                </div>
              );
            })}
            <div
              className={`trick-area ${resolving && !room.trick.length ? `resolving ${room.lastResolution?.type}` : ''}`}
            >
              <AnimatePresence mode="popLayout">
                {displayPlays.map((play, index) => {
                  const pos = position(
                    Math.max(
                      0,
                      seats.findIndex((p) => p.id === play.playerId),
                    ),
                  );
                  return (
                    <motion.div
                      className="played-card"
                      key={play.card.id}
                      initial={{ opacity: 0, x: (pos.x - 50) * 5, y: (pos.y - 50) * 4, rotate: 20 }}
                      animate={{
                        opacity: 1,
                        x: 0,
                        y: (index % 2) * 8,
                        rotate: (index - displayPlays.length / 2) * 7,
                      }}
                      exit={{
                        opacity: 0,
                        scale: 0.3,
                        x:
                          room.lastResolution?.type === 'pickup'
                            ? (position(
                                Math.max(
                                  0,
                                  seats.findIndex((p) => p.id === room.lastResolution?.winnerId),
                                ),
                              ).x -
                                50) *
                              5
                            : 120,
                        y:
                          room.lastResolution?.type === 'pickup'
                            ? (position(
                                Math.max(
                                  0,
                                  seats.findIndex((p) => p.id === room.lastResolution?.winnerId),
                                ),
                              ).y -
                                50) *
                              4
                            : 80,
                      }}
                      transition={{ type: 'spring', stiffness: 230, damping: 24 }}
                    >
                      <CardFace card={play.card} small />
                      <span>{room.players.find((p) => p.id === play.playerId)?.name}</span>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
              {!displayPlays.length && (
                <div className="empty-trick">
                  <span>♠</span>
                  <p>
                    {room.firstMove
                      ? 'The Ace of Spades starts the story.'
                      : 'A fresh trick. A fresh chance.'}
                  </p>
                </div>
              )}
            </div>
            <div className="waste-pile">
              <div className="waste-cards">
                <CardBack />
                <CardBack />
              </div>
              <span>{room.wasteCount} discarded</span>
            </div>
          </div>
          <div className={`turn-banner ${isTurn ? 'your-turn' : ''}`} aria-live="polite">
            <span className="turn-orb" />
            <div>
              {resolving && !room.trick.length ? (
                <>
                  <b>
                    {room.lastResolution?.type === 'pickup'
                      ? `${winner?.name} picks up the pile!`
                      : 'Clean trick. Cards discarded.'}
                  </b>
                  <span>
                    {room.lastResolution?.escaped.length
                      ? 'Another escape. The table is getting smaller.'
                      : 'The next trick is yours to change.'}
                  </span>
                </>
              ) : (
                <>
                  <b>
                    {room.phase === 'finished'
                      ? 'That’s a wrap.'
                      : isTurn
                        ? 'Your move. Make it a good one.'
                        : `${turnPlayer?.name ?? 'The table'} is thinking…`}
                  </b>
                  <span>
                    {room.firstMove
                      ? 'The Ace of Spades must lead.'
                      : ledSuit
                        ? `Follow ${ledSuit} ${SUIT_SYMBOL[ledSuit]}. No matching suit? Any card will do.`
                        : 'Lead with any card.'}
                  </span>
                </>
              )}
            </div>
            {room.phase === 'playing' && (
              <span className={`turn-timer ${seconds <= 8 && isTurn ? 'urgent' : ''}`}>
                <Clock3 size={15} />
                {seconds}s
              </span>
            )}
          </div>
          <section className="hand-section" aria-label="Your cards">
            <div className="hand-heading">
              <span>
                {room.spectating ? (
                  <>
                    <Eye size={15} />
                    THE BEST SEAT IN THE HOUSE
                  </>
                ) : mine?.escaped ? (
                  <>
                    <Sparkles size={15} />
                    YOU MADE YOUR GETAWAY
                  </>
                ) : (
                  <>
                    YOUR HAND <b>{room.hand.length}</b>
                  </>
                )}
              </span>
              <small>
                {room.spectating
                  ? 'You’re watching. Enjoy the table talk.'
                  : mine?.escaped
                    ? 'Sit back. Enjoy the rest of the drama.'
                    : 'Tap to select · double-click or drag up to play'}
              </small>
            </div>
            {room.spectating || mine?.escaped ? (
              <div className="escaped-hand">
                <span>{mine?.escaped ? '✦' : '♠'}</span>
                <p>
                  {mine?.escaped
                    ? 'No cards. No worries.'
                    : 'Every great game deserves an audience.'}
                </p>
              </div>
            ) : (
              <>
                <div className="hand-scroll">
                  <div className="hand-fan">
                    {hand.map((card, index) => (
                      <PlayingCard
                        key={card.id}
                        card={card}
                        index={index}
                        total={hand.length}
                        selected={selected === card.id}
                        playable={room.legalCardIds.includes(card.id)}
                        onSelect={() => setSelected(card.id === selected ? null : card.id)}
                        onPlay={() => act('game:play', { cardId: card.id })}
                      />
                    ))}
                  </div>
                </div>
                <div className="hand-actions">
                  <span>
                    {isTurn
                      ? 'Highlighted cards are ready to play.'
                      : 'Plan your escape while you wait.'}
                  </span>
                  <button
                    className="button primary small"
                    disabled={!selected || !room.legalCardIds.includes(selected)}
                    onClick={() => act('game:play', { cardId: selected })}
                  >
                    Play card
                    <ArrowRight size={16} />
                  </button>
                </div>
              </>
            )}
          </section>
        </div>
        {chat && <Chat room={room} onClose={() => setChat(false)} />}
      </div>
      {resolving && !!room.lastResolution?.escaped.length && <Confetti />}
      {room.phase === 'finished' && (
        <div className="result-overlay">
          <motion.section
            ref={resultRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="result-title"
            className="result-card"
            initial={{ opacity: 0, scale: 0.8, rotate: -3 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 18 }}
          >
            <Confetti />
            <div className="eyebrow">THE CARDS HAVE SPOKEN</div>
            <div className="result-avatar">
              {loser ? AVATARS[loser.avatar] : '✦'}
              <span>{loser ? '☕' : '✨'}</span>
            </div>
            <h2 id="result-title">
              {loser ? (
                <>
                  Last one in<span>.</span>
                </>
              ) : (
                'A perfect escape.'
              )}
            </h2>
            <p className="result-name">
              {loser ? `${loser.name}, this one’s on you.` : 'Everyone got away. How about that?'}
            </p>
            <blockquote lang={settings.language}>
              {loser
                ? (settings.language === 'ta' ? TA_LINES : EN_LINES)[room.round % EN_LINES.length]
                : 'Good company. Great cards. No one left behind.'}
            </blockquote>
            <div className="escaped-list">
              <span>THE GREAT ESCAPES</span>
              <div>
                {room.escapeOrder.map((id) => {
                  const p = room.players.find((p) => p.id === id);
                  return (
                    <span key={id}>
                      {p && AVATARS[p.avatar]} {p?.name}
                      <Check size={12} />
                    </span>
                  );
                })}
              </div>
            </div>
            {room.penalty && loser && (
              <p className="penalty-note">
                {loser.name} gets one extra card next round. The plot thickens.
              </p>
            )}
            {room.hostId === room.youId ? (
              <button className="button primary full" onClick={() => act('game:rematch', {})}>
                <RotateCcw size={17} />
                One more game
              </button>
            ) : (
              <p className="result-waiting">Waiting for the host to start a rematch.</p>
            )}
            <button
              className="button subtle small result-back"
              onClick={() => act('room:leave', {})}
            >
              Back to the club
            </button>
            <small>A little teasing. A lot of love. That’s Getaway.</small>
          </motion.section>
        </div>
      )}
    </main>
  );
}
