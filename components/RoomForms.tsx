'use client';
import { useState, type FormEvent } from 'react';
import { ArrowRight, Check, Copy, Globe2, LockKeyhole, LoaderCircle } from 'lucide-react';
import Dialog from './Dialog';
import { request, useSettings, useGame } from '@/lib/store';
import { AVATARS } from '@/lib/types';
export function CopyCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      className="copy-code"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        } catch {
          useGame.getState().setToast(`Your room code is ${code}`);
        }
      }}
      aria-label="Copy room code"
    >
      {code}
      {copied ? <Check size={16} /> : <Copy size={16} />}
    </button>
  );
}
export default function RoomForms({
  mode,
  initialCode = '',
  spectate = false,
  onClose,
}: {
  mode: 'create' | 'join';
  initialCode?: string;
  spectate?: boolean;
  onClose: () => void;
}) {
  const settings = useSettings();
  const [name, setName] = useState(settings.name);
  const [avatar, setAvatar] = useState(settings.avatar);
  const [roomName, setRoomName] = useState('The After Hours Club');
  const [code, setCode] = useState(initialCode);
  const [maxPlayers, setMaxPlayers] = useState(6);
  const [isPrivate, setPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [penalty, setPenalty] = useState(false);
  const [watch, setWatch] = useState(spectate);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      settings.set({ name: name.trim(), avatar });
      if (mode === 'create')
        await request('room:create', {
          name,
          avatar,
          nameRoom: roomName,
          maxPlayers,
          isPrivate,
          password,
          penalty,
        });
      else await request('room:join', { name, avatar, code, password, spectate: watch });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not join. Please try again.');
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog
      title={mode === 'create' ? 'Your table. Your people.' : 'Pull up a chair.'}
      subtitle={
        mode === 'create'
          ? 'A good game starts with great company.'
          : 'Six characters between you and a great game.'
      }
      onClose={onClose}
    >
      <form onSubmit={submit} className="room-form">
        <label>
          Your name
          <input
            autoComplete="nickname"
            required
            maxLength={24}
            placeholder="What should we call you?"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        <fieldset>
          <legend>Pick your table personality</legend>
          <div className="avatar-picker">
            {AVATARS.map((a, i) => (
              <button
                type="button"
                key={a}
                className={avatar === i ? 'chosen' : ''}
                aria-label={`Avatar ${a}`}
                aria-pressed={avatar === i}
                onClick={() => setAvatar(i)}
              >
                {a}
              </button>
            ))}
          </div>
        </fieldset>
        {mode === 'create' ? (
          <>
            <label>
              Room name
              <input
                required
                maxLength={40}
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
              />
            </label>
            <div className="form-columns">
              <label>
                Seats at the table
                <select value={maxPlayers} onChange={(e) => setMaxPlayers(Number(e.target.value))}>
                  {[3, 4, 5, 6, 7, 8].map((n) => (
                    <option key={n} value={n}>
                      {n} players
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Visibility
                <select
                  value={isPrivate ? 'private' : 'public'}
                  onChange={(e) => setPrivate(e.target.value === 'private')}
                >
                  <option value="public">Public room</option>
                  <option value="private">Private room</option>
                </select>
              </label>
            </div>
            <div className="field-note">
              {isPrivate ? <LockKeyhole size={14} /> : <Globe2 size={14} />}
              {isPrivate
                ? 'Only people with your code can find this table.'
                : 'Your table will appear in the open tables list.'}
            </div>
          </>
        ) : (
          <label>
            Room code
            <input
              className="code-input"
              required
              pattern="[A-Za-z2-9]{6}"
              maxLength={6}
              placeholder="K7X9P2"
              autoCapitalize="characters"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g, ''))}
            />
          </label>
        )}
        <label>
          {mode === 'create' ? 'Password (optional)' : 'Room password (if required)'}
          <input
            type="password"
            autoComplete={mode === 'create' ? 'new-password' : 'current-password'}
            maxLength={64}
            placeholder="A little extra privacy"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {mode === 'create' ? (
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={penalty}
              onChange={(e) => setPenalty(e.target.checked)}
            />
            <span>
              One more for the last one<small>Last player gets one extra card next round.</small>
            </span>
          </label>
        ) : (
          <label className="checkbox-row">
            <input type="checkbox" checked={watch} onChange={(e) => setWatch(e.target.checked)} />
            <span>
              Just here to watch<small>Join as a spectator. Chat and enjoy the drama.</small>
            </span>
          </label>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button primary full" disabled={busy}>
          {busy ? (
            <LoaderCircle className="spin" size={18} />
          ) : (
            <>
              {mode === 'create' ? 'Create my room' : watch ? 'Watch the table' : 'Join the table'}
              <ArrowRight size={18} />
            </>
          )}
        </button>
      </form>
    </Dialog>
  );
}
