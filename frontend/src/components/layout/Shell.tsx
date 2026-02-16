import type { ReactNode } from 'react';
import { useState } from 'react';
import { useTheme } from '../../hooks/useTheme';

function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const [animating, setAnimating] = useState(false);

  const handleClick = () => {
    setAnimating(true);
    toggleTheme();
    setTimeout(() => setAnimating(false), 400);
  };

  return (
    <button
      onClick={handleClick}
      aria-label={theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'}
      style={{
        width: 42,
        height: 42,
        borderRadius: 'var(--nb-radius-md)',
        border: 'var(--nb-border-width) solid var(--border-color)',
        boxShadow: 'var(--shadow-button)',
        background: 'var(--bg-card)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 20,
        transition: 'box-shadow 0.15s ease, transform 0.15s ease',
        padding: 0,
      }}
      onMouseDown={(e) => {
        const t = e.currentTarget;
        t.style.boxShadow = 'var(--shadow-button-active)';
        t.style.transform = 'translate(2px, 2px)';
      }}
      onMouseUp={(e) => {
        const t = e.currentTarget;
        t.style.boxShadow = 'var(--shadow-button)';
        t.style.transform = 'translate(0, 0)';
      }}
      onMouseLeave={(e) => {
        const t = e.currentTarget;
        t.style.boxShadow = 'var(--shadow-button)';
        t.style.transform = 'translate(0, 0)';
      }}
    >
      <span
        style={{
          display: 'inline-block',
          animation: animating ? 'themeSwitch 0.4s ease' : 'none',
        }}
      >
        {theme === 'light' ? '\u{1F319}' : '\u{2600}\u{FE0F}'}
      </span>
    </button>
  );
}

export default function Shell({ children }: { children: ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <header
        style={{
          borderBottom: 'var(--nb-border-width) solid var(--header-border)',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          backdropFilter: 'blur(20px)',
          background: 'var(--header-bg)',
          position: 'sticky',
          top: 0,
          zIndex: 50,
          height: 60,
        }}
      >
        <a
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            textDecoration: 'none',
            color: 'inherit',
          }}
        >
          {/* Logo mark */}
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 'var(--nb-radius-md)',
              border: 'var(--nb-border-width) solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 20,
              background: 'var(--nb-violet)',
              color: '#fff',
              fontWeight: 900,
            }}
          >
            P
          </div>
          <div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 900,
                letterSpacing: '-0.5px',
                lineHeight: 1.1,
                color: 'var(--text-primary)',
              }}
            >
              РЕЗЮМЭН
            </div>
            <div
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: 'var(--text-muted)',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
              }}
            >
              AI-скринер резюме
            </div>
          </div>
        </a>

        <ThemeToggle />
      </header>
      <main>{children}</main>
    </div>
  );
}
