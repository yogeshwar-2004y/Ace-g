'use client';
import { motion } from 'framer-motion';
import type { CSSProperties } from 'react';
import { SUIT_SYMBOL, rankLabel, type Card as CardType } from '@/lib/types';
import { useSettings } from '@/lib/store';
export function CardFace({ card, small = false }: { card: CardType; small?: boolean }) {
  const red = card.suit === 'hearts' || card.suit === 'diamonds';
  const symbol = SUIT_SYMBOL[card.suit];
  return (
    <div className={`card-face ${red ? 'red' : ''} ${small ? 'small' : ''}`}>
      <div className="card-corner">
        <b>{rankLabel(card.rank)}</b>
        <span>{symbol}</span>
      </div>
      <div className={`card-pips ${card.rank > 10 ? 'royal' : ''}`}>
        {card.rank === 14 ? (
          <>
            <span className="ace-symbol">{symbol}</span>
            <small>GETAWAY</small>
          </>
        ) : card.rank > 10 ? (
          <div className="court">
            <span>♛</span>
            <i>{symbol}</i>
          </div>
        ) : (
          Array.from({ length: Math.min(card.rank, 10) }, (_, i) => <span key={i}>{symbol}</span>)
        )}
      </div>
      <div className="card-corner bottom">
        <b>{rankLabel(card.rank)}</b>
        <span>{symbol}</span>
      </div>
    </div>
  );
}
export function CardBack({ className = '' }: { className?: string }) {
  const back = useSettings((s) => s.cardBack);
  return (
    <div className={`card-back ${back} ${className}`}>
      <div className="back-border">
        <span>✦</span>
        <b>G</b>
        <span>✦</span>
      </div>
    </div>
  );
}
export function PlayingCard({
  card,
  playable,
  selected,
  index,
  total,
  onSelect,
  onPlay,
}: {
  card: CardType;
  playable: boolean;
  selected: boolean;
  index: number;
  total: number;
  onSelect: () => void;
  onPlay: () => void;
}) {
  const spread = Math.min(total, 13);
  const rotation = (index - (total - 1) / 2) * (total > 20 ? 0.8 : 2);
  return (
    <motion.button
      className={`hand-card ${playable ? 'playable' : 'muted'} ${selected ? 'selected' : ''}`}
      style={
        {
          '--rotation': `${rotation}deg`,
          '--lift': `${Math.abs(index - (total - 1) / 2) * 2}px`,
          '--overlap': `${Math.max(18, 80 - spread * 4)}px`,
          zIndex: selected ? 100 : index,
        } as CSSProperties
      }
      initial={{ opacity: 0, y: 90 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.035, 0.5) }}
      drag={playable ? 'y' : false}
      dragConstraints={{ top: -120, bottom: 0 }}
      dragSnapToOrigin
      onDragEnd={(_, info) => {
        if (info.offset.y < -65) onPlay();
      }}
      onClick={onSelect}
      onDoubleClick={() => playable && onPlay()}
      onKeyDown={(e) => {
        if (e.key === 'ArrowUp' && playable) {
          e.preventDefault();
          onPlay();
        }
      }}
      aria-label={`${rankLabel(card.rank)} of ${card.suit}${playable ? ', playable' : ', not playable'}${selected ? ', selected' : ''}`}
      aria-pressed={selected}
      aria-disabled={!playable}
    >
      <CardFace card={card} />
    </motion.button>
  );
}
