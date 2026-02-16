import { useState, useEffect } from 'react';
import type { ParseResult, ScoringResult, Severity } from '../../types/analysis';
import { gradeFromScore } from '../../types/analysis';
import { useAnimatedScore } from '../../hooks/useAnimatedScore';
import AnnotatedText from './AnnotatedText';
import SeverityCounter from './SeverityCounter';

interface AnalysisPanelProps {
  parse: ParseResult;
  scoring: ScoringResult | null;
  isAnnotating?: boolean;
}

const sectionColors = ['var(--nb-amber)', 'var(--nb-coral)', 'var(--nb-sky)', 'var(--nb-mint)'];

const gradeConfig: Record<string, { color: string; bg: string }> = {
  'Отличное резюме': { color: 'var(--nb-success)', bg: 'color-mix(in srgb, var(--nb-success) 12%, transparent)' },
  'Хорошее резюме': { color: 'var(--nb-success)', bg: 'color-mix(in srgb, var(--nb-success) 12%, transparent)' },
  'Неплохая база': { color: 'var(--nb-amber)', bg: 'color-mix(in srgb, var(--nb-amber) 12%, transparent)' },
  'Есть над чем поработать': { color: 'var(--nb-major)', bg: 'color-mix(in srgb, var(--nb-major) 12%, transparent)' },
  'Нужна серьёзная доработка': { color: 'var(--nb-critical)', bg: 'color-mix(in srgb, var(--nb-critical) 12%, transparent)' },
  // legacy fallbacks
  'Отличное': { color: 'var(--nb-success)', bg: 'color-mix(in srgb, var(--nb-success) 12%, transparent)' },
  'Хорошее': { color: 'var(--nb-success)', bg: 'color-mix(in srgb, var(--nb-success) 12%, transparent)' },
  'Нужна полировка': { color: 'var(--nb-major)', bg: 'color-mix(in srgb, var(--nb-major) 12%, transparent)' },
  'Нужна переработка': { color: 'var(--nb-critical)', bg: 'color-mix(in srgb, var(--nb-critical) 12%, transparent)' },
  'Полная переделка': { color: 'var(--nb-critical)', bg: 'color-mix(in srgb, var(--nb-critical) 12%, transparent)' },
};

function ScoreRadial({ score, max = 100 }: { score: number; max?: number }) {
  const animated = useAnimatedScore(score);
  const size = 120;
  const r = (size - 12) / 2;
  const circ = 2 * Math.PI * r;
  const pct = (animated / max) * 100;
  const color = pct < 40 ? 'var(--nb-critical)' : pct < 70 ? 'var(--nb-major)' : 'var(--nb-success)';

  return (
    <div style={{ position: 'relative', width: size, height: size }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--border-subtle)" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={circ - (circ * pct) / 100}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
        />
      </svg>
      <div style={{
        position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
      }}>
        <span style={{ fontSize: 36, fontWeight: 800, color, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '-2px' }}>
          {animated}
        </span>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', fontWeight: 500 }}>из {max}</span>
      </div>
    </div>
  );
}

function DimensionBar({ name, score, max = 10, delay }: { name: string; score: number; max?: number; delay: number }) {
  const [width, setWidth] = useState(0);
  const pct = (score / max) * 100;
  const color = pct < 30 ? 'var(--nb-critical)' : pct < 50 ? 'var(--nb-major)' : pct < 70 ? 'var(--nb-amber)' : 'var(--nb-success)';

  useEffect(() => {
    const t = setTimeout(() => setWidth(pct), 200 + delay * 80);
    return () => clearTimeout(t);
  }, [pct, delay]);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', width: 170, flexShrink: 0, fontWeight: 500 }}>{name}</span>
      <div style={{
        flex: 1, height: 8, background: 'var(--bg-secondary)',
        borderRadius: 'var(--nb-radius-sm)', overflow: 'hidden',
        border: `2px solid var(--border-color)`,
      }}>
        <div style={{
          height: '100%', width: `${width}%`, background: color, borderRadius: 'var(--nb-radius-sm)',
          transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)',
        }} />
      </div>
      <span style={{
        fontSize: 12, fontFamily: "'JetBrains Mono', monospace", color, fontWeight: 700, width: 28, textAlign: 'right',
      }}>
        {score}
      </span>
    </div>
  );
}

