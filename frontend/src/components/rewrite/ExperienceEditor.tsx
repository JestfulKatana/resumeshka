import { useState, useCallback, useRef } from 'react';
import type { Experience } from '../../types/rewrite';
import { api } from '../../api';
import CopyButton from '../shared/CopyButton';
import FloatingToolbar from './FloatingToolbar';
import RegeneratePanel from './RegeneratePanel';
import DiffPanel from './DiffPanel';

interface ExperienceEditorProps {
  experience: Experience;
  isOpen: boolean;
  onToggle: () => void;
  accentColor: string;
  taskId: string | null;
  selectedRole: string;
  onBulletUpdate: (blockId: number, bulletIndex: number, newText: string) => void;
}

const pluralHints = (n: number) => {
  if (n === 1) return '1 совет AI';
  if (n >= 2 && n <= 4) return `${n} совета AI`;
  return `${n} советов AI`;
};

type BulletMode =
  | { type: 'view' }
  | { type: 'edit'; text: string }
  | { type: 'regen'; selectedText: string; prefill?: string }
  | { type: 'loading'; selectedText: string }
  | { type: 'diff'; oldText: string; newText: string };

export default function ExperienceEditor({
  experience,
  isOpen,
  onToggle,
  accentColor,
  taskId,
  selectedRole,
  onBulletUpdate,
}: ExperienceEditorProps) {
  const hints = experience.highlights
    .map((h, i) => ({ ...h, index: i }))
    .filter((h) => h.action !== 'keep');

  const [expandedHints, setExpandedHints] = useState<Set<number>>(new Set());
  const [showOriginal, setShowOriginal] = useState<Set<number>>(new Set());
  const [showDuties, setShowDuties] = useState(true);

  // Per-bullet interactive state
  const [bulletModes, setBulletModes] = useState<Map<number, BulletMode>>(new Map());

  // Floating toolbar
  const [toolbarInfo, setToolbarInfo] = useState<{
    bulletIndex: number;
    selectedText: string;
    rect: DOMRect;
  } | null>(null);

  const bulletsRef = useRef<HTMLDivElement>(null);

  const setBulletMode = (idx: number, mode: BulletMode) => {
    setBulletModes((prev) => {
      const next = new Map(prev);
      if (mode.type === 'view') next.delete(idx);
      else next.set(idx, mode);
      return next;
    });
  };

  const toggleHint = (idx: number) => {
    setExpandedHints((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleOriginal = (idx: number) => {
    setShowOriginal((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  // Handle text selection in bullets area
  const handleMouseUp = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || !sel.toString().trim()) {
      return;
    }

    const range = sel.getRangeAt(0);
    if (!bulletsRef.current) return;

    // Find bullet index — only if selection is inside a [data-bullet-text] span
    const findBulletIndex = (node: Node): number | null => {
      let el: HTMLElement | null = node instanceof HTMLElement ? node : node.parentElement;
      let insideBulletText = false;
      while (el && el !== bulletsRef.current) {
        if (el.hasAttribute('data-bullet-text')) insideBulletText = true;
        const idx = el.getAttribute('data-bullet-index');
        if (idx !== null && insideBulletText) return parseInt(idx, 10);
        el = el.parentElement;
      }
      return null;
    };

    const startIdx = findBulletIndex(range.startContainer);
    const endIdx = findBulletIndex(range.endContainer);

    // Both ends must be inside the same bullet's text span
    if (startIdx === null || endIdx === null || startIdx !== endIdx) return;

    const selectedText = sel.toString().trim();
    if (!selectedText) return;

    const rect = range.getBoundingClientRect();
    setToolbarInfo({ bulletIndex: startIdx, selectedText, rect });
  }, []);

  // Handle double-click → edit mode
  const handleDoubleClick = useCallback((bulletIndex: number, currentText: string) => {
    setToolbarInfo(null);
    setBulletMode(bulletIndex, { type: 'edit', text: currentText });
  }, []);

  // Handle placeholder click → regen mode with prefill
  const handlePlaceholderClick = useCallback((bulletIndex: number, placeholderText: string) => {
    setToolbarInfo(null);
    setBulletMode(bulletIndex, {
      type: 'regen',
      selectedText: placeholderText,
    });
  }, []);

  // Toolbar actions
  const handleToolbarEdit = useCallback(() => {
    if (!toolbarInfo) return;
    const bullet = experience.rewritten_bullets[toolbarInfo.bulletIndex];
    setBulletMode(toolbarInfo.bulletIndex, { type: 'edit', text: bullet });
    setToolbarInfo(null);
    window.getSelection()?.removeAllRanges();
  }, [toolbarInfo, experience.rewritten_bullets]);

  const handleToolbarRegen = useCallback(() => {
    if (!toolbarInfo) return;
    setBulletMode(toolbarInfo.bulletIndex, {
      type: 'regen',
      selectedText: toolbarInfo.selectedText,
    });
    setToolbarInfo(null);
    window.getSelection()?.removeAllRanges();
  }, [toolbarInfo]);

  const dismissToolbar = useCallback(() => {
    setToolbarInfo(null);
  }, []);

  // Save manual edit
  const handleSaveEdit = useCallback(
    (bulletIndex: number, newText: string) => {
      onBulletUpdate(experience.block_id, bulletIndex, newText);
      setBulletMode(bulletIndex, { type: 'view' });
    },
    [experience.block_id, onBulletUpdate],
  );

  // Submit regeneration
  const handleSubmitRegen = useCallback(
    async (bulletIndex: number, selectedText: string, comment: string) => {
      if (!taskId) return;
      const fullBullet = experience.rewritten_bullets[bulletIndex];
      setBulletMode(bulletIndex, { type: 'loading', selectedText });

      try {
        const result = await api.regenerate(taskId, {
          block_id: experience.block_id,
          bullet_index: bulletIndex,
          selected_text: selectedText,
          user_comment: comment,
          full_bullet: fullBullet,
          role: selectedRole,
        });
        setBulletMode(bulletIndex, {
          type: 'diff',
          oldText: fullBullet,
          newText: result.new_bullet,
        });
      } catch {
        setBulletMode(bulletIndex, { type: 'view' });
      }
    },
    [taskId, experience.block_id, experience.rewritten_bullets, selectedRole],
  );

  // Diff actions
  const handleAccept = useCallback(
    (bulletIndex: number, newText: string) => {
      onBulletUpdate(experience.block_id, bulletIndex, newText);
      setBulletMode(bulletIndex, { type: 'view' });
    },
    [experience.block_id, onBulletUpdate],
  );

  const handleReject = useCallback((bulletIndex: number) => {
    setBulletMode(bulletIndex, { type: 'view' });
  }, []);

  const handleRetry = useCallback(
    (bulletIndex: number, selectedText: string) => {
      setBulletMode(bulletIndex, { type: 'regen', selectedText });
    },
    [],
  );

  const handleDiffEdit = useCallback(
    (bulletIndex: number, newText: string) => {
      setBulletMode(bulletIndex, { type: 'edit', text: newText });
    },
    [],
  );

  // Hint → apply as regen
  const handleApplyHint = useCallback(
    (bulletIndex: number, hintComment: string) => {
      const bullet = experience.rewritten_bullets[bulletIndex];
      setBulletMode(bulletIndex, {
        type: 'regen',
        selectedText: bullet,
        prefill: hintComment,
      });
      setExpandedHints((prev) => {
        const next = new Set(prev);
        next.delete(bulletIndex);
        return next;
      });
    },
    [experience.rewritten_bullets],
  );

  const copyText = buildBlockText(experience);

  const hintByBullet = new Map<number, { action: string; comment: string; index: number }>();
  hints.forEach((h) => hintByBullet.set(h.index, h));

  return (
    <div
      className="nb-card-static"
      style={{ marginBottom: 12, overflow: 'hidden' }}
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
              width: 4, height: 36, borderRadius: 2,
              background: accentColor, flexShrink: 0, marginTop: 2,
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
                    fontSize: 9, fontWeight: 700, color: 'var(--nb-amber)',
                    background: 'color-mix(in srgb, var(--nb-amber) 12%, transparent)',
                    border: '2px solid var(--nb-amber)',
                    padding: '2px 6px', borderRadius: 999, flexShrink: 0,
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
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
            {experience.period}
          </span>
          <span
            style={{
              fontSize: 14, color: 'var(--text-muted)',
              transition: 'transform 0.2s',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)',
              cursor: 'pointer',
            }}
            onClick={(e) => { e.stopPropagation(); onToggle(); }}
          >
            ▾
          </span>
        </div>
      </div>

      {/* Body */}
      {isOpen && (
        <div style={{ padding: '18px 20px', animation: 'fadeIn 0.2s ease', position: 'relative' }}>
          {/* Technologies chips */}
          {experience.technologies && experience.technologies.length > 0 && (
            <div style={{ marginBottom: 16, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {experience.technologies.map((tech) => (
                <span
                  key={tech}
                  style={{
                    fontSize: 10, fontWeight: 700, color: 'var(--text-secondary)',
                    background: 'var(--bg-secondary)',
                    border: '2px solid var(--border-subtle)',
                    padding: '2px 8px', borderRadius: 999,
                  }}
                >
                  {tech}
                </span>
              ))}
            </div>
          )}

          {/* Результаты */}
          <div style={{ marginBottom: 16 }}>
            <div style={{
              fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
              textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8,
            }}>
              Результаты
            </div>
            <div
              ref={bulletsRef}
              onMouseUp={handleMouseUp}
              style={{ display: 'flex', flexDirection: 'column', gap: 6 }}
            >
              {experience.rewritten_bullets.map((bullet, i) => {
                const hint = hintByBullet.get(i);
                const isExpanded = expandedHints.has(i);
                const original = experience.original_bullets[i];
                const isChanged = original && original !== bullet;
                const isShowingOriginal = showOriginal.has(i);
                const displayText = isShowingOriginal && original ? original : bullet;
                const mode = bulletModes.get(i);

                return (
                  <div key={i} data-bullet-index={i}>
                    {/* Edit mode */}
                    {mode?.type === 'edit' ? (
                      <EditBullet
                        index={i}
                        text={mode.text}
                        onSave={(text) => handleSaveEdit(i, text)}
                        onCancel={() => setBulletMode(i, { type: 'view' })}
                      />
                    ) : (
                      /* View mode (normal / loading) */
                      <div
                        style={{
                          display: 'flex', gap: 8, lineHeight: 1.6, alignItems: 'flex-start',
                          ...(mode?.type === 'loading'
                            ? {
                                background: 'color-mix(in srgb, var(--nb-violet) 4%, transparent)',
                                borderRadius: 'var(--nb-radius-sm)',
                                padding: '6px 8px',
                              }
                            : {}),
                        }}
                      >
                        <span
                          style={{
                            color: mode?.type === 'loading' ? 'var(--nb-violet)' : 'var(--text-muted)',
                            flexShrink: 0, fontSize: 12, fontWeight: 600,
                            fontFamily: "'JetBrains Mono', monospace",
                            minWidth: 18, textAlign: 'right', lineHeight: 1.6,
                          }}
                        >
                          {i + 1}.
                        </span>
                        <span
                          data-bullet-text=""
                          style={{
                            fontSize: 13,
                            color: isShowingOriginal ? 'var(--text-muted)' : 'var(--text-secondary)',
                            flex: 1, lineHeight: 1.6,
                            fontStyle: isShowingOriginal ? 'italic' : 'normal',
                            opacity: mode?.type === 'loading' ? 0.4 : 1,
                            cursor: 'text',
                          }}
                          onDoubleClick={() => handleDoubleClick(i, bullet)}
                          dangerouslySetInnerHTML={{
                            __html: isShowingOriginal
                              ? displayText
                              : highlightPlaceholders(displayText, (ph) => handlePlaceholderClick(i, ph)),
                          }}
                          onClick={(e) => {
                            const target = e.target as HTMLElement;
                            if (target.dataset.placeholder) {
                              e.preventDefault();
                              handlePlaceholderClick(i, target.dataset.placeholder);
                            }
                          }}
                        />
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                          {mode?.type === 'loading' ? (
                            <span style={{ fontSize: 10, color: 'var(--nb-violet)', fontWeight: 600 }}>
                              Генерирую...
                            </span>
                          ) : (
                            <>
                              {isChanged && (
                                <button
                                  onClick={() => toggleOriginal(i)}
                                  title={isShowingOriginal ? 'Показать новый вариант' : 'Показать оригинал'}
                                  style={{
                                    fontSize: 13, width: 24, height: 24,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: isShowingOriginal ? 'var(--nb-sky)' : 'var(--text-muted)',
                                    background: 'transparent', border: 'none', borderRadius: '50%',
                                    cursor: 'pointer',
                                    opacity: isShowingOriginal ? 1 : 0.4,
                                    transition: 'all 0.15s',
                                  }}
                                >
                                  ↩
                                </button>
                              )}
                              {hint && (
                                <button
                                  onClick={() => toggleHint(i)}
                                  style={{
                                    fontSize: 11, fontWeight: 600, color: 'var(--nb-amber)',
                                    background: isExpanded
                                      ? 'color-mix(in srgb, var(--nb-amber) 15%, transparent)'
                                      : 'color-mix(in srgb, var(--nb-amber) 8%, transparent)',
                                    border: '1.5px solid var(--nb-amber)',
                                    padding: '2px 8px', borderRadius: 999,
                                    cursor: 'pointer', transition: 'all 0.15s', whiteSpace: 'nowrap',
                                  }}
                                >
                                  ✨ Совет
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Hint panel */}
                    {hint && isExpanded && mode?.type !== 'edit' && (
                      <div
                        style={{
                          marginLeft: 26, marginTop: 6, marginBottom: 4,
                          padding: '10px 14px',
                          background: 'color-mix(in srgb, var(--nb-amber) 6%, var(--bg-card))',
                          border: '1.5px solid color-mix(in srgb, var(--nb-amber) 30%, transparent)',
                          borderRadius: 'var(--nb-radius-md)',
                          animation: 'fadeIn 0.15s ease',
                        }}
                      >
                        <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.55, margin: 0 }}>
                          💡 {hint.comment}
                        </p>
                        <button
                          onClick={() => handleApplyHint(i, hint.comment)}
                          style={{
                            marginTop: 8, fontSize: 10, fontWeight: 700,
                            color: 'var(--nb-violet)',
                            background: 'color-mix(in srgb, var(--nb-violet) 8%, transparent)',
                            border: '1.5px solid color-mix(in srgb, var(--nb-violet) 40%, transparent)',
                            padding: '3px 10px', borderRadius: 999,
                            cursor: 'pointer',
                          }}
                        >
                          🔄 Применить этот совет с AI
                        </button>
                      </div>
                    )}

                    {/* Regenerate panel */}
                    {mode?.type === 'regen' && (
                      <RegeneratePanel
                        selectedText={mode.selectedText}
                        prefillComment={mode.prefill}
                        onSubmit={(comment) => handleSubmitRegen(i, mode.selectedText, comment)}
                        onCancel={() => setBulletMode(i, { type: 'view' })}
                        isLoading={false}
                      />
                    )}

                    {/* Diff panel */}
                    {mode?.type === 'diff' && (
                      <DiffPanel
                        oldText={mode.oldText}
                        newText={mode.newText}
                        onAccept={() => handleAccept(i, mode.newText)}
                        onReject={() => handleReject(i)}
                        onRetry={() => handleRetry(i, mode.oldText)}
                        onEdit={() => handleDiffEdit(i, mode.newText)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Onboarding hint — show only if no bullets are being edited */}
            {bulletModes.size === 0 && (
              <div
                style={{
                  marginTop: 12, padding: '8px 14px', borderRadius: 'var(--nb-radius-sm)',
                  background: 'color-mix(in srgb, var(--nb-violet) 4%, transparent)',
                  border: '1px dashed color-mix(in srgb, var(--nb-violet) 20%, transparent)',
                  textAlign: 'center',
                }}
              >
                <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>
                  Выделите текст для AI-переписки · Двойной клик для ручного редактирования
                </span>
              </div>
            )}
          </div>

          {/* Обязанности */}
          {experience.responsibilities.length > 0 && (
            <div>
              <div
                onClick={() => setShowDuties(!showDuties)}
                style={{
                  fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
                  textTransform: 'uppercase', letterSpacing: '0.5px',
                  marginBottom: showDuties ? 8 : 0, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 4,
                }}
              >
                Обязанности
                <span style={{ fontSize: 9, transition: 'transform 0.2s', transform: showDuties ? 'rotate(180deg)' : 'rotate(0)' }}>▾</span>
              </div>
              {showDuties && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, animation: 'fadeIn 0.15s ease' }}>
                  {experience.responsibilities.map((resp, i) => (
                    <div
                      key={i}
                      style={{
                        fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.5,
                        paddingLeft: 12, position: 'relative',
                      }}
                    >
                      <span style={{ position: 'absolute', left: 0 }}>•</span>
                      {resp}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Floating toolbar */}
          {toolbarInfo && (
            <FloatingToolbar
              anchorRect={toolbarInfo.rect}
              onEdit={handleToolbarEdit}
              onRegenerate={handleToolbarRegen}
              onDismiss={dismissToolbar}
            />
          )}
        </div>
      )}
    </div>
  );
}

/** Inline edit component for a single bullet */
function EditBullet({
  index,
  text,
  onSave,
  onCancel,
}: {
  index: number;
  text: string;
  onSave: (text: string) => void;
  onCancel: () => void;
}) {
  const [value, setValue] = useState(text);
  const ref = useRef<HTMLTextAreaElement>(null);

  // Auto-focus on mount
  const setRef = useCallback((el: HTMLTextAreaElement | null) => {
    (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    el?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      if (value.trim()) onSave(value.trim());
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span
          style={{
            color: 'var(--nb-sky)', flexShrink: 0, fontSize: 12, fontWeight: 600,
            fontFamily: "'JetBrains Mono', monospace",
            minWidth: 18, textAlign: 'right', lineHeight: 1.6,
          }}
        >
          {index + 1}.
        </span>
        <textarea
          ref={setRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          style={{
            fontSize: 13, color: 'var(--text-primary)', flex: 1, lineHeight: 1.6,
            background: 'var(--bg-secondary)',
            border: '1.5px solid var(--nb-sky)',
            borderRadius: 'var(--nb-radius-sm)',
            padding: '8px 10px', outline: 'none',
            fontFamily: 'inherit', resize: 'vertical', minHeight: 48,
            boxShadow: '0 0 0 3px color-mix(in srgb, var(--nb-sky) 10%, transparent)',
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6, marginLeft: 26, marginTop: 6, alignItems: 'center' }}>
        <button
          onClick={() => value.trim() && onSave(value.trim())}
          style={{
            fontSize: 11, fontWeight: 700, padding: '4px 10px',
            borderRadius: 'var(--nb-radius-sm)', cursor: 'pointer',
            border: '1.5px solid var(--nb-success)',
            background: 'var(--nb-success)', color: 'var(--bg)',
          }}
        >
          ✓ Сохранить
        </button>
        <button
          onClick={onCancel}
          style={{
            fontSize: 11, fontWeight: 600, padding: '4px 10px',
            borderRadius: 'var(--nb-radius-sm)', cursor: 'pointer',
            border: '1.5px solid var(--border-color)',
            background: 'transparent', color: 'var(--text-muted)',
          }}
        >
          Отмена
        </button>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>
          Esc — отмена · ⌘Enter — сохранить
        </span>
      </div>
    </div>
  );
}

/** Highlight [placeholder] text in amber — make them clickable */
function highlightPlaceholders(text: string, _onClick?: (ph: string) => void): string {
  return text.replace(
    /\[([^\]]+)\]/g,
    '<span data-placeholder="[$1]" style="color:var(--nb-amber);background:color-mix(in srgb, var(--nb-amber) 12%, transparent);padding:0 3px;border-radius:2px;border:1px solid var(--nb-amber);cursor:pointer">[$1]</span>',
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
