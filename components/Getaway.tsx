'use client';
import { useEffect, useState } from 'react';
import { MotionConfig } from 'framer-motion';
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  LogOut,
  Settings2,
  Volume2,
  VolumeX,
  WifiOff,
  X,
} from 'lucide-react';
import Home from './Home';
import Lobby from './Lobby';
import GameTable from './GameTable';
import RoomForms from './RoomForms';
import Settings from './Settings';
import Dialog from './Dialog';
import { act, connect, useGame, useSettings } from '@/lib/store';
import { sound, unlockAudio } from '@/lib/audio';
import { AVATARS } from '@/lib/types';
export default function Getaway() {
  const { room, connected, toast, setToast } = useGame();
  const settings = useSettings();
  const [modal, setModal] = useState<'create' | 'join' | 'settings' | 'leave' | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [spectate, setSpectate] = useState(false);
  useEffect(() => {
    void useSettings.persist.rehydrate();
    connect();
    const unlock = () => unlockAudio();
    document.addEventListener('pointerdown', unlock, { once: true });
    document.addEventListener('keydown', unlock, { once: true });
    return () => {
      document.removeEventListener('pointerdown', unlock);
      document.removeEventListener('keydown', unlock);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
  }, [settings.theme]);
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [room?.code, room?.phase]);
  useEffect(() => {
    if (!settings.music) return;
    sound('music');
    const timer = setInterval(() => sound('music'), 4500);
    return () => clearInterval(timer);
  }, [settings.music]);
  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(''), 5000);
    return () => clearTimeout(timer);
  }, [toast, setToast]);
  const join = (code = '', watch = false) => {
    setJoinCode(code);
    setSpectate(watch);
    setModal('join');
  };
  return (
    <MotionConfig reducedMotion="user">
      <div className="app-shell">
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <header className="site-header">
          <div className="header-inner">
            <a
              className="brand"
              href="#"
              onClick={(e) => {
                if (room) {
                  e.preventDefault();
                  setModal('leave');
                }
              }}
            >
              <span className="brand-mark">♠</span>getaway<span className="brand-period">.</span>
              <span className="club-word">THE CARD CLUB</span>
            </a>
            <nav aria-label="Main navigation">
              {room ? (
                <button onClick={() => setModal('leave')}>
                  <ArrowLeft size={15} />
                  Back to the club
                </button>
              ) : (
                <>
                  <a className="active" href="#play">
                    Let’s play
                  </a>
                  <a href="#how-to-play">How to play</a>
                  <button onClick={() => setModal('settings')}>
                    Make it yours
                    <ArrowUpRight size={13} />
                  </button>
                </>
              )}
            </nav>
            <div className="header-actions">
              <button
                className="icon-button sound-button"
                aria-label={settings.sound ? 'Mute sound effects' : 'Enable sound effects'}
                onClick={() => settings.set({ sound: !settings.sound })}
              >
                {settings.sound ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </button>
              <button
                className="icon-button"
                aria-label="Settings"
                onClick={() => setModal('settings')}
              >
                <Settings2 size={18} />
              </button>
              <span className="header-divider" />
              <button
                className={`profile-avatar avatar-${settings.avatar}`}
                aria-label="Open preferences"
                onClick={() => setModal('settings')}
              >
                {AVATARS[settings.avatar]}
              </button>
            </div>
          </div>
        </header>
        {room && !connected && (
          <div className="connection-banner" role="status">
            <WifiOff size={16} />
            Reconnecting… your seat is reserved for 60 seconds.
          </div>
        )}
        <div id="main-content">
          {!room ? (
            <Home createRoom={() => setModal('create')} joinRoom={join} />
          ) : room.phase === 'lobby' ? (
            <Lobby room={room} />
          ) : (
            <GameTable room={room} />
          )}
        </div>
        {(modal === 'create' || modal === 'join') && (
          <RoomForms
            mode={modal}
            initialCode={joinCode}
            spectate={spectate}
            onClose={() => setModal(null)}
          />
        )}
        {modal === 'settings' && <Settings onClose={() => setModal(null)} />}
        {modal === 'leave' && (
          <Dialog
            title="Calling it a night?"
            subtitle={
              room?.phase === 'playing'
                ? 'A bot will take your seat so your friends can finish the round.'
                : 'You can always find another seat at the club.'
            }
            onClose={() => setModal(null)}
          >
            <div className="leave-actions">
              <button className="button secondary" onClick={() => setModal(null)}>
                <Check size={16} />
                Stay at the table
              </button>
              <button
                className="button primary"
                onClick={async () => {
                  await act('room:leave', {});
                  setModal(null);
                }}
              >
                <LogOut size={16} />
                Leave table
              </button>
            </div>
          </Dialog>
        )}
        {toast && (
          <div role="status" className="toast">
            {toast}
            <button aria-label="Dismiss notification" onClick={() => setToast('')}>
              <X size={16} />
            </button>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
