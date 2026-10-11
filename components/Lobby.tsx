'use client';
import { Check, Crown, Eye, LoaderCircle, LockKeyhole, ArrowRight, Users } from 'lucide-react';
import { motion } from 'framer-motion';
import { act } from '@/lib/store';
import { AVATARS, type RoomView } from '@/lib/types';
import { CopyCode } from './RoomForms';
import Chat from './Chat';
export default function Lobby({ room }: { room: RoomView }) {
  const me = room.players.find((p) => p.id === room.youId);
  const host = room.youId === room.hostId;
  const ready = room.players.filter((p) => p.ready && p.connected).length;
  const canStart = room.players.length >= 3 && ready === room.players.length;
  return (
    <main className="lobby-page">
      <div className="lobby-heading">
        <div className="club-label">
          <span /> THE PRE-GAME HANGOUT
        </div>
        <h1>{room.name}</h1>
        <p>Get comfortable. The good part is about to start.</p>
        <div className="lobby-meta">
          <CopyCode code={room.code} />
          <span>
            {room.isPrivate ? <LockKeyhole size={16} /> : <Users size={16} />}
            {room.isPrivate ? 'Private table' : 'Public table'}
          </span>
          <span>
            <Eye size={16} />
            {room.spectatorCount} watching
          </span>
        </div>
      </div>
      <div className="lobby-layout">
        <section className="lobby-seats">
          <div className="panel-title">
            <h2>Your people</h2>
            <span>
              {room.players.length} / {room.maxPlayers} seats
            </span>
          </div>
          <div className="lobby-players">
            {Array.from({ length: room.maxPlayers }, (_, i) => {
              const p = room.players[i];
              return (
                <motion.div
                  className={`lobby-player ${p?.ready ? 'is-ready' : ''} ${!p ? 'empty-seat' : ''}`}
                  key={p?.id ?? i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <div className={`avatar avatar-${p?.avatar ?? 0}`}>
                    {p ? AVATARS[p.avatar] : '+'}
                    {p?.id === room.hostId && (
                      <span className="host-crown">
                        <Crown size={12} />
                      </span>
                    )}
                  </div>
                  <b>{p ? `${p.name}${p.id === room.youId ? ' (you)' : ''}` : 'Saved a seat'}</b>
                  <span className={`player-ready ${p?.ready ? 'ready' : ''}`}>
                    {p ? (
                      !p.connected ? (
                        'Reconnecting…'
                      ) : p.ready ? (
                        <>
                          <Check size={12} />
                          Ready to play
                        </>
                      ) : (
                        'Getting comfortable'
                      )
                    ) : (
                      'Waiting for a friend'
                    )}
                  </span>
                </motion.div>
              );
            })}
          </div>
          <div className="invite-banner">
            <span>✉</span>
            <div>
              <b>Good company is one code away.</b>
              <p>
                Send <strong>{room.code}</strong> to your friends and let the games begin.
              </p>
            </div>
          </div>
          <div className="lobby-controls">
            {!room.spectating && (
              <button
                className={`button ${me?.ready ? 'secondary' : 'primary'}`}
                onClick={() => act('room:ready', !me?.ready)}
              >
                {me?.ready ? (
                  <>
                    <Check size={18} />
                    I’m ready · undo
                  </>
                ) : (
                  <>
                    I’m ready
                    <Check size={18} />
                  </>
                )}
              </button>
            )}
            {host && (
              <button
                className="button primary"
                disabled={!canStart}
                onClick={() => act('game:start', {})}
              >
                Deal the cards
                <ArrowRight size={18} />
              </button>
            )}
            {room.spectating && (
              <span className="spectator-note">
                <Eye size={17} />
                You have a front-row seat.
              </span>
            )}
          </div>
          <p className="lobby-help">
            {canStart ? (
              host ? (
                'Everyone is ready. Your table is waiting for you.'
              ) : (
                'Everyone is ready. Waiting for the host to deal.'
              )
            ) : (
              <>
                <LoaderCircle size={13} />
                {ready} ready · Need at least 3 players, with everyone ready.
              </>
            )}
            {room.penalty && ' Last player receives one extra card next round.'}
          </p>
        </section>
        <Chat room={room} />
      </div>
    </main>
  );
}
