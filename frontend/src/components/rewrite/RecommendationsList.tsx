import { useState } from 'react';

interface RecommendationsListProps {
  recommendations: string[];
}

export default function RecommendationsList({ recommendations }: RecommendationsListProps) {
  const [expanded, setExpanded] = useState<Set<number>>(() => new Set([0]));

  const toggle = (idx: number) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  return (
    <div>
      <div style={{
        fontSize: 11,
        fontWeight: 700,
        color: 'var(--text-muted)',
        textTransform: 'uppercase',
        letterSpacing: '0.5px',
        marginBottom: 14,
      }}>
        Что ещё улучшить
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {recommendations.map((rec, i) => {
          const isOpen = expanded.has(i);
          return (
            <div
              key={i}
              className="nb-card-static"
              style={{
                padding: 0,
                overflow: 'hidden',
              }}
            >
              {/* Header — always visible */}
              <div
                onClick={() => toggle(i)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 16px',
                  cursor: 'pointer',
                  background: isOpen ? 'var(--bg-elevated)' : 'transparent',
                  transition: 'background 0.15s',
                }}
              >
                <span
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: i === 0 ? 'var(--accent-bg)' : 'var(--bg-secondary)',
                    border: `2px solid ${i === 0 ? 'var(--accent)' : 'var(--border-subtle)'}`,
                    color: i === 0 ? 'var(--accent)' : 'var(--text-muted)',
                    fontSize: 10,
                    fontWeight: 800,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {i === 0 ? '📌' : i + 1}
                </span>
                <span
                  style={{
                    fontSize: 13,
                    fontWeight: 600,
                    color: 'var(--text-secondary)',
                    flex: 1,
                    whiteSpace: isOpen ? 'normal' : 'nowrap',
                    overflow: isOpen ? 'visible' : 'hidden',
                    textOverflow: isOpen ? 'unset' : 'ellipsis',
                  }}
                >
                  {isOpen ? '' : rec}
                </span>
                <span
                  style={{
                    fontSize: 12,
                    color: 'var(--text-muted)',
                    transition: 'transform 0.2s',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
                    flexShrink: 0,
                  }}
                >
                  ▾
                </span>
              </div>

              {/* Body — collapsible */}
              {isOpen && (
                <div style={{ padding: '0 16px 12px 48px', animation: 'fadeIn 0.15s ease' }}>
                  <p style={{
                    fontSize: 13,
                    color: 'var(--text-secondary)',
                    margin: 0,
                    lineHeight: 1.6,
                  }}>
                    {rec}
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