function ScoreSkeleton() {
  return (
    <div style={{
      display: 'flex', gap: 24, alignItems: 'stretch', marginBottom: 28, flexWrap: 'wrap',
    }}>
      {/* Radial skeleton */}
      <div
        className="nb-card-static"
        style={{
          padding: 20, display: 'flex', flexDirection: 'column',
          alignItems: 'center', gap: 8, flexShrink: 0,
        }}
      >
        <div
          className="animate-shimmer"
          style={{
            width: 120, height: 120, borderRadius: '50%',
          }}
        />
        <div
          className="animate-shimmer"
          style={{
            width: 80, height: 20, borderRadius: 'var(--nb-radius-sm)',
          }}
        />
      </div>
      {/* Dimensions skeleton */}
      <div
        className="nb-card-static"
        style={{ flex: 1, minWidth: 280, padding: 20 }}
      >
        {Array.from({ length: 10 }, (_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '5px 0' }}>
            <div
              className="animate-shimmer"
              style={{
                width: 170, height: 12, borderRadius: 3,
                animationDelay: `${i * 0.1}s`,
              }}
            />
            <div
              className="animate-shimmer"
              style={{
                flex: 1, height: 8, borderRadius: 3,
                animationDelay: `${i * 0.1}s`,
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AnalysisPanel({ parse, scoring, isAnnotating }: AnalysisPanelProps) {
  const displayGrade = scoring ? gradeFromScore(scoring.total_score) : null;
  const gc = displayGrade ? (gradeConfig[displayGrade] || gradeConfig['Есть над чем поработать']) : null;

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Score + Verdict block — skeleton or real */}
      {!scoring ? (
        <ScoreSkeleton />
      ) : (
        <>
          <div style={{
            display: 'flex', gap: 24, alignItems: 'stretch', marginBottom: 28, flexWrap: 'wrap',
          }}>
            {/* Score radial — neo-brutalist container */}
            <div
              className="nb-card-static"
              style={{
                padding: 20, display: 'flex', flexDirection: 'column',
                alignItems: 'center', gap: 8, flexShrink: 0,
              }}
            >
              <ScoreRadial score={scoring.total_score} />
              <span
                className="nb-pill"
                style={{
                  color: gc!.color,
                  borderColor: gc!.color,
                  background: gc!.bg,
                }}
              >
                {displayGrade}
              </span>
            </div>

            {/* Dimensions */}
            <div
              className="nb-card-static"
              style={{ flex: 1, minWidth: 280, padding: 20 }}
            >
              {scoring.dimensions.map((dim, i) => (
                <DimensionBar key={dim.name} name={dim.name} score={dim.score} delay={i} />
              ))}
            </div>
          </div>

          {/* Verdict Banner — bordered card */}
          <div
            className="nb-card-static"
            style={{
              borderColor: 'var(--nb-major)',
              padding: 20,
              marginBottom: 28,
              boxShadow: `4px 4px 0 color-mix(in srgb, var(--nb-major) 40%, transparent)`,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{
                fontSize: 14, fontWeight: 700, color: 'var(--nb-major)',
                border: `2px solid var(--nb-major)`,
                borderRadius: 'var(--nb-radius-sm)',
                padding: '2px 8px',
                background: 'color-mix(in srgb, var(--nb-major) 10%, transparent)',
              }}>Вердикт</span>
            </div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65 }}>
              {scoring.verdict}
            </p>
            <p style={{ fontSize: 13, color: 'var(--text-muted)', margin: '8px 0 0', lineHeight: 1.5 }}>
              {parse.main_problem}
            </p>
          </div>
        </>
      )}

      {/* Key Skills block */}
      {parse.key_skills && (
        <div
          className="nb-card-static"
          style={{ padding: 20, marginBottom: 28 }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 14 }}>
            Навыки кандидата
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {parse.key_skills.hard_skills.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--nb-sky)', fontWeight: 600, marginBottom: 6 }}>Инструменты</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {parse.key_skills.hard_skills.map((s) => (
                    <span key={s} style={{
                      fontSize: 12, color: 'var(--text-primary)', fontWeight: 500,
                      background: 'color-mix(in srgb, var(--nb-sky) 10%, transparent)',
                      border: `2px solid var(--nb-sky)`,
                      padding: '3px 10px', borderRadius: 'var(--nb-radius-sm)',
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            {parse.key_skills.soft_skills.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--nb-mint)', fontWeight: 600, marginBottom: 6 }}>Компетенции</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {parse.key_skills.soft_skills.map((s) => (
                    <span key={s} style={{
                      fontSize: 12, color: 'var(--text-primary)', fontWeight: 500,
                      background: 'color-mix(in srgb, var(--nb-mint) 10%, transparent)',
                      border: `2px solid var(--nb-mint)`,
                      padding: '3px 10px', borderRadius: 'var(--nb-radius-sm)',
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
            {parse.key_skills.domain_knowledge.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: 'var(--nb-amber)', fontWeight: 600, marginBottom: 6 }}>Отраслевая экспертиза</div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {parse.key_skills.domain_knowledge.map((s) => (
                    <span key={s} style={{
                      fontSize: 12, color: 'var(--text-primary)', fontWeight: 500,
                      background: 'color-mix(in srgb, var(--nb-amber) 10%, transparent)',
                      border: `2px solid var(--nb-amber)`,
                      padding: '3px 10px', borderRadius: 'var(--nb-radius-sm)',
                    }}>{s}</span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Annotation hint — show only when annotations exist */}
      {parse.sections.some(s => s.annotations.length > 0) && (
        <div
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            marginBottom: 20,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <span
            style={{
              display: 'inline-block',
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: 'var(--nb-success)',
              animation: 'pulse-subtle 2s ease-in-out infinite',
            }}
          />
          Кликайте на выделенные фрагменты, чтобы увидеть комментарии
        </div>
      )}

      {/* Sections with annotated text */}
      {parse.sections.map((section, si) => {
        // Only count annotations whose original_text actually exists in the section text
        const sectionText = section.full_text || '';
        const matchedAnnotations = section.annotations.filter(
          (a) => sectionText.includes(a.original_text)
        );
        const hasAnnotations = matchedAnnotations.length > 0;
        const sectionCounts: Record<Severity, number> = { critical: 0, major: 0, minor: 0 };
        matchedAnnotations.forEach((a) => sectionCounts[a.type]++);

        return (
          <div
            key={section.block_id}
            style={{ marginBottom: 32, position: 'relative' }}
            className="animate-slide-up"
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
              <div
                style={{
                  width: 6,
                  height: 22,
                  borderRadius: 'var(--nb-radius-sm)',
                  background: sectionColors[si % sectionColors.length],
                  border: `2px solid var(--border-color)`,
                }}
              />
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, letterSpacing: '-0.3px', color: 'var(--text-primary)' }}>
                {section.section_title}
              </h2>
              {section.period && (
                <span
                  style={{
                    fontSize: 11,
                    color: 'var(--text-muted)',
                    fontFamily: "'JetBrains Mono', monospace",
                    marginLeft: 'auto',
                  }}
                >
                  {section.period}
                </span>
              )}
            </div>

            <div
              className="nb-card-static"
              style={{
                padding: 20,
                overflow: 'visible',
                position: 'relative',
              }}
            >
              {/* Shimmer overlay while annotating */}
              {isAnnotating && !hasAnnotations && (
                <div style={{
                  position: 'absolute', inset: 0, borderRadius: 'var(--nb-radius-lg)',
                  overflow: 'hidden', pointerEvents: 'none',
                }}>
                  <div className="animate-shimmer" style={{
                    position: 'absolute', inset: 0,
                  }} />
                </div>
              )}

              <AnnotatedText
                text={section.full_text || section.annotations.map((a) => a.original_text).join(' ')}
                annotations={section.annotations}
                blockId={`section-${section.block_id}`}
              />
              {hasAnnotations && (
                <div style={{ marginTop: 12 }}>
                  <SeverityCounter counts={sectionCounts} />
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
