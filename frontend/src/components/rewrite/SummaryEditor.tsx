import CopyButton from '../shared/CopyButton';

interface SummaryEditorProps {
  summary: string;
}

export default function SummaryEditor({ summary }: SummaryEditorProps) {
  return (
    <div
      className="nb-card-static"
      style={{ padding: 20 }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 12,
        }}
      >
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: 'var(--text-muted)',
            textTransform: 'uppercase',
            letterSpacing: '0.8px',
          }}
        >
          О себе
        </span>
        <CopyButton text={summary} />
      </div>
      <p
        style={{
          fontSize: 13,
          color: 'var(--text-secondary)',
          lineHeight: 1.65,
          margin: 0,
        }}
      >
        {summary}
      </p>
    </div>
  );
}
