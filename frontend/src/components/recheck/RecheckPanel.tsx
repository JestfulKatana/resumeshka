import type { RecheckResult } from '../../types/recheck';
import IssueStatusList from './IssueStatusList';
import NewIssuesList from './NewIssuesList';
import ScoreDelta from './ScoreDelta';

interface RecheckPanelProps {
  rechecks: RecheckResult[];
  isRechecking: boolean;
  onBackToEdit: () => void;
}

export default function RecheckPanel({ rechecks, isRechecking, onBackToEdit }: RecheckPanelProps) {
  const latest = rechecks.length > 0 ? rechecks[rechecks.length - 1] : null;

  if (isRechecking && !latest) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 60 }}>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>Проверяю изменения...</span>
      </div>
    );
  }

  if (!latest) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 60, gap: 16 }}>
        <span style={{ fontSize: 14, color: 'var(--text-muted)' }}>
          Результаты проверки появятся здесь после отправки из редактора
        </span>
        <button
          className="nb-button nb-button-primary"
          onClick={onBackToEdit}
          style={{
            padding: '10px 24px',
            fontSize: 14,
          }}
        >
          Перейти к редактированию
        </button>
      </div>
    );
  }

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      {rechecks.length > 0 && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
          <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: "'JetBrains Mono', monospace" }}>
            Итерация {rechecks.length}
          </span>
        </div>
      )}

      <ScoreDelta score={latest.updated_score} delta={latest.score_delta} />

      <div
        className="nb-card-static"
        style={{
          padding: 20,
          marginTop: 20,
        }}
      >
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
          Вердикт
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.65 }}>
          {latest.verdict}
        </p>
      </div>

      <div style={{ marginTop: 24 }}>
        <IssueStatusList issues={latest.previous_issues_status} />
      </div>
      <div style={{ marginTop: 24 }}>
        <NewIssuesList issues={latest.new_issues} />
      </div>

      {/* Back to editing button */}
      <div style={{
        borderTop: 'var(--nb-border-width) solid var(--border-subtle)',
        paddingTop: 24,
        marginTop: 28,
        display: 'flex',
        justifyContent: 'center',
      }}>
        <button
          className="nb-button nb-button-primary"
          onClick={onBackToEdit}
          style={{
            padding: '12px 32px',
            fontSize: 15,
          }}
        >
          Вернуться к редактированию
        </button>
      </div>
    </div>
  );
}
