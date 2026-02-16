import { useState, useEffect } from 'react';

interface StepProgressProps {
  messages: string[];
  intervalMs?: number;
}

export default function StepProgress({ messages, intervalMs = 2800 }: StepProgressProps) {
  const [index, setIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const timer = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setIndex((prev) => (prev + 1) % messages.length);
        setFade(true);
      }, 300);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [messages.length, intervalMs]);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 28,
        padding: '48px 32px',
      }}
      className="animate-fade-in"
    >
      {/* Avatar */}
      <div style={{
        width: 56, height: 56,
        borderRadius: 'var(--nb-radius-md)',
        border: 'var(--nb-border-width) solid var(--border-color)',
        boxShadow: 'var(--shadow-card)',
        background: 'var(--nb-violet)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 24,
        fontWeight: 900,
        color: '#fff',
        animation: 'wiggle 2s ease-in-out infinite',
      }}>
        R
      </div>

      {/* Speech bubble */}
      <div style={{
        position: 'relative',
        background: 'var(--bg-card)',
        border: 'var(--nb-border-width) solid var(--border-color)',
        borderRadius: 'var(--nb-radius-lg)',
        boxShadow: 'var(--shadow-card)',
        padding: '14px 24px',
        minWidth: 240,
        textAlign: 'center',
      }}>
        {/* Arrow pointing up */}
        <div style={{
          position: 'absolute',
          top: -10,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '10px solid transparent',
          borderRight: '10px solid transparent',
          borderBottom: 'var(--nb-border-width) solid var(--border-color)',
        }} />
        <div style={{
          position: 'absolute',
          top: -7,
          left: '50%',
          transform: 'translateX(-50%)',
          width: 0, height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderBottom: '8px solid var(--bg-card)',
        }} />

        <div
          style={{
            fontSize: 15,
            fontWeight: 600,
            color: 'var(--text-secondary)',
            height: 22,
            transition: 'opacity 0.3s ease',
            opacity: fade ? 1 : 0,
          }}
        >
          {messages[index]}
        </div>

        {/* Typing dots */}
        <div style={{
          display: 'flex',
          justifyContent: 'center',
          gap: 4,
          marginTop: 10,
        }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: 6, height: 6,
                borderRadius: '50%',
                background: 'var(--accent)',
                opacity: 0.4,
                animation: `dotBounce 1.2s ease-in-out ${i * 0.15}s infinite`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: 200,
          height: 6,
          background: 'var(--bg-elevated)',
          border: '2px solid var(--border-color)',
          borderRadius: 'var(--nb-radius-sm)',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            height: '100%',
            background: 'var(--accent)',
            animation: 'progressSlide 2s ease-in-out infinite',
          }}
        />
      </div>

      <style>{`
        @keyframes progressSlide {
          0% { width: 0%; margin-left: 0%; }
          50% { width: 60%; margin-left: 20%; }
          100% { width: 0%; margin-left: 100%; }
        }
      `}</style>
    </div>
  );
}
