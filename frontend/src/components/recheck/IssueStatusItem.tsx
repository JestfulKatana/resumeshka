import type { PreviousIssueStatus } from '../../types/recheck';

const statusConfig: Record<string, { color: string; border: string }> = {
  'исправлено': { color: 'var(--nb-success)', border: 'var(--nb-success)' },
  'частично': { color: 'var(--nb-amber)', border: 'var(--nb-amber)' },
  'не исправлено': { color: 'var(--nb-critical)', border: 'var(--nb-critical)' },
};

interface IssueStatusItemProps {
  issue: PreviousIssueStatus;
}

export default function IssueStatusItem({ issue }: IssueStatusItemProps) {
  const sc = statusConfig[issue.status] || statusConfig['не исправлено'];

  return (
    <div
      className="nb-card-static"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '12px 16px',
      }}
    >
      <span
        style={{
          fontSize: 10,
          fontWeight: 700,
          color: sc.color,
          background: `color-mix(in srgb, ${sc.color} 10%, transparent)`,
          border: `2px solid ${sc.border}`,
          padding: '2px 8px',
          borderRadius: 999,
          flexShrink: 0,
          marginTop: 2,
          textTransform: 'uppercase',
        }}
      >
        {issue.status}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{issue.original_comment}</div>
        {issue.quality !== 'не применимо' && (
          <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>Качество: {issue.quality}</div>
        )}
        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>{issue.note}</div>
      </div>
    </div>
  );
}
