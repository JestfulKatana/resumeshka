import { useState, useCallback } from 'react';
import type { RewriteResult } from '../../types/rewrite';
import SummaryEditor from './SummaryEditor';
import ExperienceEditor from './ExperienceEditor';
import SkillsBlock from './SkillsBlock';
import CopyAllBlock, { buildResumeText } from './CopyAllBlock';
import ExportButtons from './ExportButtons';

interface RewritePanelProps {
  data: RewriteResult;
  selectedRole: string;
  onSubmitRecheck: (text: string) => void;
  onChangeRole: () => void;
  isRechecking: boolean;
  taskId: string | null;
  onBulletUpdate: (blockId: number, bulletIndex: number, newText: string) => void;
  onBulletAdd: (blockId: number, text: string) => void;
  onBulletDelete: (blockId: number, bulletIndex: number) => void;
  onDutiesUpdate: (blockId: number, duties: string[]) => void;
}

const accentColors = [
  'var(--nb-amber)',
  'var(--nb-sky)',
  'var(--nb-success)',
  'var(--nb-critical)',
  'var(--nb-violet)',
];

export default function RewritePanel({
  data,
  selectedRole,
  onSubmitRecheck,
  onChangeRole,
  isRechecking,
  taskId,
  onBulletUpdate,
  onBulletAdd,
  onBulletDelete,
  onDutiesUpdate,
}: RewritePanelProps) {
  const [openExps, setOpenExps] = useState<Set<number>>(
    () => new Set(data.experiences.map((_, i) => i)),
  );

  const handleToggle = useCallback((i: number) => {
    setOpenExps((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }, []);

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Role badge + actions */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 24,
          flexWrap: 'wrap',
        }}
      >
        <span
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: 'var(--accent)',
            background: 'var(--accent-bg)',
            padding: '4px 12px',
            borderRadius: 999,
            border: '2px solid var(--accent-border)',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: 420,
            minWidth: 0,
          }}
          title={selectedRole}
        >
          {selectedRole}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginLeft: 'auto' }}>
          <ExportButtons
            summary={data.summary}
            experiences={data.experiences}
            skills={data.skills}
          />
          <button
            onClick={onChangeRole}
            style={{
              fontSize: 12,
              fontWeight: 600,
              padding: '6px 12px',
              color: 'var(--text-secondary)',
              background: 'var(--bg-card)',
              border: '2px solid var(--border-color)',
              borderRadius: 'var(--nb-radius-sm)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
            }}
          >
            🔄 Роль
          </button>
        </div>
      </div>

      {/* Summary */}
      <SummaryEditor summary={data.summary} />

      {/* Experiences */}
      <div style={{ marginTop: 28 }}>
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
            marginBottom: 14,
          }}
        >
          Опыт работы
        </div>
        {data.experiences.map((exp, i) => (
          <ExperienceEditor
            key={exp.block_id}
            experience={exp}
            isOpen={openExps.has(i)}
            onToggle={() => handleToggle(i)}
            accentColor={accentColors[i % accentColors.length]}
            taskId={taskId}
            selectedRole={selectedRole}
            onBulletUpdate={onBulletUpdate}
            onBulletAdd={onBulletAdd}
            onBulletDelete={onBulletDelete}
            onDutiesUpdate={onDutiesUpdate}
          />
        ))}
      </div>

      {/* Skills */}
      <div style={{ marginTop: 28 }}>
        <SkillsBlock skills={data.skills} />
      </div>

      {/* Copy all + preview */}
      <div style={{ marginTop: 28 }}>
        <CopyAllBlock
          summary={data.summary}
          experiences={data.experiences}
          skills={data.skills}
        />
      </div>

      {/* Submit for recheck */}
      <div
        className="nb-card-static"
        style={{
          marginTop: 20,
          padding: 24,
          borderColor: 'var(--accent-border)',
          background: 'var(--accent-bg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
        }}
      >
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text-primary)' }}>
            Готово?
          </div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
            AI проверит что получилось и покажет прогресс
          </div>
        </div>
        <button
          className="nb-button nb-button-primary"
          onClick={() => {
            const text = buildResumeText(data.summary, data.experiences, data.skills);
            onSubmitRecheck(text);
          }}
          disabled={isRechecking}
          style={{ whiteSpace: 'nowrap', padding: '10px 24px' }}
        >
          {isRechecking ? 'Проверяю...' : 'Проверить результат'}
        </button>
      </div>
    </div>
  );
}
