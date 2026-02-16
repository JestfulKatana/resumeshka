import { useAnimatedScore } from '../../hooks/useAnimatedScore';

interface ScoreDeltaProps {
  score: number;
  delta: number;
}

export default function ScoreDelta({ score, delta }: ScoreDeltaProps) {
  const animated = useAnimatedScore(score);
  const deltaColor = delta > 0 ? 'var(--nb-success)' : delta < 0 ? 'var(--nb-critical)' : 'var(--text-muted)';

  return (
    <div
      className="nb-card-static"
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: 20,
      }}
    >
      <div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 600, marginBottom: 4 }}>
          Обновлённый балл
        </div>
        <div style={{ fontSize: 36, fontWeight: 800, fontFamily: "'JetBrains Mono', monospace", color: 'var(--text-primary)', letterSpacing: '-2px' }}>
          {animated}
        </div>
      </div>
      <div
        style={{
          fontSize: 18,
          fontWeight: 800,
          fontFamily: "'JetBrains Mono', monospace",
          color: deltaColor,
          background: `color-mix(in srgb, ${deltaColor} 10%, transparent)`,
          border: `2px solid ${deltaColor}`,
          borderRadius: 'var(--nb-radius-sm)',
          padding: '4px 10px',
        }}
      >
        {delta > 0 ? '+' : ''}{delta}
      </div>
    </div>
  );
}
