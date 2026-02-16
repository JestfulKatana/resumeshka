import { useState, useRef, useEffect } from 'react';

interface RegeneratePanelProps {
  selectedText: string;
  onSubmit: (comment: string) => void;
  onCancel: () => void;
  isLoading: boolean;
  prefillComment?: string;
}

export default function RegeneratePanel({
  selectedText,
  onSubmit,
  onCancel,
  isLoading,
  prefillComment,
}: RegeneratePanelProps) {
  const [comment, setComment] = useState(prefillComment || '');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (comment.trim()) onSubmit(comment.trim());
    }
    if (e.key === 'Escape') onCancel();
  };

  return (
    <div
      style={{
        marginLeft: 26,
        marginTop: 6,
        marginBottom: 4,
        padding: '12px 14px',
        borderRadius: 'var(--nb-radius-md)',
        background: 'color-mix(in srgb, var(--nb-violet) 6%, var(--bg-card))',
        border: '1.5px solid color-mix(in srgb, var(--nb-violet) 30%, transparent)',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--nb-violet)', marginBottom: 6 }}>
        🔄 Переписать выделенный фрагмент
      </div>
      {selectedText.length < 120 && (
        <div
          style={{
            fontSize: 11,
            color: 'var(--text-muted)',
            marginBottom: 8,
            fontStyle: 'italic',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          «{selectedText}»
        </div>
      )}
      <textarea
        ref={inputRef}
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Что здесь должно быть? Факты, инструкция, пожелание..."
        disabled={isLoading}
        rows={2}
        style={{
          width: '100%',
          fontSize: 12,
          color: 'var(--text-primary)',
          background: 'var(--bg-secondary)',
          border: '1.5px solid var(--border-color)',
          borderRadius: 'var(--nb-radius-sm)',
          padding: '8px 10px',
          outline: 'none',
          fontFamily: 'inherit',
          resize: 'none',
          transition: 'border-color 0.15s',
        }}
      />
      <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
        <button
          onClick={() => comment.trim() && onSubmit(comment.trim())}
          disabled={!comment.trim() || isLoading}
          style={{
            fontSize: 11,
            fontWeight: 700,
            color: '#fff',
            background: 'var(--nb-violet)',
            border: '1.5px solid var(--nb-violet)',
            padding: '5px 12px',
            borderRadius: 'var(--nb-radius-sm)',
            cursor: comment.trim() && !isLoading ? 'pointer' : 'default',
            opacity: comment.trim() && !isLoading ? 1 : 0.5,
          }}
        >
          {isLoading ? 'Генерирую...' : '⚡ Переписать'}
        </button>
        {!isLoading && (
          <button
            onClick={onCancel}
            style={{
              fontSize: 11,
              fontWeight: 600,
              color: 'var(--text-muted)',
              background: 'transparent',
              border: '1.5px solid var(--border-color)',
              padding: '5px 12px',
              borderRadius: 'var(--nb-radius-sm)',
              cursor: 'pointer',
            }}
          >
            Отмена
          </button>
        )}
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Enter — отправить
        </span>
      </div>
    </div>
  );
}
