import type { PreviousIssueStatus } from '../../types/recheck';
import IssueStatusItem from './IssueStatusItem';

interface IssueStatusListProps {
  issues: PreviousIssueStatus[];
}

export default function IssueStatusList({ issues }: IssueStatusListProps) {
  if (issues.length === 0) return null;

  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 12 }}>
        Предыдущие замечания
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {issues.map((issue, i) => (
          <IssueStatusItem key={i} issue={issue} />
        ))}
      </div>
    </div>
  );
}
