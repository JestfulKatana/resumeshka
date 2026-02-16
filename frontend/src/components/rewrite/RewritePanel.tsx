import { useState } from 'react';
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
}: RewritePanelProps) {
  const [openExps, setOpenExps] = useState<Set<number>>(
    () => new Set(data.experiences.map((_, i) => i)),
  );

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {/* Role badge + change button + export */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 24,
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
          }}
        >
          Роль: {selectedRole}
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ExportButtons
            summary={data.summary}
            experiences={data.experiences}
            skills={data.skills}
          />
          <button
            className="nb-button nb-button-secondary"
            onClick={onChangeRole}
            style={{
              fontSize: 12,
              padding: '4px 12px',
            }}
          >
            Выбрать другую роль
          </button>
        </div>
      </div>

      {/* Recommendations — right after role header */}
      {data.recommendations.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <RecommendationsList recommendations={data.recommendations} />
        </div>
      )}

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
            onToggle={() =>
              setOpenExps((prev) => {
                const next = new Set(prev);
                if (next.has(i)) next.delete(i);
                else next.add(i);
                return next;
              })
            }
            accentColor={accentColors[i % accentColors.length]}
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
    </div>
  );
}
