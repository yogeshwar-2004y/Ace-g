'use client';
import { useEffect, useRef, useState } from 'react';
import { MessageCircle, Send, X } from 'lucide-react';
import { act } from '@/lib/store';
import type { RoomView } from '@/lib/types';
export default function Chat({ room, onClose }: { room: RoomView; onClose?: () => void }) {
  const [text, setText] = useState('');
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [room.messages.length]);
  return (
    <section className="chat-panel" aria-label="Table chat">
      <div className="chat-header">
        <h3>
          <MessageCircle size={18} /> Table talk
        </h3>
        {onClose ? (
          <button className="icon-button" aria-label="Close chat" onClick={onClose}>
            <X size={18} />
          </button>
        ) : (
          <span className="live-dot" />
        )}
      </div>
      <div className="chat-messages" role="log" aria-live="polite">
        {room.messages.map((m) => (
          <div className={`chat-message ${m.system ? 'system' : ''}`} key={m.id}>
            {!m.system && <b>{m.name}</b>}
            <p>{m.text}</p>
          </div>
        ))}
        <div ref={end} />
      </div>
      <form
        className="chat-input"
        onSubmit={(e) => {
          e.preventDefault();
          if (text.trim()) {
            void act('chat:send', text);
            setText('');
          }
        }}
      >
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          aria-label="Chat message"
          placeholder="A little friendly banter…"
        />
        <button
          type="submit"
          className="icon-button"
          disabled={!text.trim()}
          aria-label="Send message"
        >
          <Send size={17} />
        </button>
      </form>
      <small className="chat-kind">Good games. Kind people. Keep it friendly.</small>
    </section>
  );
}
