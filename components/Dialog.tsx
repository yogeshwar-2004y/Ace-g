'use client';
import { useEffect, useRef, type ReactNode } from 'react';
import { motion } from 'framer-motion';
import { X } from 'lucide-react';
export default function Dialog({
  title,
  subtitle,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.querySelector<HTMLElement>('input, button, select')?.focus();
    const keydown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeRef.current();
      if (e.key === 'Tab') {
        const items = [
          ...(ref.current?.querySelectorAll<HTMLElement>(
            'button:not(:disabled), input, select, a[href], [tabindex="0"]',
          ) ?? []),
        ];
        const first = items[0];
        const last = items.at(-1);
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', keydown);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="modal-scrim"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <motion.div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className={`dialog ${wide ? 'wide' : ''}`}
        initial={{ opacity: 0, y: 24, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
      >
        <button className="icon-button dialog-close" aria-label="Close dialog" onClick={onClose}>
          <X size={20} />
        </button>
        <div className="eyebrow">THE GETAWAY CLUB</div>
        <h2 id="dialog-title">{title}</h2>
        {subtitle && <p className="dialog-subtitle">{subtitle}</p>}
        {children}
      </motion.div>
    </div>
  );
}
