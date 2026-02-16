import { useEffect, useRef, useState } from 'react';

interface FloatingToolbarProps {
  anchorRect: DOMRect | null;
  onEdit: () => void;
  onRegenerate: () => void;
  onDismiss: () => void;
}

export default function FloatingToolbar({
  anchorRect,
  onEdit,
  onRegenerate,
  onDismiss,
}: FloatingToolbarProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!anchorRect) {
      setPos(null);
      return;
    }
    const top = anchorRect.top - 42;
    const left = anchorRect.left + anchorRect.width / 2;
    setPos({ top, left });
  }, [anchorRect]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onDismiss();
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onDismiss]);

  if (!pos) return null;

  return (
    <div
      ref={ref}
      style={{
        position: 'fixed',
        top: pos.top,
        left: pos.left,
        transform: 'translateX(-50%)',
        zIndex: 100,
        animation: 'fadeIn 0.1s ease',
      }}
    >
      <div
        style={{
          display: 'inline-flex',
          borderRadius: 'var(--nb-radius-sm)',
          border: 'var(--nb-border-width) solid var(--border-color)',
          overflow: 'hidden',
          boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
          background: 'var(--bg-elevated)',
        }}
      >
        <button onClick={onEdit} style={btnStyle}>
          ✏️ Редактировать
        </button>
        <button onClick={onRegenerate} style={{ ...btnStyle, ...primaryStyle }}>
          🔄 Переписать с AI
        </button>
      </div>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  padding: '6px 14px',
  border: 'none',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  background: 'var(--bg-elevated)',
  color: 'var(--text-secondary)',
  borderRight: '1px solid var(--border-color)',
  transition: 'all 0.15s',
};

const primaryStyle: React.CSSProperties = {
  background: 'var(--nb-violet)',
  color: '#fff',
  borderRight: 'none',
};
