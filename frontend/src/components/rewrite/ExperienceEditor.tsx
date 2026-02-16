import type { Experience } from '../../types/rewrite';
import CopyButton from '../shared/CopyButton';

interface ExperienceEditorProps {
  experience: Experience;
  isOpen: boolean;
  onToggle: () => void;
  accentColor: string;
}

const pluralHints = (n: number) => {
  if (n === 1) return '1 подсказка';
  if (n >= 2 && n <= 4) return `${n} подсказки`;
  return `${n} подсказок`;
};

export default function ExperienceEditor({
  experience,
  isOpen,
  onToggle,
  accentColor,
}: ExperienceEditorProps) {
  const hints = experience.highlights
    .map((h, i) => ({ ...h, index: i }))
    .filter((h) => h.action !== 'keep');

  const copyText = buildBlockText(experience);

  return (
    <div
      className="nb-card-static"
      style={{
        marginBottom: 12,
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: isOpen ? 'var(--nb-border-width) solid var(--border-subtle)' : 'none',
          cursor: 'pointer',
          background: 'var(--bg-elevated)',
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, flex: 1 }}>
          <div
            style={{
              width: 4,
              height: 36,
              borderRadius: 2,
              background: accentColor,
              flexShrink: 0,
              marginTop: 2,
            }}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>
                {experience.company}
              </span>
              {hints.length > 0 && (
                <span
                  style={{
                    fontSize: 9,
                    fontWeight: 700,
                    color: 'var(--nb-amber)',
                    background: 'color-mix(in srgb, var(--nb-amber) 12%, transparent)',
                    border: '2px solid var(--nb-amber)',
                    padding: '2px 6px',
                    borderRadius: 999,
                    flexShrink: 0,
                  }}
                >
                  {pluralHints(hints.length)}
                </span>
              )}
            </div>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>
              {experience.role}
            </span>
          </div>
        </div>
        <div
          style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          onClick={(e) => e.stopPropagation()}
        >
          <CopyButton text={copyText} />
          <span
            style={{
              fontSize: 11,
              color: 'var(--text-muted)',
              fontFamily: "'JetBrains Mono', monospace",
            }}
          >
            {experience.period}
          </span>
          <span
            style={{
              fontSize: 14,
              color: 'var(--text-muted)',
              transition: 'transform 0.2s',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
              cursor: 'pointer',
            }}
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
          >
            ▾
          </span>
        </div>
      </div>

      {/* Body — two columns */}
      {isOpen && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: hints.length > 0 ? '1fr 240px' : '1fr',
            animation: 'fadeIn 0.2s ease',
          }}
        >
          {/* Left: resume text */}
          <div style={{ padding: '18px 20px' }}>
            {/* Technologies */}
            {experience.technologies && experience.technologies.length > 0 && (
              <div
                style={{
                  marginBottom: 14,
                  display: 'flex',
                  gap: 4,
                  flexWrap: 'wrap',
                }}
              >
                {experience.technologies.map((tech) => (
                  <span
                    key={tech}
                    style={{
                      fontSize: 10,
                      fontWeight: 700,
                      color: 'var(--text-secondary)',
                      background: 'var(--bg-secondary)',
                      border: '2px solid var(--border-subtle)',
                      padding: '2px 8px',
                      borderRadius: 999,
                    }}
                  >
                    {tech}
                  </span>
                ))}
              </div>
            )}

            {/* Numbered bullets — results */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {experience.rewritten_bullets.map((bullet, i) => (
                <div
                  key={i}
                  style={{ display: 'flex', gap: 8, lineHeight: 1.6 }}
                >
                  <span
                    style={{
                      color: 'var(--text-muted)',
                      flexShrink: 0,
                      fontSize: 12,
                      fontWeight: 600,
                      fontFamily: "'JetBrains Mono', monospace",
                      minWidth: 18,
                      textAlign: 'right',
                      lineHeight: 1.6,
                    }}
                  >
                    {i + 1}.
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      color: 'var(--text-secondary)',
                    }}
                    dangerouslySetInnerHTML={{
                      __html: highlightPlaceholders(bullet),
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Responsibilities — below results */}
            {experience.responsibilities.length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    color: 'var(--text-muted)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    marginBottom: 8,
                  }}
                >
                  Обязанности
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {experience.responsibilities.map((resp, i) => (
                    <div
                      key={i}
                      style={{ display: 'flex', gap: 8, lineHeight: 1.5 }}
                    >
                      <span
                        style={{
                          color: 'var(--text-muted)',
                          flexShrink: 0,
                          fontSize: 14,
                          lineHeight: 1.3,
                        }}
                      >
                        ·
                      </span>
                      <span
                        style={{
                          fontSize: 13,
                          color: 'var(--text-secondary)',
                        }}
                      >
                        {resp}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Right: scrollable hints sidebar */}
          {hints.length > 0 && (
            <div
              style={{
                borderLeft: 'var(--nb-border-width) solid var(--nb-amber)',
                padding: '18px 16px',
                background: 'color-mix(in srgb, var(--nb-amber) 5%, var(--bg-card))',
                overflowY: 'auto',
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  color: 'var(--nb-amber)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  marginBottom: 14,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: '50%',
                    background: 'var(--nb-amber)',
                    opacity: 0.6,
                  }}
                />
                Подсказки
                <span style={{ opacity: 0.5, fontWeight: 500 }}>
                  ({hints.length})
                </span>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 14,
                }}
              >
                {hints.map((hint) => (
                  <div key={hint.index}>
                    <div
                      style={{
                        fontSize: 10,
                        color: 'color-mix(in srgb, var(--nb-amber) 60%, transparent)',
                        fontWeight: 700,
                        marginBottom: 3,
                      }}
                    >
                      → буллет {hint.index + 1}
                    </div>
                    <p
                      style={{
                        fontSize: 11,
                        color: 'var(--text-secondary)',
                        lineHeight: 1.5,
                        margin: 0,
                      }}
                    >
                      {hint.comment}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** Highlight [placeholder] text in amber */
function highlightPlaceholders(text: string): string {
  return text.replace(
    /\[([^\]]+)\]/g,
    '<span style="color:var(--nb-amber);background:color-mix(in srgb, var(--nb-amber) 12%, transparent);padding:0 3px;border-radius:2px;border:1px solid var(--nb-amber)">[$1]</span>',
  );
}

/** Build clean copy text for a single experience block */
function buildBlockText(exp: Experience): string {
  const lines: string[] = [];
  lines.push(`${exp.company} — ${exp.role}`);
  lines.push(exp.period);
  lines.push('');
  exp.rewritten_bullets.forEach((b, i) => lines.push(`${i + 1}. ${b}`));
  if (exp.responsibilities.length > 0) {
    lines.push('');
    exp.responsibilities.forEach((r) => lines.push(`• ${r}`));
  }
  return lines.join('\n');
}
