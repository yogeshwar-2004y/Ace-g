'use client';
import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  Eye,
  Globe2,
  Hash,
  LockKeyhole,
  Plus,
  Sparkles,
  Users,
  Zap,
} from 'lucide-react';
import { CardFace, CardBack } from './Card';
import { useGame, useSettings, request } from '@/lib/store';
import { AVATARS } from '@/lib/types';
export default function Home({
  createRoom,
  joinRoom,
}: {
  createRoom: () => void;
  joinRoom: (code?: string, spectate?: boolean) => void;
}) {
  const { rooms, connected, setToast } = useGame();
  const settings = useSettings();
  const [busy, setBusy] = useState(false);
  const [code, setCode] = useState('');
  async function practice() {
    setBusy(true);
    try {
      await request('room:create', {
        name: settings.name || 'You',
        avatar: settings.avatar,
        nameRoom: 'The Practice Lounge',
        maxPlayers: 4,
        isPrivate: true,
        password: '',
        penalty: false,
        practice: true,
      });
    } catch (e) {
      setToast(e instanceof Error ? e.message : 'Could not open the table.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="home">
      <section className="hero" aria-labelledby="hero-title">
        <motion.div
          className="hero-copy"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.65 }}
        >
          <div className="club-label">
            <span /> GOOD CARDS. GREAT COMPANY.
          </div>
          <h1 id="hero-title">
            Play your cards.
            <br />
            Make your
            <br />
            <span>getaway.</span>
            <span className="headline-spark">✳</span>
          </h1>
          <p>
            A few friends. A full deck. One last player.
            <br className="desktop-break" /> The classic card game where getting out is everything.
          </p>
          <div className="hero-actions">
            <button className="button primary" onClick={createRoom}>
              <Plus size={19} /> Create a room
              <ArrowUpRight size={18} />
            </button>
            <button className="button secondary" onClick={() => joinRoom()}>
              <Hash size={19} /> Join a room
            </button>
          </div>
          <div className="hero-facts">
            <span>
              <Users size={15} /> 3–8 players
            </span>
            <span>
              <Clock3 size={15} /> 10–20 min
            </span>
            <span>
              <Check size={15} /> Always free
            </span>
          </div>
        </motion.div>
        <div
          className="hero-art"
          aria-label="An illustrated Getaway table with a fan of playing cards"
        >
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-orbit orbit-three" />
          <div className="art-star star-one">✦</div>
          <div className="art-star star-two">✧</div>
          <div className="art-star star-three">✦</div>
          <motion.div
            className="floating-note note-top"
            animate={{ y: [0, -7, 0] }}
            transition={{ duration: 5, repeat: Infinity }}
          >
            <span>🐸</span>
            <div>
              <b>One card left.</b>
              <small>Absolutely no pressure.</small>
            </div>
            <span className="tiny-spark">✧</span>
          </motion.div>
          <div className="hero-card card-one">
            <CardBack />
          </div>
          <div className="hero-card card-two">
            <CardFace card={{ id: 'hearts-13', rank: 13, suit: 'hearts' }} />
          </div>
          <div className="hero-card card-three">
            <CardFace card={{ id: 'clubs-12', rank: 12, suit: 'clubs' }} />
          </div>
          <div className="hero-card card-four">
            <CardFace card={{ id: 'spades-14', rank: 14, suit: 'spades' }} />
          </div>
          <div className="hero-chip">
            <span>THE ART OF</span>
            <b>
              getting
              <br />
              away.
            </b>
            <span>EST. GOOD TIMES</span>
          </div>
          <motion.div
            className="floating-note note-bottom"
            animate={{ y: [0, 6, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
          >
            <span className="note-check">
              <Check size={19} />
            </span>
            <div>
              <b>Friendships may be tested.</b>
              <small>Rematches highly recommended.</small>
            </div>
          </motion.div>
          <div className="art-caption">
            LESS SCROLLING. MORE SHUFFLING.
            <ArrowDown size={12} />
          </div>
        </div>
      </section>
      <div className="social-strip">
        <div className="mini-avatars">
          {AVATARS.slice(0, 4).map((a) => (
            <span key={a}>{a}</span>
          ))}
        </div>
        <p>
          Made for your <b>“one more game”</b> people.
        </p>
        <span className="strip-right">
          <span className="live-dot" /> No downloads. No sign-ups. Just play.
        </span>
      </div>
      <section className="play-section" id="play">
        <div className="section-heading">
          <div>
            <div className="eyebrow">THE NIGHT IS YOUNG</div>
            <h2>Find your table.</h2>
          </div>
          <span className="section-aside">Bring your people. We’ll bring the cards.</span>
        </div>
        <div className="play-options">
          <button className="option-card create-option" onClick={createRoom}>
            <div className="option-top">
              <span className="option-icon">
                <Plus size={23} />
              </span>
              <ArrowUpRight size={20} />
            </div>
            <h3>Host the good times.</h3>
            <p>Your room. Your rules. Your favourite people.</p>
            <span className="option-link">
              Create a room <ArrowRight size={16} />
            </span>
            <span className="option-decoration">♣</span>
          </button>
          <div className="option-card">
            <div className="option-top">
              <span className="option-icon">
                <Hash size={23} />
              </span>
              <span className="small-tag">INVITE ONLY? NO PROBLEM.</span>
            </div>
            <h3>Saved you a seat.</h3>
            <p>Have a room code? You’re already on the list.</p>
            <form
              className="quick-join"
              onSubmit={(e) => {
                e.preventDefault();
                joinRoom(code);
              }}
            >
              <input
                aria-label="Enter room code"
                placeholder="ENTER ROOM CODE"
                maxLength={6}
                pattern="[A-Za-z2-9]{6}"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
              <button aria-label="Join room with code">
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
          <button className="option-card practice-option" disabled={busy} onClick={practice}>
            <div className="option-top">
              <span className="option-icon">
                <Zap size={22} />
              </span>
              <span className="small-tag">NO WAITING</span>
            </div>
            <h3>A little warm-up?</h3>
            <p>Meet the bots. Learn the ropes. Find your rhythm.</p>
            <span className="option-link">
              {busy ? 'Dealing your cards…' : 'Play a practice round'}
              <ArrowRight size={16} />
            </span>
          </button>
        </div>
      </section>
      <section className="public-section">
        <div className="section-heading compact">
          <h2>
            <Globe2 size={21} /> Open tables <span className="count-badge">{rooms.length}</span>
          </h2>
          <span className="live-label">
            <span className={`live-dot ${connected ? '' : 'offline'}`} />
            {connected ? 'LIVE AT THE CLUB' : 'CONNECTING TO THE CLUB'}
          </span>
        </div>
        {rooms.length ? (
          <div className="room-list">
            {rooms.map((r) => (
              <div className="room-list-item" key={r.code}>
                <div className="room-list-icon">♠</div>
                <div className="room-list-name">
                  <b>
                    {r.name} {r.hasPassword && <LockKeyhole size={13} />}
                  </b>
                  <span>
                    {r.phase === 'lobby'
                      ? 'Waiting for good company'
                      : r.phase === 'playing'
                        ? 'Cards on the table'
                        : 'Taking a victory lap'}
                  </span>
                </div>
                <span className="room-seats">
                  <Users size={15} />
                  {r.count}/{r.maxPlayers}
                </span>
                <span className={`room-status ${r.phase === 'lobby' ? 'open' : ''}`}>
                  {r.phase === 'lobby' ? 'Open seats' : 'In a round'}
                </span>
                <button
                  className="button subtle small"
                  onClick={() => joinRoom(r.code, r.phase !== 'lobby' || r.count >= r.maxPlayers)}
                >
                  {r.phase !== 'lobby' || r.count >= r.maxPlayers ? (
                    <>
                      <Eye size={15} />
                      Watch
                    </>
                  ) : (
                    <>
                      Join table
                      <ArrowUpRight size={15} />
                    </>
                  )}
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-tables">
            <div className="empty-card-icon">
              <span>♠</span>
              <span>♥</span>
            </div>
            <div>
              <h3>The best nights start with someone.</h3>
              <p>No public tables just yet. Be the one who gets things going.</p>
            </div>
            <button className="button subtle small" onClick={createRoom}>
              Open a table
              <Plus size={16} />
            </button>
          </div>
        )}
      </section>
      <section className="how-section" id="how-to-play">
        <div className="section-heading">
          <div>
            <div className="eyebrow">EASY TO LEARN. HARD TO LEAVE.</div>
            <h2>The plan? Get out.</h2>
          </div>
          <span className="rules-tag">
            <Sparkles size={14} /> A classic, with a little attitude.
          </span>
        </div>
        <div className="rules-grid">
          <article>
            <span className="step">01</span>
            <div>
              <h3>Follow the suit.</h3>
              <p>
                The Ace of Spades starts. Play a card of the same suit if you have one. Highest card
                leads the next trick.
              </p>
            </div>
            <span className="rule-suit">♠</span>
          </article>
          <article>
            <span className="step">02</span>
            <div>
              <h3>Change the plot.</h3>
              <p>
                No matching suit? Play any card. The trick ends, and the highest led-suit player
                picks up the whole pile.
              </p>
            </div>
            <span className="rule-suit">↻</span>
          </article>
          <article>
            <span className="step">03</span>
            <div>
              <h3>Make your escape.</h3>
              <p>
                Everyone follows suit? Discard the pile. Empty your hand to get away. Last one
                holding cards gets the jokes.
              </p>
            </div>
            <span className="rule-suit">✧</span>
          </article>
        </div>
        <div className="rules-footnote">
          Aces are high. Turns go clockwise. If the trick winner gets away, the next remaining
          player leads. Empty hands are confirmed after the trick resolves.
        </div>
      </section>
      <footer>
        <a className="brand footer-brand" href="#">
          <span className="brand-mark">♠</span>getaway<span className="brand-period">.</span>
        </a>
        <span>Good friends. Questionable card decisions.</span>
        <span className="footer-tamil" lang="ta">
          விளையாடு. சிரி. தப்பித்துக்கொள்.
        </span>
      </footer>
    </main>
  );
}
