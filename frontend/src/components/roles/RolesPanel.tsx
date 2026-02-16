import { useState, useEffect } from 'react';
import type { RolesResult, MatchLevel } from '../../types/roles';
import GaugeRing from './GaugeRing';

interface RolesPanelProps {
  data: RolesResult;
  onSelectRole: (role: string) => void;
  selectedRole?: string | null;
}

const matchColors: Record<MatchLevel, string> = {
  'высокое': 'var(--nb-success)',
  'среднее': 'var(--nb-amber)',
  'с натяжкой': 'var(--nb-critical)',
};

const pluralMatches = (n: number) => {
  if (n === 1) return '1 совпадение';
  if (n >= 2 && n <= 4) return `${n} совпадения`;
  return `${n} совпадений`;
};

const pluralGaps = (n: number) => {
  if (n === 1) return '1 пробел';
  if (n >= 2 && n <= 4) return `${n} пробела`;
  return `${n} пробелов`;
};

function useIsMobile(breakpoint = 768) {
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false,
  );
  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    setIsMobile(mq.matches);
    return () => mq.removeEventListener('change', handler);
  }, [breakpoint]);
  return isMobile;
}

function BulletList({ items, color }: { items: string[]; color: string }) {
  return (
    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
      {items.map((item, i) => (
        <li
          key={i}
          style={{
            paddingLeft: 14,
            position: 'relative',
            marginBottom: 5,
            fontSize: 12,
            lineHeight: 1.45,
            color: 'var(--text-secondary)',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 0,
              top: 7,
              width: 5,
              height: 5,
              borderRadius: '50%',
              background: color,
            }}
          />
          {item}
        </li>
      ))}
    </ul>
  );
}

const cell = (sel: boolean, hovered: boolean, last = false): React.CSSProperties => ({
  padding: '14px 18px',
  borderBottom: last ? 'none' : 'var(--nb-border-width) solid var(--border-subtle)',
  fontSize: 12,
  color: 'var(--text-secondary)',
  lineHeight: 1.55,
  transition: 'background 0.25s',
  background: sel
    ? 'var(--accent-bg)'
    : hovered
      ? 'var(--bg-card-hover)'
      : 'transparent',
});

const rowLabel = (last = false): React.CSSProperties => ({
  padding: '14px 16px',
  paddingTop: 16,
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  borderBottom: last ? 'none' : 'var(--nb-border-width) solid var(--border-subtle)',
  borderRight: 'var(--nb-border-width) solid var(--border-subtle)',
  display: 'flex',
  alignItems: 'flex-start',
  background: 'var(--bg-elevated)',
  lineHeight: 1.3,
});

const countBadge = (type: 'str' | 'gap'): React.CSSProperties => ({
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  fontSize: 10,
  fontWeight: 700,
  padding: '2px 8px',
  borderRadius: 999,
  marginBottom: 8,
  border: `2px solid ${type === 'str' ? 'var(--nb-success)' : 'var(--nb-coral)'}`,
  color: type === 'str' ? 'var(--nb-success)' : 'var(--nb-coral)',
  background: type === 'str'
    ? 'color-mix(in srgb, var(--nb-success) 10%, transparent)'
    : 'color-mix(in srgb, var(--nb-coral) 10%, transparent)',
});

function Tooltip({ text, children }: { text: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);
  return (
    <div
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            padding: '10px 14px',
            fontSize: 11,
            lineHeight: 1.45,
            color: 'var(--text-primary)',
            background: 'var(--bg-card)',
            border: 'var(--nb-border-width) solid var(--border-color)',
            borderRadius: 'var(--nb-radius-md)',
            whiteSpace: 'nowrap',
            maxWidth: 260,
            textWrap: 'wrap',
            zIndex: 10,
            pointerEvents: 'none',
            boxShadow: 'var(--shadow-card)',
          }}
        >
          {text}
        </div>
      )}
    </div>
  );
}

