import type { Severity } from '../../types/analysis';

const config: Record<Severity, { color: string; bg: string; label: string }> = {
  critical: { color: 'var(--nb-critical)', bg: 'color-mix(in srgb, var(--nb-critical) 10%, transparent)', label: 'критично' },
  major: { color: 'var(--nb-major)', bg: 'color-mix(in srgb, var(--nb-major) 10%, transparent)', label: 'важно' },
  minor: { color: 'var(--nb-minor)', bg: 'color-mix(in srgb, var(--nb-minor) 10%, transparent)', label: 'мелочь' },
};

interface SeverityCounterProps {
  counts: Record<Severity, number>;
}

export default function SeverityCounter({ counts }: SeverityCounterProps) {
  return (
    <div style={{ display: 'flex', gap: 8 }}>
      {(Object.entries(counts) as [Severity, number][])
        .filter(([, c]) => c > 0)
        .map(([type, count]) => {
          const c = config[type];
          return (
            <span
              key={type}
              style={{
                fontSize: 12,
                fontWeight: 700,
                color: c.color,
                background: c.bg,
                padding: '3px 10px',
                borderRadius: 999,
                border: `2px solid ${c.color}`,
              }}
            >
              {count} {c.label}
            </span>
          );
        })}
    </div>
  );
}
