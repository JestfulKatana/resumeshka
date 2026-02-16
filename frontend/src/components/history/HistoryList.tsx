import { useNavigate } from 'react-router-dom';
import type { HistoryEntry } from '../../types/history';

interface HistoryListProps {
  entries: HistoryEntry[];
  onDelete: (taskId: string) => void;
}

export default function HistoryList({ entries, onDelete }: HistoryListProps) {
  const navigate = useNavigate();

  if (entries.length === 0) return null;

  return (
    <div style={{ maxWidth: 500, width: '100%', marginTop: 48 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 800,
          color: 'var(--text-muted)',
          textTransform: 'uppercase',
          letterSpacing: '1px',
          marginBottom: 14,
        }}
      >
        Мои резюме
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {entries.map((entry) => {
          const date = new Date(entry.createdAt);
          const dateStr = date.toLocaleDateString('ru-RU', {
            day: 'numeric',
            month: 'short',
          });
          const timeStr = date.toLocaleTimeString('ru-RU', {
            hour: '2-digit',
            minute: '2-digit',
          });

          const scoreColor =
            entry.score !== null
              ? entry.score < 40
                ? 'var(--nb-critical)'
                : entry.score < 70
                  ? 'var(--nb-major)'
                  : 'var(--nb-success)'
              : 'var(--text-muted)';

          return (
            <div
              key={entry.taskId}
              onClick={() => navigate(`/analysis/${entry.taskId}`)}
              className="nb-card"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 14px',
                cursor: 'pointer',
              }}
            >
              {/* Score circle */}
              <div
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 'var(--nb-radius-sm)',
                  border: '2px solid var(--border-color)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  background: 'var(--bg-elevated)',
                }}
              >
                <span
                  style={{
                    fontSize: 12,
                    fontWeight: 800,
                    fontFamily: "'JetBrains Mono', monospace",
                    color: scoreColor,
                  }}
                >
                  {entry.score !== null ? entry.score : '..'}
                </span>
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 13,
                    fontWeight: 700,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {entry.fileName}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 1 }}>
                  {entry.resumeType && (
                    <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                      {entry.resumeType}
                    </span>
                  )}
                  {entry.hasRewrite && (
                    <span style={{
                      fontSize: 9,
                      fontWeight: 700,
                      color: 'var(--nb-success)',
                      background: 'color-mix(in srgb, var(--nb-success) 10%, transparent)',
                      border: '1.5px solid var(--nb-success)',
                      padding: '1px 6px',
                      borderRadius: 999,
                    }}>
                      Переупаковано ✓
                    </span>
                  )}
                </div>
              </div>

              {/* Date */}
              <div
                style={{
                  fontSize: 11,
                  color: 'var(--text-muted)',
                  textAlign: 'right',
                  flexShrink: 0,
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                <div>{dateStr}</div>
                <div style={{ fontSize: 10 }}>{timeStr}</div>
              </div>

              {/* Delete */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(entry.taskId);
                }}
                style={{
                  width: 26,
                  height: 26,
                  borderRadius: 'var(--nb-radius-sm)',
                  border: '2px solid transparent',
                  background: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  color: 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s',
                  opacity: 0.4,
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.opacity = '1';
                  e.currentTarget.style.color = 'var(--nb-critical)';
                  e.currentTarget.style.borderColor = 'var(--nb-critical)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.opacity = '0.4';
                  e.currentTarget.style.color = 'var(--text-muted)';
                  e.currentTarget.style.borderColor = 'transparent';
                }}
                title="Удалить"
              >
                x
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
