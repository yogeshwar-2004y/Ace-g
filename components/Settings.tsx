'use client';
import { Volume2, Music2, Moon, Palette, Languages } from 'lucide-react';
import Dialog from './Dialog';
import { useSettings } from '@/lib/store';
import { unlockAudio } from '@/lib/audio';
import { AVATARS } from '@/lib/types';
export default function Settings({ onClose }: { onClose: () => void }) {
  const s = useSettings();
  return (
    <Dialog
      title="Make yourself at home."
      subtitle="A little atmosphere goes a long way."
      onClose={onClose}
    >
      <div className="settings-list">
        <div className="profile-settings room-form">
          <label>
            Your name
            <input
              autoComplete="nickname"
              maxLength={24}
              placeholder="What should we call you?"
              value={s.name}
              onChange={(e) => s.set({ name: e.target.value })}
            />
          </label>
          <div className="avatar-picker">
            {AVATARS.map((avatar, index) => (
              <button
                key={avatar}
                aria-label={`Profile avatar ${avatar}`}
                aria-pressed={s.avatar === index}
                className={s.avatar === index ? 'chosen' : ''}
                onClick={() => s.set({ avatar: index })}
              >
                {avatar}
              </button>
            ))}
          </div>
          <small>Your name and avatar apply to the next table you join.</small>
        </div>
        {[
          {
            key: 'sound' as const,
            title: 'Sound effects',
            description: 'The shuffle, the play, the sweet escape.',
            icon: Volume2,
          },
          {
            key: 'music' as const,
            title: 'Lounge music',
            description: 'A soft, original ambient soundtrack.',
            icon: Music2,
          },
        ].map((item) => (
          <div className="setting-row" key={item.key}>
            <item.icon size={21} />
            <div>
              <b>{item.title}</b>
              <p>{item.description}</p>
            </div>
            <button
              role="switch"
              aria-checked={s[item.key]}
              aria-label={item.title}
              className={`switch ${s[item.key] ? 'on' : ''}`}
              onClick={() => {
                unlockAudio();
                s.set({ [item.key]: !s[item.key] });
              }}
            >
              <span />
            </button>
          </div>
        ))}
        <div className="setting-row">
          <Moon size={21} />
          <div>
            <b>Table mood</b>
            <p>Choose your kind of after hours.</p>
          </div>
          <select
            aria-label="Table theme"
            value={s.theme}
            onChange={(e) => s.set({ theme: e.target.value as typeof s.theme })}
          >
            <option value="forest">Forest</option>
            <option value="midnight">Midnight</option>
          </select>
        </div>
        <div className="setting-row">
          <Languages size={21} />
          <div>
            <b>Table talk</b>
            <p>Playful end-of-round dialogues.</p>
          </div>
          <select
            aria-label="Dialogue language"
            value={s.language}
            onChange={(e) => s.set({ language: e.target.value as typeof s.language })}
          >
            <option value="en">English</option>
            <option value="ta">தமிழ்</option>
          </select>
        </div>
        <div className="setting-row">
          <Palette size={21} />
          <div>
            <b>Your card backs</b>
            <p>A signature for your hand.</p>
          </div>
        </div>
        <div className="back-picker">
          {(['classic', 'gold', 'ocean'] as const).map((back) => (
            <button
              className={s.cardBack === back ? 'chosen' : ''}
              aria-pressed={s.cardBack === back}
              key={back}
              onClick={() => s.set({ cardBack: back })}
            >
              <div className={`card-back ${back}`}>
                <div className="back-border">
                  <b>G</b>
                </div>
              </div>
              <span>
                {back === 'classic' ? 'Club green' : back === 'gold' ? 'Golden hour' : 'Deep ocean'}
              </span>
            </button>
          ))}
        </div>
      </div>
    </Dialog>
  );
}