const sectionLabel: React.CSSProperties = {
  fontSize: 10,
  fontWeight: 700,
  color: 'var(--text-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.6px',
  marginBottom: 10,
};

export default function RolesPanel({ data, onSelectRole, selectedRole }: RolesPanelProps) {
  const primaryRole = data.recommendation.primary_role;
  const isMobile = useIsMobile();
  const [selectedIdx, setSelectedIdx] = useState<number>(() => {
    const idx = data.roles.findIndex((r) => r.role === (selectedRole || primaryRole));
    return idx >= 0 ? idx : 0;
  });

  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  const cols = data.roles.length;
  const selectedRoleName = data.roles[selectedIdx]?.role;
  const alreadyRewritten = selectedRole === selectedRoleName;

  if (isMobile) {
    const role = data.roles[selectedIdx];
    const color = matchColors[role.match_level];
    return (
      <div style={{ animation: 'fadeIn 0.3s ease' }}>
        {/* Tab bar */}
        <div
          style={{
            display: 'flex',
            gap: 6,
            marginBottom: 16,
            overflowX: 'auto',
            WebkitOverflowScrolling: 'touch',
          }}
        >
          {data.roles.map((r, i) => {
            const isSel = i === selectedIdx;
            const isRec = r.role === primaryRole;
            const c = matchColors[r.match_level];
            return (
              <button
                key={r.role}
                onClick={() => setSelectedIdx(i)}
                className={isSel ? 'nb-card' : 'nb-card-static'}
                style={{
                  flex: '1 0 0',
                  minWidth: 0,
                  padding: '12px 10px',
                  cursor: 'pointer',
                  textAlign: 'center',
                  position: 'relative',
                  fontFamily: 'inherit',
                  transition: 'all 0.2s',
                  borderColor: isSel ? 'var(--accent)' : 'var(--border-color)',
                }}
              >
                {isRec && (
                  <div
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: 'var(--accent)',
                      marginBottom: 6,
                    }}
                  >
                    Лучшее
                  </div>
                )}
                <div
                  style={{
                    fontSize: 18,
                    fontWeight: 800,
                    color: c,
                    marginBottom: 4,
                  }}
                >
                  {r.match_score}%
                </div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: isSel ? 700 : 500,
                    color: isSel ? 'var(--text-primary)' : 'var(--text-muted)',
                    lineHeight: 1.3,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {r.role}
                </div>
              </button>
            );
          })}
        </div>

        {/* Selected role card */}
        <div
          className="nb-card-static"
          style={{ overflow: 'hidden' }}
        >
          {/* Header */}
          <div style={{
            padding: '20px 16px',
            textAlign: 'center',
            borderBottom: 'var(--nb-border-width) solid var(--border-subtle)',
          }}>
            <GaugeRing score={role.match_score} color={color} />
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 4 }}>
              {role.role}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
              {role.match_level}
            </div>
          </div>

          {/* Sections */}
          <div style={{ padding: '16px 16px' }}>
            {/* Strengths */}
            <div style={{ marginBottom: 18 }}>
              <div style={sectionLabel}>Сильные стороны</div>
              <span style={countBadge('str')}>+ {pluralMatches(role.strengths.length)}</span>
              <BulletList items={role.strengths} color="var(--nb-success)" />
            </div>

            {/* Gaps */}
            <div style={{ marginBottom: 18 }}>
              <div style={sectionLabel}>Пробелы</div>
              <span style={countBadge('gap')}>{pluralGaps(role.gaps.length)}</span>
              <BulletList items={role.gaps} color="var(--nb-coral)" />
            </div>

            {/* Duties */}
            <div style={{ marginBottom: 18 }}>
              <div style={sectionLabel}>Обязанности</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                {role.typical_duties}
              </div>
            </div>

            {/* Skills */}
            <div style={{ marginBottom: 18 }}>
              <div style={sectionLabel}>Навыки</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {role.matched_skills.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--nb-success)',
                      background: 'color-mix(in srgb, var(--nb-success) 10%, transparent)',
                      border: '2px solid var(--nb-success)',
                      padding: '3px 8px',
                      borderRadius: 999,
                    }}
                  >
                    {t}
                  </span>
                ))}
                {role.missing_skills.map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 10,
                      fontWeight: 600,
                      color: 'var(--text-muted)',
                      background: 'var(--bg-elevated)',
                      border: '2px dashed var(--border-subtle)',
                      padding: '3px 8px',
                      borderRadius: 999,
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            {/* Team */}
            <div style={{ marginBottom: 18 }}>
              <div style={sectionLabel}>В команде</div>
              <div style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>↑</span> {role.reports_to}
                <br />
                <span style={{ color: 'var(--accent)', fontWeight: 600 }}>↔</span> {role.works_with}
              </div>
            </div>
          </div>

          {/* Action */}
          <div style={{ padding: '0 16px 16px' }}>
            {alreadyRewritten ? (
              <button
                className="nb-button nb-button-secondary"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 13,
                  cursor: 'default',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  opacity: 0.7,
                }}
              >
                Уже переупаковано
              </button>
            ) : (
              <button
                className="nb-button nb-button-primary"
                onClick={() => onSelectRole(selectedRoleName)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontSize: 13,
                  textAlign: 'center',
                }}
              >
                Переупаковать под эту роль
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Desktop: grid table
  return (
    <div
      className="nb-card-static"
      style={{
        display: 'grid',
        gridTemplateColumns: `130px repeat(${cols}, 1fr)`,
        overflow: 'hidden',
        animation: 'fadeIn 0.3s ease',
      }}
    >
      {/* HEADER ROW */}
      <div
        style={{
          borderBottom: 'var(--nb-border-width) solid var(--border-subtle)',
          borderRight: 'var(--nb-border-width) solid var(--border-subtle)',
          background: 'var(--bg-elevated)',
        }}
      />
      {data.roles.map((role, i) => {
        const isSel = i === selectedIdx;
        const isHov = hoveredCol === i;
        const isRec = role.role === primaryRole;
        const color = matchColors[role.match_level];
        return (
          <div
            key={role.role}
            onClick={() => setSelectedIdx(i)}
            onMouseEnter={() => setHoveredCol(i)}
            onMouseLeave={() => setHoveredCol(null)}
            style={{
              padding: '28px 20px 24px',
              textAlign: 'center',
              borderBottom: 'var(--nb-border-width) solid var(--border-subtle)',
              borderRight: i < cols - 1 ? 'var(--nb-border-width) solid var(--border-subtle)' : 'none',
              cursor: 'pointer',
              transition: 'background 0.25s',
              background: isSel ? 'var(--accent-bg)' : isHov ? 'var(--bg-card-hover)' : 'transparent',
              opacity: isSel || isHov ? 1 : 0.85,
              position: 'relative',
            }}
          >
            {isSel && (
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 3,
                  background: 'var(--accent)',
                }}
              />
            )}
            {isRec ? (
              <Tooltip text={data.recommendation.reasoning}>
                <div
                  style={{
                    display: 'inline-block',
                    fontSize: 9,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.6px',
                    color: 'var(--accent)',
                    background: 'var(--accent-bg)',
                    border: '2px solid var(--accent-border)',
                    padding: '2px 8px',
                    borderRadius: 999,
                    marginBottom: 14,
                    cursor: 'help',
                  }}
                >
                  Лучшее совпадение
                </div>
              </Tooltip>
            ) : (
              <div style={{ height: 21, marginBottom: 14 }} />
            )}
            <GaugeRing score={role.match_score} color={color} />
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>
              {role.role}
            </div>
          </div>
        );
      })}

      {/* STRENGTHS ROW */}
      <div style={rowLabel()}>Сильные стороны</div>
      {data.roles.map((role, i) => (
        <div key={role.role} style={cell(i === selectedIdx, hoveredCol === i)} onMouseEnter={() => setHoveredCol(i)} onMouseLeave={() => setHoveredCol(null)}>
          <span style={countBadge('str')}>+ {pluralMatches(role.strengths.length)}</span>
          <BulletList items={role.strengths} color="var(--nb-success)" />
        </div>
      ))}

      {/* GAPS ROW */}
      <div style={rowLabel()}>Пробелы</div>
      {data.roles.map((role, i) => (
        <div key={role.role} style={cell(i === selectedIdx, hoveredCol === i)} onMouseEnter={() => setHoveredCol(i)} onMouseLeave={() => setHoveredCol(null)}>
          <span style={countBadge('gap')}>{pluralGaps(role.gaps.length)}</span>
          <BulletList items={role.gaps} color="var(--nb-coral)" />
        </div>
      ))}

      {/* DUTIES ROW */}
      <div style={rowLabel()}>Обязанности</div>
      {data.roles.map((role, i) => (
        <div key={role.role} style={cell(i === selectedIdx, hoveredCol === i)} onMouseEnter={() => setHoveredCol(i)} onMouseLeave={() => setHoveredCol(null)}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {role.typical_duties}
          </div>
        </div>
      ))}

      {/* SKILLS ROW */}
      <div style={rowLabel()}>Навыки</div>
      {data.roles.map((role, i) => {
        const isSel = i === selectedIdx;
        return (
          <div key={role.role} style={cell(isSel, hoveredCol === i)} onMouseEnter={() => setHoveredCol(i)} onMouseLeave={() => setHoveredCol(null)}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {role.matched_skills.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--nb-success)',
                    background: 'color-mix(in srgb, var(--nb-success) 10%, transparent)',
                    border: '2px solid var(--nb-success)',
                    padding: '3px 8px',
                    borderRadius: 999,
                  }}
                >
                  {t}
                </span>
              ))}
              {role.missing_skills.map((t) => (
                <span
                  key={t}
                  style={{
                    fontSize: 10,
                    fontWeight: 600,
                    color: 'var(--text-muted)',
                    background: 'var(--bg-elevated)',
                    border: '2px dashed var(--border-subtle)',
                    padding: '3px 8px',
                    borderRadius: 999,
                  }}
                >
                  {t}
                </span>
              ))}
            </div>
          </div>
        );
      })}

      {/* TEAM ROW */}
      <div style={rowLabel(true)}>В команде</div>
      {data.roles.map((role, i) => (
        <div key={role.role} style={cell(i === selectedIdx, hoveredCol === i, true)} onMouseEnter={() => setHoveredCol(i)} onMouseLeave={() => setHoveredCol(null)}>
          <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>↑</span> {role.reports_to}
            <br />
            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>↔</span> {role.works_with}
          </div>
        </div>
      ))}

      {/* ACTION ROW */}
      <div style={{ borderRight: 'var(--nb-border-width) solid var(--border-subtle)', background: 'var(--bg-elevated)' }} />
      {data.roles.map((role, i) => {
        const isSel = i === selectedIdx;
        return (
          <div key={role.role} style={{ padding: '16px 18px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            {alreadyRewritten && isSel ? (
              <button
                className="nb-button nb-button-secondary"
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: 12,
                  cursor: 'default',
                  textAlign: 'center',
                  color: 'var(--text-muted)',
                  opacity: 0.7,
                }}
              >
                Уже переупаковано
              </button>
            ) : isSel ? (
              <button
                className="nb-button nb-button-primary"
                onClick={() => onSelectRole(selectedRoleName)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: 12,
                }}
              >
                Переупаковать под эту роль
              </button>
            ) : (
              <button
                className="nb-button nb-button-secondary"
                onClick={() => setSelectedIdx(i)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  fontSize: 12,
                }}
              >
                Выбрать
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
