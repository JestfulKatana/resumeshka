import { useState, useCallback } from 'react';
import type { Experience, Skills } from '../../types/rewrite';

interface CopyAllBlockProps {
  summary: string;
  experiences: Experience[];
  skills: Skills;
}

export function buildResumeText(summary: string, experiences: Experience[], skills: Skills): string {
  const parts: string[] = [];

  parts.push('О себе');
  parts.push(summary);
  parts.push('');

  experiences.forEach((exp) => {
    parts.push(`${exp.company} — ${exp.role}`);
    parts.push(exp.period);
    parts.push('');
    exp.rewritten_bullets.forEach((b, i) => parts.push(`${i + 1}. ${b}`));
    if (exp.responsibilities.length > 0) {
      parts.push('');
      exp.responsibilities.forEach((r) => parts.push(`• ${r}`));
    }
    parts.push('');
  });

  parts.push('Ключевые навыки');
  parts.push([...skills.key_competencies, ...skills.tools].join(', '));

  return parts.join('\n').trim();
}

export default function CopyAllBlock({ summary, experiences, skills }: CopyAllBlockProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const text = buildResumeText(summary, experiences, skills);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [text]);

  return (
    <>
      {/* Copy bar */}
      <div
        className="nb-card-static"
        style={{
          padding: 20,
          borderColor: 'var(--nb-success)',
          background: 'color-mix(in srgb, var(--nb-success) 5%, var(--bg-card))',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div
              style={{
                fontSize: 13,
                fontWeight: 700,
                color: 'var(--nb-success)',
                marginBottom: 4,
              }}
            >
              Скопировать всё резюме
            </div>
            <div
              style={{
                fontSize: 11,
                color: 'var(--text-muted)',
              }}
            >
              Чистый текст без подсказок, готовый к вставке на hh.ru / LinkedIn
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              className="nb-button nb-button-secondary"
              onClick={() => setShowPreview(true)}
              style={{
                fontSize: 12,
                padding: '8px 16px',
              }}
            >
              Посмотреть
            </button>
            <button
              className="nb-button nb-button-primary"
              onClick={handleCopy}
              style={{
                fontSize: 12,
                padding: '8px 20px',
                background: copied ? 'var(--nb-success)' : 'var(--accent)',
              }}
            >
              {copied ? 'Скопировано!' : 'Копировать'}
            </button>
          </div>
        </div>
      </div>

      {/* Preview overlay */}
      {showPreview && (
        <div
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowPreview(false);
          }}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'var(--bg-overlay)',
            zIndex: 200,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(8px)',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          <div
            className="nb-card-static"
            style={{
              padding: 24,
              maxWidth: 640,
              width: '90%',
              maxHeight: '80vh',
              overflowY: 'auto',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
                  Предпросмотр копируемого текста
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    marginTop: 4,
                  }}
                >
                  Это то, что попадёт в буфер обмена
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="nb-button nb-button-primary"
                  onClick={() => {
                    handleCopy();
                    setShowPreview(false);
                  }}
                  style={{
                    fontSize: 12,
                    padding: '8px 16px',
                  }}
                >
                  Копировать
                </button>
                <button
                  className="nb-button nb-button-secondary"
                  onClick={() => setShowPreview(false)}
                  style={{
                    fontSize: 12,
                    padding: '8px 16px',
                  }}
                >
                  Закрыть
                </button>
              </div>
            </div>
            <pre
              style={{
                fontFamily: "'SF Mono', 'JetBrains Mono', monospace",
                fontSize: 12,
                color: 'var(--text-secondary)',
                lineHeight: 1.7,
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                background: 'var(--bg-secondary)',
                borderRadius: 'var(--nb-radius-md)',
                padding: 16,
                border: 'var(--nb-border-width) solid var(--border-subtle)',
                margin: 0,
              }}
            >
              {text}
            </pre>
          </div>
        </div>
      )}
    </>
  );
}
