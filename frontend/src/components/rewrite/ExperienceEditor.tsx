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
  onBulletAdd: (blockId: number, text: string) => void;
  onBulletDelete: (blockId: number, bulletIndex: number) => void;
  onDutiesUpdate: (blockId: number, duties: string[]) => void;
}

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
  onBulletAdd,
  onBulletDelete,
  onDutiesUpdate,
}: ExperienceEditorProps) {
  const hints = experience.highlights
    .map((h, i) => ({ ...h, index: i }))
    .filter((h) => h.action !== 'keep');

  const [showOriginal, setShowOriginal] = useState<Set<number>>(new Set());

  // Per-bullet interactive state
  const [bulletModes, setBulletModes] = useState<Map<number, BulletMode>>(new Map());
  const [deletingBullet, setDeletingBullet] = useState<number | null>(null);
  const [addingBullet, setAddingBullet] = useState(false);
  const [addBulletText, setAddBulletText] = useState('');
  const [addBulletLoading, setAddBulletLoading] = useState(false);

  // Duty state (same mode system as bullets)
  const [dutyModes, setDutyModes] = useState<Map<number, BulletMode>>(new Map());
  const [deletingDuty, setDeletingDuty] = useState<number | null>(null);
  const [addingDuty, setAddingDuty] = useState(false);
  const [addDutyText, setAddDutyText] = useState('');
  const [addDutyLoading, setAddDutyLoading] = useState(false);

  // Floating toolbar
  const [toolbarInfo, setToolbarInfo] = useState<{
    bulletIndex: number;
    selectedText: string;
    rect: DOMRect;
  } | null>(null);

  const bulletsRef = useRef<HTMLDivElement>(null);
  const addBulletRef = useRef<HTMLTextAreaElement>(null);
  const addDutyRef = useRef<HTMLTextAreaElement>(null);

  const setBulletMode = (idx: number, mode: BulletMode) => {
    setBulletModes((prev) => {
      const next = new Map(prev);
      if (mode.type === 'view') next.delete(idx);
      else next.set(idx, mode);
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
    if (!sel || sel.isCollapsed || !sel.toString().trim()) return;

    const range = sel.getRangeAt(0);
    if (!bulletsRef.current) return;

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
    if (startIdx === null || endIdx === null || startIdx !== endIdx) return;

    const selectedText = sel.toString().trim();
    if (!selectedText) return;

    const rect = range.getBoundingClientRect();
    setToolbarInfo({ bulletIndex: startIdx, selectedText, rect });
  }, []);

  const handleDoubleClick = useCallback((bulletIndex: number, currentText: string) => {
    setToolbarInfo(null);
    setBulletMode(bulletIndex, { type: 'edit', text: currentText });
  }, []);

  const handlePlaceholderClick = useCallback((bulletIndex: number, placeholderText: string) => {
    setToolbarInfo(null);
    setBulletMode(bulletIndex, { type: 'regen', selectedText: placeholderText });
  }, []);

  const handleToolbarEdit = useCallback(() => {
    if (!toolbarInfo) return;
    setBulletMode(toolbarInfo.bulletIndex, { type: 'edit', text: experience.rewritten_bullets[toolbarInfo.bulletIndex] });
    setToolbarInfo(null);
    window.getSelection()?.removeAllRanges();
  }, [toolbarInfo, experience.rewritten_bullets]);

  const handleToolbarRegen = useCallback(() => {
    if (!toolbarInfo) return;
    setBulletMode(toolbarInfo.bulletIndex, { type: 'regen', selectedText: toolbarInfo.selectedText });
    setToolbarInfo(null);
    window.getSelection()?.removeAllRanges();
  }, [toolbarInfo]);

  const dismissToolbar = useCallback(() => setToolbarInfo(null), []);

  const handleSaveEdit = useCallback(
    (bulletIndex: number, newText: string) => {
      onBulletUpdate(experience.block_id, bulletIndex, newText);
      setBulletMode(bulletIndex, { type: 'view' });
    },
    [experience.block_id, onBulletUpdate],
  );

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
        setBulletMode(bulletIndex, { type: 'diff', oldText: fullBullet, newText: result.new_bullet });
      } catch {
        setBulletMode(bulletIndex, { type: 'view' });
      }
    },
    [taskId, experience.block_id, experience.rewritten_bullets, selectedRole],
  );

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

  const handleRetry = useCallback((bulletIndex: number, selectedText: string) => {
    setBulletMode(bulletIndex, { type: 'regen', selectedText });
  }, []);

  const handleDiffEdit = useCallback((bulletIndex: number, newText: string) => {
    setBulletMode(bulletIndex, { type: 'edit', text: newText });
  }, []);

  const handleHoverEdit = useCallback(
    (bulletIndex: number) => {
      setToolbarInfo(null);
      setBulletMode(bulletIndex, { type: 'edit', text: experience.rewritten_bullets[bulletIndex] });
    },
    [experience.rewritten_bullets],
  );

  const handleHoverRegen = useCallback(
    (bulletIndex: number, hint?: { comment: string }) => {
      setToolbarInfo(null);
      setBulletMode(bulletIndex, {
        type: 'regen',
        selectedText: experience.rewritten_bullets[bulletIndex],
        prefill: hint?.comment,
      });
    },
    [experience.rewritten_bullets],
  );

  // Bullet delete
  const handleDeleteBullet = useCallback((idx: number) => {
    setDeletingBullet(idx);
  }, []);

  const confirmDeleteBullet = useCallback(() => {
    if (deletingBullet === null) return;
    onBulletDelete(experience.block_id, deletingBullet);
    setDeletingBullet(null);
  }, [deletingBullet, experience.block_id, onBulletDelete]);

  // Bullet add
  const handleAddBullet = useCallback(() => {
    const text = addBulletText.trim();
    if (!text) return;
    onBulletAdd(experience.block_id, text);
    setAddBulletText('');
    setAddingBullet(false);
  }, [addBulletText, experience.block_id, onBulletAdd]);

  const handleAddBulletAI = useCallback(async () => {
    const text = addBulletText.trim();
    if (!text || !taskId) return;
    setAddBulletLoading(true);
    try {
      const result = await api.regenerate(taskId, {
        block_id: experience.block_id,
        bullet_index: -1,
        selected_text: text,
        user_comment: 'Улучши и оформи как результат/достижение для резюме. Добавь метрики если возможно.',
        full_bullet: text,
        role: selectedRole,
      });
      onBulletAdd(experience.block_id, result.new_bullet);
      setAddBulletText('');
      setAddingBullet(false);
    } catch { /* ignore */ }
    setAddBulletLoading(false);
  }, [addBulletText, taskId, experience.block_id, selectedRole, onBulletAdd]);

  const setDutyMode = (idx: number, mode: BulletMode) => {
    setDutyModes((prev) => {
      const next = new Map(prev);
      if (mode.type === 'view') next.delete(idx);
      else next.set(idx, mode);
      return next;
    });
  };

  const handleDutyDoubleClick = useCallback((idx: number, currentText: string) => {
    setDutyMode(idx, { type: 'edit', text: currentText });
  }, []);

  const handleDutyHoverEdit = useCallback((idx: number) => {
    setDutyMode(idx, { type: 'edit', text: experience.responsibilities[idx] });
  }, [experience.responsibilities]);

  const handleDutyHoverRegen = useCallback((idx: number) => {
    setDutyMode(idx, { type: 'regen', selectedText: experience.responsibilities[idx], prefill: 'Улучши формулировку обязанности' });
  }, [experience.responsibilities]);

  const handleSaveDutyEdit = useCallback((idx: number, newText: string) => {
    const trimmed = newText.trim();
    if (!trimmed) return;
    const newDuties = [...experience.responsibilities];
    newDuties[idx] = trimmed;
    onDutiesUpdate(experience.block_id, newDuties);
    setDutyMode(idx, { type: 'view' });
  }, [experience.responsibilities, experience.block_id, onDutiesUpdate]);

  const handleDutySubmitRegen = useCallback(async (idx: number, selectedText: string, comment: string) => {
    if (!taskId) return;
    const fullDuty = experience.responsibilities[idx];
    setDutyMode(idx, { type: 'loading', selectedText });
    try {
      const result = await api.regenerate(taskId, {
        block_id: experience.block_id,
        bullet_index: -1,
        selected_text: selectedText,
        user_comment: comment || 'Это обязанность. Улучши формулировку: сделай конкретнее, профессиональнее.',
        full_bullet: fullDuty,
        role: selectedRole,
      });
      setDutyMode(idx, { type: 'diff', oldText: fullDuty, newText: result.new_bullet });
    } catch {
      setDutyMode(idx, { type: 'view' });
    }
  }, [taskId, experience.responsibilities, experience.block_id, selectedRole]);

  const handleDutyAccept = useCallback((idx: number, newText: string) => {
    const newDuties = [...experience.responsibilities];
    newDuties[idx] = newText;
    onDutiesUpdate(experience.block_id, newDuties);
    setDutyMode(idx, { type: 'view' });
  }, [experience.responsibilities, experience.block_id, onDutiesUpdate]);

  const handleDutyReject = useCallback((idx: number) => {
    setDutyMode(idx, { type: 'view' });
  }, []);

  const handleDutyRetry = useCallback((idx: number, selectedText: string) => {
    setDutyMode(idx, { type: 'regen', selectedText });
  }, []);

  const handleDutyDiffEdit = useCallback((idx: number, newText: string) => {
    setDutyMode(idx, { type: 'edit', text: newText });
  }, []);

  // Duty delete
  const confirmDeleteDuty = useCallback(() => {
    if (deletingDuty === null) return;
    const newDuties = experience.responsibilities.filter((_, i) => i !== deletingDuty);
    onDutiesUpdate(experience.block_id, newDuties);
    setDeletingDuty(null);
  }, [deletingDuty, experience.responsibilities, experience.block_id, onDutiesUpdate]);

  // Duty add
  const handleAddDuty = useCallback(() => {
    const text = addDutyText.trim();
    if (!text) return;
    onDutiesUpdate(experience.block_id, [...experience.responsibilities, text]);
    setAddDutyText('');
    setAddingDuty(false);
  }, [addDutyText, experience.responsibilities, experience.block_id, onDutiesUpdate]);

  const handleAddDutyAI = useCallback(async () => {
    if (!taskId) return;
    const text = addDutyText.trim();
    setAddDutyLoading(true);
    try {
      const prompt = text
        ? `Это обязанность (не результат). Улучши формулировку: "${text}". Сделай конкретнее, профессиональнее.`
        : `Сгенерируй одну релевантную обязанность для позиции "${experience.role}" в "${experience.company}". Кратко, профессионально.`;
      const result = await api.regenerate(taskId, {
        block_id: experience.block_id,
        bullet_index: -1,
        selected_text: text || `обязанность для ${experience.role}`,
        user_comment: prompt,
        full_bullet: text || `обязанность для ${experience.role}`,
        role: selectedRole,
      });
      onDutiesUpdate(experience.block_id, [...experience.responsibilities, result.new_bullet]);
      setAddDutyText('');
      setAddingDuty(false);
    } catch { /* ignore */ }
    setAddDutyLoading(false);
  }, [taskId, addDutyText, experience, selectedRole, onDutiesUpdate]);

  const copyText = buildBlockText(experience);
  const hintByBullet = new Map<number, { action: string; comment: string; index: number }>();
  hints.forEach((h) => hintByBullet.set(h.index, h));

  return (
    <div className="nb-card-static" style={{ marginBottom: 12, overflow: 'hidden' }}>
      <style>{`
        @keyframes bulletPulse {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        @keyframes bulletShimmer {
          0% { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>

      {/* Header */}
      <div
        style={{
          padding: '14px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          borderBottom: isOpen ? 'var(--nb-border-width) solid var(--border-subtle)' : 'none',
          cursor: 'pointer', background: 'var(--bg-elevated)',
        }}
        onClick={onToggle}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, minWidth: 0, flex: 1 }}>
          <div style={{ width: 4, height: 36, borderRadius: 2, background: accentColor, flexShrink: 0, marginTop: 2 }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: 'var(--text-primary)' }}>{experience.company}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{experience.role}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }} onClick={(e) => e.stopPropagation()}>
          <CopyButton text={copyText} />
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>{experience.period}</span>
          <span
            style={{
              fontSize: 14, color: 'var(--text-muted)', transition: 'transform 0.2s',
              transform: isOpen ? 'rotate(180deg)' : 'rotate(0)', cursor: 'pointer',
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

          {/* ==================== РЕЗУЛЬТАТЫ ==================== */}
          <div style={{ marginBottom: 16 }}>
            <div style={labelStyle}>Результаты</div>
            <div ref={bulletsRef} onMouseUp={handleMouseUp} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {experience.rewritten_bullets.map((bullet, i) => {
                const hint = hintByBullet.get(i);
                const original = experience.original_bullets[i];
                const isChanged = original && original !== bullet;
                const isShowingOriginal = showOriginal.has(i);
                const displayText = isShowingOriginal && original ? original : bullet;
                const mode = bulletModes.get(i);
                const isLoading = mode?.type === 'loading';
                const isInteractive = !mode || mode.type === 'view';
                const isDeleting = deletingBullet === i;

                return (
                  <div key={i} data-bullet-index={i}>
                    {mode?.type === 'edit' ? (
                      <EditBullet
                        index={i}
                        text={mode.text}
                        onSave={(text) => handleSaveEdit(i, text)}
                        onCancel={() => setBulletMode(i, { type: 'view' })}
                        onAI={(text) => {
                          setBulletMode(i, { type: 'regen', selectedText: text, prefill: 'Улучши формулировку' });
                        }}
                      />
                    ) : (
                      <div
                        className={isInteractive && !isDeleting ? 'bullet-row' : undefined}
                        style={{
                          display: 'flex', gap: 8, lineHeight: 1.6, alignItems: 'flex-start',
                          padding: '4px 8px', borderRadius: 'var(--nb-radius-sm)',
                          transition: 'background 0.15s', position: 'relative',
                          opacity: isDeleting ? 0.4 : 1,
                          ...(isLoading ? shimmerStyle : {}),
                        }}
                      >
                        <span style={{
                          color: isLoading ? 'var(--nb-violet)' : 'var(--text-muted)',
                          flexShrink: 0, fontSize: 12, fontWeight: 600,
                          fontFamily: "'JetBrains Mono', monospace",
                          minWidth: 18, textAlign: 'right', lineHeight: 1.6,
                        }}>
                          {i + 1}.
                        </span>
                        <span
                          data-bullet-text=""
                          style={{
                            fontSize: 13, flex: 1, lineHeight: 1.6, cursor: 'text',
                            color: isShowingOriginal ? 'var(--text-muted)' : 'var(--text-secondary)',
                            fontStyle: isShowingOriginal ? 'italic' : 'normal',
                            opacity: isLoading ? 0.4 : 1,
                            textDecoration: isDeleting ? 'line-through' : 'none',
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

                        {/* Right side: actions */}
                        <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                          {isLoading ? (
                            <AiLoader />
                          ) : !isDeleting ? (
                            <>
                              {isChanged && (
                                <button
                                  onClick={() => toggleOriginal(i)}
                                  title={isShowingOriginal ? 'Показать новый вариант' : 'Показать оригинал'}
                                  style={{
                                    ...revertBtnStyle,
                                    color: isShowingOriginal ? 'var(--nb-sky)' : 'var(--text-muted)',
                                    opacity: isShowingOriginal ? 1 : 0.4,
                                  }}
                                >
                                  ↩
                                </button>
                              )}
                              <div className="bullet-hover-actions" style={{ display: 'flex', gap: 3, opacity: 0, transition: 'opacity 0.15s' }}>
                                <button onClick={(e) => { e.stopPropagation(); handleHoverEdit(i); }} title="Редактировать" style={hoverBtnStyle}>✏️</button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleHoverRegen(i, hint || undefined); }}
                                  title={hint ? `AI: ${hint.comment}` : 'Переписать с AI'}
                                  style={{
                                    ...hoverBtnStyle,
                                    borderColor: hint ? 'var(--nb-violet)' : 'var(--border-color)',
                                    color: hint ? 'var(--nb-violet)' : undefined,
                                    position: 'relative',
                                  }}
                                >
                                  ✨
                                  {hint && <span style={hintDotStyle} />}
                                </button>
                                <button
                                  onClick={(e) => { e.stopPropagation(); handleDeleteBullet(i); }}
                                  title="Удалить"
                                  style={{ ...hoverBtnStyle, ...dangerBtnHover }}
                                >
                                  🗑️
                                </button>
                              </div>
                            </>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Delete confirm */}
                    {isDeleting && (
                      <div style={confirmStyle}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>Удалить этот результат?</span>
                        <button style={confirmYesStyle} onClick={confirmDeleteBullet}>Удалить</button>
                        <button style={confirmNoStyle} onClick={() => setDeletingBullet(null)}>Отмена</button>
                      </div>
                    )}

                    {mode?.type === 'regen' && (
                      <RegeneratePanel
                        selectedText={mode.selectedText}
                        prefillComment={mode.prefill}
                        onSubmit={(comment) => handleSubmitRegen(i, mode.selectedText, comment)}
                        onCancel={() => setBulletMode(i, { type: 'view' })}
                        isLoading={false}
                      />
                    )}

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

            {/* + Добавить результат */}
            {!addingBullet ? (
              <div style={addRowStyle} onClick={() => { setAddingBullet(true); setTimeout(() => addBulletRef.current?.focus(), 0); }}>
                <span style={{ fontSize: 14 }}>+</span> Добавить результат
              </div>
            ) : (
              <div style={addPanelStyle}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--nb-violet)', marginBottom: 6 }}>Новый результат</div>
                <textarea
                  ref={addBulletRef}
                  className="add-input"
                  rows={2}
                  value={addBulletText}
                  onChange={(e) => setAddBulletText(e.target.value)}
                  placeholder="Опишите достижение, результат или факт..."
                  disabled={addBulletLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) { e.preventDefault(); handleAddBullet(); }
                    if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); handleAddBulletAI(); }
                    if (e.key === 'Escape') { setAddingBullet(false); setAddBulletText(''); }
                  }}
                  style={addInputStyle}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                  <button style={addBtnPrimary} onClick={handleAddBullet} disabled={addBulletLoading}>✓ Добавить</button>
                  <button style={addBtnAI} onClick={handleAddBulletAI} disabled={addBulletLoading}>
                    {addBulletLoading ? '...' : '✨ Улучшить с AI'}
                  </button>
                  <button style={addBtnCancel} onClick={() => { setAddingBullet(false); setAddBulletText(''); }}>Отмена</button>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>Enter — добавить · ⌘Enter — с AI</span>
                </div>
              </div>
            )}
          </div>

          {/* ==================== ОБЯЗАННОСТИ ==================== */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 16 }}>
            <div style={labelStyle}>Обязанности</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {experience.responsibilities.map((duty, i) => {
                const dutyMode = dutyModes.get(i);
                const isDutyLoading = dutyMode?.type === 'loading';
                const isDutyInteractive = !dutyMode || dutyMode.type === 'view';
                const isDeleting = deletingDuty === i;

                return (
                  <div key={i}>
                    {dutyMode?.type === 'edit' ? (
                      <EditBullet
                        index={i}
                        text={dutyMode.text}
                        onSave={(text) => handleSaveDutyEdit(i, text)}
                        onCancel={() => setDutyMode(i, { type: 'view' })}
                        onAI={(text) => {
                          setDutyMode(i, { type: 'regen', selectedText: text, prefill: 'Улучши формулировку обязанности' });
                        }}
                        marker="•"
                        accentColor="var(--nb-sky)"
                      />
                    ) : (
                      <div
                        className={isDutyInteractive && !isDeleting ? 'duty-row' : undefined}
                        style={{
                          display: 'flex', gap: 8, alignItems: 'flex-start',
                          padding: '4px 8px', borderRadius: 'var(--nb-radius-sm)',
                          transition: 'background 0.15s', position: 'relative',
                          opacity: isDeleting ? 0.4 : 1,
                          ...(isDutyLoading ? dutyShimmerStyle : {}),
                        }}
                      >
                        <span style={{
                          color: isDutyLoading ? 'var(--nb-sky)' : 'var(--text-muted)',
                          flexShrink: 0, fontSize: 12, fontWeight: 600,
                          fontFamily: "'JetBrains Mono', monospace",
                          minWidth: 18, textAlign: 'right', lineHeight: 1.6,
                        }}>•</span>
                        <span
                          style={{
                            fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6, flex: 1, cursor: 'text',
                            opacity: isDutyLoading ? 0.4 : 1,
                            textDecoration: isDeleting ? 'line-through' : 'none',
                          }}
                          onDoubleClick={() => handleDutyDoubleClick(i, duty)}
                        >
                          {duty}
                        </span>

                        <div style={{ display: 'flex', gap: 4, flexShrink: 0, alignItems: 'center' }}>
                          {isDutyLoading ? (
                            <AiLoader color="var(--nb-sky)" />
                          ) : !isDeleting ? (
                            <div className="duty-hover-actions" style={{ display: 'flex', gap: 3, opacity: 0, transition: 'opacity 0.15s' }}>
                              <button onClick={(e) => { e.stopPropagation(); handleDutyHoverEdit(i); }} title="Редактировать" style={hoverBtnStyle}>✏️</button>
                              <button
                                onClick={(e) => { e.stopPropagation(); handleDutyHoverRegen(i); }}
                                title="Переписать с AI"
                                style={{ ...hoverBtnStyle, borderColor: 'var(--nb-sky)', color: 'var(--nb-sky)' }}
                              >✨</button>
                              <button onClick={(e) => { e.stopPropagation(); setDeletingDuty(i); }} title="Удалить" style={{ ...hoverBtnStyle, ...dangerBtnHover }}>🗑️</button>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    )}

                    {/* Delete confirm */}
                    {isDeleting && (
                      <div style={{ ...confirmStyle, marginLeft: 20 }}>
                        <span style={{ fontSize: 12, color: 'var(--text-secondary)', flex: 1 }}>Удалить обязанность?</span>
                        <button style={confirmYesStyle} onClick={confirmDeleteDuty}>Удалить</button>
                        <button style={confirmNoStyle} onClick={() => setDeletingDuty(null)}>Отмена</button>
                      </div>
                    )}

                    {dutyMode?.type === 'regen' && (
                      <RegeneratePanel
                        selectedText={dutyMode.selectedText}
                        prefillComment={dutyMode.prefill}
                        onSubmit={(comment) => handleDutySubmitRegen(i, dutyMode.selectedText, comment)}
                        onCancel={() => setDutyMode(i, { type: 'view' })}
                        isLoading={false}
                      />
                    )}

                    {dutyMode?.type === 'diff' && (
                      <DiffPanel
                        oldText={dutyMode.oldText}
                        newText={dutyMode.newText}
                        onAccept={() => handleDutyAccept(i, dutyMode.newText)}
                        onReject={() => handleDutyReject(i)}
                        onRetry={() => handleDutyRetry(i, dutyMode.oldText)}
                        onEdit={() => handleDutyDiffEdit(i, dutyMode.newText)}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {/* + Добавить обязанность */}
            {!addingDuty ? (
              <div style={{ ...addRowStyle, ...addRowSkyStyle }} onClick={() => { setAddingDuty(true); setTimeout(() => addDutyRef.current?.focus(), 0); }}>
                <span style={{ fontSize: 14 }}>+</span> Добавить обязанность
              </div>
            ) : (
              <div style={addPanelSkyStyle}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--nb-sky)', marginBottom: 6 }}>Новая обязанность</div>
                <textarea
                  ref={addDutyRef}
                  rows={1}
                  value={addDutyText}
                  onChange={(e) => setAddDutyText(e.target.value)}
                  placeholder="Опишите обязанность..."
                  disabled={addDutyLoading}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !e.metaKey) { e.preventDefault(); handleAddDuty(); }
                    if (e.key === 'Enter' && e.metaKey) { e.preventDefault(); handleAddDutyAI(); }
                    if (e.key === 'Escape') { setAddingDuty(false); setAddDutyText(''); }
                  }}
                  style={{ ...addInputStyle, borderColor: 'var(--border-color)' }}
                />
                <div style={{ display: 'flex', gap: 6, marginTop: 8, alignItems: 'center' }}>
                  <button style={{ ...addBtnPrimary, background: 'var(--nb-sky)', borderColor: 'var(--nb-sky)' }} onClick={handleAddDuty} disabled={addDutyLoading}>✓ Добавить</button>
                  <button style={{ ...addBtnAI, color: 'var(--nb-sky)', borderColor: 'color-mix(in srgb, var(--nb-sky) 40%, transparent)' }} onClick={handleAddDutyAI} disabled={addDutyLoading}>
                    {addDutyLoading ? '...' : '✨ Сгенерировать с AI'}
                  </button>
                  <button style={addBtnCancel} onClick={() => { setAddingDuty(false); setAddDutyText(''); }}>Отмена</button>
                  <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>Enter — добавить · ⌘Enter — с AI</span>
                </div>
              </div>
            )}
          </div>

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

// ===================== Sub-components =====================

function AiLoader({ color = 'var(--nb-violet)' }: { color?: string }) {
  return (
    <span style={{ display: 'flex', gap: 3, alignItems: 'center', flexShrink: 0 }}>
      <span style={{ fontSize: 10, color, fontWeight: 700 }}>AI</span>
      <span style={{ display: 'flex', gap: 2 }}>
        {[0, 1, 2].map((d) => (
          <span
            key={d}
            style={{
              width: 4, height: 4, borderRadius: '50%', background: color,
              animation: `bulletPulse 1.2s ease-in-out ${d * 0.2}s infinite`,
            }}
          />
        ))}
      </span>
    </span>
  );
}

function EditBullet({
  index, text, onSave, onCancel, onAI, marker, accentColor = 'var(--nb-violet)',
}: {
  index: number;
  text: string;
  onSave: (text: string) => void;
  onCancel: () => void;
  onAI: (text: string) => void;
  marker?: string;
  accentColor?: string;
}) {
  const [value, setValue] = useState(text);
  const ref = useRef<HTMLTextAreaElement>(null);

  const setRef = useCallback((el: HTMLTextAreaElement | null) => {
    (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
    el?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onCancel();
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (value.trim()) onSave(value.trim());
    }
  };

  return (
    <div style={{
      padding: '4px 8px', borderRadius: 'var(--nb-radius-sm)',
      background: `color-mix(in srgb, ${accentColor} 6%, transparent)`,
    }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
        <span style={{
          color: accentColor, flexShrink: 0, fontSize: 12, fontWeight: 600,
          fontFamily: "'JetBrains Mono', monospace",
          minWidth: 18, textAlign: 'right', lineHeight: 1.6,
        }}>
          {marker ?? `${index + 1}.`}
        </span>
        <textarea
          ref={setRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={2}
          style={{
            fontSize: 13, color: 'var(--text-primary)', flex: 1, lineHeight: 1.6,
            background: 'transparent', border: 'none',
            padding: 0, outline: 'none',
            fontFamily: 'inherit', resize: 'vertical', minHeight: 20,
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: 6, marginLeft: 26, marginTop: 4, alignItems: 'center' }}>
        <button onClick={() => value.trim() && onSave(value.trim())} style={editSaveBtn}>✓</button>
        <button onClick={() => onAI(value)} style={{ ...editAIBtn, color: accentColor, borderColor: `color-mix(in srgb, ${accentColor} 40%, transparent)`, background: `color-mix(in srgb, ${accentColor} 10%, transparent)` }}>✨</button>
        <button onClick={onCancel} style={editCancelBtn}>✕</button>
        <span style={{ fontSize: 10, color: 'var(--text-muted)', marginLeft: 'auto' }}>Enter — сохранить · Esc — отмена</span>
      </div>
    </div>
  );
}

function highlightPlaceholders(text: string, _onClick?: (ph: string) => void): string {
  return text.replace(
    /\[([^\]]+)\]/g,
    '<span data-placeholder="[$1]" style="color:var(--nb-amber);background:color-mix(in srgb, var(--nb-amber) 12%, transparent);padding:0 3px;border-radius:2px;border:1px solid var(--nb-amber);cursor:pointer">[$1]</span>',
  );
}

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

// ===================== Styles =====================

const labelStyle: React.CSSProperties = {
  fontSize: 10, fontWeight: 700, color: 'var(--text-muted)',
  textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8,
};

const hoverBtnStyle: React.CSSProperties = {
  width: 26, height: 26, borderRadius: 'var(--nb-radius-sm)',
  border: '1.5px solid var(--border-color)', background: 'var(--bg-card)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 12, cursor: 'pointer', transition: 'all 0.15s',
};

const dangerBtnHover: React.CSSProperties = {};

const hintDotStyle: React.CSSProperties = {
  position: 'absolute', top: -2, right: -2,
  width: 6, height: 6, borderRadius: '50%',
  background: 'var(--nb-violet)',
};

const revertBtnStyle: React.CSSProperties = {
  fontSize: 13, width: 24, height: 24,
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  background: 'transparent', border: 'none', borderRadius: '50%',
  cursor: 'pointer', transition: 'all 0.15s',
};

const shimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, color-mix(in srgb, var(--nb-violet) 4%, transparent) 0%, color-mix(in srgb, var(--nb-violet) 8%, transparent) 50%, color-mix(in srgb, var(--nb-violet) 4%, transparent) 100%)',
  backgroundSize: '200% 100%',
  animation: 'bulletShimmer 2s ease-in-out infinite',
};

const dutyShimmerStyle: React.CSSProperties = {
  background: 'linear-gradient(90deg, color-mix(in srgb, var(--nb-sky) 4%, transparent) 0%, color-mix(in srgb, var(--nb-sky) 8%, transparent) 50%, color-mix(in srgb, var(--nb-sky) 4%, transparent) 100%)',
  backgroundSize: '200% 100%',
  animation: 'bulletShimmer 2s ease-in-out infinite',
};


const confirmStyle: React.CSSProperties = {
  marginLeft: 26, marginTop: 6, marginBottom: 4, padding: '10px 14px',
  borderRadius: 'var(--nb-radius)',
  border: '1.5px solid color-mix(in srgb, var(--nb-critical) 30%, transparent)',
  background: 'color-mix(in srgb, var(--nb-critical) 4%, var(--bg-card))',
  display: 'flex', alignItems: 'center', gap: 10,
  animation: 'fadeIn 0.15s ease',
};

const confirmBtnBase: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, padding: '4px 10px',
  borderRadius: 'var(--nb-radius-sm)', cursor: 'pointer', border: '1.5px solid',
};

const confirmYesStyle: React.CSSProperties = {
  ...confirmBtnBase, background: 'var(--nb-critical)', color: '#fff', borderColor: 'var(--nb-critical)',
};

const confirmNoStyle: React.CSSProperties = {
  ...confirmBtnBase, background: 'transparent', color: 'var(--text-muted)', borderColor: 'var(--border-color)',
};

const addRowStyle: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 4,
  padding: '4px 10px 4px 6px', marginTop: 6,
  borderRadius: 999, cursor: 'pointer',
  border: 'none', background: 'transparent',
  color: 'var(--text-muted)', fontSize: 11, fontWeight: 600,
  transition: 'all 0.15s', opacity: 0.5,
};

const addRowSkyStyle: React.CSSProperties = {};

const addPanelStyle: React.CSSProperties = {
  marginTop: 8, padding: '10px 14px',
  borderRadius: 'var(--nb-radius)',
  border: '1.5px solid color-mix(in srgb, var(--nb-violet) 30%, transparent)',
  background: 'color-mix(in srgb, var(--nb-violet) 4%, var(--bg-card))',
  animation: 'fadeIn 0.15s ease',
};

const addPanelSkyStyle: React.CSSProperties = {
  ...addPanelStyle,
  borderColor: 'color-mix(in srgb, var(--nb-sky) 30%, transparent)',
  background: 'color-mix(in srgb, var(--nb-sky) 4%, var(--bg-card))',
};

const addInputStyle: React.CSSProperties = {
  width: '100%', fontSize: 12, padding: '8px 10px',
  borderRadius: 'var(--nb-radius-sm)',
  border: '1.5px solid var(--border-color)', background: 'var(--bg-secondary)',
  color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'none', outline: 'none',
};

const addBtnBase: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, padding: '4px 10px',
  borderRadius: 'var(--nb-radius-sm)', cursor: 'pointer', border: '1.5px solid',
  transition: 'all 0.15s',
};

const addBtnPrimary: React.CSSProperties = {
  ...addBtnBase, background: 'var(--nb-violet)', color: '#fff', borderColor: 'var(--nb-violet)',
};

const addBtnAI: React.CSSProperties = {
  ...addBtnBase,
  background: 'color-mix(in srgb, var(--nb-violet) 10%, transparent)',
  color: 'var(--nb-violet)',
  borderColor: 'color-mix(in srgb, var(--nb-violet) 40%, transparent)',
};

const addBtnCancel: React.CSSProperties = {
  ...addBtnBase, background: 'transparent', color: 'var(--text-muted)', borderColor: 'var(--border-color)',
};

const editSaveBtn: React.CSSProperties = {
  ...addBtnBase, background: 'var(--nb-success)', color: 'var(--bg)', borderColor: 'var(--nb-success)',
};

const editAIBtn: React.CSSProperties = {
  ...addBtnBase,
  background: 'color-mix(in srgb, var(--nb-violet) 10%, transparent)',
  color: 'var(--nb-violet)',
  borderColor: 'color-mix(in srgb, var(--nb-violet) 40%, transparent)',
};

const editCancelBtn: React.CSSProperties = {
  ...addBtnBase, background: 'transparent', color: 'var(--text-muted)', borderColor: 'var(--border-color)',
};
