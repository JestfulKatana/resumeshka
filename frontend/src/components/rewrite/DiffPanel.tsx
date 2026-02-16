interface DiffPanelProps {
  oldText: string;
  newText: string;
  onAccept: () => void;
  onReject: () => void;
  onRetry: () => void;
  onEdit: () => void;
}

export default function DiffPanel({
  oldText,
  newText,
  onAccept,
  onReject,
  onRetry,
  onEdit,
}: DiffPanelProps) {
  return (
    <div
      style={{
        marginLeft: 26,
        marginTop: 6,
        marginBottom: 4,
        borderRadius: 'var(--nb-radius-md)',
        overflow: 'hidden',
        border: '1.5px solid color-mix(in srgb, var(--nb-success) 30%, transparent)',
        animation: 'fadeIn 0.15s ease',
      }}
    >
      <div
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: 'var(--nb-success)',
          padding: '8px 14px',
          background: 'color-mix(in srgb, var(--nb-success) 6%, var(--bg-card))',
          borderBottom: '1px solid color-mix(in srgb, var(--nb-success) 15%, transparent)',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>✨ Новый вариант</span>
        <span style={{ opacity: 0.6 }}>на основе вашего комментария</span>
      </div>

      <div
        style={{
          padding: '10px 14px',
          background: 'color-mix(in srgb, var(--nb-success) 3%, var(--bg-card))',
        }}
      >
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            textDecoration: 'line-through',
            lineHeight: 1.5,
          }}
        >
          {oldText}
        </div>
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-primary)',
            lineHeight: 1.5,
            marginTop: 6,
            fontWeight: 500,
          }}
        >
          → {newText}
        </div>
      </div>

      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '8px 14px',
          background: 'color-mix(in srgb, var(--nb-success) 3%, var(--bg-card))',
          borderTop: '1px solid color-mix(in srgb, var(--nb-success) 10%, transparent)',
        }}
      >
        <button onClick={onAccept} style={{ ...btnBase, background: 'var(--nb-success)', color: 'var(--bg)', borderColor: 'var(--nb-success)' }}>
          ✓ Принять
        </button>
        <button onClick={onReject} style={{ ...btnBase, color: 'var(--text-muted)', borderColor: 'var(--border-color)' }}>
          ✕ Отклонить
        </button>
        <button onClick={onRetry} style={{ ...btnBase, color: 'var(--nb-violet)', borderColor: 'color-mix(in srgb, var(--nb-violet) 40%, transparent)' }}>
          🔄 Ещё вариант
        </button>
        <button onClick={onEdit} style={{ ...btnBase, color: 'var(--nb-sky)', borderColor: 'color-mix(in srgb, var(--nb-sky) 40%, transparent)', marginLeft: 'auto' }}>
          ✏️ Редактировать
        </button>
      </div>
    </div>
  );
}

const btnBase: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  padding: '5px 12px',
  borderRadius: 'var(--nb-radius-sm)',
  cursor: 'pointer',
  border: '1.5px solid',
  background: 'transparent',
};
