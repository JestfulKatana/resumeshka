import { useState, useCallback } from 'react';
import type { RewriteResult } from '../../types/rewrite';
import SummaryEditor from './SummaryEditor';
import ExperienceEditor from './ExperienceEditor';
import SkillsBlock from './SkillsBlock';
import RecommendationsList from './RecommendationsList';
import CopyAllBlock from './CopyAllBlock';
import ExportButtons from './ExportButtons';

interface RewritePanelProps {
  data: RewriteResult;
  selectedRole: string;
  onSubmitRecheck: (text: string) => void;
  onChangeRole: () => void;
  isRechecking: boolean;
  taskId: string | null;
  onBulletUpdate: (blockId: number, bulletIndex: number, newText: string) => void;
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
  onChangeRole,
  taskId,
  onBulletUpdate,
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
          />
        ))}
      </div>

      {/* Skills */}
      <div style={{ marginTop: 28 }}>
        <SkillsBlock skills={data.skills} />
      </div>

      {/* Recommendations — at the bottom as "what else to improve" */}
      {data.recommendations.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <RecommendationsList recommendations={data.recommendations} />
        </div>
      )}

      {/* Copy all + preview */}
      <div style={{ marginTop: 28 }}>
        <CopyAllBlock
          summary={data.summary}
          experiences={data.experiences}
          skills={data.skills}
        />
      </div>
    </div>
  );
}
