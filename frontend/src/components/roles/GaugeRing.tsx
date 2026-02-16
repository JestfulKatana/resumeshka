import { useState, useEffect } from 'react';

interface GaugeRingProps {
  score: number;
  color: string;
  size?: number;
}

export default function GaugeRing({ score, color, size = 72 }: GaugeRingProps) {
  const r = (size / 2) - 6;
  const circumference = 2 * Math.PI * r;
  const targetOffset = circumference * (1 - score / 100);

  const [mounted, setMounted] = useState(false);
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    // Trigger animation on next frame after mount
    requestAnimationFrame(() => setMounted(true));

    // Animate counter
    const duration = 800;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayScore(Math.round(eased * score));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 4,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          width: size + 8,
          height: size + 8,
          position: 'relative',
          border: 'var(--nb-border-width) solid var(--border-color)',
          borderRadius: '50%',
          boxShadow: 'var(--shadow-sm)',
          background: 'var(--bg-card)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: size, height: size, position: 'relative' }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              transform: 'rotate(-90deg)',
            }}
          >
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke="var(--border-subtle)"
              strokeWidth={4}
            />
            <circle
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={color}
              strokeWidth={4}
              strokeDasharray={circumference}
              strokeDashoffset={mounted ? targetOffset : circumference}
              strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)' }}
            />
          </svg>
          <span
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              fontWeight: 800,
              color,
              letterSpacing: '-0.5px',
            }}
          >
            {displayScore}
            <span style={{ fontSize: 12, fontWeight: 600, opacity: 0.6 }}>%</span>
          </span>
        </div>
      </div>
    </div>
  );
}
