import { useState, useEffect, useMemo } from 'react';
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

const pluralStrengths = (n: number) => {
  if (n === 1) return '1 сильная сторона';
  if (n >= 2 && n <= 4) return `${n} сильные стороны`;
  return `${n} сильных сторон`;
};

const pluralGrowth = (n: number) => {
  if (n === 1) return '1 зона роста';
  if (n >= 2 && n <= 4) return `${n} зоны роста`;
  return `${n} зон роста`;
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

/** Max strengths shown in compact mode */
const COMPACT_STRENGTHS = 3;

function CustomRoleInput({ onSelectRole }: { onSelectRole: (role: string) => void }) {
  const [value, setValue] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (trimmed) onSelectRole(trimmed);
  };

  return (
    <div
      className="nb-card-static"
      style={{ marginTop: 20, overflow: 'hidden' }}
    >
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          padding: '14px 18px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          background: 'var(--bg-elevated)',
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>
          Не нашли свою роль?
        </span>
        <span
          style={{
            fontSize: 12,
            color: 'var(--text-muted)',
            transition: 'transform 0.2s',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
          }}
        >
          ▾
        </span>
      </div>
      {isOpen && (
        <div style={{ padding: '14px 18px', animation: 'fadeIn 0.15s ease' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 12px', lineHeight: 1.5 }}>
            Укажите должность или вставьте название вакансии — мы переупакуем резюме под неё.
          </p>
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
              placeholder="Например: Product Manager, Аналитик данных..."
              className="nb-input"
              style={{
                flex: 1,
                fontSize: 13,
                padding: '10px 14px',
              }}
            />
            <button
              onClick={handleSubmit}
              disabled={!value.trim()}
              className="nb-button nb-button-primary"
              style={{
                flexShrink: 0,
                opacity: value.trim() ? 1 : 0.4,
                cursor: value.trim() ? 'pointer' : 'default',
              }}
            >
              Переупаковать →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RolesPanel({ data, onSelectRole, selectedRole }: RolesPanelProps) {
  const primaryRole = data.recommendation?.primary_role ?? data.roles[0]?.role ?? '';
  const isMobile = useIsMobile();

  // Sort roles by match_score descending
  const sortedRoles = useMemo(
    () => [...data.roles].sort((a, b) => b.match_score - a.match_score),
    [data.roles],
  );

  // Determine if the AI recommendation differs from the highest-score role
  const highestScoreRole = sortedRoles[0]?.role;
  const aiRecDiffersFromBest = primaryRole !== highestScoreRole;

  const [selectedIdx, setSelectedIdx] = useState<number>(() => {
    const idx = sortedRoles.findIndex((r) => r.role === (selectedRole || primaryRole));
    return idx >= 0 ? idx : 0;
  });

  const [hoveredCol, setHoveredCol] = useState<number | null>(null);

  // Desktop compact/expand state — all collapsed by default
  const [expandedCols, setExpandedCols] = useState<Set<number>>(new Set());

  const toggleExpand = (i: number) => {
    setExpandedCols((prev) => {
      const next = new Set(prev);
      if (next.has(i)) {
        next.delete(i);
      } else {
        next.add(i);
      }
      return next;
    });
  };

  const cols = sortedRoles.length;
  const selectedRoleName = sortedRoles[selectedIdx]?.role;
  const alreadyRewritten = selectedRole === selectedRoleName;

  // Check if ANY column is expanded (to know if detail rows should render)
  const anyExpanded = expandedCols.size > 0;

  if (isMobile) {
    const role = sortedRoles[selectedIdx];
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
          {sortedRoles.map((r, i) => {
            const isSel = i === selectedIdx;
            const isBest = i === 0;
            const isAiRec = aiRecDiffersFromBest && r.role === primaryRole;
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
                {isBest && (
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
                    ⭐ Лучший
                  </div>
                )}
                {isAiRec && (
                  <div
                    style={{
                      fontSize: 8,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: 'var(--nb-amber)',
                      marginBottom: 6,
                    }}
                  >
                    ⭐ AI
                  </div>
                )}
                {!isBest && !isAiRec && (
                  <div style={{ height: 0, marginBottom: 0 }} />
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
              <div style={sectionLabel}>Ваши сильные стороны</div>
              <span style={countBadge('str')}>+ {pluralStrengths(role.strengths.length)}</span>
              <BulletList items={role.strengths} color="var(--nb-success)" />
            </div>

            {/* Gaps */}
            <div style={{ marginBottom: 18 }}>
              <div style={sectionLabel}>Что стоит подтянуть</div>
              <span style={countBadge('gap')}>{pluralGrowth(role.gaps.length)}</span>
              <BulletList items={role.gaps} color="var(--nb-coral)" />
            </div>

            {/* Duties */}
            <div style={{ marginBottom: 18 }}>
              <div style={sectionLabel}>Типичные задачи роли</div>
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
                Переупаковать под эту роль →
              </button>
            )}
          </div>
        </div>

        {/* Custom role */}
        <CustomRoleInput onSelectRole={onSelectRole} />
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
      {sortedRoles.map((role, i) => {
        const isSel = i === selectedIdx;
        const isHov = hoveredCol === i;
        const isBest = i === 0;
        const isAiRec = aiRecDiffersFromBest && role.role === primaryRole;
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
            {/* Badges area */}
            <div style={{ minHeight: 21, marginBottom: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              {isBest && (
                <Tooltip text={!aiRecDiffersFromBest ? data.recommendation?.reasoning ?? '' : 'Наивысший балл совпадения'}>
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
                      cursor: 'help',
                    }}
                  >
                    ⭐ Лучший вариант
                  </div>
                </Tooltip>
              )}
              {isAiRec && (
                <Tooltip text={data.recommendation?.reasoning ?? ''}>
                  <div
                    style={{
                      display: 'inline-block',
                      fontSize: 9,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.6px',
                      color: 'var(--nb-amber)',
                      background: 'color-mix(in srgb, var(--nb-amber) 10%, transparent)',
                      border: '2px solid var(--nb-amber)',
                      padding: '2px 8px',
                      borderRadius: 999,
                      cursor: 'help',
                    }}
                  >
                    ⭐ Рекомендация AI
                  </div>
                </Tooltip>
              )}
            </div>
            <GaugeRing score={role.match_score} color={color} />
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1.35 }}>
              {role.role}
            </div>
          </div>
        );
      })}

      {/* COMPACT STRENGTHS ROW — always visible, max 3 items */}
      <div style={rowLabel()}>Ваши сильные стороны</div>
      {sortedRoles.map((role, i) => (
        <div key={role.role} style={cell(i === selectedIdx, hoveredCol === i)} onMouseEnter={() => setHoveredCol(i)} onMouseLeave={() => setHoveredCol(null)}>
          <span style={countBadge('str')}>+ {pluralStrengths(role.strengths.length)}</span>
          <BulletList items={role.strengths.slice(0, COMPACT_STRENGTHS)} color="var(--nb-success)" />
        </div>
      ))}

      {/* TOGGLE ROW — "Подробнее ▾" / "Свернуть ▴" */}
      <div
        style={{
          borderBottom: 'var(--nb-border-width) solid var(--border-subtle)',
          borderRight: 'var(--nb-border-width) solid var(--border-subtle)',
          background: 'var(--bg-elevated)',
        }}
      />
      {sortedRoles.map((role, i) => {
        const isExpanded = expandedCols.has(i);
        return (
          <div
            key={role.role}
            style={{
              padding: '8px 18px',
              borderBottom: 'var(--nb-border-width) solid var(--border-subtle)',
              borderRight: i < cols - 1 ? 'var(--nb-border-width) solid var(--border-subtle)' : 'none',
              textAlign: 'center',
              transition: 'background 0.25s',
              background: i === selectedIdx
                ? 'var(--accent-bg)'
                : hoveredCol === i
                  ? 'var(--bg-card-hover)'
                  : 'transparent',
            }}
            onMouseEnter={() => setHoveredCol(i)}
            onMouseLeave={() => setHoveredCol(null)}
          >
            <button
              onClick={(e) => { e.stopPropagation(); toggleExpand(i); }}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 600,
                color: 'var(--accent)',
                padding: '2px 8px',
                fontFamily: 'inherit',
              }}
            >
              {isExpanded ? 'Свернуть \u25B4' : 'Подробнее \u25BE'}
            </button>
          </div>
        );
      })}

      {/* EXPANDED DETAIL ROWS — only rendered for columns that are expanded */}
      {/* We render the full grid rows but hide content in collapsed columns */}

      {/* REMAINING STRENGTHS ROW (items beyond first 3) */}
      {anyExpanded && (
        <>
          <div style={{
            ...rowLabel(),
            visibility: 'hidden',
            fontSize: 0,
            padding: '0 16px',
          }}>
            {/* empty label — strengths label already shown above */}
          </div>
          {sortedRoles.map((role, i) => {
            const isExpanded = expandedCols.has(i);
            const remaining = role.strengths.slice(COMPACT_STRENGTHS);
            if (!isExpanded || remaining.length === 0) {
              return (
                <div
                  key={role.role}
                  style={{
                    ...cell(i === selectedIdx, hoveredCol === i),
                    padding: isExpanded ? '0 18px' : '0',
                    height: isExpanded ? 'auto' : 0,
                    overflow: 'hidden',
                    borderBottom: isExpanded
                      ? 'var(--nb-border-width) solid var(--border-subtle)'
                      : 'none',
                  }}
                  onMouseEnter={() => setHoveredCol(i)}
                  onMouseLeave={() => setHoveredCol(null)}
                />
              );
            }
            return (
              <div
                key={role.role}
                style={cell(i === selectedIdx, hoveredCol === i)}
                onMouseEnter={() => setHoveredCol(i)}
                onMouseLeave={() => setHoveredCol(null)}
              >
                <BulletList items={remaining} color="var(--nb-success)" />
              </div>
            );
          })}
        </>
      )}

      {/* GAPS ROW */}
      {anyExpanded && (
        <>
          <div style={rowLabel()}>Что стоит подтянуть</div>
          {sortedRoles.map((role, i) => {
            const isExpanded = expandedCols.has(i);
            return (
              <div
                key={role.role}
                style={{
                  ...cell(i === selectedIdx, hoveredCol === i),
                  ...(isExpanded ? {} : { padding: '14px 18px' }),
                }}
                onMouseEnter={() => setHoveredCol(i)}
                onMouseLeave={() => setHoveredCol(null)}
              >
                {isExpanded && (
                  <>
                    <span style={countBadge('gap')}>{pluralGrowth(role.gaps.length)}</span>
                    <BulletList items={role.gaps} color="var(--nb-coral)" />
                  </>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* DUTIES ROW */}
      {anyExpanded && (
        <>
          <div style={rowLabel()}>Типичные задачи роли</div>
          {sortedRoles.map((role, i) => {
            const isExpanded = expandedCols.has(i);
            return (
              <div
                key={role.role}
                style={{
                  ...cell(i === selectedIdx, hoveredCol === i),
                  ...(isExpanded ? {} : { padding: '14px 18px' }),
                }}
                onMouseEnter={() => setHoveredCol(i)}
                onMouseLeave={() => setHoveredCol(null)}
              >
                {isExpanded && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {role.typical_duties}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* SKILLS ROW */}
      {anyExpanded && (
        <>
          <div style={rowLabel()}>Навыки</div>
          {sortedRoles.map((role, i) => {
            const isSel = i === selectedIdx;
            const isExpanded = expandedCols.has(i);
            return (
              <div
                key={role.role}
                style={{
                  ...cell(isSel, hoveredCol === i),
                  ...(isExpanded ? {} : { padding: '14px 18px' }),
                }}
                onMouseEnter={() => setHoveredCol(i)}
                onMouseLeave={() => setHoveredCol(null)}
              >
                {isExpanded && (
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
                )}
              </div>
            );
          })}
        </>
      )}

      {/* TEAM ROW */}
      {anyExpanded && (
        <>
          <div style={rowLabel(true)}>В команде</div>
          {sortedRoles.map((role, i) => {
            const isExpanded = expandedCols.has(i);
            return (
              <div
                key={role.role}
                style={{
                  ...cell(i === selectedIdx, hoveredCol === i, true),
                  ...(isExpanded ? {} : { padding: '14px 18px' }),
                }}
                onMouseEnter={() => setHoveredCol(i)}
                onMouseLeave={() => setHoveredCol(null)}
              >
                {isExpanded && (
                  <div style={{ fontSize: 11, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>↑</span> {role.reports_to}
                    <br />
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>↔</span> {role.works_with}
                  </div>
                )}
              </div>
            );
          })}
        </>
      )}

      {/* ACTION ROW */}
      <div style={{ borderRight: 'var(--nb-border-width) solid var(--border-subtle)', background: 'var(--bg-elevated)' }} />
      {sortedRoles.map((role, i) => {
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
                Переупаковать под эту роль →
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

      {/* Custom role — below the grid, full width */}
      <div style={{ gridColumn: '1 / -1' }}>
        <CustomRoleInput onSelectRole={onSelectRole} />
      </div>
    </div>
  );
}
