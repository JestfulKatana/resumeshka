import type { NewIssue } from '../../types/recheck';

const severityConfig: Record<string, { color: string }> = {
  critical: { color: 'var(--nb-critical)' },
  major: { color: 'var(--nb-major)' },
  minor: { color: 'var(--nb-minor)' },
};

interface NewIssuesListProps {
  issues: NewIssue[];
}

export default function NewIssuesList({ issues }: NewIssuesListProps) {
  if (issues.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
        Новые замечания
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {issues.map((issue, i) => {
          const sc = severityConfig[issue.type] || severityConfig.minor;
          return (
            <div
              key={i}
              className="nb-card-static"
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 10,
                padding: '12px 16px',
              }}
            >
              <span style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: sc.color,
                border: `2px solid ${sc.color}`,
                marginTop: 6,
                flexShrink: 0,
              }} />
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{issue.text}</div>
                <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{issue.comment}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
