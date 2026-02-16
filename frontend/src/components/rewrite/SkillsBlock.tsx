import type { Skills } from '../../types/rewrite';
import CopyButton from '../shared/CopyButton';

interface SkillsBlockProps {
  skills: Skills;
}

function TagGroup({ label, items, color }: { label: string; items: string[]; color: string }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary)', marginBottom: 8 }}>{label}</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {items.map((item) => (
          <span
            key={item}
            style={{
              fontSize: 12,
              fontWeight: 700,
              color,
              background: `color-mix(in srgb, ${color} 10%, transparent)`,
              border: `2px solid ${color}`,
              padding: '3px 10px',
              borderRadius: 999,
            }}
          >
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function SkillsBlock({ skills }: SkillsBlockProps) {
  return (
    <div
      className="nb-card-static"
      style={{ padding: 20 }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
          Навыки и ключевые слова
        </div>
        <CopyButton text={[...skills.key_competencies, ...skills.tools].join(', ')} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
        <TagGroup label="Компетенции" items={skills.key_competencies} color="var(--nb-violet)" />
        <TagGroup label="Инструменты" items={skills.tools} color="var(--nb-sky)" />
        <TagGroup label="ATS ключевые слова" items={skills.ats_keywords} color="var(--nb-amber)" />
      </div>
    </div>
  );
}
