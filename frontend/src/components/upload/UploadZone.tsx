import { useFileUpload } from '../../hooks/useFileUpload';
import FilePreview from './FilePreview';

interface UploadZoneProps {
  onAnalyze: (file: File) => void;
  isLoading?: boolean;
}

export default function UploadZone({ onAnalyze, isLoading }: UploadZoneProps) {
  const {
    file,
    error,
    isDragging,
    inputRef,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    handleSelect,
    openFileDialog,
    clear,
  } = useFileUpload();

  return (
    <div style={{ width: '100%', maxWidth: 500 }}>
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={!file ? openFileDialog : undefined}
        style={{
          position: 'relative',
          display: 'flex',
          minHeight: 180,
          cursor: file ? 'default' : 'pointer',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 'var(--nb-radius-lg)',
          border: isDragging
            ? '3px dashed var(--accent)'
            : file
            ? 'var(--nb-border-width) solid var(--border-color)'
            : '3px dashed var(--border-color)',
          background: isDragging
            ? 'var(--accent-bg)'
            : 'var(--bg-card)',
          boxShadow: isDragging ? 'var(--shadow-card-hover)' : 'var(--shadow-card)',
          transition: 'all 0.2s',
          padding: 20,
        }}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.docx,.txt"
          onChange={handleSelect}
          style={{ display: 'none' }}
        />

        {file ? (
          <FilePreview file={file} onRemove={clear} />
        ) : (
          <>
            <div style={{
              width: 48, height: 48,
              borderRadius: 'var(--nb-radius-md)',
              border: 'var(--nb-border-width) solid var(--border-color)',
              boxShadow: 'var(--shadow-sm)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--accent-bg)',
              marginBottom: 14,
            }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: '0 0 4px' }}>
              Перетащи файл сюда или <span style={{ color: 'var(--accent)', fontWeight: 700 }}>выбери</span>
            </p>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: 0 }}>
              PDF, DOCX или TXT до 10 МБ
            </p>
          </>
        )}
      </div>

      {error && (
        <p style={{
          textAlign: 'center', fontSize: 13, fontWeight: 600,
          color: 'var(--nb-critical)', marginTop: 12,
        }} className="animate-fade-in">
          {error}
        </p>
      )}

      {file && (
        <button
          onClick={() => onAnalyze(file)}
          disabled={isLoading}
          className="nb-button nb-button-primary"
          style={{
            width: '100%',
            marginTop: 16,
            padding: '14px 24px',
            fontSize: 15,
            opacity: isLoading ? 0.6 : 1,
            cursor: isLoading ? 'not-allowed' : 'pointer',
          }}
        >
          {isLoading ? 'Анализирую...' : 'Анализировать резюме'}
        </button>
      )}
    </div>
  );
}
