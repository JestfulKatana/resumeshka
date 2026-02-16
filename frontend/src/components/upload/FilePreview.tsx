interface FilePreviewProps {
  file: File;
  onRemove: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string): string {
  if (name.endsWith('.pdf')) return 'PDF';
  if (name.endsWith('.docx')) return 'DOCX';
  return 'TXT';
}

export default function FilePreview({ file, onRemove }: FilePreviewProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        padding: '0 8px',
        width: '100%',
      }}
      className="animate-fade-in"
    >
      <div
        style={{
          width: 42,
          height: 42,
          borderRadius: 'var(--nb-radius-sm)',
          border: '2px solid var(--border-color)',
          boxShadow: 'var(--shadow-sm)',
          background: 'var(--accent-bg)',
          color: 'var(--accent)',
          fontSize: 11,
          fontWeight: 800,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {getFileIcon(file.name)}
      </div>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{
          fontSize: 14, fontWeight: 700, color: 'var(--text-primary)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {file.name}
        </div>
        <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{formatSize(file.size)}</div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onRemove(); }}
        style={{
          width: 30,
          height: 30,
          borderRadius: 'var(--nb-radius-sm)',
          border: '2px solid var(--border-color)',
          background: 'var(--bg-card)',
          color: 'var(--text-muted)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          transition: 'all 0.15s',
          boxShadow: '1px 1px 0 var(--shadow-color)',
        }}
      >
        x
      </button>
    </div>
  );
}
