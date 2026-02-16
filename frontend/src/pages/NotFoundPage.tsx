import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '100px 24px',
      textAlign: 'center',
    }}>
      {/* 404 badge */}
      <div style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px 32px',
        background: 'var(--bg-card)',
        border: 'var(--nb-border-width) solid var(--border-color)',
        borderRadius: 'var(--nb-radius-xl)',
        boxShadow: 'var(--shadow-card)',
        transform: 'rotate(-2deg)',
        marginBottom: 28,
      }}>
        <span style={{
          fontSize: 56,
          fontWeight: 900,
          color: 'var(--text-muted)',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '-2px',
        }}>
          404
        </span>
      </div>

      <p style={{
        fontSize: 18,
        fontWeight: 700,
        color: 'var(--text-primary)',
        marginBottom: 8,
      }}>
        Резюмэн не нашёл эту страницу
      </p>
      <p style={{
        fontSize: 14,
        color: 'var(--text-muted)',
        marginBottom: 32,
      }}>
        Может, ты заблудился? Давай вернёмся на главную
      </p>

      <Link
        to="/"
        className="nb-button nb-button-primary"
        style={{ textDecoration: 'none' }}
      >
        Вернуться на главную
      </Link>
    </div>
  );
}
